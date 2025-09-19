'use client';

import { useEffect, useState } from 'react';

// =============================
// 共通: 型とヘルパー
// =============================
type SItem = {
  id?: string | number;
  start_time?: string | null;
  end_time?: string | null;
  event?: string;
  description?: string;
  is_all_day?: boolean;
};

function timeHM(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

// =============================
// 認証付きダッシュボード
// =============================
export default function DashboardPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // --- debug exec helper ---
  async function exec(payload: Record<string, unknown>) {
    const res = await fetch('/api/debug/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { res, json } as const;
  }

  // --- Cache ---
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheResult, setCacheResult] = useState<null | { ok: boolean; status?: number }>(null);

  async function clearCache() {
    setCacheLoading(true);
    try {
      const { json } = await exec({ action: 'clear_cache' });
      setCacheResult({ ok: Boolean(json?.ok), status: json?.status });
    } finally { setCacheLoading(false); }
  }

  // --- Admin token ---
  type AdminStatus = { hasBase: boolean; hasOverride: boolean; effective: string | null; overrideMasked: string | null; allowed: boolean } | null;
  const [adminStatus, setAdminStatus] = useState<AdminStatus>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState('');

  async function loadAdminStatus() {
    setAdminLoading(true);
    try {
      const { json } = await exec({ action: 'admin_token_status' });
      if (json?.ok) setAdminStatus(json.data as AdminStatus);
    } finally { setAdminLoading(false); }
  }

  async function setAdminToken() {
    if (!adminTokenInput) return;
    setAdminLoading(true);
    try {
      await exec({ action: 'set_admin_token', token: adminTokenInput });
      setAdminTokenInput('');
      await loadAdminStatus();
    } finally { setAdminLoading(false); }
  }

  async function clearAdminToken() {
    setAdminLoading(true);
    try {
      await exec({ action: 'clear_admin_token' });
      await loadAdminStatus();
    } finally { setAdminLoading(false); }
  }

  // --- Push ---
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('');
  const [pushTag, setPushTag] = useState('');
  const [pushIcon, setPushIcon] = useState('');
  const [pushBadge, setPushBadge] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<null | { ok: boolean; data?: any }>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pushStatsLoading, setPushStatsLoading] = useState(false);
  const [pushStats, setPushStats] = useState<null | { count: number; backend?: string }>(null);

  // --- Push Templates (Announcements) ---
  type AnnTemplate = { id: string | number; title?: string; body?: string; date_created?: string; date_updated?: string; status?: string };
  const [annLoading, setAnnLoading] = useState(false);
  const [annTemplates, setAnnTemplates] = useState<AnnTemplate[] | null>(null);
  const [selectedAnnId, setSelectedAnnId] = useState<string | number | ''>('');

  async function fetchAnnouncements() {
    setAnnLoading(true);
    try {
      const res = await fetch('/api/announcements/list', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setAnnTemplates(Array.isArray(json.data) ? json.data : []);
      } else {
        setAnnTemplates([]);
      }
    } finally {
      setAnnLoading(false);
    }
  }

  function applyTemplate(id: string | number | '') {
    setSelectedAnnId(id);
    if (id === '' || !annTemplates || annTemplates.length === 0) return;
    const t = annTemplates.find(a => String(a.id) === String(id));
    if (!t) return;
    setPushTitle(t.title || '');
    setPushBody(t.body || '');
  }

  async function sendPush() {
    setPushSending(true);
    try {
      const { json } = await exec({ action: 'push_notify', title: pushTitle, body: pushBody, url: pushUrl, tag: pushTag, icon: pushIcon, badge: pushBadge });
      setPushResult({ ok: Boolean(json?.ok), data: json?.data });
    } finally { setPushSending(false); }
  }

  async function fetchPushStats() {
    setPushStatsLoading(true);
    try {
      const { json } = await exec({ action: 'push_stats' });
      if (json?.ok) setPushStats(json.data);
    } finally { setPushStatsLoading(false); }
  }

  // --- Logs ---
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<null | { size: number; max: number; entries: any[] }>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  // push logs
  const [pushLogsOpen, setPushLogsOpen] = useState(false);
  const [pushLogsLoading, setPushLogsLoading] = useState(false);
  const [pushLogs, setPushLogs] = useState<null | { date: string; count: number; entries: any[] }>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pushLogsDate, setPushLogsDate] = useState<string>('');
  const [pushLogsLimit, setPushLogsLimit] = useState<number>(500);
  const [pushLogsFilter, setPushLogsFilter] = useState<string>('');

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const { json } = await exec({ action: 'logs' });
      if (json?.ok) setLogs(json.data);
    } finally { setLogsLoading(false); }
  }

  async function clearLogs() {
    setLogsLoading(true);
    try {
      await exec({ action: 'clear_logs' });
      await fetchLogs();
    } finally { setLogsLoading(false); }
  }

  async function fetchPushLogs() {
    setPushLogsLoading(true);
    try {
      const body: any = { action: 'push_logs', limit: pushLogsLimit }; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (pushLogsDate) body.date = pushLogsDate;
      const res = await fetch('/api/debug/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setPushLogs({ date: json.data?.date, count: json.data?.count || 0, entries: json.data?.entries || [] });
      else setPushLogs({ date: pushLogsDate || '(指定なし=今日)', count: 0, entries: [] });
    } finally { setPushLogsLoading(false); }
  }

  async function clearPushLogs() {
    setPushLogsLoading(true);
    try {
      const body: any = { action: 'clear_push_logs' }; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (pushLogsDate) body.date = pushLogsDate;
      await fetch('/api/debug/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify(body),
      });
      await fetchPushLogs();
    } finally { setPushLogsLoading(false); }
  }

  async function checkAuth(pw: string) {
    setAuthError(null);
    try {
      const res = await fetch('/api/debug/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': pw },
        body: JSON.stringify({ action: 'custom', url: '__noop__' }),
      });
      if (res.status === 401) {
        setAuthError('パスワードが違います');
        setAuthed(false);
      } else if (res.ok) {
        setAuthed(true);
        setAuthError(null);
        try { localStorage.setItem('admin_password', pw); } catch {}
      } else {
        setAuthError('認証エラー');
      }
    } catch (e: any) {
      setAuthError(e?.message || '通信エラー');
    }
  }

  useEffect(() => {
    setChecking(true);
    try {
      const saved = localStorage.getItem('admin_password');
      if (saved) {
        setPassword(saved);
        checkAuth(saved);
      }
    } catch {}
    setChecking(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm">運営向けツール</p>
        </div>

        {!authed ? (
          <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner">
            <h2 className="text-lg font-semibold">管理パスワード</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワード"
                className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
              <button onClick={() => checkAuth(password)} disabled={checking || password.length === 0}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">ログイン</button>
            </div>
            {authError && <div className="text-xs text-red-400">{authError}</div>}
          </section>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 統合スケジュール管理カード（フル幅） */}
            <SchedulesManagerCard password={password} />

            {/* Cache 操作 */}
            <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">キャッシュ</h2>
                <button onClick={clearCache} disabled={cacheLoading} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">{cacheLoading ? '実行中…' : 'Directus キャッシュクリア'}</button>
              </div>
              {cacheResult && (
                <div className={`text-xs ${cacheResult.ok ? 'text-emerald-300' : 'text-red-400'}`}>結果: {cacheResult.ok ? 'OK' : 'NG'}{cacheResult.status ? ` (status ${cacheResult.status})` : ''}</div>
              )}
            </section>

            {/* 管理者トークン */}
            <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Admin Token</h2>
                <button onClick={loadAdminStatus} disabled={adminLoading} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50">状態更新</button>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>ENV: {adminStatus?.hasBase ? 'あり' : 'なし'} / Override: {adminStatus?.hasOverride ? 'あり' : 'なし'}</div>
                <div>Effective: <span className="break-all">{adminStatus?.effective ?? '(なし)'}</span></div>
                <div>Override可能: {adminStatus?.allowed ? 'Yes' : 'No'}</div>
              </div>
              <div className="flex flex-col gap-2">
                <input value={adminTokenInput} onChange={e => setAdminTokenInput(e.target.value)} placeholder="一時トークンを入力" className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm" />
                <div className="flex items-center gap-2">
                  <button onClick={setAdminToken} disabled={adminLoading || !adminStatus?.allowed || !adminTokenInput} className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">上書きを設定</button>
                  <button onClick={clearAdminToken} disabled={adminLoading || !adminStatus?.allowed} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">上書きを解除</button>
                </div>
              </div>
            </section>

            {/* Web Push */}
            <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Push 通知</h2>
                <div className="flex items-center gap-2">
                  <button onClick={fetchPushStats} disabled={pushStatsLoading} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50">{pushStatsLoading ? '取得中…' : '購読数'}</button>
                  {pushStats && <span className="text-xs text-slate-400">{pushStats.count} subs{pushStats.backend ? ` (${pushStats.backend})` : ''}</span>}
                </div>
              </div>
              {/* Templates toolbar */}
              <div className="flex items-center gap-2 text-xs">
                <button onClick={fetchAnnouncements} type="button" className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50" disabled={annLoading}>{annLoading ? '取得中…' : 'お知らせ読込'}</button>
                {annTemplates && annTemplates.length > 0 && (
                  <select value={String(selectedAnnId)} onChange={e => applyTemplate(e.target.value)} className="text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1">
                    <option value="">テンプレ選択...</option>
                    {annTemplates.slice(0,50).map((a: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <option key={a.id} value={String(a.id)}>{(a.title?.slice(0,40) || '(no title)')}</option>
                    ))}
                  </select>
                )}
                {annTemplates && <span className="text-[10px] text-slate-500">{annTemplates.length}件</span>}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs font-medium flex flex-col gap-1">
                  <span>Title</span>
                  <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs font-medium flex flex-col gap-1">
                  <span>URL (クリック先)</span>
                  <input value={pushUrl} onChange={e => setPushUrl(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs font-medium flex flex-col gap-1 md:col-span-2">
                  <span>Body</span>
                  <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} rows={2} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-xs" />
                </label>
                <label className="text-xs font-medium flex flex-col gap-1">
                  <span>Tag</span>
                  <input value={pushTag} onChange={e => setPushTag(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs font-medium flex flex-col gap-1">
                  <span>Icon URL</span>
                  <input value={pushIcon} onChange={e => setPushIcon(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs font-medium flex flex-col gap-1">
                  <span>Badge URL</span>
                  <input value={pushBadge} onChange={e => setPushBadge(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
                </label>
                <div className="md:col-span-2 flex items-center gap-3">
                  <button onClick={sendPush} disabled={pushSending} className="px-5 py-2.5 rounded bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-sm font-medium disabled:opacity-50">{pushSending ? '送信中…' : '送信'}</button>
                  {pushResult && <span className={'text-xs ' + (pushResult.ok ? 'text-emerald-400' : 'text-red-400')}>{pushResult.ok ? `OK sent=${pushResult.data?.sent}` : '失敗'}</span>}
                </div>
              </div>
            </section>

            {/* Logs */}
            <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-1">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-lg font-semibold">ログビューア</h2>
                <button onClick={() => setLogsOpen(o => !o)} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">{logsOpen ? '閉じる' : '開く'}</button>
                {logsOpen && (
                  <>
                    <button onClick={fetchLogs} disabled={logsLoading} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">更新</button>
                    <button onClick={clearLogs} disabled={logsLoading} className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50">クリア</button>
                  </>
                )}
              </div>
              {logsOpen && (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500">DEBUG_ENABLE_LOG_VIEW=1 が必要。最大 {logs?.max ?? 0} entries。</div>
                  <div className="h-64 overflow-auto rounded border border-slate-700 bg-slate-900/70 p-2 text-[11px] font-mono leading-relaxed">
                    {logsLoading && <div className="text-slate-500">読み込み中…</div>}
                    {!logsLoading && (!logs?.entries || logs.entries.length === 0) && <div className="text-slate-500">ログなし</div>}
                    {!logsLoading && logs?.entries?.map((e: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <div key={i} className="flex gap-2 py-0.5 border-b border-slate-800 last:border-b-0">
                        <span className="text-slate-500 shrink-0">{e.ts}</span>
                        <span className="shrink-0 px-1 rounded bg-slate-700/60 text-slate-200">{e.action}</span>
                        <span className="text-slate-400 break-all">{e.ip}</span>
                        {e.detail && <span className="text-slate-500">{JSON.stringify(e.detail)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Push通知ログ */}
            <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-2">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-lg font-semibold">Push 通知ログ</h2>
                <button onClick={() => setPushLogsOpen(o => !o)} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">{pushLogsOpen ? '閉じる' : '開く'}</button>
                {pushLogsOpen && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1">
                        <span className="text-slate-400">日付</span>
                        <input type="date" value={pushLogsDate} onChange={e => setPushLogsDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-slate-400">件数</span>
                        <input type="number" min={50} max={5000} step={50} value={pushLogsLimit} onChange={e => setPushLogsLimit(parseInt(e.target.value || '500', 10))} className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-slate-400">フィルタ</span>
                        <input value={pushLogsFilter} onChange={e => setPushLogsFilter(e.target.value)} placeholder="kind:endpoint:..." className="bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </label>
                    </div>
                    <button onClick={fetchPushLogs} disabled={pushLogsLoading} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">更新</button>
                    <button onClick={clearPushLogs} disabled={pushLogsLoading} className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50">クリア</button>
                  </>
                )}
              </div>
              {pushLogsOpen && (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500">今日または指定日の `data/push_logs/notify-YYYY-MM-DD.log` を読み込みます。</div>
                  <div className="h-80 overflow-auto rounded border border-slate-700 bg-slate-900/70 p-2 text-[11px] font-mono leading-relaxed">
                    {pushLogsLoading && <div className="text-slate-500">読み込み中…</div>}
                    {!pushLogsLoading && (!pushLogs?.entries || pushLogs.entries.length === 0) && <div className="text-slate-500">ログなし</div>}
                    {!pushLogsLoading && pushLogs?.entries?.filter((e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                      if (!pushLogsFilter) return true;
                      try { return JSON.stringify(e).toLowerCase().includes(pushLogsFilter.toLowerCase()); } catch { return true; }
                    }).map((e: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <div key={i} className="flex gap-2 py-0.5 border-b border-slate-800 last:border-b-0 items-start">
                        <span className="text-slate-500 shrink-0">{e.ts}</span>
                        <span className="shrink-0 px-1 rounded bg-slate-700/60 text-slate-200">{e.kind}</span>
                        <span className="text-slate-400 break-all">{e.endpoint || e.title || ''}</span>
                        <span className="text-slate-500">{e.error ? String(e.error) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================
// 統合: 現在進行中 + リスト並び替え + 上書き
// =============================
function SchedulesManagerCard({ password }: { password: string }) {
  const [schedules, setSchedules] = useState<SItem[]>([]);
  const [orderIds, setOrderIds] = useState<Array<string | number>>([]);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowId, setNowId] = useState<string | number | null>(null);
  const [nowItem, setNowItem] = useState<SItem | null>(null);
  const [nextItem, setNextItem] = useState<SItem | null>(null);
  const [overrideOn, setOverrideOn] = useState(false);
  // override controls
  const [ovEnabled, setOvEnabled] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [customEvent, setCustomEvent] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customStart, setCustomStart] = useState(''); // datetime-local
  const [customEnd, setCustomEnd] = useState(''); // datetime-local
  const [customAllDay, setCustomAllDay] = useState(false);
  const [treatNow, setTreatNow] = useState(false);
  // NowPlaying settings
  const [npLoading, setNpLoading] = useState(false);
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Array<string | number>>([]);
  const [showAllDayAsNow, setShowAllDayAsNow] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [resList, resOrder, resCur, resOv] = await Promise.all([
        fetch('/api/schedules', { cache: 'no-store' }),
        fetch('/api/schedules/order', { cache: 'no-store' }),
        fetch('/api/schedules/current', { cache: 'no-store' }),
        fetch('/api/schedules/override', { cache: 'no-store' }),
      ]);
      if (resList.ok) {
        const j = await resList.json();
        if (j.ok) setSchedules(j.items || []);
      }
      if (resOrder.ok) {
        const j = await resOrder.json();
        if (j.ok) {
          setOrderIds(Array.isArray(j.data?.order) ? j.data.order : []);
          setUpdatedAt(j.data?.updatedAt || null);
        }
      }
      if (resCur.ok) {
        const j = await resCur.json();
        if (j.ok) {
          setNowId(j.data?.id ?? null);
          setNowItem(j.data || null);
          setNextItem(j.next || null);
          setOverrideOn(Boolean(j.meta?.override));
        }
      }
      if (resOv.ok) {
        const j = await resOv.json();
        if (j.ok) setOvEnabled(Boolean(j.data?.enabled));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // load NowPlaying settings
  async function loadNowPlaying() {
    setNpLoading(true);
    try {
      const res = await fetch('/api/now-playing', { cache: 'no-store' });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setShowAllOngoing(Boolean(j.data?.showAllOngoing));
        setHiddenIds(Array.isArray(j.data?.hiddenIds) ? j.data.hiddenIds : []);
        setShowAllDayAsNow(Boolean(j.data?.showAllDayAsNow));
      }
    } finally { setNpLoading(false); }
  }
  useEffect(() => { loadNowPlaying(); }, []);

  function getVisibleOrder(): SItem[] {
    const byId = new Map<string, SItem>();
    schedules.forEach(it => byId.set(String(it.id), it));
    const ordered = orderIds.map(id => byId.get(String(id))).filter(Boolean) as SItem[];
    const rest = schedules
      .filter(it => !orderIds.some(id => String(id) === String(it.id)))
      .sort((a, b) => {
        const as = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
        return as - bs;
      });
    return [...ordered, ...rest];
  }

  const visible = getVisibleOrder();
  const isOngoingById = (it: SItem) => (nowId != null && String(it.id) === String(nowId));
  const isOngoingLite = (it: SItem) => {
    if (it.is_all_day) return false;
    const now = Date.now();
    const s = it.start_time ? new Date(it.start_time).getTime() : null;
    const e = it.end_time ? new Date(it.end_time).getTime() : null;
    if (s && e) return now >= s && now <= e;
    if (!s && e) return now <= e;
    if (s && !e) {
      const SIX_H = 6 * 60 * 60 * 1000;
      const after = visible
        .map(x => x.start_time ? new Date(x.start_time).getTime() : null)
        .filter((ts): ts is number => ts !== null)
        .filter(ts => ts > (s as number))
        .sort((x, y) => x - y)[0] ?? null;
      const upper = after ?? ((s as number) + SIX_H);
      return now >= (s as number) && now < upper;
    }
    return false;
  };

  // 並び替え
  const move = (id: string | number, dir: -1 | 1) => {
    const list = visible.map(it => it.id as (string | number));
    const idx = list.findIndex(x => String(x) === String(id));
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const swapped = list.slice();
    [swapped[idx], swapped[j]] = [swapped[j], swapped[idx]];
    setOrderIds(swapped);
  };

  const clearOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ order: [] })
      });
      const j = await res.json();
      if (j.ok) { setOrderIds([]); setUpdatedAt(j.data?.updatedAt || null); }
    } finally { setSaving(false); }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ order: orderIds })
      });
      const j = await res.json();
      if (j.ok) setUpdatedAt(j.data?.updatedAt || null);
    } finally { setSaving(false); }
  };

  // 上書き適用/解除
  const applyOverride = async () => {
    setSaving(true);
    try {
      let target: SItem | null = null;
      if (useCustom) {
        const toIso = (v: string) => v ? new Date(v).toISOString() : null;
        target = {
          event: customEvent || '(no title)',
          description: customDesc || '',
          start_time: treatNow ? new Date().toISOString() : toIso(customStart),
          end_time: treatNow ? null : toIso(customEnd),
          is_all_day: customAllDay,
        };
      } else {
        target = schedules.find(it => String(it.id) === selectedId) || null;
      }
      const res = await fetch('/api/schedules/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ enabled: ovEnabled, item: target })
      });
      const j = await res.json();
      if (j.ok) await load();
    } finally { setSaving(false); }
  };

  const disableOverride = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ enabled: false, item: null })
      });
      const j = await res.json();
      if (j.ok) await load();
    } finally { setSaving(false); }
  };

  // 前後に送る
  function sequence(): SItem[] {
    if (orderIds.length === 0) {
      return schedules.slice().sort((a, b) => {
        const as = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
        return as - bs;
      });
    }
    const byId = new Map<string, SItem>();
    schedules.forEach(it => byId.set(String(it.id), it));
    const ordered = orderIds.map(id => byId.get(String(id))).filter(Boolean) as SItem[];
    const rest = schedules.filter(it => !orderIds.some(id => String(id) === String(it.id)))
      .sort((a, b) => {
        const as = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bs = b.start_time ? new Date(b.start_time).getTime() : 0;
        return as - bs;
      });
    return [...ordered, ...rest];
  }

  const stepOverride = async (dir: -1 | 1) => {
    const seq = sequence();
    if (seq.length === 0) return;
    const anchor = nowItem?.id ?? nowId;
    if (anchor == null) return;
    const idx = seq.findIndex(x => String(x.id) === String(anchor));
    if (idx < 0) return;
    const jIdx = idx + dir;
    if (jIdx < 0 || jIdx >= seq.length) return;
    const target = seq[jIdx];
    setSelectedId(String(target.id ?? ''));
    // 直接適用（有効化=true）
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ enabled: true, item: target })
      });
      const j = await res.json();
      if (j.ok) await load();
    } finally { setSaving(false); }
  };

  const visibleList = visible;
  const ongoingLite = visibleList.filter(it => isOngoingById(it) || isOngoingLite(it));
  const isHidden = (id: string | number | undefined) => id == null ? false : hiddenIds.some(x => String(x) === String(id));
  const toggleHidden = (id: string | number | undefined, hide: boolean) => {
    if (id == null) return;
    setHiddenIds(prev => {
      const s = new Set(prev.map(x => String(x)));
      if (hide) s.add(String(id)); else s.delete(String(id));
      return Array.from(s);
    });
  };
  const saveNowPlaying = async () => {
    setNpLoading(true);
    try {
      const res = await fetch('/api/now-playing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ showAllOngoing, hiddenIds, showAllDayAsNow }),
      });
      await res.json().catch(() => null);
    } finally { setNpLoading(false); }
  };

  return (
    <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-inner xl:col-span-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">現在進行中（簡易）・リスト並び替え・上書き</h2>
        <div className="flex items-center gap-2 text-xs">
          {overrideOn && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">OVERRIDE</span>}
          {updatedAt && <span className="text-slate-400">order updated {new Date(updatedAt).toLocaleString('ja-JP')}</span>}
          <button onClick={load} className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">更新</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左: NOW/NEXT */}
        <div className="space-y-3">
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 p-4 min-h-[120px]">
            <div className="text-xs text-yellow-300">NOW</div>
            {nowItem ? (
              <div className="space-y-1">
                <div className="font-semibold text-base">{nowItem.event || '(no title)'}</div>
                <div className="text-xs text-slate-300">{nowItem.is_all_day ? '終日' : `${timeHM(nowItem.start_time)}${nowItem.end_time ? ` ~ ${timeHM(nowItem.end_time)}` : ''}`}</div>
                {nowItem.description && <div className="text-xs text-slate-400">{nowItem.description}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-300">進行中の予定はありません</div>
            )}
          </div>
          <div className="rounded-xl border border-slate-600 bg-slate-900/40 p-4 min-h-[100px]">
            <div className="text-[11px] text-slate-400">NEXT</div>
            {nextItem ? (
              <div className="space-y-1">
                <div className="font-medium">{nextItem.event || '(no title)'}</div>
                <div className="text-xs text-slate-400">{timeHM(nextItem.start_time)}{nextItem.end_time ? ` ~ ${timeHM(nextItem.end_time)}` : ''}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">次の予定はありません</div>
            )}
          </div>
        </div>

        {/* 右: リスト並び替え */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 max-h-[320px] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-300">全予定</div>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={saveOrder} disabled={saving} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">保存</button>
              <button onClick={clearOrder} disabled={saving} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">クリア</button>
            </div>
          </div>
          <div className="space-y-2">
            {visibleList.map((it) => {
              const ongoing = isOngoingById(it) || isOngoingLite(it);
              return (
                <div key={String(it.id)} className={`px-2 py-2 rounded border flex items-start gap-3 ${ongoing ? 'border-yellow-400/60 bg-yellow-500/10' : 'border-slate-700/60 bg-slate-800/40'}`}>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => move(it.id!, -1)} className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600">↑</button>
                    <button onClick={() => move(it.id!, 1)} className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600">↓</button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{it.event || '(no title)'} <span className="text-[10px] text-slate-500">#{String(it.id)}</span></div>
                    <div className="text-[11px] text-slate-400">{it.is_all_day ? '終日' : `${timeHM(it.start_time)}${it.end_time ? ` ~ ${timeHM(it.end_time)}` : ''}`}</div>
                    {it.description && <div className="text-[11px] text-slate-500 line-clamp-2">{it.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NowPlaying 表示設定 */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">NowPlaying 表示設定</h3>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={loadNowPlaying} disabled={npLoading} className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50">更新</button>
            <button onClick={saveNowPlaying} disabled={npLoading} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">保存</button>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showAllOngoing} onChange={e => setShowAllOngoing(e.target.checked)} />
          <span>現在進行中の予定を全て表示（ON: 全件, OFF: 1件）</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showAllDayAsNow} onChange={e => setShowAllDayAsNow(e.target.checked)} />
          <span>終日（当日）予定を「今」に含める</span>
        </label>
        <div className="text-xs text-slate-400">個別の表示切替（ON: 表示, OFF: 非表示）</div>
        <div className="grid md:grid-cols-2 gap-2">
          {ongoingLite.length === 0 && <div className="text-sm text-slate-400">進行中の予定はありません</div>}
          {ongoingLite.map(it => (
            <label key={String(it.id)} className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-slate-700 bg-slate-800/40">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.event || '(no title)'} <span className="text-[10px] text-slate-500">#{String(it.id)}</span></div>
                <div className="text-[11px] text-slate-400">{it.is_all_day ? '終日' : `${timeHM(it.start_time)}${it.end_time ? ` ~ ${timeHM(it.end_time)}` : ''}`}</div>
              </div>
              <input type="checkbox" checked={!isHidden(it.id)} onChange={e => toggleHidden(it.id, !e.target.checked)} />
            </label>
          ))}
        </div>
      </div>

      {/* 上書き: 選択/カスタム + チェックボックス */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">現在の上書き</h3>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => stepOverride(-1)} disabled={loading || saving} className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">前へ</button>
            <button onClick={() => stepOverride(1)} disabled={loading || saving} className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">次へ</button>
            <button onClick={load} className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">更新</button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={ovEnabled} onChange={e => setOvEnabled(e.target.checked)} />
            <span>上書きを有効化</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} />
            <span>カスタム入力を使う</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={treatNow} onChange={e => setTreatNow(e.target.checked)} />
            <span>今のタイミングとして扱う</span>
          </label>
        </div>
        {!useCustom ? (
          <div className="flex items-center gap-2">
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 min-w-[260px]">
              <option value="">上書きする予定を選択...</option>
              {sequence().map(it => (
                <option key={String(it.id)} value={String(it.id)}>
                  {`${timeHM(it.start_time)} ${it.event || '(no title)'} #${String(it.id)}`}
                </option>
              ))}
            </select>
            <button onClick={applyOverride} disabled={saving} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50">適用</button>
            <button onClick={disableOverride} disabled={saving} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">解除</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs font-medium flex flex-col gap-1">
              <span>タイトル</span>
              <input value={customEvent} onChange={e => setCustomEvent(e.target.value)} className="border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              <span>終日</span>
              <input type="checkbox" checked={customAllDay} onChange={e => setCustomAllDay(e.target.checked)} />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1 md:col-span-2">
              <span>説明</span>
              <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={2} className="border border-slate-600 bg-slate-900 rounded px-2 py-1 text-xs" />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              <span>開始</span>
              <input type="datetime-local" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              <span>終了</span>
              <input type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
            </label>
            <div className="md:col-span-2 flex items-center gap-2">
              <button onClick={applyOverride} disabled={saving} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50">適用</button>
              <button onClick={disableOverride} disabled={saving} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">解除</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
