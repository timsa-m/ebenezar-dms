'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SafeChartWrapperProps {
  children: React.ReactNode;
  height?: number | string;
  className?: string;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SafeChartWrapper] Recharts caught transient error:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full w-full items-center justify-center p-4 text-xs text-muted-foreground">
            Chart preview unavailable
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default function SafeChartWrapper({
  children,
  height = 300,
  className = '',
  fallback,
}: SafeChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        setIsReady(true);
      }
    };

    checkSize();

    if (typeof window !== 'undefined' && 'ResizeObserver' in window && containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setIsReady(true);
          }
        }
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    } else {
      const timer = setTimeout(checkSize, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 ${className}`}
      style={{ height: heightStyle, minHeight: heightStyle }}
    >
      <ChartErrorBoundary fallback={fallback}>
        {isReady ? (
          children
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-50/50 dark:bg-white/5 animate-pulse">
            <div className="size-6 rounded-full border-2 border-primary/30 border-t-transparent animate-spin" />
          </div>
        )}
      </ChartErrorBoundary>
    </div>
  );
}

