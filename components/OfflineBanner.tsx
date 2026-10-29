'use client';

/**
 * components/OfflineBanner.tsx
 *
 * A slim, non-intrusive status banner that sits at the top of every
 * authenticated page (mounted in app/(root)/layout.tsx).
 *
 * States:
 *   offline   → red bar: "You are offline — changes will sync automatically"
 *   syncing   → blue bar: "Syncing N pending item(s)…"
 *   success   → green bar: "All data synced ✓" — auto-dismisses after 3 s
 *   failed    → amber bar: "N action(s) failed to sync — Retry button"
 *   idle      → nothing rendered (no DOM node at all)
 *
 * This component is the Safari/iOS fallback for Background Sync:
 * useOfflineStatus() listens to window 'online' and calls flushOutbox()
 * automatically, making the banner the single source of truth for status.
 */

import { useEffect, useState } from 'react';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

type BannerState = 'offline' | 'syncing' | 'success' | 'failed' | 'idle';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, lastSyncResult, triggerSync } =
    useOfflineStatus();

  const [bannerState, setBannerState] = useState<BannerState>('idle');
  const [dismissTimer, setDismissTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ── Derive banner state from hook values ────────────────────────────────
  useEffect(() => {
    // Clear any pending auto-dismiss
    if (dismissTimer) clearTimeout(dismissTimer);

    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBannerState('offline');
      return;
    }

    if (isSyncing) {
      setBannerState('syncing');
      return;
    }

    if (lastSyncResult) {
      if (lastSyncResult.failed > 0) {
        setBannerState('failed');
        return;
      }
      if (lastSyncResult.synced > 0) {
        setBannerState('success');
        // Auto-dismiss after 3 seconds
        const t = setTimeout(() => {
          setBannerState('idle');
          setDismissTimer(null);
        }, 3000);
        setDismissTimer(t);
        return;
      }
    }

    // Back online with nothing pending and no recent sync — hide
    setBannerState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSyncing, lastSyncResult]);

  // ── Cleanup timer on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [dismissTimer]);

  // ── Render nothing when idle ─────────────────────────────────────────────
  if (bannerState === 'idle') return null;

  // ── Banner config per state ──────────────────────────────────────────────
  const config: Record<
    Exclude<BannerState, 'idle'>,
    {
      bg: string;
      border: string;
      text: string;
      icon: React.ReactNode;
      message: string;
      action?: React.ReactNode;
    }
  > = {
    offline: {
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      icon: <WifiOff size={14} />,
      message:
        pendingCount > 0
          ? `You are offline — ${pendingCount} action${pendingCount !== 1 ? 's' : ''} will sync when you reconnect`
          : 'You are offline — data shown may be from cache',
    },
    syncing: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      icon: <RefreshCw size={14} className="animate-spin" />,
      message: `Syncing${pendingCount > 0 ? ` ${pendingCount} pending item${pendingCount !== 1 ? 's' : ''}` : ''}…`,
    },
    success: {
      bg: '#F0FDF4',
      border: '#BBF7D0',
      text: '#15803D',
      icon: <CheckCircle size={14} />,
      message: `${lastSyncResult?.synced ?? 0} action${(lastSyncResult?.synced ?? 0) !== 1 ? 's' : ''} synced successfully`,
    },
    failed: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      icon: <AlertTriangle size={14} />,
      message: `${lastSyncResult?.failed ?? 0} action${(lastSyncResult?.failed ?? 0) !== 1 ? 's' : ''} failed to sync`,
      action: (
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          style={{
            marginLeft: '0.75rem',
            padding: '0.125rem 0.625rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            border: '1px solid #FCD34D',
            background: 'transparent',
            color: '#92400E',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      ),
    },
  };

  const c = config[bannerState];

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '0.875rem',
          right: '1rem',
          zIndex: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.3rem 0.75rem 0.3rem 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          borderRadius: '999px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          animation: 'pillFadeIn 0.2s ease-out',
          pointerEvents: bannerState === 'failed' ? 'auto' : 'none',
        }}
      >
        {c.icon}
        <span>{c.message}</span>
        {c.action}
      </div>
    </>
  );
}

