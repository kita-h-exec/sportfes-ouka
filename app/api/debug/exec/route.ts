import { NextRequest, NextResponse } from 'next/server';
import webpush from '@/lib/webpush';
import { logNotify } from '@/lib/notifyLogger';
import { listSubscriptions, backendKind } from '@/lib/pushStore';

// この API はデバッグ用途: Directus のキャッシュクリアなどサーバー側で安全にトークンを扱う
// 想定する環境変数:
//   DIRECTUS_CACHE_CLEAR_URL   例: https://ouka-directus.nasno.net/utils/cache/clear
//   DIRECTUS_ADMIN_TOKEN       キャッシュクリア可能な管理者トークン (コードに直書きしない)
//   DEBUG_ENABLE_CUSTOM        '1' の場合のみ任意 URL 実行 (制限付き)
//   DEBUG_ALLOW_HOSTS          カンマ区切りホワイトリスト (custom 実行時)

export const runtime = 'nodejs';
export const revalidate = 0;

interface ExecRequestBase { action?: string; }
interface ClearCacheRequest extends ExecRequestBase { action: 'clear_cache'; }
interface CustomRequest extends ExecRequestBase {
  action: 'custom';
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  useAdminAuth?: boolean; // true の場合 Authorization: Bearer <ADMIN_TOKEN> を付与
}
interface AdminTokenStatusRequest extends ExecRequestBase { action: 'admin_token_status'; }
interface SetAdminTokenRequest extends ExecRequestBase { action: 'set_admin_token'; token: string; }
interface ClearAdminTokenRequest extends ExecRequestBase { action: 'clear_admin_token'; }
interface LogsRequest extends ExecRequestBase { action: 'logs'; }
interface ClearLogsRequest extends ExecRequestBase { action: 'clear_logs'; }
interface PushLogsRequest extends ExecRequestBase { action: 'push_logs'; date?: string; limit?: number; }
interface ClearPushLogsRequest extends ExecRequestBase { action: 'clear_push_logs'; date?: string; }
interface PushNotifyRequest extends ExecRequestBase {
  action: 'push_notify';
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}
interface PushStatsRequest extends ExecRequestBase { action: 'push_stats'; }

type ExecRequest =
  | ClearCacheRequest
  | CustomRequest
  | AdminTokenStatusRequest
  | SetAdminTokenRequest
  | ClearAdminTokenRequest
  | LogsRequest
  | ClearLogsRequest
  | PushLogsRequest
  | ClearPushLogsRequest
  | PushNotifyRequest
  | PushStatsRequest;

// プロセス稼働中のみ有効な一時的管理者トークン (再デプロイ/再起動で消える)
let ADMIN_TOKEN_OVERRIDE: string | null = null;

// シンプルなインメモリログ (プロセスライフタイム内のみ保持)
const LOG_MAX = parseInt(process.env.DEBUG_LOG_MAX || '500', 10);
type DebugLogEntry = { ts: string; action: string; ip?: string | null; detail?: Record<string, unknown>; };
const LOG_BUFFER: DebugLogEntry[] = [];

function pushLog(entry: DebugLogEntry) {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.splice(0, LOG_BUFFER.length - LOG_MAX);
}

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function getAdminToken(): string | undefined {
  return ADMIN_TOKEN_OVERRIDE || process.env.DIRECTUS_ADMIN_TOKEN;
}

