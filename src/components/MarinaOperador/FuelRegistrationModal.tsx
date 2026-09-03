import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Droplets,
  Clock,
  CheckCircle2,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  Paperclip,
  FileCheck,
  Trash2,
  Loader2
} from 'lucide-react';
import { uploadPhotoToStorage } from '../../utils/checklistStorage';
import { getBoatCode } from '../../utils/boatUtils';

export interface FuelRegistrationData {
  liters: number;
  statusCobranca: 'cobrado' | 'pendente';
  paymentType: 'pix' | 'credit' | 'debit' | 'dinheiro' | 'admin';
  comprovanteUrl: string | null;
}

interface FuelRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservaTarget: any;
  embarcacaoTarget: any;
  onConfirm: (data: FuelRegistrationData) => Promise<void>;
  standaloneMode?: 'embarcacao' | 'avulso';
  avulsoNome?: string;
}

export const FuelRegistrationModal: React.FC<FuelRegistrationModalProps> = ({
  isOpen,
  onClose,
  reservaTarget,
  embarcacaoTarget,
  onConfirm,
  standaloneMode,
  avulsoNome
}) => {
  const [liters, setLiters] = useState<string>('');
  const [statusCobranca, setStatusCobranca] = useState<'cobrado' | 'pendente'>('pendente');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'debit' | 'dinheiro' | 'admin'>('pix');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && standaloneMode === 'avulso') {
      setStatusCobranca('cobrado');
    } else if (isOpen) {
      setStatusCobranca('pendente'); // default rest
    }
  }, [isOpen, standaloneMode]);

  if (!isOpen) return null;

  const embarcacao = embarcacaoTarget || reservaTarget?.embarcacao;
  const cliente = reservaTarget?.cliente || (embarcacaoTarget as any)?.cliente;

  const getPricePerLiter = () => {
    if (paymentType === 'credit') return 10;
    if (paymentType === 'admin') return 13;
    return 9;
  };

  const totalValue = Number(liters || 0) * getPricePerLiter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadPhotoToStorage(file);
      setComprovanteUrl(url);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Falha ao enviar comprovante.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (Number(liters) > 0 && statusCobranca === 'cobrado' && !paymentType) {
      alert('Selecione uma forma de pagamento para cobrança imediata.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        liters: Number(liters || 0),
        statusCobranca,
        paymentType,
        comprovanteUrl
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl mt-auto sm:my-auto flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Droplets className="w-4 h-4 text-cyan-500" />
              <span>Painel de Combustível</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
              {standaloneMode === 'avulso' ? (
                <>Visitante • {avulsoNome || 'Não Identificado'}</>
              ) : (
                <>{embarcacao ? getBoatCode(embarcacao) : (reservaTarget?.barcoNome || 'Embarcação')} • {cliente?.nome || reservaTarget?.clienteNome || 'Cliente'}</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-200 rounded-xl cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">

          {/* Litros Input Zone */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Litros Fornecidos *</label>

            <input
              type="number"
              step="0.1"
              placeholder="0 (Deixe em branco para não abastecer)"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-2xl text-center font-black text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-sm font-mono placeholder:text-slate-300 placeholder:text-sm"
            />

            <div className="grid grid-cols-4 gap-2">
              {[20, 50, 100, 200].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLiters(val.toString())}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  +{val}L
                </button>
              ))}
            </div>
          </div>

          {Number(liters) > 0 && (
            <div className="animate-in slide-in-from-top-4 space-y-6">

              {/* Payment Status Segmented Control */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Tratamento Financeiro</label>
                {standaloneMode === 'avulso' ? (
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    Pagamento Imediato Obrigatório
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStatusCobranca('pendente')}
                      className={`py-3 px-3 rounded-lg text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 font-black ${
                        statusCobranca === 'pendente'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>PENDENTE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusCobranca('cobrado')}
                      className={`py-3 px-3 rounded-lg text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 font-black ${
                        statusCobranca === 'cobrado'
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-cyan-700 border border-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>COBRADO AGORA</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Pendente Mode */}
              {statusCobranca === 'pendente' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Cobrança Futura</h4>
                    <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                      O abastecimento de <strong>{liters}L</strong> será registrado no sistema e ficará como pendente para que o financeiro cobre posteriormente.
                    </p>
                  </div>
                </div>
              )}

              {/* Cobrado Mode */}
              {statusCobranca === 'cobrado' && (
                <div className="space-y-4 animate-in fade-in">

                  {/* Payment Type Grid */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Forma de Recebimento</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: 'dinheiro', label: 'Dinheiro (Caixa)', icon: Banknote, price: 'R$ 9,00' },
                        { id: 'pix', label: 'PIX (Digital)', icon: QrCode, price: 'R$ 9,00' },
                        { id: 'credit', label: 'C. Crédito', icon: CreditCard, price: 'R$ 10,00' },
                        { id: 'debit', label: 'C. Débito', icon: CreditCard, price: 'R$ 9,00' },
                        { id: 'admin', label: 'Administradora', icon: Building2, price: 'R$ 13,00' },
                      ].map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = paymentType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPaymentType(item.id as any)}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                              isSelected
                                ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20 text-cyan-950 font-black'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 font-bold'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg w-fit ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[11px] block">{item.label}</span>
                              <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-cyan-700 font-bold' : 'text-slate-400 font-semibold'}`}>Base: {item.price}/L</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total (Imediato)</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {Number(liters)}L × R$ {getPricePerLiter().toFixed(2)}
                      </span>
                    </div>
                    <span className="font-black font-mono text-xl text-white">
                      R$ {totalValue.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* Receipt Upload */}
                  <div className="pt-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />

                    {!comprovanteUrl ? (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-2 text-slate-600 transition-all font-bold text-xs uppercase tracking-wider"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 text-cyan-600 animate-spin" />
                            <span className="text-cyan-700">Enviando Comprovante...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-4 h-4 text-slate-400" />
                            <span>Anexar Comprovante (Opcional)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <FileCheck className="w-5 h-5 text-emerald-600" />
                          <span className="text-xs font-bold uppercase">Comprovante Anexado</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setComprovanteUrl(null)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer Action */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || Number(liters) < 0}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              Number(liters) > 0 ? (
                <span>Confirmar Inclusão</span>
              ) : (
                <span>Concluir sem Abastecer</span>
              )
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
