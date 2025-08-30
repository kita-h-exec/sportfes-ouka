"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompetitionsVisionBG from "@/components/CompetitionsVisionBG";

// サーバープロキシ経由 (CORS 回避のため /api/competitions)
const GAS_ENDPOINT = "/api/competitions";

interface CompetitionRaw {
  name: string;
  details: string; // "試合=1, 招集場所=A, ブロック=6, 招集時間=9:30" など
}
interface CompetitionParsed extends CompetitionRaw {
  attributes: { label: string; value: string }[];
}
interface SuccessPayload {
  status: "success";
  data: {
    studentId: string;
    competitions: CompetitionRaw[];
  };
}
interface NotFoundPayload { status: "not_found"; message: string; }
interface ErrorPayload { status: "error"; message: string; }

type ApiResponse = SuccessPayload | NotFoundPayload | ErrorPayload;

// より落ち着いた配色 (単色寄せ)
const chipColor = (label: string) => {
  if (/招集時間|時間/.test(label)) return "bg-fuchsia-700/15 text-fuchsia-100 border-fuchsia-500/30";
  if (/試合|走順/.test(label)) return "bg-slate-700/20 text-slate-100 border-slate-500/30";
  if (/場所|レーン|円/.test(label)) return "bg-slate-700/20 text-slate-100 border-slate-500/30";
  if (/ブロック/.test(label)) return "bg-slate-700/20 text-slate-100 border-slate-500/30";
  return "bg-slate-700/20 text-slate-200 border-slate-500/25";
};

