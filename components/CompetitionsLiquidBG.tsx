"use client";
import { useState, useEffect } from 'react';
import { useMotionValue, animate } from 'framer-motion';
import { LiquidEffect } from './LiquidEffect';

// 競技ページ専用：Liquid Glass 背景レイヤ
// 透明度を抑え、読みやすさ確保のため上に暗めグラデーションと微細ノイズを重ねる
export default function CompetitionsLiquidBG() {
  const progress = useMotionValue(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controls = animate(progress, 1, { duration: 2.8, ease: 'easeInOut' });
    return () => controls.stop();
  }, [progress]);

  return (
    <div className="absolute inset-0 -z-20 pointer-events-none select-none">
      <div className="absolute inset-0 opacity-[0.5] md:opacity-[0.65] mix-blend-screen">
        <LiquidEffect progress={progress} onReady={() => setReady(true)} />
      </div>
      {/* 視認性を保つダークグラデ + わずかなノイズ */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(255,255,255,0.05),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80 backdrop-blur-xl" />
      <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' fill=\'none\'%3E%3Cpath d=\'M0 160h160V0H0v160Z\' fill=\'%23000\'/%3E%3Cg stroke=\'%23fff\' stroke-opacity=\'0.04\'%3E%3Cpath d=\'M0 0h160v160H0z\'/%3E%3Cpath d=\'M0 16h160M0 32h160M0 48h160M0 64h160M0 80h160M0 96h160M0 112h160M0 128h160M0 144h160M16 0v160M32 0v160M48 0v160M64 0v160M80 0v160M96 0v160M112 0v160M128 0v160M144 0v160\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '160px 160px' }} />
      {!ready && <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" />}    
    </div>
  );
}
