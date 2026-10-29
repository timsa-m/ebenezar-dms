/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

/**
 * worker/index.ts
 *
 * Custom Service Worker additions. @ducanh2912/next-pwa bundles this
 * automatically and injects it into the generated sw.js.
 */

import { getOfflineDB } from '../lib/offline/db';

const SYNC_TAG = 'elelyon-outbox';
const MAX_ATTEMPTS = 3;

self.addEventListener('sync' as any, (event: any) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === SYNC_TAG) {
    console.log('[SW] Background Sync triggered for:', SYNC_TAG);
    syncEvent.waitUntil(processOutbox());
  }
});

async function processOutbox() {
  const db = getOfflineDB();

  // Fetch pending or failed entries
  const pending = await db.outbox
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('id');

  if (pending.length === 0) return;

  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    if (entry.attempts >= MAX_ATTEMPTS) continue;

    // Mark in-flight
    await db.outbox.update(entry.id!, {
      status: 'syncing',
      attempts: entry.attempts + 1,
    });

    try {
      const res = await fetch('/api/sync-outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: entry.actionType,
          payload: entry.payload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await db.outbox.delete(entry.id!);
        synced++;
      } else {
        throw new Error(data.error || 'API returned false success');
      }
    } catch (err: any) {
      console.error('[SW] Sync failed for item:', entry.id, err);
      await db.outbox.update(entry.id!, {
        status: 'failed',
        lastError: err.message || String(err),
      });
      failed++;
    }
  }

  // Show a push notification if something actually synced successfully
  // so the field officer knows their offline work was saved.
  if (synced > 0) {
    await self.registration.showNotification('Ebenezar LMS', {
      body: `✅ Successfully synced ${synced} pending action${synced > 1 ? 's' : ''}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'sync-complete',
    });
  }
}

// Add push notification click handler to focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Polyfill SyncEvent type if missing from TS dom lib
interface SyncEvent extends ExtendableEvent {
  readonly lastChance: boolean;
  readonly tag: string;
}

