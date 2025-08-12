'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import EmergencyBar from './EmergencyBar';
import HamburgerMenu from './HamburgerMenu';
import { useMenu } from '@/components/useMenu'; // useMenuをインポート

// isScrolledのみを受け取るようにインターフェースを更新
interface HeaderProps {
  isScrolled: boolean;
}

const Header = ({ isScrolled }: HeaderProps) => {
  const { isMenuOpen } = useMenu(); // isMenuOpenを直接取得

  return (
    <motion.header
      className="fixed top-0 left-0 w-full z-40 transition-colors duration-300"
      style={{
        backdropFilter: isScrolled ? 'blur(12px)' : 'blur(0px)',
        backgroundColor: isScrolled
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(255, 255, 255, 0)',
      }}
    >
      <div className="flex flex-col">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold">
            <Link href="/">
              <h1
                className="transition-colors duration-300"
                style={{ color: isScrolled || isMenuOpen ? "#333" : "#fff" }}
              >
                うんどう会
              </h1>
            </Link>
          </div>
          {/* isScrolledのみを渡す */}
          <HamburgerMenu isScrolled={isScrolled} />
        </div>
        <EmergencyBar />
      </div>
    </motion.header>
  );
};

export default Header;