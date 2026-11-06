'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, X, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { verifyActionCredentials } from '@/lib/security/actions';
import { SensitiveAction } from '@/lib/security/types';

export interface ResourceSummaryItem {
  label: string;
  value: React.ReactNode;
}

export interface SecureActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (verificationToken: string, reason?: string) => Promise<void> | void;
  action: SensitiveAction;
  resourceId: string;
  title: string;
  description: string;
  confirmLabel?: string;
  severity?: 'danger' | 'warning' | 'info';
  summaryItems?: ResourceSummaryItem[];
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export default function SecureActionModal({
  isOpen,
  onClose,
  onAuthorized,
  action,
  resourceId,
  title,
  description,
  confirmLabel = 'Authorize Action',
  severity = 'danger',
  summaryItems = [],
  requireReason = false,
  reasonLabel = 'Justification / Reason',
  reasonPlaceholder = 'Please explain why this action is necessary for compliance records...',
}: SecureActionModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setReason('');
      setError(null);
      setIsVerifying(false);

      // Focus password input shortly after open
      const timeout = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVerifying) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isVerifying, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Please enter your account password to authorize this action.');
      passwordInputRef.current?.focus();
      return;
    }

    if (requireReason && reason.trim().length < 5) {
      setError('A documented justification (minimum 5 characters) is required.');
      return;
    }

    setIsVerifying(true);

    try {
      // 1. Verify credentials server-side and request action-scoped token
      const verifyRes = await verifyActionCredentials({
        action,
        resourceId,
        password,
        reason: reason.trim() || undefined,
      });

      if (!verifyRes.success || !verifyRes.token) {
        setError(verifyRes.error || 'Password verification failed. Access denied.');
        setIsVerifying(false);
        return;
      }

      // 2. Pass the single-use token to parent caller to execute the action
      await onAuthorized(verifyRes.token, reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during authorization.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isDanger = severity === 'danger';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !isVerifying) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
      aria-labelledby="secure-modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />

      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white dark:bg-[#151D17] border border-slate-200 dark:border-[#29352D]',
          'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#29352D] p-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                isDanger ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
              )}
            >
              {isDanger ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 id="secure-modal-title" className="text-base font-bold text-slate-900 dark:text-[#F4F7F4] leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A1ADA4] mt-0.5">Elevated Security Verification</p>
            </div>
          </div>

          {!isVerifying && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1D2920] dark:hover:text-[#F4F7F4] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Warning Banner */}
        <div
          className={cn(
            'mx-5 mt-4 flex items-start gap-3 rounded-xl border p-3.5',
            isDanger ? 'bg-red-50/70 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300' : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300'
          )}
        >
          <AlertTriangle size={18} className={cn('shrink-0 mt-0.5', isDanger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')} />
          <div className="text-xs leading-relaxed">{description}</div>
        </div>

        {/* Resource Summary Box (if present) */}
        {summaryItems.length > 0 && (
          <div className="mx-5 mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-[#29352D] dark:bg-[#101612] p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] mb-2">
              Action Context & Impact
            </div>
            <div className="space-y-1.5 text-xs">
              {summaryItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center gap-2">
                  <span className="text-slate-600 dark:text-[#A1ADA4]">{item.label}:</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F7F4] text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authorization Form */}
        <form onSubmit={handleSubmit} className="p-5 pt-4 space-y-4">
          {/* Reason Input (if required or optional) */}
          {requireReason && (
            <div className="space-y-1.5">
              <label htmlFor="secure-reason" className="block text-xs font-semibold text-slate-700 dark:text-[#F4F7F4]">
                {reasonLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="secure-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                disabled={isVerifying}
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-[#29352D] dark:bg-[#101612] px-3 py-2 text-xs text-slate-900 dark:text-[#F4F7F4] placeholder:text-slate-400 dark:placeholder:text-[#5d6f62] focus:border-slate-900 dark:focus:border-[#B7FF3C] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-[#B7FF3C] resize-none disabled:bg-slate-100 dark:disabled:bg-[#151D17]"
              />
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="secure-password" className="block text-xs font-semibold text-slate-700 dark:text-[#F4F7F4]">
              Confirm Account Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="secure-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your login password"
                disabled={isVerifying}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 dark:border-[#29352D] dark:bg-[#101612] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F4F7F4] placeholder:text-slate-400 dark:placeholder:text-[#5d6f62] pr-10 focus:border-slate-900 dark:focus:border-[#B7FF3C] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-[#B7FF3C] disabled:bg-slate-100 dark:disabled:bg-[#151D17]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F7F4]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#A1ADA4]">
              Your password verifies your identity server-side before execution.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1ADA4] hover:bg-slate-100 dark:hover:bg-[#1D2920] dark:hover:text-[#F4F7F4] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-all',
                'disabled:opacity-50 disabled:pointer-events-none',
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                  : 'bg-slate-900 dark:bg-[#B7FF3C] hover:bg-slate-800 dark:hover:bg-[#c9ff66] text-white dark:text-[#090C0A]'
              )}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
