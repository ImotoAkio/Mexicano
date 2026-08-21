import React, { useState, useMemo } from 'react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { Ship, Plus, Search, Trash2, Edit2, User, Key, Check, X, ShieldAlert, Anchor, Wrench, RefreshCw, Zap, Upload, Image as ImageIcon, Volume2, List, LayoutGrid, ChevronDown } from 'lucide-react';
import Select from 'react-select';
import BoatModal from './BoatModal';

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
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 transition-all cursor-pointer shadow-xs text-left text-slate-700 font-semibold"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : 'Selecione...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 placeholder-slate-400 font-medium"
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
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
                        <span className="text-[10px] text-slate-400 mt-0.5">{opt.description}</span>
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

  React.useEffect(() => {
    const checkData = () => {
      const dbBoats = boatDB.getAll();
      const dbClients = clientDB.getAll();
      if (dbBoats.length > 0 && boats.length === 0) setBoats(dbBoats);
      if (dbClients.length > 0 && clients.length === 0) setClients(dbClients);
    };
    const interval = setInterval(checkData, 500);
    return () => clearInterval(interval);
  }, [boats.length, clients.length]);
  const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'jet' | 'lancha'>('lancha');
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [modelo, setModelo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [chassi, setChassi] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [tipoPropulsao, setTipoPropulsao] = useState('MOTOR');
  const [potencia, setPotencia] = useState('');
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]); // client IDs (unlimited)
  const [ownerSearch, setOwnerSearch] = useState('');
  const [googleCalendarId, setGoogleCalendarId] = useState(''); // Google Calendar ID directly linked to the boat
  const [whatsappGroupId, setWhatsappGroupId] = useState(''); // Evolution API WhatsApp Group ID
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingState, setMappingState] = useState<Record<string, string>>({}); // boat.id -> group.id
  const [emManutencao, setEmManutencao] = useState(false);
  const [temSom, setTemSom] = useState(false);
  const [imagemUrl, setImagemUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [isUploadingDocumento, setIsUploadingDocumento] = useState(false);
  const [seguroUrl, setSeguroUrl] = useState('');
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);

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
  const [isUploadingSeguro, setIsUploadingSeguro] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Custom Confirm State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    setTipo('lancha');
    setNome('');
    setNumero('');
    setModelo('');
    setFabricante('');
    setAno(new Date().getFullYear());
    setChassi('');
    setInscricao('');
    setTipoPropulsao('MOTOR');
    setPotencia('');
    setSelectedDonos([]);
    setOwnerSearch('');
    setGoogleCalendarId('');
    setWhatsappGroupId('');
    setEmManutencao(false);
    setTemSom(false);
    setImagemUrl('');
    setDocumentoUrl('');
    setSeguroUrl('');
    setEmpresas(['VALE']);
    setIsAdvancedOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (boat: Embarcacao) => {
    setEditingId(boat.id);
    setTipo(boat.tipo);
    setNome(boat.nome);
    setNumero(boat.numero);
    setModelo(boat.modelo);
    setFabricante(boat.fabricante);
    setAno(boat.ano);
    setChassi(boat.chassi || '');
    setInscricao(boat.inscricao || '');
    setTipoPropulsao(boat.tipo_propulsao || 'MOTOR');
    setPotencia(boat.potencia || '');
    setSelectedDonos(boat.donos);
    setOwnerSearch('');
    
    // Attempt to read from global calendar mapping if local one is empty
    let mappedId = boat.googleCalendarId || '';
    if (!mappedId) {
      try {
        const mappingsStr = localStorage.getItem('nautical_calendar_mappings');
        if (mappingsStr) {
          const mappings = JSON.parse(mappingsStr);
          mappedId = mappings[boat.nome] || mappings[boat.id] || '';
        }
      } catch (e) {}
    }
    setGoogleCalendarId(mappedId);
    
    setWhatsappGroupId(boat.whatsappGroupId || '');
    setAvailableGroups([]);
    setEmManutencao(boat.emManutencao || false);
    setTemSom(boat.temSom || false);
    setImagemUrl(boat.imagemUrl || '');
    setDocumentoUrl(boat.documentoUrl || '');
    setSeguroUrl(boat.seguroUrl || '');
    setEmpresas(boat.empresas && boat.empresas.length > 0 ? boat.empresas : ['VALE']);
    setIsAdvancedOpen(Boolean(mappedId || boat.whatsappGroupId));
    setIsModalOpen(true);
  };

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setAvailableGroups(data.groups);
        showToast(`Foram carregados ${data.groups.length} grupos do WhatsApp com sucesso!`);
      } else {
        showToast(data.message || 'Falha ao buscar grupos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao conectar à API de grupos', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleOpenMappingModal = async () => {
    setIsMappingModalOpen(true);
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.groups)) {
        showToast(data.message || 'Falha ao baixar lista de grupos da API', 'error');
        setAvailableGroups([]);
        setIsFetchingGroups(false);
        return;
      }

      setAvailableGroups(data.groups);

      // Auto suggest
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem não pode ter mais que 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload/boat-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImagemUrl(data.imageUrl);
        showToast('Imagem carregada com sucesso!');
      } else {
        showToast(data.message || 'Erro ao fazer upload da imagem', 'error');
      }
    } catch (err: any) {
      showToast('Falha na comunicação com o servidor para envio de imagem', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'documento' | 'seguro') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'documento') setIsUploadingDocumento(true);
    else setIsUploadingSeguro(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload/boat-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'documento') setDocumentoUrl(data.documentUrl);
        else setSeguroUrl(data.documentUrl);
        showToast('Arquivo carregado com sucesso!');
      } else {
        showToast(data.message || 'Erro ao fazer upload do arquivo', 'error');
      }
    } catch (err: any) {
      showToast('Falha na comunicação com o servidor', 'error');
    } finally {
      if (type === 'documento') setIsUploadingDocumento(false);
      else setIsUploadingSeguro(false);
    }
  };

  const handleToggleOwner = (clientId: string) => {
    if (selectedDonos.includes(clientId)) {
      setSelectedDonos(selectedDonos.filter(id => id !== clientId));
    } else {
      setSelectedDonos([...selectedDonos, clientId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !numero.trim()) {
      showToast('Nome e número do veículo são campos obrigatórios.', 'error');
      return;
    }

    const cleanNum = numero.trim().toUpperCase().replace(/M/g, '').replace(/\D/g, '');
    if (!cleanNum) {
      showToast('Por favor, informe uma numeração válida para o veículo.', 'error');
      return;
    }

    if (selectedDonos.length === 0) {
      showToast('Por favor, selecione pelo menos 1 proprietário.', 'error');
      return;
    }

    try {
      if (editingId) {
        boatDB.update(editingId, {
          tipo,
          nome,
          numero: cleanNum,
          modelo,
          fabricante,
          ano,
          chassi: chassi.trim() || undefined,
          inscricao: inscricao.trim() || undefined,
          tipo_propulsao: tipoPropulsao.trim() || undefined,
          potencia: potencia.trim() || undefined,
          donos: selectedDonos,
          googleCalendarId: googleCalendarId.trim() || undefined,
          whatsappGroupId: whatsappGroupId.trim() || undefined,
          emManutencao,
          temSom,
          imagemUrl: imagemUrl || undefined,
          documentoUrl: documentoUrl || undefined,
          seguroUrl: seguroUrl || undefined,
          empresas
        });
        showToast('Embarcação atualizada com sucesso!');
      } else {
        boatDB.create({
          tipo,
          nome,
          numero: cleanNum,
          modelo,
          fabricante,
          ano,
          chassi: chassi.trim() || undefined,
          inscricao: inscricao.trim() || undefined,
          tipo_propulsao: tipoPropulsao.trim() || undefined,
          potencia: potencia.trim() || undefined,
          donos: selectedDonos,
          googleCalendarId: googleCalendarId.trim() || undefined,
          whatsappGroupId: whatsappGroupId.trim() || undefined,
          emManutencao,
          temSom,
          imagemUrl: imagemUrl || undefined,
          documentoUrl: documentoUrl || undefined,
          seguroUrl: seguroUrl || undefined
        });
        showToast('Embarcação cadastrada com sucesso!');
      }
      
      // Save calendar mappings to global config
      try {
        if (googleCalendarId.trim()) {
          const mappingsStr = localStorage.getItem('nautical_calendar_mappings');
          const mappings = mappingsStr ? JSON.parse(mappingsStr) : {};
          mappings[nome] = googleCalendarId.trim();
          localStorage.setItem('nautical_calendar_mappings', JSON.stringify(mappings));
          
          const token = localStorage.getItem('admin_token');
          if (token) {
            fetch('/api/calendar/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ calendar_mappings: mappings })
            }).catch(console.error);
          }
        }
      } catch (e) {}

      setIsModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar embarcação', 'error');
    }
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
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover embarcação', 'error');
    }
  };

  const filteredBoats = boats.filter(b => {
    let matchesEmpresa = true;
    if (filterEmpresa !== 'all') {
      matchesEmpresa = (b.empresas || ['VALE']).includes(filterEmpresa);
    }

    const matchesSearch = !search || (
      (b.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.numero || '').includes(search) ||
      (b.modelo || '').toLowerCase().includes(search.toLowerCase())
    );

    return matchesSearch && matchesEmpresa;
  });

  return (
    <div id="boats-list-section" className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Embarcações</h2>
          <p className="text-sm text-slate-500">Registre os veículos náuticos (Lanchas e Jets) e relacione seus proprietários compartilhados (coproprietários).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {showWhatsAppMapping && (
            <button
              onClick={handleOpenMappingModal}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
              title="Mapear grupos do WhatsApp usando Evolution API"
            >
              <Zap className="w-4 h-4 mr-2 text-teal-500" />
              Mapear WhatsApp
            </button>
          )}
          <button
            id="btn-new-boat"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Embarcação
          </button>
        </div>
      </div>

      {/* Quick guide on code constraints */}
      <div className="flex items-start space-x-3 p-4 bg-slate-50 border border-slate-100 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Regras de Negócio Náutico:</span>
          <p className="mt-0.5">Cada embarcação suporta cotistas/proprietários sem limite de quantidade e possui uma numeração única que formará o título sincronizado do Google Calendar (por exemplo, embarcação número <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">03</code> criará títulos formatados como <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">M03 - Nome do Cliente</code>).</p>
        </div>
      </div>

      {/* Search Bar & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="search-boats"
            type="text"
            placeholder="Buscar veículo por nome, modelo ou número código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        {/* Filtro de Empresa */}
        <div className="w-full sm:w-56">
          <SearchableSelect
            id="select-filter-empresa"
            value={filterEmpresa}
            onChange={setFilterEmpresa}
            placeholder="Buscar empresa..."
            options={EMPRESA_OPTIONS}
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Exibir em Lista / Tabela"
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Exibir em Blocos / Cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Blocos</span>
          </button>
        </div>
      </div>

      {/* Ships List / Cards Grid */}
      {filteredBoats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
          <Ship className="w-12 h-12 text-slate-400 mb-3 stroke-1" />
          <p className="text-sm font-medium text-slate-900">Nenhuma embarcação encontrada</p>
          <p className="text-xs text-slate-500 mt-1">Busque por outra palavra-chave ou crie uma nova embarcação acima.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VISÃO EM TABELA / LISTA */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto touch-pan-x scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full min-w-[840px] text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Embarcação</th>
                  <th className="py-3.5 px-4">Código Calendar / Vaga</th>
                  <th className="py-3.5 px-4">Modelo & Especificações</th>
                  <th className="py-3.5 px-4">Proprietários (Cotistas)</th>
                  <th className="py-3.5 px-4 text-center">Status / Equip.</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBoats.map((boat) => {
                  const ownerNames = boat.donos
                    .map(id => clientDB.getById(id))
                    .filter((c): c is Cliente => !!c);

                  return (
                    <tr id={`boat-row-${boat.id}`} key={boat.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Embarcação */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {boat.imagemUrl ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                              <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 border border-slate-200">
                              <Anchor className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{getBoatCode(boat)}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Doc: {boat.nome} {boat.fabricante ? `• ${boat.fabricante}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Código / Vaga */}
                      <td className="py-3 px-4 font-mono">
                        <span className="text-xs font-semibold text-slate-800">
                          M{(boat.numero || '').padStart(2, '0')}
                        </span>
                        {boat.vaga && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-medium">
                            Vaga: {boat.vaga}
                          </span>
                        )}
                      </td>

                      {/* Modelo & Detalhes */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 text-xs block">{boat.modelo || 'Modelo N/I'}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {boat.tamanho ? `${boat.tamanho} Pés` : ''} {boat.inscricao ? `• Insc: ${boat.inscricao}` : ''}
                        </span>
                      </td>

                      {/* Proprietários */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {ownerNames.length > 0 ? (
                            ownerNames.map(owner => {
                              const ownerCota = owner.embarcacoes?.find(e => e.embarcacaoId === boat.id)?.cota || owner.cota;
                              return (
                                <div key={owner.id} className="flex items-center gap-1.5 text-xs">
                                  <span className="font-semibold text-slate-850">{owner.nome.split(' ')[0]}</span>
                                  {ownerCota && (
                                    <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                      Cota {ownerCota}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Nenhum cotista vinculado</span>
                          )}
                        </div>
                      </td>

                      {/* Status / Equip. */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${boat.emManutencao ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span className={boat.emManutencao ? 'text-rose-700 font-semibold' : 'text-slate-700 font-medium'}>
                            {boat.emManutencao ? 'Manutenção' : 'Ativa'}
                          </span>
                          {boat.temSom && (
                            <span className="text-[10px] text-slate-400 ml-1" title="Possui Som">
                              • Som
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(boat)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => initiateDelete(boat.id, boat.nome)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Remover"
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
        /* VISÃO EM BLOCOS / CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBoats.map(boat => {
            // Find clients associated to this boat
            const ownerNames = boat.donos
              .map(id => clientDB.getById(id))
              .filter((c): c is Cliente => !!c);

            return (
              <div id={`boat-card-${boat.id}`} key={boat.id} className="bg-white border border-slate-100 rounded-xl shadow-xs hover:shadow-md hover:border-slate-200 p-5 flex flex-col justify-between transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {boat.imagemUrl ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                          <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                          boat.tipo === 'jet' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-sky-50 text-sky-600 border border-sky-100'
                        }`}>
                          <Anchor className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h4 className="font-semibold text-slate-900 text-lg leading-tight">{getBoatCode(boat)}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                            boat.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {boat.tipo === 'jet' ? 'Jet' : 'Lancha'}
                          </span>
                          {(boat.empresas || ['VALE']).map(emp => (
                            <span key={emp} className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md border ${
                              emp === 'MARINA' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              emp === 'MEXICANO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {emp === 'VALE' ? 'Vale' : emp === 'MARINA' ? 'Marina' : 'Mexicano'}
                            </span>
                          ))}
                          {boat.emManutencao && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs">
                              <Wrench className="w-3 h-3 mr-1" />
                              Manutenção
                            </span>
                          )}
                          {boat.temSom && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-800 flex items-center shadow-xs">
                              <Volume2 className="w-3 h-3 mr-1" />
                              Som
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm mt-1 inline-block">
                          Código Google Calendar: M{(boat.numero || '').padStart(2, '0')}
                        </span>
                        {boat.googleCalendarId && (
                          <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 truncate max-w-[210px] border border-emerald-100/50" title={boat.googleCalendarId}>
                            Google ID: {boat.googleCalendarId}
                          </div>
                        )}
                        {showWhatsAppMapping && boat.whatsappGroupId && (
                          <div className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md mt-1 truncate max-w-[210px] border border-teal-100/50" title={boat.whatsappGroupId}>
                            WhatsApp: {boat.whatsappGroupId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        id={`edit-boat-${boat.id}`}
                        onClick={() => handleOpenEditModal(boat)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`delete-boat-${boat.id}`}
                        onClick={() => initiateDelete(boat.id, boat.nome)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vessel Specs */}
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-light">Fabricante</span>
                      <span className="font-medium text-slate-800">{boat.fabricante || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Modelo</span>
                      <span className="font-medium text-slate-800">{boat.modelo || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Ano / Numeração</span>
                      <span className="font-medium text-slate-800 font-mono">{boat.ano} (#{boat.numero})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">N° Inscrição (Marinha)</span>
                      <span className="font-medium text-slate-800 font-mono">{boat.inscricao || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">N° do Chassi</span>
                      <span className="font-medium text-slate-800 font-mono">{boat.chassi || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Propulsão / Potência</span>
                      <span className="font-medium text-slate-800">{boat.tipo_propulsao || 'MOTOR'} {boat.potencia ? `(${boat.potencia})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Owners section */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Coproprietários ({ownerNames.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto subtle-scrollbar pr-1">
                    {ownerNames.length > 0 ? (
                      ownerNames.map((owner, idx) => (
                        <div key={idx} className="flex items-center space-x-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-md text-slate-700 text-xs border border-slate-100 transition-colors">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">{owner.nome}</span>
                        </div>
                      ))
                    ) : (
<span className="text-xs text-rose-500 italic bg-rose-50 px-2 py-1 rounded border border-rose-100">
                        Nenhum proprietário associado!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Cadastro / Edição de Embarcação */}
      <BoatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => handleRefresh()}
        editingBoat={editingId ? boats.find(b => b.id === editingId) : null}
        clients={clients}
        showWhatsAppMapping={showWhatsAppMapping}
      />

      {/* Custom Confirmation Modal */}
      {deleteConfirmation && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4 border border-rose-100">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Remover Embarcação</h3>
              <p className="mt-2 text-sm text-slate-500">
                Gostaria de excluir permanentemente a embarcação <span className="font-semibold text-slate-800">"{deleteConfirmation.name}"</span>?
              </p>
              <div className="mt-3 p-3 bg-rose-50/50 rounded-lg text-rose-700 text-xs text-left font-medium leading-relaxed">
                ⚠️ Todas as reservas associadas a esta embarcação serão permanentemente removidas, e os links de proprietários serão desfeitos!
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex gap-3">
              <button
                id="cancel-delete-boat"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors pointer cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-boat"
                onClick={executeDelete}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors pointer cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Mapping Modal */}
      {showWhatsAppMapping && isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-medium text-slate-900">Mapeamento de Grupos do WhatsApp</h3>
                <p className="text-xs text-slate-500">Relacione as embarcações aos grupos encontrados na Evolution API.</p>
              </div>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isFetchingGroups ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mb-4" />
                  <p className="text-sm font-medium text-slate-700">Carregando grupos do WhatsApp...</p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-800">Nenhum grupo encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Verifique a conexão com a Evolution API.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {boats.map(boat => (
                    <div key={boat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="mb-2 sm:mb-0">
                        <p className="text-sm font-semibold text-slate-800">{boat.nome}</p>
                        <p className="text-xs text-slate-500">Nº {boat.numero} • {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}</p>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <select
                          value={mappingState[boat.id] || ''}
                          onChange={(e) => handleMappingChange(boat.id, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                        >
                          <option value="">-- Sem Grupo Associado --</option>
                          {availableGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.subject || g.name || g.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors pointer cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={isFetchingGroups}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors pointer cursor-pointer disabled:opacity-50"
              >
                Salvar Mapeamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
