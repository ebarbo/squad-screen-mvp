import { BaseMatchContextSchema, type BaseMatchContext } from '@/domain/contracts';
import { DEVELOPMENT_PACKET, type PacketVariant } from './development-packet';

export { type PacketVariant };

export interface ResolvedPacket {
  variant: PacketVariant;
  /**
   * `normalized-evidence` is the product's own evidence layer. `harness-stand-in`
   * is this slice's hand-authored context, and every report says which it was.
   */
  source: 'normalized-evidence' | 'harness-stand-in';
  label: string;
  context: BaseMatchContext;
}

/**
 * The single place that knows where a match context comes from.
 *
 * The product's evidence layer (EWE-64) wins whenever it can normalize the
 * curated source records in `data/demo` into a `MatchContext`. That layer owns
 * entity resolution, origin deduplication, staleness and conflict rules, so the
 * harness must not reimplement any of it: doing so would measure the harness's
 * normalizer rather than the product's.
 *
 * Until it lands, the harness falls back to its own stand-in context — loudly,
 * in the run metadata and in every rendered table.
 */
export async function resolveVariant(variant: PacketVariant): Promise<ResolvedPacket> {
  const normalized = await tryNormalizedContext(variant);
  if (normalized !== null) {
    return {
      variant,
      source: 'normalized-evidence',
      label: `normalized evidence snapshot from src/server/evidence, variant '${variant}'`,
      context: normalized,
    };
  }

  return {
    variant,
    source: 'harness-stand-in',
    label: `harness stand-in context (evals/packet), variant '${variant}' — hand-authored because the evidence layer has not landed; not the curated EWE-62 packet`,
    context: BaseMatchContextSchema.parse(DEVELOPMENT_PACKET[variant]),
  };
}

interface EvidenceModule {
  buildMatchContextForVariant?: (variant: string) => Promise<unknown> | unknown;
}

/**
 * Integration seam for EWE-64.
 *
 * `src/server/evidence` is expected to export
 * `buildMatchContextForVariant(variantId)`, taking the EWE-62 variant IDs and
 * returning a base match context built from the raw source records. A module
 * that exists but does not export it, or returns something that is not a valid
 * context, is reported rather than silently ignored — the two slices should
 * find that out here, not at demo time.
 */
async function tryNormalizedContext(variant: PacketVariant): Promise<BaseMatchContext | null> {
  // A non-literal specifier keeps TypeScript from resolving a module that does
  // not exist yet; the import is attempted at run time and may legitimately fail.
  const specifier = '@/server/evidence';
  let loaded: EvidenceModule;
  try {
    loaded = (await import(/* @vite-ignore */ specifier)) as EvidenceModule;
  } catch {
    return null;
  }

  if (typeof loaded.buildMatchContextForVariant !== 'function') {
    throw new Error(
      "src/server/evidence is importable but exports no 'buildMatchContextForVariant'. The evaluation harness needs the product's normalized context rather than raw source records; see evals/README.md for the expected signature.",
    );
  }

  const raw = await loaded.buildMatchContextForVariant(variant);
  const parsed = BaseMatchContextSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `src/server/evidence returned something that is not a valid base match context for variant '${variant}':\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
