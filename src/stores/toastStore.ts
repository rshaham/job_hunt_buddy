import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => void;
  hideToast: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, variant = 'info') => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Export a helper function for use outside React components
export const showToast = (message: string, variant?: ToastVariant) => {
  useToastStore.getState().showToast(message, variant);
};
