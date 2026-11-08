import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Navigation,
  Package,
  Ship,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Check,
  QrCode,
  Copy,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface ClientCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  boat?: any; // Pega informacoes da embarcacao
  boats?: any[]; // Lista de embarcacoes do cliente (para multi-embarcacoes no mesmo dia)
  allTodayReservations?: any[]; // Todas as reservas do cliente para hoje
  allTodayPendingReservations?: any[]; // Reservas pendentes de confirmacao hoje
  onSelectReservation?: (res: any) => void; // Alternar entre reservas do dia
  isInadimplente?: boolean; // Bloqueio por valores em aberto
  totalAberto?: number; // Total em aberto (vencido)
  onGoToPayments?: () => void; // Direciona para a pagina de pagamentos
  onPaymentConfirmed?: () => void; // Callback ao quitar PIX dentro do próprio modal
  onCancelReservation?: (reservaId: string) => Promise<void> | void; // Cancelar reserva direto pelo modal
  client?: any; // Pega informacoes do cliente para checar acesso aos acessorios
  clientToken?: string | null;
  onSuccess: (checkinData?: any) => void;
}

const formatBoatLabel = (boat: any): string => {
  if (!boat) return 'Embarcação';
  const rawName = (boat.nome || '').trim();
  const isJet = boat.tipo === 'jet' || rawName.toLowerCase().includes('jet');
  if (isJet) {
    if (rawName.toUpperCase().startsWith('JET')) return rawName;
    return boat.numero ? `JET ${String(boat.numero).padStart(2, '0')}` : (rawName || 'Jet Ski');
  }
  const match = rawName.match(/^M\s*(\d+)/i);
  if (match) return `M${match[1].padStart(2, '0')}`;
  if (boat.numero) return `M${String(boat.numero).padStart(2, '0')}`;
  return rawName || 'Lancha';
};

