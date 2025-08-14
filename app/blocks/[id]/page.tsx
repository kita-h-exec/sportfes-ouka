import { notFound } from 'next/navigation';
import { getBlocks } from '@/lib/directus';
import Link from 'next/link';
import BlockNavigation from '@/components/BlockNavigation';
import Image from 'next/image';
import { Suspense } from 'react';

interface Block {
  block_id: number;
  name: string;
  color: string;
  text_color: string;
  image1: string;
  description1_title: string;
  description1_text: string;
  image2: string;
  description2_title: string;
  description2_text: string;
}

interface SectionProps {
  imageSrc: string;
  title: string;
  text: string;
  color: string;
  textColor: string;
  reverse?: boolean;
}

const Section = ({ imageSrc, title, text, color, textColor, reverse = false }: SectionProps) => {
  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row">
      <div className="md:hidden w-full h-[60vh] flex items-center justify-center shadow-lg relative" style={{ backgroundColor: color }}>
        {imageSrc && <Image src={imageSrc} alt={title} layout="fill" objectFit="cover" />}
      </div>
      <div className={`hidden md:flex w-1/2 min-h-screen items-center justify-center ${reverse ? 'md:order-2' : ''}`}>
        <div className="w-full h-full flex items-center justify-center shadow-2xl relative" style={{ backgroundColor: color, aspectRatio: '9/16' }}>
          <div className="w-full h-full flex items-center justify-center" style={{ maxHeight: '100vh' }}>
            {imageSrc && <Image src={imageSrc} alt={title} layout="fill" objectFit="cover" />}
          </div>
        </div>
      </div>
      <div className={`w-full md:w-1/2 min-h-screen flex items-center justify-center p-8 md:p-12 ${reverse ? 'md:order-1' : ''}`}>
        <div className="max-w-md text-center md:text-left">
          <h2 className="text-4xl font-bold mb-6" style={{ color: textColor || color }}>{title}</h2>
          <p className="text-gray-600 text-lg leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
};

async function BlockContent({ idString }: { idString: string }) {
  const blockId = parseInt(idString, 10);
  const blocks = (await getBlocks()) as Block[];

  if (!blocks || blocks.length === 0) {
    notFound();
  }

  const blockIndex = blocks.findIndex((b) => b.block_id === blockId);

  if (blockIndex === -1) {
    notFound();
  }

  const block = blocks[blockIndex];
  const prevBlock = blocks[(blockIndex - 1 + blocks.length) % blocks.length];
  const nextBlock = blocks[(blockIndex + 1) % blocks.length];

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  const image1Src = block.image1 ? `${directusUrl}/assets/${block.image1}` : '';
  const image2Src = block.image2 ? `${directusUrl}/assets/${block.image2}` : '';

  return (
    <div className="bg-white">
      <BlockNavigation 
        prevBlock={{id: prevBlock.block_id.toString(), name: prevBlock.name}}
        nextBlock={{id: nextBlock.block_id.toString(), name: nextBlock.name}}
      />
      <header className="py-12 text-center bg-gray-50">
        <h1 className="text-6xl font-extrabold" style={{ color: block.color }}>
          {block.name}
        </h1>
      </header>
      <Section imageSrc={image1Src} title={block.description1_title} text={block.description1_text} color={block.color} textColor={block.text_color} />
      <Section imageSrc={image2Src} title={block.description2_title} text={block.description2_text} color={block.color} textColor={block.text_color} reverse={true} />
      <div className="text-center py-16 bg-gray-50">
        <Link href="/blocks">
          <span className="text-blue-600 hover:bg-blue-100 font-bold py-3 px-6 rounded-full transition-all duration-300">
            ブロック一覧へ戻る
          </span>
        </Link>
      </div>
    </div>
  );
}

const BlockDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlockContent idString={id} />
    </Suspense>
  );
};

export default BlockDetailPage;
