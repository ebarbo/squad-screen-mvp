# Five-minute demo script

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Status | **Draft.** EWE-75 has not started; its blockers [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior), [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) and [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) are open. |
| Authority | The seven beats and their time ranges are fixed by the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) in Linear. This document subdivides them; it does not change them. |
| Companions | [`operational-runbook.md`](./operational-runbook.md) · [`submission-checklist.md`](./submission-checklist.md) · [`limitations.md`](./limitations.md) |
| Sources read | EWE-75, EWE-60, EWE-62, EWE-66, EWE-70, EWE-72, EWE-73, EWE-74, the project record, the technical contract and the demo runbook — all read 2026-09-22. Nothing in Linear was modified. |

## Status legend — applies to every line in this document

| Tag | Meaning |
| --- | --- |
| **VERIFIED** | Observed directly, in Linear or in the repository, by the author of this document. |
| **SPECIFIED** | Written down as required behaviour in the technical contract or an issue. **The code does not exist yet, so this is unverified.** |
| **PENDING** | Depends on an unfinished issue or on credentials nobody has. A placeholder, not a claim. |

**Repository state (VERIFIED, 2026-09-22).** `main` is at `b6aeea1` and carries EWE-60 through EWE-63: the app scaffold and published command set, the server-only configuration loader, the shared Zod contracts and examples, CI, the fixture and source packet under `data/`, and the Token Factory adapter. It does **not** yet carry the rest of the server pipeline (EWE-64–EWE-67), the UI (EWE-68–EWE-70) or `docs/`.

`main` has been moving every few minutes. Re-check this paragraph and the ledger in §3 before the packet is assembled; rows here are timestamped by what was on `main` when they were written.

So the commands in [`operational-runbook.md`](./operational-runbook.md) are real and the fixture exists, but **every on-screen description below is still SPECIFIED** — derived from the technical contract's UI contract and the deliverables of EWE-68, EWE-69 and EWE-70, not from anything anyone has run.

---

## 1. Before you read the beats

### 1.1 Three rules the script is built around

1. **The demo is live.** The runbook states that a recording is a backup, *not* a substitute for the required working product and live demo. Generation and re-evaluation happen in front of the room.
2. **No opening minute of progress indicators.** This is an explicit boundary in EWE-75. The generate call is fired at 0:20 so that it runs underneath the last ten seconds of speech, and the briefing is on screen when beat 2 starts.
3. **Nothing is claimed that cannot be shown or sourced.** Where a number would normally go, this script either reads a value off the screen or says out loud that it was not measured.

### 1.2 Pace budget

Speech is budgeted at **140 words per minute**, a normal presenting pace. That is an assumption, not a measurement: time yourself in rehearsal 1 and adjust the word counts, not the beat boundaries.

| Beat | Window | Length | Speech budget | Slack for UI and pauses |
| --- | --- | --- | --- | --- |
| 1 Analyst, fixture, decision | 0:00–0:30 | 30 s | ~55 words (24 s) | 6 s |
| 2 The grounded action | 0:30–1:15 | 45 s | ~90 words (39 s) | 6 s |
| 3 The evidence behind it | 1:15–2:00 | 45 s | ~78 words (33 s) | 12 s |
| 4 Availability flip | 2:00–2:45 | 45 s | ~84 words (36 s) | 9 s |
| 5 Model comparison | 2:45–3:30 | 45 s | ~95 words (41 s) | 4 s |
| 6 Customer and pilot | 3:30–4:15 | 45 s | ~93 words (40 s) | 5 s |
| 7 Architecture and next step | 4:15–5:00 | 45 s | ~100 words (43 s) | 2 s |
| **Total** | **5:00** | | **~595 words (4:15)** | **44 s** |

The slack is not spare time. It is consumed by the generate call, the re-evaluate call, and the two or three seconds of silence a reviewer needs to actually read a card.

### 1.3 Latency adjustment rule — decide this in rehearsal, not on stage

Generation latency is **PENDING** — nobody has measured it, because no live call has been made from anywhere in this project. Measure it three times in rehearsal 1 and take the slowest, then apply:

