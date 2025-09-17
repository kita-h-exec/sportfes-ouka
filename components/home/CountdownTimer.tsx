'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const getTodayKey = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${mm}-${dd}`; // e.g. "08-19"
  };

  const getSpecialMessage = () => {
    // 年に依存せず、月日で判定
    const key = getTodayKey();
    if (key === '08-19') return 'うんどう会 1日目！';
    if (key === '09-20') return 'うんどう会 2日目！';
    return null;
  };

  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [special, setSpecial] = useState<string | null>(getSpecialMessage());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
      setSpecial(getSpecialMessage());
    }, 1000);

    return () => clearTimeout(timer);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center text-white"
    >
      {special ? (
        <div className="py-6">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-2 text-shadow-xl drop-shadow-lg">{special}</h2>
          <p className="text-lg md:text-xl text-white/80">本日も応援よろしくお願いします！</p>
        </div>
      ) : (
        <>
          <h2 className="text-4xl font-bold mb-4 text-shadow-lg">開催まで</h2>
          <div className="flex justify-center items-center space-x-4 md:space-x-8 text-5xl md:text-7xl font-mono font-bold text-shadow-xl">
            <div className="flex flex-col items-center">
              <span className="countdown-number">{(timeLeft as any).days ?? 0}</span>
              <span className="countdown-label text-lg font-sans">日</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{(timeLeft as any).hours ?? 0}</span>
              <span className="countdown-label text-lg font-sans">時間</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{(timeLeft as any).minutes ?? 0}</span>
              <span className="countdown-label text-lg font-sans">分</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{(timeLeft as any).seconds ?? 0}</span>
              <span className="countdown-label text-lg font-sans">秒</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};