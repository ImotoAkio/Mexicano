import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Ship,
  User,
  CalendarDays,
  Eye,
  ChevronDown,
  X,
  Phone,
  Compass,
  FileText,
  AlertCircle
} from 'lucide-react';
import { JetSkiIcon } from '../icons/JetSkiIcon';
import { reservationDB, boatDB, clientDB } from '../../db';
import { Embarcacao, Cliente, Reserva } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';

type ViewMode = 'calendar' | 'list';

export default function FinanceReservasPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // DB Data
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);

  // Detailed day popover / drawer
  const [selectedDayReservations, setSelectedDayReservations] = useState<{
    day: number;
    reservas: Reserva[];
  } | null>(null);

  // Single reservation inspection modal
  const [inspectedReservation, setInspectedReservation] = useState<Reserva | null>(null);

  useEffect(() => {
    setReservations(reservationDB.getAll());
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());
  }, []);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.nome || 'Cliente não encontrado';
  const getClient = (id: string) => clients.find(c => c.id === id);
  const getBoat = (id: string) => boats.find(b => b.id === id);
  const getBoatName = (id: string) => {
    const b = boats.find(b => b.id === id);
    return b ? getBoatCode(b) : 'Embarcação não encontrada';
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDayReservations(null);
    setSelectedDateStr('');
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDayReservations(null);
    setSelectedDateStr('');
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      // Date filter match
      if (selectedDateStr) {
        if (r.data !== selectedDateStr) return false;
      } else {
        // Month/Year match
        const rDate = new Date(r.data + 'T00:00:00');
        if (rDate.getFullYear() !== currentYear || rDate.getMonth() !== currentMonth) return false;
      }

      // Status match
      if (selectedStatus !== 'todos' && r.status !== selectedStatus) return false;

      // Boat match
      if (selectedBoatId !== 'todos' && r.embarcacaoId !== selectedBoatId) return false;

      // Client name search
      if (searchQuery) {
        const clientName = getClientName(r.clienteId).toLowerCase();
        if (!clientName.includes(searchQuery.toLowerCase())) return false;
      }

      return true;
    });
  }, [reservations, currentYear, currentMonth, selectedStatus, selectedBoatId, searchQuery, selectedDateStr, clients]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let cancelled = 0;
    let pending = 0;

    filteredReservations.forEach(r => {
      total++;
      if (r.status === 'confirmado') confirmed++;
      else if (r.status === 'cancelado') cancelled++;
      else pending++;
    });

    return { total, confirmed, cancelled, pending };
  }, [filteredReservations]);

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: { day: number | null; reservas: Reserva[] }[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, reservas: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReservas = filteredReservations.filter(r => r.data === formattedDate);
      days.push({ day, reservas: dayReservas });
    }

    return days;
  }, [firstDayIndex, daysInMonth, filteredReservations, currentYear, currentMonth]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmado':
        return {
          label: 'Confirmado',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotClass: 'bg-emerald-500'
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotClass: 'bg-rose-500'
        };
      default:
        return {
          label: 'Agendado',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotClass: 'bg-amber-500'
        };
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'dia_inteiro': return 'Dia Inteiro (08h - 18h)';
      case 'manha': return 'Manhã (08h - 13h)';
      case 'tarde': return 'Tarde (13h - 18h)';
      default: return period;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-800">
              <CalendarDays className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                Consulta de Reservas
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Agenda de saídas náuticas e ocupação das cotas (Modo de Consulta Financeira)
              </p>
            </div>
          </div>
        </div>

        {/* View toggle & Read-only badge */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200/80 text-[11px] font-medium text-stone-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Modo Consulta
          </span>

          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Total no Mês</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-stone-900 tabular-nums">{stats.total}</p>
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Saídas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Todas as reservas do mês</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Confirmadas</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-emerald-700 tabular-nums">{stats.confirmed}</p>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              Validadas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Prontas para navegar</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Agendadas / Outros</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-amber-700 tabular-nums">{stats.pending}</p>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
              Pendentes
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Aguardando confirmação</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Canceladas</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-rose-700 tabular-nums">{stats.cancelled}</p>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
              Canceladas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Canceladas pelo cotista/marina</p>
        </div>
      </div>

      {/* Main filters box */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-1.5 border border-stone-200/90 rounded-xl p-1 bg-stone-50 shrink-0">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 hover:bg-white hover:shadow-2xs rounded-lg transition-all text-stone-600 cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-stone-800 px-2 min-w-[140px] text-center select-none">
            {capitalizedMonthName}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-white hover:shadow-2xs rounded-lg transition-all text-stone-600 cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Client Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por cotista / cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-400"
          />
        </div>

        {/* Boat Filter */}
        <div className="relative min-w-[170px]">
          <select
            value={selectedBoatId}
            onChange={e => setSelectedBoatId(e.target.value)}
            className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
          >
            <option value="todos">Todas Embarcações</option>
            {boats.map(boat => (
              <option key={boat.id} value={boat.id}>
                {getBoatCode(boat)} ({boat.tipo === 'jet' ? 'Jet' : 'Lancha'})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
          >
            <option value="todos">Todos Status</option>
            <option value="confirmado">Confirmado</option>
            <option value="agendado">Agendado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[160px]">
          <input
            type="date"
            value={selectedDateStr}
            onChange={e => {
              setSelectedDateStr(e.target.value);
              if (e.target.value) {
                const pickedDate = new Date(e.target.value + 'T00:00:00');
                setCurrentDate(pickedDate);
              }
            }}
            className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 cursor-pointer focus:outline-hidden focus:border-stone-400"
          />
          {selectedDateStr && (
            <button
              type="button"
              onClick={() => setSelectedDateStr('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
              title="Limpar data"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Layouts */}
      <div className="relative">
        
        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs relative">
            <div className="grid grid-cols-7 border-b border-stone-200/80 bg-stone-50/80 shrink-0 text-center font-bold text-xs text-stone-500 py-3">
              {weekDays.map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 min-h-[500px] bg-stone-200/70 gap-px">
              {calendarDays.map((cell, idx) => {
                const isCurrentMonthDay = cell.day !== null;
                const hasReservas = cell.reservas.length > 0;
                
                return (
                  <div
                    key={idx}
                    onClick={() => isCurrentMonthDay && hasReservas && setSelectedDayReservations({ day: cell.day!, reservas: cell.reservas })}
                    className={`bg-white p-2.5 flex flex-col relative select-none min-h-[96px] transition-colors ${
                      isCurrentMonthDay
                        ? hasReservas
                          ? 'cursor-pointer hover:bg-stone-50'
                          : 'cursor-default'
                        : 'bg-stone-50/40'
                    }`}
                  >
                    {isCurrentMonthDay && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${hasReservas ? 'text-stone-900 font-black' : 'text-stone-400'}`}>
                          {cell.day}
                        </span>
                        {hasReservas && (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                            {cell.reservas.length}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bookings inside cell */}
                    {isCurrentMonthDay && hasReservas && (
                      <div className="mt-1.5 space-y-1 flex-1 overflow-hidden">
                        {cell.reservas.slice(0, 3).map((reserva, rIdx) => {
                          const boatName = getBoatName(reserva.embarcacaoId);
                          const badge = getStatusBadge(reserva.status);

                          return (
                            <div
                              key={rIdx}
                              onClick={e => {
                                e.stopPropagation();
                                setInspectedReservation(reserva);
                              }}
                              className="flex items-center gap-1.5 text-[9.5px] font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60 truncate cursor-pointer transition-colors"
                              title={`${boatName} - ${getClientName(reserva.clienteId)} (${badge.label})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass} shrink-0`} />
                              <span className="truncate">{boatName} • {getClientName(reserva.clienteId).split(' ')[0]}</span>
                            </div>
                          );
                        })}
                        {cell.reservas.length > 3 && (
                          <div className="text-[9px] font-bold text-stone-400 pl-1">
                            + {cell.reservas.length - 3} mais
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day slide-over drawer */}
            {selectedDayReservations && (
              <div className="absolute inset-y-0 right-0 w-88 bg-white border-l border-stone-200/90 shadow-2xl z-20 flex flex-col p-5 animate-in slide-in-from-right duration-150">
                <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 mb-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">
                      Reservas do dia {selectedDayReservations.day}
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-0.5 font-medium">{capitalizedMonthName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDayReservations(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {selectedDayReservations.reservas.map((res, idx) => {
                    const client = getClient(res.clienteId);
                    const boat = getBoat(res.embarcacaoId);
                    const badge = getStatusBadge(res.status);
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => setInspectedReservation(res)}
                        className="border border-stone-200/80 rounded-xl p-3.5 bg-stone-50/60 hover:bg-stone-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-medium text-stone-500 bg-white border border-stone-200/70 px-1.5 py-0.5 rounded">
                            {getPeriodLabel(res.periodo).split(' ')[0]}
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          <div className="flex items-center gap-2 text-xs text-stone-800">
                            {boat?.tipo === 'jet' ? (
                              <JetSkiIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            ) : (
                              <Ship className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            )}
                            <span className="font-bold">{getBoatCode(boat)}</span>
                            <span className="text-stone-400 text-[11px]">({boat?.tipo === 'jet' ? 'Jet' : 'Lancha'})</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-stone-700">
                            <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="font-semibold truncate">{client?.nome || 'N/A'}</span>
                          </div>
                          
                          {client?.telefone && (
                            <p className="text-[10px] text-stone-400 pl-5.5 font-mono">{client.telefone}</p>
                          )}
                        </div>

                        {res.observações && (
                          <div className="mt-2.5 pt-2 border-t border-stone-200/60 text-[10px] text-stone-500 leading-relaxed truncate">
                            <span className="font-bold text-stone-400 mr-1">Obs:</span>
                            {res.observações}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Embarcação</th>
                    <th className="px-5 py-3">Cotista / Cliente</th>
                    <th className="px-5 py-3">Período</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Observações</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                        Nenhum agendamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res, idx) => {
                      const rDate = new Date(res.data + 'T00:00:00');
                      const formattedDate = rDate.toLocaleDateString('pt-BR');
                      const badge = getStatusBadge(res.status);
                      const boat = getBoat(res.embarcacaoId);
                      const client = getClient(res.clienteId);
                      
                      return (
                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-stone-900 whitespace-nowrap">{formattedDate}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {boat?.tipo === 'jet' ? (
                                <JetSkiIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              ) : (
                                <Ship className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              )}
                              <span className="font-bold text-stone-800">{getBoatCode(boat)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-stone-900">{client?.nome || 'N/A'}</div>
                            {client?.telefone && (
                              <div className="text-[10px] text-stone-400 font-mono mt-0.5">{client.telefone}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap font-medium text-stone-600">
                            {getPeriodLabel(res.periodo)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badge.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-500 max-w-xs truncate" title={res.observações}>
                            {res.observações || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectedReservation(res)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Single Reservation Inspection Modal (Read-Only) */}
      {inspectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs font-sans animate-in fade-in duration-150"
          onClick={() => setInspectedReservation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-stone-200/80 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Detalhes da Reserva</h3>
                  <p className="text-[11px] text-stone-400">Consulta de agendamento náutico</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedReservation(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Data da Saída</p>
                  <p className="font-bold text-stone-900 text-sm mt-0.5">
                    {new Date(inspectedReservation.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Status</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border mt-1 ${getStatusBadge(inspectedReservation.status).badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(inspectedReservation.status).dotClass}`} />
                    {getStatusBadge(inspectedReservation.status).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Embarcação</p>
                  <p className="font-bold text-stone-900 mt-0.5">
                    {getBoatName(inspectedReservation.embarcacaoId)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Período</p>
                  <p className="font-semibold text-stone-800 mt-0.5">
                    {getPeriodLabel(inspectedReservation.periodo)}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                <p className="text-[10px] uppercase font-bold text-stone-400">Cotista / Proprietário</p>
                <p className="font-bold text-stone-900">{getClientName(inspectedReservation.clienteId)}</p>
                {getClient(inspectedReservation.clienteId)?.telefone && (
                  <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1 font-mono">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {getClient(inspectedReservation.clienteId)?.telefone}
                  </p>
                )}
              </div>

              {inspectedReservation.destino && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Destino Informado</p>
                  <p className="font-medium text-stone-800">{inspectedReservation.destino}</p>
                </div>
              )}

              {inspectedReservation.observações && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Observações da Reserva</p>
                  <p className="font-normal text-stone-700 leading-relaxed">{inspectedReservation.observações}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedReservation(null)}
                className="h-9 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
