import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Kanban,
  List,
  Phone,
  Mail,
  MapPin,
  Ship,
  Sparkles,
  Calendar,
  Clock,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Share2,
  ExternalLink,
  Plus,
  Send,
  Trash2,
  Award,
  Compass,
  Anchor,
  HelpCircle,
  Lock,
  RefreshCw,
  Flame,
  Sun,
  Snowflake,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  CalendarClock,
  Tag,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { LeadComercial, EtapaFunilLead, Embarcacao, Cliente } from '../../types';
import { boatDB, clientDB } from '../../db';
import { getBoatEstoqueResumo, getBoatCotasStatusList } from '../../utils/cotaUtils';
import ComercialPropostaDrawer from './ComercialPropostaDrawer';
import ComercialSeaTrialModal from './ComercialSeaTrialModal';
import ComercialVendaDrawer from './ComercialVendaDrawer';

interface ComercialCrmPageProps {
  onOpenProposta?: (lead?: LeadComercial, boatId?: string) => void;
  onOpenTestDrive?: (lead?: LeadComercial, boatId?: string) => void;
  onOpenSeaTrial?: (lead?: LeadComercial, boatId?: string) => void;
  onOpenVenda?: (lead?: LeadComercial, boatId?: string) => void;
  operadorNome?: string;
}

// 7 Etapas Oficiais do Funil Náutico El Mexicano (Paleta Neutra & Suave Vila Náutica)
const ETAPAS: {
  id: EtapaFunilLead;
  label: string;
  sublabel: string;
}[] = [
  {
    id: 'novo',
    label: 'Novos Leads',
    sublabel: 'Instagram / Catálogo / Indicação'
  },
  {
    id: 'qualificacao',
    label: 'Em Qualificação',
    sublabel: 'WhatsApp & Perfil Náutico'
  },
  {
    id: 'visita_agendada',
    label: 'Visita / Test Drive',
    sublabel: 'Presença na Marina confirmada'
  },
  {
    id: 'proposta_enviada',
    label: 'Proposta Enviada',
    sublabel: 'Simulação / Permuta em análise'
  },
  {
    id: 'analise_juridica',
    label: 'Documentação & Contrato',
    sublabel: 'Coleta CNH & Minuta contratual'
  },
  {
    id: 'fechado',
    label: 'Venda Fechada',
    sublabel: 'Cotista oficial El Mexicano'
  },
  {
    id: 'perdido',
    label: 'Perdido / Repescagem',
    sublabel: 'Desistência com motivo'
  }
];

// Funções utilitárias de máscara (Telefone com DDD e CPF)
export const maskPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const maskCpf = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

