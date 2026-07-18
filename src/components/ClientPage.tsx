import React, { useState } from 'react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';
import { User, Plus, Search, Trash2, Edit2, Phone, Mail, FileText, Calendar, X, Check, ShieldAlert, Anchor, Percent, MapPin, Loader2, AlertTriangle, CheckCircle2, SlidersHorizontal, ArrowUpDown, RotateCcw, Eye, Database, Save, Download } from 'lucide-react';
import ClientProfileModal from './ClientProfileModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ClientPage() {
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [search, setSearch] = useState('');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [clientBoats, setClientBoats] = useState<Array<{ embarcacaoId: string; cota: string }>>([{ embarcacaoId: '', cota: '' }]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  
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
  
  // Quick Finance Update State
  const [quickFinanceClient, setQuickFinanceClient] = useState<Cliente | null>(null);
  const [quickStatus, setQuickStatus] = useState<'em_dia' | 'inadimplente'>('em_dia');
  const [quickNotes, setQuickNotes] = useState('');

  // Custom Confirm State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string; isRelated: boolean } | null>(null);

  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [filterBoat, setFilterBoat] = useState<string>('all');
  const [filterFinance, setFilterFinance] = useState<string>('all');
  const [filterBoatType, setFilterBoatType] = useState<string>('all');
  const [filterPlano, setFilterPlano] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  const filteredClients = clients
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

      return matchesSearch && matchesBoat && matchesFinance && matchesBoatType && matchesPlano;
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
    });

  const hasActiveFilters = filterBoat !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all' || search.trim() !== '' || filterPlano !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setFilterBoat('all');
    setFilterFinance('all');
    setFilterBoatType('all');
    setFilterPlano('all');
    setSortBy('name-asc');
  };

  return (
    <div id="clients-section" className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border translate-y-0 transition-transform ${
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
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {/* Toggle Filters Button */}
            <button
              onClick={() => setIsFiltersVisible(!isFiltersVisible)}
              className={`inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                isFiltersVisible || filterBoat !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Filtros Avançados"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtros { (filterBoat !== 'all' || filterFinance !== 'all' || filterBoatType !== 'all' || filterPlano !== 'all') && '•' }
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
              <div className="absolute right-2.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-500"></div>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {isFiltersVisible && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Filter by Boat */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Embarcação Vinculada</label>
              <select
                value={filterBoat}
                onChange={(e) => setFilterBoat(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">Todas as embarcações</option>
                {[...boats].sort((a, b) => a.nome.localeCompare(b.nome)).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nome} ({b.tipo === 'jet' ? 'Jet' : 'Lancha'})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Boat Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Embarcação</label>
              <select
                value={filterBoatType}
                onChange={(e) => setFilterBoatType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">Todos os tipos</option>
                <option value="lancha">Lancha</option>
                <option value="jet">Jet</option>
              </select>
            </div>

            {/* Filter by Financial Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Financeiro</label>
              <select
                value={filterFinance}
                onChange={(e) => setFilterFinance(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">Todos os status</option>
                <option value="em_dia">Em Dia</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            </div>

            {/* Filter by Plan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Plano</label>
              <select
                value={filterPlano}
                onChange={(e) => setFilterPlano(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">Todos os Planos</option>
                <option value="normal">Normal</option>
                <option value="completo">Completo</option>
              </select>
            </div>
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
              className="inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
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
      ) : (
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
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
                                    <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase rounded-md ${
                                      b.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                    }`}>
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
                                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-medium text-slate-900">
                {editingId ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                id="close-client-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto subtle-scrollbar flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Nome Completo *</label>
                <input
                  id="input-client-name"
                  type="text"
                  required
                  placeholder="Nome do Cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Seção das Embarcações e Cotas (Suporta Múltiplos Veículos) */}
              <div className="border border-slate-100 p-3.5 rounded-lg bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Veículos Vinculados / Cotas *
                  </label>
                  <button
                    type="button"
                    onClick={() => setClientBoats([...clientBoats, { embarcacaoId: boats[0]?.id || '', cota: 'C1' }])}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Veículo
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {clientBoats.map((cb, idx) => (
                    <div key={idx} className="flex items-start bg-white border border-slate-200/80 p-3 rounded-lg relative space-x-3 shadow-xs">
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1 sm:pb-0">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Embarcação Vinculada #{idx + 1}</label>
                          <select
                            required
                            value={cb.embarcacaoId}
                            onChange={(e) => {
                              const newList = [...clientBoats];
                              newList[idx].embarcacaoId = e.target.value;
                              setClientBoats(newList);
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-250 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
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
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cota da Embarcação #{idx + 1}</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: C1, C3"
                            value={cb.cota}
                            onChange={(e) => {
                              const newList = [...clientBoats];
                              newList[idx].cota = e.target.value;
                              setClientBoats(newList);
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                      </div>

                      {clientBoats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientBoats(clientBoats.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors self-end mt-4 sm:self-center sm:mt-0 cursor-pointer"
                          title="Remover veículo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Contatos Adicionais (Opcionais)</p>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / Celular</label>
                  <input
                    id="input-client-phone"
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      id="input-client-email"
                      type="email"
                      placeholder="Ex: joao@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CPF</label>
                    <input
                      id="input-client-cpf"
                      type="text"
                      placeholder="Ex: 000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Endereço Residencial (Opcional)</p>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 relative">
                    <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
                      <span>CEP</span>
                      {isFetchingCep && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                    </label>
                    <input
                      id="input-client-cep"
                      type="text"
                      placeholder="Ex: 01001-000"
                      value={cep}
                      onChange={handleCepChange}
                      onBlur={handleCepBlur}
                      maxLength={9}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:bg-white focus:border-transparent font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      disabled={isFetchingCep || cep.replace(/\D/g, '').length !== 8}
                      onClick={() => fetchCep(cep.replace(/\D/g, ''))}
                      className="w-full py-2 text-xs font-bold text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-450 rounded-lg border border-indigo-100 disabled:border-slate-200 transition-all h-[38px] cursor-pointer"
                    >
                      Buscar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                  <input
                    id="input-client-logradouro"
                    type="text"
                    placeholder="Ex: Avenida Paulista"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Número</label>
                    <input
                      id="input-client-numero-end"
                      type="text"
                      placeholder="Ex: 1000"
                      value={numeroEnd}
                      onChange={(e) => setNumeroEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Complemento</label>
                    <input
                      id="input-client-complemento"
                      type="text"
                      placeholder="Ex: Apto 12"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bairro</label>
                  <input
                    id="input-client-bairro"
                    type="text"
                    placeholder="Ex: Bela Vista"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label>
                    <input
                      id="input-client-cidade"
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">UF</label>
                    <input
                      id="input-client-estado"
                      type="text"
                      placeholder="Ex: SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      maxLength={2}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Status Financeiro */}
              <div className="border border-slate-100 p-3.5 rounded-lg bg-orange-50/30 space-y-3">
                <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wider flex items-center mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Situação Financeira do Cliente
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status de Pagamento (Adminstração/Peças)</label>
                    <div
                      className={`w-full px-3 py-2 text-sm border rounded-lg font-semibold flex items-center h-[38px] ${
                        statusFinanceiro === 'inadimplente' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                      title="Status calculado automaticamente pelo sistema."
                    >
                      {statusFinanceiro === 'inadimplente' ? 'Inadimplente (Bloqueado)' : 'Em Dia (Regular)'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Observações Financeiras (Opcional)</label>
                    <textarea
                      placeholder="Taxa de janeiro pendente, faróis para pagar..."
                      value={observacoesFinanceiras}
                      onChange={(e) => setObservacoesFinanceiras(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white resize-none"
                    ></textarea>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-orange-200/50">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Plano de Agendamento</label>
                    <select
                      value={plano}
                      onChange={(e) => setPlano(e.target.value as 'normal' | 'completo')}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950"
                    >
                      <option value="normal">Normal (Sem acesso a seg/ter)</option>
                      <option value="completo">Plano Completo (Acesso total)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  id="cancel-save-client"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="submit-save-client"
                  type="submit"
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
