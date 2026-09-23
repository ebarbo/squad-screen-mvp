# Submission checklist

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Deadline | Packet prepared by **15:00 CEST, 23 September 2026**. Organiser's submission window 15:00–16:00. |
| Who submits | **The project owner.** EWE-75 states that the project owner performs event submission and any separately authorised public publishing. No agent submits anything. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`operational-runbook.md`](./operational-runbook.md) · [`limitations.md`](./limitations.md) |

> **ON HOLD (owner 2026-09-23):** EWE-75 rehearse/submit is paused. Do not run rehearsals, freeze, or submit until the owner lifts this hold. Demo pack docs remain on `main` for when work resumes.

> **Nothing here is ticked on the basis of an expectation.** EWE-75's handoff rule is explicit that unrun checks are not passed checks. Where an item has moved, it says what moved it and what is still missing.
>
> **Artifacts for the packet are on `main`.** Rehearse/submit remains on hold; when the hold lifts, use the tip SHA at that time.

---

## 1. The eight packet items

These are the packet contents listed in the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) in Linear, which assigns all eight to EWE-75.

| # | Item | Where it lives | Status | What is still missing |
| --- | --- | --- | --- | --- |
| 1 | Working product link **or** reproducible run instructions | README quick start + [`operational-runbook.md`](./operational-runbook.md) §3 | **Satisfiable by the second branch.** Run instructions are published and real | No deployment exists, so there is no link. Decide before submit which one the packet ships. |
| 2 | Named customer / target, correct relationship status, and the problem | [`customer-and-pilot.md`](./customer-and-pilot.md) on `main` | **Provisional target = PSV** (owner 2026-09-23; may change). Not a deal or outreach auth. | Named individual / intro route blank; confirm name before any pitch. |
| 3 | Model IDs and the central Token Factory architecture | Script beat 7 + README | **Architecture + live IDs available** via EWE-63/EWE-73 telemetry | Prefer IDs from real telemetry in `model-comparison.md`. |
| 4 | Actual evidence of model or infrastructure advantage, or trade-off | [`model-comparison.md`](./model-comparison.md) on `main` | **Published** (live comparison) | None for the artifact; keep numbers tied to that doc. |
| 5 | Short business case and pilot proposition | `customer-and-pilot.md` §5 | **Drafted on `main`** with provisional PSV | Every pilot measure has a definition and **no value**. |
| 6 | Live demo and a rehearsed five-minute presentation | [`five-minute-demo-script.md`](./five-minute-demo-script.md) | **Script drafted; rehearse ON HOLD** | Two rehearsals required when hold lifts. |
| 7 | Backup recording of the actual working flow | Local + one other location | **ON HOLD** with rehearse/submit | Spec is in `operational-runbook.md` §7. |
| 8 | Known limitations and accurate deployment / data boundaries | [`limitations.md`](./limitations.md) | **Drafted** | Final pass still wise before freeze when hold lifts. |

---

## 2. EWE-75 acceptance criteria

| # | Criterion | How it gets checked | Status |
| --- | --- | --- | --- |
| 1 | An unfamiliar reviewer can explain the user, inspect a source and understand why an action changed | Have someone **outside the build** watch rehearsal 2 and then answer three questions: who is this for, where did that fact come from, why did that advice change. If they cannot answer all three, the script is wrong, not the reviewer. | **On hold** — rehearsals not running |
| 2 | Every slide/demo number is sourced to a real run or explicitly labelled illustrative | The substantiation ledger in `five-minute-demo-script.md` §3, walked line by line after freeze, plus the claims gate in §3 below | **Partly.** Ledger exists; walk it at freeze when hold lifts |
| 3 | Deployment is described accurately: synthetic/public demo through managed inference; club-controlled deployment is future work unless demonstrated | The boundary paragraph in beat 7, and `limitations.md` §4 | **Drafted and accurate** |
| 4 | Runbook covers startup, credentials check, reset, timeout recovery and backup recording; submission assets are linked in the issue | `operational-runbook.md` §§3–7 | **Startup/credential check real.** Reset/timeout/backup structure only until observed. Linking assets in Linear is §4 below — owner when hold lifts. |

