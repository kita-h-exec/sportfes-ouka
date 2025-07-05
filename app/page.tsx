'use client';

import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/home/Header";
import { EmergencyBar } from "@/components/home/EmergencyBar";
import { Schedule } from "@/components/home/Schedule";
import { Contents } from "@/components/home/Contents";
import { Blocks } from "@/components/home/Blocks";
import { createDirectus, rest, readItems } from '@directus/sdk';

// const client = createDirectus('http://localhost:8055').with(rest());

// Animated text components remain unchanged
const AnimatedChar = ({ char }: { char: string }) => {
  return (
    <motion.span
      className="inline-block"
      variants={{
        hidden: { y: "100%", opacity: 0 },
        visible: { y: 0, opacity: 1 },
      }}
      transition={{ type: "spring", damping: 12, stiffness: 200 }}
    >
      {char}
    </motion.span>
  );
};
const AnimatedText = ({ text, className }: { text: string, className?: string }) => {
  const words = text.split(" ");
  return (
    <motion.div
      className={className}
      variants={{ 
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block mr-2">
          {word.split("").map((char, j) => <AnimatedChar key={j} char={char} />)}
        </span>
      ))}
    </motion.div>
  );
};

const CountdownTimer = () => {
  const eventDate = new Date("2025-10-25T09:00:00");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = eventDate.getTime() - now.getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else { clearInterval(timer); }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      className="glass-effect p-8 rounded-3xl shadow-2xl text-center"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.5 } }}
    >
      <h2 className="text-2xl font-bold mb-4 text-white/90">運動会開催まで</h2>
      <div className="text-5xl md:text-7xl font-mono font-extrabold text-white">
        <span className="tabular-nums tracking-widest">{String(timeLeft.days).padStart(3, '0')}</span><span className="text-2xl mx-1">日</span>
        <span className="tabular-nums tracking-widest">{String(timeLeft.hours).padStart(2, '0')}</span><span className="text-2xl mx-1">:</span>
        <span className="tabular-nums tracking-widest">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="text-2xl mx-1">:</span>
        <span className="tabular-nums tracking-widest">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </motion.div>
  );
};



export default function HomePage() {
  const [isSplashActive, setIsSplashActive] = useState(true);
  // const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);
  const mainRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: mainRef });
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

  // useEffect(() => {
  //   const fetchEmergencyMessage = async () => {
  //     try {
  //       const result = await client.request(
  //         readItems('emergency', {
  //           sort: ['-date_created'],
  //           limit: 1,
  //         })
  //       );
  //       if (result && result.length > 0) {
  //         setEmergencyMessage(result[0].message);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch emergency message:', error);
  //     }
  //   };
  // 
  //   fetchEmergencyMessage();
  // }, []);

  return (
    <>
      <AnimatePresence>
        {isSplashActive && (
          <SplashScreen onAnimationComplete={() => setIsSplashActive(false)} />
        )}
      </AnimatePresence>
      
      <Header />
      <EmergencyBar message={null} />

      <motion.div
        className="bg-background text-foreground min-h-screen overflow-y-auto"
        ref={mainRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: isSplashActive ? 0 : 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Main Visual Area */}
        <header className="relative h-screen flex items-center justify-center overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 w-full h-full z-0"
            style={{ scale: backgroundScale }}
          >
            <img src="/splash-background.jpg" alt="運動会のイメージ画像" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-background via-black/50 to-transparent"></div>
          </motion.div>
          <div className="relative z-10 flex flex-col items-center">
            <CountdownTimer />
            <motion.div 
              className="mt-12 text-white text-2xl cursor-pointer"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              onClick={() => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ↓
            </motion.div>
          </div>
        </header>

        {/* Contents Area */}
        <main id="main-content" className="container mx-auto px-4 py-24">
          <Schedule />
          <Contents />
          <Blocks />
          
          <motion.div 
            className="text-center mt-32"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: "spring", duration: 1.5, bounce: 0.5 }}
          >
            <Link href="/contents" className="bg-gradient-to-r from-primary to-secondary text-white font-bold py-5 px-12 rounded-full text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
              すべてのコンテンツ
            </Link>
          </motion.div>
        </main>
        
        {/* Floating Action Button */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.15, rotate: 15 }}
          className="fixed bottom-8 right-8"
        >
          <Link href="/visitors-guide" className="bg-accent text-white p-5 rounded-full shadow-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </Link>
        </motion.div>
      </motion.div>
    </>
  );
}
