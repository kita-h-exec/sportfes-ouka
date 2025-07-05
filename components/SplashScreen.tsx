'use client';

import { useState, useEffect } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { LiquidEffect } from './LiquidEffect';

export const SplashScreen = ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const progress = useSpring(0, { 
    stiffness: 50,
    damping: 40,
    mass: 2,
  });

  useEffect(() => {
    if (isLoaded) {
      // Start the main glass animation
      progress.set(1);

      // Schedule the text to appear partway through
      const textTimer = setTimeout(() => setShowContent(true), 500);

      // Schedule the final completion callback
      // This is the single source of truth for when the animation is over.
      const endTimer = setTimeout(() => {
        onAnimationComplete();
      }, 4000); // Total splash screen duration

      return () => {
        clearTimeout(textTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isLoaded, progress, onAnimationComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] h-screen w-screen bg-white dark:bg-background-dark"
      // This exit animation will be triggered by AnimatePresence in the parent
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <div className="absolute inset-0">
        <LiquidEffect progress={progress} onReady={() => setIsLoaded(true)} />
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1.5, delay: 0.2 } }}
            // This exit is for the text itself, fading out before the whole screen
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
              R7うんどう会「謳花」
            </h1>
            <p className="text-lg text-white/80 mt-4 drop-shadow-lg">
              静岡県立浜松北高等学校
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};