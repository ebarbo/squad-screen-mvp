import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  describeConfigProblems,
  loadProviderConfig,
  redactSecret,
} from '@/server/config/env';

const liveEnv = {
  NEBIUS_API_KEY: 'test-key-value',
  SQUAD_SCREEN_MODEL_ID: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
};

describe('loadProviderConfig', () => {
  it('reports a missing API key as an actionable problem rather than throwing', () => {
    const result = loadProviderConfig({});
    expect(result.ok).toBe(false);
    if (result.ok) return;

    // The key is the only variable with no safe default. Model IDs are verified
    // identifiers rather than secrets, so they default instead of failing.
    expect(result.problems.map((problem) => problem.variable)).toEqual(['NEBIUS_API_KEY']);

    const message = describeConfigProblems(result.problems);
    expect(message).toContain('.env.example');
    expect(message).toContain('SQUAD_SCREEN_MODEL_MODE=stub');
  });

  it('accepts stub mode without credentials', () => {
    const result = loadProviderConfig({ SQUAD_SCREEN_MODEL_MODE: 'stub' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.mode).toBe('stub');
    expect(result.config.apiKey).toBeNull();
  });

  it('applies documented defaults in live mode', () => {
    const result = loadProviderConfig(liveEnv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(result.config.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(result.config.maxRetries).toBe(DEFAULT_MAX_RETRIES);
    expect(result.config.modelId).toBe('Qwen/Qwen3-235B-A22B-Instruct-2507');
  });

  it('leaves the cost basis null when pricing is not supplied', () => {
    const result = loadProviderConfig(liveEnv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.priceInputPerMTok).toBeNull();
    expect(result.config.priceOutputPerMTok).toBeNull();
  });

  it('rejects an unknown model mode', () => {
    const result = loadProviderConfig({ ...liveEnv, SQUAD_SCREEN_MODEL_MODE: 'recorded' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((p) => p.variable)).toContain('SQUAD_SCREEN_MODEL_MODE');
  });

  it('rejects a non-numeric timeout', () => {
    const result = loadProviderConfig({ ...liveEnv, SQUAD_SCREEN_MODEL_TIMEOUT_MS: 'soon' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((p) => p.variable)).toContain('SQUAD_SCREEN_MODEL_TIMEOUT_MS');
  });
});

describe('redactSecret', () => {
  it('never reveals the secret value', () => {
    expect(redactSecret('super-secret-key')).toBe('set (16 chars)');
    expect(redactSecret('super-secret-key')).not.toContain('super');
    expect(redactSecret(null)).toBe('unset');
  });
});
