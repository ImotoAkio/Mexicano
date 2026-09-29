import React, { useState } from 'react';
import { X, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { maintenanceDB } from '../../db';
import { Manutencao } from '../../types';

interface MaintenanceCheckoutModalProps {
  item: Manutencao;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MaintenanceCheckoutModal({ item, onClose, onSuccess }: MaintenanceCheckoutModalProps) {
  // Always prioritize the explicit client budget ("orcamento") as the base value for receivables.
  const baseValue = Number(item.orcamento) || Number(item.valorRepassado) || 0;

  const [gerarFinanceiro, setGerarFinanceiro] = useState(
    item.gerarFinanceiro !== undefined ? item.gerarFinanceiro : true
  );
  const [valor, setValor] = useState<number>(baseValue);
  const [horasMotorAtual, setHorasMotorAtual] = useState<number>(item.horasMotorAtual || 0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!horasMotorAtual || horasMotorAtual <= 0) {
      alert("Por favor, preencha o horímetro atual antes de finalizar a OS.");
      return;
    }

    setLoading(true);
    try {
      
      await maintenanceDB.update(item.id, {
        status: 'concluido',
        horasMotorAtual,
        gerarFinanceiro,
        valorRepassado: valor
      });
      
      const token = localStorage.getItem('admin_token');
      const generatedCodigoOS = item.codigoOS || `OS-${Date.now()}`;
      const itemData = {
        ...item,
        status: 'concluido',
        horasMotorAtual,
        gerarFinanceiro,
        orcamento: valor // Map valor to budget logic since valorRepassado overrides it here contextually
      };

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

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar a OS');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // A simple numeric input logic (stripping to number)
    let val = e.target.value.replace(/\D/g, '');
    const num = Number(val) / 100;
    setValor(num);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-black tracking-tight text-slate-800 uppercase">
                Finalizar OS
              </h2>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                Validação de Cobrança
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Definição de Cobrança Ausente</h3>
                <p className="text-xs font-medium text-amber-700/80 mt-1">
                  Você está movendo esta manutenção para "Concluído", mas ela não possui valor final ou a cobrança não está habilitada.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Horímetro Após Manutenção *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={horasMotorAtual}
                  onChange={(e) => setHorasMotorAtual(Number(e.target.value))}
                  placeholder="Ex: 1540"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-700 focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Gerar Conta a Receber?</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Enviar cobrança para o Cliente ou Cotistas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={gerarFinanceiro} 
                  onChange={(e) => setGerarFinanceiro(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {gerarFinanceiro && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Valor a Cobrar (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    onChange={handleValueChange}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-700 focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] transition-all"
                  />
                </div>
              </div>
            )}
            
            {!gerarFinanceiro && (
              <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 border-dashed text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Cortesia / Sem Cobrança
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end items-center">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-slate-500 uppercase hover:bg-slate-200/50 rounded-xl transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading || (gerarFinanceiro && valor <= 0)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#186b77] text-white text-sm font-bold uppercase rounded-xl hover:bg-[#186b77]/90 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
          >
            {loading ? 'Salvando...' : 'Confirmar e Concluir OS'}
          </button>
        </div>
      </div>
    </div>
  );
}
