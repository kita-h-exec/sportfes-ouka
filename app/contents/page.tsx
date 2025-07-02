import Link from "next/link";
import React from 'react';

// リンクカードのコンポーネント
const LinkCard = ({ href, title, description }: { href: string; title: string; description: string; }) => {
  return (
    <Link href={href} className="aspect-square bg-white rounded-lg shadow-md p-4 flex flex-col justify-center items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <h3 className="font-bold text-lg text-indigo-700">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
};


export default function ContentsPage() {
  // ▼▼▼ Directus連携ポイント ▼▼▼
  // このリストをDirectusから取得するように変更します。
  // そうすることで、管理画面から目次の項目を自由に追加・編集できるようになります。
  const contentsList = [
    { href: "/about", title: "About", description: "ご挨拶など" },
    { href: "/news", title: "お知らせ", description: "運営からのお知らせ" },
    { href: "/competitions", title: "競技", description: "競技の紹介" },
    { href: "/programs", title: "プログラム", description: "当日の演目" },
    { href: "/blocks", title: "ブロック紹介", description: "各ブロックの紹介" },
    { href: "/glossary", title: "用語集", description: "関連リンク集" },
    { href: "/map", title: "MAP", description: "校内地図・避難経路" },
    { href: "/visitors-guide", title: "来場者案内", description: "アクセス情報など" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">コンテンツ</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {contentsList.map(item => (
          <LinkCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}