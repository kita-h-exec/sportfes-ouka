import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/pushStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subStr = JSON.stringify(body);
    if (subStr.length < 50) {
      return NextResponse.json({ ok: false, error: 'invalid subscription' }, { status: 400 });
    }
  const saved = await saveSubscription(body);
  return NextResponse.json({ ok: saved.ok, backend: saved.backend, duplicate: saved.duplicate });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
