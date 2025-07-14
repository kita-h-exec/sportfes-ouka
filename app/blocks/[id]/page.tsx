'use client';

import { useParams, notFound } from 'next/navigation';
import { blocks } from '@/lib/blocksData';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import BlockNavigation from '@/components/BlockNavigation'; // Import the new component

const BlockDetailPage = () => {
  const params = useParams();
  const blockId = params.id;
  
  const blockIndex = blocks.findIndex((b) => b.id === blockId);

  if (blockIndex === -1) {
    notFound();
  }

  const block = blocks[blockIndex];

  // Calculate previous and next blocks for navigation
  const prevBlock = blocks[(blockIndex - 1 + blocks.length) % blocks.length];
  const nextBlock = blocks[(blockIndex + 1) % blocks.length];

  const Section = ({ image, description, color, textColor, reverse = false }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    const imageVariants = {
      hidden: { opacity: 0, x: reverse ? 100 : -100, scale: 0.9 },
      visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: [0.17, 0.55, 0.55, 1] } },
    };

    const textVariants = {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut', delay: 0.2 } },
    };

    return (
      <div ref={ref} className="w-full min-h-screen flex flex-col md:flex-row">
        {/* Mobile Image */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={imageVariants}
          className="md:hidden w-full h-[60vh] flex items-center justify-center shadow-lg"
          style={{ backgroundColor: color }}
        >
          <span className={`text-4xl font-bold ${textColor}`}>{image}</span>
        </motion.div>

        {/* Desktop Layout */}
        <div className={`hidden md:flex w-1/2 min-h-screen items-center justify-center ${reverse ? 'md:order-2' : ''}`}>
            <motion.div
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={imageVariants}
              className="w-full h-full flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: color, aspectRatio: '9/16' }}
            >
              <div className="w-full h-full flex items-center justify-center" style={{maxHeight: '100vh'}}>
                <span className={`text-4xl font-bold ${textColor}`}>{image}</span>
              </div>
            </motion.div>
        </div>

        <div className={`w-full md:w-1/2 min-h-screen flex items-center justify-center p-8 md:p-12 ${reverse ? 'md:order-1' : ''}`}>
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={textVariants}
            className="max-w-md text-center md:text-left"
          >
            <h2 className="text-4xl font-bold mb-6" style={{ color }}>{description.title}</h2>
            <p className="text-gray-600 text-lg leading-relaxed">{description.text}</p>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Add the new navigation component here */}
      <BlockNavigation prevBlock={prevBlock} nextBlock={nextBlock} />

       <header className="py-12 text-center bg-gray-50">
        <h1 className="text-6xl font-extrabold" style={{ color: block.color }}>
          {block.name}
        </h1>
      </header>

      <Section
        image="写真1"
        description={{ title: "最高の仲間たちと", text: block.description1 }}
        color={block.color}
        textColor={block.textColor}
      />
      <Section
        image="写真2"
        description={{ title: "勝利への軌跡", text: block.description2 }}
        color={block.color}
        textColor={block.textColor}
        reverse={true}
      />

      {/* Remove the old navigation and add a simple link back to the list */}
      <div className="text-center py-16 bg-gray-50">
        <Link href="/blocks">
          <span className="text-blue-600 hover:bg-blue-100 font-bold py-3 px-6 rounded-full transition-all duration-300">
            ブロック一覧へ戻る
          </span>
        </Link>
      </div>
    </div>
  );
};

export default BlockDetailPage;