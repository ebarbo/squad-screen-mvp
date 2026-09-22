/**
 * Source-entailment review is the one judgement this harness refuses to make.
 *
 * Whether a cited excerpt actually supports the claim built on it needs a
 * reader. The harness emits a worksheet with the claim, the cited IDs and their
 * exact excerpts, and an empty verdict column; it reads a filled worksheet back
 * and reports only what a human wrote. It never defaults a verdict, never
 * infers one from string overlap, and never computes a rate from a partially
 * filled sheet. See rubric.md §3.
 */

export const ENTAILMENT_VERDICTS = [
  'supported',
  'partially_supported',
  'unsupported',
  'unclear',
] as const;

export type EntailmentVerdict = (typeof ENTAILMENT_VERDICTS)[number];

export interface ReviewRow {
  case_id: string;
  model_label: string;
  repeat: number;
  phase: string;
  recommendation_id: string;
  claim: string;
  cited_evidence_ids: string;
  cited_excerpts: string;
  entailment_verdict: EntailmentVerdict | '';
  reviewer: string;
  reviewed_at: string;
  note: string;
}

const COLUMNS: Array<keyof ReviewRow> = [
  'case_id',
  'model_label',
  'repeat',
  'phase',
  'recommendation_id',
  'claim',
  'cited_evidence_ids',
  'cited_excerpts',
  'entailment_verdict',
  'reviewer',
  'reviewed_at',
  'note',
];

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly ReviewRow[]): string {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => escapeCell(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function parseCsv(text: string): ReviewRow[] {
  const records = splitRecords(text).filter((record) => record.length > 0);
  if (records.length === 0) return [];
  const header = records[0];
  if (header === undefined) return [];
  const index = new Map(header.map((name, position) => [name.trim(), position]));
  for (const column of COLUMNS) {
    if (!index.has(column)) {
      throw new Error(
        `Human-review worksheet is missing the '${column}' column. Expected header: ${COLUMNS.join(',')}`,
      );
    }
  }
  return records.slice(1).map((record, offset) => {
    const cell = (column: keyof ReviewRow): string =>
      (record[index.get(column) as number] ?? '').trim();
    const verdict = cell('entailment_verdict');
    if (verdict !== '' && !ENTAILMENT_VERDICTS.includes(verdict as EntailmentVerdict)) {
      throw new Error(
        `Row ${offset + 2}: '${verdict}' is not a valid entailment verdict. Use one of ${ENTAILMENT_VERDICTS.join(', ')}.`,
      );
    }
    return {
      case_id: cell('case_id'),
      model_label: cell('model_label'),
      repeat: Number(cell('repeat')),
      phase: cell('phase'),
      recommendation_id: cell('recommendation_id'),
      claim: cell('claim'),
      cited_evidence_ids: cell('cited_evidence_ids'),
      cited_excerpts: cell('cited_excerpts'),
      entailment_verdict: verdict as EntailmentVerdict | '',
      reviewer: cell('reviewer'),
      reviewed_at: cell('reviewed_at'),
      note: cell('note'),
    };
  });
}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, embedded newlines. */
function splitRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      field = '';
      if (record.some((cell) => cell !== '')) records.push(record);
      record = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    if (record.some((cell) => cell !== '')) records.push(record);
  }
  return records;
}

export interface EntailmentSummary {
  status: 'reviewed' | 'pending_human_review';
  /** Why the status is pending, or null once every row is judged. */
  reason: string | null;
  total_rows: number;
  reviewed_rows: number;
  counts: Record<EntailmentVerdict, number> | null;
  reviewers: string[];
}

/**
 * A worksheet counts as reviewed only when every row carries a verdict. A
 * half-filled sheet yields no counts, because a rate over an unknown
 * denominator is exactly the kind of number this project refuses to publish.
 */
export function summariseReview(
  expected: readonly ReviewRow[],
  supplied: readonly ReviewRow[] | null,
): EntailmentSummary {
  if (supplied === null) {
    return {
      status: 'pending_human_review',
      reason:
        'No human-review worksheet supplied. Fill the emitted human-review.csv and pass it with --human-review <path>.',
      total_rows: expected.length,
      reviewed_rows: 0,
      counts: null,
      reviewers: [],
    };
  }
  const byKey = new Map(supplied.map((row) => [reviewKey(row), row]));
  const judged: ReviewRow[] = [];
  const missing: string[] = [];
  for (const row of expected) {
    const match = byKey.get(reviewKey(row));
    if (match === undefined || match.entailment_verdict === '') {
      missing.push(reviewKey(row));
      continue;
    }
    judged.push(match);
  }
  if (missing.length > 0) {
    return {
      status: 'pending_human_review',
      reason: `${missing.length} of ${expected.length} rows have no verdict (first: ${missing[0]}). A rate over a partially reviewed sheet would misstate the denominator.`,
      total_rows: expected.length,
      reviewed_rows: judged.length,
      counts: null,
      reviewers: uniqueReviewers(judged),
    };
  }
  const counts = Object.fromEntries(
    ENTAILMENT_VERDICTS.map((verdict) => [
      verdict,
      judged.filter((row) => row.entailment_verdict === verdict).length,
    ]),
  ) as Record<EntailmentVerdict, number>;
  return {
    status: 'reviewed',
    reason: null,
    total_rows: expected.length,
    reviewed_rows: judged.length,
    counts,
    reviewers: uniqueReviewers(judged),
  };
}

function reviewKey(row: ReviewRow): string {
  return `${row.case_id}|${row.model_label}|${row.repeat}|${row.phase}|${row.recommendation_id}`;
}

function uniqueReviewers(rows: readonly ReviewRow[]): string[] {
  return [...new Set(rows.map((row) => row.reviewer).filter((name) => name !== ''))].sort();
}
