'use client';

/**
 * DatePickerModalDemo
 * ───────────────────
 * Drop this anywhere in your app to see both components working together.
 * Safe to delete once you've integrated them into real flows.
 */

import { useState } from 'react';
import CustomModal from '@/components/ui/CustomModal';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

export default function DatePickerModalDemo() {
  // ── Modal state ──────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Date state (lifted to parent so the form can read it) ────────────────
  const [disbursementDate, setDisbursementDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  function handleSubmit() {
    // Your server action / form submit would go here
    console.log('Disbursement date:', disbursementDate);
    console.log('Due date:', dueDate);
    setIsModalOpen(false);
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        style={{
          padding: '0.625rem 1.25rem',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.625rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px -2px rgba(99,102,241,0.4)',
        }}
      >
        Open Date Demo Modal
      </button>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Loan Dates"
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Disbursement date */}
          <div>
            <label style={labelStyle}>Disbursement Date</label>
            <CustomDatePicker
              selectedDate={disbursementDate}
              onChange={setDisbursementDate}
              placeholder="Pick disbursement date…"
              maxDate={dueDate ?? undefined}
              aria-label="Disbursement date picker"
            />
          </div>

          {/* Due date */}
          <div>
            <label style={labelStyle}>Due Date</label>
            <CustomDatePicker
              selectedDate={dueDate}
              onChange={setDueDate}
              placeholder="Pick due date…"
              minDate={disbursementDate ?? undefined}
              aria-label="Due date picker"
            />
          </div>

          {/* Summary */}
          {(disbursementDate || dueDate) && (
            <div style={{ padding: '0.875rem 1rem', background: '#EEF2FF', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#4338CA' }}>
              {disbursementDate && (
                <p style={{ margin: '0 0 0.25rem' }}>
                  <strong>Disbursement:</strong>{' '}
                  {disbursementDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {dueDate && (
                <p style={{ margin: 0 }}>
                  <strong>Due:</strong>{' '}
                  {dueDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!disbursementDate || !dueDate}
              style={{
                ...submitBtnStyle,
                opacity: !disbursementDate || !dueDate ? 0.5 : 1,
                cursor: !disbursementDate || !dueDate ? 'not-allowed' : 'pointer',
              }}
            >
              Confirm Dates
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}

// ─── Micro-styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.125rem',
  background: '#F3F4F6',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#374151',
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 700,
  color: '#fff',
  boxShadow: '0 2px 8px -2px rgba(99,102,241,0.4)',
};
