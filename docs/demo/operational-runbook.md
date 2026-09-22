# Operational runbook — demo day

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Covers | The five areas EWE-75's fourth acceptance criterion names: **startup, credentials check, reset, timeout recovery, backup recording.** |
| Status | **Draft.** Commands and configuration are real. Failure modes, reset behaviour and every timing remain unobserved. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`submission-checklist.md`](./submission-checklist.md) · [`limitations.md`](./limitations.md) |

> **What was read to write this.** `package.json`, `README.md`, `.env.example`, `.nvmrc`, `scripts/check-env.ts`, `src/server/config/env.ts`, `scripts/intelligence-demo.ts`, `evals/run-eval.ts` and `.github/workflows/ci.yml`, on `main` at commit `6754824` (EWE-60 through EWE-64), on 2026-09-22.
>
> **PUBLISHED, not executed.** Every command below is published in the repository and was read off the manifest and the scripts themselves. **The author of this document has no checkout of the repository and has run none of them.** Whoever rehearses runs them first and records the actual output. EWE-75's own handoff rule: unrun checks are not passed checks.

---

## 1. Timeline

All times CEST, 23 September 2026. The fixed points are **VERIFIED** from the Linear project record and the pickup guide; the proposed schedule inside them is this document's recommendation, not a coordinator decision.

| Time | Fixed point | Source |
| --- | --- | --- |
| 09:30 | Build window opens | Project record |
| 14:30 | **Freeze new features** | Project record, EWE-75 |
| 15:00 | Submission packet prepared | Project record, EWE-75 |
| 15:00–16:00 | Organiser's submission window | Pickup guide |
| after | Five-minute finalist pitches | Project record |

### 1.1 Proposed T-minus schedule

| Time | Action | Why here |
| --- | --- | --- |
| 13:00 | `nvm use && npm install` on the demo machine, once | Get the install done while a surprise is still cheap — see §3.3 |
| 13:15 | `npm run check:env`, then a real provider call (§4.3). Decide beat 5 Variant M or P. | The decision must be made while the slide can still be changed. |
| 13:45 | **Rehearsal 1** — full run, timed, on whatever build exists | Deliberately **before** freeze. Its job is to surface problems while they can still be fixed. A rehearsal after freeze can only discover things nobody can act on. |
| 14:00 | Fix what rehearsal 1 found. Pin the beat 4 branch. | The last window where a synthesis or UI problem is still repairable. |
| 14:15 | **Record the backup** (§7) on the near-final build | Before freeze, so a failed take can be retaken. |
| 14:30 | **Freeze.** No further feature commits. | Fixed point. |
| 14:35 | **Rehearsal 2** — on the frozen build, to the clock, no stopping | Confirms the frozen build still behaves as rehearsal 1 observed. |
| 14:45 | Assemble the packet ([`submission-checklist.md`](./submission-checklist.md)) | — |
| 15:00 | Packet ready. Owner submits. | Fixed point. EWE-75 assigns submission to the project owner. |

**This schedule is optimistic and should be treated as such.** The coordinator's own estimate puts the critical path at 250–350 minutes against a 300-minute window, so 13:45 may arrive with the core loop unfinished. §8.3 is the fallback for that case.

---

## 2. Machine and room preparation

Do this before 13:00; none of it depends on the build.

- [ ] One machine, one browser, one window. Close everything else.
- [ ] Notifications off at the OS level. Slack, mail and calendar quit, not minimised.
- [ ] Browser zoom set so the briefing is legible from the back of the room. EWE-68 requires legibility at laptop resolution; a projector is not laptop resolution, so check it on the actual screen if you can get to it.
- [ ] No terminal, editor or `.env.local` visible in any window you will share. A key on screen is a disclosure, not a slip.
- [ ] Backup recording downloaded **locally**. Not in a cloud tab, not behind a login.
- [ ] Phone hotspot available and tested. Venue Wi-Fi is a single point of failure for every provider call.
- [ ] Battery charged, charger connected.
- [ ] Second copy of [`five-minute-demo-script.md`](./five-minute-demo-script.md) on paper or a second device.

