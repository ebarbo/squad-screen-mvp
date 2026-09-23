import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTING_MODE,
  aggregateRoutingTelemetry,
  loadRoutingConfig,
  planRouting,
} from '@/server/models/routing';

describe('model routing config', () => {
  it('defaults to single-model synthesis', () => {
    const config = loadRoutingConfig({});
    expect(config.mode).toBe(DEFAULT_ROUTING_MODE);
    expect(config.mode).toBe('single');
    expect(config.extractionModelId).toBeNull();
    expect(planRouting(config).stages).toEqual(['synthesize']);
  });

  it('isolates extract-then-synthesize when opted in', () => {
    const config = loadRoutingConfig({
      SQUAD_SCREEN_ROUTING_MODE: 'extract_then_synthesize',
      SQUAD_SCREEN_MODEL_ID: 'synth-model',
      SQUAD_SCREEN_EXTRACTION_MODEL_ID: 'extract-model',
    });
    expect(config.mode).toBe('extract_then_synthesize');
    expect(config.synthesisModelId).toBe('synth-model');
    expect(config.extractionModelId).toBe('extract-model');
    expect(planRouting(config).stages).toEqual(['extract', 'synthesize']);
  });

  it('aggregates every stage call and discloses failures without inventing tokens', () => {
    const totals = aggregateRoutingTelemetry([
      {
        stage: 'extract',
        modelId: 'extract-model',
        durationMs: 120,
        inputTokens: 100,
        outputTokens: 40,
        callCount: 1,
        retryCount: 0,
        estimatedInferenceCostUsd: 0.001,
        failed: false,
        failureNote: null,
      },
      {
        stage: 'synthesize',
        modelId: 'synth-model',
        durationMs: 200,
        inputTokens: null,
        outputTokens: null,
        callCount: 2,
        retryCount: 1,
        estimatedInferenceCostUsd: null,
        failed: true,
        failureNote: 'invalid_model_output on first attempt',
      },
    ]);

    expect(totals.totalDurationMs).toBe(320);
    expect(totals.totalCallCount).toBe(3);
    expect(totals.totalRetryCount).toBe(1);
    expect(totals.inputTokens).toBeNull();
    expect(totals.outputTokens).toBeNull();
    expect(totals.estimatedInferenceCostUsd).toBeNull();
    expect(totals.failures).toEqual(['synthesize: invalid_model_output on first attempt']);
    expect(totals.usageNote).toMatch(/left null/i);
  });
});
