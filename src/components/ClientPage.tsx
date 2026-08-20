import React, { useState, useMemo } from 'react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';
import { User, Plus, Search, Ship, Trash2, Edit2, Phone, Mail, FileText, Calendar, X, Check, ShieldAlert, Anchor, Percent, MapPin, Loader2, AlertTriangle, CheckCircle2, SlidersHorizontal, ArrowUpDown, RotateCcw, Eye, Database, Save, Download, List, LayoutGrid, ChevronDown, Zap, Building2 } from 'lucide-react';
import ClientProfileModal from './ClientProfileModal';
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [clientBoats, setClientBoats] = useState<Array<{ embarcacaoId: string; cota: string }>>([{ embarcacaoId: '', cota: '' }]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoEmissor, setOrgaoEmissor] = useState('');
  const [numeroHabilitacao, setNumeroHabilitacao] = useState('');
  const [validadeHabilitacao, setValidadeHabilitacao] = useState('');
  const [orgaoEmissorHabilitacao, setOrgaoEmissorHabilitacao] = useState('');
  const [categoriaHabilitacao, setCategoriaHabilitacao] = useState('');
  
  // Address States
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numeroEnd, setNumeroEnd] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [statusFinanceiro, setStatusFinanceiro] = useState<'em_dia' | 'inadimplente'>('em_dia');
  const [observacoesFinanceiras, setObservacoesFinanceiras] = useState('');
  const [plano, setPlano] = useState<'normal' | 'completo'>('normal');
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
  
  // Quick Finance Update State
  const [quickFinanceClient, setQuickFinanceClient] = useState<Cliente | null>(null);
  const [quickStatus, setQuickStatus] = useState<'em_dia' | 'inadimplente'>('em_dia');
  const [quickNotes, setQuickNotes] = useState('');

  // Custom Confirm State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string; isRelated: boolean } | null>(null);

  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

    const tableColumn = ["Nome do Cliente", "Telefone", "Plano", "Status", "Embarcações (Cota)"];
    const tableRows: any[] = [];

    // Usar os clientes que estão sendo visualizados (filtrados e ordenados)
    filteredClients.forEach(c => {
      const nome = c.nome || "-";
      const telefone = c.telefone || "-";
      const plano = c.plano === 'completo' ? 'Completo' : 'Normal';
      const statusFinanceiro = c.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia';
      
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
    setEditingId(null);
    setName('');
    // Default to first boat if exists
    setClientBoats([{ embarcacaoId: boats[0]?.id || '', cota: 'C1' }]);
    setEmail('');
    setPhone('');
    setCpf('');
    setDataNascimento('');
    setRg('');
    setOrgaoEmissor('');
    setNumeroHabilitacao('');
    setValidadeHabilitacao('');
    setOrgaoEmissorHabilitacao('Capitania Fluvial de Juazeiro');
    setCategoriaHabilitacao('');
    
    // Reset address states
    setCep('');
    setLogradouro('');
    setNumeroEnd('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setStatusFinanceiro('em_dia');
    setObservacoesFinanceiras('');
    setPlano('normal');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Cliente) => {
    setEditingId(client.id);
    setName(client.nome);
    if (client.embarcacoes && client.embarcacoes.length > 0) {
      setClientBoats(client.embarcacoes.map(eb => ({
        embarcacaoId: eb.embarcacaoId || '',
        cota: eb.cota || ''
      })));
    } else {
      setClientBoats([{ embarcacaoId: client.embarcacaoId || '', cota: client.cota || '' }]);
    }
    setEmail(client.email || '');
    setPhone(client.telefone || '');
    setCpf(client.cpf || '');
    setDataNascimento(client.dataNascimento || '');
    setRg(client.rg || '');
    setOrgaoEmissor(client.orgaoEmissor || '');
    setNumeroHabilitacao(client.numeroHabilitacao || client.cnh_cha || '');
    setValidadeHabilitacao(client.validadeHabilitacao || '');
    setOrgaoEmissorHabilitacao(client.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro');
    setCategoriaHabilitacao(client.categoriaHabilitacao || '');
    
    // Set address states
    setCep(client.cep || '');
    setLogradouro(client.logradouro || '');
    setNumeroEnd(client.numeroEnd || '');
    setComplemento(client.complemento || '');
    setBairro(client.bairro || '');
    setCidade(client.cidade || '');
    setEstado(client.estado || '');
    setStatusFinanceiro(client.statusFinanceiro || 'em_dia');
    setObservacoesFinanceiras(client.observacoesFinanceiras || '');
    setPlano(client.plano || 'normal');
    setIsModalOpen(true);
  };

  const fetchCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        showToast('CEP não encontrado.', 'error');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        showToast('Endereço preenchido automaticamente!');
      }
    } catch (err) {
      showToast('Erro ao consultar o CEP.', 'error');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 8) raw = raw.substring(0, 8);
    
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.substring(0, 5)}-${raw.substring(5)}`;
    }
    setCep(formatted);

    if (raw.length === 8) {
      fetchCep(raw);
    }
  };

  const handleCepBlur = () => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length === 8) {
      fetchCep(raw);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('O nome é obrigatório.', 'error');
      return;
    }
    if (clientBoats.length === 0) {
      showToast('Por favor, adicione pelo menos um veículo vinculado.', 'error');
      return;
    }
    if (clientBoats.some(cb => !cb.embarcacaoId)) {
      showToast('Todas as embarcações selecionadas devem ser válidas.', 'error');
      return;
    }
    if (clientBoats.some(cb => !cb.cota.trim())) {
      showToast('O número da cota é obrigatório para todas as embarcações.', 'error');
      return;
    }

    try {
      const primaryBoat = clientBoats[0];
      if (editingId) {
        clientDB.update(editingId, {
          nome: name.toUpperCase(),
          embarcacaoId: primaryBoat.embarcacaoId,
          cota: primaryBoat.cota.toUpperCase(),
          embarcacoes: clientBoats.map(cb => ({
            embarcacaoId: cb.embarcacaoId,
            cota: cb.cota.toUpperCase()
          })),
          email,
          telefone: phone,
          cpf,
          dataNascimento,
          rg,
          orgaoEmissor,
          numeroHabilitacao,
          cnh_cha: numeroHabilitacao,
          validadeHabilitacao,
          orgaoEmissorHabilitacao: orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro',
          categoriaHabilitacao,
          cep,
          logradouro,
          numeroEnd,
          complemento,
          bairro,
          cidade,
          estado,
          observacoesFinanceiras,
          plano
        });
        showToast('Cliente atualizado com sucesso!');
      } else {
        clientDB.create({
          nome: name.toUpperCase(),
          embarcacaoId: primaryBoat.embarcacaoId,
          cota: primaryBoat.cota.toUpperCase(),
          embarcacoes: clientBoats.map(cb => ({
            embarcacaoId: cb.embarcacaoId,
            cota: cb.cota.toUpperCase()
          })),
          email,
          telefone: phone,
          cpf,
          dataNascimento,
          rg,
          orgaoEmissor,
          numeroHabilitacao,
          cnh_cha: numeroHabilitacao,
          validadeHabilitacao,
          orgaoEmissorHabilitacao: orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro',
          categoriaHabilitacao,
          cep,
          logradouro,
          numeroEnd,
          complemento,
          bairro,
          cidade,
          estado,
          observacoesFinanceiras,
          plano
        });
        showToast('Cliente cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cliente', 'error');
    }
  };

  const initiateDelete = (id: string, clientName: string) => {
    const client = clients.find(c => c.id === id);
    const linkedBoatsList = client?.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map(eb => eb.embarcacaoId)
      : [client?.embarcacaoId || ''];

    const isRelated = boats.some(b => b.donos.includes(id) || linkedBoatsList.includes(b.id));
    setDeleteConfirmation({ id, name: clientName, isRelated });
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;
    try {
      clientDB.delete(deleteConfirmation.id);
      showToast('Cliente removido com sucesso!');
      setDeleteConfirmation(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover cliente', 'error');
    }
  };

  const filteredClients = useMemo(() => clients
    .filter(c => {
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
        matchesPlano = (c.plano || 'normal') === filterPlano;
      }

      return matchesSearch && matchesBoat && matchesFinance && matchesBoatType && matchesPlano && matchesEmpresa;
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
    }), [clients, boats, search, filterBoat, filterEmpresa, filterFinance, filterBoatType, filterPlano, sortBy]);

  const hasActiveFilters = filterBoat !== 'all' || filterEmpresa !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all' || search.trim() !== '' || filterPlano !== 'all';

  const handleClearFilters = () => {
    setSearch('');
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
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            title="Exportar Relatório (PDF)"
          >
            <FileText className="w-4 h-4 md:mr-2 text-rose-600" />
            <span className="hidden md:inline">Exportar PDF</span>
          </button>
          <button
            id="btn-new-client"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
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
            Exibindo <span className="text-slate-800 font-bold">{filteredClients.length}</span> de <span className="text-slate-800 font-bold">{clients.length}</span> proprietários
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
                  <th className="py-3.5 px-4 text-center">Status Financeiro</th>
                  <th className="py-3.5 px-4 text-center">Plano</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClients.map((client) => {
                  const list = client.embarcacoes && client.embarcacoes.length > 0
                    ? client.embarcacoes
                    : [{ embarcacaoId: client.embarcacaoId || '', cota: client.cota || 'N/A' }];

                  return (
                    <tr id={`client-row-${client.id}`} key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-sm shrink-0">
                            {client.nome.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-bold text-slate-900 text-xs block truncate max-w-[220px]" title={client.nome}>
                              {client.nome}
                            </span>
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
                        <span className={`text-xs font-semibold ${client.plano === 'completo' ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>
                          {client.plano === 'completo' ? 'Completo' : 'Normal'}
                        </span>
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
                          <button
                            onClick={() => initiateDelete(client.id, client.nome)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover"
                            aria-label="Excluir cliente"
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
            const clientBoat = boats.find(b => b.id === client.embarcacaoId);

            return (
              <div id={`client-card-${client.id}`} key={client.id} className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md hover:border-slate-355 transition-all duration-200 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-md">
                        {client.nome.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-semibold text-slate-950 tracking-tight leading-snug truncate" title={client.nome}>
                          {client.nome}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
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
                      <button
                        id={`delete-client-${client.id}`}
                        onClick={() => initiateDelete(client.id, client.nome)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Remover"
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
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            client.plano === 'completo' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                            {client.plano === 'completo' ? 'Plano Completo' : 'Normal'}
                        </span>
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
      {isModalOpen && (
        <div id="client-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-6xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
              </div>
              <button
                id="close-client-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto subtle-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUNA 1: IDENTIFICAÇÃO E CONTATOS (4 cols) */}
                <div className="lg:col-span-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Identificação & Contatos
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Nome Completo *</label>
                    <input
                      id="input-client-name"
                      type="text"
                      tabIndex={1}
                      required
                      placeholder="Nome do Cliente"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-medium"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / Celular (WhatsApp)</label>
                    <input
                      id="input-client-phone"
                      type="text"
                      tabIndex={2}
                      placeholder="Ex: (11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      id="input-client-email"
                      type="email"
                      tabIndex={3}
                      placeholder="Ex: joao@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CPF</label>
                      <input
                        id="input-client-cpf"
                        type="text"
                        tabIndex={4}
                        placeholder="Ex: 000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Data de Nascimento</label>
                      <input
                        id="input-client-data-nascimento"
                        type="date"
                        tabIndex={5}
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* COLUNA 2: EMBARCAÇÕES & EMPRESAS VINCULADAS (4 cols) */}
                <div className="lg:col-span-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Anchor className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Veículos & Empresas
                  </h4>

                  {/* Seção das Embarcações e Cotas (Suporta Múltiplos Veículos) */}
                  <div className="border border-slate-200/80 p-3.5 rounded-xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        Veículos Vinculados / Cotas *
                      </label>
                      <button
                        type="button"
                        tabIndex={5}
                        onClick={() => setClientBoats([...clientBoats, { embarcacaoId: boats[0]?.id || '', cota: 'C1' }])}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Adicionar Veículo
                      </button>
                    </div>

                    <div className="space-y-3 max-h-56 overflow-y-auto subtle-scrollbar pr-1">
                      {clientBoats.map((cb, idx) => (
                        <div key={idx} className="flex items-start bg-white border border-slate-200 p-3 rounded-lg relative space-x-2.5 shadow-xs">
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Embarcação #{idx + 1}</label>
                              <select
                                required
                                tabIndex={6 + (idx * 2)}
                                value={cb.embarcacaoId}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  newList[idx].embarcacaoId = e.target.value;
                                  setClientBoats(newList);
                                }}
                                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              >
                                <option value="">Selecione...</option>
                                {[...boats].sort((a, b) => a.nome.localeCompare(b.nome)).map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cota #{idx + 1}</label>
                              <input
                                type="text"
                                required
                                tabIndex={7 + (idx * 2)}
                                placeholder="Ex: C1, C3"
                                value={cb.cota}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  newList[idx].cota = e.target.value;
                                  setClientBoats(newList);
                                }}
                                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                              />
                            </div>
                          </div>

                          {clientBoats.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientBoats(clientBoats.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-rose-700 hover:text-rose-800 hover:bg-rose-100 hover:bg-rose-50 rounded transition-colors self-center mt-3 cursor-pointer"
                              title="Remover veículo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Empresas Vinculadas */}
                  <div className="border border-slate-200/80 p-3.5 rounded-xl bg-slate-50/50 space-y-2">
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
                      <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Empresas Vinculadas *
                    </label>
                    <p className="text-[11px] text-slate-500">Selecione onde este cliente pode ser gerenciado:</p>
                    <div className="space-y-2 pt-1">
                      {[
                        { id: 'VALE', label: 'Vale Administradora (Gestão Principal)' },
                        { id: 'MARINA', label: 'Marina Club (Controle de Garagem & Vagas)' },
                        { id: 'MEXICANO', label: 'Mexicano Lanchas' }
                      ].map((emp, empIdx) => (
                        <label key={emp.id} className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            tabIndex={10 + empIdx}
                            checked={empresas.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEmpresas([...empresas, emp.id]);
                              } else {
                                if (empresas.length === 1) {
                                  showToast('O cliente precisa estar vinculado a pelo menos 1 empresa.', 'error');
                                  return;
                                }
                                setEmpresas(empresas.filter(x => x !== emp.id));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="font-medium">{emp.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUNA 3: CAMPOS AVANÇADOS (ACORDEÃO RECOLHÍVEL) (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Zap className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Informações Complementares
                  </h4>

                  {/* Bloco Sanfonado de Campos Avançados */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-100/70 hover:bg-slate-100 transition-colors cursor-pointer"
                      tabIndex={13}
                    >
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        Campos Avançados (Doc., Endereço & Fin.)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(rg || numeroHabilitacao || cep || logradouro || bairro || cidade || observacoesFinanceiras || plano === 'completo') && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ativo</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isAdvancedOpen && (
                      <div className="p-3.5 space-y-4 bg-white border-t border-slate-200 animate-in fade-in duration-150 max-h-[55vh] overflow-y-auto subtle-scrollbar">
                        {/* Documentação & Habilitação Náutica */}
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                            Documentação & Habilitação Náutica
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">RG</label>
                              <input
                                type="text"
                                tabIndex={14}
                                placeholder="Ex: 12.345.678-9"
                                value={rg}
                                onChange={(e) => setRg(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Órgão Emissor</label>
                              <input
                                type="text"
                                tabIndex={15}
                                placeholder="Ex: SSP/SP"
                                value={orgaoEmissor}
                                onChange={(e) => setOrgaoEmissor(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Nº Habilitação (Arrais/CHA)</label>
                              <input
                                type="text"
                                tabIndex={16}
                                placeholder="Ex: 381M2021005"
                                value={numeroHabilitacao}
                                onChange={(e) => setNumeroHabilitacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Categoria CHA</label>
                              <select
                                tabIndex={17}
                                value={categoriaHabilitacao}
                                onChange={(e) => setCategoriaHabilitacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              >
                                <option value="">Selecione...</option>
                                <option value="Arrais-Amador">Arrais-Amador</option>
                                <option value="Motonauta">Motonauta</option>
                                <option value="Arrais e Motonauta">Arrais e Motonauta</option>
                                <option value="Mestre-Amador">Mestre-Amador</option>
                                <option value="Capitão-Amador">Capitão-Amador</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Validade CHA</label>
                              <input
                                type="date"
                                tabIndex={18}
                                value={validadeHabilitacao}
                                onChange={(e) => setValidadeHabilitacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Órgão CHA</label>
                              <input
                                type="text"
                                tabIndex={19}
                                placeholder="Ex: Capitania Fluvial"
                                value={orgaoEmissorHabilitacao}
                                onChange={(e) => setOrgaoEmissorHabilitacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Endereço Residencial */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pb-1">
                            Endereço Residencial
                          </p>
                          
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="col-span-2 relative">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                <span>CEP</span>
                                {isFetchingCep && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                              </label>
                              <input
                                id="input-client-cep"
                                type="text"
                                tabIndex={20}
                                placeholder="Ex: 01001-000"
                                value={cep}
                                onChange={handleCepChange}
                                onBlur={handleCepBlur}
                                maxLength={9}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <button
                                type="button"
                                disabled={isFetchingCep || cep.replace(/\D/g, '').length !== 8}
                                onClick={() => fetchCep(cep.replace(/\D/g, ''))}
                                className="w-full py-1.5 text-xs font-bold text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg border border-indigo-100 transition-all h-[34px] cursor-pointer"
                              >
                                Buscar
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                            <input
                              id="input-client-logradouro"
                              type="text"
                              tabIndex={21}
                              placeholder="Ex: Avenida Paulista"
                              value={logradouro}
                              onChange={(e) => setLogradouro(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="col-span-1">
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Número</label>
                              <input
                                id="input-client-numero-end"
                                type="text"
                                tabIndex={22}
                                placeholder="Ex: 1000"
                                value={numeroEnd}
                                onChange={(e) => setNumeroEnd(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Complemento</label>
                              <input
                                id="input-client-complemento"
                                type="text"
                                tabIndex={23}
                                placeholder="Ex: Apto 12"
                                value={complemento}
                                onChange={(e) => setComplemento(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">Bairro</label>
                            <input
                              id="input-client-bairro"
                              type="text"
                              tabIndex={24}
                              placeholder="Ex: Centro / Jardins"
                              value={bairro}
                              onChange={(e) => setBairro(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="col-span-2">
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">Cidade</label>
                              <input
                                id="input-client-cidade"
                                type="text"
                                tabIndex={25}
                                placeholder="Ex: São Paulo"
                                value={cidade}
                                onChange={(e) => setCidade(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">UF</label>
                              <input
                                id="input-client-estado"
                                type="text"
                                tabIndex={26}
                                placeholder="Ex: SP"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                maxLength={2}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white uppercase"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Situação Financeira & Plano */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pb-1">
                            Situação Financeira & Plano
                          </p>
                          
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Observações Financeiras</label>
                            <textarea
                              tabIndex={27}
                              placeholder="Taxa de janeiro pendente, faróis para pagar..."
                              value={observacoesFinanceiras}
                              onChange={(e) => setObservacoesFinanceiras(e.target.value)}
                              rows={2}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white resize-none"
                            ></textarea>
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Plano de Agendamento</label>
                            <select
                              tabIndex={28}
                              value={plano}
                              onChange={(e) => setPlano(e.target.value as 'normal' | 'completo')}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-medium"
                            >
                              <option value="normal">Normal (Sem acesso a seg/ter)</option>
                              <option value="completo">Plano Completo (Acesso total)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  id="cancel-save-client"
                  type="button"
                  tabIndex={28}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="submit-save-client"
                  type="submit"
                  tabIndex={29}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* State-Based Custom Confirmation Modal (Bypasses Window Confirm) */}
      {deleteConfirmation && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-rose-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-center text-slate-900">Remover Cliente</h3>
              <p className="mt-2 text-sm text-center text-slate-500">
                Tem certeza que deseja excluir permanentemente o cadastro de <span className="font-semibold text-slate-800">"{deleteConfirmation.name}"</span>?
              </p>
              
              {deleteConfirmation.isRelated && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[11px] text-amber-800 font-medium">
                    ⚠️ Atenção: Este proprietário está vinculado de forma direta ou como coproprietário a embarcações. Ele será removido das composições de donos e toda e qualquer reserva correspondente será automaticamente cancelada!
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex gap-3">
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
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors outline-none cursor-pointer"
              >
                Sim, Remover
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
    </div>
  );
}
