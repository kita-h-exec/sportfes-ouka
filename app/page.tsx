import { getBlocks } from '@/lib/directus';
import HomeClient from '@/components/HomeClient';

export default async function Home() {
  const blocks = await getBlocks();

  return <HomeClient blocks={blocks} />;
}
