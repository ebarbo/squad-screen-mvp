# Evaluation harness

Five fixed cases, run against one or more models on byte-identical input, scored by
deterministic contract checks plus a human-reviewed entailment column.

Owner: EWE-71. Consumer: EWE-73. What each check asserts is in [`rubric.md`](./rubric.md);
this file is how to run it and how to read what it writes.

## Quick start

```bash
npm install
npm run eval                 # recorded mode: no provider, no measured metrics
```

Recorded mode replays saved fixtures. It exercises every check and writes a full report, and
**every latency, token and cost figure in that report reads `not measured`**. That is the
point: it makes the harness verifiable before credentials exist without producing a number
anyone could mistake for a benchmark.

## Commands

| Command | What it does |
| --- | --- |
| `npm run eval` | All five cases, recorded transport, repeats from `settings.json` |
| `npm run eval -- --help` | Full option list |
| `npm run eval -- --cases complete-evidence` | One case |
| `npm run eval -- --run-id my-run` | Fixed output directory name instead of a timestamp |
| `npx vitest run --config evals/vitest.config.ts` | The harness's own tests |

The root `vitest.config.ts` scopes its projects to `tests/**`, which belongs to the
integration verifier, so `npm test` does not pick these up. Running them needs the config
above. Folding an `evals` project into the root config is a one-line change for whoever owns
that file, and it would put these tests in `npm run verify`.

### The real run (EWE-73)

This is the command that produces measured results. It has not been run: this VM has no
API key.

```bash
export NEBIUS_API_KEY=...                     # server-side only, never committed
export SQUAD_SCREEN_MODEL_ID=Qwen/Qwen3-235B-A22B-Instruct-2507
export SQUAD_SCREEN_COMPARISON_MODEL_ID=openai/gpt-oss-120b
export NEBIUS_BASE_URL=https://api.studio.nebius.com/v1

# Optional. Without both, the cost column stays empty with a stated reason:
# the Token Factory API exposes no pricing endpoint, so a price can only come
# from the Nebius console. Nothing here derives one from token counts.
export SQUAD_SCREEN_PRICE_INPUT_PER_MTOK=...
export SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK=...

npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured
```

Then fill in the emitted worksheet and fold it back in:

```bash
# edit evals/results/ewe-73-measured/human-review.csv, then:
npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured-reviewed \
  --human-review evals/results/ewe-73-measured/human-review.csv
```

Live mode requires two modules that the eval slice does not own:
`src/server/intelligence` (EWE-65) and `src/server/scenarios` (EWE-66). Until both exist the
live transport fails with `missing_pipeline` and reports nothing, rather than falling back
to recorded output. A failed live call is never reported as a success.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | The run completed and every check matched the expectation declared in its case file |
| `1` | The run completed but at least one check departed from its expectation |
| `2` | The run could not be performed. Nothing was measured and no results were written |

## Output format

Each run writes three files to `evals/results/<run-id>/`. That directory is generated; it is
not committed, and any run can be reproduced with the command that made it.

### `summary.md`

Human-readable. Opens with the disclosures that must accompany any use of these numbers —
small sample, output origin, which evidence packet was used, and the absence of any
tactical-quality score. Then:

- **Run metadata** — transport, prompt version, case and repeat counts, and the shared input
  fingerprint. A comparison whose models saw different input prints
  `inputs differed — comparison invalid` and a table naming the component that diverged.
- **Measured metrics** — per model: median latency, total input and output tokens, retries,
  calls and estimated inference cost. Any cell that was not measured prints `not measured`,
  never a number, and the reasons are listed underneath.
- **Deterministic checks** — one row per check, one column per model × case, showing the
  worst outcome across repeats (`pass`, `FAIL`, `n/a`, `not measured`).
- **Compliance summary** — cases fully compliant, and check outcome totals.
- **Findings** — every check whose outcome differed from its declared expectation, with the
  reason. This is the table to read first.
- **Source entailment** — the human-review status. Reads `pending_human_review` until a
  completed worksheet is supplied.
- **Errors and unmeasured runs** — every run that did not complete, with its error code.

