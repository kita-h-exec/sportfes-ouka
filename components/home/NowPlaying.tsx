"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type NowItem = {
  id?: string | number;
  event?: string;
  description?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
} | null;

function formatHM(iso?: string | null) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return ''; }
}

export default function NowPlaying({ isScrolled }: { isScrolled?: boolean }) {
  const [item, setItem] = useState<NowItem>(null);
  const [nextItem, setNextItem] = useState<NowItem>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ showAllOngoing: boolean; hiddenIds: Array<string | number> } | null>(null);
  const [ongoingList, setOngoingList] = useState<NowItem[]>([]);
  const [queue, setQueue] = useState<NowItem[]>([]);
  const [queueExpanded, setQueueExpanded] = useState<boolean>(() => {
    try { return localStorage.getItem('np_queue_expanded') === '1'; } catch { return false; }
  });

  async function fetchCurrent() {
    try {
      const res = await fetch('/api/schedules/current', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) { setItem(json.data || null); setNextItem(json.next || null); } else setError(json.error || 'error');
    } catch (e: any) { setError(e?.message || 'network'); } finally { setLoading(false); }
  }

  async function fetchSettingsAndOngoing() {
    try {
      const res = await fetch('/api/now-playing', { cache: 'no-store' });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        const st = { showAllOngoing: Boolean(j.data?.showAllOngoing), hiddenIds: Array.isArray(j.data?.hiddenIds) ? j.data.hiddenIds : [] };
        setSettings(st);
      }
    } catch {/* ignore */}
    // 進行中一覧
    try {
      const res2 = await fetch('/api/schedules/current/all', { cache: 'no-store' });
      const j2 = await res2.json().catch(() => null);
      if (res2.ok && j2?.ok) {
        setOngoingList(Array.isArray(j2.items) ? j2.items : []);
      } else if (Array.isArray(j2?.items)) {
        setOngoingList(j2.items);
      }
    } catch {/* ignore */}
    // キュー（今後の予定）: 展開時は3件、折り畳み時は1件
    try {
      const lim = queueExpanded ? 3 : 1;
      const res3 = await fetch(`/api/schedules/upcoming?limit=${lim}`, { cache: 'no-store' });
      const j3 = await res3.json().catch(() => null);
      if (res3.ok && j3?.ok) setQueue(Array.isArray(j3.items) ? j3.items : []);
    } catch {/* ignore */}
  }

  useEffect(() => {
    fetchCurrent();
    fetchSettingsAndOngoing();
    const id = setInterval(() => { fetchCurrent(); fetchSettingsAndOngoing(); }, 60_000); // 1min update
    return () => clearInterval(id);
  }, []);

  // 設定がOFFなら一覧を空に
  useEffect(() => {
    if (!settings?.showAllOngoing) setOngoingList([]);
  }, [settings?.showAllOngoing]);

  // 展開状態が変わったら保存し再取得
  useEffect(() => {
    try { localStorage.setItem('np_queue_expanded', queueExpanded ? '1' : '0'); } catch {}
    (async () => {
      try {
        const lim = queueExpanded ? 3 : 1;
        const res = await fetch(`/api/schedules/upcoming?limit=${lim}`, { cache: 'no-store' });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) setQueue(Array.isArray(j.items) ? j.items : []);
      } catch {/* ignore */}
    })();
  }, [queueExpanded]);

  // compact 表示は廃止（展開/縮小のみ）
  // queue 展開状態の保存（上の副作用で同時に保存済み）

  // 共通: キューセクション（折り畳み/展開）
  function QueueSection() {
    const first = queue?.[0] || null;
    const previewTitle = (first as any)?.event || '(no title)'; // eslint-disable-line @typescript-eslint/no-explicit-any
    const previewTime = `${formatHM((first as any)?.start_time)}${(first as any)?.end_time ? ` ~ ${formatHM((first as any)?.end_time)}` : ''}`; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <div className="relative">
        <div className="relative backdrop-blur-md bg-black/55 text-white rounded-xl border border-white/10 shadow-xl overflow-hidden">
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-white/80">次の予定のキュー</div>
                {!queueExpanded && (
                  <div className="text-xs text-white/90 truncate mt-0.5 flex items-center gap-2">
                    {queue && queue.length > 0 ? (
                      <>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold">次</span>
                        <span className="font-semibold truncate">{previewTitle}</span>
                        <span className="shrink-0 text-white/80">{previewTime}</span>
                      </>
                    ) : (
                      <span className="text-white/70">（キューなし）</span>
                    )}
                  </div>
                )}
              </div>
              {/* 右側の小さなトグルボタン */}
              {!queueExpanded && (
                <button
                  type="button"
                  onClick={() => setQueueExpanded(true)}
                  aria-label={'キューを展開する'}
                  className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-white/90"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" role="img" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {queueExpanded && queue && queue.length > 0 && (
                <motion.div
                  key="queue-expanded"
                  initial={{ height: 0, opacity: 0, y: -6 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="overflow-hidden"
                >
                  <div className={`mt-3 grid grid-cols-1 md:grid-cols-3 gap-3`}>
                    {queue.map((q, i) => (
                      <div key={String((q as any)?.id ?? i)} className={`rounded-lg bg-black/40 p-3 border border-white/10`}> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-black text-[10px] font-bold">{i === 0 ? '次' : '予'}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-semibold`}>{(q as any)?.event || '(no title)'}</div> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                            <div className={`text-xs text-white/80`}>{formatHM((q as any)?.start_time)}{(q as any)?.end_time ? ` ~ ${formatHM((q as any)?.end_time)}` : ''}</div> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                          </div>
                        </div>
                        {(q as any)?.description && <div className="mt-1 text-xs text-white/80 line-clamp-2">{(q as any)?.description}</div>} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      </div>
                    ))}
                  </div>
                  {/* 右上の折り畳みトグル */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setQueueExpanded(false)}
                      aria-label="キューを折り畳む"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-white/90"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 rotate-180" role="img" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return null;
  // 進行中がないとき: メッセージ + キュー（折り畳み）
  if (!item) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isScrolled ? 0 : 1, y: isScrolled ? 8 : 0 }}
          transition={{ duration: 0.25 }}
          className="fixed left-0 right-0 bottom-16 md:bottom-24 z-30"
        >
          <div className="max-w-6xl mx-auto px-4 space-y-3 pb-[env(safe-area-inset-bottom)]">
            <div className="backdrop-blur-md bg-black/60 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-start gap-4">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-300 text-black text-sm font-extrabold ring-4 ring-slate-300/20">待</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90">現在進行中の予定はありません</div>
                  <div className="text-lg md:text-xl font-bold tracking-tight truncate text-white">次の予定をお待ちください</div>
                </div>
              </div>
            </div>
            {/* キュー（折り畳み/展開） */}
            <QueueSection />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const timeStr = item.is_all_day ? '終日' : `${formatHM(item.start_time)}${item.end_time ? ` ~ ${formatHM(item.end_time)}` : ''}`;

  // 進捗率（開始/終了がある場合のみ）
  function ProgressBar({ start, end }: { start?: string | null; end?: string | null }) {
    if (!start || !end) return null;
    let pct = 0;
    let s = 0, e = 0, now = Date.now();
    try {
      s = new Date(start).getTime();
      e = new Date(end).getTime();
      if (e > s) pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
    } catch {/* ignore */}
    const labelStart = formatHM(start);
    const labelEnd = formatHM(end);
    const labelNow = formatHM(new Date(now).toISOString());
    return (
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-white/75 mb-1">
          <span>{labelStart}</span>
          <span>{labelEnd}</span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden" aria-label={`開始 ${labelStart} / 現在 ${labelNow} / 終了 ${labelEnd}`}>
          {/* 白が左から右へ満ちる */}
          <div className="h-full bg-white" style={{ width: `${pct}%` }} />
          {/* 現在位置マーカー（視認性のため黄色） */}
          <div className="absolute top-0 bottom-0" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
            <div className="w-0.5 h-2 bg-yellow-300" />
          </div>
        </div>
      </div>
    );
  }

  // 全件表示ON時: 一覧 + キュー
  if (settings?.showAllOngoing) {
    const hidden = new Set((settings.hiddenIds || []).map((x: any) => String(x))); // eslint-disable-line @typescript-eslint/no-explicit-any
    const list = (ongoingList || []).filter(x => x && !hidden.has(String((x as any)?.id))); // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isScrolled ? 0 : 1, y: isScrolled ? 8 : 0 }}
          transition={{ duration: 0.25 }}
          className="fixed left-0 right-0 bottom-16 md:bottom-24 z-30"
        >
          <div className="max-w-6xl mx-auto px-4 space-y-3 pb-[env(safe-area-inset-bottom)]">
            {list.length > 0 ? (
              list.map((it, idx) => {
                const tStr = it?.is_all_day ? '終日' : `${formatHM(it?.start_time)}${it?.end_time ? ` ~ ${formatHM(it?.end_time)}` : ''}`;
                return (
                  <div key={String((it as any)?.id ?? idx)} className="backdrop-blur-md bg-black/60 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                    <div className="px-5 py-4 flex items-start gap-4">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-300 text-black text-sm font-extrabold ring-4 ring-yellow-300/20">今</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/90">現在進行中の予定</div>
                        <div className="text-lg md:text-xl font-bold tracking-tight truncate text-white">{it?.event || '(no title)'}</div>
                        <div className="text-xs md:text-sm text-white/85 mt-0.5">{tStr}</div>
                        {it?.description && <div className="text-xs md:text-sm text-white/80 mt-1 line-clamp-2">{it?.description}</div>}
                        <ProgressBar start={it?.start_time ?? null} end={it?.end_time ?? null} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="backdrop-blur-md bg-black/60 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-300 text-black text-sm font-extrabold ring-4 ring-slate-300/20">待</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/90">現在進行中の予定はありません</div>
                    <div className="text-lg md:text-xl font-bold tracking-tight truncate text-white">次の予定をお待ちください</div>
                  </div>
                </div>
              </div>
            )}

            {/* キュー（折り畳み/展開） */}
            <QueueSection />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isScrolled ? 0 : 1, y: isScrolled ? 8 : 0 }}
        transition={{ duration: 0.25 }}
        className="fixed left-0 right-0 bottom-16 md:bottom-24 z-30"
      >
        <div className="max-w-6xl mx-auto px-4 space-y-3 pb-[env(safe-area-inset-bottom)]">
          {/* Now (大きめ、上寄せ) */}
          <div className="backdrop-blur-md bg-black/60 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-300 text-black text-sm font-extrabold ring-4 ring-yellow-300/20">今</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90">現在進行中の予定</div>
                <div className="text-lg md:text-xl font-bold tracking-tight truncate text-white">{item.event || '(no title)'}</div>
                <div className="text-xs md:text-sm text-white/85 mt-0.5">{timeStr}</div>
                {item.description && <div className="text-xs md:text-sm text-white/80 mt-1 line-clamp-2">{item.description}</div>}
                <ProgressBar start={item.start_time ?? null} end={item.end_time ?? null} />
              </div>
            </div>
          </div>

          {/* キュー（折り畳み/展開） */}
          <QueueSection />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
