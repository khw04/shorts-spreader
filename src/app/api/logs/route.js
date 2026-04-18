import { NextResponse } from 'next/server';
import { getSpreadLog } from '../../../lib/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: getSpreadLog()
  });
}
