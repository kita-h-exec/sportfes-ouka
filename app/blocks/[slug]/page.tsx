import { notFound } from 'next/navigation';
import { getBlockBySlug, getBlocks } from '@/lib/directus';
import BlockDetailClient, { Block } from '@/components/BlockDetailClient';

// データを取得するためのサーバーコンポーネント
const BlockDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const [block, allBlocks] = await Promise.all([
    getBlockBySlug(slug),
    getBlocks(),
  ]);

  if (!block) {
    notFound();
  }

  const blockIndex = allBlocks.findIndex((b: Block) => b.slug === block.slug);
  const prevBlock = allBlocks[(blockIndex - 1 + allBlocks.length) % allBlocks.length];
  const nextBlock = allBlocks[(blockIndex + 1) % allBlocks.length];

  return <BlockDetailClient block={block} prevBlock={prevBlock} nextBlock={nextBlock} />;
};

export default BlockDetailPage;