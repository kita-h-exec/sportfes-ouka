"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'kyougi' | 'genten';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  doc?: Tab;
}

export default function AIPdfQA() {
  const [tab, setTab] = useState<Tab>('genten');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesByTab, setMessagesByTab] = useState<Record<Tab, Message[]>>({
    genten: [],
    kyougi: [],
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const messages = messagesByTab[tab];

  const placeholder = useMemo(() => {
    return tab === 'genten' ? '減点要項について質問…' : '競技要項について質問…';
  }, [tab]);

  useEffect(() => {
    if (messages.length > 0) {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      // If empty after tab switch, scroll to top
      containerRef.current?.scrollTo({ top: 0 });
    }
  }, [messages.length, tab]);

  // Normalize AI answer to avoid excessive blank lines
  const normalizeAnswer = useCallback((text: string) => {
    if (!text) return text;
    const sep = '```';
    const parts = text.split(sep);
    const norm = parts
      .map((segment, idx) => {
        // Leave code blocks (odd indices) untouched
        if (idx % 2 === 1) return segment;
        return segment
          .replace(/\r\n/g, '\n')
          // Collapse 3+ consecutive newlines to 2 (max one blank line)
          .replace(/\n{3,}/g, '\n\n')
          // Trim trailing spaces at end of lines
          .replace(/[\t ]+\n/g, '\n')
          .trim();
      })
      .join(sep);
    return norm;
  }, []);

  const ask = useCallback(async () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
  const userMsg: Message = { role: 'user', content: q, doc: tab };
  setMessagesByTab((prev) => ({ ...prev, [tab]: [...prev[tab], userMsg] }));
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, doc: tab }),
      });
    const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'API Error');
  const assistantMsg: Message = { role: 'assistant', content: normalizeAnswer(data.answer), doc: tab };
  setMessagesByTab((prev) => ({ ...prev, [tab]: [...prev[tab], assistantMsg] }));
    } catch (e: any) {
      const assistantMsg: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。時間をおいて再度お試しください。',
        doc: tab,
      };
  setMessagesByTab((prev) => ({ ...prev, [tab]: [...prev[tab], assistantMsg] }));
    } finally {
      setLoading(false);
    }
  }, [input, tab]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  // Segmented tabs
  const Tabs = (
    <div className="mx-auto max-w-3xl px-4">
      <div className="relative flex items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          {([
            { key: 'genten', label: '減点要項' },
            { key: 'kyougi', label: '競技要項' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setInput('');
              }}
              className={`relative mx-0.5 rounded-full px-4 py-2 text-sm transition-all ${
                tab === t.key
                  ? 'bg-white/80 dark:bg-white/10 text-gray-900 dark:text-white shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Link
          href={`/${tab === 'genten' ? 'genten' : 'kyougi'}.pdf`}
          target="_blank"
          className="text-xs sm:text-sm text-white/90 hover:text-white underline decoration-white/40"
        >
          PDFを開く
        </Link>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Backdrop blur overlay to keep background always frosted */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none backdrop-blur-2xl saturate-125"
        style={{ backgroundColor: 'rgba(255,255,255,0.001)' }}
      />

      {/* Vignette for readability */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.25), transparent 60%), radial-gradient(800px 400px at 50% 110%, rgba(0,0,0,0.25), transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 pt-[calc(env(safe-area-inset-top)+120px)] sm:pt-[calc(env(safe-area-inset-top)+120px)] pb-20 min-h-[80vh]">
        <div className="mb-6">{Tabs}</div>

        {messages.length === 0 ? (
          // Centered hero input card
          <div className="mx-auto max-w-2xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className="glass-effect rounded-3xl backdrop-blur-2xl border border-white/30 dark:border-white/10 bg-white/25 dark:bg-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.5)]"
            >
              <div className="px-5 sm:px-10 py-8 sm:py-14 text-center">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white drop-shadow">AI Q&A</h1>
                <p className="mt-3 text-white/85 text-sm sm:text-base">
                  {tab === 'genten' ? '減点要項' : '競技要項'}の資料に基づきAIが回答します。
                </p>
                <div className="mt-6 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="w-0 min-w-0 flex-1 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-500 bg-white/90 focus:bg-white shadow-inner focus:outline-none"
                  />
                  <button
                    onClick={ask}
                    disabled={loading || !input.trim()}
                    className="shrink-0 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base bg-black/80 text-white hover:bg-black transition disabled:opacity-50"
                  >
                    {loading ? '送信中…' : '送信'}
                  </button>
                </div>
                <div className="mt-4 text-xs text-white/80">
                  例: 「開会式の整列は何分前ですか？」
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Chat view
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className="rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.5)] p-3 sm:p-6 h-[58vh] sm:h-[62vh] overflow-y-auto"
            >
              <motion.ul layout className="space-y-3 sm:space-y-4">
                {messages.map((m, i) => (
                  <motion.li
                    layout
                    key={i}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                    className="flex"
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                        m.role === 'user'
                          ? 'whitespace-pre-wrap ml-auto bg-black/80 text-white shadow-lg'
                          : 'whitespace-normal break-words mr-auto bg-white/90 text-gray-900 shadow-lg'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                  </motion.li>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <motion.li
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex"
                  >
                    <div className="mr-auto bg-white/80 text-gray-900 rounded-2xl px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">回答作成中</span>
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.1s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></span>
                        </span>
                      </div>
                    </div>
                  </motion.li>
                )}
              </motion.ul>
            </motion.div>

            {/* Composer under chat */}
            <div className="mt-4 flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className="w-0 min-w-0 flex-1 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-500 bg-white/90 focus:bg-white shadow-inner focus:outline-none"
              />
              <button
                onClick={ask}
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base bg-black/80 text-white hover:bg-black transition disabled:opacity-50"
              >
                {loading ? '送信中…' : '送信'}
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mx-auto max-w-3xl px-4">
          <p className="mt-8 text-xs sm:text-sm text-white/90 bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.4)]">
            執行委員会及び運営委員会ではAIの出力に関しての一切の責任を持ちません。資料をよく確認した上で使用してください。
          </p>
        </div>
      </div>
    </div>
  );
}
