/**
 * Fetch helpers for bounded public refresh (EWE-76).
 *
 * The fetcher is injectable so unit tests never hit the network, and so a failed
 * live call cannot be silently replaced with a fabricated page.
 */

export interface FetchedPage {
  readonly url: string;
  readonly ok: boolean;
  readonly status: number | null;
  readonly bodyText: string | null;
  readonly fetchedAt: string;
  readonly error: string | null;
}

export type PageFetcher = (url: string) => Promise<FetchedPage>;

/** Default live fetcher. Failures return ok:false — they never invent content. */
export async function fetchPageLive(url: string, now: () => string = () => new Date().toISOString()): Promise<FetchedPage> {
  const fetchedAt = now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'text/html,text/plain;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        url,
        ok: false,
        status: response.status,
        bodyText: null,
        fetchedAt,
        error: `HTTP ${response.status}`,
      };
    }
    const bodyText = await response.text();
    return { url, ok: true, status: response.status, bodyText, fetchedAt, error: null };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      bodyText: null,
      fetchedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Strip tags coarsely — enough for excerpt location, not a browser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
