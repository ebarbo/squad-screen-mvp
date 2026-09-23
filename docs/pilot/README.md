# Squad Screen — pilot track deliverables

Discovery and validation documents for the pilot track of [Squad Screen — Match Intelligence MVP](https://linear.app/ewerton-barbosa/project/squad-screen-match-intelligence-mvp-ea524d430d2c/overview) (`P-EWE-2`). One file per Linear issue.

These are deliverables, not application code. The [`ebarbo/squad-screen-mvp`](https://github.com/ebarbo/squad-screen-mvp) repository is owned by a different agent and was not touched. Nothing in Linear was modified.

## Contents

| Issue | Document | Linear label | Status |
| --- | --- | --- | --- |
| [EWE-74](https://linear.app/ewerton-barbosa/issue/EWE-74/product-establish-named-customer-problem-evidence-and-four-fixture) | [Named customer, problem evidence and four-fixture pilot](./ewe-74-customer-problem-and-four-fixture-pilot.md) | `core` | Todo, unblocked, due 2026-09-23 |
| [EWE-79](https://linear.app/ewerton-barbosa/issue/EWE-79/pilot-design-approved-club-data-access-and-production-boundaries) | [Club-data access and production boundaries](./ewe-79-club-data-access-and-production-boundaries.md) | `pilot` | Backlog, blocked by EWE-74 |
| [EWE-80](https://linear.app/ewerton-barbosa/issue/EWE-80/pilot-implement-one-approved-club-export-or-source-connector) | [Approved club export or source connector](./ewe-80-approved-club-source-connector.md) | `pilot` | Backlog, blocked by EWE-79 and EWE-64 |
| [EWE-81](https://linear.app/ewerton-barbosa/issue/EWE-81/pilot-capture-analyst-feedback-and-evaluate-the-four-fixture-workflow) | [Analyst feedback and four-fixture evaluation](./ewe-81-analyst-feedback-and-four-fixture-evaluation.md) | `pilot` | Backlog, blocked by EWE-74, EWE-72 and EWE-79 |
| [EWE-82](https://linear.app/ewerton-barbosa/issue/EWE-82/pilot-generalize-adapters-to-mcp-and-additional-licensed-systems) | [MCP and additional connector generalization](./ewe-82-mcp-and-additional-connector-generalization.md) | `pilot` | Backlog, blocked by EWE-80 |

**Label note.** Exactly four issues carry `Squad Screen: pilot` — EWE-79, EWE-80, EWE-81 and EWE-82. EWE-74 carries `Squad Screen: core`, sits in milestone 04 rather than 06, and is due with the hackathon. It is covered here because it is the unblocked root that EWE-79 and EWE-81 both depend on, and because its own deliverable is the pilot specification the other three build on.

## Dependency order

```
EWE-74 ──┬── EWE-79 ──┬── EWE-80 ── EWE-82
         │            └── EWE-81  (also needs EWE-72)
         └────────────────┘
```

EWE-74 is the only one of the five that can be completed without a club. Everything below it needs a real counterparty.

## What is deliverable now, and what is not

Each document delivers the instrument, framework or specification its issue calls for, and each ends with an explicit list of what requires a human. Nothing is estimated, simulated or filled in with plausible values: there is no customer, no club authorisation, no source sample, and no pilot data, so those tables read `Not measured` or stay blank by design. Every issue in this track has at least one acceptance criterion that can only be satisfied by a named club.

## Consolidated human blockers

In the order they unblock work.

| # | Blocker | Who | Unlocks |
| --- | --- | --- | --- |
| 1 | Select and name the target club and individual | Owner | Everything |
| 2 | Authorise and run the three discovery questions in EWE-74 §4.2 | Owner | EWE-74 validation status |
| 3 | Resolve the event's named-customer expectation | Owner / mentor | EWE-75 submission packet — **needed before 2026-09-23** |
| 4 | Confirm the pilot decision thresholds in EWE-74 §5.4 | Owner, with the buyer | EWE-81 |
| 5 | Club names its data owners and approvers | Club | EWE-79, EWE-80 |
| 6 | Answer the eleven legal questions in EWE-79 §6 | Qualified counsel | EWE-79; two of them change the architecture |
| 7 | Provider confirmations in EWE-79 §8.5 | Owner | Any real data |
| 8 | A real sample export | Club | EWE-80 |
| 9 | Durable run and snapshot storage | Engineering | EWE-81 — the in-memory store cannot link feedback to a snapshot |

Item 3 is the only one on the hackathon clock. The rest are post-hackathon.

## Related

- [`../squad-screen-mvp-plan.md`](../squad-screen-mvp-plan.md) — implementation plan for the core build
- [`../squad-screen-mvp-parallel-slices.md`](../squad-screen-mvp-parallel-slices.md) — slice assignments for the core build

## Repository

One file from this track is in [`ebarbo/squad-screen-mvp`](https://github.com/ebarbo/squad-screen-mvp): the EWE-74 distillation at [`docs/demo/customer-and-pilot.md`](https://github.com/ebarbo/squad-screen-mvp/blob/feat/ewe-74-customer-and-pilot/docs/demo/customer-and-pilot.md), on branch `feat/ewe-74-customer-and-pilot`, because the EWE-75 submission packet expects it in the repo. It is the demo- and submission-facing subset with matching section numbering; the store version here stays the full one.

EWE-79 through EWE-82 are post-hackathon and stay store-only. Their intended repository home, if the owner later copies them across, is `docs/pilot/`.
