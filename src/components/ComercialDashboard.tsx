import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Settings, FileText, Users, Search, 
  X, CheckCircle, FileSignature, Home, Bell, 
  MoreHorizontal, Plus, Edit2, Trash2, ChevronRight,
  Filter, Download, Upload, Menu, Printer, Anchor, Save, Check, User
} from 'lucide-react';
import { clientDB, boatDB } from '../db';
import { generateContract } from './ContractGenerator';
import { numeroParaExtenso, parseMoney, formatMoney } from '../utils/numberToWords';

interface ComercialDashboardProps {
  onLogout: () => void;
}

type TabType = 'home' | 'clientes' | 'embarcacoes' | 'contratos' | 'settings';

interface SearchableClientSelectProps {
  clients: any[];
  value: string;
  onChange: (clientId: string) => void;
}

function SearchableClientSelect({ clients, value, onChange }: SearchableClientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(c => c.id === value);

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(term) ||
      c.cpf?.includes(term) ||
      c.telefone?.includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Selecione o Cliente *</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
              {selectedClient.nome.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-none">{selectedClient.nome}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                CPF: {selectedClient.cpf || 'Não informado'} {selectedClient.telefone ? `• Tel: ${selectedClient.telefone}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-400">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium">Buscar e selecionar cliente cadastrado...</span>
          </div>
        )}

        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar por nome, CPF ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1 font-semibold"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto subtle-scrollbar p-1.5 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhum cliente encontrado com "{search}"
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.id === value;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.nome.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{c.nome}</p>
                        <p className={`text-[11px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          CPF: {c.cpf || 'Sem CPF'} {c.telefone ? `• ${c.telefone}` : ''}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchableBoatSelectProps {
  boats: any[];
  value: string;
  onChange: (boatId: string) => void;
}

function SearchableBoatSelect({ boats, value, onChange }: SearchableBoatSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedBoat = boats.find(b => b.id === value);

  const filtered = boats.filter(b => {
    const term = search.toLowerCase();
    return (
      b.nome?.toLowerCase().includes(term) ||
      b.modelo?.toLowerCase().includes(term) ||
      b.fabricante?.toLowerCase().includes(term) ||
      b.numero?.includes(term) ||
      b.chassi?.toLowerCase().includes(term) ||
      b.inscricao?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Embarcação *</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedBoat ? (
          <div className="flex items-center space-x-3 min-w-0">
            {selectedBoat.imagemUrl ? (
              <img src={selectedBoat.imagemUrl} alt={selectedBoat.nome} className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedBoat.tipo === 'jet' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
              }`}>
                <Anchor className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-slate-900 truncate leading-none">{selectedBoat.nome}</p>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                  M{selectedBoat.numero?.toString().padStart(2, '0') || '00'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {selectedBoat.fabricante || ''} {selectedBoat.modelo || ''} {selectedBoat.ano ? `(${selectedBoat.ano})` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-400">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium">Buscar e selecionar embarcação...</span>
          </div>
        )}

        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar por nome, modelo, estaleiro, M00..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1 font-semibold"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto subtle-scrollbar p-1.5 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma embarcação encontrada com "{search}"
              </div>
            ) : (
              filtered.map(b => {
                const isSelected = b.id === value;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onChange(b.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {b.imagemUrl ? (
                        <img src={b.imagemUrl} alt={b.nome} className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : (b.tipo === 'jet' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700')
                        }`}>
                          <Anchor className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{b.nome}</p>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            M{b.numero?.toString().padStart(2, '0') || '00'}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {b.fabricante || 'Estaleiro N/A'} {b.modelo ? `• ${b.modelo}` : ''} {b.inscricao ? `• Ins: ${b.inscricao}` : ''}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComercialDashboard({ onLogout }: ComercialDashboardProps) {
  const [preferences, setPreferences] = useState({
    logoUrl: '',
    backgroundUrl: '',
    greetingText: 'Bem-vindo ao Painel Comercial'
  });
  
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [boats, setBoats] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Clientes Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEmbarcacao, setFilterEmbarcacao] = useState('');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [selectedClientView, setSelectedClientView] = useState<any | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Embarcações Tab State
  const [boatSearchTerm, setBoatSearchTerm] = useState('');
  const [boatFilterTipo, setBoatFilterTipo] = useState('');
  const [selectedBoatModalView, setSelectedBoatModalView] = useState<any | null>(null);
  const [isBoatModalOpen, setIsBoatModalOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<any | null>(null);

  const initialBoatForm = {
    nome: '',
    numero: '',
    tipo: 'lancha' as 'lancha' | 'jet',
    modelo: '',
    fabricante: '',
    ano: new Date().getFullYear(),
    chassi: '',
    inscricao: '',
    tipo_propulsao: 'MOTOR',
    potencia: '',
    donos: [] as string[],
    imagemUrl: '',
    emManutencao: false,
    temSom: false
  };
  const [boatFormData, setBoatFormData] = useState(initialBoatForm);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [greetingInput, setGreetingInput] = useState('');

  // Formulário de Cadastro
  const initialForm = {
    nome: '', cpf: '', email: '', telefone: '', cnh_cha: '',
    cep: '', logradouro: '', numeroEnd: '', complemento: '',
    bairro: '', cidade: '', estado: '', profissao: '', estadoCivil: '',
    rg: '', orgaoEmissor: '', numeroHabilitacao: '', validadeHabilitacao: '',
    orgaoEmissorHabilitacao: '', categoriaHabilitacao: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Formulário de Contrato
  const [contractData, setContractData] = useState({
    clienteId: '',
    embarcacaoId: '',
    cota: '25%',
    type: 'ambos',
    valorTotal: '55.000,00',
    valorEntrada: '12.040,00',
    valorRemanescente: '42.960,00',
    valorRemanescenteExtenso: 'QUARENTA E DOIS MIL NOVECENTOS E SESSENTA REAIS',
    numParcelas: '24',
    numParcelasExtenso: 'VINTE E QUATRO',
    valorParcela: '1.790,00',
    valorParcelaExtenso: 'MIL E SETECENTOS E NOVENTA REAIS',
    formaPagamento: 'boleto/transferência bancária/depósito/espécie',
    diaVencimento: '10'
  });

  // Selected Client Form State for Contract Issuance Tab
  const [selectedClientData, setSelectedClientData] = useState<any | null>(null);
  const [isSavingClientInline, setIsSavingClientInline] = useState(false);
  const [clientSaveSuccess, setClientSaveSuccess] = useState(false);

  useEffect(() => {
    if (contractData.clienteId) {
      const found = clients.find(c => c.id === contractData.clienteId);
      if (found) {
        setSelectedClientData(prev => (prev && prev.id === found.id ? prev : { ...found }));
      } else {
        setSelectedClientData(null);
      }
    } else {
      setSelectedClientData(null);
    }
  }, [contractData.clienteId, clients]);

  const handleSaveClientInline = async () => {
    if (!selectedClientData || !selectedClientData.id) return;
    setIsSavingClientInline(true);
    setClientSaveSuccess(false);
    try {
      clientDB.update(selectedClientData.id, selectedClientData);
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'clients', action: 'upsert', data: selectedClientData })
      });
      loadData();
      setClientSaveSuccess(true);
      setTimeout(() => setClientSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar dados do cliente.");
    } finally {
      setIsSavingClientInline(false);
    }
  };

  // Selected Boat Form State for Contract Issuance Tab
  const [selectedBoatData, setSelectedBoatData] = useState<any | null>(null);
  const [isSavingBoat, setIsSavingBoat] = useState(false);
  const [boatSaveSuccess, setBoatSaveSuccess] = useState(false);

  useEffect(() => {
    if (contractData.embarcacaoId) {
      const found = boats.find(b => b.id === contractData.embarcacaoId);
      if (found) {
        setSelectedBoatData(prev => (prev && prev.id === found.id ? prev : { ...found }));
      } else {
        setSelectedBoatData(null);
      }
    } else {
      setSelectedBoatData(null);
    }
  }, [contractData.embarcacaoId, boats]);

  const handleSaveBoat = async () => {
    if (!selectedBoatData || !selectedBoatData.id) return;
    setIsSavingBoat(true);
    setBoatSaveSuccess(false);
    try {
      boatDB.update(selectedBoatData.id, selectedBoatData);
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'boats', action: 'upsert', data: selectedBoatData })
      });
      loadData();
      setBoatSaveSuccess(true);
      setTimeout(() => setBoatSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar embarcação:", err);
      alert("Erro ao salvar dados da embarcação.");
    } finally {
      setIsSavingBoat(false);
    }
  };

  const recalculatePayment = (totalStr: string, entradaStr: string, parcelasStr: string) => {
    const total = parseMoney(totalStr);
    const entrada = parseMoney(entradaStr);
    const numParc = parseInt(parcelasStr) || 1;

    const remanescente = Math.max(0, total - entrada);
    const parcelaVal = numParc > 0 ? remanescente / numParc : 0;

    const remStr = formatMoney(remanescente);
    const remExtenso = numeroParaExtenso(remanescente, true);
    const parcExtenso = numeroParaExtenso(numParc, false);
    const parcValStr = formatMoney(parcelaVal);
    const parcValExtenso = numeroParaExtenso(parcelaVal, true);

    setContractData(prev => ({
      ...prev,
      valorTotal: totalStr,
      valorEntrada: entradaStr,
      numParcelas: parcelasStr,
      valorRemanescente: remStr,
      valorRemanescenteExtenso: remExtenso,
      numParcelasExtenso: parcExtenso,
      valorParcela: parcValStr,
      valorParcelaExtenso: parcValExtenso
    }));
  };

  const handleRemanescenteChange = (val: string) => {
    const num = parseMoney(val);
    const extenso = num > 0 ? numeroParaExtenso(num, true) : '';
    setContractData(prev => ({
      ...prev,
      valorRemanescente: val,
      valorRemanescenteExtenso: extenso || prev.valorRemanescenteExtenso
    }));
  };

  const handleParcelaChange = (val: string) => {
    const num = parseMoney(val);
    const extenso = num > 0 ? numeroParaExtenso(num, true) : '';
    setContractData(prev => ({
      ...prev,
      valorParcela: val,
      valorParcelaExtenso: extenso || prev.valorParcelaExtenso
    }));
  };

  useEffect(() => {
    fetchPreferences();
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/comercial/preferences', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences({
          logoUrl: data.logoUrl || '',
          backgroundUrl: data.backgroundUrl || '',
          greetingText: data.greetingText || 'Bem-vindo ao Painel Comercial'
        });
        setGreetingInput(data.greetingText || 'Bem-vindo ao Painel Comercial');
      }
    } catch (err) {
      console.error("Error fetching preferences", err);
    }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('greetingText', greetingInput);
    if (logoFile) fd.append('logo', logoFile);
    if (bgFile) fd.append('background', bgFile);

    try {
      const res = await fetch('/api/comercial/preferences', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: fd
      });
      if (res.ok) {
        setShowSettings(false);
        fetchPreferences();
      }
    } catch (err) {
      console.error("Error saving preferences", err);
    }
  };

  const openNewClient = () => {
    setFormData(initialForm);
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const openEditClient = (client: any) => {
    setFormData({ ...initialForm, ...client });
    setEditingClient(client);
    setIsClientModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'clients', action: 'delete', data: { id } })
      });
      loadData();
      setOpenDropdownId(null);
      setClientToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir cliente.');
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingClient ? editingClient : { id: `client_${Date.now()}` }),
        ...formData,
        dataCadastro: editingClient ? editingClient.dataCadastro : new Date().toISOString()
      };
      
      const saveRes = await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'clients', action: 'upsert', data: payload })
      });
      
      if (!saveRes.ok) throw new Error("Falha no servidor ao salvar.");
      
      setIsClientModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente. Verifique sua conexão.");
    }
  };

  const openNewBoat = () => {
    setBoatFormData(initialBoatForm);
    setEditingBoat(null);
    setIsBoatModalOpen(true);
  };

  const openEditBoat = (boat: any) => {
    setBoatFormData({
      nome: boat.nome || '',
      numero: boat.numero || '',
      tipo: boat.tipo || 'lancha',
      modelo: boat.modelo || '',
      fabricante: boat.fabricante || '',
      ano: boat.ano || new Date().getFullYear(),
      chassi: boat.chassi || '',
      inscricao: boat.inscricao || '',
      tipo_propulsao: boat.tipo_propulsao || 'MOTOR',
      potencia: boat.potencia || '',
      donos: boat.donos || [],
      imagemUrl: boat.imagemUrl || '',
      emManutencao: boat.emManutencao || false,
      temSom: boat.temSom || false
    });
    setEditingBoat(boat);
    setIsBoatModalOpen(true);
  };

  const handleSaveBoatFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingBoat ? editingBoat : { id: `boat_${Date.now()}` }),
        ...boatFormData
      };
      if (editingBoat) {
        boatDB.update(editingBoat.id, payload);
      } else {
        boatDB.create(payload);
      }

      const saveRes = await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'boats', action: 'upsert', data: payload })
      });

      if (!saveRes.ok) console.warn("Aviso ao sincronizar embarcação no servidor.");

      setIsBoatModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar embarcação.");
    }
  };

  const handleGenerateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractData.clienteId) {
      alert("Selecione um cliente.");
      return;
    }
    
    const selectedClient = (selectedClientData && selectedClientData.id === contractData.clienteId)
      ? selectedClientData
      : clients.find(c => c.id === contractData.clienteId);
    const selectedBoat = (selectedBoatData && selectedBoatData.id === contractData.embarcacaoId)
      ? selectedBoatData
      : boats.find(b => b.id === contractData.embarcacaoId);
    
    if (!selectedClient) return;

    const mergedData = { ...selectedClient, cota: contractData.cota };

    if (contractData.type === 'adm' || contractData.type === 'ambos') {
      generateContract('adm', mergedData, selectedBoat);
    }
    if (contractData.type === 'aquisicao' || contractData.type === 'ambos') {
      generateContract('aquisicao', mergedData, selectedBoat, {
        valorTotal: contractData.valorTotal,
        valorEntrada: contractData.valorEntrada,
        valorRemanescente: contractData.valorRemanescente,
        valorRemanescenteExtenso: contractData.valorRemanescenteExtenso,
        numParcelas: contractData.numParcelas,
        numParcelasExtenso: contractData.numParcelasExtenso,
        valorParcela: contractData.valorParcela,
        valorParcelaExtenso: contractData.valorParcelaExtenso,
        formaPagamento: contractData.formaPagamento,
        diaVencimento: contractData.diaVencimento
      });
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf?.includes(searchTerm);
    const matchesEmbarcacao = filterEmbarcacao ? c.embarcacaoId === filterEmbarcacao : true;
    return matchesSearch && matchesEmbarcacao;
  });

  const filteredBoatsList = boats.filter(b => {
    const matchesSearch = b.nome?.toLowerCase().includes(boatSearchTerm.toLowerCase()) ||
      b.modelo?.toLowerCase().includes(boatSearchTerm.toLowerCase()) ||
      b.fabricante?.toLowerCase().includes(boatSearchTerm.toLowerCase()) ||
      b.numero?.includes(boatSearchTerm);
    
    let matchesTipo = true;
    if (boatFilterTipo === 'lancha') matchesTipo = b.tipo === 'lancha';
    else if (boatFilterTipo === 'jet') matchesTipo = b.tipo === 'jet';
    else if (boatFilterTipo === 'manutencao') matchesTipo = !!b.emManutencao;

    return matchesSearch && matchesTipo;
  });

  return (
    <div className="min-h-screen w-full flex bg-[#f4f5f7] font-sans text-slate-800" onClick={() => setOpenDropdownId(null)}>
      
      {/* Sidebar - Light Theme */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-[4.5rem]'}`}>
        <div className="min-h-[5rem] flex items-center justify-center py-4 px-4 border-b border-slate-100">
          {preferences.logoUrl && isSidebarOpen ? (
            <img src={preferences.logoUrl} alt="Logo" className="w-full max-h-20 object-contain" />
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 min-w-[2rem] bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ERP</span>
              </div>
              {isSidebarOpen && <span className="font-bold text-slate-900 text-lg">Comercial</span>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 hide-scrollbar">
          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Painel Principal</p>}
            <nav className="space-y-1">
              <button 
                title="Visão Geral"
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'home' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Home className="w-5 h-5 min-w-[1.25rem]" />
                {isSidebarOpen && <span>Visão Geral</span>}
              </button>
            </nav>
          </div>

          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Gestão e Vendas</p>}
            <nav className="space-y-1">
              <button 
                title="Base de Clientes"
                onClick={() => setActiveTab('clientes')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'clientes' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Users className="w-5 h-5 min-w-[1.25rem]" />
                {isSidebarOpen && <span>Base de Clientes</span>}
              </button>

              <button 
                title="Consulta de Embarcações"
                onClick={() => setActiveTab('embarcacoes')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'embarcacoes' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Anchor className="w-5 h-5 min-w-[1.25rem]" />
                {isSidebarOpen && <span>Embarcações</span>}
              </button>
              
              <button 
                title="Emitir Contratos"
                onClick={() => setActiveTab('contratos')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'contratos' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <FileSignature className="w-5 h-5 min-w-[1.25rem]" />
                {isSidebarOpen && <span>Emitir Contratos</span>}
              </button>
            </nav>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <button 
            title="Configurações"
            onClick={() => setShowSettings(true)}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}
          >
            <Settings className="w-5 h-5 min-w-[1.25rem]" />
            {isSidebarOpen && <span>Configurações</span>}
          </button>
          <button 
            title="Sair da Conta"
            onClick={onLogout}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 min-w-[1.25rem]" />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/50 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center text-sm text-slate-500 space-x-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 -ml-2 mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-medium text-slate-700">Comercial</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium text-slate-700 capitalize">{activeTab}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 w-64"
              />
            </div>
            <button className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Banner / Background */}
              {preferences.backgroundUrl && (
                <div 
                  className="w-full h-48 rounded-2xl bg-cover bg-center shadow-sm relative overflow-hidden"
                  style={{ backgroundImage: `url(${preferences.backgroundUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent flex items-center px-10">
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">{preferences.greetingText}</h1>
                  </div>
                </div>
              )}
              
              {!preferences.backgroundUrl && (
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{preferences.greetingText}</h1>
                  <p className="text-slate-500 text-sm">Bem-vindo ao módulo de gestão comercial.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total de Clientes</p>
                    <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Contratos Ativos (Simulação)</p>
                    <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENTES (CRUD) */}
          {activeTab === 'clientes' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Base de Clientes</h1>
                  <p className="text-slate-500 text-sm mt-1">Gerencie cadastros e informações detalhadas.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center transition-colors shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </button>
                  <button 
                    onClick={openNewClient}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 w-64"
                      />
                    </div>
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center transition-colors">
                    <Filter className="w-4 h-4 mr-2" /> Filtros
                  </button>
                </div>
                {showFilters && (
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex gap-4 rounded-t-xl">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-500 mb-1">Por Embarcação</label>
                      <select 
                        value={filterEmbarcacao} 
                        onChange={(e) => setFilterEmbarcacao(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="">Todas as embarcações</option>
                        {boats.map(b => (
                          <option key={b.id} value={b.id}>{b.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 w-10">
                          <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                        </th>
                        <th className="px-6 py-3">Nome do Cliente</th>
                        <th className="px-6 py-3">CPF</th>
                        <th className="px-6 py-3">Telefone</th>
                        <th className="px-6 py-3">Profissão</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold uppercase">
                              {c.nome.substring(0,2)}
                            </div>
                            <span>{c.nome}</span>
                          </td>
                          <td className="px-6 py-4">{c.cpf || '-'}</td>
                          <td className="px-6 py-4">{c.telefone || '-'}</td>
                          <td className="px-6 py-4 text-slate-500">{c.profissao || '-'}</td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === c.id ? null : c.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {openDropdownId === c.id && (
                              <div className="absolute right-8 top-10 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 animate-spring-pop origin-top-right">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedClientView(c); setOpenDropdownId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                >
                                  <FileText className="w-4 h-4 mr-2 text-slate-400" /> Abrir Ficha
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openEditClient(c); }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                >
                                  <Edit2 className="w-4 h-4 mr-2 text-slate-400" /> Editar Cliente
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setClientToDelete(c.id); setOpenDropdownId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                            Nenhum cliente cadastrado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMBARCAÇÕES */}
          {activeTab === 'embarcacoes' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Catálogo de Embarcações</h1>
                  <p className="text-slate-500 text-sm mt-1">Consulte veículos náuticos, fichas técnicas e cotistas associados.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={openNewBoat}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Nova Embarcação
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, modelo, estaleiro..." 
                    value={boatSearchTerm}
                    onChange={(e) => setBoatSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <span className="text-xs font-semibold text-slate-500">Filtrar por:</span>
                  <select
                    value={boatFilterTipo}
                    onChange={(e) => setBoatFilterTipo(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Todas as Embarcações</option>
                    <option value="lancha">Apenas Lanchas</option>
                    <option value="jet">Apenas Jet Skis</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Grid of Boat Cards */}
              {filteredBoatsList.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                  <Anchor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">Nenhuma embarcação encontrada</p>
                  <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredBoatsList.map(boat => {
                    const boatOwners = clients.filter(c => boat.donos && boat.donos.includes(c.id));

                    return (
                      <div key={boat.id} className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-4">
                              {boat.imagemUrl ? (
                                <img src={boat.imagemUrl} alt={boat.nome} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs" />
                              ) : (
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-xs ${
                                  boat.tipo === 'jet' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                                }`}>
                                  <Anchor className="w-7 h-7" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-bold text-slate-900 text-lg">{boat.nome}</h3>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                                    boat.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                  }`}>
                                    {boat.tipo === 'jet' ? 'Jet' : 'Lancha'}
                                  </span>
                                  {boat.emManutencao && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-100 text-rose-800">
                                      Manutenção
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm mt-1 inline-block font-semibold">
                                  Código Agenda: M{boat.numero?.toString().padStart(2, '0') || '00'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Technical attributes */}
                          <div className="mt-5 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Fabricante</span>
                              <span className="font-semibold text-slate-800">{boat.fabricante || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Modelo</span>
                              <span className="font-semibold text-slate-800">{boat.modelo || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Ano</span>
                              <span className="font-semibold text-slate-800">{boat.ano || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nº Marinha</span>
                              <span className="font-semibold text-slate-800 font-mono">{boat.inscricao || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassi (HIN)</span>
                              <span className="font-semibold text-slate-800 font-mono">{boat.chassi || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Propulsão / Potência</span>
                              <span className="font-semibold text-slate-800">{boat.tipo_propulsao || 'MOTOR'} {boat.potencia ? `(${boat.potencia})` : ''}</span>
                            </div>
                          </div>

                          {/* Cotistas Badge List */}
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                              Coproprietários / Cotistas ({boatOwners.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto subtle-scrollbar">
                              {boatOwners.length > 0 ? (
                                boatOwners.map(owner => (
                                  <div key={owner.id} className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium border border-slate-200">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    <span>{owner.nome}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 italic">
                                  Sem cotistas vinculados
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedBoatModalView(boat)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" /> Ficha Técnica
                            </button>
                            <button
                              onClick={() => openEditBoat(boat)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" /> Editar
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setContractData(prev => ({ ...prev, embarcacaoId: boat.id }));
                              setActiveTab('contratos');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center shadow-xs transition-colors"
                          >
                            <FileSignature className="w-3.5 h-3.5 mr-1" /> Emitir Contrato
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: CONTRATOS */}
          {activeTab === 'contratos' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Emissão de Contratos</h1>
              <p className="text-slate-500 text-sm mb-6">Gere os documentos em PDF baseados no cliente cadastrado.</p>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handleGenerateContract} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <SearchableClientSelect
                        clients={clients}
                        value={contractData.clienteId}
                        onChange={id => setContractData({...contractData, clienteId: id})}
                      />
                    </div>
                    <div>
                      <SearchableBoatSelect
                        boats={boats}
                        value={contractData.embarcacaoId}
                        onChange={id => setContractData({...contractData, embarcacaoId: id})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tamanho da Cota</label>
                      <select value={contractData.cota} onChange={e => setContractData({...contractData, cota: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-sm transition-all text-slate-700">
                        <option value="25%">25% (4 Sócios)</option>
                        <option value="12.5%">12,5% (8 Sócios)</option>
                        <option value="50%">50% (2 Sócios)</option>
                        <option value="100%">100% (Proprietário Único)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Contrato</label>
                      <select value={contractData.type} onChange={e => setContractData({...contractData, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-sm transition-all text-slate-700">
                        <option value="ambos">Ambos (Administração + Aquisição)</option>
                        <option value="adm">Apenas Administração</option>
                        <option value="aquisicao">Apenas Aquisição</option>
                      </select>
                    </div>
                  </div>

                  {/* PAINEL DE INFORMAÇÕES DO CLIENTE SELECIONADO */}
                  {selectedClientData && (
                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 mt-6 space-y-5 animate-spring-pop">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-emerald-600" />
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Informações do Cliente Selecionado</h3>
                            <p className="text-xs text-slate-500">Exibindo dados para conferência e edição antes de emitir o contrato</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveClientInline}
                          disabled={isSavingClientInline}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all shadow-sm ${
                            clientSaveSuccess 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {clientSaveSuccess ? (
                            <>
                              <Check className="w-4 h-4 mr-1.5" /> Salvo com sucesso!
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-1.5" /> {isSavingClientInline ? 'Salvando...' : 'Salvar Alterações do Cliente'}
                            </>
                          )}
                        </button>
                      </div>

                      {/* Seção 1: Dados Pessoais & Contato */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dados Pessoais & Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Nome Completo</label>
                            <input
                              type="text"
                              value={selectedClientData.nome || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, nome: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">CPF</label>
                            <input
                              type="text"
                              value={selectedClientData.cpf || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, cpf: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">RG</label>
                            <input
                              type="text"
                              value={selectedClientData.rg || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, rg: e.target.value})}
                              placeholder="Ex: 12.345.678-9"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Órgão Emissor do RG</label>
                            <input
                              type="text"
                              value={selectedClientData.orgaoEmissor || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, orgaoEmissor: e.target.value})}
                              placeholder="Ex: SSP/PE"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={selectedClientData.email || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, email: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
                            <input
                              type="text"
                              value={selectedClientData.telefone || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, telefone: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Profissão</label>
                            <input
                              type="text"
                              value={selectedClientData.profissao || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, profissao: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Estado Civil</label>
                            <input
                              type="text"
                              value={selectedClientData.estadoCivil || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, estadoCivil: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção 2: Habilitação Náutica */}
                      <div className="pt-3 border-t border-slate-200/60">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Habilitação Náutica (CHA)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Nº Habilitação Náutica (CHA)</label>
                            <input
                              type="text"
                              value={selectedClientData.numeroHabilitacao || selectedClientData.cnh_cha || ''}
                              onChange={e => setSelectedClientData({
                                ...selectedClientData, 
                                numeroHabilitacao: e.target.value,
                                cnh_cha: e.target.value
                              })}
                              placeholder="Ex: 381M2021005"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Categoria</label>
                            <select
                              value={selectedClientData.categoriaHabilitacao || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, categoriaHabilitacao: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            >
                              <option value="">Selecione...</option>
                              <option value="Arrais-Amador">Arrais-Amador</option>
                              <option value="Motonauta">Motonauta</option>
                              <option value="Arrais e Motonauta">Arrais e Motonauta</option>
                              <option value="Mestre-Amador">Mestre-Amador</option>
                              <option value="Capitão-Amador">Capitão-Amador</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Data de Validade (CHA)</label>
                            <input
                              type="date"
                              value={selectedClientData.validadeHabilitacao || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, validadeHabilitacao: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Órgão Emissor (CHA)</label>
                            <input
                              type="text"
                              value={selectedClientData.orgaoEmissorHabilitacao || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, orgaoEmissorHabilitacao: e.target.value})}
                              placeholder="Ex: Marinha do Brasil"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção 3: Endereço */}
                      <div className="pt-3 border-t border-slate-200/60">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Endereço de Faturamento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">CEP</label>
                            <input
                              type="text"
                              value={selectedClientData.cep || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, cep: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block font-semibold text-slate-600 mb-1">Logradouro (Rua, Av)</label>
                            <input
                              type="text"
                              value={selectedClientData.logradouro || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, logradouro: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Número</label>
                            <input
                              type="text"
                              value={selectedClientData.numeroEnd || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, numeroEnd: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Complemento</label>
                            <input
                              type="text"
                              value={selectedClientData.complemento || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, complemento: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Bairro</label>
                            <input
                              type="text"
                              value={selectedClientData.bairro || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, bairro: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">Cidade</label>
                            <input
                              type="text"
                              value={selectedClientData.cidade || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, cidade: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">UF (Estado)</label>
                            <input
                              type="text"
                              value={selectedClientData.estado || ''}
                              onChange={e => setSelectedClientData({...selectedClientData, estado: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAINEL DE INFORMAÇÕES DA EMBARCAÇÃO SELECIONADA */}
                  {selectedBoatData && (
                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 mt-6 space-y-4 animate-spring-pop">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                        <div className="flex items-center space-x-2">
                          <Anchor className="w-5 h-5 text-blue-600" />
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Informações da Embarcação Selecionada</h3>
                            <p className="text-xs text-slate-500">Exibindo dados para conferência e edição antes de emitir o contrato</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveBoat}
                          disabled={isSavingBoat}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all shadow-sm ${
                            boatSaveSuccess 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {boatSaveSuccess ? (
                            <>
                              <Check className="w-4 h-4 mr-1.5" /> Salvo com sucesso!
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-1.5" /> {isSavingBoat ? 'Salvando...' : 'Salvar Alterações da Embarcação'}
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Nome da Embarcação</label>
                          <input
                            type="text"
                            value={selectedBoatData.nome || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, nome: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Tipo de Embarcação</label>
                          <select
                            value={selectedBoatData.tipo || 'lancha'}
                            onChange={e => setSelectedBoatData({...selectedBoatData, tipo: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          >
                            <option value="lancha">Lancha</option>
                            <option value="jet">Jet Ski</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={selectedBoatData.modelo || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, modelo: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Fabricante / Estaleiro</label>
                          <input
                            type="text"
                            value={selectedBoatData.fabricante || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, fabricante: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Ano</label>
                          <input
                            type="number"
                            value={selectedBoatData.ano || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, ano: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Nº de Inscrição na Marinha</label>
                          <input
                            type="text"
                            value={selectedBoatData.inscricao || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, inscricao: e.target.value})}
                            placeholder="Ex: 401M2023001"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Nº do Chassi (HIN)</label>
                          <input
                            type="text"
                            value={selectedBoatData.chassi || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, chassi: e.target.value})}
                            placeholder="Ex: BR-MEX12345678"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Tipo de Propulsão</label>
                          <input
                            type="text"
                            value={selectedBoatData.tipo_propulsao || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, tipo_propulsao: e.target.value})}
                            placeholder="Ex: MOTOR / POPA / CENTRO"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Potência do Motor</label>
                          <input
                            type="text"
                            value={selectedBoatData.potencia || ''}
                            onChange={e => setSelectedBoatData({...selectedBoatData, potencia: e.target.value})}
                            placeholder="Ex: 250 HP"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-slate-800 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO DO ITEM 3.1: PREÇO, ENTRADA E PARCELAMENTO */}
                  {(contractData.type === 'aquisicao' || contractData.type === 'ambos') && (
                    <div className="border-t border-slate-200 pt-6 mt-6 space-y-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center">
                          <FileSignature className="w-4 h-4 mr-2 text-blue-600" />
                          Cláusula 3.1 - Condições Financeiras da Aquisição
                        </h3>
                        <p className="text-xs text-slate-500">
                          Preencha os valores para gerar automaticamente a redação exata do Item 3.1 no PDF.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor Total da Cota (R$)</label>
                          <input
                            type="text"
                            value={contractData.valorTotal}
                            onChange={e => recalculatePayment(e.target.value, contractData.valorEntrada, contractData.numParcelas)}
                            placeholder="Ex: 55.000,00"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor da Entrada (Item A) (R$)</label>
                          <input
                            type="text"
                            value={contractData.valorEntrada}
                            onChange={e => recalculatePayment(contractData.valorTotal, e.target.value, contractData.numParcelas)}
                            placeholder="Ex: 12.040,00"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº de Parcelas (Item B)</label>
                          <input
                            type="text"
                            value={contractData.numParcelas}
                            onChange={e => recalculatePayment(contractData.valorTotal, contractData.valorEntrada, e.target.value)}
                            placeholder="Ex: 24"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor Remanescente Saldo (R$)</label>
                          <input
                            type="text"
                            value={contractData.valorRemanescente}
                            onChange={e => handleRemanescenteChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor da Parcela (R$)</label>
                          <input
                            type="text"
                            value={contractData.valorParcela}
                            onChange={e => handleParcelaChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-600">Valor Remanescente por Extenso</label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">✨ Auto-convertido</span>
                          </div>
                          <input
                            type="text"
                            value={contractData.valorRemanescenteExtenso}
                            onChange={e => setContractData({...contractData, valorRemanescenteExtenso: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-600">Valor da Parcela por Extenso</label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">✨ Auto-convertido</span>
                          </div>
                          <input
                            type="text"
                            value={contractData.valorParcelaExtenso}
                            onChange={e => setContractData({...contractData, valorParcelaExtenso: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-600">Nº Parcelas por Extenso</label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">✨ Auto</span>
                          </div>
                          <input
                            type="text"
                            value={contractData.numParcelasExtenso}
                            onChange={e => setContractData({...contractData, numParcelasExtenso: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dia de Vencimento</label>
                          <input
                            type="text"
                            value={contractData.diaVencimento}
                            onChange={e => setContractData({...contractData, diaVencimento: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Forma de Pagamento</label>
                          <input
                            type="text"
                            value={contractData.formaPagamento}
                            onChange={e => setContractData({...contractData, formaPagamento: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                          />
                        </div>
                      </div>

                      {/* Prévia ao Vivo da Cláusula 3.1 */}
                      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-2">
                        <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">Prévia do Item 3.1 no Contrato PDF:</p>
                        <p className="font-medium">
                          <strong>3. DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA</strong><br />
                          <strong>3.1.</strong> O COMPRADOR pagará pela aquisição de {contractData.cota} da propriedade da embarcação, objeto deste contrato, o valor de R$ {contractData.valorTotal} a ser efetuado da seguinte forma:
                        </p>
                        <p className="pl-4">
                          <strong>a)</strong> Pagamento de R$ {contractData.valorEntrada} a título de entrada, que será pago à vista no momento da assinatura do presente contrato.
                        </p>
                        <p className="pl-4">
                          <strong>b)</strong> O valor remanescente de R$ {contractData.valorRemanescente} ({contractData.valorRemanescenteExtenso}), deverá ser pago em {contractData.numParcelas} ({contractData.numParcelasExtenso}) parcelas de R$ {contractData.valorParcela} ({contractData.valorParcelaExtenso}), mediante {contractData.formaPagamento}, com o vencimento para o dia {contractData.diaVencimento} de cada mês, servindo comprovante de pagamento/transferência como recibo de quitação.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button type="submit" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center transition-all shadow-md">
                      <FileSignature className="w-4 h-4 mr-2" />
                      Gerar e Baixar PDF
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Modal: Cadastro / Edição de Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsClientModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-spring-pop">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto subtle-scrollbar">
              <form id="clientForm" onSubmit={handleSaveClient} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                    <input required type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone / WhatsApp</label>
                    <input type="text" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">CNH ou CHA (Carteira Náutica)</label>
                    <input required type="text" value={formData.cnh_cha} onChange={e => setFormData({...formData, cnh_cha: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profissão</label>
                    <input type="text" value={formData.profissao} onChange={e => setFormData({...formData, profissao: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado Civil</label>
                    <input type="text" value={formData.estadoCivil} onChange={e => setFormData({...formData, estadoCivil: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 mt-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Documentação & Habilitação Náutica</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">RG</label>
                      <input type="text" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} placeholder="Ex: 12.345.678-9" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Órgão Emissor do RG</label>
                      <input type="text" value={formData.orgaoEmissor} onChange={e => setFormData({...formData, orgaoEmissor: e.target.value})} placeholder="Ex: SSP/SP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº Habilitação Náutica (CHA)</label>
                      <input type="text" value={formData.numeroHabilitacao || formData.cnh_cha} onChange={e => setFormData({...formData, numeroHabilitacao: e.target.value, cnh_cha: e.target.value})} placeholder="Ex: 381M2021005" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria da Habilitação</label>
                      <select value={formData.categoriaHabilitacao} onChange={e => setFormData({...formData, categoriaHabilitacao: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all">
                        <option value="">Selecione...</option>
                        <option value="Arrais-Amador">Arrais-Amador</option>
                        <option value="Motonauta">Motonauta</option>
                        <option value="Arrais e Motonauta">Arrais e Motonauta</option>
                        <option value="Mestre-Amador">Mestre-Amador</option>
                        <option value="Capitão-Amador">Capitão-Amador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Validade / Expiração da CHA</label>
                      <input type="date" value={formData.validadeHabilitacao} onChange={e => setFormData({...formData, validadeHabilitacao: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Órgão Emissor da Habilitação</label>
                      <input type="text" value={formData.orgaoEmissorHabilitacao} onChange={e => setFormData({...formData, orgaoEmissorHabilitacao: e.target.value})} placeholder="Ex: Marinha do Brasil / Capitania" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 mt-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CEP</label>
                      <input required type="text" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logradouro (Rua, Av)</label>
                      <input required type="text" value={formData.logradouro} onChange={e => setFormData({...formData, logradouro: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número</label>
                      <input required type="text" value={formData.numeroEnd} onChange={e => setFormData({...formData, numeroEnd: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Complemento</label>
                      <input type="text" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bairro</label>
                      <input required type="text" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
                      <input required type="text" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">UF (Estado)</label>
                      <input required type="text" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 rounded-b-2xl">
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="clientForm"
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center shadow-md transition-all"
              >
                {editingClient ? 'Salvar Alterações' : 'Salvar Novo Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ficha Cadastral (Visualização) */}
      {selectedClientView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedClientView(null)} />
          <div id="print-area" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-spring-pop">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-slate-400" /> Ficha Cadastral
              </h3>
              <button onClick={() => setSelectedClientView(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto subtle-scrollbar">
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div className="col-span-2 border-b border-slate-100 pb-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo</span>
                  <span className="block text-lg font-semibold text-slate-800">{selectedClientView.nome}</span>
                </div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CPF</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.cpf || '-'}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">RG / Órgão Emissor</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.rg || '-'} {selectedClientView.orgaoEmissor ? `(${selectedClientView.orgaoEmissor})` : ''}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.email || '-'}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.telefone || '-'}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Profissão</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.profissao || '-'}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Civil</span><span className="block font-medium text-slate-700 text-sm">{selectedClientView.estadoCivil || '-'}</span></div>

                <div className="col-span-2 pt-4 mt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Habilitação Náutica (CHA / Arrais / Motonauta)</span>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div><span className="block text-slate-400 font-semibold mb-0.5">Nº da Habilitação</span><span className="font-bold text-slate-800 font-mono">{selectedClientView.numeroHabilitacao || selectedClientView.cnh_cha || 'Não informada'}</span></div>
                    <div><span className="block text-slate-400 font-semibold mb-0.5">Categoria</span><span className="font-bold text-slate-800">{selectedClientView.categoriaHabilitacao || 'Não informada'}</span></div>
                    <div><span className="block text-slate-400 font-semibold mb-0.5">Data de Expiração / Validade</span><span className="font-bold text-slate-800 font-mono">{selectedClientView.validadeHabilitacao || 'Não informada'}</span></div>
                    <div><span className="block text-slate-400 font-semibold mb-0.5">Órgão Emissor</span><span className="font-bold text-slate-800">{selectedClientView.orgaoEmissorHabilitacao || 'Marinha do Brasil'}</span></div>
                  </div>
                </div>
                
                <div className="col-span-2 pt-4 mt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Endereço de Faturamento</span>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedClientView.logradouro}, {selectedClientView.numeroEnd} {selectedClientView.complemento && ` - ${selectedClientView.complemento}`}<br />
                      Bairro: {selectedClientView.bairro}<br />
                      CEP: {selectedClientView.cep}<br />
                      {selectedClientView.cidade} / {selectedClientView.estado}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  const printSection = document.getElementById('print-section');
                  if (printSection) printSection.id = 'print-section-hidden';
                  setTimeout(() => {
                    window.print();
                    if (printSection) printSection.id = 'print-section';
                  }, 100);
                }}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </button>
              <button 
                onClick={() => {
                  openEditClient(selectedClientView);
                  setSelectedClientView(null);
                }}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Editar
              </button>
              <button 
                onClick={() => {
                  setContractData(prev => ({ ...prev, clienteId: selectedClientView.id }));
                  setSelectedClientView(null);
                  setActiveTab('contratos');
                }}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center shadow-md transition-all"
              >
                <FileSignature className="w-4 h-4 mr-2" /> Emitir Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ficha da Embarcação (Visualização) */}
      {selectedBoatModalView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedBoatModalView(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-spring-pop">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Anchor className="w-5 h-5 mr-2 text-blue-600" /> Ficha da Embarcação - {selectedBoatModalView.nome}
              </h3>
              <button onClick={() => setSelectedBoatModalView(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto subtle-scrollbar space-y-6">
              <div className="flex items-center space-x-6 pb-6 border-b border-slate-100">
                {selectedBoatModalView.imagemUrl ? (
                  <img src={selectedBoatModalView.imagemUrl} alt={selectedBoatModalView.nome} className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-md" />
                ) : (
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border shadow-sm ${
                    selectedBoatModalView.tipo === 'jet' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                  }`}>
                    <Anchor className="w-12 h-12" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedBoatModalView.nome}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-md ${
                      selectedBoatModalView.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {selectedBoatModalView.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                    </span>
                    <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Código Agenda: M{selectedBoatModalView.numero?.toString().padStart(2, '0') || '00'}
                    </span>
                    {selectedBoatModalView.emManutencao && (
                      <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md bg-rose-100 text-rose-800">
                        Manutenção
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Especificações Técnicas</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                  <div><span className="block text-xs font-semibold text-slate-500">Fabricante</span><span className="font-bold text-slate-800">{selectedBoatModalView.fabricante || '-'}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500">Modelo</span><span className="font-bold text-slate-800">{selectedBoatModalView.modelo || '-'}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500">Ano</span><span className="font-bold text-slate-800">{selectedBoatModalView.ano || '-'}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500">Inscrição Marinha</span><span className="font-bold text-slate-800 font-mono">{selectedBoatModalView.inscricao || '-'}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500">Chassi (HIN)</span><span className="font-bold text-slate-800 font-mono">{selectedBoatModalView.chassi || '-'}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500">Propulsão / Potência</span><span className="font-bold text-slate-800">{selectedBoatModalView.tipo_propulsao || 'MOTOR'} {selectedBoatModalView.potencia ? `(${selectedBoatModalView.potencia})` : ''}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lista de Cotistas / Coproprietários</h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 divide-y divide-slate-100">
                  {clients.filter(c => selectedBoatModalView.donos?.includes(c.id)).map(owner => (
                    <div key={owner.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {owner.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{owner.nome}</p>
                          <p className="text-xs text-slate-500">CPF: {owner.cpf || 'Não informado'} | Tel: {owner.telefone || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedBoatModalView.donos || selectedBoatModalView.donos.length === 0) && (
                    <p className="text-xs text-slate-500 py-2">Nenhum cotista vinculado a esta embarcação.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  openEditBoat(selectedBoatModalView);
                  setSelectedBoatModalView(null);
                }}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Editar Embarcação
              </button>
              <button 
                onClick={() => {
                  setContractData(prev => ({ ...prev, embarcacaoId: selectedBoatModalView.id }));
                  setSelectedBoatModalView(null);
                  setActiveTab('contratos');
                }}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center shadow-md transition-all"
              >
                <FileSignature className="w-4 h-4 mr-2" /> Emitir Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro / Edição de Embarcação */}
      {isBoatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBoatModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-spring-pop">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingBoat ? 'Editar Embarcação' : 'Cadastrar Nova Embarcação'}
              </h3>
              <button onClick={() => setIsBoatModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto subtle-scrollbar">
              <form id="boatForm" onSubmit={handleSaveBoatFromModal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome da Embarcação</label>
                    <input required type="text" value={boatFormData.nome} onChange={e => setBoatFormData({...boatFormData, nome: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-medium" placeholder="Ex: Lancha Coral 26" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número Código (Google Agenda)</label>
                    <input required type="text" value={boatFormData.numero} onChange={e => setBoatFormData({...boatFormData, numero: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-mono" placeholder="Ex: 03" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                    <select value={boatFormData.tipo} onChange={e => setBoatFormData({...boatFormData, tipo: e.target.value as any})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all">
                      <option value="lancha">Lancha</option>
                      <option value="jet">Jet Ski</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modelo</label>
                    <input type="text" value={boatFormData.modelo} onChange={e => setBoatFormData({...boatFormData, modelo: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Ex: 260 Cruiser" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fabricante / Estaleiro</label>
                    <input type="text" value={boatFormData.fabricante} onChange={e => setBoatFormData({...boatFormData, fabricante: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Ex: Coral" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ano</label>
                    <input type="number" value={boatFormData.ano} onChange={e => setBoatFormData({...boatFormData, ano: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº de Inscrição na Marinha</label>
                    <input type="text" value={boatFormData.inscricao} onChange={e => setBoatFormData({...boatFormData, inscricao: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-mono" placeholder="Ex: 401M2023001" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº do Chassi (HIN)</label>
                    <input type="text" value={boatFormData.chassi} onChange={e => setBoatFormData({...boatFormData, chassi: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-mono" placeholder="Ex: BR-MEX12345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Propulsão</label>
                    <input type="text" value={boatFormData.tipo_propulsao} onChange={e => setBoatFormData({...boatFormData, tipo_propulsao: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Ex: MOTOR / POPA" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Potência do Motor</label>
                    <input type="text" value={boatFormData.potencia} onChange={e => setBoatFormData({...boatFormData, potencia: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Ex: 250 HP" />
                  </div>
                </div>

                <div className="flex items-center space-x-6 pt-3 border-t border-slate-100">
                  <label className="flex items-center space-x-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input type="checkbox" checked={boatFormData.emManutencao} onChange={e => setBoatFormData({...boatFormData, emManutencao: e.target.checked})} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                    <span>Em Manutenção</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input type="checkbox" checked={boatFormData.temSom} onChange={e => setBoatFormData({...boatFormData, temSom: e.target.checked})} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                    <span>Possui Controle de Som</span>
                  </label>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 rounded-b-2xl">
              <button 
                onClick={() => setIsBoatModalOpen(false)}
                className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="boatForm"
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center shadow-md transition-all"
              >
                {editingBoat ? 'Salvar Alterações' : 'Salvar Nova Embarcação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-spring-pop">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-3 text-slate-400" /> Configurações do Painel
            </h2>
            <form onSubmit={savePreferences} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem de Saudação</label>
                <input type="text" value={greetingInput} onChange={e => setGreetingInput(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 transition-all text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo da Empresa</label>
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Imagem de Fundo (Banner)</label>
                <input type="file" accept="image/*" onChange={e => setBgFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowSettings(false)} className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-sm text-white rounded-lg font-semibold flex items-center shadow-md transition-all">
                  <Upload className="w-4 h-4 mr-2" /> Salvar Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Modal de Exclusão */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClientToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center animate-spring-pop text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tem certeza que deseja excluir permanentemente este cliente? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex w-full space-x-3">
              <button onClick={() => setClientToDelete(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDeleteClient(clientToDelete)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Section (Hidden on screen) */}
      <div id="print-section" className="hidden p-8 bg-white text-black font-sans">
        <div className="text-center mb-8 border-b border-slate-300 pb-4">
          <h2 className="text-2xl font-bold">Relatório de Clientes</h2>
          <p className="text-sm text-slate-500">
            {filterEmbarcacao 
              ? `Filtrado por Embarcação: ${boats.find(b => b.id === filterEmbarcacao)?.nome}` 
              : 'Todos os Clientes'}
          </p>
        </div>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 px-4 font-bold">Nome</th>
              <th className="py-2 px-4 font-bold">CPF</th>
              <th className="py-2 px-4 font-bold">Telefone</th>
              <th className="py-2 px-4 font-bold">Profissão</th>
              <th className="py-2 px-4 font-bold">Embarcação</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                <td className="py-2 px-4 border-b border-slate-200">{c.nome}</td>
                <td className="py-2 px-4 border-b border-slate-200">{c.cpf || '-'}</td>
                <td className="py-2 px-4 border-b border-slate-200">{c.telefone || '-'}</td>
                <td className="py-2 px-4 border-b border-slate-200">{c.profissao || '-'}</td>
                <td className="py-2 px-4 border-b border-slate-200">
                  {boats.find(b => b.id === c.embarcacaoId)?.nome || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  </div>
  );
}
