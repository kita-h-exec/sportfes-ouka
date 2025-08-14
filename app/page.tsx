import { getBlocks } from '@/lib/directus';
import HomeClient from '@/components/HomeClient';

interface DirectusBlock {
  block_id: number;
  name: string;
  color: string;
  text_color: string;
  image1?: string;
  description1_title?: string;
  description1_text?: string;
  image2?: string;
  description2_title?: string;
  description2_text?: string;
}

interface Block {
  block_id: number;
  name: string;
  color: string;
  textColor: string;
}

export default async function Home() {
  const directusBlocks = await getBlocks() as DirectusBlock[];
  
  // Map directus data to component format
  const blocks: Block[] = directusBlocks.map(block => ({
    block_id: block.block_id,
    name: block.name,
    color: block.color,
    textColor: block.text_color,
  }));

  return <HomeClient blocks={blocks} />;
}
