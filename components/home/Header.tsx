
'use client';

import { motion } from 'framer-motion';

export const Header = () => {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-md"
    >
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">うんどう会</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">謳花</p>
      </div>
      <nav className="hidden md:flex items-center space-x-6">
        <a href="#schedule" className="hover:text-blue-500 transition-colors">スケジュール</a>
        <a href="#contents" className="hover:text-blue-500 transition-colors">コンテンツ</a>
        <a href="#blocks" className="hover:text-blue-500 transition-colors">ブロック紹介</a>
        <a href="/visitor-guide" className="hover:text-blue-500 transition-colors">来場者へのご案内</a>
      </nav>
    </motion.header>
  );
};
