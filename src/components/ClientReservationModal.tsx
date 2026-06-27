import React, { useState } from 'react';
import { X, Calendar, Anchor, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { createGoogleCalendarEvent, CalendarSyncResult } from '../googleCalendar';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';

interface ClientReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  client: any;
  boats: any[];
  onSuccess: () => void;
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
  onSuccess 
}: ClientReservationModalProps) {
  const [selectedBoatId, setSelectedBoatId] = useState(boats.length === 1 ? boats[0].id : '');
  const [observacoes, setObservacoes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<CalendarSyncResult | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!isOpen) return null;

  const formatDateBR = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleWhatsAppExport = async (base64: string, boat: any) => {
    setWhatsappStatus('sending');
    try {
      const clientName = getFirstTwoNames(client.nome);
      const datesFormatted = formatDateBR(selectedDate);

      const token = localStorage.getItem('client_token');
      const res = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          base64Image: base64, 
          groupId: boat.whatsappGroupId,
          boatName: boat.nome,
          clientName: clientName,
          dates: datesFormatted
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setIsSubmitting(true);

    try {
      // 1. Salvar localmente no BD da VPS através da API Segura do Cliente
      const token = localStorage.getItem('client_token');
      const dbRes = await fetch('/api/client/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          embarcacaoId: selectedBoatId,
          date: selectedDate,
          periodo: 'dia_inteiro',
          observacoes
        })
      });

      const dbData = await dbRes.json();

      if (!dbRes.ok) {
        throw new Error(dbData.message || 'Erro ao realizar o agendamento no sistema principal.');
      }

      // 2. Enviar para o Google Calendar usando o mesmo fluxo do admin
      const shortName = getFirstTwoNames(client.nome).toUpperCase();
      try {
        const calResult = await createGoogleCalendarEvent(boat, {
          ...client,
          nome: shortName
        }, {
          embarcacaoId: selectedBoatId,
          clienteId: client.id,
          data: selectedDate,
          periodo: 'dia_inteiro',
          observações: observacoes,
          status: 'confirmado'
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

      setSuccessMsg(`Reserva efetuada com sucesso para ${formatDateBR(selectedDate)}!`);
      setIsSuccessState(true);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  // TELA DE SUCESSO (Com envio de WhatsApp e Sincronização)
  if (isSuccessState) {
    const b = boats.find(b => b.id === selectedBoatId);
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center py-8 px-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
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
              <h2 className="text-2xl font-light text-white tracking-wide">Sua reserva está confirmada!</h2>
              <p className="text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
                A embarcação <strong className="text-white font-medium">{b?.nome}</strong> foi agendada para o dia <strong className="text-[#B69D74]">{formatDateBR(selectedDate)}</strong>.
              </p>
            </div>

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

          <div className="p-6 border-t border-white/5 bg-[#050505] flex justify-end">
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
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center py-8 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-light text-white tracking-wide">Nova Reserva</h3>
            <p className="text-xs text-[#B69D74] mt-0.5 uppercase tracking-widest font-semibold">
              {formatDateBR(selectedDate)}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente (ReadOnly) */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Cotista Solicitante
              </label>
              <div className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white/70 text-sm font-medium">
                {client.nome}
              </div>
            </div>

            {/* Embarcação Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Embarcação
              </label>
              {boats.length === 1 ? (
                <div className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-medium flex items-center">
                  <Anchor className="w-4 h-4 text-[#B69D74] mr-3" />
                  {boats[0].nome}
                </div>
              ) : (
                <select
                  value={selectedBoatId}
                  onChange={(e) => setSelectedBoatId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] focus:outline-none appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Selecione sua Embarcação --</option>
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              )}
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

            {/* Footer / Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedBoatId}
                className="w-full py-4 rounded-xl bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(182,157,116,0.15)] flex justify-center items-center"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  'Confirmar Reserva'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
