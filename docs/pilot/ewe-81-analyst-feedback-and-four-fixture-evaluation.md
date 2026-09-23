# EWE-81 — Analyst feedback capture and four-fixture evaluation

| | |
| --- | --- |
| Issue | [EWE-81 — \[Pilot\] Capture analyst feedback and evaluate the four-fixture workflow](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) |
| Label in Linear | `Squad Screen: pilot`, milestone 06, priority Low, no due date |
| Blocked by | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) (no pilot customer), [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior) (no verified working product), [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) (no data authorisation) |
| Intended repo home | `docs/pilot/` per the issue's Files/ownership field. Not written to the repository by this agent. |

**What this document is.** The feedback record schema and its reason taxonomy, the capture flow, the measurement protocol with operational definitions, the post-fixture review script, and a pre-registered analysis structure whose tables are empty because nothing has been measured.

**What this document is not.** It is not results. No analyst has used the product, no fixture has been prepared with it, and every table below contains `Not measured`. That is the correct state, and filling any cell with a plausible figure would fail the issue's own gates.

**Division with [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture).** That issue specifies *what* the pilot measures and *what decision* the results feed. This one specifies *how* the measurement happens, what the instrument is, and how the numbers are read. Where they overlap — the measure list and decision thresholds — EWE-74 is the source and this document implements it.

---

## 1. The design constraint everything else follows from

Every piece of feedback must attach to the exact artefact it is about. The acceptance criterion is *"Feedback is linked to source snapshot, recommendation and scenario"*, and the reason is that without those links the data is unusable three weeks later.

"The system was wrong about the left back" is worthless. "Recommendation `r-3` in run `run-882`, scenario `sc-1`, against evidence snapshot `snap-41`, was rejected because the cited excerpt does not support the claim" is actionable: the run can be replayed, the excerpt re-read, and the failure classified as a synthesis problem, an evidence problem or a prompt problem.

This has an architectural consequence worth stating early, because discovering it during a pilot is expensive: **the prototype's in-memory run store cannot support this.** Runs vanish on restart, so a feedback record written on Thursday can reference a snapshot that no longer exists by Friday. Durable, tenant-scoped run and snapshot storage — [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §4 — is a prerequisite for this issue and not an optimisation of it.

---

## 2. Feedback record

### 2.1 Schema

Field names mirror the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) so that a feedback record joins to a run without translation.

```
FeedbackRecord
  id                        stable ID
  fixture_id
  run_id                    the run that produced this recommendation
  parent_run_id             null for a base run; set for a scenario rerun
  scenario_id               null when the feedback is on the base briefing
  evidence_snapshot_id      the frozen snapshot the advice was generated from
  recommendation_id
  prior_recommendation_id   mirrors the contract's revision chain; null for newly added
  recommendation_status     proposed | withdrawn, as generated
  change_type               added | revised | withdrawn | unchanged; null on a base run

  disposition               accepted | amended | rejected | not_reviewed
  reason_codes              one or more, from §2.2; required for amended and rejected
  amendment                 what the analyst changed it to; required when amended
  comment                   free text, always optional

  reached_coach             yes | no        did this reach the decision recipient
  review_stage              pre_briefing | post_fixture_review
  reviewed_by
  reviewed_at

  model_id                  copied from run telemetry
  prompt_version            copied from run telemetry
```

Copying `model_id` and `prompt_version` onto the record looks redundant against the run, and it is not: if the model or prompt changes mid-pilot, feedback gathered before and after are about different systems, and the only way to notice is if each record says which system it judged.

