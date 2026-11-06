'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Persists a state value in sessionStorage so that navigating away
 * and pressing "Back" (or returning to the page in the same session)
 * restores the exact state (e.g. search queries, tabs, filters).
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (val: T | ((prev: T) => T)) => void, () => void] {
  // Always initialize with defaultValue on first render to match SSR and prevent hydration mismatches
  const [state, setStateInternal] = useState<T>(defaultValue);
  const isHydrated = useRef(false);

  // Sync from sessionStorage on mount (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.sessionStorage.getItem(`dms_state_${key}`);
      if (item !== null) {
        setStateInternal(JSON.parse(item) as T);
      }
    } catch {
      // Ignore parse errors and keep defaultValue
    }
    isHydrated.current = true;
  }, [key]);

  // Sync to sessionStorage on state changes (only after hydration)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isHydrated.current) return;
    try {
      window.sessionStorage.setItem(`dms_state_${key}`, JSON.stringify(state));
    } catch {
      // Ignore quota or private browsing errors
    }
  }, [key, state]);

  // Reset helper
  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(`dms_state_${key}`);
      } catch {
        // Ignore
      }
    }
    setStateInternal(defaultValue);
  }, [key, defaultValue]);

  return [state, setStateInternal, reset];
}
