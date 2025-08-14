'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import HamburgerMenu from './HamburgerMenu';
import { useMenu } from '@/components/useMenu';
import { useEffect, useState } from 'react';
import { fetchEmergencyMessage } from '@/lib/directus';

interface HeaderProps {
  isScrolled: boolean;
}

const Header = ({ isScrolled }: HeaderProps) => {
  const { isMenuOpen } = useMenu();
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);

  useEffect(() => {
    const getMessage = async () => {
      try {
        const message = await fetchEmergencyMessage();
        console.log('Fetched emergency message:', message);
        setEmergencyMessage(message);
      } catch (error) {
        console.error('Failed to fetch emergency message:', error);
        setEmergencyMessage(null);
      }
    };

    // 初回ロード時に取得
    getMessage();

    // 5秒ごとにメッセージを再取得
    const intervalId = setInterval(getMessage, 5000); // 5000ms = 5秒

    // コンポーネントがアンマウントされるときにインターバルをクリア
    return () => clearInterval(intervalId);
  }, []); // 依存配列は空のまま

  useEffect(() => {
    console.log('Current emergencyMessage state:', emergencyMessage);
  }, [emergencyMessage]);

  return (
    <motion.header
      className="fixed top-0 left-0 w-full z-40 transition-colors duration-300"
      style={{
        backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        backgroundColor: isScrolled
          ? 'rgba(255, 255, 255, 0.1)'
          : 'transparent',
      }}
    >
      <div className="flex flex-col">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold">
            <Link href="/">
              <h1
                className="transition-colors duration-300"
                style={{ color: isScrolled || isMenuOpen ? '#333' : '#fff' }}
              >
                うんどう会
              </h1>
            </Link>
          </div>
          <HamburgerMenu isScrolled={isScrolled} />
        </div>
        {emergencyMessage && (
          <div
            className="bg-red-500 text-white text-center p-2"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {emergencyMessage}
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
