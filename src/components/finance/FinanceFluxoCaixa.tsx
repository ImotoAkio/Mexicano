import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, MoreHorizontal, Edit2, Trash2, X, FileText,
  Wallet, DollarSign, Send, CreditCard, ChevronDown, CheckCircle2,
  AlertTriangle, Clock, TrendingUp, TrendingDown, ArrowUpRight, Check
} from 'lucide-react';
import { TransacaoFinanceira } from '../../types';
import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';
import { generateFinanceReportPDF } from '../../utils/pdfGenerator';
import Select from 'react-select';
import { clientDB } from '../../db';

// Tooltip/3-dot Menu Component
function RowActions({
  onEdit,
  onDelete,
  onBaixaManual,
  onGerarLink,
  onEnviarWhatsApp,
  isPago
}: {
  onEdit: () => void;
  onDelete: () => void;
  onBaixaManual: () => void;
  onGerarLink: () => void;
  onEnviarWhatsApp: () => void;
  isPago: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      


<button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
           <motion.div
             initial={{ opacity: 0, scale: 0.95, y: -10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: -10 }}
             transition={{ duration: 0.15 }}
             className="absolute right-0 z-[60] mt-1 w-56 bg-white/80 backdrop-blur-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden p-1.5"
           >
             {!isPago && (
               <>
                 <button
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onBaixaManual(); }}
                    className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#008f5d] hover:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                 >
                    <CheckCircle2 className="w-4 h-4" /> Dar Baixa Manual
                 </button>
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
        )}
      </AnimatePresence>
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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [embarcacaoFilter, setEmbarcacaoFilter] = useState('');
  const [planoContasFilter, setPlanoContasFilter] = useState('todos');
  const [centroCustoFilter, setCentroCustoFilter] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchTransacoes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/db/pull', { headers: { 'Authorization': `Bearer ${token}` }});
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
      await fetch('/api/financeiro/lancamentos/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lancamentos: withIds })
      });
      fetchTransacoes();
    } catch(e) {
      console.error("Erro ao salvar lançamentos", e);
    }
  };

  const handleBaixaManual = async (t: any) => {
    alert(`Baixa manual confirmada para ${t.descricao}. O backend não está ativado.`);
    // Real implementation: POST to /api/financeiro/baixa com { id: t.id }
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
  const metricPagar = filteredTransacoes.filter(t => t.tipo === 'despesa' && t.status !== 'pago').reduce((acc, curr) => acc + (parseFloat(curr.valor)||0), 0);
  const metricSaldo = filteredTransacoes.filter(t => t.status === 'pago').reduce((acc, curr) => acc + (curr.tipo === 'receita' ? (parseFloat(curr.valor)||0) : -(parseFloat(curr.valor)||0)), 0);


  return (
    <div className="w-full h-full bg-[#f5f5f7] flex flex-col pt-8">

      {/* HEADER SECTION - Multi-Tenant Global Filter + Title */}
      <div className="px-8 pb-6 flex flex-col gap-6 shrink-0 z-20 relative">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
          <div>
            <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-2">
              Central de Movimentações
            </h1>
            <p className="text-[15px] font-medium text-[#86868b] tracking-tight">
              Acompanhe lançamentos, baixas e inadimplentes de forma inteligente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             {/* Apple-style Segmented Control for Companies */}
             <div className="flex bg-[#e5e5ea]/50 p-1 rounded-full backdrop-blur-xl border border-white/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full">
               {companies.map(empresa => {
                 const isActive = empresaFiltro === empresa;
                 return (
                   <button
                     key={empresa}
                     onClick={() => setEmpresaFiltro(empresa)}
                     className={`relative z-10 px-5 py-2 text-[14px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                       isActive ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                     }`}
                   >
                     {isActive && (
                       <motion.div
                         layoutId="activeCompanyFluxo"
                         className="absolute inset-0 bg-white rounded-full shadow-sm border border-black/[0.04]"
                         transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                         style={{ zIndex: -1 }}
                       />
                     )}
                     {empresa}
                   </button>
                 )
               })}
             </div>

                          <button
               onClick={() => generateFinanceReportPDF({
                 empresa: empresaFiltro,
                 tab: activeTab,
                 dataInicio,
                 dataFim,
                 transacoes: filteredTransacoes
               })}
               className="px-6 py-2.5 bg-white border border-black/[0.08] hover:bg-[#f5f5f7] text-[#1d1d1f] flex items-center gap-2 rounded-full font-semibold text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
             >
               <FileText className="w-5 h-5" /> Relatório
             </button>
             <button
               onClick={() => setIsLancamentoDrawerOpen(true)}
               className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ED] text-white flex items-center gap-2 rounded-full font-semibold text-[15px] shadow-[0_4px_14px_rgba(0,113,227,0.3)] transition-all active:scale-[0.98]"
             >
               <Plus className="w-5 h-5" /> Novo Lançamento
             </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-3 gap-6">
           <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm flex items-center justify-between">
             <div>
               <p className="text-[13px] font-semibold text-[#86868b] tracking-wide uppercase mb-1">A Receber</p>
               <p className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight text-[#008f5d]">R$ {metricReceber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
             </div>
             <div className="w-12 h-12 bg-[#008f5d]/10 rounded-full flex items-center justify-center">
               <TrendingUp className="w-6 h-6 text-[#008f5d]" />
             </div>
           </div>

           <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm flex items-center justify-between">
             <div>
               <p className="text-[13px] font-semibold text-[#86868b] tracking-wide uppercase mb-1">A Pagar</p>
               <p className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight text-[#e30000]">R$ {metricPagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
             </div>
             <div className="w-12 h-12 bg-[#e30000]/10 rounded-full flex items-center justify-center">
               <TrendingDown className="w-6 h-6 text-[#e30000]" />
             </div>
           </div>

           <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm flex items-center justify-between">
             <div>
               <p className="text-[13px] font-semibold text-[#86868b] tracking-wide uppercase mb-1">Efetivado (Saldo Pago)</p>
               <p className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                 R$ {metricSaldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                 {metricSaldo > 0 && <ArrowUpRight className="w-5 h-5 text-[#008f5d]" />}
               </p>
             </div>
             <div className="w-12 h-12 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
               <Wallet className="w-6 h-6 text-[#0071e3]" />
             </div>
           </div>
        </div>

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
                        className="group hover:bg-[#f5f5f7]/50 transition-colors cursor-pointer"
                      >
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
                          <div className={`text-[15px] font-semibold ${t.tipo === 'receita' ? 'text-[#008f5d]' : 'text-[#1d1d1f]'}`}>
                            {t.tipo === 'despesa' ? '- ' : '+ '}R$ {parseFloat(t.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
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
                            onEdit={() => console.log('Edit', t)}
                            onDelete={() => console.log('Delete', t)}
                            onBaixaManual={() => handleBaixaManual(t)}
                            onGerarLink={() => console.log('Link', t)}
                            onEnviarWhatsApp={() => console.log('Wpp', t)}
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
        onClose={() => setIsLancamentoDrawerOpen(false)}
        onSave={handleSaveLancamentos}
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
    </div>
  );
}