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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="text-center p-10 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl"
    >
      <h2 className="text-3xl font-bold mb-4">開催まで</h2>
      <div className="flex justify-center space-x-4 text-4xl font-mono">
        <div>{timeLeft.days}日</div>
        <div>{timeLeft.hours}時間</div>
        <div>{timeLeft.minutes}分</div>
        <div>{timeLeft.seconds}秒</div>
      </div>
    </motion.div>
  );
};
