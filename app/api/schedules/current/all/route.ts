import { NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder, readOverride, readNowPlayingSettings } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

// --- Time helpers (JST)
const JST_OFFSET = 9 * 60 * 60 * 1000;
function parseJst(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const hasTz = /[zZ]$|([\+\-]\d{2}:?\d{2})$/.test(ts);
  if (hasTz) {
    const t = new Date(ts).getTime();
    return Number.isFinite(t) ? t : null;
  }
  const [datePart, timePartRaw] = ts.split(/[T ]/);
  if (!datePart) return null;
  const [yStr, mStr, dStr] = datePart.split('-');
  const timePart = timePartRaw || '00:00:00';
  const [hhStr = '0', mmStr = '0', ssStr = '0'] = timePart.split(':');
  const y = Number(yStr), m = Number(mStr), d = Number(dStr);
  const hh = Number(hhStr), mm = Number(mmStr), ss = Number(String(ssStr).split('.')[0]);
  if ([y, m, d, hh, mm, ss].some(n => Number.isNaN(n))) return null;
  return Date.UTC(y, (m - 1), d, hh - 9, mm, ss, 0);
}
function jstDayRangeMs(now: Date): { start: number; end: number } {
  const jstNow = new Date(now.getTime() + JST_OFFSET);
  jstNow.setHours(0, 0, 0, 0);
  const start = jstNow.getTime() - JST_OFFSET;
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

function listOngoing(items: any[], now = new Date()) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = now.getTime();
  const withTimes = items
    .map((it) => {
      const s = parseJst(it.start_time);
      const eRaw = parseJst(it.end_time);
      const e = (s && eRaw && eRaw <= s) ? null : eRaw; // e<=s は無効化
      return {
        it,
        s,
        e,
        ad: Boolean(it.is_all_day),
      };
    });

  const ongoing: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  // 0) 終日: start_time の日付が今日なら ongoing 扱い
  try {
    const { start: dayStartMs, end: dayEndMs } = jstDayRangeMs(now);
    for (const x of withTimes) {
      if (x.ad && x.s && x.s >= dayStartMs && x.s < dayEndMs) ongoing.push(x.it);
    }
  } catch { /* ignore */ }

  // 1) s,e 両方ある → s <= now < e（終了時刻は排他的に扱う）
  for (const x of withTimes) {
    if (x.s && x.e && t >= x.s && t < x.e) ongoing.push(x.it);
  }

  // 2) e のみ（開始不明）は除外

  // 3) s のみ → s <= now < nextStart（次の開始が来るまで継続中とみなす, 上限6h）
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const startOnly = withTimes.filter(x => !x.ad && x.s && !x.e);
  if (startOnly.length > 0) {
  const sortedByStart = withTimes.filter(x => x.s).sort((a, b) => (a.s as number) - (b.s as number));
    for (const x of startOnly) {
      const idx = sortedByStart.findIndex(y => y.it === x.it);
      const next = idx >= 0 ? sortedByStart.slice(idx + 1).find(y => y.s && (y.s as number) > (x.s as number)) : null;
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
    const now = new Date();
    const nowRounded = new Date(now);
    nowRounded.setSeconds(0, 0);
    const t = nowRounded.getTime();
    const np = readNowPlayingSettings();
    const items = await getSchedules();

    // 並び順: 手動 > start_time
    const sorted = items.slice();
    if (manual.order && manual.order.length > 0) {
      const orderMap = new Map<string | number, number>();
      manual.order.forEach((id, idx) => orderMap.set(id, idx));
      sorted.sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint-no-explicit-any
        const ai = orderMap.has(a.id as any) ? (orderMap.get(a.id as any) as number) : Number.MAX_SAFE_INTEGER; // eslint-disable-line @typescript-eslint/no-explicit-any
        const bi = orderMap.has(b.id as any) ? (orderMap.get(b.id as any) as number) : Number.MAX_SAFE_INTEGER; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (ai !== bi) return ai - bi;
        const as = parseJst(a.start_time) ?? 0;
        const bs = parseJst(b.start_time) ?? 0;
        return as - bs;
      });
    } else {
      sorted.sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const as = parseJst(a.start_time) ?? 0;
        const bs = parseJst(b.start_time) ?? 0;
        return as - bs;
      });
    }

    let ongoing = listOngoing(sorted, nowRounded);
    if (!np.showAllDayAsNow) {
      ongoing = ongoing.filter((it: any) => !it.is_all_day); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    // override を先頭に（同一idなら重複除去）
    let result = ongoing;
  if (override.enabled && override.item) {
      const oid = String((override.item as any).id); // eslint-disable-line @typescript-eslint/no-explicit-any
      // 上書きデータの時間補完
      const same = sorted.find((s: any) => String(s?.id) === oid); // eslint-disable-line @typescript-eslint/no-explicit-any
      const dataResolved: any = { ...(override.item as any) }; // eslint-disable-line @typescript-eslint/no-explicit-any
      let s: string | null | undefined = (dataResolved.start_time as any) ?? (same?.start_time as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      let e: string | null | undefined = (dataResolved.end_time as any) ?? (same?.end_time as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (!e && s) {
        // 次の開始時刻を終了に採用
        const sMs = new Date(s).getTime();
        const next = sorted
          .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((it: any) => ({ it, st: new Date(it.start_time).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
          .filter((x: any) => x.st > sMs) // eslint-disable-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((x: any) => x.it)[0] || null; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (next?.start_time) e = next.start_time;
      }
      if (!e && s) {
        try { e = new Date(new Date(s).getTime() + 6 * 60 * 60 * 1000).toISOString(); } catch {/* ignore */}
      }
      if (!s && e) {
        try { s = new Date(new Date(e).getTime() - 60 * 60 * 1000).toISOString(); } catch {/* ignore */}
      }
      dataResolved.start_time = s ?? null;
      dataResolved.end_time = e ?? null;

      // 進行中かどうかを確認
      let useAsCurrent = false;
      try {
        const ad = Boolean((dataResolved as any).is_all_day); // eslint-disable-line @typescript-eslint/no-explicit-any
        const nowMs = t;
        if (ad && s) {
          const ds = new Date(now);
          ds.setHours(0,0,0,0);
          const de = new Date(ds);
          de.setDate(de.getDate() + 1);
          const sm = new Date(s).getTime();
          useAsCurrent = sm >= ds.getTime() && sm < de.getTime();
        } else if (s && e) {
          const sm = new Date(s).getTime();
          const em = new Date(e).getTime();
          useAsCurrent = Number.isFinite(sm) && Number.isFinite(em) && nowMs >= sm && nowMs < em;
        } else if (s && !e) {
          const sm = new Date(s).getTime();
          const SIX_HOURS = 6 * 60 * 60 * 1000;
          const sortedByStart = sorted
            .filter((x: any) => x.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
            .map((x: any) => ({ it: x, st: new Date(x.start_time as any).getTime() })) // eslint-disable-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => a.st - b.st); // eslint-disable-line @typescript-eslint/no-explicit-any
          const idx = sortedByStart.findIndex((y: any) => String(y?.it?.id) === oid); // eslint-disable-line @typescript-eslint/no-explicit-any
          const next = idx >= 0 ? sortedByStart.slice(idx + 1).find((y: any) => y.st > sm) : null; // eslint-disable-line @typescript-eslint/no-explicit-any
          const upper = next?.st ?? (sm + SIX_HOURS);
          useAsCurrent = nowMs >= sm && nowMs < upper;
        }
      } catch { /* ignore */ }

      const filtered = ongoing.filter((it: any) => String(it?.id) !== oid); // eslint-disable-line @typescript-eslint/no-explicit-any
      // 終日非表示設定なら除外
      if ((dataResolved as any).is_all_day && !np.showAllDayAsNow) { // eslint-disable-line @typescript-eslint/no-explicit-any
        result = filtered;
      } else {
        result = useAsCurrent ? [dataResolved, ...filtered] : filtered;
      }
    }

    return NextResponse.json(
      { ok: true, items: result, count: result.length, meta: { manualUpdatedAt: manual.updatedAt, override: Boolean(override.enabled) } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