---

## 3. Startup

### 3.1 The command set

Published by EWE-60. Read off `package.json` and the README's command table; the two "exits non-zero" entries were confirmed by reading the script files themselves rather than trusting the table.

| Role | Command | What it runs | Status on `main` |
| --- | --- | --- | --- |
| Install | `npm install` | — | **Not `npm ci`.** See §3.3 |
| Dev | `npm run dev` | `next dev` — UI and API in one process, `http://localhost:3000` | ready |
| Build | `npm run build` | `next build` | ready |
| Serve build | `npm start` | `next start` | ready |
| **Credential check** | `npm run check:env` | `tsx scripts/check-env.ts` | ready — see §4 |
| Typecheck | `npm run typecheck` | `tsc --noEmit` | ready |
| Lint | `npm run lint` | `eslint .` | ready |
| Tests | `npm test` | `vitest run` | ready |
| Tests, unit | `npm run test:unit` | `vitest run tests/unit` | ready |
| Tests, integration | `npm run test:integration` | `vitest run tests/integration` | ready |
| Tests, watch | `npm run test:watch` | `vitest` | ready |
| **Verification** | `npm run verify` | `npm run typecheck && npm run lint && npm run test` | ready — chained, stops at the first failure |
| Intelligence demo | `npm run demo:intelligence` | `tsx scripts/intelligence-demo.ts` | **Exits 1 by design until EWE-67** |
| Evaluation | `npm run eval` | `tsx evals/run-eval.ts` | **Exits 1 by design until EWE-71** |

The two failing entries do not fail obscurely. `scripts/intelligence-demo.ts` prints that it is delivered by EWE-67, which depends on EWE-63 → EWE-64 → EWE-65 → EWE-66, and that nothing ran. `evals/run-eval.ts` prints that it is delivered by EWE-71, that nothing ran and no results were produced, and that no number should be recorded as measured until it has actually executed against a configured provider. Both exit 1. **A red line from either is the correct current state, not a broken install.**

### 3.2 Runtime

- Node `>=22.22.2` in `engines`, with `.nvmrc` committed — `nvm use` picks it up.
- Next 16.3.6, React 19.3.0, zod 4.6.5, vitest 3.2.7, openai 7.22.0, typescript 5.9.3, tsx 4.23.15.

### 3.3 Why `npm install` and not `npm ci`

**No `package-lock.json` is committed, and that is deliberate.** The repository is pushed through an API path whose payload budget cannot fit a ~200 KB lockfile. `npm ci` therefore cannot run, and writing it into a runbook would break the first step of demo day.

Reproducibility is handled by a different mechanism, and it is worth describing accurately rather than hand-waving at a lockfile that does not exist:

- Every direct dependency is pinned to an exact version in `package.json` — no carets, no ranges.
- `.npmrc` sets `save-exact`, so an accidental `npm install <pkg>` cannot reintroduce a range.
- `scripts/assert-pinned-deps.mjs` fails the build if any direct dependency is unpinned, or if the installed tree has drifted from the manifest. It runs in CI ahead of typecheck.

That pins the surface the project controls. Transitive dependencies still resolve at install time, so a prudent demo-day habit is to **install once, early — 13:00 in §1.1 — and not reinstall between the pre-flight and the demo.** If you are forced to reinstall, re-run `npm run verify` before going anywhere near the stage.

### 3.4 Startup sequence

```bash
nvm use                       # Node 22.22.2, from .nvmrc
npm install                   # not npm ci; no lockfile is committed, by design
cp .env.example .env.local    # then add the API key — see §4
npm run check:env             # configuration preflight; exits 1 if unusable
npm run verify                # typecheck, then lint, then tests
npm run dev                   # http://localhost:3000
```

Then, before anything else:

