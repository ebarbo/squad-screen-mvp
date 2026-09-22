# `docs/demo/` — demo and submission artifacts

Material for the five-minute demonstration and the event submission packet, for [Squad Screen — Match Intelligence MVP](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c).

## Files and who owns them

Three different issues write into this directory. **Do not edit a file you do not own.**

| File | Owner | Where it is |
| --- | --- | --- |
| [`five-minute-demo-script.md`](./five-minute-demo-script.md) | [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) | This branch |
| [`operational-runbook.md`](./operational-runbook.md) | EWE-75 | This branch |
| [`submission-checklist.md`](./submission-checklist.md) | EWE-75 | This branch |
| [`limitations.md`](./limitations.md) | EWE-75 | This branch |
| `customer-and-pilot.md` | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | **Branch `feat/ewe-74-customer-and-pilot`, at `b5093cc`** |
| `model-comparison.md` | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results), evaluation slice | **Not yet written**, and no branch exists for it |

> **`docs/` is not on `main` at all.** Every file above lives only on a feature branch, so the relative links between them do not resolve until the branches converge. In particular, this document's links to `customer-and-pilot.md` will 404 from here — read it on its own branch.

## Read them in this order

1. **[`five-minute-demo-script.md`](./five-minute-demo-script.md)** — the beat-by-beat sequence, what is on screen at each beat, and the substantiation ledger that records what each claim rests on.
2. **[`operational-runbook.md`](./operational-runbook.md)** — startup, credential check, reset, failure recovery, backup recording, rehearsal protocol.
3. **[`submission-checklist.md`](./submission-checklist.md)** — the packet contents, the acceptance criteria, and the claims gate to walk before freeze.
4. **[`limitations.md`](./limitations.md)** — what the demo does not establish.

## Current state

`main` was at `b6aeea1` when this was written and carries EWE-60 through EWE-63 — the scaffold and command set, the shared contracts, CI, the fixture packet and the Token Factory adapter. The server pipeline from EWE-64 onward, the UI, and `docs/` are not there yet. **`main` is moving every few minutes**, so re-check before assembling the packet.

The commands in the runbook are real. Everything about what appears on screen is still specification, no measurement of any kind exists, and **no live provider call has been made from this project**. Each document uses the same three tags: **VERIFIED** (observed), **SPECIFIED** (required behaviour, not yet built), **PENDING** (blocked).

Blocked on Ewerton: `NEBIUS_API_KEY` and `SQUAD_SCREEN_MODEL_ID` for live inference, `SQUAD_SCREEN_COMPARISON_MODEL_ID` for the comparison, and the decision on whether a target club is named.
