# Submission checklist

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Deadline | Packet prepared by **15:00 CEST, 23 September 2026**. Organiser's submission window 15:00–16:00. |
| Who submits | **The project owner.** EWE-75 states that the project owner performs event submission and any separately authorised public publishing. No agent submits anything. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`operational-runbook.md`](./operational-runbook.md) · [`limitations.md`](./limitations.md) |

> **Every item below is currently unsatisfied.** That is the accurate state, not a formatting artefact. The blocker is named for each one. Nothing here is ticked on the basis of an expectation — EWE-75's handoff rule is explicit that unrun checks are not passed checks.

---

## 1. The eight packet items

These are the packet contents listed in the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) in Linear, which assigns all eight to EWE-75.

| # | Item | Where it lives | Owner | Status | Blocker |
| --- | --- | --- | --- | --- | --- |
| 1 | Working product link **or** reproducible run instructions | Repository README + `operational-runbook.md` §3 | Platform (EWE-60), then EWE-75 | **Not satisfied** | EWE-60 has not landed. No commands published, no deployment. Decide before 15:00 whether the packet ships a link or instructions. |
| 2 | Named customer / target, correct relationship status, and the problem | `docs/demo/customer-and-pilot.md` | EWE-74 owner | **Not satisfied** | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) is open. A working draft exists outside this repository; the repository file does not. Whether a club is *named* needs the owner — see EWE-74 §8. |
| 3 | Model IDs and the central Token Factory architecture | Demo script beat 7 + README | EWE-75, EWE-63 | **Partly draftable** | The architecture is describable now. The **model IDs are not** — no call has been made, and no model has been confirmed available in the event account. |
| 4 | Actual evidence of model or infrastructure advantage, or trade-off | `docs/demo/model-comparison.md` | Evaluation slice (EWE-73) | **Not satisfied** | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) plus credentials. Table reads `Pending (not measured)`. A tie or trade-off would satisfy this; a fabricated number would not. |
| 5 | Short business case and pilot proposition | `docs/demo/customer-and-pilot.md` §5 | EWE-74 owner | **Not satisfied** | EWE-74. The pilot is specified in the working draft; it has not landed here. |
| 6 | Live demo and a rehearsed five-minute presentation | `five-minute-demo-script.md` | EWE-75 | **Script drafted, nothing rehearsed** | Rehearsal needs a running product, which needs EWE-72's loop to work. Two rehearsals are required. |
| 7 | Backup recording of the actual working flow | Local + one other location | EWE-75 | **Not satisfied** | Nothing exists to record. Spec is in `operational-runbook.md` §7. |
| 8 | Known limitations and accurate deployment / data boundaries | [`limitations.md`](./limitations.md) | EWE-75 | **Drafted** | Needs a final pass after EWE-72, EWE-73 and EWE-74 land, because each will add or remove entries. |

---

## 2. EWE-75 acceptance criteria

| # | Criterion | How it gets checked | Status |
| --- | --- | --- | --- |
| 1 | An unfamiliar reviewer can explain the user, inspect a source and understand why an action changed | Have someone **outside the build** watch rehearsal 2 and then answer three questions: who is this for, where did that fact come from, why did that advice change. If they cannot answer all three, the script is wrong, not the reviewer. | **Not satisfied** — nothing to watch |
| 2 | Every slide/demo number is sourced to a real run or explicitly labelled illustrative | The substantiation ledger in `five-minute-demo-script.md` §3, walked line by line after freeze, plus the claims gate in §3 below | **Not satisfied** — the ledger is currently 10 PENDING out of 14 rows |
| 3 | Deployment is described accurately: synthetic/public demo through managed inference; club-controlled deployment is future work unless demonstrated | The boundary paragraph in beat 7, and `limitations.md` §4 | **Drafted.** Accurate as written, because nothing has been deployed anywhere |
| 4 | Runbook covers startup, credentials check, reset, timeout recovery and backup recording; submission assets are linked in the issue | `operational-runbook.md` §§3–7 covers all five areas structurally. Linking assets in Linear is §4 below. | **Structure drafted, contents pending.** No command has been run; no failure mode has been observed |

---

## 3. Claims control gate — run this before freeze

