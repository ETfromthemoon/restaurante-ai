/**
 * useToast — sistema de notificaciones global
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Pedido enviado 🍳');
 *   toast.error('Error de conexión');
 *   toast.warning('Sin stock');
 *   toast.info('Actualizando...');
 *
 * Requiere <ToastProvider> en la raíz del árbol.
 */
import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** duración en ms — 0 = persiste hasta cerrar manualmente */
  duration: number;
  /** true mientras el toast está saliendo (fade-out) */
  leaving?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error:   6000,
  warning: 5000,
  info:    4000,
};

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    // Primero marcar como "leaving" para animar la salida
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    // Luego eliminar del DOM tras la animación (300ms)
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration?: number) => {
    const id       = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ms       = duration ?? DEFAULT_DURATION[type];
    const newToast: Toast = { id, message, type, duration: ms };

    setToasts(prev => {
      const next = [...prev, newToast];
      // Si superamos el máximo, eliminar el más antiguo
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    if (ms > 0) setTimeout(() => removeToast(id), ms);
  }, [removeToast]);

  return createElement(ToastContext.Provider, { value: { toasts, addToast, removeToast } }, children);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');

  return {
    success: (msg: string, duration?: number) => ctx.addToast(msg, 'success', duration),
    error:   (msg: string, duration?: number) => ctx.addToast(msg, 'error',   duration),
    warning: (msg: string, duration?: number) => ctx.addToast(msg, 'warning', duration),
    info:    (msg: string, duration?: number) => ctx.addToast(msg, 'info',    duration),
    dismiss: (id: string)                     => ctx.removeToast(id),
    toasts:  ctx.toasts,
  };
}
