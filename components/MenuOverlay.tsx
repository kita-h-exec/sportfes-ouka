'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/components/useMenu'; // useMenuフックをインポート

// propsを受け取らないように変更
const MenuOverlay = () => {
  // useMenuフックを直接呼び出す
  const { isMenuOpen, toggleMenu } = useMenu();

  const menuVariants = {
    hidden: { opacity: 0, transition: { duration: 0.3 } },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  };

  const linkContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const linkVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-lg flex items-center justify-center"
          onClick={toggleMenu}
        >
          <motion.div
            variants={linkContainerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="space-y-10">
              <motion.li variants={linkVariants}>
                <Link href="/" onClick={toggleMenu} className="text-5xl font-extrabold text-white hover:text-fuchsia-400 transition-colors">ホーム</Link>
              </motion.li>
              <motion.li variants={linkVariants}>
                <Link href="/announcements" onClick={toggleMenu} className="text-5xl font-extrabold text-white hover:text-fuchsia-400 transition-colors">お知らせ</Link>
              </motion.li>
              <motion.li variants={linkVariants}>
                <Link href="/blocks" onClick={toggleMenu} className="text-5xl font-extrabold text-white hover:text-fuchsia-400 transition-colors">ブロック紹介</Link>
              </motion.li>
              <motion.li variants={linkVariants}>
                <Link href="/contents" onClick={toggleMenu} className="text-5xl font-extrabold text-white hover:text-fuchsia-400 transition-colors">企画紹介</Link>
              </motion.li>
              <motion.li variants={linkVariants}>
                <Link href="/program" onClick={toggleMenu} className="text-5xl font-extrabold text-white hover:text-fuchsia-400 transition-colors">プログラム</Link>
              </motion.li>
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MenuOverlay;