import React, { useState } from 'react';
import { X, Calendar, Anchor, CheckCircle2, AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import { createGoogleCalendarEvent, CalendarSyncResult } from '../googleCalendar';
import { getBoatCode } from '../utils/boatUtils';
import {
  getBoatOperationRules,
  evaluateWeekendBookingForClient,
  evaluateDateRestrictionsForClient,
  formatBoatRulesSummaryBadges
} from '../utils/boatRules';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';

interface ClientReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  client: any;
  boats: any[];
  reservations?: any[];
  preselectedBoatId?: any;
  marinaDatasFechadas?: Array<{ data: string; motivo: string }>;
  clientToken?: string | null;
  onSuccess: (newRes?: any) => void;
  onGoToFinance?: () => void;
}

function getFirstTwoNames(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[1]}`;
}

export default function ClientReservationModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  client, 
  boats,
  reservations = [],
  preselectedBoatId,
  marinaDatasFechadas = [],
  clientToken,
  onSuccess,
  onGoToFinance
}: ClientReservationModalProps) {
  const [selectedBoatId, setSelectedBoatId] = useState(() => {
    if (preselectedBoatId) return preselectedBoatId;
    return boats.length > 0 ? boats[0].id : '';
  });
  const [dateValue, setDateValue] = useState(selectedDate);
  const prevIsOpenRef = React.useRef(false);

  React.useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    // Only reset state when modal transitions from closed to open
    if (isOpen && !wasOpen) {
      if (preselectedBoatId) {
        setSelectedBoatId(preselectedBoatId);
      } else if (boats.length > 0) {
        setSelectedBoatId(boats[0].id);
      }
      setDateValue(selectedDate);
      setIsSuccessState(false);
      setSuccessMsg(null);
      setErrorMsg(null);
      setConfirmExtraObj(null);
      setPaidLaunchAgreed(false);
      setCreatedFinancialTx(null);
      setObservacoes('');
      setCreatedReservation(null);
      setWhatsappStatus('idle');
      setSyncResult(null);
      setPrevisaoSaida('09:00');
      setPrevisaoChegada('');
    }
  }, [isOpen, preselectedBoatId, boats, selectedDate]);
  const [observacoes, setObservacoes] = useState('');
  const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmExtraObj, setConfirmExtraObj] = useState<{ message: string } | null>(null);
  const [paidLaunchAgreed, setPaidLaunchAgreed] = useState(false);
  const [createdFinancialTx, setCreatedFinancialTx] = useState<any>(null);

  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<CalendarSyncResult | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [createdReservation, setCreatedReservation] = useState<any>(null);

  if (!isOpen) return null;

  const formatDateBR = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleWhatsAppExport = async (base64: string, boat: any) => {
    setWhatsappStatus('sending');
    try {
      const datesFormatted = formatDateBR(dateValue);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const portalUrl = (!origin || origin.includes('localhost') || origin.includes('127.0.0.1'))
        ? 'https://mexicano.echo.dev.br/portal'
        : `${origin}/portal`;

      const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
      const res = await fetch('/api/client/send-calendar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          base64Image: base64, 
          embarcacaoId: boat.id,
          dates: datesFormatted,
          portalUrl
        })
      });
      if (res.ok) {
        setWhatsappStatus('sent');
      } else {
        setWhatsappStatus('error');
      }
    } catch (err) {
      setWhatsappStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent, isConfirmedExtra = false) => {
    e?.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedBoatId) {
      setErrorMsg('Selecione uma embarcação.');
      return;
    }

    const boat = boats.find(b => b.id === selectedBoatId);
    if (!boat) {
      setErrorMsg('Embarcação inválida.');
      return;
    }

    const boatEntryForSubmit = Array.isArray(client?.embarcacoes)
      ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === selectedBoatId)
      : (client?.embarcacaoId === selectedBoatId ? client : null);
    const isMarinaOnlySubmit = Boolean(boat?.empresas && boat.empresas.includes('MARINA') && !boat.empresas.includes('VALE'));
    const boatRulesSubmit = getBoatOperationRules(boat);

    const _nowSubmit = new Date();
    const todaySubmitStr = `${_nowSubmit.getFullYear()}-${String(_nowSubmit.getMonth() + 1).padStart(2, '0')}-${String(_nowSubmit.getDate()).padStart(2, '0')}`;

    const dateRestrSubmit = evaluateDateRestrictionsForClient({
      dateStr: dateValue,
      todayStr: todaySubmitStr,
      boat
    });
    if (!dateRestrSubmit.allowed) {
      setErrorMsg(dateRestrSubmit.reason || 'Esta data não está liberada pelas regras da embarcação.');
      return;
    }

    if (!isMarinaOnlySubmit) {
      const activeResSubmit = reservations.filter((r: any) =>
        r.clienteId === client?.id &&
        r.embarcacaoId === selectedBoatId &&
        r.status !== 'cancelado' &&
        r.data >= todaySubmitStr
      );
      if (activeResSubmit.length >= boatRulesSubmit.maxReservasAtivas) {
        const msg = boatRulesSubmit.maxReservasAtivas === 1
          ? `A embarcação ${getBoatCode(boat)} permite apenas 1 reserva ativa por vez.`
          : `Você atingiu o limite máximo de ${boatRulesSubmit.maxReservasAtivas} reservas ativas simultâneas para ${getBoatCode(boat)}.`;
        setErrorMsg(msg);
        return;
      }

      const weekendEvalSubmit = evaluateWeekendBookingForClient({
        userId: client?.id,
        embarcacaoId: selectedBoatId,
        dateStr: dateValue,
        reservations,
        boat
      });
      if (weekendEvalSubmit.isWeekend && !weekendEvalSubmit.allowed) {
        setErrorMsg(weekendEvalSubmit.blockedReason || 'Limite mensal de fim de semana atingido para esta embarcação.');
        return;
      }
    }

    const isPlanoCompletoSubmit = boatEntryForSubmit?.plano === 'completo' || (!boatEntryForSubmit?.plano && client?.plano === 'completo');
    const submitDayOfWeek = dateValue ? new Date(dateValue + 'T12:00:00Z').getUTCDay() : -1;
    const isJetSubmit = Boolean(boat && (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet')));
    const defaultFeeSubmit = isJetSubmit ? 100 : 150;
    const resolvedExtraFeeSubmit =
      boatRulesSubmit.taxaDescidaAvulsaPersonalizada !== null &&
      boatRulesSubmit.taxaDescidaAvulsaPersonalizada !== undefined &&
      Number(boatRulesSubmit.taxaDescidaAvulsaPersonalizada) >= 0
        ? Number(boatRulesSubmit.taxaDescidaAvulsaPersonalizada)
        : defaultFeeSubmit;
    const isPaidExtraDaySubmit = !isMarinaOnlySubmit && (submitDayOfWeek === 1 || submitDayOfWeek === 2) && !isPlanoCompletoSubmit && resolvedExtraFeeSubmit > 0;
    const expectedFeeSubmit = isPaidExtraDaySubmit ? resolvedExtraFeeSubmit : 0;

    if (isPaidExtraDaySubmit && !paidLaunchAgreed) {
      setErrorMsg('Revise os dados e concorde com a cobrança da descida avulsa antes de solicitar.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Salvar localmente no BD da VPS através da API Segura do Cliente
      const token = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
      const dbRes = await fetch('/api/client/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          embarcacaoId: selectedBoatId,
          date: dateValue,
          periodo: 'dia_inteiro',
          observacoes,
          previsaoSaida: previsaoSaida || '09:00',
          previsaoChegada: previsaoChegada || undefined,
          confirmExtra: isConfirmedExtra,
          confirmPaidLaunch: isPaidExtraDaySubmit ? paidLaunchAgreed : false,
          acceptedFee: isPaidExtraDaySubmit ? expectedFeeSubmit : undefined
        })
      });

      const dbData = await dbRes.json();

      if (dbRes.status === 409 && dbData.requireConfirmation) {
        setConfirmExtraObj({ message: dbData.message });
        setIsSubmitting(false);
        return;
      }
      if (dbRes.status === 409 && dbData.requirePaidLaunchConfirmation) {
        setErrorMsg(dbData.message || 'Confirme a cobrança da descida fora do plano para prosseguir.');
        setIsSubmitting(false);
        return;
      }
      setConfirmExtraObj(null); // limpa caso existisse

      if (!dbRes.ok) {
        throw new Error(dbData.message || 'Erro ao realizar o agendamento no sistema principal.');
      }
      
      setCreatedReservation(dbData.reservation);
      setCreatedFinancialTx(dbData.financialTransaction || null);

      // 2. Enviar para o Google Calendar usando o mesmo fluxo do admin
      const shortName = getFirstTwoNames(client.nome).toUpperCase();
      try {
        const calResult = await createGoogleCalendarEvent(boat, {
          ...client,
          nome: shortName
        }, {
          embarcacaoId: selectedBoatId,
          clienteId: client.id,
          data: dateValue,
          periodo: 'dia_inteiro',
          observações: observacoes,
          status: 'agendado'
        });

        // 3. Informar o servidor sobre o ID gerado pelo Google Agenda para manter a sincronia
        if (calResult.eventId) {
          await fetch('/api/client/update-reservation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: dbData.reservation.id,
              googleEventId: calResult.eventId
            })
          });
        }

        setSyncResult({
          eventId: calResult.eventId,
          boatCalendarSynced: calResult.boatCalendarSynced,
          marinaCalendarSynced: calResult.marinaCalendarSynced,
          isSimulated: calResult.isSimulated,
          boatCalendarId: calResult.boatCalendarId,
          marinaCalendarId: calResult.marinaCalendarId
        });
      } catch (calError: any) {
        console.error("Falha ao sincronizar com Google Calendar:", calError);
        // Não quebramos a reserva se o Google falhar, mas mostramos que não sincronizou
      }

      setSuccessMsg(`Reserva efetuada com sucesso para ${formatDateBR(dateValue)}!`);
      setIsSuccessState(true);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsSuccessState(false);
    onSuccess(createdReservation);
    onClose();
  };

  // TELA DE SUCESSO (Com envio de WhatsApp e Sincronização)
  if (isSuccessState) {
    const b = boats.find(b => b.id === selectedBoatId);
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center pt-[max(env(safe-area-inset-top,0px),2rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] px-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300 ios-scroll">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-[bounce_2s_ease-in-out_infinite]" />
              </div>
              <div>
                <h3 className="font-light text-white text-lg tracking-wide">Agendamento Realizado</h3>
                <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-semibold mt-0.5">Sucesso</p>
              </div>
            </div>
            <button onClick={handleFinish} className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] subtle-scrollbar">
            
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#B69D74]/20 to-transparent border border-[#B69D74]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(182,157,116,0.15)]">
                <Anchor className="w-8 h-8 text-[#B69D74]" />
              </div>
              <h2 className="text-2xl font-light text-white tracking-wide">Sua reserva foi realizada!</h2>
              <p className="text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
                A embarcação <strong className="text-white font-medium">{getBoatCode(b)}</strong> foi agendada para o dia <strong className="text-[#B69D74]">{formatDateBR(dateValue)}</strong>.
              </p>

              {/* Status do envio ao grupo de WhatsApp */}
              <div className="pt-2 flex justify-center">
                {whatsappStatus === 'sending' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Notificando grupo do WhatsApp da embarcação...</span>
                  </div>
                )}
                {whatsappStatus === 'sent' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Notificação enviada ao grupo do WhatsApp com o link do app!</span>
                  </div>
                )}
                {whatsappStatus === 'error' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Reserva salva! Grupo de WhatsApp não notificado (serviço indisponível ou sem grupo vinculado).</span>
                  </div>
                )}
              </div>
            </div>

            {createdFinancialTx && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                    Registro Financeiro Gerado
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Aguardando Pagamento
                  </span>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">
                  {createdFinancialTx.descricao}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-sm">
                  <span className="text-white/50">Valor da cobrança</span>
                  <span className="font-bold text-amber-300">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(createdFinancialTx.valor || 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Vencimento</span>
                  <span className="text-white/80 font-medium">{formatDateBR(createdFinancialTx.dataVencimento)}</span>
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mt-8">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Informações Importantes</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                  <p>Lembre-se de fazer o <strong>check-in</strong> pelo aplicativo no dia do passeio para informar a quantidade de pessoas e previsão de chegada.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                  <p>Apresente os documentos originais (Arrais) na descida da embarcação.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                  <p>Respeite a capacidade máxima da embarcação por motivos de segurança.</p>
                </li>
              </ul>
            </div>

          </div>

          <div className="p-6 border-t border-white/5 bg-[#050505] flex flex-col sm:flex-row justify-end gap-3">
            <div className="hidden">
              <MonthlyCalendarGenerator
                initialBoatId={selectedBoatId}
                initialDate={dateValue}
                autoExport={true}
                providedBoats={boats}
                providedReservations={[...reservations, createdReservation].filter(Boolean)}
                providedClients={[client]}
                marinaDatasFechadas={marinaDatasFechadas}
                onExport={(base64) => {
                  if (whatsappStatus === 'idle') {
                    handleWhatsAppExport(base64, b);
                  }
                }}
              />
            </div>
            {createdFinancialTx && onGoToFinance && (
              <button
                onClick={() => {
                  handleFinish();
                  onGoToFinance();
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-sm tracking-wide rounded-xl transition-all"
              >
                Ir para Financeiro / Pagar
              </button>
            )}
            <button
              onClick={handleFinish}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 font-bold text-sm tracking-wide rounded-xl transition-all shadow-[0_0_20px_rgba(182,157,116,0.15)]"
            >
              Concluir
            </button>
          </div>

        </div>
      </div>
    );
  }

  // TELA DE CRIAÇÃO DA RESERVA
  const _now = new Date();
  const minDateStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const selectedBoatObj = boats.find(b => b.id === selectedBoatId);
  const isBoatInMaintenance = !!selectedBoatObj?.emManutencao;
  const selectedBoatRules = getBoatOperationRules(selectedBoatObj);
  const selectedRuleBadges = formatBoatRulesSummaryBadges(selectedBoatObj);

  const clientBoatEntry = Array.isArray(client?.embarcacoes)
    ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === selectedBoatId)
    : (client?.embarcacaoId === selectedBoatId ? client : null);
  const isMarinaOnlyBoat = Boolean(selectedBoatObj?.empresas && selectedBoatObj.empresas.includes('MARINA') && !selectedBoatObj.empresas.includes('VALE'));
  const isPlanoCompleto = clientBoatEntry?.plano === 'completo' || (!clientBoatEntry?.plano && client?.plano === 'completo');
  const chosenDayOfWeek = dateValue ? new Date(dateValue + 'T12:00:00Z').getUTCDay() : -1;
  const isJetSelected = Boolean(selectedBoatObj && (selectedBoatObj.tipo === 'jet' || (selectedBoatObj.nome || '').toLowerCase().includes('jet')));
  const defaultExtraFee = isJetSelected ? 100 : 150;
  const resolvedExtraFee =
    selectedBoatRules.taxaDescidaAvulsaPersonalizada !== null &&
    selectedBoatRules.taxaDescidaAvulsaPersonalizada !== undefined &&
    Number(selectedBoatRules.taxaDescidaAvulsaPersonalizada) >= 0
      ? Number(selectedBoatRules.taxaDescidaAvulsaPersonalizada)
      : defaultExtraFee;
  const isWeeklyExtraDay = !isMarinaOnlyBoat && (chosenDayOfWeek === 1 || chosenDayOfWeek === 2) && !isPlanoCompleto && resolvedExtraFee > 0;
  const extraDayFee = isWeeklyExtraDay ? resolvedExtraFee : 0;
  const boatTypeLabel = isJetSelected ? 'Jet Ski' : 'Lancha';
  const extraDayName = chosenDayOfWeek === 1 ? 'Segunda-feira' : chosenDayOfWeek === 2 ? 'Terça-feira' : '';
  
  const specialClosedEntry = (marinaDatasFechadas || []).find(d => d.data === dateValue);
  const isSpecialClosed = !!specialClosedEntry;
  const isClosedDay = isSpecialClosed;

  const isDateOccupied = !isClosedDay && !!(selectedBoatId && dateValue && reservations.some((r: any) =>
    r.embarcacaoId === selectedBoatId && r.data === dateValue && r.status !== 'cancelado'
  ));
  const isPastDate = !!(dateValue && dateValue < minDateStr);

  const activeClientBoatReservations = selectedBoatId
    ? reservations.filter((r: any) =>
        r.clienteId === client?.id &&
        r.embarcacaoId === selectedBoatId &&
        r.status !== 'cancelado' &&
        r.data >= minDateStr
      )
    : [];
  const activeLimitExceeded = !isMarinaOnlyBoat && Boolean(selectedBoatObj) && activeClientBoatReservations.length >= selectedBoatRules.maxReservasAtivas;
  const activeLimitMessage = activeLimitExceeded
    ? (selectedBoatRules.maxReservasAtivas === 1
        ? `A embarcação ${getBoatCode(selectedBoatObj)} permite apenas 1 reserva ativa por vez. Você já possui reserva ativa em ${activeClientBoatReservations.map((r: any) => formatDateBR(r.data)).join(', ')}.`
        : `Você atingiu o limite máximo de ${selectedBoatRules.maxReservasAtivas} reservas ativas simultâneas para ${getBoatCode(selectedBoatObj)}.`)
    : null;

  const dateRestrictionEval = selectedBoatObj && dateValue
    ? evaluateDateRestrictionsForClient({ dateStr: dateValue, todayStr: minDateStr, boat: selectedBoatObj })
    : { allowed: true };
  const weekendEval = !isMarinaOnlyBoat && selectedBoatObj && dateValue
    ? evaluateWeekendBookingForClient({
        userId: client?.id,
        embarcacaoId: selectedBoatId,
        dateStr: dateValue,
        reservations,
        boat: selectedBoatObj
      })
    : { isWeekend: false, allowed: true, tipoReserva: 'garantida' as const };

  const ruleBlockReason =
    activeLimitMessage ||
    (!dateRestrictionEval.allowed ? (dateRestrictionEval.reason || 'Data não permitida pelas regras da embarcação.') : null) ||
    (weekendEval.isWeekend && !weekendEval.allowed ? (weekendEval.blockedReason || 'Cota mensal de fim de semana atingida.') : null) ||
    null;
  const isRuleBlocked = Boolean(ruleBlockReason);

  const isSelectionInvalid = isBoatInMaintenance || isClosedDay || isDateOccupied || isPastDate || isRuleBlocked;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center pt-[max(env(safe-area-inset-top,0px),2rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 ios-scroll">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-light text-white tracking-wide">Nova Reserva</h3>
            <p className="text-xs text-[#B69D74] mt-0.5 uppercase tracking-widest font-semibold">
              {formatDateBR(dateValue)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cliente (ReadOnly) */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Cotista Solicitante
              </label>
              <div className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white/70 text-sm font-medium">
                {client.nome}
              </div>
            </div>

            {/* Data do Passeio */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Data do Agendamento
              </label>
              <input
                type="date"
                min={minDateStr}
                value={dateValue}
                onChange={(e) => {
                  setDateValue(e.target.value);
                  setConfirmExtraObj(null);
                  setPaidLaunchAgreed(false);
                  setErrorMsg(null);
                }}
                className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none"
                required
              />
              {isSpecialClosed ? (
                <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  A marina estará fechada nesta data{specialClosedEntry?.motivo ? ` (${specialClosedEntry.motivo})` : ''}.
                </p>
              ) : isWeeklyExtraDay ? (
                <p className="mt-2 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Descida às segundas e terças não está inclusa no plano atual. Cobrança avulsa de R$ {extraDayFee},00 ({boatTypeLabel}).
                </p>
              ) : null}
              {!isClosedDay && isDateOccupied && (
                <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Esta data já possui reserva ativa para a embarcação selecionada.
                </p>
              )}
            </div>

            {/* Embarcação Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Embarcação
              </label>
              {boats.length === 1 ? (
                <div className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-medium flex items-center">
                  <Anchor className="w-4 h-4 text-[#B69D74] mr-3" />
                  {getBoatCode(boats[0])}
                </div>
              ) : (
                <select
                  value={selectedBoatId}
                  onChange={(e) => {
                    setSelectedBoatId(e.target.value);
                    setConfirmExtraObj(null);
                    setPaidLaunchAgreed(false);
                    setErrorMsg(null);
                  }}
                  className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Selecione sua Embarcação --</option>
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>
                      {getBoatCode(b)}{b.modelo ? ` · ${b.modelo}` : ''}{b.emManutencao ? ' (Em Manutenção)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {isBoatInMaintenance && (
                <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Embarcação em Manutenção</span>
                    <span className="leading-tight">Esta embarcação encontra-se em manutenção no momento. Novos agendamentos estão temporariamente bloqueados até a conclusão dos reparos.</span>
                  </div>
                </div>
              )}
              {selectedBoatObj && !isMarinaOnlyBoat && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${
                    activeLimitExceeded
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/[0.04] border-white/10 text-white/60'
                  }`}>
                    {selectedRuleBadges.activeLimitLabel} ({activeClientBoatReservations.length}/{selectedBoatRules.maxReservasAtivas})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-white/60">
                    {selectedRuleBadges.weekendRuleLabel}
                  </span>
                </div>
              )}
              {isRuleBlocked && ruleBlockReason && (
                <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-400 mb-0.5">
                      Regra de Operação da Embarcação
                    </span>
                    <span className="leading-relaxed">{ruleBlockReason}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Horários de Descida e Retorno */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Previsão Descida
                </label>
                <input
                  type="time"
                  value={previsaoSaida}
                  onChange={(e) => setPrevisaoSaida(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Previsão Retorno
                </label>
                <input
                  type="time"
                  value={previsaoChegada}
                  onChange={(e) => setPrevisaoChegada(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Observações (Opcional)
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-3.5 w-4 h-4 text-white/30" />
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Levarei 4 convidados..."
                  className="w-full pl-11 pr-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none transition-colors min-h-[100px] resize-none"
                />
              </div>
            </div>

            {/* Revisão e Concordância de Cobrança (Seg/Ter fora do plano) */}
            {isWeeklyExtraDay && !isSelectionInvalid && selectedBoatObj && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Revisão de Cobrança · Descida Fora do Plano
                    </h4>
                    <p className="text-xs text-white/75 mt-1 leading-relaxed">
                      Esta descida de embarcação não está inclusa no seu plano atual (válido de quarta a domingo). Ao prosseguir, será gerado um registro financeiro para pagamento.
                    </p>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">Embarcação ({boatTypeLabel})</span>
                    <span className="text-white font-medium">{getBoatCode(selectedBoatObj)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Data ({extraDayName})</span>
                    <span className="text-white font-medium">{formatDateBR(dateValue)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-white/40 pt-1 border-t border-white/5">
                    <span>Tabela avulsa</span>
                    <span>Jet Ski: R$ 100,00 · Lancha: R$ 150,00</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/10">
                    <span className="text-amber-300 font-semibold">Valor da Cobrança</span>
                    <span className="text-base font-bold text-amber-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraDayFee)}
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={paidLaunchAgreed}
                    onChange={(e) => {
                      setPaidLaunchAgreed(e.target.checked);
                      setErrorMsg(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-amber-500/50 bg-black/50 text-[#B69D74] focus:ring-[#B69D74]"
                  />
                  <span className="text-xs text-white/85 leading-relaxed">
                    Revisei os dados acima, estou ciente de que a descida não está inclusa no plano atual e concordo com a geração da cobrança de{' '}
                    <strong className="text-amber-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraDayFee)}
                    </strong>{' '}
                    no meu financeiro.
                  </span>
                </label>
              </div>
            )}

            {/* Extras Confirmation */}
            {confirmExtraObj && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-3 text-amber-500">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-sm leading-relaxed">{confirmExtraObj.message}</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmExtraObj(null)}
                    className="px-4 py-2 text-sm font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors flex items-center"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      'Estou ciente, prosseguir'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Footer / Button */}
            {!confirmExtraObj && (
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBoatId || isSelectionInvalid || (isWeeklyExtraDay && !paidLaunchAgreed)}
                  className="w-full py-4 rounded-xl bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(182,157,116,0.15)] flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : isWeeklyExtraDay ? (
                    `Concordar e Solicitar Descida (R$ ${extraDayFee},00)`
                  ) : (
                    'Confirmar Reserva'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
