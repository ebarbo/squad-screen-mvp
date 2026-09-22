import { NextResponse } from 'next/server';
import { ScenarioRequestSchema } from '@/domain/contracts';
import { reevaluateRun } from '@/server/runs/service';
import { errorResponse, invalidRequest, readJson } from '../../_lib/respond';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  let runId: string | undefined;

  try {
    const parsed = ScenarioRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw invalidRequest(parsed.error.issues);

    runId = parsed.data.run_id;

    return NextResponse.json(
      await reevaluateRun({
        runId: parsed.data.run_id,
        scenarioId: parsed.data.scenario_id,
        overrides: parsed.data.availability_overrides,
      }),
    );
  } catch (error) {
    // The run ID goes back with the error so a UI holding a pending scenario can
    // match the failure to the run it belongs to.
    return errorResponse(error, runId);
  }
}
