import React, { useState, useEffect } from 'react';
import { TransacaoFinanceira } from '../../types';
import FinanceDashboard from './FinanceDashboard';
import { RefreshCw, Building2, Plus } from 'lucide-react';
import { STORAGE_KEYS } from '../../utils/constants';

interface FinanceDashboardPageProps {
  empresaFiltro?: string;
  privacyMode?: boolean;
  onOpenNovoLancamento?: () => void;
  hideTopHeader?: boolean;
}

export default function FinanceDashboardPage({
  empresaFiltro: externalEmpresaFiltro,
  privacyMode = false,
  onOpenNovoLancamento,
  hideTopHeader = false,
}: FinanceDashboardPageProps) {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalEmpresaFiltro, setInternalEmpresaFiltro] = useState<string>('Todos');

  const empresaFiltro = externalEmpresaFiltro !== undefined ? externalEmpresaFiltro : internalEmpresaFiltro;
  const companies = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const fetchTransacoes = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
      if (!token) return;

      const [resTrans, resPlanos] = await Promise.all([
        fetch('/api/financeiro/transacoes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financeiro/planos-contas', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resTrans.ok) {
        const data = await resTrans.json();
        setTransacoes(data || []);
      }
      if (resPlanos.ok) {
        const dataPlanos = await resPlanos.json();
        setPlanosContas(dataPlanos || []);
      }
    } catch (error) {
      console.error('Erro ao listar transações:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-5">
      {/* Page Header (Alinhado ao padrão Comercial) */}
      {!hideTopHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Visão Geral & Inteligência Financeira</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Dashboard consolidado com KPIs executivos, projeções de fluxo de caixa e demonstrativo resumido (Mini-DRE).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {externalEmpresaFiltro === undefined && (
              <div className="flex items-center gap-1 p-1 bg-stone-100 border border-stone-200/80 rounded-lg shadow-xs overflow-x-auto max-w-full">
                <div className="flex items-center gap-1 px-2 text-[11px] font-semibold text-stone-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Empresa:</span>
                </div>
                {companies.map(empresa => {
                  const isActive = empresaFiltro === empresa;
                  return (
                    <button
                      key={empresa}
                      onClick={() => setInternalEmpresaFiltro(empresa)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60 font-bold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                      }`}
                    >
                      {empresa}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchTransacoes(true)}
              disabled={isRefreshing}
              className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Atualizando…' : 'Sincronizar'}</span>
            </button>

            {onOpenNovoLancamento && (
              <button
                type="button"
                onClick={onOpenNovoLancamento}
                className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Lançamento</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div>
        {loading ? (
          <div className="flex flex-col justify-center items-center h-72 gap-3 bg-white rounded-xl border border-stone-200/80">
            <div className="w-8 h-8 border-3 border-mx-ink border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-stone-400">Carregando inteligência financeira...</span>
          </div>
        ) : (
          <FinanceDashboard
            transacoes={transacoes}
            isAdmin={true}
            empresaFiltro={empresaFiltro}
            planosContas={planosContas}
            privacyMode={privacyMode}
          />
        )}
      </div>
    </div>
  );
}
