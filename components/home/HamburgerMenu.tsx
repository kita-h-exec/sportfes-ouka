'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

  const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const menuVariants = {
    hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
    visible: { opacity: 1, backdropFilter: 'blur(16px)', transition: { duration: 0.5, ease: 'easeInOut' } },
  };

  const linkVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="md:hidden">
      <button onClick={toggleMenu} className="fixed top-4 right-4 z-50 p-2 rounded-md bg-white/20 backdrop-blur-sm">
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-40 bg-white/80"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <motion.ul className="text-center space-y-8">
                <motion.li variants={linkVariants}><Link href="/" onClick={toggleMenu} className="text-3xl font-bold text-gray-800 hover:text-fuchsia-500">ホーム</Link></motion.li>
                <motion.li variants={linkVariants}><Link href="/blocks" onClick={toggleMenu} className="text-3xl font-bold text-gray-800 hover:text-fuchsia-500">ブロック紹介</Link></motion.li>
                <motion.li variants={linkVariants}><Link href="/contents" onClick={toggleMenu} className="text-3xl font-bold text-gray-800 hover:text-fuchsia-500">企画紹介</Link></motion.li>
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HamburgerMenu;
