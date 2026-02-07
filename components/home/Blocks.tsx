'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBlocks } from '../../lib/directus';

// Type definition
interface Block {
  slug: string;
  name: string;
  color: string;
  text_color: string; // Tailwind text color class or hex
}

interface BlocksProps { initialBlocks?: Block[] }

export const Blocks = ({ initialBlocks }: BlocksProps) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false); // avoid hydration mismatch for measurements

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const animateTimerRef = useRef<number | null>(null);

  // Fetch only if not provided from server
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
  const fetchedBlocks = await getBlocks();
  if (!cancelled) setBlocks(fetchedBlocks as Block[]);
      } catch (error) {
        console.error('Error fetching blocks:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [initialBlocks]);

  useEffect(() => { setMounted(true); }, []);

  const handlePaginate = useCallback((direction: number) => {
    if (blocks.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex(prev => (prev + direction + blocks.length) % blocks.length);
    if (animateTimerRef.current) {
      clearTimeout(animateTimerRef.current);
      animateTimerRef.current = null;
    }
    animateTimerRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animateTimerRef.current = null;
    }, 450);
  }, [blocks.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // スクロールスナップが横フリックを阻害するのを防ぐ
    try { document.documentElement.classList.add('scroll-snap-disabled'); } catch {}
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = 0; // Reset on new touch
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchEndX.current === 0) return; // No move
    const swipeThreshold = 50; // Minimum swipe distance
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (swipeDistance > swipeThreshold) {
      handlePaginate(1); // Swipe left
    } else if (swipeDistance < -swipeThreshold) {
      handlePaginate(-1); // Swipe right
    }
  };

  const hasData = blocks.length > 0;

  if (!hasData) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-24 h-72 flex flex-col items-center justify-center">
        <h2 className="text-4xl font-bold text-center mb-10 text-white text-shadow-lg">ブロック紹介</h2>
        <div className="text-sm text-white/70">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-24 flex flex-col items-center">
      <h2 className="text-4xl font-bold text-center mb-12 text-white text-shadow-lg">ブロック紹介</h2>

      <div
        className="relative w-full h-[420px] md:h-[500px] flex items-center justify-center overflow-hidden select-none touch-pan-y overscroll-contain"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {blocks.map((block, index) => {
          // 白背景 (#FFFFFF / #ffffff / #fff) の場合は視認性確保のためテキスト色を強制的に黒へフォールバック
          const isWhiteBg = typeof block.color === 'string' && /^(#fff(fff)?|#FFFFFF|#ffffff)$/i.test(block.color.trim());
          // block.text_color には Tailwind の text-*** クラス or 直接指定が入る想定
          // 白背景の場合、既存 text-*white 系を上書きしたいので inline style で color: '#000' を適用
          const enforcedTextStyle: React.CSSProperties | undefined = isWhiteBg ? { color: '#000' } : undefined;
          // offset: -1 (prev), 0 (current), 1 (next), others hidden
          let rawOffset = index - currentIndex;
          // Wrap shortest path for circular carousel
          if (rawOffset > blocks.length / 2) rawOffset -= blocks.length;
          if (rawOffset < -blocks.length / 2) rawOffset += blocks.length;
          const isActive = rawOffset === 0;
          const visible = Math.abs(rawOffset) <= 2; // limit DOM painting
          if (!visible) return null;
          const translateX = `translateX(${rawOffset * 55}%)`; // spacing between cards
          const scale = isActive ? 1 : (Math.abs(rawOffset) === 1 ? 0.82 : 0.7);
          const opacity = isActive ? 1 : (Math.abs(rawOffset) === 1 ? 0.55 : 0.25);
          return (
            <div
              key={block.slug}
              className="absolute top-1/2 left-1/2 origin-center transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)] will-change-transform"
              style={{
                transform: `translate(-50%, -50%) ${translateX} scale(${scale})`,
                opacity,
                zIndex: isActive ? 20 : 10 - Math.abs(rawOffset),
              }}
            >
              <Link
                href={`/blocks/${block.slug}`}
                className={`block relative rounded-3xl shadow-xl overflow-hidden focus:outline-none focus:ring-4 ring-white/40 backdrop-blur-sm transition-colors ${block.text_color}`}
                style={{ backgroundColor: block.color, width: mounted ? 'clamp(220px,32vw,340px)' : '260px', aspectRatio: '9/16' }}
              >
                <div className="w-full h-full flex items-center justify-center p-4">
                  <h3 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg text-center leading-tight break-words" style={enforcedTextStyle}>
                    {block.name}
                  </h3>
                </div>
              </Link>
            </div>
          );
        })}

  {/* Gradient edges (クリックを遮らない) */}
  <div className="pointer-events-none absolute inset-y-6 left-0 w-16 bg-gradient-to-r from-background/80 to-transparent" />
  <div className="pointer-events-none absolute inset-y-6 right-0 w-16 bg-gradient-to-l from-background/80 to-transparent" />
      </div>

      <div className="mt-8 flex items-center gap-6 relative z-[60]">
        <button
          aria-label="前のブロック"
          type="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handlePaginate(-1); }}
          onClick={() => handlePaginate(-1)}
          aria-disabled={isAnimating}
          className={`pointer-events-auto bg-white/60 hover:bg-white/80 dark:bg-white/30 dark:hover:bg-white/50 rounded-full p-3 shadow transition-colors ${isAnimating ? 'opacity-50' : ''}`}
          style={{ touchAction: 'manipulation' }}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="min-w-[8rem] text-center">
          <h3 className="text-2xl font-bold text-white text-shadow-md tracking-wide">
            {blocks[currentIndex]?.name}
          </h3>
        </div>
        <button
          aria-label="次のブロック"
          type="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handlePaginate(1); }}
          onClick={() => handlePaginate(1)}
          aria-disabled={isAnimating}
          className={`pointer-events-auto bg-white/60 hover:bg-white/80 dark:bg-white/30 dark:hover:bg-white/50 rounded-full p-3 shadow transition-colors ${isAnimating ? 'opacity-50' : ''}`}
          style={{ touchAction: 'manipulation' }}
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex gap-2 flex-wrap justify-center">
        {blocks.map((_, i) => (
          <button
            key={i}
            aria-label={`ブロック ${i + 1}`}
            onClick={() => !isAnimating && setCurrentIndex(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-8' : 'bg-white/40 w-2.5 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
};
