import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.NOTIFY_LOG_DIR || path.join(process.cwd(), 'data', 'push_logs');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function todayFile(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `notify-${yyyy}-${mm}-${dd}.log`);
}

function serializeLine(payload: Record<string, unknown>): string {
  const line = { ts: new Date().toISOString(), ...payload };
  try {
    return JSON.stringify(line) + '\n';
  } catch {
    // 最悪でもtoStringで出す
    return String(line) + '\n';
  }
}

export type NotifyLogKind =
  | 'send:start'
  | 'send:success'
  | 'send:failure'
  | 'send:summary';

export interface NotifyLogPayload {
  kind: NotifyLogKind;
  // 任意のメタ情報
  [key: string]: unknown;
}

export async function logNotify(payload: NotifyLogPayload): Promise<void> {
  try {
    ensureDir(LOG_DIR);
    const file = todayFile();
    const line = serializeLine(payload);
    await fs.promises.appendFile(file, line, 'utf-8');
  } catch {
    // ログ失敗は本処理に影響させない
  }
}

export default {
  logNotify,
};
