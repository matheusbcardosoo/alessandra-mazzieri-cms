import { createContext, useContext } from 'react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ToastStatus = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  status: ToastStatus;
  title: string;
  message?: string;
  code?: string;
  duration?: number; // ms; 0 = não fecha sozinho
}

export type ToastInput = Omit<ToastItem, 'id'>;

interface ToastContextValue {
  add: (toast: ToastInput) => void;
  remove: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

// ─── Helpers exportados (sem hook) ───────────────────────────────────────────
// Permitem chamar toasts de fora de componentes React (ex: em utils, mutations)

let _add: ((toast: ToastInput) => void) | null = null;

export function setToastAdder(fn: ((toast: ToastInput) => void) | null) {
  _add = fn;
}

export const toast = {
  success: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'success', title, ...opts }),

  error: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'error', title, duration: 0, ...opts }),

  warning: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'warning', title, duration: 8000, ...opts }),

  info: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'info', title, ...opts }),
};
