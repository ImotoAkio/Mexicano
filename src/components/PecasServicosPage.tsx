import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ship,
  Search,
  RefreshCw,
  ClipboardList,
  FileText,
  Clock,
  CheckCircle,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  Filter,
  ArrowRight,
  Sparkles,
  Package,
  X
} from 'lucide-react';
import { Chamado, Embarcacao, Cliente, Manutencao, Mecanico, Fornecedor } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { chamadoDB, boatDB, clientDB, maintenanceDB, mecanicoDB, fornecedorDB } from '../db';
import UserAvatarMenu from './header/UserAvatarMenu';
import ServicoDetalhesModal from './pecas/ServicoDetalhesModal';
import FornecedoresModal from './pecas/FornecedoresModal';

// ─── Tab definitions ───
type TabId = 'triagem' | 'orcamento' | 'aprovacao' | 'execucao' | 'finalizados';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  bgActive: string;
  borderActive: string;
}

const TABS: TabDef[] = [
  { id: 'triagem',     label: 'Triagem',       icon: ClipboardList, color: 'text-amber-600',   bgActive: 'bg-amber-50',   borderActive: 'border-amber-500' },
  { id: 'orcamento',   label: 'Orçamento',     icon: DollarSign,    color: 'text-blue-600',    bgActive: 'bg-blue-50',    borderActive: 'border-blue-500' },
  { id: 'aprovacao',   label: 'Aprovação',     icon: Clock,         color: 'text-orange-600',  bgActive: 'bg-orange-50',  borderActive: 'border-orange-500' },
  { id: 'execucao',    label: 'Em Serviço',    icon: Wrench,        color: 'text-purple-600',  bgActive: 'bg-purple-50',  borderActive: 'border-purple-500' },
  { id: 'finalizados', label: 'Finalizados',   icon: CheckCircle,   color: 'text-emerald-600', bgActive: 'bg-emerald-50', borderActive: 'border-emerald-500' },
];

// ─── Urgency helpers ───
function urgencyBadge(urgencia: string) {
  const map: Record<string, string> = {
    critica: 'bg-red-100 text-red-800 border-red-200',
    alta:    'bg-orange-100 text-orange-800 border-orange-200',
    media:   'bg-amber-100 text-amber-800 border-amber-200',
    baixa:   'bg-slate-100 text-slate-700 border-slate-200',
  };
  return map[urgencia] || map.baixa;
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    pendente:              { label: 'Pendente',              cls: 'text-amber-700 bg-amber-50 border-amber-200',     Icon: Clock },
    em_analise:            { label: 'Em Análise',            cls: 'text-blue-700 bg-blue-50 border-blue-200',       Icon: Search },
    aguardando_orcamento:  { label: 'Aguardando Orçamento',  cls: 'text-blue-700 bg-blue-50 border-blue-200',       Icon: DollarSign },
    aguardando_aprovacao:  { label: 'Aguardando Aprovação',  cls: 'text-orange-700 bg-orange-50 border-orange-200', Icon: Clock },
    em_execucao:           { label: 'Em Execução',           cls: 'text-purple-700 bg-purple-50 border-purple-200', Icon: Wrench },
    concluido:             { label: 'Concluído',             cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle },
    os_gerada:             { label: 'OS Gerada',             cls: 'text-teal-700 bg-teal-50 border-teal-200',       Icon: FileText },
    reprovado:             { label: 'Reprovado',             cls: 'text-red-700 bg-red-50 border-red-200',          Icon: X },
  };
  const s = map[status] || { label: status, cls: 'text-slate-700 bg-slate-50 border-slate-200', Icon: Clock };
  return s;
}

