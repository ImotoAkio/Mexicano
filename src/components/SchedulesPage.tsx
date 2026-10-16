import React, { useState, useEffect, useMemo, useRef } from 'react';
import { reservationDB, boatDB, clientDB, syncWithRemote } from '../db';
import { io } from 'socket.io-client';
import { Reserva, Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  isCalendarConnected
} from '../googleCalendar';
import { JetSkiIcon } from './icons/JetSkiIcon';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Anchor,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  FileDown,
  ShieldAlert,
  Wrench,
  AlertTriangle,
  LayoutGrid,
  List,
  Phone,
  Navigation,
  Tent,
  Flame,
  Armchair,
  Table2,
  Sun,
  Sunset,
  Sunrise,
  User,
  X,
  Filter,
  Check,
  Send,
  MessageCircle
} from 'lucide-react';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import SearchableSelect, { SelectOption } from './shared/SearchableSelect';

export type PierStatusKey = 'todos' | 'agendado' | 'no_pier' | 'navegando' | 'retornou' | 'guardada' | 'cancelado';

export function getPierStatus(res: Reserva): {
  id: 'agendado' | 'no_pier' | 'navegando' | 'retornou' | 'guardada' | 'cancelado';
  label: string;
  bg: string;
  text: string;
  dot: string;
  timeLabel?: string;
} {
  const isCanceled = res.status === 'cancelado';
  const isGuardado = res.statusMarina === 'guardada' || res.statusOperacional === 'guardado' || !!res.horaSubida;
  const isChegada = res.statusMarina === 'chegada' || res.statusOperacional === 'retornou' || (!!res.horaChegada && !isGuardado);
  const isNavegando = res.statusMarina === 'saida' || res.statusOperacional === 'navegando' || (!!res.horaSaida && !isChegada && !isGuardado);
  const isNoPier = (res.statusMarina as string) === 'pronta' || res.statusMarina === 'descida' || res.statusMarina === 'pier' || res.statusOperacional === 'pronto_na_agua' || (!!res.horaDescida && !isNavegando && !isChegada && !isGuardado);

  if (isCanceled) {
    return { id: 'cancelado', label: 'Cancelado', bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', dot: 'bg-[#EF4444]' };
  }
  if (isGuardado) {
    return {
      id: 'guardada',
      label: 'Guardada (Hangar)',
      bg: 'bg-[#F3F4F6]',
      text: 'text-[#374151]',
      dot: 'bg-[#6B7280]',
      timeLabel: res.horaSubida ? `Subida: ${res.horaSubida}` : undefined
    };
  }
  if (isChegada) {
    return {
      id: 'retornou',
      label: 'No Píer (Retorno)',
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#D97706]',
      dot: 'bg-[#F59E0B]',
      timeLabel: res.horaChegada ? `Chegada: ${res.horaChegada}` : undefined
    };
  }
  if (isNavegando) {
    return {
      id: 'navegando',
      label: 'Em Navegação',
      bg: 'bg-[#F0F9FF]',
      text: 'text-[#0284C7]',
      dot: 'bg-[#0EA5E9] animate-pulse',
      timeLabel: res.horaSaida ? `Saída: ${res.horaSaida}` : undefined
    };
  }
  if (isNoPier) {
    return {
      id: 'no_pier',
      label: 'Pronto no Píer',
      bg: 'bg-[#F0FDF4]',
      text: 'text-[#16A34A]',
      dot: 'bg-[#22C55E]',
      timeLabel: res.horaDescida ? `Descida: ${res.horaDescida}` : undefined
    };
  }
  return {
    id: 'agendado',
    label: res.status === 'confirmado' ? 'Confirmado' : 'Agendado',
    bg: res.status === 'confirmado' ? 'bg-[#EEF2FF]' : 'bg-[#F9FAFB]',
    text: res.status === 'confirmado' ? 'text-[#3758F9]' : 'text-[#6B7280]',
    dot: res.status === 'confirmado' ? 'bg-[#3758F9]' : 'bg-[#9CA3AF]'
  };
}

export default function SchedulesPage() {
  // Helper for local YYYY-MM-DD string
  const getLocalDateStr = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State Management
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarBoatFilter, setCalendarBoatFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'table' | 'calendar' | 'cards'>('table');

  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stepper functions for days
  const stepDate = (offset: number) => {
    const cur = new Date(selectedDate + 'T12:00:00');
    cur.setDate(cur.getDate() + offset);
    setSelectedDate(getLocalDateStr(cur));
  };

  const getSubsequentDays = () => {
    const cur = new Date(selectedDate + 'T12:00:00');
    const dates = [];
    const todayStr = getLocalDateStr(new Date());
    for (let i = -2; i <= 4; i++) {
      const d = new Date(cur);
      d.setDate(d.getDate() + i);
      const dStr = getLocalDateStr(d);
      dates.push({
        dateStr: dStr,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        weekday: dStr === todayStr ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      });
    }
    return dates;
  };

  // Search & Filters (including Pier and Overdue)
  const [searchQuery, setSearchQuery] = useState('');
  const [pierStatusFilter, setPierStatusFilter] = useState<PierStatusKey>('todos');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Lancha' | 'Jetski'>('Todos');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Modals
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [statusModalEvent, setStatusModalEvent] = useState<Reserva | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  // Load Data
  const loadData = async (isInitial = false) => {
    // 1. Instant display from in-memory cache if available
    const cachedRes = reservationDB.getAll();
    if (cachedRes.length > 0) {
      setReservations([...cachedRes]);
      setBoats([...boatDB.getAll()]);
      setClients([...clientDB.getAll()]);
    }

    if (isInitial || cachedRes.length === 0) {
      setIsLoading(true);
    }

    try {
      // 2. Fetch full remote database from server
      await syncWithRemote();
      setReservations([...reservationDB.getAll()]);
      setBoats([...boatDB.getAll()]);
      setClients([...clientDB.getAll()]);
    } catch (err) {
      console.error('Erro ao sincronizar com servidor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const token = localStorage.getItem('admin_token');
    let socket: any = null;
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        socket = io(window.location.origin, {
          auth: { token },
          transports: ['polling', 'websocket'],
          reconnectionAttempts: 5
        });

        socket.on('marina_update', async () => {
          await syncWithRemote();
          setReservations([...reservationDB.getAll()]);
          setBoats([...boatDB.getAll()]);
          setClients([...clientDB.getAll()]);
        });
      } catch (e) {
        console.warn('Socket connection warning:', e);
      }
    }

    const interval = setInterval(async () => {
      try {
        await syncWithRemote();
        setReservations([...reservationDB.getAll()]);
        setBoats([...boatDB.getAll()]);
        setClients([...clientDB.getAll()]);
      } catch (e) {
        // silent sync
      }
    }, 12000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  // Filtered reservations for selected day
  const dailyReservations = useMemo(() => {
    return reservations.filter(r => r.data === selectedDate);
  }, [reservations, selectedDate]);

  const filteredDailyReservations = useMemo(() => {
    return dailyReservations.filter((res) => {
      // 1. Pier Status Filter
      if (pierStatusFilter !== 'todos') {
        const pStatus = getPierStatus(res);
        if (pStatus.id !== pierStatusFilter) return false;
      }

      // 2. Type Filter
      const boat = boatDB.getById(res.embarcacaoId);
      const boatType = boat?.tipo === 'jet' ? 'Jetski' : 'Lancha';
      if (typeFilter !== 'Todos' && boatType !== typeFilter) return false;

      // 3. Overdue / Financial Filter
      if (onlyOverdue) {
        const client = clientDB.getById(res.clienteId);
        if (client?.statusFinanceiro !== 'inadimplente') return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const client = clientDB.getById(res.clienteId);
        const boatMatch = boat ? boat.nome.toLowerCase().includes(q) || getBoatCode(boat).toLowerCase().includes(q) : false;
        const clientMatch = client ? client.nome.toLowerCase().includes(q) || (client.telefone && client.telefone.includes(q)) : false;
        const obsMatch = res.observações ? res.observações.toLowerCase().includes(q) : false;
        if (!boatMatch && !clientMatch && !obsMatch) return false;
      }

      return true;
    });
  }, [dailyReservations, pierStatusFilter, typeFilter, onlyOverdue, searchQuery]);

  const jumpToToday = () => {
    const today = new Date();
    setSelectedDate(getLocalDateStr(today));
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Actions
  const handleDeleteReservation = async (res: Reserva) => {
    const boat = boatDB.getById(res.embarcacaoId);
    const client = clientDB.getById(res.clienteId);
    const confirmText = `Deseja realmente excluir o agendamento de ${boat ? getBoatCode(boat) : 'embarcação'} para ${client ? client.nome : 'cliente'} em ${res.data}?`;
    if (!window.confirm(confirmText)) return;

    try {
      if (res.googleEventId && isCalendarConnected()) {
        try {
          await deleteGoogleCalendarEvent(res.googleEventId, res.embarcacaoId);
        } catch (e) {
          console.warn('Google event delete warning:', e);
        }
      }
      reservationDB.delete(res.id);
      loadData();
      showToast('Agendamento excluído com sucesso.');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir agendamento.', 'error');
    }
  };

  const handleGeneratePDF = async (res: Reserva) => {
    try {
      const boat = boatDB.getById(res.embarcacaoId);
      const client = clientDB.getById(res.clienteId);
      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
      const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
      const ownerName = client ? client.nome : 'Desconhecido';

      let formattedDate = res.data;
      if (formattedDate.includes('-')) {
        const [y, m, d] = formattedDate.split('-');
        formattedDate = `${d} / ${m} / ${y}`;
      }

      await generateAvisoSaidaPDF({
        data: formattedDate,
        nome: ownerName,
        tipo: boatType,
        nomeEmbarcacao: boatCode,
        pessoasABordo: String(res.pessoasABordo || '02'),
        destino: res.destino || 'Iate Club - Rodeadouro',
        previsaoSaida: res.previsaoSaida || (res.periodo === 'tarde' ? '13:00' : '08:00'),
        previsaoChegada: res.previsaoChegada || (res.periodo === 'manha' ? '13:00' : '18:00'),
        observacao: res.observações || 'Nenhuma'
      });

      showToast('Aviso de Saída (PDF) gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF.', 'error');
    }
  };

  // Metrics for Top Bento Cards
  const metrics = useMemo(() => {
    const curYear = calendarMonth.getFullYear();
    const curMonth = calendarMonth.getMonth();
    const monthPrefix = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;

    const monthReservations = reservations.filter(r => r.data.startsWith(monthPrefix) && r.status !== 'cancelado');
    const dayConfirmed = dailyReservations.filter(r => r.status === 'confirmado' || (r.statusMarina as string) === 'confirmada').length;
    const dayLanchas = dailyReservations.filter(r => {
      const b = boatDB.getById(r.embarcacaoId);
      return b?.tipo !== 'jet';
    }).length;
    const dayJets = dailyReservations.filter(r => {
      const b = boatDB.getById(r.embarcacaoId);
      return b?.tipo === 'jet';
    }).length;

    const overdueCount = dailyReservations.filter(r => {
      const c = clientDB.getById(r.clienteId);
      return c?.statusFinanceiro === 'inadimplente';
    }).length;

    return {
      monthTotal: monthReservations.length,
      dayTotal: dailyReservations.length,
      dayConfirmed,
      dayLanchas,
      dayJets,
      overdueCount
    };
  }, [reservations, dailyReservations, calendarMonth]);

  const parsedSelectedDate = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[999] px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-[#F0FDF4] text-[#16A34A] border-[#22C55E]/30' : 'bg-[#FEF2F2] text-[#DC2626] border-[#EF4444]/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* 1. TailGrids Application Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3758F9] font-medium text-xs">
              Módulo Náutico
            </span>
            <span>/</span>
            <span>Administração</span>
            <span>/</span>
            <span className="text-[#111827] font-semibold">Agendamentos de Cotas</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
            Calendário e Agendamentos de Cotas
          </h1>
          <p className="text-sm text-[#6B7280]">
            Controle de reservas em tempo real, visualização mensal da grade de embarcações e emissão de saídas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-[#374151] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors cursor-pointer disabled:opacity-40"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={jumpToToday}
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-[#3758F9] hover:bg-[#EEF2FF] border border-[#3758F9] bg-transparent transition-colors cursor-pointer"
          >
            Ir para Hoje
          </button>

          <button
            onClick={() => setIsNewBookingModalOpen(true)}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg bg-[#3758F9] hover:bg-[#1B44C8] text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Reserva
          </button>
        </div>
      </div>

      {/* 2. TailGrids Bento Metric Widgets (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Reservas no Mês */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
              Reservas no Mês
            </span>
            <h3 className="text-2xl font-bold text-[#111827]">
              {metrics.monthTotal}
            </h3>
            <p className="text-xs text-[#6B7280] capitalize">
              {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#3758F9]">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Saídas da Data Selecionada */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
              Saídas em {parsedSelectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <h3 className="text-2xl font-bold text-[#111827]">
              {metrics.dayTotal} agendamentos
            </h3>
            <p className="text-xs text-[#6B7280]">
              {metrics.dayLanchas} lancha(s) • {metrics.dayJets} jet(s)
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#F0F9FF] flex items-center justify-center text-[#0EA5E9]">
            <Anchor className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Confirmadas / Na Água */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
              Confirmadas Hoje
            </span>
            <h3 className="text-2xl font-bold text-[#16A34A]">
              {metrics.dayConfirmed}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {metrics.dayTotal - metrics.dayConfirmed} pendente(s) de liberação
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#22C55E]">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Alertas Financeiros */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
              Inadimplência na Data
            </span>
            <h3 className={`text-2xl font-bold ${metrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              {metrics.overdueCount > 0 ? `${metrics.overdueCount} cotista(s)` : 'Tudo em dia'}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {metrics.overdueCount > 0 ? 'Possuem valores em atraso' : 'Sem débitos identificados'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            metrics.overdueCount > 0 ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#F0FDF4] text-[#22C55E]'
          }`}>
            {metrics.overdueCount > 0 ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs: Tabela do Dia (Padrão) vs Calendário Mensal vs Cards */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Main View Tabs */}
        <div className="inline-flex bg-[#F3F4F6] p-1 rounded-lg border border-[#E5E7EB]">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-[#3758F9] text-white shadow-xs font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Tabela do Dia ({dailyReservations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#3758F9] text-white shadow-xs font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendário & WhatsApp</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'calendar' ? 'bg-white/20 text-white' : 'bg-[#25D366] text-white'
            }`}>
              WhatsApp
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-[#3758F9] text-white shadow-xs font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Cards do Dia</span>
          </button>
        </div>

        {/* Selected Date Indicator */}
        <div className="flex items-center gap-2 text-sm text-[#374151]">
          <span className="text-xs text-[#6B7280] uppercase font-bold">Data Ativa:</span>
          <span className="px-3 py-1 bg-[#EEF2FF] text-[#3758F9] font-semibold rounded-md border border-[#3758F9]/20">
            {parsedSelectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {activeTab === 'calendar' ? (
        /* ========================================================================= */
        /* GERADOR DE CALENDÁRIO MENSAL & DISPARO PARA O WHATSAPP                    */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* TailGrids Explanatory Banner for WhatsApp Dispatch */}
          <div className="bg-[#F0FDF4] border border-[#22C55E]/30 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] border border-[#22C55E]/40 flex items-center justify-center text-[#16A34A] shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#15803D] flex items-center gap-2">
                  <span>Escala Mensal e Envio para Grupos de WhatsApp</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#25D366] text-white uppercase">
                    Disparo Direto
                  </span>
                </h3>
                <p className="text-xs text-[#166534] mt-0.5 leading-relaxed">
                  Selecione a embarcação desejada para gerar a tabela gráfica oficial com o logo da marina e envie automaticamente para o grupo de WhatsApp da embarcação, ou copie a imagem renderizada para a área de transferência.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('table')}
              className="px-4 py-2 bg-white text-[#15803D] hover:bg-[#F0FDF4] border border-[#22C55E]/30 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
            >
              Ver Tabela do Dia
            </button>
          </div>

          {/* Componente Oficial do Gerador de Calendário com Envio para WhatsApp */}
          <MonthlyCalendarGenerator
            initialDate={selectedDate}
            providedBoats={boats}
            providedReservations={reservations}
            providedClients={clients}
          />
        </div>
      ) : activeTab === 'table' ? (
        /* ========================================================================= */
        /* STRUCTURED TABLE VIEW (PADRÃO)                                            */
        /* ========================================================================= */
        <div className="space-y-6">
          <DayAgendaSection
            selectedDate={selectedDate}
            parsedSelectedDate={parsedSelectedDate}
            dailyReservations={dailyReservations}
            reservations={filteredDailyReservations}
            allReservationsCount={dailyReservations.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            pierStatusFilter={pierStatusFilter}
            setPierStatusFilter={setPierStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onlyOverdue={onlyOverdue}
            setOnlyOverdue={setOnlyOverdue}
            onOpenNewModal={() => setIsNewBookingModalOpen(true)}
            onOpenStatusModal={(res) => setStatusModalEvent(res)}
            onGeneratePDF={handleGeneratePDF}
            onDelete={handleDeleteReservation}
            onStepDate={stepDate}
            onSetToday={jumpToToday}
            onSelectDate={setSelectedDate}
            daysRibbon={getSubsequentDays()}
            isLoading={isLoading}
            allSystemReservations={reservations}
            forceView="table"
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* CARDS VIEW                                                                */
        /* ========================================================================= */
        <div className="space-y-6">
          <DayAgendaSection
            selectedDate={selectedDate}
            parsedSelectedDate={parsedSelectedDate}
            dailyReservations={dailyReservations}
            reservations={filteredDailyReservations}
            allReservationsCount={dailyReservations.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            pierStatusFilter={pierStatusFilter}
            setPierStatusFilter={setPierStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onlyOverdue={onlyOverdue}
            setOnlyOverdue={setOnlyOverdue}
            onOpenNewModal={() => setIsNewBookingModalOpen(true)}
            onOpenStatusModal={(res) => setStatusModalEvent(res)}
            onGeneratePDF={handleGeneratePDF}
            onDelete={handleDeleteReservation}
            onStepDate={stepDate}
            onSetToday={jumpToToday}
            onSelectDate={setSelectedDate}
            daysRibbon={getSubsequentDays()}
            isLoading={isLoading}
            allSystemReservations={reservations}
            forceView="cards"
          />
        </div>
      )}

      {/* 5. NEW RESERVATION MODAL (REALIZAR AGENDAMENTOS RESERVAS) */}
      {isNewBookingModalOpen && (
        <NewBookingModal
          defaultDate={selectedDate}
          boats={boats}
          onClose={() => setIsNewBookingModalOpen(false)}
          onSuccess={(msg) => {
            setIsNewBookingModalOpen(false);
            loadData();
            showToast(msg);
          }}
        />
      )}

      {/* 6. STATUS MODAL */}
      {statusModalEvent && (
        <EditStatusModal
          reserva={statusModalEvent}
          onClose={() => setStatusModalEvent(null)}
          onSuccess={(msg) => {
            setStatusModalEvent(null);
            loadData();
            showToast(msg);
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* DAY AGENDA COMPONENT (FILTERS, TABLE & CARDS)                             */
/* ========================================================================= */
interface DayAgendaSectionProps {
  selectedDate: string;
  parsedSelectedDate: Date;
  dailyReservations: Reserva[];
  reservations: Reserva[];
  allReservationsCount: number;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  pierStatusFilter: PierStatusKey;
  setPierStatusFilter: (v: PierStatusKey) => void;
  typeFilter: 'Todos' | 'Lancha' | 'Jetski';
  setTypeFilter: (v: 'Todos' | 'Lancha' | 'Jetski') => void;
  onlyOverdue: boolean;
  setOnlyOverdue: (v: boolean) => void;
  onOpenNewModal: () => void;
  onOpenStatusModal: (r: Reserva) => void;
  onGeneratePDF: (r: Reserva) => void;
  onDelete: (r: Reserva) => void;
  onStepDate?: (offset: number) => void;
  onSetToday?: () => void;
  onSelectDate?: (d: string) => void;
  daysRibbon?: Array<{ dateStr: string; label: string; weekday: string }>;
  isLoading?: boolean;
  allSystemReservations?: Reserva[];
  forceView?: 'table' | 'cards';
}

function DayAgendaSection({
  selectedDate,
  parsedSelectedDate,
  dailyReservations,
  reservations,
  allReservationsCount,
  searchQuery,
  setSearchQuery,
  pierStatusFilter,
  setPierStatusFilter,
  typeFilter,
  setTypeFilter,
  onlyOverdue,
  setOnlyOverdue,
  onOpenNewModal,
  onOpenStatusModal,
  onGeneratePDF,
  onDelete,
  onStepDate,
  onSetToday,
  onSelectDate,
  daysRibbon,
  isLoading,
  allSystemReservations,
  forceView = 'table'
}: DayAgendaSectionProps) {
  const [internalView, setInternalView] = useState<'table' | 'cards'>(forceView);

  const viewMode = forceView || internalView;

  // Active dates with bookings across system for empty state suggestions
  const activeBookingDates = useMemo(() => {
    if (!allSystemReservations || allSystemReservations.length === 0) return [];
    const counts: Record<string, number> = {};
    allSystemReservations.forEach(r => {
      if (r.status !== 'cancelado') {
        counts[r.data] = (counts[r.data] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [allSystemReservations]);

  // Pier Status counts for the selected day
  const pierStatusCounts = useMemo(() => {
    const counts: Record<PierStatusKey, number> = {
      todos: dailyReservations.length,
      agendado: 0,
      no_pier: 0,
      navegando: 0,
      retornou: 0,
      guardada: 0,
      cancelado: 0
    };
    dailyReservations.forEach(r => {
      const p = getPierStatus(r);
      counts[p.id]++;
    });
    return counts;
  }, [dailyReservations]);

  const hasActiveFilters = pierStatusFilter !== 'todos' || typeFilter !== 'Todos' || onlyOverdue || searchQuery.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Date Ribbon & Controls */}
      {daysRibbon && onStepDate && onSetToday && onSelectDate && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
            <button
              onClick={() => onStepDate(-1)}
              className="p-2 border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-[#374151] transition-colors cursor-pointer"
              title="Dia Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onSetToday}
              className="px-4 py-2 border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#374151] font-medium text-xs rounded-lg transition-colors cursor-pointer uppercase"
            >
              Hoje
            </button>
            <button
              onClick={() => onStepDate(1)}
              className="p-2 border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-[#374151] transition-colors cursor-pointer"
              title="Próximo Dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="ml-2 px-3 py-1.5 text-xs bg-white text-[#374151] border border-[#D1D5DB] rounded-lg focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 font-medium outline-none"
            />
          </div>

          {/* Quick Days Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto subtle-scrollbar w-full lg:w-auto py-1">
            {daysRibbon.map((dobj) => {
              const isSelected = selectedDate === dobj.dateStr;
              return (
                <button
                  key={dobj.dateStr}
                  onClick={() => onSelectDate(dobj.dateStr)}
                  className={`flex-1 lg:flex-none flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all text-center cursor-pointer min-w-[62px] ${
                    isSelected
                      ? 'bg-[#3758F9] text-white font-semibold shadow-xs'
                      : 'bg-[#F9FAFB] hover:bg-white text-[#4B5563] border border-[#E5E7EB]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1 opacity-80">
                    {dobj.weekday}
                  </span>
                  <span className="text-xs font-mono font-bold leading-none">
                    {dobj.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header & Filter Controls Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-sm space-y-4">
        {/* Row 1: Section Title & Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <span>Saídas Agendadas para</span>
              <span className="text-[#3758F9]">
                {parsedSelectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <span className="text-xs font-normal text-[#6B7280] capitalize">
                ({parsedSelectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })})
              </span>
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Exibindo <strong>{reservations.length}</strong> de <strong>{allReservationsCount}</strong> agendamento(s) cadastrado(s) para este dia.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher when embedded */}
            {!forceView && (
              <div className="inline-flex bg-[#F3F4F6] p-1 rounded-lg border border-[#E5E7EB]">
                <button
                  onClick={() => setInternalView('table')}
                  className={`p-1.5 rounded-md transition-colors ${internalView === 'table' ? 'bg-white text-[#3758F9] shadow-xs' : 'text-[#6B7280]'}`}
                  title="Modo Tabela"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInternalView('cards')}
                  className={`p-1.5 rounded-md transition-colors ${internalView === 'cards' ? 'bg-white text-[#3758F9] shadow-xs' : 'text-[#6B7280]'}`}
                  title="Modo Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onOpenNewModal}
              className="inline-flex items-center px-4 py-2 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Agendar Saída
            </button>
          </div>
        </div>

        <div className="h-px bg-[#E5E7EB]" />

        {/* Row 2: Search Input, Boat Type Pills & Inadimplentes Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cotista, barco (M19), telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 text-xs bg-white text-[#374151] border border-[#D1D5DB] rounded-lg placeholder-[#9CA3AF] focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#9CA3AF] hover:text-[#374151]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type Pills */}
            <div className="inline-flex bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB]">
              {(['Todos', 'Lancha', 'Jetski'] as const).map(tp => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    typeFilter === tp ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tp}
                </button>
              ))}
            </div>

            {/* Inadimplentes Toggle Button */}
            <button
              onClick={() => setOnlyOverdue(!onlyOverdue)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                onlyOverdue
                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#EF4444]/40 font-semibold shadow-2xs'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111827]'
              }`}
              title="Filtrar apenas cotistas com pendências financeiras em aberto"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyOverdue ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`} />
              <span>Inadimplentes</span>
            </button>
          </div>
        </div>

        {/* Row 3: FILTRO DE STATUS OPERACIONAL DO PÍER (MARINA) */}
        <div className="pt-2 border-t border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-[#3758F9]" />
              <span>Status Operacional do Píer:</span>
            </span>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setPierStatusFilter('todos');
                  setTypeFilter('Todos');
                  setOnlyOverdue(false);
                  setSearchQuery('');
                }}
                className="text-[11px] font-semibold text-[#3758F9] hover:underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto subtle-scrollbar pb-1">
            {[
              { id: 'todos', label: 'Todos', count: pierStatusCounts.todos, dot: 'bg-[#111827]' },
              { id: 'agendado', label: 'Agendado', count: pierStatusCounts.agendado, dot: 'bg-[#3758F9]' },
              { id: 'no_pier', label: 'Pronto no Píer', count: pierStatusCounts.no_pier, dot: 'bg-[#22C55E]' },
              { id: 'navegando', label: 'Em Navegação', count: pierStatusCounts.navegando, dot: 'bg-[#0EA5E9]' },
              { id: 'retornou', label: 'No Píer (Retorno)', count: pierStatusCounts.retornou, dot: 'bg-[#F59E0B]' },
              { id: 'guardada', label: 'Guardada (Hangar)', count: pierStatusCounts.guardada, dot: 'bg-[#6B7280]' },
              { id: 'cancelado', label: 'Cancelado', count: pierStatusCounts.cancelado, dot: 'bg-[#EF4444]' }
            ].map((btn) => {
              const isSelected = pierStatusFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setPierStatusFilter(btn.id as PierStatusKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#111827] text-white border-[#111827] shadow-xs font-semibold'
                      : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#111827]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : btn.dot}`} />
                  <span>{btn.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : btn.count > 0
                        ? 'bg-[#EEF2FF] text-[#3758F9]'
                        : 'bg-[#F3F4F6] text-[#9CA3AF]'
                    }`}
                  >
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Rendering: Table or Cards */}
      {isLoading && allReservationsCount === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-16 text-center text-[#6B7280] space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 text-[#3758F9] animate-spin mx-auto" />
          <h4 className="text-base font-semibold text-[#111827]">Sincronizando agendamentos...</h4>
          <p className="text-xs text-[#6B7280]">Carregando as reservas e embarcações do servidor.</p>
        </div>
      ) : allReservationsCount === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center text-[#6B7280] space-y-4 shadow-sm">
          <CalendarIcon className="w-10 h-10 text-[#9CA3AF] mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-[#111827]">Nenhum agendamento para esta data</h4>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Não há saídas marcadas para {parsedSelectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}.
            </p>
          </div>

          {/* Quick jump to dates with active bookings */}
          {activeBookingDates.length > 0 && onSelectDate && (
            <div className="pt-3 border-t border-[#E5E7EB] max-w-lg mx-auto">
              <span className="text-xs font-semibold text-[#374151] block mb-2">
                📅 Datas com agendamentos cadastrados no sistema:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeBookingDates.map(([dStr, count]) => {
                  const parts = dStr.split('-');
                  const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                  return (
                    <button
                      key={dStr}
                      onClick={() => onSelectDate(dStr)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EEF2FF] text-[#3758F9] hover:bg-[#E0E7FF] border border-[#3758F9]/20 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{formatted} ({count} {count === 1 ? 'saída' : 'saídas'})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={onOpenNewModal}
              className="inline-flex items-center px-5 py-2.5 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer mt-1"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Reserva
            </button>
          </div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center text-[#6B7280] space-y-3 shadow-sm">
          <Search className="w-10 h-10 text-[#9CA3AF] mx-auto" />
          <h4 className="text-sm font-semibold text-[#111827]">Nenhum agendamento para os filtros selecionados</h4>
          <p className="text-xs text-[#6B7280]">
            Não foram encontradas saídas correspondentes aos filtros de status do píer ou busca ativa.
          </p>
          <button
            onClick={() => {
              setPierStatusFilter('todos');
              setTypeFilter('Todos');
              setOnlyOverdue(false);
              setSearchQuery('');
            }}
            className="inline-flex items-center px-4 py-2 border border-[#D1D5DB] bg-white hover:bg-[#F3F4F6] text-[#374151] rounded-lg text-xs font-medium transition-colors cursor-pointer mt-2"
          >
            Redefinir Filtros
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Embarcação</th>
                  <th className="px-6 py-4">Cotista / Sócio</th>
                  <th className="px-6 py-4">Status Píer / Marina</th>
                  <th className="px-6 py-4">Observações</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-sm text-[#1F2937]">
                {reservations.map(res => {
                  const boat = boatDB.getById(res.embarcacaoId);
                  const client = clientDB.getById(res.clienteId);
                  const boatCode = boat ? getBoatCode(boat) : 'M00';
                  const isJet = boat?.tipo === 'jet';
                  const ownerName = client ? client.nome : 'Desconhecido';
                  const initials = ownerName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'SO';
                  const pStatus = getPierStatus(res);

                  return (
                    <tr key={res.id} className="hover:bg-[#F9FAFB] transition-colors">
                      {/* Embarcação */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                            isJet ? 'bg-[#FFFBEB] text-[#D97706] border-[#F59E0B]/30' : 'bg-[#EEF2FF] text-[#3758F9] border-[#3758F9]/30'
                          }`}>
                            {isJet ? <JetSkiIcon className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-[#111827]">
                              <span>{boatCode}</span>
                              {boat?.emManutencao && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FEF2F2] text-[#DC2626] font-sans font-medium">
                                  Manutenção
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#6B7280]">
                              {boat?.nome || 'Embarcação'} • {isJet ? 'Jet' : 'Lancha'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cotista */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#3758F9] font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-[#1F2937] block">{ownerName}</span>
                            {client?.telefone && (
                              <span className="text-xs text-[#6B7280]">{client.telefone}</span>
                            )}
                          </div>
                          {client?.statusFinanceiro === 'inadimplente' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#EF4444]/30">
                              Inadimplente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Píer / Marina */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border border-transparent ${pStatus.bg} ${pStatus.text}`}>
                            <span className={`w-2 h-2 rounded-full ${pStatus.dot}`} />
                            {pStatus.label}
                          </span>
                          {pStatus.timeLabel && (
                            <div className="text-[11px] text-[#6B7280] flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-[#9CA3AF]" />
                              <span>{pStatus.timeLabel}</span>
                            </div>
                          )}
                          {res.destino && (
                            <div className="text-[11px] text-[#6B7280] truncate max-w-[170px]" title={res.destino}>
                              📍 {res.destino}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Observações */}
                      <td className="px-6 py-4 text-xs text-[#6B7280] max-w-xs truncate">
                        {res.observações ? `"${res.observações}"` : '—'}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onGeneratePDF(res)}
                            className="px-3 py-1.5 border border-[#3758F9] text-[#3758F9] hover:bg-[#EEF2FF] rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Aviso de Saída (PDF)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button
                            onClick={() => onOpenStatusModal(res)}
                            className="px-3 py-1.5 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="Alterar Status"
                          >
                            Status
                          </button>

                          <button
                            onClick={() => onDelete(res)}
                            className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map(res => {
            const boat = boatDB.getById(res.embarcacaoId);
            const client = clientDB.getById(res.clienteId);
            const boatCode = boat ? getBoatCode(boat) : 'M00';
            const isJet = boat?.tipo === 'jet';
            const ownerName = client ? client.nome : 'Desconhecido';
            const initials = ownerName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'SO';
            const pStatus = getPierStatus(res);

            return (
              <div key={res.id} className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isJet ? 'bg-[#FFFBEB] text-[#D97706] border-[#F59E0B]/30' : 'bg-[#EEF2FF] text-[#3758F9] border-[#3758F9]/30'
                    }`}>
                      {isJet ? <JetSkiIcon className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#111827] font-mono">{boatCode} - {boat?.nome || 'Embarcação'}</h4>
                      <p className="text-xs text-[#6B7280]">{isJet ? 'Jet Ski' : 'Lancha'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${pStatus.bg} ${pStatus.text}`}>
                      <span className={`w-2 h-2 rounded-full ${pStatus.dot}`} />
                      {pStatus.label}
                    </span>
                    {pStatus.timeLabel && (
                      <span className="text-[10px] text-[#6B7280] font-mono">{pStatus.timeLabel}</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-lg p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#3758F9] font-bold text-[10px] flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="font-semibold text-[#1F2937]">{ownerName}</span>
                  </div>
                  {client?.telefone && <span className="text-[#6B7280]">{client.telefone}</span>}
                </div>

                {res.observações && (
                  <p className="text-xs text-[#6B7280] italic bg-[#FFFBEB] p-2 rounded border border-[#F59E0B]/20">
                    "{res.observações}"
                  </p>
                )}

                <div className="flex items-center justify-end pt-2 border-t border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onGeneratePDF(res)}
                      className="px-3 py-1.5 border border-[#3758F9] text-[#3758F9] hover:bg-[#EEF2FF] rounded-lg text-xs font-medium cursor-pointer"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => onOpenStatusModal(res)}
                      className="px-3 py-1.5 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Status
                    </button>
                    <button
                      onClick={() => onDelete(res)}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* NEW BOOKING MODAL (REALIZAR AGENDAMENTOS RESERVAS)                        */
/* ========================================================================= */
interface NewBookingModalProps {
  defaultDate: string;
  boats: Embarcacao[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function NewBookingModal({ defaultDate, boats, onClose, onSuccess }: NewBookingModalProps) {
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [bookingMode, setBookingMode] = useState<'single' | 'distinct'>('single');
  const [date, setDate] = useState(defaultDate);
  const [distinctDates, setDistinctDates] = useState<string[]>([]);
  const [distinctInput, setDistinctInput] = useState(defaultDate);
  const [observacoes, setObservacoes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available cotistas based on chosen boat
  const availableOwners = useMemo(() => {
    if (!selectedBoatId) return [];
    const boat = boats.find(b => b.id === selectedBoatId);
    if (!boat) return [];
    return boat.donos
      .map(id => clientDB.getById(id))
      .filter((c): c is Cliente => c !== undefined && c !== null)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedBoatId, boats]);

  // Options for SearchableSelect
  const boatOptions: SelectOption[] = useMemo(() => {
    return boats.map(b => ({
      value: b.id,
      label: `${getBoatCode(b)} - ${b.nome}`,
      sublabel: `${b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}${b.emManutencao ? ' • Em Manutenção' : ''}`,
      badge: b.emManutencao ? (
        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs">
          <Wrench className="w-2.5 h-2.5 mr-0.5" />
          Manutenção
        </span>
      ) : undefined
    }));
  }, [boats]);

  const clientOptions: SelectOption[] = useMemo(() => {
    return availableOwners.map(c => {
      const isInactive = c.status === 'inativo';
      const isOverdue = c.statusFinanceiro === 'inadimplente';
      return {
        value: c.id,
        label: c.nome,
        sublabel: `${c.cota ? `Cota ${c.cota}` : 'Sem cota definida'}${c.telefone ? ` • ${c.telefone}` : ''}`,
        disabled: isInactive,
        badge: (
          <div className="flex items-center gap-1">
            {isOverdue && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                ⚠️ Inadimplente
              </span>
            )}
            {isInactive && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-slate-200 text-slate-700">
                Inativo
              </span>
            )}
          </div>
        )
      };
    });
  }, [availableOwners]);

  const handleAddDistinctDate = () => {
    if (!distinctInput) return;
    if (!distinctDates.includes(distinctInput)) {
      setDistinctDates(prev => [...prev, distinctInput].sort());
    }
  };

  const handleRemoveDistinctDate = (dToRemove: string) => {
    setDistinctDates(prev => prev.filter(d => d !== dToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedBoatId) {
      setErrorMsg('Selecione uma embarcação.');
      return;
    }
    if (!selectedClientId) {
      setErrorMsg('Selecione um cotista.');
      return;
    }

    const boat = boats.find(b => b.id === selectedBoatId);
    const client = availableOwners.find(c => c.id === selectedClientId);

    if (!boat || !client) {
      setErrorMsg('Dados inválidos.');
      return;
    }

    if (client.status === 'inativo') {
      setErrorMsg('Não é possível criar reservas para cliente com cadastro inativo.');
      return;
    }

    // Determine target dates
    const datesToBook: string[] = (
      bookingMode === 'single' ? [date] : distinctDates
    ).filter(Boolean);

    if (datesToBook.length === 0) {
      setErrorMsg(
        bookingMode === 'distinct'
          ? 'Por favor, adicione pelo menos uma data para a reserva.'
          : 'Por favor, informe a data da saída.'
      );
      return;
    }

    // Validation for double bookings
    const existing = reservationDB.getAll();
    const overlaps = datesToBook.filter(d =>
      existing.some(r => r.embarcacaoId === selectedBoatId && r.data === d && r.status !== 'cancelado')
    );

    if (overlaps.length > 0) {
      const formattedOverlaps = overlaps.map(d => {
        const p = new Date(d + 'T12:00:00');
        return isNaN(p.getTime()) ? d : p.toLocaleDateString('pt-BR');
      });
      setErrorMsg(`A embarcação ${getBoatCode(boat)} já possui reserva confirmada nas seguintes datas: ${formattedOverlaps.join(', ')}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      for (const d of datesToBook) {
        // Create event in Google Agenda if connected
        let googleEventId: string | undefined = undefined;
        try {
          if (isCalendarConnected()) {
            const gResult = await createGoogleCalendarEvent(boat, client, {
              embarcacaoId: selectedBoatId,
              clienteId: selectedClientId,
              data: d,
              periodo: 'dia_inteiro',
              observações: observacoes,
              status: 'agendado'
            });
            googleEventId = gResult?.eventId;
          }
        } catch (gErr) {
          console.warn('Google Calendar creation warning:', gErr);
        }

        // Save in local DB
        reservationDB.create({
          embarcacaoId: selectedBoatId,
          clienteId: selectedClientId,
          data: d,
          periodo: 'dia_inteiro',
          observações: observacoes,
          status: 'agendado',
          googleEventId
        });
      }

      onSuccess(`Reserva de ${getBoatCode(boat)} criada com sucesso para ${datesToBook.length} data(s)!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao gravar reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl border border-[#E5E7EB] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Nova Reserva / Agendamento</h3>
            <p className="text-xs text-[#6B7280]">Realize o agendamento de saída para embarcação cotizada.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-[#FEF2F2] border border-[#EF4444]/30 rounded-lg p-3 text-xs text-[#DC2626] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Embarcação com Busca */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Embarcação *</label>
            <SearchableSelect
              options={boatOptions}
              value={selectedBoatId}
              onChange={(val) => {
                setSelectedBoatId(val);
                setSelectedClientId('');
              }}
              placeholder="Selecione uma embarcação..."
              searchPlaceholder="Pesquisar por nome ou código..."
              buttonClassName="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-sm text-[#374151] focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 outline-none flex items-center justify-between"
            />
            {selectedBoatId && boats.find(b => b.id === selectedBoatId)?.emManutencao && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 text-xs mt-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px]">Aviso de Manutenção</span>
                  <span className="leading-tight">A embarcação selecionada encontra-se marcada em manutenção.</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Cotista / Coproprietário com Busca */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Cotista / Coproprietário *</label>
            <SearchableSelect
              options={clientOptions}
              value={selectedClientId}
              onChange={(val) => setSelectedClientId(val)}
              disabled={!selectedBoatId || availableOwners.length === 0}
              placeholder={
                !selectedBoatId
                  ? 'Selecione primeiro a embarcação'
                  : availableOwners.length === 0
                  ? 'Nenhum cotista vinculado a este barco'
                  : 'Selecione o cotista / coproprietário...'
              }
              searchPlaceholder="Pesquisar por nome ou telefone..."
              buttonClassName="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-sm text-[#374151] focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 outline-none flex items-center justify-between disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
            />
            {selectedClientId && availableOwners.find(o => o.id === selectedClientId)?.statusFinanceiro === 'inadimplente' && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-800 text-xs mt-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px]">Aviso Financeiro</span>
                  <span className="leading-tight">
                    Cliente com pendência financeira (Inadimplente). {availableOwners.find(o => o.id === selectedClientId)?.observacoesFinanceiras}
                  </span>
                </div>
              </div>
            )}
            {selectedClientId && availableOwners.find(o => o.id === selectedClientId)?.status === 'inativo' && (
              <div className="flex items-start gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-slate-800 text-xs mt-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-slate-700">Cadastro Inativo</span>
                  <span className="leading-tight text-slate-600">Este cliente está com o cadastro inativo. Reative-o na tela de Clientes antes de prosseguir.</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Modo de Agendamento (Um Dia vs Dias Distintos) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Tipo de Agendamento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBookingMode('single')}
                className={`py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  bookingMode === 'single'
                    ? 'bg-[#EEF2FF] text-[#3758F9] border-[#3758F9] font-semibold'
                    : 'border-[#D1D5DB] text-[#4B5563] hover:bg-[#F9FAFB]'
                }`}
              >
                Um Dia
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('distinct')}
                className={`py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  bookingMode === 'distinct'
                    ? 'bg-[#EEF2FF] text-[#3758F9] border-[#3758F9] font-semibold'
                    : 'border-[#D1D5DB] text-[#4B5563] hover:bg-[#F9FAFB]'
                }`}
              >
                Dias Distintos
              </button>
            </div>
          </div>

          {bookingMode === 'single' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase">Data da Saída *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-sm text-[#374151] focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#374151] uppercase">
                Datas da Saída (Dias Distintos) *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={distinctInput}
                  onChange={(e) => setDistinctInput(e.target.value)}
                  className="flex-1 bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2 text-sm text-[#374151] focus:border-[#3758F9] focus:ring-2 focus:ring-[#3758F9]/10 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDistinctDate();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDistinctDate}
                  className="px-4 py-2 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Listagem dos dias distintos adicionados */}
              {distinctDates.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>{distinctDates.length} {distinctDates.length === 1 ? 'dia selecionado' : 'dias selecionados'}:</span>
                    <button
                      type="button"
                      onClick={() => setDistinctDates([])}
                      className="text-rose-600 hover:underline cursor-pointer font-medium"
                    >
                      Limpar todos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg subtle-scrollbar">
                    {distinctDates.map(dStr => {
                      const p = new Date(dStr + 'T12:00:00');
                      const formatted = isNaN(p.getTime())
                        ? dStr
                        : p.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                      return (
                        <span
                          key={dStr}
                          className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-[#3758F9] border border-[#3758F9]/20 px-2.5 py-1 rounded-md text-xs font-medium"
                        >
                          <CalendarIcon className="w-3 h-3 text-[#3758F9]" />
                          <span>{formatted}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDistinctDate(dStr)}
                            className="text-[#3758F9]/70 hover:text-rose-600 cursor-pointer ml-0.5"
                            title="Remover data"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-2.5 text-center">
                  Nenhum dia adicionado ainda. Escolha a data acima e clique em "Adicionar".
                </p>
              )}
            </div>
          )}

          {/* 4. Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Observações (Opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Saída com marinheiro, solicitação de gelo, etc..."
              rows={2}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2 text-sm text-[#374151] focus:border-[#3758F9] outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-sm font-medium shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar Reserva'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* EDIT STATUS MODAL                                                         */
/* ========================================================================= */
interface EditStatusModalProps {
  reserva: Reserva;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function EditStatusModal({ reserva, onClose, onSuccess, onError }: EditStatusModalProps) {
  const [statusVal, setStatusVal] = useState<'agendado' | 'confirmado' | 'cancelado'>(reserva.status as any || 'agendado');
  const [destino, setDestino] = useState(reserva.destino || 'Iate Club - Rodeadouro');
  const [horaSaida, setHoraSaida] = useState(reserva.previsaoSaida || '11:30');
  const [horaChegada, setHoraChegada] = useState(reserva.previsaoChegada || '17:28');
  const [pessoasABordo, setPessoasABordo] = useState(String(reserva.pessoasABordo || '02'));
  const [observacoes, setObservacoes] = useState(reserva.observações || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const boat = boatDB.getById(reserva.embarcacaoId);
  const client = clientDB.getById(reserva.clienteId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updated = reservationDB.update(reserva.id, {
        status: statusVal,
        destino,
        previsaoSaida: horaSaida,
        previsaoChegada: horaChegada,
        pessoasABordo: parseInt(pessoasABordo) || 2,
        observações: observacoes
      });

      // Update in Google Calendar if connected
      if (reserva.googleEventId && isCalendarConnected() && boat && client) {
        try {
          await updateGoogleCalendarEvent(reserva.googleEventId, boat, client, updated);
        } catch (gErr) {
          console.warn('Google Calendar update warning:', gErr);
        }
      }

      onSuccess('Status do agendamento atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Erro ao atualizar agendamento.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl border border-[#E5E7EB] w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Atualizar Status da Reserva</h3>
            <p className="text-xs text-[#6B7280]">
              {boat ? getBoatCode(boat) : 'Barco'} • {client ? client.nome : 'Cliente'} ({reserva.data})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Status da Reserva</label>
            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value as any)}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-sm text-[#374151] focus:border-[#3758F9] outline-none"
            >
              <option value="agendado">Agendado (Pendente)</option>
              <option value="confirmado">Confirmado (Liberado para Saída)</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase">Previsão Saída</label>
              <input
                type="time"
                value={horaSaida}
                onChange={(e) => setHoraSaida(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#374151] focus:border-[#3758F9] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase">Previsão Retorno</label>
              <input
                type="time"
                value={horaChegada}
                onChange={(e) => setHoraChegada(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#374151] focus:border-[#3758F9] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase">Pessoas a Bordo</label>
              <input
                type="number"
                min="1"
                value={pessoasABordo}
                onChange={(e) => setPessoasABordo(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#374151] focus:border-[#3758F9] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase">Destino</label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#374151] focus:border-[#3758F9] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151] uppercase">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#374151] focus:border-[#3758F9] outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2 bg-[#3758F9] hover:bg-[#1B44C8] text-white rounded-lg text-sm font-medium shadow-xs"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
