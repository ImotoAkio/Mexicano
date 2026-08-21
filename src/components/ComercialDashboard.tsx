import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Settings, FileText, Users, Search, 
  X, CheckCircle, FileSignature, Home, Bell, 
  MoreHorizontal, Plus, Edit2, Trash2, ChevronRight,
  Filter, Download, Upload, Menu, Printer, Anchor, Save, Check, User, Eye, EyeOff, UserPlus, Key, Lock
} from 'lucide-react';
import { clientDB, boatDB } from '../db';
import { generateContract } from './ContractGenerator';
import ClientPage from './ClientPage';
import BoatModal from './BoatModal';
import ClientModal from './ClientModal';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';
import { numeroParaExtenso, parseMoney, formatMoney } from '../utils/numberToWords';
import { formatBoatName } from '../utils/constants';

interface ComercialDashboardProps {
  onLogout: () => void;
}

type TabType = 'home' | 'clientes' | 'embarcacoes' | 'contratos' | 'settings';

interface SearchableClientSelectProps {
  clients: any[];
  value: string;
  onChange: (clientId: string) => void;
  onAddNewClient?: () => void;
}

function SearchableClientSelect({ clients, value, onChange, onAddNewClient }: SearchableClientSelectProps) {
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
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-600">Selecione o Cliente *</label>
        {onAddNewClient && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNewClient();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all border border-emerald-200 shadow-2xs cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Novo Cliente</span>
          </button>
        )}
      </div>
      
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

          {onAddNewClient && (
            <div className="p-2 border-b border-slate-100 bg-emerald-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewClient();
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Novo Cliente</span>
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto subtle-scrollbar p-1.5 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-slate-400">Nenhum cliente encontrado com "{search}"</p>
                {onAddNewClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewClient();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar "{search || 'Novo Cliente'}"</span>
                  </button>
                )}
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
  onAddNewBoat?: () => void;
}

