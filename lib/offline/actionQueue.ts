/**
 * lib/offline/actionQueue.ts
 *
 * Wrapper to seamlessly execute Server Actions when online,
 * or queue them to IndexedDB when offline.
 */

import { queueAction } from './sync';
import type { OutboxActionType, OutboxPayload } from './db';

/**
 * Attempts to execute a Server Action. If the network is unavailable
 * (or the action throws a network/fetch error), the payload is queued
 * into IndexedDB for background sync.
 *
 * @param actionFn The Server Action to call if online
 * @param actionType The identifier for the action (e.g. 'CREATE_PENALTY')
 * @param payload The serialisable payload to pass to the action (and save if offline)
 * @returns { status: 'executed' | 'queued', result?: any }
 */
export async function executeOrQueue<T>(
  actionFn: (payload: any) => Promise<T>,
  actionType: OutboxActionType,
  payload: OutboxPayload
): Promise<{ status: 'executed' | 'queued'; result?: T }> {
  // If we know we are offline before even trying, queue immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueAction(actionType, payload);
    return { status: 'queued' };
  }

  try {
    // Attempt the actual server action
    const result = await actionFn(payload);
    return { status: 'executed', result };
  } catch (err: any) {
    // If it's a network error, queue it. Otherwise, rethrow (e.g. validation error)
    const isNetworkError =
      err?.cause?.code === 'ETIMEDOUT' ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('NetworkError') ||
      err?.message?.includes('Failed to fetch');

    if (isNetworkError) {
      await queueAction(actionType, payload);
      return { status: 'queued' };
    }

    throw err;
  }
}

