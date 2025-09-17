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

  async function fetchCurrent() {
    try {
      const res = await fetch('/api/schedules/current', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) { setItem(json.data || null); setNextItem(json.next || null); } else setError(json.error || 'error');
    } catch (e: any) { setError(e?.message || 'network'); } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchCurrent();
    const id = setInterval(fetchCurrent, 60_000); // 1min update
    return () => clearInterval(id);
  }, []);

  if (loading) return null;
  if (!item) return null;

  const timeStr = item.is_all_day ? '終日' : `${formatHM(item.start_time)}${item.end_time ? ` ~ ${formatHM(item.end_time)}` : ''}`;

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

          {/* Queue (1枚、薄いガラス風) */}
          {nextItem && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-cyan-400/10 to-indigo-400/10 blur-xl rounded-2xl" aria-hidden />
              <div className="relative backdrop-blur bg-white/6 text-white rounded-xl border border-white/15 shadow-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 text-black text-[10px] font-bold ring-2 ring-white/30">次</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/80">次の予定</div>
                    <div className="text-sm font-semibold truncate">{nextItem.event || '(no title)'}</div>
                  </div>
                  <div className="text-xs text-white/80 shrink-0">{formatHM(nextItem.start_time)}{nextItem.end_time ? ` ~ ${formatHM(nextItem.end_time)}` : ''}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
