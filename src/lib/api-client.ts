import type {
  AvailabilityOverride,
  ErrorCode,
  FixturesResponse,
  GenerateRequest,
  RunResult,
  ScenarioRequest,
  ScenarioResult,
  StructuredError,
} from '@/domain/contracts';

/**
 * The only module the browser uses to reach the Squad Screen API.
 *
 * Requests go to same-origin relative paths, so provider credentials stay in
 * the server process. Nothing here reads, stores or forwards an API key, and a
 * call that fails is always reported as a failure — there is no path by which
 * this client can return content for a request that did not succeed.
 */

export type DataOrigin = 'live-api' | 'contract-example';

/**
 * The server's `ErrorCode` set, plus the failures that happen on this side of
 * the wire and therefore never arrive as a structured body.
 */
export type ApiFailureKind =
  | ErrorCode
  | 'route_unavailable'
  | 'client_timeout'
  | 'network_unavailable'
  | 'malformed_response'
  | 'aborted'
  | 'unexpected';

const SERVER_ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  'missing_configuration',
  'provider_timeout',
  'provider_error',
  'invalid_model_output',
  'source_unavailable',
  'unknown_fixture',
  'unknown_run',
  'invalid_request',
  'constraint_violation',
]);

/** Used when the server did not supply its own `remediation`. */
const FALLBACK_GUIDANCE: Readonly<Record<ApiFailureKind, string>> = {
  missing_configuration:
    'The server has no provider configuration. Set NEBIUS_API_KEY and SQUAD_SCREEN_MODEL_ID in the server environment, then try again.',
  provider_timeout: 'The model provider did not answer in time. Nothing was generated.',
  provider_error: 'The model provider rejected the call. Nothing was generated.',
  invalid_model_output:
    'The model returned output that failed contract validation, so it was rejected rather than displayed.',
  source_unavailable:
    'An evidence source could not be read, so no briefing was produced from the remaining sources.',
  unknown_fixture: 'This server does not know that fixture ID.',
  unknown_run: 'This server does not know that run ID. Generate a briefing first.',
  invalid_request: 'The server rejected the request as malformed.',
  constraint_violation:
    'The generated advice broke a staff-supplied constraint and was withheld rather than shown.',
  route_unavailable: 'This API route is not available on the server yet.',
  client_timeout: 'The browser stopped waiting for the server. No result was received.',
  network_unavailable: 'The server could not be reached.',
  malformed_response: 'The server replied with a body this client could not read.',
  aborted: 'The request was superseded or cancelled.',
  unexpected: 'The server returned a failure this client does not recognise.',
};

export class ApiClientError extends Error {
  readonly kind: ApiFailureKind;
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly runId: string | null;
  /** What an operator can actually do about it. */
  readonly remediation: string;