`reached_coach` separates two very different failures. A wrong recommendation the analyst caught is the system working as designed — the analyst is the check. A wrong recommendation that reached the coaching staff is a safety failure under measure M7 in [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §5.2.

### 2.2 Reason codes

A closed list, because free text cannot be counted and "it wasn't very good" cannot be fixed. `other` exists and requires a comment; a pilot in which `other` is common means the taxonomy is wrong and should be revised between fixtures, with the revision recorded.

| Code | Meaning | Tells us |
| --- | --- | --- |
| `factually_wrong` | A stated fact is incorrect | Evidence layer or source problem |
| `unsupported_by_cited_evidence` | The cited excerpt does not support the claim | **Synthesis grounding failure — the most serious category** |
| `evidence_stale` | True once, not now | Freshness rules need tightening |
| `inference_disagree` | Facts fine, tactical reading wrong | Judgement gap; expected sometimes, informative in aggregate |
| `already_known` | True, correct, and tells the analyst nothing | Value problem, not a correctness problem |
| `not_actionable` | Cannot be done with this squad or setup | Missing constraint the system was never told |
| `wrong_player` | Right idea, wrong person | Identity resolution failure |
| `violates_constraint` | Breaches a staff-supplied limit | **Safety failure. Code should have blocked this.** |
| `unavailable_player_action` | Proposes using an unavailable player | **Safety failure. Code should have blocked this.** |
| `too_vague` | Not concrete enough to act on | Output specificity |
| `wrong_priority` | Correct, but ranked wrong | Ordering |
| `duplicate` | Restates another recommendation | Redundancy |
| `other` | Comment required | Taxonomy gap |

Three codes are more than feedback:

- **`unsupported_by_cited_evidence`** is the one that matters most. The entire product rests on the claim that every factual assertion is checkable against its source. Each occurrence is a direct hit on the core proposition and should be written up individually, not counted.
- **`violates_constraint`** and **`unavailable_player_action`** should be impossible. Both are validated in code after generation per the technical contract. Either occurring means the validation has a hole, so each one is simultaneously a feedback record and a bug report, and it should stop the pilot until the hole is closed.

### 2.3 What amendment captures

When the analyst amends rather than rejects, the amended version is the most valuable data in the pilot: it is a worked example of what good output looks like, written by the operator, for their own club, in their own words. Record what it was changed to, not merely that it changed.

---

## 3. Scenario feedback — including what the system failed to change

Per-recommendation feedback cannot capture an omission, and omission is the characteristic failure of a what-if. If advice that depended on Player A stays unchanged after Player A becomes unavailable, there is no recommendation to attach a complaint to. So each scenario rerun gets one additional record.

```
ScenarioAssessment
  run_id, parent_run_id, scenario_id, evidence_snapshot_id
  overrides_applied

  per recommendation:
    change_type as produced       added | revised | withdrawn | unchanged
    analyst agrees                yes | no
    should have been              added | revised | withdrawn | unchanged

  missed_changes                  recommendation IDs that stayed unchanged
                                  but should have changed          ← false negatives
  spurious_changes                recommendation IDs that changed
                                  but should not have              ← false positives
  explanation_quality             was the stated reason for each change adequate
  comment
```

`missed_changes` and `spurious_changes` are the two numbers that decide whether the what-if works. Spurious changes are annoying and erode trust. **Missed changes are dangerous**, because they leave advice standing on an assumption that no longer holds while looking freshly validated. They are also the harder of the two to notice, which is exactly why they need their own field and an explicit question in the review script rather than relying on the analyst to volunteer them.

`explanation_quality` tests the other half of the proposition. A correct change with an unconvincing explanation still fails, because the analyst has to defend the revision to a coach.

---

## 4. Abstention

Zero recommendations is a valid and deliberate output. Whether it was the *right* output is a judgement only the analyst can make, and it is worth capturing because an over-cautious system is as useless as an over-confident one.

```
AbstentionAssessment
  run_id, evidence_snapshot_id
  recommendations_returned      0 | 1 | 2
  abstention_appropriate        yes | no | unsure
  what_was_expected             free text — what the analyst thought should have been said
  evidence_was_available        yes | no | partial
                                (would the supporting evidence have been there?)
  comment
```

`evidence_was_available` distinguishes two very different situations that look identical from outside: the system abstained because the evidence genuinely did not support a recommendation (correct behaviour, and a selling point), or it abstained despite adequate evidence being present (a synthesis failure dressed as caution).

---

## 5. Capture flow

Requirements, because the way feedback is collected determines whether it means anything.

1. **In the flow, at the point of review.** A form emailed the next day gets remembered impressions, not judgements.
2. **Before the coach meeting, not after.** Once the staff have reacted, the analyst's view of the advice is contaminated by their reaction. Capture at `pre_briefing`; the `post_fixture_review` stage exists separately and is marked as such.
3. **No default disposition.** A pre-selected "accepted" collects clicks. Every recommendation is `not_reviewed` until the analyst chooses.
4. **Reason required on amend and reject, optional on accept.** Mandatory fields on the happy path suppress the happy path.
5. **Nothing blocks the analyst.** Feedback is never a gate on producing a briefing before a fixture. Coercing it during match preparation is how a pilot gets abandoned in week two.
6. **Neutral wording.** "Would you use this?" is a leading question. "Accept / amend / reject" is a decision the analyst is already making.
7. **Editable afterwards, with history.** First reactions change on reflection; keep both, timestamped.
8. **Visible completeness.** The analyst can see what they have and have not reviewed, without nagging.

---

## 6. Measurement protocol

Implements the measures defined in [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §5.2. Operational definitions, because "briefing time" means nothing until someone says exactly when the clock starts.

### 6.1 Timing boundaries

| Measure | Clock starts | Clock stops | Excluded |
| --- | --- | --- | --- |
| **M1** preparation time | First action on opposition preparation for this fixture | First complete briefing sent or presented to staff | Logged interruptions |
| **M2** revision time | The moment the analyst learns of the availability change | Revised version sent to staff | Logged interruptions |

Interruptions are logged as start and end, not estimated at the end of the day. An analyst who is pulled into a meeting for forty minutes mid-briefing will otherwise record a four-hour briefing.

There may be no availability change in a given fixture. That is a finding in itself — it tests hypothesis H2 in [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §3.3 with real data — and the correct record is "no qualifying event", not a blank.

### 6.2 Two clocks that must not be compared

| Source | Measures | Quality |
| --- | --- | --- |
| Analyst self-report | Total workflow time, including everything done outside the product | Weak. Self-reported, subject to recall and rounding. **The only option for baseline fixtures.** |
| System timestamps | Time between interactions with the product | Strong, but measures a narrower span |

The temptation is to compare a self-reported baseline against a system-measured assisted figure. That comparison is invalid — different spans, different instruments — and it would flatter the product, which is why it is worth naming now rather than discovering in the write-up. **Baseline against assisted uses self-report on both sides.** System timestamps are reported separately as their own measure, never substituted for M1 or M2.

### 6.3 Fact-checking effort

A tally, kept during preparation:

- **M3a** — one tick per individual claim the analyst independently verified before presenting
- **M3b** — minutes spent verifying, recorded as a running total
- **M3c** — count of claims changed or dropped as a result

In assisted fixtures, additionally distinguish **checks made easier by the evidence drawer** (the claim's source was one click away) from **checks requiring external lookup** (the analyst went elsewhere). If the drawer works, the ratio shifts, and that ratio is a more specific signal than total minutes.

### 6.4 The capture sheet

One per fixture. Deliberately simple — a form that takes fifteen minutes to fill will not be filled during match preparation.

```
Fixture:                                 Condition: baseline / assisted
Opponent:                                Competition:
Analyst:                                 Date range of preparation:

M1  preparation
    started:            ended:            interruptions (start–end):
    total minutes:

Availability change events this fixture:  none / listed below
  Event 1  what changed:
           learned at:                    revised version sent at:
           interruptions:                 M2 total minutes:

M3  fact-checking
    claims verified (M3a):
    minutes spent (M3b):
    corrections made (M3c):
    assisted only — checks resolved in the evidence drawer:
                     checks needing external lookup:

M4  dispositions: captured in the product (accepted / amended / rejected per recommendation)
M5  abstentions: captured per §4
M6  usefulness rating (1 per briefing) + one sentence:        ← impression, reported separately
M7  safety failures
    unsupported claim reached the coach:     yes / no    if yes, describe:
    constraint violated:                     yes / no
    unavailable player appeared in advice:   yes / no

Anything unusual about this fixture:
```

---

## 7. Post-fixture review

Twenty to thirty minutes with the analyst after each fixture, once the briefing has been delivered. Same script every time, so that four sessions are comparable.

1. **Capture sheet** — confirm the numbers, fill gaps while memory is fresh. *(3 min)*
2. **Dispositions** — walk the rejects and amendments. For each: what was wrong, and what would have made it right? *(8 min)*
3. **Grounding failures** — any `unsupported_by_cited_evidence` case, individually. Open the cited excerpt together and establish what the model claimed versus what the source said. *(5 min, longer if there were any — these matter more than everything else in the session)*
4. **Abstentions** — for each, was holding back right, and was the evidence there? *(3 min)*
5. **The what-if** — if a scenario ran: did anything change that should not have, and **did anything stay the same that should have changed?** Ask the second question explicitly; nobody volunteers an omission. *(5 min)*
6. **Open** — what was annoying, what was missing, what would you change? *(5 min)*
7. **Continued use** — will you use it for the next fixture? Record the answer verbatim. *(1 min)*

Two rules for running these:

- **Do not defend the product.** The session collects the analyst's view. Explaining why a recommendation was actually reasonable teaches them to stop reporting problems.
- **Write it up the same day**, separating what they said from what was concluded.

---

## 8. Analysis structure

Pre-registered. Table shells below define what will be reported and how, fixed before data collection so that the analysis cannot drift toward whatever the numbers turn out to favour.

### 8.1 Reporting rules

1. **Per fixture, never averaged.** Four values, listed. A mean of four heterogeneous fixtures hides everything and implies a precision that is not there.
2. **Measured and impression reported separately.** M1–M4 and M7 are measured; M5 and M6 are judgements. They never share a table.
3. **No inferential statistics.** No p-values, no confidence intervals, no significance. n=4 with one participant supports description only.
4. **Differences are described, not attributed.** "Revision took less time in fixtures 3 and 4" is reportable. "The tool saved X minutes" is not.
5. **Match results appear nowhere.** See §9.
6. **Every deviation from this plan is recorded** with its date and reason, in the write-up.

### 8.2 Table shells

**Timing** — self-reported both sides.

| | F1 baseline | F2 baseline | F3 assisted | F4 assisted |
| --- | --- | --- | --- | --- |
| M1 preparation minutes | Not measured | Not measured | Not measured | Not measured |
| Availability change occurred | Not measured | Not measured | Not measured | Not measured |
| M2 revision minutes | Not measured | Not measured | Not measured | Not measured |
| Interruptions excluded | Not measured | Not measured | Not measured | Not measured |

**Fact-checking**

| | F1 | F2 | F3 | F4 |
| --- | --- | --- | --- | --- |
| M3a claims verified | Not measured | Not measured | Not measured | Not measured |
| M3b minutes | Not measured | Not measured | Not measured | Not measured |
| M3c corrections | Not measured | Not measured | Not measured | Not measured |
| Resolved in drawer (assisted) | — | — | Not measured | Not measured |
| Needed external lookup (assisted) | — | — | Not measured | Not measured |

**Dispositions** — assisted fixtures only

| | F3 | F4 |
| --- | --- | --- |
| Recommendations produced | Not measured | Not measured |
| Accepted / amended / rejected | Not measured | Not measured |
| Reached the coach | Not measured | Not measured |
| Top reason codes | Not measured | Not measured |
| `unsupported_by_cited_evidence` count | Not measured | Not measured |

**Scenario quality** — assisted fixtures only

| | F3 | F4 |
| --- | --- | --- |
| Scenario reruns | Not measured | Not measured |
| Change types agreed by the analyst | Not measured | Not measured |
| Missed changes (false negatives) | Not measured | Not measured |
| Spurious changes (false positives) | Not measured | Not measured |
| Explanation adequate | Not measured | Not measured |

**Safety** — any non-zero cell is a finding regardless of every other table

| | F1 | F2 | F3 | F4 |
| --- | --- | --- | --- | --- |
| M7 unsupported claim reached the coach | Not measured | Not measured | Not measured | Not measured |
| M7 constraint violated | — | — | Not measured | Not measured |
| M7 unavailable player in advice | — | — | Not measured | Not measured |

**Impressions** — reported apart from everything above

| | F3 | F4 |
| --- | --- | --- |
| M5 abstentions, appropriate / not / unsure | Not measured | Not measured |
| M6 usefulness rating and sentence | Not measured | Not measured |
| Will use for the next fixture | Not measured | Not measured |

### 8.3 Decision

The continue/stop thresholds live in [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §5.4 and are confirmed by the owner before fixture 1. Evaluated in order, because the first two can end the pilot on their own:

1. **Any M7 safety failure that reached the coach** → stop, fix, and only then consider restarting.
2. **Any `violates_constraint` or `unavailable_player_action`** → the code-side validation has a hole; pause until closed.
3. Disposition, revision time and continued-use thresholds, per EWE-74.
4. Buyer signal, per §10.

The output is a written decision — continue, change, or stop — naming which threshold drove it. Written before anyone starts discussing what the numbers might mean.

---

## 9. What this pilot must never claim

The acceptance criterion is *"No causal claim about wins or injury reduction is inferred from the pilot."*

**Match outcomes are not recorded as pilot data.** Not as a metric, not as context, not as an anecdote. This is a stronger rule than it first appears, and it is deliberate. Once a result sits next to the fixture in a table, it will be read as an outcome — by a reader, by a reviewer, and eventually by whoever writes the pitch. The only reliable defence is for the column not to exist.

The reason is not modesty. Four fixtures, one team, no counterfactual, and a causal chain running through the briefing, the coach's interpretation, the players, the opponent, and chance. Nothing in that chain is observable here.

Equally forbidden:

- Any connection between the product and injury rates or player availability outcomes. The system holds no medical data by design — [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) Tier 0 — so it could not support such a claim even in principle.
- Extrapolating one analyst's usefulness ratings to analysts generally.
- Presenting a self-reported time difference as a measured saving.
- Quoting the analyst externally without separate explicit permission.

What the pilot *can* honestly establish: whether this workflow fits how this analyst works, which failure modes occur and how often, whether the evidence drawer changes how much they check, whether the what-if catches what it should, and whether they keep using it. That is a genuinely useful result, and it is the one the design supports.

---

## 10. Buyer continuation

Tested through behaviour, not opinion. Asked of the buyer, after the four fixtures.

| Signal | Strength |
| --- | --- |
| Asks to extend to more fixtures unprompted | Strong |
| Names a budget line and the person who signs | Strong |
| Asks to add a second analyst or team | Strong |
| Asks what it would cost | Moderate — interest, not commitment |
| "Very useful, let's talk next season" | Weak. Usually a no. |
| Cannot name who would decide | Negative, regardless of enthusiasm |

Record what was said, in their words, and what happened afterwards. The follow-through is the data; the meeting is not.

---

## 11. Data handling

- Feedback records contain pseudonymous player IDs only, per [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §8.
- Free-text comments are written by a human under time pressure and will occasionally contain a name or a reason. Reviewed before leaving the club's tenant, and redacted.
- **No pooling across clubs.** The issue is explicit: *"do not pool private club information without permission."* Feedback belongs to the club that produced it. Cross-club aggregation, benchmarking or model improvement requires separate, specific permission and is out of scope for the pilot.
- Retention follows the agreed schedule. Feedback outlives the run it describes only to the extent the agreement allows, and deletion must reach it.
- Findings shared outside the club are de-identified and shared only with permission. A pilot write-up that names the club is a publication, not a report.

---

## 12. Acceptance criteria

| Criterion | Status | Where |
| --- | --- | --- |
| Feedback is linked to source snapshot, recommendation and scenario | Met as specification. Every record carries `evidence_snapshot_id`, `run_id`, `scenario_id`, `recommendation_id` and the revision chain. | §1, §2.1, §3 |
| Metrics distinguish measured values from impressions or hypotheses | Met. Measured M1–M4 and M7 are separated from judgements M5–M6 in the schema, the tables and the reporting rules, and the two timing instruments are explicitly non-comparable. | §6.2, §8.1, §8.2 |
| No causal claim about wins or injury reduction is inferred from the pilot | Met. Match outcomes are excluded from the dataset rather than merely unreported. | §9 |
| Club data retention and permission requirements are respected | Met as specification, dependent on [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries). | §11 |
| Accept/amend/reject with reasons, distinguished from match outcomes | Met. Closed taxonomy of 13 codes; outcomes structurally absent. | §2.2, §9 |

Every criterion is met *as a specification*. None is met *as an executed evaluation*, and none can be until there is a pilot customer and a working product.

## 13. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- | --- |
| 1 | A pilot customer and a consenting analyst | Owner → club | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture). No real feedback can be simulated. |
| 2 | A verified working product | [EWE-72](https://linear.app/ewerton-barbosa/issue/EWE-72/qa-verify-the-complete-live-demo-and-failure-behavior) | Nothing to evaluate until the core loop is verified |
| 3 | Data authorisation | [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) | Even Tier 0 needs approval |
| 4 | Durable run and snapshot storage | Engineering | The in-memory store cannot support §1's linkage. Prerequisite, not an optimisation. |
| 5 | Build the feedback capture UI | Engineering, after 1–4 | Schema and flow are specified; the work is small |
| 6 | Confirm the decision thresholds | Owner | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §5.4, before fixture 1 |
| 7 | Run four fixtures and the review sessions | Analyst + owner | The measurement itself |

---

*Sources: [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow), the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) and the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5), read 2026-09-22. Nothing in Linear was modified. No pilot has been run and no result in this document is measured.*
