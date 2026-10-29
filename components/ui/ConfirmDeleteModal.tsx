'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  itemName?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isPending = false,
  title = 'Confirm Deletion',
  description = 'This action cannot be undone and will permanently remove this record.',
  confirmLabel = 'Delete',
  itemName,
}: ConfirmDeleteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose();
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isPending, onClose]);

  // Focus Cancel button on open to prevent accidental Enter-key deletion
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => cancelBtnRef.current?.focus(), 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Prevent background scroll
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !isPending) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-[3px]" />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full max-w-[420px] overflow-hidden',
          'rounded-2xl border border-gray-200 bg-white',
          'shadow-[0_24px_80px_-20px_rgba(0,0,0,0.28)]',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Close Button — aligned to the 24px (top-5/right-5) corner rhythm */}
        {!isPending && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'absolute right-5 top-5 z-10 flex size-8 items-center justify-center',
              'rounded-lg text-gray-400 transition-colors duration-150',
              'hover:bg-gray-100 hover:text-gray-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300'
            )}
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}

        {/* Body — uniform p-6 (24px) all around */}
        <div className="p-6">
          {/* Warning Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl border border-red-100 bg-red-50">
              <AlertTriangle
                className="size-6 text-red-600"
                strokeWidth={1.8}
              />
            </div>
          </div>

          {/* Heading & Confirmation Prompt */}
          <div className="space-y-2 text-center">
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold tracking-tight text-gray-950"
            >
              {title}
            </h2>

            <div id="delete-modal-description" className="space-y-1.5 text-sm leading-6 text-gray-600">
              <p>
                Are you sure you want to delete{' '}
                {itemName ? (
                  <span
                    className="inline-block max-w-[260px] truncate align-bottom rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-900"
                    title={itemName}
                  >
                    {itemName}
                  </span>
                ) : (
                  <span className="font-medium text-gray-900">this item</span>
                )}
                ?
              </p>
              <p className="text-xs leading-5 text-gray-500">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions — matches px-6 horizontal alignment with balanced py-4 */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={cn(
              'inline-flex h-10 flex-1 items-center justify-center rounded-xl',
              'border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700',
              'shadow-sm transition-all duration-150',
              'hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl',
              'bg-red-600 px-4 text-sm font-semibold text-white',
              'shadow-sm shadow-red-600/15 transition-all duration-150',
              'hover:bg-red-700 active:bg-red-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" strokeWidth={1.8} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}