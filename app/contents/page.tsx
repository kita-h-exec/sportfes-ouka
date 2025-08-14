'use client';

import Link from "next/link";
import { motion } from "framer-motion";

const LinkCard = ({ href, title, description, icon }: { href: string; title: string; description: string; icon: string; }) => {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
      className="glass-effect rounded-2xl"
    >
      <Link href={href} className="aspect-square p-5 flex flex-col justify-between items-center text-center">
        <div className="text-5xl">{icon}</div>
        <div>
          <h3 className="font-bold text-xl text-primary dark:text-primary-dark">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
};

export default function ContentsPage() {
  const contentsList = [
    { href: "/about", title: "ご挨拶", description: "実行委員長より", icon: "🎉" },
    { href: "/news", title: "お知らせ", description: "運営からのお知らせ", icon: "📢" },
    { href: "/competitions", title: "競技紹介", description: "全競技ルール解説", icon: "🏃" },
    { href: "/programs", title: "プログラム", description: "当日の進行", icon: "📜" },
    { href: "/blocks", title: "ブロック紹介", description: "各ブロックの紹介", icon: "🎨" },
    { href: "/glossary", title: "用語集", description: "運動会で使われる用語", icon: "📚" },
    { href: "/map", title: "校内マップ", description: "施設・避難経路", icon: "🗺️" },
    { href: "/visitors-guide", title: "来場者案内", description: "アクセス・注意事項", icon: "🚗" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
      <motion.div 
        className="container mx-auto py-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1 
          className="text-5xl md:text-6xl font-extrabold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
          variants={itemVariants}
        >
          すべてのコンテンツ
        </motion.h1>
        
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
        >
          {contentsList.map(item => (
            <motion.div key={item.title} variants={itemVariants}>
              <LinkCard {...item} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 1.5 } }}
        >
          <Link href="/" className="text-accent dark:text-accent-dark font-bold hover:underline text-lg">
            ← ホームに戻る
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