1. **Note the commit SHA.** Everything in the packet refers to it.
2. Confirm the fixture, as-of timestamp and data-mode labels render.
3. **Do not generate yet.** The first generation of the day is the pre-flight run (§5), not the demo.

If `npm run verify` fails, you are not demoing this build. It is chained, so it stops at the first failure and you see one problem at a time.

### 3.5 CI — exists, but see §4.4 before citing it

`.github/workflows/ci.yml` runs on push and pull request against `main`: Node from `.nvmrc`, `npm install --no-audit --no-fund`, then `scripts/assert-pinned-deps.mjs`, typecheck, lint, `npm test`, `npm run build`, and finally `scripts/assert-no-secrets-in-bundle.mjs`.

Two caveats before CI appears in the packet. It runs against the **stub transport** by design, which bounds what a green run means — §4.4. And **no run has been observed from here**: the workflow file is readable, the Actions history for this repository is not. A workflow file is not a passing build. Open a run and look at it before citing CI for anything.

---

## 4. Credential check

### 4.1 Variables

From `.env.example` and `src/server/config/env.ts`. Copy `.env.example` to `.env.local`; never commit a filled-in file.

**Only one variable is mandatory.** EWE-63 confirmed both model IDs reachable in the event account and defaulted them, on the reasoning that identifiers are not secrets and hard-failing on a known-good value buys nothing. The API key has no safe fallback and stays required.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NEBIUS_API_KEY` | **yes, in live mode** | none, deliberately | The only value with nothing safe to fall back to |
| `SQUAD_SCREEN_MODEL_ID` | no | `Qwen/Qwen3-235B-A22B-Instruct-2507` | Primary. Non-thinking Instruct variant on purpose: Apache-2.0, instruction-tuned, answers directly with no reasoning preamble to strip |
| `SQUAD_SCREEN_COMPARISON_MODEL_ID` | no | `openai/gpt-oss-120b` | EWE-73 only. A reasoning model — chain of thought goes to a separate field, but it spends considerably more completion tokens |
| `NEBIUS_BASE_URL` | no | `https://api.studio.nebius.com/v1` | `api.studio.nebius.ai` and `api.tokenfactory.nebius.com` are aliases of the same service |
| `SQUAD_SCREEN_MODEL_MODE` | no | `live` | `live` or `stub` — see §4.4 |
| `SQUAD_SCREEN_MODEL_TIMEOUT_MS` | no | `30000` | Per-request timeout |
| `SQUAD_SCREEN_MODEL_MAX_RETRIES` | no | `2` | Bounded repair retries for invalid structured output |
| `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` | no | unset | **Read from the Nebius console** — the API exposes no pricing, usage or billing endpoint. Unset leaves estimated cost `null` with that reason |
| `SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` | no | unset | As above, output side |

**Rate limits are not configurable.** They are read live from the provider's response headers, because account quotas change and a stale constant is worse than no number.

All of it is server-side. Nothing is prefixed `NEXT_PUBLIC_`, and `scripts/assert-no-secrets-in-bundle.mjs` asserts that none of these names reached a client chunk.

### 4.2 What `npm run check:env` actually does

Read from `scripts/check-env.ts` and `src/server/config/env.ts`, not from the README.

**On failure** it prints `Provider configuration is incomplete.`, then one indented line per problem naming the variable and what to do about it, then `See .env.example for the full list.` **Exit code 1.**

What counts as a problem:

- In **live** mode, `NEBIUS_API_KEY` missing. The message names the alternative explicitly — set `SQUAD_SCREEN_MODEL_MODE=stub` to run offline with a labeled stub transport. **This is now the only missing-value failure**; the model IDs are defaulted.
- A timeout or retry value that is not a positive number.
- A price value that is negative or not a number.
- An unrecognised `SQUAD_SCREEN_MODEL_MODE`, reported as `Expected one of live | stub, received "…"`.

In **stub** mode nothing is required.

