import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSignature,
  Search,
  Plus,
  RefreshCw,
  FileCheck2,
  Clock,
  FileX2,
  Paperclip,
  Download,
  Eye,
  Edit2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Phone,
  Ship,
  User,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Upload,
  Folder,
  FileText,
  Boxes,
  X
} from 'lucide-react';
import { clientDB, boatDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../../db';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import { formatBoatName } from '../../utils/constants';
import { generateContract } from '../ContractGenerator';
import ClientProfileModal from '../ClientProfileModal';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import ComercialContratoDrawer from './ComercialContratoDrawer';
import ComercialContratosDirectoryView from './ComercialContratosDirectoryView';
import ComercialFolderDetailsModal from './ComercialFolderDetailsModal';
import ComercialContratoModeloModal from './ComercialContratoModeloModal';

export default function ComercialContratosPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && clientDB.getAll().length === 0);
  const [viewMode, setViewMode] = useState<'directory' | 'table' | 'grid'>('directory');

  // Filtros
  const [selectedStatus, setSelectedStatus] = useState<StatusContrato | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'aquisicao' | 'adm'>('all');
  const [selectedBoatFilter, setSelectedBoatFilter] = useState<string>('all');

  // Modais e Drawers
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedClientForViewer, setSelectedClientForViewer] = useState<Cliente | null>(null);
  const [viewerInitialType, setViewerInitialType] = useState<'aquisicao' | 'adm'>('aquisicao');
  const [viewerInitialTab, setViewerInitialTab] = useState<'documento' | 'pdf' | 'anexo'>('documento');

  // Modal de Detalhes da Pasta / Dossiê do Cliente
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Cliente | null>(null);
  const [fullProfileClient, setFullProfileClient] = useState<Cliente | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [pageModeloModalOpen, setPageModeloModalOpen] = useState(false);

  // Status dropdown flutuante na tabela
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);

  // Carregar dados
  const loadData = () => {
    const cl = clientDB.getAll();
    const bt = boatDB.getAll();
    setClients([...cl]);
    setBoats([...bt]);
    if (cl.length > 0 || isDbLoaded) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadData();

    // Inscrição reativa para atualizações locais e remotas da base de dados
    const unsubscribe = onDbUpdate(() => {
      if (isMounted) {
        loadData();
      }
    });

    // Se o banco ainda não foi carregado na memória, aciona a sincronização imediata
    if (!isDbLoaded || clientDB.getAll().length === 0) {
      setIsLoading(true);
      syncWithRemote()
        .then(() => {
          if (isMounted) {
            loadData();
          }
        })
        .catch(err => {
          console.error('[Contratos] Falha na carga remota inicial:', err);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithRemote();
      loadData();
    } catch (err) {
      console.error('Erro ao sincronizar dados de contratos:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Mapa de embarcações por ID
  const boatsMap = useMemo(() => {
    const map = new Map<string, Embarcacao>();
    boats.forEach(b => map.set(b.id, b));
    return map;
  }, [boats]);

  // Estatísticas / KPIs
  const stats = useMemo(() => {
    const total = clients.length;
    let assinados = 0;
    let pendentes = 0;
    let semContrato = 0;

    clients.forEach(c => {
      const status = c.statusContrato || 'sem_contrato';
      if (status === 'assinado') assinados++;
      else if (status === 'pendente') pendentes++;
      else semContrato++;
    });

    const percentAssinados = total > 0 ? Math.round((assinados / total) * 100) : 0;

    return { total, assinados, pendentes, semContrato, percentAssinados };
  }, [clients]);

  // Filtragem dos clientes
  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return clients.filter(c => {
      const clientStatus = c.statusContrato || 'sem_contrato';

      // 1. Filtro por Status
      if (selectedStatus !== 'all' && clientStatus !== selectedStatus) {
        return false;
      }

      // 2. Filtro por Tipo de Contrato
      if (selectedType !== 'all') {
        const cType = c.tipoContrato || 'aquisicao';
        if (selectedType === 'aquisicao' && cType !== 'aquisicao' && cType !== 'ambos') return false;
        if (selectedType === 'adm' && cType !== 'adm' && cType !== 'ambos') return false;
      }

      // 3. Filtro por Embarcação
      if (selectedBoatFilter !== 'all') {
        const clientBoatId = c.embarcacoes?.[0]?.embarcacaoId || c.embarcacaoId;
        if (clientBoatId !== selectedBoatFilter) return false;
      }

      // 4. Busca por texto
      if (term) {
        const boatId = c.embarcacoes?.[0]?.embarcacaoId || c.embarcacaoId;
        const boat = boatId ? boatsMap.get(boatId) : null;

        const matchNome = c.nome?.toLowerCase().includes(term);
        const matchCpf = c.cpf?.toLowerCase().includes(term);
        const matchTel = c.telefone?.toLowerCase().includes(term);
        const matchBoat = boat && (
          boat.nome?.toLowerCase().includes(term) ||
          boat.modelo?.toLowerCase().includes(term)
        );
        const matchCota = (c.embarcacoes?.[0]?.cota || c.cota || '').toLowerCase().includes(term);

        return matchNome || matchCpf || matchTel || matchBoat || matchCota;
      }

      return true;
    });
  }, [clients, searchTerm, selectedStatus, selectedType, selectedBoatFilter, boatsMap]);

  // Ação: Alterar status de forma rápida
  const handleQuickStatusChange = (clientId: string, newStatus: StatusContrato, extraData?: Partial<Cliente>) => {
    setOpenStatusDropdownId(null);
    try {
      const isAssinado = newStatus === 'assinado';
      const updated = clientDB.update(clientId, {
        statusContrato: newStatus,
        contratoDataAssinatura: isAssinado ? (extraData?.contratoDataAssinatura || new Date().toISOString().split('T')[0]) : undefined,
        contratoDataEmissao: newStatus !== 'sem_contrato' ? new Date().toISOString().split('T')[0] : undefined,
        ...extraData
      });

      setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (selectedClientForDetails && selectedClientForDetails.id === clientId) {
        setSelectedClientForDetails(updated);
      }
      if (selectedClientForViewer && selectedClientForViewer.id === clientId) {
        setSelectedClientForViewer(updated);
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Ação: Abrir Visualizador
  const handleOpenViewer = (
    cliente: Cliente,
    type: 'aquisicao' | 'adm' = 'aquisicao',
    tab: 'documento' | 'pdf' | 'anexo' = 'documento'
  ) => {
    setSelectedClientForViewer(cliente);
    setViewerInitialType(type);
    setViewerInitialTab(tab);
    setViewerModalOpen(true);
  };

  // Ação: Abrir Detalhes da Pasta / Dossiê do Cliente
  const handleOpenDetails = (cliente: Cliente) => {
    setSelectedClientForDetails(cliente);
    setDetailsModalOpen(true);
  };

  // Ação: Download Rápido do PDF
  const handleDownloadPdf = async (cliente: Cliente, e: React.MouseEvent, forcedType?: 'aquisicao' | 'adm') => {
    e.stopPropagation();
    const boatId = cliente.embarcacoes?.[0]?.embarcacaoId || cliente.embarcacaoId;
    const boat = boatId ? boatsMap.get(boatId) : null;
    const type = forcedType || (cliente.tipoContrato === 'adm' ? 'adm' : 'aquisicao');

    await generateContract(
      type,
      {
        nome: cliente.nome,
        cpf: cliente.cpf,
        rg: cliente.rg,
        orgaoEmissor: cliente.orgaoEmissor,
        nacionalidade: cliente.nacionalidade || 'BRASILEIRO',
        cnh_cha: cliente.cnh_cha || cliente.numeroHabilitacao,
        numeroHabilitacao: cliente.numeroHabilitacao,
        validadeHabilitacao: cliente.validadeHabilitacao,
        orgaoEmissorHabilitacao: cliente.orgaoEmissorHabilitacao,
        categoriaHabilitacao: cliente.categoriaHabilitacao,
        estadoCivil: cliente.estadoCivil,
        profissao: cliente.profissao,
        cidade: cliente.cidade,
        estado: cliente.estado,
        telefone: cliente.telefone,
        email: cliente.email,
        logradouro: cliente.logradouro,
        numeroEnd: cliente.numeroEnd,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cep: cliente.cep,
        cota: cliente.embarcacoes?.[0]?.cota || cliente.cota || '25%',
        dataAssinatura: cliente.contratoDataAssinatura,
        dataCadastro: cliente.contratoDataEmissao || cliente.dataCadastro,
      },
      {
        nome: boat?.nome ? formatBoatName(boat.nome) : 'MEXICANO',
        modelo: boat?.modelo || 'Lancha',
        chassi: boat?.chassi || boat?.numero || '',
        inscricao: boat?.inscricao || '',
        tipo_propulsao: boat?.tipo_propulsao || (boat?.tipo === 'jet' ? 'TURBO JATO' : 'MOTOR CENTRO-RABETA'),
        potencia: boat?.potencia || '',
        tipo: boat?.tipo,
        capacidadePassageiros: boat?.capacidadePassageiros,
      },
      cliente.contratoValores
    );
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Cabeçalho da Página (Alinhado com ComercialDashboard) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">
            Contratos & Documentos
          </h1>
          <p className="text-[12px] text-stone-500 mt-0.5">
            Gerencie minutas, contratos assinados e formalização de cotas náuticas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3 rounded-lg bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            title="Atualizar contratos com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Atualizando…' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setPageModeloModalOpen(true)}
            className="h-9 px-3 rounded-lg bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs"
            title="Editar os modelos padrão institucionais de contrato"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
            <span>Modelos de Contrato</span>
          </button>

          <button
            onClick={() => {
              setDrawerClientId(null);
              setDrawerOpen(true);
            }}
            className="h-9 px-3.5 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-1.5 text-[12px] font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas / KPIs Interativos (Padrão ComercialWidgets) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total */}
        <div
          onClick={() => setSelectedStatus('all')}
          className={`bg-white rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer transition-all ${
            selectedStatus === 'all'
              ? 'border-mx-ink ring-2 ring-mx-ink/15 shadow-sm bg-stone-50/40'
              : 'border-stone-200/70 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-stone-700">Total de Contratos</span>
            <FileSignature className="w-4 h-4 text-mx-ink" strokeWidth={2} />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[26px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{stats.total}</span>
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-stone-100 text-stone-700">
              100% base
            </span>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {selectedStatus === 'all' ? 'Filtro ativo: todos' : 'Clique para ver todos'}
          </p>
        </div>

        {/* Assinados */}
        <div
          onClick={() => setSelectedStatus('assinado')}
          className={`bg-white rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer transition-all ${
            selectedStatus === 'assinado'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm bg-emerald-50/20'
              : 'border-stone-200/70 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-stone-700">Contratos Assinados</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[26px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{stats.assinados}</span>
            {stats.total > 0 && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-mx-green-50 text-mx-green">
                {stats.percentAssinados}% formalizados
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {selectedStatus === 'assinado' ? 'Filtro ativo: assinados' : 'Clique para filtrar assinados'}
          </p>
        </div>

        {/* Pendentes */}
        <div
          onClick={() => setSelectedStatus('pendente')}
          className={`bg-white rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer transition-all ${
            selectedStatus === 'pendente'
              ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-sm bg-amber-50/20'
              : 'border-stone-200/70 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-stone-700">Aguardando Assinatura</span>
            <Clock className="w-4 h-4 text-amber-600" strokeWidth={2} />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[26px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{stats.pendentes}</span>
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-amber-50 text-amber-700">
              em validação
            </span>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {selectedStatus === 'pendente' ? 'Filtro ativo: pendentes' : 'Clique para filtrar pendentes'}
          </p>
        </div>

        {/* Sem Contrato */}
        <div
          onClick={() => setSelectedStatus('sem_contrato')}
          className={`bg-white rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer transition-all ${
            selectedStatus === 'sem_contrato'
              ? 'border-stone-700 ring-2 ring-stone-700/15 shadow-sm bg-stone-50/50'
              : 'border-stone-200/70 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-stone-700">Não Possui Contrato</span>
            <FileX2 className="w-4 h-4 text-stone-400" strokeWidth={2} />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[26px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{stats.semContrato}</span>
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-stone-100 text-stone-600">
              sem minuta
            </span>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {selectedStatus === 'sem_contrato' ? 'Filtro ativo: sem contrato' : 'Clique para filtrar pendentes de emissão'}
          </p>
        </div>
      </div>

      {/* 3. Barra de Controle: Busca + Filtros + Alternância de View (Padrão ComercialClientesPage & Dashboard) */}
      <div className="bg-white rounded-2xl border border-stone-200/70 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Campo de Busca Principal */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, CPF, embarcação ou cota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-stone-50 border border-stone-200/80 text-[12px] text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white focus:border-mx-ink transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros Dropdown + Alternador de Visualização */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="h-9 px-3 rounded-lg bg-stone-50 border border-stone-200/80 text-[12px] font-medium text-stone-700 hover:bg-stone-100/60 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white cursor-pointer"
            >
              <option value="all">Todos os Modelos</option>
              <option value="aquisicao">Aquisição (Cota)</option>
              <option value="adm">Administração</option>
            </select>

            <select
              value={selectedBoatFilter}
              onChange={e => setSelectedBoatFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-stone-50 border border-stone-200/80 text-[12px] font-medium text-stone-700 hover:bg-stone-100/60 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white max-w-[160px] truncate cursor-pointer"
            >
              <option value="all">Todas Embarcações</option>
              {boats.map(b => (
                <option key={b.id} value={b.id}>{formatBoatName(b.nome)}</option>
              ))}
            </select>

            {/* Alternar Diretório 3D / Tabela / Grade A4 */}
            <div className="inline-flex rounded-lg border border-stone-200/80 p-0.5 bg-stone-100/70 text-stone-500">
              <button
                onClick={() => setViewMode('directory')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'directory' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'hover:text-stone-900'
                }`}
                title="Visualização em Diretório 3D"
              >
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Diretório</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'hover:text-stone-900'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tabela</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'hover:text-stone-900'
                }`}
                title="Visualização em Grade de Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Grade</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Visualizações de Contratos: Diretório / Tabela / Grade */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200/70 p-16 text-center max-w-lg mx-auto shadow-xs mt-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 border border-stone-200/60 shadow-2xs">
            <RefreshCw className="w-6 h-6 text-stone-500 animate-spin" />
          </div>
          <h4 className="text-[15px] font-semibold text-stone-900 tracking-tight">Carregando contratos e clientes...</h4>
          <p className="text-[12px] text-stone-500 max-w-sm mx-auto mt-1">
            Sincronizando registros da base de dados. Aguarde um instante.
          </p>
        </div>
      ) : viewMode === 'directory' ? (
        <ComercialContratosDirectoryView
          clients={filteredClients}
          boats={boats}
          boatsMap={boatsMap}
          onOpenViewer={handleOpenViewer}
          onOpenDetails={handleOpenDetails}
          onDownloadPdf={handleDownloadPdf}
          onEditContract={id => {
            setDrawerClientId(id);
            setDrawerOpen(true);
          }}
          onCreateNewContract={() => {
            setDrawerClientId(null);
            setDrawerOpen(true);
          }}
          onStatusChange={handleQuickStatusChange}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/70 border-b border-stone-200/80 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cliente / Cotista</th>
                  <th className="py-3 px-4">Embarcação & Cota</th>
                  <th className="py-3 px-4">Modelo do Contrato</th>
                  <th className="py-3 px-4">Status do Contrato</th>
                  <th className="py-3 px-4">Datas</th>
                  <th className="py-3 px-4">Arquivos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      Nenhum contrato ou cliente localizado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(c => {
                    const boatId = c.embarcacoes?.[0]?.embarcacaoId || c.embarcacaoId;
                    const boat = boatId ? boatsMap.get(boatId) : null;
                    const status = c.statusContrato || 'sem_contrato';
                    const cotaVal = c.embarcacoes?.[0]?.cota || c.cota || 'Cota 25%';
                    const type = c.tipoContrato === 'adm' ? 'adm' : 'aquisicao';

                    const hasAquisicaoAssinado = Boolean(c.contratoAquisicaoArquivoUrl || (c.tipoContrato !== 'adm' && c.contratoArquivoUrl));
                    const hasAdmAssinado = Boolean(c.contratoAdmArquivoUrl || (c.tipoContrato === 'adm' && c.contratoArquivoUrl));
                    const totalAssinados = (hasAquisicaoAssinado ? 1 : 0) + (hasAdmAssinado ? 1 : 0);

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                        onClick={() => handleOpenDetails(c)}
                      >
                        {/* 1. Cliente */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-mx-ink-100 text-mx-ink font-bold flex items-center justify-center shrink-0 text-xs">
                              {c.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900 group-hover:text-mx-ink transition-colors truncate">
                                {c.nome}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                                <span>CPF: {c.cpf || 'Não informado'}</span>
                                {c.telefone && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-stone-500">
                                      <Phone className="w-2.5 h-2.5" />
                                      {c.telefone}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Embarcação & Cota */}
                        <td className="py-3 px-4">
                          {boat ? (
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                                <Ship className="w-3.5 h-3.5 text-stone-500" />
                                <span>{formatBoatName(boat.nome)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  {cotaVal}
                                </span>
                                <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                                  {boat.modelo}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Sem embarcação</span>
                          )}
                        </td>

                        {/* 3. Modelo do Contrato */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            type === 'aquisicao'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}>
                            {type === 'aquisicao' ? 'Aquisição (Cota)' : 'Administração'}
                          </span>
                        </td>

                        {/* 4. Status com Dropdown Rápido */}
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenStatusDropdownId(openStatusDropdownId === c.id ? null : c.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                status === 'assinado'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : status === 'pendente'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                              }`}
                            >
                              {status === 'assinado' ? (
                                <>
                                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{totalAssinados === 2 ? '2/2 Assinados' : 'Assinado'}</span>
                                </>
                              ) : status === 'pendente' ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{totalAssinados === 1 ? '1/2 Assinado' : 'Pendente'}</span>
                                </>
                              ) : (
                                <>
                                  <FileX2 className="w-3.5 h-3.5 text-stone-400" />
                                  <span>Não Possui</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {openStatusDropdownId === c.id && (
                              <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-stone-200 p-1 z-50 text-xs">
                                <button
                                  onClick={() => handleQuickStatusChange(c.id, 'assinado')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Assinado</span>
                                </button>
                                <button
                                  onClick={() => handleQuickStatusChange(c.id, 'pendente')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-amber-800 hover:bg-amber-50 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Pendente</span>
                                </button>
                                <button
                                  onClick={() => handleQuickStatusChange(c.id, 'sem_contrato')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-stone-700 hover:bg-stone-100 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <FileX2 className="w-3.5 h-3.5 text-stone-400" />
                                  <span>Não Possui</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Datas */}
                        <td className="py-3 px-4 text-[11px] text-stone-500">
                          {status === 'assinado' && c.contratoDataAssinatura ? (
                            <div>
                              <span className="font-semibold text-emerald-700 block">
                                Assinado em {new Date(c.contratoDataAssinatura).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[10px] text-stone-400">Formalizado</span>
                            </div>
                          ) : c.contratoDataEmissao ? (
                            <div>
                              <span>Emitido em {new Date(c.contratoDataEmissao).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[10px] text-amber-600 block">Aguardando</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>

                        {/* 6. Arquivos */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {totalAssinados === 2 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                title="Contratos de Aquisição e Gestão Náutica anexados"
                              >
                                <Paperclip className="w-3 h-3 text-emerald-600" />
                                <span>2 Anexos OK</span>
                              </span>
                            ) : totalAssinados === 1 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                                title={hasAquisicaoAssinado ? 'Aquisição anexada (Pendente Gestão)' : 'Gestão anexada (Pendente Aquisição)'}
                              >
                                <Paperclip className="w-3 h-3 text-amber-600" />
                                <span>{hasAquisicaoAssinado ? 'Aquisição OK' : 'Gestão OK'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                <span>Minutas A4</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Ações */}
                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Visualizar Arquivo (Principal) */}
                            <button
                              onClick={() => handleOpenViewer(c, type)}
                              className="h-8 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Abrir visualizador do contrato"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone-600" />
                              <span className="hidden xl:inline">Visualizar</span>
                            </button>

                            {/* Baixar PDF Oficial */}
                            <button
                              onClick={(e) => handleDownloadPdf(c, e)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                              title="Baixar PDF Oficial"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Editar / Emitir */}
                            <button
                              onClick={() => {
                                setDrawerClientId(c.id);
                                setDrawerOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                              title="Editar dados e valores do contrato"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visualização em Grade de Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(c => {
            const boatId = c.embarcacoes?.[0]?.embarcacaoId || c.embarcacaoId;
            const boat = boatId ? boatsMap.get(boatId) : null;
            const status = c.statusContrato || 'sem_contrato';
            const cotaVal = c.embarcacoes?.[0]?.cota || c.cota || 'Cota 25%';
            const type = c.tipoContrato === 'adm' ? 'adm' : 'aquisicao';

            const hasAquisicaoAssinado = Boolean(c.contratoAquisicaoArquivoUrl || (c.tipoContrato !== 'adm' && c.contratoArquivoUrl));
            const hasAdmAssinado = Boolean(c.contratoAdmArquivoUrl || (c.tipoContrato === 'adm' && c.contratoArquivoUrl));
            const totalAssinados = (hasAquisicaoAssinado ? 1 : 0) + (hasAdmAssinado ? 1 : 0);

            return (
              <div
                key={c.id}
                onClick={() => handleOpenDetails(c)}
                className="bg-white rounded-2xl border border-stone-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-stone-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Faixa superior de status */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      status === 'assinado'
                        ? 'bg-mx-green-50 text-mx-green border-mx-green/30'
                        : status === 'pendente'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                      {status === 'assinado' ? (
                        <>
                          <FileCheck2 className="w-3.5 h-3.5 text-mx-green" />
                          <span>{totalAssinados === 2 ? '2/2 Assinados' : 'Assinado'}</span>
                        </>
                      ) : status === 'pendente' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{totalAssinados === 1 ? '1/2 Assinado' : 'Pendente'}</span>
                        </>
                      ) : (
                        <>
                          <FileX2 className="w-3.5 h-3.5 text-stone-400" />
                          <span>Sem Contrato</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {type === 'aquisicao' ? 'Aquisição' : 'Administração'}
                    </span>
                  </div>

                  {/* Informações do Cliente */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-mx-ink-100 text-mx-ink font-bold flex items-center justify-center shrink-0">
                      {c.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-stone-900 group-hover:text-mx-ink transition-colors truncate">
                        {c.nome}
                      </h4>
                      <p className="text-xs text-stone-500 font-mono mt-0.5">
                        CPF: {c.cpf || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  {/* Embarcação e Cota */}
                  <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 font-medium flex items-center gap-1">
                        <Ship className="w-3.5 h-3.5 text-stone-400" />
                        Embarcação
                      </span>
                      <span className="font-bold text-stone-800">
                        {boat ? formatBoatName(boat.nome) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 font-medium">Cota Adquirida</span>
                      <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {cotaVal}
                      </span>
                    </div>

                    {c.contratoDataAssinatura && status === 'assinado' && (
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[11px]">
                        <span className="text-stone-400">Assinado em</span>
                        <span className="text-emerald-700 font-semibold">
                          {new Date(c.contratoDataAssinatura).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Indicador de Arquivo */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {totalAssinados === 2 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        <span>2 Contratos assinados anexados</span>
                      </span>
                    ) : totalAssinados === 1 ? (
                      <span className="text-amber-800 font-semibold flex items-center gap-1 text-[11px]">
                        <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                        <span>1 de 2 Anexado ({hasAquisicaoAssinado ? 'Aquisição' : 'Gestão'})</span>
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[11px] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-stone-400" />
                        <span>Minutas A4 disponíveis</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações do Card */}
                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenViewer(c, type)}
                    className="flex-1 h-8 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar Arquivo</span>
                  </button>

                  <button
                    onClick={(e) => handleDownloadPdf(c, e)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                    title="Baixar PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setDrawerClientId(c.id);
                      setDrawerOpen(true);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                    title="Editar Contrato"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualizador de Contratos & Arquivos Modal */}
      <ComercialContratoViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        cliente={selectedClientForViewer}
        embarcacao={
          selectedClientForViewer
            ? boatsMap.get(
                selectedClientForViewer.embarcacoes?.[0]?.embarcacaoId ||
                selectedClientForViewer.embarcacaoId
              )
            : null
        }
        initialType={viewerInitialType}
        initialTab={viewerInitialTab}
        onStatusChange={(cId, newStatus, extraData) => {
          clientDB.update(cId, {
            statusContrato: newStatus,
            ...extraData
          });
          loadData();
        }}
      />

      {/* Modal de Detalhes da Pasta / Dossiê do Cliente */}
      <ComercialFolderDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedClientForDetails(null);
        }}
        client={selectedClientForDetails}
        boat={
          selectedClientForDetails
            ? boatsMap.get(
                selectedClientForDetails.embarcacoes?.[0]?.embarcacaoId ||
                selectedClientForDetails.embarcacaoId
              ) || null
            : null
        }
        onOpenViewer={(cl, type, tab) => {
          setDetailsModalOpen(false);
          handleOpenViewer(cl, type, tab);
        }}
        onDownloadPdf={handleDownloadPdf}
        onEditContract={id => {
          setDetailsModalOpen(false);
          setDrawerClientId(id);
          setDrawerOpen(true);
        }}
        onStatusChange={(id, newStatus, extraData) => {
          handleQuickStatusChange(id, newStatus, extraData);
          if (selectedClientForDetails && selectedClientForDetails.id === id) {
            setSelectedClientForDetails(prev => prev ? { ...prev, statusContrato: newStatus, ...extraData } : null);
          }
        }}
        onOpenFullProfile={cl => {
          setDetailsModalOpen(false);
          setFullProfileClient(cl);
        }}
      />

      {/* Modal de Ficha Cadastral Completa */}
      {fullProfileClient && (
        <ClientProfileModal
          client={fullProfileClient}
          boats={boats}
          onClose={() => setFullProfileClient(null)}
          initialTab="dados"
        />
      )}

      {/* Drawer de Cadastro / Emissão de Contrato */}
      <ComercialContratoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        clienteId={drawerClientId}
        onSave={() => loadData()}
        onOpenViewer={(cl, tp) => {
          setDrawerOpen(false);
          handleOpenViewer(cl, tp);
        }}
      />

      {/* Modal de Edição de Modelo de Contrato Institucional */}
      <ComercialContratoModeloModal
        isOpen={pageModeloModalOpen}
        onClose={() => setPageModeloModalOpen(false)}
        onSaved={() => loadData()}
      />

    </div>
  );
}
