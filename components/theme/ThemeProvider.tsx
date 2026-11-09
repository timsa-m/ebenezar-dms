'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

function ThemeClassSync() {
  const { theme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const root = document.documentElement;
    const current = theme || resolvedTheme;
    if (current === 'graphite') {
      root.classList.add('dark');
      root.classList.add('graphite');
    } else if (current === 'dark') {
      root.classList.add('dark');
      root.classList.remove('graphite');
    } else if (current === 'light') {
      root.classList.remove('dark');
      root.classList.remove('graphite');
    }
  }, [theme, resolvedTheme]);

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
      value={{
        light: 'light',
        dark: 'dark',
        graphite: 'graphite',
      }}
    >
      <ThemeClassSync />
      {children}
    </NextThemesProvider>
  );
}
