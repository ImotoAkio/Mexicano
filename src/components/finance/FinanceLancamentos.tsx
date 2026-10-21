import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, 
  Download, Eye, AlertCircle, RefreshCw, XCircle, Calendar,
  Receipt, Building2, Upload
} from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao, Reserva } from '../../types';
import { jsPDF } from 'jspdf';
import { toBlob } from 'html-to-image';
// @ts-ignore
import logoUrl from '../../assets/images/vale_nauticos_logo_1780256879963.png';

import TransactionDetailsModal from './TransactionDetailsModal';
import ImportXMLModal from './ImportXMLModal';
import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';
import Select from 'react-select';
import { clientDB } from '../../db';

const cleanDescription = (desc: string) => {
  if (!desc) return '';
  let cleaned = desc.replace(/^Serviço realizado:\s*/i, '');
  cleaned = cleaned.replace(/\s*-\s*Cliente Ref:.*$/i, '');
  cleaned = cleaned.replace(/^Cliente Ref:.*$/i, '');
  return cleaned.trim();
};

interface FinanceLancamentosProps {
  empresaFiltro?: string;
  privacyMode?: boolean;
  hideTopHeader?: boolean;
  onOpenNovoLancamento?: () => void;
}

export default function FinanceLancamentos({
  empresaFiltro: externalEmpresaFiltro,
  privacyMode = false,
  hideTopHeader = false,
  onOpenNovoLancamento,
}: FinanceLancamentosProps) {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>(() => clientDB.getAll());
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(() => clientDB.getAll().length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState<number>(2.2);
  const [taxaMultaAtraso, setTaxaMultaAtraso] = useState<number>(2.0);

  // Logged User Details
  const [loggedUser, setLoggedUser] = useState<{ role: string; username: string } | null>(null);
  const [internalEmpresaFiltro, setInternalEmpresaFiltro] = useState<string>('Todos');

  const empresaFiltro = externalEmpresaFiltro !== undefined ? externalEmpresaFiltro : internalEmpresaFiltro;

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('todos');
  const [embarcacaoFilter, setEmbarcacaoFilter] = useState<string>('todos');
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransacaoFinanceira | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<TransacaoFinanceira | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState<{[key: string]: boolean}>({});

  // Client Debt check tab states
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [manualStatusFinanceiro, setManualStatusFinanceiro] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
  const [manualObservacoesFinanceiras, setManualObservacoesFinanceiras] = useState('');
  const [isUpdatingClientStatus, setIsUpdatingClientStatus] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setLoggedUser(JSON.parse(jsonPayload));
      } catch (e) {
        console.error("Error decoding token:", e);
      }
    }
  }, []);

  const getDaysDiff = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00');
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

  const fetchData = async (showLoading = false) => {
    if (showLoading && clientes.length === 0) setLoading(true);
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token || token === 'null' || token === 'undefined') return;
      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let transacoesData: any[] = [];
      if (res.ok) {
        try {
          const [resContas, resPlanos, resForn, resCentros, resConfig] = await Promise.all([
            fetch('/api/financeiro/contas-bancarias', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/financeiro/planos-contas', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/financeiro/fornecedores', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/financeiro/centros-custo', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/financeiro/configuracoes', { headers: { 'Authorization': `Bearer ${token}` } })
          ]);
          if (resContas.ok) setContasBancarias(await resContas.json());
          if (resPlanos.ok) setPlanosContas(await resPlanos.json());
          if (resForn.ok) setFornecedores(await resForn.json());
          if (resCentros.ok) setCentrosCusto(await resCentros.json());
          if (resConfig.ok) {
            const d = await resConfig.json();
            if (d.success && d.configuracoes) {
              setTaxaJurosMensal(parseFloat(d.configuracoes.taxaJurosMensal ?? '2.2'));
              setTaxaMultaAtraso(parseFloat(d.configuracoes.taxaMultaAtraso ?? '2.0'));
            }
          }
        } catch (err) { console.error('Erro ao buscar dados complementares no financeiro:', err); }

        transacoesData = await res.json();
        if (Array.isArray(transacoesData)) {
          setTransacoes(transacoesData);
        }
      }
      
      const resDb = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resDb.ok) {
        const dbData = await resDb.json();
        if ((!res.ok || transacoesData.length === 0) && Array.isArray(dbData.transacoes)) {
          transacoesData = dbData.transacoes;
          setTransacoes(transacoesData);
        }
        const clientsArray = dbData.clients || [];
        const todayStr = new Date().toISOString().split('T')[0];

        const newClients = clientsArray.map((c: any) => {
          const isDefaulting = transacoesData.some((t: any) => {
            if (t.clienteId !== c.id) return false;
            if (t.tipo !== 'receita') return false;
            if (t.status === 'vencido') return true;
            if (t.status === 'lancado' && t.dataVencimento < todayStr) return true;
            return false;
          });
          
          const expectedStatus = isDefaulting ? 'inadimplente' : 'em_dia';
          if (c.statusFinanceiro !== expectedStatus) {
            try {
              clientDB.update(c.id, { statusFinanceiro: expectedStatus });
            } catch (e) {
              console.warn("Failed to auto-update client status", e);
            }
            return { ...c, statusFinanceiro: expectedStatus };
          }
          return c;
        });

        setClientes(newClients);
        setEmbarcacoes(dbData.boats || []);
        setReservas(dbData.reservations || []);
      }
      
    } catch (err) {
      console.error("Failed to load finance data", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('finance_updated', handleUpdate);
    window.addEventListener('db_updated', handleUpdate);

    return () => {
      window.removeEventListener('finance_updated', handleUpdate);
      window.removeEventListener('db_updated', handleUpdate);
    };
  }, []);

  const handleSaveLancamentos = async (novosLancamentos: Partial<TransacaoFinanceira>[]) => {
    setIsModalOpen(false);
    setEditingItem(null);
    const withIds = novosLancamentos.map(l => ({
      ...l, id: l.id || `fin_${Date.now()}_${Math.random().toString(36).substring(7)}`, createdAt: l.createdAt || new Date().toISOString()
    }));

    setTransacoes(prev => {
      const updated = [...prev];
      withIds.forEach(newItem => {
        const idx = updated.findIndex(t => t.id === newItem.id);
        if (idx !== -1) updated[idx] = newItem as any;
        else updated.unshift(newItem as any);
      });
      return updated;
    });

    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });
      fetchData();
      window.dispatchEvent(new CustomEvent('finance_updated'));
    } catch(e) {
      console.error("Erro ao salvar lançamentos", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    
    const token = localStorage.getItem('admin_token');
    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', data: { id } })
      });
      fetchData();
      window.dispatchEvent(new CustomEvent('finance_updated'));
    } catch (err) {
      console.error("Error deleting transacao:", err);
    }
  };

  const handleUploadFile = async (t: TransacaoFinanceira, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [t.id]: true }));
    const token = localStorage.getItem('admin_token');
    const formDataUpload = new FormData();
    formDataUpload.append('comprovante', file);

    try {
      const resUpload = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      if (!resUpload.ok) {
        const errData = await resUpload.json();
        alert(`Erro no upload: ${errData.message || 'Falha ao enviar arquivo'}`);
        return;
      }

      const uploadResult = await resUpload.json();
      const fileUrl = uploadResult.url;

      const updatedTrans: TransacaoFinanceira = { 
        ...t, 
        comprovante: fileUrl,
        status: 'pago',
        dataPagamento: new Date().toISOString().split('T')[0]
      };
      
      const resSave = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });

      if (resSave.ok) {
        fetchData();
        setViewingTransaction(updatedTrans);
        window.dispatchEvent(new CustomEvent('finance_updated'));
      } else {
        alert('Erro ao vincular o comprovante ao lançamento.');
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert('Erro de rede ou processamento do arquivo.');
    } finally {
      setIsUploading(prev => ({ ...prev, [t.id]: false }));
    }
  };

  const handleConfirmarBaixa = async (t: TransacaoFinanceira) => {
    if (!confirm("Confirmar baixa (pagamento) deste lançamento?")) return;

    const token = localStorage.getItem('admin_token');
    const updatedTrans: TransacaoFinanceira = {
      ...t,
      status: 'pago',
      dataPagamento: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('finance_updated'));
      } else {
        alert('Erro ao confirmar baixa.');
      }
    } catch (err) {
      console.error("Error confirming settlement:", err);
    }
  };

  const handleAprovarLancamento = async (t: TransacaoFinanceira) => {
    if (!confirm("Confirmar a aprovação deste débito?")) return;

    const token = localStorage.getItem('admin_token');
    const isOverdue = new Date(t.dataVencimento + 'T23:59:59') < new Date();
    const updatedTrans: TransacaoFinanceira = {
      ...t,
      status: isOverdue ? 'vencido' : 'lancado'
    };

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('finance_updated'));
      } else {
        alert('Erro ao aprovar débito.');
      }
    } catch (err) {
      console.error("Error approving transaction:", err);
    }
  };

  const openModal = (item?: TransacaoFinanceira) => {
    if (onOpenNovoLancamento && !item) {
      onOpenNovoLancamento();
      return;
    }
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  // Filtered transactions
  const filteredTransacoes = transacoes.filter(t => {
    if (empresaFiltro !== 'Todos') {
      if (t.empresa !== empresaFiltro) return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const clientName = clientes.find(c => c.id === t.clienteId)?.nome?.toLowerCase() || '';
    const boatName = embarcacoes.find(b => b.id === t.embarcacaoId)?.nome?.toLowerCase() || '';
    const valueStr = String(t.valor);
    const dateFormatted = new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR');

    const matchesSearch = t.categoria.toLowerCase().includes(searchLower) || 
                          (t.descricao && t.descricao.toLowerCase().includes(searchLower)) ||
                          clientName.includes(searchLower) ||
                          boatName.includes(searchLower) ||
                          valueStr.includes(searchLower) ||
                          dateFormatted.includes(searchLower) ||
                          t.status.toLowerCase().includes(searchLower) ||
                          t.tipo.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'todos' 
      ? true 
      : statusFilter === 'baixas' ? (t.status !== 'pago' && !!t.comprovante) : (t.status === statusFilter);

    const matchesTipo = tipoFilter === 'todos' || t.tipo === tipoFilter;
    const matchesCliente = clienteFilter === 'todos' || t.clienteId === clienteFilter;
    
    let matchesEmbarcacao = true;
    if (embarcacaoFilter !== 'todos') {
      const isDirect = t.embarcacaoId === embarcacaoFilter;
      const cliente = clientes.find(c => c.id === t.clienteId);
      const isClientBoat = !t.embarcacaoId && cliente && (
        cliente.embarcacaoId === embarcacaoFilter || 
        cliente.embarcacoes?.some(e => e.embarcacaoId === embarcacaoFilter)
      );
      matchesEmbarcacao = isDirect || isClientBoat;
    }

    let matchesPeriodo = true;
    const dataRef = new Date(t.dataVencimento + 'T12:00:00');
    if (dataInicioFilter) {
      const inicio = new Date(dataInicioFilter + 'T00:00:00');
      if (dataRef < inicio) matchesPeriodo = false;
    }
    if (dataFimFilter) {
      const fim = new Date(dataFimFilter + 'T23:59:59');
      if (dataRef > fim) matchesPeriodo = false;
    }

    return matchesSearch && matchesStatus && matchesTipo && matchesCliente && matchesEmbarcacao && matchesPeriodo;
  });

  // KPIs
  const totalRecebidos = filteredTransacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pago')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const aReceber = filteredTransacoes
    .filter(t => t.tipo === 'receita' && t.status === 'lancado')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  let totalAtrasadoPrincipal = 0;
  let totalAtrasadoJuros = 0;
  filteredTransacoes.forEach(t => {
    if (t.tipo === 'receita') {
      const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
      if (isOverdue) {
        const { interest } = calculateTransactionInterest(t);
        totalAtrasadoPrincipal += Number(t.valor) || 0;
        totalAtrasadoJuros += interest;
      }
    }
  });
  const totalVencidosComJuros = totalAtrasadoPrincipal + totalAtrasadoJuros;

  const formatCurrency = (val: number) => {
    if (privacyMode) return 'R$ ••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (t: TransacaoFinanceira) => {
    if (t.status !== 'pago' && t.status !== 'cancelado' && t.status !== 'lancado' && t.comprovante) {
      return (
        <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-amber-700 bg-amber-50 border border-amber-200/60 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Solicitação de Baixa
        </span>
      );
    }

    switch (t.status) {
      case 'pago':
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pago
          </span>
        );
      case 'lancado':
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-amber-700 bg-amber-50 border border-amber-200/60 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Lançado
          </span>
        );
      case 'vencido':
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-rose-700 bg-rose-50 border border-rose-200/60 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Atrasado
          </span>
        );
      case 'cancelado':
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-stone-500 bg-stone-100 border border-stone-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            Cancelado
          </span>
        );
      case 'aguardando_aprovacao':
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-blue-700 bg-blue-50 border border-blue-200/60 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Aguardando Apr.
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 text-stone-600 bg-stone-100">
            {t.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* 1. Page Header (Estilo Padrão Comercial) */}
      {!hideTopHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Lançamentos Financeiros</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Gestão de contas a pagar e receber, liquidações, comprovantes e conciliação bancária.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {externalEmpresaFiltro === undefined && (
              <select
                value={internalEmpresaFiltro}
                onChange={(e) => setInternalEmpresaFiltro(e.target.value)}
                className="h-9 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
              >
                <option value="Todos">Todas as Empresas</option>
                <option value="Marina Velho Chico">Marina Velho Chico</option>
                <option value="Vale Administradora">Vale Administradora</option>
                <option value="Mexicano">Mexicano</option>
              </select>
            )}

            <button
              type="button"
              onClick={() => fetchData()}
              disabled={isRefreshing}
              className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              title="Sincronizar lançamentos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Atualizando…' : 'Sincronizar'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs"
              title="Importar extrato XML"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Importar XML</span>
            </button>

            <button
              type="button"
              onClick={() => openModal()}
              className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Recebido (Pago)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(totalRecebidos)}</div>
            <div className="text-xs text-stone-400 mt-0.5">Receitas quitadas no período</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">A Receber (Em Aberto)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-blue-700 tabular-nums">{formatCurrency(aReceber)}</div>
            <div className="text-xs text-stone-400 mt-0.5">Previsão em aberto no período</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Em Atraso (Com Juros)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600 tabular-nums">{formatCurrency(totalVencidosComJuros)}</div>
            <div className="text-xs text-stone-400 mt-0.5 truncate">
              {totalAtrasadoJuros > 0 ? `+ ${formatCurrency(totalAtrasadoJuros)} juros/multa` : 'Valores vencidos pendentes'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total de Registros</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-stone-900 tabular-nums">{filteredTransacoes.length}</div>
            <div className="text-xs text-stone-400 mt-0.5">Transações filtradas na lista</div>
          </div>
        </div>
      </div>

      {/* 3. Painel de Filtros Padronizado */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, cliente, embarcação ou valor..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white focus:border-mx-ink transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tipoFilter}
              onChange={e => setTipoFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="receita">Receitas (+)</option>
              <option value="despesa">Despesas (-)</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Quitados</option>
              <option value="lancado">Em Aberto</option>
              <option value="vencido">Em Atraso</option>
              <option value="baixas">Apenas Baixas</option>
              <option value="cancelado">Cancelados</option>
            </select>

            <div className="w-48">
              <Select
                value={{ value: clienteFilter, label: clienteFilter === 'todos' ? 'Todos Clientes' : clientes.find(c => c.id === clienteFilter)?.nome || 'Não encontrado' }}
                onChange={(selected) => setClienteFilter(selected?.value || 'todos')}
                options={[
                  { value: 'todos', label: 'Todos Clientes' },
                  ...clientes.map(c => ({ value: c.id, label: c.nome }))
                ]}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderRadius: '0.5rem',
                    borderColor: state.isFocused ? '#2b1120' : '#e7e5e4',
                    backgroundColor: '#fafaf9',
                    minHeight: '40px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    color: '#292524',
                    boxShadow: 'none'
                  }),
                  menu: (base) => ({ ...base, fontSize: '0.75rem', zIndex: 50 })
                }}
                placeholder="Cliente..."
              />
            </div>
          </div>
        </div>

        {/* Linha secundária de filtros: Período e Limpar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2.5 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-stone-400 font-medium flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            <input
              type="date"
              value={dataInicioFilter}
              onChange={e => setDataInicioFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink"
            />
            <span className="text-stone-400">até</span>
            <input
              type="date"
              value={dataFimFilter}
              onChange={e => setDataFimFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink"
            />
          </div>

          {(searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos' || clienteFilter !== 'todos' || embarcacaoFilter !== 'todos' || dataInicioFilter || dataFimFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setTipoFilter('todos');
                setClienteFilter('todos');
                setEmbarcacaoFilter('todos');
                setDataInicioFilter('');
                setDataFimFilter('');
              }}
              className="h-8 px-2.5 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <XCircle className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. Tabela de Lançamentos */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-stone-400 gap-3">
            <div className="w-8 h-8 border-3 border-mx-ink border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-xs">Carregando dados financeiros...</p>
          </div>
        ) : filteredTransacoes.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-stone-400 gap-2">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-1">
              <Search className="w-5 h-5 text-stone-400" />
            </div>
            <p className="font-semibold text-sm text-stone-800">Nenhum lançamento encontrado.</p>
            <p className="text-xs text-stone-400 max-w-sm text-center">Tente ajustar os filtros ou pesquisar outro termo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cliente / Favorecido</th>
                  <th className="py-3 px-4">Embarcação</th>
                  <th className="py-3 px-4">Categoria / Descrição</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransacoes.map((t) => {
                  const cliente = clientes.find(c => c.id === t.clienteId);
                  const barco = embarcacoes.find(b => b.id === t.embarcacaoId);

                  let nomesEmbarcacoes = barco ? barco.nome : '';
                  if (!nomesEmbarcacoes && cliente) {
                    const clientBoats: string[] = [];
                    if (cliente.embarcacaoId) {
                      const b = embarcacoes.find(x => x.id === cliente.embarcacaoId);
                      if (b) clientBoats.push(b.nome);
                    }
                    if (cliente.embarcacoes?.length) {
                      cliente.embarcacoes.forEach(cb => {
                        if (cb.embarcacaoId !== cliente.embarcacaoId) {
                          const b = embarcacoes.find(x => x.id === cb.embarcacaoId);
                          if (b) clientBoats.push(b.nome);
                        }
                      });
                    }
                    nomesEmbarcacoes = clientBoats.join(' / ');
                  }

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setViewingTransaction(t)}
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        {cliente ? (
                          <div>
                            <span className="font-semibold text-stone-900 block truncate max-w-[200px]">
                              {cliente.nome}
                            </span>
                            {cliente.cpf && (
                              <span className="text-[10px] text-stone-400 block font-mono">
                                {cliente.cpf}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Geral / Não vinculado</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {nomesEmbarcacoes ? (
                          <span className="font-medium text-[11px] text-stone-700 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-md inline-block truncate max-w-[150px]">
                            {nomesEmbarcacoes}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-stone-900 text-xs">{t.categoria}</p>
                        {t.descricao && (
                          <p className="text-[11px] text-stone-500 truncate max-w-xs">{cleanDescription(t.descricao)}</p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-800 text-xs mb-1">
                          {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {getStatusBadge(t)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm tabular-nums ${t.tipo === 'receita' ? 'text-stone-900' : 'text-rose-700'}`}>
                            {t.tipo === 'despesa' && '- '}{formatCurrency(Number(t.valor))}
                          </span>
                          {(() => {
                            const { days, interest } = calculateTransactionInterest(t);
                            if (days > 0) {
                              return (
                                <span className="text-[10px] text-rose-600 font-bold mt-0.5 tabular-nums">
                                  + {formatCurrency(interest)} ({days}d)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingTransaction(t)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Transação */}
      {viewingTransaction && (
        <TransactionDetailsModal
          transacao={viewingTransaction}
          cliente={clientes.find(c => c.id === viewingTransaction.clienteId)}
          embarcacao={embarcacoes.find(b => b.id === viewingTransaction.embarcacaoId)}
          onClose={() => setViewingTransaction(null)}
          onEdit={() => {
            setViewingTransaction(null);
            openModal(viewingTransaction);
          }}
          onDelete={() => {
            setViewingTransaction(null);
            handleDelete(viewingTransaction.id);
          }}
          onApprove={() => {
            handleAprovarLancamento(viewingTransaction);
            setViewingTransaction(null);
          }}
          onConfirmPayment={() => {
            handleConfirmarBaixa(viewingTransaction);
            setViewingTransaction(null);
          }}
          onUploadReceipt={(e) => {
            handleUploadFile(viewingTransaction, e);
          }}
          isUploading={isUploading[viewingTransaction.id] || false}
          onGenerateAsaas={async (billingType) => {
            try {
              const token = localStorage.getItem('admin_token');
              const res = await fetch(`/api/financeiro/transacoes/${viewingTransaction.id}/gerar-asaas`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ billingType })
              });
              const json = await res.json();
              if (json.success) {
                const updatedTx = {
                  ...viewingTransaction,
                  asaasPaymentId: json.asaasPaymentId,
                  asaasPaymentUrl: json.asaasPaymentUrl
                };
                setViewingTransaction(updatedTx);
                setTransacoes(prev => prev.map(t => t.id === viewingTransaction.id ? updatedTx : t));
                alert("Cobrança Asaas gerada com sucesso!");
              } else {
                alert(`Erro: ${json.message || "Erro desconhecido"}`);
              }
            } catch (err: any) {
              alert(`Erro ao conectar com servidor: ${err.message}`);
            }
          }}
        />
      )}

      {/* Modais */}
      <ImportXMLModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => fetchData()}
        clientes={clientes}
        embarcacoes={embarcacoes}
        planosContas={planosContas}
        fornecedores={fornecedores}
        centrosDeCusto={centrosCusto}
      />

      <FinanceLancamentoDrawer
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveLancamentos}
        editingItem={editingItem}
        defaultEmpresa={empresaFiltro}
        planosContas={planosContas}
        centrosCusto={centrosCusto}
        clientes={clientes}
        fornecedores={fornecedores}
        contasBancarias={contasBancarias}
        embarcacoes={embarcacoes}
      />
    </div>
  );
}
