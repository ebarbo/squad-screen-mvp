# Operational runbook — demo day

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Covers | The five areas EWE-75's fourth acceptance criterion names: **startup, credentials check, reset, timeout recovery, backup recording.** |
| Status | **Draft, and materially incomplete by necessity.** [EWE-60](https://linear.app/ewerton-barbosa/issue/EWE-60/platform-establish-repository-runtime-and-agent-handoff) has not landed, so **no command in this document has been run by anyone**. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`submission-checklist.md`](./submission-checklist.md) · [`limitations.md`](./limitations.md) |

> **Read this before using the document.** At the time of writing, `main` was commit `2674040` and contained exactly one file, `.gitignore`. There is no application to start. Every command below is a **placeholder for a command EWE-60 must publish**, not a command anyone has executed. The *structure* is usable now; the *contents of the code blocks* are not, until §3.1 is replaced with what the README actually says.

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
| 13:15 | Credential check (§4). Decide beat 5 Variant M or P. | The decision must be made while the slide can still be changed. |
| 13:45 | **Rehearsal 1** — full run, timed, on whatever build exists | Deliberately **before** freeze. Its job is to surface problems while they can still be fixed. A rehearsal after freeze can only discover things nobody can act on. |
| 14:00 | Fix what rehearsal 1 found. Pin the beat 4 branch. | The last window where a synthesis or UI problem is still repairable. |
| 14:15 | **Record the backup** (§7) on the near-final build | Before freeze, so a failed take can be retaken. |
| 14:30 | **Freeze.** No further feature commits. | Fixed point. |
| 14:35 | **Rehearsal 2** — on the frozen build, to the clock, no stopping | Confirms the frozen build still does what rehearsal 1 saw. |
| 14:45 | Assemble the packet ([`submission-checklist.md`](./submission-checklist.md)) | — |
| 15:00 | Packet ready. Owner submits. | Fixed point. EWE-75 assigns submission to the project owner. |

**This schedule is optimistic and should be treated as such.** The coordinator's own estimate puts the critical path at 250–350 minutes against a 300-minute window, so 13:45 may arrive with the core loop unfinished. §8.3 is the fallback for that case.

---

## 2. Machine and room preparation

Do this before 13:00; none of it depends on the build.

- [ ] One machine, one browser, one window. Close everything else.
- [ ] Notifications off at the OS level. Slack, mail and calendar quit, not minimised.
- [ ] Browser zoom set so the briefing is legible from the back of the room. EWE-68 requires legibility at laptop resolution; a projector is not laptop resolution, so check it on the actual screen if you can get to it.
- [ ] No terminal, editor or environment file visible in any window you will share. A key on screen is a disclosure, not a slip.
- [ ] Backup recording downloaded **locally**. Not in a cloud tab, not behind a login.
- [ ] Phone hotspot available and tested. Venue Wi-Fi is a single point of failure for every provider call.
- [ ] Battery charged, charger connected.
- [ ] Second copy of [`five-minute-demo-script.md`](./five-minute-demo-script.md) on paper or a second device.

---

## 3. Startup

### 3.1 Commands — PLACEHOLDER, pending EWE-60

EWE-60 commits to publishing five command entry points, and specifies that an unimplemented one must **fail loudly rather than print success**. Those five roles are **VERIFIED** from the issue. The command strings are not.

| Role | Command | Status |
| --- | --- | --- |
| Install | `⟨pending EWE-60⟩` | Not published |
| Dev / start | `⟨pending EWE-60⟩` | Not published |
| Build | `⟨pending EWE-60⟩` | Not published |
| Verification (typecheck, lint, tests) | `⟨pending EWE-60⟩` | Not published |
| Intelligence demo | `⟨pending EWE-60⟩` | Not published |
| Evaluation | `⟨pending EWE-60⟩` | Not published |

The coordinator's planning documents mention `npm run dev` and `npm run eval` in passing, and pin Node 22.14 with npm and a committed `package-lock.json`. **Treat those as expectations, not as published commands.** Replace this table with the README's actual contents the moment EWE-60 lands, and then *run each one* before writing it here — EWE-75's handoff rule is that unrun checks are not passed checks.

### 3.2 Startup sequence

1. Fresh checkout of the agreed integration commit on `main`. Note the SHA; you will need it for the packet.
2. Install. Expect a clean install with no manual steps — that is an EWE-60 acceptance criterion.
3. Run the verification command. If it fails, you are not demoing this build.
4. Run the credential check (§4) **before** starting the app, so a missing key is a one-line finding rather than a mid-demo error.
5. Start the app. Open the briefing page.
6. Confirm the fixture, as-of timestamp and data-mode labels render. **Do not generate yet** — the first generation of the day is a pre-flight run (§5), not the demo.

---

## 4. Credential check

### 4.1 Variables

These names come from the coordinator's slice document. **`.env.example` does not exist in the repository yet**, so the names below are unverified against a committed file and must be re-checked when EWE-60 lands.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEBIUS_API_KEY` | **yes** | Token Factory API key |
| `SQUAD_SCREEN_MODEL_ID` | **yes** | Primary approved open-weight model, verified available in the event account |
| `NEBIUS_BASE_URL` | no | OpenAI-compatible endpoint; defaults to the Token Factory studio URL |
| `SQUAD_SCREEN_COMPARISON_MODEL_ID` | for EWE-73 | Second approved model for the comparison |
| `SQUAD_SCREEN_MODEL_MODE` | no | Live by default. **See §4.3.** |
| `SQUAD_SCREEN_MODEL_TIMEOUT_MS` | no | Request timeout, default 30000 |
| `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` | no | Pricing basis; unset leaves estimated cost `null` with a stated reason |
| `SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` | no | As above, output side |

Server-side only. Never in the browser bundle, never committed, never on a shared screen.

### 4.2 The check itself

Checking that a variable is *set* proves nothing. The runbook document in Linear is specific: **make a real provider call before presenting.**

- [ ] Both required variables are set in the server environment.
- [ ] A real call to Token Factory succeeds and returns schema-valid output.
- [ ] Telemetry records a model ID, and it is the model you intend to name on stage.
- [ ] Nothing in the response or telemetry is stamped as stub or offline output.
- [ ] No key appears in any log line, error message or client asset.

If the required variables are absent, the adapter is specified to return a typed `missing_configuration` error with an actionable message rather than a fake success. **That behaviour is itself worth demonstrating if a reviewer asks** — but it is not a substitute for the live call the event requires.

### 4.3 Unresolved: what the offline mode value is called

The two coordinator documents disagree. The slice document says `SQUAD_SCREEN_MODEL_MODE` takes `live` (default) or **`stub`**; the implementation plan says the opt-in offline adapter is enabled with **`offline`**. Both agree the mode is opt-in only and that every response and telemetry record it produces is labelled.

**Do not guess.** Read the value off `.env.example` or the README when EWE-60 lands. Getting this wrong in either direction is dangerous: setting a value that is not recognised could silently leave you in a mode you did not intend, and the one thing this project must never do is present stub output as a live result.

---

## 5. Pre-flight — run once, in full, before the demo

These seven steps are the operational rehearsal from the Linear runbook document, expanded. Run them in order. Any failure is a stop.

| # | Step | Pass condition |
| --- | --- | --- |
| 1 | Start from the agreed integration commit; install documented dependencies | Clean install, no manual intervention |
| 2 | Check credentials and the chosen model; **make a real provider call** | Live call returns valid structured output |
| 3 | Load the fixture and source snapshot | Synthetic / snapshot / live labels all render correctly |
| 4 | Generate → inspect one source → change availability → read the change explanation → reset | Whole loop completes; snapshot ID unchanged across the flip; reset returns the factual briefing |
| 5 | Trigger one timeout or invalid-output path | Clear recovery state, understandable error, no canned success |
| 6 | Re-run the whole loop **without developer intervention** | Second pass behaves like the first |
| 7 | Time each call | Latency recorded; apply the adjustment rule in the script, §1.3 |

Step 6 is the one people skip. It is also the one that catches state that only works the first time — and a demo is, by definition, a second run.

---

## 6. Failure recovery

One rule underneath all of it: **the error states are on-message.** This product's entire argument is that it does not fake success. A clean, legible provider error shown on stage costs you nothing if you name it correctly and keep moving. Apologising for it costs you the room.

| Failure | What you should see | Do this | Say this |
| --- | --- | --- | --- |
| Provider timeout | Typed timeout error, retryable, retries counted in telemetry | Retry once. Second failure → backup recording. | "That's a real timeout, and it's telling us so rather than making something up." |
| Invalid model output | Typed invalid-output error after the bounded repair retry | Retry once. Second failure → backup. | "The model returned something that failed schema validation, so it was rejected." |
| Missing configuration | Typed `missing_configuration` with an actionable message | Do not attempt to fix it live. Go to backup. | — |
| Source unavailable | Structured error naming the source | Continue if the brief is still usable. | "One source is unavailable and the brief says so." |
| Unknown run or fixture ID | Structured error | Reload the page and regenerate. | — |
| Stale response overwrites newer state | Should not happen — EWE-70 forbids it | If it does, reset (§6.1) and do not toggle rapidly again. | Nothing. Move on. |
| UI wedged, no error | — | Reload the page. Regenerate. You lose the run; the fixture is unchanged. | "Let me reload that." |
| App down entirely | — | Backup recording (§7). | "I'll show you the recorded run — this is the same build, recorded ⟨time⟩." |
| Network down | Every call fails | Phone hotspot. If that fails, backup. | — |

**Hard rule, from the technical contract:** never silently substitute anything for a failed live call. If you end up on the recording, say that you are on the recording.

### 6.1 Reset

Three levels, cheapest first.

1. **Scenario reset.** The reset control in the scenario panel returns to the original factual briefing. EWE-70 acceptance criterion; **SPECIFIED, unverified.** This is the one you use between rehearsals and between the pre-flight and the demo.
2. **Page reload.** Discards the run. The in-memory run store means run IDs do not survive a server restart, so a reload is safe but you must regenerate.
3. **Server restart.** Everything in the run store is lost. Budget for a full regeneration afterwards.

After any reset, confirm the fixture and data-mode labels render before generating again.

### 6.2 Pre-demo reset

Between the pre-flight run and the live demo: reload to a clean, ungenerated briefing page. **The demo must open on an ungenerated state**, because beat 1 ends with a live generation and the audience has to see it happen.

---

## 7. Backup recording

EWE-75 requires a backup recorded **from the working product**, and states plainly that backups do not replace the required live demo. The Linear runbook repeats it: *a recording is a backup, not a substitute.*

**Status: PENDING.** No recording exists. Nothing exists to record.

### 7.1 What to record

The complete loop, in demo order, unedited: ungenerated page → generate → cards → open evidence → close → mark Player A unavailable → re-evaluate → change explanation → withdrawn advice still inspectable → reset.

### 7.2 How

- [ ] Record on the **near-final build**, at 14:15, so a bad take can be retaken before freeze.
- [ ] **Unedited and uncut.** If generation takes eleven seconds, the recording shows eleven seconds. Trimming it would make the recording misrepresent the product's real behaviour.
- [ ] No audio narration. You narrate live over it if you need it.
- [ ] Same window size and zoom as the live demo, so the switch is not jarring.
- [ ] Screen only. No editor, no terminal, no environment variables.
- [ ] Note the **commit SHA** and the **wall-clock time** of the recording. Both go in the packet, and you say the time out loud if you use it.
- [ ] Stored locally on the demo machine **and** in one other place.

### 7.3 Labelling

The recording is labelled with the commit SHA, the timestamp, the model ID used, and the data mode of every source shown. A recording of a run made in stub or offline mode is **not** a valid backup for this event and must not be presented as one.

---

## 8. Rehearsal protocol

EWE-75 requires two rehearsals. They have different jobs, and running them the same way wastes one.

### 8.1 Rehearsal 1 — diagnostic, before freeze

Run the whole thing, stop whenever something is wrong, and write it down. Produce:

- [ ] Measured generation latency, three samples, slowest recorded
- [ ] Measured re-evaluation latency, three samples
- [ ] **Which branch beat 4 actually takes** (A revised / B withdrawn-and-abstains / C withdrawn-plus-added)
- [ ] The verbatim `reason` text the system produced for the changed recommendation
- [ ] Whether shared-origin deduplication is visible on the card used at beat 3
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

## 9. What in this document is unverified

Stated plainly, because a runbook that hides its own gaps is worse than no runbook.

1. **No command here has been run.** EWE-60 has not landed. §3.1 is a table of blanks.
2. **No environment variable name has been checked against a committed file.** They come from a planning document, and the two planning documents contradict each other on one value (§4.3).
3. **No failure mode in §6 has been observed.** Every "what you should see" is derived from the technical contract's error taxonomy, not from a triggered failure. EWE-72 is the issue that turns those into observations.
4. **No latency figure exists**, so the timings in §1.1 assume calls are fast enough. That assumption is untested.
5. **No backup recording exists**, and there is nothing to record.
6. **The reset behaviour in §6.1 is specified, not verified.** It is an EWE-70 acceptance criterion that has not been executed.
7. **The T-minus schedule in §1.1 is a proposal**, not an agreed plan, and it is optimistic relative to the coordinator's own critical-path estimate.
