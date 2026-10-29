'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, ArrowLeft, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UnsavedChangesModalProps {
  /** Whether the unsaved changes modal is currently visible */
  isOpen: boolean;
  /** Invoked when user wants to keep editing and cancel dismissal */
  onClose: () => void;
  /** Invoked when user confirms discarding unsaved modifications */
  onConfirm: () => void;
  /** Optional handler to save draft and proceed with the intended action */
  onSaveAndExit?: () => void | Promise<void>;
  /** Title of modal dialog. Defaults to 'Unsaved Changes' */
  title?: string;
  /** Detailed description of what is at risk */
  description?: string;
  /** Optional vehicle / record identifier tag (e.g., 'KDA 123X') */
  itemName?: string;
  /** Confirm action button label */
  confirmLabel?: string;
  /** Cancel action button label */
  cancelLabel?: string;
  /** Save & Exit button label */
  saveLabel?: string;
  /** Loading indicator during save operations */
  isSaving?: boolean;
}

/**
 * UnsavedChangesModal
 *
 * A modern, accessible, clean confirmation dialog that catches attempts to navigate
 * away, close, or switch tabs while form state contains unsaved modifications.
 * Replaces native browser window.confirm popups with a polished UI matching Ebenezar styling.
 */
export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onConfirm,
  onSaveAndExit,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes in this form. Leaving without saving will permanently discard all recent modifications.',
  itemName,
  confirmLabel = 'Discard & Leave',
  cancelLabel = 'Keep Editing',
  saveLabel = 'Save Draft & Exit',
  isSaving = false,
}: UnsavedChangesModalProps) {
  const [mounted, setMounted] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation: Escape key dismisses prompt (keeps editing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault();
        onClose();
      }

      // Basic Tab focus trap
      if (e.key === 'Tab' && modalPanelRef.current) {
        const focusable = modalPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  // Focus 'Keep Editing' by default to safeguard against accidental Enter-key presses
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
      aria-describedby="unsaved-modal-description"
      className="fixed inset-0 z-[10100] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop with modern glassmorphism blur */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalPanelRef}
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white',
          'shadow-[0_25px_70px_-15px_rgba(0,0,0,0.38)]',
          'animate-in fade-in zoom-in-95 duration-150'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        {/* Close Button ('X') - acts as Keep Editing */}
        {!isSaving && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4.5 z-10 flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 cursor-pointer"
            aria-label="Keep editing"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        )}

        <div className="p-6">
          {/* Header with Warning Icon Badge */}
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600 ring-4 ring-amber-500/10 shadow-xs">
              <AlertTriangle className="size-5.5 text-amber-600" strokeWidth={2} />
            </div>

            <div className="space-y-1 pt-0.5 min-w-0 pr-6">
              <h2
                id="unsaved-modal-title"
                className="text-base font-bold tracking-tight text-slate-900"
              >
                {title}
              </h2>
              {itemName && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700">
                  <span>{itemName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description & Callout */}
          <div className="mt-4 space-y-3">
            <p
              id="unsaved-modal-description"
              className="text-xs sm:text-sm leading-relaxed text-slate-600"
            >
              {description}
            </p>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-900">
              <span className="font-semibold block mb-0.5 text-amber-950">
                ⚠️ Form changes not yet committed:
              </span>
              Any modified equipment checks, condition notes, or handover records will be discarded if you proceed without saving.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={cn(
              'inline-flex h-9.5 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl',
              'border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700',
              'shadow-xs transition hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            )}
          >
            <ArrowLeft className="size-3.5" />
            <span>{cancelLabel}</span>
          </button>

          {onSaveAndExit && (
            <button
              type="button"
              onClick={onSaveAndExit}
              disabled={isSaving}
              className={cn(
                'inline-flex h-9.5 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl',
                'bg-blue-600 px-4 text-xs font-semibold text-white',
                'shadow-xs shadow-blue-600/20 transition hover:bg-blue-700 active:bg-blue-800',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>{saveLabel}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={cn(
              'inline-flex h-9.5 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl',
              'bg-red-600 px-4 text-xs font-semibold text-white',
              'shadow-xs shadow-red-600/20 transition hover:bg-red-700 active:bg-red-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer'
            )}
          >
            <Trash2 className="size-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
