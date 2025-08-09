'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

interface ContentLink {
  href: string;
  title: string;
  description: string;
}

async function getContents(): Promise<ContentLink[]> {
  try {
    const response = await directus.request(
      readItems('contents', {
        fields: ['*'],
      })
    );
    return response as ContentLink[];
  } catch (error) {
    console.error("Failed to fetch contents:", error);
    return [];
  }
}

export const Contents = () => {
  const [contentLinks, setContentLinks] = useState<ContentLink[]>([]);

  useEffect(() => {
    getContents().then(setContentLinks);
  }, []);

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
          className="bg-black/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl hover:bg-black/40 transition-all duration-300"
        >
          <Link href={link.href}>
            <h3 className="text-2xl font-bold text-white text-shadow-md">{link.title}</h3>
            <p className="text-gray-200 mt-2 text-shadow-sm">{link.description}</p>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};