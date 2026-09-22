/**
 * Browser-side API client. Holds no credentials: every provider call happens
 * server-side behind these routes.
 */
import type { FixturesResponse, RunResult, ScenarioResult, StructuredError } from '@/domain/contracts';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly remediation: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('network_error', 'Could not reach the server.', true, 'Check the dev server is running.');
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const structured = body as StructuredError | null;
    throw new ApiError(
      structured?.error.code ?? 'provider_error',
      structured?.error.message ?? `Request failed with status ${response.status}.`,
      structured?.error.retryable ?? false,
      structured?.error.remediation ?? null,
    );
  }

  return body as T;
}

export const api = {
  fixtures: () => request<FixturesResponse>('/api/fixtures'),

  generate: (fixtureId: string) =>
    request<RunResult>('/api/intelligence/generate', {
      method: 'POST',
      body: JSON.stringify({ fixture_id: fixtureId }),
    }),

  reevaluate: (runId: string, scenarioId: string, playerId: string, availability: 'unavailable' | 'available') =>
    request<ScenarioResult>('/api/intelligence/reevaluate', {
      method: 'POST',
      body: JSON.stringify({
        run_id: runId,
        scenario_id: scenarioId,
        availability_overrides: [{ player_id: playerId, availability }],
      }),
    }),
};
