import React, { useState, useMemo } from 'react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';
import { User, Plus, Search, Ship, Edit2, Phone, Mail, FileText, Calendar, X, Check, ShieldAlert, Anchor, Percent, MapPin, Loader2, AlertTriangle, CheckCircle2, SlidersHorizontal, ArrowUpDown, RotateCcw, Eye, Database, Save, Download, List, LayoutGrid, ChevronDown, Zap, Building2, Cake, Power, PowerOff, UserCheck, UserX, Trash2 } from 'lucide-react';
import ClientProfileModal from './ClientProfileModal';
import ClientModal from './ClientModal';
import ClientBirthdayModal, { parseClientBirthday } from './ClientBirthdayModal';
import { generateContract } from './ContractGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
}

interface SearchableSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const STATUS_OPTIONS: SearchableSelectOption[] = [
  { id: 'all', label: 'Todos os status de cadastro', description: 'Ativos e Inativos' },
  { id: 'ativo', label: 'Apenas Ativos', description: 'Cadastros liberados para agendamentos' },
  { id: 'inativo', label: 'Apenas Inativos', description: 'Cadastros desativados (histórico mantido)' }
];

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
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-slate-400" />}
        {label}
      </label>

      {/* Select Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 transition-all cursor-pointer shadow-xs text-left text-slate-700 font-semibold"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : 'Selecione...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
          {/* Search Box inside Popover */}
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

          {/* Options List */}
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

