import { NextResponse } from 'next/server';
import { GenerateRequestSchema } from '@/domain/contracts';
import { generate } from '@/server/runs/service';
import { errorResponse, invalidRequest, readJson } from '../../_lib/respond';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parsed = GenerateRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw invalidRequest(parsed.error.issues);

    return NextResponse.json(await generate({ fixtureId: parsed.data.fixture_id }));
  } catch (error) {
    return errorResponse(error);
  }
}
