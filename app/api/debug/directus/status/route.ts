import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const runtime = 'nodejs';
export const revalidate = 0;

async function tryHealth(baseUrl: string) {
  const url = baseUrl.replace(/\/$/, '') + '/server/health';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const ok = res.ok;
    let body: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try { body = await res.json(); } catch { /* ignore */ }
    return { ok, status: res.status, body };
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL || '';
  const tokenSet = Boolean(process.env.DIRECTUS_STATIC_TOKEN);
  const result: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    base,
    tokenSet,
  };

  if (!base) {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_DIRECTUS_URL missing', ...result }, { status: 500 });
  }

  result.health = await tryHealth(base);

  // Try a lightweight authorized query (announcements 1件) only if token set.
  if (tokenSet) {
    try {
      const rows = await directus.request(
        (readItems as any)('announcements', { limit: 1, fields: ['id'] }) // eslint-disable-line @typescript-eslint/no-explicit-any
      ) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
      result.announcementsProbe = { ok: true, count: rows.length };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      result.announcementsProbe = { ok: false, error: e?.message || String(e) };
    }
  }

  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}
