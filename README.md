# Squad Screen — Match Intelligence MVP

An evidence-backed pre-match briefing for one football fixture, with a live availability what-if.

For one fixture the system combines three bounded inputs — synthetic staff availability and
constraints, bounded opponent observations, and a dated public source snapshot — into **at most
three inspectable coaching recommendations**. Change one availability assumption and the system
explains which advice is revised or withdrawn, without mutating the underlying facts.

Operator: first-team opposition/performance analyst. Decision recipient: coaching staff.

## What this is not

This is a hackathon prototype, and the project's acceptance gates are mostly about not overclaiming.
So, explicitly:

- Club records in `data/demo/` are **synthetic and fictional**. They carry no medical meaning and
  describe no real person.
- There is **no confidence percentage** anywhere, because nothing here can produce a calibrated one.
- The system does not predict match outcomes, injury risk, or tactical success.
- A failed or unconfigured provider call returns a typed error. It is never replaced with a canned
  success, and the offline stub transport labels every response it produces.
- No number is reported as measured until the command that measures it has actually run.

## Requirements

- Node `22.22.2` (see `.nvmrc`; `nvm use` picks it up)
- npm

## Quick start

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in, see "Configuration"
npm run check:env            # preflight: is the configuration usable?
npm run demo:intelligence    # liveness: does the provider actually answer?
npm run dev                  # http://localhost:3000
```

Without credentials you can still run everything offline:

```bash
SQUAD_SCREEN_MODEL_MODE=stub npm run dev
npm run demo:intelligence -- --stub
```

The stub transport is deterministic and **labels every response and telemetry record as `stub`**.
It exists so tests and CI can run, not so a demo can pretend to be live.

## Commands

| Command | Does | Status |
| --- | --- | --- |
| `npm run dev` | Start the app (UI + API, one process) | ready |
| `npm run build` | Production build | ready |
| `npm start` | Serve the production build | ready |
| `npm run check:env` | Report provider configuration; non-zero if live mode is unusable | ready |
| `npm run typecheck` | `tsc --noEmit` | ready |
| `npm run lint` | ESLint | ready |
| `npm test` | Unit + integration tests | ready |
| `npm run verify` | typecheck + lint + test | ready |
| `npm run demo:intelligence` | Headless generate → re-evaluate → diff. **The pre-demo liveness check**: `check:env` makes no network call, this one does | ready |
| `npm run eval` | Five-scenario model comparison | **exits 1 until EWE-71** |

Unimplemented commands exit non-zero with an explanation. They never print a success they did not
achieve — a green line for work that has not happened is worse than no line at all.

## Configuration

All provider configuration is **server-side only**. Nothing is prefixed `NEXT_PUBLIC_`, and CI fails
the build if any of these names appear in a client chunk (`scripts/assert-no-secrets-in-bundle.mjs`).

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEBIUS_API_KEY` | live mode | Nebius Token Factory API key. The only value with no default |
| `SQUAD_SCREEN_MODEL_ID` | no | Open-weight model ID. Defaults to `Qwen/Qwen3-235B-A22B-Instruct-2507` |
| `NEBIUS_BASE_URL` | no | OpenAI-compatible endpoint; defaults to the Token Factory studio URL |
| `SQUAD_SCREEN_COMPARISON_MODEL_ID` | no | Second model for the controlled comparison. Defaults to `openai/gpt-oss-120b` |
| `SQUAD_SCREEN_MODEL_MODE` | no | `live` (default) or `stub` |
| `SQUAD_SCREEN_MODEL_TIMEOUT_MS` | no | Request timeout, default `30000` |
| `SQUAD_SCREEN_MODEL_MAX_RETRIES` | no | Bounded repair retries for invalid output, default `2` |
| `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` | no | USD per million input tokens; unset leaves estimated cost `null` |
| `SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` | no | USD per million output tokens |

Missing credentials produce an actionable message naming the variable and what to do, not a stack
trace. Cost is left `null` with a stated reason rather than guessed — this API exposes no pricing
endpoint, so prices must come from the Nebius console.

