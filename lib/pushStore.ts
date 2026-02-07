// Minimal in-memory + optional Directus storage (earlier simpler implementation)
import directus from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';
import fs from 'fs';
import path from 'path';

const STORE_MODE = process.env.PUSH_STORE || 'memory'; // 'memory' | 'directus' | 'file'
const USE_DIRECTUS = STORE_MODE === 'directus';
const USE_FILE = STORE_MODE === 'file';
const DEBUG_LOG = process.env.DEBUG_PUSH_STORE_LOG === '1';
const mem = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

// --- File store helpers (very small implementation) ---
let FILE_PATH = process.env.PUSH_FILE_PATH || path.join(process.cwd(), 'data', 'push_subscriptions.json');
let fileLoaded = false;
let dirty = false;
let flushTimer: NodeJS.Timeout | null = null;

function ensureDir() {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {/* ignore */}
  }
}

function loadFileOnce() {
  if (!USE_FILE || fileLoaded) return;
  fileLoaded = true;
  try {
    ensureDir();
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const s of arr) {
          const ep = (s as any)?.endpoint; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (ep) mem.set(ep, (s as any).payload || s); // store payload field or whole object
        }
        if (DEBUG_LOG) console.log('[pushStore:file] loaded', arr.length);
      }
    }
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (DEBUG_LOG) console.warn('[pushStore:file] load failed', e?.message || e);
  }
}

function scheduleFlush() {
  if (!USE_FILE) return;
  if (flushTimer) clearTimeout(flushTimer);
  dirty = true;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushNow();
  }, 500); // debounce 0.5s
}

function flushNow() {
  if (!USE_FILE || !dirty) return;
  dirty = false;
  try {
    ensureDir();
    const arr = Array.from(mem.values()).map(v => ({ endpoint: (v as any)?.endpoint || (v as any)?.endpoint, payload: v })); // eslint-disable-line @typescript-eslint/no-explicit-any
    fs.writeFileSync(FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    if (DEBUG_LOG) console.log('[pushStore:file] flushed', arr.length);
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (DEBUG_LOG) console.warn('[pushStore:file] flush failed', e?.message || e);
  }
}

loadFileOnce();

export interface SaveResult { ok: boolean; backend: 'directus' | 'memory' | 'file'; duplicate?: boolean; error?: string; }

export async function save(sub: any, ua?: string): Promise<SaveResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ep = sub?.endpoint;
  if (!ep) return { ok: false, backend: backendKind(), error: 'missing endpoint' };
  if (USE_DIRECTUS && directus) {
    try {
      await directus.request(
        (createItem as any)('push_subscriptions', { // eslint-disable-line @typescript-eslint/no-explicit-any
          endpoint: ep,
          payload: sub,
          ua,
        } as any)
      );
      if (DEBUG_LOG) console.log('[pushStore] directus create ok', ep);
      return { ok: true, backend: 'directus' };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = String(e?.message || e);
      // 重複 (unique violation) の可能性 → 既に存在するなら成功扱い
      if (/unique|exists|duplicate/i.test(msg)) {
        if (DEBUG_LOG) console.log('[pushStore] duplicate endpoint (treat as ok)', ep);
        return { ok: true, backend: 'directus', duplicate: true };
      }
      if (DEBUG_LOG) console.warn('[pushStore] directus create failed, fallback to memory', msg);
      // fallback memory
    }
  }
  mem.set(ep, sub);
  if (USE_FILE) scheduleFlush();
  return { ok: true, backend: backendKind() };
}

export async function list(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (USE_DIRECTUS && directus) {
    try {
      const rows = await directus.request(
        (readItems as any)('push_subscriptions', { fields: ['payload'], limit: 5000 }) // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      return (rows as any[]).map(r => (r as any).payload); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (DEBUG_LOG) console.warn('[pushStore] list directus failed fallback memory', e?.message || e);
    }
  }
  // Fallback: file store でメモリが空なら再読込試行 (開発再起動直後など)
  if (USE_FILE && mem.size === 0) {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const s of arr) {
            const ep = (s as any)?.endpoint; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (ep && !mem.has(ep)) mem.set(ep, (s as any).payload || s);
          }
          if (DEBUG_LOG) console.log('[pushStore:file] lazy reload added', mem.size);
        }
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (DEBUG_LOG) console.warn('[pushStore:file] lazy reload failed', e?.message || e);
    }
  }
  return Array.from(mem.values());
}

export async function remove(endpoint: string) {
  if (!endpoint) return;
  mem.delete(endpoint);
  // 直接 Directus 削除は簡略化 (多数失敗時の定期バッチで実施想定)
}

export function backendKind() { return USE_DIRECTUS ? 'directus' : (USE_FILE ? 'file' : 'memory'); }

// Compatibility aliases (legacy names)
export const saveSubscription = save as unknown as (sub: any, ua?: string) => Promise<SaveResult>; // eslint-disable-line @typescript-eslint/no-explicit-any
export const listSubscriptions = list;
export const removeSubscription = remove;

