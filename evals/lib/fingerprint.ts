import { createHash } from 'node:crypto';

/**
 * Key-sorted, whitespace-free JSON. Two structurally equal values always
 * serialise to the same string regardless of how they were constructed, which
 * is what makes a fingerprint comparable across models and across processes.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

function canonicalise(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`Cannot fingerprint non-finite number: ${String(value)}`);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalise);
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (source[key] === undefined) continue;
    out[key] = canonicalise(source[key]);
  }
  return out;
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export interface FingerprintInput {
  case_id: string;
  match_context: unknown;
  scenario: unknown;
  prompt_text: string;
  prompt_version: string;
  output_schema: unknown;
  settings: unknown;
}

/**
 * Component hashes as well as the combined one: when a comparison is rejected
 * for mismatched inputs, the components say which part diverged.
 */
export interface InputFingerprint {
  combined: string;
  components: Record<keyof FingerprintInput, string>;
}

export function fingerprintInput(input: FingerprintInput): InputFingerprint {
  const components = Object.fromEntries(
    (Object.keys(input) as Array<keyof FingerprintInput>)
      .sort()
      .map((key) => [key, sha256(input[key])]),
  ) as Record<keyof FingerprintInput, string>;
  return { combined: sha256(components), components };
}

export interface FingerprintMismatch {
  component: string;
  fingerprints: Record<string, string>;
}

/**
 * A comparison is only valid if every model saw the same input. Callers abort
 * on a non-empty result rather than reporting a difference they cannot
 * attribute to the model.
 */
export function diffFingerprints(
  byLabel: Record<string, InputFingerprint>,
): FingerprintMismatch[] {
  const labels = Object.keys(byLabel);
  const [firstLabel, ...restLabels] = labels;
  if (firstLabel === undefined || restLabels.length === 0) return [];
  const reference = byLabel[firstLabel];
  if (reference === undefined) return [];

  const mismatches: FingerprintMismatch[] = [];
  for (const component of Object.keys(reference.components)) {
    const key = component as keyof FingerprintInput;
    const differs = restLabels.some(
      (label) => byLabel[label]?.components[key] !== reference.components[key],
    );
    if (!differs) continue;
    mismatches.push({
      component,
      fingerprints: Object.fromEntries(
        labels.map((label) => [label, byLabel[label]?.components[key] ?? '(absent)']),
      ),
    });
  }
  return mismatches;
}
