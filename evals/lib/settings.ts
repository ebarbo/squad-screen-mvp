import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { evalsDir } from './paths';

/**
 * Decoding settings and run policy, held identical across every model in a
 * comparison and folded verbatim into the input fingerprint. Editing this file
 * invalidates any measured run that used the previous values.
 */
export const settingsSchema = z.object({
  settings_version: z.string().min(1),
  note: z.string().min(1),
  decoding: z.object({
    temperature: z.number().min(0).max(2),
    top_p: z.number().min(0).max(1),
    max_output_tokens: z.number().int().positive(),
    seed: z.number().int(),
  }),
  repeats_per_case: z.number().int().positive(),
  cache_policy: z.string().min(1),
  timeout_ms: z.number().int().positive(),
  max_retries: z.number().int().min(0),
  small_sample_disclosure: z.string().min(1),
});

export type EvalSettings = z.infer<typeof settingsSchema>;

export function loadSettings(root?: string): EvalSettings {
  const file = path.join(evalsDir(root), 'settings.json');
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `evals/settings.json is invalid:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`,
    );
  }
  return parsed.data;
}
