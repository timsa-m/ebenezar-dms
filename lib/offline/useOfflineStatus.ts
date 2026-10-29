'use client';

/**
 * lib/offline/useOfflineStatus.ts
 *
 * React hook that exposes real-time offline state to any component.
 *
 * Returns:
 *   isOnline        — true when navigator.onLine is true
 *   pendingCount    — number of unsynced outbox entries
 *   isSyncing       — true while flushOutbox() is in flight
 *   lastSyncResult  — result of the most recent flush (for toast/banner)
 *   triggerSync     — manually trigger a flush (e.g. from a Retry button)
 *
 * Reactivity:
 *   - Listens to browser 'online' / 'offline' events.
 *   - When 'online' fires, automatically calls flushOutbox() and refreshes count.
 *   - Polls pendingCount every 10 s as a safety net (handles SW-triggered syncs).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushOutbox, getPendingCount } from './sync';

export interface OfflineSyncResult {
  synced: number;
  failed: number;
  skipped: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: OfflineSyncResult | null;
  triggerSync: () => Promise<void>;
}

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<OfflineSyncResult | null>(null);

  // Ref so the flush callback can always read the latest value
  const isSyncingRef = useRef(false);

  // ── Refresh pending count from IndexedDB ──────────────────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not yet initialised — ignore silently
    }
  }, []);

  // ── Flush the outbox ──────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    // Prevent concurrent flushes
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await flushOutbox();
      setLastSyncResult(result);
    } catch (err) {
      console.error('[useOfflineStatus] flushOutbox error:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      // Always refresh count after a flush attempt
      await refreshCount();
    }
  }, [refreshCount]);

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Network is back — flush the outbox automatically
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count refresh on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount();

    // Poll every 10 s so the badge stays accurate even if the SW synced
    // entries without the tab being the active trigger.
    const pollTimer = setInterval(refreshCount, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollTimer);
    };
  }, [triggerSync, refreshCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    triggerSync,
  };
}