### `run.json`

The full machine-readable record: every run, every check result with its violations, the
input fingerprint and its per-component hashes, the resolved scenario override, and raw
telemetry. Every metric in the report traces back to a field here, which is what makes
EWE-73's "every reported metric is traceable to saved run metadata" checkable rather than
asserted.

### `human-review.csv`

One row per recommendation, pre-filled with the claim, the cited evidence IDs and their
exact excerpts, and an empty `entailment_verdict`. Fill in `entailment_verdict`
(`supported` · `partially_supported` · `unsupported` · `unclear`), `reviewer`, `reviewed_at`
and, where the verdict is not `supported`, a `note`. Pass it back with `--human-review`.

A partially filled worksheet yields no counts: a rate over an unknown denominator is exactly
the sort of number this project refuses to publish.

## Layout

```
evals/
  run-eval.ts          CLI entry point (npm run eval)
  rubric.md            what each check asserts; fixed before any run
  settings.json        decoding settings, repeats, cache policy; part of the fingerprint
  cases/               the five fixed cases, each declaring expectations per check
  prompt/              fallback prompt, used only until prompts/strategy.md exists
  packet/              stand-in match contexts, used only until the evidence layer exists
  recorded/            saved outputs the recorded transport replays
  results/             run output, one directory per run (generated, not committed)
  lib/                 checks, transports, fingerprinting, telemetry, reporting
  *.test.ts            proof that the checks fail on violations
```

## The five cases

| Case | EWE-62 variant | What it isolates |
| --- | --- | --- |
| `complete-evidence` | `complete_evidence` | Baseline. Nothing missing, so a failure is a model defect |
| `conflicting-availability` | `conflicting_availability` | Two staff records disagree about A. Rivers; the conflict must stay visible |
| `missing-tactical-support` | `missing_tactical_support` | The opponent observation is gone; abstain or qualify, do not invent |
| `unavailable-player-a` | `complete_evidence` + scenario overlay | The demo's what-if: withdraw or revise, never reassign by name swap |
| `irrelevant-context-change` | `irrelevant_context_change` | A kit note changes; the advice must not move |

Each case file declares an expected outcome for all eighteen checks and a reason for every
`not_applicable`, so an omission cannot read as a pass. They assert properties, never a
winning recommendation — fixing an expected answer would score a model on guessing the
author's phrasing.

`unavailable-player-a` runs the scenario rerun over the complete packet rather than EWE-62's
`unavailable_player_a` data variant, because only the rerun exercises the change
classification (R1–R4) that EWE-66 delivers and EWE-73 measures. The data variant covers the
same properties at the API level and belongs to EWE-72's integration tests.

## Integration seams

Three modules the harness calls but does not own. Each fails loudly with the expected
signature rather than degrading silently.

| Module | Owner | Expected export |
| --- | --- | --- |
| `src/server/evidence` | EWE-64 | `buildMatchContextForVariant(variantId) => BaseMatchContext`, taking EWE-62's variant IDs |
| `src/server/intelligence` | EWE-65 | `generateRecommendations({ context, modelId, promptText, promptVersion, settings }) => { result: RunResult, rawModelOutput }` |
| `src/server/scenarios` | EWE-66 | `reevaluateScenario({ baseContext, baseRun, scenarioId, overrides, modelId, promptText, promptVersion, settings }) => { result: ScenarioResult, rawModelOutput }` |

Until `src/server/evidence` lands, the harness builds contexts from `evals/packet`, a
hand-authored stand-in that mirrors the curated packet's identities and its two load-bearing
properties: the shared `org_clifton_wire` origin, and the unresolved Marsh disagreement. It
deliberately does **not** reimplement normalization — entity resolution, deduplication,
staleness and conflict rules are EWE-64's, and duplicating them here would mean the harness
tested its own normalizer instead of the product's. Every report names which context it used.

Similarly, the harness calls the product's synthesis and rerun services rather than the
provider directly. Measuring a bespoke call path would compare models on something the
product does not ship, and EWE-73 has to separate model choice from workflow architecture.
