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
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-cyan-400/10 to-indigo-400/10 blur-xl rounded-2xl" aria-hidden />
        <div className="relative backdrop-blur bg-white/6 text-white rounded-xl border border-white/15 shadow-lg overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-[11px] text-white/80">次の予定のキュー</div>
                {!queueExpanded && (
                  <div className="text-xs text-white/80 truncate mt-0.5">
                    {queue && queue.length > 0 ? (
                      <>
                        <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-white/70 text-black text-[10px] font-bold ring-2 ring-white/30">次</span>
                        <span className="font-medium">{previewTitle}</span>
                        <span className="ml-2">{previewTime}</span>
                      </>
                    ) : (
                      <span>（キューなし）</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* 上部トグルは折り畳み時のみ表示 */}
            {!queueExpanded && (
              <div className="mt-1 relative py-1">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <button
                  type="button"
                  onClick={() => setQueueExpanded(true)}
                  aria-label={'キューを展開する'}
                  className="relative z-10 mx-auto block w-10 h-10 rounded-full backdrop-blur bg-white/10 border border-white/20 shadow-sm hover:bg-white/15 hover:shadow transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <svg viewBox="0 0 24 24" className={`mx-auto h-5 w-5 text-white/80 transition-transform duration-300`} role="img" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
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
                      <div key={String((q as any)?.id ?? i)} className={`rounded-lg bg-white/8 p-3 border border-white/10`}> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 text-black text-[10px] font-bold ring-2 ring-white/30">{i === 0 ? '次' : '予'}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-semibold`}>{(q as any)?.event || '(no title)'}</div> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                            <div className={`text-xs text-white/80`}>{formatHM((q as any)?.start_time)}{(q as any)?.end_time ? ` ~ ${formatHM((q as any)?.end_time)}` : ''}</div> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                          </div>
                        </div>
                        {(q as any)?.description && <div className="mt-1 text-xs text-white/80 line-clamp-2">{(q as any)?.description}</div>} {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      </div>
                    ))}
                  </div>
                  {/* 下部トグル（横ライン + 中央丸ボタン, 上向き） */}
                  <div className="mt-2 relative py-1">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    <button
                      type="button"
                      onClick={() => setQueueExpanded(false)}
                      aria-label="キューを折り畳む"
                      className="relative z-10 mx-auto block w-10 h-10 rounded-full backdrop-blur bg-white/10 border border-white/20 shadow-sm hover:bg-white/15 hover:shadow transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5 text-white/80 transition-transform duration-300 rotate-180" role="img" aria-hidden="true">
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
            <div className="backdrop-blur-xl bg-white/10 text-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-start gap-4">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-300 text-black text-sm font-extrabold ring-4 ring-slate-300/20">待</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80">現在進行中の予定はありません</div>
                  <div className="text-lg md:text-xl font-bold tracking-tight truncate">次の予定をお待ちください</div>
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
                  <div key={String((it as any)?.id ?? idx)} className="backdrop-blur-xl bg-white/10 text-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden">{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                    <div className="px-5 py-4 flex items-start gap-4">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-300 text-black text-sm font-extrabold ring-4 ring-yellow-300/20">今</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80">現在進行中の予定</div>
                        <div className="text-lg md:text-xl font-bold tracking-tight truncate">{it?.event || '(no title)'}</div>
                        <div className="text-xs md:text-sm text-white/80 mt-0.5">{tStr}</div>
                        {it?.description && <div className="text-xs md:text-sm text-white/80 mt-1 line-clamp-2">{it?.description}</div>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="backdrop-blur-xl bg-white/10 text-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-300 text-black text-sm font-extrabold ring-4 ring-slate-300/20">待</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80">現在進行中の予定はありません</div>
                    <div className="text-lg md:text-xl font-bold tracking-tight truncate">次の予定をお待ちください</div>
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
          <div className="backdrop-blur-xl bg-white/10 text-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-300 text-black text-sm font-extrabold ring-4 ring-yellow-300/20">今</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80">現在進行中の予定</div>
                <div className="text-lg md:text-xl font-bold tracking-tight truncate">{item.event || '(no title)'}</div>
                <div className="text-xs md:text-sm text-white/80 mt-0.5">{timeStr}</div>
                {item.description && <div className="text-xs md:text-sm text-white/80 mt-1 line-clamp-2">{item.description}</div>}
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
