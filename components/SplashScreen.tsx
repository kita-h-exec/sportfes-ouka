'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ▼▼▼【修正】同じフォルダ内にある LiquidEffect を正しくインポートします ▼▼▼
import { LiquidEffect } from './LiquidEffect';

export const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
        >
          <div className="absolute inset-0">
            <LiquidEffect />
          </div>

          <motion.div
            className="relative p-8 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/20 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.5, ease: 'easeOut' } }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center drop-shadow-lg">
              〇〇祭へようこそ
            </h1>
            <p className="text-lg text-white/80 text-center mt-2 drop-shadow-md">
              Welcome to our festival!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};