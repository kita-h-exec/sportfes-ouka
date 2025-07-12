import Link from 'next/link';
import { blocks } from '@/lib/blocksData';

const BlocksPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <header className="py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-extrabold text-center text-gray-800">
            ブロック紹介
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-3 gap-6 md:gap-8">
          {blocks.map((block) => (
            <Link key={block.id} href={`/blocks/${block.id}`} passHref>
              <div style={{ backgroundColor: block.color }} className={`aspect-square rounded-xl shadow-2xl flex items-center justify-center text-4xl font-bold cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-fuchsia-300/50 ${block.textColor}`}>
                <span className="drop-shadow-lg">{block.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default BlocksPage;
