'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  const checkScroll = useCallback(() => {
    let maxScrolled = 0;

    // Check window and documentElement scroll
    if (typeof window !== 'undefined') {
      maxScrolled = Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
    }

    // Check all potential scrollable containers (e.g. <main className="overflow-y-auto"> in app layouts)
    if (typeof document !== 'undefined') {
      const scrollContainers = document.querySelectorAll('main, [data-scroll-container]');
      scrollContainers.forEach((el) => {
        if (el.scrollTop > maxScrolled) {
          maxScrolled = el.scrollTop;
        }
      });
    }

    setIsVisible(maxScrolled > 260);
  }, []);

  useEffect(() => {
    // Listen on window and capture all inner element scrolls (e.g. <main>)
    window.addEventListener('scroll', checkScroll, { passive: true });
    document.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkScroll);
      document.removeEventListener('scroll', checkScroll, { capture: true });
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scrollToTop = () => {
    // Scroll window
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    }

    // Scroll any inner scrollable containers (e.g. <main className="overflow-y-auto">)
    if (typeof document !== 'undefined') {
      const scrollContainers = document.querySelectorAll('main, [data-scroll-container], html, body');
      scrollContainers.forEach((el) => {
        if (el.scrollTop > 0) {
          el.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth',
          });
        }
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      title="Scroll back to top"
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 size-12 sm:size-13 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:translate-y-0.5 active:scale-95 animate-in fade-in zoom-in-90 focus:outline-hidden focus:ring-4 focus:ring-blue-400/30 cursor-pointer group select-none backdrop-blur-xl bg-white/40 border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.08),0_4px_12px_rgba(37,99,235,0.15),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(37,99,235,0.12)] hover:bg-white/55 hover:shadow-[0_16px_40px_rgba(37,99,235,0.28),0_6px_16px_rgba(0,0,0,0.08),inset_0_2px_6px_rgba(255,255,255,1),inset_0_-4px_10px_rgba(37,99,235,0.22)] overflow-hidden"
    >
      {/* Liquid Glare / Convex Specular Highlight (Meniscus) */}
      <span className="absolute top-1 inset-x-2 h-[45%] rounded-t-full bg-gradient-to-b from-white/70 via-white/30 to-transparent pointer-events-none" />

      {/* Fluid Caustic Refraction Glow in the base */}
      <span className="absolute -bottom-2 inset-x-1 h-5 rounded-full bg-gradient-to-t from-blue-500/25 to-transparent blur-xs pointer-events-none transition-opacity duration-300 group-hover:from-blue-500/40" />

      {/* Floating Arrow Icon */}
      <ArrowUp className="size-5 stroke-[2.5] text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:-translate-y-0.5 relative z-10 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]" />
    </button>
  );
}
