'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Global Scroll Restoration for Next.js App Router
 * 
 * Accurately remembers and restores scroll positions on browser Back and Forward
 * navigation for both custom layout scroll containers (<main id="main-scroll-canvas">)
 * and window-level scroll, even with asynchronous data fetching and dynamic tables.
 */
function ScrollRestorerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;

  const isPopNavRef = useRef(false);
  const activeRestoreTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyRef = useRef(currentKey);

  // Helper to locate active scroll container
  const getScrollElement = (): HTMLElement | Window => {
    if (typeof document === 'undefined') return window;
    const mainCanvas = document.getElementById('main-scroll-canvas');
    if (mainCanvas) return mainCanvas;

    const mainOverflow = document.querySelector('main.overflow-y-auto') as HTMLElement | null;
    if (mainOverflow) return mainOverflow;

    const tagged = document.querySelector('[data-scroll-container="true"]') as HTMLElement | null;
    if (tagged) return tagged;

    return window;
  };

  const getScrollPos = (el: HTMLElement | Window): number => {
    if (el === window) {
      return window.scrollY || document.documentElement?.scrollTop || 0;
    }
    return (el as HTMLElement).scrollTop || 0;
  };

  const setScrollPos = (el: HTMLElement | Window, top: number) => {
    if (el === window) {
      window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      (el as HTMLElement).scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  // 1. Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      isPopNavRef.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 2. Continuously track scroll position on the active container
  useEffect(() => {
    let animFrame: number;

    const onScroll = () => {
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        const el = getScrollElement();
        const y = getScrollPos(el);
        if (typeof window !== 'undefined' && currentKey) {
          try {
            sessionStorage.setItem(`dms_scroll_${currentKey}`, String(Math.round(y)));
          } catch {
            // Ignore sessionStorage quota errors
          }
        }
      });
    };

    const container = getScrollElement();
    const eventTarget = container === window ? window : container;

    eventTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animFrame);
      eventTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [currentKey]);

  // 3. Save scroll position on link clicks before leaving page
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a, button[data-navigate]');
      if (target) {
        const el = getScrollElement();
        const y = getScrollPos(el);
        if (currentKey) {
          try {
            sessionStorage.setItem(`dms_scroll_${currentKey}`, String(Math.round(y)));
          } catch {
            // Ignore
          }
        }
      }
    };

    document.addEventListener('click', handleClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [currentKey]);

  // 4. Handle route changes: Restore on POP (Back/Forward), Reset to top on Push
  useEffect(() => {
    if (activeRestoreTimerRef.current) {
      clearInterval(activeRestoreTimerRef.current);
      activeRestoreTimerRef.current = null;
    }

    const isBackNav = isPopNavRef.current;
    isPopNavRef.current = false;
    lastKeyRef.current = currentKey;

    if (isBackNav) {
      // Restore previous scroll position
      let targetY = 0;
      try {
        const saved = sessionStorage.getItem(`dms_scroll_${currentKey}`);
        if (saved) targetY = Number(saved);
      } catch {
        targetY = 0;
      }

      if (targetY > 0) {
        let attempts = 0;
        const maxAttempts = 35; // ~1.4 seconds max polling for dynamic content/tables

        const cancelRestoreOnUserAction = () => {
          if (activeRestoreTimerRef.current) {
            clearInterval(activeRestoreTimerRef.current);
            activeRestoreTimerRef.current = null;
          }
          window.removeEventListener('wheel', cancelRestoreOnUserAction);
          window.removeEventListener('touchstart', cancelRestoreOnUserAction);
          window.removeEventListener('keydown', cancelRestoreOnUserAction);
        };

        window.addEventListener('wheel', cancelRestoreOnUserAction, { passive: true });
        window.addEventListener('touchstart', cancelRestoreOnUserAction, { passive: true });
        window.addEventListener('keydown', cancelRestoreOnUserAction, { passive: true });

        activeRestoreTimerRef.current = setInterval(() => {
          attempts++;
          const el = getScrollElement();
          const maxScroll = el === window
            ? (document.documentElement.scrollHeight - window.innerHeight)
            : ((el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight);

          // Apply restoration as soon as content is tall enough or max attempts reached
          setScrollPos(el, targetY);

          const currentY = getScrollPos(el);
          if (Math.abs(currentY - targetY) <= 4 || maxScroll >= targetY || attempts >= maxAttempts) {
            if (attempts >= 4 || Math.abs(currentY - targetY) <= 4) {
              cancelRestoreOnUserAction();
            }
          }
        }, 40);
      }
    } else {
      // Normal forward navigation to a new page: scroll to top
      const el = getScrollElement();
      setScrollPos(el, 0);
    }

    return () => {
      if (activeRestoreTimerRef.current) {
        clearInterval(activeRestoreTimerRef.current);
      }
    };
  }, [currentKey]);

  return null;
}

export default function ScrollRestorer() {
  return (
    <Suspense fallback={null}>
      <ScrollRestorerInner />
    </Suspense>
  );
}
