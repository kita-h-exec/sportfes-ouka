import directus from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';

// Optional: store in Directus collection `push_subscriptions`
// Fields example:
// - endpoint: string, unique
// - payload: json
const USE_DIRECTUS = process.env.PUSH_STORE === 'directus';

const mem = new Map<string, any>();

export async function saveSubscription(sub: any) {
  const key = sub?.endpoint as string;
  if (!key) return;

  if (USE_DIRECTUS) {
    try {
      await directus.request(
        createItem('push_subscriptions', {
          endpoint: key,
          payload: sub,
        } as any)
      );
      return;
    } catch (_e) {
      // Duplicates or errors fall back to memory for now
    }
  }
  mem.set(key, sub);
}

export async function listSubscriptions(): Promise<any[]> {
  if (USE_DIRECTUS) {
    try {
      const rows = (await directus.request(
        readItems('push_subscriptions', { fields: ['payload'] as any, limit: 5000 })
      )) as any[];
      return rows.map((r) => r.payload);
    } catch (_e) {
      // fall back
    }
  }
  return Array.from(mem.values());
}
