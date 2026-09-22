import { CASE_ORDER } from './case-schema';
import { type ModelUnderTest, type TransportMode } from './run-record';

export interface CliOptions {
  mode: TransportMode;
  models: ModelUnderTest[];
  repeats: number;
  caseIds: string[];
  humanReviewPath: string | null;
  outDir: string | null;
  runId: string | null;
  help: boolean;
}

export const USAGE = `Squad Screen five-scenario model comparison harness

Usage
  npm run eval -- [options]
  npx tsx evals/run-eval.ts [options]

Options
  --mode <recorded|live>   Where output comes from. Default: recorded.
                           'recorded' replays fixtures from evals/recorded/ and
                           reports every metric as not measured.
                           'live' calls Nebius Token Factory through the model
                           adapter and requires NEBIUS_API_KEY.
  --models <spec>          Comma-separated label=model-id pairs, e.g.
                           primary=openai/gpt-oss-20b,comparison=openai/gpt-oss-120b
                           Default in live mode: SQUAD_SCREEN_MODEL_ID as
                           'primary' and SQUAD_SCREEN_COMPARISON_MODEL_ID as
                           'comparison'.
  --repeats <n>            Repeats per case per model. Default: from evals/settings.json.
  --cases <ids>            Comma-separated case IDs. Default: all five.
  --human-review <path>    A filled human-review.csv to fold into the report.
  --out <dir>              Results root. Default: evals/results.
  --run-id <id>            Override the generated run directory name.
  -h, --help               Print this message.

Exit codes
  0  The run completed and every deterministic check matched its declared expectation.
  1  The run completed but at least one check departed from its expectation,
     or a metric could not be measured where one was required.
  2  The run could not be performed (bad arguments, missing fixtures, missing
     configuration). Nothing was measured and no results were written.
`;

export class CliError extends Error {}

/** Loose, like the server's own config loader, so tests can pass a bare object. */
export type CliEnv = Record<string, string | undefined>;

export function parseArgs(argv: readonly string[], env: CliEnv): CliOptions {
  const options: CliOptions = {
    mode: 'recorded',
    models: [],
    repeats: Number.NaN,
    caseIds: [...CASE_ORDER],
    humanReviewPath: null,
    outDir: null,
    runId: null,
    help: false,
  };

  let explicitModels: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = (): string => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new CliError(`Option ${arg} requires a value.`);
      }
      i += 1;
      return value;
    };
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--mode': {
        const value = next();
        if (value !== 'recorded' && value !== 'live') {
          throw new CliError(`--mode must be 'recorded' or 'live', got '${value}'.`);
        }
        options.mode = value;
        break;
      }
      case '--models':
        explicitModels = next();
        break;
      case '--repeats': {
        const value = Number(next());
        if (!Number.isInteger(value) || value < 1) {
          throw new CliError('--repeats must be a positive integer.');
        }
        options.repeats = value;
        break;
      }
      case '--cases': {
        const ids = next()
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id !== '');
        const unknown = ids.filter(
          (id) => !CASE_ORDER.includes(id as (typeof CASE_ORDER)[number]),
        );
        if (unknown.length > 0) {
          throw new CliError(
            `Unknown case ID(s): ${unknown.join(', ')}. Known cases: ${CASE_ORDER.join(', ')}.`,
          );
        }
        options.caseIds = ids;
        break;
      }
      case '--human-review':
        options.humanReviewPath = next();
        break;
      case '--out':
        options.outDir = next();
        break;
      case '--run-id':
        options.runId = next();
        break;
      default:
        throw new CliError(`Unknown option '${arg}'. Run with --help for usage.`);
    }
  }

  options.models = resolveModels(explicitModels, options.mode, env);
  return options;
}

function resolveModels(
  spec: string | null,
  mode: TransportMode,
  env: CliEnv,
): ModelUnderTest[] {
  if (spec !== null) {
    const models = spec
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
      .map((entry) => {
        const separator = entry.indexOf('=');
        if (separator < 1 || separator === entry.length - 1) {
          throw new CliError(
            `--models entries must be label=model-id pairs, got '${entry}'.`,
          );
        }
        return {
          label: entry.slice(0, separator),
          model_id: entry.slice(separator + 1),
          source: '--models',
        };
      });
    assertDistinct(models);
    return models;
  }

  const models: ModelUnderTest[] = [];
  const primary = env.SQUAD_SCREEN_MODEL_ID;
  const comparison = env.SQUAD_SCREEN_COMPARISON_MODEL_ID;
  if (primary !== undefined && primary !== '') {
    models.push({ label: 'primary', model_id: primary, source: 'SQUAD_SCREEN_MODEL_ID' });
  }
  if (comparison !== undefined && comparison !== '') {
    models.push({
      label: 'comparison',
      model_id: comparison,
      source: 'SQUAD_SCREEN_COMPARISON_MODEL_ID',
    });
  }

  if (models.length === 0) {
    if (mode === 'live') {
      throw new CliError(
        'No model IDs configured. Set SQUAD_SCREEN_MODEL_ID (and SQUAD_SCREEN_COMPARISON_MODEL_ID for a two-model comparison), or pass --models label=id,label=id.',
      );
    }
    // Recorded mode needs a label to file fixtures under, not a real model.
    return [
      {
        label: 'recorded-fixture',
        model_id: 'none (recorded fixtures were not produced by a model)',
        source: 'recorded mode default',
      },
    ];
  }
  assertDistinct(models);
  return models;
}

function assertDistinct(models: readonly ModelUnderTest[]): void {
  const labels = new Set<string>();
  for (const model of models) {
    if (labels.has(model.label)) {
      throw new CliError(`Duplicate model label '${model.label}'.`);
    }
    labels.add(model.label);
  }
}

export function defaultRunId(mode: TransportMode, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace('Z', 'Z');
  return `${stamp}-${mode}`;
}
