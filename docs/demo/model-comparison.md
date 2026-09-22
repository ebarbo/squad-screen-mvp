# Model comparison — observed results

Owner: EWE-73. Harness: [`evals/`](../../evals/README.md). Rubric, fixed before any run:
[`evals/rubric.md`](../../evals/rubric.md).

## Status: Measured (live)

Live comparison run `ewe-73-measured` completed on 2026-09-22 against `main` at
`9e24018` (pipeline facades present). Numbers below are copied from
`evals/results/ewe-73-measured/summary.md` / `run.json`. Nothing here is estimated
or invented.

| Field | Value |
| --- | --- |
| When | 2026-09-22T23:43:51Z → 2026-09-22T23:55:21Z (Node v22.22.2) |
| Command | `npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured` |
| Models | `Qwen/Qwen3-235B-A22B-Instruct-2507` (primary), `openai/gpt-oss-120b` (comparison) |
| Shared input fingerprint | `c94a6a292139ab30e20bfe15427532c9c5894c983b8fa7035289812a5a2952e5` |
| Prompt version | `strategy-35d7138deca5` |
| Primary | 10/10 runs completed (`live`) |
| Comparison | 2/10 completed (`live`); 8/10 `harness_error` (6× provider timeout 30000 ms, 2× HTTP 502) |
| Harness exit | 1 (contract-check expectation deltas; metrics were still written) |
| Cost | null — `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` / `SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` unset; Token Factory exposes no pricing endpoint |

## The exact command that produced this table

```bash
export NEBIUS_API_KEY=...                     # server-side only, never committed
export SQUAD_SCREEN_MODEL_ID=Qwen/Qwen3-235B-A22B-Instruct-2507
export SQUAD_SCREEN_COMPARISON_MODEL_ID=openai/gpt-oss-120b
export NEBIUS_BASE_URL=https://api.studio.nebius.com/v1

npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured
```

That writes `evals/results/ewe-73-measured/` containing `summary.md`, `run.json` and
`human-review.csv`. Every cell in the table below is copied from `summary.md`, and every
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
| Cases fully compliant | 0 / 5 | 0 / 5 |
| Deterministic checks passed | 122 | 23 |
| Deterministic checks failed | 20 | 4 |
| Checks n/a | 38 | 9 |
| Checks not measured | 0 | 144 |
| Runs completed / errored | 10 / 0 | 2 / 8 |
| Median latency | 5729 ms (12/12 measured calls) | 32224 ms (2/10 runs reported duration; 8 did not — partial median) |
| Total input tokens | 59149 | not measured (8/10 runs missing; partial sum withheld) |
| Total output tokens | 7761 | not measured (8/10 runs missing; partial sum withheld) |
| Retries | 0 | not measured (8/10 runs missing; partial sum withheld) |
| Total calls | 12 | not measured (8/10 runs missing; partial sum withheld) |
| Estimated inference cost | not measured — prices unset (see below) | not measured — prices unset; also incomplete runs |
| Source entailment (human) | Pending human review | Pending human review |

**Cost is null for both models.** `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` and
`SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` were unset. The Token Factory API exposes no
pricing or billing endpoint, so a per-token price can only come from the Nebius
console. The harness does not derive a price from token counts, latency, or another
provider's rates.

**Comparison-model incompleteness is load-bearing.** Six comparison runs hit the
configured 30000 ms provider timeout; two returned HTTP 502. The harness therefore
refuses to publish token/call/retry totals for that model. The latency cell is the
median over the two completed runs only, with that coverage stated above.

## Settings, fixed and identical across both models

| Setting | Value |
| --- | --- |
| Cases | 5 (complete evidence, conflicting availability, missing tactical support, unavailable Player A, irrelevant context change) |
| Repeats per case per model | 2 |
| Runs at full scale | 5 × 2 × 2 = 20 |
| Temperature / top-p / max output tokens / seed | 0 / 1 / 2048 / 7 |
| Cache policy | Disabled. Every repeat is an independent call; no response is reused across repeats or models |
| Timeout / max retries | 30000 ms / 2 |
| Input fingerprint | SHA-256 over the canonical context, prompt, output schema and settings. Shared fingerprint on this run: `c94a6a292139ab30e20bfe15427532c9c5894c983b8fa7035289812a5a2952e5` |

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

On this run neither model produced a fully compliant case. Primary failures concentrated on
`U1` (unresolved Marsh conflict not surfaced), `G4` (player actions without citing
observations), `U2` / `R2` / `R3` on the affected cases. Comparison coverage is too thin for
a fair check-by-check ranking against primary.

## What has actually been verified

```
npm run eval -- --mode live --repeats 2 --run-id ewe-73-measured   # this document
npm run eval                                        # recorded transport (harness self-check)
npx vitest run --config evals/vitest.config.ts      # harness unit tests
```

A tie or a trade-off is a valid outcome of the measured run and will be reported as one.
