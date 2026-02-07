import { NextRequest, NextResponse } from 'next/server';
import { readOverride, writeOverride } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const data = readOverride();
  return NextResponse.json({ ok: true, data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  // 簡易認証: DEBUG_PASSWORD が設定されている場合のみ、同じヘッダで保護
  const expected = process.env.DEBUG_PASSWORD;
  if (expected) {
    const provided = req.headers.get('x-debug-password');
    if (provided !== expected) return unauthorized();
  }
  try {
    const body = await req.json();
    const enabled = Boolean(body?.enabled);
    const item = body?.item || null;
    writeOverride({ enabled, item });
    return NextResponse.json({ ok: true, data: { enabled, item } });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
