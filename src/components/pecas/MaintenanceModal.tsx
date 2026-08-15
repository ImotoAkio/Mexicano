import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Ship, Wrench, MessageSquare, Plus, Trash2, Calendar, MapPin, DollarSign, Send, Check } from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { maintenanceDB } from '../../db';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: Manutencao | null;
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onRefresh: () => void;
}

export default function MaintenanceModal({ isOpen, onClose, editingItem, embarcacoes, mecanicos, onRefresh }: MaintenanceModalProps) {
  const [formData, setFormData] = useState<Partial<Manutencao>>({
    embarcacaoId: '',
    tituloChamado: '',
    status: 'chamado_aberto',
    dataChamado: new Date().toISOString().split('T')[0],
    dataSaida: new Date().toISOString().split('T')[0],
    prazoEntrega: '',
    mecanico: '',
    localizacao: 'marina',
    horasMotorAtual: 0,
    proximaRevisaoHoras: 0,
    orcamento: 0,
    custo: 0,
    valorRepassado: 0,
    orcamentoAprovado: false,
    whatsappStatus: 'nao_enviado',
    descricaoServico: '',
    pecas: []
  });

  const [pecaNome, setPecaNome] = useState('');
  const [pecaQtd, setPecaQtd] = useState(1);
  const [pecaValor, setPecaValor] = useState(0);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        embarcacaoId: embarcacoes.length > 0 ? embarcacoes[0].id : '',
        tituloChamado: '',
        status: 'chamado_aberto',
        dataChamado: new Date().toISOString().split('T')[0],
        dataSaida: new Date().toISOString().split('T')[0],
        prazoEntrega: '',
        mecanico: '',
        localizacao: 'marina',
        horasMotorAtual: 0,
        proximaRevisaoHoras: 0,
        orcamento: 0,
        custo: 0,
        valorRepassado: 0,
        orcamentoAprovado: false,
        whatsappStatus: 'nao_enviado',
        descricaoServico: '',
        pecas: []
      });
    }
  }, [editingItem, embarcacoes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleAddPeca = () => {
    if (!pecaNome || pecaQtd <= 0) return;
    const newPeca = { nome: pecaNome, quantidade: pecaQtd, valorUnitario: pecaValor };
    setFormData(prev => ({
      ...prev,
      pecas: [...(prev.pecas || []), newPeca]
    }));
    setPecaNome('');
    setPecaQtd(1);
    setPecaValor(0);
    recalcularOrcamento([...(formData.pecas || []), newPeca]);
  };

  const handleRemovePeca = (index: number) => {
    const novasPecas = [...(formData.pecas || [])];
    novasPecas.splice(index, 1);
    setFormData(prev => ({ ...prev, pecas: novasPecas }));
    recalcularOrcamento(novasPecas);
  };

  const recalcularOrcamento = (pecas: any[]) => {
    const total = pecas.reduce((acc, p) => acc + (p.quantidade * p.valorUnitario), 0);
    setFormData(prev => ({ ...prev, orcamento: total }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.embarcacaoId) {
      alert("Selecione uma embarcação.");
      return;
    }

    try {
      if (editingItem) {
        await maintenanceDB.update(editingItem.id, formData);
      } else {
        await maintenanceDB.create(formData as any);
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar manutenção');
    }
  };

  const gerarTextoWhatsApp = () => {
    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
    let texto = `*ORÇAMENTO DE MANUTENÇÃO - ${boat?.nome || 'Embarcação'}*\n\n`;
    texto += `*Serviço:* ${formData.tituloChamado || 'Manutenção'}\n`;
    texto += `*Status:* ${formData.status === 'orcamento_pendente' ? 'Aguardando Aprovação' : 'Aprovado'}\n\n`;
    
    if (formData.pecas && formData.pecas.length > 0) {
      texto += `*Peças/Materiais:*\n`;
      formData.pecas.forEach(p => {
        const totalStr = (p.quantidade * p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        texto += `- ${p.quantidade}x ${p.nome} (${totalStr})\n`;
      });
      texto += `\n`;
    }
    
    if (formData.descricaoServico) {
      texto += `*Mão de Obra/Descrição:*\n${formData.descricaoServico}\n\n`;
    }

    texto += `*VALOR TOTAL:* ${(formData.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    
    return encodeURIComponent(texto);
  };

  const enviarWhatsApp = async () => {
    const boat = embarcacoes.find(b => b.id === formData.embarcacaoId);
    if (!boat?.whatsappGroupId) {
      alert("Embarcação não tem grupo de WhatsApp configurado.");
      return;
    }

    const texto = gerarTextoWhatsApp();
    
    try {
      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: boat.whatsappGroupId,
          text: decodeURIComponent(texto)
        })
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, whatsappStatus: 'orcamento_enviado' }));
        if (editingItem) {
          await maintenanceDB.update(editingItem.id, { whatsappStatus: 'orcamento_enviado' });
        }
        alert("Orçamento enviado para o grupo com sucesso!");
        onRefresh();
      } else {
        alert("Falha ao enviar mensagem.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar mensagem.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {editingItem ? 'Editar Manutenção / Chamado' : 'Novo Chamado de Manutenção'}
              </h2>
              <p className="text-sm text-slate-500">
                {editingItem ? 'Atualize os dados e orçamentos do serviço.' : 'Abra um novo ticket de serviço.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="maintenanceForm" onSubmit={handleSave} className="space-y-8">
            
            {/* Info Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Embarcação *</label>
                <select
                  name="embarcacaoId"
                  required
                  value={formData.embarcacaoId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {embarcacoes.map(b => (
                    <option key={b.id} value={b.id}>{b.nome} {b.numero ? `(M${b.numero})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status (Kanban) *</label>
                <select
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="chamado_aberto">Novo Chamado</option>
                  <option value="orcamento_pendente">Orçamento Pendente</option>
                  <option value="aguardando_pecas">Aguardando Peças</option>
                  <option value="na_oficina">Na Oficina Externa</option>
                  <option value="em_andamento">Em Execução</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Título do Chamado / Resumo *</label>
                <input
                  type="text"
                  name="tituloChamado"
                  required
                  placeholder="Ex: Troca de óleo, Revisão de 100h..."
                  value={formData.tituloChamado || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Datas e Localização */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Logística e Prazos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data do Chamado</label>
                  <input
                    type="date"
                    name="dataChamado"
                    value={formData.dataChamado || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prazo Entrega (SLA)</label>
                  <input
                    type="date"
                    name="prazoEntrega"
                    value={formData.prazoEntrega || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Localização</label>
                  <select
                    name="localizacao"
                    value={formData.localizacao || 'marina'}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="marina">Na Marina</option>
                    <option value="oficina_externa">Oficina Externa</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mecânico e Horas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mecânico/Oficina</label>
                <select
                  name="mecanico"
                  value={formData.mecanico || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="">Nenhum / Interno</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Horas Motor (Atual)</label>
                <input
                  type="number"
                  name="horasMotorAtual"
                  value={formData.horasMotorAtual || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Próxima Revisão (Horas)</label>
                <input
                  type="number"
                  name="proximaRevisaoHoras"
                  value={formData.proximaRevisaoHoras || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Gerador de Orçamentos (Peças e Valores) */}
            <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" /> Orçamento & Peças
              </h3>
              
              {/* Lista de Peças */}
              <div className="mb-4 space-y-2">
                {(formData.pecas || []).map((peca, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                    <div>
                      <span className="font-medium text-slate-800">{peca.quantidade}x {peca.nome}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{Number(peca.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un</span>
                      <span className="font-bold">{(peca.quantidade * peca.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <button type="button" onClick={() => handleRemovePeca(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar Peça */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex-1 w-full">
                  <label className="block text-xs text-slate-500 mb-1">Item / Peça</label>
                  <input type="text" value={pecaNome} onChange={e => setPecaNome(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" placeholder="Ex: Filtro de Óleo" />
                </div>
                <div className="w-full sm:w-24">
                  <label className="block text-xs text-slate-500 mb-1">Qtd</label>
                  <input type="number" value={pecaQtd} onChange={e => setPecaQtd(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs text-slate-500 mb-1">Valor Un. (R$)</label>
                  <input type="number" step="0.01" value={pecaValor} onChange={e => setPecaValor(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <button type="button" onClick={handleAddPeca} className="bg-slate-800 text-white px-4 py-2 rounded font-medium hover:bg-slate-900 w-full sm:w-auto h-[38px]">
                  Add
                </button>
              </div>

              <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-t border-blue-100 pt-6">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descrição / Mão de Obra</label>
                  <textarea
                    name="descricaoServico"
                    rows={2}
                    value={formData.descricaoServico || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none custom-scrollbar"
                    placeholder="Descreva serviços adicionais..."
                  />
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Custo / Repasse Mecânico</label>
                    <input type="number" name="custo" step="0.01" value={formData.custo || ''} onChange={handleChange} className="w-32 px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">Valor Total Cliente</label>
                    <input type="number" name="orcamento" step="0.01" value={formData.orcamento || ''} onChange={handleChange} className="w-32 px-3 py-2 border-2 border-green-500 rounded-lg outline-none font-bold text-green-700 bg-green-50" />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-6 bg-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            {editingItem && (
              <button
                type="button"
                onClick={enviarWhatsApp}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.whatsappStatus !== 'nao_enviado' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {formData.whatsappStatus !== 'nao_enviado' ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {formData.whatsappStatus !== 'nao_enviado' ? 'Reenviar Orçamento (WPP)' : 'Enviar Orçamento (WPP)'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              form="maintenanceForm"
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-medium shadow-sm shadow-blue-200 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              Salvar 
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
