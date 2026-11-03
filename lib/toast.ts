import React, { isValidElement } from 'react';
import { toast as sonnerToast, ExternalToast } from 'sonner';

type ToastOptions = ExternalToast;

interface ToastObjectProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' | string;
  message?: string;
  error?: string;
  [key: string]: any;
}

/**
 * A smart wrapper around sonner's toast that:
 * 1. Safely parses object-based toast payloads (e.g. { title, description, variant })
 *    so React never throws "Objects are not valid as a React child".
 * 2. Infers the toast type (error/success) based on keywords or variant.
 * 3. Supports all standard Sonner toast methods (toast.success, toast.error, etc.).
 */
const smartToast = (
  message: string | React.ReactNode | ToastObjectProps,
  options?: ToastOptions
) => {
  // Handle object-style toast calls (e.g. { title, description, variant })
  if (
    typeof message === 'object' &&
    message !== null &&
    !isValidElement(message)
  ) {
    const obj = message as ToastObjectProps;
    const toastTitle =
      obj.title ||
      obj.message ||
      obj.error ||
      (typeof obj.description === 'string' ? obj.description : 'Notice');
    const toastDescription =
      obj.title && obj.description ? obj.description : options?.description;
    const combinedOptions: ToastOptions = {
      ...options,
      ...(toastDescription ? { description: toastDescription } : {}),
    };

    if (obj.variant === 'destructive' || obj.variant === 'error') {
      return sonnerToast.error(toastTitle, combinedOptions);
    }
    if (obj.variant === 'success') {
      return sonnerToast.success(toastTitle, combinedOptions);
    }
    if (obj.variant === 'warning') {
      return sonnerToast.warning(toastTitle, combinedOptions);
    }
    if (obj.variant === 'info') {
      return sonnerToast.info(toastTitle, combinedOptions);
    }

    // Infer from toastTitle
    if (typeof toastTitle === 'string') {
      const lower = toastTitle.toLowerCase();
      if (
        lower.includes('fail') ||
        lower.includes('error') ||
        lower.includes('unsuccessful') ||
        lower.includes('destructive') ||
        lower.includes('denied') ||
        lower.includes('reject')
      ) {
        return sonnerToast.error(toastTitle, combinedOptions);
      }
      if (
        lower.includes('success') ||
        lower.includes('saved') ||
        lower.includes('created') ||
        lower.includes('applied') ||
        lower.includes('completed')
      ) {
        return sonnerToast.success(toastTitle, combinedOptions);
      }
    }

    return sonnerToast(toastTitle, combinedOptions);
  }

  // Handle string message with keyword inference
  if (typeof message === 'string') {
    const lowerMsg = message.toLowerCase();

    // Destructive / Unsuccessful keywords
    const isDestructive =
      lowerMsg.includes('fail') ||
      lowerMsg.includes('error') ||
      lowerMsg.includes('unsuccessful') ||
      lowerMsg.includes('destructive') ||
      lowerMsg.includes('delete') ||
      lowerMsg.includes('remove') ||
      lowerMsg.includes('cancel') ||
      lowerMsg.includes('denied') ||
      lowerMsg.includes('reject');

    if (isDestructive) {
      return sonnerToast.error(message, options);
    }

    // Success keywords
    const isSuccess =
      lowerMsg.includes('success') ||
      lowerMsg.includes('saved') ||
      lowerMsg.includes('created') ||
      lowerMsg.includes('applied') ||
      lowerMsg.includes('completed');

    if (isSuccess) {
      return sonnerToast.success(message, options);
    }
  }

  // Fallback to default toast
  return sonnerToast(message as React.ReactNode, options);
};

// Bind original sonner methods so `toast.error()`, `toast.promise()` etc. still work
smartToast.success = sonnerToast.success;
smartToast.error = sonnerToast.error;
smartToast.warning = sonnerToast.warning;
smartToast.info = sonnerToast.info;
smartToast.custom = sonnerToast.custom;
smartToast.message = sonnerToast.message;
smartToast.promise = sonnerToast.promise;
smartToast.dismiss = sonnerToast.dismiss;
smartToast.loading = sonnerToast.loading;

export { smartToast as toast };

