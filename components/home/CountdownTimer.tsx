'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
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
      <h2 className="text-4xl font-bold mb-4 text-shadow-lg">開催まで</h2>
      <div className="flex justify-center items-center space-x-4 md:space-x-8 text-5xl md:text-7xl font-mono font-bold text-shadow-xl">
        <div className="flex flex-col items-center">
          <span className="countdown-number">{timeLeft.days ?? 0}</span>
          <span className="countdown-label text-lg font-sans">日</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="countdown-number">{timeLeft.hours ?? 0}</span>
          <span className="countdown-label text-lg font-sans">時間</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="countdown-number">{timeLeft.minutes ?? 0}</span>
          <span className="countdown-label text-lg font-sans">分</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="countdown-number">{timeLeft.seconds ?? 0}</span>
          <span className="countdown-label text-lg font-sans">秒</span>
        </div>
      </div>
    </motion.div>
  );
};