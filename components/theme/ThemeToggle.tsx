'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateUserThemePreference } from '@/lib/actions/user.actions';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("size-8 rounded-lg bg-slate-100 dark:bg-[#1D2920] animate-pulse", className)} />
    );
  }

  const cycleTheme = () => {
    let next: 'light' | 'dark' | 'system' = 'dark';
    if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'system';
    else next = 'light';

    setTheme(next);
    updateUserThemePreference(next).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${theme || 'system'} (Click to cycle Light / Dark / System)`}
      aria-label="Toggle interface theme"
      className={cn(
        "flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#29352D]",
        "bg-white dark:bg-[#151D17] text-slate-700 dark:text-[#B7FF3C]",
        "hover:bg-slate-100 dark:hover:bg-[#1D2920] hover:scale-105 active:scale-95",
        "transition-all duration-150 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
    >
      {theme === 'system' ? (
        <Monitor className="size-4 text-slate-500 dark:text-[#A1ADA4]" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="size-4 text-[#B7FF3C]" />
      ) : (
        <Sun className="size-4 text-amber-500" />
      )}
    </button>
  );
}

