import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ModelSynthesisSchema } from '@/domain/contracts';
import { DEFAULT_COMPARISON_MODEL_ID, DEFAULT_MODEL_ID, loadProviderConfig } from '@/server/config/env';
import { ModelClient, toStrictJsonSchema } from '@/server/models/client';
import { ProviderError } from '@/server/models/errors';
import {
  estimateCost,
  parseDurationSeconds,
  readRateLimit,
  readUsage,
  sumUsage,
  USAGE_UNAVAILABLE,
} from '@/server/models/telemetry';

const stubConfig = {
  mode: 'stub' as const,
  apiKey: null,
  baseUrl: 'https://api.studio.nebius.com/v1',
  modelId: DEFAULT_MODEL_ID,
  comparisonModelId: DEFAULT_COMPARISON_MODEL_ID,
  timeoutMs: 1000,
  maxRetries: 2,
  priceInputPerMTok: null,
  priceOutputPerMTok: null,
};

const TrivialSchema = z.strictObject({ answer: z.string().min(1) });

function request(stubResponse: () => unknown) {
  return {
    schema: TrivialSchema,
    schemaName: 'trivial',
    systemPrompt: 'system',
    userPrompt: 'user',
    promptVersion: 'test-1',
    stubResponse,
  };
}

describe('configuration defaults', () => {
  it('defaults both model IDs to the verified identifiers', () => {
    const result = loadProviderConfig({ NEBIUS_API_KEY: 'k' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.modelId).toBe('Qwen/Qwen3-235B-A22B-Instruct-2507');
    expect(result.config.comparisonModelId).toBe('openai/gpt-oss-120b');
    expect(result.config.baseUrl).toBe('https://api.studio.nebius.com/v1');
  });

  it('still requires the API key in live mode', () => {
    const result = loadProviderConfig({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((p) => p.variable)).toEqual(['NEBIUS_API_KEY']);
  });
});

describe('strict JSON schema emission', () => {
  it('produces a schema the provider will accept in strict mode', () => {
    const schema = toStrictJsonSchema(ModelSynthesisSchema as never) as {
      additionalProperties: boolean;
      required: string[];
      properties: { recommendations: { items: { additionalProperties: boolean; required: string[] } } };
    };

    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain('recommendations');
    expect(schema.required).toContain('abstention_note');

    const item = schema.properties.recommendations.items;
    expect(item.additionalProperties).toBe(false);
    // Strict mode requires every property to be listed as required.
    expect(item.required).toContain('evidence_ids');
    expect(item.required).toContain('player_actions');
    expect(item.required).toContain('prior_recommendation_id');
  });

  it('does not offer the model anywhere to put a confidence score', () => {
    const json = JSON.stringify(toStrictJsonSchema(ModelSynthesisSchema as never));
    expect(json).not.toMatch(/confidence|probability|likelihood/i);
  });
});

describe('stub transport', () => {
  it('labels its output as stub and reports no token usage', async () => {
    const client = ModelClient.create(stubConfig);
    const response = await client.complete(request(() => ({ answer: 'ok' })));

    expect(client.mode).toBe('stub');
    expect(response.value.answer).toBe('ok');
    expect(response.telemetry.transport).toBe('stub');
    expect(response.telemetry.input_tokens).toBeNull();
    expect(response.telemetry.output_tokens).toBeNull();
    expect(response.telemetry.usage_note).toMatch(/no provider call was made/i);
    expect(response.repaired).toBe(false);
  });

  it('never reports a cost it could not derive', async () => {
    const client = ModelClient.create(stubConfig);
    const response = await client.complete(request(() => ({ answer: 'ok' })));
    expect(response.telemetry.estimated_inference_cost_usd).toBeNull();
    expect(response.telemetry.pricing_basis).toMatch(/not estimated/i);
  });
});

describe('bounded repair', () => {
  it('repairs invalid output and counts every attempt', async () => {
    const client = ModelClient.create(stubConfig);
    let call = 0;
    const response = await client.complete(
      request(() => {
        call += 1;
        return call === 1 ? { wrong_field: true } : { answer: 'repaired' };
      }),
    );

    expect(response.value.answer).toBe('repaired');
    expect(response.repaired).toBe(true);
    expect(response.telemetry.retry_count).toBe(1);
    expect(response.telemetry.call_count).toBe(2);
  });

  it('fails with invalid_model_output when the budget is exhausted', async () => {
    const client = ModelClient.create(stubConfig);
    await expect(client.complete(request(() => ({ nope: 1 })))).rejects.toMatchObject({
      code: 'invalid_model_output',
    });
  });

  it('rejects output carrying an invented field', async () => {
    const client = ModelClient.create(stubConfig);
    await expect(
      client.complete(request(() => ({ answer: 'ok', confidence: 0.9 }))),
    ).rejects.toMatchObject({ code: 'invalid_model_output' });
  });
});

describe('missing configuration', () => {
  it('refuses to construct a live client without an API key', () => {
    expect(() => ModelClient.create({ ...stubConfig, mode: 'live' })).toThrow(ProviderError);
    try {
      ModelClient.create({ ...stubConfig, mode: 'live' });
    } catch (error) {
      expect((error as ProviderError).code).toBe('missing_configuration');
      expect((error as ProviderError).retryable).toBe(false);
    }
  });

  it('does not quietly fall back to the stub transport', () => {
    // Degrading to a fixture here is how canned output gets presented as live
    // inference. Choosing stub mode has to be deliberate.
    expect(() => ModelClient.create({ ...stubConfig, mode: 'live' })).toThrow();
  });

  it('renders as a structured error carrying remediation', () => {
    try {
      ModelClient.create({ ...stubConfig, mode: 'live' });
    } catch (error) {
      const structured = (error as ProviderError).toStructuredError('run_abc');
      expect(structured.error.code).toBe('missing_configuration');
      expect(structured.error.retryable).toBe(false);
      expect(structured.error.remediation).not.toBeNull();
      expect(structured.run_id).toBe('run_abc');
    }
  });
});

describe('usage accounting', () => {
  it('reads the provider usage object rather than guessing', () => {
    expect(readUsage({ prompt_tokens: 100, completion_tokens: 21 })).toEqual({
      input_tokens: 100,
      output_tokens: 21,
      note: null,
    });
  });

  it('counts reasoning tokens, which live in completion_tokens', () => {
    // The comparison model spends far more completion tokens for an equivalent
    // answer. Cost must follow billed tokens, not visible content length.
    const reasoning = readUsage({ prompt_tokens: 100, completion_tokens: 111 });
    const direct = readUsage({ prompt_tokens: 100, completion_tokens: 21 });
    expect(reasoning.output_tokens).toBe(111);
    expect(direct.output_tokens).toBe(21);
  });

  it('returns nulls with a reason when usage is absent', () => {
    expect(readUsage(undefined)).toEqual(USAGE_UNAVAILABLE);
    expect(readUsage({}).note).toMatch(/did not return a usage object/i);
  });

  it('flags partially reported usage instead of assuming zero', () => {
    const usage = readUsage({ prompt_tokens: 100 });
    expect(usage.input_tokens).toBe(100);
    expect(usage.output_tokens).toBeNull();
    expect(usage.note).toMatch(/partially/i);
  });

  it('sums usage across retries so failed attempts are still billed', () => {
    const total = sumUsage([
      { input_tokens: 100, output_tokens: 20, note: null },
      { input_tokens: 120, output_tokens: 30, note: null },
    ]);
    expect(total.input_tokens).toBe(220);
    expect(total.output_tokens).toBe(50);
  });
});

describe('cost estimation', () => {
  it('stays null with a stated reason when no price basis is supplied', () => {
    const estimate = estimateCost({ input_tokens: 1000, output_tokens: 500, note: null }, stubConfig);
    expect(estimate.usd).toBeNull();
    expect(estimate.basis).toMatch(/no pricing endpoint/i);
  });

  it('computes from supplied prices and labels itself inference-only', () => {
    const estimate = estimateCost(
      { input_tokens: 1_000_000, output_tokens: 1_000_000, note: null },
      { ...stubConfig, priceInputPerMTok: 0.2, priceOutputPerMTok: 0.6 },
    );
    expect(estimate.usd).toBeCloseTo(0.8, 6);
    expect(estimate.basis).toMatch(/inference only/i);
  });

  it('stays null when usage is incomplete, even with prices supplied', () => {
    const estimate = estimateCost(USAGE_UNAVAILABLE, {
      ...stubConfig,
      priceInputPerMTok: 0.2,
      priceOutputPerMTok: 0.6,
    });
    expect(estimate.usd).toBeNull();
  });
});

describe('rate limits', () => {
  it('reads limits from response headers rather than hard-coding them', () => {
    // Shaped like a real response: counts are bare integers, resets are Go-style
    // duration strings. An earlier version parsed both with Number() and threw
    // the reset values away as NaN.
    const headers = new Headers({
      'x-ratelimit-remaining-requests': '599',
      'x-ratelimit-remaining-tokens': '399000',
      'x-ratelimit-reset-requests': '1s',
      'x-ratelimit-reset-tokens': '1s',
    });
    expect(readRateLimit(headers)).toEqual({
      requestsRemaining: 599,
      tokensRemaining: 399_000,
      resetRequestsSeconds: 1,
      resetTokensSeconds: 1,
    });
  });

  it('reports nulls when the provider sends no limit headers', () => {
    expect(readRateLimit(undefined)).toEqual({
      requestsRemaining: null,
      tokensRemaining: null,
      resetRequestsSeconds: null,
      resetTokensSeconds: null,
    });
  });

  it('distinguishes an absent header from an unparseable one', () => {
    const unparseable = new Headers({ 'x-ratelimit-reset-requests': 'soon' });
    expect(readRateLimit(unparseable).resetRequestsSeconds).toBeNull();
    expect(readRateLimit(new Headers()).resetRequestsSeconds).toBeNull();
  });
});

describe('duration parsing', () => {
  it('reads the suffixed forms the provider actually sends', () => {
    expect(parseDurationSeconds('1s')).toBe(1);
    expect(parseDurationSeconds('500ms')).toBeCloseTo(0.5, 6);
    expect(parseDurationSeconds('2m')).toBe(120);
    expect(parseDurationSeconds('1h')).toBe(3600);
  });

  it('sums compound durations', () => {
    expect(parseDurationSeconds('1m30s')).toBe(90);
    expect(parseDurationSeconds('1h0m5s')).toBe(3605);
  });

  it('accepts a bare number as seconds', () => {
    expect(parseDurationSeconds('30')).toBe(30);
    expect(parseDurationSeconds('1.5')).toBe(1.5);
  });

  it('returns null rather than a guess for input it cannot read', () => {
    expect(parseDurationSeconds('soon')).toBeNull();
    expect(parseDurationSeconds('')).toBeNull();
    expect(parseDurationSeconds(null)).toBeNull();
    expect(parseDurationSeconds(undefined)).toBeNull();
  });
});
