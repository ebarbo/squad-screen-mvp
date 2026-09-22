/**
 * Server-only provider configuration.
 *
 * Nothing in this module may be imported from a client component: it reads
 * credentials from the process environment. The loader never throws on missing
 * configuration — it returns a structured error so callers can surface an
 * actionable message instead of a stack trace.
 */

export const MODEL_MODES = ['live', 'stub'] as const;
export type ModelMode = (typeof MODEL_MODES)[number];

export const DEFAULT_BASE_URL = 'https://api.studio.nebius.com/v1';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;

export interface ProviderConfig {
  readonly mode: ModelMode;
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly comparisonModelId: string | null;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  /** USD per million input tokens. Null means cost cannot be estimated. */
  readonly priceInputPerMTok: number | null;
  /** USD per million output tokens. Null means cost cannot be estimated. */
  readonly priceOutputPerMTok: number | null;
}

export interface ConfigProblem {
  readonly variable: string;
  readonly message: string;
}

export type ConfigResult =
  | { readonly ok: true; readonly config: ProviderConfig }
  | { readonly ok: false; readonly problems: readonly ConfigProblem[] };

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | null {
  const raw = env[name];
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function readNumber(env: Env, name: string, fallback: number, problems: ConfigProblem[]): number {
  const raw = read(env, name);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    problems.push({ variable: name, message: `Expected a positive number, received ${JSON.stringify(raw)}.` });
    return fallback;
  }
  return parsed;
}

function readPrice(env: Env, name: string, problems: ConfigProblem[]): number | null {
  const raw = read(env, name);
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    problems.push({ variable: name, message: `Expected a non-negative number of USD per million tokens, received ${JSON.stringify(raw)}.` });
    return null;
  }
  return parsed;
}

function resolveMode(env: Env, problems: ConfigProblem[]): ModelMode {
  const raw = read(env, 'SQUAD_SCREEN_MODEL_MODE');
  if (raw === null) return 'live';
  if ((MODEL_MODES as readonly string[]).includes(raw)) return raw as ModelMode;
  problems.push({
    variable: 'SQUAD_SCREEN_MODEL_MODE',
    message: `Expected one of ${MODEL_MODES.join(' | ')}, received ${JSON.stringify(raw)}.`,
  });
  return 'live';
}

/**
 * Resolve provider configuration from the environment.
 *
 * In `live` mode an API key and model ID are mandatory: without them we cannot
 * make a real call, and returning a canned success instead is explicitly
 * forbidden by the project contract. In `stub` mode neither is required, but the
 * transport labels every response it produces so it cannot be mistaken for live
 * inference.
 */
export function loadProviderConfig(env: Env = process.env): ConfigResult {
  const problems: ConfigProblem[] = [];
  const mode = resolveMode(env, problems);

  const apiKey = read(env, 'NEBIUS_API_KEY');
  const modelId = read(env, 'SQUAD_SCREEN_MODEL_ID');

  if (mode === 'live') {
    if (apiKey === null) {
      problems.push({
        variable: 'NEBIUS_API_KEY',
        message:
          'Not set. Add the Nebius Token Factory API key for the event account to .env.local, ' +
          'or set SQUAD_SCREEN_MODEL_MODE=stub to run offline with a labeled stub transport.',
      });
    }
    if (modelId === null) {
      problems.push({
        variable: 'SQUAD_SCREEN_MODEL_ID',
        message:
          'Not set. Add the approved open-weight model ID verified as available in the event account.',
      });
    }
  }

  const timeoutMs = readNumber(env, 'SQUAD_SCREEN_MODEL_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, problems);
  const maxRetries = readNumber(env, 'SQUAD_SCREEN_MODEL_MAX_RETRIES', DEFAULT_MAX_RETRIES, problems);
  const priceInputPerMTok = readPrice(env, 'SQUAD_SCREEN_PRICE_INPUT_PER_MTOK', problems);
  const priceOutputPerMTok = readPrice(env, 'SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK', problems);

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    config: {
      mode,
      apiKey,
      baseUrl: read(env, 'NEBIUS_BASE_URL') ?? DEFAULT_BASE_URL,
      modelId: modelId ?? 'stub-model',
      comparisonModelId: read(env, 'SQUAD_SCREEN_COMPARISON_MODEL_ID'),
      timeoutMs,
      maxRetries,
      priceInputPerMTok,
      priceOutputPerMTok,
    },
  };
}

/** Render configuration problems as an operator-facing message. */
export function describeConfigProblems(problems: readonly ConfigProblem[]): string {
  const lines = problems.map((problem) => `  - ${problem.variable}: ${problem.message}`);
  return ['Provider configuration is incomplete.', ...lines, '', 'See .env.example for the full list.'].join('\n');
}

/**
 * Redact a secret for logs and telemetry. Only the length class is preserved;
 * the value itself never appears.
 */
export function redactSecret(value: string | null): string {
  if (value === null) return 'unset';
  return `set (${value.length} chars)`;
}