| Slowest observed generation | Action |
| --- | --- |
| Under 10 s | Script as written. Fire Generate at 0:20. |
| 10–20 s | Fire Generate at 0:12, immediately after the first sentence, and keep talking. |
| Over 20 s | Fire Generate before speaking, at −0:05 on the clock, and open on the loading state with one sentence acknowledging it. Do not narrate the spinner. |
| Over 40 s, or variable | Escalate. A five-minute demo cannot absorb it; either the timeout budget or the prompt size has to change before freeze, or the demo opens on a pre-generated run and the *re-evaluation* becomes the live call. |

The same rule applies to the re-evaluate call at beat 4, with half the tolerance — that beat has 9 seconds of slack, not 6.

---

## 2. The seven beats

### Beat 1 — 0:00–0:30 · One analyst, one fixture, one decision

**What the reviewer must take away:** who this is for, and that the interesting problem is the revision, not the writing.

| Clock | Operator action | On screen |
| --- | --- | --- |
| 0:00 | Nothing. Do not touch the mouse. | Briefing page, loaded, not yet generated. Fixture name, as-of timestamp and data-mode labels visible. Generate control present and idle. **SPECIFIED** — technical contract, UI contract. |
| 0:20 | Click **Generate**. | Real loading state appears. **SPECIFIED** — EWE-68 requires true loading states and forbids fabricated progress. |
| 0:30 | — | Up to three recommendation cards rendered. |

**Say (55 words):**

> "This is a pre-match briefing for one fixture. The user is a first-team opposition analyst — the person who writes what the coaching staff read. Their hard problem isn't writing it. It's when a squad assumption changes late, and they have to work out which recommendations still stand. I'm generating it now, live."

**Do not say:** that the fixture is real club data. **Both clubs in the packet are fictional** — EWE-62 made them so deliberately, so that synthetic squad records cannot be read as claims about a real person. Do not name a real club, and do not let the fixture name imply one.

**If it fails:** if Generate errors, the error state is itself on-message — say "that's a real provider error, not a canned answer" and retry once. Second failure, go to the backup recording (see [`operational-runbook.md`](./operational-runbook.md) §6).

---

### Beat 2 — 0:30–1:15 · A proposed action, grounded in evidence and constraints

**What the reviewer must take away:** observation, inference and action are separate fields; the staff-supplied constraint is enforced in code; there are no confidence percentages.

| Clock | Operator action | On screen |
| --- | --- | --- |
| 0:30 | Let it sit. Point, don't click. | At most three cards. Each shows observation / inference / action / trade-off / uncertainty / next check as distinct fields. **SPECIFIED** — technical contract, `Recommendation`. |
| 0:55 | Point at the constraint on the card carrying `player_actions`. | Planned minutes visible against the staff-supplied 45-minute limit for Player A. Limit is in the packet (EWE-62) and validated in code (EWE-65). |

**Say (90 words):**

> "Three recommendations at most — the system won't pad the count. Each one separates what was observed, what's inferred from it, and what to actually do.
>
> This one proposes ⟨read the action off the screen⟩. It comes from opponent observations plus our own squad constraints: the staff supplied a 45-minute limit for this player, and that limit is checked in code after the model answers — it isn't left to the model to remember.
>
> There are no confidence percentages anywhere. Uncertainty is written in words, attached to the specific inference it qualifies."

**⟨read off the screen⟩ is not a placeholder to fill in before the demo.** It is an instruction to read the live output. **PENDING EWE-65** — no recommendation text exists, and inventing one here would put a scripted sentence in the presenter's mouth that the live run may contradict.

**Do not say:** that the model "knew" or "understood" the constraint. It did not; code enforced it. That distinction is the point, and a technical reviewer will test it.

**If the run returns fewer than three, or zero:** that is correct behaviour, not a failure. Say so: "it returned two, because the evidence only supported two." Zero recommendations is a valid output under the contract.

---

### Beat 3 — 1:15–2:00 · Open the evidence

**What the reviewer must take away:** every factual claim opens to its exact source; provenance and data mode are visible; copied reports are not independent corroboration.

| Clock | Operator action | On screen |
| --- | --- | --- |
| 1:15 | Click one evidence reference on the card you just discussed. | Drawer opens on that record. **SPECIFIED** — EWE-69. |
| 1:20 | **Pause 3 s.** Let the room read it. | Exact excerpt or record, source name, URL or record ID, observed / published / retrieved dates, and `data_mode`: synthetic, snapshot or live. **SPECIFIED** — technical contract, `EvidenceItem`. |
| 1:40 | *Optional, only if the drawer surfaces it:* point at the shared-origin pair. | Two outlets carrying the same agency copy, sharing one `origin_id`, counted once. The pair is in the packet (EWE-62); whether it renders is EWE-64 / EWE-69. |

