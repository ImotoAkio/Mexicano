import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, List, Search, ChevronLeft, ChevronRight, Filter,
  CheckCircle2, XCircle, HelpCircle, Ship, User, CalendarDays,
  Eye, ChevronDown, X, Plus, Anchor, Clock, ArrowDownCircle,
  Droplets, Edit2, Trash2, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { JetSkiIcon } from './icons/JetSkiIcon';
import { io } from 'socket.io-client';
import MarinaAgendamentoModal from './MarinaAgendamentoModal';
import { Embarcacao, Cliente, Reserva } from '../types';
import { boatDB, clientDB, reservationDB } from '../db';

type ViewMode = 'calendar' | 'list';

export default function MarinaAgendamentosView() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedOrigem, setSelectedOrigem] = useState<string>('todas');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Data
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [initialDateForModal, setInitialDateForModal] = useState<string | undefined>(undefined);

  // Day Drawer in Calendar view
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ dayStr: string; reservas: any[] } | null>(null);

  const fetchAgendamentos = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/marina/agendamentos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReservas(data);
      } else {
        // Fallback to local DB if endpoint unavailable
        setReservas(reservationDB.getAll() || []);
      }
    } catch (e) {
      setReservas(reservationDB.getAll() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['polling', 'websocket']
    });

    socket.on('marina_update', () => {
      fetchAgendamentos();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDayInfo(null);
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDayInfo(null);
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Filtered reservations
  const filteredReservas = useMemo(() => {
    return reservas.filter(r => {
      if (selectedDateStr && r.data !== selectedDateStr) return false;

      if (selectedStatus !== 'todos' && r.status !== selectedStatus) return false;

      if (selectedOrigem !== 'todas') {
        if (selectedOrigem === 'cota' && r.origem && r.origem !== 'cota') return false;
        if (selectedOrigem !== 'cota' && r.origem !== selectedOrigem) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bNome = (r.embarcacaoNome || r.modeloAvulso || '').toLowerCase();
        const cNome = (r.clienteNome || r.nomeAvulso || '').toLowerCase();
        const vaga = (r.embarcacaoVaga || '').toLowerCase();
        if (!bNome.includes(q) && !cNome.includes(q) && !vaga.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      const cmpData = b.data.localeCompare(a.data);
      if (cmpData !== 0) return cmpData;
      const horaA = a.previsaoSaida || a.horaSaida || '99:99';
      const horaB = b.previsaoSaida || b.horaSaida || '99:99';
      return horaA.localeCompare(horaB);
    });
  }, [reservas, selectedDateStr, selectedStatus, selectedOrigem, searchQuery]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      reservasCount: number;
      reservas: any[];
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        reservasCount: 0,
        reservas: []
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayReservas = reservas.filter(r => r.data === dateStr && r.status !== 'cancelado');
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        reservasCount: dayReservas.length,
        reservas: dayReservas
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        reservasCount: 0,
        reservas: []
      });
    }

    return days;
  }, [currentYear, currentMonth, reservas]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCancelAgendamento = async (id: string) => {
    if (!window.confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/marina/agendamentos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAgendamentos();
    } catch (e) {
      alert('Erro ao cancelar agendamento.');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Agendamentos da Marina & Descidas
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredReservas.length} {filteredReservas.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de descidas programadas para embarcações da marina e visitantes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* New Booking Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setInitialDateForModal(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por barco, vaga ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Origem Filter */}
        <select
          value={selectedOrigem}
          onChange={(e) => setSelectedOrigem(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
        >
          <option value="todas">Origem: Todas</option>
          <option value="marina">Embarcações da Marina</option>
          <option value="avulso">Visitantes Avulsos</option>
          <option value="cota">Cotistas da Vale</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
        >
          <option value="todos">Status: Todos</option>
          <option value="agendado">Agendados</option>
          <option value="confirmado">Confirmados</option>
          <option value="cancelado">Cancelados</option>
        </select>

        {/* Clear Date Filter Button if active */}
        {selectedDateStr && (
          <button
            onClick={() => setSelectedDateStr('')}
            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <span>Data: {selectedDateStr.split('-').reverse().join('/')}</span>
            <X className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-extrabold text-slate-900">{capitalizedMonthName}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDayInfo(null);
                }}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-[11px] font-extrabold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarDays.map((item, idx) => {
              const isToday = item.dateStr === todayStr;
              const isSelected = selectedDayInfo?.dayStr === item.dateStr;

              return (
                <div
                  key={`${item.dateStr}-${idx}`}
                  onClick={() => {
                    if (item.isCurrentMonth) {
                      setSelectedDayInfo({ dayStr: item.dateStr, reservas: item.reservas });
                    }
                  }}
                  className={`min-h-[95px] p-2 transition-all flex flex-col justify-between cursor-pointer relative group ${
                    !item.isCurrentMonth
                      ? 'bg-slate-50/50 opacity-40'
                      : isSelected
                      ? 'bg-blue-50/70 ring-2 ring-blue-500/30'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isSelected
                          ? 'text-blue-700 font-black'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.day}
                    </span>

                    {item.reservasCount > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {item.reservasCount} {item.reservasCount === 1 ? 'barco' : 'barcos'}
                      </span>
                    )}
                  </div>

                  {/* Preview badges inside day box */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {item.reservas.slice(0, 2).map((res) => (
                      <div
                        key={res.id}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                          res.origem === 'avulso'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            : res.origem === 'marina'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200/60'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span className="truncate">{res.embarcacaoNome || res.modeloAvulso}</span>
                        {res.previsaoSaida && (
                          <span className="opacity-75 text-[9px] shrink-0 font-mono">
                            {res.previsaoSaida}
                          </span>
                        )}
                      </div>
                    ))}
                    {item.reservasCount > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold block pl-1">
                        +{item.reservasCount - 2} mais...
                      </span>
                    )}
                  </div>

                  {/* Add on hover shortcut */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem(null);
                      setInitialDateForModal(item.dateStr);
                      setIsModalOpen(true);
                    }}
                    className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                    title="Novo agendamento neste dia"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Day Slide-down / Inspector Drawer */}
          {selectedDayInfo && (
            <div className="border-t border-slate-200 p-4 bg-slate-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Descidas Agendadas para {selectedDayInfo.dayStr.split('-').reverse().join('/')}
                  </h3>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {selectedDayInfo.reservas.length} {selectedDayInfo.reservas.length === 1 ? 'embarcação' : 'embarcações'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setInitialDateForModal(selectedDayInfo.dayStr);
                      setIsModalOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar para este dia</span>
                  </button>
                  <button
                    onClick={() => setSelectedDayInfo(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedDayInfo.reservas.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Nenhuma embarcação agendada para esta data.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayInfo.reservas.map(res => (
                    <div
                      key={res.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2 relative"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-slate-900">
                              {res.embarcacaoNome || res.modeloAvulso}
                            </h4>
                            {res.origem === 'avulso' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                                Avulso
                              </span>
                            ) : res.origem === 'marina' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 uppercase">
                                Marina
                              </span>
                            ) : null}
                          </div>
                          {res.embarcacaoVaga && (
                            <span className="text-[10px] font-bold text-blue-600">
                              Vaga: {res.embarcacaoVaga}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          res.status === 'cancelado' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {res.status === 'confirmado' ? 'Confirmado' : res.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{res.clienteNome || res.nomeAvulso}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Descida: <b>{res.previsaoSaida || '09:00'}</b></span>
                          {res.previsaoChegada && <span>• Retorno: <b>{res.previsaoChegada}</b></span>}
                        </div>
                        {res.combustivelInicial && res.combustivelInicial !== 'descer_como_esta' && (
                          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                            <Droplets className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {res.combustivelInicial === 'tanque_cheio' ? 'Completar Tanque' : `${res.litrosAbastecerPrevio}L prévios`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(res);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-50"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelAgendamento(res.id)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-50"
                          title="Cancelar Agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Embarcação / Vaga</th>
                  <th className="py-3 px-4">Cliente / Contato</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Posição Trator</th>
                  <th className="py-3 px-4">Combustível</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredReservas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum agendamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredReservas.map(res => {
                    const isToday = res.data === todayStr;

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Data & Horário */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className={`font-bold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>
                              {res.data.split('-').reverse().join('/')}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {res.previsaoSaida || '09:00'}
                            </span>
                          </div>
                        </td>

                        {/* Embarcação & Vaga */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900">
                              {res.embarcacaoNome || res.modeloAvulso}
                            </span>
                            {res.embarcacaoVaga ? (
                              <span className="text-[10px] font-bold text-blue-600">
                                Vaga {res.embarcacaoVaga}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 capitalize">
                                {res.embarcacaoTipo || 'Lancha'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cliente / Contato */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {res.clienteNome || res.nomeAvulso}
                            </span>
                            {res.clienteTelefone && (
                              <span className="text-[10px] text-slate-400">
                                {res.clienteTelefone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Origem */}
                        <td className="py-3 px-4">
                          {res.origem === 'avulso' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Avulso
                            </span>
                          ) : res.origem === 'marina' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Marina
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Vale Cota
                            </span>
                          )}
                        </td>

                        {/* Posição Trator */}
                        <td className="py-3 px-4">
                          {res.posicaoFila ? (
                            <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              #{res.posicaoFila}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Combustível */}
                        <td className="py-3 px-4">
                          {res.combustivelInicial === 'tanque_cheio' ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-max">
                              <Droplets className="w-3 h-3" /> Tanque Cheio
                            </span>
                          ) : res.litrosAbastecerPrevio ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1 w-max">
                              <Droplets className="w-3 h-3" /> {res.litrosAbastecerPrevio}L
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Nível Atual</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            res.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            res.status === 'cancelado' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {res.status === 'confirmado' ? 'Confirmado' : res.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem(res);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Editar Agendamento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelAgendamento(res.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Cancelar Agendamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Booking Modal */}
      <MarinaAgendamentoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchAgendamentos()}
        editingAgendamento={editingItem}
        initialDate={initialDateForModal}
      />
    </div>
  );
}