export default function CompetitionsPage() {
  const [studentId, setStudentId] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // 背景ブラー (program ページと同様のアプローチ)
  useEffect(() => {
    const bg = document.getElementById("background-image");
    if (bg) {
      const prev = bg.style.filter;
      bg.style.filter = "blur(18px) brightness(0.8) saturate(1.3)";
      return () => { bg.style.filter = prev; };
    }
  }, []);

  // localStorage から前回入力を復元
  useEffect(() => {
    const last = localStorage.getItem("comp_studentId");
    if (last) setStudentId(last);
  }, []);

  const parseDetails = useCallback((c: CompetitionRaw): CompetitionParsed => {
    // セグメント分割（カンマ区切り）
    const rawSegments = c.details.split(/[,、]/).map(s => s.trim()).filter(Boolean);
    const attributes = rawSegments.map(seg => {
      // 最初の区切り記号 (=, ：, :) のみで分割し、以降は値として保持（時間 9:30 などを壊さない）
      const m = seg.match(/^([^=:：]+)[=:：](.+)$/);
      if (m) {
        return { label: m[1].trim(), value: m[2].trim() };
      }
      return { label: '情報', value: seg };
    });

    // 競技ごとのラベル正規化
    const name = c.name;
    const remapped = attributes.map(a => {
      const label = a.label;
      let newLabel = label;
      if (name === 'もぎたま' && label === 'ブロック') newLabel = '陣地';
      if (name === '団対助熱' && label === 'レーン') newLabel = 'レーン数';
      if (name === 'スウェーデンリレー') {
        if (label === '試合') newLabel = '走';
        else if (label === '走順') newLabel = 'レーン';
        else if (label === '走行距離') newLabel = '走行距離(m)';
      }
      return { ...a, label: newLabel };
    });

    // 表示順を競技別に制御（不要ラベルが紛れても既知ラベルを優先）
    const orderMaps: Record<string,string[]> = {
      'SCAT': ['試合','招集場所','円','招集時間'],
      'もぎたま': ['試合','招集場所','陣地','招集時間'],
      '団対助熱': ['試合','レーン数','レーン方向','招集時間'],
      'つなひき': ['試合','場所','ブロック','招集時間'],
      'スウェーデンリレー': ['走','レーン','走行距離(m)','招集時間'],
    };
    const targetOrder = orderMaps[name] || [];
    remapped.sort((a,b) => {
      const ia = targetOrder.indexOf(a.label);
      const ib = targetOrder.indexOf(b.label);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return { ...c, attributes: remapped };
  }, []);

  const parsedCompetitions: CompetitionParsed[] = useMemo(() => {
    if (!data || data.status !== "success") return [];
    return data.data.competitions.map(parseDetails);
  }, [data, parseDetails]);

  const valid = /^\d{4}$/.test(studentId);

  const fetchData = useCallback(async () => {
    if (!valid) {
      setError("4桁のホームルームナンバーを入力してください");
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);
    localStorage.setItem("comp_studentId", studentId);

    controllerRef.current?.abort();
    const ac = new AbortController();
    controllerRef.current = ac;
    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
  if (json.status === "error") setError(json.message);
  setUpdatedAt(new Date());
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setError(e.message || "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [studentId, valid]);

  // Enter で検索
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") fetchData();
  };

  // 競技の "招集時間" 要素を抽出してサマリ化
  const callTimeSummary = useMemo(() => {
    if (!parsedCompetitions.length) return [] as { name: string; call: string; sortKey: number }[];
    const parseToSort = (s: string) => {
      const m = s.match(/(\d{1,2}):(\d{2})/);
      if (!m) return 9999 * 60; // 非時刻は後ろ
      return parseInt(m[1]) * 60 + parseInt(m[2]);
    };
    return parsedCompetitions.map(c => {
      const callAttr = c.attributes.find(a => /招集時間/.test(a.label));
      const call = callAttr ? callAttr.value : "-";
      return { name: c.name, call, sortKey: parseToSort(call) };
    }).sort((a, b) => a.sortKey - b.sortKey);
  }, [parsedCompetitions]);

  // iOS Safari 判定してクラス付与（ボタン白飛び対策用）
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iP(hone|ad|od)/.test(ua)) {
      document.documentElement.classList.add('ios-safari');
    }
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-8 relative">
      <CompetitionsVisionBG />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            競技確認
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 leading-relaxed">
            ホームルームナンバー (4桁) を入力すると割り当て競技と各招集時間が表示されます。<br className="hidden md:inline" />表示内容に差異がある場合は係員に確認してください。
          </p>
        </header>

  <div className="flex flex-col md:flex-row gap-4 md:items-end mb-10 visionos-panel p-5">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-fuchsia-200/70 mb-2">
              ホームルームナンバー
            </label>
            <input
              value={studentId}
              onChange={e => setStudentId(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={onKeyDown}
              placeholder="1234"
              inputMode="numeric"
              maxLength={4}
              className="w-full rounded-xl px-5 py-4 text-lg md:text-xl font-mono tracking-widest bg-black/40 border border-white/20 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/40 focus:border-fuchsia-400 text-white placeholder:text-white/30 shadow-inner"
            />
            <p className="mt-2 text-[11px] text-slate-400">
              数字のみ4桁。Enter でも検索 / 正しく表示されない場合は再検索。
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStudentId("")}
              className="ios-secondary-btn px-5 py-4 min-h-[52px] rounded-xl bg-white/12 hover:bg-white/18 active:bg-white/25 border border-white/25 text-white/85 text-sm font-medium backdrop-blur-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400"
            >
              クリア
            </button>
            <button
              onClick={fetchData}
              disabled={!valid || loading}
              className="ios-primary-btn relative overflow-hidden px-8 py-4 min-h-[52px] rounded-xl text-sm md:text-base font-semibold tracking-wide disabled:opacity-40 disabled:pointer-events-none text-white bg-gradient-to-br from-fuchsia-500 via-rose-400 to-cyan-400 shadow-[0_4px_18px_-4px_rgba(236,72,153,0.55)] hover:shadow-[0_6px_28px_-4px_rgba(236,72,153,0.65)] focus:outline-none focus:ring-4 focus:ring-fuchsia-400/40 active:scale-[0.97] transition-all"
            >
              <span className="relative z-10">{loading ? "検索中..." : "検索"}</span>
              {loading && (
                <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0)_70%)] animate-[pulse_1s_ease-in-out_infinite] mix-blend-overlay" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && !loading && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mb-8">
              <div className="visionos-panel p-5 text-rose-100 border border-rose-400/40" style={{ background:'linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))' }}>
                <p className="font-semibold mb-1">エラー</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 状態表示 */}
        <div className="space-y-10">
          {loading && (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 rounded-lg bg-slate-700/20 animate-pulse border border-slate-600/30" />
              ))}
            </div>
          )}

            {!loading && data?.status === "not_found" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="visionos-panel p-10 text-center">
                <p className="text-lg md:text-xl font-semibold text-white/90">{data.message}</p>
                <p className="mt-3 text-sm text-slate-400">番号の誤り / 競技がまだ登録されていない可能性があります。</p>
              </motion.div>
            )}

          {!loading && parsedCompetitions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="flex flex-wrap items-center gap-6">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  検索結果
                </h2>
                {data?.status === "success" && (
                  <p className="text-xs md:text-sm text-slate-400 font-mono">
                    HR: <span className="text-fuchsia-300 font-semibold">{data.data.studentId}</span>
                  </p>
                )}
                {updatedAt && (
                  <p className="text-xs text-slate-500">最終取得 {updatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </div>

              {/* サマリー */}
              {callTimeSummary.length > 0 && (
                <div className="visionos-panel p-5 text-sm text-slate-200 space-y-3">
                  <p className="font-semibold text-slate-100 tracking-wide">招集時間サマリー</p>
                  <ol className="flex flex-wrap gap-2">
                    {callTimeSummary.map(c => (
                      <li key={c.name} className="px-3 py-1 rounded-md bg-slate-700/40 text-xs flex items-center gap-2">
                        <span className="font-medium text-fuchsia-300">{c.call}</span>
                        <span className="text-slate-400">{c.name}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-slate-400">
                    <span>・カード内のチップ: 試合/場所/ブロック/招集時間</span>
                    <span>・再検索で最新反映</span>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {parsedCompetitions.map((c, idx) => (
                  <motion.article
                    key={c.name + idx}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative group rounded-3xl overflow-hidden visionos-panel p-5 hover:border-fuchsia-400/50 transition-colors"
                  >
                    <h3 className="relative z-10 text-lg font-semibold tracking-wide text-white flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-fuchsia-600/60 text-white text-xs font-bold ring-1 ring-fuchsia-400/40">
                        {idx + 1}
                      </span>
                      <span>{c.name}</span>
                    </h3>
          <ul className="mt-4 flex flex-wrap gap-2.5 relative z-10">
                      {c.attributes.map(attr => (
                        <li key={attr.label + attr.value} className={`px-3 py-1.5 rounded-xl text-[11px] font-medium tracking-wide visionos-chip ${chipColor(attr.label)}`} style={{ border:'1px solid rgba(255,255,255,0.22)', WebkitFontSmoothing:'antialiased' }}>
                          <span className="opacity-70 mr-1">{attr.label}</span>
                          <span className="font-semibold text-white/95">{attr.value}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !data && (
            <div className="text-center text-slate-400 text-sm md:text-base">
              4桁の番号を入力して「検索」。例: 1234
            </div>
          )}
        </div>

        <footer className="mt-16 text-center text-[10px] tracking-wide text-slate-500 space-y-1">
          <p>データ取得: Google Apps Script (キャッシュ最大数分)。</p>
          <p>情報差異がある場合: 最新の掲示 / 係員の指示を優先してください。</p>
        </footer>
      </motion.div>
      {/* Button iOS override styles */}
      <style jsx global>{`
        .ios-safari .ios-primary-btn { 
          background: #ec4899 !important; /* fuchsia-500 solid to avoid blend washout */
          background-image: linear-gradient(135deg,#ec4899 0%,#db2777 55%,#6366f1 100%) !important;
          box-shadow: 0 4px 18px -4px rgba(236,72,153,0.55),0 0 0 1px rgba(255,255,255,0.18);
        }
        .ios-safari .ios-primary-btn:hover { filter: brightness(1.06); }
        .ios-safari .ios-primary-btn:active { filter: brightness(0.9); }
        .ios-safari .ios-secondary-btn { 
          background: rgba(51,65,85,0.55) !important; /* slate-700 */
          border-color: rgba(255,255,255,0.18) !important;
          color: #f1f5f9 !important;
        }
        .ios-safari .ios-secondary-btn:hover { background: rgba(71,85,105,0.65) !important; }
        .ios-safari .ios-secondary-btn:active { background: rgba(30,41,59,0.65) !important; }
      `}</style>
    </div>
  );
}
