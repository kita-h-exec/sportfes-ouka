import { NextResponse } from 'next/server';
import { getContents } from '@/lib/directus';

export const revalidate = 0; // always fresh

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  const started = Date.now();
  try {
    const items = await getContents();
    const body: any = { items, count: items.length }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (debug) {
      body.env = {
        DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL,
        NODE_ENV: process.env.NODE_ENV,
      };
      body.timing_ms = Date.now() - started;
      body.note = 'If count=0 but Directus has data, check public role permissions or provide DIRECTUS_STATIC_TOKEN.';
    }
    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('[api/contents] error', e);
    const errBody: any = { error: e?.message || 'unknown error' }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (debug) {
      errBody.stack = e?.stack;
      errBody.env = { DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL };
    }
    return new NextResponse(JSON.stringify(errBody), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
