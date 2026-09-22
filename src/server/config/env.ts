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

/**
 * Confirmed reachable with the supplied API key against the base URL above.
 *
 * Two things that call is *not* evidence of, and which should not be claimed:
 * that the key belongs to the hackathon event account, and that an organiser
 * approved these models. The API exposes no tenant identity endpoint, so the
 * account question is currently unverifiable from our side and is pending
 * confirmation in the Nebius console.
 *
 * These are identifiers, not secrets, so they are defaulted rather than
 * required: hard-failing on a missing model ID buys nothing when a known-good
 * value exists. The API key has no equivalent default and stays mandatory.
 *
 * The primary is the non-thinking `Instruct` variant on purpose. It is
 * Apache-2.0, instruction-tuned, and returns the answer directly with no
 * reasoning preamble to strip.
 */
export const DEFAULT_MODEL_ID = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

/**
 * Comparison model for EWE-73. This one is a reasoning model: it puts its chain
 * of thought in a separate `reasoning` field and leaves `content` clean, so no
 * parsing change is needed — but it spends substantially more completion tokens
 * for an equivalent answer. Token accounting therefore reads the provider's
 * usage fields and never estimates from response length.
 */
export const DEFAULT_COMPARISON_MODEL_ID = 'openai/gpt-oss-120b';

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
 * In `live` mode an API key is mandatory: without it we cannot make a real
 * call, and returning a canned success instead is explicitly forbidden by the
 * project contract. In `stub` mode nothing is required, but the transport
 * labels every response it produces so it cannot be mistaken for live
 * inference.
 *
 * This resolves configuration only and performs no network call, so a
 * successful result means "usable-looking", not "reachable".
 * `npm run demo:intelligence` is what actually proves the provider answers.
 */
export function loadProviderConfig(env: Env = process.env): ConfigResult {
  const problems: ConfigProblem[] = [];
  const mode = resolveMode(env, problems);

  const apiKey = read(env, 'NEBIUS_API_KEY');
  const modelId = read(env, 'SQUAD_SCREEN_MODEL_ID');

  // The key is the only value with no safe default: there is nothing to fall
  // back to, and guessing would turn a configuration mistake into a failed call
  // at demo time.
  if (mode === 'live' && apiKey === null) {
    problems.push({
      variable: 'NEBIUS_API_KEY',
      message:
        'Not set. Add the Nebius Token Factory API key to .env.local, ' +
        'or set SQUAD_SCREEN_MODEL_MODE=stub to run offline with a labeled stub transport.',
    });
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
      modelId: modelId ?? DEFAULT_MODEL_ID,
      comparisonModelId: read(env, 'SQUAD_SCREEN_COMPARISON_MODEL_ID') ?? DEFAULT_COMPARISON_MODEL_ID,
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
