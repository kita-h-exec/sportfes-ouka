'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { blocks } from '@/lib/blocksData';

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

  return (
    <div className="w-full max-w-4xl mx-auto mt-24 h-auto flex flex-col items-center justify-center">
      <h2 className="text-4xl font-bold text-center mb-10">ブロック紹介</h2>
      <div className="relative w-full md:h-3/4 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0">
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
            className="relative w-3/4 md:w-auto md:absolute aspect-[9/16] h-full rounded-2xl shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: blocks[index].color }}
          >
            <Link href={`/blocks/${blocks[index].id}`} passHref className={`w-full h-full flex items-center justify-center ${blocks[index].textColor}`}>
                <h3 className="text-5xl font-extrabold">{blocks[index].name}</h3>
            </Link>
          </motion.div>
        </AnimatePresence>
        <div className="md:hidden w-3/4 text-center">
          <h3 className="text-2xl font-bold">{blocks[index].name}</h3>
        </div>
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
