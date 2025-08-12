'use client';

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoading) {
      document.body.classList.add("splash-active");
    } else {
      document.body.classList.remove("splash-active");
    }
  }, [isLoading]);

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <SplashScreen onAnimationComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      {!isLoading && (
        <>
          <div className="h-screen" />
          <div className="relative z-10 py-10">
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
