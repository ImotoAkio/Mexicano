import { useState, useRef, useEffect, useCallback } from 'react';
import { UI } from './constants';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

/**
 * Hook centralizado para toasts com cleanup correto de timers.
 * Evita memory leaks do setTimeout quando o componente desmonta.
 *
 * @example
 * const { toast, showToast } = useToast();
 * <ToastComponent {...toast} />
 */
export function useToast(durationMs: number = UI.TOAST_DURATION_MS) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  });

  // Ref para o timer — evita re-renders e permite cleanup no unmount
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpar timer ao desmontar o componente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    // Cancela timer anterior se houver um toast ainda visível
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, type, visible: true });

    timerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
      timerRef.current = null;
    }, durationMs);
  }, [durationMs]);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