**On success** it prints the mode; the API key as `set (N chars)` or `unset` — **the value itself is never printed**; the base URL; the model; the comparison model; a line stating that rate limits are read from provider response headers at call time; the timeout; the max repair retries; and the cost basis, or `unset — estimated inference cost will be reported as null`.

If the mode is `stub` it additionally prints that responses come from a deterministic offline transport, are labeled as such, and **must not be presented as live inference**. If you see that block before a demo, stop.

> **One trap.** Because the comparison model is now defaulted, `check:env` always prints a comparison model ID. **Having an ID is not having a measured comparison.** Packet item 4 needs EWE-73 to have run, not a line of configuration output.

### 4.3 What `check:env` does **not** do — read this one

**It makes no network call.** It validates configuration and nothing else. A passing `check:env` tells you the variables are well-formed. It does **not** tell you that the key works or that Token Factory is reachable.

The Linear runbook requires *"a real provider call before presenting"*. The command intended to make one is `npm run demo:intelligence` — and it **exits 1 until EWE-67 lands**.

> **So as of `6754824` there is no command that makes a real provider call.** That is a gap on the critical path for the demo, not a documentation detail.

Until EWE-67 lands, the real-call check has to happen through the running application: generate once in the browser during pre-flight (§5, step 2) and confirm from telemetry that the response did **not** come from the stub transport (§4.4). **Record which route you used in the verification report.** When EWE-67 lands, `npm run demo:intelligence` becomes the one-line version of this check and should replace it here.

### 4.4 Transport modes, and why a green CI run is not evidence of live inference

`SQUAD_SCREEN_MODEL_MODE` takes **`live` (default) or `stub`**. `src/server/config/env.ts` enumerates exactly those two as `MODEL_MODES`. An earlier draft carried an apparent third mode called `offline`; that was prose describing what `stub` *is* — "a deterministic offline transport for tests, CI and offline development" — not a value anyone could set. There was never a third mode.

Two mechanisms make the live/stub distinction enforceable rather than a matter of care, and both matter for the packet:

1. **Every response and telemetry record the stub transport produces is stamped `transport: "stub"`.** Nothing it returns can be mistaken for live inference by anything that reads telemetry — which is what makes the checks in §4.3, §7.3 and the model-naming direction in beat 7 mechanical rather than a matter of remembering. The live client also refuses to construct without a key rather than quietly degrading to the stub.
2. **CI runs with `SQUAD_SCREEN_MODEL_MODE=stub`, `SQUAD_SCREEN_MODEL_ID=stub-model` and no credentials, deliberately**, so a test can never become a billed live call.

Those two together are the reason for the following, which belongs in the packet's reasoning and not just in someone's head:

> **A green CI run is not evidence of live inference.** It is evidence that the code typechecks, lints, tests and builds against a stub transport. The only evidence of live inference is an actual call whose telemetry does not say `transport: "stub"`. Do not let the two claims merge in the submission.

And a typo cannot hurt you here: an unrecognised value is rejected by `resolveMode` with `Expected one of live | stub, received "…"`, and `check:env` exits 1. The failure this project most needed to avoid — presenting stub output as live — is not reachable by misspelling a mode.

---

## 5. Pre-flight — run once, in full, before the demo

These seven steps are the operational rehearsal from the Linear runbook document, with the real commands attached. Run them in order. Any failure is a stop.

| # | Step | Command | Pass condition |
| --- | --- | --- | --- |
| 1 | Start from the agreed integration commit; install | `nvm use && npm install` | Clean install, no manual intervention |
| 2 | Check configuration, then **make a real provider call** | `npm run check:env`, then generate once in the browser — see §4.3 | `check:env` exits 0; a live call returns valid structured output; telemetry does **not** say `transport: "stub"` |
| 3 | Load the fixture and source snapshot | — | Synthetic / snapshot / live labels all render correctly |
| 4 | Generate → inspect one source → change availability → read the change explanation → reset | — | Whole loop completes; snapshot ID unchanged across the flip; reset returns the factual briefing |
| 5 | Trigger one timeout or invalid-output path | e.g. `SQUAD_SCREEN_MODEL_TIMEOUT_MS=1 npm run dev` | Clear recovery state, understandable error, no canned success |
| 6 | Re-run the whole loop **without developer intervention** | — | Second pass behaves like the first |
| 7 | Time each call | — | Latency recorded; apply the adjustment rule in the script, §1.3 |

