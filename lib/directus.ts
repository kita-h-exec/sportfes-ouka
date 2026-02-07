import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';

// =============================================================
// Directus クライアント共通ユーティリティ
// 目的:
//   1. import 時に環境変数未設定でクラッシュしない (遅延初期化)
//   2. トークン無効 / 権限不足(401/403) 時に Public クライアントへフォールバック
//   3. ネットワークエラー/一時的障害時のリトライ (軽微)
//   4. DEBUG_DIRECTUS=1 で詳細ログ
// =============================================================

// Normalize and validate the Directus base URL from env
function normalizeDirectusUrl(url?: string): string {
  if (!url) throw new Error('Missing env NEXT_PUBLIC_DIRECTUS_URL');
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) {
    // Default to https for public hosts; http for localhost
    const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/i.test(u);
    u = `${isLocal ? 'http' : 'https'}://${u}`;
  }
  try {
    // Validate
    // eslint-disable-next-line no-new
    new URL(u);
  } catch {
    throw new TypeError(`Invalid NEXT_PUBLIC_DIRECTUS_URL: "${url}"`);
  }
  // Remove trailing slashes for consistency
  return u.replace(/\/+$/, '');
}

let _baseUrl: string | null = null;
let _baseClient: any | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
let _tokenClient: any | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

function ensureClients() {
  if (_baseClient) return; // 既に初期化
  _baseUrl = normalizeDirectusUrl(process.env.NEXT_PUBLIC_DIRECTUS_URL);
  _baseClient = createDirectus(_baseUrl).with(rest());
  if (process.env.DIRECTUS_STATIC_TOKEN) {
    _tokenClient = createDirectus(_baseUrl)
      .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN))
      .with(rest());
  }
  if (process.env.DEBUG_DIRECTUS === '1') {
    // eslint-disable-next-line no-console
    console.log('[directus:init]', { baseUrl: _baseUrl, hasToken: Boolean(_tokenClient) });
  }
}

export function getDirectusRaw() {
  ensureClients();
  return _tokenClient || _baseClient;
}

// Fallback 許可
const ALLOW_FALLBACK = process.env.DIRECTUS_ALLOW_TOKEN_FALLBACK === '1';

function shouldFallback(e: any): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
  const msg = String(e?.message || '');
  // Directus SDK エラー構造 (errors[0].extensions.code など) も確認可能だが簡易判定
  if (/invalid user credentials/i.test(msg)) return true;
  if (/(401|403)/.test(msg)) return true;
  if (/permission/i.test(msg)) return true;
  return false;
}

async function safeRequest<T>(fn: (cli: any) => Promise<T>, attempt = 0): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  ensureClients();
  const cliPrimary = _tokenClient || _baseClient;
  const cliFallback = _baseClient; // public
  try {
    return await fn(cliPrimary);
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = String(e?.message || e);
    const debug = process.env.DEBUG_DIRECTUS === '1';
    if (debug) console.warn('[directus:safeRequest] primary error', msg);
    // フォールバック判定
    if (_tokenClient && ALLOW_FALLBACK && shouldFallback(e)) {
      console.warn('[directus] token request failed -> fallback public');
      try {
        return await fn(cliFallback);
      } catch (e2) {
        if (debug) console.warn('[directus:safeRequest] fallback also failed', e2);
        throw e2;
      }
    }
    // 500/ネットワークなどで 1 回だけ軽いリトライ
    if (attempt === 0 && /(fetch failed|network|ECONN|ETIMEDOUT|500)/i.test(msg)) {
      if (debug) console.log('[directus:safeRequest] retry once after transient error');
      await new Promise(r => setTimeout(r, 200));
      return safeRequest(fn, 1);
    }
    throw e;
  }
}

// 互換の default export (直接 SDK client として使っている箇所を壊さない)
const directus = {
  request: <T>(op: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // op は SDK の query ビルダー (readItems 等)
    return safeRequest(cli => cli.request(op));
  },
  // 生クライアントに触りたい特別用途 (今後なるべく非推奨)
  _raw: () => getDirectusRaw(),
};

