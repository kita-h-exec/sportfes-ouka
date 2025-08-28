import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';

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

// Optionally use a static token if provided (server-side only)
const base = createDirectus(normalizeDirectusUrl(process.env.NEXT_PUBLIC_DIRECTUS_URL));
const directus = (process.env.DIRECTUS_STATIC_TOKEN
  ? base.with(staticToken(process.env.DIRECTUS_STATIC_TOKEN)).with(rest())
  : base.with(rest())
);

export default directus;

// ブロック一覧を取得する関数
export const getBlocks = () => {
  return directus.request(
    readItems('blocks', {
      fields: ['slug', 'name', 'color', 'text_color', 'section_1_title', 'section_1_description', 'section_2_title', 'section_2_description'],
      sort: ['slug'], // slugで並び替え
    })
  );
};

// slugを元に単一のブロックを取得する関数
export const getBlockBySlug = async (slug: string) => {
  const items = await directus.request(
    readItems('blocks', {
      filter: { slug: { _eq: slug } },
      fields: [
        'slug',
        'name',
        'color',
        'text_color',
        'section_1_title',
        'section_1_description',
        'section_2_title',
        'section_2_description',
      ],
      limit: 1,
    })
  );
  return items[0];
};

export const fetchEmergencyMessage = async () => {
  try {
    const response = await directus.request(
      readItems('emergency', {
        fields: ['message', 'display'],
        limit: 1,
      })
    );
    if (response && response.length > 0 && (response as any)[0].display) {
      return (response as any)[0].message as string;
    }
    return null;
  } catch (error) {
    console.error('Error fetching emergency message:', error);
    return null;
  }
};

// --- Announcements ---

// Get all announcements with a specific status
export const getAnnouncements = (status: 'published' | 'archived') => {
  return directus.request(
    readItems('announcements', {
      filter: { status: { _eq: status } },
      fields: ['title', 'body', 'date_created', 'date_updated'],
      sort: ['-date_created'],
    })
  );
};

// Get the latest announcement to be shown in the header
export const getHeaderAnnouncement = async () => {
  const response = await directus.request(
    readItems('announcements', {
      filter: { 
        show_in_header: { _eq: true },
        status: { _eq: 'published' }
      },
      fields: ['title'],
      sort: ['-date_created'],
      limit: 1,
    })
  );
  return (response && (response as any[]).length > 0) ? (response as any[])[0] : null;
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
      items = await directus.request(
        readItems('contents', {
          fields: fullFields,
          sort: ['sort','title'],
          limit: -1,
        })
      ) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = String(err?.message || err);
      // 指定フィールドの権限不足/存在しないフィールドに起因する403ならフィールドを縮小して再試行
      if (/permission|exist/i.test(msg) || /403/.test(msg)) {
        console.warn('[getContents] full field fetch failed, retrying with minimal fields. Message:', msg);
        try {
          items = await directus.request(
            readItems('contents', {
              fields: minimalFields,
              sort: ['sort','title'],
              limit: -1,
            })
          ) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
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
