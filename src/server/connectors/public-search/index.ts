/**
 * Public-source connector surface (EWE-76).
 *
 * Optional: opt in via `applyBoundedPublicRefresh({ enabled: true })`.
 * Scenario re-evaluation must not call this module.
 */
export {
  DEMO_FIXTURE_ALLOWLIST,
  assertPublicQuery,
  findAllowlistEntry,
  hostnameOf,
  isBlockedSocialHost,
  type AllowlistedHost,
  type SourceCategory,
} from './allowlist';
export {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SYSTEM_PROMPT,
  ExtractedObservationSchema,
  ExtractionResultSchema,
  extractObservationsDeterministically,
  validateExtractionAgainstSource,
  type ExtractedObservation,
  type ExtractionResult,
} from './extract';
export { fetchPageLive, htmlToText, type FetchedPage, type PageFetcher } from './fetch';
export { buildDemoPublicRefreshQuery, type PublicRefreshQuery } from './queries';
export { applyBoundedPublicRefresh, type PublicRefreshInput, type PublicRefreshResult } from './refresh';
