# Limitations

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Purpose | Packet item 8: *known limitations and accurate deployment/data boundaries.* |
| Status | **Draft.** Needs a final pass after [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior), [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) and [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) land — each will add entries here, and EWE-72 may remove some. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`operational-runbook.md`](./operational-runbook.md) · [`submission-checklist.md`](./submission-checklist.md) |

---

## 0. Build status when this was written

**Nothing in this product has been demonstrated to anyone, including us.** On 2026-09-22, `main` was at commit `2674040` and contained one file, `.gitignore`. No application, no fixture, no user interface, no provider call.

So the sections below describe limitations of the **specified** system. Where a limitation is a consequence of a design decision written into the technical contract, it will hold whatever gets built. Where it is a consequence of something not existing yet, it may be resolved before the demo — and §8 says which is which.

This section gets rewritten, not deleted, once there is a build. Whatever replaces it must state the actual commit demonstrated.

---

## 1. Validation — what nobody has confirmed

1. **There is no customer.** No club has been contacted, no analyst has been interviewed, and no consent exists. The relationship status is *none*; what exists is a target profile and a selection rubric. Full statement in `customer-and-pilot.md` §1.
2. **No analyst has ever used this.** Not once, not in a usability session, not informally. Everything about the workflow's fit is a hypothesis.
3. **Tactical usefulness is not established, and this event cannot establish it.** The technical contract says so directly: judging whether a recommendation is *good football* requires an analyst. What the system can demonstrate is that a recommendation is *traceable to its evidence* and *compliant with supplied constraints*. Those are different properties and the pitch must not slide between them.
4. **The core bet is untested.** The proposition rests on the claim that working out which advice depends on a changed assumption is the expensive part of an analyst's job. That claim has not been put to a single practitioner. The three questions that would test it are written and await authorisation.
5. **No time saving has been measured, and none may be claimed** — including as a projection, a range, or a "could save".

---

## 2. Measurement — what the numbers do and do not support

1. **The model comparison is unmeasured.** `model-comparison.md` reads `Pending (not measured)`. No latency, token count, retry count or cost figure exists for any model. **PENDING EWE-73 and provider credentials.**
2. **Even when run, the sample is small.** Five cases with at most two repeats each. That is a smoke test of behaviour under fixed inputs, not a benchmark. Any result must be stated with the sample size attached.
3. **A tie or a trade-off is a valid result** and will be reported as one. The harness was not going to be tuned until one model looked better.
4. **Cost figures, when they exist, are inference estimates only** — provider inference for the measured calls, including retries. Not hosting, not engineering, not the cost of operating this as a product.
5. **Usage and cost fields may be null.** Where the provider does not return them, they stay null with a stated reason rather than being estimated.
6. **Citation-support checking is partly human, and the human sample is small.** Deterministic checks catch invalid references, forbidden actions and exceeded limits. Whether a cited excerpt actually *supports* the claim made from it requires a person to read both, and only a handful will be read.
7. **Model comparison and architecture comparison answer different questions.** Which model is better on these cases says nothing about whether the evidence pipeline beats prompting a model directly. Only the first is being measured; the second must not be implied.

---

## 3. Data — what the demo is actually made of

