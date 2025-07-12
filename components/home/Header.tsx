
'use client';

import Link from 'next/link';
import HamburgerMenu from './HamburgerMenu';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 p-4 flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-md">
      <Link href="/">
        <h1 className="text-2xl font-bold">うんどう会</h1>
      </Link>
      <HamburgerMenu />
    </header>
  );
};

export default Header;
