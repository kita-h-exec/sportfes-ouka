'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import { usePathname } from 'next/navigation';
import './globals.css';
import Header from '@/components/home/Header';
import MenuOverlay from '@/components/MenuOverlay';
import { MenuProvider } from '@/lib/MenuContext'; // MenuProviderをインポート

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const shouldForceBlackText = pathname.startsWith('/blocks');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const unsubscribe = scrollY.on('change', (latest) => {
      const bgImage = document.getElementById('background-image');
      if (bgImage) {
        const blur = Math.min(latest / 30, 12);
        bgImage.style.filter = `blur(${blur}px)`;
      }
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, [scrollY]);

  return (
    <html lang="ja">
      <head>
        <title>運動会特設サイト</title>
        <meta name="description" content="最高の思い出を作ろう！" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white dark:bg-background-dark font-sans">
        <MenuProvider> {/* MenuProviderでラップ */}
          <motion.div
            id="background-image"
            className="fixed top-0 left-0 w-full h-screen bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/splash-background.jpg')" }}
          />
          <Header isScrolled={isScrolled} forceBlackText={shouldForceBlackText} />
          <MenuOverlay />

          <main className="relative z-10">{children}</main>

          <footer className="relative z-10 bg-gray-800 text-white p-4 text-center mt-10">
            <p>&copy; 2025 うんどう会運営委員会/執行委員会</p>
          </footer>
        </MenuProvider>
      </body>
    </html>
  );
}