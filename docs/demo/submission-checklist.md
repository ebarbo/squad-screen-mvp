# Submission checklist

| | |
| --- | --- |
| Issue | [EWE-75 — \[Delivery\] Package and rehearse the five-minute demo and submission](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) |
| Deadline | Packet prepared by **15:00 CEST, 23 September 2026**. Organiser's submission window 15:00–16:00. |
| Who submits | **The project owner.** EWE-75 states that the project owner performs event submission and any separately authorised public publishing. No agent submits anything. |
| Companions | [`five-minute-demo-script.md`](./five-minute-demo-script.md) · [`operational-runbook.md`](./operational-runbook.md) · [`limitations.md`](./limitations.md) |

> **Nothing here is ticked on the basis of an expectation.** EWE-75's handoff rule is explicit that unrun checks are not passed checks. Where an item has moved, it says what moved it and what is still missing.
>
> **Artifacts are scattered across branches.** `docs/` is not on `main`: this slice's files are on `feat/ewe-75-demo-runbook` and `customer-and-pilot.md` is on `feat/ewe-74-customer-and-pilot`. Either the branches converge before 15:00, or the packet says where each artifact lives.

---

## 1. The eight packet items

These are the packet contents listed in the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5) in Linear, which assigns all eight to EWE-75.

| # | Item | Where it lives | Status | What is still missing |
| --- | --- | --- | --- | --- |
| 1 | Working product link **or** reproducible run instructions | README quick start + [`operational-runbook.md`](./operational-runbook.md) §3 | **Satisfiable by the second branch.** Run instructions are published and real | No deployment exists, so there is no link. Decide before 15:00 which one the packet ships. |
| 2 | Named customer / target, correct relationship status, and the problem | `customer-and-pilot.md`, branch `feat/ewe-74-customer-and-pilot` at `b5093cc` | **Drafted, on a sibling branch** | Not on `main`. [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) is not Done — its §9 says two of four criteria are met only in the weaker form. Whether a club is **named** is pending Ewerton (§8). |
| 3 | Model IDs and the central Token Factory architecture | Script beat 7 + README | **Architecture describable now.** EWE-63 records verified default model IDs | `.env.example` still says confirm the exact ID against the event account, and **no live call has been made**. Name a model only off real telemetry. |
| 4 | Actual evidence of model or infrastructure advantage, or trade-off | `model-comparison.md` — **does not exist, no branch for it yet** | **Not satisfied** | [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) plus credentials. `npm run eval` exits 1 until EWE-71. A tie or trade-off satisfies this; a fabricated number does not. |
| 5 | Short business case and pilot proposition | `customer-and-pilot.md` §5, same sibling branch | **Drafted, on a sibling branch** | Same as item 2. Every pilot measure has a definition and **no value**. |
| 6 | Live demo and a rehearsed five-minute presentation | [`five-minute-demo-script.md`](./five-minute-demo-script.md) | **Script drafted, nothing rehearsed** | Rehearsal needs a running loop, which needs EWE-64–EWE-70. Two rehearsals required. |
| 7 | Backup recording of the actual working flow | Local + one other location | **Not satisfied** | The loop it would record does not exist. Spec is in `operational-runbook.md` §7. |
| 8 | Known limitations and accurate deployment / data boundaries | [`limitations.md`](./limitations.md) | **Drafted** | Needs a final pass after EWE-72 and EWE-73. |

---

## 2. EWE-75 acceptance criteria

| # | Criterion | How it gets checked | Status |
| --- | --- | --- | --- |
| 1 | An unfamiliar reviewer can explain the user, inspect a source and understand why an action changed | Have someone **outside the build** watch rehearsal 2 and then answer three questions: who is this for, where did that fact come from, why did that advice change. If they cannot answer all three, the script is wrong, not the reviewer. | **Not satisfied** — nothing to watch |
| 2 | Every slide/demo number is sourced to a real run or explicitly labelled illustrative | The substantiation ledger in `five-minute-demo-script.md` §3, walked line by line after freeze, plus the claims gate in §3 below | **Partly.** The ledger has 21 rows and is honest about each; the ones that matter for the pitch — comparison numbers, latency, model ID from telemetry — are still pending |
| 3 | Deployment is described accurately: synthetic/public demo through managed inference; club-controlled deployment is future work unless demonstrated | The boundary paragraph in beat 7, and `limitations.md` §4 | **Drafted and accurate**, because nothing has been deployed anywhere |
| 4 | Runbook covers startup, credentials check, reset, timeout recovery and backup recording; submission assets are linked in the issue | `operational-runbook.md` §§3–7 | **Startup and credential check are real.** Reset, timeout recovery and backup are structure only — no failure mode has been observed and there is no recording. Linking assets in Linear is §4 below. |

---

## 3. Claims control gate — run this before freeze

This is the mechanism for acceptance criterion 2 and for EWE-75's boundary, *"no fabricated integration indicators, customer claims or confidence percentages."* Walk the slides, the demo and the packet once, looking only for these. The full reasoning behind each entry is in §6 of `customer-and-pilot.md`; this is the operational version.

### Forbidden — any occurrence is a stop

- [ ] Any club named as a customer, partner, pilot participant or interested party
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

---

## 4. Assets to link in the Linear issue

EWE-75's fourth acceptance criterion requires submission assets to be linked in the issue. **This document does not link them and no agent should**: this slice is read-only in Linear, and EWE-75's handoff instructions assign the claim and the completion post to whoever takes the issue.

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
| 2 | `SQUAD_SCREEN_COMPARISON_MODEL_ID` | Ewerton | Packet item 4 stays pending. Beat 5 runs as Variant P. |
| 3 | Whether a target club is named, and with what relationship label | Ewerton, via `customer-and-pilot.md` §8 | Beat 6 runs on the target-profile wording. Honest, but it is the owner's call whether the event expects a name. |
| 4 | Whether the event requires a *named* customer or an honest validation status | Ewerton / mentor | Changes what goes in packet item 2. |
| 5 | Working product link versus run instructions | Ewerton | Packet item 1 needs one or the other by 15:00. |
| 6 | Who presents | Ewerton | Rehearsals need the actual presenter; rehearsing with the wrong person is not rehearsal. |

---

## 6. Final sequence, 14:45–15:00

1. Confirm the frozen commit SHA. Everything in the packet refers to that SHA.
2. Confirm where each artifact lives — merged into `main`, or named by branch and commit.
3. Walk the claims gate (§3). Any hit is a stop, and the fix is deletion, not softening.
4. Walk the substantiation ledger (script §3). Every remaining pending row is either resolved or covered by wording that does not claim it.
5. Confirm the backup recording plays, from local storage, with no network — and that its telemetry does not say `transport: "stub"`.
6. Confirm every packet item in §1 is either present or **explicitly recorded as absent with its reason**. An absent item that is named is a limitation; an absent item that is silently skipped is a misrepresentation.
7. Hand to the owner for submission.
