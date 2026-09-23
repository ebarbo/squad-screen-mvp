# Customer status, problem evidence and the four-fixture pilot

| | |
| --- | --- |
| Issue | [EWE-74 — \[Product\] Establish named customer, problem evidence and four-fixture pilot](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) |
| Owner | EWE-74. This is the only file in `docs/demo/` owned by this issue. |
| Feeds | Beat 6 of [`five-minute-demo-script.md`](./five-minute-demo-script.md) (3:30–4:15) · the customer items in [`submission-checklist.md`](./submission-checklist.md) |
| Full version | This is the demo- and submission-facing distillation. The complete working document — target rubric, interview protocol and capture template, full measurement definitions, threats to validity — lives in the project agent store at `docs/pilot/ewe-74-customer-problem-and-four-fixture-pilot.md`. |
| Sources read | EWE-74, the project record, the technical contract and the demo and submission runbook, all read 2026-09-22. Nothing in Linear was modified. |

## Status legend

Same three tags used across `docs/demo/`.

| Tag | Meaning |
| --- | --- |
| **VERIFIED** | Observed directly, in Linear or in this repository. |
| **SPECIFIED** | Written down as required behaviour. Not yet done, not yet true. |
| **PENDING** | Blocked on a person or a decision nobody has made. A placeholder, not a claim. |

**Nothing in this document is a measurement, and no part of it reports a customer.** Every table of pilot results is empty because no pilot has run.

---

## 1. Customer status

> ### Relationship status: provisional named target — PSV (may change). **VERIFIED** (owner 2026-09-23; not a deal or outreach auth)

EWE-74 offers four labels — *target*, *interviewed user*, *pilot partner*, *paying customer*. Organisation provisionally named **PSV**; honest label is **target (provisional / assumed)**. Not contacted, interviewed, or signed.

| Claim | Status | Basis |
| --- | --- | --- |
| A specific club or analyst is our target | **Provisional — PSV** | Owner selected PSV 2026-09-23. May change. Not contacted. |
| Someone has been interviewed | **No** — VERIFIED | Zero conversations have taken place. |
| A pilot partner exists | **No** — VERIFIED | No agreement, verbal or written. |
| A paying customer exists | **No** — VERIFIED | No commercial discussion has occurred. |
| The problem in §3 is real for this segment | **Hypothesis** | Derived from the project's own framing in Linear. Not validated with a practitioner. |

The project record states it directly: *"Named customer and validation status must be established; no customer relationship has been asserted."* This document does not change that. It records the gap, which is the second branch of EWE-74's first acceptance criterion and the only branch currently available.

**The relationship label moves one step at a time, on evidence:** *target* on the owner's selection · *interviewed user* once a real conversation has happened and is written up · *pilot partner* only on an explicit agreement to run four fixtures · *paying customer* only on money changing hands. Do not round it up. Beat 6 of the demo script uses whichever label is true on the day.

---

## 2. Target selection

Naming a club here would fabricate the thing the acceptance criteria forbid, and the choice needs the owner's network. The rubric is precise enough to be filled in one sitting.

**Qualifying — all must hold.** Employs a dedicated opposition or performance analyst · plays a weekly or denser fixture cadence · the analyst produces an actual pre-match briefing artefact · squad availability genuinely fluctuates late · reachable through a warm introduction.

**Disqualifying — any one rules them out as the first pilot.** No named individual willing to give 30 minutes · data access needs a legal process before any conversation · already running this exact revision workflow in another tool · the only interested party is in IT or innovation rather than football operations.

The third and fourth qualifying criteria cannot be checked from outside — they are what questions Q1 and Q2 in §4 exist to establish.

**Segment shape (hypothesis, not a shortlist).** Professional first teams large enough to employ an analyst, small enough that the analyst is one person doing the whole briefing by hand. This is a reasoned guess about where the problem is sharpest. It is not market research, it is not sized, and it must be labelled as a hypothesis in any pitch.

```
Target organisation:      PSV  (provisional; may change)
Named individual:         ______________________  Role: __________________
Route of introduction:    ______________________
Relationship label today: target (provisional / assumed) / interviewed user / pilot partner / paying customer
Date label last changed:  2026-09-23
```

---

## 3. The problem — one recurring workflow

### 3.1 The people

| Role | Who | In this workflow | Status |
| --- | --- | --- |
| **Operator** | First-team opposition / performance analyst | Builds the briefing; the person who would open the product | **VERIFIED** — stated in the project record and all three Linear documents |
| **Decision recipient** | Coaching staff | Receive the briefing, decide the game plan, never open the product | **VERIFIED** — same |
| **Buyer** | Sporting or performance director | Holds budget and signs | **Hypothesis.** Unconfirmed. Could be the head coach, head of analysis, or central IT. |

