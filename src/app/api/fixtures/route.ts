import { NextResponse } from 'next/server';
import { listFixtures } from '@/server/runs/service';
import { errorResponse } from '../_lib/respond';

// The run store lives in process memory, so nothing here may be prerendered or
// cached: a cached response would outlive the runs it refers to.
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  try {
    return NextResponse.json({ fixtures: listFixtures() });
  } catch (error) {
    return errorResponse(error);
  }
}
