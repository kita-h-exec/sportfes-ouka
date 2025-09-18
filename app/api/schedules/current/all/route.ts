import { NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder, readOverride } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

function listOngoing(items: any[], now = new Date()) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = now.getTime();
  const withTimes = items
    .filter((it) => !it.is_all_day)
    .map((it) => ({
      it,
      s: it.start_time ? new Date(it.start_time).getTime() : null,
      e: it.end_time ? new Date(it.end_time).getTime() : null,
    }));

  const ongoing: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  // 1) s,e 両方ある → s <= now <= e
  for (const x of withTimes) {
    if (x.s && x.e && t >= x.s && t <= x.e) ongoing.push(x.it);
  }

  // 2) e のみ（稀）→ now <= e
  for (const x of withTimes) {
    if (!x.s && x.e && t <= x.e) ongoing.push(x.it);
  }

  // 3) s のみ → s <= now < nextStart（次の開始が来るまで継続中とみなす, 上限6h）
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const startOnly = withTimes.filter(x => x.s && !x.e);
  if (startOnly.length > 0) {
    const sortedByStart = withTimes.filter(x => x.s).sort((a, b) => (a.s as number) - (b.s as number));
    for (const x of startOnly) {
      const idx = sortedByStart.findIndex(y => y.it === x.it);
      const next = idx >= 0 ? sortedByStart.slice(idx + 1).find(y => y.s) : null;
      const nextStart = next?.s ?? null;
      const upperBound = nextStart ?? ((x.s as number) + SIX_HOURS);
      if (t >= (x.s as number) && t < upperBound) ongoing.push(x.it);
    }
  }

  // 重複除去、id順でユニークに
  const seen = new Set<string>();
  const uniq = ongoing.filter((it: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const key = String(it?.id ?? Math.random());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniq;
}

export async function GET() {
  try {
    const manual = readManualOrder();
    const override = readOverride();
    const items = await getSchedules();

    // 並び順: 手動 > start_time
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

    const ongoing = listOngoing(sorted, new Date());
    // override を先頭に（同一idなら重複除去）
    let result = ongoing;
    if (override.enabled && override.item) {
      const oid = String((override.item as any).id); // eslint-disable-line @typescript-eslint/no-explicit-any
      const filtered = ongoing.filter((it: any) => String(it?.id) !== oid); // eslint-disable-line @typescript-eslint/no-explicit-any
      result = [override.item, ...filtered];
    }

    return NextResponse.json(
      { ok: true, items: result, count: result.length, meta: { manualUpdatedAt: manual.updatedAt, override: Boolean(override.enabled) } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
