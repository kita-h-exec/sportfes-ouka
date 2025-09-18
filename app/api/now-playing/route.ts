import { NextRequest, NextResponse } from 'next/server';
import { readNowPlayingSettings, writeNowPlayingSettings } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const data = readNowPlayingSettings();
  return NextResponse.json({ ok: true, data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const expected = process.env.DEBUG_PASSWORD;
  if (expected) {
    const provided = req.headers.get('x-debug-password');
    if (provided !== expected) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const showAllOngoing = typeof body.showAllOngoing === 'boolean' ? body.showAllOngoing : undefined;
    const hiddenIds = Array.isArray(body.hiddenIds) ? body.hiddenIds : undefined;
    const saved = writeNowPlayingSettings({ showAllOngoing, hiddenIds });
    return NextResponse.json({ ok: true, data: saved }, { status: 200 });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
