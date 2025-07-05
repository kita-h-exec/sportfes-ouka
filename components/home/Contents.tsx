'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const contentLinks = [
  { href: '/about', title: 'About', description: 'ご挨拶など' },
  { href: '/news', title: 'お知らせ', description: '運営からのお知らせ' },
  { href: '/events', title: '競技', description: '競技一覧' },
  { href: '/programs', title: 'プログラム', description: '当日のプログラム' },
  { href: '/blocks', title: 'ブロック紹介', description: '各ブロックの紹介' },
  { href: '/glossary', title: '用語集', description: '関連リンク' },
  { href: '/map', title: 'MAP', description: '校内地図・避難経路' },
];

export const Contents = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1, transition: { staggerChildren: 0.1 } }}
      viewport={{ once: true, amount: 0.2 }}
      className="w-full max-w-6xl mx-auto mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {contentLinks.map((link, index) => (
        <motion.div
          key={index}
          variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
          className="glass-effect rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <Link href={link.href}>
            <h3 className="text-2xl font-bold text-primary dark:text-primary-dark">{link.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{link.description}</p>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};
