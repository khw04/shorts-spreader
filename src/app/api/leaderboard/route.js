import { NextResponse } from 'next/server';
import { getLeaderboardSnapshot } from '../../../lib/state';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: getLeaderboardSnapshot()
  });
}
