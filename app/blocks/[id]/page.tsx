'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { blocks as blocksData } from '@/lib/blocksData';

const BlockPage = () => {
  const params = useParams();
  const block = blocksData.find((b) => b.id === params.id);

  if (!block) {
    return <div>Block not found</div>;
  }

  // To avoid repetition
  const Text1 = () => (
    <>
      <h1 className="text-4xl font-bold">{block.name}</h1>
      <p className="mt-4">{block.description1}</p>
    </>
  );

  const Text2 = () => (
    <>
      <h2 className="text-2xl font-bold">サブタイトル</h2>
      <p className="mt-2">{block.description2}</p>
    </>
  );

  return (
    <div>
      {/* Desktop View */}
      <div className="hidden md:flex w-full h-screen">
        <div className="relative w-1/2 h-full">
          <Image
            src={block.image1}
            alt={`${block.name} image 1`}
            layout="fill"
            objectFit="cover"
            className="aspect-[9/16]"
          />
          <div className="absolute top-8 left-8 right-8 p-4 rounded-lg bg-black bg-opacity-50 text-white">
            <Text1 />
          </div>
        </div>
        <div className="relative w-1/2 h-full">
          <Image
            src={block.image2}
            alt={`${block.name} image 2`}
            layout="fill"
            objectFit="cover"
            className="aspect-[9/16]"
          />
          <div className="absolute top-8 left-8 right-8 p-4 rounded-lg bg-black bg-opacity-50 text-white">
            <Text2 />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="relative w-full h-[80vh]">
          <Image
            src={block.image1}
            alt={`${block.name} image 1`}
            layout="fill"
            objectFit="cover"
          />
        </div>
        <div className="p-4">
          <Text1 />
        </div>
        <div className="relative w-full h-[80vh]">
          <Image
            src={block.image2}
            alt={`${block.name} image 2`}
            layout="fill"
            objectFit="cover"
          />
        </div>
        <div className="p-4">
          <Text2 />
        </div>
      </div>
    </div>
  );
};

export default BlockPage;