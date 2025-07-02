import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
// ▼▼▼【修正】より確実な相対パスで SplashScreen をインポートします ▼▼▼
import { SplashScreen } from "../components/SplashScreen";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "〇〇祭 公式サイト",
  description: "イベントの公式ウェブサイトです。",
};

// ヘッダーコンポーネント
const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-800">
          ロゴ
        </Link>
      </div>
    </header>
  );
};

// 緊急のお知らせコンポーネント（ガワ）
const EmergencyNotice = () => {
  const notice = {
    message: "【緊急】ただいま、〇〇エリアが大変混み合っております。ご注意ください。",
  };

  if (!notice) return null;

  return (
    <div className="bg-red-500 text-white text-center p-2 text-sm font-bold animate-pulse">
      {notice.message}
    </div>
  );
};

// RootLayout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <SplashScreen />
        <div className={`${inter.className} bg-gray-50 text-gray-800`}>
          <Header />
          <EmergencyNotice />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}