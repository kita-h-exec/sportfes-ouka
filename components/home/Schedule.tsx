'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

// データ構造をstart_timeに変更
interface ScheduleItem {
  start_time: string; // ISO 8601形式の文字列 (例: "2025-09-27T09:00:00")
  event: string;
  description: string;
}

const Calendar = ({ onDateSelect, selectedDate }: { onDateSelect: (date: Date) => void, selectedDate: Date }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 8)); // September 2025

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const isSelected = selectedDate.toDateString() === date.toDateString();
      days.push(
        <motion.div
          key={i}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 text-center rounded-lg cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-white/80 text-blue-600 font-bold' : 'text-white hover:bg-white/20'}`}
          onClick={() => onDateSelect(date)}
        >
          {i}
        </motion.div>
      );
    }
    return days;
  };

  return (
    <motion.div 
      className="text-white p-6 rounded-2xl"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-shadow-md">{`${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`}</h3>
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => <div key={day} className="font-bold text-center text-shadow-sm">{day}</div>)}
        {renderDays()}
      </div>
    </motion.div>
  );
};

const ScheduleDisplay = ({ date, schedules }: { date: Date, schedules: ScheduleItem[] }) => {
  // 選択された日付の予定をフィルタリング
  const scheduleForDate = schedules.filter(item => {
    const itemDate = new Date(item.start_time);
    return itemDate.toDateString() === date.toDateString();
  });

  // 時刻をフォーマットするヘルパー関数
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <motion.div 
      className="text-white p-6 rounded-2xl"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
    >
      <h3 className="text-3xl font-bold mb-4 text-shadow-md">{date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}の予定</h3>
      <AnimatePresence mode="wait">
        <motion.ul
          key={date.toISOString()} // keyをユニークにする
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          {scheduleForDate.length > 0 ? (
            scheduleForDate.map((item, index) => (
              <motion.li 
                key={index} 
                className="p-4 rounded-lg bg-black/20 border-l-4 border-fuchsia-400 text-shadow-sm"
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
              >
                <p className="font-bold text-xl">{item.event}</p>
                {/* start_timeから時刻をフォーマットして表示 */}
                <p className="text-sm text-gray-200">{formatTime(item.start_time)}</p>
                <p className="text-base mt-1">{item.description}</p>
              </motion.li>
            ))
          ) : (
            <p className="text-shadow-sm">この日の予定はありません。</p>
          )}
        </motion.ul>
      </AnimatePresence>
    </motion.div>
  );
};

// Directusから取得するデータを修正
async function getSchedules(): Promise<ScheduleItem[]> {
  try {
    const response = await directus.request(
      readItems('schedules', {
        fields: ['start_time', 'event', 'description'],
        sort: ['sort'], // 手動並び替えフィールド 'sort' でソート
      })
    );
    return response as ScheduleItem[];
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return [];
  }
}

export const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date('2025-09-27'));
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    getSchedules().then(setSchedules);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1, transition: { staggerChildren: 0.2 } }}
      viewport={{ once: true, amount: 0.3 }}
      className="w-full max-w-6xl mx-auto mt-20 grid md:grid-cols-2 gap-12"
    >
      <Calendar onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      <ScheduleDisplay date={selectedDate} schedules={schedules} />
    </motion.div>
  );
};