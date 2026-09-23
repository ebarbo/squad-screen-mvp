# EWE-74 — Named customer, problem evidence and four-fixture pilot

| | |
| --- | --- |
| Issue | [EWE-74 — \[Product\] Establish named customer, problem evidence and four-fixture pilot](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) |
| Label in Linear | `Squad Screen: core` (not `pilot`), milestone 04, priority High, due 2026-09-23 |
| Blocked by | Nothing. Ready to pick up. |
| Blocks | [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission) (submission), [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries), [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) |
| Repo distillation | [`docs/demo/customer-and-pilot.md`](https://github.com/ebarbo/squad-screen-mvp/blob/feat/ewe-74-customer-and-pilot/docs/demo/customer-and-pilot.md) on branch `feat/ewe-74-customer-and-pilot`. Demo- and submission-facing subset, same section numbering. **This document remains the full version**; keep them consistent when either changes. |

**What this document is.** The customer proposition, the problem statement, the discovery instrument needed to validate it, and the four-fixture pilot specification.

**What this document is not.** It is not evidence of a customer. No club has been contacted, no analyst has been interviewed, and no consent exists. Section 1 records that gap as the issue's acceptance criteria require, rather than papering over it.

---

## 1. Customer status — the honest answer

**Relationship status: none. Target profile only.**

The issue offers four labels — *target*, *interviewed user*, *pilot partner*, *paying customer*. None of them applies yet, because all four presuppose a specific named organisation, and no organisation has been named or approached.

| Claim | Status | Basis |
| --- | --- | --- |
| A specific club or analyst is our target | **Not established** | No organisation has been selected. Section 2 gives the selection rubric; the owner makes the choice. |
| Someone has been interviewed | **No** | Zero conversations have taken place. |
| A pilot partner exists | **No** | No agreement, verbal or written. |
| A paying customer exists | **No** | No commercial discussion has occurred. |
| The problem described in section 3 is real for this segment | **Hypothesis** | Derived from the project's own framing in Linear. Not validated with a practitioner. |

The project description in Linear states this directly: *"Named customer and validation status must be established; no customer relationship has been asserted."* This document does not change that; it makes the gap explicit and hands the owner the smallest set of actions that would close it.

Two consequences follow, and both matter for [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission):

1. The demo's 3:30–4:15 customer slot must use the language in section 7, which claims nothing untrue.
2. The named-customer expectation must be raised with the owner/mentor before submission. Section 8 is the escalation.

---

## 2. Target selection — rubric, not a name

Inventing a club name here would be exactly the fabrication the acceptance criteria forbid, and picking one without the owner is a decision that is not this agent's to make. What is useful instead is a rubric precise enough that the owner can fill the blank in one sitting and defend the choice.

### 2.1 Qualifying criteria — all must hold

| # | Criterion | Why it matters | How to check before contacting |
| --- | --- | --- | --- |
| Q1 | Employs at least one dedicated opposition or performance analyst | No operator, no product. A coach who does their own analysis has a different workflow and different willingness to pay. | Club staff page, LinkedIn, match-programme staff list |
| Q2 | Plays a regular fixture cadence (weekly or more) | The product's value compounds per fixture. A pre-season or academy side with sparse fixtures cannot run a four-fixture pilot in a sensible window. | Published competition calendar |
| Q3 | The analyst produces a written or presented pre-match briefing | If the briefing artefact does not exist, the product has nothing to attach to. | Must be asked — question Q1 in section 4 surfaces it |
| Q4 | Squad availability genuinely fluctuates late | This is the core bet. A squad with no late availability churn has no revision problem. | Must be asked — question Q2 in section 4 |
| Q5 | Reachable through a warm introduction | Cold outreach at this stage wastes the one good first conversation. | Owner's own network |

### 2.2 Disqualifying criteria — any one rules the target out for the *first* pilot

| # | Disqualifier | Reason |
| --- | --- | --- |
| D1 | No named individual willing to spend 30 minutes talking | Discovery cannot proceed on goodwill alone. |
| D2 | Data access would require a legal process before any conversation | The pilot should start on the least-data path in [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries), not a procurement cycle. |
| D3 | Already using a tool that performs this exact revision workflow | Worth knowing, but a displacement sale is a harder first test than a greenfield one. |
| D4 | The only interested person is in IT or innovation, not football operations | Innovation-team pilots frequently do not survive contact with the actual workflow. |

### 2.3 Segment shape (hypothesis, not a shortlist)

The event is run in Amsterdam on Central European Summer Time according to the project's Linear record, so the owner's reachable network is likely European. Within Europe, the segment where Q1–Q4 plausibly hold together is **professional first teams below the budget tier that already runs a bespoke internal analysis platform** — clubs large enough to employ an analyst, small enough that the analyst is one person doing the whole briefing by hand.

This is a reasoned guess about where the problem is sharpest. It is not market research, it is not sized, and it should be labelled as a hypothesis in any pitch.

### 2.4 The blank the owner fills

```
Target organisation:      ______________________
Named individual:         ______________________  Role: ______________________
Route of introduction:    ______________________
Q1–Q5 assessed:           [ ] Q1  [ ] Q2  [ ] Q3 (ask)  [ ] Q4 (ask)  [ ] Q5
Disqualifiers checked:    [ ] D1  [ ] D2  [ ] D3  [ ] D4
Relationship label today: none / target / interviewed user / pilot partner / paying customer
Date label last changed:  ______________________
```

The label moves one step at a time, and only on evidence: *target* on the owner's selection, *interviewed user* once a real conversation has happened and is written up, *pilot partner* only on an explicit agreement to run the four fixtures, *paying customer* only on money changing hands.

---

## 3. The problem — one recurring workflow

The acceptance criterion is that the problem is *"a specific recurring workflow, not a list of departments."* Here is the workflow.

### 3.1 The people

| Role | Who | What they do in this workflow | Confidence |
| --- | --- | --- |
| **Operator** | First-team opposition / performance analyst | Builds the pre-match briefing; is the person who would open the product | Stated in the project record; consistent across all three Linear documents |
| **Decision recipient** | Coaching staff (head coach and assistants) | Receives the briefing and decides the game plan; never opens the product | Stated in the project record |
| **Buyer** | Sporting or performance director | Hypothesised to hold the budget and sign | **Hypothesis.** Not confirmed with anyone. Could equally be the head coach, the head of analysis, or a central IT budget. |
| **Gatekeepers** | Medical lead, data protection officer, IT/security | Control whether real squad data can ever be used | Inferred from the data types involved; enumerated properly in [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) |

The operator and the buyer are different people, and the decision recipient is a third. Any pitch that collapses them into "the club" is hiding the hard part of the sale.

### 3.2 The recurring decision

> **In the days before a fixture, the analyst turns opponent observations plus their own squad's constraints into a small number of concrete recommendations for the coaching staff — and then, when a squad availability assumption changes late, has to work out which of those recommendations still hold.**

That second clause is the product. The first clause is a briefing tool; plenty of those exist. The bet is that the revision is the expensive part.

### 3.3 Why the revision is the expensive part — the hypothesis chain

Each link is a claim that could be false, and the discovery questions in section 4 are built to test them in order.

| # | Claim | Falsified if the analyst says… |
| --- | --- | --- |
| H1 | A written pre-match briefing exists and one person owns it | "The coach just talks it through with us, there's no document" |
| H2 | Squad availability changes after the briefing is drafted, often enough to matter | "By the time I write it, the squad is settled" |
| H3 | When it changes, the analyst re-examines the briefing rather than deleting one line | "I just cross the player out and the rest stands" |
| H4 | Working out *which* advice depends on the changed assumption is the slow part | "It's obvious which bits are affected, it takes two minutes" |
| H5 | Recommendations must be defensible to the coach, so provenance is checked before presenting | "The coach takes my word for it" |
| H6 | Someone other than the analyst controls the budget | "I expense tools myself" — good news, but it changes the sale entirely |

If H2, H3 and H4 all hold, the product has a problem worth solving. If H4 fails, the what-if feature is a demo trick rather than a product. **H4 is the load-bearing claim and the one to listen hardest for.**

### 3.4 What the product does about it

For one fixture, the system holds three bounded inputs — staff-supplied availability and constraints, bounded opponent observations, and a dated public source snapshot — and produces at most three recommendations in which the observed fact, the tactical inference and the proposed action are separate fields. Each factual claim links to the exact source excerpt behind it. When the analyst marks a player unavailable, the system reruns against a frozen evidence snapshot and reports, per recommendation, whether it is unchanged, revised, withdrawn or newly added — and why.

Two design choices carry the proposition, and both are worth saying out loud in a sales conversation because they are unusual:

- **The system abstains.** Zero recommendations is a valid output when the evidence does not support three. An analyst who has been burned by confident-sounding tools will notice this.
- **There are no confidence percentages.** The technical contract forbids invented numerical confidence. Uncertainty is stated in words, attached to the specific inference it qualifies.

---

## 4. Discovery instrument

The issue's wording is precise: *"Use existing validation evidence or prepare three questions for the owner to ask; never invent quotes, interviews or consent."* There is no existing validation evidence. So: three questions, plus the protocol to run them well.

**Boundary from the issue: external outreach requires the owner's explicit authorisation. This instrument is prepared, not sent.**

### 4.1 Rules for the conversation

1. **Do not pitch in the first ten minutes.** The moment the product is described, the interviewee starts being helpful instead of accurate.
2. **Ask about the last time, not about general practice.** "Walk me through the last fixture" produces facts; "how do you usually handle…" produces a tidied-up self-description.
3. **Never supply the answer inside the question.** "Does it take a long time to redo the briefing?" is worthless. "What did you have to redo?" is not.
4. **Follow the specifics.** When a number, a name or a duration appears, ask how they know it.
5. **Silence is a tool.** The second half of an answer is usually the useful half.
6. **Ask permission before recording; write notes either way.** Do not record without explicit consent, and do not quote anyone externally without separate permission.
7. **Write it up within the hour**, in the interviewee's words, separating what they said from what you concluded.

### 4.2 The three questions

**Q1 — the workflow as it actually runs.**
> "Take me through the last fixture you prepared for. From when you started on the opposition to when the staff saw your final version — what did you actually do, and what changed along the way?"

*Tests H1, and H2 if they volunteer a change unprompted (the strongest possible signal).*
Probes: Who else touched it? What form did it end up in — document, slides, a conversation? How long, start to finish? What part took longest?

**Q2 — the last late change.**
> "Think of the most recent time something about your own squad changed after you'd already drafted the briefing. What was it, when did you find out, and what did you have to redo?"

*Tests H2, H3 and H4 — the core of the proposition.*
Probes: How did you find out? How much of the briefing did you revisit versus leave alone? How did you decide which parts were affected? How long did the redo take? Has that happened for other fixtures this season — roughly how many?
**Listen for:** whether they describe *re-deriving* which advice depended on that player, or merely *deleting a line*. That distinction is H4, and it decides whether this product has a market.

**Q3 — what happens before it reaches the coach.**
> "When something in a briefing comes from somewhere other than your own eyes — a scout's note, a data feed, a colleague's analysis — what do you do with it before you put it in front of the coach?"

*Tests H5, and surfaces the cost of fact-checking that the pilot proposes to measure.*
Probes: Has a claim ever turned out to be wrong in front of the staff? What happened? Where do you go to check something? What do you do when two sources disagree?

### 4.3 Capture template

One per conversation, so that answers across conversations can be compared rather than remembered.

```
Date / duration / medium:
Person (name, role, club) — consent to record: yes / no
Consent to quote externally: yes / no / not asked

Q1 — workflow as described (their words):
  Briefing artefact exists:            yes / no / partial
  Owner of the artefact:
  Total preparation time as stated:
  Longest single step:

Q2 — most recent late change (their words):
  What changed:
  When they learned of it, relative to the fixture:
  Scope of rework described:           re-derived dependencies / deleted a line / no rework
  Rework duration as stated:
  Frequency this season as stated:

Q3 — verification before presenting (their words):
  Verification happens:                always / sometimes / never
  Cost described:
  A past error was described:          yes / no

H1 [ ]  H2 [ ]  H3 [ ]  H4 [ ]  H5 [ ]  H6 [ ]   (tick = supported by what they said)
Strongest verbatim quote (exact words only, no paraphrase):
What surprised me:
What I got wrong going in:
```

### 4.4 Stopping rule

After three conversations with people who meet Q1–Q4 of the target rubric:

- **H4 supported in all three** → the proposition holds; move to a pilot conversation.
- **H4 supported in one or two** → the problem is real but narrower than assumed; find what distinguishes the clubs where it holds before building further.
- **H4 supported in none** → the what-if revision is not the valuable part. The evidence-provenance capability (H5) may still be, but that is a different product and should be re-scoped rather than relabelled.

### 4.5 Buyer conversation — separate, later, different person

Budget questions asked of the analyst produce speculation, so they belong in a second conversation with the sporting or performance director, held only after H4 is supported. Behavioural questions only:

1. "The last piece of analysis software the department added — who decided, who signed, and how long did it take from first conversation to access?"
2. "Which budget line would something like this come out of, and is it committed for this season?"
3. "What would have to be true at the end of four fixtures for you to keep it?"

Question 3 is the one that matters: it produces the success criteria in section 5 in the buyer's own words, which is a far better specification than one written in advance.

---

## 5. The four-fixture pilot

The issue requires a pilot *"measuring briefing/revision time, fact-checking effort, usefulness and accepted/amended/rejected advice."* The specification is below; the instrumentation and analysis that execute it belong to [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow).

### 5.1 Shape

| | |
| --- | --- |
| Unit of observation | One fixture preparation cycle, from starting opposition work to the staff receiving the final briefing |
| Number of fixtures | 4 — two baseline, then two assisted |
| Participants | One analyst at one club. The coaching staff see the output but are not measured. |
| Data mode | Least-data path from [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries): analyst-entered availability status and constraints, the analyst's own opponent notes, public sources. **No medical records, no injury detail, no diagnoses.** |
| Duration | Four consecutive fixtures at the club's own cadence |
| Exit | A written decision — continue, change, or stop — against criteria fixed before fixture 1 |

**Fixtures 1–2 (baseline).** The analyst works exactly as they do today. Nothing changes except that they record timings and fact-checks on the capture sheet. This establishes what "today" costs, in their process, for their fixtures.

**Fixtures 3–4 (assisted).** Same workflow, with the product available. The analyst keeps final say over everything that reaches the coach.

### 5.2 What gets measured

| ID | Measure | Definition | Type |
| --- | --- | --- |
| M1 | Briefing preparation time | Minutes from starting opposition work to sending the first complete version to staff. Interruptions excluded and logged. | Measured |
| M2 | Revision time after an availability change | Minutes from learning of the change to sending the revised version. Recorded per event; there may be none in a given fixture. | Measured |
| M3a | Fact-check count | Number of individual claims the analyst independently verified before presenting | Measured |
| M3b | Fact-check time | Minutes spent on those verifications | Measured |
| M3c | Corrections made | Number of claims changed or dropped as a result | Measured |
| M4 | Advice disposition | Per recommendation: accepted / amended / rejected, with a reason code. Taxonomy in [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow). | Measured |
| M5 | Abstention appropriateness | When the system returned fewer than three recommendations, the analyst records whether holding back was right | Judgement |
| M6 | Usefulness rating | One rating per briefing, plus one sentence of reasoning. | **Impression, not a measurement.** Reported separately and never aggregated with M1–M4. |
| M7 | Safety failures | Count of: an unsupported claim reaching the coach; an action violating a stated constraint; an unavailable player appearing in advice | Measured. **Any occurrence is a finding regardless of every other number.** |

### 5.3 What this design cannot tell you

Stated here because the pitch must not overreach, and because a reviewer who spots it first will discount everything else.

- **Four fixtures is not a sample.** Results are descriptive. No statistical inference, no significance, no extrapolation to other clubs.
- **Baseline and assisted are not comparable conditions.** Different opponents, different weeks, different amounts of squad churn. A time difference between them is not attributable to the tool.
- **Being observed changes behaviour.** Recording one's own timings makes one faster and more careful.
- **The analyst learns.** By fixture 4 they are better at the workflow *and* at the tool, and those cannot be separated.
- **One analyst is one opinion.** Usefulness ratings describe this person.
- **Match results are irrelevant here and must not be reported as an outcome.** Four fixtures cannot connect a briefing tool to a result, and claiming otherwise would be the single most damaging thing in the pitch.

A causal claim would need many more fixtures, several analysts across several clubs, and randomised assignment of which fixtures get assistance. The pilot is not that study, and its purpose is different: to find out whether the workflow fits and whether the analyst wants to keep using it.

### 5.4 Decision criteria — set before fixture 1

Pre-committing thresholds is what stops the pilot being read favourably after the fact. The values below are a **proposal**; the owner confirms or replaces each one before the first fixture, ideally using the buyer's own words from question 3 in section 4.5. Once fixture 1 starts, they do not move.

| Signal | Proposed continue threshold | Proposed stop threshold |
| --- | --- | --- |
| M7 safety failures | Zero across all four fixtures | Any unsupported claim reaching the coach, uncaught by the analyst |
| M4 disposition | Most recommendations accepted or amended rather than rejected, in both assisted fixtures | Majority rejected in either assisted fixture |
| M2 revision time | Analyst reports the revision as easier, and the recorded time does not increase | Revision takes longer than their baseline process |
| Continued use | Analyst asks to use it for a fifth fixture unprompted | Analyst stops opening it mid-pilot |
| Buyer | Names a budget line and a decision owner | Cannot identify who would sign |

"Analyst asks to use it for a fifth fixture unprompted" is the most informative row in the table, because it is behaviour rather than opinion.

### 5.5 Commercial hypothesis

Everything in this section is a hypothesis. No price has been tested, no market has been sized, and no revenue has been projected.

**Shape:** a one-off onboarding fee plus a recurring per-first-team subscription.

*Onboarding* covers the work that cannot be automated on the first club: agreeing which sources are authorised, mapping their export format to the evidence contract, capturing how the club expresses availability and constraints, and setting up access. [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) requires that effort to be measured on the first real connector, which is what would turn this from a guess into a number.

*Subscription* is per first team per season, on the reasoning that value scales with fixtures played and there is one analyst per team. Untested.

| Unknown | Resolved by |
| --- | --- |
| Price point at any tier | Buyer conversation; the pilot deliberately does not test price |
| Whether onboarding is days or weeks of work | [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) measuring it on a real source |
| Whether the buyer is the sporting director | Section 4.5 |
| Per-club marginal cost | Inference cost from [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) plus hosting; the inference figure is itself pending measurement |
| Whether a club will pay for the pilot itself | The strongest available willingness-to-pay signal — worth asking for even at a token amount |
| Data-processing obligations that change the cost base | [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) |

**Not claimed:** market size, revenue, number of addressable clubs, competitor pricing, or that any club has expressed purchase intent.

---

## 6. Claims allowed and claims forbidden

The fourth acceptance criterion — *"No unsupported customer relationship, time-saving number or match-performance claim appears in the pitch"* — is a property of the presentation, not of this document. This section is the checklist for [EWE-75](https://linear.app/ewerton-barbosa/issue/EWE-75/delivery-package-and-rehearse-the-five-minute-demo-and-submission).

**Permitted, because each is true today:**

- The operator is a first-team opposition or performance analyst; the decision recipient is coaching staff.
- The buyer is hypothesised to be a sporting or performance director, and this is unconfirmed.
- No customer relationship exists; a target profile and selection rubric do.
- The specific recurring decision is revising a pre-match briefing when a squad availability assumption changes late.
- Club-sensitive inputs in the demo are synthetic and fictional, and labelled as such in the interface.
- A four-fixture pilot is specified with pre-committed measures and decision criteria.
- Discovery questions are prepared and await the owner's authorisation to run.

**Forbidden, because nothing supports them:**

- Naming any club as a customer, partner, pilot participant or interested party.
- Any quote, paraphrase or anecdote attributed to an analyst or coach.
- Any time saving, in minutes, hours or percent — including "could save".
- Any claim about match results, points, injury rates or player availability outcomes.
- Any revenue, market size, pipeline or price validation.
- Presenting the synthetic squad records as real, or implying real player medical facts.
- Implying the four-fixture pilot has begun or has been agreed.
- Implying that using open-weight models establishes permission to process club data. It does not; see [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries).

---

## 7. Demo language for the 3:30–4:15 customer slot

Drafted to be delivered as written, so that the honest version is also the fluent version. Roughly 40 seconds.

> "We don't have a customer. What we have is a specific person we built this for: the opposition analyst at a professional first team, the one who writes the pre-match briefing.
>
> The decision we're targeting is narrow. They draft the briefing, then something changes — a player isn't available — and they have to work out which of their recommendations still stand. That last step is the bet. Everything in this product exists to make it fast and defensible.
>
> To test it we've specified a four-fixture pilot: two fixtures measuring how their current process performs, two with the tool. We measure briefing time, revision time, how much fact-checking they do, and what they accept, amend or reject. All the numbers are blank right now, because we haven't run it.
>
> The next step isn't engineering. It's three questions with one analyst, and they're written. What we won't do is put a saved-minutes figure on a slide before anyone has used this for real."

Adjust the last line to match what the owner is comfortable committing to. Do not adjust the first.

---

## 8. Escalation — the named-customer expectation

The issue's final deliverable: *"Resolve the event named-customer expectation with the owner/mentor if no validated customer exists."* No validated customer exists, and an agent cannot resolve this. It needs the owner, and it needs resolving before the submission packet is assembled.

**Ask the owner or mentor:**

1. Does the submission require a *named* customer, or a clearly-defined target with an honest validation status? The project record does not say which, and the answer changes what goes in the packet.
2. If a name is required, is there a real contact in your network who fits section 2.1 and could be asked tonight or tomorrow morning — with the relationship labelled exactly as it is, most likely "target, not yet contacted"?
3. Are the discovery questions in section 4 authorised to be sent? The issue explicitly gates outreach on your authorisation.

**If a name is required and none can be obtained in time**, the fallback is to present the target profile as a profile and say plainly that no relationship exists. Section 7 is written for exactly that case. The alternative — naming a club that has not been contacted — would breach the project's own gate that *"no unsupported customer relationship appears in the pitch"*, and is a worse outcome than the gap itself.

---

## 9. Acceptance criteria

| Criterion | Status | Where |
| --- | --- | --- |
| Named target and validation status are explicit, **or the unresolved gap is clearly recorded** | Met via the second branch. The gap is recorded in section 1; the rubric and the blank the owner fills are in section 2. A name requires the owner. | §1, §2, §8 |
| The problem is a specific recurring workflow, not a list of departments | Met. One decision, one operator, one trigger, with a falsifiable hypothesis chain. | §3 |
| Pilot success measures and buyer assumptions are concrete | Met. Seven measures with operational definitions, pre-committed decision thresholds, buyer assumptions listed as hypotheses with their resolution route. | §5 |
| No unsupported customer relationship, time-saving number or match-performance claim appears in the pitch | Met in this document; enforceable for the pitch via the checklist. | §6, §7 |

## 10. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- | --- |
| 1 | Select and name the target organisation and individual | Owner | Requires the owner's network and judgement. Fabricating a name would fail the acceptance criteria. |
| 2 | Authorise and run the three discovery questions | Owner | The issue explicitly gates external outreach on the owner's authorisation. No conversation can be simulated. |
| 3 | Resolve the event named-customer expectation | Owner / mentor | An interpretation of the event's requirements that only the organiser or mentor can give. |
| 4 | Confirm or replace the proposed decision thresholds in §5.4 | Owner, ideally with the buyer | Must be fixed before fixture 1 to mean anything. |
| 5 | Secure a pilot partner | Owner | Follows conversations that have not happened. |

---

*Sources: [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture), the [project record](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c/overview), the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) and the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5), read 2026-09-22. Nothing in Linear was modified.*
