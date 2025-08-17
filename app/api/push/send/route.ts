import { NextRequest, NextResponse } from 'next/server';
import webpush from '@/lib/webpush';
import { listSubscriptions } from '@/lib/pushStore';

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  const provided = req.headers.get('x-notify-secret') || '';
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, error: 'missing vapid keys' }, { status: 500 });
  }

  const payload = await req.json();
  if (!payload || (!payload.title && !payload.body)) {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  const subs = await listSubscriptions();
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        sent += 1;
      } catch (e) {
        // ignore failures in MVP
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
