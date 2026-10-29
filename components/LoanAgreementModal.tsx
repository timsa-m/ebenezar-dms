'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { X, FileText, CheckCircle, AlertCircle, Loader2, PenLine, ChevronDown } from 'lucide-react';
import { LOAN_TERMS_AND_CONDITIONS, TERMS_VERSION } from '@/constants/terms';
import { saveSignedAgreement } from '@/lib/actions/agreement.actions';
import SignaturePad from './SignaturePad';

interface LoanAgreementModalProps {
  loanId: string;
  clientId: string;
  clientName: string;
  principalAmount: number;
  loanType?: string;
  onClose: () => void;
  onSigned: () => void;
}

export default function LoanAgreementModal({
  loanId,
  clientId,
  clientName,
  principalAmount,
  loanType,
  onClose,
  onSigned,
}: LoanAgreementModalProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tcScrollRef = useRef<HTMLDivElement>(null);

  // Track scroll progress through the T&C
  useEffect(() => {
    const el = tcScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) { setHasScrolled(true); setScrollProgress(100); return; }
      const pct = Math.round((el.scrollTop / max) * 100);
      setScrollProgress(pct);
      if (pct >= 95) setHasScrolled(true);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Check immediately in case content is short
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const canSubmit = hasScrolled && checked && signature && !isPending;

  const handleSubmit = () => {
    if (!canSubmit || !signature) return;
    setError(null);
    startTransition(async () => {
      const result = await saveSignedAgreement({
        loanId,
        clientId,
        clientName,
        signatureBase64: signature,
      });
      if (!result) {
        setError('Failed to save the agreement. Please try again.');
        return;
      }
      onSigned();
      onClose();
    });
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1.5rem 1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div style={{
        background: '#FFF',
        width: '100%', maxWidth: '660px',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        // Animate in from top
        animation: 'slideDown 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FFF',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem',
              background: '#111113', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={15} color="#FFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111113', margin: 0 }}>Loan Agreement</h2>
              <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', margin: 0 }}>Terms &amp; Conditions · {TERMS_VERSION}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#F3F4F6', border: 'none', borderRadius: '50%',
            width: '2rem', height: '2rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <X size={15} color="#6B7280" />
          </button>
        </div>

        {/* ── Loan summary strip ── */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: '#F8FAFC', borderBottom: '1px solid #F3F4F6',
          display: 'flex', gap: '2rem', flexWrap: 'wrap', flexShrink: 0,
        }}>
          {[
            { label: 'Borrower', value: clientName },
            { label: 'Amount', value: formatAmount(principalAmount) },
            ...(loanType ? [{ label: 'Product', value: loanType }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <span style={{ fontSize: '0.625rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111113', margin: '0.1rem 0 0' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Scroll progress bar ── */}
        <div style={{ height: '3px', background: '#F3F4F6', flexShrink: 0 }}>
          <div style={{
            height: '100%',
            width: `${scrollProgress}%`,
            background: hasScrolled
              ? 'linear-gradient(90deg,#10B981,#059669)'
              : 'linear-gradient(90deg,#6366F1,#8B5CF6)',
            transition: 'width 0.15s ease, background 0.4s ease',
          }} />
        </div>

        {/* ── T&C scroll area ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            ref={tcScrollRef}
            style={{
              height: 'clamp(240px, 40vh, 380px)',
              overflowY: 'auto',
              padding: '1.25rem 1.5rem',
              fontSize: '0.8125rem', lineHeight: '1.85', color: '#374151',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit',
              scrollBehavior: 'smooth',
              // Custom scrollbar styling
              scrollbarWidth: 'thin',
              scrollbarColor: '#D1D5DB #F9FAFB',
            }}
          >
            {LOAN_TERMS_AND_CONDITIONS}
          </div>

          {/* Fade-out gradient at bottom when not yet scrolled */}
          {!hasScrolled && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.97))',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: '0.75rem', pointerEvents: 'none',
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.6875rem', fontWeight: 600, color: '#6B7280',
                animation: 'bounce 1.5s ease-in-out infinite',
              }}>
                <ChevronDown size={13} />
                Scroll to read all
              </span>
            </div>
          )}
        </div>

        {/* ── Signature section — revealed after scrolling ── */}
        <div style={{
          // Smooth reveal: max-height transition + opacity
          maxHeight: hasScrolled ? '900px' : '0px',
          opacity: hasScrolled ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid #E5E7EB',
            background: '#FAFAFA',
            display: 'flex', flexDirection: 'column', gap: '1.1rem',
          }}>

            {/* Section divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Applicant Declaration
              </span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
            </div>

            {/* Checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.875rem 1rem',
              background: checked ? '#F0FDF4' : '#F9FAFB',
              border: `1.5px solid ${checked ? '#86EFAC' : '#E5E7EB'}`,
              borderRadius: '0.75rem',
              transition: 'all 0.2s',
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                style={{ marginTop: '0.1875rem', width: '1.125rem', height: '1.125rem', accentColor: '#111113', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500, lineHeight: 1.6 }}>
                I, <strong>{clientName}</strong>, have read carefully, understood, and confirm that the above terms and conditions apply to my loan. I herein append my signature as confirmation.
              </span>
            </label>

            {/* Signature Pad */}
            <div style={{
              opacity: checked ? 1 : 0.35,
              pointerEvents: checked ? 'auto' : 'none',
              transition: 'opacity 0.25s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <PenLine size={14} color="#374151" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Draw Signature
                </span>
              </div>
              <SignaturePad onChange={setSignature} disabled={!checked || isPending} />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: '0.75rem',
              }}>
                <AlertCircle size={14} color="#DC2626" />
                <span style={{ fontSize: '0.8125rem', color: '#B91C1C', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', padding: '0.9375rem',
                background: canSubmit ? '#111113' : '#E5E7EB',
                color: canSubmit ? '#FFF' : '#9CA3AF',
                border: 'none', borderRadius: '0.875rem',
                fontSize: '0.9375rem', fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, color 0.2s, transform 0.1s',
              }}
              onMouseDown={(e) => { if (canSubmit) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving Agreement…
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Sign &amp; Confirm Agreement
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Keyframe animations injected inline */}
      <style suppressHydrationWarning>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
