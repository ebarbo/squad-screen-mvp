# Evaluation rubric — Squad Screen model comparison

Owner: evaluation slice (EWE-71). Consumed by EWE-73.

This rubric is fixed **before** any model output is seen. It defines what is measured, what
is only reviewable by a human, and what is reported as *not measured*. Nothing in this file
may be changed after a measured run without recording the change and re-running every model.

## 0. What this scores, and what it deliberately does not

The harness tests **model choice on one fixed structured context**. Every model receives a
byte-identical `MatchContext`, prompt text, prompt version, output schema and decoding
settings. The only variable is the model ID. A comparison in which the input fingerprints
differ is invalid and the harness aborts rather than reporting it.

This harness does **not** score tactical quality. There is no composite "expert score", no
weighted total and no 0–10 rating anywhere in the output. A model that passes every
deterministic check has produced output that is *well-formed, grounded in the supplied
evidence and compliant with the supplied constraints* — not output that is tactically good.
Judging tactical usefulness needs a football analyst, and the harness says so rather than
inventing a number (EWE-71: "no invented tactical-expert score").

Out of scope by boundary: direct-prompt versus pipeline comparisons, prompt tuning,
and any change made after seeing results without recording it (EWE-73 boundary).

## 1. Result vocabulary

| Value | Meaning |
| --- | --- |
| `pass` | The check ran and the assertion held. |
| `fail` | The check ran and the assertion did not hold. |
| `not_applicable` | The check is not defined for this case (recorded with the reason). |
| `not_measured` | The check or metric could not be produced. **Never counts as a pass.** |
| `pending_human_review` | Human-only judgement, not yet supplied. **Never counts as a pass.** |

Every reported cell carries one of these five values. There is no blank and no default.

## 2. Deterministic checks

Pure functions over the run output plus the case's own `MatchContext`. No model is involved
in judging. Each check is all-or-nothing: no partial credit, no averaging into a score.

### Structural

| ID | Assertion | A failure means |
| --- | --- | --- |
| `S1` | Output validates against the `RunResult` / `Recommendation` contract schema | The model produced output the product cannot consume |
| `S2` | Between zero and three recommendations, inclusive | The model padded or overflowed the supported count |
| `S3` | No numeric confidence, probability or percentage anywhere in recommendation text or fields | The model invented a certainty figure the contract forbids |
| `S4` | Each recommendation separates `observation`, `inference`, `action`, `trade_off`, `uncertainty`, `next_check` into distinct non-empty fields | Facts, inference and proposed action are blurred |

### Grounding

| ID | Assertion | A failure means |
| --- | --- | --- |
| `G1` | Every `evidence_ids` entry resolves to an `EvidenceItem` in this case's snapshot | The model cited evidence that does not exist |
| `G2` | Every observation rests on at least one cited record that is neither `missing` nor flagged invalid for this fixture | A factual claim whose only support is an acknowledged absence |
| `G3` | Every `depends_on` entry resolves to a known evidence, player or constraint ID | A dependency the product cannot explain or revise against |
| `G4` | Every player named in an `action` has a supplied observation about them among the recommendation's citations | The model invented a capability nobody supplied |
| `G5` | Every `player_actions[].player_id` resolves to a `ClubPlayer` in the squad | The model acted on a player that does not exist |

### Supplied constraints

| ID | Assertion | A failure means |
| --- | --- | --- |
| `C1` | No `player_actions` entry targets a player whose availability is `unavailable` | A forbidden action reached the output |
| `C2` | `planned_minutes` never exceeds that player's supplied `staff_constraint.max_minutes` | A staff-supplied limit was exceeded (A. Rivers: 45) |
| `C3` | No medical-clearance, injury-risk, win-probability or success-probability language | The model produced a claim the contract prohibits outright |

### Uncertainty handling

| ID | Assertion | A failure means |
| --- | --- | --- |
| `U1` | Every conflict in the context with `resolution: null` is surfaced in the output | The model silently picked a side or averaged a disagreement away |
| `U2` | Where the snapshot holds no tactical observation of the opponent, the model abstains or qualifies explicitly | The model invented a pattern it had no observation for |

`U1` is satisfied for a conflict when **any** of these holds, and fails only when none does:

