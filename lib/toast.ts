import { toast as sonnerToast, ExternalToast } from 'sonner';

type ToastOptions = ExternalToast;

/**
 * A smart wrapper around sonner's toast that infers the toast type
 * (error/success) based on keywords in the message, while still
 * providing all the original sonner toast methods.
 */
const smartToast = (message: string | React.ReactNode, options?: ToastOptions) => {
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
  return sonnerToast(message, options);
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
