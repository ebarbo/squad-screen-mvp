# Model comparison — observed results

Owner: EWE-73. Harness: [`evals/`](../../evals/README.md). Rubric, fixed before any run:
[`evals/rubric.md`](../../evals/rubric.md).

## Status: Pending (not measured)

**No comparison has been measured.** Latency, token and cost cells stay empty on purpose:
EWE-73 forbids inventing figures. A live attempt was made with `NEBIUS_API_KEY` present; it
did not reach the provider.

| Attempt | Detail |
| --- | --- |
| When | 2026-09-22T23:22:08Z (Node v22.22.2) |
| Command | `npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured` with defaults `SQUAD_SCREEN_MODEL_ID=Qwen/Qwen3-235B-A22B-Instruct-2507` and `SQUAD_SCREEN_COMPARISON_MODEL_ID=openai/gpt-oss-120b` |
| Exit | 1 |
| Result | 20/20 runs `missing_pipeline` — harness cannot import `@/server/intelligence` / `@/server/scenarios` package exports `generateRecommendations` / `reevaluateScenario` (directories exist; no `index` facade). Wall clock ~52 ms; no provider calls. |
| Artifacts | Local only: `evals/results/ewe-73-measured/{summary.md,run.json,human-review.csv}` — every metric cell is `not measured` |
| Side check | `npm run demo:intelligence` (live) succeeds on the same key via `src/server/runs/service.ts`; that is not an EWE-73 harness measurement |

Unblock: add harness-facing exports matching `evals/README.md`, then re-run the command below.

## The exact command that produces this table

```bash
export NEBIUS_API_KEY=...                     # server-side only, never committed
export SQUAD_SCREEN_MODEL_ID=Qwen/Qwen3-235B-A22B-Instruct-2507
export SQUAD_SCREEN_COMPARISON_MODEL_ID=openai/gpt-oss-120b
export NEBIUS_BASE_URL=https://api.studio.nebius.com/v1

npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured
```

That writes `evals/results/ewe-73-measured/` containing `summary.md`, `run.json` and
`human-review.csv`. Every cell in the table below is then copied from `summary.md`, and every
figure in `summary.md` traces to a field in `run.json`.

The source-entailment column needs a person. After the run:

```bash
# fill entailment_verdict, reviewer and reviewed_at in the emitted worksheet, then:
npm run eval -- --mode live --repeats 2 --run-id ewe-73-reviewed \
  --human-review evals/results/ewe-73-measured/human-review.csv
```

## Result table

| Metric | `Qwen/Qwen3-235B-A22B-Instruct-2507` | `openai/gpt-oss-120b` |
| --- | --- | --- |
| Cases fully compliant | Pending (not measured) | Pending (not measured) |
| Deterministic checks passed | Pending (not measured) | Pending (not measured) |
| Deterministic checks failed | Pending (not measured) | Pending (not measured) |
| Median latency | Pending (not measured) | Pending (not measured) |
| Total input tokens | Pending (not measured) | Pending (not measured) |
| Total output tokens | Pending (not measured) | Pending (not measured) |
| Retries | Pending (not measured) | Pending (not measured) |
| Total calls | Pending (not measured) | Pending (not measured) |
| Estimated inference cost | Pending (not measured) — see note below | Pending (not measured) — see note below |
| Source entailment (human) | Pending human review | Pending human review |

**Cost will most likely stay empty even after a successful run.** The Token Factory API
exposes no pricing or billing endpoint, so a per-token price can only come from the Nebius
console. Unless `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` and `SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK`
are supplied, the harness reports cost as not measured with that reason. It does not derive
a price from token counts, from latency, or from another provider's published rates.

## Settings, fixed and identical across both models

| Setting | Value |
| --- | --- |
| Cases | 5 (complete evidence, conflicting availability, missing tactical support, unavailable Player A, irrelevant context change) |
| Repeats per case per model | 2 |
| Runs at full scale | 5 × 2 × 2 = 20 |
| Temperature / top-p / max output tokens / seed | 0 / 1 / 2048 / 7 |
| Cache policy | Disabled. Every repeat is an independent call; no response is reused across repeats or models |
| Timeout / max retries | 30000 ms / 2 |
| Input fingerprint | SHA-256 over the canonical context, prompt, output schema and settings. The harness aborts the comparison if the two models did not see identical bytes |

## What this comparison can and cannot show

The two models differ on three axes at once: different lab and family, a different
mixture-of-experts shape with far fewer active parameters, and reasoning versus
non-reasoning. That makes the outcome genuinely open rather than a foregone size ablation —
and it also means a difference cannot be attributed to any one of those properties. The
report will say which model was better on which check and which metric. It will not explain
why, because five cases cannot support that claim.

One measurement detail worth stating up front: `gpt-oss-120b` returns chain of thought in a
separate `reasoning` field, so its `content` parses cleanly, but the reasoning tokens are
still counted and still billed. In one confirmed exchange it spent 111 completion tokens
where Qwen spent 21 for an equivalent answer. The harness reads token counts from the
provider's usage fields only, never from response length, which would undercount the
reasoning model by roughly the amount that matters.

Both models run the identical pipeline, so any difference is attributable to model choice
rather than workflow architecture. That separation is the point of the experiment.

**Small sample:** 5 fixed cases, 2 repeats per case per model. These results show contract
compliance and stability on one fixture, not general model quality.

## What has actually been verified

```
npm run eval                                        # recorded transport (harness self-check)
npx vitest run --config evals/vitest.config.ts      # harness unit tests
npm run typecheck && npx eslint evals               # clean when last verified
```

A tie or a trade-off is a valid outcome of the measured run and will be reported as one.
