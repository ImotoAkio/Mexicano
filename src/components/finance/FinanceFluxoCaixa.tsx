import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, MoreHorizontal, Edit2, Trash2, X, FileText,
  Wallet, DollarSign, Send, CreditCard, ChevronDown, CheckCircle2,
  AlertTriangle, Clock, TrendingUp, TrendingDown, ArrowUpRight, Check
} from 'lucide-react';
import { TransacaoFinanceira } from '../../types';
import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';
import FinanceVisualizadorDrawer from './FinanceVisualizadorDrawer';
import { generateFinanceReportPDF } from '../../utils/pdfGenerator';
import Select from 'react-select';
import { clientDB } from '../../db';
import { FinanceBulkActionsModal } from './FinanceBulkModals';
import { PageHeader, MetricCard, Button } from '../tailadmin';

// Tooltip/3-dot Menu Component
function RowActions({
  onEdit,
  onDelete,
  onBaixaManual,
  onGerarLink,
  onEnviarWhatsApp,
  isPago,
  canGenerateAsaas = true
}: {
  onEdit: () => void;
  onDelete: () => void;
  onBaixaManual: () => void;
  onGerarLink: () => void;
  onEnviarWhatsApp: () => void;
  isPago: boolean;
  canGenerateAsaas?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function scrollHandler() {
      // Opt to close on scroll to prevent detached floating behavior
      setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', scrollHandler, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [open]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            >
              <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-56 bg-white/80 backdrop-blur-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden p-1.5 origin-top-right"
          >
            {!isPago && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onBaixaManual(); }}
                  className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#008f5d] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Dar Baixa Manual
                </button>
                {canGenerateAsaas && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpen(false); onGerarLink(); }}
                      className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#0071e3] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" /> Gerar Link Asaas
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpen(false); onEnviarWhatsApp(); }}
                      className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#34c759] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Enviar WhatsApp
                    </button>
                  </>
                )}
                <div className="h-[1px] bg-black/[0.05] my-1 mx-2" />
              </>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#0071e3] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> Editar Lançamento
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#e30000] hover:bg-[#e30000] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Excluir Lançamento
            </button>
          </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// Side-Over Drawer for Filters
