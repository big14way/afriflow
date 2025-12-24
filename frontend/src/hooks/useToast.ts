import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  toast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 5000,
      variant: 'default',
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove after duration
    setTimeout(() => {
      get().removeToast(id);
    }, newToast.duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Hook for easier usage
export const useToast = () => {
  const { toast, removeToast, clearToasts } = useToastStore();
  return { toast, removeToast, clearToasts };
};
