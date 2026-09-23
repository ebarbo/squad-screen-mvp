# EWE-80 — One approved club export or source connector

| | |
| --- | --- |
| Issue | [EWE-80 — \[Pilot\] Implement one approved club export or source connector](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) |
| Label in Linear | `Squad Screen: pilot`, milestone 06, priority Low, no due date |
| Blocked by | [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) (club authorisation), [EWE-64](https://linear.app/ewerton-barbosa/issue/EWE-64/evidence-normalize-sources-and-expose-freshness-conflicts-and-lineage) (the evidence normalisation layer this maps into) |
| Blocks | [EWE-82](https://linear.app/ewerton-barbosa/issue/EWE-82/pilot-generalize-adapters-to-mcp-and-additional-licensed-systems) |
| Intended repo home | `docs/pilot/` per the issue's Files/ownership field. Not written to the repository by this agent. |

**What this document is.** The connector specification: how to choose the simplest authorised path, the field-by-field mapping into the evidence contract, identity resolution rules, failure and lifecycle semantics, the contract test matrix, and the templates for recording onboarding effort and commercial dependencies.

**What this document is not.** It is not a connector, and no connector will be written until a club authorises a real source. The issue is unambiguous about the reason:

> *"Vendor branding does not imply access. Do not create fake Catapult, Kitman, Hudl or Wyscout integrations."*

Writing a plausible-looking adapter against a guessed export format would produce a demo artefact that cannot be distinguished from a working integration, which is precisely the thing the acceptance criteria are constructed to prevent. The specification below is written to be implementable in a short sitting *once a real sample file exists* — which is the correct place for the effort to land.

---

## 1. Choosing the source — a ladder, not a shopping list

The deliverable asks for *"the simplest authorized export/API path; prefer a club-controlled export where appropriate."* The ladder below is ordered by how quickly a club can say yes, not by how impressive the integration sounds. Start at the top and stop at the first rung the club will actually approve.

| Rung | Path | Club effort | Our effort | Security review | Take it when |
| --- | --- | --- | --- | --- | --- |
| **0** | Analyst enters the data in the product | None | None — already built | Minimal | Always the pilot default. See Tier 0 in [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries). **A connector is only worth building once manual entry has proven annoying.** |
| **1** | Club exports a file by hand and uploads it | Minutes per fixture | Small — one parser | Light | The analyst is already maintaining this data in a spreadsheet or club system |
| **2** | Club drops a scheduled export into storage we can read | One-off IT setup | Small — parser plus polling | Moderate — credentials, transport | Manual upload is reliable but tedious, and the club has a system that can export on a schedule |
| **3** | Read-only API access with club-issued credentials, against a club-controlled system | Moderate IT setup | Moderate — auth, pagination, rate limits | Substantial | The data changes often enough that a scheduled file is stale by kickoff |
| **4** | Third-party vendor API under the club's licence | Licence review, possible renegotiation | Largest | Substantial, plus the vendor's own | Only when the workflow demonstrably needs data only that vendor holds |

### 1.1 Why rung 1 or 2 is the right target

- **A file is inspectable.** A club security reviewer can open the export and see exactly what leaves. That is worth more in the approval conversation than any architecture diagram.
- **The club stays in control of what it sends.** They choose the columns. Nothing is pulled that they did not put in.
- **Failure is visible.** A file that did not arrive is obviously absent. A silently-degraded API sync is not.
- **It costs the club almost nothing to stop.** Which is exactly what makes it easy to start.

Rung 4 is where the named vendors live, and it is the rung most likely to be suggested in a meeting because everyone recognises the names. It is also the rung where access is a contractual question rather than a technical one, and where the issue's prohibition bites hardest. **The correct thing to say about a vendor integration we have not built is that we have not built it.**

### 1.2 Selection record

Filled in with the club before any implementation. An unfilled row means the connector is not ready to build.

```
Source system:
Rung selected:                    0 / 1 / 2 / 3 / 4
Why not the rung above:
Data categories in scope:         (C1–C10 from EWE-79 §2.1)
Named approver:                                    Date:
Third-party licence involved:     yes / no
  If yes — vendor:
  Onward-processing permitted:    yes / no / unclear → blocked pending §7
Sample file or endpoint received: yes / no          Date:
Transport and credential model:
Refresh cadence agreed:
Point of contact for schema changes:
```

---

## 2. Mapping into the evidence contract

The [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91) already fixes the shape of an `EvidenceItem`, and a connector's entire job is to produce conforming items **without losing provenance on the way**. The acceptance criterion is exact: *"A real approved sample maps without silently discarding provenance or conflicts."*

### 2.1 Field-by-field

Assuming a rung-1 or rung-2 export carrying availability and constraints — the Tier 0 dataset.

| Contract field | Source of the value | Rule |
| --- | --- | --- |
| `id` | Generated | Deterministic from `origin_id` + source record key + field, so the same export re-read yields the same evidence IDs rather than duplicates |
| `fixture_id` | Connector configuration | The export is unlikely to know about our fixture. Bound at ingestion from the configured fixture. Never guessed from a date. |
| `subject_type` | Fixed per row type | `player` for availability and constraints |
| `subject_id` | **Resolved**, never copied | Through the identity map in §3. An unresolved reference is a failure, not a passthrough. |
| `category` | Fixed per column | `availability`, `participation_constraint`, `capability_observation` |
| `claim` | Rendered from the row | A short human-readable sentence, generated from the mapping and not from free text in the file |
| `value` | Typed from the column | `availability` → the three-value enum. `max_minutes` → integer or null. Never a string passed through unparsed. |
| `source.name` | Connector configuration | The club's own name for the system, as the club states it |
| `source.connector` | Connector identifier | Stable string identifying which adapter produced this |
| `source.record_id` | The export's own row key | Required. If the export has no stable row key, that is a schema blocker — see §3.3. |
| `source.url` | Usually absent | Only for rungs 3–4 where a record has an addressable URL |
| `source.excerpt` | The raw row, verbatim | **The exact source content, not a reformatting of it.** This is what the evidence drawer shows, and it is what makes a claim checkable. |
| `source.origin_id` | Configuration | Identifies the underlying system of record. See §2.2 — this field is doing more work than it appears to. |
| `observed_at` | The export's own observation timestamp | If the export does not carry one, it stays unknown. **Do not substitute the file's modification time for the moment a human observed the fact.** |
| `published_at` | Export generation time, when known | Otherwise absent |
| `retrieved_at` | Ingestion time | Always set by us |
| `valid_for_fixture` | Computed | Whether the observation falls inside the fixture's validity window per §4.2 |
| `data_mode` | `snapshot` or `live` | A club export read on a schedule is `snapshot`. It becomes `live` only if genuinely fetched at request time. Never `synthetic`. |
| `status` | Computed by the normalisation layer | `accepted` after checks pass, or `disputed` / `stale` / `missing` / `unverified` per the rules in [EWE-64](https://linear.app/ewerton-barbosa/issue/EWE-64/evidence-normalize-sources-and-expose-freshness-conflicts-and-lineage) |
| `conflicts_with` | Computed | Populated when another item makes an incompatible claim about the same subject and category |
| `check_notes` | Computed | The concise result of whichever rule set the status. A status with no note is a bug. |

Three of these rows carry most of the risk, and all three fail quietly rather than loudly:

- **`observed_at`.** Filling an unknown timestamp with a file date makes stale data look fresh, and staleness detection is one of the few automated safety properties the system has. The contract's rule — *"Unknown timestamps stay unknown"* — exists for this.
- **`source.excerpt`.** A tidied-up excerpt defeats the purpose of the evidence drawer. The analyst is supposed to be able to check the claim against what the source actually said.
- **`data_mode`.** A cached export labelled `live` is a false statement to the user about how current their information is.

### 2.2 `origin_id` and the double-counting problem

`origin_id` identifies the underlying system a fact ultimately came from, and the reason it exists is that two records saying the same thing are only reassuring if they are *independent*.

A club export is a rich source of false independence. The same availability judgement may arrive as a row in a weekly squad-status export and again in a team-sheet export, because both are generated from one upstream system. Two rows, one origin, zero additional corroboration.

Rules:

1. `origin_id` identifies the **system of record**, not the file, the endpoint or the export job.
2. Two exports derived from one upstream system share an `origin_id`, even when their formats differ entirely.
3. Where an export aggregates several upstream systems, `origin_id` must be resolved per row. If the export does not say where a row came from, the honest value is a single origin for the whole file, and that should be recorded as a known limitation rather than guessed per row.
4. The analyst's own manual entry is a **distinct** origin from a club system, even when the analyst is reading off that system. It is a separate human judgement and may legitimately disagree.
5. Rule 4 is what makes the conflict path work: manual entry disagreeing with an export is exactly the disagreement the evidence layer should surface rather than resolve.

The club has to answer one question for this to be right: *"if two of these rows say the same thing, are they two people's observations or one system's record copied twice?"*

### 2.3 What a connector must never do

- Emit an `EvidenceItem` without a real `source.excerpt`.
- Resolve a conflict by picking a winner. Conflicts stay visible unless a documented freshness or authority rule resolves them, and the rule is recorded in `check_notes`.
- Attach a numeric confidence to anything. Forbidden by the contract, everywhere.
- Infer a value not present in the source — including deriving a return date from an absence, or a capability from a statistic.
- Treat source text as instructions. Export free-text fields are untrusted data and reach the model inside a data boundary, never as part of the instruction.
- Emit medical detail. If a club export carries a diagnosis column, the connector **drops it at parse time and does not store it**, because [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) Tier 0 has no field for it. Dropping is deliberate, logged as a count, and mentioned to the club — a column that keeps appearing is a sign the club expects the product to use it.

---

## 3. Identity resolution

The contract states it directly: *"player names alone are not join keys."* This is the part of a club connector that most reliably goes wrong, because names in football data are genuinely unstable — diacritics, initials, "Jr", nicknames, transliteration, two players sharing a surname.

### 3.1 The mapping table

A club-owned mapping from the export's own player reference to our stable internal ID, established once at onboarding.

```
club_ref        internal_id   shirt   position   created_at   retired_at
CLB-00412       P07           7       LW         ...          null
```

- The club's reference is whatever their system uses, and it is authoritative.
- The internal ID is pseudonymous and is the only identifier that leaves the club boundary.
- The mapping is versioned. A shirt number change is not an identity change; a new registration is.
- `retired_at` handles departures without deleting history, subject to the erasure design in [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §7.5.

### 3.2 Unresolved references

An export row whose `club_ref` is not in the mapping is a **failure, not a guess**:

1. No evidence item is created from it.
2. A `missing` item records that a row was seen and could not be resolved — the fact of the gap is itself evidence, and hiding it makes the briefing look more complete than it is.
3. A warning propagates to the run and is visible in the interface.
4. Ingestion continues for the remaining rows. One unknown player does not discard the export.
5. Fuzzy name matching is not attempted. A wrong player attached to an availability change is worse than an obvious gap, and it is the kind of error that reaches a coach before anyone notices.

### 3.3 Schema requirements the export must meet

| Requirement | If absent |
| --- | --- |
| A stable per-row key | **Blocker.** Without it, re-reads duplicate and updates cannot be detected. Ask the club to add one; most systems have one already. |
| A stable player reference | **Blocker.** §3.1 is impossible without it. |
| An observation timestamp | Not a blocker. `observed_at` stays unknown and freshness checks degrade accordingly — recorded as a limitation. |
| Explicit availability values | Not a blocker, but the value mapping in §3.4 must be agreed in writing rather than inferred. |

### 3.4 Value mapping

Club vocabularies will not match the three-value enum. The mapping is agreed with the club and recorded, and anything unmapped fails loudly.

```
club value            → contract value      agreed by          date
"Fit"                 → available
"Full training"       → available
"Modified training"   → monitor
"Unavailable"         → unavailable
<anything else>       → PARSE ERROR — do not guess, surface for mapping
```

The instinct to map an unrecognised value to `monitor` because it is the cautious middle should be resisted. `monitor` is a specific claim about a specific player, and inventing it is inventing evidence.

---

## 4. Lifecycle semantics

The deliverable requires defined behaviour for *"failure, deletion, stale-data and changed-schema."*

### 4.1 Source unavailable

- Return the contract's structured error shape, `{error:{code,message,retryable}}`, with a `source_unavailable` code. Retryable where the cause is transient.
- **The previous snapshot remains usable.** A briefing built on the last good snapshot, clearly labelled with its age, is better than no briefing — this is the same rule the stretch public-refresh work follows.
- A visible warning states which source failed, when it last succeeded, and that the data shown predates the failure.
- Never substitute an empty result for a failed fetch. Zero availability records and an unreachable source are different facts, and conflating them is the "silent canned success" the contract forbids.

### 4.2 Staleness

Freshness thresholds are per category and defined relative to kickoff, not to wall-clock age:

| Category | Suggested window | Rationale |
| --- | --- | --- |
| Availability | Observed within the fixture's preparation window, agreed with the club | Availability from ten days out is close to worthless; from the morning of MD-1 it is current |
| Participation constraints | Same window | Follows availability |
| Capability observations | Longer, season-scoped | A player's foot preference does not go stale in a week |
| Public context | Per the existing snapshot rules | Already specified for the prototype |

Beyond its window an item is `stale` rather than dropped, with `check_notes` recording the window and the actual age. Stale evidence stays visible and stays inspectable; the model is told it is stale.

### 4.3 Deletion at source

- A row that disappears from an export is **not** implicitly deleted. Absence has too many causes — a filter changed, a job partially ran, a player moved squads.
- A disappearance is surfaced as an explicit change with the previous value retained, and it does not silently alter a recommendation's basis.
- Genuine erasure is a separate, authorised path, not an inferred one, and it must reach snapshots and run history per [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §7.5.
- **Evidence snapshots remain immutable.** A snapshot is a record of what was known when a briefing was produced, and retro-editing it would make every past briefing unauditable. Erasure obligations interact badly with this and need the answer from [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §6 Q6.

### 4.4 Schema change

- The mapping is **versioned and pinned**. The connector declares the columns it requires and their types.
- A missing required column fails the ingest loudly and keeps the previous snapshot. It does not skip the column and carry on.
- An added unknown column is ignored, but the fact is logged and counted — clubs add columns when they expect them to be used.
- A changed type or an unmapped enum value fails per §3.4.
- A named point of contact for schema changes is part of the §1.2 selection record, because in practice a club export changes when someone in IT edits a report, with no notice to anyone.

---

## 5. Contract test matrix

Written now so that implementation is a matter of filling in a real sample. Every test runs against a fixture file derived from the club's actual export once one exists; none of them require the club's live system.

| # | Test | Expected |
| --- | --- | --- |
| T1 | Valid sample ingests | Every row becomes an `EvidenceItem` conforming to the schema |
| T2 | Every item has a non-empty `source.excerpt` | Pass, for all items |
| T3 | Re-reading the same file | Identical evidence IDs; no duplicates |
| T4 | Two exports from one upstream system | Shared `origin_id`; corroboration count does not increase |
| T5 | Unknown `club_ref` | No fabricated player; a `missing` item; a run warning; other rows still ingest |
| T6 | Unmapped availability value | Parse error surfaced; no default applied |
| T7 | Missing required column | Loud failure; previous snapshot retained |
| T8 | Unknown extra column | Ignored, logged, counted |
| T9 | Absent observation timestamp | `observed_at` unknown; not substituted with the file time |
| T10 | Observation outside the freshness window | `stale`, with the window and age in `check_notes` |
| T11 | Export contradicts analyst manual entry | Both retained; `conflicts_with` populated both ways; neither silently wins |
| T12 | Source unreachable | Structured `source_unavailable` error; prior snapshot usable; warning visible |
| T13 | Row disappears between reads | Explicit change; previous value retained; no silent deletion |
| T14 | Free text containing instruction-like content | Treated as data; does not alter model behaviour |
| T15 | Diagnosis-like column present | Dropped at parse; count logged; never stored |
| T16 | Player name present in the export | Not emitted past the boundary; only the pseudonymous ID leaves |
| T17 | Permission scope respected | A dataset outside the authorised scope is refused even if present in the file |
| T18 | Connector output through the full pipeline | Evidence normalisation, generation and scenario rerun all work **without source-specific branching** |

T18 is the one that matters for [EWE-82](https://linear.app/ewerton-barbosa/issue/EWE-82/pilot-generalize-adapters-to-mcp-and-additional-licensed-systems). If the reasoning layer has to know that this evidence came from a club export, the adapter contract has failed and generalising it will multiply the failure.

T14 also deserves emphasis: a club export free-text field is an untrusted input path straight into a prompt, and the contract's rule that source text is never instructions applies to club data exactly as it does to public sources.

---

## 6. Onboarding effort — the record to keep

The deliverable requires measuring onboarding effort, and this number is the single most valuable commercial output of the first connector. It converts the onboarding-fee hypothesis in [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) §5.5 from a guess into an observation, and it is the input to knowing whether the business scales.

Record actual elapsed time and actual calendar time separately. Calendar time is usually the thing that kills a deal.

| Step | Our hours | Club hours | Calendar days | Notes |
| --- | --- | --- | --- | --- |
| Identify the source and its owner | | | | |
| Obtain authorisation (EWE-79 §5) | | | | Usually the longest calendar item |
| Receive a sample file | | | | |
| Agree the value mapping (§3.4) | | | | |
| Build the identity map (§3.1) | | | | |
| Implement the parser and mapping | | | | |
| Pass the §5 test matrix | | | | |
| Security review | | | | |
| First successful production ingest | | | | |
| **Totals** | | | | |

Also record, because these determine whether club two is cheaper than club one:

- Which steps were **club-specific** versus reusable. Reusable steps are product; club-specific steps are services, and a business made of services scales differently.
- How much of the delay was waiting rather than working.
- What surprised us. The second club's estimate is only as good as this list.

All cells are empty. There is no source, so there is no measurement, and filling them with estimates would produce a number that later gets quoted as if it were observed.

---

## 7. Commercial dependencies

Recorded for pilot economics, per the acceptance criterion *"Connection costs and maintenance obligations are recorded."*

| Dependency | Question | Status |
| --- | --- | --- |
| Source licence | Does the club's licence permit a supplier to process this data on its behalf? | Unknown — club holds the contract |
| API or export fees | Does the club pay per call, per seat or per export? | Unknown |
| Who bears the cost | Club's existing licence, or a new cost in our base? | Unknown |
| Rate limits | Do they constrain the refresh cadence the workflow needs? | Unknown |
| Vendor stability | How often has this export or API changed in the last year? | Unknown — ask the club, they will know |
| Maintenance obligation | Who fixes it when the schema changes, within what response time? | Undefined — must be in the pilot agreement |
| Per-club marginal cost | Hosting plus inference (inference cost pending [EWE-73](https://linear.app/ewerton-barbosa/issue/EWE-73/eval-run-the-controlled-comparison-and-publish-observed-results)) | Unknown |

The maintenance row is the one that gets skipped and later hurts. A connector is a permanent obligation to someone else's schema, and the pilot agreement should name who is responsible and how fast, before the first schema change rather than during it.

---

## 8. Acceptance criteria

| Criterion | Status | Where |
| --- | --- | --- |
| Club confirms access and allowed processing for this source | **Not met — requires a club.** The selection and authorisation record is ready to fill. | §1.2, and [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §5 |
| A real approved sample maps without silently discarding provenance or conflicts | **Not met — no sample exists.** The mapping preserving excerpt, origin, timestamps and conflicts is fully specified and testable by T1–T4 and T11. | §2, §5 |
| Permissions and freshness are testable | Met as specification. T10, T12 and T17 are the tests; they need a sample to run against. | §4.2, §5 |
| Connection costs and maintenance obligations are recorded for pilot economics | Structure met, values empty. Deliberately not estimated. | §6, §7 |
| *Boundary:* no fake vendor integrations | **Respected.** No connector code written; no vendor format guessed; no integration implied. | throughout |

## 9. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- | --- |
| 1 | A club that authorises a source | Owner, then club | [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) must complete first |
| 2 | A real sample export | Club | The mapping in §2 is written against contract fields; column names, value vocabulary and row keys are unknowable without the file |
| 3 | Agree the value mapping in §3.4 | Club analyst | Their vocabulary, their meanings |
| 4 | Confirm the licence permits onward processing | Club | They hold the contract |
| 5 | Name the schema-change contact and response obligation | Club + owner | A contractual term |
| 6 | Implement and run the test matrix | Engineering, after 1–3 | Everything upstream is specified; the work is small once a real file exists |

**Not blocked, and worth noting:** [EWE-64](https://linear.app/ewerton-barbosa/issue/EWE-64/evidence-normalize-sources-and-expose-freshness-conflicts-and-lineage) is the other blocker on this issue, and it is being built for the hackathon. When it lands, the normalisation layer this connector targets will exist, and §2's mapping should be re-checked against the implemented `EvidenceItem` rather than against the contract document alone — the contract is the specification, but the shipped types are what a connector actually compiles against.

---

*Sources: [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) and the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91), read 2026-09-22. Nothing in Linear was modified. No connector code was written and no vendor integration exists.*
