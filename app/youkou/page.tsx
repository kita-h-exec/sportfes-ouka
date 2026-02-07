"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

// 外部MediaWikiページをタブで埋め込み表示するページ
// 競技要項 / 減点要項 を iframe で最大表示領域に。
// X-Frame-Options により埋め込み拒否された場合のフォールバックリンクも表示。

type Tab = 'genten' | 'kyougi';

const SOURCES: Record<Tab, { url: string; label: string } > = {
  genten: {
    url: 'https://studio.cloudfree.jp/mediawiki/wiki/R7%E3%81%86%E3%82%93%E3%81%A9%E3%81%86%E4%BC%9A%E6%B8%9B%E7%82%B9%E8%A6%81%E9%A0%85',
    label: '減点要項'
  },
  kyougi: {
    url: 'https://studio.cloudfree.jp/mediawiki/wiki/R7%E3%81%86%E3%82%93%E3%81%A9%E3%81%86%E4%BC%9A%E7%AB%B6%E6%8A%80%E8%A6%81%E9%A0%85',
    label: '競技要項'
  }
};

export default function YoukouPage() {
  // 初期表示を減点要項へ
  const [tab, setTab] = useState<Tab>('genten');
  const [blocked, setBlocked] = useState<Record<Tab, boolean>>({ genten: false, kyougi: false });
  const [loading, setLoading] = useState<Record<Tab, boolean>>({ genten: true, kyougi: true });
  const [headerHeight, setHeaderHeight] = useState<number>(120);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ページ滞在中は本体スクロールを無効化
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // ヘッダー高さを取得し変化を監視（告知バーが後から挿入されるケース対応）
  useEffect(() => {
    const headerEl = document.querySelector('header');
    if (!headerEl) return;
    const update = () => setHeaderHeight(headerEl.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerEl);
    resizeObserverRef.current = ro;
    // 遅延で変わる場合も再計測
    const t = setTimeout(update, 800);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  // iframe の onLoad / onError が cross origin では拾いづらいので timeout による判定を併用
  useEffect(() => {
    // 選択タブの初回読み込みタイマー
    const current = tab;
    if (!loading[current]) return;
    const timer = setTimeout(() => {
      // 読み込み完了イベント来ない場合でも、とりあえずローディング解除。
      setLoading(prev => ({ ...prev, [current]: false }));
    }, 8000);
    return () => clearTimeout(timer);
  }, [tab, loading]);

  const markLoaded = useCallback((t: Tab) => {
    setLoading(prev => ({ ...prev, [t]: false }));
  }, []);

  const markBlocked = useCallback((t: Tab) => {
    setLoading(prev => ({ ...prev, [t]: false }));
    setBlocked(prev => ({ ...prev, [t]: true }));
  }, []);

  return (
    <>
      {/* 背景全面ブラーオーバーレイ（要項ページ専用） */}
      <div
        className="fixed inset-0 z-[5] backdrop-blur-2xl saturate-150 bg-white/30 dark:bg-black/40 pointer-events-none"
        aria-hidden
      />
      <div
        className="relative z-10 w-full h-screen flex flex-col select-none"
        style={{ paddingTop: headerHeight }}
      >
      {/* タブバー */}
      <div className="shrink-0 px-4 pb-2 pt-3 flex items-center justify-between gap-4 bg-gradient-to-b from-white/80 to-white/50 dark:from-black/50 dark:to-black/30 backdrop-blur-xl border-b border-white/50 dark:border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            {(Object.keys(SOURCES) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative mx-0.5 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400/60 ${
                  tab === t
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-700/70 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {SOURCES[t].label}
              </button>
            ))}
          </div>
          <a
            href={SOURCES[tab].url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm underline decoration-white/40 text-gray-800 dark:text-white/80 hover:text-gray-900 dark:hover:text-white"
          >新しいタブで開く ↗</a>
        </div>
      </div>
      {/* iframe コンテンツ */}
      <div className="flex-1 relative bg-white dark:bg-black/90">
        {loading[tab] && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-700 dark:text-gray-200 text-sm z-10 bg-white/70 dark:bg-black/70 backdrop-blur-lg">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.1s]"></span>
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></span>
            </div>
            <p>{SOURCES[tab].label} を読み込み中...</p>
          </div>
        )}
        {blocked[tab] ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center">
            <div>
              <p className="font-semibold text-lg mb-2">埋め込みをブロックしました</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                外部サイトの設定により iframe で表示できません。上部リンクから直接ページを開いてください。
              </p>
            </div>
          </div>
        ) : (
          <motion.iframe
            key={tab}
            src={SOURCES[tab].url}
            title={SOURCES[tab].label}
            loading="lazy"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            onLoad={() => markLoaded(tab)}
            onError={() => markBlocked(tab)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </div>
      </div>
    </>
  );
}
