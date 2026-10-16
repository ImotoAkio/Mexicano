import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  Calculator,
  Truck,
  Plus,
  RefreshCw,
  ShieldAlert,
  Gauge,
  Fuel,
  Clock,
  Sparkles,
  Edit2,
  Trash2
} from 'lucide-react';
import { UtvVeiculo, UtvCotista, UtvUso, UtvControleAnualItem } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import UtvOperacaoTab from './UtvOperacaoTab';
import UtvControleAnualTab from './UtvControleAnualTab';
import UtvRateioTab from './UtvRateioTab';
import UtvReservaModal from './UtvReservaModal';
import UtvChecklistModal from './UtvChecklistModal';
import UtvCotistaModal from './UtvCotistaModal';
import UtvVeiculoModal from './UtvVeiculoModal';
import { formatHorimetroDecimal, formatKm } from '../../utils/utvUtils';

export type UtvSubTab = 'operacao' | 'controle-anual' | 'rateio' | 'veiculos';

interface UtvPageProps {
  initialTab?: UtvSubTab;
}

export default function UtvPage({ initialTab = 'operacao' }: UtvPageProps) {
  const [activeTab, setActiveTab] = useState<UtvSubTab>(initialTab);
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Estados dos dados
  const [veiculos, setVeiculos] = useState<UtvVeiculo[]>([]);
  const [cotistas, setCotistas] = useState<UtvCotista[]>([]);
  const [usos, setUsos] = useState<UtvUso[]>([]);
  const [controleAnual, setControleAnual] = useState<UtvControleAnualItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
  const [checklistModalState, setChecklistModalState] = useState<{
    isOpen: boolean;
    uso: UtvUso | null;
    mode: 'saida' | 'devolucao' | 'visualizar';
  }>({ isOpen: false, uso: null, mode: 'visualizar' });

  const [cotistaModalState, setCotistaModalState] = useState<{
    isOpen: boolean;
    cotistaToEdit: UtvCotista | null;
  }>({ isOpen: false, cotistaToEdit: null });

  const [veiculoModalState, setVeiculoModalState] = useState<{
    isOpen: boolean;
    veiculoToEdit: UtvVeiculo | null;
  }>({ isOpen: false, veiculoToEdit: null });

  // Carregar todos os dados
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resVeiculos, resCotistas, resUsos, resControle] = await Promise.all([
        fetchWithAuth('/api/utv/veiculos'),
        fetchWithAuth(`/api/utv/cotistas?ano=${ano}`),
        fetchWithAuth(`/api/utv/usos?ano=${ano}`),
        fetchWithAuth(`/api/utv/controle-anual?ano=${ano}`)
      ]);

      if (resVeiculos.ok) {
        const d = await resVeiculos.json();
        setVeiculos(d.veiculos || []);
      }
      if (resCotistas.ok) {
        const d = await resCotistas.json();
        setCotistas(d.cotistas || []);
      }
      if (resUsos.ok) {
        const d = await resUsos.json();
        setUsos(d.usos || []);
      }
      if (resControle.ok) {
        const d = await resControle.json();
        setControleAnual(d.controle || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do UTV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [ano]);

  const handleOpenChecklist = (uso: UtvUso, mode: 'saida' | 'devolucao' | 'visualizar') => {
    setChecklistModalState({
      isOpen: true,
      uso,
      mode
    });
  };

  const handleDeleteVeiculo = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o veículo "${nome}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/utv/veiculos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao excluir veículo.');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* ── TOPO: CABEÇALHO DO MÓDULO UTV ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Truck className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                UTV Trilha & Off-Road
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Novo Empreendimento
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center text-[11px] font-bold text-slate-500">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 mr-1" />
                Operação Restrita ao Administrador
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500">
                Franquia: 30 dias/ano por cotista • Tanque Cheio → Cheio
              </span>
            </div>
          </div>
        </div>

        {/* Botões do Topo */}
        <div className="flex items-center space-x-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsReservaModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Reserva UTV</span>
          </button>
        </div>

      </div>

      {/* ── NAVEGAÇÃO POR SUB-ABAS ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2 overflow-x-auto custom-scrollbar">

        <button
          onClick={() => setActiveTab('operacao')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'operacao'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda & Operação</span>
          {usos.filter(u => u.status === 'em_uso').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
              {usos.filter(u => u.status === 'em_uso').length} em trilha
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('controle-anual')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'controle-anual'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Controle Anual (30 Dias)</span>
        </button>

        <button
          onClick={() => setActiveTab('rateio')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rateio'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Rateio de Manutenção</span>
        </button>

        <button
          onClick={() => setActiveTab('veiculos')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'veiculos'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Frota de Veículos ({veiculos.length})</span>
        </button>

      </div>

      {/* ── CONTEÚDO DAS ABAS ── */}

      {/* ABA 1: AGENDA & OPERAÇÃO */}
      {activeTab === 'operacao' && (
        <UtvOperacaoTab
          usos={usos}
          veiculos={veiculos}
          cotistas={cotistas}
          onOpenNovaReserva={() => setIsReservaModalOpen(true)}
          onOpenChecklist={handleOpenChecklist}
          onReload={loadAllData}
        />
      )}

      {/* ABA 2: CONTROLE ANUAL (30 DIAS) */}
      {activeTab === 'controle-anual' && (
        <UtvControleAnualTab
          controle={controleAnual}
          ano={ano}
          onAnoChange={setAno}
          onOpenNovoCotista={() => setCotistaModalState({ isOpen: true, cotistaToEdit: null })}
          onEditCotista={(cotista) => setCotistaModalState({ isOpen: true, cotistaToEdit: cotista })}
          onReload={loadAllData}
        />
      )}

      {/* ABA 3: RATEIO DE MANUTENÇÃO */}
      {activeTab === 'rateio' && (
        <UtvRateioTab
          veiculos={veiculos}
          ano={ano}
        />
      )}

      {/* ABA 4: FROTA DE VEÍCULOS */}
      {activeTab === 'veiculos' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Cadastro de Veículos UTV ({veiculos.length})
              </h3>
              <p className="text-xs text-slate-500">
                Máquinas registradas, controle de chassi e métricas atuais
              </p>
            </div>
            <button
              onClick={() => setVeiculoModalState({ isOpen: true, veiculoToEdit: null })}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Veículo</span>
            </button>
          </div>

          {veiculos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhum veículo cadastrado. Clique no botão acima para adicionar o primeiro UTV.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {veiculos.map(v => (
                <div key={v.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  {v.imagemUrl ? (
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200">
                      <img src={v.imagemUrl} alt={v.nome} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                      <Truck className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{v.nome}</h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {v.modelo || 'Modelo padrão'} {v.ano ? `• ${v.ano}` : ''}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      v.status === 'disponivel'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : v.status === 'em_uso'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {v.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">KM Atual</span>
                      <span className="font-bold text-slate-800">{formatKm(v.kmAtual)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Horímetro</span>
                      <span className="font-bold text-amber-700">{formatHorimetroDecimal(v.horimetroAtual)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-1.5 pt-1 border-t border-slate-200/60">
                    <button
                      onClick={() => setVeiculoModalState({ isOpen: true, veiculoToEdit: v })}
                      className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVeiculo(v.id, v.nome)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Excluir veículo"
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

      {/* ── MODAIS ── */}
      <UtvReservaModal
        isOpen={isReservaModalOpen}
        onClose={() => setIsReservaModalOpen(false)}
        onSuccess={loadAllData}
        veiculos={veiculos}
        cotistas={cotistas}
      />

      <UtvChecklistModal
        isOpen={checklistModalState.isOpen}
        onClose={() => setChecklistModalState(prev => ({ ...prev, isOpen: false }))}
        onSuccess={loadAllData}
        uso={checklistModalState.uso}
        mode={checklistModalState.mode}
        veiculo={veiculos.find(v => v.id === checklistModalState.uso?.veiculoId)}
      />

      <UtvCotistaModal
        isOpen={cotistaModalState.isOpen}
        onClose={() => setCotistaModalState({ isOpen: false, cotistaToEdit: null })}
        onSuccess={loadAllData}
        cotistaToEdit={cotistaModalState.cotistaToEdit}
      />

      <UtvVeiculoModal
        isOpen={veiculoModalState.isOpen}
        onClose={() => setVeiculoModalState({ isOpen: false, veiculoToEdit: null })}
        onSuccess={loadAllData}
        veiculoToEdit={veiculoModalState.veiculoToEdit}
      />

    </div>
  );
}
