'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBlocks } from '../../lib/directus';

// Type definition
interface Block {
  slug: string;
  name: string;
  color: string;
  text_color: string;
}

export const Blocks = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedBlocks = await getBlocks();
        setBlocks(fetchedBlocks);
      } catch (error) {
        console.error("Error fetching blocks:", error);
      }
    };
    fetchData();
  }, []);

  const handlePaginate = (direction: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex + direction;
      if (newIndex < 0) return blocks.length - 1;
      if (newIndex >= blocks.length) return 0;
      return newIndex;
    });

    // Allow new transitions after the CSS transition duration
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500); 
  };

  const handleTouchStart = (e: React.TouchEvent) => {
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

  if (blocks.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-24 h-96 flex flex-col items-center justify-center">
        <h2 className="text-4xl font-bold text-center mb-10 text-white text-shadow-lg">ブロック紹介</h2>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-24 flex flex-col items-center justify-center">
      <h2 className="text-4xl font-bold text-center mb-10 text-white text-shadow-lg">ブロック紹介</h2>
      
      <div 
        className="relative w-full h-96 md:h-[450px] flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {blocks.map((block, index) => {
          const isActive = index === currentIndex;
          
          let transformClass = 'translate-x-full'; // Default to off-screen right
          if (isActive) {
            transformClass = 'translate-x-0';
          } else if (index === (currentIndex - 1 + blocks.length) % blocks.length) {
            transformClass = '-translate-x-full'; // Position to the left
          }

          const opacityClass = isActive ? 'opacity-100' : 'opacity-0 pointer-events-none';
          const zIndexClass = isActive ? 'z-10' : 'z-0';
          const shadowClass = isActive ? 'shadow-2xl' : 'shadow-none';

          return (
            <div
              key={block.slug}
              className={`absolute w-3/4 md:w-1/2 aspect-[9/16] h-full rounded-2xl flex items-center justify-center transition-all duration-500 ease-in-out ${transformClass} ${opacityClass} ${zIndexClass} ${shadowClass}`}
              style={{ backgroundColor: block.color }}
            >
              <Link href={`/blocks/${block.slug}`} passHref className={`w-full h-full flex items-center justify-center ${block.text_color}`}>
                <h3 className="text-5xl font-extrabold">{block.name}</h3>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center mt-4 space-x-16">
        <button onClick={() => handlePaginate(-1)} className="z-10 bg-white/60 rounded-full p-3 hover:bg-white/90 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white text-shadow-md">{blocks[currentIndex].name}</h3>
        </div>
        <button onClick={() => handlePaginate(1)} className="z-10 bg-white/60 rounded-full p-3 hover:bg-white/90 transition-colors">
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