---

## 3. Claims control gate — run this before freeze

This is the mechanism for acceptance criterion 2 and for EWE-75's boundary, *"no fabricated integration indicators, customer claims or confidence percentages."* Walk the slides, the demo and the packet once, looking only for these. The full reasoning behind each entry is in §6 of `customer-and-pilot.md`; this is the operational version.

### Forbidden — any occurrence is a stop

- [ ] Any club named as a **customer, partner, pilot participant or interested party** (provisional *target* wording for PSV is allowed; do not upgrade the label)
- [ ] Any quote, paraphrase or anecdote attributed to an analyst or coach — no conversation has happened
- [ ] **Any time saving, in minutes, hours or percent — including "could save"**
- [ ] Any claim about match results, points, injury rates or availability outcomes
- [ ] Any revenue figure, market size, pipeline or validated price
- [ ] Any numeric confidence or probability, anywhere — there is no field for one in the contract, so if one appears on screen it is a bug, not a wording problem
- [ ] Any unmeasured benchmark number presented as measured
- [ ] Any vendor integration implied that does not exist
- [ ] Synthetic squad records presented as real, or as real player medical facts
- [ ] **A green CI run cited as evidence of live inference** — CI runs against the stub transport by design (`operational-runbook.md` §4.4)
- [ ] **An illustrative `example.invalid` source URL presented as a live link**
- [ ] Any implication that the four-fixture pilot has been agreed or has begun
- [ ] Any implication that open weights establish permission to process club data

### Required — each must be said or shown at least once

- [ ] The club records in the demo are synthetic, and both clubs are fictional
- [ ] The public sources are a dated snapshot, not live data
- [ ] Constraint enforcement happens in code after the model answers, not inside the model
- [ ] Club-controlled deployment is future work
- [ ] If the comparison was not measured, that it was not measured
- [ ] Provisional target is PSV with relationship label **target, not yet contacted** (or the updated name if changed)

---

## 4. Assets to link in the Linear issue

EWE-75's fourth acceptance criterion requires submission assets to be linked in the issue. **This document does not link them and no agent should**: this slice is read-only in Linear, and EWE-75's handoff instructions assign the claim and the completion post to whoever takes the issue.

What needs linking, once the hold lifts and each exists:

1. Repository URL and the exact integration commit SHA demonstrated
2. Working product link, or the README section with the run commands
3. `docs/demo/five-minute-demo-script.md`
4. `docs/demo/operational-runbook.md`
5. `docs/demo/model-comparison.md`
6. `docs/demo/customer-and-pilot.md`
7. `docs/demo/limitations.md`
8. The backup recording
9. The EWE-72 verification report, with the commands run and their actual output
10. The model IDs used, read from telemetry

---

## 5. Blocked on a human

| # | Item | Who | Consequence if unresolved |
| --- | --- | --- | --- |
| 1 | **Lift EWE-75 on-hold** | Ewerton | Rehearse/submit stay paused |
| 2 | Confirm or change provisional target **PSV** | Ewerton | Beat 6 uses provisional-target wording |
| 3 | Named individual / intro route; outreach authorisation | Ewerton | Discovery questions stay unsent |
| 4 | Working product link versus run instructions | Ewerton | Packet item 1 needs one or the other at submit |
| 5 | Who presents | Ewerton | Rehearsals need the actual presenter |

---

## 6. Final sequence (when hold lifts)

1. Confirm the frozen commit SHA. Everything in the packet refers to that SHA.
2. Confirm where each artifact lives — merged into `main`, or named by branch and commit.
3. Walk the claims gate (§3). Any hit is a stop, and the fix is deletion, not softening.
4. Walk the substantiation ledger (script §3). Every remaining pending row is either resolved or covered by wording that does not claim it.
5. Confirm the backup recording plays, from local storage, with no network — and that its telemetry does not say `transport: "stub"`.
6. Confirm every packet item in §1 is either present or **explicitly recorded as absent with its reason**. An absent item that is named is a limitation; an absent item that is silently skipped is a misrepresentation.
7. Hand to the owner for submission.
