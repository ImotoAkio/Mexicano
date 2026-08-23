import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Wrench, Clock, CheckCircle, XCircle, LayoutDashboard, List, Activity, AlertTriangle, DollarSign } from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../types';
import { boatDB, maintenanceDB, mecanicoDB } from '../db';
import Select from 'react-select';
import MechanicsModal from './MechanicsModal';

export default function MaintenancePage() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'painel' | 'historico'>('painel');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMechanicsModalOpen, setIsMechanicsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manutencao | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Manutencao>>({
    embarcacaoId: '',
    dataSaida: new Date().toISOString().split('T')[0],
    mecanico: '',
    orcamento: 0,
    custo: 0,
    valorRepassado: 0,
    status: 'em_andamento',
    descricaoServico: '',
    gerarFinanceiro: true,
    horasMotorAtual: 0,
    proximaRevisaoHoras: 0
  });

  const loadData = () => {
    setManutencoes(maintenanceDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setMecanicos(mecanicoDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (item?: Manutencao) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        embarcacaoId: '',
        dataSaida: new Date().toISOString().split('T')[0],
        mecanico: '',
        orcamento: 0,
        custo: 0,
        valorRepassado: 0,
        status: 'em_andamento',
        descricaoServico: '',
        gerarFinanceiro: true,
        horasMotorAtual: 0,
        proximaRevisaoHoras: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.embarcacaoId || !formData.dataSaida) {
      alert("Por favor, preencha os campos obrigatórios (Embarcação e Data de Saída).");
      return;
    }

    try {
      if (editingItem && editingItem.id && maintenanceDB.getAll().some(m => m.id === editingItem.id)) {
        maintenanceDB.update(editingItem.id, formData);
      } else {
        maintenanceDB.create(formData as Omit<Manutencao, 'id' | 'createdAt'>);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar manutenção');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro de manutenção?")) {
      maintenanceDB.delete(id);
      loadData();
    }
  };

  // Utilities
  const formatMoney = (val: number | null | undefined) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getDaysSince = (dateStr: string) => {
    const start = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Metrics Calculation
  const activeMaintenances = manutencoes.filter(m => m.status === 'em_andamento');
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const gastoMes = manutencoes
    .filter(m => {
      const d = new Date(m.dataSaida + 'T12:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + (curr.custo || 0), 0);

  const pendingRevisions = embarcacoes.filter(b => {
    if (!b.horasMotor) return false;
    // Pega a última manutenção dessa embarcação que tenha proximaRevisao definida
    const ultimaManutencao = manutencoes
      .filter(m => m.embarcacaoId === b.id && m.proximaRevisaoHoras)
      .sort((a, b) => new Date(b.dataSaida).getTime() - new Date(a.dataSaida).getTime())[0];
    
    if (ultimaManutencao && ultimaManutencao.proximaRevisaoHoras) {
      // Se faltar 10 horas ou menos para a próxima revisão (ou se já passou)
      return (ultimaManutencao.proximaRevisaoHoras - b.horasMotor) <= 10;
    }
    return false;
  });

  const filteredHistorico = manutencoes.filter(m => {
    const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
    const searchStr = searchTerm.toLowerCase();
    return (
      (boat?.nome?.toLowerCase().includes(searchStr)) ||
      (m.mecanico?.toLowerCase().includes(searchStr)) ||
      (m.status.toLowerCase().includes(searchStr))
    );
  });

  const statusMap = {
    em_andamento: { label: 'Em Andamento', icon: <Clock className="w-4 h-4 text-amber-500" />, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    concluido: { label: 'Concluído', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelado: { label: 'Cancelado', icon: <XCircle className="w-4 h-4 text-rose-500" />, classes: 'bg-rose-50 text-rose-700 border-rose-200' }
  };

  const boatOptions = embarcacoes.map(b => ({ value: b.id, label: `${b.nome} ${b.horasMotor ? `(${b.horasMotor}h)` : ''}` }));
  const selectedBoat = boatOptions.find(opt => opt.value === formData.embarcacaoId) || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Wrench className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manutenções</h1>
            <p className="text-sm text-slate-500 mt-1">Gestão de frota, horas e revisões</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('painel')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'painel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Painel
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'historico' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Histórico
            </button>
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Registro
          </button>
        </div>
      </div>

      {activeTab === 'painel' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {/* Métricas Topo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Manutenção</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{activeMaintenances.length}</span>
                  <span className="text-sm font-semibold text-slate-500">embarcações</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos no Mês</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{formatMoney(gastoMes)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alerta de Revisão</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{pendingRevisions.length}</span>
                  <span className="text-sm font-semibold text-slate-500">embarcações</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas de Revisão */}
          {pendingRevisions.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="flex-1 text-indigo-900">
                <h4 className="font-bold text-sm">Atenção para as Revisões!</h4>
                <p className="text-xs mt-0.5 opacity-80">As seguintes embarcações estão muito próximas ou já passaram do limite de horas para a próxima revisão programada:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pendingRevisions.map(b => (
                    <span key={b.id} className="px-2 py-1 bg-white/60 border border-indigo-200 rounded-md text-xs font-bold text-indigo-800">
                      {b.nome} ({b.horasMotor}h)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quadro Kanban de Status */}
          <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200/60">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Quadro de Acompanhamento Ativo
            </h3>
            
            {activeMaintenances.length === 0 ? (
              <div className="text-center p-12 bg-white/50 border border-white rounded-2xl border-dashed">
                <p className="text-slate-400 font-medium text-sm">Nenhuma embarcação em manutenção neste momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeMaintenances.map(m => {
                  const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
                  const diasParado = getDaysSince(m.dataSaida);
                  
                  return (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all group flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight">{boat?.nome || 'N/A'}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                            {boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} • {boat?.horasMotor ? `${boat.horasMotor}h` : 'N/A h'}
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                          diasParado > 7 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {diasParado} {diasParado === 1 ? 'dia' : 'dias'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 flex-1 mt-2">
                        <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                          <span className="text-slate-500">Mecânico:</span>
                          <span className="font-semibold text-slate-700">{m.mecanico || 'Não definido'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                          <span className="text-slate-500">Entrada:</span>
                          <span className="font-semibold text-slate-700">
                            {new Date(m.dataSaida + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {m.descricaoServico && (
                          <div className="text-xs pt-1">
                            <span className="text-slate-400 block mb-1">Serviço:</span>
                            <p className="text-slate-700 line-clamp-2 leading-relaxed">{m.descricaoServico}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-4 mt-2 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleOpenModal(m)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-slate-100"
                        >
                          Gerenciar
                        </button>
                        <button
                          onClick={() => {
                            maintenanceDB.update(m.id, { status: 'concluido' });
                            loadData();
                          }}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors border border-emerald-100"
                          title="Marcar como Concluído"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar no histórico por embarcação, mecânico ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                    <th className="px-6 py-4">Data Saída</th>
                    <th className="px-6 py-4">Embarcação</th>
                    <th className="px-6 py-4">Horas Reg.</th>
                    <th className="px-6 py-4">Mecânico</th>
                    <th className="px-6 py-4 text-right">Custo Real</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistorico.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredHistorico.map(m => {
                      const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
                      const statusInfo = statusMap[m.status];
                      
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {new Date(m.dataSaida + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {boat?.nome || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {m.horasMotorAtual ? `${m.horasMotorAtual}h` : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {m.mecanico || '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">
                            {formatMoney(m.custo)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusInfo.classes}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenModal(m)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Editar Manutenção' : 'Nova Manutenção'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 p-1 rounded-full border border-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto subtle-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Embarcação e Mecânico */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Embarcação *</label>
                  <Select
                    options={boatOptions}
                    value={selectedBoat}
                    onChange={(option) => setFormData({ ...formData, embarcacaoId: option?.value || '' })}
                    placeholder="Selecione a embarcação..."
                    className="react-select-container text-sm"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nenhuma embarcação encontrada"}
                    menuPortalTarget={document.body}
                    styles={{ 
                      menuPortal: base => ({ ...base, zIndex: 9999 }),
                      option: (base, state) => ({ ...base, color: '#0f172a', backgroundColor: state.isFocused ? '#f1f5f9' : 'white' }),
                      singleValue: base => ({ ...base, color: '#0f172a', fontWeight: '600' }),
                      control: base => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '44px' })
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex justify-between items-center uppercase tracking-wider">
                    Mecânico
                    <button
                      type="button"
                      onClick={() => setIsMechanicsModalOpen(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-0.5 rounded-full"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Novo
                    </button>
                  </label>
                  <Select
                    options={mecanicos.map(m => ({ value: m.nome, label: m.nome }))}
                    value={formData.mecanico ? { value: formData.mecanico, label: formData.mecanico } : null}
                    onChange={(option) => setFormData({ ...formData, mecanico: option?.value || '' })}
                    placeholder="Selecione o mecânico..."
                    className="react-select-container text-sm"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nenhum mecânico cadastrado"}
                    menuPortalTarget={document.body}
                    styles={{ 
                      menuPortal: base => ({ ...base, zIndex: 9999 }),
                      option: (base, state) => ({ ...base, color: '#0f172a', backgroundColor: state.isFocused ? '#f1f5f9' : 'white' }),
                      singleValue: base => ({ ...base, color: '#0f172a' }),
                      control: base => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '44px' })
                    }}
                    isClearable
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Data de Saída *</label>
                  <input
                    type="date"
                    required
                    value={formData.dataSaida}
                    onChange={e => setFormData({...formData, dataSaida: e.target.value})}
                    className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Section: Horas de Motor */}
                <div className="md:col-span-2 pt-2">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        Horas de Motor Atuais
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.horasMotorAtual || ''}
                        onChange={e => setFormData({...formData, horasMotorAtual: parseFloat(e.target.value) || 0})}
                        placeholder="Ex: 150"
                        className="w-full px-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-500 leading-tight">Atualiza automaticamente o painel da embarcação ao salvar.</p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                        Próxima Revisão (h)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.proximaRevisaoHoras || ''}
                        onChange={e => setFormData({...formData, proximaRevisaoHoras: parseFloat(e.target.value) || 0})}
                        placeholder="Ex: 200"
                        className="w-full px-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-500 leading-tight">Alerta visual será gerado quando o motor chegar próximo a esse limite.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descrição do Serviço</label>
                  <textarea
                    rows={3}
                    value={formData.descricaoServico || ''}
                    onChange={e => setFormData({...formData, descricaoServico: e.target.value})}
                    placeholder="Descreva detalhadamente o que foi feito na manutenção..."
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custo Real (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.custo || ''}
                      onChange={e => setFormData({...formData, custo: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Valor Repassado (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorRepassado || ''}
                      onChange={e => setFormData({...formData, valorRepassado: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status Atual</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none"
                  >
                    <option value="em_andamento">Em Andamento (Permanece no Quadro)</option>
                    <option value="concluido">Concluído (Move para o Histórico)</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                
                {!editingItem && (
                  <div className="space-y-1.5 md:col-span-2 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.gerarFinanceiro}
                        onChange={e => setFormData({...formData, gerarFinanceiro: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Gerar registro financeiro automaticamente (para divisão entre cotistas)
                      </span>
                    </label>
                  </div>
                )}
                
              </div>
              
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm font-bold text-sm flex items-center gap-2"
                >
                  {editingItem ? <><CheckCircle className="w-4 h-4"/> Salvar Alterações</> : <><Plus className="w-4 h-4"/> Criar Registro</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMechanicsModalOpen && (
        <MechanicsModal 
          onClose={() => {
            setIsMechanicsModalOpen(false);
            loadData();
          }} 
          onSelect={(nome) => {
            setFormData({ ...formData, mecanico: nome });
            loadData();
          }}
        />
      )}
    </div>
  );
}
