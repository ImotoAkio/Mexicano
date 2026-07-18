import React, { useState } from 'react';
import { X, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';

interface ClientCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  onSuccess: () => void;
}

export default function ClientCheckinModal({ isOpen, onClose, reservation, onSuccess }: ClientCheckinModalProps) {
  const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('17:00');
  const [pessoasABordo, setPessoasABordo] = useState('2');
  const [destino, setDestino] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          pessoasABordo,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#151515] to-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-light text-white tracking-wide">Confirmar Reserva</h2>
            <p className="text-xs text-[#B69D74] uppercase tracking-widest mt-1">Dados para NORMAM</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="checkin-form" onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">Prev. Saída</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="time" 
                    required
                    value={previsaoSaida}
                    onChange={(e) => setPrevisaoSaida(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">Prev. Chegada</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="time" 
                    required
                    value={previsaoChegada}
                    onChange={(e) => setPrevisaoChegada(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">Pessoas a Bordo</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="number" 
                  min="1"
                  required
                  value={pessoasABordo}
                  onChange={(e) => setPessoasABordo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all" 
                  placeholder="Incluindo marinheiro"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">Destino Previsto</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                <textarea 
                  required
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all resize-none"
                  placeholder="Ex: Praia do Dentista, Ilha de Cataguases..."
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-white/5 shrink-0">
          <button 
            type="submit"
            form="checkin-form"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#B69D74] hover:bg-[#a08a65] disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-xl font-bold uppercase tracking-widest transition-all"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirmar e Check-in
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
