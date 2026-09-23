# EWE-79 — Approved club-data access and production boundaries

| | |
| --- | --- |
| Issue | [EWE-79 — \[Pilot\] Design approved club-data access and production boundaries](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) |
| Label in Linear | `Squad Screen: pilot`, milestone 06, priority Low, no due date |
| Blocked by | [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) — no club exists to have this conversation with |
| Blocks | [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector), [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) |
| Intended repo home | `docs/pilot/` per the issue's Files/ownership field. Not written to the repository by this agent. |

**What this document is.** The access-authorisation instrument to run with a club, a least-data pilot path designed so the first pilot needs almost no sensitive data, the security and production requirements that real data would trigger, and the list of questions that need qualified legal input.

**What this document is not.** It is not an authorisation, and it is not legal advice. Every row marked *"club confirms"* is empty on purpose — the issue requires data owners to be **named by the club**, and no club has been approached. Section 6 identifies legal questions by topic; answering them requires a qualified data protection lawyer in the relevant jurisdiction.

---

## 1. The rule this document exists to enforce

> **Nothing about the model, the licence or the deployment creates permission to process a club's data. Permission comes from the club, in writing, scoped to named datasets and named people.**

The issue makes one prohibition explicit — *"No unsupported claim that open weights automatically establishes permission or compliance"* — and it is worth stating why, because the confusion is common and superficially reasonable.

Open weights determine what you are *allowed to do with the model*: run it, modify it, self-host it. They say nothing about what you are allowed to do with *someone else's data*. Those are two unrelated permissions:

| Question | Answered by | Not answered by |
| --- | --- | --- |
| May we run this model? | The model's licence | Any club agreement |
| May we process this club's data? | A written agreement with the club, plus a lawful basis for each category | The model's licence, the deployment topology, or the fact that the demo works |
| May this data leave the club's infrastructure? | The club's own policy and its contracts with data subjects and vendors | Self-hosting being *possible* |
| May we send this to a third-party inference provider? | A processor agreement covering that provider | The provider being reputable, EU-based, or "not training on your data" by default |

Self-hosting an open-weight model is a *useful answer to a question the club may ask* — it removes one third party from the chain. It is not a substitute for the agreement. A pilot that starts because the demo impressed someone, rather than because a named person authorised named data, is the failure mode this document is designed to prevent.

Two further boundaries carried over from the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) and the [runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5):

- A dated source snapshot is a reliability measure. It is not permission to describe the system as using live club data.
- Public source queries receive public fixture and opponent terms only. No private squad identifier ever enters an outbound public query, in any tier below.

---

## 2. Data inventory — the worksheet the club fills in

Run this with the club before any connector work. One row per dataset. The right-hand columns are answered by the club, not by us, and an unanswered row means that dataset is out of scope.

### 2.1 Categories to walk through

| # | Dataset | Typical holder | Sensitivity | Needed for the core loop? |
| --- | --- | --- | --- | --- |
| C1 | Availability status per player (available / unavailable / monitor) | Analyst, team manager | Moderate — becomes health data the moment a reason is attached | **Yes.** This is the input the what-if overlay operates on. |
| C2 | Staff-supplied participation constraints (e.g. a maximum-minutes limit) | Coaching or medical staff | Moderate; often infers a medical fact | **Yes.** Enforced in code as a hard constraint. |
| C3 | Coach/analyst observations of own-player capability | Analyst | Low — professional opinion | **Yes.** The contract permits only supplied observations, never inferred capability. |
| C4 | Injury diagnoses, treatment records, medical clearance | Medical department | **Special category health data** | **No.** Explicitly excluded; see §3. |
| C5 | Training load, GPS, wellness, readiness scores | Sports science | High — health-adjacent, often contractually restricted | **No** for the first pilot. |
| C6 | Opponent scouting notes written by club staff | Analyst | Club-confidential, not personal-sensitive | **Yes.** |
| C7 | Licensed event or tracking data | Third-party vendor under club licence | Contractually restricted | **No** for the first pilot. Licence terms usually prohibit onward processing. |
| C8 | Video and clip libraries | Analysis department | Licensed, often heavily restricted | **No.** |
| C9 | Contract clauses affecting selection (appearance triggers, loan restrictions) | Club administration | Commercially confidential | **No.** |
| C10 | Public fixture, squad and match context | Public sources | Public | **Yes** — already in scope for the prototype. |

### 2.2 Per-dataset questions the club answers

