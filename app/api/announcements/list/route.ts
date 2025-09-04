import { NextResponse } from 'next/server';
import { getAnnouncements } from '@/lib/directus';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const published = await getAnnouncements('published');
  return NextResponse.json({ ok: true, data: published });
}