**Say (78 words):**

> "Every factual claim carries its source. I'll open one. ⟨pause⟩
>
> That's the exact excerpt, the source, when it was observed, when we retrieved it, and whether it's synthetic club data, a saved snapshot, or live.
>
> These two reports look like corroboration, but they carry the same agency copy — so the system counts them once. And where sources disagree, the disagreement stays on the screen. It doesn't get averaged away into a number."

> **Do not present the public URLs as live links, and do not invite anyone to click one.** EWE-62 records that the illustrative public URLs use the reserved `example.invalid` domain rather than reproducing third-party content. The structure, outlet, dates and excerpt are real in shape and the snapshot is dated — that is what to show. A reviewer who clicks a dead link and then re-reads your provenance claims has been handed a reason to doubt all of them.

**The packet contains a genuine unresolved conflict** — an agency report and an older club statement disagree about one player's availability, and no authority rule settles it, so both stay visible. If the drawer surfaces it on the card you chose, that is the strongest ten seconds available in this beat. Confirm in rehearsal 1 which card shows it.

**Cut first if you are behind:** the shared-origin sentence. It is the most impressive detail here and the most expendable, because beats 4 and 5 cannot be shortened without losing a required element.

**If the drawer does not show shared origin:** drop that sentence entirely rather than describing a feature that is not on the screen.

---

### Beat 4 — 2:00–2:45 · Player A becomes unavailable

**This is the beat the demo exists for.** Everything before it is setup and everything after it is context.

**What the reviewer must take away, in order:** the change is hypothetical and the facts did not move · the advice changed for a stated reason · the unavailable player appears in no proposed action, enforced in code · withdrawn advice is still inspectable.

| Clock | Operator action | On screen |
| --- | --- | --- |
| 2:00 | Close the drawer. Set Player A to **unavailable**. | Explicit scenario label appears — the state is visibly hypothetical. **SPECIFIED** — EWE-70. |
| 2:05 | Click **Re-evaluate**. | Pending state. Base briefing preserved alongside. **SPECIFIED** — EWE-70. |
| 2:12 | Point at the evidence snapshot ID. | Same `evidence_snapshot_id` as before the flip. **SPECIFIED** — EWE-66 requires base context and snapshot unchanged after rerun. |
| 2:20 | Point at the changed card and its reason. | Per recommendation: added / revised / withdrawn / unchanged, with a reason and the changed dependency IDs. **SPECIFIED** — technical contract, `changes`. |
| 2:38 | Point at the withdrawn card's evidence affordance. | Withdrawn advice still present and still inspectable. **SPECIFIED** — EWE-70. |

#### 4a. The spine — say this regardless of what the run produces

**Opening (22 words):**

> "Now the change. This player becomes unavailable. ⟨toggle, re-evaluate⟩ This is hypothetical — it doesn't touch the facts. Same evidence snapshot, same ID, unchanged."

**Closing (34 words):**

> "The unavailable player is in no proposed action. That's a code check after the model answers, not the model being careful. And the withdrawn advice is still here — I can still open its evidence."

#### 4b. The middle — three branches, because the outcome is genuinely not decided yet

Which branch occurs depends on the live model output and on how EWE-65 and EWE-66 resolve the alternative option. **PENDING EWE-66 / EWE-72.** All three are legitimate under the contract, all three are defensible on stage, and the presenter must not force one. Pin the actual branch during rehearsal 1 and fix the wording before rehearsal 2.

| Branch | When it occurs | Say (about 28 words) |
| --- | --- | --- |
| **A — Revised** | The dependent recommendation survives in changed form, usually onto the supported alternative option. | "This one was revised, not deleted. Here's the system's own reason — ⟨read it verbatim⟩ — and these are the dependencies that changed." |
| **B — Withdrawn, nothing replaces it** | The alternative is not supported by the held evidence, so the system abstains. | "This one is withdrawn, and nothing replaces it. The alternative we have isn't supported by the evidence we hold — so it says so, instead of inventing one." |
| **C — Withdrawn plus added** | A different option *is* supported and appears as a new recommendation with no prior ID. | "That one's withdrawn. This one is new — a different option the evidence does support." |

