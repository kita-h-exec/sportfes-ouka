import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';
import { readManualOrder, readOverride, readNowPlayingSettings } from '@/lib/scheduleStore';

export const runtime = 'nodejs';
export const revalidate = 0;

// --- Time helpers (assume Directus times are in Asia/Tokyo when no TZ is present)
const JST_OFFSET = 9 * 60 * 60 * 1000;
function parseJst(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const hasTz = /[zZ]$|([\+\-]\d{2}:?\d{2})$/.test(ts);
  if (hasTz) {
    const t = new Date(ts).getTime();
    return Number.isFinite(t) ? t : null;
  }
  // Parse as "YYYY-MM-DDTHH:mm:ss" in JST
  const [datePart, timePartRaw] = ts.split(/[T ]/);
  if (!datePart) return null;
  const [yStr, mStr, dStr] = datePart.split('-');
  const timePart = timePartRaw || '00:00:00';
  const [hhStr = '0', mmStr = '0', ssStr = '0'] = timePart.split(':');
  const y = Number(yStr), m = Number(mStr), d = Number(dStr);
  const hh = Number(hhStr), mm = Number(mmStr), ss = Number(String(ssStr).split('.')[0]);
  if ([y, m, d, hh, mm, ss].some(n => Number.isNaN(n))) return null;
  // Convert JST to UTC epoch by subtracting 9 hours
  return Date.UTC(y, (m - 1), d, hh - 9, mm, ss, 0);
}
function jstDayRangeMs(now: Date): { start: number; end: number } {
  // Compute JST midnight range [start, end)
  const jstNow = new Date(now.getTime() + JST_OFFSET);
  jstNow.setHours(0, 0, 0, 0);
  const start = jstNow.getTime() - JST_OFFSET;
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

function pickOngoing(items: any[], now = new Date()) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = now.getTime();
  // ソート前提: start_time 昇順を想定（呼び出し元で整列済み）
  const withTimes = items
    .filter((it) => !it.is_all_day)
    .map((it) => {
      const s = parseJst(it.start_time);
      const eRaw = parseJst(it.end_time);
      const e = (s && eRaw && eRaw <= s) ? null : eRaw; // e<=s は無効化（s-only 扱い）
      return { it, s, e };
    });

  // 1) s,e 両方ある → s <= now < e（終了時刻は排他的に扱う）
  const ongoingSE = withTimes.filter(x => x.s && x.e && t >= (x.s as number) && t < (x.e as number));
  if (ongoingSE.length > 0) {
    ongoingSE.sort((a, b) => (a.e as number) - (b.e as number));
    return ongoingSE[0].it;
  }

  // 2) e のみ（開始不明）は「今」を判定できないため除外

  // 3) s のみ → s <= now < nextStart（次の開始が来るまで継続中とみなす, 上限6h）
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const startOnly = withTimes.filter(x => x.s && !x.e);
  if (startOnly.length > 0) {
    // nextStart を求めるため、start_time 昇順配列を作る
    const sortedByStart = withTimes
      .filter(x => x.s)
      .sort((a, b) => (a.s as number) - (b.s as number));

    for (const x of startOnly) {
      const idx = sortedByStart.findIndex(y => y.it === x.it);
      // 同時刻開始は「次の開始」とみなさない（厳密に後の開始のみ）
      const next = idx >= 0 ? sortedByStart.slice(idx + 1).find(y => y.s && (y.s as number) > (x.s as number)) : null;
      const nextStart = next?.s ?? null;
      const upperBound = nextStart ?? ((x.s as number) + SIX_HOURS);
      if (t >= (x.s as number) && t < upperBound) {
        return x.it;
      }
    }
  }

  // 4) 進行中が見つからない場合のフォールバック: 当日の終日イベントがあれば「今」とみなす
  try {
    // 呼び出し側で終日の扱いを制御しているが、受け取った配列が終日しかない場合はここで選出
    const { start: dayStartMs, end: dayEndMs } = jstDayRangeMs(now);
    const allDayToday = items
      .filter((it: any) => it && it.is_all_day && it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({ it, s: parseJst(it.start_time) })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: any) => x.s >= dayStartMs && x.s < dayEndMs) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.s - b.s) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (allDayToday.length > 0) return allDayToday[0];
  } catch { /* ignore */ }

  // 進行中がない場合は null（未来は next で返す）
  return null;
}

