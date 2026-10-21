import React, { useState, useEffect } from 'react';
import {
  X, Check, AlertTriangle, Trash2, CheckCircle2, CreditCard,
  Building, Calendar, Tag, ArrowRight, Copy, CheckCheck, Loader2,
  DollarSign, ExternalLink, Sliders, FileText, Send, Clock, Layers
} from 'lucide-react';
import { clientDB } from '../../db';

export type BulkTabId = 'baixa' | 'asaas' | 'edit' | 'pdf' | 'delete';

export interface FinanceBulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: BulkTabId;
  selectedTransactions: any[];
  contasBancarias?: any[];
  planosList?: any[];
  centrosList?: any[];
  companies?: string[];
  onConfirmBaixa?: (dataPagamento: string, contaBancariaId?: string) => Promise<void>;
  onConfirmEdit?: (fields: {
    empresa?: string;
    planoContasId?: string;
    centroCustoId?: string;
    categoria?: string;
    dataVencimento?: string;
  }) => Promise<void>;
  onConfirmDelete?: () => Promise<void>;
  onExportPDF?: () => void;
  onSuccessAsaas?: () => void;
}

export function FinanceBulkActionsModal({
  open,
  onClose,
  initialTab = 'baixa',
  selectedTransactions = [],
  contasBancarias = [],
  planosList = [],
  centrosList = [],
  companies = ['Mexicano', 'Vale Administradora', 'Marina Velho Chico'],
  onConfirmBaixa,
  onConfirmEdit,
  onConfirmDelete,
  onExportPDF,
  onSuccessAsaas
}: FinanceBulkActionsModalProps) {
  const [activeTab, setActiveTab] = useState<BulkTabId>(initialTab);
  const [loading, setLoading] = useState(false);

  // States - Baixa
  const [dataPagamento, setDataPagamento] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [contaBancariaId, setContaBancariaId] = useState<string>('');

  // States - Edit
  const [enableEmpresa, setEnableEmpresa] = useState(false);
  const [empresa, setEmpresa] = useState('Mexicano');
  const [enablePlano, setEnablePlano] = useState(false);
  const [planoContasId, setPlanoContasId] = useState('');
  const [enableCentro, setEnableCentro] = useState(false);
  const [centroCustoId, setCentroCustoId] = useState('');
  const [enableCategoria, setEnableCategoria] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [enableVencimento, setEnableVencimento] = useState(false);
  const [dataVencimento, setDataVencimento] = useState('');

  // States - Asaas
  const [billingType, setBillingType] = useState('PIX');
  const [copiedLink, setCopiedLink] = useState(false);
  const [asaasResult, setAsaasResult] = useState<{
    single?: boolean;
    paymentUrl?: string;
    finalValue?: number;
    count?: number;
    clientName?: string;
    multipleResults?: Array<{ clientName: string; paymentUrl: string; finalValue: number }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setLoading(false);
      setAsaasResult(null);
      setCopiedLink(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  // Totais
  const receitas = selectedTransactions.filter(t => t.tipo === 'receita');
  const despesas = selectedTransactions.filter(t => t.tipo === 'despesa');
  const totalReceitas = receitas.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
  const totalLiquido = totalReceitas - totalDespesas;
  const alreadyPaidCount = selectedTransactions.filter(t => t.status === 'pago').length;

  // Asaas elegíveis
  const eligibleTxs = selectedTransactions.filter(
    t => t.tipo === 'receita' && t.status !== 'pago' && t.clienteId
  );
  const nonEligibleCount = selectedTransactions.length - eligibleTxs.length;

  const clientsMap = new Map<string, any[]>();
  eligibleTxs.forEach(t => {
    const list = clientsMap.get(t.clienteId) || [];
    list.push(t);
    clientsMap.set(t.clienteId, list);
  });
  const clientCount = clientsMap.size;

  const validCompanies = companies.filter(c => c !== 'Todos');

  // Submit Handlers
  const handleBaixaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirmBaixa) return;
    setLoading(true);
    try {
      await onConfirmBaixa(dataPagamento, contaBancariaId || undefined);
      onClose();
    } catch (err: any) {
      alert(err?.message || "Erro ao dar baixa em lote.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirmEdit) return;
    if (!enableEmpresa && !enablePlano && !enableCentro && !enableCategoria && !enableVencimento) {
      alert("Selecione pelo menos um campo para atualizar em lote.");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {};
      if (enableEmpresa) payload.empresa = empresa;
      if (enablePlano) payload.planoContasId = planoContasId;
      if (enableCentro) payload.centroCustoId = centroCustoId;
      if (enableCategoria) payload.categoria = categoria;
      if (enableVencimento && dataVencimento) payload.dataVencimento = dataVencimento;

      await onConfirmEdit(payload);
      onClose();
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar em lote.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!onConfirmDelete) return;
    setLoading(true);
    try {
      await onConfirmDelete();
      onClose();
    } catch (err: any) {
      alert(err?.message || "Erro ao excluir registros em lote.");
    } finally {
      setLoading(false);
    }
  };

  const handleAsaasGenerate = async () => {
    if (eligibleTxs.length === 0) {
      alert("Nenhuma transação a receber com cliente definido elegível para cobrança Asaas.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
      if (clientCount === 1) {
        const [clienteId, txs] = Array.from(clientsMap.entries())[0];
        const res = await fetch('/api/financeiro/transacoes/gerar-asaas-lote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clienteId,
            transacoesIds: txs.map(t => t.id),
            billingType
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const clientName = clientDB.getById(clienteId)?.nome || clienteId;
          setAsaasResult({
            single: true,
            paymentUrl: data.asaasPaymentUrl,
            finalValue: data.finalValue,
            count: txs.length,
            clientName
          });
          if (data.asaasPaymentUrl) {
            navigator.clipboard.writeText(data.asaasPaymentUrl).catch(() => {});
            setCopiedLink(true);
          }
          if (onSuccessAsaas) onSuccessAsaas();
        } else {
          alert(data.message || "Erro ao gerar cobrança Asaas");
        }
      } else {
        const results: Array<{ clientName: string; paymentUrl: string; finalValue: number }> = [];
        for (const [clienteId, txs] of clientsMap.entries()) {
          const res = await fetch('/api/financeiro/transacoes/gerar-asaas-lote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              clienteId,
              transacoesIds: txs.map(t => t.id),
              billingType
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            results.push({
              clientName: clientDB.getById(clienteId)?.nome || clienteId,
              paymentUrl: data.asaasPaymentUrl,
              finalValue: data.finalValue
            });
          }
        }
        setAsaasResult({
          single: false,
          multipleResults: results
        });
        if (onSuccessAsaas) onSuccessAsaas();
      }
    } catch {
      alert("Erro ao conectar com API de pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    {
      id: 'baixa' as BulkTabId,
      label: 'Dar Baixa em Lote',
      icon: CheckCircle2,
      desc: 'Registrar data de quitação e conciliação bancária dos lançamentos',
      badge: `${selectedTransactions.length}`
    },
    {
      id: 'asaas' as BulkTabId,
      label: 'Cobrança Asaas',
      icon: CreditCard,
      desc: 'Gerar links consolidado de pagamento (PIX, Boleto ou Cartão)',
      badge: `${eligibleTxs.length}`
    },
    {
      id: 'edit' as BulkTabId,
      label: 'Edição em Massa',
      icon: Tag,
      desc: 'Atualizar empresa, plano de contas, centro de custo ou prorrogar data'
    },
    {
      id: 'pdf' as BulkTabId,
      label: 'Exportar Relatório',
      icon: FileText,
      desc: 'Gerar documento analítico em PDF com os itens selecionados'
    },
    {
      id: 'delete' as BulkTabId,
      label: 'Excluir Registros',
      icon: Trash2,
      desc: 'Remover definitivamente os lançamentos selecionados do sistema'
    }
  ];

  const currentTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View da Referência Comercial) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[680px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ações em Lote"
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <Sliders className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  Ações em Lote
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Operações consolidadas para <span className="font-bold text-stone-800">{selectedTransactions.length} lançamentos</span> selecionados na listagem.
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDanger = tab.id === 'delete';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? isDanger
                          ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-200/80'
                          : 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : isDanger
                          ? 'text-rose-600 hover:bg-rose-50/60'
                          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isDanger ? 'text-rose-600' : 'text-stone-600'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-stone-900 text-white' : 'bg-stone-200/80 text-stone-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda: Resumo Financeiro */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
            <div className="bg-white p-3 rounded-xl border border-stone-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-medium">Total Selecionado:</span>
                <span className="font-bold text-stone-900 tabular-nums">
                  {selectedTransactions.length} itens
                </span>
              </div>
              {receitas.length > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-medium">Receitas ({receitas.length}):</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    + R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {despesas.length > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-700 font-medium">Despesas ({despesas.length}):</span>
                  <span className="font-bold text-rose-700 tabular-nums">
                    - R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900">Total Líquido:</span>
                <span className={`font-black tabular-nums ${totalLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  R$ {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA DIREITA: CONTEÚDO PRINCIPAL ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header da Coluna Direita */}
          <header className="px-6 sm:px-8 py-5 border-b border-stone-200/70 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                {currentTabMeta.label}
              </h2>
              <p className="text-xs text-stone-500 font-normal mt-0.5">
                {currentTabMeta.desc}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Área de Conteúdo Scrollável com Cards Padronizados */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 subtle-scrollbar">

            {/* TAB: DAR BAIXA */}
            {activeTab === 'baixa' && (
              <form id="form-bulk-baixa" onSubmit={handleBaixaSubmit} className="space-y-4">
                <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">Parâmetros de Quitação</h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    Defina a data efetiva do recebimento/pagamento e a conta bancária para conciliação dos {selectedTransactions.length} lançamentos.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Data do Pagamento *
                      </label>
                      <input
                        type="date"
                        required
                        value={dataPagamento}
                        onChange={e => setDataPagamento(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Conta Bancária de Destino
                      </label>
                      <select
                        value={contaBancariaId}
                        onChange={e => setContaBancariaId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      >
                        <option value="">Manter atual / Não alterar conta</option>
                        {contasBancarias.map(cb => (
                          <option key={cb.id} value={cb.id}>
                            {cb.banco || cb.descricao || cb.nome} {cb.agencia ? `(Ag ${cb.agencia})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {alreadyPaidCount > 0 && (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {alreadyPaidCount} dos {selectedTransactions.length} lançamentos selecionados já estão marcados como pagos e terão sua data e conta atualizadas.
                    </span>
                  </div>
                )}
              </form>
            )}

            {/* TAB: COBRANÇA ASAAS */}
            {activeTab === 'asaas' && (
              <div className="space-y-4">
                {!asaasResult ? (
                  <>
                    <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-sky-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">Geração de Cobrança Integrada</h4>
                      </div>
                      <p className="text-xs text-stone-500">
                        O sistema gerará cobranças consolidadas no gateway Asaas para todas as receitas pendentes com clientes definidos.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Itens Elegíveis</span>
                          <span className="text-base font-bold text-emerald-700">{eligibleTxs.length} transações</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Clientes Envolvidos</span>
                          <span className="text-base font-bold text-stone-900">{clientCount} clientes</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">Forma Padrão</span>
                          <span className="text-base font-bold text-sky-700">{billingType}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1.5">
                          Forma de Pagamento (Asaas)
                        </label>
                        <select
                          value={billingType}
                          onChange={e => setBillingType(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                        >
                          <option value="PIX">PIX (Recomendado - Baixa instantânea)</option>
                          <option value="BOLETO">Boleto Bancário</option>
                          <option value="CREDIT_CARD">Cartão de Crédito</option>
                          <option value="UNDEFINED">Deixar Cliente Escolher na Fatura</option>
                        </select>
                      </div>
                    </div>

                    {nonEligibleCount > 0 && (
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                        * {nonEligibleCount} lançamento(s) selecionado(s) não são receitas a receber com cliente definido e serão ignorados nesta emissão.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-stone-50/60 rounded-2xl p-6 border border-stone-200/80 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center border border-emerald-100">
                      <CheckCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-stone-900">Cobrança Gerada com Sucesso!</h4>
                      <p className="text-xs text-stone-500 mt-0.5">Links consolidados prontos para envio aos cotistas</p>
                    </div>

                    {asaasResult.single && asaasResult.paymentUrl && (
                      <div className="bg-white p-4 rounded-xl border border-stone-200 text-left space-y-2.5 max-w-lg mx-auto">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium">Cliente:</span>
                          <span className="font-bold text-stone-900">{asaasResult.clientName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium">Valor Consolidado:</span>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            R$ {Number(asaasResult.finalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={asaasResult.paymentUrl}
                            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (asaasResult.paymentUrl) {
                                navigator.clipboard.writeText(asaasResult.paymentUrl);
                                setCopiedLink(true);
                              }
                            }}
                            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedLink ? 'Copiado!' : 'Copiar'}
                          </button>
                          <a
                            href={asaasResult.paymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 transition-colors"
                            title="Abrir fatura"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: EDIÇÃO EM MASSA */}
            {activeTab === 'edit' && (
              <form id="form-bulk-edit" onSubmit={handleEditSubmit} className="space-y-3.5">
                <p className="text-xs text-stone-500 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                  Marque a caixa de seleção ao lado de cada parâmetro que deseja sobrescrever em todos os <strong>{selectedTransactions.length} lançamentos</strong> selecionados.
                </p>

                {/* Empresa */}
                <div className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableEmpresa}
                      onChange={e => setEnableEmpresa(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500 border-stone-300 accent-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">Alterar Empresa</span>
                  </label>
                  {enableEmpresa && (
                    <select
                      value={empresa}
                      onChange={e => setEmpresa(e.target.value)}
                      className="w-full h-9 bg-white border border-stone-200 focus:border-stone-400 rounded-xl px-3 text-xs font-semibold text-stone-900 outline-none"
                    >
                      {validCompanies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Plano de Contas */}
                <div className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePlano}
                      onChange={e => setEnablePlano(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500 border-stone-300 accent-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">Alterar Plano de Contas</span>
                  </label>
                  {enablePlano && (
                    <select
                      value={planoContasId}
                      onChange={e => setPlanoContasId(e.target.value)}
                      className="w-full h-9 bg-white border border-stone-200 focus:border-stone-400 rounded-xl px-3 text-xs font-semibold text-stone-900 outline-none"
                    >
                      <option value="">Selecione um plano...</option>
                      {planosList.map(p => (
                        <option key={p.id} value={p.id}>{p.descricao}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Centro de Custo */}
                <div className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCentro}
                      onChange={e => setEnableCentro(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500 border-stone-300 accent-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">Alterar Centro de Custo</span>
                  </label>
                  {enableCentro && (
                    <select
                      value={centroCustoId}
                      onChange={e => setCentroCustoId(e.target.value)}
                      className="w-full h-9 bg-white border border-stone-200 focus:border-stone-400 rounded-xl px-3 text-xs font-semibold text-stone-900 outline-none"
                    >
                      <option value="">Selecione um centro de custo...</option>
                      {centrosList.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Categoria */}
                <div className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCategoria}
                      onChange={e => setEnableCategoria(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500 border-stone-300 accent-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">Alterar Categoria</span>
                  </label>
                  {enableCategoria && (
                    <input
                      type="text"
                      placeholder="Nome da categoria..."
                      value={categoria}
                      onChange={e => setCategoria(e.target.value)}
                      className="w-full h-9 bg-white border border-stone-200 focus:border-stone-400 rounded-xl px-3 text-xs font-semibold text-stone-900 outline-none"
                    />
                  )}
                </div>

                {/* Vencimento */}
                <div className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableVencimento}
                      onChange={e => setEnableVencimento(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500 border-stone-300 accent-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">Prorrogar / Alterar Vencimento</span>
                  </label>
                  {enableVencimento && (
                    <input
                      type="date"
                      value={dataVencimento}
                      onChange={e => setDataVencimento(e.target.value)}
                      className="w-full h-9 bg-white border border-stone-200 focus:border-stone-400 rounded-xl px-3 text-xs font-semibold text-stone-900 outline-none"
                    />
                  )}
                </div>
              </form>
            )}

            {/* TAB: EXPORTAR PDF */}
            {activeTab === 'pdf' && (
              <div className="bg-stone-50/60 rounded-2xl p-6 border border-stone-200/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Relatório Analítico de Lançamentos</h4>
                    <p className="text-xs text-stone-500">Documento pronto para impressão ou arquivo digital contábil</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total de registros:</span>
                    <span className="font-bold text-stone-900">{selectedTransactions.length} lançamentos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Receitas brutas:</span>
                    <span className="font-bold text-emerald-700">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Despesas brutas:</span>
                    <span className="font-bold text-rose-700">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex justify-between font-bold">
                    <span className="text-stone-900">Saldo Consolidado:</span>
                    <span className="text-stone-900">R$ {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onExportPDF) onExportPDF();
                      onClose();
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar e Baixar PDF Agora
                  </button>
                </div>
              </div>
            )}

            {/* TAB: EXCLUIR */}
            {activeTab === 'delete' && (
              <div className="space-y-4">
                <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-200/80 space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">Atenção: Ação Irreversível</h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      Você está prestes a remover definitivamente <strong>{selectedTransactions.length} lançamentos</strong> financeiros. Todos os registros de conciliação vinculados serão apagados permanentemente.
                    </p>
                  </div>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Prévia dos itens que serão excluídos:
                  </span>
                  <div className="max-h-48 overflow-y-auto subtle-scrollbar divide-y divide-stone-200/60 text-xs">
                    {selectedTransactions.slice(0, 8).map((t, i) => (
                      <div key={t.id || i} className="py-2 flex justify-between items-center gap-2">
                        <span className="truncate max-w-[280px] text-stone-800 font-medium">{t.descricao}</span>
                        <span className="font-bold text-stone-600 shrink-0 tabular-nums">
                          R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {selectedTransactions.length > 8 && (
                      <p className="pt-2 text-center text-stone-400 text-[11px] font-medium">
                        ...e mais {selectedTransactions.length - 8} lançamentos
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer da Coluna Direita com Botões Padronizados */}
          <footer className="px-6 sm:px-8 py-4 bg-stone-50/70 border-t border-stone-200/70 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {activeTab === 'baixa' && (
              <button
                type="submit"
                form="form-bulk-baixa"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirmar Baixa ({selectedTransactions.length})
              </button>
            )}

            {activeTab === 'asaas' && !asaasResult && (
              <button
                type="button"
                onClick={handleAsaasGenerate}
                disabled={loading || eligibleTxs.length === 0}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Gerar Cobrança ({eligibleTxs.length})
              </button>
            )}

            {activeTab === 'asaas' && asaasResult && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
              >
                Concluir
              </button>
            )}

            {activeTab === 'edit' && (
              <button
                type="submit"
                form="form-bulk-edit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Aplicar Alterações
              </button>
            )}

            {activeTab === 'pdf' && (
              <button
                type="button"
                onClick={() => {
                  if (onExportPDF) onExportPDF();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Exportar PDF
              </button>
            )}

            {activeTab === 'delete' && (
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Sim, Excluir Lançamentos
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}

// Retrocompatibilidade para chamadas individuais diretas
export function BulkBaixaModal(props: any) {
  return <FinanceBulkActionsModal {...props} initialTab="baixa" onConfirmBaixa={props.onConfirm} />;
}

export function BulkDeleteModal(props: any) {
  return <FinanceBulkActionsModal {...props} initialTab="delete" onConfirmDelete={props.onConfirm} />;
}

export function BulkEditModal(props: any) {
  return <FinanceBulkActionsModal {...props} initialTab="edit" onConfirmEdit={props.onConfirm} />;
}

export function BulkAsaasModal(props: any) {
  return <FinanceBulkActionsModal {...props} initialTab="asaas" onSuccessAsaas={props.onSuccess} />;
}