function maskToken(token?: string | null): string | null {
  if (!token) return null;
  if (token.length <= 8) return '*'.repeat(Math.max(0, token.length - 2)) + token.slice(-2);
  return '*'.repeat(token.length - 4) + token.slice(-4);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  // --- Password gate (simple shared secret) ---
  const expected = process.env.DEBUG_PASSWORD;
  if (expected) {
    const provided = req.headers.get('x-debug-password');
    if (provided !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  let payload: ExecRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const started = Date.now();
  if (!payload.action) return jsonError('Missing action');

  // --- noop (auth check) ---
  if (payload.action === 'custom' && (payload as any).url === '__noop__') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ ok: true, status: 200, data: { message: 'noop' }, elapsedMs: 0 });
  }

  if (payload.action === 'clear_cache') {
    const url = process.env.DIRECTUS_CACHE_CLEAR_URL || 'https://ouka-directus.nasno.net/utils/cache/clear';
    const token = getAdminToken();
    if (!token) return jsonError('Server missing admin token (env or override)', 500);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // Directus の cache clear は空 body で良い
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(15000) : undefined,
      });
      const text = await res.text();
      let data: any = text; // eslint-disable-line @typescript-eslint/no-explicit-any
      try { data = JSON.parse(text); } catch {/* ignore */}
      pushLog({ ts: new Date().toISOString(), action: 'clear_cache', ip: clientIp(req), detail: { status: res.status, ok: res.ok } });
      return NextResponse.json({ ok: res.ok, status: res.status, data, elapsedMs: Date.now() - started }, { status: res.ok ? 200 : 502 });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      pushLog({ ts: new Date().toISOString(), action: 'clear_cache_error', ip: clientIp(req), detail: { error: e?.message || String(e) } });
      return jsonError(`Fetch error: ${e?.message || e}` , 500);
    }
  }

  // --- 管理者トークンの状態取得 ---
  if (payload.action === 'admin_token_status') {
    const baseExists = Boolean(process.env.DIRECTUS_ADMIN_TOKEN);
    const overrideExists = Boolean(ADMIN_TOKEN_OVERRIDE);
    return NextResponse.json({
      ok: true,
      status: 200,
      data: {
        hasBase: baseExists,
        hasOverride: overrideExists,
        effective: maskToken(getAdminToken()),
        overrideMasked: maskToken(ADMIN_TOKEN_OVERRIDE),
        allowed: process.env.DEBUG_ENABLE_ADMIN_TOKEN_OVERRIDE === '1'
      },
      elapsedMs: Date.now() - started
    });
  }

  // --- 管理者トークンの一時上書き設定 ---
  if (payload.action === 'set_admin_token') {
    if (process.env.DEBUG_ENABLE_ADMIN_TOKEN_OVERRIDE !== '1') return jsonError('Admin token override disabled');
    const { token } = payload as SetAdminTokenRequest;
    if (!token || typeof token !== 'string' || token.length < 10) return jsonError('Invalid token (length)');
    ADMIN_TOKEN_OVERRIDE = token.trim();
    pushLog({ ts: new Date().toISOString(), action: 'set_admin_token', ip: clientIp(req), detail: { len: ADMIN_TOKEN_OVERRIDE.length } });
    return NextResponse.json({ ok: true, status: 200, data: { message: 'override set', effective: maskToken(ADMIN_TOKEN_OVERRIDE) }, elapsedMs: Date.now() - started });
  }

  if (payload.action === 'clear_admin_token') {
    if (process.env.DEBUG_ENABLE_ADMIN_TOKEN_OVERRIDE !== '1') return jsonError('Admin token override disabled');
    ADMIN_TOKEN_OVERRIDE = null;
    pushLog({ ts: new Date().toISOString(), action: 'clear_admin_token', ip: clientIp(req) });
    return NextResponse.json({ ok: true, status: 200, data: { message: 'override cleared', effective: maskToken(getAdminToken()) }, elapsedMs: Date.now() - started });
  }

  // --- ログ取得 ---
  if (payload.action === 'logs') {
    if (process.env.DEBUG_ENABLE_LOG_VIEW !== '1') return jsonError('Log view disabled');
    return NextResponse.json({ ok: true, status: 200, data: { size: LOG_BUFFER.length, max: LOG_MAX, entries: LOG_BUFFER.slice().reverse() }, elapsedMs: Date.now() - started });
  }

  if (payload.action === 'clear_logs') {
    if (process.env.DEBUG_ENABLE_LOG_VIEW !== '1') return jsonError('Log view disabled');
    LOG_BUFFER.length = 0;
    pushLog({ ts: new Date().toISOString(), action: 'logs_cleared', ip: clientIp(req) });
    return NextResponse.json({ ok: true, status: 200, data: { message: 'logs cleared' }, elapsedMs: Date.now() - started });
  }

  // --- Push通知ファイルログの取得 ---
  if (payload.action === 'push_logs') {
    const { date, limit = 500 } = payload as PushLogsRequest;
    try {
      const mod = await import('@/lib/notifyLogger');
      const pathMod = await import('path');
      const fs = await import('fs');
      const baseDir = process.env.NOTIFY_LOG_DIR || pathMod.join(process.cwd(), 'data', 'push_logs');
      const d = date ? new Date(date) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const file = pathMod.join(baseDir, `notify-${yyyy}-${mm}-${dd}.log`);
      let entries: any[] = [];
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const lines = raw.split(/\n+/).filter(Boolean);
        const tail = lines.slice(-Math.max(1, Math.min(5000, limit)));
        for (const line of tail) {
          try { entries.push(JSON.parse(line)); } catch {/* ignore malformed */}
        }
      }
      // 新しい順に
      entries.reverse();
      return NextResponse.json({ ok: true, status: 200, data: { date: `${yyyy}-${mm}-${dd}`, file, count: entries.length, entries }, elapsedMs: Date.now() - started });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return jsonError(`push_logs error: ${e?.message || e}`, 500);
    }
  }

  // --- Push通知ファイルログの削除（当日または指定日）---
  if (payload.action === 'clear_push_logs') {
    try {
      const pathMod = await import('path');
      const fs = await import('fs');
      const baseDir = process.env.NOTIFY_LOG_DIR || pathMod.join(process.cwd(), 'data', 'push_logs');
      const d = (payload as ClearPushLogsRequest).date ? new Date((payload as ClearPushLogsRequest).date as string) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const file = pathMod.join(baseDir, `notify-${yyyy}-${mm}-${dd}.log`);
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
      return NextResponse.json({ ok: true, status: 200, data: { removed: file }, elapsedMs: Date.now() - started });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return jsonError(`clear_push_logs error: ${e?.message || e}`, 500);
    }
  }

  if (payload.action === 'custom') {
    if (process.env.DEBUG_ENABLE_CUSTOM !== '1') return jsonError('Custom exec disabled');
    const { url, method = 'GET' } = payload;
    if (!/^https?:\/\//i.test(url)) return jsonError('Invalid url');
    // ホスト制限
    const allowHosts = (process.env.DEBUG_ALLOW_HOSTS || 'localhost,127.0.0.1,ouka-directus.nasno.net')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    try {
      const u = new URL(url);
      if (!allowHosts.includes(u.host)) {
        return jsonError(`Host not allowed: ${u.host}`);
      }
    } catch {
      return jsonError('Malformed url');
    }
    const headers: Record<string, string> = { 'Accept': 'application/json', ...(payload.headers || {}) };
  if (payload.useAdminAuth) {
      const token = getAdminToken();
      if (!token) return jsonError('Server missing admin token', 500);
      headers.Authorization = `Bearer ${token}`;
    }
    let body: BodyInit | undefined;
    if (payload.body !== undefined) {
      if (typeof payload.body === 'string') {
        body = payload.body;
      } else {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(payload.body);
      }
    }
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        cache: 'no-store',
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(20000) : undefined,
      });
      const text = await res.text();
      let parsed: any = text; // eslint-disable-line @typescript-eslint/no-explicit-any
      try { parsed = JSON.parse(text); } catch {/* keep raw text */}
      pushLog({ ts: new Date().toISOString(), action: 'custom', ip: clientIp(req), detail: { url, status: res.status, method } });
      return NextResponse.json({ ok: res.ok, status: res.status, data: parsed, elapsedMs: Date.now() - started }, { status: res.ok ? 200 : 502 });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      pushLog({ ts: new Date().toISOString(), action: 'custom_error', ip: clientIp(req), detail: { url, error: e?.message || String(e) } });
      return jsonError(`Fetch error: ${e?.message || e}`, 500);
    }
  }

  // --- Web Push 通知送信 ---
  if (payload.action === 'push_notify') {
    const vapidOk = Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
    if (!vapidOk) return jsonError('VAPID keys missing', 500);
    const { title, body, url, tag, icon, badge } = payload as PushNotifyRequest;
    if (!title && !body) return jsonError('Missing title/body');
    try {
      const subs = await listSubscriptions();
      let sent = 0;
      let failed = 0;
      let removed = 0;

      // ファイルログ: 開始
      await logNotify({ kind: 'send:start', count: subs.length, title, bodyLen: typeof body === 'string' ? body.length : undefined });
      await Promise.all(
        subs.map(async (sub: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          try {
            await webpush.sendNotification(sub, JSON.stringify({ title, body, url, tag, icon, badge }));
            sent += 1;
            await logNotify({ kind: 'send:success', endpoint: sub?.endpoint });
          } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            // 購読無効 (410/404) の場合クリーンアップ (Best-effort)
            const status = (e && e.statusCode) || (e?.status);
            failed += 1;
            await logNotify({ kind: 'send:failure', endpoint: sub?.endpoint, error: e?.message || String(e), status });
            if (status === 410 || status === 404) {
              try {
                const mod = await import('@/lib/pushStore');
                // @ts-ignore optional
                if (mod.removeSubscription) {
                  // @ts-ignore
                  await mod.removeSubscription(sub?.endpoint);
                  removed += 1;
                }
              } catch {/* ignore */}
            }
          }
        })
      );
      // ファイルログ: サマリー
      await logNotify({ kind: 'send:summary', total: subs.length, sent, failed, removed });
      pushLog({ ts: new Date().toISOString(), action: 'push_notify', ip: clientIp(req), detail: { sent, removed, failed } });
      return NextResponse.json({ ok: true, status: 200, data: { sent, failed, removed }, elapsedMs: Date.now() - started });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      pushLog({ ts: new Date().toISOString(), action: 'push_notify_error', ip: clientIp(req), detail: { error: e?.message || String(e) } });
      return jsonError('Push send error', 500);
    }
  }

  // --- Web Push 購読統計 ---
  if (payload.action === 'push_stats') {
    try {
      const subs = await listSubscriptions();
      return NextResponse.json({ ok: true, status: 200, data: { count: subs.length, backend: backendKind() }, elapsedMs: Date.now() - started });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return jsonError('stats error', 500);
    }
  }

  return jsonError('Unknown action');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
