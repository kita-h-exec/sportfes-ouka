'use client';

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";
import Header from "@/components/home/Header";

export default function HomeClient({ blocks }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (isLoading) {
      document.body.classList.add("splash-active");
    } else {
      document.body.classList.remove("splash-active");
    }
  }, [isLoading]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const disableSnapOnScroll = () => {
      setTimeout(() => {
        document.documentElement.classList.add('scroll-snap-disabled');
      }, 200); // Add a 200ms delay
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener('scroll', disableSnapOnScroll, { once: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      // No need to remove the once listener, but it's good practice
      window.removeEventListener('scroll', disableSnapOnScroll);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <SplashScreen onAnimationComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      {!isLoading && (
        <>
          <Header isScrolled={isScrolled} />
          <div className="h-screen relative scroll-snap-section">
            <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
              <span className="text-2xl font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_100%)]">
                Scroll
              </span>
              <svg
                className="animate-bounce w-12 h-12 text-white filter drop-shadow-lg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                ></path>
              </svg>
            </div>
          </div>
          <div className="relative z-10 pt-32 pb-10 scroll-snap-section">
            <div className="container mx-auto px-4 space-y-12">
              <CountdownTimer targetDate="2025-09-19T15:40:00" />
              {/* EmergencyBar is now in Header */}
              <Schedule />
              <Contents />
              <Blocks blocks={blocks} />
            </div>
          </div>
        </>
      )}
    </>
  );
}