function FilterDrawer({
  open, onClose,
  clienteFilter, setClienteFilter,
  embarcacaoFilter, setEmbarcacaoFilter,
  planoContasFilter, setPlanoContasFilter,
  centroCustoFilter, setCentroCustoFilter,
  planosList, centrosList,
  clientesList, fornecedoresList, embarcacoesList,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: any) {

  const reactSelectStyles = {
    control: (base: any) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#white', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
    menu: (base: any) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
    option: (base: any, { isFocused }: any) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
  };

  return (
    <AnimatePresence>
      {open && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-[400px] bg-[#f5f5f7] shadow-2xl z-[100] flex flex-col border-l border-white/50"
          >
             <div className="px-8 py-6 bg-white/70 backdrop-blur-xl border-b border-black/[0.04] flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">Filtros Avançados</h2>
                  <p className="text-[13px] font-medium text-[#86868b]">Refine a lista de movimentações</p>
               </div>
               <button onClick={onClose} className="p-2 rounded-full bg-[#e5e5ea] text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2 uppercase tracking-wide">Período</label>
                  <div className="space-y-3">
                    <div>
                       <span className="text-[12px] font-medium text-[#86868b] ml-1">De</span>
                       <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all" />
                    </div>
                    <div>
                       <span className="text-[12px] font-medium text-[#86868b] ml-1">Até</span>
                       <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2 uppercase tracking-wide">Busca Específica</label>
                  <div className="space-y-3">
                    <Select
                      options={[
                        { value: 'todos', label: 'Todos Clientes/Fornecedores' },
                        ...(clientesList || []).map((c: any) => ({ value: c.id, label: c.nome })), ...(fornecedoresList || []).map((c: any) => ({ value: c.id, label: c.nomeFantasia || c.razaoSocial || c.nome }))
                      ]}
                      value={{ value: clienteFilter, label: !clienteFilter || clienteFilter === 'todos' ? 'Todos Clientes/Fornecedores' : ((clientesList || []).find((c: any) => c.id === clienteFilter)?.nome || (fornecedoresList || []).find((c: any) => c.id === clienteFilter)?.nomeFantasia || 'Desconhecido') }}
                      onChange={(opt: any) => setClienteFilter(opt?.value === 'todos' ? '' : opt?.value)}
                      placeholder="Cliente ou Fornecedor..."
                      isClearable={false}
                      styles={reactSelectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />

                    <Select
                      options={[
                        { value: 'todos', label: 'Todas Embarcações' },
                        ...(embarcacoesList || []).map((e: any) => ({ value: e.id, label: e.nome }))
                      ]}
                      value={{ value: embarcacaoFilter, label: !embarcacaoFilter || embarcacaoFilter === 'todos' ? 'Todas Embarcações' : (embarcacoesList || []).find((e: any) => e.id === embarcacaoFilter)?.nome || 'Desconhecida' }}
                      onChange={(opt: any) => setEmbarcacaoFilter(opt?.value === 'todos' ? '' : opt?.value)}
                      placeholder="Embarcação..."
                      isClearable={false}
                      styles={reactSelectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />

                    <Select
                      options={[
                        { value: 'todos', label: 'Todos Planos de Contas' },
                        ...(planosList || []).map((p: any) => ({ value: p.id, label: p.descricao }))
                      ]}
                      value={{ value: planoContasFilter, label: planoContasFilter === 'todos' ? 'Todos Planos de Contas' : (planosList || []).find((p: any) => p.id === planoContasFilter)?.descricao || 'Desconhecido' }}
                      onChange={(opt: any) => setPlanoContasFilter(opt?.value || 'todos')}
                      placeholder="Selecione..."
                      isClearable={false}
                      styles={reactSelectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />

                    <Select
                      options={[
                        { value: 'todos', label: 'Todos Centros de Custo' },
                        ...(centrosList || []).map((c: any) => ({ value: c.id, label: c.nome }))
                      ]}
                      value={{ value: centroCustoFilter, label: centroCustoFilter === 'todos' ? 'Todos Centros de Custo' : (centrosList || []).find((c: any) => c.id === centroCustoFilter)?.nome || 'Desconhecido' }}
                      onChange={(opt: any) => setCentroCustoFilter(opt?.value || 'todos')}
                      placeholder="Selecione..."
                      isClearable={false}
                      styles={reactSelectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />

                  </div>
                </div>
             </div>
             <div className="px-8 py-5 border-t border-black/[0.04] bg-white/70 backdrop-blur-xl">
               <button onClick={onClose} className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold rounded-xl text-[15px] transition-colors shadow-sm">
                 Aplicar Filtros
               </button>
             </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

export default function FinanceFluxoCaixa() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');
  const companies = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];
  const tabs = ['Todos', 'A Receber', 'A Pagar', 'Atrasadas', 'Pagos'];
  const [activeTab, setActiveTab] = useState('Todos');

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dictionaries for relations
  const [mapPlanos, setMapPlanos] = useState<Record<string, string>>({});
  const [mapCentros, setMapCentros] = useState<Record<string, string>>({});
  const [planosList, setPlanosList] = useState<any[]>([]);
  const [centrosList, setCentrosList] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<any[]>([]);
  const [embarcacoesList, setEmbarcacoesList] = useState<any[]>([]);
  const [contasBancariasList, setContasBancariasList] = useState<any[]>([]);

  // Lancamento Form State
  const [isLancamentoDrawerOpen, setIsLancamentoDrawerOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [viewingTransacao, setViewingTransacao] = useState<any>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [embarcacaoFilter, setEmbarcacaoFilter] = useState('');
  const [planoContasFilter, setPlanoContasFilter] = useState('todos');
  const [centroCustoFilter, setCentroCustoFilter] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [taxaJurosMensal, setTaxaJurosMensal] = useState<number>(2.2);
  const [taxaMultaAtraso, setTaxaMultaAtraso] = useState<number>(2.0);
  const [billingTypePadrao, setBillingTypePadrao] = useState<string>('PIX');

  // Multi-selection & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModal, setBulkModal] = useState<'baixa' | 'delete' | 'edit' | 'asaas' | null>(null);

  const getDaysDiff = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateTransactionInterest = (t: TransacaoFinanceira) => {
    const baseVal = Number(t.valor || 0);
    if (t.tipo !== 'receita' || t.status === 'pago' || t.status === 'cancelado') {
      return { days: 0, interest: 0, total: baseVal };
    }

    const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
    if (!isOverdue) return { days: 0, interest: 0, total: baseVal };

    const days = getDaysDiff(t.dataVencimento);
    if (days <= 0) return { days: 0, interest: 0, total: baseVal };

    const fine = baseVal * (Math.max(0, taxaMultaAtraso) / 100);
    const ratePerDay = (Math.max(0, taxaJurosMensal) / 100) / 30;
    const interestOnly = baseVal * ratePerDay * days;
    const totalFees = Number((fine + interestOnly).toFixed(2));
    const total = Number((baseVal + totalFees).toFixed(2));

    return { days, interest: totalFees, total };
  };

  const fetchTransacoes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');

      const [res, resConfig] = await Promise.all([
        fetch('/api/db/pull', { headers: { 'Authorization': `Bearer ${token}` }}),
        fetch('/api/financeiro/configuracoes', { headers: { 'Authorization': `Bearer ${token}` }})
      ]);

      if (resConfig.ok) {
        const d = await resConfig.json();
        if (d.success && d.configuracoes) {
          setTaxaJurosMensal(parseFloat(d.configuracoes.taxaJurosMensal ?? '2.2'));
          setTaxaMultaAtraso(parseFloat(d.configuracoes.taxaMultaAtraso ?? '2.0'));
          if (d.configuracoes.billingTypePadrao) {
            setBillingTypePadrao(d.configuracoes.billingTypePadrao);
          }
        }
      }

      if(res.ok) {
        const dbData = await res.json();
        if (dbData.planosContas) {
          const map = dbData.planosContas.reduce((acc: any, p: any) => { acc[p.id] = p.descricao; return acc; }, {});
          setMapPlanos(map);
          setPlanosList(dbData.planosContas);
        }
        if (dbData.clientes || dbData.clients || dbData.fornecedores) {
          const cls = dbData.clientes || dbData.clients || [];
          const forns = dbData.fornecedores || [];
          setClientesList(cls);
          setFornecedoresList(forns);
        }
        if (dbData.embarcacoes || dbData.boats) {
          setEmbarcacoesList(dbData.embarcacoes || dbData.boats || []);
        }
        if (dbData.contasBancarias) {
          setContasBancariasList(dbData.contasBancarias);
        }
        if (dbData.centrosCusto) {
          const map = dbData.centrosCusto.reduce((acc: any, c: any) => { acc[c.id] = c.nome; return acc; }, {});
          setMapCentros(map);
          setCentrosList(dbData.centrosCusto);
        }

        if(Array.isArray(dbData.transacoes)) {
          // Normalize legacy shapes
          const mapped = dbData.transacoes.map((t: any) => ({
             ...t,
             status: t.status || 'lancado', // fallback
             empresa: t.empresa || 'Mexicano',
             createdAt: t.createdAt || new Date().toISOString()
          })).sort((a: any, b: any) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime());
          setTransacoes(mapped);
        }
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const handleSaveLancamentos = async (novosLancamentos: Partial<TransacaoFinanceira>[]) => {
    setIsLancamentoDrawerOpen(false);

    // Optimistic UI updates
    const withIds = novosLancamentos.map(l => ({
      ...l, id: Date.now().toString() + Math.random(), createdAt: new Date().toISOString()
    }));
    setTransacoes(prev => [...withIds, ...prev]);

    try {
      const token = localStorage.getItem('admin_token');
      // POST the array of lancamentos (adjust url as in your backend)
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });
      fetchTransacoes();
    } catch(e) {
      console.error("Erro ao salvar lançamentos", e);
    }
  };

  const handleBaixaManual = async (t: any) => {
    if (!window.confirm(`Confirma a baixa manual de: ${t.descricao}?`)) return;

    // YYYY-MM-DD format for dataPagamento usually expected
    const dataPagamento = new Date().toISOString().split('T')[0];
    const updated = { ...t, status: 'pago', dataPagamento };

    // Optimistic UI update
    setTransacoes(prev => prev.map(item => item.id === t.id ? updated : item));

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updated })
      });
      if (!res.ok) {
        throw new Error("Erro ao salvar baixa manual");
      } else {
        fetchTransacoes();
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro ao realizar baixa manual no banco de dados.");
      // Rollback on error
      setTransacoes(prev => prev.map(item => item.id === t.id ? t : item));
    }
  };

  const handleGerarLink = async (t: any, customBillingType?: string) => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
      const res = await fetch(`/api/financeiro/transacoes/${t.id}/gerar-asaas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ billingType: customBillingType || billingTypePadrao || 'PIX' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.asaasPaymentUrl) {
          navigator.clipboard.writeText(data.asaasPaymentUrl).catch(() => {});
        }
        setViewingTransacao((prev: any) =>
          prev && prev.id === t.id
            ? { ...prev, asaasPaymentId: data.asaasPaymentId, asaasPaymentUrl: data.asaasPaymentUrl }
            : prev
        );
        alert(
          data.reused
            ? `Cobrança Asaas existente reutilizada e copiada para a área de transferência!\nValor: R$ ${Number(data.finalValue || t.valor).toFixed(2)}`
            : `Cobrança Asaas gerada com sucesso! Link copiado para a área de transferência.\nValor: R$ ${Number(data.finalValue || t.valor).toFixed(2)}`
        );
        fetchTransacoes();
      } else {
        alert(data.message || "Erro ao gerar link Asaas.");
      }
    } catch(e: any) {
      alert("Erro ao conectar com API.");
    }
  };

  const handleEnviarWhatsApp = (t: any) => {
    alert("Para enviar WhatsApp, certifique-se de que o sistema de mensagens está conectado (Chat Interno).");
    // Expand later for full whatsapp integration similar to InternalChat / WhatsAppPage
  };

  const handleEdit = (t: any) => {
    setEditingLancamento(t);
    setIsLancamentoDrawerOpen(true);
  };

  const handleDelete = async (t: any) => {
    if (!window.confirm("Deseja mesmo excluir este lançamento?")) return;
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', data: { id: t.id } })
      });
      if (res.ok) {
        setTransacoes(prev => prev.filter(x => x.id !== t.id));
      } else {
        alert("Erro ao excluir lançamento.");
      }
    } catch(e) {
      alert("Erro de conexão.");
    }
  };


  const filteredTransacoes = transacoes.filter(t => {
    // 1. Empresa
    if (empresaFiltro !== 'Todos' && t.empresa !== empresaFiltro) return false;

    // 2. Tabs
    const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
    if (activeTab === 'A Receber' && (t.tipo !== 'receita' || t.status === 'pago')) return false;
    if (activeTab === 'A Pagar' && (t.tipo !== 'despesa' || t.status === 'pago')) return false;
    if (activeTab === 'Atrasadas' && (!isOverdue || t.status === 'pago')) return false;
    if (activeTab === 'Pagos' && t.status !== 'pago') return false;

    // 3. Search text
    if (searchTerm) {
       const search = searchTerm.toLowerCase();
       if (!t.descricao?.toLowerCase().includes(search)) return false;
    }

    // 4. Extended Filters
    if (clienteFilter && t.clienteId !== clienteFilter && t.fornecedorId !== clienteFilter) return false;
    if (embarcacaoFilter && t.embarcacaoId !== embarcacaoFilter) return false;
    if (planoContasFilter !== 'todos' && t.planoContasId !== planoContasFilter) return false;
    if (centroCustoFilter !== 'todos' && t.centroCustoId !== centroCustoFilter) return false;

    if (dataInicio && new Date(t.dataVencimento) < new Date(dataInicio)) return false;
    if (dataFim && new Date(t.dataVencimento) > new Date(dataFim)) return false;

    return true;
  });

  // Calculate quick metrics for current view
  const metricReceber = filteredTransacoes.filter(t => t.tipo === 'receita' && t.status !== 'pago').reduce((acc, curr) => acc + (parseFloat(curr.valor)||0), 0);
  const metricReceberJuros = filteredTransacoes.filter(t => t.tipo === 'receita' && t.status !== 'pago').reduce((acc, curr) => acc + calculateTransactionInterest(curr as any).interest, 0);
  const metricPagar = filteredTransacoes.filter(t => t.tipo === 'despesa' && t.status !== 'pago').reduce((acc, curr) => acc + (parseFloat(curr.valor)||0), 0);
  const metricSaldo = filteredTransacoes.filter(t => t.status === 'pago').reduce((acc, curr) => acc + (curr.tipo === 'receita' ? (parseFloat(curr.valor)||0) : -(parseFloat(curr.valor)||0)), 0);

  // Multi-selection calculations
  const selectedTransactions = transacoes.filter(t => selectedIds.includes(String(t.id)));
  const isAllSelected = filteredTransacoes.length > 0 && filteredTransacoes.every(t => selectedIds.includes(String(t.id)));
  const isSomeSelected = filteredTransacoes.some(t => selectedIds.includes(String(t.id))) && !isAllSelected;

  const handleToggleSelect = (id: any) => {
    const strId = String(id);
    setSelectedIds(prev =>
      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIdSet = new Set(filteredTransacoes.map(t => String(t.id)));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredTransacoes.map(t => String(t.id))]);
      setSelectedIds(Array.from(combined));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedReceitas = selectedTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
  const selectedDespesas = selectedTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
  const selectedTotal = selectedReceitas - selectedDespesas;
  const selectedPagasCount = selectedTransactions.filter(t => t.status === 'pago').length;

  const handleConfirmBulkBaixa = async (dataPagamento: string, contaBancariaId?: string) => {
    const updatedTxs = selectedTransactions.map(t => ({
      ...t,
      status: 'pago',
      dataPagamento,
      ...(contaBancariaId ? { contaBancariaId } : {})
    }));

    const updatedMap = new Map(updatedTxs.map(t => [String(t.id), t]));
    setTransacoes(prev => prev.map(t => updatedMap.get(String(t.id)) || t));

    const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
    const res = await fetch('/api/financeiro/transacoes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'upsert', data: updatedTxs })
    });

    if (!res.ok) {
      fetchTransacoes();
      throw new Error("Erro ao salvar baixa em lote.");
    } else {
      fetchTransacoes();
      clearSelection();
    }
  };

  const handleBulkReopen = async () => {
    if (!window.confirm(`Deseja reabrir ${selectedTransactions.length} lançamentos e torná-los pendentes novamente?`)) return;

    const updatedTxs = selectedTransactions.map(t => ({
      ...t,
      status: 'lancado',
      dataPagamento: null
    }));

    const updatedMap = new Map(updatedTxs.map(t => [String(t.id), t]));
    setTransacoes(prev => prev.map(t => updatedMap.get(String(t.id)) || t));

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTxs })
      });
      if (res.ok) {
        fetchTransacoes();
        clearSelection();
      } else {
        alert("Erro ao reabrir lançamentos.");
        fetchTransacoes();
      }
    } catch (e) {
      alert("Erro de conexão.");
      fetchTransacoes();
    }
  };

  const handleConfirmBulkDelete = async () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
    const idsToDelete = [...selectedIds];

    // Optimistic UI update
    setTransacoes(prev => prev.filter(t => !idsToDelete.includes(String(t.id))));

    try {
      const deletePromises = idsToDelete.map(id =>
        fetch('/api/financeiro/transacoes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'delete', data: { id } })
        })
      );

      const responses = await Promise.all(deletePromises);
      const allOk = responses.every(r => r.ok);

      if (!allOk) {
        fetchTransacoes();
        throw new Error("Erro ao excluir alguns lançamentos.");
      } else {
        clearSelection();
        fetchTransacoes();
      }
    } catch (err) {
      fetchTransacoes();
      throw err;
    }
  };

  const handleConfirmBulkEdit = async (fields: any) => {
    const updatedTxs = selectedTransactions.map(t => ({
      ...t,
      ...fields
    }));

    const updatedMap = new Map(updatedTxs.map(t => [String(t.id), t]));
    setTransacoes(prev => prev.map(t => updatedMap.get(String(t.id)) || t));

    const token = localStorage.getItem('admin_token') || localStorage.getItem('marina_token');
    const res = await fetch('/api/financeiro/transacoes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'upsert', data: updatedTxs })
    });

    if (!res.ok) {
      fetchTransacoes();
      throw new Error("Erro ao atualizar lançamentos em lote.");
    } else {
      fetchTransacoes();
      clearSelection();
    }
  };

  const handleBulkExportPDF = () => {
    if (selectedTransactions.length === 0) return;
    generateFinanceReportPDF({
      empresa: empresaFiltro,
      tab: `Seleção (${selectedTransactions.length} lançamentos)`,
      dataInicio,
      dataFim,
      transacoes: selectedTransactions
    });
  };



  return (
    <div className="w-full flex flex-col space-y-6">

      {/* HEADER SECTION - TailAdmin PageHeader */}
      <PageHeader
        pageTitle="Fluxo de Caixa"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Fluxo de Caixa" }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Empresa selector pill */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto max-w-full gap-1">
              {companies.map(empresa => {
                const isActive = empresaFiltro === empresa;
                return (
                  <button
                    key={empresa}
                    onClick={() => setEmpresaFiltro(empresa)}
                    className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {empresa}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="md"
              startIcon={<FileText className="w-4 h-4 text-slate-500" />}
              onClick={() => generateFinanceReportPDF({
                empresa: empresaFiltro,
                tab: activeTab,
                dataInicio,
                dataFim,
                transacoes: filteredTransacoes
              })}
            >
              Relatório PDF
            </Button>

            <Button
              variant="primary"
              size="md"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsLancamentoDrawerOpen(true)}
            >
              Novo Lançamento
            </Button>
          </div>
        }
      />

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <MetricCard
          title="A Receber"
          value={`R$ ${metricReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          badgeText="Entradas"
          badgeColor="success"
          subtitle={metricReceberJuros > 0 ? `+ R$ ${metricReceberJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em juros/multa` : "Valores pendentes de recebimento"}
        />

        <MetricCard
          title="A Pagar"
          value={`R$ ${metricPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingDown className="w-6 h-6 text-rose-600" />}
          iconBgColor="bg-rose-50 text-rose-600 border border-rose-100"
          badgeText="Saídas"
          badgeColor="error"
          subtitle="Valores pendentes de pagamento"
        />

        <MetricCard
          title="Saldo Liquidado (Pago)"
          value={`R$ ${metricSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<Wallet className="w-6 h-6 text-blue-600" />}
          iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
          badgeText={metricSaldo >= 0 ? "Positivo" : "Negativo"}
          badgeColor={metricSaldo >= 0 ? "info" : "error"}
          subtitle="Saldo efetivo liquidado"
        />
      </div>

      <div className="flex flex-col gap-6">

        {/* Toolbar: Search, Filters & Tabs */}
        <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl border border-black/[0.04] rounded-[1.5rem] p-2 shadow-sm">

           <div className="flex gap-1 relative">
             {tabs.map(tab => {
               const active = activeTab === tab;
               return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative z-10 px-5 py-2 text-[14px] font-medium rounded-xl transition-all ${
                       active ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                     }`}
                  >
                    {active && (
                       <motion.div
                         layoutId="activeTabFluxo"
                         className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.06)] border border-black/[0.04]"
                         transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                         style={{ zIndex: -1 }}
                       />
                    )}
                    {tab}
                  </button>
               )
             })}
           </div>

           <div className="flex items-center gap-3 pr-2">
             <div className="relative">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
               <input
                 type="text"
                 placeholder="Buscar transação..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-[#f5f5f7] border border-transparent rounded-xl pl-10 pr-4 py-2 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] transition-all"
               />
             </div>

             <button
               onClick={() => setIsFilterDrawerOpen(true)}
               className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                 (clienteFilter || dataInicio || dataFim || planoContasFilter !== 'todos')
                 ? 'bg-[#e5f0ff] border-[#0071e3]/30 text-[#0071e3]'
                 : 'bg-[#f5f5f7] border-transparent text-[#86868b] hover:text-[#1d1d1f]'
               }`}
             >
               <Filter className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="flex-1 px-8 pb-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.04] overflow-hidden flex flex-col">
          {/* Top selection banner */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 py-2.5 bg-[#0071e3]/[0.08] border-b border-[#0071e3]/15 flex items-center justify-between text-[13px] shrink-0 overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#0071e3]">
                    {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                  <span className="text-[#86868b]">•</span>
                  <span className="text-[#1d1d1f] font-medium">
                    Total Líquido: <strong>R$ {selectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleSelectAll}
                    className="font-medium text-[#0071e3] hover:underline cursor-pointer"
                  >
                    {isAllSelected ? "Desmarcar todos" : `Selecionar todos (${filteredTransacoes.length})`}
                  </button>
                  <span className="text-[#c7c7cc]">•</span>
                  <button
                    onClick={clearSelection}
                    className="font-medium text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
                  >
                    Limpar seleção
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">

            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#86868b]">
                 <div className="w-10 h-10 border-4 border-[#e5e5ea] border-t-[#0071e3] rounded-full animate-spin mb-4" />
                 <p className="font-medium text-[15px]">Carregando movimentações...</p>
              </div>
            ) : filteredTransacoes.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#86868b]">
                 <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-4">
                   <FileText className="w-8 h-8 text-[#d2d2d7]" />
                 </div>
                 <p className="font-semibold text-[17px] text-[#1d1d1f] mb-1">Nenhum lançamento encontrado</p>
                 <p className="text-[14px]">Verifique seus filtros ou crie um novo lançamento.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-xl z-[40] shadow-sm">
                  <tr>
                    <th className="px-3 py-3 w-12 border-b border-black/[0.04] text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            isAllSelected
                              ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                              : isSomeSelected
                              ? 'bg-[#0071e3]/15 border-[#0071e3] text-[#0071e3]'
                              : 'border-[#c7c7cc] bg-white hover:border-[#86868b]'
                          }`}
                          title={isAllSelected ? "Desmarcar todos" : "Selecionar todos os visíveis"}
                        >
                          {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          {isSomeSelected && <div className="w-2.5 h-1 bg-[#0071e3] rounded-full" />}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-32 border-b border-black/[0.04]">Data/Venc.</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Descrição</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Cliente/Fornec.</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Classificação</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Valor</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04] text-center">Status</th>
                    <th className="px-4 py-3 border-b border-black/[0.04] w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {filteredTransacoes.map((t, idx) => {
                    const isSelected = selectedIds.includes(String(t.id));
                    const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
                    let statusLabel = 'Pendente';
                    let statusColor = 'bg-[#f0f0f5] text-[#86868b]';
                    let StatusIcon = Clock;

                    if (t.status === 'pago') {
                      statusLabel = t.asaasPaymentId ? 'Pago Auto' : 'Pago Manual';
                      statusColor = 'bg-[#e5fcf4] text-[#008f5d]';
                      StatusIcon = CheckCircle2;
                    } else if (isOverdue) {
                      statusLabel = 'Vencido';
                      statusColor = 'bg-[#fef0f0] text-[#e30000]';
                      StatusIcon = AlertTriangle;
                    } else if (t.tipo === 'despesa') {
                      statusLabel = 'A Pagar';
                      statusColor = 'bg-[#fff5e5] text-[#bf4800]';
                      StatusIcon = Clock;
                    }

                    return (
                      <motion.tr
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={t.id || idx}
                        onClick={() => setViewingTransacao(t)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0071e3]/[0.08] hover:bg-[#0071e3]/[0.12]'
                            : 'hover:bg-[#f5f5f7]/50'
                        }`}
                      >
                        <td className="px-3 py-3 w-12 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(t.id)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                                  : 'border-[#c7c7cc] bg-white group-hover:border-[#86868b]'
                              }`}
                              aria-label={`Selecionar ${t.descricao}`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[14px] font-semibold text-[#1d1d1f]">
                            {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                          {t.status === 'pago' && t.dataPagamento && (
                            <div className="text-[12px] text-[#86868b] mt-0.5">
                              Pago: {new Date(t.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[15px] font-semibold text-[#1d1d1f] truncate max-w-[250px]">
                            {t.descricao}
                          </div>
                          {t.empresa && (
                            <div className="text-[12px] text-[#86868b] font-medium mt-0.5 flex items-center gap-1">
                               {t.empresa} {t.numeroParcela ? `• Parcela ${t.numeroParcela}/${t.totalParcelas}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[14px] font-medium text-[#1d1d1f] truncate max-w-[150px]">
                            {t.clienteId ? (clientDB.getById(t.clienteId)?.nome || t.clienteId) : t.fornecedorId || 'Não informado'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-medium bg-[#f5f5f7] border border-black/[0.04] text-[#86868b]">
                            {t.categoria || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`text-[15px] font-semibold flex flex-col justify-center ${t.tipo === 'receita' ? 'text-[#008f5d]' : 'text-[#1d1d1f]'}`}>
                            <span>{t.tipo === 'despesa' ? '- ' : '+ '}R$ {parseFloat(t.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            {(() => {
                              const { days, interest } = calculateTransactionInterest(t as any);
                              if (days > 0 && interest > 0) {
                                return (
                                  <span className="text-[11px] text-[#e30000] font-bold mt-0.5">
                                    (+R$ {interest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusLabel}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <RowActions
                            isPago={t.status === 'pago'}
                            canGenerateAsaas={t.tipo === 'receita' && Boolean(t.clienteId)}
                            onEdit={() => handleEdit(t)}
                            onDelete={() => handleDelete(t)}
                            onBaixaManual={() => handleBaixaManual(t)}
                            onGerarLink={() => handleGerarLink(t)}
                            onEnviarWhatsApp={() => handleEnviarWhatsApp(t)}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <FinanceLancamentoDrawer
        open={isLancamentoDrawerOpen}
        onClose={() => {
          setIsLancamentoDrawerOpen(false);
          setEditingLancamento(null);
        }}
        onSave={handleSaveLancamentos}
        editingItem={editingLancamento}
        defaultEmpresa={empresaFiltro}
        planosContas={planosList}
        centrosCusto={centrosList}
        clientes={clientesList}
        fornecedores={fornecedoresList}
        contasBancarias={contasBancariasList}
        embarcacoes={embarcacoesList}
      />

      <FilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        clienteFilter={clienteFilter}
        setClienteFilter={setClienteFilter}
        embarcacaoFilter={embarcacaoFilter}
        setEmbarcacaoFilter={setEmbarcacaoFilter}
        planoContasFilter={planoContasFilter}
        setPlanoContasFilter={setPlanoContasFilter}
          centroCustoFilter={centroCustoFilter}
          setCentroCustoFilter={setCentroCustoFilter}
          planosList={planosList}
          centrosList={centrosList}
          clientesList={clientesList}
          fornecedoresList={fornecedoresList}
          embarcacoesList={embarcacoesList}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
      />

      <FinanceVisualizadorDrawer
        open={!!viewingTransacao}
        onClose={() => setViewingTransacao(null)}
        transacao={viewingTransacao}
        mapPlanos={mapPlanos}
        mapCentros={mapCentros}
        clientes={clientesList}
        fornecedores={fornecedoresList}
        embarcacoes={embarcacoesList}
        taxaJurosMensal={taxaJurosMensal}
        taxaMultaAtraso={taxaMultaAtraso}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBaixaManual={handleBaixaManual}
        onGerarLink={handleGerarLink}
        onEnviarWhatsApp={handleEnviarWhatsApp}
      />

      {/* Floating Bulk Actions Dock — Light, clean & elegant */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white/95 text-stone-900 backdrop-blur-2xl px-3.5 py-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] border border-stone-200/90 flex items-center gap-2.5 max-w-[95vw] overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-stone-200 shrink-0">
              <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 text-[11px] font-bold flex items-center justify-center">
                {selectedIds.length}
              </span>
              <span className="text-xs font-semibold text-stone-600 whitespace-nowrap">
                {selectedIds.length === 1 ? 'selecionado' : 'selecionados'}
              </span>
              <div className="text-xs font-bold text-stone-900 whitespace-nowrap ml-0.5 bg-stone-100/90 border border-stone-200/80 px-2 py-0.5 rounded-lg tabular-nums">
                R$ {selectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setBulkModal('baixa')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Dar Baixa / Marcar como Pago"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dar Baixa</span>
              </button>

              {selectedPagasCount > 0 && (
                <button
                  onClick={handleBulkReopen}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                  title="Reabrir Lançamentos (Marcar como Pendente)"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reabrir</span>
                </button>
              )}

              <button
                onClick={() => setBulkModal('asaas')}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Gerar Cobrança Asaas / Link de Pagamento"
              >
                <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                <span>Cobrança Asaas</span>
              </button>

              <button
                onClick={() => setBulkModal('edit')}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Editar Dados em Lote"
              >
                <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Editar</span>
              </button>

              <button
                onClick={handleBulkExportPDF}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Exportar Relatório PDF dos Selecionados"
              >
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                <span>PDF</span>
              </button>

              <button
                onClick={() => setBulkModal('delete')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Excluir Lançamentos Selecionados"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Excluir</span>
              </button>
            </div>

            <div className="pl-1 border-l border-stone-200 shrink-0">
              <button
                onClick={clearSelection}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title="Desmarcar todos"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Unificado de Ações em Lote — Padrão Comercial Split View */}
      <FinanceBulkActionsModal
        open={Boolean(bulkModal)}
        initialTab={bulkModal || 'baixa'}
        onClose={() => setBulkModal(null)}
        selectedTransactions={selectedTransactions}
        contasBancarias={contasBancariasList}
        planosList={planosList}
        centrosList={centrosList}
        companies={companies}
        onConfirmBaixa={handleConfirmBulkBaixa}
        onConfirmDelete={handleConfirmBulkDelete}
        onConfirmEdit={handleConfirmBulkEdit}
        onExportPDF={handleBulkExportPDF}
        onSuccessAsaas={fetchTransacoes}
      />
    </div>
  );
}