**Add this line in every branch if any card is marked unchanged (10 words):**

> "And these are unchanged. It didn't rewrite the whole brief."

#### 4c. Direction for the presenter

- **Read the `reason` field verbatim off the screen.** Do not paraphrase it into something stronger than it says. If the wording that comes back is generic, point at the changed dependency IDs instead — those are mechanical and always concrete.
- **Branch B is not a weak result.** An analyst who has been burned by confident tools will find the abstention more convincing than a smooth substitution. Deliver it as the designed behaviour it is.
- **Do not** frame any of this as a prediction about the match. It is scenario planning, not a causal simulator — an explicit boundary in EWE-66 and EWE-70.
- **Do not** imply anything medical. The synthetic availability records are not injury information and must never be presented as such.
- **Watch for the failure mode the issue names:** if the "changed" advice is the same sentence with a different name in it, that is a fail, not a demo. EWE-70 forbids it explicitly. If rehearsal produces that, raise it before freeze — it is a synthesis problem, not a presentation problem.

**If re-evaluate errors:** say "that's the provider failing, and it's telling us so" and retry once. The coherent-error-state behaviour is itself an acceptance criterion of EWE-70, so a clean error costs credibility only if you apologise for it.

---

### Beat 5 — 2:45–3:30 · The controlled model comparison

**What the reviewer must take away:** a fair comparison was designed, and either it was measured or it honestly was not.

**Everything in this beat is PENDING [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) and PENDING CREDENTIALS.** No number exists. `npm run eval` exits 1 by design until EWE-71 lands. The result table lives in `docs/demo/model-comparison.md`, owned by the evaluation slice, and has not been written anywhere yet. **Pick the variant on the morning of the demo, from what that file actually says.**

| Clock | Operator action | On screen |
| --- | --- | --- |
| 2:45 | Switch to the comparison table. | Five cases, two configurations, one row per model. **PENDING EWE-73.** |

#### Variant M — the comparison was measured

**Say (about 90 words, values read from the table, not from here):**

> "We ran five cases against two approved models on Token Factory — same evidence, same prompt, same output schema, comparable settings. ⟨N⟩ cases, ⟨R⟩ runs. ⟨Read the one conclusion from the table.⟩
>
> That is a small sample and we say so on the slide. Every call and every retry is counted. The cost figure is an estimate of inference only — not what it costs to run this as a product."

Do not editorialise beyond the conclusion written in `model-comparison.md`. A tie or a trade-off is a valid result and should be delivered as one.

**If asked about token counts:** EWE-63 records that the comparison model is a reasoning model which spends most of its completion tokens in a separate field, and that telemetry reads the provider's usage object rather than estimating from response length. Say that if it comes up; do not volunteer a token comparison that has not been run.

#### Variant P — it could not be run

**Say (95 words):**

> "We built the comparison harness: five cases, fixed inputs, deterministic checks for unsupported claims, bad citations and constraint violations.
>
> We could not run it. We never had a second model credential for the event account. So the table says *Pending* — not a number. The command that produces it is in the repository and it takes minutes once the key exists.
>
> A tie or a trade-off would have been a perfectly good answer here. A number we made up would not have been, and it's the thing this whole project is built to avoid."

Variant P is a **stronger** 45 seconds than a fabricated table, and it is consistent with every other claim in the pitch. Deliver it without apology.

---

### Beat 6 — 3:30–4:15 · Customer status and the four-fixture pilot

**What the reviewer must take away:** we know exactly who this is for, we do not pretend to have them, and we have specified how we would find out.

**Source.** `docs/demo/customer-and-pilot.md`, at `b5093cc` on branch `feat/ewe-74-customer-and-pilot`. **It is not on `main`** — `docs/` does not exist on `main` at all — so the relative links between that file and this one do not resolve until the two branches converge. Read it on its branch, not through a link from here.

**No reconciliation is needed.** Its §7 records that this script's trimmed 93-word version is authoritative for what gets delivered, and that its own longer text is the source kept for auditing the claims against its §1 and §6. **Deliver the version below, and do not re-expand it** — the source text runs about 165 words, which is roughly 71 seconds against a 45-second slot. Its closing sentence about saved-minutes figures has been moved to beat 7, where it lands better as the last thing the room hears.

