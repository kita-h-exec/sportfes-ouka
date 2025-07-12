"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { EmergencyBar } from "@/components/home/EmergencyBar";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleAnimationComplete = () => {
    setIsLoading(false);
  };

  if (!hasMounted) {
    return null;
  }

  return (
    <main className="relative bg-white">
      <AnimatePresence>
        {isLoading && <SplashScreen onAnimationComplete={handleAnimationComplete} />}
      </AnimatePresence>
      {!isLoading && (
        <div className="main-content" style={{ paddingTop: 0 }}>
          <div
            className="h-screen bg-cover bg-center"
            style={{ backgroundImage: "url(/splash-background.jpg)" }}
          ></div>
          <CountdownTimer targetDate="2025-09-27T09:00:00" />
          <EmergencyBar message={null} />
          <Schedule />
          <Contents />
          <Blocks />
        </div>
      )}
    </main>
  );
}
