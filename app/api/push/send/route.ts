import { NextRequest, NextResponse } from 'next/server';
import webpush from '@/lib/webpush';
import { listSubscriptions } from '@/lib/pushStore';
import { logNotify } from '@/lib/notifyLogger';

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  const provided = req.headers.get('x-notify-secret') || '';
  if (!secret || provided !== secret) {
    await logNotify({ kind: 'send:failure', reason: 'unauthorized' });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) {
    await logNotify({ kind: 'send:failure', reason: 'missing vapid keys' });
    return NextResponse.json({ ok: false, error: 'missing vapid keys' }, { status: 500 });
  }

  const payload = await req.json();
  if (!payload || (!payload.title && !payload.body)) {
    await logNotify({ kind: 'send:failure', reason: 'invalid payload' });
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  const subs = await listSubscriptions();
  let sent = 0;
  let failed = 0;

  await logNotify({
    kind: 'send:start',
    count: subs.length,
    title: payload?.title,
    bodyLen: typeof payload?.body === 'string' ? payload.body.length : undefined,
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        sent += 1;
        await logNotify({ kind: 'send:success', endpoint: sub?.endpoint });
      } catch (e) {
        failed += 1;
        const msg = (e as any)?.message || String(e); // eslint-disable-line @typescript-eslint/no-explicit-any
        await logNotify({ kind: 'send:failure', endpoint: sub?.endpoint, error: msg });
      }
    })
  );

  await logNotify({ kind: 'send:summary', total: subs.length, sent, failed });

  return NextResponse.json({ ok: true, sent, failed, total: subs.length });
}