export async function GET(_req: NextRequest) {
  try {
    // 手動上書き（最優先でチェック）
    const manual = readManualOrder();
    const override = readOverride();
    const np = readNowPlayingSettings();
    const now = new Date();
    const nowRounded = new Date(now);
    nowRounded.setSeconds(0, 0); // 分単位で比較
    const t = nowRounded.getTime();

  if (override.enabled && override.item) {
      // override が有効な場合は Directus を用いて next と、足りない時間情報を補完
      let nextItem: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      let dataResolved: any = { ...(override.item as any) }; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const items = await getSchedules();
        const sorted = items.slice().sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const as = parseJst(a.start_time) ?? 0;
          const bs = parseJst(b.start_time) ?? 0;
          return as - bs;
        });
        const upcoming = sorted
          .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((it: any) => ({ it, st: parseJst(it.start_time) as number })) // eslint-disable-line @typescript-eslint/no-explicit-any
          .filter((x: any) => x.st >= t) // eslint-disable-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any
        const idx = upcoming.findIndex((u: any) => String(u.id) === String((override.item as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
        nextItem = idx >= 0 ? (upcoming[idx + 1] || null) : (upcoming[0] || null);

  // 時刻補完: 上書きの start/end が欠けていれば、対応するスケジュール or next から補う
        const same = sorted.find((s: any) => String(s?.id) === String((override.item as any)?.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
  let s: string | null | undefined = (dataResolved.start_time as any) ?? (same?.start_time as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  let e: string | null | undefined = (dataResolved.end_time as any) ?? (same?.end_time as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        if (!e && s && nextItem?.start_time) {
          const sMs = parseJst(s) as number;
          const nMs = parseJst(nextItem.start_time) as number;
          if (Number.isFinite(sMs) && Number.isFinite(nMs) && nMs > sMs) e = nextItem.start_time;
        }
        if (!e && s) {
          // fallback: +6h ウィンドウ
          try { e = new Date(new Date(s).getTime() + 6 * 60 * 60 * 1000).toISOString(); } catch {/* ignore */}
        }
        if (!s && e) {
          // fallback: -1h ウィンドウ
          try { s = new Date(new Date(e).getTime() - 60 * 60 * 1000).toISOString(); } catch {/* ignore */}
        }
        dataResolved.start_time = s ?? null;
        // e<=s のデータ異常を正規化
        try {
          if (s && e) {
            const sm = new Date(s).getTime();
            const em = new Date(e).getTime();
            if (Number.isFinite(sm) && Number.isFinite(em) && em <= sm) e = null;
          }
        } catch { /* ignore */ }
        dataResolved.end_time = e ?? null;
  // 進行中のときだけ data として返す（過去に居座らないように）
        let useAsCurrent = false;
        try {
          const ad = Boolean((dataResolved as any).is_all_day); // eslint-disable-line @typescript-eslint/no-explicit-any
          const nowMs = t;
          if (ad && s) {
            const { start: ds, end: de } = jstDayRangeMs(now);
            const sm = parseJst(s) as number;
            useAsCurrent = sm >= ds && sm < de;
          } else if (s && e) {
            const sm = parseJst(s) as number;
            const em = parseJst(e) as number;
            useAsCurrent = Number.isFinite(sm) && Number.isFinite(em) && nowMs >= sm && nowMs < em;
          } else if (s && !e) {
            // s-only の場合は、次の開始(or s+6h)まで
            const sm = parseJst(s) as number;
            const SIX_HOURS = 6 * 60 * 60 * 1000;
            const sortedByStart = sorted
              .filter((x: any) => x.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
              .map((x: any) => ({ it: x, st: parseJst(x.start_time as any) as number })) // eslint-disable-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => a.st - b.st); // eslint-disable-line @typescript-eslint/no-explicit-any
            const idx = sortedByStart.findIndex((y: any) => String(y?.it?.id) === String((dataResolved as any)?.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
            const next = idx >= 0 ? sortedByStart.slice(idx + 1).find((y: any) => y.st > sm) : null; // eslint-disable-line @typescript-eslint/no-explicit-any
            const upper = next?.st ?? (sm + SIX_HOURS);
            useAsCurrent = nowMs >= sm && nowMs < upper;
          }
        } catch { /* ignore */ }
        // 設定に従い終日の扱いを変更
        if ((dataResolved as any).is_all_day && !np.showAllDayAsNow) { // eslint-disable-line @typescript-eslint/no-explicit-any
          useAsCurrent = false;
        }

        if (!useAsCurrent) {
          // 進行中でない/終日非表示設定のときは、通常の現在判定にフォールバック
          const items = await getSchedules();
          const sorted2 = items.slice().sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const as = parseJst(a.start_time) ?? 0;
            const bs = parseJst(b.start_time) ?? 0;
            return as - bs;
          });
          const current2 = pickOngoing(sorted2, nowRounded);
          const upcoming2 = sorted2
            .filter((it: any) => it.start_time)
            .map((it: any) => ({ it, st: parseJst(it.start_time) as number }))
            .filter((x: any) => x.st >= t)
            .sort((a: any, b: any) => a.st - b.st)
            .map((x: any) => x.it);
          let next2: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (current2) {
            const idx2 = upcoming2.findIndex((u: any) => String(u.id) === String((current2 as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
            next2 = idx2 >= 0 ? (upcoming2[idx2 + 1] || null) : (upcoming2[0] || null);
          } else {
            next2 = upcoming2[0] || null;
          }
          return NextResponse.json(
            { ok: true, data: current2, next: next2, meta: { manualUpdatedAt: manual.updatedAt, override: false } },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
          );
        }
      } catch {
        // Directus 利用不可でも、最低限データは返す
        nextItem = null;
      }
      return NextResponse.json(
        { ok: true, data: dataResolved, next: nextItem, meta: { manualUpdatedAt: manual.updatedAt, override: true } },
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
        const as = parseJst(a.start_time) ?? 0;
        const bs = parseJst(b.start_time) ?? 0;
        return as - bs;
      });
    }

  // 終日を「今」として扱うかは設定に従う
  const baseForPick = np.showAllDayAsNow ? sorted : sorted.filter((it: any) => !it.is_all_day); // eslint-disable-line @typescript-eslint/no-explicit-any
  const current = pickOngoing(baseForPick, nowRounded);

    // 次の候補（1件）
    const upcoming = sorted
      .filter((it: any) => it.start_time) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((it: any) => ({ it, st: parseJst(it.start_time) as number })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: any) => x.st >= t) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.st - b.st) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((x: any) => x.it); // eslint-disable-line @typescript-eslint/no-explicit-any

    let nextItem: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (current) {
      const idx = upcoming.findIndex((u: any) => String(u.id) === String((current as any).id)); // eslint-disable-line @typescript-eslint/no-explicit-any
      nextItem = idx >= 0 ? (upcoming[idx + 1] || null) : (upcoming[0] || null);
    } else {
      // 進行中が無ければ最短の将来イベントを next として返す
      nextItem = upcoming[0] || null;
    }

    return NextResponse.json(
      { ok: true, data: current, next: nextItem, meta: { manualUpdatedAt: manual.updatedAt, override: false } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
