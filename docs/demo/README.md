# `docs/demo/` — demo and submission artifacts

Material for the five-minute demonstration and the event submission packet, for [Squad Screen — Match Intelligence MVP](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c).

## Files and who owns them

Three different issues write into this directory. **Do not edit a file you do not own.**

| File | Owner | Status |
| --- | --- | --- |
| [`five-minute-demo-script.md`](./five-minute-demo-script.md) | [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) | Drafted |
| [`operational-runbook.md`](./operational-runbook.md) | EWE-75 | Drafted; commands pending EWE-60 |
| [`submission-checklist.md`](./submission-checklist.md) | EWE-75 | Drafted; every item unsatisfied |
| [`limitations.md`](./limitations.md) | EWE-75 | Drafted; needs a pass after EWE-72/73/74 |
| `model-comparison.md` | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results), evaluation slice | **Not yet written** |
| `customer-and-pilot.md` | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | **Not yet written** |

## Read them in this order

1. **[`five-minute-demo-script.md`](./five-minute-demo-script.md)** — the beat-by-beat sequence, what is on screen at each beat, and the substantiation ledger that records what each claim rests on.
2. **[`operational-runbook.md`](./operational-runbook.md)** — startup, credential check, reset, failure recovery, backup recording, rehearsal protocol.
3. **[`submission-checklist.md`](./submission-checklist.md)** — the packet contents, the acceptance criteria, and the claims gate to walk before freeze.
4. **[`limitations.md`](./limitations.md)** — what the demo does not establish.

## Current state, stated plainly

These are **drafts written ahead of the build**. EWE-75 has not started; its blockers EWE-72, EWE-73 and EWE-74 are open, and at the time of writing `main` held only `.gitignore`.

Nothing here reports a measurement, a screenshot, a recording or a customer. Where a value would go, there is a placeholder naming the issue or the credential that would fill it. Each document uses the same three tags: **VERIFIED** (observed), **SPECIFIED** (required behaviour, code does not exist yet), **PENDING** (blocked).

Blocked on Ewerton: `NEBIUS_API_KEY` and `SQUAD_SCREEN_MODEL_ID` for live inference, `SQUAD_SCREEN_COMPARISON_MODEL_ID` for the comparison, and the decision on whether a target club is named.
