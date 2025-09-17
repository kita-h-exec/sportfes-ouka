"use client";

import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Header from './Header';
import { SplashScreen } from '../SplashScreen';
import { CountdownTimer } from './CountdownTimer';
import { Schedule } from './Schedule';
import { Contents } from './Contents';
import { Blocks } from './Blocks';

// Home ロジックをサーバー/クライアント分離したい場合のクライアント側コンテナ。
// 現状 <ContentsServer> など存在しない幽霊参照による警告を避けるためここで明示的に正しい構成を定義。

interface Block { slug: string; name: string; color: string; text_color: string }

export function HomeClient({ initialBlocks }: { initialBlocks?: Block[] }) {
	const [splashState, setSplashState] = useState<'unknown' | 'show' | 'hide'>('unknown');
	const isLoading = splashState === 'show';
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => { window.scrollTo(0,0); }, []);

	useEffect(() => {
		const decide = () => {
			try {
				const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || // @ts-ignore
					(navigator as any).standalone === true; // eslint-disable-line @typescript-eslint/no-explicit-any
				const today = new Date().toISOString().slice(0,10);
				const ENABLE_DAILY_SPLASH = ture;
				if (isStandalone) {
					if (sessionStorage.getItem('splash_session_pwa') === '1') setSplashState('hide');
					else setSplashState('show');
				} else {
					if (localStorage.getItem('splashSeen_v1_web')) setSplashState('hide');
					else setSplashState('show');
				}
			} catch { setSplashState('hide'); }
		};
		decide();
	}, []);

	useEffect(() => {
		if (splashState === 'show') document.body.classList.add('splash-active');
		else document.body.classList.remove('splash-active');
	}, [splashState]);

	useEffect(() => {
		if (isLoading) return;
		const handleScroll = () => setIsScrolled(window.scrollY > 50);
		const disableSnapOnScroll = () => document.documentElement.classList.add('scroll-snap-disabled');
		window.addEventListener('scroll', handleScroll);
		window.addEventListener('scroll', disableSnapOnScroll, { once: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('scroll', disableSnapOnScroll);
		};
	}, [isLoading]);

	if (splashState === 'unknown') return null;

	return (
		<>
			<AnimatePresence>
				{isLoading && (
					<SplashScreen onAnimationComplete={() => {
						try {
							sessionStorage.setItem('splash_session_pwa','1');
							localStorage.setItem('splashSeen_v1_web','1');
						} catch {}
						setSplashState('hide');
					}} />
				)}
			</AnimatePresence>
			{splashState === 'hide' && (
				<>
					<Header isScrolled={isScrolled} />
					<div className="h-screen relative scroll-snap-section" />
					<div className="relative z-10 pt-32 pb-10 scroll-snap-section">
						<div className="container mx-auto px-4 space-y-12">
							<CountdownTimer targetDate="2025-09-19T08:30:00" />
							<Schedule />
							<Contents />
							<Blocks initialBlocks={initialBlocks} />
						</div>
					</div>
				</>
			)}
		</>
	);
}

export default HomeClient;
