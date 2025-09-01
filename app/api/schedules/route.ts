import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const runtime = 'nodejs';
export const revalidate = 0; // no cache

export async function GET() {
	try {
		const items = await directus.request(
			readItems('schedules', {
				fields: ['start_time', 'end_time', 'event', 'description', 'is_all_day'],
				sort: ['start_time'],
				limit: -1,
			})
		);
		return NextResponse.json({ ok: true, items }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
	} catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
		console.error('[GET /api/schedules] error', e);
		return NextResponse.json({ ok: false, error: e?.message || 'unknown error' }, { status: 500 });
	}
}

