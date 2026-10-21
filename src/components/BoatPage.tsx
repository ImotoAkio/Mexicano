import React, { useState, useMemo } from 'react';
import { boatDB, clientDB, isDbLoaded } from '../db';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { Ship, Plus, Search, Trash2, Edit2, User, Key, Check, X, ShieldAlert, Anchor, Wrench, RefreshCw, Zap, Upload, Image as ImageIcon, Volume2, List, LayoutGrid, ChevronDown, Filter } from 'lucide-react';
import BoatModal from './BoatModal';

import defaultJetImg from '../assets/images/jet.webp';
import defaultLanchaImg from '../assets/images/lancha.webp';

interface BoatPageProps {
  showWhatsAppMapping?: boolean;
}

interface SearchableSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  id?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const EMPRESA_OPTIONS: SearchableSelectOption[] = [
  { id: 'all', label: 'Todas as empresas', description: 'VALE, MARINA e MEXICANO' },
  { id: 'VALE', label: 'VALE NÁUTICA', description: 'Operações Vale Náutica' },
  { id: 'MARINA', label: 'MARINA', description: 'Operações Marina' },
  { id: 'MEXICANO', label: 'MEXICANO', description: 'Operações Mexicano' }
];

function SearchableSelect({ id, label, icon: Icon, value, options, onChange, placeholder = "Buscar..." }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value) || options[0];

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          {Icon && <Icon className="w-3 h-3 text-slate-400" />}
          {label}
        </label>
      )}

      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white transition-all cursor-pointer shadow-xs text-left text-slate-700 font-semibold"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : 'Selecione...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-[220px]">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#186b77] text-slate-800 placeholder-slate-400 font-medium transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 subtle-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isSelected ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.description}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                Nenhum item encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoatPage({ showWhatsAppMapping = true }: BoatPageProps) {
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;

    const syncState = () => {
      const dbBoats = boatDB.getAll();
      const dbClients = clientDB.getAll();

      // If we have data, we just update it
      if (dbBoats.length > 0) {
        setBoats(prev => prev.length !== dbBoats.length ? dbBoats : prev);
      }
      if (dbClients.length > 0) {
        setClients(prev => prev.length !== dbClients.length ? dbClients : prev);
      }

      // If db finished loading (or already had data), drop the loader
      if (isDbLoaded || dbBoats.length > 0) {
        setIsLoading(false);
        if (isDbLoaded) {
          // Once the DB marks as fully loaded from remote, we can clear the aggressive 100ms interval
          clearInterval(interval);
          clearTimeout(timeout);
        }
      }
    };

    // If already loaded or already have data, don't show loader at all
    if (isDbLoaded || boatDB.getAll().length > 0) {
      setIsLoading(false);
      syncState(); // ensure data is up to date immediately
    } else {
      // Aggressively check until `isDbLoaded` turns true
      interval = setInterval(syncState, 150);

      // Fallback just in case `isDbLoaded` never happens (e.g. some uncaught promise error elsewhere)
      timeout = setTimeout(() => {
        setIsLoading(false);
        clearInterval(interval);
      }, 8000);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // Run only on mount

  const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Form states... keeping them for the modal logic even though modal is separate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingOwners, setViewingOwners] = useState<{ boatName: string; owners: Cliente[] } | null>(null);

  const adminRole = useMemo(() => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  }, []);

  // Custom Confirm State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [mappingState, setMappingState] = useState<Record<string, string>>({}); // boat.id -> group.id

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3550);
  };

  const handleRefresh = () => {
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (boat: Embarcacao) => {
    setEditingId(boat.id);
    setIsModalOpen(true);
  };

  const initiateDelete = (id: string, name: string) => {
    setDeleteConfirmation({ id, name });
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;
    try {
      boatDB.delete(deleteConfirmation.id);
      showToast('Embarcação excluída com sucesso.');
      setDeleteConfirmation(null);
      setIsModalOpen(false);
      setEditingId(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover embarcação', 'error');
    }
  };

  // WhatsApp Sync Mapping (preserving logic)
  const handleOpenMappingModal = async () => {
    setIsMappingModalOpen(true);
    setIsFetchingGroups(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/whatsapp/groups', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.groups)) {
        showToast(data.message || 'Falha ao baixar lista de grupos da API', 'error');
        setAvailableGroups([]);
        setIsFetchingGroups(false);
        return;
      }

      const unique = Array.from(new Map(data.groups.map((g: any) => [g.id || g.jid, g])).values());
      setAvailableGroups(unique);

      const newMapping: Record<string, string> = {};
      const currentBoats = boatDB.getAll();
      let suggestionsCount = 0;

      for (const b of currentBoats) {
        if (b.whatsappGroupId) {
          newMapping[b.id] = b.whatsappGroupId;
          continue;
        }

        const paddedNum = b.numero ? b.numero.padStart(2, '0') : '';
        const standardName = `VILA NÁUTICA ${paddedNum}`;
        const group = data.groups.find((g: any) => {
          const subject = (g.subject || g.name || '').toUpperCase();
          if (paddedNum && subject.includes(standardName.toUpperCase())) return true;
          if (b.nome && subject.includes(b.nome.toUpperCase())) return true;
          return false;
        });

        if (group) {
          newMapping[b.id] = group.id;
          suggestionsCount++;
        }
      }

      setMappingState(newMapping);
      showToast(`Carregados ${data.groups.length} grupos. ${suggestionsCount} associações sugeridas.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao mapear grupos da API', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleSaveMapping = () => {
    try {
      const currentBoats = boatDB.getAll();
      let count = 0;
      for (const b of currentBoats) {
        const newGroupId = mappingState[b.id] || '';
        if (newGroupId !== (b.whatsappGroupId || '')) {
          boatDB.update(b.id, { whatsappGroupId: newGroupId || undefined });
          count++;
        }
      }
      handleRefresh();
      setIsMappingModalOpen(false);
      showToast(`Mapeamento salvo! ${count} embarcações atualizadas.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar mapeamento', 'error');
    }
  };

  const handleMappingChange = (boatId: string, groupId: string) => {
    setMappingState(prev => ({ ...prev, [boatId]: groupId }));
  };

  const defaultImage = (type: string) => type === 'jet' ? '/jet.webp' : '/lancha.webp';

  const filteredBoats = boats.filter(b => {
    let matchesEmpresa = true;
    if (filterEmpresa !== 'all') {
      matchesEmpresa = (b.empresas || ['VALE']).includes(filterEmpresa);
    }

    let matchesTipo = true;
    if (filterTipo !== 'all') {
      matchesTipo = b.tipo === filterTipo;
    }

    let matchesStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'pronta') {
        matchesStatus = !b.emManutencao;
      } else if (filterStatus === 'manutencao') {
        matchesStatus = !!b.emManutencao;
      }
    }

    const matchesSearch = !search || (
      (b.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.numero || '').includes(search) ||
      (b.modelo || '').toLowerCase().includes(search.toLowerCase()) ||
      // Search in owners/cotistas names
      (b.cotistas && b.cotistas.some(c => c.nome?.toLowerCase().includes(search.toLowerCase())))
    );

    return matchesSearch && matchesEmpresa && matchesTipo && matchesStatus;
  });

  const clearFilters = () => {
    setSearch('');
    setFilterEmpresa('all');
    setFilterTipo('all');
    setFilterStatus('all');
  };

  const activeFilterCount = (filterEmpresa !== 'all' ? 1 : 0) + (filterTipo !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (search ? 1 : 0);

  return (
    <div id="boats-list-section" className="flex flex-col w-full h-full space-y-6 sm:space-y-8 animate-in fade-in duration-300 font-sans">

      {/* Toast Notificação */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'success' ? 'bg-white text-emerald-800 border-emerald-200' : 'bg-white text-rose-800 border-rose-200'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Estilo Apple / PeçasKanban */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5 opacity-80">
              <span>Gestão</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Cadastro de Embarcações</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              Embarcações & Frotas
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Reúna o histórico, especificações e relacione aos proprietários (coproprietários).</p>
          </div>

          {/* Espaço removido */}
        </div>

        {/* Toolbar de Ações (Filtro, Busca e Botões) */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col gap-3 text-sm transition-shadow hover:shadow-md">

          {/* Top Row: Search and Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Campo de Pesquisa Fluído */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-boats"
                type="text"
                placeholder="Pesquisar ex: M19, modelo, proprietário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 flex-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white transition-all shadow-inner-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <div className="flex p-0.5 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner-xs mr-auto md:mr-2">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Blocos"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>

              {showWhatsAppMapping && (
                <button
                  onClick={handleOpenMappingModal}
                  className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-[#186b77] bg-teal-50 border border-teal-100 hover:bg-teal-100 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Mapear grupos"
                >
                  <Zap className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Map. Wpp</span>
                </button>
              )}

              <button
                id="btn-new-boat"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-extrabold text-white bg-[#186b77] hover:bg-[#12555f] rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer text-center"
              >
                <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                Nova <span className="hidden sm:inline ml-1"> Embarcação</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Filters (Selects) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Type Filter */}
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186b77] cursor-pointer"
              >
                <option value="all">Todas Categorias</option>
                <option value="lancha">Somente Lanchas</option>
                <option value="jet">Somente Jet Skis</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186b77] cursor-pointer"
              >
                <option value="all">Qualquer Status</option>
                <option value="pronta">Pronta / Em Uso</option>
                <option value="manutencao">Em Manutenção</option>
              </select>

              {/* Company Filter (SearchableSelect fits strangely in a tight row of default selects if it's too big, let's just make it a standard select for spacing or use the component */}
              <div className="w-full sm:w-48">
                <SearchableSelect
                  id="select-filter-empresa"
                  value={filterEmpresa}
                  onChange={setFilterEmpresa}
                  placeholder="Empresa..."
                  options={EMPRESA_OPTIONS}
                />
              </div>

              {/* Clear filters button */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 rounded-lg transition-colors cursor-pointer ml-auto sm:ml-0"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  Limpar ({activeFilterCount})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative h-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-2xl min-h-[300px] text-center animate-in fade-in duration-300 shadow-xs">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#186b77] border-t-transparent animate-spin"></div>
              <Ship className="absolute inset-0 m-auto w-5 h-5 text-[#186b77] animate-pulse" />
            </div>
            <p className="text-base font-bold text-slate-800">Carregando frota...</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Sincronizando as embarcações com a base de dados.</p>
          </div>
        ) : filteredBoats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl text-center shadow-xs">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Ship className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            </div>
            <p className="text-base font-bold text-slate-800">Nenhum registro encontrado</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mb-4">Tente usar outros termos de busca ou utilize o botão acima para adicionar uma nova embarcação.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros ativos
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (

          /* VISÃO LISTA / TABELA (MODERNIZADA) */
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[840px] text-left border-collapse">
                <thead className="bg-[#f8faf9] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-5">Embarcação</th>
                    <th className="py-4 px-5">Vaga</th>
                    <th className="py-4 px-5">Especificações</th>
                    <th className="py-4 px-5">Cotistas Ativos</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Opções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-xs font-medium bg-white">
                  {filteredBoats.map((boat) => {
                    const ownerNames = boat.donos
                      .map(id => clientDB.getById(id))
                      .filter((c): c is Cliente => !!c);

                    return (
                      <tr id={`boat-row-${boat.id}`} key={boat.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* 1. Imagem e Nome */}
                        <td className="py-3 px-5">
                          <div className="flex items-center space-x-3.5">
                            {boat.imagemUrl ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                                <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border shadow-2xs ${boat.tipo === 'jet' ? 'bg-amber-50 border-amber-200 border-opacity-50' : 'bg-slate-50 border-slate-200'}`}>
                                <img src={boat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg} alt={boat.nome} className="w-full h-full object-cover opacity-90" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm tracking-tight">{getBoatCode(boat)}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                                Doc: {boat.nome}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Vaga */}
                        <td className="py-3 px-5">
                          {boat.vaga ? (
                            <span className="inline-flex items-center px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-inner-xs">
                              {boat.vaga}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">-</span>
                          )}
                        </td>

                        {/* 3. Specs */}
                        <td className="py-3 px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 text-xs">{boat.modelo || 'Sem modelo definido'}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {boat.fabricante ? `${boat.fabricante} • ` : ''}{boat.ano}
                            </span>
                          </div>
                        </td>

                        {/* 4. Cotistas */}
                        <td className="py-3 px-5">
                          {ownerNames.length === 0 ? (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                              Nenhum cotista
                            </span>
                          ) : (
                            <div
                              className="flex flex-col gap-1.5 cursor-pointer group/owners"
                              onClick={() => setViewingOwners({ boatName: getBoatCode(boat), owners: ownerNames })}
                            >
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover/owners:text-[#186b77] transition-colors">{ownerNames.length} Associado{ownerNames.length > 1 ? 's' : ''}</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {ownerNames.slice(0, 4).map((owner) => (
                                  <div key={owner.id} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center shadow-xs" title={owner.nome}>
                                    <span className="text-[9px] font-bold text-slate-600">{owner.nome.substring(0, 1).toUpperCase()}</span>
                                  </div>
                                ))}
                                {ownerNames.length > 4 && (
                                  <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center shadow-xs">
                                    <span className="text-[9px] font-bold text-slate-600">+{ownerNames.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 5. Status */}
                        <td className="py-3 px-5 text-center">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-xs ${
                              boat.emManutencao ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${boat.emManutencao ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                              {boat.emManutencao ? 'Oficina' : 'Pronta'}
                            </span>
                            {boat.temSom && (
                              <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-1.5 rounded-md mt-0.5">
                                C/ Som
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Ações */}
                        <td className="py-3 px-5 text-right align-middle">
                          <div className="flex items-center justify-end space-x-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditModal(boat)}
                              className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95"
                              title="Editar Detalhes"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => initiateDelete(boat.id, boat.nome)}
                              className="p-1.5 bg-white border border-rose-100 hover:border-rose-200 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VISÃO CARDS / GRID (MODERNIZADA) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredBoats.map(boat => {
              const ownerNames = boat.donos
                .map(id => clientDB.getById(id))
                .filter((c): c is Cliente => !!c);

              return (
                <div id={`boat-card-${boat.id}`} key={boat.id} className="group relative bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#186b77]/30 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300">
                  {/* Floating Action Menu no topo direito */}
                  <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => handleOpenEditModal(boat)}
                      className="p-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-600 hover:text-[#186b77] hover:border-[#186b77]/40 shadow-sm transition-all cursor-pointer active:scale-90"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateDelete(boat.id, boat.nome);
                      }}
                      className="p-1.5 bg-white/90 backdrop-blur-sm border border-rose-100 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 shadow-sm transition-all cursor-pointer active:scale-90"
                      title="Excluir Embarcação"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="flex flex-col mb-4">
                    {/* Cabeçalho do Card (Imagem & Title) */}
                    <div className="flex items-start gap-4">
                      {boat.imagemUrl ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 shadow-md">
                          <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 shadow-md ${boat.tipo === 'jet' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <img src={boat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg} alt={boat.nome} className="w-full h-full object-cover opacity-90" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-8">
                        <h4 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight truncate">{getBoatCode(boat)}</h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                            boat.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações Resumidas do Card */}
                  <div className="bg-[#f8faf9] rounded-xl p-3 border border-slate-100 mb-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium tracking-wide">Ano Fab/Modelo:</span>
                      <span className="font-bold text-slate-700">{boat.ano || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium tracking-wide">Modelo:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[120px]">{boat.modelo || 'N/I'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium tracking-wide">Vaga:</span>
                      <span className="font-bold text-slate-700">{boat.vaga || '-'}</span>
                    </div>

                    {/* Status Tags Mini */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                       {boat.emManutencao ? (
                         <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-50 text-rose-700 flex items-center border border-rose-100">
                           <Wrench className="w-2.5 h-2.5 mr-1" />
                           Manutenção
                         </span>
                       ) : (
                         <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 flex items-center border border-emerald-100">
                           Pronta
                         </span>
                       )}
                       {boat.temSom && (
                         <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 flex items-center border border-indigo-100">
                           <Volume2 className="w-2.5 h-2.5 mr-1" />
                           Som
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Cotistas Footer */}
                  <div
                    className="mt-auto cursor-pointer group/owners"
                    onClick={() => {
                      if (ownerNames.length > 0) {
                        setViewingOwners({ boatName: getBoatCode(boat), owners: ownerNames });
                      }
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover/owners:text-[#186b77] transition-colors">
                         Cotistas Associados
                       </span>
                       <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-1.5 rounded group-hover/owners:bg-teal-50 group-hover/owners:text-[#186b77] transition-colors">
                         {ownerNames.length}
                       </span>
                    </div>

                    {ownerNames.length > 0 ? (
                      <div className="flex -space-x-2 overflow-hidden py-1">
                        {ownerNames.slice(0, 6).map((owner) => (
                          <div key={owner.id} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-2xs flex items-center justify-center text-[10px] font-extrabold text-slate-600" title={owner.nome}>
                            {owner.nome.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {ownerNames.length > 6 && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-2xs flex items-center justify-center text-[10px] font-extrabold text-[#186b77]">
                            +{ownerNames.length - 6}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-8 flex items-center">
                        <span className="text-xs text-amber-600 font-medium italic">Falta relacionar sócio...</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Cadastro / Edição de Embarcação (Mantido igual) */}
      <BoatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => handleRefresh()}
        onDelete={(id, name) => initiateDelete(id, name)}
        editingBoat={editingId ? boats.find(b => b.id === editingId) : null}
        clients={clients}
        showWhatsAppMapping={showWhatsAppMapping}
      />

      {/* Cotistas Modal */}
      {viewingOwners && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/80 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Associados</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">{viewingOwners.boatName}</p>
              </div>
              <button
                onClick={() => setViewingOwners(null)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 subtle-scrollbar space-y-2 bg-slate-50/30">
              {viewingOwners.owners.map(owner => (
                <div key={owner.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-[#186b77]/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                    {owner.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{owner.nome}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{owner.telefone || 'Sem telefone cadastrado'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => setViewingOwners(null)}
                className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal Redesigned */}
      {deleteConfirmation && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100 shadow-inner-xs">
                <ShieldAlert className="h-7 w-7 stroke-[2]" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Remover Embarcação?</h3>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Gostaria de excluir permanentemente <span className="font-bold text-slate-800">"{deleteConfirmation.name}"</span> do sistema?
              </p>
              <div className="mt-4 p-3 bg-rose-50/80 rounded-xl text-rose-700 text-[11px] text-left font-semibold leading-relaxed border border-rose-100/50">
                ⚠️ Todas as reservas e ordens de serviço (manutenção) atreladas a ela serão perdidas permanentemente. Essa ação é irreversível.
              </div>
            </div>

            <div className="bg-slate-50/80 px-6 py-5 flex gap-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Mapping Modal Redesigned */}
      {showWhatsAppMapping && isMappingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/80 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Mapeamento de WhatsApp</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">Conecte embarcações aos grupos do Evolution API.</p>
              </div>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 subtle-scrollbar bg-slate-50/30">
              {isFetchingGroups ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#186b77] animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-700">Carregando grupos da Evolution API...</p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4 stroke-1" />
                  <p className="text-base font-bold text-slate-800">Nenhum grupo encontrado</p>
                  <p className="text-sm text-slate-500 mt-1">Verifique a conexão da API nas Configurações.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {boats.map(boat => (
                    <div key={boat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-[#186b77]/30 transition-colors">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-slate-800">{boat.nome}</p>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-slate-50 text-slate-700">M{(boat.numero || '').padStart(2,'0')}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">{boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}</p>
                      </div>
                      <div className="w-full sm:w-[55%]">
                        <select
                          value={mappingState[boat.id] || ''}
                          onChange={(e) => handleMappingChange(boat.id, e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:border-transparent font-medium text-slate-700 cursor-pointer shadow-inner-xs"
                        >
                          <option value="">-- Sem Grupo Associado --</option>
                          {availableGroups.map((g, idx) => (
                            <option key={g.id ? `grp-${g.id}-${idx}` : `grp-${idx}`} value={g.id}>{g.subject || g.name || g.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white px-6 py-5 flex gap-3 border-t border-slate-100 shadow-[0_-4px_15px_-10px_rgba(0,0,0,0.05)]">
               <button
                onClick={() => setIsMappingModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
               >
                Cancelar
               </button>
               <button
                onClick={handleSaveMapping}
                disabled={isFetchingGroups}
                className="flex-1 rounded-xl bg-[#186b77] hover:bg-[#12555f] px-4 py-2.5 text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95"
               >
                Salvar Associações
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}