# EWE-82 — Generalizing adapters to MCP and additional licensed systems

| | |
| --- | --- |
| Issue | [EWE-82 — \[Pilot\] Generalize adapters to MCP and additional licensed systems](https://linear.app/ewerton-barbosa/issue/EWE-82/pilot-generalize-adapters-to-mcp-and-additional-licensed-systems) |
| Label in Linear | `Squad Screen: pilot`, milestone 06, priority Low, no due date |
| Blocked by | [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) — there is no adapter contract to generalize until one real connector exists |
| Intended repo home | `docs/pilot/` per the issue's Files/ownership field. Not written to the repository by this agent. |

**What this document is.** The adapter contract that any additional source must satisfy, the architectural rule that keeps the reasoning layer source-agnostic and how to enforce it mechanically, an MCP integration design with its security model, the portability exit criteria, and the effort and ownership record.

**What this document is not.** It is not an integration layer, and building one now would be the exact mistake the issue names:

> *"Do not implement an abstract connector marketplace or dozens of agents before the initial workflow is validated."*

A generalization written before a single concrete case exists is a guess about which axis varies. The objective, in the issue's own words, is to *"expand the proven adapter contract without redesigning the reasoning layer"* — and nothing is proven yet.

---

## 1. Entry conditions

This issue does not start until all of the following are true. Recorded here because "we've got one connector, let's make it generic" is a decision that arrives with momentum and without scrutiny.

| # | Condition | Evidence required |
| --- | --- | --- |
| E1 | One real connector is in production use | [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) complete, running against a real authorised source |
| E2 | The workflow it feeds has been validated | [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) reached a continue decision |
| E3 | A specific club workflow needs a second source | Named workflow and named gap, from the analyst — not a roadmap item |
| E4 | Access to that second source is contractually available | Confirmed in writing per [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §5 |
| E5 | The first connector's mapping is stable | It has survived at least one upstream schema change |

E2 is the one most likely to be skipped, and skipping it inverts the project's logic. Adding sources to a workflow nobody has confirmed is valuable makes it more expensive to change, not more valuable.

E5 is the cheapest insurance available. An adapter contract generalized from a mapping that has never been perturbed will encode accidental properties of one export as though they were requirements.

---

## 2. The invariant

Everything in this document exists to preserve one property, which is also the issue's first acceptance criterion:

> **The reasoning layer and the interface consume any source without source-specific branching.**

A recommendation engine that knows which connector produced a piece of evidence has already failed. Once `if (source === 'club-export')` appears in synthesis, every new source multiplies the paths through the reasoning code, and the fifth connector costs more than the first four combined.

The prototype's architecture already provides the seam: evidence normalization produces `EvidenceItem` records, and synthesis consumes a `MatchContext` assembled from them. Everything a recommendation needs — the claim, its excerpt, its timestamps, its status, its origin, its conflicts — is on the item. **A new source is a new producer of the same records, not a new branch in the consumer.**

### 2.1 Enforcing it mechanically

Stated intentions do not survive a deadline. Three checks, all cheap, all automatable:

1. **Dependency direction, enforced by lint.** Modules under the reasoning and UI layers may not import anything from the adapter layer. A dependency rule in CI — restricted imports or a dependency-cruiser rule — makes the violation a build failure instead of a review comment.
2. **No connector identifiers outside the adapter layer.** A CI check greps for known `source.connector` and `origin_id` values in reasoning, scenario and component code. Any hit is a branch in disguise.
3. **The source-swap test.** Run one fixture end to end with source X, then again with source Y producing equivalent claims about the same subjects. Assert the pipeline produces structurally equivalent output and that no source-conditional path was taken. This catches the branching that the other two checks miss, because it tests behaviour rather than structure.

Check 3 is the one that generalizes test T18 from [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector), and it is the only one of the three that would notice a branch implemented through data rather than through code.

---

## 3. The adapter contract

What every source must implement. Derived from what the first connector actually needed, which is why it cannot be finalised before [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) exists — the shape below is the starting proposal, to be corrected against the real thing.

```
SourceAdapter
  id                    stable adapter identifier
  origin_id             the system of record this adapter draws from

  declares
    categories          which evidence categories it can produce
    subject_types       which entity types it makes claims about
    data_mode           snapshot | live
    permission_scope    what the club authorised this adapter to read
    freshness_window    per category, per EWE-80 §4.2

  fetch(fixture_binding, as_of)  -> RawRecord[] | AdapterError
  map(RawRecord)                 -> EvidenceItem[]
  health()                       -> ok | degraded | unavailable
```

### 3.1 Obligations

| # | Obligation | Why |
| --- | --- | --- |
| A1 | `map` is deterministic and side-effect free | Same input, same evidence IDs. Snapshots must be reproducible or the audit trail is fiction. |
| A2 | Every emitted item carries a real `source.excerpt` | The evidence drawer is the product's core claim |
| A3 | `origin_id` identifies the system of record, not the transport | Two adapters over one upstream system must not create false corroboration — [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §2.2 |
| A4 | Unknown timestamps stay unknown | Contract rule; substituting a fetch time makes stale data look fresh |
| A5 | Identity resolution goes through the shared map | Never name matching — [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §3 |
| A6 | Errors use the contract's structured shape | `{error:{code,message,retryable}}` — the pipeline must handle any adapter's failure identically |
| A7 | Declares its permission scope, enforced before fetch | A misconfigured adapter must fail closed rather than read what it can reach |
| A8 | No model call inside an adapter | Adapters are deterministic mappers. Extraction that needs a model is a separate, explicitly-labelled pipeline stage. |

### 3.2 Prohibitions

| # | Prohibition | Why |
| --- | --- | --- |
| P1 | No conflict resolution | Conflicts are the normalization layer's business. An adapter that picks a winner hides a disagreement the analyst needed to see. |
| P2 | No knowledge of other adapters | Cross-source logic belongs above the adapter layer |
| P3 | No numeric confidence | Contract-wide prohibition |
| P4 | No inferred values | Only what the source states |
| P5 | No source text treated as instructions | §5 |
| P6 | No writes to the source | §4.3 |
| P7 | No emission outside the declared permission scope | Even if the payload contains it. Out-of-scope fields are dropped at parse and the drop is counted. |

---

## 4. MCP integration

### 4.1 The architectural question that has to be settled first

MCP can occupy two quite different positions here, and the difference is not stylistic.

| | **A — MCP as an ingestion transport** | **B — MCP as model-callable tools** |
| --- | --- | --- |
| Who calls the tool | Our adapter code, deterministically, before synthesis | The model, during synthesis, as it decides |
| When | Snapshot construction | Mid-generation |
| Provenance | Every record mapped to an `EvidenceItem` with excerpt and origin before any model sees it | Whatever the model reports having seen |
| Snapshot reproducibility | Preserved | Lost — two runs may fetch differently |
| Scenario immutability | Preserved | **Broken** |
| Injection exposure | Contained: tool output is data, and cannot trigger further fetches | A tool result can steer the next tool call |

**Take A.** Not as a preference but because B contradicts requirements already fixed in the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91): a what-if must *"reuse the fixed evidence snapshot; do not repeat search/extraction"*, evidence snapshots must be stable across a rerun, and descriptive metrics must be computed in code from bounded samples. A model that fetches during synthesis cannot satisfy any of the three.

This is worth writing down now because B is the more fashionable reading of "add MCP", and the request will arrive phrased that way. Under position A, MCP is a way to talk to systems that already speak it, and the adapter contract in §3 is unchanged: an MCP-backed adapter is an adapter whose `fetch` happens to speak MCP.

### 4.2 Tool surface

For an MCP server we control or configure:

- **Read-only, narrow tools**, one per entity type: `list_<entity>(fixture_binding, as_of)` and `get_<entity>(record_id)`. Nothing that reads "do" something.
- **Bounded parameters.** Identifiers and enums, not free-form query strings. A tool that accepts arbitrary query text is a tool that can be steered somewhere it should not go.
- **No composite or convenience tools.** One tool, one record type. Composition happens in our code, where it can be audited.
- **Explicit `as_of`.** Snapshot semantics require a point in time; a tool returning "current" makes reproducibility impossible.

### 4.3 Security model

| Control | Requirement |
| --- | --- | --- |
| Read-only enforcement | Structural, not conventional. No write tool is registered, and the credential the server holds is itself read-only. Two independent layers, because one of them will be misconfigured eventually. |
| Credential isolation | One credential per source, held server-side, never in the model context, never in a tool argument, never logged. A compromised adapter reaches one source. |
| Permission scope | Declared per adapter (§3.1 A7) and checked before the call, not after. The scope is the club's authorisation from [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §5, expressed in code. |
| Server pinning | Pin the MCP server version and its tool schemas. A tool schema change is handled exactly like an export schema change — fail loudly, keep the previous snapshot, per [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §4.4. |
| Subprocessor status | **An MCP server in the data path is a third party processing club data.** It belongs in the club's Article 28 sub-processor list, and adding one is a contractual event, not a configuration change — [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §6 Q3. |
| Audit | Every call logged: server identity, tool, parameter digest, result digest, duration, outcome. Digests rather than payloads, so the audit log does not become a second copy of the data. |
| Egress | Explicit allowlist of MCP endpoints. A configured server address is not a reason to reach it. |
| Failure | Maps to the contract's structured error. The rest of the pipeline cannot tell an MCP failure from a file-read failure, and should not need to. |

### 4.4 What MCP does and does not buy

**Does:** a uniform way to reach systems that already expose an MCP server, with less bespoke transport code per source.

**Does not:** provenance, permission, freshness semantics, identity resolution or conflict handling. Every one of those is the adapter's job whatever the transport, and a tool result arriving over a standard protocol is exactly as unverified as a CSV row.

The failure mode to avoid is treating MCP as the integration story rather than as one transport among several. A club export dropped in a folder is a perfectly good source and needs no protocol at all.

---

## 5. Untrusted content

The technical contract already requires that *"source text is untrusted data, never instructions."* Extending to third-party and vendor sources raises the stakes, because content arriving from outside the club is more plausibly adversarial than the analyst's own notes — a scouting report, a public page, a vendor's free-text field.

| # | Control | Note |
| --- | --- | --- |
| I1 | Source content never enters the instruction channel | Structurally delimited as data, always |
| I2 | The model sees normalized `EvidenceItem` fields, not raw responses | Mapping happens before synthesis, in code |
| I3 | Claims must cite evidence IDs that exist and are validated | Injected text cannot manufacture a valid evidence ID |
| I4 | Constraints are enforced in code after generation | No source content can lift a minutes limit or make an unavailable player available |
| I5 | Suspicious patterns in source text are logged and counted | Not blocked — a scout writing "ignore the above" is far likelier than an attack, and silent dropping loses evidence |
| I6 | No source content reaches an outbound public query | Extends the contract's existing rule that public queries carry public terms only |

**Position A in §4.1 is itself the strongest control here.** Because the model cannot call tools, injected text has nothing to actuate: it cannot trigger a fetch, cannot reach a different source, and cannot exfiltrate. It can at most influence the wording of a recommendation whose factual claims still have to cite validated evidence. Adopting B would give that up, and it is the main reason the choice is architectural rather than aesthetic.

---

## 6. Choosing the second source

Workflow-driven, never catalogue-driven. The deliverable requires identifying *"actual club workflows requiring additional systems"* before confirming access.

```
Workflow that is currently blocked or manual:
Named person who described it:                    Date:
What they do today instead:
Which decision it changes:
System that holds the missing data:
Rung on the EWE-80 ladder:                        0 / 1 / 2 / 3 / 4
Licence permits onward processing:                yes / no / unclear
Named approver:                                   Date confirmed:
New categories this introduces (EWE-79 §2.1):
New data tier this implies:
Estimated integration effort:
Who maintains it:
```

If the first three lines cannot be filled from something an analyst actually said, the source is a roadmap item and not a requirement.

Two rules carried forward from [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) and worth repeating because this is the issue where they are most likely to be bent:

- **Vendor branding does not imply access.** A recognisable name in an architecture diagram is not an integration. No Catapult, Kitman, Hudl or Wyscout adapter exists or may be simulated.
- **Prefer the lowest rung the club will approve.** The second source should also start at a club-controlled export unless the workflow genuinely needs otherwise.

---

## 7. Portability proof

The deliverable asks for *"one additional connector as the portability proof before expanding the catalog."* One. The purpose is to test the contract, not to grow coverage — and the test only means something if the second source is meaningfully different from the first. A second CSV export in the same shape proves nothing; an MCP-backed or API-backed source with different identity semantics does.

**Exit criteria — all must hold before any third source is considered:**

| # | Criterion | How it is checked |
| --- | --- | --- |
| X1 | No source-specific branching in reasoning or UI | The three checks in §2.1, in CI |
| X2 | The second adapter passes the shared conformance suite unmodified | The generalized [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §5 matrix, run per adapter |
| X3 | Source-swap test passes | §2.1 check 3 |
| X4 | Provenance survives | Excerpt, origin, timestamps and data mode intact end to end |
| X5 | Conflicts across the two sources surface rather than resolve silently | The most valuable new behaviour two sources unlock |
| X6 | Failure of either source degrades gracefully | Prior snapshot usable, warning visible, no silent empty result |
| X7 | Access is authorised and documented | [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §5, in writing |
| X8 | Integration effort and operational ownership recorded | §8 |
| X9 | The contract changes made to accommodate source two are documented | If the contract had to change, say how — that is the actual finding |

X5 is the one that justifies the whole exercise. A single source cannot disagree with itself. The moment there are two, the conflict machinery in [EWE-64](https://linear.app/ewerton-barbosa/issue/EWE-64/evidence-normalize-sources-and-expose-freshness-conflicts-and-lineage) is exercised for real, and whether disagreement stays visible to the analyst is the thing to watch.

X9 is the honest one. If adding source two required contract changes, the contract was not as general as it looked, and recording exactly what broke is more useful to source three than a clean pass would have been.

---

## 8. Effort and operational ownership

Required by the acceptance criterion *"Integration effort and operational ownership are recorded."* Empty, because no second source exists.

| Step | Our hours | Club hours | Calendar days | Reusable from source one? |
| --- | --- | --- | --- | --- |
| Identify the workflow need | | | | |
| Confirm licence and authorisation | | | | |
| Obtain a sample or endpoint access | | | | |
| Implement fetch | | | | |
| Implement map | | | | |
| Extend the identity map | | | | |
| Pass the conformance suite | | | | |
| Source-swap and conflict tests | | | | |
| Security review | | | | |
| **Totals** | | | | |

The "reusable" column is the actual output. Compared against the same table from [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §6, it answers the only question that matters commercially: **does the second connector cost meaningfully less than the first?** If it does not, the adapter contract has not generalized, whatever the code looks like.

**Operational ownership, per source** — agreed before go-live, not after the first outage:

| | Source 1 | Source 2 |
| --- | --- | --- |
| Who monitors availability | | |
| Who is notified on failure, and how fast | | |
| Who fixes a schema change | | |
| Response time obligation | | |
| Who pays access costs | | |
| Review cadence | | |

Each connector is a standing obligation to a system somebody else controls. Two connectors is two of those, and the operational cost is the part of the integration story that is consistently underestimated.

---

## 9. Boundaries

The issue's boundary is *"do not implement an abstract connector marketplace or dozens of agents before the initial workflow is validated."* Concretely, out of scope:

- A plugin or marketplace architecture, a connector registry, or dynamic adapter discovery.
- A connector SDK published for third parties. Notes for ourselves are the deliverable; a supported SDK is a product with its own support burden.
- Per-source agents. There is one reasoning pipeline. Adapters are deterministic mappers, and a per-source agent would reintroduce exactly the source-specific reasoning §2 exists to prevent.
- Model-callable tool use during synthesis — position B in §4.1.
- Write access to any club system.
- Any adapter for a system we have not been authorised to read.
- More than one additional connector before the §7 exit criteria pass.

---

## 10. Acceptance criteria

| Criterion | Status | Where |
| --- | --- | --- |
| Reasoning and UI consume the added source without source-specific branching | Specified with three mechanical enforcement checks. Unverifiable until a second source exists. | §2 |
| Source access and usage are authorized and documented | **Not met — no source, no authorisation.** The selection and approval record is ready. | §6, and [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) §5 |
| Connector contract checks cover provenance, missing data and failures | Specified. The [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) §5 matrix generalizes to a per-adapter conformance suite, plus source-swap and cross-source conflict tests. | §2.1, §7 |
| Integration effort and operational ownership are recorded | Structure defined, values empty. The reusable-work column is the real output. | §8 |
| *Boundary:* no connector marketplace, no per-source agents | Respected. Nothing built; scope explicitly bounded. | §9 |

## 11. Blocked on a human

| # | Item | Who | Why it cannot be done here |
| --- | --- | --- |
| 1 | A first connector in real use | [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) | There is nothing to generalize from. Entry condition E1. |
| 2 | A validated workflow | [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) | Entry condition E2 |
| 3 | A named workflow gap requiring a second source | Club analyst | Entry condition E3. A source chosen without one is a guess. |
| 4 | Authorisation and licence confirmation for that source | Club | Entry condition E4 |
| 5 | Sub-processor agreement covering any MCP server in the path | Club legal + owner | §4.3 — a contractual event |
| 6 | Ratify the position-A decision in §4.1 | Owner / architecture | It constrains what "add MCP" can mean, and the request will usually arrive phrased as position B |

---

*Sources: [EWE-82](https://linear.app/ewerton-barbosa/issue/EWE-82/pilot-generalize-adapters-to-mcp-and-additional-licensed-systems) and the [technical contract](https://linear.app/ewerton-barbosa/document/technical-contract-data-apis-ownership-and-acceptance-gates-02f9a3812a91), read 2026-09-22. Nothing in Linear was modified. No adapter layer, MCP integration or vendor connector was built.*