These are three different people. A pitch that collapses them into "the club" is hiding the hard part of the sale.

### 3.2 The recurring decision

> **In the days before a fixture, the analyst turns opponent observations plus their own squad's constraints into a small number of concrete recommendations for the coaching staff — and then, when a squad availability assumption changes late, has to work out which of those recommendations still hold.**

The second clause is the product. The first is a briefing tool, and those exist.

### 3.3 The hypothesis chain

Each link could be false. The questions in §4 test them in order.

| # | Claim | Falsified if the analyst says… |
| --- | --- | --- |
| H1 | A written pre-match briefing exists and one person owns it | "The coach just talks it through, there's no document" |
| H2 | Availability changes after the briefing is drafted, often enough to matter | "By the time I write it, the squad is settled" |
| H3 | When it changes, the analyst re-examines the briefing rather than deleting a line | "I cross the player out and the rest stands" |
| H4 | Working out *which* advice depends on the changed assumption is the slow part | "It's obvious which bits are affected, two minutes" |
| H5 | Advice must be defensible to the coach, so provenance gets checked | "The coach takes my word for it" |
| H6 | Someone other than the analyst controls the budget | "I expense tools myself" — changes the sale entirely |

**H4 is load-bearing.** If it fails, the what-if is a demo trick rather than a product, and the evidence-provenance capability would need re-scoping as a different proposition.

### 3.4 What the product does about it

For one fixture: three bounded inputs — staff-supplied availability and constraints, bounded opponent observations, a dated public snapshot — produce at most three recommendations in which observation, inference and action are separate fields, each factual claim linked to its exact source excerpt. Mark a player unavailable and the system reruns against a frozen evidence snapshot, reporting per recommendation whether it is unchanged, revised, withdrawn or added, and why.

Two design choices carry the proposition and are worth saying out loud, because both are unusual: **the system abstains** — zero recommendations is a valid output — and **there are no confidence percentages**, because uncertainty is stated in words attached to the specific inference it qualifies.

---

## 4. Discovery — three questions, prepared and unsent

EWE-74: *"Use existing validation evidence or prepare three questions for the owner to ask; never invent quotes, interviews or consent."* There is no existing validation evidence.

**Status: written, not authorised, not sent. PENDING the owner.** Beat 7 of the demo script says these are written; that is accurate and is the only claim made about them.

**Q1 — the workflow as it actually runs.**
> "Take me through the last fixture you prepared for. From when you started on the opposition to when the staff saw your final version — what did you actually do, and what changed along the way?"

*Tests H1, and H2 if they volunteer a change unprompted — the strongest possible signal.*

**Q2 — the last late change.**
> "Think of the most recent time something about your own squad changed after you'd already drafted the briefing. What was it, when did you find out, and what did you have to redo?"

*Tests H2, H3 and H4.* **Listen for** whether they describe *re-deriving* which advice depended on that player, or merely *deleting a line*. That distinction is H4.

**Q3 — what happens before it reaches the coach.**
> "When something in a briefing comes from somewhere other than your own eyes — a scout's note, a data feed, a colleague's analysis — what do you do with it before you put it in front of the coach?"

*Tests H5, and surfaces the fact-checking cost the pilot proposes to measure.*

**Rules:** do not pitch in the first ten minutes · ask about the last time, not general practice · never supply the answer inside the question · ask permission before recording · never quote anyone externally without separate permission. Full protocol, capture template and stopping rule are in the store document.

**Budget questions are a separate conversation with a different person**, held only after H4 is supported. Asking the analyst about budget produces speculation.

---

## 5. The four-fixture pilot — SPECIFIED, not started

### 5.1 Shape

One analyst at one club, four consecutive fixtures at their own cadence. **Fixtures 1–2 baseline:** they work exactly as they do today, recording timings. **Fixtures 3–4 assisted:** same workflow with the product available; the analyst keeps final say over everything reaching the coach. Data is the least-data path — analyst-entered availability, their own opponent notes, public sources. **No medical records, no diagnoses.**

### 5.2 What gets measured

| ID | Measure | Definition | Type |
| --- | --- | --- |
| M1 | Preparation time | Minutes from starting opposition work to sending the first complete briefing. Interruptions excluded and logged. | Measured |
| M2 | Revision time | Minutes from learning of an availability change to sending the revised version. May be none in a given fixture. | Measured |
| M3 | Fact-check effort | Claims independently verified · minutes spent · corrections made | Measured |
| M4 | Advice disposition | Per recommendation: accepted / amended / rejected, with a reason code | Measured |
| M5 | Abstention appropriateness | When the system returned fewer than three, was holding back right | Judgement |
| M6 | Usefulness rating | One per briefing plus a sentence | **Impression.** Reported separately, never aggregated with M1–M4. |
| M7 | Safety failures | Unsupported claim reaching the coach · constraint violated · unavailable player in advice | Measured. **Any occurrence is a finding regardless of every other number.** |

