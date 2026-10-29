'use client';

import { useState, useEffect } from 'react';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

export interface DatePickerInputProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function DatePickerInput({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Select date",
}: DatePickerInputProps) {
  // Helper to parse "YYYY-MM-DD" into a local Date
  const parseDateString = (ds: string | undefined): Date | null => {
    if (!ds) return null;
    const parts = ds.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return null;
  };

  // Helper to format a local Date into "YYYY-MM-DD"
  const formatDateString = (d: Date | null): string => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const isControlled = value !== undefined;
  const initialDate = parseDateString(isControlled ? value : defaultValue);
  
  const [internalDate, setInternalDate] = useState<Date | null>(initialDate);

  // Keep internal state synced if parent changes controlled value
  useEffect(() => {
    if (isControlled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalDate(parseDateString(value));
    }
  }, [value, isControlled]);

  const handleChange = (d: Date | null) => {
    if (!isControlled) {
      setInternalDate(d);
    }
    if (onChange) {
      onChange(formatDateString(d));
    }
  };

  const activeDate = isControlled ? parseDateString(value) : internalDate;

  return (
    <>
      <CustomDatePicker
        selectedDate={activeDate}
        onChange={(d: Date) => handleChange(d)}
        placeholder={placeholder}
        minDate={parseDateString(min) ?? undefined}
        maxDate={parseDateString(max) ?? undefined}
        disabled={disabled}
      />
      {name && (
        <input type="hidden" name={name} value={formatDateString(activeDate)} />
      )}
    </>
  );
}
