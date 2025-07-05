'use client';

import { motion } from 'framer-motion';

export const EmergencyBar = ({ message }: { message: string | null }) => {
  const displayMessage = message || "現在、緊急のお知らせはありません。";
  const isEmergency = !!message;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`fixed top-20 left-0 right-0 z-40 text-center py-2.5 text-sm font-bold ${isEmergency ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-800'}`}
    >
      <p>{displayMessage}</p>
    </motion.div>
  );
};
