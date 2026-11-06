'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { authorizeFinancialAccess } from '@/lib/security/actions';

export interface FinancialAccessGateProps {
  title?: string;
  description?: string;
}

export default function FinancialAccessGate({
  title = 'Confidential Financial Module',
  description = 'This section contains protected financial performance metrics, revenue statements, collections, and audit records for Ebenezar Enterprises Ltd. Authorize access with your account password to continue.',
}: FinancialAccessGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your account password.');
      return;
    }

    setIsAuthorizing(true);
    setError(null);

    try {
      const res = await authorizeFinancialAccess(password);
      if (!res.success) {
        setError(res.error || 'Failed to authorize financial access.');
        setIsAuthorizing(false);
        return;
      }

      // Successful authorization, refresh the current page to unlock data
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header Icon */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
          <Lock size={26} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800 flex items-start gap-2">
          <ShieldCheck size={16} className="shrink-0 text-amber-600 mt-0.5" />
          <span>
            Access is granted for <strong>10 minutes</strong> per session. Sensitive financial data is never exposed without server-verified credentials.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="gate-password" className="block text-xs font-semibold text-slate-700">
              Confirm Account Password
            </label>
            <div className="relative">
              <input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                disabled={isAuthorizing}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 pr-10 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isAuthorizing || !password.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isAuthorizing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Authorizing Financial Access...</span>
              </>
            ) : (
              <span>Unlock Financial Reports</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
