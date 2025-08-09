"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { EmergencyBar } from "@/components/home/EmergencyBar";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";

async function getEmergencyMessage() {
  try {
    const response = await directus.request(
      readItems('emergency', {
        sort: ['-date_created'],
        limit: 1,
        fields: ['message'],
      })
    );
    return response[0]?.message || null;
  } catch (error) {
    console.error("Failed to fetch emergency message:", error);
    return null;
  }
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      const message = await getEmergencyMessage();
      setEmergencyMessage(message);
    };
    fetchMessage();
  }, []);

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
              <EmergencyBar message={emergencyMessage || ""} />
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