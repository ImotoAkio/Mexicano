import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Wrench, 
  Plus, 
  Trash2, 
  Send, 
  Check, 
  Calendar, 
  FileText, 
  DollarSign, 
  UserPlus, 
  Tag, 
  Ship, 
  Clock, 
  AlertCircle,
  Building2,
  Sparkles
} from 'lucide-react';
import Select from 'react-select';
import { Embarcacao, Manutencao, Chamado, Mecanico, TipoManutencao, PecaItem } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { maintenanceDB, chamadoDB, mecanicoDB, tipoManutencaoDB } from '../../db';
import { generateOrcamentoOSPDF } from '../../utils/pdfGenerator';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onRefresh: () => void;
}

export default function MaintenanceModal({
  isOpen,
  onClose,
  editingItem,
  embarcacoes,
  mecanicos: initialMecanicos,
  onRefresh
}: MaintenanceModalProps) {
  
  // Data lists
  const [mecanicosList, setMecanicosList] = useState<Mecanico[]>(initialMecanicos || []);
  const [tiposList, setTiposList] = useState<TipoManutencao[]>([]);
  const [chamadosList, setChamadosList] = useState<Chamado[]>([]);

  // Mini-Modal States
  const [showAddTipoModal, setShowAddTipoModal] = useState(false);
  const [newTipoForm, setNewTipoForm] = useState({ nome: '', descricao: '' });

  const [showAddMecanicoModal, setShowAddMecanicoModal] = useState(false);
  const [newMecanicoForm, setNewMecanicoForm] = useState({ 
    nome: '', 
    tipo: 'interno' as 'interno' | 'oficina_externa', 
    telefone: '', 
    cnpj: '' 
  });

  // Main Form Data State
  const [formData, setFormData] = useState<Partial<Manutencao>>({
    embarcacaoId: '',
    chamadoId: '',
    tipoManutencaoId: '',
    tipoManutencaoNome: '',
    tituloChamado: '',
    dataSaida: new Date().toISOString().split('T')[0],
    dataChamado: new Date().toISOString().split('T')[0],
    prazoEntrega: '',
    mecanico: '',
    orcamento: 0,
    orcamentoAprovado: false,
    status: 'fila_espera',
    localizacao: 'marina',
    descricaoServico: '',
    horasMotorAtual: 0,
    proximaRevisaoHoras: 0,
    pecas: [],
    whatsappStatus: 'nao_enviado',
    gerarFinanceiro: true
  });

  const isEditing = useMemo(() => {
    return Boolean(editingItem && editingItem.id && maintenanceDB.getAll().some(m => m.id === editingItem.id));
  }, [editingItem, isOpen]);

  // Load lists
  const refreshAuxData = () => {
    setMecanicosList([...mecanicoDB.getAll()]);
    setTiposList([...tipoManutencaoDB.getAll()]);
    setChamadosList([...chamadoDB.getAll()]);
  };

  useEffect(() => {
    refreshAuxData();
  }, [isOpen]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        status: editingItem.status || 'fila_espera',
        pecas: editingItem.pecas || [],
        gerarFinanceiro: editingItem.gerarFinanceiro !== undefined ? editingItem.gerarFinanceiro : true
      });
    } else {
      setFormData({
        embarcacaoId: '',
        chamadoId: '',
        tipoManutencaoId: '',
        tipoManutencaoNome: '',
        tituloChamado: '',
        dataSaida: new Date().toISOString().split('T')[0],
        dataChamado: new Date().toISOString().split('T')[0],
        prazoEntrega: '',
        mecanico: '',
        orcamento: 0,
        orcamentoAprovado: false,
        status: 'fila_espera',
        localizacao: 'marina',
        descricaoServico: '',
        horasMotorAtual: 0,
        proximaRevisaoHoras: 0,
        pecas: [],
        whatsappStatus: 'nao_enviado',
        gerarFinanceiro: true
      });
    }
  }, [editingItem, isOpen]);

  // Recalculate Orcamento Total automatically from pecas if modified
  const totalPecas = useMemo(() => {
    if (!formData.pecas) return 0;
    return formData.pecas.reduce((acc, item) => acc + ((item.quantidade || 0) * (item.valorUnitario || 0)), 0);
  }, [formData.pecas]);

  useEffect(() => {
    if (totalPecas > 0) {
      setFormData(prev => ({ ...prev, orcamento: totalPecas }));
    }
  }, [totalPecas]);

  // Select Options formatting
  const boatOptions = useMemo(() => {
    return embarcacoes.map(b => ({
      value: b.id,
      label: `${getBoatCode(b)} (${b.modelo || (b.tipo === 'jet' ? 'Jet Ski' : 'Lancha')})`,
      boat: b
    }));
  }, [embarcacoes]);

  const chamadoOptions = useMemo(() => {
    return chamadosList.map(c => {
      const boat = embarcacoes.find(b => b.id === c.embarcacaoId);
      return {
        value: c.id,
        label: `[${c.codigoChamado}] ${c.titulo} - ${boat ? getBoatCode(boat) : ''}`,
        chamado: c
      };
    });
  }, [chamadosList, embarcacoes]);

  const tipoOptions = useMemo(() => {
    return tiposList.map(t => ({
      value: t.id,
      label: t.nome,
      tipo: t
    }));
  }, [tiposList]);

  const mecanicoOptions = useMemo(() => {
    return mecanicosList.map(m => ({
      value: m.id,
      label: `${m.nome} (${m.tipo === 'oficina_externa' ? 'Oficina Externa' : 'Mecânico Interno'})`,
      mecanico: m
    }));
  }, [mecanicosList]);

  const statusOptions = [
    { value: 'fila_espera', label: '1. Triagem & Chamado' },
    { value: 'orcamento_pendente', label: '2. Orçamento (Aprovação)' },
    { value: 'em_andamento', label: '3. Em Manutenção' },
    { value: 'concluido', label: '4. Concluído & Liberado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  // Custom Select Style
  const customSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderRadius: '0.875rem',
      borderColor: state.isFocused ? '#186b77' : '#cbd5e1',
      backgroundColor: '#f8fafc',
      padding: '2px 4px',
      fontSize: '0.75rem',
      fontWeight: '700',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(24, 107, 119, 0.2)' : 'none'
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: state.isSelected ? '#186b77' : state.isFocused ? '#f0fdfa' : 'white',
      color: state.isSelected ? 'white' : '#1e293b'
    })
  };

  // Handlers for dynamic creation
  const handleCreateTipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoForm.nome.trim()) return;
    const created = tipoManutencaoDB.create({
      nome: newTipoForm.nome.trim(),
      descricao: newTipoForm.descricao.trim()
    });
    setTiposList([...tipoManutencaoDB.getAll()]);
    setFormData(prev => ({
      ...prev,
      tipoManutencaoId: created.id,
      tipoManutencaoNome: created.nome,
      tituloChamado: created.nome
    }));
    setShowAddTipoModal(false);
    setNewTipoForm({ nome: '', descricao: '' });
  };

  const handleCreateMecanico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMecanicoForm.nome.trim()) return;
    const created = mecanicoDB.create({
      nome: newMecanicoForm.nome.trim(),
      tipo: newMecanicoForm.tipo,
      telefone: newMecanicoForm.telefone.trim(),
      cnpj: newMecanicoForm.cnpj.trim()
    });
    setMecanicosList([...mecanicoDB.getAll()]);
    setFormData(prev => ({
      ...prev,
      mecanico: created.id,
      localizacao: created.tipo === 'oficina_externa' ? 'oficina_externa' : 'marina'
    }));
    setShowAddMecanicoModal(false);
    setNewMecanicoForm({ nome: '', tipo: 'interno', telefone: '', cnpj: '' });
  };

  // Item Parts Handler
  const handleAddPeca = () => {
    setFormData(prev => ({
      ...prev,
      pecas: [...(prev.pecas || []), { nome: '', quantidade: 1, valorUnitario: 0 }]
    }));
  };

  const handlePecaChange = (index: number, field: string, value: any) => {
    const newPecas = [...(formData.pecas || [])];
    newPecas[index] = { ...newPecas[index], [field]: value };
    setFormData(prev => ({ ...prev, pecas: newPecas }));
  };

  const handleRemovePeca = (index: number) => {
    const newPecas = (formData.pecas || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, pecas: newPecas }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.embarcacaoId) {
      alert("Selecione uma embarcação.");
      return;
    }

    // Validation matching Kanban standards
    if (formData.status === 'orcamento_pendente') {
      if (!formData.mecanico) {
        alert("Para o estágio 'Orçamento (Aprovação)', é obrigatório definir o Mecânico ou Oficina responsável.");
        return;
      }
    } else if (formData.status === 'em_andamento') {
      const needsBudgetConf = (!formData.orcamento && formData.orcamento !== 0) || formData.orcamentoStatus !== 'aprovado';
      if (needsBudgetConf || !formData.mecanico) {
        alert("Para o estágio 'Em Manutenção', é obrigatório definir Mecânico/Oficina, Valor do Orçamento e marcar como 'Aprovado'. (Se for cortesia/garantia, coloque o valor como 0).");
        return;
      }
    } else if (formData.status === 'concluido') {
      if (!formData.mecanico) {
        alert("Para concluir, é necessário definir o mecânico/oficina responsável.");
        return;
      }
      if (!formData.horasMotorAtual || formData.horasMotorAtual <= 0) {
        alert("Para concluir uma ordem de serviço, é obrigatório registrar o horímetro final na seção de Horímetros.");
        return;
      }
    }

    try {
      if (isEditing && editingItem?.id) {
        await maintenanceDB.update(editingItem.id, formData);
      } else {
        const created = await maintenanceDB.create(formData as any);
        if (formData.chamadoId) {
          const chamado = chamadoDB.findById(formData.chamadoId);
          if (chamado) {
            const newOsIds = [...(chamado.osIds || [])];
            if (!newOsIds.includes(created.id)) {
              newOsIds.push(created.id);
            }
            // For now, let's mark it as os_gerada automatically if it was pendente or em_analise.
            // But doing it partially allows 1:N. We will set it to 'os_gerada' here to keep old behavior,
            // or the user can manually re-open/add more in ChamadosPage.
            chamadoDB.update(formData.chamadoId, { osIds: newOsIds, status: 'os_gerada' });
          }
        }
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar manutenção');
    }
  };

  const gerarTextoWhatsApp = () => {
    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
    let texto = `*ORÇAMENTO DE MANUTENÇÃO - ${getBoatCode(boat)}*\n\n`;
    texto += `*Tipo de Serviço:* ${formData.tipoManutencaoNome || formData.tituloChamado || 'Manutenção'}\n`;
    texto += `*Status:* ${formData.orcamentoStatus === 'aprovado' ? 'Aprovado pelo Cliente' : 'Aguardando Aprovação'}\n\n`;
    
    if (formData.pecas && formData.pecas.length > 0) {
      texto += `*Peças & Materiais:*\n`;
      formData.pecas.forEach(p => {
        const totalStr = (p.quantidade * p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        texto += `- ${p.quantidade}x ${p.nome} (${totalStr})\n`;
      });
      texto += `\n`;
    }
    
    if (formData.descricaoServico) {
      texto += `*Mão de Obra / Descrição:*\n${formData.descricaoServico}\n\n`;
    }

    texto += `*VALOR TOTAL:* ${(formData.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    return encodeURIComponent(texto);
  };

  const enviarWhatsApp = async () => {
    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
    if (!boat?.whatsappGroupId) {
      alert("Embarcação não possui grupo de WhatsApp cadastrado.");
      return;
    }

    const texto = gerarTextoWhatsApp();
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number: boat.whatsappGroupId,
          text: decodeURIComponent(texto)
        })
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, whatsappStatus: 'orcamento_enviado' }));
        if (isEditing && editingItem?.id) {
          await maintenanceDB.update(editingItem.id, { whatsappStatus: 'orcamento_enviado' });
        }
        alert("Orçamento enviado no grupo de WhatsApp com sucesso!");
        onRefresh();
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.message || "Falha ao enviar mensagem.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar mensagem.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-[#186b77] border border-teal-200/70">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {isEditing ? 'Editar Ordem de Serviço (OS)' : 'Nova Ordem de Serviço (OS)'}
                </h2>
                {formData.codigoOS && (
                  <span className="font-mono text-xs font-black bg-[#186b77] text-white px-2 py-0.5 rounded-md">
                    {formData.codigoOS}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing ? 'Gerencie a manutenção, orçamento e baixa técnica da OS.' : 'Registre e encaminhe uma nova manutenção.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          <form id="maintenanceForm" onSubmit={handleSave} className="space-y-6">
            
            {/* BLOCO 1: EMBARCAÇÃO & VÍNCULO COM CHAMADO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-[#186b77] uppercase tracking-wider flex items-center gap-2">
                <Ship className="w-4 h-4" /> 1. Embarcação & Vínculo de Origem
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Embarcação Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Embarcação Afetada *
                  </label>
                  <Select
                    options={boatOptions}
                    value={boatOptions.find(o => o.value === formData.embarcacaoId) || null}
                    onChange={(option) => {
                      if (option?.value) {
                        const b = option.boat;
                        setFormData(prev => ({ 
                          ...prev, 
                          embarcacaoId: option.value,
                          horasMotorAtual: b.horasMotor || prev.horasMotorAtual || 0
                        }));
                      }
                    }}
                    placeholder="Pesquisar por código (M99) ou nome..."
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                </div>

                {/* Chamado de Origem Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chamado de Origem (Opcional)
                  </label>
                  <Select
                    options={chamadoOptions}
                    value={chamadoOptions.find(o => o.value === formData.chamadoId) || null}
                    onChange={(option) => {
                      if (option?.value) {
                        const chm = option.chamado;
                        setFormData(prev => ({ 
                          ...prev, 
                          chamadoId: chm.id,
                          embarcacaoId: chm.embarcacaoId,
                          tituloChamado: `[${chm.codigoChamado}] ${chm.titulo}`,
                          descricaoServico: chm.descricaoAvaria
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, chamadoId: '' }));
                      }
                    }}
                    isClearable={true}
                    placeholder="Pesquisar chamado de avaria (CHM-2026)..."
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                </div>

              </div>
            </div>

            {/* BLOCO 2: TIPO DE MANUTENÇÃO & ESTÁGIO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-[#186b77] uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4" /> 2. Tipo de Serviço & Estágio Kanban
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Tipo de Manutenção Select + Add Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tipo de Manutenção / Serviço
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddTipoModal(true)}
                      className="text-[11px] font-bold text-[#186b77] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cadastrar Novo Tipo</span>
                    </button>
                  </div>

                  <Select
                    options={tipoOptions}
                    value={tipoOptions.find(o => o.value === formData.tipoManutencaoId || (formData.tipoManutencaoNome && o.label.toLowerCase() === formData.tipoManutencaoNome.toLowerCase()) || (formData.tituloChamado && o.label.toLowerCase() === formData.tituloChamado.toLowerCase())) || null}
                    onChange={(option) => {
                      if (option?.value) {
                        setFormData(prev => ({ 
                          ...prev, 
                          tipoManutencaoId: option.value,
                          tipoManutencaoNome: option.label,
                          tituloChamado: option.label
                        }));
                      }
                    }}
                    placeholder="Selecione ou pesquise o tipo de manutenção..."
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                </div>

                {/* Status / Estágio Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estágio Atual (Kanban)
                  </label>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find(o => o.value === formData.status) || null}
                    onChange={(option) => {
                      if (option?.value) {
                        setFormData(prev => ({ ...prev, status: option.value as any }));
                      }
                    }}
                    placeholder="Selecione o estágio..."
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                </div>

              </div>
            </div>

            {/* BLOCO 3: MECÂNICO / OFICINA RESPONSÁVEL & HORÍMETRO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-[#186b77] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" /> 3. Mecânico / Oficina & Horímetros
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Mecânico / Oficina Select + Add Button */}
                <div className="space-y-1.5 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mecânico / Oficina <span className="text-[9px] font-normal text-slate-400 normal-case">(Requerido p/ orçamento)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddMecanicoModal(true)}
                      className="text-[11px] font-bold text-[#186b77] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cadastrar</span>
                    </button>
                  </div>

                  <Select
                    options={mecanicoOptions}
                    value={mecanicoOptions.find(o => o.value === formData.mecanico) || null}
                    onChange={(option) => {
                      if (option?.value) {
                        const m = option.mecanico;
                        setFormData(prev => ({ 
                          ...prev, 
                          mecanico: option.value,
                          localizacao: m.tipo === 'oficina_externa' ? 'oficina_externa' : 'marina'
                        }));
                      }
                    }}
                    placeholder="Pesquisar mecânico ou oficina..."
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                </div>

                {/* Horímetro Entrada */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Horímetro Entrada (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 145.5"
                    value={formData.horasMotorAtual || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, horasMotorAtual: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                  />
                </div>

                {/* Próxima Revisão */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Próxima Revisão (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 245.5"
                    value={formData.proximaRevisaoHoras || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, proximaRevisaoHoras: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                  />
                </div>

              </div>

              {/* Data Saida & Prazo Entrega */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Data do Chamado / Entrada
                  </label>
                  <input
                    type="date"
                    value={formData.dataChamado || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataChamado: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prazo Previsto de Conclusão (SLA)
                  </label>
                  <input
                    type="date"
                    value={formData.prazoEntrega || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, prazoEntrega: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Descrição dos Serviços */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição dos Serviços / Diagnóstico
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhamento técnico dos trabalhos a executar ou laudo do mecânico..."
                  value={formData.descricaoServico || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricaoServico: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none"
                />
              </div>

            </div>

            {/* BLOCO 4: TABELA DE PEÇAS & ORÇAMENTO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#186b77] uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> 4. Peças, Materiais & Orçamento Total
                </h3>

                <button
                  type="button"
                  onClick={handleAddPeca}
                  className="px-3 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Peça / Item</span>
                </button>
              </div>

              {/* Table of Parts */}
              <div className="space-y-2">
                {formData.pecas && formData.pecas.map((peca, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <input
                      type="text"
                      placeholder="Descrição da Peça (ex: Óleo 15W40, Filtro de Óleo)"
                      value={peca.nome}
                      onChange={(e) => handlePecaChange(idx, 'nome', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={peca.quantidade || 1}
                      onChange={(e) => handlePecaChange(idx, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="R$ Unit"
                      value={peca.valorUnitario || ''}
                      onChange={(e) => handlePecaChange(idx, 'valorUnitario', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right outline-none"
                    />
                    <div className="w-24 text-right text-xs font-black text-slate-800 px-1">
                      {((peca.quantidade || 1) * (peca.valorUnitario || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePeca(idx)}
                      className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {(!formData.pecas || formData.pecas.length === 0) && (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                    Nenhuma peça ou item adicionado. Clique no botão acima para discriminar os materiais.
                  </div>
                )}
              </div>

              {/* Total & Approval Checkbox */}
              <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.orcamentoStatus === 'aprovado' || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, orcamentoAprovado: e.target.checked }))}
                    className="w-4 h-4 accent-[#186b77] rounded"
                  />
                  <span>Orçamento Aprovado pelo Cliente</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] items-center gap-1 font-bold text-slate-400 uppercase tracking-widest flex" title="O custo real interno. Opcional.">
                      Custo Interno Pago (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.custo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, custo: parseFloat(e.target.value) || null }))}
                      className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-300 text-right"
                      placeholder="Ex: 500.00"
                    />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Repassado ao Cliente (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.orcamento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, orcamento: parseFloat(e.target.value) || 0 }))}
                      className="w-36 px-3 py-2 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-sm font-black text-emerald-800 outline-none text-right placeholder-emerald-300"
                      placeholder="Ex: 850.00"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* CHECKBOX FINANCEIRO AO CONCLUIR */}
            {formData.status === 'concluido' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-extrabold">Ação Automática de Baixa:</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.gerarFinanceiro || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, gerarFinanceiro: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Gerar Conta a Receber no Financeiro</span>
                </label>
              </div>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="flex items-center gap-2">
            {(isEditing || Boolean(formData.embarcacaoId)) && (formData.orcamento ? formData.orcamento > 0 : false) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
                    generateOrcamentoOSPDF(formData, boat);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  title="Gerar PDF do Orçamento detalhado"
                >
                  <FileText className="w-4 h-4 text-[#186b77]" />
                  <span className="hidden sm:inline">PDF do Orçamento</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  type="button"
                  onClick={enviarWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  title="Enviar os valores e itens pro grupo de WhatsApp do cliente"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar Orçamento (WhatsApp)</span>
                  <span className="sm:hidden">Enviar</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              form="maintenanceForm"
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#186b77] hover:bg-[#12555f] text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Ordem de Serviço' : 'Criar Ordem de Serviço'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* MINI-MODAL 1: CADASTRO DE TIPO DE MANUTENÇÃO */}
      {showAddTipoModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#186b77]" /> Cadastrar Novo Tipo de Serviço
              </h3>
              <button onClick={() => setShowAddTipoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTipo} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nome do Tipo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de Anodo, Polimento de Casco..."
                  value={newTipoForm.nome}
                  onChange={(e) => setNewTipoForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Descrição Rápida</label>
                <input
                  type="text"
                  placeholder="Instruções genéricas para este serviço..."
                  value={newTipoForm.descricao}
                  onChange={(e) => setNewTipoForm(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTipoModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#186b77] text-white font-extrabold rounded-xl text-xs shadow-xs"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI-MODAL 2: CADASTRO DE MECÂNICO / OFICINA */}
      {showAddMecanicoModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#186b77]" /> Cadastrar Mecânico ou Oficina
              </h3>
              <button onClick={() => setShowAddMecanicoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMecanico} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Mecânico ou Oficina Náutica XP"
                  value={newMecanicoForm.nome}
                  onChange={(e) => setNewMecanicoForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Tipo de Fornecedor</label>
                  <select
                    value={newMecanicoForm.tipo}
                    onChange={(e) => setNewMecanicoForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="interno">Mecânico Interno</option>
                    <option value="oficina_externa">Oficina Externa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={newMecanicoForm.telefone}
                    onChange={(e) => setNewMecanicoForm(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">CNPJ / CPF (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={newMecanicoForm.cnpj}
                  onChange={(e) => setNewMecanicoForm(prev => ({ ...prev, cnpj: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMecanicoModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#186b77] text-white font-extrabold rounded-xl text-xs shadow-xs"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
