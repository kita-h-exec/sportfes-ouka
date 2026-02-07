import { NextRequest, NextResponse } from 'next/server';

// Google Apps Script WebApp エンドポイント（doPost）
// 直接ブラウザから叩くと CORS で弾かれるためサーバープロキシ
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwkXw0wM1QiDBis0MlhczaRXe1j_xtFqQty9ogmnuSsjxsciZ-AhfFM9RqtSs9nzTxW/exec';

export const runtime = 'nodejs';
export const revalidate = 0; // no cache

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const { studentId } = await req.json();
    if (typeof studentId !== 'string' || !/^\d{4}$/.test(studentId)) {
      return NextResponse.json({ status: 'error', message: 'studentId must be 4 digit string' }, { status: 400 });
    }

    const upstream = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Apps Script 側は JSON.parse(e.postData.contents) で読む
      body: JSON.stringify({ studentId }),
      // 10 秒程度でタイムアウト（AbortSignal.timeout は Node18+）
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(10000) : undefined,
    });

    const text = await upstream.text();
    let json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    try { json = JSON.parse(text); } catch {
      return NextResponse.json({ status: 'error', message: 'Invalid JSON from GAS', raw: text }, { status: 502 });
    }

    return NextResponse.json({ ...json, _proxy: true, _ms: Date.now() - started }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = e?.name === 'TimeoutError' ? 'Upstream timeout' : (e?.message || 'unknown error');
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}

// Preflight (万一ブラウザが /api/competitions に直接 OPTIONS 投げた場合)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
