import { NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getSchedules();
    return NextResponse.json({ ok: true, data: items }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
