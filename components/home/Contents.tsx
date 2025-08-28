// client component (kept) but dataを内部API経由で取得しCORS/localhost問題を軽減
"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ContentLink { href: string; title: string; description: string; icon?: string; }

export const Contents = () => {
  const [contentLinks, setContentLinks] = useState<ContentLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/contents');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setContentLinks(data.items || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
        // 失敗時はフォールバックの静的リンクを表示
        if (!cancelled) setContentLinks([
          { href: '/blocks', title: 'ブロック紹介', description: '各ブロックの紹介' },
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1, transition: { staggerChildren: 0.1 } }}
      viewport={{ once: true, amount: 0.2 }}
      className="w-full max-w-6xl mx-auto mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {contentLinks.filter(l => l.href).map((link, i) => (
        <motion.div
          key={i}
          variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
          className="bg-black/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl hover:bg-black/40 transition-all duration-300"
        >
          <Link href={link.href}>
            <h3 className="text-2xl font-bold text-white text-shadow-md">{link.icon ? link.icon + ' ' : ''}{link.title}</h3>
            {link.description && <p className="text-gray-200 mt-2 text-shadow-sm">{link.description}</p>}
          </Link>
        </motion.div>
      ))}
      {error && (
        <div className="col-span-full text-center text-sm text-red-300">contents取得失敗: {error}</div>
      )}
    </motion.div>
  );
};