import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ship, Anchor, Gauge, Plus, RefreshCw, Search, Filter, 
  MapPin, CheckCircle2, Wrench, AlertTriangle, User, Phone, 
  LayoutGrid, List, Lock, Check, X, ShieldCheck, Eye, Edit2, 
  Trash2, MessageSquare, ExternalLink, Users, Shield, Calendar, FileText,
  Building2
} from 'lucide-react';
import { boatDB, clientDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../db';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { formatBoatName } from '../utils/constants';
import MarinaBoatModal from './MarinaBoatModal';

import defaultJetImg from '../assets/images/jet.webp';
import defaultLanchaImg from '../assets/images/lancha.webp';

interface MarinaEmbarcacoesPageProps {
  operadorNome?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function MarinaEmbarcacoesPage({
  operadorNome,
  showToast: propShowToast
}: MarinaEmbarcacoesPageProps = {}) {
  // Dados de barcos e clientes
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() || []);
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll() || []);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && boatDB.getAll().length === 0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Navegação Principal de Frota: Marina vs Vale vs Todas
  // Padrão: 'MARINA' (gestão completa da frota da Marina)
  const [fleetTab, setFleetTab] = useState<'MARINA' | 'VALE' | 'ALL'>('MARINA');

  // Filtros rápidos adicionais
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'lancha' | 'jet'>('all');
  const [filterDoc, setFilterDoc] = useState<'all' | 'com_seguro' | 'com_tie'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modais de Criação e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Embarcacao | null>(null);

  // Toast local
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    if (propShowToast) {
      propShowToast(message, type);
    } else {
      setLocalToast({ message, type });
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  // Carregamento de dados
  const loadData = () => {
    const bt = boatDB.getAll() || [];
    const cl = clientDB.getAll() || [];
    setBoats([...bt]);
    setClients([...cl]);
    if (bt.length > 0 || isDbLoaded) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData();

    const unsubscribe = onDbUpdate(() => {
      if (isMounted) loadData();
    });

    if (!isDbLoaded || boatDB.getAll().length === 0) {
      setIsLoading(true);
      syncWithRemote()
        .then(() => {
          if (isMounted) loadData();
        })
        .catch(err => console.error('[MarinaEmbarcacoes] Falha ao sincronizar:', err))
        .finally(() => {
          if (isMounted) setIsLoading(false);
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
      notify('Frota da marina sincronizada com sucesso.');
    } catch (err: any) {
      notify(err.message || 'Erro ao sincronizar frota.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Mapeamento completo de cotistas e proprietários por embarcação (com identificação de cota)
  const boatOwnersMap = useMemo(() => {
    const map = new Map<string, Array<{ client: Cliente; cota?: string }>>();
    const clientMap = new Map<string, Cliente>();
    clients.forEach(c => clientMap.set(c.id, c));

    boats.forEach(b => {
      const list: Array<{ client: Cliente; cota?: string }> = [];

      // 1. Donos listados no array do barco
      if (Array.isArray(b.donos) && b.donos.length > 0) {
        b.donos.forEach(id => {
          const c = clientMap.get(id);
          if (c && !list.some(x => x.client.id === c.id)) {
            let cota = c.cota;
            if (c.embarcacoes && c.embarcacoes.length > 0) {
              const eb = c.embarcacoes.find(x => x.embarcacaoId === b.id);
              if (eb?.cota) cota = eb.cota;
            }
            list.push({ client: c, cota });
          }
        });
      }

      // 2. Clientes com vínculo direto
      clients.forEach(c => {
        const isPrimary = c.embarcacaoId === b.id;
        const matchingEb = Array.isArray(c.embarcacoes) ? c.embarcacoes.find(eb => eb.embarcacaoId === b.id) : null;
        if ((isPrimary || matchingEb) && !list.some(x => x.client.id === c.id)) {
          const cota = matchingEb?.cota || c.cota;
          list.push({ client: c, cota });
        }
      });

      // Ordenar por cota (C1, C2...) ou nome
      list.sort((a, b) => {
        if (a.cota && b.cota) {
          return a.cota.localeCompare(b.cota, undefined, { numeric: true });
        }
        return (a.client.nome || '').localeCompare(b.client.nome || '');
      });

      map.set(b.id, list);
    });

    return map;
  }, [boats, clients]);

  // Identificação do Vínculo: Marina vs Vale
  const isBoatMarina = (b: Embarcacao): boolean => {
    const emp = b.empresas && b.empresas.length > 0 ? b.empresas : ['VALE'];
    return emp.includes('MARINA');
  };

  const isBoatVale = (b: Embarcacao): boolean => {
    const emp = b.empresas && b.empresas.length > 0 ? b.empresas : ['VALE'];
    return emp.includes('VALE') || emp.length === 0;
  };

  // Contagem para as abas
  const countMarina = useMemo(() => boats.filter(b => isBoatMarina(b)).length, [boats]);
  const countVale = useMemo(() => boats.filter(b => isBoatVale(b)).length, [boats]);

  // Embarcações Filtradas
  const filteredBoats = useMemo(() => {
    const term = search.toLowerCase().trim();

    return boats.filter(b => {
      // 1. Aba de Frota (Marina vs Vale vs Todas)
      if (fleetTab === 'MARINA' && !isBoatMarina(b)) return false;
      if (fleetTab === 'VALE' && !isBoatVale(b)) return false;

      // 2. Tipo
      if (filterTipo !== 'all' && b.tipo !== filterTipo) return false;

      // 3. Documentação / Regularidade
      if (filterDoc === 'com_tie' && (!b.inscricao || !b.inscricao.trim())) return false;
      if (filterDoc === 'com_seguro' && (!b.validadeSeguro || !b.validadeSeguro.trim())) return false;

      // 4. Busca Textual
      if (term) {
        const matchName = (b.nome || '').toLowerCase().includes(term);
        const matchCode = getBoatCode(b).toLowerCase().includes(term);
        const matchNumero = (b.numero || '').toLowerCase().includes(term);
        const matchModelo = (b.modelo || '').toLowerCase().includes(term);
        const matchFabricante = (b.fabricante || '').toLowerCase().includes(term);
        const matchVaga = (b.vaga || '').toLowerCase().includes(term);
        const matchInscricao = (b.inscricao || '').toLowerCase().includes(term);

        const owners = boatOwnersMap.get(b.id) || [];
        const matchOwner = owners.some(o => 
          (o.client.nome || '').toLowerCase().includes(term) ||
          (o.client.telefone || '').includes(term) ||
          (o.client.cpf || '').includes(term) ||
          (o.cota || '').toLowerCase().includes(term)
        );

        return matchName || matchCode || matchNumero || matchModelo || matchFabricante || matchVaga || matchInscricao || matchOwner;
      }

      return true;
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [boats, fleetTab, filterTipo, filterDoc, search, boatOwnersMap]);

  // Estatísticas Dinâmicas baseadas na Frota Ativa
  const activeFleetStats = useMemo(() => {
    const baseList = boats.filter(b => {
      if (fleetTab === 'MARINA') return isBoatMarina(b);
      if (fleetTab === 'VALE') return isBoatVale(b);
      return true;
    });

    const total = baseList.length;
    const lanchas = baseList.filter(b => b.tipo === 'lancha').length;
    const jets = baseList.filter(b => b.tipo === 'jet').length;
    const comInscricao = baseList.filter(b => b.inscricao && b.inscricao.trim() !== '').length;
    const comSeguro = baseList.filter(b => b.validadeSeguro && b.validadeSeguro.trim() !== '').length;

    return { total, lanchas, jets, comInscricao, comSeguro };
  }, [boats, fleetTab]);

  const handleOpenCreate = () => {
    setSelectedBoat(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (boat: Embarcacao) => {
    setSelectedBoat(boat);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterTipo('all');
    setFilterDoc('all');
  };

  const hasActiveFilters = search !== '' || filterTipo !== 'all' || filterDoc !== 'all';

  const formatWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return null;
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${withCountry}`;
  };

  // Helper para renderizar badges de documentação e seguro
  const renderDocumentBadges = (boat: Embarcacao) => {
    const badges: React.ReactNode[] = [];

    if (boat.inscricao) {
      badges.push(
        <span 
          key="tie" 
          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 truncate max-w-[160px]"
          title={`Inscrição na Marinha: ${boat.inscricao}`}
        >
          ⚓ {boat.inscricao}
        </span>
      );
    }

    if (boat.validadeSeguro) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(boat.validadeSeguro); target.setHours(0,0,0,0);
      const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const parts = boat.validadeSeguro.split('-');
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : boat.validadeSeguro;
      const isExpired = diff < 0;
      const isExpiring = diff >= 0 && diff <= 30;

      badges.push(
        <span 
          key="seguro" 
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
            isExpired 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : isExpiring 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          title={`Seguro Náutico válido até ${boat.validadeSeguro}`}
        >
          <Shield className="w-2.5 h-2.5 shrink-0" />
          <span>Seguro: {formatted}</span>
        </span>
      );
    }

    if (boat.validadeDocumento) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(boat.validadeDocumento); target.setHours(0,0,0,0);
      const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const parts = boat.validadeDocumento.split('-');
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : boat.validadeDocumento;
      const isExpired = diff < 0;
      const isExpiring = diff >= 0 && diff <= 30;

      badges.push(
        <span 
          key="doc" 
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
            isExpired 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : isExpiring 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
          title={`Documento da Marinha (TIE) válido até ${boat.validadeDocumento}`}
        >
          <FileText className="w-2.5 h-2.5 shrink-0" />
          <span>TIE: {formatted}</span>
        </span>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Toast Local */}
      {localToast && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border animate-in slide-in-from-bottom-5 duration-300 ${
          localToast.type === 'success' ? 'bg-white text-emerald-800 border-emerald-200' : 'bg-white text-rose-800 border-rose-200'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${localToast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-semibold">{localToast.message}</span>
        </div>
      )}

      {/* ─── 1. HEADER DO GERENTE DA MARINA (TEMA AZUL NÁUTICO) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Operações Marina Club
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Gestão Náutica & Regularidade</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Ship className="w-6 h-6 text-blue-600" />
            Controle de Embarcações
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Gerencie a documentação, inscrições na Marinha do Brasil, seguros náuticos e cotistas/clientes vinculados.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Sincronizar com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isSyncing ? 'Atualizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Embarcação</span>
          </button>
        </div>
      </div>

      {/* ─── 2. DUAS ABAS PRINCIPAIS: MARINA vs VALE ADMINISTRADORA ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold w-full sm:w-auto">
          {/* Aba 1: Marina Club (Gestão Completa) */}
          <button
            type="button"
            onClick={() => setFleetTab('MARINA')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              fleetTab === 'MARINA'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ship className="w-4 h-4" />
            <span>Frota Marina Club</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              fleetTab === 'MARINA' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {countMarina}
            </span>
          </button>

          {/* Aba 2: Vale Administradora (Consulta Operacional) */}
          <button
            type="button"
            onClick={() => setFleetTab('VALE')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              fleetTab === 'VALE'
                ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vale Administradora</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              fleetTab === 'VALE' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {countVale}
            </span>
          </button>

          {/* Aba 3: Todas as Embarcações */}
          <button
            type="button"
            onClick={() => setFleetTab('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              fleetTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Todas as Frotas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              fleetTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {boats.length}
            </span>
          </button>
        </div>

        {/* Badge Informativo da Aba Selecionada */}
        <div className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 self-start sm:self-center">
          {fleetTab === 'MARINA' ? (
            <span className="inline-flex items-center gap-1.5 text-blue-800 font-bold text-[11px] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Gestão Plena: Permissão para cadastrar, vincular clientes e gerenciar documentações.
            </span>
          ) : fleetTab === 'VALE' ? (
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-bold text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Consulta Operacional: Visualização de todos os cotistas e especificações da Vale Administradora.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-bold text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Visão Consolidada de todas as embarcações cadastradas.
            </span>
          )}
        </div>
      </div>

      {/* ─── 3. CARDS DE KPIS CONTEXTUAIS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {fleetTab === 'MARINA' ? 'Frota Marina' : fleetTab === 'VALE' ? 'Vale Administradora' : 'Total Geral'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{activeFleetStats.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">veículos</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lanchas</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-700 tabular-nums">{activeFleetStats.lanchas}</span>
            <span className="text-[11px] text-slate-400 font-medium">embarcações</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jet Skis</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-700 tabular-nums">{activeFleetStats.jets}</span>
            <span className="text-[11px] text-slate-400 font-medium">motonáutica</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inscrição Marinha</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-800 tabular-nums">{activeFleetStats.comInscricao}</span>
            <span className="text-[11px] text-slate-400 font-medium">com registro</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seguro Náutico</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{activeFleetStats.comSeguro}</span>
            <span className="text-[11px] text-slate-400 font-medium">segurados</span>
          </div>
        </div>
      </div>

      {/* ─── 4. TOOLBAR DE BUSCA E FILTROS ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome do barco, modelo, inscrição Marinha ou cotista..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-700 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros em linha */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Filtro de Tipo */}
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white cursor-pointer"
            >
              <option value="all">Todos os tipos</option>
              <option value="lancha">Somente Lanchas</option>
              <option value="jet">Somente Jet Skis</option>
            </select>

            {/* Filtro de Documentação */}
            <select
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white cursor-pointer"
            >
              <option value="all">Toda regularidade</option>
              <option value="com_tie">Com Inscrição Marinha</option>
              <option value="com_seguro">Com Seguro Náutico</option>
            </select>

            {/* Alternador Cards vs Tabela */}
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-slate-500">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
                title="Visualização em cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
                title="Visualização em tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Filtros:</span>
              {search && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  "{search}"
                </span>
              )}
              {filterTipo !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  Tipo: {filterTipo === 'lancha' ? 'Lancha' : 'Jet Ski'}
                </span>
              )}
              {filterDoc !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  {filterDoc === 'com_tie' ? 'Com Inscrição Marinha' : 'Com Seguro Náutico'}
                </span>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ─── 5. LISTAGEM DE EMBARCAÇÕES ─── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-blue-600 mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Carregando embarcações...</h3>
        </div>
      ) : filteredBoats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 mx-auto flex items-center justify-center text-blue-600 mb-3 border border-blue-100">
            <Ship className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma embarcação encontrada</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
            {fleetTab === 'MARINA'
              ? 'Ainda não há embarcações cadastradas na frota da Marina Club. Clique no botão abaixo para cadastrar a primeira.'
              : 'Nenhuma embarcação corresponde aos filtros aplicados.'}
          </p>

          {fleetTab === 'MARINA' && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Embarcação da Marina</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── GRADE DE CARDS (TEMA AZUL NÁUTICO + DOCUMENTAÇÃO & VALIDADES) ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoats.map(boat => {
            const isMarina = isBoatMarina(boat);
            const ownersList = boatOwnersMap.get(boat.id) || [];
            const defaultImg = boat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg;
            const imgSrc = boat.imagemUrl?.trim() || defaultImg;
            const docBadges = renderDocumentBadges(boat);

            return (
              <div
                key={boat.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Imagem + Badges do Topo */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={boat.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultImg;
                    }}
                  />

                  {/* Gradiente sutil para leitura dos badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  {/* Badge de Empresa (Marina Club vs Vale Administradora) & Tipo */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase shadow-xs ${
                      isMarina 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900/90 text-slate-200 backdrop-blur-xs'
                    }`}>
                      {isMarina ? 'Marina Club' : 'Vale Administradora'}
                    </span>

                    {/* Tag de Tipo */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 text-slate-800 backdrop-blur-xs shadow-xs">
                      {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                    </span>
                  </div>

                  {/* Horímetro Discreto no Canto Inferior */}
                  {boat.horasMotor !== undefined && (
                    <div className="absolute bottom-2.5 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.8 rounded-lg border border-white/20 text-[11px] font-bold text-white">
                      <Gauge className="w-3 h-3 text-sky-300" />
                      <span>{boat.horasMotor}h</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {boat.nome}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {boat.modelo || 'Modelo não especificado'} {boat.ano ? `• Ano ${boat.ano}` : ''}
                        </p>
                      </div>

                      {boat.numero && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {getBoatCode(boat)}
                        </span>
                      )}
                    </div>

                    {/* Especificações Técnicas (com vaga discreta se houver) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      {boat.potencia && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Motorização:</span>
                          <span className="font-semibold">{boat.potencia}</span>
                        </div>
                      )}
                      {boat.capacidadePassageiros && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Lotação:</span>
                          <span className="font-semibold">{boat.capacidadePassageiros} pessoas</span>
                        </div>
                      )}
                      {boat.tamanho && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Comprimento:</span>
                          <span className="font-semibold">{boat.tamanho}</span>
                        </div>
                      )}
                      {boat.vaga && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Vaga:</span>
                          <span className="font-semibold text-slate-700">{boat.vaga}</span>
                        </div>
                      )}
                    </div>

                    {/* ─── BADGES DE REGULARIDADE (INSCRIÇÃO MARINHA & VALIDADES) ─── */}
                    {docBadges.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                        {docBadges}
                      </div>
                    )}

                    {/* ─── CAMPO DE COTISTAS / PROPRIETÁRIOS (EXIBE TODOS!) ─── */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          {isMarina ? 'Proprietários Vinculados' : 'Cotistas da Vale Administradora'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {ownersList.length} {ownersList.length === 1 ? 'cotista' : 'cotistas'}
                        </span>
                      </div>

                      {ownersList.length > 0 ? (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto subtle-scrollbar pr-0.5">
                          {ownersList.map(({ client: c, cota }) => {
                            const whatsappUrl = formatWhatsAppUrl(c.telefone);

                            return (
                              <div
                                key={c.id}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between gap-2 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* Badge da Cota (se houver, ex: C1, C2...) */}
                                  {cota ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                      {cota}
                                    </span>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] shrink-0">
                                      <User className="w-2.5 h-2.5" />
                                    </div>
                                  )}

                                  <span className="font-semibold text-slate-800 truncate" title={c.nome}>
                                    {c.nome}
                                  </span>
                                </div>

                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors shrink-0"
                                    title={`Conversar com ${c.nome} no WhatsApp (${c.telefone})`}
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-[11px] text-slate-400 italic">
                          Nenhum cotista ou proprietário vinculado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isMarina ? (
                      <>
                        <span className="text-[10px] text-blue-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Frota Marina
                        </span>

                        <button
                          onClick={() => handleOpenEdit(boat)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Modo Consulta
                        </span>

                        <button
                          onClick={() => handleOpenEdit(boat)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Detalhes</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── TABELA / LISTA (TEMA AZUL NÁUTICO) ─── */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Embarcação</th>
                  <th className="py-3 px-4">Empresa / Frota</th>
                  <th className="py-3 px-4">Inscrição & Regularidade</th>
                  <th className="py-3 px-4">Horímetro</th>
                  <th className="py-3 px-4">Vaga</th>
                  <th className="py-3 px-4">Cotistas / Proprietários</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredBoats.map(boat => {
                  const isMarina = isBoatMarina(boat);
                  const ownersList = boatOwnersMap.get(boat.id) || [];
                  const docBadges = renderDocumentBadges(boat);

                  return (
                    <tr key={boat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            {boat.tipo === 'jet' ? <Gauge className="w-3.5 h-3.5" /> : <Ship className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{boat.nome}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{boat.modelo || 'Sem modelo'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isMarina 
                            ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isMarina ? 'Marina Club' : 'Vale Administradora'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {docBadges.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {docBadges}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 tabular-nums font-bold">
                        {boat.horasMotor !== undefined ? `${boat.horasMotor}h` : '-'}
                      </td>

                      <td className="py-3 px-4">
                        {boat.vaga ? (
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {boat.vaga}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {ownersList.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {ownersList.map(({ client: c, cota }) => {
                              const whatsappUrl = formatWhatsAppUrl(c.telefone);
                              return (
                                <span 
                                  key={c.id} 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] border border-slate-200"
                                >
                                  {cota && (
                                    <strong className="text-blue-700 text-[10px]">{cota}:</strong>
                                  )}
                                  <span>{c.nome.split(' ')[0]}</span>
                                  {whatsappUrl && (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-600 hover:text-emerald-800"
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isMarina ? (
                          <button
                            onClick={() => handleOpenEdit(boat)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(boat)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CADASTRO / EDIÇÃO / CONSULTA ─── */}
      <MarinaBoatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingBoat={selectedBoat}
        clients={clients}
        onSave={(saved) => {
          loadData();
          notify(`Embarcação "${saved.nome}" salva com sucesso.`);
        }}
        onDelete={(id, name) => {
          loadData();
          notify(`Embarcação "${name}" excluída.`);
        }}
      />

    </div>
  );
}
