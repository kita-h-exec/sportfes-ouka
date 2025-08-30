"use client";
import { useEffect, useRef } from 'react';

// visionOS 風: 柔らかい多層ガラス / ライトフィールド感を CSS のみで再現 (軽量)
// 特徴:
// - 大きめの柔らかいレイヤードグラデーション (パララックス)
// - 微細ノイズ + 内側ハイライトの輪郭
// - CSS 変数でアクセント色シフト
// - Canvas / WebGL 不使用で軽量
export default function CompetitionsVisionBG() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const y = (e.clientY - r.top) / r.height - 0.5;
      const strength = 18; // px shift
      el.style.setProperty('--offset-x', `${x * strength}px`);
      el.style.setProperty('--offset-y', `${y * strength}px`);
    };
    window.addEventListener('pointermove', handle, { passive: true });
    return () => window.removeEventListener('pointermove', handle);
  }, []);

  // iOS Safari ホワイトアウト対策: blend や高い透過を抑制
  useEffect(() => {
    const ua = navigator.userAgent;
    const isiOS = /iP(hone|ad|od)/.test(ua);
    if (isiOS) {
      document.documentElement.classList.add('ios-safari');
    }
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 -z-20 overflow-hidden visionos-bg select-none pointer-events-none">
      {/* 遠景ぼかし層 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,#ffffff10,transparent_60%),radial-gradient(circle_at_80%_65%,#ffffff15,transparent_65%)]" />
      {/* 基本トーン */}
      <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-2xl" />
      {/* パララックスグラデーション (やや彩度を抑制) */}
      <div className="absolute inset-0 will-change-transform" style={{ transform: 'translate3d(var(--offset-x,0),var(--offset-y,0),0)' }}>
        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_40%_35%,rgba(180,160,255,0.18),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(255,150,220,0.15),transparent_65%),radial-gradient(circle_at_20%_80%,rgba(120,200,255,0.12),transparent_60%)] mix-blend-screen" />
      </div>
      {/* ノイズ (dither) */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.25\'/%3E%3C/svg%3E")', backgroundSize: '160px 160px' }} />
      {/* ほんのり内側光輪 (ヴィネット + 内側ハイライト) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)'}} />
      <style jsx global>{`
        .visionos-panel { 
          background: linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06));
          backdrop-filter: blur(32px) saturate(140%);
          -webkit-backdrop-filter: blur(32px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 28px;
          position: relative;
        }
        .visionos-panel:before { /* 内側輪郭 */
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          padding: 1px; background: linear-gradient(160deg,rgba(255,255,255,0.55),rgba(255,255,255,0.05));
          -webkit-mask: linear-gradient(#000,#000) content-box, linear-gradient(#000,#000);
          -webkit-mask-composite: xor; mask-composite: exclude;
          opacity: .55; pointer-events:none;
        }
        .visionos-chip { 
          background: linear-gradient(140deg,rgba(255,255,255,0.22),rgba(255,255,255,0.10));
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.28);
          transition: background .25s ease, border-color .25s ease;
        .visionos-chip:hover { background: linear-gradient(140deg,rgba(255,255,255,0.28),rgba(255,255,255,0.14)); }
        /* iOS Safari fallback (過度な発光抑制) */
        .ios-safari .visionos-bg .ios-blend-fallback { mix-blend-mode: normal !important; opacity: 0.45 !important; }
        .ios-safari .visionos-chip { 
          background: rgba(30,41,59,0.55); /* slate-800 with alpha */
          border-color: rgba(255,255,255,0.18);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          color: #f1f5f9;
        }
        .ios-safari .visionos-chip:hover { background: rgba(51,65,85,0.65); }
        .ios-safari .visionos-panel { 
          background: linear-gradient(145deg,rgba(30,41,59,0.75),rgba(15,23,42,0.6));
          border-color: rgba(255,255,255,0.14);
        }
        .ios-safari .visionos-panel:before { opacity: .35; }
        .ios-safari .visionos-bg { background: #0f172a; }
        .ios-safari .visionos-bg .mix-blend-overlay { opacity: 0.18 !important; }
        .ios-safari .visionos-bg .visionos-panel button, .ios-safari .visionos-panel input { -webkit-appearance: none; }
        .ios-safari .visionos-panel input { background: rgba(30,41,59,0.65) !important; border-color: rgba(255,255,255,0.20) !important; }
        .ios-safari .visionos-panel input:focus { outline: 2px solid rgba(217,70,239,0.6); }
        @supports (-webkit-touch-callout: none) {
          /* Safari グローバル fallback (更に安全) */
          .visionos-chip { backdrop-filter: blur(18px) saturate(140%); }
        }
        @media (max-width: 640px) {
          .visionos-panel { border-radius: 22px; }
        }
      `}</style>
    </div>
  );
}
