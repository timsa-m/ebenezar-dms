'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

// ─────────────────────────────────────────────
// Pure calendar helpers (no date-fns needed)
// ─────────────────────────────────────────────

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Returns the Date objects for every cell in the 6-row grid for a month */
function buildCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Date[] = [];

  // Trailing days of previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, daysInPrevMonth - i));
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  // Leading days of next month to fill 42 cells (6 weeks)
  while (cells.length < 42) {
    cells.push(new Date(year, month + 1, cells.length - firstDay - daysInMonth + 1));
  }
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CustomDatePickerProps {
  /** Currently selected date (controlled) */
  selectedDate: Date | null;
  /** Called when the user picks a date */
  onChange: (date: Date) => void;
  /** Placeholder text shown when no date is selected */
  placeholder?: string;
  /** If set, dates before this are disabled */
  minDate?: Date;
  /** If set, dates after this are disabled */
  maxDate?: Date;
  /** Display format for the trigger button. Default: 'en-KE' long-date */
  formatDate?: (date: Date) => string;
  /** Disable the entire picker */
  disabled?: boolean;
  /** Additional style on the outermost wrapper */
  style?: React.CSSProperties;
  /** Accessible label for the trigger button */
  'aria-label'?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function CustomDatePicker({
  selectedDate,
  onChange,
  placeholder = 'Select a date…',
  minDate,
  maxDate,
  formatDate,
  disabled = false,
  style,
  'aria-label': ariaLabel = 'Date picker',
}: CustomDatePickerProps) {
  const today = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    selectedDate?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selectedDate?.getMonth() ?? today.getMonth()
  );
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setMode('day');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setMode('day');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function isDisabled(date: Date): boolean {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  }

  function selectDate(date: Date) {
    if (isDisabled(date)) return;
    onChange(date);
    setIsOpen(false);
    setMode('day');
  }

  function defaultFormat(d: Date): string {
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const displayValue = selectedDate
    ? (formatDate ? formatDate(selectedDate) : defaultFormat(selectedDate))
    : null;

  const grid = buildCalendarGrid(viewYear, viewMonth);

  // ── Year range (±10 years centred on viewYear) ────────────────────────
  const yearRange: number[] = [];
  const startYear = viewYear - 10;
  for (let y = startYear; y <= startYear + 20; y++) yearRange.push(y);

  // ─── Shared style tokens ─────────────────────────────────────────────
  const TOKEN = {
    border: '1.5px solid #E5E7EB',
    radius: '0.625rem',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    text: '#111113',
    muted: '#9CA3AF',
    subtle: '#F3F4F6',
    danger: '#B91C1C',
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger ──────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: '0.625rem',
          padding: '0.625rem 1rem',
          background: disabled ? TOKEN.subtle : '#fff',
          border: TOKEN.border,
          borderColor: isOpen ? TOKEN.primary : '#E5E7EB',
          borderRadius: TOKEN.radius,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          color: displayValue ? TOKEN.text : TOKEN.muted,
          transition: 'border-color 0.15s',
          outline: 'none',
          minHeight: '2.75rem',
          boxShadow: isOpen ? `0 0 0 3px ${TOKEN.primaryLight}` : 'none',
        }}
      >
        <Calendar size={15} style={{ flexShrink: 0, color: isOpen ? TOKEN.primary : TOKEN.muted }} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue ?? placeholder}
        </span>
        {selectedDate && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange(null as unknown as Date); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null as unknown as Date); } }}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: TOKEN.subtle, color: TOKEN.muted, cursor: 'pointer' }}
          >
            <X size={11} />
          </span>
        )}
      </button>

      {/* ── Popover ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="Calendar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9000,
            width: '300px',
            background: '#fff',
            border: TOKEN.border,
            borderRadius: '0.875rem',
            boxShadow: '0 12px 40px -8px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            animation: 'dp-open 0.15s ease',
          }}
        >
          {/* ── Navigation header ───────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.875rem', borderBottom: `1px solid ${TOKEN.subtle}` }}>
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              style={navBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = TOKEN.subtle)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {/* Month selector */}
              <button
                type="button"
                onClick={() => setMode(mode === 'month' ? 'day' : 'month')}
                style={{ ...headerBtnStyle, color: mode === 'month' ? TOKEN.primary : TOKEN.text }}
              >
                {MONTH_NAMES[viewMonth]}
              </button>
              {/* Year selector */}
              <button
                type="button"
                onClick={() => setMode(mode === 'year' ? 'day' : 'year')}
                style={{ ...headerBtnStyle, color: mode === 'year' ? TOKEN.primary : TOKEN.text }}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              style={navBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = TOKEN.subtle)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* ── Month picker overlay ────────────────────────────────── */}
          {mode === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', padding: '0.75rem' }}>
              {MONTH_NAMES.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setMode('day'); }}
                  style={{
                    padding: '0.5rem 0.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: i === viewMonth ? TOKEN.primary : 'transparent',
                    color: i === viewMonth ? '#fff' : TOKEN.text,
                    fontSize: '0.8125rem',
                    fontWeight: i === viewMonth ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (i !== viewMonth) e.currentTarget.style.background = TOKEN.subtle; }}
                  onMouseLeave={(e) => { if (i !== viewMonth) e.currentTarget.style.background = 'transparent'; }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* ── Year picker overlay ─────────────────────────────────── */}
          {mode === 'year' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', padding: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
              {yearRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setMode('day'); }}
                  style={{
                    padding: '0.4rem 0.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: y === viewYear ? TOKEN.primary : 'transparent',
                    color: y === viewYear ? '#fff' : TOKEN.text,
                    fontSize: '0.8125rem',
                    fontWeight: y === viewYear ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (y !== viewYear) e.currentTarget.style.background = TOKEN.subtle; }}
                  onMouseLeave={(e) => { if (y !== viewYear) e.currentTarget.style.background = 'transparent'; }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* ── Day grid ────────────────────────────────────────────── */}
          {mode === 'day' && (
            <div style={{ padding: '0.625rem 0.75rem 0.75rem' }}>
              {/* Day-of-week labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, color: TOKEN.muted, padding: '0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Date cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {grid.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === viewMonth;
                  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const isTodayDate = isToday(date);
                  const disabled = isDisabled(date);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDate(date)}
                      aria-label={date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      aria-pressed={isSelected}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '34px',
                        borderRadius: '0.5rem',
                        border: isTodayDate && !isSelected ? `1.5px solid ${TOKEN.primary}` : 'none',
                        background: isSelected ? TOKEN.primary : 'transparent',
                        color: isSelected
                          ? '#fff'
                          : disabled
                          ? '#D1D5DB'
                          : !isCurrentMonth
                          ? '#D1D5DB'
                          : isTodayDate
                          ? TOKEN.primary
                          : TOKEN.text,
                        fontSize: '0.8125rem',
                        fontWeight: isSelected || isTodayDate ? 700 : 400,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'background 0.1s',
                        opacity: !isCurrentMonth ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!disabled && !isSelected)
                          e.currentTarget.style.background = TOKEN.primaryLight;
                      }}
                      onMouseLeave={(e) => {
                        if (!disabled && !isSelected)
                          e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer: Today shortcut ───────────────────────────────── */}
          {mode === 'day' && (
            <div style={{ padding: '0.5rem 0.75rem', borderTop: `1px solid ${TOKEN.subtle}`, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today); }}
                style={{ fontSize: '0.75rem', fontWeight: 600, color: TOKEN.primary, background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = TOKEN.primaryLight)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}

      <style suppressHydrationWarning>{`
        @keyframes dp-open {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Shared micro-styles ─────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2rem',
  height: '2rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: 'transparent',
  color: '#374151',
  cursor: 'pointer',
  transition: 'background 0.1s',
};

const headerBtnStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 700,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.25rem 0.375rem',
  borderRadius: '0.375rem',
  letterSpacing: '-0.01em',
  transition: 'color 0.1s, background 0.1s',
};