**Still PENDING**, and the file says so itself: [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) is not Done — its §9 records that two of its four acceptance criteria are met only in the weaker of the two available forms — and whether a club is named at all is **PENDING Ewerton** (§8).

| Clock | Operator action | On screen |
| --- | --- | --- |
| 3:30 | Switch to the customer slide. | Target profile, relationship status stated plainly, four-fixture pilot measures. Slide **PENDING**. |

**Say (93 words):**

> "We don't have a customer. We have a specific person we built this for: the opposition analyst at a professional first team.
>
> The decision is narrow. They draft the briefing, something changes, and they work out what still stands. That's the bet.
>
> To test it we've specified a four-fixture pilot — two fixtures measuring their current process, two with the tool. We measure briefing time, revision time, fact-checking effort, and what they accept, amend or reject. Every one of those numbers is blank right now, because nobody has run it."

**Forbidden in this beat**, per §6 of `customer-and-pilot.md` and the acceptance criteria of both issues: naming any club as a customer, partner or interested party · any quote attributed to an analyst or coach · any time saving in minutes, hours or percent, *including "could save"* · any claim about match results, points or injuries · any revenue, market size or price validation · implying the pilot has been agreed or begun.

**If the owner names a target before the demo:** the honest first sentence becomes "Our target is ⟨name⟩, and the relationship is ⟨label⟩ — ⟨what that label actually means⟩." Use the exact label from the ladder in §1 of that file: *target*, *interviewed user*, *pilot partner* or *paying customer*. Do not round it up. Nothing else in the beat changes.

---

### Beat 7 — 4:15–5:00 · Architecture, boundary and next validation step

**What the reviewer must take away:** where the model sits, what code does instead of trusting it, what is synthetic, and what happens next.

| Clock | Operator action | On screen |
| --- | --- | --- |
| 4:15 | Switch to the architecture slide. | One app; server-side provider calls; code-side validation; data-mode boundary. |
| 4:50 | Stop clicking. Deliver the last two sentences to the room, not the screen. | — |

**Say (100 words):**

> "Architecture: one Next.js application, server-side calls to an approved open-weight model on Nebius Token Factory. Keys never reach the browser.
>
> The model proposes; code validates — evidence references, availability, supplied minute limits. A failed call returns an error. It never returns a canned success.
>
> The boundary: the club records here are synthetic, the public sources are a dated snapshot, and it runs through managed inference. Club-controlled deployment and real club integrations are pilot work — not claimed today.
>
> The next step isn't engineering. It's three questions with one analyst, and they're written. What we won't do is put a saved-minutes figure on a slide before anyone has used this."

**Naming the model.** EWE-63 landed with verified defaults — `Qwen3-235B-A22B-Instruct-2507` primary and `gpt-oss-120b` for the comparison. They are identifiers, not secrets. But `.env.example` still says to confirm the exact ID against the event account before the demo, and EWE-63's own record states that **no live call has been made from this project**. So: **name a model on stage only if you can read it off the telemetry of the run you just did.** "An approved open-weight model on Token Factory" is accurate and safe in every other case.

**"Three questions with one analyst, and they're written" is accurate** and is the only claim made about them — §4 of `customer-and-pilot.md` confirms they are written, unauthorised and unsent.

**Do not say:** that open weights give permission to process club data. They do not, and a reviewer from the football side will know it.

---

## 3. Substantiation ledger

EWE-75's acceptance criterion is that *every* demo number is sourced to a real run or explicitly labelled illustrative. This table is how that criterion gets checked. Re-walk it after EWE-72 and EWE-73 land, and again after rehearsal 2.

Rows marked *commit record* were read from the landing commit's message and a directory listing, not from the files themselves. That is a weaker basis than reading the code, and it is labelled so nobody treats it as stronger.

