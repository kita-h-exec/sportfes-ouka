import { notFound } from 'next/navigation';
import { getBlockBySlug, getBlocks } from '@/lib/directus';
import BlockDetailClient, { Block } from '@/components/BlockDetailClient';

// データ取得サーバーコンポーネント
const BlockDetailPage = async ({ params }: { params: { slug: string } }) => {
  const slug = params.slug;
  try {
    const [blockRaw, allBlocksRaw] = await Promise.all([
      getBlockBySlug(slug),
      getBlocks(),
    ]);
    const block = blockRaw as unknown as Block | undefined;
    const allBlocks = (allBlocksRaw as unknown as Block[]) || [];
    if (!block) return notFound();
    const blockIndex = allBlocks.findIndex((b) => b.slug === block.slug);
    if (blockIndex === -1) return notFound();
    const prevBlock = allBlocks[(blockIndex - 1 + allBlocks.length) % allBlocks.length];
    const nextBlock = allBlocks[(blockIndex + 1) % allBlocks.length];
    return <BlockDetailClient block={block} prevBlock={prevBlock} nextBlock={nextBlock} />;
  } catch (e) {
    console.error('[BlockDetailPage] fetch error', e);
    return notFound();
  }
};

export default BlockDetailPage;