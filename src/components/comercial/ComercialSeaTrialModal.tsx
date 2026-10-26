import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Ship,
  FileText,
  Search,
  ChevronDown,
  Check,
  Send,
  Copy,
  Loader2
} from 'lucide-react';
import { LeadComercial, Embarcacao, Cliente } from '../../types';
import { boatDB, clientDB, reservationDB, onDbUpdate, syncWithRemote } from '../../db';
import { MEXICANO_INTERNAL_CLIENT_ID, MEXICANO_INTERNAL_CLIENT_NAME } from '../../utils/constants';
import { createGoogleCalendarEvent } from '../../googleCalendar';
import MonthlyCalendarGenerator from '../MonthlyCalendarGenerator';

interface SearchableBoatSelectProps {
  boats: Embarcacao[];
  selectedBoatId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  loading?: boolean;
}

function SearchableBoatSelect({
  boats,
  selectedBoatId,
  onSelect,
  placeholder = "Buscar e selecionar embarcação...",
  loading = false
}: SearchableBoatSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBoat = useMemo(() => {
    if (!selectedBoatId) return undefined;
    const term = selectedBoatId.trim().toLowerCase();
    return (
      boats.find(b => b.id === selectedBoatId) ||
      boats.find(b => b.id.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase().includes(term))
    );
  }, [boats, selectedBoatId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const normalizeStr = (str: string) =>
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredBoats = useMemo(() => {
    if (!search.trim()) return boats;
    const q = normalizeStr(search);
    return boats.filter(b => 
      normalizeStr(b.nome).includes(q) || 
      (b.modelo && normalizeStr(b.modelo).includes(q))
    );
  }, [boats, search]);

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full px-3 py-2 border rounded-xl bg-white flex items-center justify-between transition-all cursor-pointer text-left ${
          isOpen
            ? 'border-[#2D0A16] ring-1 ring-[#2D0A16] shadow-xs'
            : 'border-stone-200 hover:border-stone-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {loading ? (
            <div className="flex items-center gap-2 text-stone-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Carregando embarcações...</span>
            </div>
          ) : selectedBoat ? (
            <>
              <span className="text-sm shrink-0">{selectedBoat.tipo === 'jet' ? '🌊' : '🚤'}</span>
              <span className="font-semibold text-stone-900 truncate">{selectedBoat.nome}</span>
              {selectedBoat.modelo && (
                <span className="text-[11px] text-stone-400 truncate hidden sm:inline">
                  • {selectedBoat.modelo}
                </span>
              )}
            </>
          ) : (
            <span className="text-stone-400 select-none">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-stone-700' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digite o nome ou modelo da embarcação..."
              className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden"
              onClick={e => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {loading ? (
              <div className="p-4 text-center text-stone-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                <span>Carregando frota de embarcações...</span>
              </div>
            ) : filteredBoats.length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-xs">
                {search.trim() ? `Nenhuma embarcação encontrada para "${search}"` : 'Nenhuma embarcação cadastrada'}
              </div>
            ) : (
              filteredBoats.map(boat => {
                const isSelected = selectedBoat?.id === boat.id;
                return (
                  <button
                    key={boat.id}
                    type="button"
                    onClick={() => {
                      onSelect(boat.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-[#2D0A16]/5 text-[#2D0A16] font-semibold'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{boat.tipo === 'jet' ? '🌊' : '🚤'}</span>
                      <span className="truncate">{boat.nome}</span>
                      {boat.modelo && (
                        <span className="text-[10px] text-stone-400 truncate">
                          ({boat.modelo})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#2D0A16] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ComercialSeaTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: LeadComercial | null;
  initialBoatId?: string | null;
  providedBoats?: Embarcacao[];
  onSuccess?: () => void;
}

export default function ComercialSeaTrialModal({
  isOpen,
  onClose,
  initialLead,
  initialBoatId,
  providedBoats,
  onSuccess
}: ComercialSeaTrialModalProps) {
  // Lista de embarcações com reatividade total
  const [boats, setBoats] = useState<Embarcacao[]>(() => {
    const list = providedBoats && providedBoats.length > 0 ? providedBoats : (boatDB.getAll() as Embarcacao[]);
    return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  });
  const [loadingBoats, setLoadingBoats] = useState<boolean>(false);

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadNome, setLeadNome] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [dataVisita, setDataVisita] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Estados da tela de sucesso e integração WhatsApp
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [textCopied, setTextCopied] = useState<boolean>(false);

  // Atualiza boats quando providedBoats mudar ou quando o modal abrir
  useEffect(() => {
    if (providedBoats && providedBoats.length > 0) {
      setBoats([...providedBoats].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
    } else {
      const current = boatDB.getAll() as Embarcacao[];
      if (current.length > 0) {
        setBoats([...current].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      } else if (isOpen) {
        setLoadingBoats(true);
        syncWithRemote()
          .then(() => {
            const fresh = boatDB.getAll() as Embarcacao[];
            setBoats([...fresh].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
          })
          .finally(() => setLoadingBoats(false));
      }
    }
  }, [providedBoats, isOpen]);

  // Listener para atualizações em tempo real do banco de dados
  useEffect(() => {
    const unsub = onDbUpdate(() => {
      const fresh = providedBoats && providedBoats.length > 0 ? providedBoats : (boatDB.getAll() as Embarcacao[]);
      if (fresh.length > 0) {
        setBoats([...fresh].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
      }
    });
    return unsub;
  }, [providedBoats]);

  // Helper para localizar embarcação por ID, código ou nome
  const resolveBoatId = (rawIdOrName?: string | null): string => {
    if (!rawIdOrName || boats.length === 0) return '';
    const term = rawIdOrName.trim().toLowerCase();
    const found =
      boats.find(b => b.id === rawIdOrName) ||
      boats.find(b => b.id.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase().includes(term));
    return found ? found.id : rawIdOrName;
  };

  // Sincroniza e pré-preenche sempre que o modal abre ou initialLead/initialBoatId mudam
  useEffect(() => {
    if (isOpen) {
      setIsSuccessState(false);
      setWhatsappStatus('idle');
      setTextCopied(false);

      if (initialLead) {
        setSelectedLeadId(initialLead.id || '');
        setLeadNome(initialLead.nome || '');

        const target =
          (initialLead.embarcacoesInteresse && initialLead.embarcacoesInteresse.length > 0
            ? initialLead.embarcacoesInteresse[0]
            : initialBoatId) || (boats.length > 0 ? boats[0].id : '');

        const resolved = resolveBoatId(target);
        if (resolved) {
          setSelectedBoatId(resolved);
        } else if (boats.length > 0) {
          setSelectedBoatId(boats[0].id);
        }

        if (initialLead.dataVisitaAgendada) {
          const dt = initialLead.dataVisitaAgendada.split('T')[0];
          if (dt) setDataVisita(dt);
        }
      } else if (initialBoatId) {
        setSelectedBoatId(resolveBoatId(initialBoatId) || initialBoatId);
      } else if (boats.length > 0) {
        setSelectedBoatId(boats[0].id);
      }
    }
  }, [isOpen, initialLead, initialBoatId, boats.length]);

  // Se boats carregou depois e selectedBoatId ainda está vazio ou precisa de resolução
  useEffect(() => {
    if (boats.length > 0 && !selectedBoatId) {
      const target =
        (initialLead?.embarcacoesInteresse && initialLead.embarcacoesInteresse.length > 0
          ? initialLead.embarcacoesInteresse[0]
          : initialBoatId) || boats[0].id;
      const resolved = resolveBoatId(target) || boats[0].id;
      setSelectedBoatId(resolved);
    }
  }, [boats, selectedBoatId, initialLead, initialBoatId]);

  const selectedBoat = useMemo(() => {
    if (!selectedBoatId) return boats[0];
    const term = selectedBoatId.trim().toLowerCase();
    return (
      boats.find(b => b.id === selectedBoatId) ||
      boats.find(b => b.id.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase() === term) ||
      boats.find(b => b.nome.toLowerCase().includes(term)) ||
      boats[0]
    );
  }, [boats, selectedBoatId]);

  // Checagem em tempo real de reservas de cotistas na data selecionada
  const conflitoReserva = useMemo(() => {
    if (!selectedBoatId || !dataVisita) return null;
    const boatIdToMatch = selectedBoat?.id || selectedBoatId;
    const cotistaReservas = reservationDB.getAll().filter(
      r => r.embarcacaoId === boatIdToMatch &&
           r.data === dataVisita &&
           r.status !== 'cancelado' &&
           r.clienteId !== MEXICANO_INTERNAL_CLIENT_ID
    );
    if (cotistaReservas.length === 0) return null;
    const cliente = clientDB.getById(cotistaReservas[0].clienteId);
    return {
      reserva: cotistaReservas[0],
      clienteNome: cliente?.nome || 'Cotista'
    };
  }, [selectedBoatId, selectedBoat, dataVisita]);

  const handleAgendar = async () => {
    if (!leadNome.trim()) {
      alert("Informe o nome do lead / interessado.");
      return;
    }
    const boatIdFinal = selectedBoat?.id || selectedBoatId;
    if (!boatIdFinal) {
      alert("Selecione uma embarcação.");
      return;
    }
    if (!dataVisita) {
      alert("Selecione a data da reserva.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('client_token') || '';
      const leadIdentifier = leadNome.trim();
      const obsTexto = observacoes.trim();
      const obsFinal = `[VISITA COMERCIAL] Lead: ${leadIdentifier}${obsTexto ? ` - ${obsTexto}` : ''}`;

      // 1. Criar reserva oficial no reservationDB (como qualquer reserva feita pela administração)
      reservationDB.create({
        embarcacaoId: boatIdFinal,
        clienteId: MEXICANO_INTERNAL_CLIENT_ID,
        data: dataVisita,
        periodo: 'dia_inteiro',
        observações: obsFinal,
        status: 'agendado',
        somRetirado: false,
        somTesteSaida: 'nao_realizado',
        somTesteRetorno: 'nao_realizado'
      });

      // 2. Se integrado ao Google Calendar, sincronizar evento
      try {
        const clienteMexicano = clientDB.getById(MEXICANO_INTERNAL_CLIENT_ID) || {
          id: MEXICANO_INTERNAL_CLIENT_ID,
          nome: `${MEXICANO_INTERNAL_CLIENT_NAME} (Lead: ${leadIdentifier})`,
          telefone: '',
          email: '',
          cpf: '',
          status: 'ativo' as const
        };
        if (selectedBoat) {
          createGoogleCalendarEvent(selectedBoat, clienteMexicano as Cliente, dataVisita, 'dia_inteiro', obsFinal).catch(err => {
            console.warn('Sincronização Google Calendar ignorada:', err);
          });
        }
      } catch (calErr) {
        console.warn('Erro ao invocar Google Calendar:', calErr);
      }

      // 3. Se houver vínculo com o lead, atualizar etapa do funil e registrar timeline
      if (selectedLeadId) {
        try {
          await fetch(`/api/leads/${selectedLeadId}/etapa`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              etapaFunil: 'visita_agendada',
              dataVisitaAgendada: `${dataVisita}T10:00:00`
            })
          });

          const dataBr = new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR');
          await fetch(`/api/leads/${selectedLeadId}/timeline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              tipo: 'visita',
              titulo: 'Visita Agendada na Marina',
              descricao: `Reserva criada para ${dataBr} na embarcação ${selectedBoat?.nome || ''}.${obsTexto ? ` Obs: ${obsTexto}` : ''}`,
              autorNome: 'Comercial'
            })
          });
        } catch (leadSyncErr) {
          console.warn('Falha ao atualizar dados do lead:', leadSyncErr);
        }
      }

      // Notifica o callback pai e abre tela de sucesso com o calendário
      if (onSuccess) onSuccess();
      setIsSuccessState(true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Falha ao criar reserva comercial.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppExport = async (base64: string, boat: Embarcacao) => {
    if (!boat.whatsappGroupId) {
      alert("Grupo de WhatsApp não configurado para esta embarcação no cadastro.");
      return;
    }
    setWhatsappStatus('sending');
    try {
      const datesFormatted = new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR');
      const token = localStorage.getItem('admin_token') || localStorage.getItem('client_token') || '';
      const res = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          base64Image: base64,
          groupId: boat.whatsappGroupId,
          boatName: boat.nome,
          clientName: `Lead: ${leadNome.trim()}`,
          dates: datesFormatted,
          caption: `⛵ *NOVO AGENDAMENTO DE VISITA / DEMONSTRAÇÃO* ⛵\n` +
                   `---------------------------------\n` +
                   `🚤 *Embarcação:* ${boat.nome.toUpperCase()}\n` +
                   `👤 *Interessado / Lead:* ${leadNome.trim()}\n` +
                   `📅 *Data da Visita:* ${datesFormatted}\n` +
                   `⏱️ *Período:* Dia Inteiro\n` +
                   `📝 *Observações:* ${observacoes.trim() || 'Visita comercial / demonstração de cota'}\n` +
                   `---------------------------------\n` +
                   `_Atualização da Agenda Náutica_`
        })
      });

      if (res.ok) {
        setWhatsappStatus('sent');
      } else {
        const errText = await res.text();
        console.error("WhatsApp export failed:", res.status, errText);
        setWhatsappStatus('error');
      }
    } catch (err) {
      console.error("WhatsApp export error:", err);
      setWhatsappStatus('error');
    }
  };

  const handleCopyText = async () => {
    try {
      const datesFormatted = new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR');
      const msg = `⛵ *NOVO AGENDAMENTO DE VISITA / DEMONSTRAÇÃO* ⛵\n` +
                  `---------------------------------\n` +
                  `🚤 *Embarcação:* ${(selectedBoat?.nome || '').toUpperCase()}\n` +
                  `👤 *Interessado / Lead:* ${leadNome.trim()}\n` +
                  `📅 *Data da Visita:* ${datesFormatted}\n` +
                  `⏱️ *Período:* Dia Inteiro\n` +
                  `📝 *Observações:* ${observacoes.trim() || 'Visita comercial / demonstração de cota'}\n` +
                  `---------------------------------\n` +
                  `_Atualização da Agenda Náutica_`;
      await navigator.clipboard.writeText(msg);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2500);
    } catch {
      setTextCopied(false);
    }
  };

  const handleFinish = () => {
    setIsSuccessState(false);
    onClose();
  };

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isSuccessState) handleFinish();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSuccessState]);

  if (!isOpen) return null;

  // Tela de Sucesso com Calendário Mensal e Envio para WhatsApp
  if (isSuccessState) {
    const datesFormatted = new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR');
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto cursor-pointer"
        onClick={handleFinish}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto cursor-default"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Visita Agendada com Sucesso!</h3>
                <p className="text-[11px] text-stone-500">
                  Reserva gravada no sistema para {datesFormatted} • {selectedBoat?.nome}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="w-7 h-7 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 subtle-scrollbar">
            {/* Card de Notificação WhatsApp */}
            <div className="p-4 rounded-xl border bg-stone-50/80 border-stone-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2D0A16]/10 text-[#2D0A16] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-xs block">
                    Notificação do Grupo no WhatsApp
                  </span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {!selectedBoat?.whatsappGroupId
                      ? '⚠️ Grupo de WhatsApp não vinculado no cadastro desta embarcação.'
                      : whatsappStatus === 'idle'
                      ? `Pronto para enviar o calendário mensal atualizado com a reserva de ${leadNome}.`
                      : whatsappStatus === 'sending'
                      ? 'Enviando imagem do calendário ao grupo de cotistas...'
                      : whatsappStatus === 'sent'
                      ? '✅ Calendário mensal e notificação enviados com sucesso ao grupo!'
                      : '❌ Falha ao enviar o calendário. Verifique a Evolution API.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {textCopied ? 'Copiado!' : 'Copiar Texto'}
                </button>

                {selectedBoat?.whatsappGroupId && (
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = document.querySelector('#crm-reservation-success-calendar-container canvas') as HTMLCanvasElement;
                      if (canvas && selectedBoat) {
                        handleWhatsAppExport(canvas.toDataURL('image/png'), selectedBoat);
                      } else {
                        alert("Aguarde a renderização do calendário para enviar.");
                      }
                    }}
                    disabled={whatsappStatus === 'sending'}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs ${
                      whatsappStatus === 'sent'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#2D0A16] hover:bg-[#3B0D1E] text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {whatsappStatus === 'sending'
                      ? 'Enviando...'
                      : whatsappStatus === 'sent'
                      ? 'Enviar Novamente'
                      : 'Enviar Calendário ao Grupo'}
                  </button>
                )}
              </div>
            </div>

            {/* Calendário Mensal Renderizado */}
            <div id="crm-reservation-success-calendar-container" className="p-1 border border-stone-200 rounded-xl bg-white shadow-xs overflow-hidden">
              <MonthlyCalendarGenerator
                initialBoatId={selectedBoat?.id || selectedBoatId}
                initialDate={dataVisita}
                autoExport={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-stone-100 bg-stone-50/60 shrink-0">
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 bg-[#2D0A16] hover:bg-[#3B0D1E] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulário Inicial de Agendamento
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-stone-200/90 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-[#2D0A16] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Agendar Visita / Reserva de Lead</h3>
              <p className="text-[11px] text-stone-500">
                Reserva na marina para demonstração ao cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário Simples */}
        <div className="space-y-3.5 text-xs">
          {/* Nome do Lead */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1">
              Lead / Interessado <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={leadNome}
              onChange={e => setLeadNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silva"
              className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-[#2D0A16] transition-colors"
            />
          </div>

          {/* Embarcação Pesquisável */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1">
              Embarcação <span className="text-rose-500">*</span>
            </label>
            <SearchableBoatSelect
              boats={boats}
              selectedBoatId={selectedBoatId}
              onSelect={setSelectedBoatId}
              placeholder="Buscar e selecionar embarcação..."
              loading={loadingBoats}
            />

            {/* Pílulas de atalho com os barcos de interesse do lead */}
            {initialLead?.embarcacoesInteresse && initialLead.embarcacoesInteresse.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-stone-400 font-medium">Interesse do lead:</span>
                {initialLead.embarcacoesInteresse.map(rawBoat => {
                  const bId = resolveBoatId(rawBoat);
                  const b = boats.find(boat => boat.id === bId) || boats.find(boat => boat.id === rawBoat);
                  const boatDisplayName = b ? b.nome : rawBoat;
                  const isSelected = selectedBoat?.id === (b?.id || rawBoat) || selectedBoatId === (b?.id || rawBoat);
                  return (
                    <button
                      key={rawBoat}
                      type="button"
                      onClick={() => setSelectedBoatId(b?.id || rawBoat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-[#2D0A16] text-white border-[#2D0A16]'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {boatDisplayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Data da Reserva */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1">
              Data da Visita <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dataVisita}
              onChange={e => setDataVisita(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:border-[#2D0A16] transition-colors"
            />
          </div>

          {/* Status de Disponibilidade na Marina */}
          {conflitoReserva ? (
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold">Aviso de Agenda:</span> Já existe reserva de cotista ({conflitoReserva.clienteNome}) nesta data. Alinhe com a Marina antes da demonstração.
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-600 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="text-[11px]">Embarcação sem conflito de reservas nesta data.</span>
            </div>
          )}

          {/* Observações Opcionais */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1">
              Observações <span className="text-stone-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex: Demonstração de cota, teste de motor..."
              rows={2}
              className="w-full p-2.5 border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#2D0A16] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 cursor-pointer font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAgendar}
            disabled={loading || !leadNome.trim() || !(selectedBoat?.id || selectedBoatId) || !dataVisita}
            className="px-4 py-2 bg-[#2D0A16] hover:bg-[#3B0D1E] text-white rounded-xl cursor-pointer font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Confirmar Reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ComercialTestDriveModal = ComercialSeaTrialModal;