export default function ClientPage() {
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Contract Modal State
  const [contractModalClient, setContractModalClient] = useState<Cliente | null>(null);
  const [contractType, setContractType] = useState<'aquisicao' | 'adm'>('aquisicao');
  const [selectedBoatForContract, setSelectedBoatForContract] = useState<string>('');
  const [isGeneratingContract, setIsGeneratingContract] = useState<boolean>(false);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);

  // Birthday Modal State
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

  const currentMonthBirthdaysCount = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return clients.filter(c => {
      const parsed = parseClientBirthday(c);
      return parsed && parsed.month === currentMonth;
    }).length;
  }, [clients]);

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
  
  // Quick Finance Update State
  const [quickFinanceClient, setQuickFinanceClient] = useState<Cliente | null>(null);
  const [quickStatus, setQuickStatus] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
  const [quickNotes, setQuickNotes] = useState('');

  // Deactivate Confirmation Modal State (Replaces permanent deletion to preserve all records)
  const [deactivateConfirmation, setDeactivateConfirmation] = useState<{ id: string; name: string } | null>(null);

  // Permanent Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBoat, setFilterBoat] = useState<string>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterFinance, setFilterFinance] = useState<string>('all');
  const [filterBoatType, setFilterBoatType] = useState<string>('all');
  const [filterPlano, setFilterPlano] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenContractModal = (client: Cliente) => {
    setContractModalClient(client);
    setContractType('aquisicao');
    const linkedBoatId = client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId || '';
    setSelectedBoatForContract(linkedBoatId);
  };

  const handleGenerateContractPDF = async () => {
    if (!contractModalClient) return;
    setIsGeneratingContract(true);
    try {
      const boat = boats.find(b => b.id === selectedBoatForContract) || boats[0];
      const cotaCode = contractModalClient.embarcacoes?.find(e => e.embarcacaoId === selectedBoatForContract)?.cota || contractModalClient.cota || 'C1';
      
      await generateContract(
        contractType,
        {
          nome: contractModalClient.nome,
          cpf: contractModalClient.cpf,
          rg: (contractModalClient as any).rg,
          cnh_cha: (contractModalClient as any).cnh_cha,
          estadoCivil: (contractModalClient as any).estadoCivil,
          profissao: (contractModalClient as any).profissao,
          logradouro: contractModalClient.logradouro,
          numeroEnd: contractModalClient.numeroEnd,
          complemento: contractModalClient.complemento,
          bairro: contractModalClient.bairro,
          cidade: contractModalClient.cidade,
          estado: contractModalClient.estado,
          cep: contractModalClient.cep,
          telefone: contractModalClient.telefone,
          email: contractModalClient.email,
          cota: cotaCode,
        },
        {
          nome: boat?.nome || 'Embarcação',
          modelo: boat?.modelo || 'Modelo',
          chassi: (boat as any)?.chassi || boat?.numero || '',
          inscricao: (boat as any)?.inscricao || '',
          tipo_propulsao: (boat as any)?.tipo_propulsao || 'Motor',
          potencia: (boat as any)?.potencia || '',
        }
      );
      showToast('Contrato gerado e baixado com sucesso!');
      setContractModalClient(null);
    } catch (err) {
      console.error('Erro ao gerar contrato PDF:', err);
      showToast('Erro ao gerar contrato em PDF.', 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleRefresh = () => {
    setClients(clientDB.getAll());
    setBoats(boatDB.getAll());
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Relatório de Clientes e Embarcações', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Gerado em: ${dateStr}`, 14, 30);

    const tableColumn = ["Nome do Cliente", "Telefone", "Plano", "Situação Fin.", "Cadastro", "Embarcações (Cota)"];
    const tableRows: any[] = [];

    // Usar os clientes que estão sendo visualizados (filtrados e ordenados)
    filteredClients.forEach(c => {
      const nome = c.nome || "-";
      const telefone = c.telefone || "-";
      const plano = c.plano === 'completo' ? 'Completo' : 'Normal';
      const statusFinanceiro = c.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia';
      const statusCadastro = (c.status || 'ativo') === 'ativo' ? 'Ativo' : 'Inativo';
      
      const linkedBoatsList = c.embarcacoes && c.embarcacoes.length > 0
        ? c.embarcacoes
        : [{ embarcacaoId: c.embarcacaoId || '', cota: c.cota || '' }];
        
      const embarcacoesStr = linkedBoatsList.map(eb => {
        const boatName = boats.find(b => b.id === eb.embarcacaoId)?.nome || "Desconhecido";
        return `${boatName} (${eb.cota})`;
      }).join("\n"); // Quebra de linha no PDF

      tableRows.push([
        nome,
        telefone,
        plano,
        statusFinanceiro,
        statusCadastro,
        embarcacoesStr
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      alternateRowStyles: { fillColor: [248, 250, 252] } // slate-50
    });

    doc.save("clientes_embarcacoes.pdf");
    showToast('Exportação concluída com sucesso!');
  };

  const handleOpenQuickFinance = (client: Cliente) => {
    setQuickFinanceClient(client);
    setQuickStatus(client.statusFinanceiro || 'em_dia');
    setQuickNotes(client.observacoesFinanceiras || '');
  };

  const handleSaveQuickFinance = () => {
    if (!quickFinanceClient) return;
    try {
      clientDB.update(quickFinanceClient.id, {
        observacoesFinanceiras: quickNotes
      });
      showToast('Financeiro atualizado com sucesso!');
      setQuickFinanceClient(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar financeiro', 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Cliente) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleClientSavedFromModal = () => {
    handleRefresh();
  };

  const handleActivateClient = (client: Cliente) => {
    try {
      clientDB.activate(client.id);
      showToast(`Cadastro de "${client.nome}" reativado com sucesso!`);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao reativar cliente', 'error');
    }
  };

  const executeDeactivate = () => {
    if (!deactivateConfirmation) return;
    try {
      clientDB.deactivate(deactivateConfirmation.id);
      showToast(`Cadastro de "${deactivateConfirmation.name}" desativado com sucesso! Todo o histórico foi preservado.`);
      setDeactivateConfirmation(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao desativar cliente', 'error');
    }
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;
    try {
      clientDB.permanentDelete(deleteConfirmation.id);
      showToast(`Cliente "${deleteConfirmation.name}" excluído permanentemente.`);
      setDeleteConfirmation(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir cliente', 'error');
    }
  };

  const activeCount = useMemo(() => clients.filter(c => (c.status || 'ativo') === 'ativo').length, [clients]);
  const inactiveCount = useMemo(() => clients.filter(c => c.status === 'inativo').length, [clients]);

  const filteredClients = useMemo(() => clients
    .filter(c => {
      // 0. Filter by registration status (ativo/inativo)
      let matchesStatus = true;
      if (filterStatus !== 'all') {
        matchesStatus = (c.status || 'ativo') === filterStatus;
      }

      // 1. Text search
      const matchesSearch = !search ? true : (
        (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cota && c.cota.toLowerCase().includes(search.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.cpf && c.cpf.includes(search))
      );

      // 2. Filter by boat
      let matchesBoat = true;
      if (filterBoat !== 'all') {
        const clientBoatsList = c.embarcacoes && c.embarcacoes.length > 0
          ? c.embarcacoes.map(eb => eb.embarcacaoId)
          : [c.embarcacaoId || ''];
        matchesBoat = clientBoatsList.includes(filterBoat);
      }

      // 2.5 Filter by empresa (Universal filter with boat fallback)
      let matchesEmpresa = true;
      if (filterEmpresa !== 'all') {
        const clientEmpresasSet = new Set<string>(
          Array.isArray(c.empresas) && c.empresas.length > 0 ? c.empresas : []
        );

        // Check linked boats' empresas
        const clientBoatIds = c.embarcacoes && c.embarcacoes.length > 0
          ? c.embarcacoes.map(eb => eb.embarcacaoId)
          : [c.embarcacaoId || ''];

        clientBoatIds.forEach(bId => {
          const b = boats.find(boat => boat.id === bId);
          if (b && Array.isArray(b.empresas)) {
            b.empresas.forEach(emp => clientEmpresasSet.add(emp));
          }
        });

        // Fallback default if empty
        if (clientEmpresasSet.size === 0) {
          clientEmpresasSet.add('VALE');
        }

        matchesEmpresa = clientEmpresasSet.has(filterEmpresa);
      }

      // 3. Filter by finance
      let matchesFinance = true;
      if (filterFinance !== 'all') {
        matchesFinance = (c.statusFinanceiro || 'em_dia') === filterFinance;
      }

      // 4. Filter by boat type
      let matchesBoatType = true;
      if (filterBoatType !== 'all') {
        const clientBoatsList = c.embarcacoes && c.embarcacoes.length > 0
          ? c.embarcacoes.map(eb => eb.embarcacaoId)
          : [c.embarcacaoId || ''];

        matchesBoatType = clientBoatsList.some(boatId => {
          const b = boats.find(boat => boat.id === boatId);
          return b?.tipo === filterBoatType;
        });
      }

      // 5. Filter by plano
      let matchesPlano = true;
      if (filterPlano !== 'all') {
        const hasComp = (Array.isArray(c.embarcacoes) && c.embarcacoes.some(eb => eb?.plano === 'completo')) || c.plano === 'completo';
        matchesPlano = filterPlano === 'completo' ? hasComp : !hasComp;
      }

      return matchesStatus && matchesSearch && matchesBoat && matchesFinance && matchesBoatType && matchesPlano && matchesEmpresa;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.nome.localeCompare(b.nome);
      } else if (sortBy === 'name-desc') {
        return b.nome.localeCompare(a.nome);
      } else if (sortBy === 'date-desc') {
        return new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.dataCadastro).getTime() - new Date(b.dataCadastro).getTime();
      }
      return 0;
    }), [clients, boats, search, filterStatus, filterBoat, filterEmpresa, filterFinance, filterBoatType, filterPlano, sortBy]);

  const hasActiveFilters = filterStatus !== 'all' || filterBoat !== 'all' || filterEmpresa !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all' || search.trim() !== '' || filterPlano !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterBoat('all');
    setFilterEmpresa('all');
    setFilterFinance('all');
    setFilterBoatType('all');
    setFilterPlano('all');
    setSortBy('name-asc');
  };

  return (
    <div id="clients-section" className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border translate-y-0 transition-transform ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Clientes</h2>
          <p className="text-sm text-slate-500">Cadastre e associe os proprietários às cotas de suas embarcações correspondentes.</p>
        </div>
        <div className="flex gap-2">
          <button
            id="btn-birthdays"
            onClick={() => setIsBirthdayModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Ver Aniversariantes"
          >
            <Cake className="w-4 h-4 md:mr-2 text-pink-500" />
            <span className="hidden md:inline">Aniversariantes</span>
            {currentMonthBirthdaysCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-extrabold bg-pink-100 text-pink-700 rounded-full">
                {currentMonthBirthdaysCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Exportar Relatório (PDF)"
          >
            <FileText className="w-4 h-4 md:mr-2 text-rose-600" />
            <span className="hidden md:inline">Exportar PDF</span>
          </button>
          <button
            id="btn-new-client"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Filters/Search Section */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-clients"
              type="text"
              placeholder="Buscar cliente por nome, cota, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-1 focus:bg-white transition-all duration-200"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
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

            {/* Toggle Filters Button */}
            <button
              onClick={() => setIsFiltersVisible(!isFiltersVisible)}
              className={`inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                isFiltersVisible || filterBoat !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Filtros Avançados"
              aria-label="Alternar painel de filtros avançados"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtros { (filterBoat !== 'all' || filterEmpresa !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all' || filterPlano !== 'all') && '•' }
            </button>

            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <span className="absolute left-3 text-slate-400 pointer-events-none">
                <ArrowUpDown className="w-4 h-4" />
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 appearance-none cursor-pointer font-semibold text-slate-700 hover:bg-slate-50"
              >
                <option value="name-asc">Nome (A-Z)</option>
                <option value="name-desc">Nome (Z-A)</option>
                <option value="date-desc">Inscrição (Recente)</option>
                <option value="date-asc">Inscrição (Antigo)</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {isFiltersVisible && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Filter by Status */}
            <SearchableSelect
              id="select-filter-status"
              label="Status do Cadastro"
              icon={UserCheck}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Buscar status..."
              options={STATUS_OPTIONS}
            />

            {/* Filter by Empresa */}
            <SearchableSelect
              id="select-filter-empresa"
              label="Empresa Vinculada"
              icon={Building2}
              value={filterEmpresa}
              onChange={setFilterEmpresa}
              placeholder="Buscar empresa..."
              options={EMPRESA_OPTIONS}
            />

            {/* Filter by Boat */}
            <SearchableSelect
              id="select-filter-boat"
              label="Embarcação Vinculada"
              icon={Ship}
              value={filterBoat}
              onChange={setFilterBoat}
              placeholder="Buscar embarcação..."
              options={[
                { id: 'all', label: 'Todas as embarcações' },
                ...[...boats].sort((a, b) => a.nome.localeCompare(b.nome)).map(b => ({
                  id: b.id,
                  label: b.nome,
                  description: b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'
                }))
              ]}
            />

            {/* Filter by Boat Type */}
            <SearchableSelect
              id="select-filter-boattype"
              label="Tipo de Embarcação"
              icon={Anchor}
              value={filterBoatType}
              onChange={setFilterBoatType}
              placeholder="Buscar tipo..."
              options={[
                { id: 'all', label: 'Todos os tipos' },
                { id: 'lancha', label: 'Lancha' },
                { id: 'jet', label: 'Jet Ski' }
              ]}
            />

            {/* Filter by Financial Status */}
            <SearchableSelect
              id="select-filter-finance"
              label="Status Financeiro"
              icon={ShieldAlert}
              value={filterFinance}
              onChange={setFilterFinance}
              placeholder="Buscar status..."
              options={[
                { id: 'all', label: 'Todos os status' },
                { id: 'em_dia', label: 'Em Dia' },
                { id: 'inadimplente', label: 'Inadimplente' }
              ]}
            />

            {/* Filter by Plan */}
            <SearchableSelect
              id="select-filter-plano"
              label="Plano"
              icon={Zap}
              value={filterPlano}
              onChange={setFilterPlano}
              placeholder="Buscar plano..."
              options={[
                { id: 'all', label: 'Todos os Planos' },
                { id: 'normal', label: 'Normal' },
                { id: 'completo', label: 'Completo' }
              ]}
            />
          </div>
        )}

        {/* Results Counter and active filters summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="text-xs text-slate-500 font-medium">
            Exibindo <span className="text-slate-800 font-bold">{filteredClients.length}</span> de <span className="text-slate-800 font-bold">{clients.length}</span> proprietários ({activeCount} ativos{inactiveCount > 0 ? `, ${inactiveCount} inativos` : ''})
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Limpar Filtros e Busca
            </button>
          )}
        </div>
      </div>

      {/* Clients List / Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
          <User className="w-12 h-12 text-slate-400 mb-3 stroke-1" />
          <p className="text-sm font-medium text-slate-900">Nenhum cliente encontrado</p>
          <p className="text-xs text-slate-500 mt-1">Cadastre um cliente com sua respectiva embarcação e cota.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VISÃO EM TABELA / LISTA */
        <div>
          <div className="md:flex lg:hidden hidden items-center justify-end text-[11px] text-slate-400 font-medium mb-1.5 px-1">
            <span>Swipe para navegar na tabela ➔</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto touch-pan-x scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full min-w-[840px] text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Proprietário / Cliente</th>
                  <th className="py-3.5 px-4">Contato & Documentos</th>
                  <th className="py-3.5 px-4">Embarcação & Cotas</th>
                  <th className="py-3.5 px-4 text-center">Cadastro</th>
                  <th className="py-3.5 px-4 text-center">Status Financeiro</th>
                  <th className="py-3.5 px-4 text-center">Plano</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClients.map((client) => {
                  const isInactive = client.status === 'inativo';
                  const list = client.embarcacoes && client.embarcacoes.length > 0
                    ? client.embarcacoes
                    : [{ embarcacaoId: client.embarcacaoId || '', cota: client.cota || 'N/A' }];

                  return (
                    <tr
                      id={`client-row-${client.id}`}
                      key={client.id}
                      className={`transition-all ${
                        isInactive
                          ? 'bg-slate-50/80 opacity-75 hover:opacity-100 hover:bg-slate-100/80'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-sm shrink-0 ${
                            isInactive ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {client.nome.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-xs block truncate max-w-[200px] ${isInactive ? 'text-slate-600 line-through' : 'text-slate-900'}`} title={client.nome}>
                                {client.nome}
                              </span>
                              {isInactive && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {client.cpf ? `CPF: ${client.cpf}` : `Cadastrado: ${new Date(client.dataCadastro).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {client.telefone && (
                            <div className="flex items-center text-[11px] text-slate-700 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                              <span>{client.telefone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center text-[10px] text-slate-500 truncate max-w-[180px]" title={client.email}>
                              <Mail className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {!client.telefone && !client.email && (
                            <span className="text-[10px] text-slate-400 italic">Sem contato informado</span>
                          )}
                        </div>
                      </td>

                      {/* Embarcações & Cotas */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 max-w-[280px]">
                          {list.map((item, idx) => {
                            const b = boats.find(boat => boat.id === item.embarcacaoId);
                            return (
                              <div key={idx} className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-slate-850">
                                  {b ? b.nome : 'Sem Barco'}
                                </span>
                                {b && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ({b.tipo === 'jet' ? 'Jet' : 'Lancha'})
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded font-medium ml-auto">
                                  Cota {item.cota || 'N/A'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Status do Cadastro (Ativo / Inativo) */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isInactive
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          {isInactive ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>

                      {/* Status Financeiro */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${client.statusFinanceiro === 'inadimplente' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span className={client.statusFinanceiro === 'inadimplente' ? 'text-rose-700 font-semibold' : 'text-slate-700 font-medium'}>
                            {client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                          </span>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const ebs = Array.isArray(client.embarcacoes) && client.embarcacoes.length > 0
                            ? client.embarcacoes
                            : (client.embarcacaoId ? [{ embarcacaoId: client.embarcacaoId, cota: client.cota, plano: client.plano || 'normal' }] : []);
                          const comp = ebs.filter(e => e?.plano === 'completo');
                          const norm = ebs.filter(e => (e?.plano || 'normal') === 'normal');
                          if (comp.length > 0 && norm.length > 0) {
                            return (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                {comp.length}x Completo
                              </span>
                            );
                          }
                          const isComp = comp.length > 0 || client.plano === 'completo';
                          return (
                            <span className={`text-xs font-semibold ${isComp ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>
                              {isComp ? 'Completo' : 'Normal'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setViewProfileId(client.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Ver Perfil e Documentos"
                            aria-label="Ver perfil e documentos do cliente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenContractModal(client)}
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                            title="Gerar Contrato (PDF)"
                            aria-label="Gerar contrato do cliente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(client)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Editar"
                            aria-label="Editar dados do cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isInactive ? (
                            <button
                              id={`activate-client-${client.id}`}
                              onClick={() => handleActivateClient(client)}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                              title="Reativar Cadastro"
                              aria-label="Reativar cadastro do cliente"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              id={`deactivate-client-${client.id}`}
                              onClick={() => setDeactivateConfirmation({ id: client.id, name: client.nome })}
                              className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
                              title="Desativar Cadastro (Preserva Histórico)"
                              aria-label="Desativar cadastro do cliente"
                            >
                              <PowerOff className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            id={`delete-client-${client.id}`}
                            onClick={() => setDeleteConfirmation({ id: client.id, name: client.nome })}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Excluir Permanentemente"
                            aria-label="Excluir cliente permanentemente"
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
      </div>
      ) : (
        /* VISÃO EM BLOCOS / CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const isInactive = client.status === 'inativo';
            const clientBoat = boats.find(b => b.id === client.embarcacaoId);

            return (
              <div
                id={`client-card-${client.id}`}
                key={client.id}
                className={`border rounded-xl shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between ${
                  isInactive
                    ? 'bg-slate-50/70 border-slate-300 opacity-80 hover:opacity-100'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-md ${
                        isInactive ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {client.nome.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`font-semibold tracking-tight leading-snug truncate ${isInactive ? 'text-slate-600 line-through' : 'text-slate-950'}`} title={client.nome}>
                            {client.nome}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isInactive
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isInactive ? 'Inativo' : 'Ativo'}
                          </span>
                          {client.embarcacoes && client.embarcacoes.length > 1 ? (
                            <span className="text-[10px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-full font-sans font-semibold">
                              {client.embarcacoes.length} Veículos
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium">
                              COTA: {client.cota || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        id={`view-profile-${client.id}`}
                        onClick={() => setViewProfileId(client.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Ver Perfil e Documentos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        id={`contract-client-${client.id}`}
                        onClick={() => handleOpenContractModal(client)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                        title="Gerar Contrato (PDF)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        id={`edit-client-${client.id}`}
                        onClick={() => handleOpenEditModal(client)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isInactive ? (
                        <button
                          id={`activate-client-${client.id}`}
                          onClick={() => handleActivateClient(client)}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                          title="Reativar Cadastro"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          id={`deactivate-client-${client.id}`}
                          onClick={() => setDeactivateConfirmation({ id: client.id, name: client.nome })}
                          className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
                          title="Desativar Cadastro (Preserva Histórico)"
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        id={`delete-client-grid-${client.id}`}
                        onClick={() => setDeleteConfirmation({ id: client.id, name: client.nome })}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quota Details */}
                  <div className="mt-4 p-3 bg-slate-50/60 border border-slate-100 rounded-lg space-y-3.5 text-xs">
                    {(() => {
                      const list = client.embarcacoes && client.embarcacoes.length > 0
                        ? client.embarcacoes
                        : [{ embarcacaoId: client.embarcacaoId || '', cota: client.cota || 'N/A' }];

                      return (
                        <div className="space-y-3">
                          {list.map((item, index) => {
                            const b = boats.find(boat => boat.id === item.embarcacaoId);
                            return (
                              <div key={index} className={`${index > 0 ? 'pt-3 border-t border-slate-100' : ''} space-y-1.5`}>
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  <span>Veículo #{index + 1}</span>
                                  {b && (
                                    <span className={`text-[10px] text-slate-500 font-medium`}>
                                      {b.tipo === 'jet' ? 'Jet' : 'Lancha'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 flex items-center"><Anchor className="w-3.5 h-3.5 mr-1 text-slate-400" /> Identificação:</span>
                                  <span className="font-semibold text-slate-850 font-mono">
                                    {b ? b.nome : 'Não definida'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">

                                  <span className="text-slate-700 font-medium truncate shrink-1 max-w-[170px]" title={b?.nome}>

                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 flex items-center"><Percent className="w-3.5 h-3.5 mr-1 text-slate-400" /> Cota de Direito:</span>
                                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                                    {item.cota || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Secondary Profile info */}
                  <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{client.telefone || 'Apenas Cota & Nome'}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center space-x-2 animate-in fade-in">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.cpf && (
                      <div className="flex items-center space-x-2 animate-in fade-in">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{client.cpf}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Inscrição: {new Date(client.dataCadastro).toLocaleDateString()}</span>
                    </div>

                    {/* Endereço visual block */}
                    {(client.cep || client.logradouro || client.cidade) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex items-center text-slate-400 gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço</span>
                        </div>
                        <div className="text-[11px] text-slate-600 pl-5 space-y-0.5 leading-relaxed">
                          {client.logradouro && (
                            <p className="font-medium text-slate-800">
                              {client.logradouro}{client.numeroEnd ? `, ${client.numeroEnd}` : ''}{client.complemento ? ` (${client.complemento})` : ''}
                            </p>
                          )}
                          {(client.bairro || client.cidade) && (
                            <p className="text-slate-600">
                              {client.bairro ? `${client.bairro}, ` : ''}{client.cidade}{client.estado ? ` - ${client.estado}` : ''}
                            </p>
                          )}
                          {client.cep && (
                            <p className="font-mono text-slate-400 text-[10px]">CEP: {client.cep}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Financeiro visual block */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${client.statusFinanceiro === 'inadimplente' ? 'text-rose-500' : 'text-emerald-500'}`} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financeiro</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            client.statusFinanceiro === 'inadimplente' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                          title="Status automático com base nos lançamentos aprovados"
                        >
                            {client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                        </span>
                      </div>
                      {client.observacoesFinanceiras && (
                        <div className="text-[11px] text-slate-600 pl-5 pt-0.5 italic">
                           "{client.observacoesFinanceiras}"
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plano</span>
                        </div>
                        {(() => {
                          const hasComp = (Array.isArray(client.embarcacoes) && client.embarcacoes.some(e => e?.plano === 'completo')) || client.plano === 'completo';
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                hasComp ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {hasComp ? 'Plano Completo' : 'Normal'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Create/Edit customer */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleClientSavedFromModal}
        editingClient={editingClient}
        boats={boats}
      />

      {/* State-Based Custom Confirmation Modal (Deactivation with history preservation) */}
      {deactivateConfirmation && (
        <div id="deactivate-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
                <PowerOff className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900">Desativar Cadastro</h3>
              <p className="mt-2 text-sm text-center text-slate-600">
                Tem certeza que deseja desativar o cadastro de <span className="font-bold text-slate-900">"{deactivateConfirmation.name}"</span>?
              </p>
              
              <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Histórico e Dados 100% Preservados</span>
                </div>
                <p className="text-[11px] text-indigo-800/90 leading-relaxed">
                  Nenhuma reserva passada, lançamento financeiro ou documento será apagado. O cliente apenas ficará inativo para novas reservas e não poderá fazer login no portal. Você pode reativá-lo a qualquer momento.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
              <button
                id="cancel-deactivate"
                onClick={() => setDeactivateConfirmation(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors outline-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-deactivate"
                onClick={executeDeactivate}
                className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors outline-none cursor-pointer shadow-xs"
              >
                Sim, Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900">Excluir Permanentemente</h3>
              <p className="mt-2 text-sm text-center text-slate-600">
                Tem certeza que deseja excluir permanentemente o cliente <span className="font-bold text-slate-900">"{deleteConfirmation.name}"</span>?
              </p>

              <div className="mt-4 p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Ação Irreversível</span>
                </div>
                <p className="text-[11px] text-rose-800/90 leading-relaxed">
                  O cadastro do cliente será removido permanentemente do sistema. Essa ação <strong>não pode ser desfeita</strong>. Se deseja apenas ocultar o cliente, use a opção "Desativar" ao invés de excluir.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
              <button
                id="cancel-delete"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors outline-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete"
                onClick={executeDelete}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors outline-none cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Finance Modal */}
      {quickFinanceClient && (
        <div id="quick-finance-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex bg-slate-50 border-b border-slate-100 items-center justify-between px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Atualizar Financeiro</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{quickFinanceClient.nome}</p>
              </div>
              <button onClick={() => setQuickFinanceClient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status de Pagamento</label>
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value as 'em_dia' | 'inadimplente')}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 font-semibold ${
                    quickStatus === 'inadimplente' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <option value="em_dia">Em Dia</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Observações Financeiras</label>
                <textarea
                  placeholder="Detalhes ou pendências..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white resize-none"
                ></textarea>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
              <button
                onClick={() => setQuickFinanceClient(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuickFinance}
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Generation Modal */}
      {contractModalClient && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Gerar Contrato Oficial (PDF)</h3>
              </div>
              <button
                onClick={() => setContractModalClient(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente Selecionado</span>
                <p className="font-bold text-slate-900 text-sm">{contractModalClient.nome}</p>
                <p className="text-slate-500 text-xs">CPF: {contractModalClient.cpf || 'Não informado'} | Tel: {contractModalClient.telefone || 'Não informado'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de Contrato</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as 'aquisicao' | 'adm')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 font-semibold"
                >
                  <option value="aquisicao">1. Contrato de Compra e Venda / Aquisição de Cota</option>
                  <option value="adm">2. Contrato de Gestão e Administração de Embarcação</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Embarcação Vinculada</label>
                <select
                  value={selectedBoatForContract}
                  onChange={(e) => setSelectedBoatForContract(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 font-semibold"
                >
                  {boats.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome} ({b.modelo}) - {b.tipo === 'jet' ? 'Jet' : 'Lancha'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
              <button
                onClick={() => setContractModalClient(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateContractPDF}
                disabled={isGeneratingContract}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isGeneratingContract ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Gerar e Baixar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProfileId && (() => {
        const selectedClient = clients.find(c => c.id === viewProfileId);
        if (!selectedClient) return null;
        return (
          <ClientProfileModal
            client={selectedClient}
            boats={boats}
            onClose={() => setViewProfileId(null)}
          />
        );
      })()}

      <ClientBirthdayModal
        isOpen={isBirthdayModalOpen}
        onClose={() => setIsBirthdayModalOpen(false)}
        clients={clients}
        boats={boats}
        onViewProfile={(clientId) => {
          setIsBirthdayModalOpen(false);
          setViewProfileId(clientId);
        }}
        onEditClient={(client) => {
          setIsBirthdayModalOpen(false);
          handleOpenEditModal(client);
        }}
      />
    </div>
  );
}
