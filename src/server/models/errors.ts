/**
 * Typed provider failures.
 *
 * The distinction an operator needs is "fix configuration", "retry", or "stop
 * trusting this output" — so the error carries a code and a retryable flag
 * rather than a message to be regex-matched. Nothing here ever degrades into a
 * successful-looking response: a failed call fails.
 */
import type { ErrorCode, StructuredError } from '@/domain/contracts';

export class ProviderError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly remediation: string | null;

  constructor(code: ErrorCode, message: string, options: { retryable: boolean; remediation?: string | null; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = options.retryable;
    this.remediation = options.remediation ?? null;
  }

  toStructuredError(runId?: string): StructuredError {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        remediation: this.remediation,
      },
      ...(runId === undefined ? {} : { run_id: runId }),
    };
  }
}

export function missingConfiguration(message: string, remediation: string): ProviderError {
  return new ProviderError('missing_configuration', message, { retryable: false, remediation });
}

export function providerTimeout(timeoutMs: number, cause?: unknown): ProviderError {
  return new ProviderError('provider_timeout', `The provider did not respond within ${timeoutMs} ms.`, {
    retryable: true,
    remediation: 'Retry, or raise SQUAD_SCREEN_MODEL_TIMEOUT_MS if the model is consistently slower than this.',
    cause,
  });
}

export function invalidModelOutput(detail: string, cause?: unknown): ProviderError {
  return new ProviderError('invalid_model_output', `The model returned output that does not satisfy the contract: ${detail}`, {
    retryable: true,
    remediation: 'The repair retry is automatic. Persistent failures usually mean the prompt and schema have drifted apart.',
    cause,
  });
}

export function providerFailure(message: string, options: { retryable: boolean; cause?: unknown }): ProviderError {
  return new ProviderError('provider_error', message, {
    retryable: options.retryable,
    remediation: options.retryable ? 'Retry. If it persists, check provider status and the account rate limits.' : null,
    cause: options.cause,
  });
}
