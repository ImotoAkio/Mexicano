import React, { useState, useEffect, useRef } from 'react';
import {
  Ship,
  User as UserIcon,
  Navigation,
  Anchor,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  Search,
  Filter,
  X,
  CheckCircle2,
  Circle,
  MapPin,
  Users
} from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface OperationsTabProps {
  reservasDoDia: any[];
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  selectedDate: string;
  formatDisplayDate: (date: string) => string;

  onChecklistDescida: (reserva: any) => void;
  onMarcarSaida: (reserva: any) => void;
  onChegadaEAbastecimento: (reserva: any) => void;
  onChecklistSubida: (reserva: any) => void;

  showOnlyConfirmed: boolean;
  setShowOnlyConfirmed: (val: boolean) => void;
  sortOrder: 'hora' | 'az';
  setSortOrder: (val: 'hora' | 'az') => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

// Removed generateAvatar as it's no longer used

export const OperationsTab: React.FC<OperationsTabProps> = ({
  reservasDoDia,
  getEmbarcacao,
  getCliente,
  selectedDate,
  formatDisplayDate,
  onChecklistDescida,
  onMarcarSaida,
  onChegadaEAbastecimento,
  onChecklistSubida,
  showOnlyConfirmed,
  setShowOnlyConfirmed,
  sortOrder,
  setSortOrder,
  searchTerm,
  setSearchTerm
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [boatFilter, setBoatFilter] = useState<'todos' | 'jet' | 'lancha'>('todos');
  const filterRef = useRef<HTMLDivElement>(null);

  // Fechar o filtro ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showFilters]);

  // Aplicar filtro local de tipo de embarcação
  const filteredReservas = reservasDoDia.filter((reserva: any) => {
    if (boatFilter === 'todos') return true;
    const boat = getEmbarcacao(reserva.embarcacaoId);
    if (!boat) return true; // se não achou o barco, deixa passar ou ajusta
    return boat.tipo === boatFilter;
  });

  return (
    <main className="flex-1 p-3 pb-24 w-full mx-auto max-w-7xl text-slate-800 space-y-4">
      {/* Search & Filter Header (Ligth, Clean) */}
      <div ref={filterRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-20">
        <div className="p-2 flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <Search className="w-5 h-5 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Buscar barco ou cliente..."
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-3.5 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3.5 rounded-xl border flex items-center justify-center transition-colors active:scale-95 ${
              showFilters || showOnlyConfirmed || sortOrder !== 'hora'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className={`w-5 h-5 ${showOnlyConfirmed || sortOrder !== 'hora' ? 'fill-blue-100' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters Selection */}
        {showFilters && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-5">
            <div className="flex flex-col gap-5">
              {/* Boat Type Filter */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 block">
                  Tipo de Embarcação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBoatFilter('todos')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] ${
                      boatFilter === 'todos'
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBoatFilter('lancha')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] ${
                      boatFilter === 'lancha'
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    Lanchas
                  </button>
                  <button
                    onClick={() => setBoatFilter('jet')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] ${
                      boatFilter === 'jet'
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    Jets
                  </button>
                </div>
              </div>

              {/* Confirmed Only Toggle */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 block">
                  Filtrar Status
                </label>
                <button
                  onClick={() => setShowOnlyConfirmed(!showOnlyConfirmed)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    showOnlyConfirmed
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <span className="font-bold text-sm tracking-wide">Exibir somente confirmados</span>
                  {showOnlyConfirmed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-300" />}
                </button>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 block">
                  Ordenação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSortOrder('hora')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] ${
                      sortOrder === 'hora'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <span>Prev. Saída</span>
                  </button>
                  <button
                    onClick={() => setSortOrder('az')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] ${
                      sortOrder === 'az'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <span>Nome (A-Z)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultados / Cards */}
      {filteredReservas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3 mt-4">
          <Ship className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-slate-700">Nenhum agendamento encontrado</h3>
          <p className="text-xs text-slate-500">Nenhum registro encontrado para essa busca em {formatDisplayDate(selectedDate)}.</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10 block mt-2">
          {filteredReservas.map((reserva: any) => {
            const boat = getEmbarcacao(reserva.embarcacaoId);
            const client = getCliente(reserva.clienteId);

            const isGuardado = reserva.statusMarina === 'guardada' || reserva.statusOperacional === 'guardado';
            const isChegada = reserva.statusMarina === 'chegada' || reserva.statusOperacional === 'retornou';
            const isPronto = reserva.statusMarina === 'pronta' || reserva.statusOperacional === 'pronto_na_agua' || (reserva.horaDescida && !reserva.horaSubida && !isGuardado && !isChegada);
            const isSaidaMar = !!reserva.horaSaida;
            const isConfirmado = !isGuardado && !isChegada && !isPronto && (reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada');

            const titleName = boat ? getBoatCode(boat) : (reserva.barcoNome || 'Embarcação');
            const clientName = client?.nome || reserva.clienteNome || 'Cliente';

            const isJet = boat?.tipo === 'jet';
            const displaySizeText = isJet ? 'JET' : (boat?.tamanho ? `${boat.tamanho}'` : '');

            return (
              <div
                key={reserva.id}
                className={`rounded-2xl border p-4 shadow-sm relative overflow-hidden space-y-4 transition-all duration-300 ${
                  isGuardado
                    ? 'bg-slate-50/70 border-slate-200 opacity-90'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Left vertical status indicator */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  isGuardado ? 'bg-emerald-500' : isChegada ? 'bg-amber-500' : isSaidaMar ? 'bg-purple-500' : isPronto ? 'bg-cyan-500' : isConfirmado ? 'bg-green-500' : 'bg-blue-600'
                }`} />

                {/* Header */}
                <div className="pl-2 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex shrink-0 items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                      {displaySizeText ? (
                        <span className="font-extrabold text-[11px] tracking-widest">{displaySizeText}</span>
                      ) : (
                        <Ship className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">
                        {titleName}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{clientName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 flex items-center justify-center ${
                    isGuardado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    isChegada ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    isSaidaMar ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    isPronto ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                    isConfirmado ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isGuardado ? 'Guardado' : isChegada ? 'Chegou' : isSaidaMar ? 'Navegando' : isPronto ? 'Na Água' : isConfirmado ? 'Confirmado' : 'Agendado'}
                  </span>
                </div>

                {/* Info Bar (Prev Saida & Chegada & Tripulação) */}
                <div className="pl-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <ArrowDownCircle className="w-3 h-3 text-cyan-500" /> Saída
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-800 leading-none">
                        {reserva.previsaoSaida || '--:--'}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mx-2" />

                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-amber-500" /> Chegada
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-800 leading-none">
                        {reserva.previsaoChegada || '--:--'}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 ml-2 mr-1" />

                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Bordo</span>
                      <span className="font-mono text-sm font-bold text-slate-800 leading-none flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {reserva.pessoasABordo || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Destino Box (Se houver) */}
                {reserva.destino && (
                  <div className="pl-2">
                    <p className="text-xs font-semibold text-slate-600 bg-slate-50/80 border border-slate-100 rounded-lg p-2.5 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate uppercase tracking-wider">{reserva.destino}</span>
                    </p>
                  </div>
                )}

                {/* Big Action Buttons - Phase logic included, sized up for dirty fingers */}
                <div className="pl-2 space-y-3 pt-1">

                  {/* Phase 1: Agendado/Confirmado -> Descida Píer */}
                  {(!isPronto && !isChegada && !isGuardado && !isSaidaMar) && (
                    <button
                      onClick={() => onChecklistDescida(reserva)}
                      className="w-full py-4 sm:py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      <ArrowDownCircle className="w-6 h-6" />
                      <span>Checklist Descida Píer</span>
                    </button>
                  )}

                  {/* Phase 2: Na Água (Pronto) -> Marcar Saída */}
                  {isPronto && !isSaidaMar && !isChegada && !isGuardado && (
                    <button
                      onClick={() => onMarcarSaida(reserva)}
                      className="w-full py-4 sm:py-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      <Navigation className="w-6 h-6" />
                      <span>Marcar Saída / Partida</span>
                    </button>
                  )}

                  {/* Phase 2.5/3: Na água (Pronto) OU Navegando (Saída) -> Checklist Retorno Simultâneo / Exclusivo */}
                  {(isPronto || isSaidaMar) && !isChegada && !isGuardado && (
                    <button
                      onClick={() => onChegadaEAbastecimento(reserva)}
                      className={`w-full py-4 sm:py-5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer ${
                        isSaidaMar
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                          : "bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 shadow-sm"
                      }`}
                    >
                      <Anchor className="w-6 h-6" />
                      <span>Chegou! Iniciar Retorno</span>
                    </button>
                  )}

                  {/* Phase 4: Chegada -> Subida Vaga */}
                  {isChegada && !isGuardado && (
                    <button
                      onClick={() => onChecklistSubida(reserva)}
                      className="w-full py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      <ArrowUpCircle className="w-6 h-6" />
                      <span>Checklist Subida / Vaga</span>
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
