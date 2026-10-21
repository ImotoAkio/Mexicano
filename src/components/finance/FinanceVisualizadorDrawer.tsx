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
    const due = new Date(dateStr + 'T12:00:00');
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
  let statusColor = 'bg-stone-100 text-stone-600 border border-stone-200';

  if (transacao.status === 'pago') {
    statusLabel = transacao.asaasPaymentId ? 'Pago Auto' : 'Pago Manual';
    statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200/70';
  } else if (isOverdue) {
    statusLabel = 'Vencido';
    statusColor = 'bg-rose-50 text-rose-700 border border-rose-200/70';
  } else if (transacao.tipo === 'despesa') {
    statusLabel = 'A Pagar';
    statusColor = 'bg-amber-50 text-amber-700 border border-amber-200/70';
  }

  const handleAction = (actionFn: (t: any) => void) => {
    onClose();
    setTimeout(() => actionFn(transacao), 150);
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
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-[9999]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white z-[10000] shadow-2xl flex flex-col border-l border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-stone-50/70 border-b border-stone-200/70 shrink-0">
              <div>
                <h2 className="text-base font-bold text-stone-900">Detalhes do Registro</h2>
                <p className="text-xs text-stone-500 font-mono">ID: {transacao.id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto subtle-scrollbar p-6 space-y-5 pb-10">

              {/* Highlight Card */}
              <div className="bg-stone-50/70 rounded-2xl p-6 border border-stone-200/80 shadow-xs flex flex-col items-center justify-center text-center">
                <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${transacao.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                </div>
                <div className={`text-3xl font-bold tracking-tight mb-1 tabular-nums ${transacao.tipo === 'receita' ? 'text-emerald-600' : 'text-stone-900'}`}>
                   R$ {totalWithInterest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
                {interest > 0 && (
                  <div className="text-xs font-semibold text-rose-700 mb-2.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Inclui multa e juros de R$ {interest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>
                )}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusColor} ${interest === 0 ? 'mt-1' : ''}`}>
                  {statusLabel}
                </div>
              </div>

              {/* Data List */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden divide-y divide-stone-100">
                <div className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-stone-400"/> Descrição</span>
                  <span className="font-bold text-stone-900 text-right truncate max-w-[60%]">{transacao.descricao}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500 flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-stone-400"/> Vencimento</span>
                  <span className="font-bold text-stone-900 text-right">{new Date(transacao.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                {transacao.dataPagamento && (
                  <div className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-500 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600"/> Pagamento</span>
                    <span className="font-bold text-emerald-700 text-right">{new Date(transacao.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-stone-400"/> Empresa</span>
                  <span className="font-bold text-stone-900 text-right">{transacao.empresa}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-stone-400"/> Plano de Contas</span>
                  <span className="font-bold text-stone-900 text-right max-w-[60%] truncate" title={mapPlanos[transacao.planoContasId] || transacao.categoria}>{mapPlanos[transacao.planoContasId] || transacao.categoria || 'Não definido'}</span>
                </div>
                {transacao.centroCustoId && (
                   <div className="px-4 py-3 flex items-center justify-between text-xs">
                     <span className="font-medium text-stone-500 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-stone-400"/> Centro de Custo</span>
                     <span className="font-bold text-stone-900 text-right">{mapCentros[transacao.centroCustoId] || 'Não definido'}</span>
                   </div>
                )}
                {transacao.clienteId && (
                  <div className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-500 flex items-center gap-2"><User className="w-3.5 h-3.5 text-stone-400"/> Cliente</span>
                    <span className="font-bold text-stone-900 text-right truncate max-w-[60%]">
                      {clientes?.find(c => c.id === transacao.clienteId)?.nome || transacao.clienteId}
                    </span>
                  </div>
                )}
                {transacao.fornecedorId && (
                  <div className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-500 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-stone-400"/> Fornecedor</span>
                    <span className="font-bold text-stone-900 text-right truncate max-w-[60%]">
                      {fornecedores?.find(f => f.id === transacao.fornecedorId)?.nomeFantasia || fornecedores?.find(f => f.id === transacao.fornecedorId)?.razaoSocial || transacao.fornecedorId}
                    </span>
                  </div>
                )}
                {transacao.embarcacaoId && (
                  <div className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-500 flex items-center gap-2"><Anchor className="w-3.5 h-3.5 text-stone-400"/> Embarcação</span>
                    <span className="font-bold text-stone-900 text-right truncate max-w-[60%]">
                      {embarcacoes?.find(e => e.id === transacao.embarcacaoId)?.nome || transacao.embarcacaoId}
                    </span>
                  </div>
                )}
                {transacao.asaasPaymentUrl && (
                  <div className="px-4 py-3 flex flex-col gap-1.5 text-xs">
                    <span className="font-medium text-stone-500 flex items-center gap-2"><Link className="w-3.5 h-3.5 text-sky-600"/> Link de Pagamento (Asaas)</span>
                    <a href={transacao.asaasPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline font-mono truncate">
                      {transacao.asaasPaymentUrl}
                    </a>
                  </div>
                )}
                <div className="px-4 py-2.5 bg-stone-50 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="uppercase tracking-wider font-semibold">Registro</span>
                  <span>{transacao.createdAt ? new Date(transacao.createdAt).toLocaleString('pt-BR') : 'Data não informada'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <h3 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-1">Ações Disponíveis</h3>

                {transacao.status !== 'pago' && (
                  <button
                    onClick={() => handleAction(onBaixaManual)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    Realizar Baixa Manual
                  </button>
                )}

                {transacao.tipo === 'receita' && transacao.status !== 'pago' && Boolean(transacao.clienteId) && (
                  <button
                    onClick={() => handleAction(onGerarLink)}
                    className="w-full bg-white hover:bg-stone-50 text-sky-600 border border-stone-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Link className="w-4 h-4" />
                    {transacao.asaasPaymentUrl ? 'Copiar / Atualizar Cobrança (Asaas)' : 'Gerar Cobrança (Asaas)'}
                  </button>
                )}

                <button
                  onClick={() => handleAction(onEnviarWhatsApp)}
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  Compartilhar via WhatsApp
                </button>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-200">
                  <button
                    onClick={() => handleAction(onEdit)}
                    className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
