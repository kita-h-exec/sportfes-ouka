import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/pushStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subStr = JSON.stringify(body);
    if (subStr.length < 50) {
      return NextResponse.json({ ok: false, error: 'invalid subscription' }, { status: 400 });
    }
  await saveSubscription(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// no-op
