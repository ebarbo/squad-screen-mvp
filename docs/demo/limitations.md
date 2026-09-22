# Limitations

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Purpose | Packet item 8: *known limitations and accurate deployment/data boundaries.* |
| Status | **Draft.** Needs a final pass after [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior) and [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) land — each will add entries here, and EWE-72 may remove some. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`operational-runbook.md`](./operational-runbook.md) · [`submission-checklist.md`](./submission-checklist.md) |

---

## 0. Build status

`main` was at `b6aeea1` when this was written and carries EWE-60 through EWE-63: the application scaffold and published commands, the server-only configuration loader, the shared contracts and their examples, a CI workflow, the fixture and source packet, and the Token Factory adapter.

**What does not exist yet:** the evidence pipeline (EWE-64), synthesis (EWE-65), scenarios (EWE-66), the APIs (EWE-67), the entire UI (EWE-68–EWE-70), the evaluation harness (EWE-71), verification (EWE-72) and the comparison (EWE-73).

**And the one that matters most:** *no live provider call has been made from this project.* EWE-63's own landing record states it — the key is not present, so the live transport has been exercised only through its error paths.

So the sections below describe limitations partly of built code and partly of a **specified** system. Where a limitation follows from a design decision in the technical contract, it will hold whatever gets built. Where it follows from something not existing yet, it may be resolved before the demo — §8 says which is which. Rewrite this section, do not delete it, once there is a demonstrated build; whatever replaces it must state the actual commit demonstrated.

---

## 1. Validation — what nobody has confirmed

1. **There is no customer.** No club has been contacted, no analyst interviewed, no consent exists. The relationship status is *none*; what exists is a target profile and a selection rubric. Full statement in §1 of `customer-and-pilot.md` (branch `feat/ewe-74-customer-and-pilot`).
2. **No analyst has ever used this.** Not once, not in a usability session, not informally. Everything about the workflow's fit is a hypothesis.
3. **Tactical usefulness is not established, and this event cannot establish it.** The technical contract says so directly: judging whether a recommendation is *good football* requires an analyst. What the system can demonstrate is that a recommendation is *traceable to its evidence* and *compliant with supplied constraints*. Those are different properties and the pitch must not slide between them.
4. **The core bet is untested.** The proposition rests on the claim that working out which advice depends on a changed assumption is the expensive part of an analyst's job. Not one practitioner has been asked. The three questions that would test it are written, unauthorised and unsent.
5. **No time saving has been measured, and none may be claimed** — including as a projection, a range, or a "could save".

---

## 2. Measurement — what the numbers do and do not support

1. **The model comparison is unmeasured.** No latency, token count, retry count or cost figure exists for any model. `npm run eval` exits 1 by design until EWE-71, and `model-comparison.md` has not been written anywhere. **Pending EWE-73 and provider credentials.**
2. **A green CI run is not evidence of live inference.** CI deliberately runs with `SQUAD_SCREEN_MODEL_MODE=stub`, `SQUAD_SCREEN_MODEL_ID=stub-model` and no credentials, so a test can never become a billed live call. A passing run means the code typechecks, lints, tests and builds against a **stub transport**. Those are different claims from "the product makes real model calls", and the submission must not merge them.
3. **Even when run, the sample is small.** Five cases with at most two repeats each. That is a smoke test of behaviour under fixed inputs, not a benchmark. Any result must be stated with the sample size attached.
4. **A tie or a trade-off is a valid result** and will be reported as one. The harness was not going to be tuned until one model looked better.
5. **Cost figures, when they exist, are inference estimates only** — provider inference for the measured calls, including retries. Not hosting, not engineering, not the cost of operating this as a product. The provider exposes no pricing endpoint, so unset prices yield `null` with that reason rather than a guess.
6. **Citation-support checking is partly human, and the human sample is small.** Deterministic checks catch invalid references, forbidden actions and exceeded limits. Whether a cited excerpt actually *supports* the claim made from it requires a person to read both, and only a handful will be read.
7. **Model comparison and architecture comparison answer different questions.** Which model is better on these cases says nothing about whether the evidence pipeline beats prompting a model directly. Only the first is being measured; the second must not be implied.

---

## 3. Data — what the demo is actually made of