export default function ClientCheckinModal({
  isOpen,
  onClose,
  reservation,
  boat,
  boats = [],
  allTodayReservations = [],
  allTodayPendingReservations = [],
  onSelectReservation,
  isInadimplente = false,
  totalAberto = 0,
  onGoToPayments,
  onPaymentConfirmed,
  onCancelReservation,
  client,
  clientToken,
  onSuccess
}: ClientCheckinModalProps) {
  const [step, setStep] = useState(1);
  const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('17:00');
  const [limiteSaida, setLimiteSaida] = useState('00:00');
  const [limiteChegada, setLimiteChegada] = useState('23:59');
  const [tempoHabil, setTempoHabil] = useState(40);
  const [pessoasABordo, setPessoasABordo] = useState(2);
  const [destino, setDestino] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverFinancialBlock, setServerFinancialBlock] = useState(false);

  // Estados de Pagamento PIX In-Place (Dentro do próprio Modal de Check-in)
  const [inPlacePixCleared, setInPlacePixCleared] = useState(false);
  const [isGeneratingInlinePix, setIsGeneratingInlinePix] = useState(false);
  const [inlinePixQrCode, setInlinePixQrCode] = useState<string | null>(null);
  const [inlinePixPayload, setInlinePixPayload] = useState<string | null>(null);
  const [inlinePixPaymentId, setInlinePixPaymentId] = useState<string | null>(null);
  const [inlinePixFinalValue, setInlinePixFinalValue] = useState<number | null>(null);
  const [inlinePixError, setInlinePixError] = useState<string | null>(null);
  const [copiedInlinePix, setCopiedInlinePix] = useState(false);

  // Cancelamento em 1 toque dentro do modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelingReserva, setIsCancelingReserva] = useState(false);

  // Acessórios selecionados para a saída
  const [takeTenda, setTakeTenda] = useState(false);
  const [takeMesa, setTakeMesa] = useState(false);
  const [takeChurrasqueira, setTakeChurrasqueira] = useState(false);
  const [qtdBancos, setQtdBancos] = useState(0);

  const resolvedBoat = boat || boats.find((b: any) => b.id === reservation?.embarcacaoId);
  const isCurrentJet = resolvedBoat?.tipo === 'jet' || (resolvedBoat?.nome || '').toLowerCase().includes('jet');

  const embarcacaoReserva = client?.embarcacoes?.find((e: any) => e.embarcacaoId === reservation?.embarcacaoId);
  const hasAcessorios =
    embarcacaoReserva?.acessorios?.tenda ||
    embarcacaoReserva?.acessorios?.mesa ||
    embarcacaoReserva?.acessorios?.churrasqueira ||
    embarcacaoReserva?.acessorios?.bancosCadeiras;
  const maxSteps = hasAcessorios ? 4 : 3;

  const hasOpenDebts = !inPlacePixCleared && (isInadimplente || totalAberto > 0 || serverFinancialBlock);
  const hasMultipleBoatsToday = allTodayReservations.length > 1;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPessoasABordo(2);
      setDestino('');
      setErrorMsg(null);
      setServerFinancialBlock(false);
      setInPlacePixCleared(false);
      setInlinePixQrCode(null);
      setInlinePixPayload(null);
      setInlinePixPaymentId(null);
      setInlinePixFinalValue(null);
      setInlinePixError(null);
      setShowCancelConfirm(false);
      setTakeTenda(false);
      setTakeMesa(false);
      setTakeChurrasqueira(false);
      setQtdBancos(0);
      setLimiteSaida('00:00');
      setLimiteChegada('23:59');

      // Determine the day-of-week from the reservation date
      const dayOfWeek = reservation?.data
        ? new Date(reservation.data + 'T12:00:00').getDay()
        : new Date().getDay();

      // Fetch per-day schedule from public config
      fetch('/api/config/public?chaves=marina_horarios_semana,marina_checkin_antecedencia')
        .then(res => res.json())
        .then(data => {
          const configs = data?.configs || {};
          let schedule: Record<string, any> | null = null;
          if (configs.marina_horarios_semana) {
            try {
              schedule = typeof configs.marina_horarios_semana === 'string'
                ? JSON.parse(configs.marina_horarios_semana)
                : configs.marina_horarios_semana;
            } catch { /* ignore */ }
          }
          if (schedule && schedule[String(dayOfWeek)]) {
            const dayConfig = schedule[String(dayOfWeek)];
            if (dayConfig.checkinSaida) {
              setPrevisaoSaida(dayConfig.checkinSaida);
              setLimiteSaida(dayConfig.checkinSaida);
            }
            if (dayConfig.checkinChegada) {
              setPrevisaoChegada(dayConfig.checkinChegada);
              setLimiteChegada(dayConfig.checkinChegada);
            }
          } else {
            // Fallback defaults: weekdays 09-17, weekends 09-19
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            setPrevisaoSaida('09:00');
            setLimiteSaida('09:00');
            setPrevisaoChegada(isWeekend ? '19:00' : '17:00');
            setLimiteChegada(isWeekend ? '19:00' : '17:00');
          }
          if (configs.marina_checkin_antecedencia) {
            const mins = parseInt(configs.marina_checkin_antecedencia, 10);
            if (!isNaN(mins)) setTempoHabil(mins);
          }
        })
        .catch(() => {
          // Fallback on error
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          setPrevisaoSaida('09:00');
          setLimiteSaida('09:00');
          setPrevisaoChegada(isWeekend ? '19:00' : '17:00');
          setLimiteChegada(isWeekend ? '19:00' : '17:00');
        });
    }
  }, [isOpen, reservation?.id, reservation?.data]);

  // Monitoramento automático em tempo real do PIX gerado dentro do modal
  useEffect(() => {
    if (!isOpen || !inlinePixPaymentId || inPlacePixCleared) return;
    const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
    if (!token) return;

    const unlockCheckinAfterPayment = () => {
      setInPlacePixCleared(true);
      setServerFinancialBlock(false);
      setInlinePixQrCode(null);
      setInlinePixPayload(null);
      setStep(1);
      if (onPaymentConfirmed) {
        onPaymentConfirmed();
      }
    };

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `/api/financeiro/asaas-status/${encodeURIComponent(inlinePixPaymentId)}?clienteId=${encodeURIComponent(client?.id || '')}`,
          { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.paid) {
            unlockCheckinAfterPayment();
          }
        }
      } catch {}
    };

    pollStatus();
    const timer = setInterval(pollStatus, 3000);
    return () => clearInterval(timer);
  }, [isOpen, inlinePixPaymentId, inPlacePixCleared, client?.id, clientToken]);

  // Caso o estado externo de inadimplência mude para falso (via Socket.io Asaas webhook), libera imediatamente
  useEffect(() => {
    if (isOpen && !isInadimplente && totalAberto <= 0 && inlinePixPaymentId) {
      setInPlacePixCleared(true);
      setServerFinancialBlock(false);
    }
  }, [isOpen, isInadimplente, totalAberto, inlinePixPaymentId]);

  if (!isOpen || !reservation) return null;

  const handleGenerateInlinePix = async () => {
    setIsGeneratingInlinePix(true);
    setInlinePixError(null);
    setCopiedInlinePix(false);
    try {
      const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
      const response = await fetch('/api/financeiro/fatura/gerar-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ billingType: 'PIX' })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        if (resData.asaasPaymentId) setInlinePixPaymentId(resData.asaasPaymentId);
        if (resData.finalValue !== undefined) setInlinePixFinalValue(Number(resData.finalValue));
        if (resData.qrCode) {
          setInlinePixQrCode(resData.qrCode.encodedImage);
          setInlinePixPayload(resData.qrCode.payload);
        } else {
          setInlinePixError('QR Code não disponível no momento. Utilize a Página de Pagamentos.');
        }
      } else {
        setInlinePixError(resData.message || 'Não foi possível gerar o PIX agora.');
      }
    } catch {
      setInlinePixError('Falha de conexão ao gerar PIX.');
    } finally {
      setIsGeneratingInlinePix(false);
    }
  };

  const handleCopyInlinePix = () => {
    if (!inlinePixPayload) return;
    navigator.clipboard.writeText(inlinePixPayload);
    setCopiedInlinePix(true);
    setTimeout(() => setCopiedInlinePix(false), 2500);
  };

  const handleConfirmCancelReserva = async () => {
    if (!reservation?.id) return;
    setIsCancelingReserva(true);
    setErrorMsg(null);
    try {
      if (onCancelReservation) {
        await onCancelReservation(reservation.id);
        onClose();
        return;
      }
      const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
      const res = await fetch('/api/client/cancel-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id: reservation.id })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Não foi possível cancelar a reserva.');
      }
      onClose();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cancelar reserva.');
      setShowCancelConfirm(false);
    } finally {
      setIsCancelingReserva(false);
    }
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (hasOpenDebts) return;

    if (step === 1 && previsaoSaida) {
      if (previsaoSaida < limiteSaida || previsaoSaida > limiteChegada) {
        setErrorMsg(`Horário de saída inválido. A marina opera das ${limiteSaida} às ${limiteChegada} neste dia.`);
        return;
      }
      
      if (previsaoChegada && (previsaoChegada < limiteSaida || previsaoChegada > limiteChegada)) {
        setErrorMsg(`Horário de retorno inválido. O limite de chegada para este dia é ${limiteChegada}.`);
        return;
      }

      if (previsaoChegada && previsaoSaida >= previsaoChegada) {
        setErrorMsg('O horário de retorno deve ser posterior ao horário de saída.');
        return;
      }

      const now = new Date();
      const [hours, minutes] = previsaoSaida.split(':').map(Number);
      const resDateStr = reservation?.data; // YYYY-MM-DD
      const outputTime = resDateStr 
        ? new Date(resDateStr + 'T00:00:00') 
        : new Date();
      outputTime.setHours(hours, minutes, 0, 0);

      const diffInMinutes = (outputTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffInMinutes >= 0 && diffInMinutes < tempoHabil) {
        setErrorMsg(`O horário de previsão de saída deve ter pelo menos ${tempoHabil} minutos de antecedência.`);
        return;
      }
      if (diffInMinutes < 0) {
        setErrorMsg('O horário de previsão de saída não pode ser no passado.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };
  const handlePrev = () => setStep(prev => prev - 1);

  const incrementPessoas = () => {
    let maxCap = resolvedBoat?.capacidadePassageiros || 999;
    if (resolvedBoat?.tipo === 'jet') {
      maxCap = Math.min(maxCap, 3);
    }

    if (pessoasABordo >= maxCap) {
      if (resolvedBoat?.tipo === 'jet') {
        setErrorMsg(`A capacidade máxima permitida para Jet Ski é de ${maxCap} passageiros.`);
      } else {
        setErrorMsg(`A capacidade máxima da embarcação é de ${maxCap} passageiros.`);
      }
      return;
    }
    setErrorMsg(null);
    setPessoasABordo(prev => prev + 1);
  };
  const decrementPessoas = () => {
    setErrorMsg(null);
    setPessoasABordo(prev => (prev > 1 ? prev - 1 : 1));
  };

  const incrementBancos = () => {
    let maxCap = resolvedBoat?.capacidadePassageiros || 999;
    if (resolvedBoat?.tipo === 'jet') {
      maxCap = Math.min(maxCap, 3);
    }

    if (qtdBancos >= maxCap) {
      setErrorMsg(`O número de bancos/cadeiras não pode exceder a capacidade máxima da embarcação (${maxCap}).`);
      return;
    }
    setErrorMsg(null);
    setQtdBancos(prev => prev + 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (hasOpenDebts) {
      return;
    }

    if (!destino.trim()) {
      setErrorMsg('O destino é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
      const res = await fetch('/api/client/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: reservation.id,
          previsaoSaida,
          previsaoChegada,
          pessoasABordo: pessoasABordo.toString(),
          destino,
          acessoriosSolicitados: hasAcessorios ? {
            tenda: takeTenda,
            mesa: takeMesa,
            churrasqueira: takeChurrasqueira,
            bancos: qtdBancos > 0 ? qtdBancos : 0
          } : undefined
        })
      });

      const data = await res.json();
      if (res.status === 403 || (data?.message && (data.message.toLowerCase().includes('inadimpl') || data.message.toLowerCase().includes('aberto')))) {
        setInPlacePixCleared(false);
        setServerFinancialBlock(true);
        return;
      }
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Erro ao confirmar reserva.');
      }

      onSuccess(data?.reservation || {
        previsaoSaida,
        previsaoChegada,
        pessoasABordo: pessoasABordo.toString(),
        destino,
        acessoriosSolicitados: hasAcessorios ? {
          tenda: takeTenda,
          mesa: takeMesa,
          churrasqueira: takeChurrasqueira,
          bancos: qtdBancos > 0 ? qtdBancos : 0
        } : undefined
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => {
    return (
      <div className="flex items-center justify-between gap-2 mt-4">
        {Array.from({ length: maxSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            {step >= s && (
              <div
                className="absolute inset-0 bg-[#B69D74] transition-all duration-500 ease-out"
                style={{ width: '100%', transformOrigin: 'left' }}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const effectiveOpenValue = inlinePixFinalValue ?? totalAberto;
  const formattedOpenAmount = effectiveOpenValue > 0
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(effectiveOpenValue)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#141418] via-[#0e0e12] to-[#08080a] border border-[#B69D74]/25 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Ambient Subtle Gold Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#B69D74]/15 rounded-full blur-[65px] pointer-events-none" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/[0.06] flex flex-col shrink-0 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#B69D74]">
                  {hasOpenDebts ? 'Aviso Financeiro · Reserva Hoje' : 'Confirmação de Saída do Dia'}
                </span>
              </div>
              <h2 className="text-xl font-light text-white tracking-wide mt-0.5">
                {hasOpenDebts ? 'Quitação para Liberação' : 'Plano de Navegação'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Sucesso após pagamento PIX In-Place */}
          {inPlacePixCleared && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Pagamento confirmado! Agora conclua seu Plano de Navegação abaixo.</span>
            </div>
          )}

          {/* Current Vessel Pill / Multi-Vessel Switcher */}
          {hasMultipleBoatsToday ? (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#B69D74]" />
                  {allTodayReservations.length} Embarcações Agendadas Hoje
                </span>
                {allTodayPendingReservations.length > 0 && (
                  <span className="text-[10px] font-mono text-[#B69D74]">
                    {allTodayPendingReservations.length} pendente{allTodayPendingReservations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allTodayReservations.map((resItem: any) => {
                  const itemBoat = boats.find((b: any) => b.id === resItem.embarcacaoId);
                  const isSelected = String(resItem.id) === String(reservation.id);
                  const isConfirmed = resItem.status === 'confirmado';
                  const itemIsJet = itemBoat?.tipo === 'jet' || (itemBoat?.nome || '').toLowerCase().includes('jet');

                  return (
                    <button
                      key={resItem.id}
                      type="button"
                      disabled={isConfirmed}
                      onClick={() => {
                        if (!isConfirmed && onSelectReservation) {
                          onSelectReservation(resItem);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border text-left transition-all ${
                        isConfirmed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 opacity-80 cursor-default'
                          : isSelected
                          ? 'bg-[#B69D74]/20 border-[#B69D74] text-white shadow-[0_0_20px_rgba(182,157,116,0.2)] cursor-pointer'
                          : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-[#B69D74]/40 cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="text-xs font-semibold truncate">{formatBoatLabel(itemBoat)}</p>
                        <p className="text-[9px] font-mono uppercase tracking-wider opacity-75 truncate">
                          {isConfirmed ? 'Confirmada' : isSelected ? (itemIsJet ? 'Jet Ski · Ativo' : 'Lancha · Ativa') : 'Toque p/ confirmar'}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isSelected
                          ? 'bg-[#B69D74] text-slate-950'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {isConfirmed ? <Check className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            resolvedBoat && (
              <div className="mt-3 flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-[#B69D74]/25">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74]">
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white tracking-wide">
                      {formatBoatLabel(resolvedBoat)}
                      {resolvedBoat.modelo ? <span className="text-white/50 font-normal"> · {resolvedBoat.modelo}</span> : ''}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#B69D74]">
                      {isCurrentJet ? 'Jet Ski' : 'Lancha'} · Saída Hoje
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#B69D74]/15 border border-[#B69D74]/30 text-[9px] font-mono uppercase tracking-wider text-[#B69D74]">
                  NORMAM
                </span>
              </div>
            )
          )}

          {!hasOpenDebts && !showCancelConfirm && renderProgress()}
        </div>

        {/* Modal de Confirmação de Cancelamento Rápido */}
        {showCancelConfirm ? (
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-between animate-in fade-in duration-200">
            <div className="space-y-4 my-auto text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-medium text-white">
                Cancelar reserva de hoje?
              </h3>
              <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
                Ao cancelar sua reserva de hoje para <strong className="text-white">{formatBoatLabel(resolvedBoat)}</strong>, a marinharia será avisada imediatamente e a embarcação sairá da fila de descida.
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isCancelingReserva}
                onClick={handleConfirmCancelReserva}
                className="w-full py-3.5 px-5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCancelingReserva ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Cancelar Minha Reserva de Hoje</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isCancelingReserva}
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-xl text-xs font-medium uppercase tracking-widest transition-colors cursor-pointer"
              >
                Voltar ao Check-in
              </button>
            </div>
          </div>
        ) : hasOpenDebts ? (
          /* Body - Com Débito Financeiro (Permite gerar PIX direto no modal!) */
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-between">
            <div className="space-y-4 my-auto py-1 animate-in fade-in zoom-in-95 duration-300">
              {!inlinePixQrCode ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B69D74]/25 to-amber-500/10 border border-[#B69D74]/40 flex items-center justify-center mx-auto shadow-[0_10px_30px_rgba(182,157,116,0.2)]">
                    <ShieldAlert className="w-7 h-7 text-[#B69D74]" />
                  </div>

                  <div className="text-center space-y-1.5">
                    <h3 className="text-base font-medium text-white tracking-wide">
                      Pendência Financeira Identificada
                    </h3>
                    <p className="text-xs text-white/65 leading-relaxed max-w-xs mx-auto font-light">
                      Para liberar a descida {isCurrentJet ? 'do seu Jet Ski' : 'da sua Lancha'} e concluir o check-in de hoje, regularize o saldo vencido abaixo via PIX com liberação automática.
                    </p>
                  </div>

                  {/* Financial Summary Luxury Card */}
                  <div className="bg-white/[0.03] border border-[#B69D74]/30 rounded-2xl p-4 space-y-2.5">
                    {formattedOpenAmount && (
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                          Total Vencido p/ Liberação
                        </span>
                        <span className="text-base font-semibold text-[#B69D74] font-mono">
                          {formattedOpenAmount}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Embarcação agendada hoje</span>
                      <span className="text-white font-medium">
                        {hasMultipleBoatsToday
                          ? allTodayReservations
                              .map((r: any) => formatBoatLabel(boats.find((b: any) => b.id === r.embarcacaoId)))
                              .join(' + ')
                          : formatBoatLabel(resolvedBoat)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Destravamento do Check-in</span>
                      <span className="text-emerald-400 font-mono text-[11px]">Imediato após PIX</span>
                    </div>
                  </div>

                  {inlinePixError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center">
                      {inlinePixError}
                    </div>
                  )}
                </>
              ) : (
                /* Tela do QR Code PIX In-Place */
                <div className="space-y-4 text-center animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Aguardando pagamento PIX...
                  </div>

                  {formattedOpenAmount && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Valor para Quitação</p>
                      <p className="text-xl font-semibold text-[#B69D74] font-mono mt-0.5">{formattedOpenAmount}</p>
                    </div>
                  )}

                  <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-lg">
                    <img
                      src={inlinePixQrCode.startsWith('data:') ? inlinePixQrCode : `data:image/png;base64,${inlinePixQrCode}`}
                      alt="QR Code PIX"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {inlinePixPayload && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleCopyInlinePix}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          copiedInlinePix
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-[#B69D74] hover:brightness-110 text-slate-950'
                        }`}
                      >
                        {copiedInlinePix ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Código PIX Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar PIX Copia e Cola</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-white/50">
                        Assim que você pagar no app do seu banco, esta tela avançará automaticamente para o seu Check-in!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2 mt-3">
              {!inlinePixQrCode && (
                <button
                  type="button"
                  disabled={isGeneratingInlinePix}
                  onClick={handleGenerateInlinePix}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_10px_25px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingInlinePix ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando QR Code PIX...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Gerar PIX Agora e Liberar Check-in</span>
                    </>
                  )}
                </button>
              )}

              {onGoToPayments && (
                <button
                  type="button"
                  onClick={() => {
                    onGoToPayments();
                  }}
                  className="w-full py-3 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 hover:text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#B69D74]" />
                  <span>Ver Detalhes na Página Financeira</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-2 text-rose-400/80 hover:text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Não vou sair hoje (Cancelar reserva)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-white/40 hover:text-white/70 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center min-h-[290px]">
              {errorMsg && (
                <div className="p-4 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-[#B69D74]" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-2">Quando será o passeio?</h3>
                    <p className="text-sm text-white/40">
                      Defina o horário de saída e a previsão de retorno para <strong className="text-white/80 font-medium">{formatBoatLabel(resolvedBoat)}</strong>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#B69D74] uppercase tracking-widest mb-2">Horário de Saída</label>
                      <div className="relative">
                        <input 
                          type="time" 
                          required
                          value={previsaoSaida}
                          onChange={(e) => setPrevisaoSaida(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all text-center" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#B69D74] uppercase tracking-widest mb-2">Previsão de Retorno</label>
                      <div className="relative">
                        <input 
                          type="time" 
                          required
                          value={previsaoChegada}
                          onChange={(e) => setPrevisaoChegada(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all text-center" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[#B69D74]" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-2">Quem vai embarcar?</h3>
                    <p className="text-sm text-white/40">
                      Informe o número total de pessoas a bordo (incluindo você e o marinheiro, se houver).
                      {resolvedBoat?.tipo === 'jet' && <><br/><span className="text-rose-400/80 font-medium">Limite máximo de 3 pessoas para Jets.</span></>}
                      {resolvedBoat?.tipo !== 'jet' && resolvedBoat?.capacidadePassageiros && <><br/><span className="text-emerald-400/80 font-medium">Capacidade máxima da embarcação: {resolvedBoat.capacidadePassageiros} pessoas.</span></>}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-6 py-4">
                    <button 
                      onClick={decrementPessoas}
                      className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <div className="text-5xl font-light text-white w-20 text-center">
                      {pessoasABordo}
                    </div>
                    <button 
                      onClick={incrementPessoas}
                      className="w-14 h-14 rounded-full bg-[#B69D74]/10 hover:bg-[#B69D74]/20 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74] transition-colors active:scale-95"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                      <Navigation className="w-8 h-8 text-[#B69D74]" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-2">Para onde vamos?</h3>
                    <p className="text-sm text-white/40">Descreva o destino previsto para segurança e plano de navegação.</p>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {['Ilha da Amélia', 'Ilha do Rodeadouro', ' Dunas do Velho Chico', 'Orla de Petrolina', 'Orla de Juazeiro', 'Restaurante Flutuante'].map((sugestao) => (
                        <button
                          key={sugestao}
                          type="button"
                          onClick={() => setDestino(sugestao.trim())}
                          className={`px-3 py-1.5 rounded-full text-xs transition-all border cursor-pointer ${
                            destino === sugestao.trim()
                              ? 'bg-[#B69D74]/20 border-[#B69D74] text-[#B69D74]'
                              : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {sugestao.trim()}
                        </button>
                      ))}
                    </div>
                    <textarea
                      required
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-base focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all resize-none text-center placeholder:text-white/20"
                      placeholder="Ex: Ilha do Rodeadouro, Orla..."
                    />
                  </div>
                </div>
              )}

              {step === 4 && hasAcessorios && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-[#B69D74]" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-2">Quais acessórios levar?</h3>
                    <p className="text-sm text-white/40">
                      Selecione os itens que você deseja embarcar.
                      {resolvedBoat?.capacidadePassageiros && <><br/><span className="text-emerald-400/80 font-medium">Capacidade máxima de cadeiras/bancos: {resolvedBoat.capacidadePassageiros}.</span></>}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {embarcacaoReserva?.acessorios?.tenda && (
                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="text-white">Tenda</span>
                        <input
                          type="checkbox"
                          checked={takeTenda}
                          onChange={(e) => setTakeTenda(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#B69D74] focus:ring-[#B69D74]/50 focus:ring-offset-0"
                        />
                      </label>
                    )}

                    {embarcacaoReserva?.acessorios?.mesa && (
                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="text-white">Mesa</span>
                        <input
                          type="checkbox"
                          checked={takeMesa}
                          onChange={(e) => setTakeMesa(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#B69D74] focus:ring-[#B69D74]/50 focus:ring-offset-0"
                        />
                      </label>
                    )}

                    {embarcacaoReserva?.acessorios?.churrasqueira && (
                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="text-white">Churrasqueira</span>
                        <input
                          type="checkbox"
                          checked={takeChurrasqueira}
                          onChange={(e) => setTakeChurrasqueira(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#B69D74] focus:ring-[#B69D74]/50 focus:ring-offset-0"
                        />
                      </label>
                    )}

                    {embarcacaoReserva?.acessorios?.bancosCadeiras && (
                      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-white">Bancos/Cadeiras</span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              setErrorMsg(null);
                              setQtdBancos(prev => (prev > 0 ? prev - 1 : 0));
                            }}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-white font-medium w-4 text-center">{qtdBancos}</span>
                          <button
                            onClick={incrementBancos}
                            className="w-8 h-8 rounded-full bg-[#B69D74]/20 hover:bg-[#B69D74]/30 flex items-center justify-center text-[#B69D74] transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-4 border-t border-white/5 shrink-0 space-y-3">
              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    onClick={handlePrev}
                    disabled={isSubmitting}
                    className="px-5 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {step < maxSteps ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#B69D74] hover:bg-[#a08a65] text-slate-900 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Próximo
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting || !destino.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        {allTodayPendingReservations.length > 1
                          ? `Confirmar ${formatBoatLabel(resolvedBoat)}`
                          : 'Concluir Check-in'}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Opção discreta para cancelar a reserva caso o cliente tenha imprevisto */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-[11px] text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Teve um imprevisto e não vai navegar hoje? <span className="underline">Cancelar saída</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