// ─── Main Component ───
export default function PecasServicosPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showFornecedoresModal, setShowFornecedoresModal] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('triagem');
  const [searchTerm, setSearchTerm] = useState('');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('todos');

  // Modal state
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [selectedOS, setSelectedOS] = useState<Manutencao | null>(null);

  const loadData = useCallback(() => {
    setChamados(chamadoDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setClientes(clientDB.getAll());
    setManutencoes(maintenanceDB.getAll());
    setMecanicos(mecanicoDB.getAll());
    setFornecedores(fornecedorDB.getAll());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── Metrics ───
  const metrics = useMemo(() => {
    const activeChamados = chamados.filter(c => c.status === 'pendente' || c.status === 'em_analise');
    const aguardandoOrc = manutencoes.filter(m => m.status === 'aguardando_orcamento');
    const aguardandoAprov = manutencoes.filter(m => m.status === 'aguardando_aprovacao');
    const emExecucao = manutencoes.filter(m => m.status === 'em_execucao');
    const concluidos = manutencoes.filter(m => m.status === 'concluido');

    return {
      triagem: activeChamados.length,
      orcamento: aguardandoOrc.length,
      aprovacao: aguardandoAprov.length,
      execucao: emExecucao.length,
      finalizados: concluidos.length,
    };
  }, [chamados, manutencoes]);

  // ─── Items for active tab ───
  type CardItem = { type: 'chamado'; data: Chamado } | { type: 'os'; data: Manutencao };

  const tabItems = useMemo((): CardItem[] => {
    let items: CardItem[] = [];

    if (activeTab === 'triagem') {
      items = chamados
        .filter(c => c.status === 'pendente' || c.status === 'em_analise')
        .map(c => ({ type: 'chamado' as const, data: c }));
    } else if (activeTab === 'orcamento') {
      items = manutencoes
        .filter(m => m.status === 'aguardando_orcamento')
        .map(m => ({ type: 'os' as const, data: m }));
    } else if (activeTab === 'aprovacao') {
      items = manutencoes
        .filter(m => m.status === 'aguardando_aprovacao')
        .map(m => ({ type: 'os' as const, data: m }));
    } else if (activeTab === 'execucao') {
      items = manutencoes
        .filter(m => m.status === 'em_execucao')
        .map(m => ({ type: 'os' as const, data: m }));
    } else if (activeTab === 'finalizados') {
      items = manutencoes
        .filter(m => m.status === 'concluido')
        .map(m => ({ type: 'os' as const, data: m }));
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'chamado') {
          const c = item.data;
          const boat = embarcacoes.find(b => b.id === c.embarcacaoId);
          return (
            (c.codigoChamado || '').toLowerCase().includes(term) ||
            (c.titulo || '').toLowerCase().includes(term) ||
            (c.descricaoAvaria || '').toLowerCase().includes(term) ||
            (c.solicitanteNome || '').toLowerCase().includes(term) ||
            (boat?.nome || '').toLowerCase().includes(term) ||
            getBoatCode(boat).toLowerCase().includes(term)
          );
        } else {
          const m = item.data;
          const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
          return (
            (m.codigoOS || '').toLowerCase().includes(term) ||
            (m.tituloChamado || '').toLowerCase().includes(term) ||
            (m.descricaoServico || '').toLowerCase().includes(term) ||
            (m.oficinaNome || '').toLowerCase().includes(term) ||
            (boat?.nome || '').toLowerCase().includes(term) ||
            getBoatCode(boat).toLowerCase().includes(term)
          );
        }
      });
    }

    // Apply urgency filter
    if (urgenciaFilter !== 'todos') {
      items = items.filter(item => {
        const urg = item.type === 'chamado' ? item.data.urgencia : item.data.urgencia;
        return urg === urgenciaFilter;
      });
    }

    return items;
  }, [activeTab, chamados, manutencoes, embarcacoes, searchTerm, urgenciaFilter]);

  // ─── Handle card click ───
  const handleCardClick = (item: CardItem) => {
    if (item.type === 'chamado') {
      setSelectedChamado(item.data);
      setSelectedOS(null);
    } else {
      setSelectedOS(item.data);
      setSelectedChamado(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedChamado(null);
    setSelectedOS(null);
    loadData();
  };

  // ─── Tab badge count ───
  function getTabCount(tabId: TabId): number {
    return metrics[tabId] || 0;
  }

  // ─── Render ───
  return (
    <div className="flex h-full min-h-0 w-full bg-[#f3f7f5] flex-col overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="bg-[#f3f7f5] border-b border-slate-200/60 p-4 sm:p-6 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <span>Peças & Serviços</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Painel de Manutenções</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Painel de Manutenções
            </h1>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={() => setShowFornecedoresModal(true)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Gerenciar Fornecedores, Prestadores de Serviço e Oficinas"
            >
              <Building2 className="w-3.5 h-3.5 text-[#186b77]" />
              <span className="hidden sm:inline">Fornecedores & Oficinas</span>
              <span className="bg-[#186b77]/10 text-[#186b77] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                {fornecedores.length}
              </span>
            </button>
            <button
              onClick={loadData}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Atualizar Dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TABS.map(tab => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
                  isActive
                    ? `ring-2 ${tab.borderActive} ${tab.bgActive} shadow-xs ring-offset-0`
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between mb-1 ${tab.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                  <TabIcon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">{count}</div>
                <span className={`text-[11px] font-bold mt-1 block truncate ${tab.color}`}>
                  {tab.id === 'triagem' && 'Chamados para analisar'}
                  {tab.id === 'orcamento' && 'Aguardando valores'}
                  {tab.id === 'aprovacao' && 'Aguardando sócios'}
                  {tab.id === 'execucao' && 'Oficina trabalhando'}
                  {tab.id === 'finalizados' && 'Serviços concluídos'}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tabs + Search Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">

          {/* Tab Strip */}
          <div className="flex border-b border-slate-200/80 overflow-x-auto w-full">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const count = getTabCount(tab.id);
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap cursor-pointer text-center ${
                    isActive
                      ? `${tab.color} ${tab.borderActive} ${tab.bgActive}`
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      isActive ? 'bg-white/80 text-slate-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + Filter Bar */}
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                placeholder="Buscar por código, embarcação, oficina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#186b77] outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Urgência:
              </span>
              {['todos', 'baixa', 'media', 'alta', 'critica'].map((urg) => (
                <button
                  key={urg}
                  onClick={() => setUrgenciaFilter(urg)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    urgenciaFilter === urg
                      ? urg === 'critica' || urg === 'alta' ? 'bg-red-500 text-white shadow-2xs' : 'bg-[#186b77] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {urg === 'todos' ? 'Todas' : urg}
                </button>
              ))}
            </div>
          </div>

          {/* ── Card Grid ── */}
          <div className="p-4">
            {tabItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-extrabold text-slate-800 text-base">
                  {activeTab === 'triagem' ? 'Nenhum chamado pendente' :
                   activeTab === 'finalizados' ? 'Nenhum serviço finalizado' :
                   'Nenhum serviço nesta etapa'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeTab === 'triagem'
                    ? 'Todos os chamados foram triados. Novas avarias aparecerão aqui automaticamente.'
                    : 'Os serviços avançam de etapa conforme o fluxo de aprovação e execução.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {tabItems.map(item => {
                  if (item.type === 'chamado') {
                    return <ChamadoCard key={item.data.id} chamado={item.data} embarcacoes={embarcacoes} onClick={() => handleCardClick(item)} />;
                  } else {
                    return <OSCard key={item.data.id} os={item.data} embarcacoes={embarcacoes} chamados={chamados} onClick={() => handleCardClick(item)} />;
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal: Detalhes do Serviço ── */}
      {(selectedChamado || selectedOS) && (
        <ServicoDetalhesModal
          chamado={selectedChamado}
          os={selectedOS}
          embarcacoes={embarcacoes}
          clientes={clientes}
          chamados={chamados}
          manutencoes={manutencoes}
          mecanicos={mecanicos}
          fornecedores={fornecedores}
          onClose={handleCloseModal}
          onRefresh={loadData}
        />
      )}

      {/* ── Modal: Gestão de Fornecedores ── */}
      {showFornecedoresModal && (
        <FornecedoresModal
          onClose={() => {
            setShowFornecedoresModal(false);
            loadData();
          }}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

// ─── Sub-components: Card renderers ───

function ChamadoCard({
  chamado,
  embarcacoes,
  onClick
}: {
  chamado: Chamado;
  embarcacoes: Embarcacao[];
  onClick: () => void;
}) {
  const boat = embarcacoes.find(b => b.id === chamado.embarcacaoId);
  const st = statusLabel(chamado.status);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-xs text-[#186b77] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
              {chamado.codigoChamado}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {new Date(chamado.dataAbertura).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 line-clamp-2">
            {chamado.titulo}
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${urgencyBadge(chamado.urgencia)}`}>
          {chamado.urgencia}
        </span>
      </div>

      {/* Boat info */}
      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
            <Ship className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{getBoatCode(boat)}</div>
            <span className="text-[10px] text-slate-400 font-medium">
              {boat?.modelo || boat?.tipo}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> Solicitante:
          </span>
          <strong className="text-slate-700 font-semibold truncate max-w-[150px]">
            {chamado.solicitanteNome}
          </strong>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
        "{chamado.descricaoAvaria}"
      </p>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
          <st.Icon className="w-3 h-3" /> {st.label}
        </span>
        <span className="text-[11px] font-extrabold text-[#186b77] flex items-center gap-1 group-hover:gap-2 transition-all">
          Analisar <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

function OSCard({
  os,
  embarcacoes,
  chamados,
  onClick
}: {
  os: Manutencao;
  embarcacoes: Embarcacao[];
  chamados: Chamado[];
  onClick: () => void;
}) {
  const boat = embarcacoes.find(b => b.id === os.embarcacaoId);
  const chamado = chamados.find(c => c.id === os.chamadoId);
  const st = statusLabel(os.status);
  const titulo = os.tituloChamado || os.titulo || os.descricaoServico || 'Ordem de Serviço';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
              {os.codigoOS}
            </span>
            {chamado && (
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                ← {chamado.codigoChamado}
              </span>
            )}
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 line-clamp-2">
            {titulo}
          </h3>
        </div>
        {os.urgencia && (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${urgencyBadge(os.urgencia)}`}>
            {os.urgencia}
          </span>
        )}
      </div>

      {/* Boat + Oficina info */}
      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
            <Ship className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{getBoatCode(boat)}</div>
            <span className="text-[10px] text-slate-400 font-medium">
              {boat?.modelo || boat?.tipo}
            </span>
          </div>
        </div>
        {os.oficinaNome && (
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> Oficina:
            </span>
            <strong className="text-slate-700 font-semibold truncate max-w-[150px]">
              {os.oficinaNome}
            </strong>
          </div>
        )}
        {(os.custoReal != null || os.valorRepassado != null) && (
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" /> Custo / Repasse:
            </span>
            <strong className="text-slate-700 font-semibold">
              {os.custoReal != null ? `R$ ${os.custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
              {' / '}
              {os.valorRepassado != null ? `R$ ${os.valorRepassado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </strong>
          </div>
        )}
        {os.pecas && Array.isArray(os.pecas) && os.pecas.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3 text-slate-400" /> Itens discriminados:
            </span>
            <span className="font-bold text-[#186b77] bg-teal-50 px-2 py-0.5 rounded text-[10px] border border-teal-100">
              {os.pecas.length} {os.pecas.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
          <st.Icon className="w-3 h-3" /> {st.label}
        </span>
        <span className="text-[11px] font-extrabold text-[#186b77] flex items-center gap-1 group-hover:gap-2 transition-all">
          Detalhes <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