1. a warning of code `evidence_conflict` names one of its evidence IDs, in `related_ids` or
   in the message;
2. one recommendation cites two or more of the conflicting IDs, so the drawer shows the
   disagreement side by side;
3. a recommendation citing one side names another side's ID in its `uncertainty`.

`U1` is `not_applicable` when every conflict carries a `resolution`, because a documented
freshness or authority rule then settled it. Having nothing to surface is not the same as
having surfaced something, so it is not recorded as a pass.

`U2`'s precondition is read from the data rather than from the case file: tactical support
is missing when the context holds no evidence of category `tactical_observation` whose
subject is the opponent. Where support exists the check is `not_applicable`. Where it is
missing, passing requires **either** zero recommendations with an `abstention_note`, **or**
all of: a warning of code `missing_evidence` or `abstained`, and on every recommendation a
substantive `uncertainty` and `next_check` rather than a placeholder.

### Scenario revision

| ID | Assertion | A failure means |
| --- | --- | --- |
| `R1` | Every `prior_recommendation_id` belongs to the base run, and every base recommendation appears in the change set | The revision references advice never given, or hides what became of advice that was |
| `R2` | Every base recommendation depending on the overridden player is `withdrawn` or `revised`, each with a non-empty `reason` and at least one `changed_dependency_ids` entry | Advice that can no longer stand was left standing |
| `R3` | Advice reported `unchanged` has byte-identical actionable content (`action`, `player_actions`); advice reported `revised` genuinely differs | The model silently rewrote unrelated advice, or relabelled unchanged advice as a revision |
| `R4` | `evidence_snapshot_id` and `parent_run_id` are consistent, and the base run is byte-identical before and after the rerun | The what-if mutated the factual record |

`R2` is `not_applicable` when nothing depended on the overridden player: requiring a revision
nobody needed would reward churn.

`R3` is checked in both directions: content that changed must not be labelled `unchanged`,
and content labelled `revised` must actually differ. Swapping a player identifier inside
otherwise word-for-word identical advice is an `R3` failure, not a revision.

`R3` also covers the stability-baseline form, where a case declares another case's run as
its baseline instead of applying a scenario. Two independent runs cannot be matched by
recommendation ID, so the comparison is on the multiset of actionable content — what is
proposed, for whom, for how long. The irrelevant-context-change case uses this form, because
EWE-62 models that change as a change to the evidence rather than an availability override.

`R4` reports which evidence it actually had. Snapshot identity and parent run ID are always
comparable. The before-and-after hash of the base run is only meaningful when a pipeline
really ran, so on a recorded replay the reason says the check confirms fixture consistency
rather than live immutability.

### The published language patterns

`S3` and `C3` match on a fixed list of regular expressions, published here before any run so
a model is never judged against a rule invented after seeing its output. The list lives in
`evals/lib/checks/language.ts`.

`S3` — invented certainty: a percentage figure; a number followed by "per cent"; a number
within forty characters of *confidence*, *certainty*, *likelihood* or *probability* in either
order; a bare decimal probability such as `p=0.72`; a rating out of 5, 10 or 100; odds as a
ratio. Layered on top is the contract's own `findFabricatedConfidence`, which catches a
`confidence`-style key anywhere in the payload even when the prose is clean.

`C3` — prohibited claims: asserting medical clearance or fitness to play; asserting an injury
or re-injury risk; a diagnosis, prognosis or recovery timeline; a probability or chance of a
match outcome; guaranteeing an outcome.

The patterns target asserting constructions, not topic mentions. A model that writes "this is
not a medical judgement" is not penalised for the word, and "14 of 18 build-ups across 2
matches" is not a confidence figure. Both behaviours are covered by tests.

## 3. Human review — source entailment

**Required. Never auto-filled, never inferred, never defaulted to pass.**

Whether a cited excerpt actually *supports* the claim built on it is not decidable by string
matching, so the harness does not pretend to decide it. Each run emits a review worksheet
(`human-review.csv`) with one row per recommendation, pre-filled with the claim text, the
cited evidence IDs and their exact excerpts, and an empty verdict column.

