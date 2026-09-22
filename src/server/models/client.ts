/**
 * Token Factory adapter (EWE-63).
 *
 * Server-only. Two transports sit behind one interface:
 *
 *   - `live` calls Nebius Token Factory through its OpenAI-compatible endpoint,
 *     using strict JSON-schema structured output.
 *   - `stub` returns a deterministic fixture supplied by the caller, for tests,
 *     CI and offline development.
 *
 * The transport is recorded on every response and on every telemetry record, so
 * a stub result can never be mistaken for live inference. There is no path in
 * this module where a failed live call becomes a successful-looking response:
 * failures raise `ProviderError` and stop.
 */
import OpenAI from 'openai';
import { z } from 'zod';
import type { Telemetry } from '@/domain/contracts';
import { loadProviderConfig, describeConfigProblems, type ProviderConfig } from '@/server/config/env';
import { invalidModelOutput, missingConfiguration, providerFailure, providerTimeout, ProviderError } from './errors';
import {
  buildTelemetry,
  readRateLimit,
  readUsage,
  USAGE_UNAVAILABLE,
  type RateLimitSnapshot,
  type RawUsage,
} from './telemetry';

export interface StructuredRequest<T> {
  /** Validates the model's output. Strict schemas reject invented fields. */
  readonly schema: z.ZodType<T>;
  /** Name the provider associates with the schema in strict mode. */
  readonly schemaName: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly promptVersion: string;
  /** Overrides the configured model, for the EWE-73 comparison. */
  readonly modelId?: string;
  readonly temperature?: number;
  /**
   * Deterministic payload for the stub transport. Required: without it there is
   * nothing honest for stub mode to return, and inventing something here is
   * exactly the failure this project forbids.
   */
  readonly stubResponse: () => unknown;
}

export interface StructuredResponse<T> {
  readonly value: T;
  readonly telemetry: Telemetry;
  readonly rateLimit: RateLimitSnapshot;
  /** True when the first attempt failed validation and a repair attempt succeeded. */
  readonly repaired: boolean;
}

interface RawCompletion {
  readonly content: string;
  readonly usage: RawUsage;
  readonly headers: Headers | undefined;
}

interface Transport {
  readonly kind: 'live' | 'stub';
  complete(request: StructuredRequest<unknown>, jsonSchema: unknown, repairNote: string | null): Promise<RawCompletion>;
}

/* ------------------------------------------------------------------------- *
 * Transports
 * ------------------------------------------------------------------------- */

class LiveTransport implements Transport {
  readonly kind = 'live' as const;
  private readonly client: OpenAI;

  constructor(private readonly config: ProviderConfig) {
    if (config.apiKey === null) {
      throw missingConfiguration(
        'NEBIUS_API_KEY is not set, so no live call can be made.',
        'Add NEBIUS_API_KEY to .env.local, or set SQUAD_SCREEN_MODEL_MODE=stub to run offline.',
      );
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      maxRetries: 0, // Retries are counted and bounded here, not silently inside the SDK.
    });
  }

  async complete(
    request: StructuredRequest<unknown>,
    jsonSchema: unknown,
    repairNote: string | null,
  ): Promise<RawCompletion> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ];

    if (repairNote !== null) {
      messages.push({
        role: 'user',
        content:
          'Your previous response was rejected by schema validation. Return the corrected JSON only.\n' +
          `Validation error: ${repairNote}`,
      });
    }

    try {
      const response = await this.client.chat.completions
        .create({
          model: request.modelId ?? this.config.modelId,
          messages,
          temperature: request.temperature ?? 0.2,
          response_format: {
            type: 'json_schema',
            json_schema: { name: request.schemaName, strict: true, schema: jsonSchema as Record<string, unknown> },
          },
        })
        .withResponse();

      const choice = response.data.choices[0];
      // Reasoning models place chain-of-thought in a separate field and leave
      // `content` clean, so this needs no special handling — but their reasoning
      // tokens do appear in usage, which is why cost follows usage, not length.
      const content = choice?.message?.content ?? null;

      if (content === null || content.trim().length === 0) {
        throw invalidModelOutput('the response contained no message content.');
      }

      return { content, usage: readUsage(response.data.usage), headers: response.response.headers };
    } catch (error) {
      throw translateProviderError(error, this.config.timeoutMs);
    }
  }
}

class StubTransport implements Transport {
  readonly kind = 'stub' as const;

  async complete(request: StructuredRequest<unknown>): Promise<RawCompletion> {
    return {
      content: JSON.stringify(request.stubResponse()),
      usage: {
        ...USAGE_UNAVAILABLE,
        note: 'Stub transport: no provider call was made, so there is no token usage to report.',
      },
      headers: undefined,
    };
  }
}

