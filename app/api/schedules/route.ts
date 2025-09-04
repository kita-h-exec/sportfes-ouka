import { NextResponse } from 'next/server';
import { getSchedules } from '@/lib/directus';

export const runtime = 'nodejs';
export const revalidate = 0; // no cache

export async function GET() {
	try {
		const started = Date.now();
		const items = await getSchedules();
		const body: any = { ok: true, items, count: items.length }; // eslint-disable-line @typescript-eslint/no-explicit-any
		if (process.env.DEBUG_DIRECTUS === '1') {
			body.timing_ms = Date.now() - started;
			body.env = { DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL, hasToken: Boolean(process.env.DIRECTUS_STATIC_TOKEN) };
		}
		return NextResponse.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } });
	} catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
		console.error('[GET /api/schedules] error', e);
		return NextResponse.json({ ok: false, error: e?.message || 'unknown error' }, { status: 500 });
	}
}

