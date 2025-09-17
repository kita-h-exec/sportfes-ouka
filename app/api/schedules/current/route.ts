import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder, readOverride } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

function pickOngoing(items: any[], now = new Date()) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = now.getTime();
  // ソート前提: start_time 昇順を想定（呼び出し元で整列済み）
  const withTimes = items
    .filter((it) => !it.is_all_day)
    .map((it) => ({
      it,
      s: it.start_time ? new Date(it.start_time).getTime() : null,
      e: it.end_time ? new Date(it.end_time).getTime() : null,
    }));

  // 1) s,e 両方ある → s <= now <= e
  const ongoingSE = withTimes.filter(x => x.s && x.e && t >= (x.s as number) && t <= (x.e as number));
  if (ongoingSE.length > 0) {
    ongoingSE.sort((a, b) => (a.e as number) - (b.e as number));
    return ongoingSE[0].it;
  }

  // 2) e のみ（稀）→ now <= e
  const ongoingOnlyE = withTimes.filter(x => !x.s && x.e && t <= (x.e as number));
  if (ongoingOnlyE.length > 0) {
    ongoingOnlyE.sort((a, b) => (a.e as number) - (b.e as number));
    return ongoingOnlyE[0].it;
  }

  // 3) s のみ → s <= now < nextStart（次の開始が来るまで継続中とみなす）
  //    次の開始が見つからない場合は、最大継続時間（例: 6h）を上限に進行中とみなす
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const startOnly = withTimes.filter(x => x.s && !x.e);
  if (startOnly.length > 0) {
    // nextStart を求めるため、start_time 昇順配列を作る
    const sortedByStart = withTimes
      .filter(x => x.s)
      .sort((a, b) => (a.s as number) - (b.s as number));

    for (const x of startOnly) {
      const idx = sortedByStart.findIndex(y => y.it === x.it);
      const next = idx >= 0 ? sortedByStart.slice(idx + 1).find(y => y.s) : null;
      const nextStart = next?.s ?? null;
      const upperBound = nextStart ?? ((x.s as number) + SIX_HOURS);
      if (t >= (x.s as number) && t < upperBound) {
        return x.it;
      }
    }
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
    // 手動上書き（最優先でチェック）
    const manual = readManualOrder();
    const override = readOverride();
    const now = new Date();
    const t = now.getTime();

    if (override.enabled && override.item) {
      // override が有効な場合は Directus への依存を避けつつ next を可能なら計算
      let nextItem: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const items = await getSchedules();
        const sorted = items.slice().sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const as = a.start_time ? new Date(a.start_time).getTime() : 0;
          const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
          return as - bs;
        });
        const upcoming = sorted
          .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((it: any) => ({ it, st: new Date(it.start_time).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
          .filter((x: any) => x.st >= t) // eslint-disable-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any
        const idx = upcoming.findIndex((u: any) => String(u.id) === String((override.item as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
        nextItem = idx >= 0 ? (upcoming[idx + 1] || null) : (upcoming[0] || null);
      } catch {
        // Directus が未設定等で取得できない場合は next を null のまま返す
        nextItem = null;
      }
      return NextResponse.json(
        { ok: true, data: override.item, next: nextItem, meta: { manualUpdatedAt: manual.updatedAt, override: true } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // override が無ければ通常フロー（Directus 取得）
    const items = await getSchedules();
    // 手動並び（テンプレ順）適用: idがあるものに限定
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

    const current = pickOngoing(sorted, now);

    // 次の候補（1件）
    const upcoming = sorted
      .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({ it, st: new Date(it.start_time).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: any) => x.st >= t) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any

    let nextItem: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (current) {
      const idx = upcoming.findIndex((u: any) => String(u.id) === String((current as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
      nextItem = idx >= 0 ? (upcoming[idx + 1] || null) : (upcoming[0] || null);
    } else {
      nextItem = upcoming[1] || null; // current が upcoming[0] 扱いのため
    }

    return NextResponse.json(
      { ok: true, data: current, next: nextItem, meta: { manualUpdatedAt: manual.updatedAt, override: false } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