export default directus as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// 呼び出し側が任意の Directus SDK 操作を安全実行したいときに使用
export async function directusSafe<T>(builder: (cli: any) => Promise<T>): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return safeRequest(builder);
}

// ブロック一覧を取得する関数
export const getBlocks = () => directus.request(
  (readItems as any)('blocks', { // eslint-disable-line @typescript-eslint/no-explicit-any
    fields: ['slug', 'name', 'color', 'text_color', 'section_1_title', 'section_1_description', 'section_2_title', 'section_2_description'],
    sort: ['slug'],
  })
);

// slugを元に単一のブロックを取得する関数
export const getBlockBySlug = async (slug: string) => {
  const items = await directus.request((readItems as any)('blocks', { // eslint-disable-line @typescript-eslint/no-explicit-any
    filter: { slug: { _eq: slug } },
    fields: [
      'slug', 'name', 'color', 'text_color',
      'section_1_title', 'section_1_description',
      'section_2_title', 'section_2_description',
    ],
    limit: 1,
  }));
  return (items as any[])[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const fetchEmergencyMessage = async () => {
  try {
  const response = await directus.request((readItems as any)('emergency', { // eslint-disable-line @typescript-eslint/no-explicit-any
      fields: ['message', 'display'],
      limit: 1,
    }));
    if (Array.isArray(response) && response.length > 0 && (response as any)[0].display) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return (response as any)[0].message as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    return null;
  } catch (error) {
    console.error('[fetchEmergencyMessage] error', error);
    return null;
  }
};

// --- Announcements ---

// Get all announcements with a specific status (error-safe)
export const getAnnouncements = async (status: 'published' | 'archived') => {
  try {
    const items = await safeRequest(cli => cli.request(
      (readItems as any)('announcements', { // eslint-disable-line @typescript-eslint/no-explicit-any
        filter: { status: { _eq: status } },
  // status ベース取得 (archived フィールドへの権限が無い環境向け)
  fields: ['id','title', 'body', 'date_created', 'date_updated', 'status'],
        sort: ['-date_created'],
      })
    ));
    return items;
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = e?.message || e;
    if (!/invalid user credentials/i.test(String(msg))) {
      console.error('[getAnnouncements] fetch error', msg);
    } else {
      console.warn('[getAnnouncements] unauth (no permission or invalid token)');
    }
    return [];
  }
};

// Get the latest announcement to be shown in the header
export const getHeaderAnnouncement = async () => {
  try {
    const response = await safeRequest(cli => cli.request(
      (readItems as any)('announcements', { // eslint-disable-line @typescript-eslint/no-explicit-any
        filter: {
          show_in_header: { _eq: true },
          status: { _eq: 'published' }
        },
        fields: ['id','title'],
        sort: ['-date_created'],
        limit: 1,
      })
    ));
    return (response && (response as any[]).length > 0) ? (response as any[])[0] : null; // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = e?.message || e;
    if (!/invalid user credentials/i.test(String(msg))) {
      console.error('[getHeaderAnnouncement] fetch error', msg);
    } else {
      console.warn('[getHeaderAnnouncement] unauth (no permission or invalid token)');
    }
    return null;
  }
};

// 全お知らせを取得し、published/archived/boolean archived 混在を許容するヘルパー
export interface UnifiedAnnouncementItem {
  id: string | number;
  title: string;
  body: string;
  date_created: string;
  date_updated: string;
  status?: string;
  archived?: boolean;
}

export const getAllAnnouncementsUnified = async (): Promise<UnifiedAnnouncementItem[]> => {
  try {
    // archived が権限不足の場合に備えて段階的にフィールド縮小
    const fieldsPrimary = ['id','title','body','date_created','date_updated','status','archived'];
    const fieldsFallbackNoArchived = ['id','title','body','date_created','date_updated','status'];
    const fieldsFallbackMinimal = ['id','title','body','date_created','date_updated'];
    let items: any[] | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      items = await safeRequest(cli => cli.request((readItems as any)('announcements', { // eslint-disable-line @typescript-eslint/no-explicit-any
        fields: fieldsPrimary,
        sort: ['-date_created'],
        limit: -1,
      })));
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = String(err?.message || err);
      if (/permission|exist|403/i.test(msg)) {
        console.warn('[getAllAnnouncementsUnified] primary fields failed, retry without archived. msg=', msg);
        try {
          items = await safeRequest(cli => cli.request((readItems as any)('announcements', { // eslint-disable-line @typescript-eslint/no-explicit-any
            fields: fieldsFallbackNoArchived,
            sort: ['-date_created'],
            limit: -1,
          })));
        } catch (err2) {
          const msg2 = String((err2 as any)?.message || err2); // eslint-disable-line @typescript-eslint/no-explicit-any
          if (/permission|exist|403/i.test(msg2)) {
            console.warn('[getAllAnnouncementsUnified] no-archived fallback failed, retry minimal. msg=', msg2);
            try {
              items = await safeRequest(cli => cli.request((readItems as any)('announcements', { // eslint-disable-line @typescript-eslint/no-explicit-any
                fields: fieldsFallbackMinimal,
                sort: ['-date_created'],
                limit: -1,
              })));
            } catch (err3: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
              console.error('[getAllAnnouncementsUnified] minimal fallback failed', (err3 as any)?.message || err3); // eslint-disable-line @typescript-eslint/no-explicit-any
              return [];
            }
          } else {
            console.error('[getAllAnnouncementsUnified] fallback failed', err2);
            return [];
          }
        }
      } else {
        throw err;
      }
    }
    if (!Array.isArray(items)) return [];
    return items as UnifiedAnnouncementItem[];
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = e?.message || e;
    console.error('[getAllAnnouncementsUnified] fetch error', msg);
    return [];
  }
};

// --- Contents ---
export interface DirectusContentItem {
  id?: string | number;
  slug?: string;
  title?: string;
  name?: string; // fallback
  description?: string;
  body?: string; // fallback
  href?: string;
  url?: string; // fallback
  sort?: number | null;
  icon?: string;
}

export const getContents = async () => {
  try {
  // まずはワイルドカードで許可されたフィールドだけ Directus 側が返すようにする（拒否されるフィールド名を明示的に出さない）
  const fullFields = ['*','herf']; // タイプミスフィールドだけ追加指定
  const minimalFields = ['id','title','description','herf','sort','status'];
    let items: any[] | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let usedFields = fullFields;
    try {
  items = await directus.request((readItems as any)('contents', { // eslint-disable-line @typescript-eslint/no-explicit-any
        fields: fullFields,
        sort: ['sort','title'],
        limit: -1,
      })) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = String(err?.message || err);
      // 指定フィールドの権限不足/存在しないフィールドに起因する403ならフィールドを縮小して再試行
      if (/permission|exist/i.test(msg) || /403/.test(msg)) {
        console.warn('[getContents] full field fetch failed, retrying with minimal fields. Message:', msg);
        try {
          items = await directus.request((readItems as any)('contents', { // eslint-disable-line @typescript-eslint/no-explicit-any
            fields: minimalFields,
            sort: ['sort','title'],
            limit: -1,
          })) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
          usedFields = minimalFields;
        } catch (err2) {
          console.error('[getContents] minimal field fetch also failed', err2);
          throw err2; // 上位でフォールバック処理に進む
        }
      } else {
        throw err; // 想定外エラーはそのまま上位へ
      }
    }
    if (!Array.isArray(items)) return [] as any[];
    if (items.length === 0) {
      // Fallback: raw REST fetch (SDKが何らかの理由で空を返した場合の比較調査用)
      try {
        const baseUrl = normalizeDirectusUrl(process.env.NEXT_PUBLIC_DIRECTUS_URL);
        const rawUrl = `${baseUrl}/items/contents?limit=-1&fields=*,herf`;
        const headers: Record<string,string> = { 'Accept': 'application/json' };
        if (process.env.DIRECTUS_STATIC_TOKEN) headers.Authorization = `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`;
        const res = await fetch(rawUrl, { headers, cache: 'no-store' });
        if (res.ok) {
          const json: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
            if (Array.isArray(json.data) && json.data.length > 0) {
              console.warn('[getContents] SDK returned 0 items, raw fetch returned', json.data.length, 'items. Using fallback.');
              return json.data.map((it: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
                href: it.href || it.herf || it.url || (it.slug ? `/${it.slug}` : '#'),
                title: it.title || it.name || '(no title)',
                description: it.description || it.body || '',
                icon: it.icon || '',
                sort: it.sort ?? null,
                slug: it.slug,
                status: it.status,
                _source: 'fallback'
              }));
            }
        } else {
          console.warn('[getContents] Fallback raw fetch failed status', res.status);
        }
      } catch (fe) {
        console.warn('[getContents] Fallback raw fetch error', fe);
      }
    }
    const mapped = (items as DirectusContentItem[]).map(it => ({
      href: (it as any).href || (it as any).herf || (it as any).url || (it.slug ? `/${it.slug}` : '#'),
      title: it.title || (it as any).name || '(no title)',
      description: it.description || (it as any).body || '',
      icon: (it as any).icon || '',
      sort: it.sort ?? null,
      slug: it.slug,
      status: (it as any).status,
      _fields: usedFields, // デバッグ用: どのフィールドセットで取得したか
    }));
    return mapped;
  } catch (e) {
  console.error('Error fetching contents:', e);
    return [] as any[];
  }
};