Step 5's command is a **suggestion, not a verified recipe** — a one-millisecond timeout should force the timeout path, but nobody has tried it and EWE-72 owns establishing how these paths are actually triggered. Do not first attempt it on stage.

Step 6 is the one people skip. It is also the one that catches state that only works the first time — and a demo is, by definition, a second run.

---

## 6. Failure recovery

One rule underneath all of it: **the error states are on-message.** This product's entire argument is that it does not fake success. A clean, legible provider error shown on stage costs you nothing if you name it correctly and keep moving. Apologising for it costs you the room.

| Failure | What you should see | Do this | Say this |
| --- | --- | --- | --- |
| Provider timeout | Typed timeout error, retryable, retries counted in telemetry | Retry once. Second failure → backup recording. | "That's a real timeout, and it's telling us so rather than making something up." |
| Invalid model output | Typed invalid-output error after the bounded repair retries (`SQUAD_SCREEN_MODEL_MAX_RETRIES`, default 2) | Retry once. Second failure → backup. | "The model returned something that failed schema validation, so it was rejected." |
| Missing configuration | Typed `missing_configuration` naming the variable | Do not attempt to fix it live. Go to backup. | — |
| Source unavailable | Structured error naming the source | Continue if the brief is still usable. | "One source is unavailable and the brief says so." |
| Unknown run or fixture ID | Structured error | Reload the page and regenerate. | — |
| Stale response overwrites newer state | Should not happen — EWE-70 forbids it | If it does, reset (§6.1) and do not toggle rapidly again. | Nothing. Move on. |
| UI wedged, no error | — | Reload the page. Regenerate. You lose the run; the fixture is unchanged. | "Let me reload that." |
| Dev server died | — | `npm run dev` again. Budget a full regeneration. | — |
| App down entirely | — | Backup recording (§7). | "I'll show you the recorded run — same build, recorded ⟨time⟩." |
| Network down | Every call fails | Phone hotspot. If that fails, backup. | — |

**Hard rule, from the technical contract:** never silently substitute anything for a failed live call. If you end up on the recording, say that you are on the recording.

**None of these has been observed.** Every "what you should see" is derived from the contract's error taxonomy and the configuration loader, not from a triggered failure. [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior) is the issue that turns them into observations, and this table should be rewritten from its report.

### 6.1 Reset

Three levels, cheapest first.

1. **Scenario reset.** The reset control in the scenario panel returns to the original factual briefing. EWE-70 acceptance criterion; **specified, unverified.** This is the one you use between rehearsals and between the pre-flight and the demo.
2. **Page reload.** Discards the run. Run IDs live in an in-memory store, so a reload is safe but you must regenerate.
3. **Dev server restart.** Stop `npm run dev`, start it again. The in-memory run store is per-process, so every run and scenario is lost. Budget for a full regeneration afterwards.

After any reset, confirm the fixture and data-mode labels render before generating again.

### 6.2 Pre-demo reset

Between the pre-flight run and the live demo: reload to a clean, ungenerated briefing page. **The demo must open on an ungenerated state**, because beat 1 ends with a live generation and the audience has to see it happen.

---

## 7. Backup recording

EWE-75 requires a backup recorded **from the working product**, and states plainly that backups do not replace the required live demo. The Linear runbook repeats it: *a recording is a backup, not a substitute.*

**Status: PENDING.** No recording exists, and the loop it would record does not exist yet.

### 7.1 What to record

The complete loop, in demo order, unedited: ungenerated page → generate → cards → open evidence → close → mark Player A unavailable → re-evaluate → change explanation → withdrawn advice still inspectable → reset.

### 7.2 How