For every row the club wants in scope:

```
Dataset:
1  Who inside the club owns this dataset?            (name + role)
2  Who may authorise external processing of it?      (name + role — may differ from owner)
3  Where does it live today, and in what format?
4  Is it covered by a third-party licence?           If yes: vendor, and does the licence
                                                     permit onward processing by a supplier?
5  Which club staff may see it?
6  Does it contain, or allow inference of, health information about an identified person?
7  What is the club's stated retention period for it?
8  What must happen to it when a player leaves, or when the pilot ends?
9  Has this ever been shared with an external supplier before?  If yes, under what agreement?
10 Would the club accept a pseudonymised version leaving its systems?
```

Question 6 is the pivot. A "yes" moves the dataset into special-category territory and changes the legal work from a processor agreement into something substantially heavier. Question 6 is also easy to get wrong: a field called `availability: unavailable` is not health data on its own, but `unavailable` next to `expected return: 3 weeks` is an inference about a person's health, and the pair should be treated as such.

Question 10 is the one that unlocks the least-data path in §3.

---

## 3. The least-data pilot path

The acceptance criterion asks for *"a practical least-data pilot path and its blockers."* Here it is, and the design intent is blunt: **make the first pilot legally boring.** Every category of data that would require a medical-department conversation is engineered out rather than negotiated for.

### 3.1 Tier 0 — what the pilot actually needs

| Input | Form | Who provides it | Why this is the minimum |
| --- | --- | --- | --- |
| Player roster | Pseudonymous IDs plus shirt number and position. **No names leave the club boundary.** | Analyst, once at onboarding | The contract already requires stable entity IDs and forbids names as join keys, so this costs nothing to implement. |
| Availability | Three values: `available` / `unavailable` / `monitor`. **No reason, no diagnosis, no return date, no free text.** | Analyst, per fixture | Exactly what the scenario overlay consumes. The contract already states that `monitor` is uncertainty and never medical clearance. |
| Participation constraints | An integer maximum-minutes value, or null. **No justification field.** | Analyst, transcribing what staff told them | Enforced in code after generation. The number is all the constraint engine needs. |
| Capability observations | Free text written by the analyst about their own player's football capability | Analyst | Professional opinion about on-pitch ability, not a health record. |
| Opponent observations | The analyst's own notes | Analyst | Club-confidential but not personal-sensitive. |
| Public context | Dated public snapshot | Already implemented in the prototype | Public. |

### 3.2 Why this is a genuinely small footprint

- **No medical data is transferred, because none is requested.** The product never learns *why* a player is unavailable, and it has no field in which to store a reason. That is a schema-level guarantee, not a policy promise.
- **No new collection happens.** Every Tier 0 input is something the analyst already knows and already writes down. The pilot changes where it is typed, not what is gathered.
- **No integration is required.** Tier 0 is analyst-entered. No export, no API, no vendor licence, no IT project. [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) becomes optional rather than prerequisite.
- **Names can stay inside the club.** The pseudonym-to-name mapping lives in the analyst's browser session or a club-held mapping file. The server stores `P07`; the analyst sees the real name. This is a real design commitment with a cost — support becomes harder, because a support engineer looking at a run sees only opaque IDs — and that cost is worth paying for the first pilot.

### 3.3 The residual risk, stated plainly

Tier 0 is small but it is not zero. `unavailable` about an identifiable professional footballer, in a squad of roughly twenty-five, is re-identifiable by anyone who follows the club, and it carries an obvious inference. The mitigations are pseudonymisation, a schema with nowhere to put a reason, access limited to people who already know the information, and short retention. The honest statement to the club is: *"this is the smallest version of the problem, not the absence of the problem."*

### 3.4 Tiers above Tier 0

Do not enter a higher tier to make a demo better. Enter it only when a validated workflow needs it.

| Tier | Adds | Unlocks | Cost of entry |
| --- | --- | --- | --- |
| **0** | Analyst-entered availability, constraints, observations | The complete core loop, including the what-if | Written approval from the analyst's manager; a short processing agreement |
| **1** | A club-controlled export of the same fields (C1–C3) | Removes manual entry; proves the connector thesis in [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) | Club IT involvement; export format agreement; scheduled-delivery security review |
| **2** | Structured medical status (C4) | Richer availability reasoning | Medical department as data owner; special-category lawful basis; DPIA; almost certainly a works-council or player-representation conversation. **Not recommended before a validated workflow.** |
| **3** | Licensed vendor data (C5, C7) | Richer opponent and load context | Vendor licence review and probable renegotiation; onward-processing rights; additional cost base |
| **4** | Video (C8) | Clip-level evidence | Heaviest storage, licensing and bandwidth burden |

