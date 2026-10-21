import React, { useState, useEffect, useMemo } from 'react';
import { TransacaoFinanceira } from '../../types';
import {
  CalendarClock, Search, AlertCircle, CheckCircle, Clock, Building2, Layers
} from 'lucide-react';
import TransactionDetailsModal from './TransactionDetailsModal';
import { PageHeader, ComponentCard, Badge } from '../tailadmin';

export default function FinanceParcelasFixas() {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('Todos');

  // Modal
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransacaoFinanceira | null>(null);

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const fetchTransacoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransacoes(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar transacoes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group by grupoParcelamentoId
  const groupedData = useMemo(() => {
    const list = transacoes.filter(t => t.grupoParcelamentoId);

    // Filtro empresa
    const filteredList = list.filter(t => {
      if (empresaFiltro !== 'Todos') {
        const emp = t.empresa || 'Mexicano';
        return emp === empresaFiltro;
      }
      return true;
    });

    // Grouping
    const groups: { [key: string]: {
      grupoId: string;
      descricao: string;
      totalValor: number;
      empresa: string;
      tipo: string;
      parcelas: TransacaoFinanceira[];
    } } = {};

    filteredList.forEach(t => {
      const gId = t.grupoParcelamentoId!;
      if (!groups[gId]) {
        groups[gId] = {
          grupoId: gId,
          descricao: t.descricao.replace(/\(\d+\/\d+\)/, '').trim(),
          totalValor: 0,
          empresa: t.empresa || 'Mexicano',
          tipo: t.tipo,
          parcelas: []
        };
      }
      groups[gId].parcelas.push(t);
      groups[gId].totalValor += parseFloat(t.valor as any);
    });

    // Sort parcelas by parcela number
    Object.values(groups).forEach(g => {
      g.parcelas.sort((a, b) => (a.numeroParcela || 0) - (b.numeroParcela || 0));
    });

    return Object.values(groups);
  }, [transacoes, empresaFiltro]);

  return (
    <div className="w-full flex flex-col space-y-6">
      <PageHeader
        pageTitle="Gestão de Parcelas & Recorrências"
        subtitle="Acompanhamento e controle de parcelamentos, contratos e cobranças recorrentes"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Parcelas Fixas" }
        ]}
        actions={
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto max-w-full gap-1">
            {['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'].map(emp => {
              const isActive = empresaFiltro === emp;
              return (
                <button
                  key={emp}
                  onClick={() => setEmpresaFiltro(emp)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {emp}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Search Bar */}
      <ComponentCard className="p-0" bodyClassName="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar grupo ou contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </ComponentCard>

      {/* Accordion / List of groups */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="font-semibold text-xs">Carregando parcelamentos...</p>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 shadow-xs rounded-2xl p-6">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 mb-1">Sem lançamentos parcelados</h3>
            <p className="text-xs text-slate-500">Nenhum grupo de parcelamento encontrado.</p>
          </div>
        ) : (
          groupedData.filter(g => g.descricao.toLowerCase().includes(searchTerm.toLowerCase())).map((group) => {
            const pago = group.parcelas.filter(p => p.status === 'pago').length;
            const total = group.parcelas.length;

            return (
              <ComponentCard
                key={group.grupoId}
                title={
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-bold text-base">{group.descricao}</span>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Empresa: <strong className="text-slate-700 font-semibold">{group.empresa}</strong></span>
                      <span>•</span>
                      <span>Tipo: <strong className="text-slate-700 font-semibold">{group.tipo === 'receita' ? 'Receita' : 'Despesa'}</strong></span>
                    </div>
                  </div>
                }
                action={
                  <div className="flex items-center gap-3">
                    <Badge color={pago === total ? "success" : "brand"} size="md">
                      {pago}/{total} pagas
                    </Badge>
                    <span className="text-lg font-bold text-slate-900">
                      R$ {group.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.parcelas.map(parcela => {
                    const isPago = parcela.status === 'pago';
                    const isVencido = parcela.status === 'vencido';

                    return (
                      <div
                        key={parcela.id}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                          isPago
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : isVencido
                            ? 'border-rose-200 bg-rose-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        onClick={() => {
                          setSelectedTransaction(parcela);
                          setShowTransactionModal(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-slate-800 text-xs">
                            Parcela {parcela.numeroParcela}/{parcela.totalParcelas}
                          </span>
                          {isPago && <Badge color="success" size="sm">Paga</Badge>}
                          {isVencido && <Badge color="error" size="sm">Vencida</Badge>}
                          {!isPago && !isVencido && <Badge color="light" size="sm">Aberta</Badge>}
                        </div>

                        <div className="text-xs text-slate-500 mb-2">
                          Venc: <strong className="text-slate-700 font-semibold">{new Date(parcela.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-400">Valor</span>
                          <span className="font-bold text-slate-900 text-sm">
                            R$ {Number(parcela.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ComponentCard>
            );
          })
        )}
      </div>

      {/* Modal Detalhes */}
      {showTransactionModal && selectedTransaction && (
        <TransactionDetailsModal
          transacao={selectedTransaction}
          cliente={undefined}
          embarcacao={undefined}
          onClose={() => setShowTransactionModal(false)}
          onEdit={() => {}}
          onDelete={() => {}}
          onApprove={() => {}}
          onConfirmPayment={() => {}}
          onUploadReceipt={() => {}}
          isUploading={false}
        />
      )}
    </div>
  );
}