- [ ] Record on the **near-final build**, at 14:15, so a bad take can be retaken before freeze.
- [ ] **Unedited and uncut.** If generation takes eleven seconds, the recording shows eleven seconds. Trimming it would make the recording misrepresent the product's real behaviour.
- [ ] No audio narration. You narrate live over it if you need it.
- [ ] Same window size and zoom as the live demo, so the switch is not jarring.
- [ ] Screen only. No editor, no terminal, no `.env.local`.
- [ ] Note the **commit SHA** and the **wall-clock time** of the recording. Both go in the packet, and you say the time out loud if you use it.
- [ ] Stored locally on the demo machine **and** in one other place.

### 7.3 Labelling

The recording is labelled with the commit SHA, the timestamp, the model ID used, and the data mode of every source shown.

**A recording made against the stub transport is not a valid backup for this event** and must not be presented as one. This is checkable rather than a matter of memory: the stub stamps `transport: "stub"` on every response and telemetry record it produces (§4.4). Check the telemetry visible in the take before you accept it.

---

## 8. Rehearsal protocol

EWE-75 requires two rehearsals. They have different jobs, and running them the same way wastes one.

### 8.1 Rehearsal 1 — diagnostic, before freeze

Run the whole thing, stop whenever something is wrong, and write it down. Produce:

- [ ] Measured generation latency, three samples, slowest recorded
- [ ] Measured re-evaluation latency, three samples
- [ ] **Which branch beat 4 actually takes** (A revised / B withdrawn-and-abstains / C withdrawn-plus-added)
- [ ] The verbatim `reason` text the system produced for the changed recommendation
- [ ] Whether shared-origin collapse is visible on the card used at beat 3
- [ ] Whether the flip produced a genuine change or merely a name swap — **if it is a name swap, that is a build problem, escalate immediately**; EWE-70 forbids it explicitly
- [ ] Actual elapsed time per beat against the budget
- [ ] Every wording change the run makes necessary

### 8.2 Rehearsal 2 — confirmatory, after freeze

On the frozen build, to the clock, **without stopping**, including a deliberate failure so the recovery line has been said out loud once. Produce:

- [ ] Total elapsed time, and it is under 5:00
- [ ] Confirmation that the frozen build still behaves as rehearsal 1 observed
- [ ] The final substantiation ledger walk (script §3) — every remaining PENDING either resolved or handled by wording that does not claim it

### 8.3 If there is only time for one

Rehearse **beats 1 through 4**. They contain the live product and every acceptance criterion about an unfamiliar reviewer understanding the user, inspecting a source and understanding why advice changed. Beats 5, 6 and 7 are spoken over static slides and can be delivered cold from the script. Losing rehearsal time on them is survivable; walking into beat 4 unrehearsed is not.

---

## 9. What in this document is still unverified

Stated plainly, because a runbook that hides its own gaps is worse than no runbook.

1. **No command here has been executed by this document's author.** They are published in `package.json` and the README and were read off those files and the scripts themselves. The rehearsal is what turns them into observations.
2. **Two commands are known to fail today**, by design: `npm run demo:intelligence` until EWE-67, `npm run eval` until EWE-71.
3. **There is no command that makes a real provider call** (§4.3). The pre-flight step the Linear runbook requires currently has to be done through the browser.
4. **No failure mode in §6 has been observed.** EWE-72 owns turning that table into observations, including whether the step 5 timeout recipe actually works.
5. **No latency figure exists**, so the timings in §1.1 assume calls are fast enough. Untested.
6. **No backup recording exists**, and the loop it would record does not exist yet.
7. **Reset behaviour (§6.1) is specified, not verified** — an EWE-70 acceptance criterion that has not been executed.
8. **CI exists but no run has been seen from here** (§3.5), and a green run would in any case not evidence live inference (§4.4).
9. **The T-minus schedule (§1.1) is a proposal**, not an agreed plan, and it is optimistic relative to the coordinator's own critical-path estimate.