function SearchableBoatSelect({ boats, value, onChange, onAddNewBoat }: SearchableBoatSelectProps) {
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
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-600">Embarcação *</label>
        {onAddNewBoat && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNewBoat();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all border border-blue-200 shadow-2xs cursor-pointer active:scale-95"
          >
            <Anchor className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Nova Embarcação</span>
          </button>
        )}
      </div>
      
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
                <p className="text-sm font-semibold text-slate-900 truncate leading-none">{formatBoatName(selectedBoat.nome)}</p>
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

          {onAddNewBoat && (
            <div className="p-2 border-b border-slate-100 bg-blue-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewBoat();
                }}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <Anchor className="w-4 h-4" />
                <span>Cadastrar Nova Embarcação</span>
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto subtle-scrollbar p-1.5 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-slate-400">Nenhuma embarcação encontrada com "{search}"</p>
                {onAddNewBoat && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewBoat();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Anchor className="w-3.5 h-3.5" />
                    <span>Cadastrar "{search || 'Nova Embarcação'}"</span>
                  </button>
                )}
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
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{formatBoatName(b.nome)}</p>
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
  
  // Embarcações Tab State
  const [boatSearchTerm, setBoatSearchTerm] = useState('');
  const [boatFilterTipo, setBoatFilterTipo] = useState('');
  const [selectedBoatModalView, setSelectedBoatModalView] = useState<any | null>(null);
  const [isBoatModalOpen, setIsBoatModalOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<any | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientForModal, setEditingClientForModal] = useState<any | null>(null);

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

  // Password Reset State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Informe a senha atual.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Senha atual incorreta.');
      }

      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('404')) {
        setPasswordSuccess('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(err.message || 'Erro ao alterar a senha.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Formulário de Contrato
  const [contractData, setContractData] = useState({
    clienteId: '',
    embarcacaoId: '',
    cota: '25%',
    type: 'ambos',
    isCustomPaymentText: false,
    customPaymentText: '',
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

  const generateStandardPaymentText = () => {
    const cotaStr = contractData.cota || '25%';
    return `3.1. O COMPRADOR pagará pela aquisição de ${cotaStr} da propriedade da embarcação o valor de R$ ${contractData.valorTotal}:
a) Entrada de R$ ${contractData.valorEntrada} no ato da assinatura.
b) Saldo remanescente de R$ ${contractData.valorRemanescente} (${contractData.valorRemanescenteExtenso}) em ${contractData.numParcelas} (${contractData.numParcelasExtenso}) parcelas de R$ ${contractData.valorParcela} (${contractData.valorParcelaExtenso}), via ${contractData.formaPagamento}, vencimento no dia ${contractData.diaVencimento} de cada mês.`;
  };

  // Selected Client Form State for Contract Issuance Tab
  const [selectedClientData, setSelectedClientData] = useState<any | null>(null);
  const [isSavingClientInline, setIsSavingClientInline] = useState(false);
  const [clientSaveSuccess, setClientSaveSuccess] = useState(false);
  const [previewTab, setPreviewTab] = useState<'aquisicao' | 'adm'>('aquisicao');
  const [showClientDetailsEdit, setShowClientDetailsEdit] = useState(false);
  const [showBoatDetailsEdit, setShowBoatDetailsEdit] = useState(false);

  useEffect(() => {
    if (contractData.clienteId) {
      const found = clients.find(c => c.id === contractData.clienteId);
      if (found) {
        setSelectedClientData(prev => {
          const defaultOrgao = (found.orgaoEmissorHabilitacao && found.orgaoEmissorHabilitacao.trim() !== '')
            ? found.orgaoEmissorHabilitacao
            : 'Capitania Fluvial de Juazeiro';
          if (prev && prev.id === found.id) {
            return {
              ...prev,
              orgaoEmissorHabilitacao: prev.orgaoEmissorHabilitacao && prev.orgaoEmissorHabilitacao.trim() !== ''
                ? prev.orgaoEmissorHabilitacao
                : defaultOrgao
            };
          }
          return {
            ...found,
            orgaoEmissorHabilitacao: defaultOrgao
          };
        });
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
    const dataToSave = {
      ...selectedClientData,
      orgaoEmissorHabilitacao: (selectedClientData.orgaoEmissorHabilitacao && selectedClientData.orgaoEmissorHabilitacao.trim() !== '')
        ? selectedClientData.orgaoEmissorHabilitacao
        : 'Capitania Fluvial de Juazeiro'
    };
    try {
      clientDB.update(dataToSave.id, dataToSave);
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'clients', action: 'upsert', data: dataToSave })
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

  const openNewBoat = () => {
    setEditingBoat(null);
    setIsBoatModalOpen(true);
  };

  const openEditBoat = (boat: any) => {
    setEditingBoat(boat);
    setIsBoatModalOpen(true);
  };

  const handleBoatSavedFromModal = (savedBoat: any) => {
    setIsBoatModalOpen(false);
    loadData();
    if (activeTab === 'contratos' || !editingBoat) {
      setContractData(prev => ({ ...prev, embarcacaoId: savedBoat.id }));
      setSelectedBoatData(savedBoat);
    }
  };

  const openNewClient = () => {
    setEditingClientForModal(null);
    setIsClientModalOpen(true);
  };

  const openEditClient = (client: any) => {
    setEditingClientForModal(client);
    setIsClientModalOpen(true);
  };

  const handleClientSavedFromModal = (savedClient: any) => {
    setIsClientModalOpen(false);
    loadData();
    setContractData(prev => ({ ...prev, clienteId: savedClient.id }));
    setSelectedClientData(savedClient);
  };

  const handleGenerateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractData.clienteId) {
      alert("Selecione um cliente.");
      return;
    }
    
    const selectedClientRaw = (selectedClientData && selectedClientData.id === contractData.clienteId)
      ? selectedClientData
      : clients.find(c => c.id === contractData.clienteId);
    const selectedBoat = (selectedBoatData && selectedBoatData.id === contractData.embarcacaoId)
      ? selectedBoatData
      : boats.find(b => b.id === contractData.embarcacaoId);
    
    if (!selectedClientRaw) return;

    const selectedClient = {
      ...selectedClientRaw,
      orgaoEmissorHabilitacao: (selectedClientRaw.orgaoEmissorHabilitacao && selectedClientRaw.orgaoEmissorHabilitacao.trim() !== '')
        ? selectedClientRaw.orgaoEmissorHabilitacao
        : 'Capitania Fluvial de Juazeiro'
    };

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
        diaVencimento: contractData.diaVencimento,
        isCustomPaymentText: contractData.isCustomPaymentText,
        customPaymentText: contractData.customPaymentText
      });
    }
  };

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
    <div className="min-h-screen w-full flex bg-[#f4f5f7] font-sans text-slate-800">
      
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

          {/* TAB: CLIENTES (Base de Clientes Oficial) */}
          {activeTab === 'clientes' && (
            <div className="w-full">
              <ClientPage />
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
                                  <h3 className="font-bold text-slate-900 text-lg">{formatBoatName(boat.nome)}</h3>
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
            <div className="max-w-7xl mx-auto space-y-6">
              {/* PAGE HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileSignature className="w-6 h-6 text-emerald-600" />
                    Emissão & Prévia de Contratos
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    Configure os dados do cliente e da embarcação para visualizar e gerar os documentos oficiais em tempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateContract}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-all shadow-md shrink-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Gerar e Baixar PDF
                </button>
              </div>

              {/* SPLIT 2-COLUMN LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: FORM CONTROLS (6 cols) */}
                <div className="lg:col-span-6 space-y-5">
                  <form onSubmit={handleGenerateContract} className="space-y-5">
                    {/* CARD 1: SELEÇÃO DO CONTRATO */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">1</span>
                        Seleção Principal
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <SearchableClientSelect
                            clients={clients}
                            value={contractData.clienteId}
                            onChange={id => setContractData({...contractData, clienteId: id})}
                            onAddNewClient={openNewClient}
                          />
                        </div>

                        <div>
                          <SearchableBoatSelect
                            boats={boats}
                            value={contractData.embarcacaoId}
                            onChange={id => setContractData({...contractData, embarcacaoId: id})}
                            onAddNewBoat={openNewBoat}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Cota</label>
                            <select value={contractData.cota} onChange={e => setContractData({...contractData, cota: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-xs font-medium transition-all text-slate-700">
                              <option value="25%">25% (4 Sócios)</option>
                              <option value="12.5%">12,5% (8 Sócios)</option>
                              <option value="50%">50% (2 Sócios)</option>
                              <option value="100%">100% (Proprietário Único)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Contrato</label>
                            <select value={contractData.type} onChange={e => setContractData({...contractData, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 text-xs font-medium transition-all text-slate-700">
                              <option value="ambos">Ambos (Adm + Aquisição)</option>
                              <option value="adm">Apenas Administração</option>
                              <option value="aquisicao">Apenas Aquisição</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: DADOS DO CLIENTE SELECIONADO */}
                    {selectedClientData && (
                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            <h3 className="font-bold text-slate-800 text-sm">Dados do Cliente</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowClientDetailsEdit(!showClientDetailsEdit)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {showClientDetailsEdit ? 'Ocultar Edição' : 'Editar Dados'}
                          </button>
                        </div>

                        {/* COMPACT SUMMARY PILLS */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Nome</span>
                            <span className="font-semibold text-slate-800 truncate block">{selectedClientData.nome || '-'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">CPF</span>
                            <span className="font-mono text-slate-800 font-medium block">{selectedClientData.cpf || '-'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Órgão CHA</span>
                            <span className="font-medium text-emerald-700 truncate block">{selectedClientData.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro'}</span>
                          </div>
                        </div>

                        {/* EXPANDABLE EDITABLE FIELDS */}
                        {showClientDetailsEdit && (
                          <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleSaveClientInline}
                                disabled={isSavingClientInline}
                                className={`px-3 py-1 rounded text-xs font-semibold flex items-center transition-all ${
                                  clientSaveSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {clientSaveSuccess ? 'Salvo!' : isSavingClientInline ? 'Salvando...' : 'Salvar Alterações'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Nome Completo</label>
                                <input type="text" value={selectedClientData.nome || ''} onChange={e => setSelectedClientData({...selectedClientData, nome: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">CPF</label>
                                <input type="text" value={selectedClientData.cpf || ''} onChange={e => setSelectedClientData({...selectedClientData, cpf: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">RG</label>
                                <input type="text" value={selectedClientData.rg || ''} onChange={e => setSelectedClientData({...selectedClientData, rg: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Órgão Emissor CHA</label>
                                <input type="text" value={selectedClientData.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro'} onChange={e => setSelectedClientData({...selectedClientData, orgaoEmissorHabilitacao: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Telefone/WhatsApp</label>
                                <input type="text" value={selectedClientData.telefone || ''} onChange={e => setSelectedClientData({...selectedClientData, telefone: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Estado Civil</label>
                                <input type="text" value={selectedClientData.estadoCivil || ''} onChange={e => setSelectedClientData({...selectedClientData, estadoCivil: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD 3: DADOS DA EMBARCAÇÃO SELECIONADA */}
                    {selectedBoatData && (
                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <Anchor className="w-4 h-4 text-blue-600" />
                            <h3 className="font-bold text-slate-800 text-sm">Dados da Embarcação</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowBoatDetailsEdit(!showBoatDetailsEdit)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {showBoatDetailsEdit ? 'Ocultar Edição' : 'Editar Dados'}
                          </button>
                        </div>

                        {/* COMPACT SUMMARY PILLS */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Embarcação</span>
                            <span className="font-semibold text-slate-800 truncate block">{formatBoatName(selectedBoatData.nome) || '-'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Inscrição</span>
                            <span className="font-mono text-slate-800 font-medium block">{selectedBoatData.inscricao || '-'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassi</span>
                            <span className="font-mono text-slate-800 font-medium block truncate">{selectedBoatData.chassi || '-'}</span>
                          </div>
                        </div>

                        {/* EXPANDABLE EDITABLE FIELDS */}
                        {showBoatDetailsEdit && (
                          <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleSaveBoat}
                                disabled={isSavingBoat}
                                className={`px-3 py-1 rounded text-xs font-semibold flex items-center transition-all ${
                                  boatSaveSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {boatSaveSuccess ? 'Salvo!' : isSavingBoat ? 'Salvando...' : 'Salvar Alterações'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Nome</label>
                                <input type="text" value={selectedBoatData.nome || ''} onChange={e => setSelectedBoatData({...selectedBoatData, nome: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Modelo</label>
                                <input type="text" value={selectedBoatData.modelo || ''} onChange={e => setSelectedBoatData({...selectedBoatData, modelo: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Nº Inscrição</label>
                                <input type="text" value={selectedBoatData.inscricao || ''} onChange={e => setSelectedBoatData({...selectedBoatData, inscricao: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800" />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-600 mb-1">Chassi (HIN)</label>
                                <input type="text" value={selectedBoatData.chassi || ''} onChange={e => setSelectedBoatData({...selectedBoatData, chassi: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD 4: CONDIÇÕES FINANCEIRAS (Item 3.1) */}
                    {(contractData.type === 'aquisicao' || contractData.type === 'ambos') && (
                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                        <div className="border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                            <span>Cláusula 3.1 - Condições Financeiras</span>
                          </h3>

                          {/* Mode Switcher Tabs */}
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold shrink-0">
                            <button
                              type="button"
                              onClick={() => setContractData({ ...contractData, isCustomPaymentText: false })}
                              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                                !contractData.isCustomPaymentText
                                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              ✨ Cálculo Automático
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setContractData({
                                  ...contractData,
                                  isCustomPaymentText: true,
                                  customPaymentText: contractData.customPaymentText || generateStandardPaymentText()
                                });
                              }}
                              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                                contractData.isCustomPaymentText
                                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              ✏️ Texto Livre / Manual
                            </button>
                          </div>
                        </div>

                        {/* MODE 1: STRUCTURED / AUTOMATIC */}
                        {!contractData.isCustomPaymentText ? (
                          <div className="space-y-3 animate-in fade-in duration-150">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valor Total (R$)</label>
                                <input type="text" value={contractData.valorTotal} onChange={e => recalculatePayment(e.target.value, contractData.valorEntrada, contractData.numParcelas)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Entrada (R$)</label>
                                <input type="text" value={contractData.valorEntrada} onChange={e => recalculatePayment(contractData.valorTotal, e.target.value, contractData.numParcelas)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nº Parcelas</label>
                                <input type="text" value={contractData.numParcelas} onChange={e => recalculatePayment(contractData.valorTotal, contractData.valorEntrada, e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Saldo Remanescente (R$)</label>
                                <input type="text" value={contractData.valorRemanescente} onChange={e => handleRemanescenteChange(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valor Parcela (R$)</label>
                                <input type="text" value={contractData.valorParcela} onChange={e => handleParcelaChange(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vencimento (Dia)</label>
                                <input type="text" value={contractData.diaVencimento} onChange={e => setContractData({...contractData, diaVencimento: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Forma de Pagamento</label>
                                <input type="text" value={contractData.formaPagamento} onChange={e => setContractData({...contractData, formaPagamento: e.target.value})} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* MODE 2: CUSTOM MANUAL TEXT */
                          <div className="space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-semibold text-slate-600">
                                Redação Manual da Cláusula 3.1 (Texto Completo)
                              </label>
                              <button
                                type="button"
                                onClick={() => setContractData({ ...contractData, customPaymentText: generateStandardPaymentText() })}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                              >
                                Carregar do Padrão
                              </button>
                            </div>
                            <textarea
                              rows={5}
                              value={contractData.customPaymentText}
                              onChange={e => setContractData({ ...contractData, customPaymentText: e.target.value })}
                              placeholder="Escreva livremente as condições e alíneas de pagamento..."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white resize-y"
                            />
                            <p className="text-[10px] text-slate-400">
                              Ideal para permutas, balões, condições negociadas sob medida ou prazos específicos.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-md">
                      <FileSignature className="w-4 h-4 mr-2 text-emerald-400" />
                      Gerar e Baixar Contrato em PDF
                    </button>
                  </form>
                </div>

                {/* RIGHT COLUMN: LIVE DOCUMENT PREVIEW (6 cols) */}
                <div className="lg:col-span-6 sticky top-6">
                  {/* PREVIEW CONTAINER */}
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* HEADER BAR */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Prévia do Contrato (Ao Vivo)</span>
                      </div>

                      {contractData.type === 'ambos' && (
                        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('aquisicao')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                              previewTab === 'aquisicao' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Aquisição
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('adm')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                              previewTab === 'adm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Administração
                          </button>
                        </div>
                      )}
                    </div>

                    {/* PAPER PREVIEW AREA */}
                    <div className="p-4 sm:p-6 bg-slate-100/80 max-h-[720px] overflow-y-auto custom-scrollbar">
                      <div className="bg-white rounded shadow-md border border-slate-200 p-6 sm:p-8 max-w-[595px] mx-auto text-slate-800 font-serif text-[10.5px] leading-relaxed space-y-4">
                        {/* LOGO */}
                        <div className="text-center pb-2 border-b border-slate-200">
                          <img src={logoSrc} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
                          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans">
                            {(contractData.type === 'adm' || (contractData.type === 'ambos' && previewTab === 'adm'))
                              ? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ADMINISTRAÇÃO E GUARDA DE EMBARCAÇÃO'
                              : 'CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO'}
                          </h2>
                        </div>

                        {/* PARTES CONTRATANTES */}
                        {(contractData.type === 'adm' || (contractData.type === 'ambos' && previewTab === 'adm')) ? (
                          <>
                            <p className="text-justify font-sans text-[10px]">
                              <strong>CONTRATANTE:</strong> <strong>{selectedClientData?.nome || 'NÃO INFORMADO'}</strong>, inscrito sob CPF nº: <strong>{selectedClientData?.cpf || 'NÃO INFORMADO'}</strong>, RG: <strong>{selectedClientData?.rg ? `${selectedClientData.rg}${selectedClientData.orgaoEmissor ? ` ${selectedClientData.orgaoEmissor}` : ''}` : 'NÃO INFORMADA'}</strong>, Carteira Náutica nº <strong>{selectedClientData?.numeroHabilitacao || selectedClientData?.cnh_cha || 'NÃO INFORMADA'}</strong>, válida até: <strong>{selectedClientData?.validadeHabilitacao || 'NÃO INFORMADA'}</strong>, órgão emissor: <strong>{selectedClientData?.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro'}</strong>, residente e domiciliado na <strong>{selectedClientData?.logradouro ? `${selectedClientData.logradouro.toUpperCase()}, N°${selectedClientData.numeroEnd || ''}, BAIRRO: ${(selectedClientData.bairro || '').toUpperCase()}, ${(selectedClientData.cidade || '').toUpperCase()}-${(selectedClientData.estado || '').toUpperCase()}, CEP:${selectedClientData.cep || ''}` : 'NÃO INFORMADO'}</strong>, cidade: <strong>{selectedClientData?.cidade ? `${selectedClientData.cidade.toUpperCase()}-${(selectedClientData.estado || '').toUpperCase()}` : 'PETROLINA-PE'}</strong>, endereço eletrônico: <strong>{(selectedClientData?.email || 'NÃO INFORMADO').toUpperCase()}</strong>, WhatsApp: <strong>{selectedClientData?.telefone || 'NÃO INFORMADO'}</strong>.
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              <strong>CONTRATADO/ADMINISTRADOR:</strong> <strong>VALE ADMINISTRADORA NAUTICA</strong>, pessoa jurídica de direito privado, <strong>CNPJ: 62.794.642/0001-67</strong> com sede situada na cidade de <strong>PETROLINA-PE</strong>, no <strong>LOTEAMENTO LOTE 190, Nº 190, ESTRADA DA TAPERA, CEP: 56.334-899</strong>, endereço eletrônico: <strong>atendimentovaleadm@gmail.com</strong>, WhatsApp: <strong>(87)9 9109-0051</strong>.
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              <u>CONSIDERANDO</u> que o CONTRATANTE firmou contrato para aquisição de copropriedade da embarcação <strong>{formatBoatName(selectedBoatData?.nome) || 'N/A'}</strong>, se comprometendo a pactuar contrato de administração da embarcação com empresa <strong>VALE ADMINISTRADORA NÁUTICA</strong>, obrigatoriamente até a quitação integral do valor da embarcação por todos os coproprietários;
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              <u>CONSIDERANDO</u> que apesar de se tratar de embarcação de uso compartilhado, os coproprietários são pessoas independentes, sendo cada um responsável pelo cumprimento de seus direitos e obrigações individuais e coletivos;
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              <u>CONSIDERANDO</u> que os Coproprietários estão de acordo com a gestão da embarcação por uma empresa especializada por se tratar de aquisição em “uso compartilhado” e a <strong>VALE ADMINISTRADORA DE BENS NÁUTICOS</strong> possui a expertise necessária para o referido serviço.
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Administração Para Embarcação de Uso Compartilhado, que se regerá pelas cláusulas a seguir descritas.
                            </p>

                            <div className="pt-2 border-t border-slate-100 font-sans text-[10px] space-y-1.5">
                              <p className="font-bold text-slate-900">1. <u>DO OBJETO</u></p>
                              <p className="text-justify">
                                1.1. Constitui-se objeto deste contrato o serviço de gerenciamento completo da embarcação: Nº de inscrição: <strong>{selectedBoatData?.inscricao || 'N/A'}</strong>, Tipo de propulsão: <strong>{selectedBoatData?.tipo_propulsao || 'MOTOR'}</strong>, potência: <strong>{selectedBoatData?.potencia || 'N/A'}</strong>, Nº de CHASSI: <strong>{selectedBoatData?.chassi || 'N/A'}</strong>, por parte do ADMINISTRADOR em favor do CONTRATANTE, o qual possui copropriedade do referido bem, possuindo direitos e obrigações individuais e coletivos.
                              </p>
                              <p className="text-justify">
                                <mark className="bg-yellow-200 px-1 py-0.5 rounded font-bold text-slate-900">1.2.</mark> <strong>O ADMINISTRADOR desempenhará as seguintes funções:</strong>
                              </p>
                              <div className="pl-3 space-y-0.5 text-[9.5px]">
                                <p>a) Comunicação e suporte nas tratativas entre os coproprietários;</p>
                                <p>b) Acompanhamento de manutenções corretivas e preventivas do bem;</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-justify font-sans text-[10px]">
                              <strong>COMPRADOR:</strong> Nome: <strong>{selectedClientData?.nome || 'NÃO INFORMADO'}</strong>, Nacionalidade: <strong>BRASILEIRO</strong>, Estado civil: <strong>{selectedClientData?.estadoCivil || 'N/A'}</strong>, Profissão: <strong>{selectedClientData?.profissao || 'N/A'}</strong>, inscrito no CPF sob o nº <strong>{selectedClientData?.cpf || 'N/A'}</strong>, portador do RG nº <strong>{selectedClientData?.rg || 'N/A'}</strong>, Endereço: <strong>{selectedClientData?.logradouro ? `${selectedClientData.logradouro.toUpperCase()}, N°${selectedClientData.numeroEnd || ''}, BAIRRO: ${(selectedClientData.bairro || '').toUpperCase()}, ${(selectedClientData.cidade || '').toUpperCase()}-${(selectedClientData.estado || '').toUpperCase()}, CEP:${selectedClientData.cep || ''}` : 'NÃO INFORMADO'}</strong>, WhatsApp: <strong>{selectedClientData?.telefone || 'N/A'}</strong>.
                            </p>
                            <p className="text-justify font-sans text-[10px]">
                              <strong>VENDEDOR:</strong> <strong>MEXICANO LANCHAS LTDA</strong>, CNPJ nº <strong>42.206.594/0001-31</strong>, situada na cidade de Petrolina-PE, Estrada da Tapera, Lote 190, CEP 56334-899.
                            </p>
                            <div className="pt-2 border-t border-slate-100 font-sans text-[10px] space-y-1.5">
                              <p className="font-bold text-slate-900">1. <u>OBJETO</u></p>
                              <p className="text-justify">
                                <mark className="bg-yellow-200 px-1 py-0.5 rounded font-bold text-slate-900">1.1.</mark> Este contrato tem como objeto a aquisição de copropriedade de embarcação correspondente a <strong>{contractData.cota}</strong> do total:
                              </p>
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[9.5px] font-mono grid grid-cols-2 gap-1 text-slate-700">
                                <div><strong>Embarcação:</strong> {formatBoatName(selectedBoatData?.nome) || 'N/A'}</div>
                                <div><strong>Modelo:</strong> {selectedBoatData?.modelo || 'N/A'}</div>
                                <div><strong>Nº Inscrição:</strong> {selectedBoatData?.inscricao || 'N/A'}</div>
                                <div><strong>Chassi (HIN):</strong> {selectedBoatData?.chassi || 'N/A'}</div>
                                <div><strong>Propulsão:</strong> {selectedBoatData?.tipo_propulsao || 'MOTOR'}</div>
                                <div><strong>Potência:</strong> {selectedBoatData?.potencia || 'N/A'}</div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* CLÁUSULA FINANCEIRA (Se Aquisição) */}
                        {(contractData.type === 'aquisicao' || (contractData.type === 'ambos' && previewTab === 'aquisicao')) && (
                          <div className="pt-2 border-t border-slate-100 font-sans text-[10px] space-y-1.5">
                            <p className="font-bold text-slate-900">3. DO PREÇO E FORMA DE PAGAMENTO</p>
                            {contractData.isCustomPaymentText && contractData.customPaymentText.trim() ? (
                              <div className="pl-3 border-l-2 border-indigo-500 space-y-1 bg-indigo-50/40 p-2 rounded text-[9.5px] whitespace-pre-wrap font-serif">
                                {contractData.customPaymentText}
                              </div>
                            ) : (
                              <>
                                <p className="text-justify">
                                  <strong>3.1.</strong> O COMPRADOR pagará pela aquisição de <strong>{contractData.cota}</strong> da propriedade da embarcação o valor de <strong>R$ {contractData.valorTotal}</strong>:
                                </p>
                                <div className="pl-3 border-l-2 border-emerald-500 space-y-1 bg-emerald-50/40 p-2 rounded text-[9.5px]">
                                  <p><strong>a)</strong> Entrada de R$ <strong>{contractData.valorEntrada}</strong> no ato da assinatura.</p>
                                  <p><strong>b)</strong> Saldo remanescente de R$ <strong>{contractData.valorRemanescente}</strong> ({contractData.valorRemanescenteExtenso}) em <strong>{contractData.numParcelas}</strong> ({contractData.numParcelasExtenso}) parcelas de R$ <strong>{contractData.valorParcela}</strong> ({contractData.valorParcelaExtenso}), via {contractData.formaPagamento}, vencimento no dia <strong>{contractData.diaVencimento}</strong> de cada mês.</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* ASSINATURAS MOCKUP */}
                        <div className="pt-6 border-t border-slate-200 font-sans text-[9px] text-center grid grid-cols-2 gap-6">
                          <div>
                            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                              {selectedClientData?.nome ? selectedClientData.nome.toUpperCase() : 'COMPRADOR / CONTRATANTE'}
                            </div>
                            <p className="text-slate-500">CPF: {selectedClientData?.cpf || '___'}</p>
                          </div>
                          <div>
                            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                              MEXICANO LANCHAS LTDA
                            </div>
                            <p className="text-slate-500">CNPJ: 42.206.594/0001-31</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Modal: Ficha da Embarcação (Visualização) */}
      {selectedBoatModalView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedBoatModalView(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-spring-pop">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Anchor className="w-5 h-5 mr-2 text-blue-600" /> Ficha da Embarcação - {formatBoatName(selectedBoatModalView.nome)}
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
                  <h2 className="text-2xl font-bold text-slate-900">{formatBoatName(selectedBoatModalView.nome)}</h2>
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
      <BoatModal
        isOpen={isBoatModalOpen}
        onClose={() => setIsBoatModalOpen(false)}
        onSave={handleBoatSavedFromModal}
        editingBoat={editingBoat}
        clients={clients}
        showWhatsAppMapping={false}
      />

      {/* Modal: Cadastro / Edição de Cliente */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleClientSavedFromModal}
        editingClient={editingClientForModal}
        boats={boats}
      />

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

              {/* Seção Redefinir Senha */}
              <div className="pt-5 mt-5 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center">
                  <Key className="w-4 h-4 mr-2 text-indigo-600" /> Redefinir Senha
                </h3>

                {passwordError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold">
                    {passwordSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Sua senha atual"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    {isChangingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => {
                  setShowSettings(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }} className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-sm text-white rounded-lg font-semibold flex items-center shadow-md transition-all">
                  <Upload className="w-4 h-4 mr-2" /> Salvar Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
    </div>
  );
}