1. **The club-side records are synthetic and the players are fictional.** Availability, capabilities and the 45-minute limit are invented for the demo, with fictional IDs chosen so they cannot imply anything about a real person. They are labelled in the interface.
2. **None of it is medical information and none of it may be presented as such.** No diagnosis, no clearance, no derived safe playing time. An availability status is an availability status.
3. **Public sources are a dated snapshot, not live data.** The snapshot is a reliability measure for the demo. It does not entitle anyone to say the system is reading the internet. Bounded live refresh was scoped as stretch work ([EWE-76](https://linear.app/ewerton-barbosa/issue/EWE-76/stretch-add-one-bounded-public-source-refresh-with-structured)) and **cut** — see §7.
4. **One fixture.** Everything shown is a single fixture with one set of opponent observations. Nothing about generalisation across fixtures, competitions or opponents is demonstrated.
5. **Opponent observations are bounded and were chosen by us.** They support the tactical hypothesis the demo explores because they were curated to exercise that path. That is a legitimate demo fixture; it is not evidence that the system finds hypotheses in arbitrary data.
6. **"Accepted" evidence means checked against its supplied source — not true.** The contract is explicit about this. The system verifies that a claim traces to a source that says it. It cannot verify that the source is right.
7. **Deduplication is a rule, not a guarantee.** Two reports sharing an `origin_id` are counted once. Two reports that derive from a common origin without recording it will still be counted twice, because nothing in the data says otherwise.
8. **Conflicts are surfaced, not resolved.** Where sources disagree and no documented freshness or authority rule settles it, the disagreement stays visible. That is deliberate, and it means the operator sometimes gets a question instead of an answer.

---

## 4. Deployment and data boundary

This is the section a reviewer from the football side will read hardest.

1. **What runs:** one application, with synthetic club records and a dated public snapshot, calling an approved open-weight model through **Nebius managed inference**. Provider credentials are server-side environment variables.
2. **What does not run, and is not claimed:** club-controlled or on-premise deployment, any real club data integration, any production permission model. All of it is pilot work — [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) and [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) — and none of it has been built.
3. **Using open-weight models does not establish permission to process club data.** Weights and data rights are unrelated. Any real deployment needs the club's data owners, and naming them is EWE-79's job.
4. **No vendor integration exists.** No Catapult, Kitman, Hudl, Wyscout or any other. Simulating one is explicitly forbidden by EWE-80, and no indicator suggesting one may appear anywhere in the demo.
5. **This is a prototype and is not production secure.** In-memory run store, no database, no authentication, no roles, no tenant separation, no audit log, no retention policy. That is the contract's intended scope for the hackathon, not an oversight — and it means nothing here is ready to touch real squad data.
6. **Runs do not survive a restart.** The in-memory store is per-process, so a server restart discards every run and scenario.

---

## 5. System behaviour — deliberate choices that look like limitations

Worth separating from the genuine gaps, because a reviewer may read them as weaknesses and they are the opposite.

1. **No confidence percentages, anywhere.** Forbidden in the data model, not filtered at the UI. There is no field to put one in. Uncertainty is expressed in words, attached to the specific inference it qualifies. This removes a number people find reassuring, and the system is better for it.
2. **Zero to three recommendations, and it will not pad.** Returning two when the evidence supports two is correct. Returning zero is a valid output.
3. **It abstains rather than substitutes.** When a changed assumption removes the support for an action and no supported alternative exists, the system withdraws the advice and says why. It does not manufacture a replacement.
4. **Constraints are enforced in code, after the model answers.** Unavailable-player exclusions, evidence reference validity and supplied minute limits are validated outside the model. The model is not trusted to remember them.
5. **A failed provider call returns an error.** It never returns a canned success, and the offline adapter is opt-in only and stamps every response and telemetry record it produces.
6. **It is scenario planning, not simulation.** The what-if changes an assumption and reports which advice still stands. It makes no claim about what will happen in the match.

Each of these is enforced in the schema or in code rather than by convention, which is why they will hold under demo pressure.

---

## 6. Demo mechanics

1. **The backup recording is a backup.** It does not replace the live demo, and if it is used, that will be said out loud, with the time it was recorded.
2. **One rehearsed path.** The demo follows a single route through the product. Adjacent behaviour is specified and partly tested, but not rehearsed, and an off-script click may land somewhere unrehearsed.
3. **Live inference depends on the venue network.** Every recommendation requires a provider call. A network failure is a demo failure, mitigated only by a hotspot and the recording.
4. **Latency is unknown.** No call has been timed. If generation is slow, the shape of the opening changes — the adjustment rule is in the script, §1.3.
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
| Comparison unmeasured | | ✓ | `NEBIUS_API_KEY`, `SQUAD_SCREEN_MODEL_ID`, `SQUAD_SCREEN_COMPARISON_MODEL_ID`, then the eval run |
| Small sample even when measured | ✓ | | Five cases is the agreed scope. |
| Synthetic club data | ✓ | | Deliberate. Real data needs EWE-79. |
| Snapshot rather than live sources | ✓ | | Live refresh was cut. |
| One fixture | ✓ | | Scope. |
| No production security | ✓ | | Explicitly out of hackathon scope. |
| Latency unknown | | ✓ | Rehearsal 1 |
| No backup recording | | ✓ | A working build to record |
| Nothing rehearsed | | ✓ | Two rehearsals, per EWE-75 |
| Nothing built at time of writing | | ✓ | The build — rewrite §0 when it lands |

---

*Every entry above is sourced to Linear — [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission), the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91), the [demo runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) and the linked issues, all read 2026-09-22 — or to the repository state observed the same day. Nothing in Linear was modified.*
