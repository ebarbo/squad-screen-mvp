# `docs/demo/` — demo and submission artifacts

Material for the five-minute demonstration and the event submission packet, for [Squad Screen — Match Intelligence MVP](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c).

## Files and who owns them

Three different issues write into this directory. **Do not edit a file you do not own.**

| File | Owner | State |
| --- | --- | --- |
| [`five-minute-demo-script.md`](./five-minute-demo-script.md) | [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) | Drafted |
| [`operational-runbook.md`](./operational-runbook.md) | EWE-75 | Drafted; failure modes unobserved |
| [`submission-checklist.md`](./submission-checklist.md) | EWE-75 | Drafted; most items unsatisfied |
| [`limitations.md`](./limitations.md) | EWE-75 | Drafted; needs a pass after EWE-72 and EWE-73 |
| [`customer-and-pilot.md`](./customer-and-pilot.md) | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | Being landed on `main` by its owner. Until it appears, it is on branch `feat/ewe-74-customer-and-pilot` at `b5093cc` |
| `model-comparison.md` | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results), evaluation slice | **Not yet written**, and no branch exists for it |

## Read them in this order

1. **[`five-minute-demo-script.md`](./five-minute-demo-script.md)** — the beat-by-beat sequence, what is on screen at each beat, and the substantiation ledger that records what each claim rests on.
2. **[`operational-runbook.md`](./operational-runbook.md)** — startup, credential check, reset, failure recovery, backup recording, rehearsal protocol.
3. **[`submission-checklist.md`](./submission-checklist.md)** — the packet contents, the acceptance criteria, and the claims gate to walk before freeze.
4. **[`limitations.md`](./limitations.md)** — what the demo does not establish.

## Current state

`main` was at `6754824` when this was written and carries EWE-60 through EWE-64 — the scaffold and command set, the shared contracts, CI, the fixture packet, the Token Factory adapter and the evidence pipeline. Synthesis, scenarios, the APIs and the entire UI are not there yet. **`main` is moving every few minutes**, so re-check before assembling the packet.

The commands in the runbook are real. Everything about what appears on screen is still specification, and no measurement of any kind exists. Each document uses the same three tags: **VERIFIED** (observed), **SPECIFIED** (required behaviour, not yet built), **PENDING** (blocked).

Blocked on Ewerton: `NEBIUS_API_KEY` — now the only mandatory provider variable, since EWE-63 defaulted both model IDs — and the decision on whether a target club is named.