| # | Element in the script | Status | What would substantiate it |
| --- | --- | --- | --- |
| 1 | Seven beats and their time ranges | **VERIFIED** — fixed by the Linear runbook document | — |
| 2 | Operator, decision recipient, buyer hypothesis | **VERIFIED** — project record, and `customer-and-pilot.md` §3.1 | — |
| 3 | 45-minute limit for Player A; supported alternative option | **Landed** — `data/demo` and `data/sources` on `main` at `b6aeea1` (*commit record* + listing) | Reading the fixture files, or EWE-72 exercising them |
| 4 | Every on-screen state in every beat | **SPECIFIED** — technical contract plus EWE-68 / 69 / 70 | EWE-72 running the loop end to end |
| 5 | Recommendation text read at beat 2 | **PENDING EWE-65** | A live generation |
| 6 | Evidence excerpt, dates, record shown at beat 3 | **Packet landed** (EWE-62). Whether it renders is **PENDING EWE-64 / EWE-69** | The drawer working on the chosen card |
| 7 | Shared-origin deduplication visible at beat 3 | **Pair exists in the packet** (*commit record*). Visibility **PENDING EWE-64 / EWE-69** | Rehearsal 1, on the chosen card |
| 8 | Which branch beat 4 takes | **PENDING EWE-66 / EWE-72** | Rehearsal 1 |
| 9 | Snapshot ID unchanged after the flip | **SPECIFIED** — EWE-66 acceptance criterion | EWE-72 |
| 10 | Every comparison number at beat 5 | **PENDING EWE-73 and credentials** | `NEBIUS_API_KEY`, `SQUAD_SCREEN_MODEL_ID`, `SQUAD_SCREEN_COMPARISON_MODEL_ID`, then `npm run eval` — which exits 1 until EWE-71 |
| 11 | Generation and re-evaluation latency | **PENDING** — never measured, no live call has been made | Rehearsal 1, timed three times |
| 12 | Customer status and pilot measures at beat 6 | **Sourced.** `customer-and-pilot.md` at `b5093cc`, branch `feat/ewe-74-customer-and-pilot` — **not on `main`**. EWE-74 itself is not Done (its §9) | The branches converging; EWE-74 closing |
| 13 | Whether a target club is named | **PENDING Ewerton** — `customer-and-pilot.md` §8 | The owner's decision, and the event's answer on whether a name is required |
| 14 | Named model ID at beat 7 | **Narrowed, not closed.** EWE-63 records verified defaults (*commit record*); `.env.example` still says confirm against the account; no live call has been made | Telemetry from a real run |
| 15 | Run instructions for the packet | **VERIFIED as published** — README quick start and command table | — |
| 16 | A deployed working product link | **PENDING** — nothing is deployed anywhere | A deployment, or the packet ships run instructions instead |
| 17 | Command set and pinned runtime | **VERIFIED as published**, read off `package.json` and the README. **Not executed** by this document's author | Whoever rehearses runs them and records the output |
| 18 | Credential-check behaviour, and that no command yet makes a live provider call | **VERIFIED** — read from `scripts/check-env.ts` and `src/server/config/env.ts`; `demo:intelligence` exits 1 until EWE-67 | EWE-67 landing |
| 19 | "No confidence percentages anywhere" (beat 2) | **Landed, not independently read.** EWE-61 commits `986a642` and `a8b74b6` record no confidence field in any schema, a strict synthesis schema, a prose-percentage check and 25 passing tests | Reading `src/domain/contracts.ts`, or EWE-72 confirming none renders |
| 20 | Public source URLs shown at beat 3 | **Illustrative.** EWE-62 records that they use the reserved `example.invalid` domain rather than reproducing third-party content | Nothing — this is a property of the packet. Handle it by not presenting them as live links |
| 21 | Both clubs are fictional | **Landed** — EWE-62 (*commit record*), deliberate so synthetic records cannot be read as claims about a real person | — |

No screenshot, recording, transcript or measured value is attached to this document, because none exists.

---

## 4. What must still be decided by a human

| # | Decision | Who | Deadline |
| --- | --- | --- | --- |
| 1 | Provider credentials, or accept beat 5 Variant P | Ewerton | Before rehearsal 1 |
| 2 | Whether a target club is named for beat 6 | Ewerton, via `customer-and-pilot.md` §8 | Before rehearsal 2 |
| 3 | Beat 4 branch, pinned from the observed run | Presenter, in rehearsal 1 | Before rehearsal 2 |
| 4 | Whether a working product link exists or the packet ships run instructions | Ewerton | 15:00 packet deadline |
| 5 | Who presents | Ewerton | Before rehearsal 1 |
