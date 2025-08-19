"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnnouncementsControls() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    setIsRefreshing(true);
    // Give the UI a tiny delay so the spinner is visible
    requestAnimationFrame(() => {
      router.refresh();
      // Clear loading shortly after; router.refresh triggers re-render when data resolves
      setTimeout(() => setIsRefreshing(false), 400);
    });
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={refresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        aria-label="最新のお知らせを取得"
      >
        {isRefreshing ? (
          <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" aria-hidden />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
            <path d="M21 12a9 9 0 1 1-3.35-6.96" />
            <path d="M21 3v7h-7" />
          </svg>
        )}
        <span>最新に更新</span>
      </button>
      <span className="text-xs text-gray-500">タブに戻ったとき自動更新します</span>
    </div>
  );
}