| Column | Allowed values |
| --- | --- |
| `entailment_verdict` | `supported` · `partially_supported` · `unsupported` · `unclear` |
| `reviewer` | Name or handle of the human who judged it |
| `reviewed_at` | ISO-8601 timestamp |
| `note` | Free text; required when the verdict is not `supported` |

Until a worksheet is filled in and passed back with `--human-review <path>`, every
entailment cell in the report reads `pending_human_review` and the summary states that the
entailment column is unreviewed. The harness will not compute an entailment rate from an
empty or partial worksheet.

## 3a. What the two models differ on

The comparison is between `Qwen/Qwen3-235B-A22B-Instruct-2507` and `openai/gpt-oss-120b`,
both verified reachable in the event account and both confirmed to honour `strict: true`
JSON schema output.

They differ on three axes at once — different lab and model family, a different
mixture-of-experts shape with far fewer active parameters, and reasoning versus
non-reasoning. This is deliberately **not** a size-only ablation, which means the result is
genuinely open: either model could win on either axis, and a tie or a trade-off is the most
likely honest outcome. It also means a difference cannot be attributed to any single
property. The report says which model was better on which check and on which metric, and
does not explain *why* — attributing an outcome to parameter count or reasoning style from
five cases would be a story, not a finding.

One practical consequence for the metrics. `gpt-oss-120b` returns chain of thought in a
separate `reasoning` field, so `content` parses cleanly with no special handling, but those
reasoning tokens are still billed and still appear in the usage counts. In one confirmed
exchange it spent 111 completion tokens where Qwen spent 21 for an equivalent answer. Token
counts therefore come from the provider's usage fields and nowhere else — never from
response length, which would undercount the reasoning model by roughly the amount that
matters.

## 4. Metrics: measured, derived, or unavailable

| Metric | Source | When unavailable |
| --- | --- | --- |
| `duration_ms` | Wall clock around the provider call, from adapter telemetry | `null` with `reason` |
| `input_tokens` / `output_tokens` | Provider usage field only | `null` with `reason` |
| `retries` | Counted by the adapter, **including** the successful final attempt's predecessors | `null` with `reason` |
| `estimated_inference_cost` | `(input_tokens × input_price + output_tokens × output_price) / 1e6`, from the pricing-basis env vars | `null` with `reason` |

The Token Factory API exposes no pricing or billing endpoint, so per-token prices can only
come from the Nebius console. Unless `SQUAD_SCREEN_PRICE_INPUT_PER_MTOK` and
`SQUAD_SCREEN_PRICE_OUTPUT_PER_MTOK` are both set, the cost column is empty with that reason
stated. No price is inferred from token counts, from latency, or from another provider's
published rates.

Hard rules:

1. **A metric that was not measured is `null` with a stated reason.** It is never estimated,
   interpolated, carried over from another model, or filled with a plausible figure. The
   report prints `not measured`, not a number.
2. Latency is never derived from token counts, and cost is never derived from latency.
3. Cost is labelled **estimated inference cost** and covers provider calls only — not total
   operating cost.
4. Every call is counted, including failed and retried calls, and every counted call is
   included in the aggregate cost.
5. Recorded and stub outputs carry **no** timing, token or cost figures unless those figures
   were saved from a real provider response. Fixtures authored by hand carry `null` metrics
   and a stated reason naming the fixture as authored.

## 5. Reporting rules

- Report `cases × models × repeats` explicitly, along with decoding settings, prompt version
  and the shared input fingerprint.
- Report failures and errors as their own rows. A run that errored is not dropped.
- State the cache policy (this harness disables caching; each repeat is an independent call).
- Distinguish **model choice** from **workflow architecture**: every model runs the same
  pipeline, so differences are attributable to the model, and the report says so.
- The conclusion may be a tie or a trade-off. A tie is a valid result and is reported as one.
- Any change to prompt, settings or checks after a measured run invalidates that run; the
  change is recorded and all models are re-run.

## 6. Small sample

Five cases × two models × two repeats = twenty runs at most. That is a smoke-scale sample:
it detects gross contract violations and obvious instability, and it does not support a
claim that one model is generally better. Every report carries this disclosure verbatim:

> Small sample: 5 fixed cases, 2 repeats per case per model. These results show contract
> compliance and stability on one fixture, not general model quality.
