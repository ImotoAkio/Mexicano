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
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ClipboardCheck,
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import Select from 'react-select';
import { Embarcacao, Manutencao, Chamado, Mecanico, TipoManutencao, PecaItem } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { maintenanceDB, chamadoDB, mecanicoDB, tipoManutencaoDB, boatDB } from '../../db';
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

  // Budget review step — shown after filling budget on an "aguardando_orcamento" OS
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    orcamentoStatus: 'pendente',
    status: 'aguardando_orcamento',
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

  // When creating a new OS (not editing), show a simplified form: no parts table, no pricing, no SLA dates
  const isSimpleCreation = !isEditing;

  const handleDelete = async () => {
    if (editingItem?.id && window.confirm('Tem certeza que deseja apagar esta OS permanentemente? A ação não pode ser desfeita.')) {
      try {
        await maintenanceDB.delete(editingItem.id);
        onRefresh();
        onClose();
      } catch (e) {
        console.error('Erro ao excluir a OS:', e);
      }
    }
  };

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
        orcamentoStatus: 'pendente',
        status: 'aguardando_orcamento',
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
    { value: 'aguardando_orcamento', label: '1. Aguardando Orçamento' },
    { value: 'aguardando_aprovacao', label: '2. Aguardando Aprovação Cliente' },
    { value: 'em_execucao', label: '3. Execução da OS' },
    { value: 'concluido', label: '4. Concluído & Liberado' },
    { value: 'reprovado', label: 'Cancelado / Reprovado' }
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

  const generateLazyFinance = async (osId: string, itemData: any) => {
    const token = localStorage.getItem('admin_token');
    const generatedCodigoOS = itemData.codigoOS || `OS-${Date.now()}`;

    // 1. Gera Despesa se houver Custo Interno pago a terceiro
    if (itemData.custo && itemData.custo > 0 && itemData.mecanico) {
      const transacaoDespesa = {
        id: `fin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tipo: 'despesa',
        categoria: 'Mão de Obra / Serviços Terceirizados',
        valor: itemData.custo,
        descricao: `Serviço Terceirizado: ${itemData.tipoManutencaoNome || itemData.tituloChamado || 'Manutenção'} - ${generatedCodigoOS}`,
        fornecedorId: itemData.mecanico,
        status: 'lancado',
        dataVencimento: new Date().toISOString().split('T')[0],
        empresa: 'Mexicano',
        embarcacaoId: itemData.embarcacaoId,
        createdAt: new Date().toISOString()
      };
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'upsert', data: transacaoDespesa })
      }).catch(e => console.error('Erro na geração de despesa:', e));
    }

    // 2. Gera Receita se estiver assinalado gerarFinanceiro
    if (itemData.gerarFinanceiro && itemData.orcamento && itemData.orcamento > 0) {
      const transacaoReceita = {
        id: `fin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tipo: 'receita',
        categoria: 'Manutenção',
        valor: itemData.orcamento,
        descricao: `OS Concluída: ${itemData.tipoManutencaoNome || itemData.tituloChamado || 'Manutenção'} - ${generatedCodigoOS}`,
        status: 'lancado',
        dataVencimento: new Date().toISOString().split('T')[0],
        empresa: 'Mexicano',
        embarcacaoId: itemData.embarcacaoId,
        createdAt: new Date().toISOString()
      };
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'upsert', data: transacaoReceita })
      }).catch(e => console.error('Erro na geração de receita:', e));
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.embarcacaoId) {
      alert("Selecione uma embarcação.");
      return;
    }

    // Validation matching Kanban standards
    if (formData.status === 'aguardando_aprovacao') {
      if (!formData.mecanico) {
        alert("Para o estágio 'Orçamento (Aprovação)', é obrigatório definir o Mecânico ou Oficina responsável.");
        return;
      }
    } else if (formData.status === 'em_execucao') {
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

    // INTERCEPT: When formulating budget on an OS that's in aguardando_orcamento, show review first
    if (isEditing && editingItem?.status === 'aguardando_orcamento' && !showReviewStep) {
      setShowReviewStep(true);
      return;
    }

    await executeSave();
  };

  // Actual save logic — called after review confirmation or directly for non-budget edits
  const executeSave = async (overrideData?: Partial<typeof formData>) => {
    const dataToSave = overrideData ? { ...formData, ...overrideData } : formData;

    setIsSaving(true);
    try {
      if (isEditing && editingItem?.id) {
        await maintenanceDB.update(editingItem.id, dataToSave);

        if (dataToSave.status === 'concluido' && editingItem.status !== 'concluido') {
           await generateLazyFinance(dataToSave.id, dataToSave);
        }
      } else {
        const created = await maintenanceDB.create(dataToSave as any);
        if (created.embarcacaoId) {
          boatDB.update(created.embarcacaoId, { emManutencao: true });
        }
        if (created.status === 'concluido') {
           await generateLazyFinance(created.id, created);
        }

        if (dataToSave.chamadoId) {
          const chamado = chamadoDB.getById(dataToSave.chamadoId);
          if (chamado) {
            const newOsIds = [...(chamado.osIds || [])];
            if (!newOsIds.includes(created.id)) {
              newOsIds.push(created.id);
            }
            chamadoDB.update(dataToSave.chamadoId, { osIds: newOsIds, status: 'os_gerada' });
          }
        }
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar manutenção');
    } finally {
      setIsSaving(false);
    }
  };

  // Save and advance to aguardando_aprovacao
  const handleConfirmAndAdvance = async (sendWhatsApp: boolean) => {
    setIsSaving(true);
    let whatsappSuccess = false;

    if (sendWhatsApp) {
      whatsappSuccess = await enviarWhatsApp(true);
      if (!whatsappSuccess) {
        setIsSaving(false);
        return; // Don't advance if WhatsApp failed to send
      }
    }

    const advancedData = {
      ...formData,
      status: 'aguardando_aprovacao' as const,
      orcamentoStatus: 'enviado' as const,
      whatsappStatus: sendWhatsApp && whatsappSuccess ? 'orcamento_enviado' as const : formData.whatsappStatus
    };

    await executeSave(advancedData);

    if (sendWhatsApp && whatsappSuccess) {
      alert("Orçamento salvo e enviado no grupo de WhatsApp com sucesso!");
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

  const enviarWhatsApp = async (silentMode = false) => {
    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
    if (!boat?.whatsappGroupId) {
      alert("Embarcação não possui grupo de WhatsApp cadastrado.");
      return false;
    }

    const texto = gerarTextoWhatsApp();

    // Gerar PDF em base64 (sem abrir nova aba, silentMode = true no gerador)
    let pdfBase64 = "";
    try {
      // Mock do objeto cliente (não temos acesso direto fácil se não for buscar, mas o pdfGenerator lida bem sem ele ou usa fallback)
      const mockCliente = { nome: 'Proprietário Registrado' };
      const pdfDoc = await generateOrcamentoOSPDF(formData, boat, mockCliente, true);
      const dataUri = pdfDoc.output('datauristring');
      // Remover prefixo "data:application/pdf;base64," se presente, o backend tbm limpa mas é bom garantir
      pdfBase64 = dataUri;
    } catch (e) {
      console.warn("Erro ao gerar PDF para o WhatsApp:", e);
    }

    try {
      const token = localStorage.getItem('admin_token');
      const payload: any = {
        number: boat.whatsappGroupId,
        text: decodeURIComponent(texto)
      };

      if (pdfBase64) {
        payload.media = pdfBase64;
        payload.mimetype = 'application/pdf';
        payload.fileName = formData.codigoOS ? `Orcamento_${formData.codigoOS}.pdf` : 'Orcamento_OS.pdf';
      }

      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, whatsappStatus: 'orcamento_enviado' }));
        if (isEditing && editingItem?.id && !silentMode) {
          await maintenanceDB.update(editingItem.id, { whatsappStatus: 'orcamento_enviado' });
        }
        if (!silentMode) {
          alert("Orçamento (PDF + Detalhes) enviado no grupo de WhatsApp com sucesso!");
          onRefresh();
        }
        return true;
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.message || "Falha ao enviar mensagem.");
        return false;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar mensagem.");
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-[#186b77] border border-teal-200/70">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {isEditing ? 'Editar Ordem de Serviço (OS)' : 'Abertura de Ordem de Serviço'}
                </h2>
                {formData.codigoOS && (
                  <span className="font-mono text-xs font-black bg-[#186b77] text-white px-2 py-0.5 rounded-md">
                    {formData.codigoOS}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing ? 'Gerencie a manutenção, orçamento e baixa técnica da OS.' : 'Registre o problema e encaminhe para avaliação técnica.'}
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
                <Tag className="w-4 h-4" /> 2. Tipo de Serviço {!isSimpleCreation && '& Estágio Kanban'}
              </h3>

              <div className={`grid grid-cols-1 ${!isSimpleCreation ? 'md:grid-cols-2' : ''} gap-4`}>

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

                {/* Status / Estágio Select — hidden when creating a new OS */}
                {!isSimpleCreation && (
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
                    isDisabled={!isEditing && !!formData.chamadoId}
                    isSearchable={true}
                    styles={customSelectStyles}
                  />
                  {!isEditing && !!formData.chamadoId && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      OS gerada a partir de chamado inicia obrigatoriamente na Fila.
                    </p>
                  )}
                </div>
                )}

              </div>

              {/* Hint for new OS */}
              {isSimpleCreation && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  A OS será criada no estágio "Aguardando Orçamento". O orçamento e peças são definidos após a avaliação técnica.
                </p>
              )}
            </div>

            {/* BLOCO 3: MECÂNICO / OFICINA RESPONSÁVEL & HORÍMETRO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-[#186b77] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" /> 3. {isSimpleCreation ? 'Responsável & Detalhes' : 'Mecânico / Oficina & Horímetros'}
              </h3>

              <div className={`grid grid-cols-1 ${isSimpleCreation ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>

                {/* Mecânico / Oficina Select + Add Button */}
                <div className="space-y-1.5 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mecânico / Oficina <span className="text-[9px] font-normal text-slate-400 normal-case">(Opcional na abertura)</span>
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
                    isClearable={isSimpleCreation}
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

                {/* Próxima Revisão — hidden during new creation */}
                {!isSimpleCreation && (
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
                )}

              </div>

              {/* Data Saida & Prazo Entrega */}
              <div className={`grid grid-cols-1 ${!isSimpleCreation ? 'md:grid-cols-2' : ''} gap-4 pt-2`}>
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

                {/* Prazo Entrega — hidden during new creation */}
                {!isSimpleCreation && (
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
                )}
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

            {/* BLOCO 4: TABELA DE PEÇAS & ORÇAMENTO — hidden during new OS creation */}
            {!isSimpleCreation && (
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
                    onChange={(e) => setFormData(prev => ({ ...prev, orcamentoStatus: e.target.checked ? 'aprovado' : 'pendente' }))}
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
            )}

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

        {/* ═══════════════ REVIEW STEP OVERLAY ═══════════════ */}
        {showReviewStep && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white rounded-3xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">

            {/* Review Header */}
            <div className="relative px-6 py-5 border-b shrink-0 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center text-emerald-600">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    Revisão do Orçamento
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1">
                    Confirmar e Enviar para Aprovação
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowReviewStep(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border border-slate-200/50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Review Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

              {/* OS Code + Service */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#186b77] text-xs font-black font-mono">
                  {formData.codigoOS || ('OS-' + (editingItem?.id || '').substring(0, 6).toUpperCase())}
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formData.tituloChamado || formData.tipoManutencaoNome || 'Manutenção Geral'}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Embarcação */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                  <div className="p-2 h-max bg-white rounded-xl shadow-xs text-blue-600 border border-slate-100">
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Embarcação</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {getBoatCode(embarcacoes.find(b => b.id === formData.embarcacaoId))}
                    </p>
                  </div>
                </div>

                {/* Mecânico */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                  <div className="p-2 h-max bg-white rounded-xl shadow-xs text-amber-600 border border-slate-100">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Técnico / Oficina</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {mecanicosList.find(m => m.id === formData.mecanico)?.nome || 'Não definido'}
                    </p>
                  </div>
                </div>

                {/* Prazo */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                  <div className="p-2 h-max bg-white rounded-xl shadow-xs text-indigo-500 border border-slate-100">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Prazo de Entrega</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {formData.prazoEntrega ? formData.prazoEntrega.split('-').reverse().join('/') : 'Não definido'}
                    </p>
                  </div>
                </div>

                {/* Valor Repassado */}
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3">
                  <div className="p-2 h-max bg-white rounded-xl shadow-xs text-emerald-600 border border-emerald-100">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Valor Repassado ao Cliente</span>
                    <p className="text-lg font-black text-emerald-900 mt-0.5">
                      {(formData.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Peças table */}
              {formData.pecas && formData.pecas.length > 0 && (
                <div>
                  <h3 className="text-xs flex items-center gap-1.5 font-extrabold text-slate-800 uppercase tracking-tight mb-2">
                    <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                    Itens do Orçamento ({formData.pecas.length})
                  </h3>
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-4 w-1/2">Item / Peça / Serviço</th>
                          <th className="py-2.5 px-3 text-center w-16">Qtd</th>
                          <th className="py-2.5 px-3 text-right">R$ Un.</th>
                          <th className="py-2.5 px-4 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {formData.pecas.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-4">{p.nome || 'Item sem nome'}</td>
                            <td className="py-2.5 px-3 text-center">{p.quantidade}</td>
                            <td className="py-2.5 px-3 text-right">{(p.valorUnitario || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900">
                              {((p.quantidade || 0) * (p.valorUnitario || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 border-t-2 border-slate-200 border-dashed">
                          <td colSpan={3} className="py-3 px-4 text-right font-extrabold text-slate-500 text-xs">Total Peças/Itens:</td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            {(formData.pecas || []).reduce((acc, p) => acc + ((p.quantidade || 0) * (p.valorUnitario || 0)), 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Descrição */}
              {formData.descricaoServico && (
                <div>
                  <h3 className="text-xs flex items-center gap-1.5 font-extrabold text-slate-800 uppercase tracking-tight mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    Descrição do Serviço
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {formData.descricaoServico}
                  </div>
                </div>
              )}

              {/* Custo Interno (info only) */}
              {formData.custo && formData.custo > 0 && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-800">Custo Interno (não aparece para o cliente): </span>
                    <span className="font-black text-amber-900">
                      {formData.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}

              {/* Status change notice */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                <ArrowRight className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-black mb-0.5">A OS será automaticamente avançada</p>
                  <p className="font-medium opacity-80">
                    De <strong>"Aguardando Orçamento"</strong> → <strong>"Aguardando Aprovação do Cliente"</strong>.
                    O status do orçamento será marcado como <strong>"Enviado"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Review Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 rounded-b-3xl">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewStep(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                  Voltar e Editar
                </button>

                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleConfirmAndAdvance(false)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white text-xs font-black rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar e Avançar'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleConfirmAndAdvance(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isSaving ? 'Enviando...' : 'Salvar e Enviar WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => enviarWhatsApp(false)}
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
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors cursor-pointer mr-2 shrink-0"
                title="Apagar Ordem de Serviço"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
              <span>{isEditing
                ? (editingItem?.status === 'aguardando_orcamento' ? 'Revisar Orçamento' : 'Salvar Ordem de Serviço')
                : 'Abrir OS (Aguardando Orçamento)'}</span>
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
