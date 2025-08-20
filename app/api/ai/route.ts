import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Model: Gemini 2.5 Flash via Google AI Studio SDK
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.warn('[api/ai] Missing GOOGLE_API_KEY in environment');
}

// Ensure Node.js runtime so we can use fs to load PDFs from /public
export const runtime = 'nodejs';

async function loadPdf(fileRelativePath: string) {
  const pdfPath = path.join(process.cwd(), 'public', fileRelativePath);
  const data = await fs.readFile(pdfPath);
  return {
    inlineData: {
      data: data.toString('base64'),
      mimeType: 'application/pdf',
    },
  } as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, doc } = body as { question?: string; doc?: 'kyougi' | 'genten' };

    if (!question || !doc) {
      return NextResponse.json({ error: 'Missing question or doc' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY || '');
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Decide which PDF to attach
    const fileRel = doc === 'kyougi' ? 'kyougi.pdf' : 'genten.pdf';

    // Load the PDF from public and send as an attachment each time
    const pdfPart = await loadPdf(fileRel);

    const prompt = `以下のPDF資料（${fileRel}）の内容に基づいて、ユーザーの質問に日本語で簡潔かつ正確に回答してください。\n\n質問: ${question}\n\n注意:\n- 回答は資料の内容に限定してください。\n- 不確かな場合は「資料からは判断できません」と述べてください。\n- 箇条書きが適切なら使ってください。`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            pdfPart,
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    });

    const text = result.response.text();

    return NextResponse.json({ answer: text });
  } catch (err: any) {
    console.error('[api/ai] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
