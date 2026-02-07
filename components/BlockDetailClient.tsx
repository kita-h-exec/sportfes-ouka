'use client';


import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import BlockNavigation from '@/components/BlockNavigation';

// Directusから取得するデータの型定義
export interface Block {
  slug: string;
  name: string;
  color: string;
  text_color: string;
  section_1_title?: string;
  section_1_description?: string;
  section_2_title?: string;
  section_2_description?: string;
}

// アニメーションなどを含むクライアントコンポーネント
const BlockDetailClient = ({ block, prevBlock, nextBlock }: { block: Block, prevBlock: Block, nextBlock: Block }) => {

  const Section = ({ imageUrl, title, description, color, textColor, reverse = false }: { imageUrl?: string, title?: string, description?: string, color: string, textColor: string, reverse?: boolean }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    

    const textVariants = {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 } },
    } as const;

    return (
      <div ref={ref} className="w-full min-h-screen flex flex-col md:flex-row">
        {/* Mobile Image */}
        <div
          className="md:hidden w-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: color }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title || 'Block Image'} className="w-full h-auto" />
          ) : (
            <div className="w-full h-[60vh] flex items-center justify-center">
              <span className={`text-4xl font-bold ${textColor}`}>No Image</span>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className={`hidden md:flex w-1/2 min-h-screen items-center justify-center ${reverse ? 'md:order-2' : ''}`}>
            <div
              className="w-full h-full flex items-center justify-center shadow-2xl relative"
              style={{ backgroundColor: color, aspectRatio: '9/16' }}
            >
              <div className="w-full h-full flex items-center justify-center" style={{maxHeight: '100vh'}}>
                {imageUrl ? (
                  <Image src={imageUrl} alt={title || 'Block Image'} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <span className={`text-4xl font-bold ${textColor}`}>No Image</span>
                )}
              </div>
            </div>
        </div>

        <div className={`w-full md:w-1/2 min-h-screen flex items-center justify-center p-8 md:p-12 ${reverse ? 'md:order-1' : ''}`}>
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={textVariants}
            className="max-w-md text-center md:text-left"
          >
            {/** 白背景の場合は見辛さ回避のため文字色を黒 (#000) へフォールバック */}
            {(() => {
              const isWhiteBg = typeof color === 'string' && /^(#fff(fff)?|#FFFFFF|#ffffff)$/i.test(color.trim());
              const titleStyle: React.CSSProperties = { color: isWhiteBg ? '#000' : color };
              return <h2 className="text-4xl font-bold mb-6" style={titleStyle}>{title}</h2>;
            })()}
            {description && <p className="text-gray-600 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />}
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white pt-40">
      

       <header className="py-12 text-center bg-gray-50">
        {(() => {
          const isWhiteBg = typeof block.color === 'string' && /^(#fff(fff)?|#FFFFFF|#ffffff)$/i.test(block.color.trim());
          const titleStyle: React.CSSProperties = { color: isWhiteBg ? '#000' : block.color };
          return (
            <h1 className="text-6xl font-extrabold" style={titleStyle}>
              {block.name}
            </h1>
          );
        })()}
      </header>

      <Section
        imageUrl={`/images/blocks/${block.slug}-deco.jpg`}
        title={block.section_1_title}
        description={block.section_1_description}
        color={block.color}
        textColor={block.text_color}
      />
      <Section
        imageUrl={`/images/blocks/${block.slug}-st.jpg`}
        title={block.section_2_title}
        description={block.section_2_description}
        color={block.color}
        textColor={block.text_color}
        reverse={true}
      />
      <BlockNavigation prevBlock={prevBlock} nextBlock={nextBlock} />
    </div>
  );
}

export default BlockDetailClient;