  constructor(init: {
    kind: ApiFailureKind;
    code: string;
    message: string;
    retryable: boolean;
    status?: number | null;
    runId?: string | null;
    remediation?: string | null;
  }) {
    super(init.message);
    this.name = 'ApiClientError';
    this.kind = init.kind;
    this.code = init.code;
    this.retryable = init.retryable;
    this.status = init.status ?? null;
    this.runId = init.runId ?? null;
    this.remediation = init.remediation ?? FALLBACK_GUIDANCE[init.kind];
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError;
}

export function isAbortFailure(value: unknown): boolean {
  if (isApiClientError(value)) return value.kind === 'aborted';
  return value instanceof Error && value.name === 'AbortError';
}

export interface FailureSummary {
  title: string;
  remediation: string;
  retryable: boolean;
  code: string;
}

export function describeFailure(value: unknown): FailureSummary {
  if (isApiClientError(value)) {
    return {
      title: value.message,
      remediation: value.remediation,
      retryable: value.retryable,
      code: value.code,
    };
  }
  return {
    title: value instanceof Error ? value.message : 'The request did not complete.',
    remediation: 'Nothing was generated. Try again.',
    retryable: true,
    code: 'unknown',
  };
}

export interface BriefingApi {
  /** Where the returned records came from. Anything other than `live-api` is labelled in the UI. */
  readonly origin: DataOrigin;
  listFixtures(signal?: AbortSignal): Promise<FixturesResponse>;
  generate(input: GenerateRequest, signal?: AbortSignal): Promise<RunResult>;
  reevaluate(input: ScenarioRequest, signal?: AbortSignal): Promise<ScenarioResult>;
}

export type { AvailabilityOverride };

export interface HttpBriefingApiOptions {
  basePath?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 45_000;

export function parseApiErrorBody(status: number, body: unknown): ApiClientError {
  const envelope = body as Partial<StructuredError> | undefined;
  const error = envelope?.error;

  if (error && typeof error.code === 'string' && typeof error.message === 'string') {
    return new ApiClientError({
      kind: SERVER_ERROR_CODES.has(error.code) ? (error.code as ErrorCode) : 'unexpected',
      code: error.code,
      message: error.message,
      retryable: error.retryable === true,
      status,
      runId: typeof envelope?.run_id === 'string' ? envelope.run_id : null,
      remediation: typeof error.remediation === 'string' ? error.remediation : null,
    });
  }

  if (status === 404) {
    return new ApiClientError({
      kind: 'route_unavailable',
      code: 'route_not_found',
      message: `No API route answered at this path (HTTP ${status}).`,
      retryable: false,
      status,
    });
  }

  return new ApiClientError({
    kind: 'unexpected',
    code: 'unstructured_error',
    message: `The server returned HTTP ${status} without a structured error body.`,
    retryable: status >= 500,
    status,
  });
}

export function createHttpBriefingApi(options: HttpBriefingApiOptions = {}): BriefingApi {
  const basePath = options.basePath ?? '/api';
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl;

  async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
    const doFetch = fetchImpl ?? globalThis.fetch;
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    let timedOut = false;

    if (signal) {
      if (signal.aborted) forwardAbort();
      else signal.addEventListener('abort', forwardAbort, { once: true });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await doFetch(`${basePath}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json', ...init.headers },
      });
    } catch (cause) {
      if (timedOut) {
        throw new ApiClientError({
          kind: 'client_timeout',
          code: 'client_timeout',
          message: `No response within ${Math.round(timeoutMs / 1000)} seconds.`,
          retryable: true,
        });
      }
      if (signal?.aborted === true || (cause instanceof Error && cause.name === 'AbortError')) {
        throw new ApiClientError({
          kind: 'aborted',
          code: 'aborted',
          message: 'Request cancelled.',
          retryable: false,
        });
      }
      throw new ApiClientError({
        kind: 'network_unavailable',
        code: 'network_error',
        message: cause instanceof Error ? cause.message : 'The network request failed.',
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }

    const text = await response.text();
    let parsed: unknown;

    if (text.length > 0) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        if (response.ok) {
          throw new ApiClientError({
            kind: 'malformed_response',
            code: 'unparseable_body',
            message: 'The server replied with a body that is not JSON.',
            retryable: false,
            status: response.status,
          });
        }
        throw parseApiErrorBody(response.status, undefined);
      }
    }

    if (!response.ok) throw parseApiErrorBody(response.status, parsed);

    if (parsed === null || typeof parsed !== 'object') {
      throw new ApiClientError({
        kind: 'malformed_response',
        code: 'empty_body',
        message: 'The server replied with an empty body.',
        retryable: false,
        status: response.status,
      });
    }

    return parsed as T;
  }

  return {
    origin: 'live-api',
    listFixtures: (signal) => request<FixturesResponse>('/fixtures', { method: 'GET' }, signal),
    generate: (input, signal) =>
      request<RunResult>(
        '/intelligence/generate',
        { method: 'POST', body: JSON.stringify(input) },
        signal,
      ),
    reevaluate: (input, signal) =>
      request<ScenarioResult>(
        '/intelligence/reevaluate',
        { method: 'POST', body: JSON.stringify(input) },
        signal,
      ),
  };
}
