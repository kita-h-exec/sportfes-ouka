'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import HamburgerMenu from './HamburgerMenu';
import { useState, useEffect } from 'react';
import { useMenu } from '@/components/useMenu';
import { getHeaderAnnouncement } from '@/lib/directus';

interface HeaderProps {
  isScrolled: boolean;
  forceBlackText?: boolean;
}

interface Announcement {
  title: string;
}

const Header = ({ isScrolled, forceBlackText }: HeaderProps) => {
  const { isMenuOpen } = useMenu();
  const [headerAnnouncement, setHeaderAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchHeaderAnnouncement = async () => {
      const announcement = await getHeaderAnnouncement();
      setHeaderAnnouncement(announcement);
    };
    fetchHeaderAnnouncement();
  }, []);

  const headerBgClass = isScrolled
    ? 'backdrop-blur-sm shadow-md'
    : 'bg-transparent';

  const textColor = forceBlackText || isScrolled || isMenuOpen ? '#333' : '#fff';

  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${headerBgClass}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="text-2xl font-bold">
            <Link href="/">
              <h1
                className="transition-colors duration-300"
                style={{ color: textColor }}
              >
                うんどう会
              </h1>
            </Link>
          </div>
          <HamburgerMenu isScrolled={isScrolled} forceBlackText={forceBlackText} />
        </div>
      </div>
      {headerAnnouncement && (
        <div className="bg-fuchsia-600 text-white text-center py-2 text-sm font-bold">
          <Link href="/announcements">
            <span className="hover:underline">{headerAnnouncement.title}</span>
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;