import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Anchor, 
  Navigation, 
  CheckCircle2, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  AlertTriangle, 
  Droplets, 
  Info,
  ChevronRight,
  Sparkles,
  Clock,
  ChevronUp
} from 'lucide-react';
import { MarinaNotificationItem } from '../../utils/marinaNotifications';

export interface NotificationBannerProps {
  notification: MarinaNotificationItem | null;
  onDismiss: () => void;
  onOpenHistory?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
  onOpenHistory
}) => {
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 6000);
  };

  useEffect(() => {
    if (!notification) {
      clearTimer();
      return;
    }
    setDragOffsetY(0);
    setIsDragging(false);
    setIsDismissing(false);
    hasMovedRef.current = false;
    isDraggingRef.current = false;
    startYRef.current = null;

    startTimer();
    return () => clearTimer();
  }, [notification?.id]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setDragOffsetY(-160);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(12); } catch {}
    }
    setTimeout(() => {
      onDismiss();
    }, 200);
  };

  /* ── TOUCH & GESTURE HANDLERS (Arrastar para cima) ── */

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isDismissing) return;
    clearTimer();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    hasMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current || startYRef.current === null || isDismissing) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startYRef.current;

    if (Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }

    if (deltaY < 0) {
      // Arrastando para cima: segue o dedo diretamente 1:1
      setDragOffsetY(deltaY);
    } else {
      // Arrastando para baixo: efeito elástico de resistência
      setDragOffsetY(deltaY * 0.18);
    }
  };

  const onTouchEnd = () => {
    if (!isDraggingRef.current || isDismissing) return;

    isDraggingRef.current = false;
    setIsDragging(false);
    startYRef.current = null;

    // Se arrastou para cima mais que 35px, descarta com animação
    if (dragOffsetY < -35) {
      handleDismiss();
    } else {
      // Volta à posição original com suavidade e retoma timer
      setDragOffsetY(0);
      startTimer();
    }
  };

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'agendamento':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'confirmacao':
      case 'pronta':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'cancelamento':
      case 'cancelado':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'descida':
        return <Anchor className="w-5 h-5 text-cyan-400 animate-pulse" />;
      case 'abastecimento':
      case 'combustivel':
        return <Droplets className="w-5 h-5 text-amber-400" />;
      case 'saida':
        return <Navigation className="w-5 h-5 text-indigo-400" />;
      case 'chegada':
        return <ArrowDownCircle className="w-5 h-5 text-purple-400" />;
      case 'subida':
        return <ArrowUpCircle className="w-5 h-5 text-teal-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.severity) {
      case 'alert':
        return 'border-rose-500/50 bg-rose-950/95 text-rose-100 shadow-rose-900/40';
      case 'warning':
        return 'border-amber-500/50 bg-amber-950/95 text-amber-100 shadow-amber-900/40';
      case 'success':
        return 'border-emerald-500/50 bg-slate-900/95 text-slate-100 shadow-emerald-950/40';
      default:
        return 'border-blue-500/50 bg-slate-900/95 text-white shadow-blue-950/40';
    }
  };

  const currentOpacity = isDismissing
    ? 0
    : dragOffsetY < 0
      ? Math.max(0.1, 1 - Math.abs(dragOffsetY) / 120)
      : 1;

  const transformStyle = `translate3d(0, ${dragOffsetY}px, 0)`;
  const transitionStyle = isDragging
    ? 'none'
    : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out';

  return (
    <div
      className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[9999] select-none"
      style={{
        transform: transformStyle,
        opacity: currentOpacity,
        transition: transitionStyle,
        touchAction: 'pan-x'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onTouchStart}
      onMouseMove={onTouchMove}
      onMouseUp={onTouchEnd}
      onMouseLeave={onTouchEnd}
    >
      <div 
        className={`rounded-2xl p-3 shadow-2xl backdrop-blur-md border ${getBorderColor()} flex flex-col gap-1.5 cursor-grab active:cursor-grabbing transition-colors`}
        onClick={() => {
          if (hasMovedRef.current) return;
          if (onOpenHistory) onOpenHistory();
          onDismiss();
        }}
      >
        {/* Barra de arraste (Drag Handle) inspirada nas notificações nativas do celular */}
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto -mt-0.5 mb-0.5" />

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 shrink-0 mt-0.5">
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-white truncate">
                  {notification.operacao || notification.title.split('•')[0].trim()}
                </span>
                <span className="bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm shrink-0">
                  {notification.boatCode || notification.boatName || 'M--'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                Agora
              </span>
            </div>

            <div className="space-y-0.5 text-xs">
              {notification.clientName && (
                <p className="text-slate-200 font-medium truncate">
                  <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Cliente:</span>
                  <span className="text-white font-semibold">{notification.clientName}</span>
                </p>
              )}
              <p className="text-blue-200 font-medium truncate flex items-center gap-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Previsão:</span>
                <span className="font-bold text-white bg-white/10 px-1.5 py-0.2 rounded font-mono text-[11px]">
                  {notification.previsaoSaida || 'Não informada'}
                </span>
              </p>
            </div>
          </div>

          {/* Botão de Fechar com área de toque grande e acessível (40x40px) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-2 -mr-1 -mt-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 active:bg-white/25 active:scale-90 transition-all shrink-0 cursor-pointer"
            title="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador sutil de deslizar para cima */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-white/50 font-medium pt-0.5 border-t border-white/10">
          <ChevronUp className="w-3 h-3 text-white/40 animate-bounce" />
          <span>Arraste para cima para fechar</span>
        </div>
      </div>
    </div>
  );
};
