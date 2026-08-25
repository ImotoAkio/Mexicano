import React from 'react';
import {
  Ship,
  User as UserIcon,
  Navigation,
  Anchor,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight
} from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface OperationsTabProps {
  reservasDoDia: any[];
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  selectedDate: string;
  formatDisplayDate: (date: string) => string;

  onChecklistDescida: (reserva: any) => void;
  onMarcarSaida: (reserva: any) => void;
  onChegadaEAbastecimento: (reserva: any) => void;
  onChecklistSubida: (reserva: any) => void;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({
  reservasDoDia,
  getEmbarcacao,
  getCliente,
  selectedDate,
  formatDisplayDate,
  onChecklistDescida,
  onMarcarSaida,
  onChegadaEAbastecimento,
  onChecklistSubida
}) => {
  if (reservasDoDia.length === 0) {
    return (
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-3 pb-24">
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Ship className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-slate-700">Nenhum agendamento encontrado</h3>
          <p className="text-xs text-slate-500">Nenhum registro nesta categoria para {formatDisplayDate(selectedDate)}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-3 pb-24">
      <div className="space-y-3">
        {reservasDoDia.map((reserva: any) => {
          const boat = getEmbarcacao(reserva.embarcacaoId);
          const client = getCliente(reserva.clienteId);

          const isGuardado = reserva.statusMarina === 'guardada' || reserva.statusOperacional === 'guardado';
          const isChegada = reserva.statusMarina === 'chegada' || reserva.statusOperacional === 'retornou';
          const isPronto = reserva.statusMarina === 'pronta' || reserva.statusOperacional === 'pronto_na_agua' || (reserva.horaDescida && !reserva.horaSubida && !isGuardado && !isChegada);
          const isSaidaMar = !!reserva.horaSaida;
          const isConfirmado = !isGuardado && !isChegada && !isPronto && (reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada');

          const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || 'S/N';

          return (
            <div
              key={reserva.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden space-y-3"
            >
              {/* Left vertical status indicator */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                isGuardado ? 'bg-emerald-500' : isChegada ? 'bg-amber-500' : isPronto ? 'bg-cyan-500' : isConfirmado ? 'bg-indigo-500' : 'bg-blue-600'
              }`} />

              {/* Card Header */}
              <div className="pl-1 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight uppercase">
                      {boat ? getBoatCode(boat) : (reserva.barcoNome || 'Embarcação')}
                    </h3>
                    <span className="bg-slate-900 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
                      #{boatNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1 mt-1">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[240px]">{client?.nome || reserva.clienteNome || 'Cliente'}</span>
                  </p>
                </div>

                {/* Status Badge */}
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                  isGuardado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  isChegada ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  isPronto ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  isConfirmado ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {isGuardado ? 'Guardado' : isChegada ? 'Chegou Píer' : isPronto ? 'Na Água' : isConfirmado ? 'Confirmado' : 'Agendado'}
                </span>
              </div>

              {/* Prev Saida & Prev Chegada Box */}
              <div className="pl-1">
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREV. SAÍDA</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {reserva.previsaoSaida || 'Não informada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREV. CHEGADA</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {reserva.previsaoChegada || 'Não informada'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                  </div>
                </div>
              </div>

              {/* Giant Touch Buttons */}
              <div className="pl-1 space-y-2 pt-1">
                {!isPronto && !isChegada && !isGuardado && (
                  <button
                    onClick={() => onChecklistDescida(reserva)}
                    className="w-full py-4 md:py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm md:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ArrowDownCircle className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Checklist Descida Píer</span>
                  </button>
                )}

                {isPronto && !isSaidaMar && (
                  <button
                    onClick={() => onMarcarSaida(reserva)}
                    className="w-full py-4 md:py-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-sm md:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Navigation className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Marcar Saída / Partida</span>
                  </button>
                )}

                {isPronto && (
                  <button
                    onClick={() => onChegadaEAbastecimento(reserva)}
                    className="w-full py-4 md:py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm md:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Anchor className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Chegou! Iniciar Retorno</span>
                  </button>
                )}

                {isChegada && (
                  <button
                    onClick={() => onChecklistSubida(reserva)}
                    className="w-full py-4 md:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm md:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ArrowUpCircle className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Checklist Subida / Vaga</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
