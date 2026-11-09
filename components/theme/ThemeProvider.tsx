'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

function ThemeClassSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'graphite') {
      root.classList.add('dark');
      root.classList.add('graphite');
    } else {
      root.classList.remove('graphite');
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ebenezar_theme',
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={storageKey}
      themes={['light', 'dark', 'graphite']}
    >
      <ThemeClassSync />
      {children}
    </NextThemesProvider>
  );
}


