'use client';

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";
import Header from "@/components/home/Header";

export default function Home() {
  // Decide splash per context (browser vs PWA standalone) and avoid flash
  const [splashState, setSplashState] = useState<"unknown" | "show" | "hide">("unknown");
  const isLoading = splashState === "show";
  const [isScrolled, setIsScrolled] = useState(false);

  // Feature flag: once-per-day splash (disabled by default). Toggle to true to enable.
  const ENABLE_DAILY_SPLASH = false;

  useEffect(() => {
    // Force scroll to top to avoid auto-snapping on load.
    window.scrollTo(0, 0);
  }, []);

  // Decide whether to show splash based on prior visit and display mode (PWA vs web)
  useEffect(() => {
    const decide = () => {
      try {
        const isStandalone =
          (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
          // iOS Safari specific
          // @ts-ignore
          (typeof navigator !== 'undefined' && navigator.standalone === true);
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        if (isStandalone) {
          // PWA: show at app launch only once per session; with daily flag enabled, limit to once per day as well
          const shownThisLaunch = sessionStorage.getItem('splash_session_pwa') === '1';
          if (shownThisLaunch) {
            setSplashState('hide');
          } else if (ENABLE_DAILY_SPLASH) {
            const last = localStorage.getItem('splash_daily_pwa');
            setSplashState(last === today ? 'hide' : 'show');
          } else {
            setSplashState('show');
          }
        } else {
          // Web: daily mode ON -> once per day, otherwise first-visit-only
          if (ENABLE_DAILY_SPLASH) {
            const last = localStorage.getItem('splash_daily_web');
            setSplashState(last === today ? 'hide' : 'show');
          } else {
            const seen = localStorage.getItem('splashSeen_v1_web');
            setSplashState(seen ? 'hide' : 'show');
          }
        }
      } catch {
        setSplashState('hide');
      }
    };
    decide();
  }, []);

  useEffect(() => {
    if (splashState === 'show') {
      document.body.classList.add('splash-active');
    } else {
      document.body.classList.remove('splash-active');
    }
  }, [splashState]);

  useEffect(() => {
    if (isLoading) return; // Don't attach scroll listeners while loading

    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const disableSnapOnScroll = () => {
      document.documentElement.classList.add('scroll-snap-disabled');
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener('scroll', disableSnapOnScroll, { once: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      // No need to remove the once listener, but it's good practice
      window.removeEventListener('scroll', disableSnapOnScroll);
    };
  }, [isLoading]);

  // Avoid flash before decision
  if (splashState === 'unknown') return null;

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <SplashScreen
            onAnimationComplete={() => {
              try {
                const isStandalone =
                  (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                  // @ts-ignore
                  (typeof navigator !== 'undefined' && navigator.standalone === true);
                const today = new Date().toISOString().slice(0, 10);
                if (isStandalone) {
                  // mark session as shown; and optionally mark today's date
                  sessionStorage.setItem('splash_session_pwa', '1');
                  if (ENABLE_DAILY_SPLASH) {
                    localStorage.setItem('splash_daily_pwa', today);
                  }
                } else {
                  if (ENABLE_DAILY_SPLASH) {
                    localStorage.setItem('splash_daily_web', today);
                  } else {
                    localStorage.setItem('splashSeen_v1_web', '1');
                  }
                }
              } catch {}
              setSplashState('hide');
            }}
          />
        )}
      </AnimatePresence>

      {splashState === 'hide' && (
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
              <Blocks />
            </div>
          </div>
        </>
      )}
    </>
  );
}