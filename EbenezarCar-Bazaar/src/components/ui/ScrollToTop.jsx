import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [isVisible, setIsVisible] = useState(false);
  const activeRestoreTimerRef = useRef(null);
  const currentKey = `${location.pathname}${location.search}`;

  // Continuously record scroll position for current route
  useEffect(() => {
    let animFrame;
    const onScroll = () => {
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        if (typeof window !== "undefined") {
          const y = window.scrollY || document.documentElement?.scrollTop || 0;
          try {
            sessionStorage.setItem(`web_scroll_${currentKey}`, String(Math.round(y)));
          } catch {
            // Ignore
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [currentKey]);

  // Handle route change: Restore on POP (Back/Forward), Reset to top on Push
  useEffect(() => {
    if (activeRestoreTimerRef.current) {
      clearInterval(activeRestoreTimerRef.current);
      activeRestoreTimerRef.current = null;
    }

    if (navigationType === "POP") {
      let targetY = 0;
      try {
        const saved = sessionStorage.getItem(`web_scroll_${currentKey}`);
        if (saved) targetY = Number(saved);
      } catch {
        targetY = 0;
      }

      if (targetY > 0) {
        let attempts = 0;
        const maxAttempts = 35; // ~1.4 seconds max polling for async data

        const cancelRestore = () => {
          if (activeRestoreTimerRef.current) {
            clearInterval(activeRestoreTimerRef.current);
            activeRestoreTimerRef.current = null;
          }
          window.removeEventListener("wheel", cancelRestore);
          window.removeEventListener("touchstart", cancelRestore);
          window.removeEventListener("keydown", cancelRestore);
        };

        window.addEventListener("wheel", cancelRestore, { passive: true });
        window.addEventListener("touchstart", cancelRestore, { passive: true });
        window.addEventListener("keydown", cancelRestore, { passive: true });

        activeRestoreTimerRef.current = setInterval(() => {
          attempts++;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({
            top: targetY,
            left: 0,
            behavior: "instant",
          });

          const currentY = window.scrollY || document.documentElement.scrollTop || 0;
          if (Math.abs(currentY - targetY) <= 4 || maxScroll >= targetY || attempts >= maxAttempts) {
            if (attempts >= 4 || Math.abs(currentY - targetY) <= 4) {
              cancelRestore();
            }
          }
        }, 35);
      }
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }

    return () => {
      if (activeRestoreTimerRef.current) {
        clearInterval(activeRestoreTimerRef.current);
      }
    };
  }, [location.pathname, location.search, navigationType, currentKey]);

  // Track scroll position
  const checkScroll = useCallback(() => {
    let scrolled = 0;
    if (typeof window !== "undefined") {
      scrolled = Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
    }
    setIsVisible(scrolled > 280);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Scroll back to top"
          title="Scroll back to top"
          className="fixed bottom-6 right-6 z-40 size-12 sm:size-13 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:translate-y-0.5 active:scale-95 animate-in fade-in zoom-in-90 focus:outline-hidden focus:ring-4 focus:ring-blue-400/30 cursor-pointer group select-none backdrop-blur-xl bg-white/40 border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.08),0_4px_12px_rgba(37,99,235,0.15),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(37,99,235,0.12)] hover:bg-white/55 hover:shadow-[0_16px_40px_rgba(37,99,235,0.28),0_6px_16px_rgba(0,0,0,0.08),inset_0_2px_6px_rgba(255,255,255,1),inset_0_-4px_10px_rgba(37,99,235,0.22)] overflow-hidden"
        >
          {/* Liquid Glare / Convex Specular Highlight (Meniscus) */}
          <span className="absolute top-1 inset-x-2 h-[45%] rounded-t-full bg-gradient-to-b from-white/70 via-white/30 to-transparent pointer-events-none" />

          {/* Fluid Caustic Refraction Glow in the base */}
          <span className="absolute -bottom-2 inset-x-1 h-5 rounded-full bg-gradient-to-t from-blue-500/25 to-transparent blur-xs pointer-events-none transition-opacity duration-300 group-hover:from-blue-500/40" />

          {/* Floating Arrow Icon */}
          <ArrowUp className="size-5 stroke-[2.5] text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:-translate-y-0.5 relative z-10 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]" />
        </button>
      )}
    </>
  );
}
