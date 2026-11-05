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
  const isFirstMount = useRef(true);

  // Initialize from sessionStorage if available
  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.sessionStorage.getItem(`dms_state_${key}`);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch {
      // Ignore parse errors and fallback to defaultValue
    }
    return defaultValue;
  });

  // Sync to sessionStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
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
