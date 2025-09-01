import { NextRequest, NextResponse } from 'next/server';

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

type ExecRequest = ClearCacheRequest | CustomRequest;

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
    const token = process.env.DIRECTUS_ADMIN_TOKEN;
    if (!token) return jsonError('Server missing DIRECTUS_ADMIN_TOKEN env (not configured)', 500);
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
      return NextResponse.json({ ok: res.ok, status: res.status, data, elapsedMs: Date.now() - started }, { status: res.ok ? 200 : 502 });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return jsonError(`Fetch error: ${e?.message || e}` , 500);
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
      if (!process.env.DIRECTUS_ADMIN_TOKEN) return jsonError('Server missing DIRECTUS_ADMIN_TOKEN env', 500);
      headers.Authorization = `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`;
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
      return NextResponse.json({ ok: res.ok, status: res.status, data: parsed, elapsedMs: Date.now() - started }, { status: res.ok ? 200 : 502 });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return jsonError(`Fetch error: ${e?.message || e}`, 500);
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