1. **The club-side records are synthetic and both clubs are fictional.** EWE-62 made them so deliberately: the cleanest way to guarantee that synthetic squad records cannot be read as claims about a real person is for the people in the packet not to exist. Availability, capabilities and the 45-minute limit are invented for the demo and labelled in the interface.
2. **None of it is medical information and none of it may be presented as such.** No diagnosis, no clearance, no derived safe playing time. An availability status is an availability status.
3. **The illustrative public URLs are not real links.** They use the reserved `example.invalid` domain rather than reproducing third-party content. The outlet, dates, excerpt and snapshot structure are real in shape; the URLs are placeholders. Do not present them as clickable sources — a reviewer who clicks a dead link will discount every other provenance claim.
4. **Public sources are a dated snapshot, not live data.** The snapshot is a reliability measure for the demo. It does not entitle anyone to say the system is reading the internet. Bounded live refresh was scoped as stretch work ([EWE-76](https://linear.app/ewerton-barbosa/issue/EWE-76/stretch-add-one-bounded-public-source-refresh-with-structured)) and **cut** — see §7.
5. **One fixture.** A single fixture with one set of opponent observations. Nothing about generalisation across fixtures, competitions or opponents is demonstrated.
6. **Opponent observations are bounded and were chosen by us.** They support the tactical hypothesis the demo explores because they were curated to exercise that path. That is a legitimate demo fixture; it is not evidence that the system finds hypotheses in arbitrary data.
7. **"Accepted" evidence means checked against its supplied source — not true.** The contract is explicit. The system verifies that a claim traces to a source that says it. It cannot verify that the source is right.
8. **Deduplication is a rule, not a guarantee.** Two reports sharing an `origin_id` are counted once — the packet contains exactly such a pair, two outlets carrying the same agency copy. Two reports deriving from a common origin *without* recording it would still be counted twice, because nothing in the data says otherwise.
9. **Conflicts are surfaced, not resolved.** The packet contains an unresolved disagreement about one player's availability, and no authority rule settles it, so it stays visible. That is deliberate, and it means the operator sometimes gets a question instead of an answer.

---

## 4. Deployment and data boundary

This is the section a reviewer from the football side will read hardest.

1. **What runs:** one application, with synthetic club records and a dated public snapshot, calling an approved open-weight model through **Nebius managed inference**. Provider credentials are server-side environment variables and never reach the browser bundle.
2. **What does not run, and is not claimed:** club-controlled or on-premise deployment, any real club data integration, any production permission model. All of it is pilot work — [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) and [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) — and none of it has been built.
3. **Using open-weight models does not establish permission to process club data.** Weights and data rights are unrelated. Any real deployment needs the club's data owners, and naming them is EWE-79's job.
4. **No vendor integration exists.** No Catapult, Kitman, Hudl, Wyscout or any other. Simulating one is explicitly forbidden by EWE-80, and no indicator suggesting one may appear anywhere in the demo.
5. **This is a prototype and is not production secure.** In-memory run store, no database, no authentication, no roles, no tenant separation, no audit log, no retention policy. That is the contract's intended scope for the hackathon, not an oversight — and it means nothing here is ready to touch real squad data.
6. **Runs do not survive a restart.** The in-memory store is per-process, so a server restart discards every run and scenario.
7. **No deployment exists at all.** There is no URL. The packet ships reproducible run instructions unless that changes before 15:00.

---

## 5. System behaviour — deliberate choices that look like limitations

Worth separating from the genuine gaps, because a reviewer may read them as weaknesses and they are the opposite. Each is enforced in the schema or in code rather than by convention, which is why they hold under demo pressure.

1. **No confidence percentages, anywhere.** There is no field for a confidence, probability or risk score in any schema. The synthesis schema is strict, so an invented key fails validation, and a separate check catches a percentage buried in prose. This removes a number people find reassuring, and the system is better for it.
2. **Zero to three recommendations, and it will not pad.** Returning two when the evidence supports two is correct. Returning zero is a valid output and carries a required note.
3. **It abstains rather than substitutes.** When a changed assumption removes the support for an action and no supported alternative exists, the system withdraws the advice and says why. It does not manufacture a replacement.
4. **Constraints are enforced in code, after the model answers.** Unavailable-player exclusions, evidence reference validity and supplied minute limits are validated outside the model. The model is not trusted to remember them.
5. **A failed provider call returns an error.** It never returns a canned success. The live client refuses to construct without a key rather than quietly degrading to the stub, and the stub stamps `transport: "stub"` on every response and every telemetry record it produces — silent degradation is exactly how canned output ends up presented as live inference.
6. **Facts and assumptions are different types**, not a flag on one type. A scenario context records each hypothetical assumption and the factual value it replaces.
7. **It is scenario planning, not simulation.** The what-if changes an assumption and reports which advice still stands. It makes no claim about what will happen in the match.

---

## 6. Demo mechanics

1. **The backup recording is a backup.** It does not replace the live demo, and if it is used, that will be said out loud, with the time it was recorded.
2. **One rehearsed path.** The demo follows a single route through the product. Adjacent behaviour is specified and partly tested, but not rehearsed, and an off-script click may land somewhere unrehearsed.
3. **Live inference depends on the venue network.** Every recommendation requires a provider call. A network failure is a demo failure, mitigated only by a hotspot and the recording.
4. **Latency is unknown.** No call has been timed, because no live call has been made. If generation is slow, the shape of the opening changes — the adjustment rule is in the script, §1.3.
5. **No accessibility audit.** Keyboard operation and focus behaviour are acceptance criteria of EWE-68 and EWE-69, but no assistive-technology testing has been done or is planned in this window.
6. **Screen legibility is checked at laptop resolution**, which is what EWE-68 requires. A projector is a different problem and will be checked on the day, if the room allows it.

---

## 7. What was cut, and why

Recorded because a reviewer may ask why a plainly sensible capability is absent.

| Cut | What it would have added | Why it was cut |
| --- | --- | --- |
| [EWE-76](https://linear.app/ewerton-barbosa/issue/EWE-76/stretch-add-one-bounded-public-source-refresh-with-structured) — bounded public-source refresh | One live query against an allowlist, so the snapshot could be refreshed | Stretch scope, sequenced behind QA. It could not reach the 14:30 freeze. |
| [EWE-77](https://linear.app/ewerton-barbosa/issue/EWE-77/stretch-evaluate-extractionsynthesis-model-routing) — extraction/synthesis routing | Whether a small extraction model plus a synthesis model beats one model | Same. It also depends on EWE-76. |
| [EWE-78](https://linear.app/ewerton-barbosa/issue/EWE-78/stretch-add-deterministic-referee-context-when-it-affects-the-briefing) — referee context | Deterministic referee metrics computed in code | Same. Designed to be removable without changing the core demo, and it was removed. |

All three sat behind QA that could not land early enough to leave build time. Dropping them was a scheduling decision made before the build started, not a failure during it.

---

## 8. Which of these could still change before the demo

| Limitation | Fixed by design | Could be resolved | What would resolve it |
| --- | --- | --- | --- |
| No customer, no analyst has used it | | — | Only a real conversation. Not resolvable by 15:00. |
| Tactical usefulness unestablished | ✓ | | Out of scope for a hackathon by definition. |
| No live call has ever been made | | ✓ | `NEBIUS_API_KEY` and `SQUAD_SCREEN_MODEL_ID` |
| Comparison unmeasured | | ✓ | Those two plus `SQUAD_SCREEN_COMPARISON_MODEL_ID`, EWE-71, then the eval run |
| Small sample even when measured | ✓ | | Five cases is the agreed scope. |
| Synthetic club data, fictional clubs | ✓ | | Deliberate. Real data needs EWE-79. |
| Illustrative `example.invalid` URLs | ✓ | | Deliberate — the alternative was reproducing third-party content. |
| Snapshot rather than live sources | ✓ | | Live refresh was cut. |
| One fixture | ✓ | | Scope. |
| No production security | ✓ | | Explicitly out of hackathon scope. |
| Latency unknown | | ✓ | Rehearsal 1 |
| No backup recording | | ✓ | A working loop to record |
| Nothing rehearsed | | ✓ | Two rehearsals, per EWE-75 |
| No deployment | | ✓ | A deployment, or ship run instructions |

---

*Sourced to Linear — [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission), the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91), the [demo runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) and the linked issues, all read 2026-09-22 — or to repository state on `main` observed the same day. Nothing in Linear was modified.*
