'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgramItem {
  start: string; // "HH:MM"
  end?: string;  // optional end
  title: string;
  note?: string; // sub description
  group?: string; // grouping / indentation label
}

interface DayProgram {
  dateLabel: string; // e.g. "1日目 9月19日(金)"
  items: ProgramItem[];
}

const programs: DayProgram[] = [
  {
    dateLabel: '1日目 9月19日(金)',
    items: [
      { start: '7:20', title: '更衣室解放' },
      { start: '7:30', title: '作業開始' },
      { start: '8:20', end: '8:30', title: 'SHR' },
      { start: '8:30', end: '8:45', title: '開会式' },
      { start: '8:45', end: '9:05', title: '準備・休憩' },
      { start: '9:05', end: '9:35', title: 'SCAT' },
      { start: '9:35', end: '9:45', title: '移動' },
      { start: '9:45', end: '10:00', title: 'もぎたま' },
      { start: '10:00', end: '10:20', title: '休憩 / 準備' },
      { start: '10:20', end: '10:45', title: '団対助熱' },
      { start: '10:45', end: '15:20', title: '作業' },
      { start: '15:20', end: '15:30', title: 'SHR' },
      { start: '15:30', title: '作業 (下校可能)' },
    ],
  },
  {
    dateLabel: '2日目 9月20日(土)',
    items: [
      { start: '7:20', title: '更衣室解放' },
      { start: '7:30', title: '作業開始' },
      { start: '8:10', end: '8:15', title: 'SHR' },
      { start: '8:15', end: '8:25', title: '中間発表' },
      { start: '8:25', end: '8:45', title: '準備・休憩', },
      { start: '8:45', end: '10:05', title: 'ST' },
      { start: '10:05', end: '10:25', title: '休憩 / 準備' },
      { start: '10:25', end: '11:05', title: '綱引き' },
      { start: '11:05', end: '11:20', title: '休憩 / 準備' },
      { start: '11:20', end: '11:25', title: 'スウェーデンリレー' },
      { start: '11:25', end: '12:25', title: '昼休み / デコ解放' },
      { start: '12:25', end: '12:35', title: '七長ダンス' },
      { start: '12:35', end: '12:50', title: '閉会式' },
      { start: '12:50', end: '13:10', title: '記念撮影 / 休憩' },
      { start: '13:10', title: 'デコ解体', note: '※凸の資源回収14:00〜' },
      { start: '19:00', title: '完全下校' },
    ],
  },
];

export default function ProgramPage() {
  const [activeDay, setActiveDay] = useState(0);
  // 今日が9/19かどうか（monthは0始まりなので9月は8）
  const isSep19Today = (() => {
    const now = new Date();
    return now.getMonth() === 8 && now.getDate() === 19;
  })();
  // programs内の9/19のインデックスを取得（表示切替用）
  const sep19Index = programs.findIndex((d) => d.dateLabel.includes('9月19日'));

  // 強制的に背景を常時ブラーさせる
  useEffect(() => {
    const bg = document.getElementById('background-image');
    if (bg) {
      const prev = bg.style.filter;
      bg.style.filter = 'blur(14px) brightness(0.85)';
      return () => { bg.style.filter = prev; };
    }
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 md:px-10 relative">
      {/* 半透明 & backdrop で読みやすさ確保 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-white drop-shadow mb-10 tracking-wide">
          プログラム
        </h1>
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {programs.map((d, i) => (
            <button
              key={d.dateLabel}
              onClick={() => setActiveDay(i)}
              className={`relative px-6 py-3 rounded-full text-sm md:text-base font-semibold transition-all backdrop-blur-md border ${(i===activeDay?'bg-white/90 text-gray-900 shadow-xl':'bg-white/15 hover:bg-white/25 text-white border-white/30')}`}
            >
              {d.dateLabel}
              {d.dateLabel.includes('9月19日') && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-600/90 text-white px-2 py-0.5 text-[10px] leading-none tracking-wider shadow-sm">
                  来場不可
                </span>
              )}
              {i===activeDay && (
                <motion.span layoutId="dayIndicator" className="absolute inset-0 rounded-full border-2 border-fuchsia-500 pointer-events-none" style={{ boxShadow: '0 0 0 4px rgba(236,72,153,0.25)' }} />
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          {activeDay === sep19Index && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/15 text-red-200 px-4 py-3 text-sm md:text-base">
              {isSep19Today ? '本日は来場を受け付けていません。' : '9/19日は来場を受け付けていません。'}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.ul
              key={activeDay}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {programs[activeDay].items.map((item, idx) => {
                // 持続時間計算
                let duration: string | null = null;
                if (item.end) {
                  const [sh, sm] = item.start.split(':').map(Number);
                  const [eh, em] = item.end.split(':').map(Number);
                  const mins = (eh * 60 + em) - (sh * 60 + sm);
                  if (mins > 0) duration = `${mins}分`;
                }
                return (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group relative overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl px-5 py-4 flex gap-4 items-start shadow-[0_4px_24px_-6px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_32px_-6px_rgba(0,0,0,0.6)] hover:border-fuchsia-400/60 transition-all"
                  >
                    <div className="w-24 shrink-0 text-right font-mono text-sm md:text-base leading-tight text-fuchsia-200/90">
                      <span>{item.start}</span>
                      {item.end && <><span className="mx-1 text-fuchsia-300">~</span><span>{item.end}</span></>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg md:text-xl tracking-wide text-white drop-shadow-sm flex items-center gap-2">
                        {item.title}
                        {duration && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40">{duration}</span>}
                      </p>
                      {(item.note) && <p className="text-sm md:text-base text-fuchsia-100/90 mt-0.5 whitespace-pre-line">{item.note}</p>}
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-fuchsia-500/10 via-transparent to-transparent pointer-events-none" />
                  </motion.li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
        </div>

        <p className="mt-10 text-xs text-center text-white/60 tracking-wide">※ 一部表記は判読に基づく暫定名称です / 時刻・内容は変更になる可能性があります</p>
      </motion.div>
    </div>
  );
}
