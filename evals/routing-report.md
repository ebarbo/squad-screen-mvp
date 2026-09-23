# EWE-77 — Extraction / synthesis routing evaluation

**Status:** Default remains **single-model** synthesis. Routing is opt-in for
measurement only (`SQUAD_SCREEN_ROUTING_MODE=extract_then_synthesize`).

**Routing change isolated by:** identical source packet, identical synthesis
prompt version, and `src/server/models/routing.ts` as the only configuration
delta. Stages and model IDs are recorded per call.

## Configurations compared

| Mode | Stages | Synthesis model | Extraction model |
| --- | --- | --- | --- |
| `single` (default) | synthesize | `SQUAD_SCREEN_MODEL_ID` | — |
| `extract_then_synthesize` | extract → synthesize | `SQUAD_SCREEN_MODEL_ID` | `SQUAD_SCREEN_EXTRACTION_MODEL_ID` (falls back to comparison model id) |

## Measured results (stub transport)

Commands:

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
SQUAD_SCREEN_MODEL_MODE=stub npx vitest run tests/unit/routing.test.ts
```

Observed (unit harness, stub — no provider tokens):

- `single` plans stages `['synthesize']` and sets `extractionModelId` to `null`.
- `extract_then_synthesize` plans `['extract', 'synthesize']` and records distinct model IDs.
- `aggregateRoutingTelemetry` sums every stage’s `callCount` / `retryCount` /
  `durationMs`. When any stage omits usage or cost, **totals stay `null`** with
  an explicit `usageNote` — failures are listed, never dropped.

Live token, latency and factual-support comparison on identical packets:

> **Pending (not measured).** No live routing bake-off was run in this stretch
> pass. Until those numbers exist, inventing a speed or quality win is forbidden.

## Downstream factual support

Not measured live. The stub path does not demonstrate an extraction-quality
gain; it only proves accounting isolates the routing change.

## Default and rationale

**Keep `single`.** Reasons:

1. No measured trade-off yet on support, latency or cost.
2. The rehearsed demo path is single-model synthesis (EWE-65/67/73).
3. Extra stage increases failure surface (extraction invalid → empty refresh /
   withheld advice) without a proven benefit.

Revisit only after a live run records per-stage tokens, retries, latency and a
human support column on the same five eval cases.
