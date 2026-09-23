import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Ship, 
  User, 
  Wrench, 
  ArrowRight, 
  FileText,
  X,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Tag,
  Trash2,
  Check,
  Eye,
  Info,
  Calendar,
  AlertCircle,
  Activity,
  ArrowUpRight,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import Select from 'react-select';
import { Chamado, Embarcacao, Cliente, Manutencao } from '../types';
import { getBoatCode, getBoatLabel } from '../utils/boatUtils';
import { chamadoDB, boatDB, clientDB, maintenanceDB } from '../db';

interface MarinaChamadosViewProps {
  operadorNome?: string;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export default function MarinaChamadosView({ operadorNome, showToast }: MarinaChamadosViewProps) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aguardando' | 'os_gerada' | 'concluido' | 'descartado'>('todos');
  const [solicitanteFilter, setSolicitanteFilter] = useState<'marina_todos' | 'gerente' | 'operador' | 'todos_sistema'>('marina_todos');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('todos');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChamadoDetails, setSelectedChamadoDetails] = useState<Chamado | null>(null);

  // New Chamado Form State
  const [newChamadoForm, setNewChamadoForm] = useState({
    embarcacaoId: '',
    solicitanteTipo: 'gerente' as 'gerente' | 'operador',
    solicitanteNome: operadorNome || '',
    titulo: '',
    descricaoAvaria: '',
    urgencia: 'media' as Chamado['urgencia']
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(() => {
    setChamados(chamadoDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setClientes(clientDB.getAll());
    setManutencoes(maintenanceDB.getAll());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Set default manager name when prop is available
  useEffect(() => {
    if (operadorNome && !newChamadoForm.solicitanteNome) {
      setNewChamadoForm(prev => ({
        ...prev,
        solicitanteNome: operadorNome
      }));
    }
  }, [operadorNome]);

  // Filtered Chamados List
  const filteredChamados = useMemo(() => {
    return chamados.filter(c => {
      const boat = embarcacoes.find(b => b.id === c.embarcacaoId);
      const client = clientes.find(cli => cli.id === (c.clienteId || boat?.clienteId));
      
      const matchesSearch =
        (c.codigoChamado || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.descricaoAvaria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.solicitanteNome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (boat && (
          (boat.nome && boat.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (boat.numero && String(boat.numero).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (getBoatCode(boat).toLowerCase().includes(searchTerm.toLowerCase()))
        )) ||
        (client && (client.nome || '').toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'aguardando') {
        matchesStatus = c.status === 'pendente' || c.status === 'em_analise';
      } else if (statusFilter === 'os_gerada') {
        matchesStatus = c.status === 'os_gerada';
      } else if (statusFilter === 'concluido') {
        matchesStatus = c.status === 'concluido';
      } else if (statusFilter === 'descartado') {
        matchesStatus = c.status === 'descartado' || c.status === 'rejeitado';
      }

      // Solicitante filter
      let matchesSolicitante = true;
      if (solicitanteFilter === 'marina_todos') {
        matchesSolicitante = c.solicitanteTipo === 'gerente' || c.solicitanteTipo === 'operador';
      } else if (solicitanteFilter === 'gerente') {
        matchesSolicitante = c.solicitanteTipo === 'gerente';
      } else if (solicitanteFilter === 'operador') {
        matchesSolicitante = c.solicitanteTipo === 'operador';
      }

      // Urgency filter
      const matchesUrgencia = urgenciaFilter === 'todos' || c.urgencia === urgenciaFilter;

      return matchesSearch && matchesStatus && matchesSolicitante && matchesUrgencia;
    });
  }, [chamados, embarcacoes, clientes, searchTerm, statusFilter, solicitanteFilter, urgenciaFilter]);

  // Metrics for Marina Team
  const marinaChamados = useMemo(() => {
    return chamados.filter(c => c.solicitanteTipo === 'gerente' || c.solicitanteTipo === 'operador');
  }, [chamados]);

  const metrics = useMemo(() => {
    return {
      totalMarina: marinaChamados.length,
      aguardando: marinaChamados.filter(c => c.status === 'pendente' || c.status === 'em_analise').length,
      osAtivas: marinaChamados.filter(c => c.status === 'os_gerada').length,
      concluidos: marinaChamados.filter(c => c.status === 'concluido').length,
      descartados: marinaChamados.filter(c => c.status === 'descartado' || c.status === 'rejeitado').length,
      criadosGerente: chamados.filter(c => c.solicitanteTipo === 'gerente').length,
      criadosOperador: chamados.filter(c => c.solicitanteTipo === 'operador').length
    };
  }, [chamados, marinaChamados]);

  // Boat Options for React-Select
  const boatOptions = useMemo(() => {
    return embarcacoes.map(b => {
      const client = clientes.find(c => c.id === b.clienteId);
      const code = getBoatCode(b);
      return {
        value: b.id,
        label: `${code} - ${b.nome || 'Sem Nome'} (${b.modelo || (b.tipo === 'jet' ? 'Jet Ski' : 'Lancha')}) ${client ? `• ${client.nome}` : ''}`,
        boat: b,
        client: client
      };
    });
  }, [embarcacoes, clientes]);

  const selectedBoatOption = useMemo(() => {
    return boatOptions.find(opt => opt.value === newChamadoForm.embarcacaoId) || null;
  }, [boatOptions, newChamadoForm.embarcacaoId]);

  // Create Chamado Handler
  const handleCreateChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChamadoForm.embarcacaoId) {
      if (showToast) showToast('Selecione uma embarcação.', 'warning');
      else alert('Selecione uma embarcação.');
      return;
    }
    if (!newChamadoForm.titulo.trim()) {
      if (showToast) showToast('Informe o título da avaria/serviço.', 'warning');
      else alert('Informe o título da avaria/serviço.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedBoat = embarcacoes.find(b => b.id === newChamadoForm.embarcacaoId);
      const requesterName = newChamadoForm.solicitanteNome.trim() || 
        (newChamadoForm.solicitanteTipo === 'gerente' ? (operadorNome || 'Gerência da Marina') : 'Operador do Píer');

      const created = await chamadoDB.create({
        embarcacaoId: newChamadoForm.embarcacaoId,
        solicitanteTipo: newChamadoForm.solicitanteTipo,
        solicitanteNome: requesterName,
        clienteId: selectedBoat?.clienteId,
        titulo: newChamadoForm.titulo.trim(),
        descricaoAvaria: newChamadoForm.descricaoAvaria.trim() || 'Solicitação aberta pela gerência da marina.',
        urgencia: newChamadoForm.urgencia,
        status: 'pendente',
        dataAbertura: new Date().toISOString().split('T')[0]
      });

      if (showToast) {
        showToast(`Chamado ${created.codigoChamado} enviado para Peças & Serviços!`, 'success');
      }

      // Reset form
      setNewChamadoForm({
        embarcacaoId: '',
        solicitanteTipo: 'gerente',
        solicitanteNome: operadorNome || '',
        titulo: '',
        descricaoAvaria: '',
        urgencia: 'media'
      });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      if (showToast) showToast(`Erro ao criar chamado: ${err.message || 'Erro inesperado'}`, 'warning');
      else alert(`Erro ao criar chamado: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apagar / Excluir Chamado Permanentemente
  const handleDeleteChamado = (chamado: Chamado) => {
    const linkedOS = manutencoes.find(m => m.chamadoId === chamado.id || m.id === chamado.osId);
    
    let confirmMsg = `Deseja realmente apagar o chamado ${chamado.codigoChamado} (${chamado.titulo})?`;
    if (linkedOS) {
      confirmMsg += `\n\n⚠️ Atenção: Este chamado possui uma Ordem de Serviço vinculada (${linkedOS.codigoOS || linkedOS.id}). A exclusão removerá o registro do chamado do sistema. Deseja continuar?`;
    }

    if (window.confirm(confirmMsg)) {
      try {
        chamadoDB.delete(chamado.id);
        
        if (linkedOS) {
          maintenanceDB.update(linkedOS.id, {
            chamadoId: undefined
          });
        }

        if (showToast) {
          showToast(`Chamado ${chamado.codigoChamado} apagado com sucesso!`, 'info');
        } else {
          alert(`Chamado ${chamado.codigoChamado} apagado com sucesso!`);
        }

        setSelectedChamadoDetails(null);
        loadData();
      } catch (err: any) {
        if (showToast) {
          showToast(`Erro ao apagar chamado: ${err.message || 'Erro inesperado'}`, 'warning');
        } else {
          alert(`Erro ao apagar chamado: ${err.message || 'Erro inesperado'}`);
        }
      }
    }
  };

  // Helper to format date
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper for Status Badge Details
  const getStatusBadge = (status: Chamado['status']) => {
    switch (status) {
      case 'pendente':
        return {
          label: 'Aguardando Oficina',
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500',
          icon: Clock,
          desc: 'Enviado para Peças & Serviços. Aguardando triagem da oficina.'
        };
      case 'em_analise':
        return {
          label: 'Em Triagem / Análise',
          bg: 'bg-orange-50 text-orange-700 border-orange-200/80',
          dot: 'bg-orange-500',
          icon: Activity,
          desc: 'A equipe mecânica está analisando a avaria e avaliando serviço.'
        };
      case 'os_gerada':
        return {
          label: 'Em Manutenção (OS Aberta)',
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-600',
          icon: Wrench,
          desc: 'Convertido em Ordem de Serviço. Em execução no pátio/oficina.'
        };
      case 'concluido':
        return {
          label: 'Serviço Concluído',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
          desc: 'Manutenção finalizada pela oficina de Peças & Serviços.'
        };
      case 'descartado':
      case 'rejeitado':
        return {
          label: 'Cancelado / Descartado',
          bg: 'bg-red-50 text-red-700 border-red-200/80',
          dot: 'bg-red-500',
          icon: X,
          desc: 'Chamado cancelado ou recusado sem geração de Ordem de Serviço.'
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: Info,
          desc: ''
        };
    }
  };

  // Helper for Urgency Badge
  const getUrgencyBadge = (urgencia: Chamado['urgencia']) => {
    switch (urgencia) {
      case 'critica':
        return {
          label: 'Crítica (Fora de Operação)',
          bg: 'bg-red-100 text-red-800 border-red-300',
          badgeBg: 'bg-red-600 text-white'
        };
      case 'alta':
        return {
          label: 'Alta (Impedimento)',
          bg: 'bg-orange-100 text-orange-800 border-orange-300',
          badgeBg: 'bg-orange-600 text-white'
        };
      case 'media':
        return {
          label: 'Média (Ajuste/Reparo)',
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          badgeBg: 'bg-amber-600 text-white'
        };
      case 'baixa':
      default:
        return {
          label: 'Baixa (Rotina/Revisão)',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          badgeBg: 'bg-slate-600 text-white'
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-3 h-3 text-blue-600" />
              Peças & Serviços ↔ Marina
            </span>
            <span className="text-xs font-semibold text-slate-400">• Painel de Chamados</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Chamados de Serviços e Manutenção
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Envie solicitações de reparos diretamente para a oficina e acompanhe o andamento dos chamados gerados pela Gerência e Operadores.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Atualizar lista de chamados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Chamado de Serviço</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total da Marina */}
        <button
          onClick={() => { setStatusFilter('todos'); setSolicitanteFilter('marina_todos'); }}
          className={`p-4 bg-white rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'todos' && solicitanteFilter === 'marina_todos'
              ? 'ring-2 ring-blue-600 border-blue-600 shadow-xs' 
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Enviados (Marina)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalMarina}</div>
          <span className="text-[11px] font-medium text-slate-400 mt-1 block truncate">
            {metrics.criadosGerente} Gerente • {metrics.criadosOperador} Operadores
          </span>
        </button>

        {/* Aguardando Triagem */}
        <button
          onClick={() => setStatusFilter('aguardando')}
          className={`p-4 bg-white rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'aguardando'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 shadow-xs' 
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Aguardando Oficina</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.aguardando}</div>
          <span className="text-[11px] font-bold text-amber-600 mt-1 block truncate">
            Pendente de triagem técnica
          </span>
        </button>

        {/* Em Manutenção / OS Aberta */}
        <button
          onClick={() => setStatusFilter('os_gerada')}
          className={`p-4 bg-white rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'os_gerada'
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-xs' 
              : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Em Manutenção</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.osAtivas}</div>
          <span className="text-[11px] font-bold text-blue-600 mt-1 block truncate">
            Ordem de Serviço em execução
          </span>
        </button>

        {/* Serviços Concluídos */}
        <button
          onClick={() => setStatusFilter('concluido')}
          className={`p-4 bg-white rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'concluido'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20 shadow-xs' 
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Finalizados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.concluidos}</div>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block truncate">
            Baixa e entrega efetuadas
          </span>
        </button>

      </div>

      {/* ── Filters and Search Toolbar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Buscar por código (CHM-...), embarcação, cliente, avaria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Solicitante / Origem Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Origem:
            </span>
            {[
              { id: 'marina_todos', label: 'Toda Marina' },
              { id: 'gerente', label: 'Gerência' },
              { id: 'operador', label: 'Operadores' },
              { id: 'todos_sistema', label: 'Todos do Sistema' }
            ].map(sol => (
              <button
                key={sol.id}
                onClick={() => setSolicitanteFilter(sol.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  solicitanteFilter === sol.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sol.label}
              </button>
            ))}
          </div>

        </div>

        {/* Status & Urgency Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'aguardando', label: 'Aguardando Oficina' },
              { id: 'os_gerada', label: 'Em Manutenção (OS)' },
              { id: 'concluido', label: 'Concluídos' },
              { id: 'descartado', label: 'Cancelados' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? st.id === 'descartado'
                      ? 'bg-red-500 text-white shadow-2xs'
                      : st.id === 'concluido'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">Urgência:</span>
            {['todos', 'critica', 'alta', 'media', 'baixa'].map(urg => (
              <button
                key={urg}
                onClick={() => setUrgenciaFilter(urg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  urgenciaFilter === urg
                    ? urg === 'critica' || urg === 'alta'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {urg === 'todos' ? 'Todas' : urg}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* ── Chamados List / Grid ── */}
      {filteredChamados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Nenhum chamado encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Não há solicitações de serviços correspondentes aos filtros selecionados ou nenhum chamado foi aberto recentemente.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Abrir Primeiro Chamado</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChamados.map(chamado => {
            const boat = embarcacoes.find(b => b.id === chamado.embarcacaoId);
            const client = clientes.find(c => c.id === (chamado.clienteId || boat?.clienteId));
            const statusInfo = getStatusBadge(chamado.status);
            const urgencyInfo = getUrgencyBadge(chamado.urgencia);
            const isMarinaOrigin = chamado.solicitanteTipo === 'gerente' || chamado.solicitanteTipo === 'operador';

            return (
              <div
                key={chamado.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Card Top: Code + Origin Badge + Urgency */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {chamado.codigoChamado}
                        </span>
                        {isMarinaOrigin && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            chamado.solicitanteTipo === 'gerente' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          }`}>
                            {chamado.solicitanteTipo === 'gerente' ? 'Gerência' : 'Operador'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Aberto em {formatDateDisplay(chamado.dataAbertura)}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${urgencyInfo.bg}`}>
                      {chamado.urgencia}
                    </span>
                  </div>

                  {/* Embarcação & Cliente Box */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-100 space-y-2 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center shrink-0 font-black text-xs">
                        <Ship className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                          <span className="text-blue-700 font-extrabold">{getBoatCode(boat)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="truncate">{boat?.nome || 'Embarcação'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium truncate block">
                          {boat?.modelo || (boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha')}
                          {client ? ` • ${client.nome}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> Solicitante:
                      </span>
                      <strong className="text-slate-700 font-semibold truncate max-w-[140px]">
                        {chamado.solicitanteNome}
                      </strong>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                      {chamado.titulo}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100/80">
                      "{chamado.descricaoAvaria}"
                    </p>
                  </div>

                  {/* Feedback / Workshop Observations alert if present */}
                  {chamado.observacoesAnalise && (
                    <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <strong className="font-bold block text-amber-800">Parecer da Oficina:</strong>
                        <p className="line-clamp-2 text-amber-900/90">{chamado.observacoesAnalise}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Status Badge + Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shrink-0 ${statusInfo.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    <span>{statusInfo.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChamado(chamado);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                      title="Apagar chamado permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChamadoDetails(chamado)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>Detalhes</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ABERTURA DE NOVO CHAMADO ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    Abrir Chamado de Serviço
                  </h2>
                  <p className="text-xs text-slate-500">
                    Envio direto para triagem e atendimento da equipe de Peças & Serviços
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateChamado} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Select Embarcação */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Embarcação / Vaga <span className="text-red-500">*</span>
                </label>
                <Select
                  options={boatOptions}
                  value={selectedBoatOption}
                  onChange={(selected) => {
                    setNewChamadoForm(prev => ({
                      ...prev,
                      embarcacaoId: selected ? selected.value : ''
                    }));
                  }}
                  placeholder="Pesquise por código (M01), nome da lancha, modelo ou proprietário..."
                  isSearchable
                  className="text-xs font-semibold"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      padding: '2px 4px',
                      borderColor: state.isFocused ? '#2563eb' : '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                    })
                  }}
                />
              </div>

              {/* Solicitante & Urgência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Perfil Solicitante <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newChamadoForm.solicitanteTipo}
                    onChange={(e) => setNewChamadoForm(prev => ({ 
                      ...prev, 
                      solicitanteTipo: e.target.value as 'gerente' | 'operador' 
                    }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="gerente">Gerência da Marina (Gerente)</option>
                    <option value="operador">Operador do Píer / Marinheiro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Urgência do Serviço <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newChamadoForm.urgencia}
                    onChange={(e) => setNewChamadoForm(prev => ({ 
                      ...prev, 
                      urgencia: e.target.value as Chamado['urgencia'] 
                    }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="baixa">Baixa (Rotina / Manutenção Preventiva)</option>
                    <option value="media">Média (Ajuste / Barco Operável)</option>
                    <option value="alta">Alta (Impedimento Parcial / Agendado)</option>
                    <option value="critica">Crítica (Impedimento Total / Fora de Operação)</option>
                  </select>
                </div>

              </div>

              {/* Nome do Solicitante Responsável */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Solicitante Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos (Gerente) ou Nome do Operador..."
                  value={newChamadoForm.solicitanteNome}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, solicitanteNome: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Título do Problema / Serviço */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Título da Solicitação / Avaria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vazamento de óleo no motor, Bateria sem carga, Troca de hélice..."
                  value={newChamadoForm.titulo}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* Descrição Detalhada */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição da Avaria & Observações para a Oficina
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva detalhadamente o sintoma, barulho, anomalia detectada ou pedido do proprietário para auxiliar na triagem mecânica..."
                  value={newChamadoForm.descricaoAvaria}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, descricaoAvaria: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 resize-none leading-relaxed"
                />
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Ao enviar, este chamado entrará em tempo real na fila de triagem da oficina mecânica de <strong>Peças & Serviços</strong> para avaliação e abertura da Ordem de Serviço (OS).
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Chamado para Oficina'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: DETALHES & HISTÓRICO DO CHAMADO ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {selectedChamadoDetails && (() => {
        const boat = embarcacoes.find(b => b.id === selectedChamadoDetails.embarcacaoId);
        const client = clientes.find(c => c.id === (selectedChamadoDetails.clienteId || boat?.clienteId));
        const statusInfo = getStatusBadge(selectedChamadoDetails.status);
        const urgencyInfo = getUrgencyBadge(selectedChamadoDetails.urgencia);
        const linkedOS = manutencoes.find(m => m.chamadoId === selectedChamadoDetails.id || m.id === selectedChamadoDetails.osId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {selectedChamadoDetails.codigoChamado}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${urgencyInfo.bg}`}>
                        Urgência: {selectedChamadoDetails.urgencia}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Aberto em {formatDateDisplay(selectedChamadoDetails.dataAbertura)} por {selectedChamadoDetails.solicitanteNome}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedChamadoDetails(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                
                {/* ── Status Flow Stepper ── */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Fluxo do Chamado na Oficina
                  </span>
                  
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    
                    {/* Step 1: Aberto */}
                    <div className="space-y-1.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-xs">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 block text-[11px]">1. Aberto</span>
                      <span className="text-[9px] text-slate-400 font-medium block">Pela Marina</span>
                    </div>

                    {/* Step 2: Triagem */}
                    <div className="space-y-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold shadow-xs ${
                        selectedChamadoDetails.status === 'pendente'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : selectedChamadoDetails.status === 'descartado' || selectedChamadoDetails.status === 'rejeitado'
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {selectedChamadoDetails.status === 'pendente' ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                      </div>
                      <span className="font-bold text-slate-800 block text-[11px]">2. Triagem</span>
                      <span className="text-[9px] text-slate-400 font-medium block">Peças & Serv.</span>
                    </div>

                    {/* Step 3: Ordem de Serviço */}
                    <div className="space-y-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold shadow-xs ${
                        selectedChamadoDetails.status === 'os_gerada'
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : selectedChamadoDetails.status === 'concluido'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        {selectedChamadoDetails.status === 'concluido' ? <Check className="w-4 h-4" /> : <Wrench className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold text-slate-800 block text-[11px]">3. Em Manutenção</span>
                      <span className="text-[9px] text-slate-400 font-medium block">OS no Kanban</span>
                    </div>

                    {/* Step 4: Concluído */}
                    <div className="space-y-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold shadow-xs ${
                        selectedChamadoDetails.status === 'concluido'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 block text-[11px]">4. Concluído</span>
                      <span className="text-[9px] text-slate-400 font-medium block">Baixa Efetuada</span>
                    </div>

                  </div>
                </div>

                {/* Status Callout Card */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${statusInfo.bg}`}>
                  <statusInfo.icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm">{statusInfo.label}</h4>
                    <p className="text-xs opacity-90 mt-0.5">{statusInfo.desc}</p>
                    {linkedOS && (
                      <p className="text-xs font-bold mt-2">
                        OS Vinculada: <span className="font-mono">{linkedOS.codigoOS || linkedOS.id}</span> ({linkedOS.tituloChamado || 'Manutenção Geral'})
                      </p>
                    )}
                  </div>
                </div>

                {/* Embarcação & Cliente Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Ship className="w-3.5 h-3.5 text-blue-600" /> Embarcação
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      {getBoatCode(boat)} - {boat?.nome || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Modelo: {boat?.modelo || (boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha')}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-600" /> Proprietário / Cliente
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      {client?.nome || 'Não associado'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {client?.telefone ? `Tel: ${client.telefone}` : 'Sem telefone informado'}
                    </p>
                  </div>
                </div>

                {/* Título & Descrição Completa */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Título da Avaria
                  </h4>
                  <p className="text-sm font-extrabold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {selectedChamadoDetails.titulo}
                  </p>

                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">
                    Descrição Detalhada do Problema
                  </h4>
                  <p className="text-xs text-slate-700 p-3.5 bg-slate-50 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selectedChamadoDetails.descricaoAvaria}
                  </p>
                </div>

                {/* Parecer Técnico da Oficina */}
                {selectedChamadoDetails.observacoesAnalise && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" /> Parecer Técnico de Peças & Serviços
                    </h4>
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-900 font-medium leading-relaxed">
                      {selectedChamadoDetails.observacoesAnalise}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
                <button
                  type="button"
                  onClick={() => handleDeleteChamado(selectedChamadoDetails)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
                  title="Apagar este chamado permanentemente"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Apagar Chamado</span>
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChamadoDetails(null)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
