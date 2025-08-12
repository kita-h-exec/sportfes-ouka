'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

interface ScheduleItem {
  start_time: string;
  end_time: string;
  event: string;
  description: string;
}

const Calendar = ({ onDateSelect, selectedDate }: { onDateSelect: (date: Date) => void, selectedDate: Date }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth()));

  // selectedDateが変更された場合、カレンダーの表示月を更新する
  useEffect(() => {
    if (selectedDate.getFullYear() !== currentMonth.getFullYear() || selectedDate.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
    }
  }, [selectedDate]); // ★無限ループの原因だったcurrentMonthを依存配列から削除

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

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
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">‹</button>
        <h3 className="text-2xl font-bold text-shadow-md">{`${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`}</h3>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => <div key={day} className="font-bold text-center text-shadow-sm">{day}</div>)}
        {renderDays()}
      </div>
    </motion.div>
  );
};

const ScheduleDisplay = ({ date, schedules }: { date: Date, schedules: ScheduleItem[] }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const scheduleForDate = schedules
    .filter(item => {
      const itemDate = new Date(item.start_time);
      return itemDate.toDateString() === date.toDateString();
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / 60000);
  };

  const isOngoing = (start: string, end: string) => {
    if (!now || !start || !end) return false;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const nowTime = now.getTime();
    return nowTime >= startTime && nowTime <= endTime;
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
          key={date.toISOString()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          {scheduleForDate.length > 0 ? (
            scheduleForDate.map((item, index) => {
              const duration = calculateDuration(item.start_time, item.end_time);
              const ongoing = isOngoing(item.start_time, item.end_time);
              const borderColor = ongoing ? 'border-yellow-400' : 'border-fuchsia-400';

              return (
              <motion.li 
                key={index} 
                className={`p-4 rounded-lg bg-black/20 border-l-4 ${borderColor} text-shadow-sm transition-colors duration-300`}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
              >
                <p className="font-bold text-xl">{item.event}</p>
                <div className="flex items-center text-sm text-gray-200">
                  <span>{formatTime(item.start_time)}</span>
                  {item.end_time && <span className="mx-1">~</span>}
                  {item.end_time && <span>{formatTime(item.end_time)}</span>}
                  {duration > 0 && <span className="ml-4 text-xs text-gray-400">({duration}分)</span>}
                </div>
                <p className="text-base mt-1">{item.description}</p>
              </motion.li>
            )})
          ) : (
            <p className="text-shadow-sm">この日の予定はありません。</p>
          )}
        </motion.ul>
      </AnimatePresence>
    </motion.div>
  );
};

async function getSchedules(): Promise<ScheduleItem[]> {
  try {
    const response = await directus.request(
      readItems('schedules', {
        fields: ['start_time', 'end_time', 'event', 'description'],
        sort: ['start_time'],
      })
    );
    return response as ScheduleItem[];
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return [];
  }
}

export const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only once on the client, which is safe.
    getSchedules().then(setSchedules);
    setIsClient(true);
  }, []);

  // Render a placeholder on the server and during the initial client render
  if (!isClient) {
    // You can return a static placeholder to avoid hydration errors.
    // This placeholder should be simple and not rely on client-side data.
    return <div className="w-full max-w-6xl mx-auto mt-20 grid md:grid-cols-2 gap-12"><div>Loading...</div></div>;
  }

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