# Nebius Token Factory — form paste pack

> Pointer: canonical copy lives in the project agent store at `docs/submission-form-answers.md`.
> Public pitch slides: https://htmlpreview.github.io/?https://raw.githubusercontent.com/ebarbo/squad-screen-pitch-slides/main/index.html
> Status: https://github.com/ebarbo/squad-screen-pitch-slides

Optional live product URL: **leave blank**.

---

## #2 What / problem

```
Problem first: before a fixture, a first-team opposition/performance analyst drafts a pre-match briefing for coaching staff. When a squad availability assumption changes late, they must work out which recommendations still hold — that revision step is the product bet, not “write a briefing.”

What we built: Squad Screen — for one fixture, three bounded inputs (staff-supplied availability/constraints, opponent observations, a dated public snapshot) produce at most three inspectable recommendations (observation / inference / action separated; every factual claim linked to a source excerpt). Flip a player to unavailable and the system re-runs against a frozen evidence snapshot and reports per recommendation: unchanged, revised, withdrawn, or added — with why. Zero recommendations is valid; there are no confidence percentages.

User: opposition/performance analyst (operator). Decision recipient: coaching staff. Buyer: hypothesised sporting/performance director — unconfirmed.

Company / target: provisional named target is PSV — relationship label: target only; not contacted, not interviewed, no pilot agreement, no payment discussion. A four-fixture pilot is specified with blank measures (not run). Current solutions / how often / willingness to pay: not validated with practitioners — we do not claim frequency, time saved, or revenue.
```

---

## #3 Models / Token Factory

```
Primary (synthesis): Qwen/Qwen3-235B-A22B-Instruct-2507 — proposes grounded recommendations.
Comparison: openai/gpt-oss-120b — same pipeline, same fingerprint/prompt/schema, for controlled eval only.
Both open-weight models via Nebius Token Factory (https://api.studio.nebius.com/v1). No closed / proprietary models.
Why two: fair model comparison on identical cases, not product routing. Architecture: server-side API keys only; model proposes, code validates evidence references, availability exclusions, and staff-supplied minute limits.
```

---

## #4 Measurable advantage

```
Compared against: openai/gpt-oss-120b on the same shared input fingerprint, prompt version, output schema, and settings (run ewe-73-measured, 2026-09-22; 5 cases × 2 repeats).

Observed (honest, incomplete comparison):
• Qwen primary: 10/10 runs completed; median latency 5729 ms; 122 deterministic checks passed / 20 failed; 0/5 cases fully compliant.
• gpt-oss-120b: 2/10 runs completed (8 harness errors: 6× 30s timeout, 2× HTTP 502); partial median latency 32224 ms over the 2 completed runs; 23 checks passed / 4 failed; 0/5 fully compliant; most token/call totals not published because coverage is too thin.
• Cost: null for both (prices unset; Token Factory has no pricing endpoint).
• Human source-entailment: pending.

Caveat: neither model produced a fully compliant case; comparison coverage is incomplete — this is reliability/latency under fixed smoke cases, not a clean “Qwen wins quality” claim. Small sample (5 cases).

Proof: docs/demo/model-comparison.md and evals/results/ewe-73-measured/ in this repo. Public summary: https://htmlpreview.github.io/?https://raw.githubusercontent.com/ebarbo/squad-screen-pitch-slides/main/index.html
```

---

## #5 Responsible design

```
Demo club records are synthetic/fictional and carry no medical or match-outcome meaning; API keys stay server-side, and code rejects unsupported citations and constraint-violating actions after the model answers. Open weights do not grant permission to process real club data — that needs a separate club agreement; this prototype is not production-secure.
```
