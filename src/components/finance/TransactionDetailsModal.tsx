import React from 'react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../../types';
import { XCircle, Edit, Trash2, CheckCircle, Upload, AlertCircle, Calendar, FileText, Check, ExternalLink, Copy, Download } from 'lucide-react';

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
  
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyLink = () => {
    if (!transacao.comprovante) return;
    const fullUrl = transacao.comprovante.startsWith('http') 
      ? transacao.comprovante 
      : `${window.location.origin}${transacao.comprovante}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const [copiedImageStatus, setCopiedImageStatus] = React.useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopyImageToClipboard = async () => {
    if (!transacao.comprovante) return;
    setCopiedImageStatus('copying');
    try {
      const imgUrl = transacao.comprovante.startsWith('http') 
        ? transacao.comprovante 
        : `${window.location.origin}${transacao.comprovante}`;

      const response = await fetch(imgUrl);
      const blob = await response.blob();
      
      if (blob.type === 'application/pdf') {
        alert("Arquivos PDF não podem ser copiados como imagem direta. Use 'Copiar Link' ou 'Baixar'.");
        setCopiedImageStatus('error');
        setTimeout(() => setCopiedImageStatus('idle'), 2000);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(blob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            setCopiedImageStatus('error');
            setTimeout(() => setCopiedImageStatus('idle'), 2000);
            return;
          }
          try {
            const ClipboardItemClass = (window as any).ClipboardItem;
            if (ClipboardItemClass) {
              navigator.clipboard.write([
                new ClipboardItemClass({
                  [pngBlob.type]: pngBlob
                })
              ]).then(() => {
                setCopiedImageStatus('copied');
                setTimeout(() => setCopiedImageStatus('idle'), 2000);
              }).catch((err) => {
                console.error("Clipboard write error:", err);
                setCopiedImageStatus('error');
                setTimeout(() => setCopiedImageStatus('idle'), 2000);
              });
            } else {
              throw new Error("ClipboardItem not supported");
            }
          } catch (err) {
            console.error("Clipboard write error:", err);
            setCopiedImageStatus('error');
            setTimeout(() => setCopiedImageStatus('idle'), 2000);
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        setCopiedImageStatus('error');
        setTimeout(() => setCopiedImageStatus('idle'), 2000);
      };
    } catch (err) {
      console.error("Copy image error:", err);
      setCopiedImageStatus('error');
      setTimeout(() => setCopiedImageStatus('idle'), 2000);
    }
  };

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
  const hasComprovante = !!transacao.comprovante;  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Left Side: Details */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100">
          
          {/* Header - Fixed */}
          <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Detalhes do Lançamento</h3>
              <p className="text-slate-500 text-[10px] font-medium mt-0.5">ID: {transacao.id}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto subtle-scrollbar p-4 space-y-4">
            {/* Value & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                <p className={`text-2xl font-black tracking-tight ${transacao.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {transacao.tipo === 'receita' ? '+' : '-'}{formatCurrency(transacao.valor)}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                {getStatusBadge(transacao.status)}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm">
                  {transacao.tipo}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Categoria</p>
                <p className="text-slate-800 text-sm font-semibold">{transacao.categoria}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Vencimento</p>
                <p className="text-slate-800 text-sm font-semibold">{new Date(transacao.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              {transacao.dataPagamento && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Data de Pagamento</p>
                  <p className="text-slate-800 text-sm font-semibold">{new Date(transacao.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {cliente && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cliente Vinculado</p>
                  <p className="text-indigo-600 text-sm font-bold">{cliente.nome}</p>
                </div>
              )}
              {embarcacao && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Embarcação Vinculada</p>
                  <p className="text-slate-800 text-sm font-semibold">{embarcacao.nome}</p>
                </div>
              )}
              {transacao.descricao && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Descrição</p>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100/60 leading-relaxed text-xs">
                    {transacao.descricao}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions - Sticky */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Ações Disponíveis</h4>
            <div className="flex flex-wrap gap-2">
              {transacao.status === 'aguardando_aprovacao' && (
                <button 
                  onClick={() => { onApprove(); onClose(); }}
                  className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" /> Aprovar Lançamento
                </button>
              )}

              {isUnpaid && transacao.status !== 'aguardando_aprovacao' && (
                <button 
                  onClick={() => { onConfirmPayment(); onClose(); }}
                  className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> Confirmar Baixa
                </button>
              )}

              <button 
                onClick={() => { onEdit(); onClose(); }}
                className="flex-1 min-w-[80px] px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Edit className="w-3 h-3 text-slate-400" /> Editar
              </button>
              
              <button 
                onClick={() => { onDelete(); onClose(); }}
                className="flex-1 min-w-[80px] px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Receipt Preview */}
        <div className="w-full md:w-[320px] bg-slate-50 flex flex-col p-4 border-t md:border-t-0 md:border-l border-slate-200 shrink-0">
          <div className="w-full flex items-center justify-between mb-3 shrink-0">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprovante</h4>
            {hasComprovante && (
              <div className="flex items-center gap-2.5">
                {transacao.comprovante?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                  <button 
                    onClick={handleCopyImageToClipboard}
                    className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50"
                    disabled={copiedImageStatus === 'copying'}
                  >
                    <Copy className="w-3 h-3" /> {
                      copiedImageStatus === 'copying' ? 'Copiando...' :
                      copiedImageStatus === 'copied' ? 'Copiado!' :
                      copiedImageStatus === 'error' ? 'Erro' : 'Copiar'
                    }
                  </button>
                ) : (
                  <button 
                    onClick={handleCopyLink}
                    className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
                  >
                    <Copy className="w-3 h-3" /> {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                )}
                <a 
                  href={transacao.comprovante}
                  download={`comprovante_${transacao.id}`}
                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-0.5"
                >
                  <Download className="w-3 h-3" /> Baixar
                </a>
                <a 
                  href={transacao.comprovante}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-0.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Original
                </a>
              </div>
            )}
          </div>
          
          <div className="w-full flex-1 min-h-[180px] md:min-h-0 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-3 bg-white relative overflow-hidden group">
            {hasComprovante ? (
              transacao.comprovante?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img 
                  src={transacao.comprovante} 
                  alt="Comprovante" 
                  className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => window.open(transacao.comprovante, '_blank')}
                />
              ) : (
                <div className="text-center flex flex-col items-center p-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Documento Anexado</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Formato não suporta pré-visualização</p>
                </div>
              )
            ) : (
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Nenhum comprovante</p>
              </div>
            )}
            
            {/* Upload Overlay */}
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center transition-opacity ${hasComprovante ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} cursor-pointer`}>
              <label className="cursor-pointer text-center flex flex-col items-center w-full h-full justify-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg mb-1.5">
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <span className="text-white font-bold text-xs shadow-sm">{hasComprovante ? 'Atualizar' : 'Anexar Documento'}</span>
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
