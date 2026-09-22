import { describe, expect, it, vi } from 'vitest';
import { exampleRunResult } from '@/domain/examples';
import {
  ApiClientError,
  createHttpBriefingApi,
  describeFailure,
  isApiClientError,
  parseApiErrorBody,
} from '@/lib/api-client';
import { createDevelopmentApi } from '@/components/briefing/development-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseApiErrorBody', () => {
  it('keeps the server error code, retryability and remediation', () => {
    const error = parseApiErrorBody(503, {
      error: {
        code: 'missing_configuration',
        message: 'NEBIUS_API_KEY is not set.',
        retryable: false,
        remediation: 'Set NEBIUS_API_KEY on the server and restart.',
      },
    });

    expect(error.kind).toBe('missing_configuration');
    expect(error.code).toBe('missing_configuration');
    expect(error.retryable).toBe(false);
    expect(error.remediation).toBe('Set NEBIUS_API_KEY on the server and restart.');
  });

  it('distinguishes provider timeout from invalid model output', () => {
    const timeout = parseApiErrorBody(504, {
      error: { code: 'provider_timeout', message: 'timed out', retryable: true, remediation: null },
    });
    const invalid = parseApiErrorBody(502, {
      error: {
        code: 'invalid_model_output',
        message: 'schema rejected',
        retryable: true,
        remediation: null,
      },
    });

    expect(timeout.kind).toBe('provider_timeout');
    expect(invalid.kind).toBe('invalid_model_output');
    expect(invalid.remediation).toContain('rejected rather than displayed');
  });

  it('reports a missing route as unavailable rather than as a server fault', () => {
    const error = parseApiErrorBody(404, undefined);

    expect(error.kind).toBe('route_unavailable');
    expect(error.retryable).toBe(false);
  });

  it('does not claim to recognise an unknown error code', () => {
    const error = parseApiErrorBody(500, {
      error: { code: 'something_new', message: 'boom', retryable: true },
    });

    expect(error.kind).toBe('unexpected');
    expect(error.code).toBe('something_new');
  });
});

describe('createHttpBriefingApi', () => {
  it('posts the generate request to the same-origin route and returns the run', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(exampleRunResult));
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    const run = await api.generate({ fixture_id: 'fx_example_derby' });

    expect(run.run_id).toBe(exampleRunResult.run_id);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/intelligence/generate');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ fixture_id: 'fx_example_derby' }));
  });

  it('sends no authorization header, so a credential cannot leak from the browser', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ fixtures: [] }));
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await api.listFixtures();

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headerNames = Object.keys(init.headers as Record<string, string>).map((name) =>
      name.toLowerCase(),
    );
    expect(headerNames).toEqual(['content-type', 'accept']);
  });

  it('turns a structured failure into a typed error rather than returning content', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          error: { code: 'unknown_run', message: 'no such run', retryable: false, remediation: null },
          run_id: 'run_example_base',
        },
        404,
      ),
    );
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(
      api.reevaluate({
        run_id: 'run_missing',
        scenario_id: 'scn_x',
        availability_overrides: [{ player_id: 'pl_example_a', availability: 'unavailable' }],
      }),
    ).rejects.toMatchObject({ kind: 'unknown_run', runId: 'run_example_base' });
  });

  it('rejects a 200 response whose body is not JSON', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('<html>not json</html>', { status: 200 }),
    );
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(api.listFixtures()).rejects.toMatchObject({ kind: 'malformed_response' });
  });

  it('reports a client-side timeout as a timeout, not as a provider fault', async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const api = createHttpBriefingApi({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 10,
    });

    await expect(api.listFixtures()).rejects.toMatchObject({ kind: 'client_timeout' });
  });

  it('reports a caller-cancelled request as aborted so it can be ignored', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    const pending = api.listFixtures(controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('reports an unreachable server as a network failure', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const api = createHttpBriefingApi({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(api.listFixtures()).rejects.toMatchObject({
      kind: 'network_unavailable',
      retryable: true,
    });
  });
});

describe('describeFailure', () => {
  it('passes the server remediation through to the operator', () => {
    const summary = describeFailure(
      new ApiClientError({
        kind: 'missing_configuration',
        code: 'missing_configuration',
        message: 'No key configured.',
        retryable: false,
        remediation: 'Set NEBIUS_API_KEY.',
      }),
    );

    expect(summary).toEqual({
      title: 'No key configured.',
      remediation: 'Set NEBIUS_API_KEY.',
      retryable: false,
      code: 'missing_configuration',
    });
  });

  it('handles a non-Error rejection without pretending to know the cause', () => {
    const summary = describeFailure('kaboom');

    expect(summary.title).toBe('The request did not complete.');
    expect(summary.code).toBe('unknown');
    expect(isApiClientError('kaboom')).toBe(false);
  });
});

describe('createDevelopmentApi', () => {
  it('labels itself as contract-example and returns stub-transport runs', async () => {
    const api = createDevelopmentApi({ delayMs: 0 });

    expect(api.origin).toBe('contract-example');

    const run = await api.generate({ fixture_id: 'fx_example_derby' });
    expect(run.telemetry.transport).toBe('stub');
  });

  it('returns the abstaining example when asked for it', async () => {
    const api = createDevelopmentApi({ delayMs: 0, script: 'abstained' });
    const run = await api.generate({ fixture_id: 'fx_example_derby' });

    expect(run.recommendations).toEqual([]);
    expect(run.abstention_note).not.toBeNull();
  });

  it('refuses a fixture the examples do not cover', async () => {
    const api = createDevelopmentApi({ delayMs: 0 });

    await expect(api.generate({ fixture_id: 'fx_not_an_example' })).rejects.toMatchObject({
      kind: 'unknown_fixture',
    });
  });

  it('derives the example fixture cutoff from the records rather than inventing one', async () => {
    const api = createDevelopmentApi({ delayMs: 0 });
    const { fixtures } = await api.listFixtures();
    const fixture = fixtures[0];

    expect(fixture?.id).toBe('fx_example_derby');
    expect(fixture?.information_cutoff).toBe('2026-09-22T08:30:00.000Z');
    expect(fixture?.provenance_note).toContain('placeholder');
  });
});
