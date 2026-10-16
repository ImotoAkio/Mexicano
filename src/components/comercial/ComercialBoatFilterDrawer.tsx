import React, { useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Check,
  Ship,
  Sparkles,
  Building2,
  Filter,
  Users,
  Wrench,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Embarcacao } from '../../types';

export interface BoatFilters {
  tipos: string[];
  statusOperacional: string[];
  empresas: string[];
  vinculoCotistas: 'all' | 'com_cotistas' | 'sem_cotistas';
}

export const DEFAULT_BOAT_FILTERS: BoatFilters = {
  tipos: [],
  statusOperacional: [],
  empresas: [],
  vinculoCotistas: 'all'
};

interface ComercialBoatFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: BoatFilters;
  onChangeFilters: (filters: BoatFilters) => void;
  boats: Embarcacao[];
  totalFiltered: number;
}

export default function ComercialBoatFilterDrawer({
  open,
  onClose,
  filters,
  onChangeFilters,
  boats,
  totalFiltered
}: ComercialBoatFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleArrayItem = <T extends string>(current: T[], item: T): T[] => {
    if (current.includes(item)) {
      return current.filter(x => x !== item);
    }
    return [...current, item];
  };

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.tipos.length > 0) count += filters.tipos.length;
    if (filters.statusOperacional.length > 0) count += filters.statusOperacional.length;
    if (filters.empresas.length > 0) count += filters.empresas.length;
    if (filters.vinculoCotistas !== 'all') count += 1;
    return count;
  }, [filters]);

  const handleResetAll = () => {
    onChangeFilters(DEFAULT_BOAT_FILTERS);
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label="Filtros avançados de embarcações"
        className={`absolute top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[460px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-stone-100 shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold text-xs">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-stone-900">Filtros de Embarcações</h2>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold bg-mx-ink text-white px-2 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">Refine por tipo, status e cotas</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-xs text-mx-red hover:bg-mx-red-50 px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-stone-800">
          {/* SEÇÃO 1: TIPO DE EMBARCAÇÃO */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5 text-stone-400" />
              <span>Tipo de Embarcação</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'lancha', label: 'Lancha', desc: 'Barcos e cabinadas' },
                { id: 'jet', label: 'Jet Ski', desc: 'Motonáutica' }
              ].map(item => {
                const isChecked = filters.tipos.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        tipos: toggleArrayItem(filters.tipos, item.id)
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'border-mx-ink bg-mx-ink-50 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-bold ${isChecked ? 'text-mx-ink' : 'text-stone-800'}`}>
                        {item.label}
                      </span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
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

          {/* SEÇÃO 2: STATUS OPERACIONAL */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Status Operacional</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'disponivel', label: 'Disponível', dot: 'bg-emerald-500' },
                { id: 'em_manutencao', label: 'Manutenção', dot: 'bg-amber-500' },
                { id: 'pendencia', label: 'Pendência', dot: 'bg-red-500' }
              ].map(item => {
                const isChecked = filters.statusOperacional.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        statusOperacional: toggleArrayItem(filters.statusOperacional, item.id)
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

          {/* SEÇÃO 3: EMPRESAS VINCULADAS */}
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

          {/* SEÇÃO 4: VÍNCULO COM COTISTAS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>Vínculo com Cotistas</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'com_cotistas', label: 'Com cotistas' },
                { id: 'sem_cotistas', label: 'Sem cotistas' }
              ].map(item => {
                const isSelected = filters.vinculoCotistas === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        vinculoCotistas: item.id as any
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-mx-ink bg-mx-ink-50 text-mx-ink font-semibold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-mx-ink ml-1 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="h-16 px-5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-2xl shrink-0">
          <span className="text-xs text-stone-500">
            <strong className="text-stone-900 font-bold tabular-nums">{totalFiltered}</strong>{' '}
            embarcaç{totalFiltered !== 1 ? 'ões' : 'ão'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
          >
            Aplicar Filtros
          </button>
        </footer>
      </aside>
    </div>
  );
}
