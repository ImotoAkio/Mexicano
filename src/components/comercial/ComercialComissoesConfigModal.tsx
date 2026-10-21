import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  DollarSign,
  Layers,
  Award,
  CheckCircle2,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Calendar
} from 'lucide-react';
import {
  ConfigMotorComissoes,
  FaixaComissaoCota,
  FaixaBonusMensal,
  MembroEquipeComercial
} from '../../types';
import { DEFAULT_MOTOR_COMISSOES_CONFIG } from '../../utils/comissaoUtils';

export { DEFAULT_MOTOR_COMISSOES_CONFIG };

interface ComercialComissoesConfigModalProps {
  open: boolean;
  onClose: () => void;
  config: ConfigMotorComissoes;
  onSave: (newConfig: ConfigMotorComissoes) => Promise<void>;
}

type ConfigTabId = 'base_equipe' | 'faixas_cota' | 'bonus_semanal_mensal' | 'processos_venda';

export default function ComercialComissoesConfigModal({
  open,
  onClose,
  config,
  onSave
}: ComercialComissoesConfigModalProps) {
  const [activeTab, setActiveTab] = useState<ConfigTabId>('base_equipe');
  const [draft, setDraft] = useState<ConfigMotorComissoes>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Novo membro da equipe
  const [novoVendedorNome, setNovoVendedorNome] = useState('');
  const [novoVendedorCargo, setNovoVendedorCargo] = useState('Vendedor Comercial');

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(config)));
      setErrorMsg(null);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleRestoreDefaults = () => {
    if (!window.confirm('Deseja restaurar todos os valores e faixas padrão da especificação original?')) return;
    setDraft(JSON.parse(JSON.stringify(DEFAULT_MOTOR_COMISSOES_CONFIG)));
  };

  const handleAddMembroEquipe = () => {
    const nome = novoVendedorNome.trim();
    if (!nome) return;
    const novo: MembroEquipeComercial = {
      id: `vend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nome,
      cargo: novoVendedorCargo.trim() || 'Vendedor Comercial',
      ativo: true,
      salarioBaseCustom: null,
      vrCustom: null
    };
    setDraft(prev => ({
      ...prev,
      equipeComercial: [...prev.equipeComercial, novo]
    }));
    setNovoVendedorNome('');
  };

  const handleRemoveMembroEquipe = (id: string) => {
    setDraft(prev => ({
      ...prev,
      equipeComercial: prev.equipeComercial.filter(m => m.id !== id)
    }));
  };

  const handleToggleMembroAtivo = (id: string) => {
    setDraft(prev => ({
      ...prev,
      equipeComercial: prev.equipeComercial.map(m =>
        m.id === id ? { ...m, ativo: !m.ativo } : m
      )
    }));
  };

  const handleUpdateFaixaComissao = (id: string, field: keyof FaixaComissaoCota, value: any) => {
    setDraft(prev => ({
      ...prev,
      faixasComissao: prev.faixasComissao.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      )
    }));
  };

  const handleAddFaixaComissao = () => {
    const last = draft.faixasComissao[draft.faixasComissao.length - 1];
    const nextMin = last ? (last.maxCotas ? last.maxCotas + 1 : last.minCotas + 4) : 0;
    const nova: FaixaComissaoCota = {
      id: `fx_${Date.now()}`,
      minCotas: nextMin,
      maxCotas: null,
      valorPorCota: (last?.valorPorCota || 150) + 50,
      descricao: `A partir de ${nextMin} cotas`
    };
    setDraft(prev => ({
      ...prev,
      faixasComissao: [...prev.faixasComissao, nova]
    }));
  };

  const handleRemoveFaixaComissao = (id: string) => {
    if (draft.faixasComissao.length <= 1) return;
    setDraft(prev => ({
      ...prev,
      faixasComissao: prev.faixasComissao.filter(f => f.id !== id)
    }));
  };

  const handleUpdateBonusSemanal = (idx: number, val: number) => {
    setDraft(prev => {
      const next = [...prev.bonusSemanalProgressivo];
      next[idx] = Math.max(0, val);
      return { ...prev, bonusSemanalProgressivo: next };
    });
  };

  const handleUpdateFaixaBonusMensal = (id: string, field: keyof FaixaBonusMensal, value: any) => {
    setDraft(prev => ({
      ...prev,
      faixasBonusMensal: prev.faixasBonusMensal.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      )
    }));
  };

  const handleAddFaixaBonusMensal = () => {
    const last = draft.faixasBonusMensal[draft.faixasBonusMensal.length - 1];
    const nextMin = last ? (last.maxCotas ? last.maxCotas + 1 : last.minCotas + 5) : 16;
    const nova: FaixaBonusMensal = {
      id: `bm_${Date.now()}`,
      minCotas: nextMin,
      maxCotas: null,
      valorBonus: (last?.valorBonus || 1000) + 500,
      descricao: `Volume ${nextMin}+ cotas`
    };
    setDraft(prev => ({
      ...prev,
      faixasBonusMensal: [...prev.faixasBonusMensal, nova]
    }));
  };

  const handleRemoveFaixaBonusMensal = (id: string) => {
    setDraft(prev => ({
      ...prev,
      faixasBonusMensal: prev.faixasBonusMensal.filter(f => f.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const sortedFaixas = [...draft.faixasComissao].sort((a, b) => a.minCotas - b.minCotas);
      const sortedBonusMensal = [...draft.faixasBonusMensal].sort((a, b) => a.minCotas - b.minCotas);
      await onSave({
        ...draft,
        faixasComissao: sortedFaixas,
        faixasBonusMensal: sortedBonusMensal
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const TABS: {
    id: ConfigTabId;
    label: string;
    icon: React.ElementType;
    desc: string;
    badge?: string;
  }[] = [
    {
      id: 'base_equipe',
      label: 'Salário Base & Equipe',
      icon: Users,
      desc: 'Defina o Salário Fixo, Vale Refeição (VR), corte quinzenal e os membros da equipe comercial que recebem igualmente.',
      badge: `${draft.equipeComercial.filter(m => m.ativo).length} ativos`
    },
    {
      id: 'faixas_cota',
      label: 'Comissão por Cotas',
      icon: TrendingUp,
      desc: 'Configure a tabela escalonada e retroativa onde a faixa atingida multiplica todas as cotas concluídas no mês.',
      badge: `${draft.faixasComissao.length} faixas`
    },
    {
      id: 'bonus_semanal_mensal',
      label: 'Bônus Semanal & Mensal',
      icon: Award,
      desc: 'Ajuste a meta semanal de cotas, os prêmios progressivos acumulativos (1ª a 5ª meta) e o bônus mensal de volume.',
      badge: `Meta ${draft.metaSemanalCotas}/sem`
    },
    {
      id: 'processos_venda',
      label: 'Regras de Conclusão',
      icon: ShieldCheck,
      desc: 'Determine quais processos precisam estar 100% concluídos para que uma venda entre na apuração de comissão.'
    }
  ];

  const currentTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[700px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Configurar Motor de Comissões e Bonificações"
      >
        {/* COLUNA LATERAL ESQUERDA */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <Settings className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  Configurar Comissões
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Personalize valores, faixas retroativas, bônus e critérios de conclusão para toda a equipe comercial.
              </p>
            </div>

            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-stone-600 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700 tabular-nums shrink-0">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden md:block pt-4 border-t border-stone-200/60 space-y-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão da Especificação
            </button>
          </div>
        </aside>

        {/* COLUNA PRINCIPAL DIREITA */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-stone-100 flex items-start justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                {currentTabMeta.label}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                {currentTabMeta.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* ABA 1: SALÁRIO BASE & EQUIPE */}
            {activeTab === 'base_equipe' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Salário Base Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={draft.salarioBase}
                      onChange={e => setDraft(prev => ({ ...prev, salarioBase: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:border-mx-ink text-xs font-bold text-stone-900 tabular-nums outline-none"
                    />
                    <span className="text-[10px] text-stone-400 block">Fixo mensal por vendedor (Padrão: R$ 1.621,00)</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Vale Refeição — VR (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={draft.valeRefeicao}
                      onChange={e => setDraft(prev => ({ ...prev, valeRefeicao: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:border-mx-ink text-xs font-bold text-stone-900 tabular-nums outline-none"
                    />
                    <span className="text-[10px] text-stone-400 block">Pago à parte, não interfere na comissão</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Dia do 1º Fechamento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={draft.diaCorteQuinzena1}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          diaCorteQuinzena1: Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 15))
                        }))
                      }
                      className="w-full h-10 px-3.5 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:border-mx-ink text-xs font-bold text-stone-900 tabular-nums outline-none"
                    />
                    <span className="text-[10px] text-stone-400 block">Corte da 1ª Quinzena (Padrão: Dia 15)</span>
                  </div>
                </div>

                {/* Equipe Comercial */}
                <div className="rounded-2xl border border-stone-200/80 p-4 space-y-3.5 bg-stone-50/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Equipe Comercial (Comissão Coletiva Igualitária)
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Independentemente de quem cadastrou a venda, todos os vendedores ativos abaixo recebem o valor integral da tabela sobre o total de cotas concluídas pela equipe.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={novoVendedorNome}
                      onChange={e => setNovoVendedorNome(e.target.value)}
                      placeholder="Nome do vendedor / consultor comercial..."
                      className="flex-1 h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 outline-none focus:border-mx-ink"
                    />
                    <input
                      type="text"
                      value={novoVendedorCargo}
                      onChange={e => setNovoVendedorCargo(e.target.value)}
                      placeholder="Cargo (Ex: Vendedor Comercial)"
                      className="sm:w-48 h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 outline-none focus:border-mx-ink"
                    />
                    <button
                      type="button"
                      onClick={handleAddMembroEquipe}
                      className="h-9 px-3.5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>

                  <div className="divide-y divide-stone-200/70 rounded-xl border border-stone-200/80 bg-white overflow-hidden">
                    {draft.equipeComercial.length === 0 ? (
                      <div className="p-4 text-center text-xs text-stone-400">
                        Nenhum vendedor cadastrado na equipe. Adicione acima.
                      </div>
                    ) : (
                      draft.equipeComercial.map(membro => (
                        <div
                          key={membro.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-stone-50/70"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={membro.ativo}
                              onChange={() => handleToggleMembroAtivo(membro.id)}
                              className="w-4 h-4 rounded accent-mx-ink cursor-pointer"
                              title="Ativo na folha de comissões"
                            />
                            <div className="min-w-0">
                              <div className={`text-xs font-bold truncate ${membro.ativo ? 'text-stone-900' : 'text-stone-400 line-through'}`}>
                                {membro.nome}
                              </div>
                              <div className="text-[10px] text-stone-500 truncate">{membro.cargo}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                membro.ativo
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {membro.ativo ? 'Recebe 100% da Tabela' : 'Inativo'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMembroEquipe(membro.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remover vendedor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: FAIXAS DE COMISSÃO POR COTAS */}
            {activeTab === 'faixas_cota' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      Tabela Escalonada e Retroativa por Cota
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      O valor unitário da faixa atingida multiplica <strong>todas as cotas concluídas no mês</strong> (efeito retroativo). Deixe o campo "Máx" vazio para indicar sem limite superior (ex: 13+).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFaixaComissao}
                    className="h-8 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Faixa
                  </button>
                </div>

                <div className="space-y-2.5">
                  {draft.faixasComissao.map((faixa, index) => (
                    <div
                      key={faixa.id}
                      className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                          Mín. Cotas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={faixa.minCotas}
                          onChange={e =>
                            handleUpdateFaixaComissao(faixa.id, 'minCotas', Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 tabular-nums outline-none focus:border-mx-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                          Máx. Cotas
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="Sem limite (+)"
                          value={faixa.maxCotas === null ? '' : faixa.maxCotas}
                          onChange={e => {
                            const raw = e.target.value.trim();
                            handleUpdateFaixaComissao(
                              faixa.id,
                              'maxCotas',
                              raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0)
                            );
                          }}
                          className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 tabular-nums outline-none focus:border-mx-ink"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                          Valor por Cota (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={faixa.valorPorCota}
                          onChange={e =>
                            handleUpdateFaixaComissao(faixa.id, 'valorPorCota', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-emerald-700 tabular-nums outline-none focus:border-mx-ink"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                          Rótulo / Descrição
                        </label>
                        <input
                          type="text"
                          value={faixa.descricao || ''}
                          onChange={e => handleUpdateFaixaComissao(faixa.id, 'descricao', e.target.value)}
                          placeholder={`Faixa ${index + 1}`}
                          className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 outline-none focus:border-mx-ink"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFaixaComissao(faixa.id)}
                          disabled={draft.faixasComissao.length <= 1}
                          className="h-9 w-9 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                          title="Excluir faixa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: BÔNUS SEMANAL & MENSAL */}
            {activeTab === 'bonus_semanal_mensal' && (
              <div className="space-y-6">
                {/* Bônus Semanal */}
                <div className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Módulo de Bônus Semanal (Progressivo e Acumulativo)
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Os bônus semanais somam-se de forma acumulativa a cada meta semanal batida no mês.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Meta Padrão por Semana (Cotas)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.metaSemanalCotas}
                        onChange={e =>
                          setDraft(prev => ({ ...prev, metaSemanalCotas: Math.max(1, parseInt(e.target.value, 10) || 4) }))
                        }
                        className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 tabular-nums outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Limite de Metas Semanais no Mês
                      </label>
                      <select
                        value={draft.semanasNoMesModo}
                        onChange={e => setDraft(prev => ({ ...prev, semanasNoMesModo: e.target.value as any }))}
                        className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 outline-none cursor-pointer"
                      >
                        <option value="auto">Automático pelo Calendário (4 ou 5 sem.)</option>
                        <option value="4">Fixo em 4 Semanas (Máx. 4 metas)</option>
                        <option value="5">Permitir até 5 Semanas (Máx. 5 metas)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.regraSuperavitSemanal}
                          onChange={e => setDraft(prev => ({ ...prev, regraSuperavitSemanal: e.target.checked }))}
                          className="w-4 h-4 accent-mx-ink rounded"
                        />
                        <span className="text-xs font-semibold text-stone-800 truncate">
                          Superávit / Déficit Semanal
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                    {draft.bonusSemanalProgressivo.map((val, idx) => {
                      const acumulado = draft.bonusSemanalProgressivo
                        .slice(0, idx + 1)
                        .reduce((acc, v) => acc + (Number(v) || 0), 0);
                      return (
                        <div key={idx} className="p-2.5 rounded-xl border border-stone-200 bg-white space-y-1">
                          <span className="text-[10px] font-bold uppercase text-stone-500 block">
                            {idx + 1}ª Meta ({(idx + 1) * draft.metaSemanalCotas} cotas)
                          </span>
                          <input
                            type="number"
                            step="10"
                            min={0}
                            value={val}
                            onChange={e => handleUpdateBonusSemanal(idx, parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-900 tabular-nums outline-none focus:bg-white focus:border-mx-ink"
                          />
                          <span className="text-[10px] text-emerald-700 font-semibold block tabular-nums">
                            Acum: R$ {acumulado.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bônus Mensal de Volume */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Módulo de Bônus Mensal (Volume Total — Não Acumulativo)
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Prêmio extra por faixa de volume total no mês (vale apenas o prêmio da maior faixa atingida).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFaixaBonusMensal}
                      className="h-8 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Faixa
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draft.faixasBonusMensal.map(bm => (
                      <div
                        key={bm.id}
                        className="p-3 rounded-2xl border border-stone-200/80 bg-stone-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                      >
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Mín. Cotas
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={bm.minCotas}
                            onChange={e =>
                              handleUpdateFaixaBonusMensal(bm.id, 'minCotas', Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 tabular-nums outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Máx. Cotas
                          </label>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sem limite (+)"
                            value={bm.maxCotas === null ? '' : bm.maxCotas}
                            onChange={e => {
                              const raw = e.target.value.trim();
                              handleUpdateFaixaBonusMensal(
                                bm.id,
                                'maxCotas',
                                raw === '' ? null : Math.max(1, parseInt(raw, 10) || 1)
                              );
                            }}
                            className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 tabular-nums outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Prêmio Mensal (R$)
                          </label>
                          <input
                            type="number"
                            step="50"
                            min={0}
                            value={bm.valorBonus}
                            onChange={e =>
                              handleUpdateFaixaBonusMensal(bm.id, 'valorBonus', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-emerald-700 tabular-nums outline-none"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Descrição
                          </label>
                          <input
                            type="text"
                            value={bm.descricao || ''}
                            onChange={e => handleUpdateFaixaBonusMensal(bm.id, 'descricao', e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveFaixaBonusMensal(bm.id)}
                            className="h-9 w-9 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: REGRAS DE CONCLUSÃO DA VENDA */}
            {activeTab === 'processos_venda' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                  <strong>Regra de Ouro:</strong> A venda só entra na contagem de cotas do mês após a conclusão de todos os processos marcados abaixo (ou caso o Administrador libere manualmente na tabela de auditoria).
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      key: 'exigirEntradaPaga' as const,
                      title: '1. Pagamento da Entrada Confirmado no Financeiro',
                      desc: 'A transação da entrada da cota deve constar como Paga/Liquidada no módulo Financeiro.'
                    },
                    {
                      key: 'exigirComprovanteEntrada' as const,
                      title: '2. Comprovante da Entrada Anexado',
                      desc: 'O recibo/comprovante bancário da entrada deve estar anexado ao registro da venda.'
                    },
                    {
                      key: 'exigirContratoAquisicaoAssinado' as const,
                      title: '3. Contrato de Aquisição de Cota Assinado',
                      desc: 'O Contrato de Compra e Venda (Aquisição) do cotista deve estar com status Assinado.'
                    },
                    {
                      key: 'exigirContratoAdmAssinado' as const,
                      title: '4. Contrato de Gestão / Administração Assinado',
                      desc: 'O Contrato de Administração Náutica do cotista deve estar com status Assinado.'
                    }
                  ].map(item => {
                    const checked = draft.requisitosVendaConcluida[item.key];
                    return (
                      <label
                        key={item.key}
                        className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                          checked
                            ? 'bg-emerald-50/40 border-emerald-200/90'
                            : 'bg-white border-stone-200/80 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e =>
                            setDraft(prev => ({
                              ...prev,
                              requisitosVendaConcluida: {
                                ...prev.requisitosVendaConcluida,
                                [item.key]: e.target.checked
                              }
                            }))
                          }
                          className="w-4 h-4 mt-0.5 rounded accent-mx-ink cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-stone-900">{item.title}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            checked
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {checked ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="h-9 px-5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold flex items-center gap-2 shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Regras de Comissão</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
