import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, Anchor, Sparkles, 
  ArrowLeft, Check
} from 'lucide-react';

export default function ValidarEmbarquePage() {
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [checkedAtPier, setCheckedAtPier] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    // Ler parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get('ticket') || 'VN-TICKET-OK';
    const resId = params.get('res') || '';
    const barco = params.get('b') || 'M16';
    const cliente = params.get('c') || 'Cotista Vila Náutica';
    const data = params.get('d') || new Date().toLocaleDateString('pt-BR');
    const saida = params.get('s') || '12:00';
    const retorno = params.get('r') || '17:00';
    const destino = params.get('dest') || 'Costeira';
    const pax = params.get('pax') || '1';

    setTicketInfo({
      ticket,
      resId,
      barco,
      cliente,
      data,
      saida,
      retorno,
      destino,
      pax
    });

    const now = new Date();
    setCurrentTimestamp(
      now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );

    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  const handleConfirmPierCheck = () => {
    setCheckedAtPier(true);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-x-hidden font-sans">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-[#B69D74]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Brand Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-4 border-b border-white/[0.08] relative z-10 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#B69D74]/20 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74]">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#B69D74] block font-bold">
              GRUPO VILA NÁUTICA
            </span>
            <h1 className="text-sm font-semibold text-white tracking-wide">
              Validador de Embarque
            </h1>
          </div>
        </div>

        <a 
          href="/"
          className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Início
        </a>
      </div>

      {/* Main Validation Card */}
      <div className="w-full max-w-md relative z-10 space-y-4">

        {/* Verification Status Banner */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-[#0e1713] to-[#0a0f0d] border border-emerald-500/40 rounded-3xl p-6 text-center shadow-[0_15px_40px_rgba(16,185,129,0.2)] relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {isVerifying ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-300">
                Verificando autenticidade do bilhete...
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-400">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400/80 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold uppercase tracking-widest mb-1.5">
                  ● TICKET AUTÊNTICO & VÁLIDO
                </span>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Embarque Autorizado
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Descida ao píer liberada pela Capitania da Marina
                </p>
              </div>

              <div className="pt-2 text-[10px] font-mono text-emerald-400/80 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Validado em {currentTimestamp}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informações Oficiais e Diretas */}
        {ticketInfo && !isVerifying && (
          <div className="bg-[#0f1118] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-[10px] font-mono uppercase text-white/40 tracking-wider">
                Código do Bilhete
              </span>
              <span className="text-xs font-mono font-bold text-[#B69D74] bg-[#B69D74]/10 border border-[#B69D74]/20 px-2.5 py-1 rounded-lg">
                {ticketInfo.ticket}
              </span>
            </div>

            {/* Embarcação e Passageiro */}
            <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3.5">
              <div>
                <span className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                  Embarcação
                </span>
                <span className="text-base font-bold text-[#B69D74] block">
                  {ticketInfo.barco}
                </span>
                <span className="text-[10px] text-white/60">
                  Vila Náutica Fleet
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                  Cotista Titular
                </span>
                <span className="text-sm font-bold text-white block uppercase break-words">
                  {ticketInfo.cliente}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  Check-in Confirmado
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 bg-black/40 border border-white/[0.05] rounded-xl text-xs">
              <span className="text-[9px] uppercase font-mono text-white/40">Data do Passeio</span>
              <span className="font-mono font-bold text-white tracking-wide">{ticketInfo.data}</span>
            </div>

            {/* Informações de Navegação no Validador */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3.5 space-y-2 text-xs">
              <div>
                <span className="text-[8px] uppercase font-mono text-white/40 block">Destino</span>
                <span className="font-medium text-white truncate block">{ticketInfo.destino}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-white/[0.04] text-center">
                <div>
                  <span className="text-[8px] uppercase font-mono text-[#B69D74] block font-bold">Saída</span>
                  <span className="font-mono font-bold text-[#B69D74]">{ticketInfo.saida}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Retorno</span>
                  <span className="font-mono font-bold text-white">{ticketInfo.retorno}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Pessoas</span>
                  <span className="font-mono font-bold text-white">{ticketInfo.pax}</span>
                </div>
              </div>
            </div>

            {/* Ação Operacional do Marinheiro / Fiscal do Píer */}
            <div className="pt-2">
              {checkedAtPier ? (
                <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 font-semibold text-xs uppercase tracking-wider animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Presença no Píer Confirmada!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPierCheck}
                  className="w-full py-3.5 bg-gradient-to-r from-[#B69D74] to-[#cbb28b] hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Confirmar Conferência no Píer
                </button>
              )}
              <span className="text-[10px] text-white/40 text-center block mt-2 font-mono">
                Base Operacional: Marina Flutuante Vila Náutica
              </span>
            </div>

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="w-full max-w-md text-center py-6 text-white/30 text-[10px] font-mono">
        © {new Date().getFullYear()} GRUPO VILA NÁUTICA • SISTEMA DE GESTÃO NÁUTICA
      </div>
    </div>
  );
}
