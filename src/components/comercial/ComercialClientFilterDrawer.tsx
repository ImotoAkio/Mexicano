import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Check,
  Ship,
  Sparkles,
  CreditCard,
  Building2,
  UserCheck,
  Anchor,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Embarcacao, Cliente } from '../../types';

export interface ClientFilters {
  boatIds: string[];
  planos: ('completo' | 'normal')[];
  statusFinanceiro: ('em_dia' | 'inadimplente' | 'pendente')[];
  empresas: string[];
  statusCadastral: ('ativo' | 'inativo')[];
  vinculo: 'all' | 'com_embarcacao' | 'sem_embarcacao';
}

export const DEFAULT_CLIENT_FILTERS: ClientFilters = {
  boatIds: [],
  planos: [],
  statusFinanceiro: [],
  empresas: [],
  statusCadastral: [],
  vinculo: 'all',
};

interface ComercialClientFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: ClientFilters;
  onChangeFilters: (filters: ClientFilters) => void;
  boats: Embarcacao[];
  clients: Cliente[];
  totalFiltered: number;
}

export default function ComercialClientFilterDrawer({
  open,
  onClose,
  filters,
  onChangeFilters,
  boats,
  clients,
  totalFiltered
}: ComercialClientFilterDrawerProps) {
  // Estado local para busca dentro da lista de barcos
  const [boatSearch, setBoatSearch] = useState('');

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Contagem de clientes por embarcação
  const clientCountByBoat = useMemo(() => {
    const counts = new Map<string, number>();
    clients.forEach(c => {
      const ids = new Set<string>();
      if (c.embarcacaoId) ids.add(c.embarcacaoId);
      c.embarcacoes?.forEach(eb => {
        if (eb.embarcacaoId) ids.add(eb.embarcacaoId);
      });
      ids.forEach(id => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });
    return counts;
  }, [clients]);

  // Lista de embarcações filtradas pela busca interna
  const filteredBoats = useMemo(() => {
    const term = boatSearch.toLowerCase().trim();
    const sorted = [...boats].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!term) return sorted;
    return sorted.filter(b => b.nome.toLowerCase().includes(term));
  }, [boats, boatSearch]);

  // Toggle de item em array
  const toggleArrayItem = <T extends string>(current: T[], item: T): T[] => {
    if (current.includes(item)) {
      return current.filter(x => x !== item);
    }
    return [...current, item];
  };

  // Embarcações helpers
  const handleToggleBoat = (boatId: string) => {
    onChangeFilters({
      ...filters,
      boatIds: toggleArrayItem(filters.boatIds, boatId)
    });
  };

  const handleSelectAllBoats = () => {
    onChangeFilters({
      ...filters,
      boatIds: filteredBoats.map(b => b.id)
    });
  };

  const handleClearBoats = () => {
    onChangeFilters({
      ...filters,
      boatIds: []
    });
  };

  // Contagem de filtros ativos
  const activeCount = useMemo(() => {
    let c = 0;
    if (filters.boatIds.length > 0) c += filters.boatIds.length;
    if (filters.planos.length > 0) c += filters.planos.length;
    if (filters.statusFinanceiro.length > 0) c += filters.statusFinanceiro.length;
    if (filters.empresas.length > 0) c += filters.empresas.length;
    if (filters.statusCadastral.length > 0) c += filters.statusCadastral.length;
    if (filters.vinculo !== 'all') c += 1;
    return c;
  }, [filters]);

  const handleResetAll = () => {
    onChangeFilters(DEFAULT_CLIENT_FILTERS);
    setBoatSearch('');
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label="Filtros avançados de clientes"
        className={`absolute top-2 right-2 bottom-2 w-[calc(100%-1rem)] sm:w-[460px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100' : 'translate-x-[105%] opacity-0'
        }`}
      >
        {/* Header */}
        <header className="h-16 px-6 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-stone-900">Filtros de Clientes</h2>
                {activeCount > 0 && (
                  <span className="text-[11px] font-semibold bg-mx-ink text-white px-2 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">Refine a lista por múltiplos critérios</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                onClick={handleResetAll}
                className="text-xs text-mx-red hover:bg-mx-red-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content / Scrollable Filter Options */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-stone-800">
          {/* SEÇÃO 1: EMBARCAÇÃO COM BUSCA E MULTI-SELECT */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-stone-400" />
                <span>Embarcação / Jet / UTV</span>
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllBoats}
                  className="text-stone-500 hover:text-stone-900 font-medium cursor-pointer hover:underline"
                >
                  Todas
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={handleClearBoats}
                  className="text-stone-500 hover:text-stone-900 font-medium cursor-pointer hover:underline"
                >
                  Nenhuma
                </button>
              </div>
            </div>

            {/* Campo de Busca de Embarcação */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Pesquisar embarcação por nome..."
                value={boatSearch}
                onChange={e => setBoatSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white transition-all"
              />
              {boatSearch && (
                <button
                  type="button"
                  onClick={() => setBoatSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Lista com scroll e checkboxes */}
            <div className="border border-stone-200 rounded-xl p-1.5 max-h-48 overflow-y-auto divide-y divide-stone-100 bg-stone-50/50">
              {filteredBoats.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 italic">
                  Nenhuma embarcação encontrada para "{boatSearch}".
                </div>
              ) : (
                filteredBoats.map(boat => {
                  const isChecked = filters.boatIds.includes(boat.id);
                  const count = clientCountByBoat.get(boat.id) || 0;

                  return (
                    <button
                      key={boat.id}
                      type="button"
                      onClick={() => handleToggleBoat(boat.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-mx-ink-100 text-mx-ink font-semibold'
                          : 'hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-mx-ink border-mx-ink text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{boat.nome}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 tabular-nums shrink-0 ml-2">
                        {count} cotista{count !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {filters.boatIds.length > 0 && (
              <span className="text-[11px] text-mx-ink font-semibold block">
                {filters.boatIds.length} embarcaç{filters.boatIds.length === 1 ? 'ão selecionada' : 'ões selecionadas'}
              </span>
            )}
          </div>

          <div className="h-px bg-stone-100" />

          {/* SEÇÃO 2: PLANO */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-stone-400" />
              <span>Plano Contratado</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'completo', label: 'Plano Completo', desc: 'Com serviços adicionais' },
                { id: 'normal', label: 'Plano Normal', desc: 'Padrão' }
              ].map(item => {
                const isChecked = filters.planos.includes(item.id as any);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        planos: toggleArrayItem(filters.planos, item.id as any)
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'border-mx-ink bg-mx-ink-50 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold ${isChecked ? 'text-mx-ink' : 'text-stone-800'}`}>
                        {item.label}
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-mx-ink border-mx-ink text-white' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 block">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-stone-100" />

          {/* SEÇÃO 3: STATUS FINANCEIRO */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-stone-400" />
              <span>Status Financeiro</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'em_dia', label: 'Em Dia', dot: 'bg-emerald-500' },
                { id: 'pendente', label: 'Pendente', dot: 'bg-amber-500' },
                { id: 'inadimplente', label: 'Inadimplente', dot: 'bg-red-500' }
              ].map(item => {
                const isChecked = filters.statusFinanceiro.includes(item.id as any);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        statusFinanceiro: toggleArrayItem(filters.statusFinanceiro, item.id as any)
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'border-mx-ink bg-mx-ink-50 text-mx-ink font-semibold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.dot} shrink-0`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isChecked && <Check className="w-3 h-3 text-mx-ink ml-1 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-stone-100" />

          {/* SEÇÃO 4: EMPRESA / UNIDADE */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Empresa / Unidade</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'VALE', label: 'Vale Náutica' },
                { id: 'MARINA', label: 'Marina' },
                { id: 'MEXICANO', label: 'Mexicano' }
              ].map(item => {
                const isChecked = filters.empresas.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        empresas: toggleArrayItem(filters.empresas, item.id)
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'border-mx-ink bg-mx-ink-50 text-mx-ink font-semibold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isChecked && <Check className="w-3 h-3 text-mx-ink ml-1 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-stone-100" />

          {/* SEÇÃO 5: STATUS CADASTRAL & VÍNCULO NÁUTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Cadastral */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Status Cadastral</span>
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'ativo', label: 'Ativos' },
                  { id: 'inativo', label: 'Inativos' }
                ].map(item => {
                  const isChecked = filters.statusCadastral.includes(item.id as any);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChangeFilters({
                          ...filters,
                          statusCadastral: toggleArrayItem(filters.statusCadastral, item.id as any)
                        })
                      }
                      className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-mx-ink bg-mx-ink-50 text-mx-ink font-semibold'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isChecked && <Check className="w-3 h-3 text-mx-ink stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vínculo Náutico */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-stone-400" />
                <span>Vínculo Náutico</span>
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'com_embarcacao', label: 'Com cotas' },
                  { id: 'sem_embarcacao', label: 'Sem cotas' }
                ].map(item => {
                  const isSelected = filters.vinculo === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChangeFilters({
                          ...filters,
                          vinculo: item.id as any
                        })
                      }
                      className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-mx-ink bg-mx-ink-50 text-mx-ink font-semibold'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-mx-ink stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé fixo do Drawer */}
        <footer className="h-16 px-6 border-t border-stone-200/80 flex items-center justify-between bg-stone-50 rounded-b-2xl shrink-0">
          <div className="text-xs text-stone-500">
            <strong className="text-stone-900 font-bold tabular-nums">{totalFiltered}</strong> cliente
            {totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Aplicar Filtros
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
