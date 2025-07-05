'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const blocks = [
  { id: 1, name: '1ブロック', color: '#8B5CF6', textColor: 'text-white' },
  { id: 2, name: '2ブロック', color: '#F97316', textColor: 'text-white' },
  { id: 3, name: '3ブロック', color: '#FFFFFF', textColor: 'text-black' },
  { id: 4, name: '4ブロック', color: '#FBBF24', textColor: 'text-white' },
  { id: 5, name: '5ブロック', color: '#EF4444', textColor: 'text-white' },
  { id: 6, name: '6ブロック', color: '#3B82F6', textColor: 'text-white' },
  { id: 7, name: '7ブロック', color: '#10B981', textColor: 'text-white' },
  { id: 8, name: '8ブロック', color: '#EC4899', textColor: 'text-white' },
  { id: 9, name: '9ブロック', color: '#67E8F9', textColor: 'text-white' },
];

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 500 : -500,
      opacity: 0,
      scale: 0.8,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0,
      scale: 0.8,
    };
  },
};

export const Blocks = () => {
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const index = (page % blocks.length + blocks.length) % blocks.length;

  useEffect(() => {
    const timer = setTimeout(() => paginate(1), 5000);
    return () => clearTimeout(timer);
  }, [page]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-24 h-[450px] flex flex-col items-center justify-center">
      <h2 className="text-4xl font-bold text-center mb-10">ブロック紹介</h2>
      <div className="relative w-full h-3/4 flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) {
                paginate(1);
              } else if (swipe > 10000) {
                paginate(-1);
              }
            }}
            className="absolute w-3/4 h-full rounded-2xl shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: blocks[index].color }}
          >
            <Link href={`/blocks/${blocks[index].id}`} className={`w-full h-full flex items-center justify-center ${blocks[index].textColor}`}>
                <h3 className="text-5xl font-extrabold">{blocks[index].name}</h3>
            </Link>
          </motion.div>
        </AnimatePresence>
        <button onClick={() => paginate(-1)} className="absolute top-1/2 -translate-y-1/2 left-4 z-10 bg-white/60 rounded-full p-3 hover:bg-white/90 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button onClick={() => paginate(1)} className="absolute top-1/2 -translate-y-1/2 right-4 z-10 bg-white/60 rounded-full p-3 hover:bg-white/90 transition-colors">
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
