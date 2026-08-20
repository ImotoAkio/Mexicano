import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, List, Search, ChevronLeft, ChevronRight, Filter,
  CheckCircle2, XCircle, HelpCircle, Ship, User, CalendarDays, Eye, ChevronDown, X
} from 'lucide-react';
import { reservationDB, boatDB, clientDB } from '../db';
import { Embarcacao, Cliente, Reserva } from '../types';
import { getBoatCode } from '../utils/boatUtils';

type ViewMode = 'calendar' | 'list';

export default function FinanceSchedulesPage() {
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

  // Detailed day popover
  const [selectedDayReservations, setSelectedDayReservations] = useState<{
    day: number;
    reservas: Reserva[];
  } | null>(null);

  useEffect(() => {
    setReservations(reservationDB.getAll());
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());
  }, []);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.nome || 'Cliente não encontrado';
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
    setSelectedDateStr(''); // Clear date filter when changing month
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDayReservations(null);
    setSelectedDateStr(''); // Clear date filter when changing month
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
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Day of week index for first day of month

  const calendarDays = useMemo(() => {
    const days: { day: number | null; reservas: Reserva[] }[] = [];

    // Fill blank padding days before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, reservas: [] });
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReservas = filteredReservations.filter(r => r.data === formattedDate);
      days.push({ day, reservas: dayReservas });
    }

    return days;
  }, [firstDayIndex, daysInMonth, filteredReservations, currentYear, currentMonth]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelado':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'dia_inteiro': return 'Dia Inteiro';
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      default: return period;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-xs">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            Consulta de Agendamentos
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[46px]">Histórico e agenda de reservas da marina para controle financeiro</p>
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0 border border-slate-200">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendário
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black">
            {stats.total}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reservas no Mês</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">Total de Saídas</p>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black border border-emerald-100">
            {stats.confirmed}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Confirmadas</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">Confirmadas</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black border border-amber-100">
            {stats.pending}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Agendadas / Outros</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">Pendentes</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-black border border-rose-100">
            {stats.cancelled}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Canceladas</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">Canceladas</p>
          </div>
        </div>
      </div>

      {/* Main filters box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50 shrink-0">
          <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-xs rounded-lg transition-all text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-3 min-w-[130px] text-center">
            {capitalizedMonthName}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-xs rounded-lg transition-all text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Client Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Boat Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedBoatId}
            onChange={e => setSelectedBoatId(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-slate-700 appearance-none cursor-pointer"
          >
            <option value="todos">Todas Embarcações</option>
            {boats.map(boat => (
              <option key={boat.id} value={boat.id}>{getBoatCode(boat)} ({boat.tipo === 'jet' ? 'Jet' : 'Lancha'})</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-slate-700 appearance-none cursor-pointer"
          >
            <option value="todos">Todos Status</option>
            <option value="confirmado">Confirmado</option>
            <option value="agendado">Agendado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[170px]">
          <input
            type="date"
            value={selectedDateStr}
            onChange={e => {
              setSelectedDateStr(e.target.value);
              if (e.target.value) {
                // If user picks a date, automatically set the Month selector to match that date
                const pickedDate = new Date(e.target.value + 'T00:00:00');
                setCurrentDate(pickedDate);
              }
            }}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-slate-700 cursor-pointer"
          />
          {selectedDateStr && (
            <button
              onClick={() => setSelectedDateStr('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="Limpar filtro de data"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Layouts */}
      <div className="flex-1">
        
        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs relative">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/75 shrink-0 text-center font-bold text-xs text-slate-500 py-3.5">
              {weekDays.map(day => (
                <div key={day} className="font-semibold">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 min-h-[480px] bg-slate-100 gap-px">
              {calendarDays.map((cell, idx) => {
                const isCurrentMonthDay = cell.day !== null;
                const hasReservas = cell.reservas.length > 0;
                
                return (
                  <div
                    key={idx}
                    onClick={() => isCurrentMonthDay && hasReservas && setSelectedDayReservations({ day: cell.day!, reservas: cell.reservas })}
                    className={`bg-white p-3 flex flex-col relative group select-none min-h-[90px] transition-all ${
                      isCurrentMonthDay
                        ? hasReservas
                          ? 'cursor-pointer hover:bg-slate-50/50'
                          : 'cursor-default'
                        : 'bg-slate-50/50'
                    }`}
                  >
                    {isCurrentMonthDay && (
                      <span className={`text-xs font-bold ${hasReservas ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                        {cell.day}
                      </span>
                    )}

                    {/* Bookings inside cell */}
                    {isCurrentMonthDay && hasReservas && (
                      <div className="mt-2 space-y-1 flex-1 overflow-hidden max-h-[70px]">
                        {cell.reservas.slice(0, 3).map((reserva, rIdx) => {
                          const boatName = getBoatName(reserva.embarcacaoId);
                          let dotColor = 'bg-amber-500';
                          if (reserva.status === 'confirmado') dotColor = 'bg-emerald-500';
                          else if (reserva.status === 'cancelado') dotColor = 'bg-rose-500';

                          return (
                            <div key={rIdx} className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                              <span className="truncate">{boatName} - {getClientName(reserva.clienteId).split(' ')[0]}</span>
                            </div>
                          );
                        })}
                        {cell.reservas.length > 3 && (
                          <div className="text-[8px] font-bold text-slate-400 pl-1">
                            + {cell.reservas.length - 3} reservas
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day popover drawer */}
            {selectedDayReservations && (
              <div className="absolute inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col p-6 animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Reservas do dia {selectedDayReservations.day}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{capitalizedMonthName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDayReservations(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3.5 subtle-scrollbar pr-1">
                  {selectedDayReservations.reservas.map((res, idx) => {
                    const client = clients.find(c => c.id === res.clienteId);
                    const boat = boats.find(b => b.id === res.embarcacaoId);
                    
                    return (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${getStatusBadgeClass(res.status)}`}>
                            {res.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {getPeriodLabel(res.periodo)}
                          </span>
                        </div>

                        <div className="space-y-2 mt-3">
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Ship className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800">{getBoatCode(boat)}</span>
                            <span className="text-slate-400">({boat?.tipo === 'jet' ? 'Jet' : 'Lancha'})</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800">{client?.nome || 'N/A'}</span>
                          </div>
                          
                          {client?.telefone && (
                            <p className="text-[10px] text-slate-400 pl-5 font-mono">{client.telefone}</p>
                          )}
                        </div>

                        {res.observações && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-500 leading-relaxed">
                            <span className="font-bold block text-slate-400 mb-0.5">OBSERVAÇÕES:</span>
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
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto subtle-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Embarcação</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Período</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhum agendamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res, idx) => {
                      const rDate = new Date(res.data + 'T00:00:00');
                      const formattedDate = rDate.toLocaleDateString('pt-BR');
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">{formattedDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{getBoatName(res.embarcacaoId)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{getClientName(res.clienteId)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">{getPeriodLabel(res.periodo)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getStatusBadgeClass(res.status)}`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={res.observações}>
                            {res.observações || '-'}
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
    </div>
  );
}