Every value is **PENDING**. No fixture has been prepared with this product.

### 5.3 What this design cannot tell you

Four fixtures is not a sample; results are descriptive only. Baseline and assisted are not comparable conditions — different opponents, weeks and squad churn — so a time difference between them is not attributable to the tool. Being observed changes behaviour, and the analyst learns the workflow and the tool simultaneously. One analyst is one opinion. **Match results are not recorded as pilot data at all**, because four fixtures cannot connect a briefing tool to a result and a column of scores would be read as an outcome no matter how it is captioned.

A causal claim would need many more fixtures, several analysts across several clubs, and randomised assignment. The pilot is not that study. Its purpose is to find out whether the workflow fits and whether the analyst keeps using it.

### 5.4 Decision criteria — fixed before fixture 1

Proposed values. **The owner confirms or replaces each before the first fixture**, ideally in the buyer's own words. Once fixture 1 starts they do not move. Pre-committing is what stops the pilot being read favourably after the fact.

| Signal | Continue | Stop |
| --- | --- | --- |
| M7 safety failures | Zero across all four | Any unsupported claim reaching the coach, uncaught |
| M4 disposition | Most accepted or amended, both assisted fixtures | Majority rejected in either |
| M2 revision time | Reported easier, recorded time not increased | Takes longer than their baseline |
| Continued use | Asks to use it for a fifth fixture unprompted | Stops opening it mid-pilot |
| Buyer | Names a budget line and a decision owner | Cannot identify who would sign |

The fourth row is the most informative in the table, because it is behaviour rather than opinion.

### 5.5 Commercial hypothesis

**Everything here is a hypothesis. No price has been tested, no market sized, no revenue projected.**

Shape: a one-off onboarding fee plus a recurring per-first-team subscription. *Onboarding* covers what cannot be automated on the first club — agreeing authorised sources, mapping their export format, capturing how they express availability and constraints, setting up access. *Subscription* is per first team per season, reasoning that value scales with fixtures and there is one analyst per team.

| Unknown | Resolved by |
| --- | --- |
| Price at any tier | Buyer conversation. The pilot deliberately does not test price. |
| Whether onboarding is days or weeks | Measuring it on a real connector (EWE-80) |
| Whether the buyer is the sporting director | The separate buyer conversation |
| Per-club marginal cost | Inference cost from [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results) plus hosting — itself **PENDING** |
| Whether a club will pay for the pilot itself | The strongest available willingness-to-pay signal, worth asking for even at a token amount |

**Not claimed:** market size, revenue, addressable clubs, competitor pricing, or that any club has expressed purchase intent.

---

## 6. Claims allowed and claims forbidden

EWE-74's fourth acceptance criterion — *"No unsupported customer relationship, time-saving number or match-performance claim appears in the pitch"* — is a property of the presentation. This is the gate to walk before freeze. Referenced by beat 6 of the demo script and by the claims gate in [`submission-checklist.md`](./submission-checklist.md).

**Permitted, because each is true today:**

- The operator is a first-team opposition or performance analyst; the decision recipient is coaching staff.
- The buyer is hypothesised to be a sporting or performance director, and this is unconfirmed.
- No customer relationship exists; a target profile and a selection rubric do.
- The recurring decision is revising a pre-match briefing when a squad availability assumption changes late.
- Club-sensitive inputs in the demo are synthetic and fictional, and labelled as such in the interface.
- A four-fixture pilot is specified, with pre-committed measures and decision criteria.
- Three discovery questions are prepared and await the owner's authorisation.

**Forbidden, because nothing supports them:**

- Naming any club as a **customer, partner, pilot participant or interested party** (provisional *target* PSV wording is allowed; do not upgrade the label).
- Any quote, paraphrase or anecdote attributed to an analyst or coach.
- Any time saving in minutes, hours or percent — **including "could save"**.
- Any claim about match results, points, injury rates or player availability outcomes.
- Any revenue, market size, pipeline or price validation.
- Presenting the synthetic squad records as real, or implying real player medical facts.
- Implying the four-fixture pilot has been agreed or has begun.
- Implying that open weights establish permission to process club data. They do not — that is a separate agreement with the club, and a reviewer from the football side will know it.

---

## 7. Language for the customer slot, 3:30–4:15

**Ownership.** [`five-minute-demo-script.md`](./five-minute-demo-script.md) is authoritative for what is delivered on stage; it carries a trimmed 93-word version of the text below and moves the closing sentence to beat 7. **Deliver the script's version.** This section is the source it was trimmed from, kept here so the claims can be audited against §1 and §6 if the wording changes.

