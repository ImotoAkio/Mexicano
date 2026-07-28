import React, { useState } from 'react';
import { X, CheckCircle2, Clock, MapPin, Users, ChevronRight, ChevronLeft, Plus, Minus, Navigation } from 'lucide-react';

interface ClientCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  onSuccess: () => void;
}

export default function ClientCheckinModal({ isOpen, onClose, reservation, onSuccess }: ClientCheckinModalProps) {
  const [step, setStep] = useState(1);
  const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('17:00');
  const [pessoasABordo, setPessoasABordo] = useState(2);
  const [destino, setDestino] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !reservation) return null;

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1 && previsaoSaida) {
      const now = new Date();
      const [hours, minutes] = previsaoSaida.split(':').map(Number);
      const outputTime = new Date();
      outputTime.setHours(hours, minutes, 0, 0);

      const diffInMinutes = (outputTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffInMinutes >= 0 && diffInMinutes < 40) {
        setErrorMsg('O horário de previsão de saída deve ter pelo menos 40 minutos de antecedência.');
        return;
      }
      if (diffInMinutes < 0) {
        setErrorMsg('O horário de previsão de saída não pode ser no passado.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };
  const handlePrev = () => setStep(prev => prev - 1);

  const incrementPessoas = () => setPessoasABordo(prev => prev + 1);
  const decrementPessoas = () => setPessoasABordo(prev => (prev > 1 ? prev - 1 : 1));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!destino.trim()) {
      setErrorMsg('O destino é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch('/api/client/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: reservation.id,
          previsaoSaida,
          previsaoChegada,
          pessoasABordo: pessoasABordo.toString(),
          destino
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Erro ao confirmar reserva.');
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => {
    return (
      <div className="flex items-center justify-between gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            {step >= s && (
              <div 
                className="absolute inset-0 bg-[#B69D74] transition-all duration-500 ease-out"
                style={{ width: step > s ? '100%' : '100%', transformOrigin: 'left' }}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#151515] to-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 border-b border-white/5 flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-light text-white tracking-wide">Plano de Navegação</h2>
              <p className="text-xs text-[#B69D74] uppercase tracking-widest mt-1">Dados NORMAM</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {renderProgress()}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center min-h-[300px]">
          {errorMsg && (
            <div className="p-4 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[#B69D74]" />
                </div>
                <h3 className="text-xl font-light text-white mb-2">Quando será o passeio?</h3>
                <p className="text-sm text-white/40">Defina o horário de saída e a previsão de retorno.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#B69D74] uppercase tracking-widest mb-2">Horário de Saída</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      required
                      value={previsaoSaida}
                      onChange={(e) => setPrevisaoSaida(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all text-center" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B69D74] uppercase tracking-widest mb-2">Previsão de Retorno</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      required
                      value={previsaoChegada}
                      onChange={(e) => setPrevisaoChegada(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all text-center" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#B69D74]" />
                </div>
                <h3 className="text-xl font-light text-white mb-2">Quem vai embarcar?</h3>
                <p className="text-sm text-white/40">Informe o número total de pessoas a bordo (incluindo você e o marinheiro, se houver).</p>
              </div>

              <div className="flex items-center justify-center gap-6 py-4">
                <button 
                  onClick={decrementPessoas}
                  className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <div className="text-5xl font-light text-white w-20 text-center">
                  {pessoasABordo}
                </div>
                <button 
                  onClick={incrementPessoas}
                  className="w-14 h-14 rounded-full bg-[#B69D74]/10 hover:bg-[#B69D74]/20 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74] transition-colors active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-4">
                  <Navigation className="w-8 h-8 text-[#B69D74]" />
                </div>
                <h3 className="text-xl font-light text-white mb-2">Para onde vamos?</h3>
                <p className="text-sm text-white/40">Descreva o destino previsto para segurança e plano de navegação.</p>
              </div>

              <div>
                <textarea 
                  required
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-lg focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all resize-none text-center placeholder:text-white/20"
                  placeholder="Ex: Ilha Grande, Praia do Dentista..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 shrink-0 flex gap-3">
          {step > 1 && (
            <button 
              onClick={handlePrev}
              disabled={isSubmitting}
              className="px-5 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {step < 3 ? (
            <button 
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#B69D74] hover:bg-[#a08a65] text-slate-900 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
            >
              Próximo
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !destino.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Concluir Check-in
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
