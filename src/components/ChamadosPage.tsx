import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Ship, 
  User, 
  Wrench, 
  ArrowRight, 
  FileText,
  X,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Tag,
  Trash2
} from 'lucide-react';
import Select from 'react-select';
import { Chamado, Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { chamadoDB, boatDB, clientDB, maintenanceDB } from '../db';
import MaintenanceModal from './pecas/MaintenanceModal';
import UserAvatarMenu from './header/UserAvatarMenu';
import SystemSettingsModal from './header/SystemSettingsModal';

interface ChamadosPageProps {
  onNavigateToOS?: () => void;
}

export default function ChamadosPage({ onNavigateToOS }: ChamadosPageProps) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ativos');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('todos');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedChamadoForAnalysis, setSelectedChamadoForAnalysis] = useState<Chamado | null>(null);
  
  // OS Generation Modal State
  const [showOSModal, setShowOSModal] = useState(false);
  const [prefilledOSData, setPrefilledOSData] = useState<any>(null);

  // New Chamado Form State
  const [newChamadoForm, setNewChamadoForm] = useState({
    embarcacaoId: '',
    solicitanteTipo: 'gerente' as Chamado['solicitanteTipo'],
    solicitanteNome: '',
    titulo: '',
    descricaoAvaria: '',
    urgencia: 'media' as Chamado['urgencia']
  });

  const loadData = () => {
    setChamados(chamadoDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setClientes(clientDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Chamados
  const filteredChamados = useMemo(() => {
    return chamados.filter(c => {
      const boat = embarcacoes.find(b => b.id === c.embarcacaoId);
      const matchesSearch = 
        c.codigoChamado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.descricaoAvaria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.solicitanteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (boat && boat.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (boat && boat.numero.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'ativos') {
        matchesStatus = c.status !== 'descartado';
      } else if (statusFilter === 'todos') {
        matchesStatus = true;
      } else {
        matchesStatus = c.status === statusFilter;
      }

      const matchesUrgencia = urgenciaFilter === 'todos' || c.urgencia === urgenciaFilter;

      return matchesSearch && matchesStatus && matchesUrgencia;
    });
  }, [chamados, embarcacoes, searchTerm, statusFilter, urgenciaFilter]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      ativos: chamados.filter(c => c.status !== 'descartado').length,
      pendentes: chamados.filter(c => c.status === 'pendente' || c.status === 'em_analise').length,
      osGeradas: chamados.filter(c => c.status === 'os_gerada').length,
      concluidos: chamados.filter(c => c.status === 'concluido').length,
      descartados: chamados.filter(c => c.status === 'descartado').length,
    };
  }, [chamados]);

  const boatOptions = useMemo(() => {
    return embarcacoes.map(b => ({
      value: b.id,
      label: `${getBoatCode(b)} (${b.modelo || (b.tipo === 'jet' ? 'Jet Ski' : 'Lancha')})`,
      boat: b
    }));
  }, [embarcacoes]);

  const handleCreateChamado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChamadoForm.embarcacaoId || !newChamadoForm.titulo) {
      alert("Por favor, selecione a embarcação e informe o título da avaria.");
      return;
    }

    const defaultSolicitante = newChamadoForm.solicitanteNome || 
      (newChamadoForm.solicitanteTipo === 'gerente' ? 'Gerência da Marina' : 
       newChamadoForm.solicitanteTipo === 'administrador' ? 'Administração' : 
       newChamadoForm.solicitanteTipo === 'pecas_servicos' ? 'Peças & Serviços' : 'Cliente Proprietário');

    chamadoDB.create({
      embarcacaoId: newChamadoForm.embarcacaoId,
      solicitanteTipo: newChamadoForm.solicitanteTipo,
      solicitanteNome: defaultSolicitante,
      titulo: newChamadoForm.titulo,
      descricaoAvaria: newChamadoForm.descricaoAvaria,
      urgencia: newChamadoForm.urgencia,
      status: 'pendente',
      dataAbertura: new Date().toISOString().split('T')[0]
    });

    setShowCreateModal(false);
    setNewChamadoForm({
      embarcacaoId: '',
      solicitanteTipo: 'gerente',
      solicitanteNome: '',
      titulo: '',
      descricaoAvaria: '',
      urgencia: 'media'
    });
    loadData();
  };

  const handleConvertChamadoToOS = (chamado: Chamado) => {
    // Pre-fill OS Modal Data linked to this Chamado
    const boat = embarcacoes.find(b => b.id === chamado.embarcacaoId);
    
    // Update Chamado status to em_analise
    chamadoDB.update(chamado.id, { status: 'em_analise' });
    
    setPrefilledOSData({
      embarcacaoId: chamado.embarcacaoId,
      tituloChamado: `[${chamado.codigoChamado}] ${chamado.titulo}`,
      descricaoServico: `Chamado de Origem: ${chamado.codigoChamado}\nSolicitante: ${chamado.solicitanteNome}\n\nDescrição da Avaria:\n${chamado.descricaoAvaria}`,
      chamadoId: chamado.id,
      status: 'chamado_aberto',
      dataChamado: new Date().toISOString().split('T')[0],
      horasMotorAtual: boat?.horasMotor || 0
    });

    setSelectedChamadoForAnalysis(null);
    setShowOSModal(true);
  };

  const handleDescartarChamado = (chamado: Chamado) => {
    if (window.confirm(`Deseja realmente descartar o chamado ${chamado.codigoChamado}?`)) {
      chamadoDB.update(chamado.id, { status: 'descartado' });
      setSelectedChamadoForAnalysis(null);
      loadData();
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f3f7f5] flex-col overflow-hidden font-sans">
      
      {/* Padronizado Header Container */}
      <header className="bg-[#f3f7f5] border-b border-slate-200/60 p-4 sm:p-6 shrink-0 space-y-4">
        
        {/* Header Padronizado (Breadcrumb, Título & Ícones Utilitários à Direita) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <span>Frotas</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Chamados</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Chamados
            </h1>
          </div>

          {/* Botões Utilitários Circulares Padronizados */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button 
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Pesquisar por código"]') as HTMLInputElement;
                if (input) input.focus();
              }}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Configurações do Sistema"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button 
              onClick={loadData}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Atualizar Chamados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <UserAvatarMenu />
          </div>
        </div>

      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter('ativos')}
            className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
              statusFilter === 'ativos' ? 'ring-2 ring-[#186b77] border-[#186b77] shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chamados Ativos</span>
              <ClipboardList className="w-4 h-4 text-[#186b77]" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.ativos}</div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block truncate">Exclui descartados</span>
          </button>

          <button
            onClick={() => setStatusFilter('pendente')}
            className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
              statusFilter === 'pendente' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20' : 'border-slate-200/80 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Aguardando Análise</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.pendentes}</div>
            <span className="text-[11px] font-bold text-amber-600 mt-1 block truncate">Necessita triagem</span>
          </button>

          <button
            onClick={() => setStatusFilter('os_gerada')}
            className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
              statusFilter === 'os_gerada' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : 'border-slate-200/80 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Convertidos em OS</span>
              <Wrench className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.osGeradas}</div>
            <span className="text-[11px] font-bold text-blue-600 mt-1 block truncate">Ordem de Serviço ativa</span>
          </button>

          <button
            onClick={() => setStatusFilter('concluido')}
            className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
              statusFilter === 'concluido' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-slate-200/80 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Concluídos</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.concluidos}</div>
            <span className="text-[11px] font-bold text-emerald-600 mt-1 block truncate">Baixa efetuada</span>
          </button>

          <button
            onClick={() => setStatusFilter('descartado')}
            className={`p-3.5 bg-white rounded-2xl border transition-all text-left cursor-pointer ${
              statusFilter === 'descartado' ? 'ring-2 ring-red-500 border-red-500 bg-red-50/20' : 'border-slate-200/80 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Descartados</span>
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.descartados}</div>
            <span className="text-[11px] font-bold text-red-600 mt-1 block truncate">Sem conversão</span>
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <input
              type="text"
              placeholder="Pesquisar chamado (CHM-001), embarcação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#186b77] outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {[
              { id: 'ativos', label: 'Ativos' },
              { id: 'pendente', label: 'Análise' },
              { id: 'os_gerada', label: 'Em OS' },
              { id: 'concluido', label: 'Concluídos' },
              { id: 'descartado', label: 'Descartados' },
              { id: 'todos', label: 'Todos' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === st.id 
                    ? st.id === 'descartado' 
                      ? 'bg-red-500 text-white shadow-2xs' 
                      : 'bg-[#186b77] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Urgency Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              Urgência:
            </span>
            {['todos', 'baixa', 'media', 'alta', 'critica'].map((urg) => (
              <button
                key={urg}
                onClick={() => setUrgenciaFilter(urg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  urgenciaFilter === urg 
                    ? urg === 'critica' || urg === 'alta' ? 'bg-red-500 text-white shadow-2xs' : 'bg-[#186b77] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {urg}
              </button>
            ))}
          </div>

          {/* Botão de Ação Primário + Novo Chamado */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Chamado</span>
          </button>

        </div>

        {/* Chamados Grid / Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChamados.map(chamado => {
            const boat = embarcacoes.find(b => b.id === chamado.embarcacaoId);

            return (
              <div 
                key={chamado.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header: Código + Urgência Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-[#186b77] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                        {chamado.codigoChamado}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(chamado.dataAbertura).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 line-clamp-2">
                      {chamado.titulo}
                    </h3>
                  </div>

                  {/* Badge de Urgência */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                    chamado.urgencia === 'critica' ? 'bg-red-100 text-red-800 border-red-200' :
                    chamado.urgencia === 'alta' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    chamado.urgencia === 'media' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {chamado.urgencia}
                  </span>
                </div>

                {/* Embarcação & Solicitante Info */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
                      <Ship className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{getBoatCode(boat)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {boat?.modelo || boat?.tipo}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> Solicitante:
                    </span>
                    <strong className="text-slate-700 font-semibold truncate max-w-[150px]">
                      {chamado.solicitanteNome}
                    </strong>
                  </div>
                </div>

                {/* Descrição Curta */}
                <p className="text-xs text-slate-600 font-medium line-clamp-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  "{chamado.descricaoAvaria}"
                </p>

                {/* Status Badge & Conversion Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {chamado.status === 'pendente' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-amber-500" /> Pendente
                      </span>
                    )}
                    {chamado.status === 'em_analise' && (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        <Wrench className="w-3 h-3 text-blue-500" /> Em Análise
                      </span>
                    )}
                    {chamado.status === 'os_gerada' && (
                      <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        <FileText className="w-3 h-3 text-teal-600" /> OS Criada
                      </span>
                    )}
                    {chamado.status === 'concluido' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Concluído
                      </span>
                    )}
                    {chamado.status === 'descartado' && (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        <Trash2 className="w-3 h-3 text-red-500" /> Descartado
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedChamadoForAnalysis(chamado)}
                    className="px-3 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Analisar / Gerar OS</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}

          {filteredChamados.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/80">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-800 text-base">Nenhum chamado encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Utilize o botão "+ Novo Chamado" para registrar uma nova avaria ou ajuste os filtros de busca acima.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* Modal 1: Criar Novo Chamado */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden font-sans">
            
            <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#186b77] border border-teal-200/70 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Registrar Novo Chamado</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Informe a avaria constatada para análise técnica</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChamado} className="p-6 space-y-4">
              
              {/* Embarcação Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Embarcação Afetada
                </label>
                <Select
                  options={boatOptions}
                  value={boatOptions.find(o => o.value === newChamadoForm.embarcacaoId) || null}
                  onChange={(option) => {
                    if (option?.value) {
                      setNewChamadoForm(prev => ({ ...prev, embarcacaoId: option.value }));
                    }
                  }}
                  placeholder="Selecione a embarcação por código ou nome..."
                  isSearchable={true}
                  className="text-xs font-medium"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '1rem',
                      borderColor: state.isFocused ? '#186b77' : '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    })
                  }}
                />
              </div>

              {/* Solicitante & Urgência Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Solicitante / Origem
                  </label>
                  <select
                    value={newChamadoForm.solicitanteTipo}
                    onChange={(e) => setNewChamadoForm(prev => ({ ...prev, solicitanteTipo: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="gerente">Gerente da Marina</option>
                    <option value="administrador">Administrador</option>
                    <option value="cliente">Cliente / Proprietário</option>
                    <option value="pecas_servicos">Peças & Serviços</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Urgência
                  </label>
                  <select
                    value={newChamadoForm.urgencia}
                    onChange={(e) => setNewChamadoForm(prev => ({ ...prev, urgencia: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="baixa">Baixa (Rotina)</option>
                    <option value="media">Média (Ajuste)</option>
                    <option value="alta">Alta (Impedimento parcial)</option>
                    <option value="critica">Crítica (Fora de Operação)</option>
                  </select>
                </div>
              </div>

              {/* Nome do Solicitante */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Solicitante
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Gerência ou Nome do Cliente..."
                  value={newChamadoForm.solicitanteNome}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, solicitanteNome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Título Curto da Avaria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vazamento no motor de popa, Ruído na bomba de porão..."
                  value={newChamadoForm.titulo}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              {/* Descrição Detalhada */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição Detalhada do Problema
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhadamente o sintoma constatado, fotos disponíveis ou observações..."
                  value={newChamadoForm.descricaoAvaria}
                  onChange={(e) => setNewChamadoForm(prev => ({ ...prev, descricaoAvaria: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Abrir Chamado</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Analisar Chamado & Converter em OS */}
      {selectedChamadoForAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden font-sans">
            
            <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#186b77] border border-teal-200/70 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">Análise do Chamado</h3>
                    <span className="font-mono text-xs font-bold bg-teal-100 text-[#186b77] px-2 py-0.5 rounded border border-teal-200">
                      {selectedChamadoForAnalysis.codigoChamado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Triagem técnica por Peças & Serviços</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedChamadoForAnalysis(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              {/* Detailed Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Embarcação</span>
                  {(() => {
                    const boat = embarcacoes.find(b => b.id === selectedChamadoForAnalysis.embarcacaoId);
                    return (
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-[#186b77]" />
                        {getBoatCode(boat)}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Solicitante</span>
                  <span className="font-semibold text-slate-800">{selectedChamadoForAnalysis.solicitanteNome}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Urgência</span>
                  <span className="font-extrabold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    {selectedChamadoForAnalysis.urgencia}
                  </span>
                </div>
              </div>

              {/* Title & Damage Description */}
              <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Título da Avaria</span>
                <p className="font-extrabold text-slate-900 text-xs">{selectedChamadoForAnalysis.titulo}</p>
              </div>

              <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descrição Detalhada</span>
                <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{selectedChamadoForAnalysis.descricaoAvaria}</p>
              </div>

              {/* Status Action Notice */}
              <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-xl text-teal-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#186b77] shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <strong className="block font-bold">Próximo Passo do Fluxo:</strong>
                  Ao clicar no botão abaixo, uma nova **Ordem de Serviço (OS)** será gerada. A embarcação será encaminhada para manutenção e sairá automaticamente do status de disponível.
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChamadoForAnalysis(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>

                  {selectedChamadoForAnalysis.status !== 'descartado' && (
                    <button
                      type="button"
                      onClick={() => handleDescartarChamado(selectedChamadoForAnalysis)}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-xl text-xs border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Descartar este chamado"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Descartar Chamado</span>
                    </button>
                  )}
                </div>

                {selectedChamadoForAnalysis.status !== 'descartado' && (
                  <button
                    onClick={() => handleConvertChamadoToOS(selectedChamadoForAnalysis)}
                    className="px-5 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Gerar Ordem de Serviço (OS)</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Maintenance Modal for OS Creation from Chamado */}
      {showOSModal && (
        <MaintenanceModal
          isOpen={showOSModal}
          onClose={() => {
            setShowOSModal(false);
            setPrefilledOSData(null);
            loadData();
          }}
          editingItem={prefilledOSData}
          embarcacoes={embarcacoes}
          mecanicos={[]}
          onRefresh={loadData}
        />
      )}

      {/* System Settings & Horímetro Modal */}
      {isSettingsOpen && (
        <SystemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={loadData}
        />
      )}

    </div>
  );
}