> "Our provisional target is PSV — relationship: target, not yet contacted; may change. We built this for the opposition analyst at a professional first team, the one who writes the pre-match briefing.
>
> The decision we're targeting is narrow. They draft the briefing, then something changes — a player isn't available — and they have to work out which of their recommendations still stand. That last step is the bet. Everything in this product exists to make it fast and defensible.
>
> To test it we've specified a four-fixture pilot: two fixtures measuring how their current process performs, two with the tool. We measure briefing time, revision time, how much fact-checking they do, and what they accept, amend or reject. All the numbers are blank right now, because we haven't run it.
>
> The next step isn't engineering. It's three questions with one analyst, and they're written. What we won't do is put a saved-minutes figure on a slide before anyone has used this for real."

Adjust the last line to what the owner will commit to. **Do not adjust the first.**

**If a target is named before the demo**, the first sentence becomes "Our target is ⟨name⟩, and the relationship is ⟨label⟩ — ⟨what that label actually means⟩," using the exact label from the ladder in §1. Nothing else in the beat changes.

---

## 8. Escalation — the named-customer expectation

EWE-74's final deliverable: *"Resolve the event named-customer expectation with the owner/mentor if no validated customer exists."* Organisation is provisionally named **PSV** (target, assumed; may change). No validated customer, interview, or pilot agreement exists. Outreach and named individual remain **PENDING Ewerton**. EWE-75 rehearse/submit is **ON HOLD** until the owner lifts it. This section still gates what goes in the submission packet when work resumes.

**Ask the owner or mentor:**

1. Does the submission require a *named* customer, or a clearly-defined target with an honest validation status? The project record does not say which, and the answer changes what goes in the packet. *(Provisional answer on 2026-09-23: named target PSV is recorded; relationship stays target / not contacted.)*
2. If a name is required, is there a real contact fitting §2 who could be asked before the demo — with the relationship labelled exactly as it is, most likely "target, not yet contacted"? *(Organisation named provisionally as PSV; named individual and outreach still gated.)*
3. Are the three questions in §4 authorised to be sent? EWE-74 explicitly gates outreach on the owner's authorisation.

**If a name is required and none can be obtained in time**, present the target profile as a profile and say plainly that no relationship exists. §7 is written for exactly that case. Naming a club that has not been contacted would breach the project's own gate that no unsupported customer relationship appears in the pitch, and is a worse outcome than the gap. *(PSV is allowed only as provisional *target* wording — do not upgrade the label.)*

---

## 9. Acceptance criteria

| Criterion | Status |
| --- | --- |
| Named target and validation status are explicit, **or the unresolved gap is clearly recorded** | **Met via provisional name.** Target = PSV (provisional); relationship = target (assumed), not contacted. |
| The problem is a specific recurring workflow, not a list of departments | **Met.** One decision, one operator, one trigger, six falsifiable hypotheses. |
| Pilot success measures and buyer assumptions are concrete | **Met as specification.** Seven measures with definitions, pre-committed thresholds, buyer assumptions labelled as hypotheses with their resolution route. **No measure has a value.** |
| No unsupported customer relationship, time-saving number or match-performance claim appears in the pitch | **Met in this document.** For the pitch itself, enforceable only by walking §6 before freeze — which has not happened. |

**The issue is not Done.** Its deliverables are produced; two of its four criteria are satisfied only in the weaker of the two available forms, and that is the honest reading.

## 10. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- |
| 1 | **Resolve the named-customer expectation** | Ewerton / mentor | §8. Organisation provisionally named PSV (2026-09-23); expectation partially addressed. Remaining: confirm whether provisional target is enough for the packet, and whether EWE-75 hold can lift. |
| 2 | Select and name the target organisation and individual | Ewerton | Organisation done provisionally as PSV (may change). Named individual still open — requires the owner's network. |
| 3 | Authorise and run the three discovery questions | Ewerton | EWE-74 gates outreach on explicit authorisation. No conversation can be simulated. Still gated. |
| 4 | Confirm or replace the §5.4 thresholds | Ewerton, ideally with the buyer | Must be fixed before fixture 1 to mean anything |
| 5 | Secure a pilot partner | Ewerton | Follows conversations that have not happened |
| 6 | Walk the §6 claims gate against the final slides | Presenter, before freeze | The slides do not exist yet. EWE-75 rehearse/submit is ON HOLD (owner 2026-09-23). |

---

*Companion pilot documents — approved club-data access and production boundaries (EWE-79), the connector specification (EWE-80), the feedback and evaluation framework (EWE-81), and adapter generalization (EWE-82) — are in the project agent store under `docs/pilot/`. They are post-hackathon work and are not part of the submission packet.*
