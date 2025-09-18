"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

type CountdownEvent = { date: string; message: string }; // date: 'YYYY-MM-DD' (ローカル日付基準)

export const CountdownTimer = ({
  targetDate,
  events,
  endedMessage = 'うんどう会は終了しました',
}: {
  targetDate: string;
  events: CountdownEvent[];
  endedMessage?: string;
}) => {
  const todayYMD = () => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateTimeLeft = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return null; // カウントダウン終了（X-timeがマイナス）
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    } as const;
  };

  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateTimeLeft>>(calculateTimeLeft());

  const today = useMemo(todayYMD, []);

  const todayMessage = useMemo(() => {
    const ymd = todayYMD();
    const hit = (events || []).find((e) => e.date === ymd);
    return hit?.message ?? null;
  }, [events]);

  const isEnded = useMemo(() => {
    // 全ての設定日付が「今日」より前になったら終了
    const ymd = todayYMD();
    return (events || []).length > 0 && (events || []).every((e) => e.date < ymd);
  }, [events]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  // レンダリング
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center text-white"
    >
      {/* カウントダウン中 */}
      {timeLeft ? (
        <>
          <h2 className="text-4xl font-bold mb-4 text-shadow-lg">開催まで</h2>
          <div className="flex justify-center items-center space-x-4 md:space-x-8 text-5xl md:text-7xl font-mono font-bold text-shadow-xl">
            <div className="flex flex-col items-center">
              <span className="countdown-number">{timeLeft.days}</span>
              <span className="countdown-label text-lg font-sans">日</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{timeLeft.hours}</span>
              <span className="countdown-label text-lg font-sans">時間</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{timeLeft.minutes}</span>
              <span className="countdown-label text-lg font-sans">分</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="countdown-number">{timeLeft.seconds}</span>
              <span className="countdown-label text-lg font-sans">秒</span>
            </div>
          </div>
        </>
      ) : (
        // X-timeがマイナス: 今日が設定日付ならその文言、すべて過ぎていれば終了表示
        <div className="py-6">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-2 text-shadow-xl drop-shadow-lg">
            {todayMessage ?? (isEnded ? endedMessage : '')}
          </h2>
          {todayMessage && (
            <p className="text-lg md:text-xl text-white/80">本日も応援よろしくお願いします！</p>
          )}
        </div>
      )}
    </motion.div>
  );
};