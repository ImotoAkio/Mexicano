import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Ship, 
  CheckSquare, 
  Square, 
  Save, 
  History, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Filter,
  RefreshCw,
  Zap,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Edit3
} from 'lucide-react';
import { Embarcacao, Manutencao, RegistroAcessorios } from '../../types';
import { boatDB } from '../../db';
import { getBoatCode } from '../../utils/boatUtils';
import HistoricoAcessoriosModal from './HistoricoAcessoriosModal';

interface AccessoriesControlProps {
  embarcacoes: Embarcacao[];
  manutencoes: Manutencao[];
  onRefresh: () => void;
}

export default function AccessoriesControl({ embarcacoes, onRefresh }: AccessoriesControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_dia' | 'pendente' | 'com_falta'>('todos');
  const [selectedBoatForHistory, setSelectedBoatForHistory] = useState<Embarcacao | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [acessoriosState, setAcessoriosState] = useState<{
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    extintores?: boolean;
    observacoes?: string;
  }>({});
  const [horasMotorInput, setHorasMotorInput] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchData, setBatchData] = useState<Record<string, {
    tenda: boolean;
    mesa: boolean;
    bancosCadeiras: boolean;
    churrasqueira: boolean;
    extintores: boolean;
    observacoes: string;
    horasMotor: number | '';
  }>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const lanchas = embarcacoes.filter(b => b.tipo === 'lancha');

  const getDaysSinceLastConf = (ultimaConfIso?: string) => {
    if (!ultimaConfIso) return Infinity;
    const diffTime = Math.abs(new Date().getTime() - new Date(ultimaConfIso).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const metrics = lanchas.reduce((acc, boat) => {
    const days = getDaysSinceLastConf(boat.acessorios?.ultimaConferencia);
    const accObj = boat.acessorios || {};
    const isOK = accObj.tenda !== false && accObj.mesa !== false && accObj.bancosCadeiras !== false && accObj.churrasqueira !== false && accObj.extintores !== false;
    if (!isOK) acc.comFaltas++;
    if (days <= 7) acc.emDia++;
    else acc.pendentes++;
    return acc;
  }, { total: lanchas.length, emDia: 0, pendentes: 0, comFaltas: 0 });

  const filteredLanchas = lanchas.filter(boat => {
    const matchesSearch = 
      boat.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (boat.numero && boat.numero.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (boat.modelo && boat.modelo.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    const days = getDaysSinceLastConf(boat.acessorios?.ultimaConferencia);
    const accObj = boat.acessorios || {};
    const isOK = accObj.tenda !== false && accObj.mesa !== false && accObj.bancosCadeiras !== false && accObj.churrasqueira !== false && accObj.extintores !== false;
    if (statusFilter === 'em_dia' && days > 7) return false;
    if (statusFilter === 'pendente' && days <= 7) return false;
    if (statusFilter === 'com_falta' && isOK) return false;
    return true;
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  const handleEditClick = (boat: Embarcacao) => {
    setEditingId(boat.id);
    const acc = boat.acessorios || {};
    setAcessoriosState({
      tenda: acc.tenda ?? true,
      mesa: acc.mesa ?? true,
      bancosCadeiras: acc.bancosCadeiras ?? true,
      churrasqueira: acc.churrasqueira ?? true,
      extintores: acc.extintores ?? true,
      observacoes: acc.observacoes || ''
    });
    setHorasMotorInput(boat.horasMotor || 0);
    setExpandedCardId(boat.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAcessoriosState({});
    setHorasMotorInput('');
  };

  const handleSaveConferencia = async (boat: Embarcacao) => {
    setIsSaving(true);
    try {
      boatDB.registrarConferenciaAcessorios(
        boat.id,
        {
          tenda: acessoriosState.tenda,
          mesa: acessoriosState.mesa,
          bancosCadeiras: acessoriosState.bancosCadeiras,
          churrasqueira: acessoriosState.churrasqueira,
          extintores: acessoriosState.extintores,
          observacoes: acessoriosState.observacoes
        },
        horasMotorInput !== '' ? Number(horasMotorInput) : boat.horasMotor
      );
      setEditingId(null);
      setAcessoriosState({});
      onRefresh();
    } catch (error) {
      console.error('Erro ao salvar conferência de acessórios:', error);
      alert('Erro ao salvar conferência de acessórios.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAcessorio = (key: keyof typeof acessoriosState) => {
    setAcessoriosState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleBatchMode = () => {
    if (!isBatchMode) {
      const initial: Record<string, any> = {};
      lanchas.forEach(b => {
        const acc = b.acessorios || {};
        initial[b.id] = {
          tenda: acc.tenda ?? true,
          mesa: acc.mesa ?? true,
          bancosCadeiras: acc.bancosCadeiras ?? true,
          churrasqueira: acc.churrasqueira ?? true,
          extintores: acc.extintores ?? true,
          observacoes: acc.observacoes || '',
          horasMotor: b.horasMotor || 0
        };
      });
      setBatchData(initial);
      setIsBatchMode(true);
    } else {
      setIsBatchMode(false);
      setBatchData({});
    }
  };

  const handleSaveBatch = async () => {
    setIsSavingBatch(true);
    try {
      const nowIso = new Date().toISOString();
      lanchas.forEach(b => {
        const item = batchData[b.id];
        if (item) {
          boatDB.registrarConferenciaAcessorios(
            b.id,
            {
              tenda: item.tenda,
              mesa: item.mesa,
              bancosCadeiras: item.bancosCadeiras,
              churrasqueira: item.churrasqueira,
              extintores: item.extintores,
              observacoes: item.observacoes
            },
            item.horasMotor !== '' ? Number(item.horasMotor) : undefined,
            nowIso
          );
        }
      });
      setIsBatchMode(false);
      setBatchData({});
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar lote de conferências:', err);
      alert('Erro ao salvar lote de conferências.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Nunca conferido';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return 'Nunca conferido';
    }
  };

  // ── Shared checkbox renderer ──
  const renderCheckbox = (
    label: string,
    checked: boolean | undefined,
    onToggle: () => void,
    disabled: boolean
  ) => (
    <button
      disabled={disabled}
      onClick={onToggle}
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors text-xs font-semibold select-none ${
        disabled ? 'cursor-default' : 'cursor-pointer active:scale-95'
      } ${checked !== false ? 'text-emerald-700' : 'text-red-600'}`}
    >
      {checked !== false
        ? <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
        : <Square className="w-5 h-5 text-red-400 shrink-0" />}
      <span>{label}</span>
    </button>
  );

  // ── Mobile Card for a single lancha ──
  const renderMobileCard = (boat: Embarcacao) => {
    const isEditing = editingId === boat.id;
    const isExpanded = expandedCardId === boat.id;
    const batchVal = batchData[boat.id];
    const acc = isBatchMode ? batchVal : isEditing ? acessoriosState : (boat.acessorios || {});
    const days = getDaysSinceLastConf(boat.acessorios?.ultimaConferencia);
    const isOK = acc?.tenda !== false && acc?.mesa !== false && acc?.bancosCadeiras !== false && acc?.churrasqueira !== false && acc?.extintores !== false;

    return (
      <div
        key={boat.id}
        className={`bg-white rounded-2xl border shadow-2xs overflow-hidden transition-all ${
          isEditing ? 'border-[#186b77] ring-1 ring-[#186b77]/30' : isBatchMode ? 'border-amber-300' : 'border-slate-200'
        }`}
      >
        {/* Card header – always visible */}
        <button
          onClick={() => {
            if (!isEditing) setExpandedCardId(isExpanded ? null : boat.id);
          }}
          className="w-full flex items-center gap-3 p-4 text-left cursor-pointer active:bg-slate-50"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
            <Ship className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-sm text-slate-900 truncate">{boat.nome}</span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                M{boat.numero}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {boat.modelo || 'Modelo N/A'} {boat.fabricante ? `• ${boat.fabricante}` : ''}
            </div>
          </div>

          {/* Mini status + hours on the right */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-mono text-sm font-extrabold text-slate-900">{boat.horasMotor || 0}h</span>
            {days <= 7 ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> Em dia
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full">
                <Clock className="w-2.5 h-2.5" /> Pendente
              </span>
            )}
          </div>

          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded || isEditing ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsed quick-view: 5 tiny checkmarks */}
        {!isExpanded && !isEditing && (
          <div className="flex items-center gap-2 sm:gap-3 px-4 pb-3 -mt-1 flex-wrap">
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${acc?.tenda !== false ? 'text-emerald-600' : 'text-red-500'}`}>
              {acc?.tenda !== false ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Ten</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${acc?.mesa !== false ? 'text-emerald-600' : 'text-red-500'}`}>
              {acc?.mesa !== false ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Mes</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${acc?.bancosCadeiras !== false ? 'text-emerald-600' : 'text-red-500'}`}>
              {acc?.bancosCadeiras !== false ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Ban</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${acc?.churrasqueira !== false ? 'text-emerald-600' : 'text-red-500'}`}>
              {acc?.churrasqueira !== false ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Chu</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${acc?.extintores !== false ? 'text-emerald-600' : 'text-red-500'}`}>
              {acc?.extintores !== false ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Ext</span>
            </div>
            <span className="ml-auto text-[10px] text-slate-400">{formatDate(boat.acessorios?.ultimaConferencia)}</span>
          </div>
        )}

        {/* Expanded detail / edit mode */}
        {(isExpanded || isEditing) && (
          <div className="border-t border-slate-100 p-4 space-y-4">

            {/* Horímetro */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Horímetro (Horas do Motor)
              </label>
              {isBatchMode ? (
                <input
                  type="number" step="0.1" min="0"
                  value={batchVal?.horasMotor ?? (boat.horasMotor || 0)}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setBatchData(prev => ({ ...prev, [boat.id]: { ...prev[boat.id], horasMotor: val } }));
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-amber-400"
                />
              ) : isEditing ? (
                <input
                  type="number" step="0.1" min="0"
                  value={horasMotorInput}
                  onChange={(e) => setHorasMotorInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white border border-[#186b77] rounded-xl font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-[#186b77]"
                />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg font-extrabold text-slate-900">{boat.horasMotor || 0} h</span>
                  <span className="text-[10px] text-slate-400">Atualizado: {formatDate(boat.ultimaAtualizacaoHoras)}</span>
                </div>
              )}
            </div>

            {/* Checklist 3×2 */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Checklist de Acessórios & Equipamentos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                {renderCheckbox('Tenda', acc?.tenda, () => {
                  if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], tenda: !p[boat.id].tenda } }));
                  else if (isEditing) toggleAcessorio('tenda');
                }, !isEditing && !isBatchMode)}

                {renderCheckbox('Mesa', acc?.mesa, () => {
                  if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], mesa: !p[boat.id].mesa } }));
                  else if (isEditing) toggleAcessorio('mesa');
                }, !isEditing && !isBatchMode)}

                {renderCheckbox('Bancos', acc?.bancosCadeiras, () => {
                  if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], bancosCadeiras: !p[boat.id].bancosCadeiras } }));
                  else if (isEditing) toggleAcessorio('bancosCadeiras');
                }, !isEditing && !isBatchMode)}

                {renderCheckbox('Churrasq.', acc?.churrasqueira, () => {
                  if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], churrasqueira: !p[boat.id].churrasqueira } }));
                  else if (isEditing) toggleAcessorio('churrasqueira');
                }, !isEditing && !isBatchMode)}

                {renderCheckbox('Extintores', acc?.extintores, () => {
                  if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], extintores: !p[boat.id].extintores } }));
                  else if (isEditing) toggleAcessorio('extintores');
                }, !isEditing && !isBatchMode)}
              </div>
            </div>

            {/* Observações */}
            {(isEditing || isBatchMode) && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Observações / Faltas
                </label>
                <input
                  type="text"
                  value={isBatchMode ? (batchVal?.observacoes || '') : (acessoriosState.observacoes || '')}
                  onChange={(e) => {
                    if (isBatchMode) setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], observacoes: e.target.value } }));
                    else setAcessoriosState(p => ({ ...p, observacoes: e.target.value }));
                  }}
                  placeholder="Ex: Faltando 1 cadeira de apoio..."
                  className={`w-full px-3 py-2.5 text-xs rounded-xl outline-none border ${isBatchMode ? 'border-amber-300 focus:ring-amber-400' : 'border-[#186b77] focus:ring-[#186b77]'} focus:ring-2`}
                />
              </div>
            )}

            {/* Última conferência info */}
            {!isEditing && !isBatchMode && (
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Última conferência: </span>
                  <span className="font-semibold text-slate-800">{formatDate(boat.acessorios?.ultimaConferencia)}</span>
                </div>
                <div>
                  {days <= 7 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Em dia
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full">
                      <Clock className="w-3 h-3" /> {days === Infinity ? 'Sem registro' : `há ${days}d`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Observações (read-only) */}
            {!isEditing && !isBatchMode && acc?.observacoes && (
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-600 italic">
                <strong className="not-italic text-slate-700">Obs:</strong> {acc.observacoes}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveConferencia(boat)}
                    disabled={isSaving}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-[#186b77] hover:bg-[#12555f] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Salvando...' : 'Salvar Conferência'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedBoatForHistory(boat)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <History className="w-4 h-4 text-slate-500" />
                    Histórico
                  </button>
                  <button
                    onClick={() => handleEditClick(boat)}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-[#186b77] hover:bg-[#12555f] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    Conferir
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 h-full flex flex-col space-y-4 lg:space-y-6 overflow-hidden font-sans">
      
      {/* 1. Info Banner – compact on mobile */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm block text-blue-950">Conferência Semanal de Acessórios</span>
            <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed hidden sm:block">
              Conferência realizada semanalmente junto com a leitura do horímetro. Apenas lanchas requerem verificação de acessórios (tenda, mesa, bancos, churrasqueira, extintores).
            </p>
            <p className="text-slate-500 mt-0.5 text-[11px] sm:hidden">Exclusivo lanchas • Horímetro + Acessórios</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-white font-semibold text-blue-800 rounded-xl border border-blue-200 shadow-2xs text-[11px] sm:text-xs shrink-0">
          {lanchas.length} Lanchas
        </span>
      </div>

      {/* 2. KPIs – 2×2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <button
          onClick={() => setStatusFilter('todos')}
          className={`bg-[#186b77] text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-[#135a64] flex flex-col justify-between h-20 sm:h-24 text-left transition-all cursor-pointer ${
            statusFilter === 'todos' ? 'ring-2 ring-offset-2 ring-[#186b77]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-extrabold">{metrics.total}</span>
            <Ship className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-teal-100">Frota de Lanchas</p>
            <p className="text-[9px] sm:text-[11px] text-teal-200/80 hidden sm:block">Monitoramento semanal</p>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'em_dia' ? 'todos' : 'em_dia')}
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs border transition-all text-left cursor-pointer flex flex-col justify-between h-20 sm:h-24 ${
            statusFilter === 'em_dia' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.emDia}</span>
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700">Em Dia</p>
            <p className="text-[9px] sm:text-[11px] text-emerald-600 font-medium hidden sm:block">Últimos 7 dias</p>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'com_falta' ? 'todos' : 'com_falta')}
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs border transition-all text-left cursor-pointer flex flex-col justify-between h-20 sm:h-24 ${
            statusFilter === 'com_falta' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.comFaltas}</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700">Com Pendência</p>
            <p className="text-[9px] sm:text-[11px] text-amber-600 font-medium hidden sm:block">Falta acessório</p>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'pendente' ? 'todos' : 'pendente')}
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs border transition-all text-left cursor-pointer flex flex-col justify-between h-20 sm:h-24 ${
            statusFilter === 'pendente' ? 'ring-2 ring-red-500 border-red-500 bg-red-50/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.pendentes}</span>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700">Pendente</p>
            <p className="text-[9px] sm:text-[11px] text-red-600 font-medium hidden sm:block">&gt; 7 dias</p>
          </div>
        </button>
      </div>

      {/* 3. Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar lancha por nome, código M..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#186b77] outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {statusFilter !== 'todos' && (
            <button
              onClick={() => setStatusFilter('todos')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#186b77] hover:underline"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 sm:border-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleBatchMode}
            className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              isBatchMode 
                ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-md ring-2 ring-amber-400' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isBatchMode ? 'text-slate-950 fill-slate-950' : 'text-amber-500'}`} />
            <span className="sm:inline">{isBatchMode ? 'Sair do Modo Lote' : 'Conferência em Lote'}</span>
          </button>

          {isBatchMode && (
            <button
              onClick={handleSaveBatch}
              disabled={isSavingBatch}
              className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingBatch ? 'Salvando...' : 'Salvar Conferências em Lote'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Content area: Cards on mobile, Table on lg+ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

        {/* ═══ MOBILE CARD LAYOUT (below lg) ═══ */}
        <div className="lg:hidden space-y-2.5">
          {filteredLanchas.map(boat => renderMobileCard(boat))}

          {filteredLanchas.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma lancha encontrada.</p>
              <p className="text-xs text-slate-400 mt-1">Verifique o termo buscado ou ajuste os filtros.</p>
            </div>
          )}
        </div>

        {/* ═══ DESKTOP TABLE LAYOUT (lg+) ═══ */}
        <div className="hidden lg:block bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-600">Lancha</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-600">Horímetro</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 text-center">Tenda</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 text-center">Mesa</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 text-center">Bancos</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 text-center">Churrasq.</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 text-center">Extintores</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-600">Última Conf.</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-600">Obs.</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLanchas.map(boat => {
                  const isEditing = editingId === boat.id;
                  const batchVal = batchData[boat.id];
                  const acc = isBatchMode ? batchVal : isEditing ? acessoriosState : (boat.acessorios || {});
                  const days = getDaysSinceLastConf(boat.acessorios?.ultimaConferencia);

                  const toggleBatchField = (field: 'tenda' | 'mesa' | 'bancosCadeiras' | 'churrasqueira' | 'extintores') => {
                    setBatchData(prev => ({ ...prev, [boat.id]: { ...prev[boat.id], [field]: !prev[boat.id][field] } }));
                  };

                  const renderTdCheck = (field: 'tenda' | 'mesa' | 'bancosCadeiras' | 'churrasqueira' | 'extintores') => (
                    <td className="px-4 py-4 text-center">
                      <button
                        disabled={!isEditing && !isBatchMode}
                        onClick={() => {
                          if (isBatchMode) toggleBatchField(field);
                          else if (isEditing) toggleAcessorio(field);
                        }}
                        className={`inline-flex p-1 rounded-md transition-colors ${
                          !isEditing && !isBatchMode ? 'cursor-default' : 'hover:bg-slate-200 cursor-pointer'
                        } ${acc?.[field] !== false ? 'text-emerald-600' : 'text-slate-300'}`}
                      >
                        {acc?.[field] !== false ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 text-red-400" />}
                      </button>
                    </td>
                  );

                  return (
                    <tr key={boat.id} className={`hover:bg-slate-50/70 transition-colors ${isEditing ? 'bg-teal-50/30' : isBatchMode ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
                            <Ship className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{getBoatCode(boat)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{boat.modelo || 'N/A'} {boat.fabricante ? `• ${boat.fabricante}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isBatchMode ? (
                          <input type="number" step="0.1" min="0" value={batchVal?.horasMotor ?? (boat.horasMotor || 0)}
                            onChange={(e) => setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], horasMotor: e.target.value === '' ? '' : parseFloat(e.target.value) } }))}
                            className="w-24 px-2 py-1 bg-white border border-amber-300 rounded font-mono font-bold outline-none text-xs" />
                        ) : isEditing ? (
                          <input type="number" step="0.1" min="0" value={horasMotorInput}
                            onChange={(e) => setHorasMotorInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 bg-white border border-[#186b77] rounded font-mono font-bold outline-none text-xs" />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-extrabold text-slate-900">{boat.horasMotor || 0} h</span>
                            <span className="text-[10px] text-slate-400">Atualizado: {formatDate(boat.ultimaAtualizacaoHoras)}</span>
                          </div>
                        )}
                      </td>
                      {renderTdCheck('tenda')}
                      {renderTdCheck('mesa')}
                      {renderTdCheck('bancosCadeiras')}
                      {renderTdCheck('churrasqueira')}
                      {renderTdCheck('extintores')}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800">{formatDate(boat.acessorios?.ultimaConferencia)}</span>
                          {days <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full w-fit">
                              <CheckCircle className="w-3 h-3" /> Em dia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full w-fit">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isBatchMode ? (
                          <input type="text" value={batchVal?.observacoes || ''}
                            onChange={(e) => setBatchData(p => ({ ...p, [boat.id]: { ...p[boat.id], observacoes: e.target.value } }))}
                            placeholder="Faltas..." className="w-full px-2 py-1 text-xs border border-amber-300 rounded outline-none" />
                        ) : isEditing ? (
                          <input type="text" value={acessoriosState.observacoes || ''}
                            onChange={(e) => setAcessoriosState(p => ({ ...p, observacoes: e.target.value }))}
                            placeholder="Faltando 1 cadeira..." className="w-full px-2 py-1 text-xs border border-[#186b77] rounded outline-none" />
                        ) : (
                          <span className="text-xs text-slate-500 line-clamp-2">{acc?.observacoes || '-'}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={handleCancelEdit} className="text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer">Cancelar</button>
                            <button onClick={() => handleSaveConferencia(boat)} disabled={isSaving}
                              className="text-white bg-[#186b77] hover:bg-[#12555f] flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer shadow-2xs">
                              <Save className="w-3.5 h-3.5" /> Salvar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedBoatForHistory(boat)}
                              className="text-slate-600 hover:bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200">
                              <History className="w-3.5 h-3.5 text-slate-500" /> Histórico
                            </button>
                            <button onClick={() => handleEditClick(boat)}
                              className="text-[#186b77] bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer">
                              Conferir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredLanchas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Nenhuma lancha encontrada.</p>
                      <p className="text-xs text-slate-400 mt-1">Verifique o termo buscado ou ajuste os filtros.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Histórico */}
      {selectedBoatForHistory && (
        <HistoricoAcessoriosModal
          boat={selectedBoatForHistory}
          isOpen={!!selectedBoatForHistory}
          onClose={() => setSelectedBoatForHistory(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
