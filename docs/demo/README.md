# `docs/demo/` — demo and submission artifacts

Material for the five-minute demonstration and the event submission packet, for [Squad Screen — Match Intelligence MVP](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c).

> **Owner decisions (2026-09-23):** provisional named customer/target is **PSV** (may change; not a deal or outreach auth) — see [`customer-and-pilot.md`](./customer-and-pilot.md). **EWE-75 rehearse/submit is on hold** — do not run rehearsals or submit until the owner lifts the hold.

## Files and who owns them

Three different issues write into this directory. **Do not edit a file you do not own.**

| File | Owner | State |
| --- | --- | --- |
| [`five-minute-demo-script.md`](./five-minute-demo-script.md) | [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) | Drafted; rehearse/submit **on hold** |
| [`operational-runbook.md`](./operational-runbook.md) | EWE-75 | Drafted; failure modes unobserved; rehearse **on hold** |
| [`submission-checklist.md`](./submission-checklist.md) | EWE-75 | Drafted; rehearse/submit **on hold** per owner |
| [`limitations.md`](./limitations.md) | EWE-75 | Drafted; needs a pass after EWE-72 and EWE-73 |
| [`customer-and-pilot.md`](./customer-and-pilot.md) | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | On `main`; provisional named target **PSV** (may change) |
| [`model-comparison.md`](./model-comparison.md) | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results), evaluation slice | On `main` with live comparison results |

## Read them in this order

1. **[`five-minute-demo-script.md`](./five-minute-demo-script.md)** — the beat-by-beat sequence, what is on screen at each beat, and the substantiation ledger that records what each claim rests on.
2. **[`operational-runbook.md`](./operational-runbook.md)** — startup, credential check, reset, failure recovery, backup recording, rehearsal protocol.
3. **[`submission-checklist.md`](./submission-checklist.md)** — the packet contents, the acceptance criteria, and the claims gate to walk before freeze.
4. **[`limitations.md`](./limitations.md)** — what the demo does not establish.

## Current state

Product code for EWE-60–EWE-73 and stretch EWE-76–EWE-78 is on `main`. Pilot instruments for EWE-79–EWE-82 are under `docs/pilot/`. Live model comparison is published. **EWE-75 rehearse/submit remains on hold** until the owner resumes it.

Blocked on Ewerton (when hold lifts): presenter choice, whether the provisional PSV name stays for the pitch, and optional `SQUAD_SCREEN_PUBLIC_REFRESH` wiring.
