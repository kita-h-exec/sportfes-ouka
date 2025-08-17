import { NextResponse } from 'next/server';

export async function GET() {
  const pub = process.env.WEB_PUSH_PUBLIC_KEY || '';
  return NextResponse.json({ publicKey: pub });
}
