import React from 'react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../../types';
import { XCircle, Edit, Trash2, CheckCircle, Upload, AlertCircle, Calendar, FileText, Check, ExternalLink, Copy, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  onGenerateAsaas?: (billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => Promise<void>;
  onTransferToAdmin?: () => void;
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
  isUploading,
  onGenerateAsaas
}: TransactionDetailsModalProps) {
  
  
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      if (!clipboardData) return;
      
      const files = clipboardData.files;
      const items = clipboardData.items;
      
      let fileToUpload: File | null = null;
      
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.indexOf('image') !== -1 || files[i].type.indexOf('pdf') !== -1) {
            fileToUpload = files[i];
            break;
          }
        }
      } else if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
            fileToUpload = items[i].getAsFile();
            break;
          }
        }
      }

      if (fileToUpload && !isUploading) {
        e.preventDefault();
        e.stopPropagation();
        const fakeEvent = { target: { files: [fileToUpload] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        onUploadReceipt(fakeEvent);
      }
    };
    
    // Anexando ao documento inteiro na fase de captura para não perder o evento
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, [onUploadReceipt, isUploading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf') && !isUploading) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onUploadReceipt(fakeEvent);
    }
  };


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
      case 'lancado': 
        return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Lançado</span>;
      case 'vencido': 
        return <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> Vencido</span>;
      case 'cancelado': 
        return <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Cancelado</span>;
      default: return null;
    }
  };

  const isUnpaid = transacao.status === 'lancado' || transacao.status === 'vencido';
  const hasComprovante = !!transacao.comprovante;  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Drawer */}
      <div 
        className={`relative flex flex-col w-full max-w-md h-full bg-white shadow-2xl pointer-events-auto border-l border-black/[0.04] overflow-hidden animate-in slide-in-from-right duration-300 ${isDragging ? 'ring-2 ring-inset ring-indigo-500 opacity-95' : ''}`}
        onClick={e => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col h-full overflow-hidden">
        
        
        <div className="flex-1 flex flex-col overflow-hidden">
          
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

            {/* Asaas Integration Section */}
            {transacao.tipo === 'receita' && cliente && (
              <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Integração Asaas</h4>
                    <p className="text-[10px] text-indigo-600 font-medium">Gateway de Pagamentos</p>
                  </div>
                  {transacao.asaasPaymentUrl ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase self-start sm:self-auto">Cobrança Ativa</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase self-start sm:self-auto">Sem Cobrança</span>
                  )}
                </div>

                {transacao.asaasPaymentUrl ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a 
                        href={transacao.asaasPaymentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Link de Pagamento
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(transacao.asaasPaymentUrl || '');
                          alert("Link de pagamento copiado!");
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-400" /> Copiar Link
                      </button>
                    </div>
                    {transacao.asaasPaymentId && (
                      <p className="text-[9px] text-slate-400 font-semibold select-all">Asaas ID: {transacao.asaasPaymentId}</p>
                    )}
                  </div>
                ) : (
                  isUnpaid && onGenerateAsaas && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500">Escolha uma forma de pagamento para gerar a cobrança no Asaas:</p>
                      <div className="flex flex-wrap gap-2">

                        <button
                          onClick={() => {
                            if (confirm("Gerar cobrança via PIX?")) {
                              onGenerateAsaas("PIX");
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                        >
                          ⚡ Gerar PIX
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Gerar cobrança via Boleto Bancário?")) {
                              onGenerateAsaas("BOLETO");
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                        >
                          📄 Gerar Boleto
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Gerar cobrança via Cartão de Crédito?")) {
                              onGenerateAsaas("CREDIT_CARD");
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                        >
                          💳 Gerar Cartão
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          
            {/* Receipt Preview inside the scrollable area */}
            <div className="mt-6 flex flex-col">
              <div className="w-full flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprovante</h4>
                {hasComprovante && (
                  <div className="flex items-center gap-2.5">
                    {transacao.comprovante?.match(/.(jpeg|jpg|gif|png|webp)$/i) ? (
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
                        <Copy className="w-3 h-3" /> {copiedLink ? 'Copiado!' : 'Copiar'}
                      </button>
                    )}
                    <a 
                      href={transacao.comprovante}
                      download={`comprovante_${transacao.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Download className="w-3 h-3" /> Baixar
                    </a>
                  </div>
                )}
              </div>
              
              <div className="w-full h-[180px] border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-2 bg-slate-50 relative overflow-hidden group">
                {hasComprovante ? (
                  transacao.comprovante?.match(/.(jpeg|jpg|gif|png|webp)$/i) ? (
                    <img 
                      src={transacao.comprovante} 
                      alt="Comprovante" 
                      className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                      /* handled via overlay */
                    />
                  ) : (
                    <div className="text-center flex flex-col items-center p-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">Documento Anexado</p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[11px] font-semibold text-slate-500">Nenhum comprovante</p>
                  </div>
                )}
                
                {/* Upload Overlay when NO Comprovante exists or dragging */}
                {(!hasComprovante || isDragging) && (
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
                    <label className="cursor-pointer text-center flex flex-col items-center w-full h-full justify-center">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg mb-1.5 transition-transform hover:scale-110">
                        {isUploading ? (
                          <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        ) : (
                          <Upload className="w-3 h-3 text-indigo-600" />
                        )}
                      </div>
                      <span className="text-slate-600 font-bold text-[10px] shadow-sm tracking-wide">
                        {isDragging ? 'Solte aqui para anexar' : 'Anexar Documento'}
                      </span>
                      <span className="text-slate-400 font-medium text-[8px] mt-0.5">Clique, Cole (Ctrl+V) ou Arraste</span>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="hidden" 
                        onChange={onUploadReceipt}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
                
                {/* View/Edit Overlay when Comprovante EXISTS */}
                {hasComprovante && !isDragging && (
                  <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => transacao.comprovante && window.open(transacao.comprovante, '_blank')}
                  >
                    <div className="flex flex-col items-center">
                       <div className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center shadow-lg mb-1.5 transition-all text-white backdrop-blur-md cursor-pointer">
                         <ExternalLink className="w-4 h-4" />
                       </div>
                       <span className="text-white font-bold text-[9px] tracking-widest uppercase">Visualizar</span>
                    </div>

                    <label className="flex flex-col items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                       <div className="w-10 h-10 bg-white hover:bg-slate-50 rounded-full flex items-center justify-center shadow-lg mb-1.5 transition-all text-indigo-600">
                         {isUploading ? (
                           <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                         ) : (
                           <Upload className="w-4 h-4" />
                         )}
                       </div>
                       <span className="text-white font-bold text-[9px] tracking-widest uppercase">Atualizar</span>
                       <input 
                         type="file" 
                         accept="image/*,.pdf" 
                         className="hidden" 
                         onChange={onUploadReceipt}
                         disabled={isUploading}
                       />
                    </label>
                  </div>
                )}
              </div>
            </div>

          {/* Footer Actions - Sticky */}

          <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Ações Disponíveis</h4>
            <div className="flex flex-wrap gap-2">
              {isUnpaid && (
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

                </div>
      </div>
    </div>
  );
}
