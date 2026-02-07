import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lim = Number(searchParams.get('limit') ?? '3');
    const limit = Number.isFinite(lim) ? Math.max(1, Math.min(10, Math.floor(lim))) : 3;
    const now = Date.now();

    const manual = readManualOrder();
    const items = await getSchedules();

    // 並び順: 手動 > start_time 昇順
    const sorted = items.slice();
    if (manual.order && manual.order.length > 0) {
      const orderMap = new Map<string | number, number>();
      manual.order.forEach((id, idx) => orderMap.set(id, idx));
      sorted.sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const ai = orderMap.has(a.id as any) ? (orderMap.get(a.id as any) as number) : Number.MAX_SAFE_INTEGER; // eslint-disable-line @typescript-eslint/no-explicit-any
        const bi = orderMap.has(b.id as any) ? (orderMap.get(b.id as any) as number) : Number.MAX_SAFE_INTEGER; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (ai !== bi) return ai - bi;
        const as = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
        return as - bs;
      });
    } else {
      sorted.sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const as = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
        return as - bs;
      });
    }

    const upcoming = sorted
      .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({ it, st: new Date(it.start_time).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: any) => x.st >= now) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((x: any) => x.it) // eslint-disable-line @typescript-eslint/no-explicit-any
      .slice(0, limit);

    return NextResponse.json({ ok: true, items: upcoming, count: upcoming.length }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
