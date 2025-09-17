'use client';

import { useState, useEffect } from 'react';

interface ExecResult {
  ok: boolean;
  status: number;
  data: unknown;
  elapsedMs: number;
  error?: string;
}

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [url, setUrl] = useState('https://ouka-directus.nasno.net/utils/cache/clear');
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState('{"Content-Type":"application/json"}');
  const [body, setBody] = useState('');
  const [useAdminAuth, setUseAdminAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [adminTokenStatus, setAdminTokenStatus] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [adminTokenLoading, setAdminTokenLoading] = useState(false);
  const [logs, setLogs] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [pushTitle, setPushTitle] = useState('テスト通知');
  const [pushBody, setPushBody] = useState('これはデバッグ送信です');
  const [pushUrl, setPushUrl] = useState('/announcements');
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pushStats, setPushStats] = useState<number | null>(null);
  const [pushStatsLoading, setPushStatsLoading] = useState(false);
  const [annTemplates, setAnnTemplates] = useState<any[] | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [annLoading, setAnnLoading] = useState(false);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  // schedules debug
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideItem, setOverrideItem] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [template, setTemplate] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<(string|number)[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [currentId, setCurrentId] = useState<string | number | null>(null);

  function normalizeOrder(tpl: any[], saved: (string|number)[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const ids = tpl.map(t => String(t.id));
    const uniqSaved = Array.from(new Set(saved.map(x => String(x)))).filter(id => ids.includes(id));
    const missing = ids.filter(id => !uniqSaved.includes(id));
    return [...uniqSaved, ...missing];
  }

  const orderedTemplate = (() => {
    if (!template || template.length === 0) return [] as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    const ord = (order && order.length) ? order.map(x => String(x)) : template.map(t => String(t.id));
    const map = new Map(template.map(t => [String(t.id), t]));
    const list = ord.map(id => map.get(id)).filter(Boolean) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    // もしテンプレ更新で足りないIDがあれば末尾に追加
    if (list.length < template.length) {
      const missing = template.filter(t => !ord.includes(String(t.id)));
      return [...list, ...missing];
    }
    return list;
  })();

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
      } else {
        setAuthError('認証エラー');
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setAuthError(e?.message || '通信エラー');
    }
  }

  useEffect(() => {
    const saved = (typeof window !== 'undefined') ? localStorage.getItem('debug_pw') : null;
    if (saved) {
      setPassword(saved);
      checkAuth(saved);
    }
  }, []);

  async function run(action: 'clear_cache' | 'custom') {
    setLoading(true);
    setResult(null);
    try {
      let payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (action === 'clear_cache') {
        payload = { action };
      } else {
        let parsedHeaders: Record<string,string> = {};
        try { parsedHeaders = headers ? JSON.parse(headers) : {}; } catch { /* ignore parse error */ }
        let parsedBody: unknown = undefined;
        if (body.trim()) {
          try { parsedBody = JSON.parse(body); } catch { parsedBody = body; }
        }
        payload = { action: 'custom', url, method, headers: parsedHeaders, body: parsedBody, useAdminAuth };
      }
      const res = await fetch('/api/debug/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      setResult(json);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setResult({ ok: false, status: 0, data: null, elapsedMs: 0, error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdminTokenStatus() {
    try {
      const res = await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'admin_token_status' }) });
      const json = await res.json();
      setAdminTokenStatus(json.data);
    } catch {/* ignore */}
  }

  async function setAdminToken() {
    if (!adminTokenInput.trim()) return;
    setAdminTokenLoading(true);
    try {
      const res = await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'set_admin_token', token: adminTokenInput.trim() }) });
      await fetchAdminTokenStatus();
      if (res.ok) setAdminTokenInput('');
    } finally { setAdminTokenLoading(false); }
  }

  async function clearAdminToken() {
    setAdminTokenLoading(true);
    try {
      await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'clear_admin_token' }) });
      await fetchAdminTokenStatus();
    } finally { setAdminTokenLoading(false); }
  }

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'logs' }) });
      const json = await res.json();
      if (json.ok) setLogs(json.data);
    } finally { setLogsLoading(false); }
  }

  async function clearLogs() {
    setLogsLoading(true);
    try {
      await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'clear_logs' }) });
      await fetchLogs();
    } finally { setLogsLoading(false); }
  }

  useEffect(() => {
    if (!authed || !logsOpen) return;
    fetchLogs();
    const id = setInterval(fetchLogs, 10000);
    return () => clearInterval(id);
  }, [authed, logsOpen]);

  async function sendPush() {
    setPushSending(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/debug/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-debug-password': password },
        body: JSON.stringify({ action: 'push_notify', title: pushTitle, body: pushBody, url: pushUrl })
      });
      const json = await res.json();
      setPushResult(json);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setPushResult({ ok: false, error: e?.message || String(e) });
    } finally {
      setPushSending(false);
    }
  }

  async function fetchPushStats() {
    setPushStatsLoading(true);
    try {
      const res = await fetch('/api/debug/exec', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-debug-password': password }, body: JSON.stringify({ action: 'push_stats' }) });
      const json = await res.json();
      if (json.ok) setPushStats(json.data?.count ?? 0);
    } finally { setPushStatsLoading(false); }
  }

  async function fetchAnnouncements() {
    setAnnLoading(true);
    try {
      const res = await fetch('/api/announcements/list', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setAnnTemplates(json.data || []);
      }
    } finally { setAnnLoading(false); }
  }

  function applyTemplate(id: string) {
    if (!annTemplates) return;
    const a = annTemplates.find(t => String((t as any).id) === id); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!a) return;
    setSelectedAnnId(id);
    if (a.title) setPushTitle(a.title);
    if (a.body) setPushBody(a.body);
  }
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4">
        <div className="w-full max-w-sm bg-gray-800/70 backdrop-blur rounded-xl shadow-xl border border-gray-700 p-6 space-y-4">
          <h1 className="text-lg font-semibold text-center">Debug Access</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-600 bg-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => { if (e.key === 'Enter') { localStorage.setItem('debug_pw', password); checkAuth(password); } }}
          />
            {authError && <div className="text-xs text-red-400">{authError}</div>}
          <button
            onClick={() => { localStorage.setItem('debug_pw', password); checkAuth(password); }}
            className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >入室</button>
          <p className="text-[10px] text-gray-400 text-center">共有パスワードを入力してください。</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 pt-[92px] md:pt-[100px]">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{backgroundImage:'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(99,102,241,0.25), transparent 50%)'}} />
  <div className="relative p-6 mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow">Debug / Admin Tools</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-700/60 border border-slate-600">AUTH OK</span>
            <button onClick={() => { localStorage.removeItem('debug_pw'); setAuthed(false); }} className="underline hover:text-white">再認証</button>
          </div>
        </header>

        <section className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-lg p-5 shadow-inner">
          <h2 className="text-lg font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Directus Cache</h2>
          <p className="text-xs text-slate-400">サーバートークンを使って Directus のキャッシュをクリアします。</p>
          <button
            onClick={() => run('clear_cache')}
            disabled={loading}
            className="px-5 py-2.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
          >{loading ? '実行中…' : 'キャッシュクリア'}</button>
        </section>

        <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">管理者トークン上書き</h2>
            <button onClick={fetchAdminTokenStatus} className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">更新</button>
          </div>
          <p className="text-[11px] text-slate-400">DEBUG_ENABLE_ADMIN_TOKEN_OVERRIDE=1 が有効な時のみ設定できます。再起動で消えます。</p>
          <div className="grid gap-3 md:grid-cols-3 items-start">
            <input value={adminTokenInput} onChange={e => setAdminTokenInput(e.target.value)} placeholder="新しい管理者トークン" className="md:col-span-2 border border-slate-600 bg-slate-900 rounded px-2 py-1 text-xs font-mono" />
            <div className="flex gap-2">
              <button onClick={setAdminToken} disabled={adminTokenLoading || !adminTokenInput.trim()} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50">セット</button>
              <button onClick={clearAdminToken} disabled={adminTokenLoading} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50">クリア</button>
            </div>
          </div>
          <div className="text-[11px] space-y-1 bg-slate-900/60 border border-slate-700 rounded p-3 font-mono">
            <div>allow: {String(adminTokenStatus?.allowed)}</div>
            <div>hasBase: {String(adminTokenStatus?.hasBase)}</div>
            <div>hasOverride: {String(adminTokenStatus?.hasOverride)}</div>
            <div>effective: {adminTokenStatus?.effective || '-'}</div>
            <div className="text-slate-500">overrideMasked: {adminTokenStatus?.overrideMasked || '-'}</div>
          </div>
        </section>

        <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">カスタム HTTP 実行</h2>
            <button className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700" onClick={() => setCustomOpen(o => !o)}>{customOpen ? '閉じる' : '開く'}</button>
          </div>
          {customOpen && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-medium flex flex-col gap-1 col-span-2">
                <span>URL</span>
                <input value={url} onChange={e => setUrl(e.target.value)} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm font-mono" />
              </label>
              <label className="text-xs font-medium flex flex-col gap-1">
                <span>Method</span>
                <input value={method} onChange={e => setMethod(e.target.value.toUpperCase())} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-sm" />
              </label>
              <label className="text-xs font-medium flex flex-col gap-1">
                <span>Headers (JSON)</span>
                <textarea value={headers} onChange={e => setHeaders(e.target.value)} rows={4} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-xs font-mono" />
              </label>
              <label className="text-xs font-medium flex flex-col gap-1 md:col-span-2">
                <span>Body (JSON / raw)</span>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full border border-slate-600 bg-slate-900 rounded px-2 py-1 text-xs font-mono" placeholder="空なら送信しません" />
              </label>
              <label className="inline-flex items-center gap-2 text-xs md:col-span-2">
                <input type="checkbox" checked={useAdminAuth} onChange={e => setUseAdminAuth(e.target.checked)} />
                <span>管理者トークン付与 (Authorization)</span>
              </label>
              <div className="col-span-2">
                <button
                  onClick={() => run('custom')}
                  disabled={loading}
                  className="px-5 py-2.5 rounded bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium disabled:opacity-50 shadow"
                >{loading ? '送信中…' : 'カスタム実行'}</button>
              </div>
              <p className="text-[10px] text-slate-500 col-span-2">DEBUG_ENABLE_CUSTOM=1 とホスト許可が必要です。</p>
            </div>
          )}
        </section>

        <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">ログビューア</h2>
            <button onClick={() => { setLogsOpen(o => !o); }} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700">{logsOpen ? '閉じる' : '開く'}</button>
            {logsOpen && (
              <>
                <button onClick={fetchLogs} disabled={logsLoading} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">更新</button>
                <button onClick={clearLogs} disabled={logsLoading} className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50">クリア</button>
              </>
            )}
          </div>
          {logsOpen && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500">DEBUG_ENABLE_LOG_VIEW=1 が必要。最大 {logs?.max} entries。</div>
              <div className="h-72 overflow-auto rounded border border-slate-700 bg-slate-900/70 p-2 text-[11px] font-mono leading-relaxed">
                {logsLoading && <div className="text-slate-500">読み込み中…</div>}
                {!logsLoading && logs?.entries?.length === 0 && <div className="text-slate-500">ログなし</div>}
                {!logsLoading && logs?.entries?.map((e: any, i: number) => (
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

        <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold">プッシュ通知送信</h2>
          <p className="text-[11px] text-slate-400">購読済み端末にテスト通知を送ります。VAPID鍵と購読が必要。</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
              <button onClick={fetchAnnouncements} type="button" className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50" disabled={annLoading}>{annLoading ? '取得中…' : 'お知らせ読込'}</button>
              {annTemplates && annTemplates.length > 0 && (
                <select value={selectedAnnId || ''} onChange={e => applyTemplate(e.target.value)} className="text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1">
                  <option value="">テンプレ選択...</option>
                  {annTemplates.slice(0,50).map((a: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <option key={a.id} value={a.id}>{a.title?.slice(0,40) || '(no title)'}</option>
                  ))}
                </select>
              )}
              {annTemplates && <span className="text-[10px] text-slate-500">{annTemplates.length}件</span>}
            </div>
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
            <div className="md:col-span-2 flex items-center gap-3">
              <button onClick={sendPush} disabled={pushSending} className="px-5 py-2.5 rounded bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-sm font-medium disabled:opacity-50">{pushSending ? '送信中…' : '送信'}</button>
              {pushResult && <span className={"text-xs " + (pushResult.ok ? 'text-emerald-400' : 'text-red-400')}>{pushResult.ok ? `OK sent=${pushResult.data?.sent}` : '失敗'}</span>}
              <button onClick={fetchPushStats} disabled={pushStatsLoading} className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700 disabled:opacity-50">{pushStatsLoading ? '取得中…' : '購読数'}</button>
              {pushStats !== null && <span className="text-xs text-slate-400">{pushStats} subs</span>}
            </div>
          </div>
        </section>

        {result && (
          <section className="space-y-4 bg-slate-900/70 border border-slate-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold">結果</h2>
            <div className="flex flex-wrap gap-4 text-xs">
              <span>OK: <span className={result.ok ? 'text-emerald-400' : 'text-red-400'}>{String(result.ok)}</span></span>
              <span>Status: {result.status}</span>
              <span>{result.elapsedMs} ms</span>
            </div>
            {result.error && <div className="text-red-400 text-xs">{result.error}</div>}
            <pre className="bg-slate-950/70 border border-slate-700 p-3 rounded text-[11px] overflow-auto max-h-96 whitespace-pre-wrap break-all font-mono leading-relaxed">{JSON.stringify(result.data, null, 2)}</pre>
          </section>
        )}

        <section className="space-y-2 text-[11px] text-slate-500">
          <p>このページはパスワードで保護されています。追加で IP / Basic 認証を推奨。</p>
          <pre className="bg-slate-900/70 border border-slate-700 p-3 rounded">DEBUG_PASSWORD=your_password_here</pre>
        </section>

        {/* Schedules debug */}
        <section className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold">現在進行中の予定 / 並び替え</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => {
                setSchedLoading(true);
                try {
                  const [ov, tp, ord, cur] = await Promise.all([
                    fetch('/api/schedules/override', { cache: 'no-store' }).then(r => r.json()),
                    fetch('/api/schedules/template', { cache: 'no-store' }).then(r => r.json()),
                    fetch('/api/schedules/order', { cache: 'no-store' }).then(r => r.json()),
                    fetch('/api/schedules/current', { cache: 'no-store' }).then(r => r.json()),
                  ]);
                  if (ov.ok) { setOverrideEnabled(ov.data.enabled); setOverrideItem(ov.data.item); }
                  if (tp.ok) { setTemplate(tp.data || []); }
                  if (cur.ok) { setCurrentId(cur.data?.id ?? null); }
                  if (ord.ok) {
                    const full = normalizeOrder(tp.data || [], (ord.data?.order)||[]);
                    setOrder(full);
                  } else if (tp.ok) {
                    setOrder((tp.data || []).map((t:any)=>String(t.id))); // eslint-disable-line @typescript-eslint/no-explicit-any
                  }
                  setPreviewIndex(null);
                } finally { setSchedLoading(false); }
              }}
              className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
              disabled={schedLoading}
            >{schedLoading ? '取得中…' : 'テンプレ/設定読込'}</button>
            <button
              onClick={async () => {
                // 現在進行中の次へ
                if (!orderedTemplate.length) return;
                const ids = orderedTemplate.map(t => String(t.id));
                const idx = currentId ? ids.indexOf(String(currentId)) : -1;
                const nextIdx = (idx >= 0 && idx + 1 < ids.length) ? idx + 1 : (ids.length > 0 ? 0 : -1);
                if (nextIdx < 0) return;
                const t = orderedTemplate[nextIdx];
                setSchedLoading(true);
                try {
                  const body = { enabled: true, item: { id: t.id, event: t.event || t.title, description: t.description || '', start_time: t.start_time || null, end_time: t.end_time || null, is_all_day: t.is_all_day || false } };
                  const res = await fetch('/api/schedules/override', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify(body) });
                  if (res.ok) setCurrentId(String(t.id)); else alert('移動失敗');
                } finally { setSchedLoading(false); }
              }}
              className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
              disabled={schedLoading}
            >次の予定に移動</button>
            <button
              onClick={async () => {
                // 現在進行中の前へ
                if (!orderedTemplate.length) return;
                const ids = orderedTemplate.map(t => String(t.id));
                const idx = currentId ? ids.indexOf(String(currentId)) : -1;
                const prevIdx = (idx > 0) ? idx - 1 : (ids.length > 0 ? ids.length - 1 : -1);
                if (prevIdx < 0) return;
                const t = orderedTemplate[prevIdx];
                setSchedLoading(true);
                try {
                  const body = { enabled: true, item: { id: t.id, event: t.event || t.title, description: t.description || '', start_time: t.start_time || null, end_time: t.end_time || null, is_all_day: t.is_all_day || false } };
                  const res = await fetch('/api/schedules/override', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify(body) });
                  if (res.ok) setCurrentId(String(t.id)); else alert('移動失敗');
                } finally { setSchedLoading(false); }
              }}
              className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
              disabled={schedLoading}
            >前の予定に戻す</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">手動上書き</h3>
              <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={overrideEnabled} onChange={e => setOverrideEnabled(e.target.checked)} /><span>有効</span></label>
              <div className="text-xs space-y-2">
                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" placeholder="タイトル" value={overrideItem?.event||''} onChange={e => setOverrideItem({ ...(overrideItem||{}), event: e.target.value })} />
                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" placeholder="開始 (ISO)" value={overrideItem?.start_time||''} onChange={e => setOverrideItem({ ...(overrideItem||{}), start_time: e.target.value })} />
                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" placeholder="終了 (ISO)" value={overrideItem?.end_time||''} onChange={e => setOverrideItem({ ...(overrideItem||{}), end_time: e.target.value })} />
                <textarea className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" rows={2} placeholder="説明" value={overrideItem?.description||''} onChange={e => setOverrideItem({ ...(overrideItem||{}), description: e.target.value })} />
                <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={overrideItem?.is_all_day||false} onChange={e => setOverrideItem({ ...(overrideItem||{}), is_all_day: e.target.checked })} /><span>終日</span></label>
                <div>
                  <button
                    onClick={async () => {
                      setSchedLoading(true);
                      try {
                        const res = await fetch('/api/schedules/override', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ enabled: overrideEnabled, item: overrideItem }) });
                        if (!res.ok) alert('保存失敗');
                      } finally { setSchedLoading(false); }
                    }}
                    className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                    disabled={schedLoading}
                  >保存</button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">テンプレ順（直感操作）</h3>
              <div className="text-[10px] text-slate-400">各行の「次にする」を押すと、そのIDが順序の先頭に積まれます（重複は自動排除）。下のテキストは編集補助です。</div>
              <textarea className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono" rows={3} value={order.join(',')} onChange={e => setOrder(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setSchedLoading(true);
                    try {
                      const res = await fetch('/api/schedules/order', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-debug-password': password }, body: JSON.stringify({ order }) });
                      if (!res.ok) alert('保存失敗');
                    } finally { setSchedLoading(false); }
                  }}
                  className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500"
                  disabled={schedLoading}
                >順序保存</button>
                <span className="text-[10px] text-slate-400">テンプレ件数: {template?.length||0}</span>
              </div>
              <div className="h-56 overflow-auto text-[11px] bg-slate-900/60 border border-slate-700 rounded p-2">
                {orderedTemplate.map((t:any, i:number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  // 行操作はプレビューと上下移動のみ
                  const showPreview = () => {
                    const idx = orderedTemplate.findIndex((x:any) => String(x.id) === String(t.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
                    setPreviewIndex(idx);
                  };
                  const moveUp = () => {
                    setOrder(prev => {
                      const arr = [...(prev.length ? prev.map(x => String(x)) : template.map((x:any)=>String(x.id)))]; // eslint-disable-line @typescript-eslint/no-explicit-any
                      const id = String(t.id);
                      const idx = arr.indexOf(id);
                      if (idx > 0) {
                        [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
                      }
                      return normalizeOrder(template, arr);
                    });
                  };
                  const moveDown = () => {
                    setOrder(prev => {
                      const arr = [...(prev.length ? prev.map(x => String(x)) : template.map((x:any)=>String(x.id)))]; // eslint-disable-line @typescript-eslint/no-explicit-any
                      const id = String(t.id);
                      const idx = arr.indexOf(id);
                      if (idx >= 0 && idx < arr.length - 1) {
                        [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
                      }
                      return normalizeOrder(template, arr);
                    });
                  };
                  const isCurrent = currentId !== null && String(currentId) === String(t.id);
                  return (
                    <div key={t.id} className={"flex items-center gap-2 py-0.5 border-b border-slate-800 last:border-b-0 rounded " + (isCurrent ? 'bg-emerald-900/20 ring-1 ring-emerald-700/40' : '')}>
                      <span className="text-slate-500 w-6 shrink-0 text-right">{i+1}</span>
                      <span className="text-slate-500 w-12 shrink-0">#{t.id}</span>
                      <span className="text-slate-200 flex-1 min-w-0 truncate">{t.event || t.title}</span>
                      <span className="text-slate-500 shrink-0">{t.start_time?.slice(11,16)}~{t.end_time?.slice(11,16)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={moveUp} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 hover:bg-slate-700">↑</button>
                        <button onClick={moveDown} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 hover:bg-slate-700">↓</button>
                        <button onClick={showPreview} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 hover:bg-slate-700">前後</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {previewIndex !== null && template[previewIndex] && (
                <div className="mt-2 text-[11px] bg-slate-900/70 border border-slate-700 rounded p-2 space-y-1">
                  <div className="text-slate-400">プレビュー（前後）</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[-1,0,1].map(offset => {
                      const idx = previewIndex! + offset;
                      const it = template[idx];
                      if (!it) return <div key={offset} className="h-16 rounded bg-slate-800/50 border border-slate-700/60" />;
                      return (
                        <div key={offset} className={"p-2 rounded border " + (offset===0 ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-slate-800/50 border-slate-700/60')}>
                          <div className="text-slate-300 truncate">{it.event || it.title}</div>
                          <div className="text-slate-500">{it.start_time?.slice(11,16)}~{it.end_time?.slice(11,16)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
