import React, { useState, useEffect } from 'react';
import { clientDB, boatDB, reservationDB } from '../db';
import { createGoogleCalendarEvent, CalendarSyncResult } from '../googleCalendar';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { X, Calendar, User, Clock, Check, FileText, CheckCircle2, Copy, Search, Wrench, AlertTriangle } from 'lucide-react';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';

interface ReservationModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// Extract first and second name only
function getFirstTwoNames(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[1]}`;
}

// Sound control logic moved to confirmation step

export default function ReservationModal({ onClose, onSuccess }: ReservationModalProps) {
  const [boats] = useState<Embarcacao[]>(() => [...boatDB.getAll()].sort((a, b) => a.nome.localeCompare(b.nome)));
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [availableOwners, setAvailableOwners] = useState<Cliente[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Custom states for searchable boat dropdown selection
  const [boatSearchQuery, setBoatSearchQuery] = useState('');
  const [isBoatDropdownOpen, setIsBoatDropdownOpen] = useState(false);
  
  const [bookingType, setBookingType] = useState<'single' | 'range' | 'distinct'>('single');
  const [distinctDates, setDistinctDates] = useState<string[]>([]);
  const [distinctInput, setDistinctInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]);
  const [observações, setObservações] = useState('');
  const [somTesteSaida, setSomTesteSaida] = useState<'ok' | 'nao_realizado'>('nao_realizado');
  const [somTesteRetorno, setSomTesteRetorno] = useState<'ok' | 'nao_realizado'>('nao_realizado');
  const [somRetirado, setSomRetirado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sound system control states moved to confirmation

  // WhatsApp Evolution API states
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Helper date range function
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates = [];
    const start = new Date(startStr + 'T12:00:00');
    const end = new Date(endStr + 'T12:00:00');
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Success flow control to display calendar generator directly
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [syncResult, setSyncResult] = useState<CalendarSyncResult | null>(null);
  const [textCopied, setTextCopied] = useState(false);

  // Update list of owners when selected boat changes
  useEffect(() => {
    if (selectedBoatId) {
      const boat = boats.find(b => b.id === selectedBoatId);
      if (boat) {
        // Find is safer and filter elements cleanly
        const owners = boat.donos
          .map(id => clientDB.getById(id))
          .filter((c): c is Cliente => c !== undefined && c !== null)
          .sort((a, b) => a.nome.localeCompare(b.nome));
        setAvailableOwners(owners);
        setSelectedClientId('');
      } else {
        setAvailableOwners([]);
      }
    } else {
      setAvailableOwners([]);
    }
  }, [selectedBoatId, boats]);

  const activeBookings = (() => {
    if (!selectedClientId) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return reservationDB.getAll().filter(
      r => r.clienteId === selectedClientId &&
      r.embarcacaoId === selectedBoatId &&
      r.status !== 'cancelado' &&
      r.data >= todayStr
    );
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedBoatId) {
      setErrorMsg('Por favor, selecione uma embarcação.');
      return;
    }
    if (!selectedClientId) {
      setErrorMsg('Por favor, selecione um coproprietário.');
      return;
    }

    const boat = boats.find(b => b.id === selectedBoatId);
    const client = availableOwners.find(c => c.id === selectedClientId);

    if (!boat) {
      setErrorMsg('Embarcação inválida.');
      return;
    }
    if (!client) {
      setErrorMsg('Coproprietário inválido.');
      return;
    }

    if (client.status === 'inativo') {
      setErrorMsg('Não é possível criar reservas para um cliente com cadastro inativo. Reative o cadastro do cliente na tela de Clientes antes de prosseguir.');
      return;
    }

    // Determine target dates
    const datesToBook = (
      bookingType === 'range' ? getDatesInRange(startDate, endDate) : 
      bookingType === 'distinct' ? distinctDates : 
      [data]
    ).filter(d => d && !isNaN(new Date(d + 'T12:00:00').getTime()));

    if (datesToBook.length === 0) {
      setErrorMsg('Data ou período de datas inválido. Certifique-se de que a data final seja igual ou posterior à data inicial.');
      return;
    }

    // Check for double reservation (strictly block any same-day double booking for the same boat)
    const existingReservations = reservationDB.getAll();
    const overlappedDates: string[] = [];

    datesToBook.forEach(d => {
      const overlap = existingReservations.some(
        r => r.embarcacaoId === selectedBoatId && 
        r.data === d && 
        r.status?.toLowerCase() !== 'cancelado'
      );
      if (overlap) {
        const pDate = new Date(d + 'T12:00:00');
        const formatted = isNaN(pDate.getTime()) ? d : pDate.toLocaleDateString('pt-BR');
        overlappedDates.push(formatted);
      }
    });

    if (overlappedDates.length > 0) {
      setErrorMsg(`A embarcação "${boat.nome}" já possui agendamentos confirmados nas seguintes datas do período: ${overlappedDates.join(', ')}.`);
      return;
    }

    // The limit check that prevented insertions was removed per user request.
    // The admin now only relies on the visual red badge warning in the UI but can force the reservation anyway.

    // Compose formatted calendar event summary using ONLY first & second names in UPPERCASE
    const shortName = getFirstTwoNames(client.nome).toUpperCase();
    const computedTitle = `${getBoatCode(boat)} - ${shortName}`;

    setIsSubmitting(true);
    try {
      const createdList: Array<{ date: string; eventId: string; boatSynced: boolean; marinaSynced: boolean; isSimulated: boolean; boatCalId: string; marinaCalId: string }> = [];

      for (const d of datesToBook) {
        // 1. Create the event on Google Calendar (real/mock)
        const result = await createGoogleCalendarEvent(boat, {
          ...client,
          nome: shortName // Send shortened name to googleCalendar!
        }, {
          embarcacaoId: selectedBoatId,
          clienteId: selectedClientId,
          data: d,
          periodo: 'dia_inteiro', // Period is irrelevant, always "dia_inteiro"
          observações,
          status: 'agendado'
        });

        // 2. Persist to local database
        const createdRes = reservationDB.create({
          embarcacaoId: selectedBoatId,
          clienteId: selectedClientId,
          data: d,
          periodo: 'dia_inteiro',
          observações,
          googleEventId: result.eventId,
          status: 'agendado',
          somRetirado: false,
          somTesteSaida: 'nao_realizado',
          somTesteRetorno: 'nao_realizado'
        });

        // ControlesSom record is no longer created here. It is created during reservation confirmation.

        createdList.push({
          date: d,
          eventId: result.eventId,
          boatSynced: result.boatCalendarSynced,
          marinaSynced: result.marinaCalendarSynced,
          isSimulated: result.isSimulated,
          boatCalId: result.boatCalendarId,
          marinaCalId: result.marinaCalendarId
        });
      }

      // Configure final combined sync result display
      if (createdList.length > 0) {
        const first = createdList[0];
        const allBoatSynced = createdList.every(c => c.boatSynced);
        const allMarinaSynced = createdList.every(c => c.marinaSynced);
        setSyncResult({
          eventId: first.eventId,
          boatCalendarSynced: allBoatSynced,
          marinaCalendarSynced: allMarinaSynced,
          isSimulated: first.isSimulated,
          boatCalendarId: first.boatCalId,
          marinaCalendarId: first.marinaCalId
        });
      }

      const formattedDates = datesToBook.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')).join(', ');
      setSuccessMsg(`Reserva efetuada e gravada com sucesso!\nDatas agendadas: ${formattedDates}\nIdentificação: ${computedTitle}`);
      setIsSuccessState(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar o agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    onSuccess(successMsg);
    onClose();
  };

  const handleWhatsAppExport = async (base64: string, boat: Embarcacao) => {
    setWhatsappStatus('sending');
    try {
      const c = availableOwners.find(owner => owner.id === selectedClientId);
      const clientName = c ? getFirstTwoNames(c.nome) : 'Cliente Desconhecido';
      
      const datesToBook = (
        bookingType === 'range' ? getDatesInRange(startDate, endDate) : 
        bookingType === 'distinct' ? distinctDates : 
        [data]
      ).filter(d => d && !isNaN(new Date(d + 'T12:00:00').getTime()));
      const datesFormatted = datesToBook.length > 0
        ? datesToBook.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')).join(', ')
        : 'Data Desconhecida';

      const res = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Image: base64, 
          groupId: boat.whatsappGroupId,
          boatName: boat.nome,
          clientName: clientName,
          dates: datesFormatted
        })
      });
      if (res.ok) {
        console.log("WhatsApp export succeeded");
        setWhatsappStatus('sent');
      } else {
        const errText = await res.text();
        console.error("WhatsApp export failed:", res.status, errText);
        setWhatsappStatus('error');
      }
    } catch (err) {
      console.error("WhatsApp export exception:", err);
      setWhatsappStatus('error');
    }
  };

  const getWhatsAppMessage = () => {
    if (!selectedBoatId || !selectedClientId) return '';
    const b = boats.find(b => b.id === selectedBoatId);
    const c = availableOwners.find(c => c.id === selectedClientId);
    if (!b || !c) return '';

    const datesToBook = (
      bookingType === 'range' ? getDatesInRange(startDate, endDate) : 
      bookingType === 'distinct' ? distinctDates : 
      [data]
    ).filter(d => d && !isNaN(new Date(d + 'T12:00:00').getTime()));
    const datesFormatted = datesToBook.length > 0
      ? datesToBook.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')).join(', ')
      : '(Selecione uma data válida)';
    const bName = b.nome.toUpperCase();
    const cName = getFirstTwoNames(c.nome).toUpperCase();

    let syncStatusText = '';
    if (syncResult) {
      if (syncResult.isSimulated) {
        syncStatusText = '✅ Sincronizado com Google Agenda';
      } else {
        const parts = [];
        if (syncResult.boatCalendarSynced) {
          parts.push(`Agenda Barco M${(b.numero || '').padStart(2, '0')}`);
        }
        if (syncResult.marinaCalendarSynced) {
          parts.push('Agenda Marina');
        }
        if (parts.length > 0) {
          syncStatusText = `✅ Sincronizado: ${parts.join(' + ')}`;
        } else {
          syncStatusText = `⚠️ Pendente de Sincronização Real`;
        }
      }
    }

    return `⛵ *CONFIRMAÇÃO DE RESERVA* ⛵\n` +
           `---------------------------------\n` +
           `🚤 *Embarcação:* ${bName}\n` +
           `👤 *Coproprietário:* ${cName} (Cota ${c.cota || 'N/A'})\n` +
           `📅 *Data(s):* ${datesFormatted}\n` +
           `⏱️ *Período:* Dia Inteiro (8h às 18h)\n` +
           `📝 *Observações:* ${observações || 'Nenhuma'}\n` +
           `---------------------------------\n` +
           `${syncStatusText}\n` +
           `_Gerado por Reservas Náuticas_`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage());
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2500);
    } catch {
      setTextCopied(false);
    }
  };

  // If succeeded, show the specialized success screen with calendar copiers
  if (isSuccessState) {
    const b = boats.find(b => b.id === selectedBoatId);
    return (
      <div id="new-reservation-success-overlay" className="fixed inset-0 z-50 grid place-items-center py-8 px-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Agendamento Realizado</h3>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 subtle-scrollbar">
            {/* Success message banner inside scrolling area */}
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/50 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 text-xs block">Gravado com Sucesso!</span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">{successMsg}</p>
              </div>
            </div>

            {/* Verification Status Banner (Internalized to scrollable content) */}
            {syncResult && (
              <div className="p-4 rounded-xl border text-xs space-y-2.5 bg-slate-50 border-slate-200">
                <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                  Sincronização com Google Agenda:
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Boat Calendar Check */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between ${
                    syncResult.isSimulated || syncResult.boatCalendarSynced 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Agenda da Embarcação {b ? `(${getBoatCode(b)})` : ''}</p>
                      <p className="text-[10px] opacity-80 font-mono mt-0.5">ID: {syncResult.boatCalendarId || 'MXX'}</p>
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border bg-white/80 shrink-0">
                      {syncResult.isSimulated || syncResult.boatCalendarSynced 
                        ? 'Sincronizado ✓' 
                        : 'RESERVA LOCAL ✗'}
                    </span>
                  </div>

                  {/* Marina Calendar Check */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between ${
                    syncResult.isSimulated || syncResult.marinaCalendarSynced 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Agenda Geral da Marina</p>
                      <p className="text-[10px] opacity-80 font-mono mt-0.5">ID: {syncResult.marinaCalendarId || 'marina'}</p>
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md border bg-white/80 shrink-0">
                      {syncResult.isSimulated || syncResult.marinaCalendarSynced 
                        ? 'Sincronizado ✓' 
                        : 'RESERVA LOCAL ✗'}
                    </span>
                  </div>
                </div>

                {/* In-depth error analysis when failures happen */}
                {(!syncResult.boatCalendarSynced || !syncResult.marinaCalendarSynced) && !syncResult.isSimulated && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-[11px] leading-relaxed">
                    <span className="font-bold block text-rose-950">Por que não foi para a agenda principal?</span>
                    <p className="mt-1 font-sans">
                      Dificuldade de autenticação real. Seu evento foi salvo localmente no banco para sua segurança.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Integration status */}
            <div className={`p-4 rounded-xl border text-sm flex flex-col md:flex-row items-center justify-between gap-4 ${
              !b?.whatsappGroupId
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : whatsappStatus === 'sent' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : whatsappStatus === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">
                  {!b?.whatsappGroupId 
                    ? '⚠️ Grupo de WhatsApp não configurado para esta embarcação.'
                    : whatsappStatus === 'idle' 
                      ? 'Pronto para enviar o calendário atualizado para o grupo.'
                      : whatsappStatus === 'sending' 
                        ? 'Enviando calendário para o grupo de WhatsApp...' 
                        : whatsappStatus === 'sent' 
                          ? '✅ Calendário mensal enviado com sucesso ao grupo!'
                          : '❌ Falha ao enviar o calendário. Tente novamente.'
                  }
                </span>
              </div>
              
              {b?.whatsappGroupId && (
                <button 
                  onClick={() => {
                    const canvas = document.querySelector('#reservation-success-calendar-container canvas') as HTMLCanvasElement;
                    if (canvas && b) {
                      setWhatsappStatus('idle'); // Reset status to allow resend
                      handleWhatsAppExport(canvas.toDataURL('image/png'), b);
                    }
                  }}
                  disabled={whatsappStatus === 'sending'}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 ${
                    whatsappStatus === 'sent' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700'
                  }`}
                >
                  {whatsappStatus === 'sending' ? 'Enviando...' : whatsappStatus === 'sent' ? 'Enviar Novamente' : 'Enviar para WhatsApp'}
                  {whatsappStatus === 'sent' && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div id="reservation-success-calendar-container" className="p-1 border border-slate-100 rounded-xl bg-slate-50/50">
              {/* Embed the beautiful monthly calendar immediately populated with the new event for copying/downloading */}
              <MonthlyCalendarGenerator 
                initialBoatId={selectedBoatId} 
                initialDate={data} 
                autoExport={false}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 pt-3 border-t border-slate-100 shrink-0 bg-slate-50/60">
            <button
               onClick={handleFinish}
               className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Concluir e Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="new-reservation-modal" className="fixed inset-0 z-50 grid place-items-center py-8 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-medium text-slate-900">Agendar Nova Reserva</h3>
          <button
            id="close-reservation-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-100 rounded-lg font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Boat Selection */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Embarcação *</label>
            
            {/* Native hidden select to support form validation and keep standard CSS selectors fully compatible */}
            <select
              id="res-select-boat"
              value={selectedBoatId}
              onChange={(e) => setSelectedBoatId(e.target.value)}
              required
              className="sr-only"
            >
              <option value="">-- Selecione a Embarcação --</option>
              {boats.map(b => (
                <option key={b.id} value={b.id}>
                  {getBoatCode(b)} ({b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})
                </option>
              ))}
            </select>

            {/* Custom Interactive Click Target Container */}
            <button
              name="select-boat"
              type="button"
              onClick={() => setIsBoatDropdownOpen(!isBoatDropdownOpen)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-left text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <span className="truncate flex items-center space-x-2">
                {selectedBoatId ? (
                  <>
                    <span>{getBoatCode(boats.find(b => b.id === selectedBoatId))} ({boats.find(b => b.id === selectedBoatId)?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})</span>
                    {boats.find(b => b.id === selectedBoatId)?.emManutencao && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs ml-2">
                        <Wrench className="w-2.5 h-2.5 mr-0.5" />
                        Manutenção
                      </span>
                    )}
                  </>
                ) : (
                  '-- Selecione a Embarcação --'
                )}
              </span>
              <span className="text-slate-400 pl-2 shrink-0">
                <Search className="w-4 h-4" />
              </span>
            </button>

            {/* Dropdown with Search Filter */}
            {isBoatDropdownOpen && (
              <>
                {/* Backdrop overlay to safely close when clicking outer areas */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => {
                    setIsBoatDropdownOpen(false);
                    setBoatSearchQuery('');
                  }} 
                />

                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Search Input Filter Panel */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou tipo..."
                      value={boatSearchQuery}
                      onChange={(e) => setBoatSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const filtered = boats.filter(b => {
                            const q = boatSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            const labelJoined = `${b.nome} ${b.tipo === 'jet' ? 'jet ski' : 'lancha'}`.toLowerCase();
                            return labelJoined.includes(q);
                          });
                          if (filtered.length === 1) {
                            setSelectedBoatId(filtered[0].id);
                            setIsBoatDropdownOpen(false);
                            setBoatSearchQuery('');
                          }
                        }
                      }}
                      className="w-full bg-transparent text-xs text-slate-800 focus:outline-none font-medium font-sans py-0.5"
                      autoFocus
                    />
                    {boatSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBoatSearchQuery('')}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* List items selection scroll list */}
                  <div className="overflow-y-auto divide-y divide-slate-50 max-h-44 text-xs font-sans subtle-scrollbar">
                    {boats
                      .filter(b => {
                        const q = boatSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        const labelJoined = `${b.nome} ${b.tipo === 'jet' ? 'jet ski' : 'lancha'}`.toLowerCase();
                        return labelJoined.includes(q);
                      })
                      .length === 0 ? (
                        <div className="p-3 text-center text-slate-400 font-sans italic">Nenhuma embarcação correspondente</div>
                      ) : (
                        boats
                          .filter(b => {
                            const q = boatSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            const labelJoined = `${b.nome} ${b.tipo === 'jet' ? 'jet ski' : 'lancha'}`.toLowerCase();
                            return labelJoined.includes(q);
                          })
                          .map(b => {
                            const isSelected = b.id === selectedBoatId;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBoatId(b.id);
                                  setIsBoatDropdownOpen(false);
                                  setBoatSearchQuery('');
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected ? 'bg-indigo-50/50 font-bold text-indigo-700' : 'text-slate-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-xs">{getBoatCode(b)} ({b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})</span>
                                  {b.emManutencao && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs">
                                      <Wrench className="w-2.5 h-2.5 mr-0.5" />
                                      Manutenção
                                    </span>
                                  )}
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })
                      )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Owner Filtered Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Coproprietário Solicitante *</label>
            <select
              id="res-select-client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={!selectedBoatId}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white disabled:opacity-50 text-slate-800"
            >
              <option value="">
                {!selectedBoatId ? 'Selecione primeiro uma embarcação...' : '-- Escolha um dos Coproprietários --'}
              </option>
              {availableOwners.map(owner => {
                const isInactive = owner.status === 'inativo';
                return (
                  <option key={owner.id} value={owner.id} disabled={isInactive}>
                    {getFirstTwoNames(owner.nome).toUpperCase()} (Cota {owner.cota || 'N/A'}){isInactive ? ' [CADASTRO INATIVO]' : ''}{owner.statusFinanceiro === 'inadimplente' ? ' (INADIMPLENTE)' : ''}
                  </option>
                );
              })}
            </select>
            {selectedBoatId && boats.find(b => b.id === selectedBoatId)?.emManutencao && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px]">Aviso de Manutenção</span>
                  <span className="leading-tight">A embarcação selecionada encontra-se em manutenção.</span>
                </div>
              </div>
            )}
            {selectedClientId && availableOwners.find(o => o.id === selectedClientId)?.status === 'inativo' && (
              <div className="mt-2 flex items-start gap-2 bg-slate-100 border border-slate-300 p-2 rounded-lg text-slate-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-slate-700">Cadastro Inativo</span>
                  <span className="leading-tight text-slate-600">Este cliente está com o cadastro inativo e não pode realizar novas reservas. Reative-o na tela de Clientes.</span>
                </div>
              </div>
            )}
            {selectedClientId && availableOwners.find(o => o.id === selectedClientId)?.statusFinanceiro === 'inadimplente' && (
              <div className="mt-2 flex items-start gap-2 bg-rose-50 border border-rose-200 p-2 rounded-lg text-rose-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px]">Aviso Financeiro</span>
                  <span className="leading-tight">Cliente Inadimplente. {availableOwners.find(o => o.id === selectedClientId)?.observacoesFinanceiras}</span>
                </div>
              </div>
            )}
            {selectedClientId && activeBookings && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold font-sans">
                <span className="text-slate-500">Agendamentos ativos (a vir):</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  activeBookings.length >= 2 
                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {activeBookings.length} {activeBookings.length === 1 ? 'ativo' : 'ativos'}
                </span>
              </div>
            )}
            {selectedBoatId && availableOwners.length === 0 && (
              <p className="text-[10px] text-rose-600 mt-1 font-sans">Este veículo não possui donos cadastrados. Cadastre-os na aba de Clientes.</p>
            )}
          </div>

          {/* Tipo de Reserva */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 font-sans">Tipo de Agendamento *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBookingType('single')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  bookingType === 'single'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dia Único
              </button>
              <button
                type="button"
                onClick={() => setBookingType('range')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  bookingType === 'range'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Período
              </button>
              <button
                type="button"
                onClick={() => setBookingType('distinct')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  bookingType === 'distinct'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dias Distintos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-150">
            {bookingType === 'single' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Data da Reserva *</label>
                <input
                  id="res-datepicker"
                  type="date"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  required
                  className="w-full h-10 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-800"
                />
              </div>
            ) : bookingType === 'range' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Data de Início *</label>
                  <input
                    id="res-start-datepicker"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setData(e.target.value); // Keep data in sync for downstream views
                    }}
                    required
                    className="w-full h-10 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Data de Término *</label>
                  <input
                    id="res-end-datepicker"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-800"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Adicionar Datas Específicas *</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={distinctInput}
                    onChange={(e) => setDistinctInput(e.target.value)}
                    className="flex-1 h-10 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (distinctInput && !distinctDates.includes(distinctInput)) {
                        setDistinctDates(prev => [...prev, distinctInput].sort());
                        setData(distinctInput); // keep data synced to last added
                      }
                    }}
                    className="px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                {distinctDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {distinctDates.map(d => (
                      <div key={d} className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 text-xs font-medium">
                        <span>{new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <button type="button" onClick={() => setDistinctDates(prev => prev.filter(x => x !== d))} className="text-indigo-500 hover:text-indigo-800 ml-1 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sound system control for M10, M18, M23, M05 */}
          {(() => {
            const selectedBoat = boats.find(b => b.id === selectedBoatId);
            if (!selectedBoat?.temSom) return null;

            return (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-amber-100/80 rounded-lg text-amber-700 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 font-sans">🔊 Controle de Som Obrigatório</h4>
                    <p className="text-[11px] text-amber-700 leading-normal font-sans">
                      A embarcação <span className="font-bold">{getBoatCode(selectedBoat)}</span> exige a remoção do equipamento de som quando não estiver em uso para fins de conservação e segurança.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center space-x-2 bg-white/60 p-2.5 rounded-lg border border-amber-100/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={somTesteSaida === 'ok'}
                      onChange={(e) => setSomTesteSaida(e.target.checked ? 'ok' : 'nao_realizado')}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700 font-sans leading-tight">
                      Som OK na Saída
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white/60 p-2.5 rounded-lg border border-amber-100/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={somTesteRetorno === 'ok'}
                      onChange={(e) => setSomTesteRetorno(e.target.checked ? 'ok' : 'nao_realizado')}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700 font-sans leading-tight">
                      Som OK no Retorno
                    </span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 bg-white/60 p-2.5 rounded-lg border border-amber-100/50">
                  <input
                    type="checkbox"
                    id="somRetiradoCheck"
                    checked={somRetirado}
                    onChange={(e) => setSomRetirado(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="somRetiradoCheck" className="text-[11px] font-semibold text-slate-700 cursor-pointer font-sans">
                    Confirmar acoplamento de som para esta saída (Equipamento liberado e testado pelo cotista)
                  </label>
                </div>
              </div>
            );
          })()}

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">Observações da Saída / Marina</label>
            <textarea
              id="res-observations"
              placeholder="Ex: Marinheiro contratado, abastecimento prévio, etc."
              value={observações}
              onChange={(e) => setObservações(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white resize-none text-slate-700 font-sans"
            />
          </div>

          {/* Simple Informational Footnote replacing the scary Google pop warning */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-[11px] text-slate-550 leading-relaxed font-sans">
            <span className="font-bold text-slate-700 block">Sincronização Integrada:</span>
            O agendamento será automaticamente sincronizado no calendário do Google Calendar e registrado na planilha mensal da embarcação.
          </div>
        </div>

        <div className="flex space-x-3 p-6 pt-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            id="btn-cancel-res"
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-submit-res"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Reservando...' : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Salvar Reserva
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
