'use client';

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CustomModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when the modal requests closure (Escape, backdrop, close button) */
  onClose: () => void;
  /** Modal title rendered in the header */
  title?: string;
  /** Slot for any React content */
  children: ReactNode;
  /** Width of the modal panel. Default: 520px */
  width?: string | number;
  /** Hide the default close (×) button */
  hideCloseButton?: boolean;
  /** Disable closing when the backdrop is clicked */
  disableBackdropClose?: boolean;
  /** Additional class applied to the modal panel */
  className?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  width = 520,
  hideCloseButton = false,
  disableBackdropClose = false,
  className = '',
}: CustomModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Keyboard: Escape to close, Tab to trap focus ──────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Basic focus-trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  // ── Focus panel on open; restore previous focus on close ─────────────────
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  // ── Prevent body scroll while open ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Rendered into <body> via Portal to sidestep z-index stacking ─────────
  return createPortal(
    <div
      // Backdrop
      role="presentation"
      onClick={disableBackdropClose ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'modal-fade-in 0.15s ease',
      }}
    >
      {/* Panel — stop clicks bubbling to backdrop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'custom-modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={className}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow:
            '0 24px 64px -8px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)',
          outline: 'none',
          animation: 'modal-slide-up 0.18s ease',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        {(title || !hideCloseButton) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.125rem 1.5rem',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            {title ? (
              <h2
                id="custom-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111113',
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </h2>
            ) : (
              <span />
            )}

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  border: '1.5px solid #E5E7EB',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#6B7280',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.color = '#111113';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>

      {/* ── Keyframe animations injected once ─────────────────────────── */}
      <style suppressHydrationWarning>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
