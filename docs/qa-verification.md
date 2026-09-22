# QA verification report (EWE-72)

Environment: Node 22.22.2, Next 16.3.6, production build.
Transport: `stub` (`SQUAD_SCREEN_MODEL_MODE=stub`). Models configured: `Qwen/Qwen3-235B-A22B-Instruct-2507`
(primary), `openai/gpt-oss-120b` (comparison).

**Scope limit, stated up front.** No provider credential is present in this environment, so every result
below was produced through the stub transport. The live path is verified only by its error branches.
A live run is a separate, outstanding check — see "Not verified" at the end.

## Commands run

```bash
npm run verify                      # typecheck + lint + 115 tests
npm run build                       # production build
node scripts/assert-no-secrets-in-bundle.mjs
node scripts/assert-pinned-deps.mjs
npm run demo:intelligence -- --stub # headless loop
SQUAD_SCREEN_MODEL_MODE=stub npm start   # then the curl checks below
```

## Results

| Check | Result |
| --- | --- |
| Typecheck, lint | pass |
| Tests | 115 passed, 6 files |
| Production build | pass; `/api/fixtures`, `/api/intelligence/generate`, `/api/intelligence/reevaluate` all dynamic |
| No server-only variable name in client chunks | pass |
| All 22 direct dependencies pinned and matching installed tree | pass |

### Core loop over HTTP

| Step | Observed |
| --- | --- |
| `GET /api/fixtures` | 200, one fixture, `data_modes: [synthetic, snapshot]`, provenance note present |
| `POST /generate` | `run_base_0001`, snapshot `snap_4760a776d4b94f10`, 1 recommendation, `transport: stub`, cost `null` |
| `POST /reevaluate` | parent `run_base_0001`, snapshot **identical to base**, changes `[added, withdrawn]`, 1 withdrawn recommendation retained |
| Unavailable-player exclusion | 0 proposed actions name `pl_rivers` under the assumption |
| Minute limit | base action proposes exactly 45 minutes, the staff-supplied maximum |

### Failure modes

| Input | Status | Code | Retryable |
| --- | --- | --- | --- |
| Unknown fixture | 404 | `unknown_fixture` | no |
| Malformed fixture ID | 400 | `invalid_request` | no |
| Missing required field | 400 | `invalid_request` | no |
| Body is not JSON | 400 | `invalid_request` | no |
| Unknown run | 404 | `unknown_run` | no |
| Assumption about a non-squad player | 400 | `invalid_request` | no |
| Empty overrides array | 400 | `invalid_request` | no |
| Live mode with no API key | — | `missing_configuration` | no, with remediation |

No failure produced an HTML error page, a stack trace, or a success-shaped body.

### Evidence and honesty checks

- Two outlets carrying one agency report collapse to a single source; a `duplicate_origin_collapsed`
  warning names both, and the surviving record explains the collapse in `check_notes`.
- The Marsh availability disagreement stays unresolved: both records `disputed`, conflict
  `resolution: null`, surfaced as a warning.
- A superseded staff record is marked `stale` and retained, not deleted.
- Removing the full-back observation yields **zero** recommendations with an abstention note, rather
  than a plausible substitute.
- No string matching `confidence|probability|likelihood` appears in any response body.
- Stub responses carry `transport: "stub"` in telemetry and are labelled as such in the UI footer and
  the headless output.
- Estimated cost is `null` with the reason stated, since no price basis is configured.

### UI behaviour

Covered by 10 component tests: factual briefing before any assumption; scenario labelled hypothetical
with the factual value shown alongside; unchanged snapshot ID displayed on both runs; every change
explained; reset returns to the factual briefing; a slow scenario response arriving after a cancel is
discarded; a provider error renders with code, message, remediation and a retry control; every evidence
reference resolves to its record with the verbatim excerpt; an unresolvable reference says so; the
drawer takes focus and closes on Escape.

## Defects found and fixed during verification

1. **Reset was disabled while a scenario request was in flight.** The stale-response guard could
   therefore never be reached by a user, and with synthesis taking seconds an operator who changed
   their mind was stranded. Reset is now enabled during a pending request, labelled "Cancel", and
   invalidates the in-flight response. Regression test: "discards a slow scenario response that
   arrives after a reset".
2. **Rate-limit reset headers were discarded.** `Number("1s")` is `NaN`, so a value the provider did
   report was recorded as unobserved. Added a duration parser and a test using a realistic header.
   `x-ratelimit-reset-tokens` was not read at all and now is.
3. **The offline synthesis proposed a wide action without the observation it depends on**, matching
   loosely on "halfway" and picking up the mid-block press note. Tightened to require a full-back
   observation. Caught by the abstention integration test.
4. **A conflict verdict overwrote the deduplication note** on an item that was both a collapsed
   duplicate and a disputed claim, losing one of two true facts. Notes now accumulate.

## Not verified

- **A live provider call.** No credential in this environment. `npm run demo:intelligence` is the
  one-command check that exercises it; run it before presenting.
- **The live repair/retry loop and live error translation** (401/403/404/429/5xx, timeout). Exercised
  against the stub and by unit tests, never against a real provider failure. These are the largest
  untested branches.
- **Measured model comparison** (EWE-73). Requires credentials; no numbers are recorded anywhere.
