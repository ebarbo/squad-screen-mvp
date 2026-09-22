/**
 * Shared HTTP plumbing for the API routes (EWE-67).
 *
 * Every failure leaves here as `{error:{code,message,retryable,remediation}}`
 * with a status that matches the code, so a caller can tell "fix your config"
 * from "retry" from "you asked for something that does not exist" without
 * reading prose.
 */
import { NextResponse } from 'next/server';
import type { ErrorCode } from '@/domain/contracts';
import { ProviderError } from '@/server/models/errors';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  missing_configuration: 503,
  provider_timeout: 504,
  provider_error: 502,
  invalid_model_output: 502,
  source_unavailable: 502,
  unknown_fixture: 404,
  unknown_run: 404,
  invalid_request: 400,
  constraint_violation: 422,
};

export function errorResponse(error: unknown, runId?: string): NextResponse {
  if (error instanceof ProviderError) {
    return NextResponse.json(error.toStructuredError(runId), { status: STATUS_BY_CODE[error.code] });
  }

  // An unexpected throw is still returned in the structured shape rather than as
  // an HTML error page, but the detail is deliberately generic: an internal
  // message could carry a key or a private source excerpt.
  console.error('Unhandled API failure', error);

  return NextResponse.json(
    {
      error: {
        code: 'provider_error' as const,
        message: 'The server failed unexpectedly while handling this request.',
        retryable: true,
        remediation: 'Check the server log for the underlying failure.',
      },
      ...(runId === undefined ? {} : { run_id: runId }),
    },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ProviderError('invalid_request', 'The request body is not valid JSON.', {
      retryable: false,
      remediation: 'Send a JSON object with the documented fields.',
    });
  }
}

/** Turn a Zod failure into the same structured error shape. */
export function invalidRequest(issues: readonly { path: PropertyKey[]; message: string }[]): ProviderError {
  const detail = issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
  return new ProviderError('invalid_request', `The request body does not match the contract: ${detail}`, {
    retryable: false,
    remediation: 'See the request schemas in src/domain/contracts.ts.',
  });
}
