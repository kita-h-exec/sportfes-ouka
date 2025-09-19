'use client';

import Link from 'next/link';

interface BlockInfo {
  slug: string;
  name: string;
}

interface BlockNavigationProps {
  prevBlock: BlockInfo;
  nextBlock: BlockInfo;
}

const BlockNavigation = ({ prevBlock, nextBlock }: BlockNavigationProps) => {
  return (
    <div className="flex justify-center items-center flex-nowrap gap-x-4 px-4 py-12">
      <Link
        href={`/blocks/${prevBlock.slug}`}
        className="whitespace-nowrap rounded-full bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 sm:px-4 sm:text-sm font-bold text-gray-800"
        style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
      >
        ← {prevBlock.name}
      </Link>
      <Link
        href="/blocks"
        className="whitespace-nowrap rounded-full bg-blue-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 sm:px-6 sm:py-3 sm:text-base"
        style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
      >
        ブロック一覧
      </Link>
      <Link
        href={`/blocks/${nextBlock.slug}`}
        className="whitespace-nowrap rounded-full bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 sm:px-4 sm:text-sm font-bold text-gray-800"
        style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
      >
        {nextBlock.name} →
      </Link>
    </div>
  );
};

export default BlockNavigation;
