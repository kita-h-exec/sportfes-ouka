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
  const shouldForceBlackText = pathname.startsWith('/blocks') || pathname.startsWith('/announcements');

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
        <title>うんどう会特設サイト</title>
        <meta name="description" content="R7うんどう会HP" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* PWA meta */}
  <meta name="theme-color" content="#111827" />
  <meta name="mobile-web-app-capable" content="yes" />
  {/* Cache-bust the manifest to avoid iOS using stale metadata */}
  <link rel="manifest" href="/manifest.webmanifest?v=20250817" />
  {/* Some platforms use this as the app name fallback */}
  <meta name="application-name" content="うんどう会" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="うんどう会" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
        {/* Fallback icons */}
        <link rel="icon" href="/window.svg" type="image/svg+xml" />
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
        {/* Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}`,
          }}
        />
      </body>
    </html>
  );
}