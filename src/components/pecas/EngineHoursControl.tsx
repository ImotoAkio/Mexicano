import React, { useState, useEffect, useRef, useMemo } from 'react';
import Select from 'react-select';
import { 
  Search, 
  Ship, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  Filter, 
  Sliders, 
  Wifi, 
  Wrench, 
  Plus, 
  MoreVertical, 
  RefreshCw, 
  Download, 
  User, 
  Bell, 
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
  Pencil,
  Zap,
  Save
} from 'lucide-react';
import { Embarcacao, Manutencao } from '../../types';
import { boatDB } from '../../db';
import UserAvatarMenu from '../header/UserAvatarMenu';
import { getHorimetroSettings, calcularStatusRevisao, ConfiguracaoHorimetro, saveHorimetroSettings } from '../../utils/horimetroUtils';
import HistoricoHorasModal from './HistoricoHorasModal';

interface EngineHoursControlProps {
  embarcacoes: Embarcacao[];
  manutencoes: Manutencao[];
  onRefresh: () => void;
}

export default function EngineHoursControl({ embarcacoes, manutencoes, onRefresh }: EngineHoursControlProps) {
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'lancha' | 'jet'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'vencido' | 'proximo' | 'ok'>('todos');
  const [selectedBoatIds, setSelectedBoatIds] = useState<string[]>([]);
  
  // Modals & Menu States
  const [selectedBoatForHistory, setSelectedBoatForHistory] = useState<Embarcacao | null>(null);
  const [selectedBoatForUpdate, setSelectedBoatForUpdate] = useState<Embarcacao | null>(null);
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Update Form State
  const [novasHorasInput, setNovasHorasInput] = useState<number | ''>('');
  const [dataRegistroInput, setDataRegistroInput] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [observacaoInput, setObservacaoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inline Edit State (edição rápida direta na célula da tabela)
  const [inlineEditingBoatId, setInlineEditingBoatId] = useState<string | null>(null);
  const [inlineHorasValue, setInlineHorasValue] = useState<number | ''>('');

  // Batch Mode State (lançamento veloz em lote para múltiplos motores)
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchHoras, setBatchHoras] = useState<Record<string, number | ''>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<ConfiguracaoHorimetro>(() => getHorimetroSettings());

  const kebabRef = useRef<HTMLDivElement | null>(null);

  // Opções formatadas para o Select pesquisável de embarcações
  const boatOptions = useMemo(() => {
    return embarcacoes.map(b => ({
      value: b.id,
      label: `M${b.numero} - ${b.nome} (${b.modelo || (b.tipo === 'jet' ? 'Jet Ski' : 'Lancha')}) • Atual: ${b.horasMotor || 0}h`,
      boat: b
    }));
  }, [embarcacoes]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(getHorimetroSettings());
    };
    window.addEventListener('horimetro_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setActiveKebabId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('horimetro_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter boats
  const filteredBoats = embarcacoes.filter(boat => {
    const matchesType = tipoFilter === 'todos' || boat.tipo === tipoFilter;
    const matchesSearch = 
      boat.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (boat.numero && boat.numero.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (boat.fabricante && boat.fabricante.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (boat.modelo && boat.modelo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesType || !matchesSearch) return false;

    if (statusFilter !== 'todos') {
      const info = calcularStatusRevisao(boat, manutencoes, settings);
      if (info.status !== statusFilter) return false;
    }

    return true;
  }).sort((a, b) => (b.horasMotor || 0) - (a.horasMotor || 0));

  // Pagination logic
  const totalItems = filteredBoats.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedBoats = filteredBoats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Select all checkbox logic
  const isAllSelected = paginatedBoats.length > 0 && paginatedBoats.every(b => selectedBoatIds.includes(b.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBoatIds(prev => prev.filter(id => !paginatedBoats.some(b => b.id === id)));
    } else {
      const newIds = Array.from(new Set([...selectedBoatIds, ...paginatedBoats.map(b => b.id)]));
      setSelectedBoatIds(newIds);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedBoatIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Quick launch update modal
  const openUpdateModal = (boat?: Embarcacao) => {
    const targetBoat = boat || (embarcacoes.length > 0 ? embarcacoes[0] : null);
    setSelectedBoatForUpdate(targetBoat);
    if (targetBoat) {
      setNovasHorasInput(targetBoat.horasMotor || 0);
    } else {
      setNovasHorasInput('');
    }
    setDataRegistroInput(new Date().toISOString().slice(0, 16));
    setObservacaoInput('');
    setActiveKebabId(null);
  };

  // Inline edit handlers
  const startInlineEdit = (boat: Embarcacao) => {
    setInlineEditingBoatId(boat.id);
    setInlineHorasValue(boat.horasMotor || 0);
  };

  const handleSaveInline = async (boat: Embarcacao) => {
    if (inlineHorasValue === '' || inlineHorasValue < 0) return;
    try {
      (boatDB as any).registrarHoras(
        boat.id,
        Number(inlineHorasValue),
        'Atualização rápida na tabela',
        new Date().toISOString()
      );
      setInlineEditingBoatId(null);
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar horímetro inline:', err);
      alert('Erro ao salvar horímetro.');
    }
  };

  // Batch edit handlers
  const toggleBatchMode = () => {
    if (!isBatchMode) {
      const initial: Record<string, number | ''> = {};
      embarcacoes.forEach(b => {
        initial[b.id] = b.horasMotor || 0;
      });
      setBatchHoras(initial);
      setIsBatchMode(true);
    } else {
      setIsBatchMode(false);
      setBatchHoras({});
    }
  };

  const handleSaveBatch = async () => {
    const changedBoats = embarcacoes.filter(b => {
      const val = batchHoras[b.id];
      return val !== undefined && val !== '' && Number(val) !== (b.horasMotor || 0);
    });

    if (changedBoats.length === 0) {
      setIsBatchMode(false);
      return;
    }

    setIsSavingBatch(true);
    try {
      const nowIso = new Date().toISOString();
      changedBoats.forEach(b => {
        const val = Number(batchHoras[b.id]);
        (boatDB as any).registrarHoras(
          b.id,
          val,
          'Lançamento em lote rápido',
          nowIso
        );
      });
      setIsBatchMode(false);
      setBatchHoras({});
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar lançamentos em lote:', err);
      alert('Erro ao salvar lançamentos em lote.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoatForUpdate || novasHorasInput === '' || novasHorasInput < 0) return;

    setIsSaving(true);
    try {
      const timestamp = new Date(dataRegistroInput).toISOString();
      (boatDB as any).registrarHoras(
        selectedBoatForUpdate.id,
        Number(novasHorasInput),
        observacaoInput || 'Atualização de controle semanal',
        timestamp
      );
      setSelectedBoatForUpdate(null);
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar horímetro:', err);
      alert('Erro ao salvar horímetro.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // KPI Metrics Calculation
  const metrics = embarcacoes.reduce((acc, boat) => {
    const info = calcularStatusRevisao(boat, manutencoes, settings);
    if (boat.emManutencao) acc.emManutencao++;
    if (info.status === 'vencido') acc.vencidos++;
    else if (info.status === 'proximo') acc.proximos++;
    else acc.emDia++;

    if (!boat.historicoHoras || boat.historicoHoras.length === 0) acc.semHistorico++;
    return acc;
  }, { total: embarcacoes.length, emDia: 0, proximos: 0, vencidos: 0, emManutencao: 0, semHistorico: 0 });

  return (
    <div className="w-full min-h-screen bg-[#eaeff3] p-4 sm:p-6 space-y-6 font-sans text-slate-800">
      
      {/* 1. Header (Cabeçalho Minimalista) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
            <span>Frotas</span>
            <span>/</span>
            <span className="text-[#186b77] font-bold">Controle de Horímetros</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Controle de Horímetros
          </h1>
        </div>

        {/* Right Utility Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button 
            onClick={() => setSearchTerm(prev => prev ? '' : ' ')}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Configurações de Revisão"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button 
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors relative cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {metrics.vencidos > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-2 right-2 border-2 border-white" />
            )}
          </button>

          <UserAvatarMenu />
        </div>
      </div>

      {/* 2. Cartões de Resumo (KPIs - Estilo Referência) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Principal Sólido (Azul Petróleo / Teal) */}
        <button 
          onClick={() => { setStatusFilter('todos'); setCurrentPage(1); }}
          className={`bg-[#186b77] text-white rounded-2xl p-4 shadow-xs border border-[#135a64] relative overflow-hidden flex flex-col justify-between h-28 text-left cursor-pointer transition-all hover:brightness-105 ${statusFilter === 'todos' ? 'ring-2 ring-offset-2 ring-[#186b77]' : ''}`}
          title="Ver todos os motores"
        >
          <div className="z-10">
            <span className="text-3xl font-extrabold tracking-tight">{metrics.total}</span>
            <p className="text-xs font-medium text-teal-100 mt-1">Motores Cadastrados</p>
          </div>
          <Ship className="w-16 h-16 text-white/10 absolute -right-3 -bottom-3 rotate-12 pointer-events-none" />
        </button>

        {/* Card 2: Dentro da Revisão */}
        <button 
          onClick={() => { setStatusFilter(statusFilter === 'ok' ? 'todos' : 'ok'); setCurrentPage(1); }}
          className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all text-left cursor-pointer hover:border-emerald-300 flex flex-col justify-between h-28 ${statusFilter === 'ok' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-slate-200/80'}`}
          title="Filtrar embarcações dentro da revisão"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.emDia}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Dentro da Revisão</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Revisões em dia</p>
          </div>
        </button>

        {/* Card 3: Próxima da Revisão */}
        <button 
          onClick={() => { setStatusFilter(statusFilter === 'proximo' ? 'todos' : 'proximo'); setCurrentPage(1); }}
          className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all text-left cursor-pointer hover:border-amber-300 flex flex-col justify-between h-28 ${statusFilter === 'proximo' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20' : 'border-slate-200/80'}`}
          title="Filtrar embarcações próximas da revisão"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.proximos}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Próximas da Revisão</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Faltam ≤ 10h p/ revisão</p>
          </div>
        </button>

        {/* Card 4: Precisa ir p/ Revisão */}
        <button 
          onClick={() => { setStatusFilter(statusFilter === 'vencido' ? 'todos' : 'vencido'); setCurrentPage(1); }}
          className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all text-left cursor-pointer hover:border-red-300 flex flex-col justify-between h-28 ${statusFilter === 'vencido' ? 'ring-2 ring-red-500 border-red-500 bg-red-50/20' : 'border-slate-200/80'}`}
          title="Filtrar embarcações que precisam ir para revisão"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.vencidos}</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Precisa ir p/ Revisão</p>
            <p className="text-[11px] text-red-600 font-medium mt-0.5">Alerta ativo (Horas atingidas)</p>
          </div>
        </button>

        {/* Card 5: Em Manutenção */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.emManutencao}</span>
            <Wrench className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Na Oficina</p>
            <p className="text-[11px] text-cyan-600 font-medium mt-0.5">Manutenção em andamento</p>
          </div>
        </div>

        {/* Card 6: Sem Histórico */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.semHistorico}</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Sem Histórico</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Sem leituras recentes</p>
          </div>
        </div>

      </div>

      {/* 3. Controles & Tabela (Container Branco Elevado) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col">
        
        {/* Toolbar Superior Despoluída */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          
          {/* Left Actions: Search & Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            
            {/* Search Input Flat Design */}
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <input
                type="text"
                placeholder="Pesquisar embarcação, código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#186b77] outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/80">
              <button
                onClick={() => { setTipoFilter('todos'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tipoFilter === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => { setTipoFilter('lancha'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tipoFilter === 'lancha' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lanchas
              </button>
              <button
                onClick={() => { setTipoFilter('jet'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tipoFilter === 'jet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jets Ski
              </button>
            </div>

            {/* Ghost Status Filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const nextStatus = statusFilter === 'todos' ? 'vencido' : statusFilter === 'vencido' ? 'proximo' : statusFilter === 'proximo' ? 'ok' : 'todos';
                  setStatusFilter(nextStatus);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusFilter !== 'todos' 
                    ? 'bg-teal-50 border-teal-200 text-[#186b77]' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {statusFilter === 'todos' && 'Filtro Status'}
                  {statusFilter === 'ok' && 'Dentro da Revisão'}
                  {statusFilter === 'proximo' && 'Próxima da Revisão'}
                  {statusFilter === 'vencido' && 'Precisa ir p/ Revisão'}
                </span>
                {statusFilter !== 'todos' && (
                  <span className="w-2 h-2 rounded-full bg-[#186b77]" />
                )}
              </button>

              {(searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTipoFilter('todos');
                    setStatusFilter('todos');
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold text-[#186b77] hover:underline px-2 py-1 cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>

          </div>

          {/* Right Actions: Batch Mode Toggle + Modal Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleBatchMode}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBatchMode 
                  ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-md ring-2 ring-amber-400' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
              title="Ativar preenchimento veloz em lote para a frota"
            >
              <Zap className={`w-3.5 h-3.5 ${isBatchMode ? 'text-slate-950 fill-slate-950' : 'text-amber-500'}`} />
              <span>{isBatchMode ? 'Sair do Modo Lote' : 'Lançamento em Lote'}</span>
            </button>

            <button
              onClick={() => openUpdateModal()}
              className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>

        </div>

        {/* Selected row bar (if any rows selected) */}
        {selectedBoatIds.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-700">
            <span className="text-[#186b77] font-bold">{selectedBoatIds.length} item(ns) selecionado(s)</span>
            <button 
              onClick={() => setSelectedBoatIds([])} 
              className="text-slate-500 hover:underline cursor-pointer"
            >
              Desmarcar todos
            </button>
          </div>
        )}

        {/* 4. Estilização da Tabela de Dados (Desktop) e Lista de Cards (Mobile) */}
        
        {/* Visualização de Cards para Dispositivos Móveis (Zero Scroll Lateral) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedBoats.map((boat) => {
            const info = calcularStatusRevisao(boat, manutencoes, settings);
            const isSelected = selectedBoatIds.includes(boat.id);

            return (
              <div 
                key={boat.id} 
                className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}
              >
                {/* Header do Card Mobile: Checkbox + Identificação + Ações */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(boat.id)}
                      className="mt-1 rounded border-slate-300 text-[#186b77] focus:ring-[#186b77] cursor-pointer"
                    />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      boat.tipo === 'jet' ? 'bg-cyan-50 text-cyan-700 border-cyan-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'
                    }`}>
                      <Ship className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{boat.nome}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          M{boat.numero}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {boat.modelo || 'Modelo N/A'} • {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} {boat.fabricante ? `• ${boat.fabricante}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Kebab Dropdown Menu Mobile */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveKebabId(activeKebabId === boat.id ? null : boat.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Mais opções"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeKebabId === boat.id && (
                      <div 
                        ref={kebabRef}
                        className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black/5 z-30 divide-y divide-slate-100 text-xs py-1"
                      >
                        <button
                          onClick={() => openUpdateModal(boat)}
                          className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-[#186b77] flex items-center gap-2 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#186b77]" />
                          <span>Atualizar Horas</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBoatForHistory(boat);
                            setActiveKebabId(null);
                          }}
                          className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-[#186b77] flex items-center gap-2 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ver Histórico</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge de Status da Revisão */}
                <div>
                  {info.status === 'vencido' && (
                    <div className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200/80 px-2.5 py-1 rounded-xl text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>Precisa ir p/ Revisão ({info.horasRodadas}/{info.intervalo}h)</span>
                    </div>
                  )}

                  {info.status === 'proximo' && (
                    <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>Próxima da Revisão ({info.horasRestantes}h restantes)</span>
                    </div>
                  )}

                  {info.status === 'ok' && (
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span>Dentro da Revisão</span>
                    </div>
                  )}
                </div>

                {/* Dados Chave: Horas Atuais & Próxima Revisão */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Horas Atuais</span>
                    {isBatchMode ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={batchHoras[boat.id] ?? (boat.horasMotor || 0)}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                            setBatchHoras(prev => ({ ...prev, [boat.id]: val }));
                          }}
                          className={`w-full px-2 py-1 rounded-lg font-mono font-bold border outline-none ${
                            batchHoras[boat.id] !== undefined && batchHoras[boat.id] !== '' && Number(batchHoras[boat.id]) !== (boat.horasMotor || 0)
                              ? 'bg-amber-50 border-amber-400 text-amber-900 ring-1 ring-amber-300'
                              : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>
                    ) : inlineEditingBoatId === boat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          autoFocus
                          value={inlineHorasValue}
                          onChange={(e) => setInlineHorasValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(boat);
                            if (e.key === 'Escape') setInlineEditingBoatId(null);
                          }}
                          className="w-20 px-1.5 py-0.5 bg-white border border-[#186b77] rounded font-mono font-bold outline-none"
                        />
                        <button onClick={() => handleSaveInline(boat)} className="p-1 bg-emerald-600 text-white rounded cursor-pointer"><Check className="w-3 h-3"/></button>
                        <button onClick={() => setInlineEditingBoatId(null)} className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"><X className="w-3 h-3"/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-slate-900">{boat.horasMotor || 0} h</span>
                        <button
                          onClick={() => startInlineEdit(boat)}
                          className="p-1 text-slate-400 hover:text-[#186b77] hover:bg-white rounded transition-colors cursor-pointer"
                          title="Editar horas"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Próx. Revisão</span>
                    <span className={`font-mono text-sm font-bold ${info.status === 'vencido' ? 'text-red-600' : info.status === 'proximo' ? 'text-amber-700' : 'text-slate-700'}`}>
                      {info.proximaRevisaoHoras} h
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Atu: {formatDate(boat.ultimaAtualizacaoHoras || boat.historicoHoras?.[0]?.data)}
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas Mobile */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setSelectedBoatForHistory(boat)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Ver Histórico
                  </button>
                  <button
                    onClick={() => openUpdateModal(boat)}
                    className="px-3 py-1.5 text-xs font-bold text-[#186b77] bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lançar Horas</span>
                  </button>
                </div>

              </div>
            );
          })}

          {paginatedBoats.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma embarcação encontrada.</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou filtros.</p>
            </div>
          )}
        </div>

        {/* Tabela de Dados (Desktop `hidden md:block`) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            
            {/* Cabeçalho Pequeno Uppercase Semibold em Cinza */}
            <thead className="bg-slate-50/60 border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#186b77] focus:ring-[#186b77] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Embarcação</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Modelo / Tipo</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Horas Atuais</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Próx. Revisão (Est.)</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Última Atualização</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>

            {/* Registros sem divisórias verticais */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedBoats.map((boat) => {
                const info = calcularStatusRevisao(boat, manutencoes, settings);
                const isSelected = selectedBoatIds.includes(boat.id);

                return (
                  <tr 
                    key={boat.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}
                  >
                    
                    {/* Checkbox Selection */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(boat.id)}
                        className="rounded border-slate-300 text-[#186b77] focus:ring-[#186b77] cursor-pointer"
                      />
                    </td>

                    {/* Indicador de Status Minimalista (Sem Badges Pesados) */}
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                      {info.status === 'vencido' && (
                        <div className="flex items-center gap-1.5 text-red-600 font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>Precisa ir p/ Revisão ({info.horasRodadas}/{info.intervalo}h)</span>
                        </div>
                      )}

                      {info.status === 'proximo' && (
                        <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                          <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>Próxima da Revisão ({info.horasRestantes}h restantes)</span>
                        </div>
                      )}

                      {info.status === 'ok' && (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>Dentro da Revisão</span>
                        </div>
                      )}
                    </td>

                    {/* Embarcação Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          boat.tipo === 'jet' ? 'bg-cyan-50 text-cyan-700 border-cyan-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'
                        }`}>
                          <Ship className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{boat.nome}</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              M{boat.numero}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {boat.fabricante} {boat.ano ? `• ${boat.ano}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Modelo / Tipo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{boat.modelo || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} • Regra: {info.intervalo}h
                      </div>
                    </td>

                    {/* Horas Atuais (Suporta Modo Normal + Edição Inline + Modo em Lote) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isBatchMode ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={batchHoras[boat.id] ?? (boat.horasMotor || 0)}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                              setBatchHoras(prev => ({ ...prev, [boat.id]: val }));
                            }}
                            className={`w-28 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border outline-none transition-all ${
                              batchHoras[boat.id] !== undefined && batchHoras[boat.id] !== '' && Number(batchHoras[boat.id]) !== (boat.horasMotor || 0)
                                ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300'
                                : 'bg-white border-slate-300 focus:border-[#186b77] focus:ring-1 focus:ring-[#186b77]'
                            }`}
                            placeholder={`${boat.horasMotor || 0}`}
                          />
                          {batchHoras[boat.id] !== undefined && batchHoras[boat.id] !== '' && Number(batchHoras[boat.id]) !== (boat.horasMotor || 0) && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              {Number(batchHoras[boat.id]) - (boat.horasMotor || 0) > 0 
                                ? `+${(Number(batchHoras[boat.id]) - (boat.horasMotor || 0)).toFixed(1)}h` 
                                : `${(Number(batchHoras[boat.id]) - (boat.horasMotor || 0)).toFixed(1)}h`
                              }
                            </span>
                          )}
                        </div>
                      ) : inlineEditingBoatId === boat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            autoFocus
                            value={inlineHorasValue}
                            onChange={(e) => setInlineHorasValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInline(boat);
                              if (e.key === 'Escape') setInlineEditingBoatId(null);
                            }}
                            className="w-24 px-2 py-1 bg-white border-2 border-[#186b77] rounded-lg text-xs font-mono font-bold focus:outline-none shadow-xs"
                          />
                          <button
                            onClick={() => handleSaveInline(boat)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer"
                            title="Salvar horas"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setInlineEditingBoatId(null)}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-mono text-base font-extrabold text-slate-900">
                            {boat.horasMotor || 0} h
                          </span>
                          <button
                            onClick={() => startInlineEdit(boat)}
                            className="p-1 text-slate-400 hover:text-[#186b77] hover:bg-teal-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Editar horas diretamente nesta linha"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Próxima Revisão */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                      <span className={info.status === 'vencido' ? 'text-red-600 font-bold' : info.status === 'proximo' ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                        {info.proximaRevisaoHoras} h
                      </span>
                    </td>

                    {/* Última Atualização */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                      {formatDate(boat.ultimaAtualizacaoHoras || boat.historicoHoras?.[0]?.data)}
                    </td>

                    {/* Ações Discretas / Kebab Menu */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setSelectedBoatForHistory(boat)}
                          className="text-xs font-semibold text-slate-600 hover:text-[#186b77] hover:underline transition-colors cursor-pointer"
                        >
                          Ver Histórico
                        </button>

                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveKebabId(activeKebabId === boat.id ? null : boat.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Mais opções"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Kebab Dropdown Menu */}
                          {activeKebabId === boat.id && (
                            <div 
                              ref={kebabRef}
                              className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black/5 z-30 divide-y divide-slate-100 text-xs py-1"
                            >
                              <button
                                onClick={() => openUpdateModal(boat)}
                                className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-[#186b77] flex items-center gap-2 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-[#186b77]" />
                                <span>Atualizar Horas</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBoatForHistory(boat);
                                  setActiveKebabId(null);
                                }}
                                className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-[#186b77] flex items-center gap-2 cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span>Ver Histórico</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {paginatedBoats.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Nenhuma embarcação encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar o termo de busca ou filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Paginação */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          
          <div className="flex items-center gap-2">
            <span>Linhas por página</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === page 
                    ? 'bg-slate-100 border border-slate-300 text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium cursor-pointer"
            >
              Próximo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            Exibindo {paginatedBoats.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </div>

        </div>

      </div>

      {/* Floating Action Bar for Batch Mode (Tema Claro & Responsivo) */}
      {isBatchMode && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 bg-white text-slate-900 p-4 sm:px-6 sm:py-3.5 rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6 font-sans text-xs animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Modo Lançamento em Lote</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full border border-amber-200/80">
                  {Object.keys(batchHoras).filter(id => batchHoras[id] !== undefined && batchHoras[id] !== '' && Number(batchHoras[id]) !== (embarcacoes.find(b => b.id === id)?.horasMotor || 0)).length} motor(es) alterado(s)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Preencha os valores na tabela e confirme as alterações</div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={toggleBatchMode}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveBatch}
              disabled={isSavingBatch}
              className="flex-1 sm:flex-none px-5 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingBatch ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Launch Update Modal com Tema Claro */}
      {selectedBoatForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden font-sans">
            
            {/* Header com Tema Claro Elegante */}
            <div className="px-6 py-4.5 bg-slate-50/90 text-slate-900 flex items-center justify-between border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#186b77] border border-teal-200/70 flex items-center justify-center shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
                    <span>Lançar Horas do Motor</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100/80 text-[#186b77] border border-teal-200/80">
                      Operacional
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Atualize as horas de motor da embarcação para controle de revisões</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBoatForUpdate(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              
              {/* Seletor de Embarcação Pesquisável */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Embarcação / Motor</span>
                  <span className="text-[11px] font-normal text-slate-400 capitalize">Frota ativa ({embarcacoes.length})</span>
                </label>
                <Select
                  options={boatOptions}
                  value={boatOptions.find(o => o.value === selectedBoatForUpdate.id) || null}
                  onChange={(option) => {
                    if (option?.boat) {
                      setSelectedBoatForUpdate(option.boat);
                      setNovasHorasInput(option.boat.horasMotor || 0);
                    }
                  }}
                  placeholder="Pesquisar por código (M01), nome ou modelo..."
                  isSearchable={true}
                  className="text-xs font-medium"
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Nenhuma embarcação encontrada"}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 99999 }),
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '1rem',
                      borderColor: state.isFocused ? '#186b77' : '#e2e8f0',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(24, 107, 119, 0.2)' : 'none',
                      '&:hover': { borderColor: '#186b77' },
                      backgroundColor: '#f8fafc',
                      paddingTop: '2px',
                      paddingBottom: '2px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#0f172a',
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: '0.75rem',
                      fontWeight: state.isSelected ? '700' : '500',
                      color: state.isSelected ? '#186b77' : '#1e293b',
                      backgroundColor: state.isSelected ? '#f0fdfa' : state.isFocused ? '#f1f5f9' : 'white',
                      cursor: 'pointer',
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#0f172a',
                      fontWeight: '700',
                    })
                  }}
                />
              </div>

              {/* Card de Resumo da Embarcação Selecionada com Estativa */}
              <div className="p-4 bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      selectedBoatForUpdate.tipo === 'jet' ? 'bg-cyan-100/70 text-cyan-800 border-cyan-200' : 'bg-blue-100/70 text-blue-800 border-blue-200'
                    }`}>
                      <Ship className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span>{selectedBoatForUpdate.nome}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                          M{selectedBoatForUpdate.numero}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {selectedBoatForUpdate.modelo || 'Modelo N/A'} • {selectedBoatForUpdate.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} {selectedBoatForUpdate.fabricante ? `• ${selectedBoatForUpdate.fabricante}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Horímetro Atual</span>
                    <div className="font-mono text-xl font-black text-slate-900">
                      {selectedBoatForUpdate.horasMotor || 0} <span className="text-xs font-semibold text-slate-500">h</span>
                    </div>
                  </div>
                </div>

                {/* Cálculo Dinâmico de Revisão */}
                {(() => {
                  const info = calcularStatusRevisao(selectedBoatForUpdate, manutencoes, settings);
                  return (
                    <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Regra de Revisão: <strong className="text-slate-800 font-mono font-bold">{info.intervalo}h</strong></span>
                      <span className="flex items-center gap-1">
                        Próxima revisão: <strong className="text-[#186b77] font-mono font-bold">{info.proximaRevisaoHoras}h</strong>
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Entrada das Novas Horas com Badge de Cálculo de Horas Navegadas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Novas Horas do Motor (h)
                  </label>
                  {novasHorasInput !== '' && Number(novasHorasInput) !== (selectedBoatForUpdate.horasMotor || 0) && (
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                      Number(novasHorasInput) >= (selectedBoatForUpdate.horasMotor || 0) 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      {Number(novasHorasInput) - (selectedBoatForUpdate.horasMotor || 0) >= 0 
                        ? `+${(Number(novasHorasInput) - (selectedBoatForUpdate.horasMotor || 0)).toFixed(1)} h navegadas`
                        : `${(Number(novasHorasInput) - (selectedBoatForUpdate.horasMotor || 0)).toFixed(1)} h`
                      }
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={novasHorasInput}
                    onChange={(e) => setNovasHorasInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-mono font-extrabold text-slate-900 focus:bg-white focus:border-[#186b77] focus:ring-2 focus:ring-[#186b77]/20 outline-none transition-all shadow-2xs"
                    placeholder="Ex: 150.5"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-xs text-slate-400">
                    HORAS
                  </span>
                </div>
              </div>

              {/* Data e Hora + Observação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Data e Hora
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dataRegistroInput}
                    onChange={(e) => setDataRegistroInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#186b77] focus:ring-2 focus:ring-[#186b77]/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={observacaoInput}
                    onChange={(e) => setObservacaoInput(e.target.value)}
                    placeholder="Ex: Leitura pós-passeio"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#186b77] focus:ring-2 focus:ring-[#186b77]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="px-6 py-4 -mx-6 -mb-6 mt-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Registros gravados ficam salvos no histórico da embarcação.
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedBoatForUpdate(null)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Lançamento'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* History Timeline Modal */}
      {selectedBoatForHistory && (
        <HistoricoHorasModal
          boat={selectedBoatForHistory}
          isOpen={!!selectedBoatForHistory}
          onClose={() => setSelectedBoatForHistory(null)}
          onRefresh={() => {
            onRefresh();
            const updated = boatDB.getById(selectedBoatForHistory.id);
            if (updated) setSelectedBoatForHistory(updated);
          }}
        />
      )}

      {/* Revision Settings Quick Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden font-sans">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base">Regras de Revisão Programada</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl">
                Os alertas visuais de revisão são acionados automaticamente quando o horímetro atingir o limite estipulado desde a última manutenção.
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Intervalo Lanchas:</span>
                  <span className="font-mono font-bold text-sm text-[#186b77]">{settings.intervaloPadraoLancha}h</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Intervalo Geral Jets:</span>
                  <span className="font-mono font-bold text-sm text-cyan-700">{settings.intervaloPadraoJet}h</span>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700">Modelos de Jet com Regra Própria:</span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {Object.entries(settings.intervalosPorModeloJet || {}).map(([mod, h]) => (
                      <div key={mod} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                        <span className="font-bold text-slate-800">{mod}</span>
                        <span className="font-mono font-bold text-cyan-700">{h}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Você pode alterar essas regras a qualquer momento em <strong>Configurações do Sistema</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Entendi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
