import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Clock,
  ArrowRight,
  Share2,
  Lock,
  Check,
  CheckCircle2,
  Wrench,
  Sparkles,
  Waves,
  Anchor
} from 'lucide-react';
import { boatDB, clientDB, syncWithRemote, onDbUpdate, getAdminToken } from '../../db';
import { Embarcacao, Cliente, LeadComercial, CotaReservada } from '../../types';
import { getBoatEstoqueResumo, getBoatCotasStatusList, normalizeCotaCode } from '../../utils/cotaUtils';
import ComercialBoatDrawer from './ComercialBoatDrawer';
import ComercialCotaTransferModal from './ComercialCotaTransferModal';

interface ComercialAtivosPageProps {
  onOpenProposta?: (lead?: LeadComercial | null, boatId?: string, cota?: string) => void;
  onOpenTestDrive?: (lead?: LeadComercial | null, boatId?: string) => void;
  onOpenSeaTrial?: (lead?: LeadComercial | null, boatId?: string) => void;
  onOpenCatalogo?: (boatId?: string) => void;
  onOpenVenda?: (boatId?: string, cota?: string, clienteId?: string) => void;
  onNavigateToEmbarcacoes?: (boatId?: string) => void;
}

export default function ComercialAtivosPage({
  onOpenProposta,
  onOpenTestDrive,
  onOpenSeaTrial,
  onOpenCatalogo,
  onOpenVenda,
  onNavigateToEmbarcacoes
}: ComercialAtivosPageProps) {
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [activeReservas, setActiveReservas] = useState<CotaReservada[]>([]);
  const [reservasHoje, setReservasHoje] = useState<string[]>([]);
  const [manutencoesIds, setManutencoesIds] = useState<string[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'lancha' | 'jet'>('all');
  const [filterDisponibilidade, setFilterDisponibilidade] = useState<'all' | 'livres' | 'repasse' | 'vendidas'>('all');
  const [filterStatusMarina, setFilterStatusMarina] = useState<'all' | 'na_marina' | 'navegando_hoje' | 'em_manutencao'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Estados de Operação / Modais
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drawer de Ativo
  const [selectedBoatForDrawer, setSelectedBoatForDrawer] = useState<Embarcacao | null>(null);

  // Modal de Cota (Reserva / Repasse / Transferência)
  const [isCotaModalOpen, setIsCotaModalOpen] = useState(false);
  const [modalBoatId, setModalBoatId] = useState<string>('');
  const [modalCota, setModalCota] = useState<string>('C1');
  const [modalMode, setModalMode] = useState<'reserva' | 'repasse' | 'recompra' | 'transferencia'>('reserva');

  const getAuthHeader = (): Record<string, string> => {
    const token = getAdminToken() || localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadData = async () => {
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());

    try {
      const [resReservas, resPull] = await Promise.all([
        fetch('/api/comercial/cotas-reservadas', { headers: getAuthHeader() }).then(r => r.ok ? r.json() : null),
        fetch('/api/db/pull', { headers: getAuthHeader() }).then(r => r.ok ? r.json() : null)
      ]);

      if (resReservas && Array.isArray(resReservas.reservas)) {
        setActiveReservas(resReservas.reservas);
      }

      if (resPull) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (Array.isArray(resPull.reservations)) {
          const hojeIds = resPull.reservations
            .filter((r: any) => r.data === todayStr && r.status !== 'cancelado')
            .map((r: any) => r.embarcacaoId);
          setReservasHoje(hojeIds);
        }
        if (Array.isArray(resPull.manutencoes)) {
          const mIds = resPull.manutencoes
            .filter((m: any) => m.status !== 'concluido' && m.status !== 'cancelado')
            .map((m: any) => m.embarcacaoId);
          setManutencoesIds(mIds);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados complementares da marina:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = onDbUpdate(loadData);
    return unsub;
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithRemote();
      await loadData();
      showToast('Estoque atualizado com sucesso');
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Status Físico do Barco na Marina
  const getBoatStatusMarina = (boat: Embarcacao): { label: string; key: 'na_marina' | 'navegando_hoje' | 'em_manutencao'; isExceptional: boolean } => {
    const isManut = boat.emManutencao || boat.statusOperacional === 'em_manutencao' || manutencoesIds.includes(boat.id);
    if (isManut) {
      return { label: 'Em manutenção', key: 'em_manutencao', isExceptional: true };
    }
    const isNavegando = reservasHoje.includes(boat.id);
    if (isNavegando) {
      return { label: 'Navegando hoje', key: 'navegando_hoje', isExceptional: true };
    }
    return { label: 'Na marina', key: 'na_marina', isExceptional: false };
  };

  // Processamento e consolidação das embarcações com cotas C1 a C8
  const ativosComerciais = useMemo(() => {
    return boats.map(boat => {
      const resumo = getBoatEstoqueResumo(boat.id, clients, boat, activeReservas);
      const slots = getBoatCotasStatusList(boat.id, clients, boat, activeReservas);
      const statusMarina = getBoatStatusMarina(boat);

      const valorCota = Number(boat.valorCota) || 180000;
      const taxaAdmMensal = Number(boat.taxaAdmMensal) || 2500;
      const totalCotas = Math.max(4, Math.min(8, Number(boat.totalCotas) || 8));

      const ocupadas = resumo.cotasVendidas;
      const taxaOcupacao = totalCotas > 0 ? Math.round((ocupadas / totalCotas) * 100) : 0;

      return {
        boat,
        resumo,
        slots,
        statusMarina,
        valorCota,
        taxaAdmMensal,
        totalCotas,
        taxaOcupacao
      };
    });
  }, [boats, clients, activeReservas, reservasHoje, manutencoesIds]);

  // 4 KPIs de Inventário
  const kpis = useMemo(() => {
    const totalEmbarcacoes = ativosComerciais.length;
    let cotasDisponiveisEstoque = 0;
    let cotasReservadas48h = 0;
    let cotasEmRepasse = 0;
    let cotasVendidas = 0;
    let totalCotasFrota = 0;
    let vgvDisponivelEstoque = 0;

    ativosComerciais.forEach(({ resumo, valorCota, totalCotas }) => {
      totalCotasFrota += totalCotas;
      cotasDisponiveisEstoque += resumo.cotasDisponiveisMexicano;
      cotasReservadas48h += resumo.cotasReservadas;
      cotasEmRepasse += resumo.cotasRepasse;
      cotasVendidas += resumo.cotasVendidas;
      vgvDisponivelEstoque += resumo.cotasDisponiveisMexicano * valorCota;
    });

    const taxaOcupacaoFrota = totalCotasFrota > 0
      ? Math.round((cotasVendidas / totalCotasFrota) * 100)
      : 0;

    return {
      totalEmbarcacoes,
      cotasDisponiveisEstoque,
      vgvDisponivelEstoque,
      cotasReservadas48h,
      cotasEmRepasse,
      cotasVendidas,
      taxaOcupacaoFrota
    };
  }, [ativosComerciais]);

  // Filtragem
  const filteredAtivos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return ativosComerciais.filter(({ boat, resumo, statusMarina }) => {
      if (filterTipo !== 'all' && boat.tipo !== filterTipo) return false;

      if (filterDisponibilidade === 'livres' && resumo.cotasDisponiveisMexicano <= 0) return false;
      if (filterDisponibilidade === 'repasse' && resumo.cotasRepasse <= 0) return false;
      if (filterDisponibilidade === 'vendidas' && (resumo.cotasDisponiveisMexicano > 0 || resumo.cotasRepasse > 0)) return false;

      if (filterStatusMarina !== 'all' && statusMarina.key !== filterStatusMarina) return false;

      if (term) {
        const matchNome = (boat.nome || '').toLowerCase().includes(term);
        const matchNumero = (boat.numero || '').toLowerCase().includes(term);
        const matchModelo = (boat.modelo || '').toLowerCase().includes(term);
        const matchFabricante = (boat.fabricante || '').toLowerCase().includes(term);
        const matchVaga = (boat.vaga || '').toLowerCase().includes(term);
        return matchNome || matchNumero || matchModelo || matchFabricante || matchVaga;
      }

      return true;
    });
  }, [ativosComerciais, searchTerm, filterTipo, filterDisponibilidade, filterStatusMarina]);

  // Copiar link rastreável
  const handleCopyLink = (boat: Embarcacao) => {
    const vendedor = localStorage.getItem('admin_nome') || 'comercial';
    const link = `${window.location.origin}/catalogo?barco=${boat.id}&vendedor=${encodeURIComponent(vendedor)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(boat.id);
    showToast('Link do catálogo copiado');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenReserva = (boatId: string, cota = 'C1', mode: 'reserva' | 'repasse' = 'reserva') => {
    setModalBoatId(boatId);
    setModalCota(normalizeCotaCode(cota));
    setModalMode(mode);
    setIsCotaModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Header no Padrão Vila Náutica (Sóbrio, Sem Badges Gritantes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">
            Ativos Náuticos & Espelho de Cotas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Gestão de frações comerciais (C1 a C8), status operacional na marina e bloqueios de 48h.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            title="Atualizar estoque em tempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Atualizando…' : 'Atualizar'}</span>
          </button>

          {onOpenCatalogo && (
            <button
              onClick={() => onOpenCatalogo()}
              className="h-9 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-500" />
              <span>Catálogo Digital</span>
            </button>
          )}

          {onNavigateToEmbarcacoes && (
            <button
              onClick={() => onNavigateToEmbarcacoes()}
              className="h-9 px-4 rounded-xl bg-[#2D0A16] text-white hover:bg-[#3B0D1E] flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <span>Cadastros & Frota</span>
              <ArrowRight className="w-3 h-3 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* 2. KPIs de Inventário (Design System Harmonioso Vila Náutica) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Embarcações */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Catálogo Comercial</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Ship className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {kpis.totalEmbarcacoes}
            </span>
            <span className="text-xs text-stone-400 font-normal">embarcações</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
            Lanchas e jets ativos
          </div>
        </div>

        {/* KPI 2: Cotas Disponíveis (Estoque Mexicano) + VGV */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Estoque Disponível</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Anchor className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {kpis.cotasDisponiveisEstoque}
            </span>
            <span className="text-xs text-stone-400 font-normal">cotas livres</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-600 font-medium truncate">
            VGV: R$ {kpis.vgvDisponivelEstoque.toLocaleString('pt-BR')}
          </div>
        </div>

        {/* KPI 3: Bloqueios 48h & Repasses */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Em Negociação</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {kpis.cotasReservadas48h}
            </span>
            <span className="text-xs text-stone-400 font-normal">bloqueadas (48h)</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
            {kpis.cotasEmRepasse} {kpis.cotasEmRepasse === 1 ? 'cota em repasse' : 'cotas em repasse'}
          </div>
        </div>

        {/* KPI 4: Taxa de Ocupação da Frota */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Ocupação da Frota</span>
            <span className="text-xs font-semibold text-stone-400 tabular-nums">
              {kpis.cotasVendidas} vendidas
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {kpis.taxaOcupacaoFrota}%
            </span>
            <span className="text-xs text-stone-400 font-normal">das cotas totais</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100">
            <div className="w-full bg-stone-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-[#2D0A16] h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.taxaOcupacaoFrota}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filtros Rápidos & Busca (Clean, Sem Cores Competitivas) */}
      <div className="bg-white rounded-2xl border border-stone-200/70 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Busca Textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por embarcação, modelo ou vaga..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filtros em Pílulas & Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Control Tipo */}
            <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70 text-xs">
              <button
                type="button"
                onClick={() => setFilterTipo('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  filterTipo === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterTipo('lancha')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  filterTipo === 'lancha'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Lanchas
              </button>
              <button
                type="button"
                onClick={() => setFilterTipo('jet')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  filterTipo === 'jet'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Jets
              </button>
            </div>

            {/* Disponibilidade */}
            <select
              value={filterDisponibilidade}
              onChange={e => setFilterDisponibilidade(e.target.value as any)}
              className="h-9 px-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:bg-white transition-colors"
            >
              <option value="all">Todas as situações</option>
              <option value="livres">Com cotas livres (estoque)</option>
              <option value="repasse">Com cotas em repasse</option>
              <option value="vendidas">100% vendidas</option>
            </select>

            {/* Status Marina */}
            <select
              value={filterStatusMarina}
              onChange={e => setFilterStatusMarina(e.target.value as any)}
              className="h-9 px-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:bg-white transition-colors"
            >
              <option value="all">Status na marina (todos)</option>
              <option value="na_marina">Na marina</option>
              <option value="navegando_hoje">Navegando hoje</option>
              <option value="em_manutencao">Em manutenção</option>
            </select>

            {/* Alternância Grid / Tabela */}
            <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="Grade de cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="Lista em tabela"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium shadow-xl border border-stone-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. Grade de Embarcações (Cards Refinados - Impeccable Quieter) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAtivos.map(({ boat, resumo, slots, statusMarina, valorCota, taxaAdmMensal, totalCotas }) => {
            const cotasLivres = resumo.cotasDisponiveisMexicano;
            const isSoldOut = cotasLivres === 0 && resumo.cotasRepasse === 0;

            return (
              <div
                key={boat.id}
                className="bg-white rounded-2xl border border-stone-200/70 hover:border-stone-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Foto de Capa com badge minimalista e elegante */}
                  <div className="relative h-40 w-full bg-stone-100 overflow-hidden">
                    {boat.imagemUrl ? (
                      <img
                        src={boat.imagemUrl}
                        alt={boat.nome}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                        <Ship className="w-8 h-8 opacity-25 mb-1" />
                        <span className="text-[11px] font-normal text-stone-400">Sem foto cadastrada</span>
                      </div>
                    )}

                    {/* Badge de exceção física (apenas se estiver navegando ou em manutenção) */}
                    {statusMarina.isExceptional && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-xs shadow-2xs border ${
                          statusMarina.key === 'em_manutencao'
                            ? 'bg-white/95 text-amber-800 border-amber-200/80'
                            : 'bg-white/95 text-sky-800 border-sky-200/80'
                        }`}>
                          {statusMarina.key === 'em_manutencao' ? (
                            <Wrench className="w-2.5 h-2.5 text-amber-600" />
                          ) : (
                            <Waves className="w-2.5 h-2.5 text-sky-600" />
                          )}
                          <span>{statusMarina.label}</span>
                        </span>
                      </div>
                    )}

                    {/* Badge de disponibilidade discreto no topo direito */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium shadow-2xs backdrop-blur-xs border ${
                        isSoldOut
                          ? 'bg-stone-900/80 text-stone-200 border-stone-700/60'
                          : 'bg-white/95 text-stone-700 border-stone-200/80'
                      }`}>
                        {isSoldOut ? '100% vendida' : `${cotasLivres} ${cotasLivres === 1 ? 'cota livre' : 'cotas livres'}`}
                      </span>
                    </div>
                  </div>

                  {/* Informações da Embarcação */}
                  <div className="p-4 space-y-3">
                    {/* Cabeçalho do Ativo */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedBoatForDrawer(boat)}
                        className="text-left font-semibold text-stone-900 text-sm tracking-tight hover:text-[#2D0A16] transition-colors truncate block w-full cursor-pointer"
                        title={boat.nome}
                      >
                        {boat.nome}
                      </button>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {boat.modelo || boat.fabricante || 'Embarcação'}
                        {boat.ano ? ` • Ano ${boat.ano}` : ''}
                        {boat.vaga ? ` • Vaga ${boat.vaga}` : ''}
                      </p>
                    </div>

                    {/* Especificações Rápidas e Discretas */}
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span>{boat.potencia || 'Motor marítimo'}</span>
                      <span className="text-stone-300">•</span>
                      <span>{boat.horasMotor || 0}h</span>
                      <span className="text-stone-300">•</span>
                      <span>{boat.capacidadePassageiros || 8} passageiros</span>
                    </div>

                    {/* Valores Comerciais Sóbrios */}
                    <div className="pt-2.5 border-t border-stone-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                          Valor da cota
                        </span>
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          R$ {valorCota.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                          Condomínio / mês
                        </span>
                        <span className="text-xs font-medium text-stone-600 tabular-nums">
                          R$ {taxaAdmMensal.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Mini-Mapa de Cotas (Compacto, Discreto e Sem Ruído) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                        <span className="uppercase tracking-wider">Espelho de Cotas</span>
                        <span>
                          {resumo.cotasDisponiveisMexicano} livres • {resumo.cotasVendidas} vendidas
                        </span>
                      </div>

                      <div className="grid grid-cols-8 gap-1">
                        {slots.map(s => {
                          const isMex = s.status === 'disponivel_mexicano';
                          const isRep = s.status === 'em_repasse';
                          const isRes = s.status === 'reservada';

                          let tooltip = `${s.cota}: Titular ${s.clienteNome}`;
                          if (isMex) tooltip = `${s.cota}: Disponível no Estoque El Mexicano`;
                          if (isRep) tooltip = `${s.cota}: Em Repasse (${s.clienteNome})`;
                          if (isRes) tooltip = `${s.cota}: Bloqueio 48h (${s.leadNome || 'Lead'})`;

                          return (
                            <button
                              key={s.cota}
                              type="button"
                              onClick={() => {
                                if (isMex || isRep) {
                                  handleOpenReserva(boat.id, s.cota, 'reserva');
                                } else if (s.status === 'vendida') {
                                  handleOpenReserva(boat.id, s.cota, 'repasse');
                                } else {
                                  setSelectedBoatForDrawer(boat);
                                }
                              }}
                              className={`h-6 rounded flex items-center justify-center text-[10px] font-medium border transition-colors cursor-pointer ${
                                isMex
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70 hover:bg-emerald-100'
                                  : isRep
                                  ? 'bg-sky-50 text-sky-800 border-sky-200/70 hover:bg-sky-100'
                                  : isRes
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/70 hover:bg-amber-100'
                                  : 'bg-stone-100 text-stone-400 border-stone-200/50 hover:bg-stone-200/60'
                              }`}
                              title={tooltip}
                            >
                              {s.cota}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card com Ações Harmoniosas */}
                <div className="px-4 py-3 bg-stone-50/50 border-t border-stone-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBoatForDrawer(boat)}
                    className="flex-1 h-8 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  >
                    Painel do Ativo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReserva(boat.id, 'C1', 'reserva')}
                    className="h-8 px-3 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Bloquear cota por 48h"
                  >
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>Reservar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(boat)}
                    className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-[#2D0A16] hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Copiar link do catálogo para WhatsApp"
                  >
                    {copiedId === boat.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Tabela */
        <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 text-stone-500 font-medium uppercase tracking-wider text-[10px] border-b border-stone-200/70">
                  <th className="py-3 px-4">Embarcação</th>
                  <th className="py-3 px-3">Status Marina</th>
                  <th className="py-3 px-3">Cotas Livres</th>
                  <th className="py-3 px-3">Valor Cota</th>
                  <th className="py-3 px-3">Taxa Adm.</th>
                  <th className="py-3 px-3">Espelho C1–C8</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {filteredAtivos.map(({ boat, resumo, slots, statusMarina, valorCota, taxaAdmMensal, totalCotas }) => (
                  <tr key={boat.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                          <Ship className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{boat.nome}</p>
                          <p className="text-[11px] text-stone-400">{boat.modelo || boat.tipo} • Ano {boat.ano}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                        statusMarina.key === 'em_manutencao'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                          : statusMarina.key === 'navegando_hoje'
                          ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                          : 'bg-stone-50 text-stone-600 border-stone-200/70'
                      }`}>
                        {statusMarina.label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-stone-900 tabular-nums">{resumo.cotasDisponiveisMexicano}</span>
                      <span className="text-stone-400 font-normal"> / {totalCotas}</span>
                    </td>
                    <td className="py-3 px-3 font-medium tabular-nums text-stone-900">
                      R$ {valorCota.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 font-normal tabular-nums text-stone-600">
                      R$ {taxaAdmMensal.toLocaleString('pt-BR')}/mês
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {slots.map(s => (
                          <span
                            key={s.cota}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-medium border ${
                              s.status === 'disponivel_mexicano'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                                : s.status === 'em_repasse'
                                ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                                : s.status === 'reservada'
                                ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                                : 'bg-stone-100 text-stone-400 border-stone-200/50'
                            }`}
                            title={`${s.cota}: ${s.clienteNome}`}
                          >
                            {s.cota.replace('C', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReserva(boat.id, 'C1', 'reserva')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors shadow-2xs"
                        >
                          Reservar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBoatForDrawer(boat)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-medium hover:bg-stone-200/80 transition-colors"
                        >
                          Painel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer Detalhado do Barco */}
      <ComercialBoatDrawer
        open={!!selectedBoatForDrawer}
        onClose={() => setSelectedBoatForDrawer(null)}
        editingBoat={selectedBoatForDrawer}
        clients={clients}
        onSave={() => loadData()}
        onOpenProposta={(boatId, cota, lead) => {
          setSelectedBoatForDrawer(null);
          if (onOpenProposta) onOpenProposta(lead, boatId, cota);
        }}
        onOpenVenda={(boatId, cota, clienteId) => {
          setSelectedBoatForDrawer(null);
          if (onOpenVenda) onOpenVenda(boatId, cota, clienteId);
        }}
        onOpenSeaTrial={(boatId) => {
          setSelectedBoatForDrawer(null);
          if (onOpenSeaTrial) onOpenSeaTrial(null, boatId);
        }}
        onOpenCotaModal={(boatId, cota, mode) => {
          handleOpenReserva(boatId, cota || 'C1', mode === 'repasse' ? 'repasse' : 'reserva');
        }}
      />

      {/* Modal de Reserva / Repasse / Transferência */}
      <ComercialCotaTransferModal
        isOpen={isCotaModalOpen}
        onClose={() => setIsCotaModalOpen(false)}
        preselectedBoatId={modalBoatId}
        preselectedCota={modalCota}
        initialMode={modalMode}
        boats={boats}
        clients={clients}
        onSuccess={() => loadData()}
      />
    </div>
  );
}