'use client';

import { useMenu } from '@/components/useMenu';

// isScrolledのみを受け取るように変更
interface HamburgerMenuProps {
  isScrolled: boolean;
}

const HamburgerMenu = ({ isScrolled }: HamburgerMenuProps) => {
  // useMenuフックを直接呼び出す
  const { isMenuOpen, toggleMenu } = useMenu();

  // isMenuOpenも色の判定に加える
  const iconColor = isScrolled || isMenuOpen ? "text-gray-800" : "text-white";

  return (
    <button 
      onClick={toggleMenu} 
      className="relative z-[110] p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-lg transition-transform hover:scale-110 active:scale-95"
      aria-label="メニューを開閉する"
    >
      <svg className={`w-6 h-6 ${iconColor} transition-colors duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {isMenuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        )}
      </svg>
    </button>
  );
};

export default HamburgerMenu;