Both model IDs are **confirmed reachable with the supplied API key**. That is all it establishes:
whether the key belongs to the hackathon event account is unverified, because the API exposes no
tenant identity endpoint, and no organiser approval of these models has been recorded. Do not
describe them as "approved" or "event account" models until there is a record that says so.

## Dependencies

Every direct dependency is pinned to an exact version in `package.json`, and `.npmrc` sets
`save-exact`. The lockfile is **not** committed: this repository is pushed through an API path with
a payload budget that a 200 KB lockfile does not fit. `scripts/assert-pinned-deps.mjs` stands in for
it and runs in CI, failing if any direct dependency is unpinned or if the installed tree drifts from
the manifest.

## Layout and ownership

Parallel agents own disjoint directories. Only the bootstrap owner edits `package.json`; ask rather
than adding a dependency yourself.

| Path | Contents | Issue |
| --- | --- | --- |
| `src/domain/contracts.ts` | Zod schemas and exported types — the single source of truth | EWE-61 |
| `src/domain/examples/` | Valid and intentionally invalid contract fixtures | EWE-61 |
| `data/demo/`, `data/sources/` | Fixture, synthetic squad, opponent notes, public snapshot | EWE-62 |
| `src/server/config/` | Server-only environment configuration | EWE-60 |
| `src/server/models/` | Token Factory adapter, transports, telemetry, typed errors | EWE-63 |
| `src/server/evidence/` | Source adapters, dedup, conflict and staleness rules, snapshots | EWE-64 |
| `src/server/intelligence/` | Grounded synthesis and code-side constraint validation | EWE-65 |
| `src/server/scenarios/` | Immutable overlay, re-run, change classification | EWE-66 |
| `src/server/runs/` | In-memory run store and orchestration | EWE-67 |
| `src/app/api/` | `/api/fixtures`, `/api/intelligence/generate`, `/api/intelligence/reevaluate` | EWE-67 |
| `src/components/briefing/` | Page shell and recommendation cards | EWE-68 |
| `src/components/evidence/` | Evidence drawer | EWE-69 |
| `src/components/scenarios/` | Availability control and before/after comparison | EWE-70 |
| `evals/` | Five cases, runner, rubric, results | EWE-71, EWE-73 |
| `tests/integration/` | End-to-end and failure-mode verification | EWE-72 |
| `docs/demo/` | Customer and pilot, model comparison, demo runbook | EWE-74, EWE-75 |
| `prompts/` | Versioned synthesis prompt | EWE-65 |

Verification results are recorded in [`docs/qa-verification.md`](docs/qa-verification.md).

## Branching

`main` is the integration branch. Slices branch from it and merge back:

- `feat/ewe-68-69-briefing-and-evidence-ui`
- `feat/ewe-71-73-eval-harness`
- `feat/ewe-75-demo-runbook`

See `AGENTS.md` for the working agreement.

## Two invariants

These are in the schemas rather than bolted on afterwards, because every acceptance gate leans on
them:

1. **Traceability.** Every factual claim carries `evidence_ids` resolving to `EvidenceItem` records
   that retain source name, connector, URL or record ID, the exact excerpt, `origin_id`, observed /
   published / retrieved timestamps, and `data_mode`. Validation rejects unknown evidence IDs, so an
   uncitable claim cannot reach the UI. `origin_id` is what stops two copies of one report counting
   as independent corroboration.
2. **Immutability under the overlay.** A scenario applies availability overrides to a *copy* of the
   base `MatchContext`, which is deep-frozen, so mutating it throws rather than merely being
   discouraged. The base run and its `evidence_snapshot_id` are frozen once created. Re-evaluation
   re-runs synthesis only — no re-extraction, no search — and returns added / revised / withdrawn /
   unchanged against prior recommendation IDs. Withdrawn advice stays inspectable.

## Licence and data

Private hackathon prototype. Synthetic club data is fictional. Public source snapshots retain their
URL, excerpt and retrieval date; check each source's terms before redistributing.