### 3.5 Blockers on the least-data path

| # | Blocker | Owner | Notes |
| --- | --- | --- | --- |
| B1 | No club has been identified | Owner of [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | Everything else is downstream of this |
| B2 | No named data owner or approver | Club | §5 is the instrument; it cannot be filled in without a club |
| B3 | No processing agreement | Club + counsel | Even Tier 0 needs one |
| B4 | Legal questions in §6 unanswered | Qualified counsel | The product decisions in §7 depend on the answers |
| B5 | Inference provider terms unverified | Us | §8.5 — must be confirmed in writing before any real data, even pseudonymised |
| B6 | Production controls in §7 are unbuilt | Engineering | The prototype has none of them by design |

---

## 4. Prototype and production are different systems

The acceptance criterion requires production requirements to be *"separated from the hackathon prototype."* They are separated below. The prototype is not a small production system; it is a correct demonstration artefact with deliberately absent infrastructure.

| Concern | Hackathon prototype (as specified) | Required before any real club data |
| --- | --- | --- |
| Club data | Explicitly synthetic and fictional | Tier 0 real, pseudonymised, under written approval |
| Authentication | None | Required — §7.1 |
| Authorisation | None | Role-based — §7.2 |
| Persistence | In-memory run store; *"no production database"* | Durable, encrypted, tenant-scoped, with a retention policy |
| Tenancy | Single implicit tenant | Explicit isolation — §7.4 |
| Audit log | None | Required — §7.3 |
| Retention and deletion | Process lifetime | Contractual periods with a tested deletion path — §7.5 |
| Data residency | Wherever the provider runs | Named, contracted, verified |
| Secrets | Server-side environment variables | Managed secret storage with rotation |
| Availability | A laptop during a demo | An agreed level, or an explicit statement that none is promised |
| Backups | None | Encrypted, retention-bound, restore-tested |
| Support access | The developer, freely | Break-glass only, logged, club-notified — §7.2 |

Two of these deserve emphasis because they are easy to carry forward by accident:

- **The in-memory run store is a correct choice for the prototype and a disqualifying one for a pilot.** Every run vanishes on restart, which makes the audit trail in §7.3 impossible and makes [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow)'s requirement to link feedback to a snapshot unsatisfiable. Durable storage is the first thing a pilot needs and the first thing the prototype lacks.
- **"It works on the demo" says nothing about any row in this table.** The demo is designed to prove the reasoning loop. It is not a security posture.

---

## 5. Approval map — who has to say yes

Nobody in this table can be filled in by us. The issue requires data owners to be *named by the club*, and this is the instrument for doing that.

| Decision | Typical role | Named person | Confirmed on | Evidence of approval |
| --- | --- | --- | --- | --- |
| Approve the pilot commercially | Sporting / performance director | | | |
| Authorise availability and constraint data (C1–C3) | Head of analysis, or the analyst's line manager | | | |
| Authorise anything touching health data (C4, C5) | Club medical lead **and** data protection officer | | | |
| Sign the data processing agreement | DPO or legal counsel | | | |
| Approve external system access | IT / information security lead | | | |
| Confirm third-party licences permit onward processing | Whoever holds the vendor contracts | | | |
| Represent player interests, where required | Club process — works council, player liaison, or union channel | | | |
| Approve the retention and deletion schedule | DPO | | | |

Three observations from the structure of this table:

1. **The person enthusiastic about the product is rarely the person who can authorise the data.** The analyst will say yes immediately; the analyst cannot consent on behalf of their colleagues.
2. **Consent from the players is probably not the right legal mechanism, and assuming it is a common error.** In an employment relationship consent is difficult to make freely given, and "the players agreed" is a weak foundation. Which basis is appropriate is a question for counsel — §6, Q2 — not a decision to be made by whoever builds the connector.
3. **The health-data row has two signatures for a reason.** If the medical lead approves but the DPO has not, the approval is incomplete.

---

## 6. Questions for qualified legal counsel

Not legal advice, and not answerable by this agent or by an engineer. These are the questions to put to a data protection lawyer in the club's jurisdiction, phrased so that the answers translate directly into product decisions. Assumes an EU/EEA club and the GDPR; a club elsewhere needs the equivalent analysis under its own regime.

| # | Question | Topic | Product decision that depends on the answer |
| --- | --- | --- | --- |
| Q1 | Is a pseudonymised `available / unavailable / monitor` flag about an identifiable professional athlete personal data, and does it constitute health data under Article 9? | Scope and special categories | Whether Tier 0 is light-touch or triggers the full Article 9 regime |
| Q2 | What is the appropriate lawful basis under Article 6, and — if Article 9 applies — which Article 9(2) condition? Is consent viable in an employment context, or is it not? | Lawful basis | Whether a consent flow is needed at all, and what the club must tell players |
| Q3 | Is the club controller and are we processor, and does the Article 28 agreement need to name the inference provider as a sub-processor? | Roles and contracts | The shape of the agreement, and whether provider changes require club notice |
| Q4 | Does this processing require a Data Protection Impact Assessment under Article 35, given automated analysis of employee-related data? | DPIA | Whether a DPIA must precede the pilot rather than follow it |
| Q5 | What must players be told under Articles 13/14, by whom, and when? | Transparency | Whether the pilot needs a player-facing notice before fixture 1 |
| Q6 | What are the retention limits, and how must erasure requests under Article 17 propagate — including to evidence snapshots and stored model runs? | Retention and erasure | The deletion design in §7.5, which is materially harder for immutable snapshots |
| Q7 | Where may the data be processed, and what is required if the inference provider processes outside the EEA? | Transfers, Chapter V | Provider selection and whether a specific region must be contractually pinned |
| Q8 | Do the club's existing vendor licences (C5, C7) permit a supplier to process that data on the club's behalf? | Third-party licensing | Whether tiers 3–4 are reachable at all without renegotiation |
| Q9 | Does a system producing recommendations about employees fall within scope of any EU AI Act obligation, and at what classification? | AI regulation | Documentation, transparency and human-oversight obligations |
| Q10 | Are there sport-specific or collective-agreement constraints — works council, player union, league regulation — on analysing player data with an external supplier? | Sector-specific | Whether an additional approval step belongs in §5 |
| Q11 | Do data subject access requests extend to the model's outputs about a player, and in what form must they be produced? | Data subject rights | Whether runs must be queryable per player, which is a storage design decision |

Q6 and Q11 are the two that change the architecture rather than the paperwork, and they are the two most often discovered late. The system's core design principle is that evidence snapshots are immutable so that a what-if cannot rewrite history — and an erasure obligation is, by construction, a requirement to rewrite history. That tension needs an answer before the storage layer is built, not after.

---

## 7. Production requirements

What real data would require. None of it exists in the prototype, which is correct for the prototype.

### 7.1 Authentication

- Per-person accounts. No shared club login, because an audit trail that records "the club" answers no useful question.
- Federated sign-in against the club's existing identity provider (OIDC/SAML) wherever one exists — it means leavers lose access through the club's own process rather than ours, which is the single highest-value control available.
- Multi-factor authentication for any role that can configure sources or manage users.
- Short-lived sessions; re-authentication for administrative actions.
- No credential ever reaches the browser bundle. The prototype already enforces this for the provider key and the rule generalises.

### 7.2 Roles and permissions

| Capability | Analyst | Coach | Club admin | Vendor support | Auditor |
| --- | --- | --- | --- | --- | --- |
| View briefings and recommendations | ✓ | ✓ | | break-glass | |
| Generate a briefing | ✓ | | | | |
| Run a what-if scenario | ✓ | | | | |
| Inspect evidence and provenance | ✓ | ✓ | | break-glass | |
| Enter or change availability and constraints | ✓ | | | | |
| Configure sources and connectors | | | ✓ | break-glass | |
| Manage users and roles | | | ✓ | | |
| View the audit log | | | ✓ | | ✓ |
| Export data | | | ✓ | | |
| Request deletion | | | ✓ | | |

**Break-glass** means: no standing vendor access to club data. Access requires a recorded reason, is time-boxed, is logged as a distinct event type, and notifies the club administrator when it happens rather than in a monthly report. Support engineers who have not broken glass see pseudonymous IDs only.

The coach role is read-only by design. The decision recipient consumes the briefing; they do not operate the tool, and giving them write access would blur who is accountable for what reached the staff.

### 7.3 Audit logging

Append-only, tamper-evident, retained for a contractually agreed period, and queryable by the club without asking us. At minimum, each event records actor, timestamp, tenant, action, affected entity IDs and outcome:

- Authentication success and failure; authorisation denials
- Availability or constraint entered or changed — old value, new value, actor
- Evidence snapshot created, with its ID
- Generation run — run ID, snapshot ID, model ID, prompt version
- Scenario rerun — parent run ID, scenario ID, overrides applied
- Any outbound call to the inference provider, with a payload digest rather than the payload
- Source configuration change
- Export, deletion request, deletion completion
- User or role change
- Break-glass access — actor, reason, duration, what was viewed

The audit log itself contains pseudonymous player IDs only. An audit log that leaks the data it is auditing is a new liability rather than a control.

### 7.4 Tenant separation

- A tenant identifier on every record, enforced at the data-access layer rather than remembered at each call site. Every query is tenant-scoped by construction, and a query without a tenant scope should be impossible to write, not merely discouraged.
- Per-tenant encryption keys for data at rest, so that a key revocation is a complete and demonstrable deletion for that club.
- Object storage separated by tenant prefix with per-tenant key policies.
- Cross-tenant identifier probing belongs in the test suite: request another tenant's run ID and assert a not-found rather than a forbidden, so that IDs are not enumerable.
- No shared cache keyed on anything that can collide across tenants.
- Clubs are competitors. Any feature that pools data across tenants — benchmarks, aggregate models, "clubs like yours" comparisons — requires its own explicit permission and is out of scope for the pilot. [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) states the same rule for feedback data.

### 7.5 Retention and deletion

- A stated retention period per data category, agreed in the contract rather than chosen by the implementation.
- Automatic expiry rather than manual cleanup.
- A tested deletion path that reaches every copy: primary store, evidence snapshots, run history, logs, backups, and any provider-side retention.
- Deletion at pilot end by default, not on request. The pilot agreement should say what happens to the data on the day it ends, and that outcome should be the default rather than an action someone must remember to take.
- **The snapshot-immutability tension from §6 Q6 needs a designed answer.** The most likely shape is that erasure removes the pseudonym mapping and the personal fields while retaining the structural record needed for audit, but whether that satisfies the obligation is a legal question, not an engineering preference.

### 7.6 Deployment models

| | Vendor-managed, multi-tenant | Vendor-managed, single-tenant | Club-controlled |
| --- | --- | --- | --- |
| Where data rests | Our infrastructure, logically separated | Our infrastructure, dedicated instance | Club's infrastructure |
| Inference | Third-party provider | Third-party provider, or dedicated endpoint | Self-hosted open-weight model, or a provider the club contracts directly |
| Club security review | Substantial | Substantial | Shifts to their own team |
| Operational burden on us | Lowest | Moderate | Highest — remote support, version drift, upgrades we cannot perform |
| Time to first fixture | Fastest | Moderate | Slowest — an IT project |
| Fits Tier 0 | Yes | Yes | Overkill |
| Fits Tier 2+ | Probably not | Possibly | Most likely |

**Recommendation for the first pilot: vendor-managed multi-tenant on the Tier 0 dataset.** The data is pseudonymised and minimal, and the alternative spends the club's scarce IT goodwill before the workflow has been shown to be worth anything. Club-controlled deployment is the honest answer to *"what would it take to use our real medical data"*, and it is exactly the right thing to say when that question arrives — but it is the answer to a later question. The open-weight model choice is what makes that later answer credible, and that is the correct claim to make about open weights. It is not a claim about permission.

---

## 8. The inference boundary

The part most easily overlooked: even a perfectly secured application sends its prompts somewhere.

### 8.1 What actually leaves

For every generation and every scenario rerun, the assembled `MatchContext` goes to the provider. Under Tier 0 that is: pseudonymous player IDs, position, a three-value availability flag, an integer minutes constraint, analyst-written capability observations, analyst-written opponent observations, and public context.

### 8.2 What must never leave

- Player names — the pseudonym mapping stays club-side.
- Any reason for unavailability. There is no field for one, which is the point.
- Anything from tiers 2–4 unless separately authorised.
- Private identifiers in a public search query. The technical contract already requires public queries to carry public fixture and opponent terms only, and that rule holds unchanged in the pilot.

### 8.3 Pseudonymisation is a boundary control, not a disclaimer

Pseudonymised data is still personal data where re-identification is possible, and in a twenty-five-player squad it is. Pseudonymisation reduces exposure at the provider and limits what a support engineer can see. It does not remove the need for the agreement, and it should never be presented to a club as if it did.

### 8.4 Free-text is the leak that will actually happen

The capability and opponent observation fields are free text written by a human under time pressure. Sooner or later someone types a name, or a reason, into one of them. Controls: a client-side warning on entry, a documented instruction to the analyst, and an acceptance that this will occasionally fail. Do not claim names cannot reach the provider — claim the schema does not ask for them and the interface discourages them.

### 8.5 What the provider must confirm in writing

Before any real club data, pseudonymised or not, and regardless of how the prototype was demonstrated:

| # | Confirmation | Why |
| --- | --- | --- |
| 1 | Inputs and outputs are not used for training | Otherwise club data may influence a shared model |
| 2 | Retention period for prompts and completions, and whether zero retention is available | Feeds the retention design in §7.5 |
| 3 | Processing region, contractually pinned | §6 Q7 |
| 4 | Sub-processors, and notice of changes | Must flow through to the club's Article 28 agreement |
| 5 | A data processing agreement is executable | Without it the chain of permission has a gap |
| 6 | Security posture, incident notification terms and timelines | Standard vendor due diligence |

If the answers are unsatisfactory, the options are a different provider or the club-controlled deployment in §7.6. That is a real decision the architecture supports — and it is the practical value of having built on an open-weight model.

---

## 9. What stays synthetic

| Element | Hackathon | Tier 0 pilot | Later |
| --- | --- | --- | --- |
| Player identities | Fictional, unmistakably so | Real players, pseudonymous IDs, names club-side | Unchanged |
| Availability status | Synthetic | Real, analyst-entered, three values | Possibly connector-fed (Tier 1) |
| Minutes constraints | Synthetic (a 45-minute limit on Player A) | Real, analyst-entered | Possibly connector-fed |
| Capability observations | Synthetic | Real, analyst-written | Unchanged |
| Opponent observations | Bounded synthetic | Real, analyst-written | Possibly licensed data (Tier 3) |
| Public context | Real, dated snapshot | Real | Possibly live refresh |
| Medical detail | **Absent** | **Absent** | Tier 2 only, and only after a DPIA |
| Inference | Real provider call | Real provider call, pseudonymised payload | Possibly club-controlled |

The interface labels every data mode as `synthetic`, `snapshot` or `live`, and the same labelling carries into the pilot unchanged. An analyst looking at a briefing should never have to guess whether a number came from their club or from a demo fixture.

---

## 10. Acceptance criteria

| Criterion | Status | Where |
| --- | --- | --- |
| Data owners and access scope are named by the club | **Not met — requires a club.** The instrument to name them is complete and the scope is pre-defined per tier. | §2, §5 |
| No unsupported claim that open weights automatically establishes permission or compliance | Met. The distinction is stated first and the correct, narrower claim about open weights is identified. | §1, §7.6 |
| A practical least-data pilot path and its blockers are documented | Met. Tier 0 needs no medical data, no integration, and no new collection; six blockers are listed with owners. | §3 |
| Production requirements are separated from the hackathon prototype | Met. Side-by-side table plus full production requirements, with two carry-forward traps called out. | §4, §7 |

## 11. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- | --- |
| 1 | Name the club, the data owners and the approvers | Owner, then club | The criterion requires the club to name them. Filling §5 with plausible roles would fabricate authorisation. |
| 2 | Answer the eleven legal questions | Qualified data protection counsel | Requires jurisdiction-specific legal judgement. Q6 and Q9 in particular change the architecture. |
| 3 | Execute the processing agreement | Club legal + owner | A contract, not a document. |
| 4 | Obtain the six provider confirmations in §8.5 | Owner | Requires a commercial conversation with the provider. |
| 5 | Confirm third-party licences permit onward processing | Club | The club holds the contracts. |
| 6 | Decide the deployment model | Owner + club security | §7.6 gives the recommendation and the trade-offs; the club's security review decides. |
| 7 | Build the §7 controls | Engineering, after a club exists | Substantial work with no value until a pilot is agreed. |

---

*Sources: [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries), the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) and the [demo and submission runbook](https://linear.app/ewerton-barbosa/document/demo-and-submission-runbook-five-minutes-measurements-and-pilot-94f3b7353ba5), read 2026-09-22. Nothing in Linear was modified. Legal topics are identified for counsel, not answered.*
