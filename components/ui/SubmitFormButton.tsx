'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface SubmitFormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  pendingText?: React.ReactNode;
}

export default function SubmitFormButton({ 
  children, 
  pendingText = 'Submitting...', 
  className, 
  ...props 
}: SubmitFormButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending || props.disabled}
      className={`${className} ${pending ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
