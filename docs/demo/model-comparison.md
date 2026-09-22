# Model comparison — observed results

Owner: EWE-73. Harness: [`evals/`](../../evals/README.md). Rubric, fixed before any run:
[`evals/rubric.md`](../../evals/rubric.md).

## Status: Pending (not measured)

**No comparison has been run. No latency, token or cost figure in this document is a
measurement, because none exists.** The table below is deliberately empty rather than
plausibly filled: EWE-73's acceptance criteria require every reported metric to trace back to
saved run metadata, and inventing figures would fail those criteria rather than satisfy them.

Two things block the measured run, and both are outside the evaluation slice:

| Blocker | What it is | Who unblocks it |
| --- | --- | --- |
| No provider credentials on the eval machine | `NEBIUS_API_KEY` is set as a project secret, but this VM booted without it | Route the run to an agent that boots with the key present |
| The pipeline the harness measures does not exist yet | Live mode calls `src/server/intelligence` (EWE-65) and `src/server/scenarios` (EWE-66). Until both land, the live transport fails with `missing_pipeline` and measures nothing | EWE-65, then EWE-66 |

The harness itself is complete and verified against recorded output. What is missing is the
provider and the pipeline, not the measurement apparatus.

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

So the blocker above is not a stand-in for unfinished work, here is what does run today:

```
npm run eval                                        # 10 runs, recorded transport, exit 0
npx vitest run --config evals/vitest.config.ts      # 67 tests pass
npm run typecheck && npx eslint evals               # clean
```

The recorded run exercises all eighteen deterministic checks across the five cases and
renders the full report, with every metric cell reading `not measured` and the output origin
stamped on every record. The test suite pins each check failing on output that violates it —
an invented evidence ID, an action for an unavailable player, 70 minutes against a supplied
cap of 45, a smuggled confidence field, an unsurfaced conflict, a revision that only swaps a
player name — so a check that stopped biting would break a test rather than produce a clean
report.

A tie or a trade-off is a valid outcome of the measured run and will be reported as one.
