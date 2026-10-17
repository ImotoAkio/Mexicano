import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, DollarSign, Calendar, FileText, Wallet,
  CreditCard, AlertTriangle, Send, Link, Trash2, Edit2,
  MapPin, Hash, Clock, User, Briefcase, Anchor
} from 'lucide-react';

interface FinanceVisualizadorDrawerProps {
  open: boolean;
  onClose: () => void;
  transacao: any;
  onEdit: (t: any) => void;
  onDelete: (t: any) => void;
  onBaixaManual: (t: any) => void;
  onGerarLink: (t: any) => void;
  onEnviarWhatsApp: (t: any) => void;
  mapPlanos: Record<string, string>;
  mapCentros: Record<string, string>;
  clientes?: any[];
  fornecedores?: any[];
  embarcacoes?: any[];
  taxaJurosMensal?: number;
  taxaMultaAtraso?: number;
}

export default function FinanceVisualizadorDrawer({
  open,
  onClose,
  transacao,
  onEdit,
  onDelete,
  onBaixaManual,
  onGerarLink,
  onEnviarWhatsApp,
  mapPlanos,
  mapCentros,
  clientes = [],
  fornecedores = [],
  embarcacoes = [],
  taxaJurosMensal = 2.2,
  taxaMultaAtraso = 2.0
}: FinanceVisualizadorDrawerProps) {

  if (!transacao) return null;

  const getDaysDiff = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const isOverdue = transacao.status === 'vencido' || (transacao.status === 'lancado' && new Date(transacao.dataVencimento + 'T23:59:59') < new Date());

  let interest = 0;
  const baseVal = parseFloat(transacao.valor || 0);
  let totalWithInterest = baseVal;

  if (isOverdue && transacao.tipo === 'receita' && transacao.status !== 'pago' && transacao.status !== 'cancelado') {
    const days = getDaysDiff(transacao.dataVencimento);
    if (days > 0) {
      const fine = baseVal * (Math.max(0, taxaMultaAtraso) / 100);
      const ratePerDay = (Math.max(0, taxaJurosMensal) / 100) / 30;
      const interestOnly = baseVal * ratePerDay * days;
      interest = Number((fine + interestOnly).toFixed(2));
      totalWithInterest = Number((baseVal + interest).toFixed(2));
    }
  }

  let statusLabel = 'Pendente';
  let statusColor = 'bg-[#f0f0f5] text-[#86868b]';

  if (transacao.status === 'pago') {
    statusLabel = transacao.asaasPaymentId ? 'Pago Auto' : 'Pago Manual';
    statusColor = 'bg-[#e5fcf4] text-[#008f5d]';
  } else if (isOverdue) {
    statusLabel = 'Vencido';
    statusColor = 'bg-[#fef0f0] text-[#e30000]';
  } else if (transacao.tipo === 'despesa') {
    statusLabel = 'A Pagar';
    statusColor = 'bg-[#fff5e5] text-[#bf4800]';
  }

  const handleAction = (actionFn: (t: any) => void) => {
    onClose();
    setTimeout(() => actionFn(transacao), 150); // wait for animation
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#f5f5f7] z-[10000] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-black/[0.04]">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Detalhes do Registro</h2>
                <p className="text-[13px] text-[#86868b]">Id: {transacao.id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-[#f5f5f7] rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-12">

              {/* Highlight Card */}
              <div className="bg-white rounded-2xl p-6 border border-black/[0.04] shadow-sm flex flex-col items-center justify-center text-center">
                <div className={`text-[13px] font-semibold uppercase tracking-wider mb-2 ${transacao.tipo === 'receita' ? 'text-[#008f5d]' : 'text-[#e30000]'}`}>
                  {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                </div>
                <div className={`text-[36px] font-semibold tracking-tight mb-1 ${transacao.tipo === 'receita' ? 'text-[#008f5d]' : 'text-[#1d1d1f]'}`}>
                   R$ {totalWithInterest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
                {interest > 0 && (
                  <div className="text-[13px] font-medium text-[#e30000] mb-3 bg-[#fef0f0] px-2 py-0.5 rounded flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Inclui multa e juros de R$ {interest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>
                )}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${statusColor} ${interest === 0 ? 'mt-2' : ''}`}>
                  {statusLabel}
                </div>
              </div>

              {/* Data List */}
              <div className="bg-white rounded-2xl border border-black/[0.04] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><FileText className="w-4 h-4"/> Descrição</span>
                  <span className="text-[15px] font-semibold text-[#1d1d1f] text-right">{transacao.descricao}</span>
                </div>
                <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Calendar className="w-4 h-4"/> Vencimento</span>
                  <span className="text-[15px] font-semibold text-[#1d1d1f] text-right">{new Date(transacao.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                {transacao.dataPagamento && (
                  <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Check className="w-4 h-4"/> Pagamento</span>
                    <span className="text-[15px] font-semibold text-[#1d1d1f] text-right">{new Date(transacao.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><MapPin className="w-4 h-4"/> Empresa</span>
                  <span className="text-[15px] font-semibold text-[#1d1d1f] text-right">{transacao.empresa}</span>
                </div>
                <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Hash className="w-4 h-4"/> Plano de Contas</span>
                  <span className="text-[15px] font-semibold text-[#1d1d1f] text-right max-w-[60%] truncate" title={mapPlanos[transacao.planoContasId] || transacao.categoria}>{mapPlanos[transacao.planoContasId] || transacao.categoria || 'Não definido'}</span>
                </div>
                {transacao.centroCustoId && (
                   <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                     <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Hash className="w-4 h-4"/> Centro de Custo</span>
                     <span className="text-[15px] font-semibold text-[#1d1d1f] text-right">{mapCentros[transacao.centroCustoId] || 'Não definido'}</span>
                   </div>
                )}
                {transacao.clienteId && (
                  <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><User className="w-4 h-4"/> Cliente</span>
                    <span className="text-[15px] font-semibold text-[#1d1d1f] text-right truncate max-w-[60%]">
                      {clientes?.find(c => c.id === transacao.clienteId)?.nome || transacao.clienteId}
                    </span>
                  </div>
                )}
                {transacao.fornecedorId && (
                  <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Briefcase className="w-4 h-4"/> Fornecedor</span>
                    <span className="text-[15px] font-semibold text-[#1d1d1f] text-right truncate max-w-[60%]">
                      {fornecedores?.find(f => f.id === transacao.fornecedorId)?.nomeFantasia || fornecedores?.find(f => f.id === transacao.fornecedorId)?.razaoSocial || transacao.fornecedorId}
                    </span>
                  </div>
                )}
                {transacao.embarcacaoId && (
                  <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Anchor className="w-4 h-4"/> Embarcação</span>
                    <span className="text-[15px] font-semibold text-[#1d1d1f] text-right truncate max-w-[60%]">
                      {embarcacoes?.find(e => e.id === transacao.embarcacaoId)?.nome || transacao.embarcacaoId}
                    </span>
                  </div>
                )}
                {transacao.asaasPaymentUrl && (
                  <div className="px-5 py-4 border-b border-black/[0.04] flex flex-col gap-2">
                    <span className="text-[13px] font-medium text-[#86868b] flex items-center gap-2"><Link className="w-4 h-4"/> Link de Pagamento (Asaas)</span>
                    <a href={transacao.asaasPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#0071e3] hover:underline truncate">
                      {transacao.asaasPaymentUrl}
                    </a>
                  </div>
                )}
                <div className="px-5 py-4 border-t border-black/[0.04] flex flex-col gap-1 bg-[#f5f5f7]/50">
                  <span className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Metadados</span>
                  <span className="text-[13px] text-[#86868b]">Criado em: {new Date(transacao.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider px-2">Ações Disponíveis</h3>

                {transacao.status !== 'pago' && (
                  <button
                    onClick={() => handleAction(onBaixaManual)}
                    className="w-full bg-[#008f5d] hover:bg-[#007a4f] text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[15px] font-medium transition-colors cursor-pointer shadow-sm"
                  >
                    <Check className="w-5 h-5" />
                    Realizar Baixa Manual
                  </button>
                )}

                {transacao.tipo === 'receita' && transacao.status !== 'pago' && Boolean(transacao.clienteId) && (
                  <button
                    onClick={() => handleAction(onGerarLink)}
                    className="w-full bg-white hover:bg-[#f5f5f7] text-[#0071e3] border border-[#d2d2d7] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[15px] font-medium transition-colors cursor-pointer shadow-sm"
                  >
                    <Link className="w-5 h-5" />
                    {transacao.asaasPaymentUrl ? 'Copiar / Atualizar Cobrança (Asaas)' : 'Gerar Cobrança (Asaas)'}
                  </button>
                )}

                <button
                  onClick={() => handleAction(onEnviarWhatsApp)}
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[15px] font-medium transition-colors cursor-pointer shadow-sm"
                >
                  <Send className="w-5 h-5" />
                  Compartilhar via WhatsApp
                </button>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.04]">
                  <button
                    onClick={() => handleAction(onEdit)}
                    className="bg-white hover:bg-[#f5f5f7] border border-[#d2d2d7] text-[#1d1d1f] py-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium transition-colors cursor-pointer shadow-sm mt-3"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    className="bg-white hover:bg-[#fef0f0] border border-[#fef0f0] text-[#e30000] py-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium transition-colors cursor-pointer shadow-sm mt-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}