import fs from 'fs';
import path from 'path';

export type CurrentOverride = {
  enabled: boolean;
  item: {
    id?: string | number;
    event: string;
    description?: string;
    start_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean;
  } | null;
};

export type ManualOrder = {
  updatedAt: string; // ISO
  order: Array<string | number>; // schedule id の配列
};

const DATA_DIR = path.join(process.cwd(), 'data');
const OVERRIDE_PATH = path.join(DATA_DIR, 'current_schedule_override.json');
const ORDER_PATH = path.join(DATA_DIR, 'schedule_manual_order.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {/* ignore */}
  }
}

export function readOverride(): CurrentOverride {
  try {
    if (fs.existsSync(OVERRIDE_PATH)) {
      const raw = fs.readFileSync(OVERRIDE_PATH, 'utf-8');
      const json = JSON.parse(raw);
      return {
        enabled: Boolean(json.enabled),
        item: json.item || null,
      } as CurrentOverride;
    }
  } catch {/* ignore */}
  return { enabled: false, item: null };
}

export function writeOverride(data: CurrentOverride) {
  ensureDir();
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function readManualOrder(): ManualOrder {
  try {
    if (fs.existsSync(ORDER_PATH)) {
      const raw = fs.readFileSync(ORDER_PATH, 'utf-8');
      const json = JSON.parse(raw);
      if (Array.isArray(json.order)) return json as ManualOrder;
    }
  } catch {/* ignore */}
  return { updatedAt: new Date().toISOString(), order: [] };
}

export function writeManualOrder(order: Array<string | number>) {
  ensureDir();
  const data: ManualOrder = { updatedAt: new Date().toISOString(), order: order.slice(0, 1000) };
  fs.writeFileSync(ORDER_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
