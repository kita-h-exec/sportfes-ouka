'use client';

// import { createDirectus, rest, readItem } from '@directus/sdk';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// const client = createDirectus('http://localhost:8055').with(rest());

// Placeholder data, mimicking Directus structure
const blocksData: { [key: string]: any } = {
  '1': { name: '1ブロック', color: '#8B5CF6', description: '紫電一閃、勝利をその手に！\n我ら1ブロック、雷鳴の如くフィールドを駆け巡る。\n\nテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプルテキストサンプル' },
  '2': { name: '2ブロック', color: '#F97316', description: '燃え盛る橙の炎、情熱の証.\n不屈の闘志で、勝利を掴む。' },
  '3': { name: '3ブロック', color: '#FFFFFF', description: '純白のキャンバスに、勝利の二文字を描く。\n我らの団結力は、何色にも染まらない。' },
  '4': { name: '4ブロック', color: '#FBBF24', description: '輝く黄金の稲妻、フィールドを照らす。\n速さと力、その両方で圧倒する。' },
  '5': { name: '5ブロック', color: '#EF4444', description: '真紅の魂、勝利への渇望。\n情熱の赤は、誰にも止められない。' },
  '6': { name: '6ブロック', color: '#3B82F6', description: '静かなる蒼き波、全てを飲み込む。\n我らの戦略とチームワークが、勝利への道を切り開く。' },
  '7': { name: '7ブロック', color: '#10B981', description: 'フィールドに新緑の風を吹かせる。\n若き力と成長の証、勝利の果実を掴み取る。' },
  '8': { name: '8ブロック', color: '#EC4899', description: '華麗なる桃色の旋風、観客を魅了する。\n美しさと強さを兼ね備え、勝利の舞を踊る。' },
  '9': { name: '9ブロック', color: '#67E8F9', description: '澄み渡る水のように、冷静沈着。\n清らかなる心と、磨き抜かれた技で勝利を掴む。' }
};

const BlockPage = ({ params }: { params: { id: string } }) => {
  const [block, setBlock] = useState<any>(null);

  useEffect(() => {
    // Using placeholder data for now
    if (blocksData[params.id]) {
      setBlock(blocksData[params.id]);
    }
  }, [params.id]);

  if (!block) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const posterUrl = ''; // This will be replaced by Directus data

  return (
    <div className="flex w-full min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div 
        className="w-1/2 h-screen sticky top-0 flex items-center justify-center"
        style={{ backgroundColor: block.color }}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
      >
        {posterUrl ? (
          <img src={posterUrl} alt={`${block.name} Poster`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-3xl font-bold text-center p-8">ここに画像が表示されます</span>
        )}
      </motion.div>

      <div className="w-1/2 p-12 md:p-24 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <Link href="/" className="text-primary dark:text-primary-dark hover:underline mb-8 block">← ホームに戻る</Link>
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            style={{ color: block.color }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          >
            {block.name}
          </motion.h1>
          <motion.div 
            className="prose dark:prose-invert lg:prose-xl max-w-none whitespace-pre-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
          >
            {block.description}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BlockPage;
