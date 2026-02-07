import Link from 'next/link';
import { getBlocks } from '@/lib/directus';

// Directusから取得するデータの型を定義
interface Block {
  slug: string;
  name: string;
  color: string;
  text_color: string;
}

const BlocksPage = async () => {
  const blocks = await getBlocks() as unknown as Block[]; // directus sdk 戻り値をBlock配列として扱う

  return (
    <div className="min-h-screen bg-white pt-40">
      <header className="py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-extrabold text-center text-gray-800">
            ブロック紹介
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 pb-16">
        <div className="flex flex-col gap-8">
          {blocks.map((block) => {
            const isWhiteBg = typeof block.color === 'string' && /^(#fff(fff)?|#FFFFFF|#ffffff)$/i.test(block.color.trim());
            const enforcedTextStyle: React.CSSProperties | undefined = isWhiteBg ? { color: '#000' } : undefined;
            return (
              <Link key={block.slug} href={`/blocks/${block.slug}`} passHref>
                <div style={{ backgroundColor: block.color }} className={`w-full h-56 rounded-xl shadow-2xl flex items-center justify-center text-4xl font-bold cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-fuchsia-300/50 ${block.text_color}`}>
                  <span className="drop-shadow-lg" style={enforcedTextStyle}>{block.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default BlocksPage;
