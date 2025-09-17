import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder, readOverride } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

function pickOngoing(items: any[], now = new Date()) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = now.getTime();
  // 進行中フィルタ
  const ongoing = items.filter(it => {
    if (it.is_all_day) return false; // 終日は対象外（必要なら含める）
    const s = it.start_time ? new Date(it.start_time).getTime() : null;
    const e = it.end_time ? new Date(it.end_time).getTime() : null;
    if (s && e) return t >= s && t <= e;
    if (!s && e) return t <= e; // 終了のみ
    return false;
  });
  // 最も直近の開始/終了に近いもの優先
  if (ongoing.length > 0) {
    ongoing.sort((a, b) => {
      const ae = a.end_time ? new Date(a.end_time).getTime() : Infinity;
      const be = b.end_time ? new Date(b.end_time).getTime() : Infinity;
      return ae - be;
    });
    return ongoing[0];
  }
  // 進行中がない場合、直近の開始予定（今後）を返す
  const upcoming = items
    .filter(it => it.start_time)
    .map(it => ({ it, st: new Date(it.start_time!).getTime() }))
    .filter(x => x.st >= t)
    .sort((a, b) => a.st - b.st);
  return upcoming.length > 0 ? upcoming[0].it : null;
}

export async function GET(_req: NextRequest) {
  try {
    // Directusから取得
    const items = await getSchedules();
    // 手動並び（テンプレ順）適用: idがあるものに限定
    const manual = readManualOrder();
    let sorted = items.slice();
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
    }

    // 手動上書き
    const override = readOverride();
    const now = new Date();
    const t = now.getTime();
    const current = override.enabled && override.item ? override.item : pickOngoing(sorted, now);

    // 次の候補（1件）
    const upcoming = sorted
      .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({ it, st: new Date(it.start_time).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: any) => x.st >= t) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any

    let nextItem: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (current) {
      // current が進行中の場合は、最も近い今後の開始を next に
      const idx = upcoming.findIndex((u: any) => String(u.id) === String((current as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (idx >= 0) {
        nextItem = upcoming[idx + 1] || null;
      } else {
        // current が override などで upcoming 配列に無い場合、upcoming[0] を next に
        nextItem = upcoming[0] || null;
      }
    } else {
      // current がない場合、upcoming[0] を current として扱っているため、その次を next に
      nextItem = upcoming[1] || null;
    }

    return NextResponse.json(
      { ok: true, data: current, next: nextItem, meta: { manualUpdatedAt: manual.updatedAt, override: override.enabled } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
