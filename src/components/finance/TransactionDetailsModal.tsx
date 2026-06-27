import React from 'react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../../types';
import { XCircle, Edit, Trash2, CheckCircle, Upload, AlertCircle, Calendar, FileText, Check, ExternalLink } from 'lucide-react';

interface TransactionDetailsModalProps {
  transacao: TransacaoFinanceira;
  cliente?: Cliente;
  embarcacao?: Embarcacao;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onConfirmPayment: () => void;
  onUploadReceipt: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

export default function TransactionDetailsModal({
  transacao,
  cliente,
  embarcacao,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onConfirmPayment,
  onUploadReceipt,
  isUploading
}: TransactionDetailsModalProps) {
  
  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-sm border";
    switch (status) {
      case 'pago': 
        return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Pago</span>;
      case 'pendente': 
        return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Pendente</span>;
      case 'atrasado': 
        return <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> Atrasado</span>;
      case 'aguardando_aprovacao': 
        return <span className={`${base} bg-indigo-50 text-indigo-700 border-indigo-200`}><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Aguardando Aprovação</span>;
      case 'cancelado': 
        return <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Cancelado</span>;
      default: return null;
    }
  };

  const isUnpaid = transacao.status === 'pendente' || transacao.status === 'atrasado' || transacao.status === 'aguardando_aprovacao';
  const hasComprovante = !!transacao.comprovante;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Left Side: Details */}
        <div className="flex-1 flex flex-col overflow-y-auto subtle-scrollbar border-r border-slate-100">
          <div className="p-4 md:p-6 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Detalhes do Lançamento</h3>
              <p className="text-slate-500 text-xs font-medium mt-1">ID: {transacao.id}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 md:p-6 space-y-6">
            {/* Value & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor</p>
                <p className={`text-3xl font-black tracking-tight ${transacao.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {transacao.tipo === 'receita' ? '+' : '-'}{formatCurrency(transacao.valor)}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                {getStatusBadge(transacao.status)}
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  {transacao.tipo}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Categoria</p>
                <p className="text-slate-800 font-semibold">{transacao.categoria}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Vencimento</p>
                <p className="text-slate-800 font-semibold">{new Date(transacao.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              {transacao.dataPagamento && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> Data de Pagamento</p>
                  <p className="text-slate-800 font-semibold">{new Date(transacao.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {cliente && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente Vinculado</p>
                  <p className="text-indigo-600 font-bold">{cliente.nome}</p>
                </div>
              )}
              {embarcacao && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Embarcação Vinculada</p>
                  <p className="text-slate-800 font-semibold">{embarcacao.nome}</p>
                </div>
              )}
              {transacao.descricao && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100/60 leading-relaxed text-sm">
                    {transacao.descricao}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Ações Disponíveis</h4>
              <div className="flex flex-wrap gap-2">
                {transacao.status === 'aguardando_aprovacao' && (
                  <button 
                    onClick={() => { onApprove(); onClose(); }}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar Lançamento
                  </button>
                )}

                {isUnpaid && transacao.status !== 'aguardando_aprovacao' && (
                  <button 
                    onClick={() => { onConfirmPayment(); onClose(); }}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirmar Baixa
                  </button>
                )}

                <button 
                  onClick={() => { onEdit(); onClose(); }}
                  className="flex-1 min-w-[100px] px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" /> Editar
                </button>
                
                <button 
                  onClick={() => { onDelete(); onClose(); }}
                  className="flex-1 min-w-[100px] px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Receipt Preview */}
        <div className="w-full md:w-[350px] bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-200">
          <div className="w-full flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Comprovante</h4>
            {hasComprovante && (
              <a 
                href={transacao.comprovante}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1"
              >
                Abrir Original <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          
          <div className="w-full flex-1 min-h-[200px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-4 bg-white relative overflow-hidden group">
            {hasComprovante ? (
              transacao.comprovante?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img 
                  src={transacao.comprovante} 
                  alt="Comprovante" 
                  className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => window.open(transacao.comprovante, '_blank')}
                />
              ) : (
                <div className="text-center flex flex-col items-center p-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Documento Anexado</p>
                  <p className="text-xs text-slate-400 mt-1">Formato não suporta pré-visualização</p>
                </div>
              )
            ) : (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">Nenhum comprovante anexado</p>
              </div>
            )}
            
            {/* Upload Overlay */}
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center transition-opacity ${hasComprovante ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} cursor-pointer`}>
              <label className="cursor-pointer text-center flex flex-col items-center w-full h-full justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <span className="text-white font-bold text-sm shadow-sm">{hasComprovante ? 'Atualizar Comprovante' : 'Anexar Documento'}</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  className="hidden" 
                  onChange={onUploadReceipt}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
