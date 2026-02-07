import { NextResponse } from 'next/server';
import { getHeaderAnnouncement } from '@/lib/directus';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const ann = await getHeaderAnnouncement();
  if (!ann) return NextResponse.json({ ok: true, data: null }, { status: 200 });
  return NextResponse.json({ ok: true, data: { title: (ann as any).title } }); // eslint-disable-line @typescript-eslint/no-explicit-any
}