This is the mechanism for acceptance criterion 2 and for EWE-75's boundary, *"no fabricated integration indicators, customer claims or confidence percentages."* Walk the slides, the demo and the packet once, looking only for these.

### Forbidden — any occurrence is a stop

- [ ] Any club named as a customer, partner, pilot participant or interested party
- [ ] Any quote, paraphrase or anecdote attributed to an analyst or coach — no conversation has happened
- [ ] **Any time saving, in minutes, hours or percent — including "could save"**
- [ ] Any claim about match results, points, injury rates or availability outcomes
- [ ] Any revenue figure, market size, pipeline or validated price
- [ ] Any numeric confidence or probability, anywhere — forbidden by the technical contract in the data model, so if one appears on screen it is a bug, not a wording problem
- [ ] Any unmeasured benchmark number presented as measured
- [ ] Any vendor integration implied that does not exist
- [ ] Synthetic squad records presented as real, or as real player medical facts
- [ ] Any implication that the four-fixture pilot has been agreed or has begun
- [ ] Any implication that open weights establish permission to process club data

### Required — each must be said or shown at least once

- [ ] The club records in the demo are synthetic and labelled as such in the interface
- [ ] The public sources are a dated snapshot, not live data
- [ ] Constraint enforcement happens in code after the model answers, not inside the model
- [ ] Club-controlled deployment is future work
- [ ] If the comparison was not measured, that it was not measured

The forbidden list is consolidated from §6 of the EWE-74 working document, the technical contract and the acceptance criteria of EWE-73, EWE-74 and EWE-75. The full reasoning behind each entry is in that EWE-74 document; this is the operational version.

---

## 4. Assets to link in the Linear issue

EWE-75's fourth acceptance criterion requires submission assets to be linked in the issue. **This document does not link them and no agent should**: the task boundary for this slice is explicitly read-only in Linear, and EWE-75's handoff instructions assign the claim and the completion post to whoever takes the issue.

What needs linking, once each exists:

1. Repository URL and the exact integration commit SHA demonstrated
2. Working product link, or the README section with the run commands
3. `docs/demo/five-minute-demo-script.md`
4. `docs/demo/operational-runbook.md`
5. `docs/demo/model-comparison.md` — measured or explicitly pending
6. `docs/demo/customer-and-pilot.md`
7. `docs/demo/limitations.md`
8. The backup recording
9. The EWE-72 verification report, with the commands run and their actual output
10. The model IDs used, read from telemetry

---

## 5. Blocked on a human

| # | Item | Who | Consequence if unresolved |
| --- | --- | --- | --- |
| 1 | `NEBIUS_API_KEY` and `SQUAD_SCREEN_MODEL_ID` | Ewerton | No live inference. The event requires a real Token Factory call; without it the core demo cannot be performed as specified. |
| 2 | `SQUAD_SCREEN_COMPARISON_MODEL_ID` | Ewerton | Packet item 4 stays `Pending`. Beat 5 runs as Variant P. |
| 3 | Whether a target club is named, and with what relationship label | Ewerton, via EWE-74 §8 | Beat 6 runs on the target-profile wording. Honest, but it is the owner's call whether the event expects a name. |
| 4 | Whether the event requires a *named* customer or an honest validation status | Ewerton / mentor | Changes what goes in packet item 2. |
| 5 | Working product link versus run instructions | Ewerton | Packet item 1 needs one or the other by 15:00. |
| 6 | Who presents | Ewerton | Rehearsals need the actual presenter; rehearsing with the wrong person is not rehearsal. |

---

## 6. Final sequence, 14:45–15:00

1. Confirm the frozen commit SHA. Everything in the packet refers to that SHA.
2. Walk the claims gate (§3). Any hit is a stop, and the fix is deletion, not softening.
3. Walk the substantiation ledger (script §3). Every remaining PENDING is either resolved or covered by wording that does not claim it.
4. Confirm the backup recording plays, from local storage, with no network.
5. Confirm every packet item in §1 is either present or **explicitly recorded as absent with its reason**. An absent item that is named is a limitation; an absent item that is silently skipped is a misrepresentation.
6. Hand to the owner for submission.
