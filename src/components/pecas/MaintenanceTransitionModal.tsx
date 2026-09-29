import React, { useState } from 'react';
import { X, Wrench, DollarSign, User, AlertTriangle, MessageSquare } from 'lucide-react';
import { Manutencao, Mecanico } from '../../types';
import { maintenanceDB } from '../../db';

interface MaintenanceTransitionModalProps {
  item: Manutencao;
  targetStatus: 'aguardando_aprovacao' | 'em_execucao';
  mecanicos: Mecanico[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function MaintenanceTransitionModal({
  item,
  targetStatus,
  mecanicos,
  onClose,
  onSuccess
}: MaintenanceTransitionModalProps) {

  const [loading, setLoading] = useState(false);
  const [mecanico, setMecanico] = useState(item.mecanico || '');
  const [orcamento, setOrcamento] = useState<number>(item.orcamento || 0);
  const [orcamentoStatus, setOrcamentoStatus] = useState<Manutencao['orcamentoStatus']>(item.orcamentoStatus || 'pendente');
  const [descricao, setDescricao] = useState(item.descricaoServico || '');

  // Status mapping
  const title = targetStatus === 'aguardando_aprovacao'
    ? 'Avançar para Orçamento'
    : 'Iniciar Manutenção';

  const getSubTitle = () => {
    if (targetStatus === 'aguardando_aprovacao') return 'Defina o mecânico ou a oficina responsável para seguir.';
    return 'Confirme o orçamento e aprovação para iniciar o serviço.';
  };

  const isFormValid = () => {
    if (targetStatus === 'aguardando_aprovacao') {
      return mecanico.length > 0;
    }
    if (targetStatus === 'em_execucao') {
      // Se não precisa de orçamento (zero) e foi aprovado, ou se tem valor
      return orcamentoStatus === 'aprovado' && mecanico.length > 0;
    }
    return true;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    const num = Number(val) / 100;
    setOrcamento(num);
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    try {
      const updates: Partial<Manutencao> = { status: targetStatus };

      if (mecanico) updates.mecanico = mecanico;
      if (descricao) updates.descricaoServico = descricao;
      if (targetStatus === 'em_execucao') {
        updates.orcamento = orcamento;
        updates.orcamentoStatus = orcamentoStatus;
      }

      await maintenanceDB.update(item.id, updates);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar transição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${targetStatus === 'aguardando_aprovacao' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              {targetStatus === 'aguardando_aprovacao' ? <DollarSign className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-[15px] font-black tracking-tight text-slate-800 uppercase">
                {title}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {item.codigoOS || 'OS'} • Faltam dados obrigatórios
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-sm font-semibold text-slate-600">
            {getSubTitle()}
          </p>

          <div className="space-y-4">
            {/* Sempre exige/confirma mecânico */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Mecânico / Oficina *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={mecanico}
                  onChange={e => setMecanico(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] transition-all outline-none"
                >
                  <option value="">Selecione o responsável...</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {targetStatus === 'em_execucao' && (
              <>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    Valor do Orçamento (R$)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      onChange={handleValueChange}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] transition-all outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium ml-1">Deixe 0,00 se for garantia ou sem cobrança.</p>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Orçamento Aprovado <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[200px]">A manutenção só inicia após OK do cliente.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={orcamentoStatus === 'aprovado'}
                      onChange={(e) => setOrcamentoStatus(e.target.checked ? 'aprovado' : 'pendente')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Qual o problema / O que será feito?
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                </div>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes para a equipe..."
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] transition-all outline-none resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 uppercase hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !isFormValid()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#186b77] text-white text-sm font-bold uppercase rounded-xl hover:bg-[#186b77]/90 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Salvando...' : 'Confirmar e Avançar'}
          </button>
        </div>
      </div>
    </div>
  );
}
