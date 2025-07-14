'use client';

import Link from 'next/link';

interface BlockInfo {
  id: string;
  name: string;
}

interface BlockNavigationProps {
  prevBlock: BlockInfo;
  nextBlock: BlockInfo;
}

const BlockNavigation = ({ prevBlock, nextBlock }: BlockNavigationProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md mx-auto z-50 flex justify-between px-4">
      <Link href={`/blocks/${prevBlock.id}`}>
        <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-transform hover:scale-110 active:scale-95 text-gray-800 font-bold">
          ← {prevBlock.name}
        </span>
      </Link>
      <Link href="/blocks">
        <span className="px-6 py-3 rounded-full bg-blue-500/90 text-white backdrop-blur-sm shadow-lg transition-transform hover:scale-110 active:scale-95 font-bold">
          ブロック一覧
        </span>
      </Link>
      <Link href={`/blocks/${nextBlock.id}`}>
        <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-transform hover:scale-110 active:scale-95 text-gray-800 font-bold">
          {nextBlock.name} →
        </span>
      </Link>
    </div>
  );
};

export default BlockNavigation;