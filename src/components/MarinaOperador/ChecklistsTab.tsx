import React from 'react';
import {
  ClipboardList,
  Camera,
  Ship,
  Check,
  Droplets,
  ChevronRight
} from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface ChecklistsTabProps {
  totalDayReservations: any[];
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  onOpenAvulsoModal: () => void;
  onViewChecklist: (reserva: any) => void;
  selectedDate?: string;
  formatDisplayDate?: (date: string) => string;
}

export const ChecklistsTab: React.FC<ChecklistsTabProps> = ({
  totalDayReservations,
  getEmbarcacao,
  getCliente,
  onOpenAvulsoModal,
  onViewChecklist,
  selectedDate,
  formatDisplayDate
}) => {
  return (
    <main className="flex-1 p-4 max-w-7xl mx-auto w-full pb-24 space-y-3">
      {/* Top Control Bar with Search Select Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>CONSULTA DE CHECKLISTS</span>
            {selectedDate && formatDisplayDate && (
              <span className="text-[10px] font-bold text-slate-500 lowercase">
                · {formatDisplayDate(selectedDate)}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Toque em qualquer embarcação para consultar ou realizar fotos do checklist
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAvulsoModal}
          className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>+ Realizar Checklist</span>
        </button>
      </div>

      {/* List of Reservations / Checklists */}
      {totalDayReservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-slate-700">
            Nenhum agendamento {selectedDate && formatDisplayDate ? `em ${formatDisplayDate(selectedDate)}` : 'nesta data'}
          </h3>
          <p className="text-xs text-slate-500">
            Você pode clicar no botão "+ Realizar Checklist" acima para selecionar qualquer embarcação da marina.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {totalDayReservations.map((reserva: any) => {
            const boat = getEmbarcacao(reserva.embarcacaoId);
            const client = getCliente(reserva.clienteId);
            const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || 'S/N';

            // Verifique se tem fotos (as propriedades podem variar dependendo da implementação)
            const fotosChecklistDescida = reserva.fotosChecklistDescida || (reserva.checklists?.find((c:any) => c.tipo === 'descida')?.fotos || {});
            const fotosChecklistSubida = reserva.fotosChecklistSubida || (reserva.checklists?.find((c:any) => c.tipo === 'subida')?.fotos || {});

            const isCancelado = reserva.status === 'cancelado' || reserva.statusMarina === 'cancelada';
            const hasDescidaFotos = Object.keys(fotosChecklistDescida).length > 0;
            const hasSubidaFotos = Object.keys(fotosChecklistSubida).length > 0;
            const litrosAbastecidos = Number(reserva.abastecimentoLitros) || 0;

            return (
              <div
                key={reserva.id}
                onClick={() => onViewChecklist(reserva)}
                className={`border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all cursor-pointer group gap-3 ${
                  isCancelado
                    ? 'bg-rose-50/25 border-rose-200 hover:border-rose-300'
                    : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isCancelado
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  }`}>
                    <Ship className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className={`font-extrabold text-sm leading-tight uppercase ${isCancelado ? 'text-rose-950' : 'text-slate-900'}`}>
                        {boat ? getBoatCode(boat) : (reserva.barcoNome || 'Embarcação')}
                      </h3>
                      <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                        #{boatNumber}
                      </span>
                      {isCancelado && (
                        <span className="bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                          Cancelado
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold uppercase mt-0.5 ${isCancelado ? 'text-rose-600' : 'text-blue-600'}`}>
                      {client?.nome || reserva.clienteNome || 'Cliente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-2 border-t pt-2 sm:border-0 sm:pt-0 border-slate-100">
                  <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
                    <div title="Checklist de Descida" className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasDescidaFotos ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div title="Checklist de Chegada/Subida" className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasSubidaFotos ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div title="Abastecimento Realizado" className={`w-7 h-7 rounded-lg flex items-center justify-center ${litrosAbastecidos > 0 ? 'bg-amber-100 text-amber-700 font-bold border border-amber-200' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>
                      <Droplets className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