function translateProviderError(error: unknown, timeoutMs: number): ProviderError {
  if (error instanceof ProviderError) return error;

  if (error instanceof OpenAI.APIUserAbortError || (error as { name?: string })?.name === 'AbortError') {
    return providerTimeout(timeoutMs, error);
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return providerTimeout(timeoutMs, error);
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 0;
    if (status === 401 || status === 403) {
      return new ProviderError('missing_configuration', `The provider rejected the credentials (HTTP ${status}).`, {
        retryable: false,
        remediation: 'Check NEBIUS_API_KEY is current and authorised for the configured model.',
        cause: error,
      });
    }
    if (status === 404) {
      return new ProviderError('provider_error', `The configured model was not found (HTTP 404): ${error.message}`, {
        retryable: false,
        remediation: 'Check SQUAD_SCREEN_MODEL_ID against the models available to this account.',
        cause: error,
      });
    }
    // 429 and 5xx are worth another attempt; other 4xx are our mistake.
    return providerFailure(`Provider returned HTTP ${status}: ${error.message}`, {
      retryable: status === 429 || status >= 500,
      cause: error,
    });
  }

  return providerFailure(`Unexpected provider failure: ${String(error)}`, { retryable: true, cause: error });
}

/* ------------------------------------------------------------------------- *
 * Client
 * ------------------------------------------------------------------------- */

/**
 * Strict structured output requires every property to be present in `required`
 * and `additionalProperties: false` throughout. Zod's emitter gets this right
 * for the output type, where defaults have already been applied.
 */
export function toStrictJsonSchema(schema: z.ZodType<unknown>): unknown {
  return z.toJSONSchema(schema, { io: 'output', target: 'draft-2020-12' });
}

export class ModelClient {
  private constructor(
    private readonly config: ProviderConfig,
    private readonly transport: Transport,
  ) {}

  /**
   * Build a client, or fail with an actionable configuration error.
   *
   * Note that this does not fall back to stub mode when credentials are
   * missing. Silently degrading to a fixture is how a demo ends up presenting
   * canned output as live inference; choosing stub mode has to be deliberate.
   */
  static create(config?: ProviderConfig): ModelClient {
    let resolved = config;

    if (resolved === undefined) {
      const result = loadProviderConfig();
      if (!result.ok) {
        throw missingConfiguration(
          describeConfigProblems(result.problems),
          'Run `npm run check:env` to see exactly which variables need attention.',
        );
      }
      resolved = result.config;
    }

    const transport: Transport = resolved.mode === 'stub' ? new StubTransport() : new LiveTransport(resolved);
    return new ModelClient(resolved, transport);
  }

  get mode(): 'live' | 'stub' {
    return this.transport.kind;
  }

  get modelId(): string {
    return this.config.modelId;
  }

  /**
   * Run one structured request, repairing invalid output within a bounded
   * retry budget. Every attempt — successful or not — is counted in telemetry.
   */
  async complete<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const jsonSchema = toStrictJsonSchema(request.schema as z.ZodType<unknown>);
    const startedAt = performance.now();

    const attempts: RawUsage[] = [];
    let repairNote: string | null = null;
    let lastError: ProviderError | null = null;

    const maxAttempts = this.config.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let completion: RawCompletion;

      try {
        completion = await this.transport.complete(request as StructuredRequest<unknown>, jsonSchema, repairNote);
      } catch (error) {
        const providerError = error instanceof ProviderError ? error : translateProviderError(error, this.config.timeoutMs);
        attempts.push(USAGE_UNAVAILABLE);
        lastError = providerError;
        if (!providerError.retryable) throw providerError;
        continue;
      }

      attempts.push(completion.usage);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(completion.content);
      } catch (error) {
        lastError = invalidModelOutput('the response was not valid JSON.', error);
        repairNote = 'The response was not valid JSON. Return a single JSON object and nothing else.';
        continue;
      }

      const validated = request.schema.safeParse(parsedJson);
      if (!validated.success) {
        const detail = validated.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('; ');
        lastError = invalidModelOutput(detail);
        repairNote = detail;
        continue;
      }

      return {
        value: validated.data,
        telemetry: buildTelemetry({
          modelId: request.modelId ?? this.config.modelId,
          promptVersion: request.promptVersion,
          transport: this.transport.kind,
          durationMs: performance.now() - startedAt,
          attempts,
          retryCount: attempt,
          config: this.config,
        }),
        rateLimit: readRateLimit(completion.headers),
        repaired: attempt > 0,
      };
    }

    throw (
      lastError ??
      invalidModelOutput(`no valid response after ${maxAttempts} attempt(s).`)
    );
  }
}
