'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { inviteUser } from '@/lib/actions/user.actions';
import { UserPlus, X, Loader2, CheckCircle, Mail, User, Shield, Send } from 'lucide-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  onSuccess?: () => void;
};

export default function InviteUserModal({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'STAFF' as 'STAFF' | 'MANAGER' | 'ADMIN',
  });

  // Focus first field when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!form.firstName || !form.lastName || !form.email) {
      setResult({ ok: false, msg: 'First name, last name and email are required.' });
      return;
    }

    startTransition(async () => {
      const res = await inviteUser(form);
      if (res.success) {
        setResult({ ok: true, msg: `An invitation email has been sent to ${form.email}. They will set their own password via the link in the email.` });
        toast.success(`Invitation sent to ${form.email}!`, { position: 'top-center' });
        onSuccess?.();
      } else {
        const errMsg = res.error ?? 'Something went wrong.';
        setResult({ ok: false, msg: errMsg });
        toast.error(errMsg);
      }
    });
  };

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    padding: '0.65rem 0.875rem 0.65rem 2.5rem',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: 9,
    fontSize: '0.875rem',
    color: '#1a2340',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#5a6a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  };

  const iconWrap: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9aa4b8',
    display: 'flex',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setResult(null);
          setForm({ firstName: '', lastName: '', email: '', role: 'STAFF' });
          setOpen(true);
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0.6rem 1.25rem',
          background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(15, 76, 129, 0.3)',
          transition: 'opacity 0.2s, transform 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.opacity = '0.92')}
        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
      >
        <UserPlus size={16} />
        Invite User
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10, 20, 50, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            animation: 'fadeIn 0.15s ease',
          }}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white dark:bg-[#151D17] border border-gray-200 dark:border-[#29352D] rounded-2xl w-[calc(100%-2rem)] max-w-[480px] p-6 sm:p-8 shadow-2xl font-sans"
          style={{ animation: 'slideUp 0.2s ease' }}
        >
          {/* Modal header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white shrink-0">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-[#F4F7F4] m-0">
                  Invite New User
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#A1ADA4] m-0">
                  An invite email will be sent. The user sets their own password.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="border-none bg-gray-100 dark:bg-[#1D2920] rounded-lg w-8 h-8 cursor-pointer flex items-center justify-center text-gray-500 dark:text-[#A1ADA4] hover:text-gray-900 dark:hover:text-[#F4F7F4] transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Success state */}
          {result?.ok ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle size={30} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="m-0 text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                User Invited!
              </p>
              <p className="m-0 text-xs text-gray-500 dark:text-[#A1ADA4] leading-relaxed">
                {result.msg}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 py-2 px-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User size={11} />First Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A1ADA4] pointer-events-none">
                      <User size={14} />
                    </span>
                    <input
                      ref={firstRef}
                      type="text"
                      placeholder="JOHN"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value.toUpperCase() }))}
                      className="form-input w-full pl-9 py-2 text-sm uppercase rounded-lg border border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User size={11} />Last Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A1ADA4] pointer-events-none">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="DOE"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value.toUpperCase() }))}
                      className="form-input w-full pl-9 py-2 text-sm uppercase rounded-lg border border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="mb-3.5">
                <label className="text-xs font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail size={11} />Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A1ADA4] pointer-events-none">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="form-input w-full pl-9 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4]"
                    required
                  />
                </div>
              </div>

              {/* Role */}
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield size={11} />Role
                </label>
                <div className="flex gap-2.5">
                  {(['STAFF', 'MANAGER', 'ADMIN'] as const).map(r => (
                    <label
                      key={r}
                      className={cn(
                        "flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                        form.role === r
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-700 dark:text-[#C1CBC3]"
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={() => setForm(f => ({ ...f, role: r }))}
                        className="hidden"
                      />
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        form.role === r ? "border-blue-600" : "border-gray-300 dark:border-gray-600"
                      )}>
                        {form.role === r && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className={cn(
                          "text-xs font-bold",
                          form.role === r ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-[#F4F7F4]"
                        )}>
                          {r}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-[#A1ADA4]">
                          {r === 'STAFF' ? 'Read/write' : r === 'MANAGER' ? 'Approvals' : 'Full access'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {result && !result.ok && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg mb-4 text-xs text-red-600 dark:text-red-400">
                  <X size={13} className="shrink-0" />
                  {result.msg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#1D2920] text-gray-700 dark:text-[#C1CBC3] hover:bg-gray-50 dark:hover:bg-[#222E25] rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Sending Invite…</>
                  ) : (
                    <><Send size={15} /> Send Invite</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <style suppressHydrationWarning>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -46%) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
