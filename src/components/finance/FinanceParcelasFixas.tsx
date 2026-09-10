import React, { useState, useEffect, useMemo } from 'react';
import { TransacaoFinanceira } from '../../types';
import {
  CalendarClock, Search, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import TransactionDetailsModal from './TransactionDetailsModal';

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

  const handleSaveTransaction = async (data: any) => {
    await fetchTransacoes();
    setShowTransactionModal(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await fetchTransacoes();
  };

  // Group by grupoParcelamentoId
  const groupedData = useMemo(() => {
    const list = transacoes.filter(t => t.grupoParcelamentoId);

    // Filtro empresa
    const filteredList = list.filter(t => {
      if (empresaFiltro !== 'Todos') {
        const emp = t.empresa || 'Mexicano';
        if (emp !== empresaFiltro) return false;
      }
      return true;
    });

    const groups: Record<string, {
      grupoId: string;
      empresa: string;
      clienteId?: string;
      fornecedorId?: string;
      descricao: string;
      tipo: string;
      parcelas: TransacaoFinanceira[];
      totalValor: number;
    }> = {};

    filteredList.forEach(t => {
      const gid = t.grupoParcelamentoId!;
      if (!groups[gid]) {
        groups[gid] = {
          grupoId: gid,
          empresa: t.empresa || 'Mexicano',
          clienteId: t.clienteId,
          fornecedorId: t.fornecedorId,
          descricao: t.descricao,
          tipo: t.tipo,
          parcelas: [],
          totalValor: 0
        };
      }
      groups[gid].parcelas.push(t);
      groups[gid].totalValor += Number(t.valor);
    });

    // sorting parcelas within group by date
    Object.values(groups).forEach(g => {
      g.parcelas.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    });

    return Object.values(groups);
  }, [transacoes, empresaFiltro]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-white">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-cyan-400" />
            Gestão de Parcelas & Recorrências
          </h2>
          <p className="text-gray-400 mt-1">Visualize e gerencie transações vinculadas (lançamentos parcelados).</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1C23] p-4 rounded-xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2D35] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex bg-[#2A2D35] rounded-lg p-1 border border-white/10">
            {['Todos', 'Marina', 'Vale Administradora', 'Mexicano'].map(emp => (
              <button
                key={emp}
                onClick={() => setEmpresaFiltro(emp)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  empresaFiltro === emp
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {emp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accordion / List of groups */}
      <div className="space-y-4">
        {groupedData.length === 0 ? (
          <div className="text-center py-10 bg-[#1A1C23] border border-white/5 rounded-xl">
            <CalendarClock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">Sem lançamentos parcelados</h3>
            <p className="text-gray-400">Nenhum grupo de parcelamento encontrado.</p>
          </div>
        ) : (
          groupedData.filter(g => g.descricao.toLowerCase().includes(searchTerm.toLowerCase())).map((group) => {
            const pago = group.parcelas.filter(p => p.status === 'pago').length;
            const total = group.parcelas.length;

            return (
              <div key={group.grupoId} className="bg-[#1A1C23] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-4 bg-[#2A2D35] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-lg">{group.descricao}</span>
                    <div className="flex gap-4 text-sm text-gray-400 mt-1">
                      <span>Empresa: {group.empresa}</span>
                      <span>Tipo: {group.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                      <span>Progresso: {pago}/{total} parcelas</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">
                      R$ {group.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-[#1e2029]">
                  {group.parcelas.map(parcela => (
                    <div
                      key={parcela.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors ${
                        parcela.status === 'pago' ? 'border-emerald-500/30 base-bg-emerald' :
                        parcela.status === 'vencido' ? 'border-red-500/30' : 'border-white/10'
                      }`}
                      onClick={() => {
                        setSelectedTransaction(parcela);
                        setShowTransactionModal(true);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">
                          Parcela {parcela.numeroParcela}/{parcela.totalParcelas}
                        </span>
                        {parcela.status === 'pago' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {parcela.status === 'vencido' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {parcela.status === 'lancado' && <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="text-sm text-gray-300">Vencimento: {new Date(parcela.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
                      <div className="text-lg font-bold text-white mt-1">R$ {Number(parcela.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showTransactionModal && selectedTransaction && (
        <TransactionDetailsModal
          transacao={selectedTransaction}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
          onEdit={() => {
            // Future feature: launch edit modal
            alert("Editar não implementado aqui. Edite via Fluxo de Caixa.");
          }}
          onDelete={() => {
            if (confirm('Excluir parcela?')) {
              handleDeleteTransaction(selectedTransaction.id);
            }
          }}
          onApprove={() => {
             // Not applicable
          }}
          onConfirmPayment={async () => {
             const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
             if (!confirm("Confirmar baixa (pagamento) desta parcela?")) return;
             
             const updatedTrans = {
               ...selectedTransaction,
               status: 'pago',
               dataPagamento: new Date().toISOString().split('T')[0]
             };
             
             const res = await fetch('/api/financeiro/transacoes/save', {
               method: 'POST',
               headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
               },
               body: JSON.stringify({ action: 'upsert', data: updatedTrans })
             });
             
             if (res.ok) {
               await fetchTransacoes();
               setShowTransactionModal(false);
             } else {
               alert("Erro ao confirmar baixa.");
             }
          }}
          onUploadReceipt={async (e) => {
             // Not applicable
          }}
          isUploading={false}
        />
      )}
    </div>
  );
}