// Componente elegante e nativo de Multi-seleção Pesquisável de Embarcações
function BoatMultiSelect({
  boats = [],
  selectedIds = [],
  onChange,
  placeholder = "Buscar e selecionar embarcações..."
}: {
  boats: Embarcacao[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normaliza selectedIds para array seguro de strings
  const safeSelectedIds = useMemo(() => {
    if (Array.isArray(selectedIds)) return selectedIds;
    if (typeof selectedIds === 'string' && selectedIds) {
      try {
        const parsed = JSON.parse(selectedIds);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [selectedIds];
      }
    }
    return [];
  }, [selectedIds]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const filteredBoats = useMemo(() => {
    if (!search.trim()) return boats;
    const q = search.toLowerCase();
    return boats.filter(b => b.nome?.toLowerCase().includes(q) || b.modelo?.toLowerCase().includes(q));
  }, [boats, search]);

  const toggleBoat = (id: string) => {
    if (safeSelectedIds.includes(id)) {
      onChange(safeSelectedIds.filter(item => item !== id));
    } else {
      onChange([...safeSelectedIds, id]);
    }
  };

  const removeBoat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(safeSelectedIds.filter(item => item !== id));
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[40px] p-2 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer flex flex-wrap items-center gap-1.5 hover:border-stone-400 transition-colors focus-within:border-[#2D0A16]"
      >
        {safeSelectedIds.length === 0 ? (
          <span className="text-stone-400 select-none">{placeholder}</span>
        ) : (
          safeSelectedIds.map(id => {
            const b = boats.find(boat => boat.id === id);
            if (!b) return null;
            return (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-800 font-medium text-[11px]"
              >
                <span>{b.tipo === 'jet' ? '🌊' : '🚤'}</span>
                <span>{b.nome}</span>
                <button
                  type="button"
                  onClick={e => removeBoat(e, b.id)}
                  className="hover:text-rose-600 ml-0.5 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}
        <div className="ml-auto pl-1 text-stone-400 flex items-center">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-stone-700' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone-100 bg-stone-50/50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrar por nome da embarcação..."
              className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredBoats.length === 0 ? (
              <div className="p-3 text-center text-stone-400 text-xs">
                Nenhuma embarcação encontrada
              </div>
            ) : (
              filteredBoats.map(b => {
                const isSelected = safeSelectedIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => toggleBoat(b.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-[#2D0A16]/5 text-[#2D0A16] font-bold'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{b.tipo === 'jet' ? '🌊' : '🚤'}</span>
                      <div>
                        <div className="font-semibold">{b.nome}</div>
                        {b.modelo && <div className="text-[10px] text-stone-400 font-normal">{b.modelo}</div>}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#2D0A16] border-[#2D0A16] text-white'
                        : 'border-stone-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-[11px] text-stone-500">
            <span>{safeSelectedIds.length} selecionada(s)</span>
            <div className="flex gap-2">
              {safeSelectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-stone-500 hover:text-rose-600 font-medium cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 bg-[#2D0A16] text-white rounded-lg font-bold hover:bg-[#3B0D1E] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Seleção Pesquisável de Cotista Indicador
function CotistaSelect({
  clients = [],
  selectedId,
  onChange,
  placeholder = "Buscar cotista indicador..."
}: {
  clients: Cliente[];
  selectedId?: string;
  onChange: (cli: Cliente | null) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedCli = useMemo(() => clients.find(c => c.id === selectedId), [clients, selectedId]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.nome?.toLowerCase().includes(q) || c.telefone?.includes(q));
  }, [clients, search]);

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] p-2 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-stone-400 transition-colors"
      >
        <span className={selectedCli ? 'text-stone-900 font-semibold' : 'text-stone-400'}>
          {selectedCli ? `${selectedCli.nome}${selectedCli.telefone ? ` (${selectedCli.telefone})` : ''}` : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedCli && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-stone-700' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone-100 bg-stone-50/50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digite o nome ou telefone do cotista..."
              className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredClients.length === 0 ? (
              <div className="p-3 text-center text-stone-400 text-xs">
                Nenhum cotista encontrado
              </div>
            ) : (
              filteredClients.map(c => {
                const isSelected = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onChange(c);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-[#2D0A16]/5 text-[#2D0A16] font-bold'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{c.nome}</div>
                      {c.telefone && <div className="text-[10px] text-stone-400 font-normal">{c.telefone}</div>}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2D0A16]" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComercialCrmPage({
  onOpenProposta,
  onOpenTestDrive,
  onOpenSeaTrial,
  onOpenVenda,
  operadorNome = 'Comercial'
}: ComercialCrmPageProps) {
  const [leads, setLeads] = useState<LeadComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroPilula, setFiltroPilula] = useState<'todos' | 'quentes' | 'atrasados' | 'visitas_semana' | 'permuta'>('todos');
  const [filtroBarco, setFiltroBarco] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');

  // Gaveta lateral de Detalhes
  const [selectedLead, setSelectedLead] = useState<LeadComercial | null>(null);
  const [drawerTab, setDrawerTab] = useState<'dados' | 'timeline' | 'propostas'>('dados');

  // Modais de Criação & Ação
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<LeadComercial> | null>(null);

  // Modal de Motivo de Perda
  const [leadParaPerda, setLeadParaPerda] = useState<LeadComercial | null>(null);
  const [motivoPerdaInput, setMotivoPerdaInput] = useState('');
  const [motivoPerdaOutro, setMotivoPerdaOutro] = useState('');
  const [repescagemData, setRepescagemData] = useState('');

  // Modal de Agendamento de Visita com Verificação de Conflitos
  const [leadParaVisita, setLeadParaVisita] = useState<LeadComercial | null>(null);
  const [visitaData, setVisitaData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [visitaTurno, setVisitaTurno] = useState<string>('manha');
  const [visitaHorario, setVisitaHorario] = useState<string>('10:00');
  const [visitaBarcoId, setVisitaBarcoId] = useState<string>('');
  const [visitaChecandoConflito, setVisitaChecandoConflito] = useState(false);
  const [visitaConflitos, setVisitaConflitos] = useState<any[]>([]);

  // Modal de Reserva de Cota 48h
  const [leadParaReserva, setLeadParaReserva] = useState<LeadComercial | null>(null);
  const [reservaBarcoId, setReservaBarcoId] = useState<string>('');
  const [reservaCota, setReservaCota] = useState<string>('C1');
  const [reservaHoras, setReservaHoras] = useState<number>(48);

  // Modais auxiliares acionados internamente
  const [internalPropostaLead, setInternalPropostaLead] = useState<LeadComercial | null>(null);
  const [internalPropostaBoatId, setInternalPropostaBoatId] = useState<string | null>(null);
  const [isPropostaDrawerOpen, setIsPropostaDrawerOpen] = useState(false);

  const [internalSeaTrialLead, setInternalSeaTrialLead] = useState<LeadComercial | null>(null);
  const [internalSeaTrialBoatId, setInternalSeaTrialBoatId] = useState<string | null>(null);
  const [isSeaTrialModalOpen, setIsSeaTrialModalOpen] = useState(false);

  const [internalVendaLead, setInternalVendaLead] = useState<LeadComercial | null>(null);
  const [internalVendaBoatId, setInternalVendaBoatId] = useState<string | null>(null);
  const [isVendaDrawerOpen, setIsVendaDrawerOpen] = useState(false);

  // Nova nota na timeline
  const [novaNota, setNovaNota] = useState('');
  const [tipoNota, setTipoNota] = useState<'nota' | 'whatsapp' | 'ligacao' | 'visita'>('whatsapp');
  const [proximoContatoNota, setProximoContatoNota] = useState<string>('');

  // Dados do Catálogo e Base
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() as Embarcacao[]);
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll() as Cliente[]);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads', { credentials: 'include', headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeads(data);
          setSelectedLead(prev => (prev ? data.find(l => l.id === prev.id) || null : null));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    setBoats(boatDB.getAll() as Embarcacao[]);
    setClients(clientDB.getAll() as Cliente[]);

    let socket: any = null;
    try {
      socket = io();
      socket.on('lead_created', () => fetchLeads());
      socket.on('lead_updated', () => fetchLeads());
      socket.on('lead_deleted', () => fetchLeads());
    } catch {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Fecha modais e drawers com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewLeadModalOpen) setIsNewLeadModalOpen(false);
        else if (leadParaVisita) setLeadParaVisita(null);
        else if (leadParaPerda) setLeadParaPerda(null);
        else if (leadParaReserva) setLeadParaReserva(null);
        else if (selectedLead) setSelectedLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewLeadModalOpen, leadParaVisita, leadParaPerda, leadParaReserva, selectedLead]);

  // Checar disponibilidade do barco para visita presencial
  const checarDisponibilidadeMarina = async (barcoId: string, dataIso: string) => {
    if (!barcoId || !dataIso) return;
    setVisitaChecandoConflito(true);
    try {
      const res = await fetch(`/api/comercial/disponibilidade-visita?embarcacaoId=${barcoId}&data=${dataIso}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        setVisitaConflitos(json.conflitos || []);
      } else {
        setVisitaConflitos([]);
      }
    } catch (e) {
      console.error('Erro ao checar conflitos:', e);
      setVisitaConflitos([]);
    } finally {
      setVisitaChecandoConflito(false);
    }
  };

  useEffect(() => {
    if (leadParaVisita && visitaBarcoId && visitaData) {
      checarDisponibilidadeMarina(visitaBarcoId, visitaData);
    }
  }, [visitaBarcoId, visitaData, leadParaVisita]);

  // Transição de Etapa
  const handleMoveEtapa = async (
    leadId: string,
    novaEtapa: EtapaFunilLead,
    motivoPerda?: string,
    dataVisitaAgendada?: string | null,
    proximoContatoEm?: string | null
  ) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/etapa`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          etapaFunil: novaEtapa,
          motivoPerda,
          dataVisitaAgendada,
          proximoContatoEm
        })
      });

      if (res.ok) {
        setLeads(prev =>
          prev.map(l =>
            l.id === leadId
              ? {
                  ...l,
                  etapaFunil: novaEtapa,
                  motivoPerda: motivoPerda || l.motivoPerda,
                  dataVisitaAgendada: dataVisitaAgendada !== undefined ? dataVisitaAgendada : l.dataVisitaAgendada,
                  proximoContatoEm: proximoContatoEm !== undefined ? proximoContatoEm : l.proximoContatoEm
                }
              : l
          )
        );
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev =>
            prev
              ? {
                  ...prev,
                  etapaFunil: novaEtapa,
                  motivoPerda: motivoPerda || prev.motivoPerda,
                  dataVisitaAgendada:
                    dataVisitaAgendada !== undefined ? dataVisitaAgendada : prev.dataVisitaAgendada,
                  proximoContatoEm: proximoContatoEm !== undefined ? proximoContatoEm : prev.proximoContatoEm
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error('Erro ao mover etapa:', err);
    }
  };

  // Interceptar movimentação para gatilhos inteligentes
  const requestMoveEtapa = (lead: LeadComercial, targetEtapa: EtapaFunilLead) => {
    if (targetEtapa === 'perdido') {
      setLeadParaPerda(lead);
      setMotivoPerdaInput('');
      setMotivoPerdaOutro('');
      setRepescagemData('');
      return;
    }

    if (targetEtapa === 'visita_agendada') {
      setLeadParaVisita(lead);
      const boatId = lead.embarcacoesInteresse?.[0] || (boats.length > 0 ? boats[0].id : '');
      setVisitaBarcoId(boatId);
      setVisitaData(new Date().toISOString().split('T')[0]);
      setVisitaHorario('10:00');
      setVisitaTurno('manha');
      setVisitaConflitos([]);
      return;
    }

    if (targetEtapa === 'fechado') {
      triggerConcluirVenda(lead);
      return;
    }

    handleMoveEtapa(lead.id, targetEtapa);
  };

  // Confirmar perda
  const handleConfirmarPerda = async () => {
    if (!leadParaPerda) return;
    const finalMotivo = motivoPerdaInput === 'outro' ? motivoPerdaOutro : motivoPerdaInput;
    if (!finalMotivo.trim()) {
      alert('Por favor, informe o motivo da perda.');
      return;
    }
    await handleMoveEtapa(leadParaPerda.id, 'perdido', finalMotivo, undefined, repescagemData || null);
    setLeadParaPerda(null);
  };

  // Confirmar agendamento de visita
  const handleConfirmarVisita = async () => {
    if (!leadParaVisita) return;
    const dataHoraIso = `${visitaData}T${visitaHorario}:00`;

    await handleMoveEtapa(leadParaVisita.id, 'visita_agendada', undefined, dataHoraIso, undefined);

    const boatNome = boats.find(b => b.id === visitaBarcoId)?.nome || 'Embarcação';
    await fetch(`/api/leads/${leadParaVisita.id}/timeline`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        tipo: 'visita',
        titulo: `Visita Agendada: ${boatNome}`,
        descricao: `Data: ${new Date(dataHoraIso).toLocaleString('pt-BR')} | Turno: ${visitaTurno.toUpperCase()}. Vendedor: ${operadorNome}`
      })
    });

    setLeadParaVisita(null);
    fetchLeads();
  };

  // Adicionar Interação na Timeline
  const handleAddTimeline = async (leadId: string) => {
    if (!novaNota.trim()) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/timeline`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          tipo: tipoNota,
          titulo:
            tipoNota === 'whatsapp'
              ? 'Mensagem WhatsApp'
              : tipoNota === 'ligacao'
              ? 'Ligação Telefônica'
              : tipoNota === 'visita'
              ? 'Visita / Reunião'
              : 'Nota Interna',
          descricao: novaNota.trim(),
          autorNome: operadorNome,
          proximoContatoEm: proximoContatoNota || undefined
        })
      });

      if (res.ok) {
        setNovaNota('');
        setProximoContatoNota('');
        fetchLeads();
      }
    } catch (err) {
      console.error('Erro ao adicionar timeline:', err);
    }
  };

  // Salvar Lead (Novo ou Editado)
  const handleSaveLead = async (leadData: Partial<LeadComercial>) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          ...leadData,
          vendedorNome: leadData.vendedorNome || operadorNome
        })
      });

      if (res.ok) {
        const json = await res.json();
        const saved = json.lead || leadData;
        setIsNewLeadModalOpen(false);
        setEditingLead(null);
        if (selectedLead && selectedLead.id === saved.id) {
          setSelectedLead(saved);
        }
        fetchLeads();
      }
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }
  };

  // Excluir Lead
  const handleDeleteLead = async (leadId: string, nome?: string) => {
    if (!window.confirm(`Deseja realmente remover o lead "${nome || 'selecionado'}" do sistema?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeader()
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        if (selectedLead?.id === leadId) setSelectedLead(null);
      }
    } catch (err) {
      console.error('Erro ao deletar lead:', err);
    }
  };

  // Bloqueio de Cota 48h
  const handleConfirmarReserva48h = async () => {
    if (!leadParaReserva || !reservaBarcoId) return;
    try {
      const res = await fetch('/api/comercial/cotas-reservadas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          embarcacaoId: reservaBarcoId,
          cota: reservaCota,
          leadId: leadParaReserva.id,
          leadNome: leadParaReserva.nome,
          vendedorNome: operadorNome,
          horasExpiracao: reservaHoras,
          motivoReserva: `Bloqueio Comercial 48h - Lead ${leadParaReserva.nome}`
        })
      });

      if (res.ok) {
        await fetch(`/api/leads/${leadParaReserva.id}/timeline`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({
            tipo: 'nota',
            titulo: `Cota ${reservaCota} Bloqueada por 48h`,
            descricao: `Bloqueio prioritário de cota realizado para a embarcação selecionada. Vendedor: ${operadorNome}`
          })
        });

        alert(`Cota ${reservaCota} bloqueada com sucesso por ${reservaHoras} horas!`);
        setLeadParaReserva(null);
        fetchLeads();
      }
    } catch (e) {
      console.error('Erro ao reservar cota:', e);
      alert('Falha ao reservar cota.');
    }
  };

  // Disparo de WhatsApp com log automático
  const handleAbrirWhatsApp = async (lead: LeadComercial, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!lead.telefone) {
      alert('Este lead não possui telefone cadastrado.');
      return;
    }

    const cleanPhone = lead.telefone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const boat = boats.find(b => lead.embarcacoesInteresse?.includes(b.id));
    const boatText = boat ? ` sobre a *${boat.nome}*` : '';
    const textMsg = encodeURIComponent(
      `Olá, ${lead.nome}! Aqui é o ${operadorNome} da *El Mexicano Gestão Náutica*. Vi seu interesse${boatText} e gostaria de saber se você tem disponibilidade para conhecer a lancha na marina essa semana.`
    );

    const waUrl = `https://wa.me/${phoneWithCountry}?text=${textMsg}`;
    window.open(waUrl, '_blank');

    try {
      await fetch(`/api/leads/${lead.id}/timeline`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          tipo: 'whatsapp',
          titulo: 'Contato via WhatsApp Iniciado',
          descricao: `Vendedor ${operadorNome} acionou o lead pelo WhatsApp.`,
          autorNome: operadorNome
        })
      });
      fetchLeads();
    } catch {}
  };

  // Ações de Proposta, Test Drive e Venda
  const triggerOpenProposta = (lead: LeadComercial) => {
    const boatId = lead.embarcacoesInteresse?.[0];
    if (onOpenProposta) {
      onOpenProposta(lead, boatId);
    } else {
      setInternalPropostaLead(lead);
      setInternalPropostaBoatId(boatId || null);
      setIsPropostaDrawerOpen(true);
    }
  };

  const triggerOpenSeaTrial = (lead: LeadComercial) => {
    const boatId = lead.embarcacoesInteresse?.[0];
    if (onOpenSeaTrial) {
      onOpenSeaTrial(lead, boatId);
    } else if (onOpenTestDrive) {
      onOpenTestDrive(lead, boatId);
    } else {
      setInternalSeaTrialLead(lead);
      setInternalSeaTrialBoatId(boatId || null);
      setIsSeaTrialModalOpen(true);
    }
  };

  const triggerConcluirVenda = (lead: LeadComercial) => {
    const boatId = lead.embarcacoesInteresse?.[0];
    if (onOpenVenda) {
      onOpenVenda(lead, boatId);
    } else {
      setInternalVendaLead(lead);
      setInternalVendaBoatId(boatId || null);
      setIsVendaDrawerOpen(true);
    }
  };

  const now = new Date();

  // Status de follow-up discreto e elegante
  const getFollowUpStatus = (proximoContatoEm?: string | null) => {
    if (!proximoContatoEm) {
      return { status: 'nenhum', text: 'Sem retorno agendado', color: 'text-stone-400 bg-stone-50 border-stone-200/60' };
    }
    const targetDate = new Date(proximoContatoEm);
    const diffHours = (targetDate.getTime() - now.getTime()) / (1000 * 3600);

    const isToday =
      targetDate.getDate() === now.getDate() &&
      targetDate.getMonth() === now.getMonth() &&
      targetDate.getFullYear() === now.getFullYear();

    const formattedTime = targetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    if (diffHours < 0) {
      return {
        status: 'atrasado',
        text: `Atrasado: ${formattedDate} às ${formattedTime}`,
        color: 'text-rose-700 bg-rose-50/60 border-rose-200/60 font-medium'
      };
    } else if (isToday) {
      return {
        status: 'hoje',
        text: `Retorno hoje às ${formattedTime}`,
        color: 'text-amber-800 bg-amber-50/60 border-amber-200/60 font-medium'
      };
    } else {
      return {
        status: 'futuro',
        text: `Retorno: ${formattedDate} às ${formattedTime}`,
        color: 'text-stone-600 bg-stone-50 border-stone-200/60'
      };
    }
  };

  // Filtragem dos Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (lead.nome && lead.nome.toLowerCase().includes(q)) ||
        (lead.telefone && lead.telefone.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.vendedorNome && lead.vendedorNome.toLowerCase().includes(q)) ||
        (lead.embarcacoesInteresse &&
          lead.embarcacoesInteresse.some(bId => {
            const b = boats.find(boat => boat.id === bId);
            return b && b.nome.toLowerCase().includes(q);
          }));

      const matchEtapa = filtroEtapa === 'todos' || lead.etapaFunil === filtroEtapa;
      const matchBarco =
        filtroBarco === 'todos' || (lead.embarcacoesInteresse && lead.embarcacoesInteresse.includes(filtroBarco));
      const matchOrigem = filtroOrigem === 'todos' || lead.origem === filtroOrigem;

      let matchPilula = true;
      if (filtroPilula === 'quentes') {
        matchPilula = lead.temperatura === 'quente';
      } else if (filtroPilula === 'atrasados') {
        matchPilula = Boolean(lead.proximoContatoEm && new Date(lead.proximoContatoEm) < now);
      } else if (filtroPilula === 'visitas_semana') {
        if (!lead.dataVisitaAgendada) {
          matchPilula = false;
        } else {
          const vd = new Date(lead.dataVisitaAgendada);
          const diffDays = (vd.getTime() - now.getTime()) / (1000 * 3600 * 24);
          matchPilula = diffDays >= -1 && diffDays <= 7;
        }
      } else if (filtroPilula === 'permuta') {
        matchPilula = Boolean(lead.possuiPermuta || (lead.permutasCount && lead.permutasCount > 0));
      }

      return matchSearch && matchEtapa && matchBarco && matchOrigem && matchPilula;
    });
  }, [leads, search, filtroEtapa, filtroBarco, filtroOrigem, filtroPilula, boats, now]);

  // Contagem e VGV por etapa
  const metricsByEtapa = useMemo(() => {
    const counts: Record<string, number> = {};
    const values: Record<string, number> = {};
    ETAPAS.forEach(e => {
      counts[e.id] = 0;
      values[e.id] = 0;
    });

    leads.forEach(l => {
      const stage = l.etapaFunil || 'novo';
      counts[stage] = (counts[stage] || 0) + 1;
      values[stage] = (values[stage] || 0) + (Number(l.valorEstimado) || 0);
    });

    return { counts, values };
  }, [leads]);

  // KPIs de Topo
  const kpiStats = useMemo(() => {
    const leadsAtivos = leads.filter(l => l.etapaFunil !== 'perdido' && l.etapaFunil !== 'fechado');
    const vgvAtivo = leadsAtivos.reduce((sum, l) => sum + (Number(l.valorEstimado) || 0), 0);
    const visitasAgendadas = leads.filter(
      l => l.etapaFunil === 'visita_agendada' || Boolean(l.dataVisitaAgendada)
    ).length;
    const followUpsAtrasados = leads.filter(
      l => l.etapaFunil !== 'perdido' && l.proximoContatoEm && new Date(l.proximoContatoEm) < now
    ).length;

    return {
      totalAtivos: leadsAtivos.length,
      vgvAtivo,
      visitasAgendadas,
      followUpsAtrasados
    };
  }, [leads, now]);

  // Suporte a Drag and Drop no Kanban
  const handleDragStart = (e: React.DragEvent, lead: LeadComercial) => {
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetEtapa: EtapaFunilLead) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.etapaFunil !== targetEtapa) {
      requestMoveEtapa(lead, targetEtapa);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. HEADER & CONTROLES SUPERIORES ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 lg:p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold text-stone-900 tracking-tight">Leads & Funil Comercial</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200/70">
              {leads.length} Cadastrados
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gestão da jornada náutica: captação, test drive na marina, propostas personalizadas e fechamento de cotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Seletor Kanban / Lista */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-stone-500" />
              Quadro Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'lista' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <List className="w-3.5 h-3.5 text-stone-500" />
              Lista em Tabela
            </button>
          </div>

          {/* Botão Novo Lead (Vinho Mexicano) */}
          <button
            type="button"
            onClick={() => {
              setEditingLead({
                nome: '',
                telefone: '',
                cidade: '',
                cpf: '',
                etapaFunil: 'novo',
                origem: 'instagram',
                temperatura: 'quente',
                tipoInteresse: 'lancha',
                vendedorNome: operadorNome || 'Consultor Comercial',
                embarcacoesInteresse: [],
                valorEstimado: 0,
                possuiPermuta: false,
                resumoPermuta: '',
                detalhes: '',
                perfilNautico: {
                  possuiHabilitacao: false,
                  categoriaHabilitacao: 'nao_possui',
                  jaTeveBarcoOuJet: false
                }
              });
              setIsNewLeadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Novo Lead
          </button>
        </div>
      </div>

      {/* ─── 2. KPI STRIP (PADRÃO HARMONIOSO VILA NÁUTICA) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Leads Ativos */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block uppercase tracking-wider">Leads Ativos</span>
            <span className="text-2xl font-bold text-stone-900 tabular-nums mt-0.5 block">
              {kpiStats.totalAtivos}
            </span>
            <span className="text-[10px] text-stone-400">Em negociação no funil</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* VGV em Negociação */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block uppercase tracking-wider">VGV em Pipeline</span>
            <span className="text-2xl font-bold text-stone-900 tabular-nums mt-0.5 block">
              R$ {kpiStats.vgvAtivo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-stone-400">Soma de cotas estimadas</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#2D0A16]/5 text-[#2D0A16] flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Visitas Agendadas */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block uppercase tracking-wider">Visitas & Test Drive</span>
            <span className="text-2xl font-bold text-stone-900 tabular-nums mt-0.5 block">
              {kpiStats.visitasAgendadas}
            </span>
            <span className="text-[10px] text-stone-400">Presença na Marina marcada</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
            <Ship className="w-4 h-4" />
          </div>
        </div>

        {/* Follow-ups Atrasados */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block uppercase tracking-wider">Follow-ups Atrasados</span>
            <span className={`text-2xl font-bold tabular-nums mt-0.5 block ${
              kpiStats.followUpsAtrasados > 0 ? 'text-rose-700' : 'text-stone-900'
            }`}>
              {kpiStats.followUpsAtrasados}
            </span>
            <span className={`text-[10px] ${kpiStats.followUpsAtrasados > 0 ? 'text-rose-600 font-medium' : 'text-stone-400'}`}>
              {kpiStats.followUpsAtrasados > 0 ? 'Aguardando contato' : 'Em dia com os clientes'}
            </span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            kpiStats.followUpsAtrasados > 0 ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'
          }`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─── 3. BARRA DE FILTROS RÁPIDOS E BUSCA (DESIGN SUAVE UNIFICADO) ─── */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Campo de Busca Textual */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, embarcação ou vendedor..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50/70 border border-stone-200/80 rounded-xl focus:outline-hidden focus:bg-white focus:border-[#2D0A16] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select de Embarcação do Catálogo */}
          <div className="min-w-[190px]">
            <select
              value={filtroBarco}
              onChange={e => setFiltroBarco(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-stone-50/70 border border-stone-200/80 rounded-xl font-medium text-stone-700 focus:outline-hidden focus:border-[#2D0A16]"
            >
              <option value="todos">🚤 Todas as Embarcações</option>
              {boats.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nome} {b.modelo ? `(${b.modelo})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Select de Origem */}
          <div className="min-w-[160px]">
            <select
              value={filtroOrigem}
              onChange={e => setFiltroOrigem(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-stone-50/70 border border-stone-200/80 rounded-xl font-medium text-stone-700 focus:outline-hidden focus:border-[#2D0A16]"
            >
              <option value="todos">🌐 Todas as Origens</option>
              <option value="instagram">Instagram Direct / Ads</option>
              <option value="indicacao">Indicação de Cotista</option>
              <option value="catalogo">Catálogo Digital</option>
              <option value="presencial">Presencial Marina</option>
              <option value="outros">Outros canais</option>
            </select>
          </div>
        </div>

        {/* Pílulas de Filtros Rápidos (Unificadas em tons sóbrios e elegantes) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3" /> Filtros:
          </span>

          <button
            type="button"
            onClick={() => setFiltroPilula('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtroPilula === 'todos'
                ? 'bg-[#2D0A16] text-white shadow-2xs'
                : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
            }`}
          >
            Todos ({leads.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroPilula('quentes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtroPilula === 'quentes'
                ? 'bg-[#2D0A16] text-white shadow-2xs'
                : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Quentes ({leads.filter(l => l.temperatura === 'quente').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroPilula('atrasados')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtroPilula === 'atrasados'
                ? 'bg-[#2D0A16] text-white shadow-2xs'
                : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Follow-up Atrasado ({kpiStats.followUpsAtrasados})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroPilula('visitas_semana')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtroPilula === 'visitas_semana'
                ? 'bg-[#2D0A16] text-white shadow-2xs'
                : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Visitas da Semana</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroPilula('permuta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtroPilula === 'permuta'
                ? 'bg-[#2D0A16] text-white shadow-2xs'
                : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
            }`}
          >
            <RefreshCw className="w-3 h-3 text-stone-400" />
            <span>Com Permuta ({leads.filter(l => l.possuiPermuta || (l.permutasCount && l.permutasCount > 0)).length})</span>
          </button>
        </div>
      </div>

      {/* ─── 4. QUADRO KANBAN (DESIGN SUAVE E INTEGRADO) ─── */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3.5 min-w-[1450px] items-start">
            {ETAPAS.map(etapa => {
              const leadsNaEtapa = filteredLeads.filter(l => (l.etapaFunil || 'novo') === etapa.id);
              const totalVgvEtapa = metricsByEtapa.values[etapa.id] || 0;

              return (
                <div
                  key={etapa.id}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, etapa.id)}
                  className="w-[290px] shrink-0 rounded-2xl border border-stone-200/80 bg-stone-50/60 flex flex-col max-h-[820px] transition-all"
                >
                  {/* Cabeçalho da Coluna Kanban */}
                  <div className="p-3.5 border-b border-stone-200/70 bg-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs tracking-tight">{etapa.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200/60">
                        {leadsNaEtapa.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-stone-400">
                      <span className="truncate">{etapa.sublabel}</span>
                      {totalVgvEtapa > 0 && (
                        <span className="font-bold text-stone-700 tabular-nums shrink-0 ml-1">
                          R$ {Math.round(totalVgvEtapa / 1000)}k
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista de Cards com Scroll Interno */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[300px]">
                    {leadsNaEtapa.length === 0 ? (
                      <div className="h-32 border border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-stone-400 text-xs gap-1">
                        <span>Nenhum lead</span>
                        <span className="text-[10px]">Arraste para cá</span>
                      </div>
                    ) : (
                      leadsNaEtapa.map(lead => {
                        const boat = boats.find(b => lead.embarcacoesInteresse?.includes(b.id));
                        const followUp = getFollowUpStatus(lead.proximoContatoEm);
                        const daysAgo = Math.floor(
                          (now.getTime() - new Date(lead.createdAt || now).getTime()) / (1000 * 3600 * 24)
                        );

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={e => handleDragStart(e, lead)}
                            onClick={() => {
                              setSelectedLead(lead);
                              setDrawerTab('dados');
                            }}
                            className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#2D0A16]/60 hover:shadow-sm transition-all cursor-pointer group space-y-2.5 relative"
                          >
                            {/* Topo do Card: Temperatura + Origem + Idade */}
                            <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                              <div className="flex items-center gap-1.5">
                                {/* Temperatura Suave */}
                                <span className="px-2 py-0.5 rounded-md font-medium bg-stone-100 text-stone-700 border border-stone-200/60 flex items-center gap-1">
                                  {lead.temperatura === 'quente' ? (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      <span>Quente</span>
                                    </>
                                  ) : lead.temperatura === 'frio' ? (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                      <span>Frio</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span>Morno</span>
                                    </>
                                  )}
                                </span>

                                {/* Origem Suave */}
                                <span className="px-2 py-0.5 rounded-md font-medium bg-stone-50 text-stone-600 border border-stone-200/50 truncate max-w-[120px]">
                                  {lead.origem === 'indicacao'
                                    ? `Indicação${lead.indicadoPorClienteNome ? `: ${lead.indicadoPorClienteNome.split(' ')[0]}` : ''}`
                                    : lead.origem === 'instagram'
                                    ? 'Instagram'
                                    : lead.origem === 'catalogo'
                                    ? 'Catálogo'
                                    : lead.origem || 'Direto'}
                                </span>
                              </div>

                              <span className="text-stone-400 tabular-nums">
                                {daysAgo === 0 ? 'Hoje' : `há ${daysAgo}d`}
                              </span>
                            </div>

                            {/* Nome + Telefone */}
                            <div>
                              <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#2D0A16] transition-colors leading-snug">
                                {lead.nome}
                              </h4>
                              {lead.telefone && (
                                <p className="text-[11px] text-stone-500 tabular-nums mt-0.5">{lead.telefone}</p>
                              )}
                            </div>

                            {/* Embarcação de Interesse + VGV Estimado */}
                            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-stone-100 text-[11px]">
                              <div className="flex items-center gap-1 truncate text-stone-700 font-semibold">
                                <Ship className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className="truncate">{boat ? boat.nome : 'Lancha / Jet'}</span>
                              </div>

                              {lead.valorEstimado && lead.valorEstimado > 0 ? (
                                <span className="font-bold text-stone-900 tabular-nums shrink-0">
                                  R$ {lead.valorEstimado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </span>
                              ) : null}
                            </div>

                            {/* Badges Extras: Permuta e Cota Reservada em tons suaves */}
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {(lead.possuiPermuta || (lead.permutasCount && lead.permutasCount > 0)) && (
                                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/70 font-medium flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5 text-stone-500" /> Permuta
                                </span>
                              )}
                              {(lead.cotaReservadaCodigo || (lead.cotasReservadasCount && lead.cotasReservadasCount > 0)) && (
                                <span className="px-2 py-0.5 rounded-md bg-[#2D0A16]/5 text-[#2D0A16] border border-[#2D0A16]/15 font-semibold flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Cota {lead.cotaReservadaCodigo || 'C1'} Reservada
                                </span>
                              )}
                            </div>

                            {/* Rodapé do Card: Semáforo de Follow-up + WhatsApp */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                              {/* Próxima Ação */}
                              <div className="min-w-0 flex-1">
                                {lead.etapaFunil === 'visita_agendada' && lead.dataVisitaAgendada ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/80 truncate">
                                    <Calendar className="w-3 h-3 text-stone-500 shrink-0" />
                                    {new Date(lead.dataVisitaAgendada).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit'
                                    })}{' '}
                                    às{' '}
                                    {new Date(lead.dataVisitaAgendada).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border truncate ${followUp.color}`}
                                    title={followUp.text}
                                  >
                                    {followUp.text}
                                  </span>
                                )}
                              </div>

                              {/* Botão Rápido de WhatsApp */}
                              {lead.telefone && (
                                <button
                                  type="button"
                                  onClick={e => handleAbrirWhatsApp(lead, e)}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#2D0A16] text-stone-600 hover:text-white border border-stone-200/80 flex items-center justify-center shrink-0 transition-colors shadow-2xs"
                                  title="Iniciar conversa no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── MODO LISTA / TABELA ─── */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3 px-4">Nome do Lead</th>
                  <th className="py-3 px-3">WhatsApp / Telefone</th>
                  <th className="py-3 px-3">Etapa Atual</th>
                  <th className="py-3 px-3">Embarcação</th>
                  <th className="py-3 px-3 text-right">Valor Estimado</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3">Próximo Retorno</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLeads.map(lead => {
                  const etapaObj = ETAPAS.find(e => e.id === lead.etapaFunil) || ETAPAS[0];
                  const boat = boats.find(b => lead.embarcacoesInteresse?.includes(b.id));
                  const followUp = getFollowUpStatus(lead.proximoContatoEm);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setDrawerTab('dados');
                      }}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900 group-hover:text-[#2D0A16]">
                        {lead.nome}
                      </td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">{lead.telefone || '—'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/70">
                          {etapaObj.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-700">{boat ? boat.nome : '—'}</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 tabular-nums">
                        {lead.valorEstimado ? `R$ ${lead.valorEstimado.toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-stone-500">{lead.origem || 'Direto'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${followUp.color}`}>
                          {followUp.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {lead.telefone && (
                            <button
                              type="button"
                              onClick={e => handleAbrirWhatsApp(lead, e)}
                              className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#2D0A16] text-stone-600 hover:text-white border border-stone-200 flex items-center justify-center transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setDrawerTab('dados');
                            }}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. DRAWER LATERAL DE DETALHES DO LEAD (LEAD DETAIL DRAWER) ─── */}
      {selectedLead && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Drawer */}
            <div className="p-4 lg:p-5 border-b border-stone-200/80 bg-stone-50/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">{selectedLead.nome}</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200/70 flex items-center gap-1">
                      {selectedLead.temperatura === 'quente' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Quente</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Morno</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Cadastrado em {new Date(selectedLead.createdAt || now).toLocaleDateString('pt-BR')} • Vendedor:{' '}
                    <span className="font-semibold text-stone-700">{selectedLead.vendedorNome || operadorNome}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Botões de Ação Rápida no Topo do Drawer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => triggerOpenSeaTrial(selectedLead)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold border border-stone-200 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  Agendar Visita
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadParaReserva(selectedLead);
                    setReservaBarcoId(selectedLead.embarcacoesInteresse?.[0] || boats[0]?.id || '');
                    setReservaCota('C1');
                    setReservaHoras(48);
                  }}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold border border-stone-200 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  Reservar 48h
                </button>

                <button
                  type="button"
                  onClick={() => triggerOpenProposta(selectedLead)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold border border-stone-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  Gerar Proposta
                </button>

                <button
                  type="button"
                  onClick={() => triggerConcluirVenda(selectedLead)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-[11px] font-bold transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluir Venda
                </button>
              </div>

              {/* Seletor de Abas Internas */}
              <div className="flex gap-2 mt-4 border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => setDrawerTab('dados')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'dados'
                      ? 'border-[#2D0A16] text-[#2D0A16]'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Dados & Qualificação
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('timeline')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'timeline'
                      ? 'border-[#2D0A16] text-[#2D0A16]'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Timeline & Follow-up ({selectedLead.timeline?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('propostas')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'propostas'
                      ? 'border-[#2D0A16] text-[#2D0A16]'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Propostas & Cotas ({selectedLead.propostasCount || 0})
                </button>
              </div>
            </div>

            {/* Conteúdo do Drawer com Scroll */}
            <div className="p-4 lg:p-5 overflow-y-auto flex-1 space-y-4">
              {drawerTab === 'dados' ? (
                /* ─── ABA DADOS & QUALIFICAÇÃO ─── */
                <div className="space-y-4">
                  {/* Seletor de Etapa Rápida */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase">Etapa no Funil Comercial</label>
                    <select
                      value={selectedLead.etapaFunil}
                      onChange={e => requestMoveEtapa(selectedLead, e.target.value as EtapaFunilLead)}
                      className="w-full py-2 px-3 text-xs bg-white border border-stone-200 rounded-lg font-bold text-[#2D0A16] focus:outline-hidden"
                    >
                      {ETAPAS.map(etp => (
                        <option key={etp.id} value={etp.id}>
                          {etp.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Informações Básicas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">WhatsApp / Telefone</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={selectedLead.telefone || ''}
                          onChange={e => setSelectedLead({ ...selectedLead, telefone: maskPhone(e.target.value) })}
                          placeholder="(87) 99999-8888"
                          className="w-full p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg"
                        />
                        {selectedLead.telefone && (
                          <button
                            type="button"
                            onClick={() => handleAbrirWhatsApp(selectedLead)}
                            className="p-2 rounded-lg bg-stone-100 hover:bg-[#2D0A16] text-stone-600 hover:text-white border border-stone-200 shrink-0 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">E-mail</label>
                      <input
                        type="email"
                        value={selectedLead.email || ''}
                        onChange={e => setSelectedLead({ ...selectedLead, email: e.target.value })}
                        className="w-full p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Cidade / Estado</label>
                      <input
                        type="text"
                        value={selectedLead.cidade || ''}
                        onChange={e => setSelectedLead({ ...selectedLead, cidade: e.target.value })}
                        className="w-full p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Origem do Contato</label>
                      <select
                        value={selectedLead.origem || 'instagram'}
                        onChange={e => setSelectedLead({ ...selectedLead, origem: e.target.value as any })}
                        className="w-full p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        <option value="instagram">Instagram Direct / Ads</option>
                        <option value="indicacao">Indicação de Cotista</option>
                        <option value="catalogo">Catálogo Digital</option>
                        <option value="presencial">Presencial Marina</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* Se Indicação, Cotista Indicador */}
                  {selectedLead.origem === 'indicacao' && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                      <label className="text-[10px] font-bold text-stone-700 uppercase block">
                        Cotista que Indicou este Lead
                      </label>
                      <CotistaSelect
                        clients={clients}
                        selectedId={selectedLead.indicadoPorClienteId}
                        onChange={cli => {
                          setSelectedLead(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              indicadoPorClienteId: cli ? cli.id : undefined,
                              indicadoPorClienteNome: cli ? cli.nome : undefined
                            };
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Embarcações de Interesse (Multi-seleção pesquisável) */}
                  <div className="pt-2 border-t border-stone-200 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                        Embarcações de Interesse <span className="normal-case text-stone-400 font-normal">(pesquisável, selecione uma ou mais)</span>
                      </label>
                      <BoatMultiSelect
                        boats={boats}
                        selectedIds={selectedLead.embarcacoesInteresse || []}
                        onChange={ids => {
                          setSelectedLead(prev => {
                            if (!prev) return null;
                            const next = { ...prev, embarcacoesInteresse: ids };
                            if ((!next.valorEstimado || next.valorEstimado === 0) && ids.length > 0) {
                              const b = boats.find(boat => boat.id === ids[0]);
                              if (b?.valorCota) next.valorEstimado = Number(b.valorCota);
                            }
                            return next;
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Valor Estimado (R$)</label>
                      <input
                        type="number"
                        value={selectedLead.valorEstimado || 0}
                        onChange={e => setSelectedLead({ ...selectedLead, valorEstimado: Number(e.target.value) || 0 })}
                        className="w-full p-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold text-stone-900 focus:outline-none focus:border-[#2D0A16]"
                      />
                    </div>
                  </div>

                  {/* Permuta (Trade-In) */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-stone-500" /> Possui Permuta / Trade-In?
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedLead.possuiPermuta)}
                        onChange={e => setSelectedLead({ ...selectedLead, possuiPermuta: e.target.checked })}
                        className="w-4 h-4 accent-[#2D0A16] rounded cursor-pointer"
                      />
                    </div>
                    {selectedLead.possuiPermuta && (
                      <input
                        type="text"
                        value={selectedLead.resumoPermuta || ''}
                        onChange={e => setSelectedLead({ ...selectedLead, resumoPermuta: e.target.value })}
                        placeholder="Ex: Jet Ski Sea-Doo Spark 2021 ou Lancha 19 pés..."
                        className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg"
                      />
                    )}
                  </div>

                  {/* Perfil Náutico */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-stone-500" /> Perfil Náutico
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLead.perfilNautico?.possuiHabilitacao)}
                          onChange={e =>
                            setSelectedLead({
                              ...selectedLead,
                              perfilNautico: {
                                ...selectedLead.perfilNautico,
                                possuiHabilitacao: e.target.checked
                              }
                            })
                          }
                          className="w-4 h-4 accent-[#2D0A16] rounded"
                        />
                        Possui Arrais Amador
                      </label>

                      <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLead.perfilNautico?.jaTeveBarco)}
                          onChange={e =>
                            setSelectedLead({
                              ...selectedLead,
                              perfilNautico: {
                                ...selectedLead.perfilNautico,
                                jaTeveBarco: e.target.checked
                              }
                            })
                          }
                          className="w-4 h-4 accent-[#2D0A16] rounded"
                        />
                        Já teve barco próprio
                      </label>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                        Tamanho da Família / Tripulação
                      </label>
                      <input
                        type="text"
                        value={selectedLead.perfilNautico?.tamanhoFamilia || ''}
                        onChange={e =>
                          setSelectedLead({
                            ...selectedLead,
                            perfilNautico: {
                              ...selectedLead.perfilNautico,
                              tamanhoFamilia: e.target.value
                            }
                          })
                        }
                        placeholder="Ex: Casal + 2 filhos"
                        className="w-full p-2 text-xs bg-white border border-stone-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Botão de Salvar Alterações */}
                  <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(selectedLead.id, selectedLead.nome)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir Lead
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveLead(selectedLead)}
                      className="px-4 py-2 bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Salvar Dados
                    </button>
                  </div>
                </div>
              ) : drawerTab === 'timeline' ? (
                /* ─── ABA TIMELINE & FOLLOW-UP ─── */
                <div className="space-y-4">
                  {/* Bloco de Adicionar Nova Interação */}
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">Nova Interação Comercial</span>
                      <div className="flex bg-white p-0.5 rounded-lg border border-stone-200 text-[11px]">
                        {(['whatsapp', 'ligacao', 'visita', 'nota'] as const).map(tp => (
                          <button
                            key={tp}
                            type="button"
                            onClick={() => setTipoNota(tp)}
                            className={`px-2 py-1 rounded-md font-semibold transition-all ${
                              tipoNota === tp ? 'bg-[#2D0A16] text-white' : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            {tp === 'whatsapp'
                              ? 'WhatsApp'
                              : tp === 'ligacao'
                              ? 'Ligação'
                              : tp === 'visita'
                              ? 'Visita'
                              : 'Nota'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={novaNota}
                      onChange={e => setNovaNota(e.target.value)}
                      placeholder="Descreva o que foi conversado ou alinhado com o lead..."
                      rows={3}
                      className="w-full p-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#2D0A16]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-stone-600">
                        <CalendarClock className="w-4 h-4 text-stone-400" />
                        <span className="text-[11px] font-semibold">Próximo Retorno:</span>
                        <input
                          type="datetime-local"
                          value={proximoContatoNota}
                          onChange={e => setProximoContatoNota(e.target.value)}
                          className="p-1 text-xs bg-white border border-stone-200 rounded-lg"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddTimeline(selectedLead.id)}
                        disabled={!novaNota.trim()}
                        className="px-4 py-1.5 bg-[#2D0A16] hover:bg-[#3B0D1E] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Registrar
                      </button>
                    </div>
                  </div>

                  {/* Lista Cronológica de Eventos */}
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                    {selectedLead.timeline && selectedLead.timeline.length > 0 ? (
                      selectedLead.timeline.map((item, idx) => (
                        <div key={item.id || idx} className="relative pl-8 space-y-1">
                          <div className="absolute left-1.5 top-1.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#2D0A16]" />
                          <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-stone-900">{item.titulo}</span>
                              <span className="text-stone-400 tabular-nums">
                                {new Date(item.data).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            {item.descricao && <p className="text-xs text-stone-600">{item.descricao}</p>}
                            <span className="text-[10px] text-stone-400 block">Autor: {item.autorNome || 'Comercial'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 pl-8">Nenhum evento registrado ainda.</p>
                    )}
                  </div>
                </div>
              ) : (
                /* ─── ABA PROPOSTAS & COTAS ─── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Propostas Comerciais do Lead
                    </h3>
                    <button
                      type="button"
                      onClick={() => triggerOpenProposta(selectedLead)}
                      className="px-3 py-1.5 bg-[#2D0A16] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova Proposta
                    </button>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-2">
                    <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs text-stone-600 font-semibold">Simulações de Cota e Financiamento</p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Gere uma proposta formal com cálculo de parcelas, balões e comparativo de custos com barco
                      individual.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL INTELIGENTE DE TRANSIÇÃO: AGENDAMENTO DE VISITA / TEST DRIVE COM CHECAGEM DE CONFLITO ─── */}
      {leadParaVisita && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLeadParaVisita(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-5 border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Agendar Visita / Test Drive</h3>
                  <p className="text-[11px] text-stone-500">Lead: {leadParaVisita.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadParaVisita(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Embarcação para a Visita</label>
                <select
                  value={visitaBarcoId}
                  onChange={e => setVisitaBarcoId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                >
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nome} {b.modelo ? `(${b.modelo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Data da Visita</label>
                  <input
                    type="date"
                    value={visitaData}
                    onChange={e => setVisitaData(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Horário / Turno</label>
                  <div className="flex gap-1.5">
                    <input
                      type="time"
                      value={visitaHorario}
                      onChange={e => setVisitaHorario(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <select
                      value={visitaTurno}
                      onChange={e => setVisitaTurno(e.target.value)}
                      className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-[11px]"
                    >
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Box de Verificação de Conflitos na Marina */}
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
                <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-stone-500" /> Disponibilidade na Marina
                </span>

                {visitaChecandoConflito ? (
                  <p className="text-[11px] text-stone-400 animate-pulse">Consultando reservas e manutenções...</p>
                ) : visitaConflitos.length > 0 ? (
                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Atenção: Conflito de Agenda Detectado
                    </div>
                    {visitaConflitos.map((c, i) => (
                      <p key={i} className="text-[10px] pl-4">
                        • <strong>{c.titulo}</strong>: {c.detalhe}
                      </p>
                    ))}
                    <p className="text-[10px] text-amber-700 pt-1 font-medium">
                      A embarcação pode estar na água com cotista ou em reparo. Alinhe com a marina antes de confirmar.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-stone-700 text-[11px] font-medium bg-white p-2 rounded-lg border border-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Embarcação liberada e disponível na marina para esta data.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setLeadParaVisita(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmarVisita}
                className="px-4 py-2 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirmar Visita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL INTELIGENTE DE TRANSIÇÃO: MOTIVO DA PERDA & REPESCAGEM ─── */}
      {leadParaPerda && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLeadParaPerda(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-5 border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Registrar Perda do Lead</h3>
                  <p className="text-[11px] text-stone-500">Lead: {leadParaPerda.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadParaPerda(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Qual foi o motivo da perda? *</label>
                <select
                  value={motivoPerdaInput}
                  onChange={e => setMotivoPerdaInput(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                >
                  <option value="">Selecione um motivo...</option>
                  <option value="Valor da cota acima do orçamento previsto">Valor acima do orçamento previsto</option>
                  <option value="Decidiu adiar a aquisição para o próximo semestre">Decidiu adiar para o próximo semestre</option>
                  <option value="Permuta / Trade-in do cliente não foi aprovada">Permuta não aprovada pela diretoria</option>
                  <option value="Comprou barco individual em outra marina">Comprou barco individual</option>
                  <option value="Parou de responder contatos (Ghosting)">Parou de responder (Ghosting)</option>
                  <option value="Distância / Preferiu marina em outra cidade">Localização / Outra marina</option>
                  <option value="outro">Outro motivo (descrever)...</option>
                </select>
              </div>

              {motivoPerdaInput === 'outro' && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Descreva o motivo:</label>
                  <textarea
                    rows={2}
                    value={motivoPerdaOutro}
                    onChange={e => setMotivoPerdaOutro(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              )}

              {/* Data Futura de Repescagem */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                <label className="font-bold text-stone-800 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-stone-500" /> Agendar Repescagem Futura (Opcional)
                </label>
                <p className="text-[10px] text-stone-500">
                  Defina uma data limite para voltar a cobrar este contato na próxima temporada.
                </p>
                <input
                  type="date"
                  value={repescagemData}
                  onChange={e => setRepescagemData(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setLeadParaPerda(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmarPerda}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. MODAL DE RESERVA DE COTA 48H ─── */}
      {leadParaReserva && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLeadParaReserva(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-5 border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Bloqueio Temporário de Cota (48h)</h3>
                  <p className="text-[11px] text-stone-500">Lead: {leadParaReserva.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadParaReserva(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Embarcação</label>
                <select
                  value={reservaBarcoId}
                  onChange={e => setReservaBarcoId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                >
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cota a Bloquear</label>
                  <select
                    value={reservaCota}
                    onChange={e => setReservaCota(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-[#2D0A16]"
                  >
                    {['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'].map(c => (
                      <option key={c} value={c}>
                        Cota {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Prazo de Expiração</label>
                  <select
                    value={reservaHoras}
                    onChange={e => setReservaHoras(Number(e.target.value))}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value={24}>24 Horas</option>
                    <option value={48}>48 Horas (Padrão)</option>
                    <option value={72}>72 Horas</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                🔒 Esta cota ficará com status <strong>RESERVADA</strong> para outros vendedores no catálogo até o prazo
                expirar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setLeadParaReserva(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReserva48h}
                className="px-4 py-2 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. MODAL DE NOVO LEAD / CADASTRO COMPLETO & RÁPIDO ─── */}
      {isNewLeadModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsNewLeadModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 bg-stone-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2D0A16]/5 text-[#2D0A16] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Cadastrar Novo Lead</h3>
                  <p className="text-[11px] text-stone-500">Registro comercial completo para atendimento e follow-up no WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              {/* 1. Identificação Básica */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingLead?.nome || ''}
                    onChange={e => setEditingLead(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-none focus:border-[#2D0A16]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      WhatsApp / Telefone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingLead?.telefone || ''}
                      onChange={e => setEditingLead(prev => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                      placeholder="(87) 99999-8888"
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:border-[#2D0A16]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Cidade / Região</label>
                    <input
                      type="text"
                      value={editingLead?.cidade || ''}
                      onChange={e => setEditingLead(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Ex: Petrolina - PE"
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">CPF (Opcional)</label>
                  <input
                    type="text"
                    value={editingLead?.cpf || ''}
                    onChange={e => setEditingLead(prev => ({ ...prev, cpf: maskCpf(e.target.value) }))}
                    placeholder="000.000.000-00"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                  />
                </div>
              </div>

              {/* 2. Embarcação de Interesse & Valores */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Embarcações de Interesse <span className="text-[11px] font-normal text-stone-500">(pesquisável, selecione uma ou mais)</span>
                  </label>
                  <BoatMultiSelect
                    boats={boats}
                    selectedIds={editingLead?.embarcacoesInteresse || []}
                    onChange={ids => {
                      setEditingLead(prev => {
                        const next = { ...prev, embarcacoesInteresse: ids };
                        if ((!next.valorEstimado || next.valorEstimado === 0) && ids.length > 0) {
                          const b = boats.find(boat => boat.id === ids[0]);
                          if (b?.valorCota) next.valorEstimado = Number(b.valorCota);
                        }
                        return next;
                      });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Tipo de Interesse</label>
                    <select
                      value={editingLead?.tipoInteresse || 'lancha'}
                      onChange={e => setEditingLead(prev => ({ ...prev, tipoInteresse: e.target.value as any }))}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                    >
                      <option value="lancha">🚤 Lancha</option>
                      <option value="jet">🌊 Jet Ski</option>
                      <option value="ambos">⚓ Ambos (Lancha & Jet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      value={editingLead?.valorEstimado || ''}
                      onChange={e => setEditingLead(prev => ({ ...prev, valorEstimado: Number(e.target.value) || 0 }))}
                      placeholder="Ex: 85000"
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-none focus:border-[#2D0A16]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Origem & Qualificação */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Origem do Contato</label>
                    <select
                      value={editingLead?.origem || 'instagram'}
                      onChange={e => setEditingLead(prev => ({ ...prev, origem: e.target.value as any }))}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                    >
                      <option value="instagram">Instagram Direct / Ads</option>
                      <option value="indicacao">Indicação de Cotista</option>
                      <option value="catalogo">Catálogo Digital</option>
                      <option value="presencial">Presencial Marina</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Temperatura</label>
                    <select
                      value={editingLead?.temperatura || 'quente'}
                      onChange={e => setEditingLead(prev => ({ ...prev, temperatura: e.target.value as any }))}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                    >
                      <option value="quente">🔥 Quente (Interesse alto)</option>
                      <option value="morno">🌤️ Morno (Em pesquisa)</option>
                      <option value="frio">❄️ Frio (Curioso / Futuro)</option>
                    </select>
                  </div>
                </div>

                {/* Campo dinâmico quando Origem === 'indicacao' */}
                {editingLead?.origem === 'indicacao' && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 animate-in fade-in-50 duration-150">
                    <label className="font-bold text-stone-800 block">Cotista que Indicou</label>
                    <CotistaSelect
                      clients={clients}
                      selectedId={editingLead?.indicadoPorClienteId}
                      onChange={cli => {
                        setEditingLead(prev => ({
                          ...prev,
                          indicadoPorClienteId: cli ? cli.id : undefined,
                          indicadoPorClienteNome: cli ? cli.nome : undefined
                        }));
                      }}
                    />
                  </div>
                )}

                {/* Follow-up / Próximo Contato */}
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Próximo Contato / Follow-up</label>
                  <input
                    type="datetime-local"
                    value={editingLead?.proximoContatoEm || ''}
                    onChange={e => setEditingLead(prev => ({ ...prev, proximoContatoEm: e.target.value }))}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#2D0A16]"
                  />
                </div>
              </div>

              {/* 4. Permuta / Trade-in */}
              <div className="pt-2 border-t border-stone-100">
                <div className="p-3 bg-stone-50/60 rounded-xl border border-stone-200/80 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(editingLead?.possuiPermuta)}
                      onChange={e => setEditingLead(prev => ({ ...prev, possuiPermuta: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#2D0A16] border-stone-300 focus:ring-[#2D0A16]"
                    />
                    <span className="font-bold text-stone-800 text-xs">
                      Interessado possui veículo ou barco na troca (Permuta / Trade-in)
                    </span>
                  </label>

                  {editingLead?.possuiPermuta && (
                    <div className="pt-1 animate-in fade-in-50 duration-150">
                      <input
                        type="text"
                        value={editingLead?.resumoPermuta || ''}
                        onChange={e => setEditingLead(prev => ({ ...prev, resumoPermuta: e.target.value }))}
                        placeholder="Ex: Corolla XEi 2022 ou Jet Yamaha VX - Pretende R$ 120.000"
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-[#2D0A16]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Perfil Náutico */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <div className="p-3 bg-stone-50/60 rounded-xl border border-stone-200/80 space-y-2">
                  <h4 className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#2D0A16]" />
                    Perfil & Experiência Náutica
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-semibold text-stone-600 block mb-1 text-[11px]">Habilitação Náutica</label>
                      <select
                        value={editingLead?.perfilNautico?.categoriaHabilitacao || 'nao_possui'}
                        onChange={e => {
                          const cat = e.target.value;
                          setEditingLead(prev => ({
                            ...prev,
                            perfilNautico: {
                              ...prev?.perfilNautico,
                              possuiHabilitacao: cat !== 'nao_possui',
                              categoriaHabilitacao: cat
                            }
                          }));
                        }}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#2D0A16]"
                      >
                        <option value="nao_possui">Não possui habilitação</option>
                        <option value="motonauta">Motonauta (Jet Ski)</option>
                        <option value="arrais">Arrais Amador</option>
                        <option value="mestre">Mestre Amador</option>
                        <option value="capitao">Capitão Amador</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-stone-600 block mb-1 text-[11px]">Já teve barco ou jet?</label>
                      <select
                        value={editingLead?.perfilNautico?.jaTeveBarcoOuJet ? 'sim' : 'nao'}
                        onChange={e => {
                          const jaTeve = e.target.value === 'sim';
                          setEditingLead(prev => ({
                            ...prev,
                            perfilNautico: {
                              ...prev?.perfilNautico,
                              jaTeveBarcoOuJet: jaTeve
                            }
                          }));
                        }}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#2D0A16]"
                      >
                        <option value="nao">Não, nunca teve</option>
                        <option value="sim">Sim, já possuiu antes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Observações Iniciais / Notas */}
              <div className="pt-2 border-t border-stone-100">
                <label className="font-bold text-stone-700 block mb-1">
                  Observações Iniciais / Notas do WhatsApp
                </label>
                <textarea
                  rows={2}
                  value={editingLead?.detalhes || ''}
                  onChange={e => setEditingLead(prev => ({ ...prev, detalhes: e.target.value }))}
                  placeholder="Anotações rápidas da conversa: horários preferidos, passeios com família, etc."
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-[#2D0A16] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setIsNewLeadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!editingLead?.nome?.trim()) {
                    alert('Informe o nome do lead.');
                    return;
                  }
                  if (!editingLead?.telefone?.trim()) {
                    alert('Informe o telefone/WhatsApp do lead.');
                    return;
                  }
                  handleSaveLead(editingLead);
                }}
                className="px-5 py-2 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Salvar Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 10. MODAIS INTEGRADOS AUXILIARES (PROPOSTA, TEST DRIVE, VENDA) ─── */}
      {isPropostaDrawerOpen && (
        <ComercialPropostaDrawer
          isOpen={isPropostaDrawerOpen}
          onClose={() => setIsPropostaDrawerOpen(false)}
          initialLead={internalPropostaLead}
          initialBoatId={internalPropostaBoatId}
          onPropostaCreated={() => {
            setIsPropostaDrawerOpen(false);
            fetchLeads();
          }}
        />
      )}

      {isSeaTrialModalOpen && (
        <ComercialSeaTrialModal
          isOpen={isSeaTrialModalOpen}
          onClose={() => setIsSeaTrialModalOpen(false)}
          initialLead={internalSeaTrialLead}
          initialBoatId={internalSeaTrialBoatId}
          providedBoats={boats}
          onSuccess={() => {
            setIsSeaTrialModalOpen(false);
            fetchLeads();
          }}
        />
      )}

      {isVendaDrawerOpen && (
        <ComercialVendaDrawer
          open={isVendaDrawerOpen}
          onClose={() => setIsVendaDrawerOpen(false)}
          preselectedBoatId={internalVendaBoatId}
          onSuccess={() => {
            setIsVendaDrawerOpen(false);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
