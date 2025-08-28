import HomeClient from '@/components/home/HomeClient';
import { getBlocks } from '@/lib/directus';

export default async function Home() {
	// サーバーサイドでブロックを先読みしてクライアントの初期フラッシュを防止
	let blocks: any[] = [];
	try { blocks = await getBlocks(); } catch { /* ignore */ }
	return <HomeClient initialBlocks={blocks as any} />;
}