// --- Schedules ---
export interface DirectusScheduleItem {
  id?: string | number;
  start_time?: string; // ISO
  end_time?: string | null;
  event?: string;
  description?: string;
  is_all_day?: boolean;
  // unknown / variant field names fallback
  start?: string;
  end?: string;
  title?: string;
  body?: string;
  all_day?: boolean;
}

export const getSchedules = async (): Promise<DirectusScheduleItem[]> => {
  const fullFields = ['*'];
  const minimalFields = ['id','start_time','end_time','event','description','is_all_day'];
  let items: any[] | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  let usedFields = fullFields;
  try {
    items = await directus.request((readItems as any)('schedules', { // eslint-disable-line @typescript-eslint/no-explicit-any
      fields: fullFields,
      sort: ['start_time'],
      limit: -1,
      filter: { status: { _eq: 'published' } },
    })) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = String(err?.message || err);
    if (/permission|exist|403/i.test(msg)) {
      console.warn('[getSchedules] full field fetch failed, retry minimal. msg=', msg);
      try {
        items = await directus.request((readItems as any)('schedules', { // eslint-disable-line @typescript-eslint/no-explicit-any
          fields: minimalFields,
          sort: ['start_time'],
          limit: -1,
          filter: { status: { _eq: 'published' } },
        })) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
        usedFields = minimalFields;
      } catch (err2) {
        console.error('[getSchedules] minimal field fetch also failed', err2);
        items = [];
      }
    } else {
      console.error('[getSchedules] fetch error (unexpected)', msg);
      items = [];
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    // Raw fallback (SDK が空を返した / 権限差異調査用)
    try {
      const baseUrl = normalizeDirectusUrl(process.env.NEXT_PUBLIC_DIRECTUS_URL);
  const rawUrl = `${baseUrl}/items/schedules?limit=-1&fields=*&filter[status][_eq]=published`;
      const headers: Record<string,string> = { Accept: 'application/json' };
      if (process.env.DIRECTUS_STATIC_TOKEN) headers.Authorization = `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`;
      const res = await fetch(rawUrl, { headers, cache: 'no-store' });
      if (res.ok) {
        const json: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(json.data) && json.data.length > 0) {
          console.warn('[getSchedules] SDK returned 0 items, raw fetch returned', json.data.length, 'using fallback');
          items = json.data;
          usedFields = ['*'];
        }
      } else {
        console.warn('[getSchedules] raw fetch failed status', res.status);
      }
    } catch (fe) {
      console.warn('[getSchedules] raw fetch error', fe);
    }
  }
  if (!Array.isArray(items)) return [];
  const mapped = items.map((it: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const start = it.start_time || it.start;
    const end = it.end_time || it.end || null;
    return {
      id: it.id,
      start_time: start,
      end_time: end,
      event: it.event || it.title || '(no title)',
      description: it.description || it.body || '',
      is_all_day: typeof it.is_all_day === 'boolean' ? it.is_all_day : (it.all_day === true),
      _fields: usedFields,
    } as DirectusScheduleItem & { _fields: string[] };
  });
  return mapped;
};
