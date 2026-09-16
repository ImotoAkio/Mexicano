import React from 'react';
import {
  Droplets,
  Check,
  Clock,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  FileCheck,
  User as UserIcon,
} from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';
import { getFuelPrice } from '../../utils/constants';

export interface FuelRecordsTabProps {
  totalDayReservations: any[];
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  handleOpenFuelModal: (reserva: any) => void;
  onOpenAvulsoFuel: () => void;
}

export const FuelRecordsTab: React.FC<FuelRecordsTabProps> = ({
  totalDayReservations,
  getEmbarcacao,
  getCliente,
  handleOpenFuelModal,
  onOpenAvulsoFuel
}) => {
  const dayFuelReservations = totalDayReservations.filter((r: any) => Number(r.abastecimentoLitros) > 0);
  const totalLitersDay = totalDayReservations.reduce((sum: number, r: any) => sum + (Number(r.abastecimentoLitros) || 0), 0);

  return (
    <main className="flex-1 p-4 max-w-7xl mx-auto w-full pb-24 space-y-4">
      {/* KPI Summary Card - Volume de Combustível em Litros */}
      <div className="bg-[#0A1024] rounded-2xl p-5 text-white flex items-center justify-between shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VOLUME TOTAL HOJE</span>
            <p className="text-2xl font-black text-white">
              {totalLitersDay.toFixed(1)} <span className="text-blue-400">Litros</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EMBARCAÇÕES ABASTECIDAS</span>
          <p className="text-xl font-black text-white font-mono">
            {dayFuelReservations.length} <span className="text-xs font-semibold text-slate-400">{dayFuelReservations.length === 1 ? 'registro' : 'registros'}</span>
          </p>
        </div>
      </div>

      <button
        onClick={onOpenAvulsoFuel}
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
      >
        <Droplets className="w-5 h-5 fill-current" />
        Novo Abastecimento
      </button>

      {/* Lançamentos do Dia */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">LANÇAMENTOS DO DIA</h3>

        {dayFuelReservations.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
            <Droplets className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
            <p className="text-xs text-slate-500 font-medium">Nenhum abastecimento registrado hoje.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayFuelReservations.map((reserva: any) => {
              const boat = getEmbarcacao(reserva.embarcacaoId);
              const client = getCliente(reserva.clienteId);
              const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || '99';
              const litros = Number(reserva.abastecimentoLitros) || 0;

              const isCobrado = reserva.abastecimentoStatusCobranca === 'pago';
              const pm = (reserva.abastecimentoFormaPagamento || 'pix').toLowerCase();
              const unitPrice = getFuelPrice(pm);
              const valor = reserva.abastecimentoValorTotal || (litros * unitPrice);

              return (
                <div
                  key={reserva.id}
                  className={`bg-white border rounded-2xl p-3.5 shadow-xs transition-all ${
                    isCobrado ? 'border-l-4 border-l-emerald-600 border-slate-200' : 'border-l-4 border-l-amber-400 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isCobrado
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                          : 'bg-amber-50 border border-amber-200 text-amber-600'
                      }`}>
                        {isCobrado ? <Check className="w-5 h-5 stroke-[3]" /> : <Clock className="w-4 h-4 stroke-[2.5]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight uppercase">
                            {boat ? getBoatCode(boat) : (reserva.barcoNome || 'Embarcação')}
                          </h4>
                          {boat && (
                            <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                              #{boatNumber}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCobrado
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isCobrado ? 'COBRADO' : 'PENDENTE'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-blue-600 uppercase mt-0.5">
                          {client?.nome || reserva.clienteNome || 'Cliente'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                          {pm === 'dinheiro' && (
                            <span className="bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-lg font-black text-emerald-900 flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-emerald-700" />
                              <span>💵 Dinheiro (Caixa Físico)</span>
                            </span>
                          )}
                          {pm === 'pix' && (
                            <span className="bg-cyan-100/80 border border-cyan-300 px-2 py-0.5 rounded-lg font-black text-cyan-900 flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-cyan-700" />
                              <span>📱 PIX (Conta)</span>
                            </span>
                          )}
                          {pm === 'cartao_credito' && (
                            <span className="bg-blue-100/80 border border-blue-300 px-2 py-0.5 rounded-lg font-black text-blue-900 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-blue-700" />
                              <span>💳 Cartão Crédito</span>
                            </span>
                          )}
                          {pm === 'cartao_debito' && (
                            <span className="bg-blue-100/80 border border-blue-300 px-2 py-0.5 rounded-lg font-black text-blue-900 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-blue-700" />
                              <span>💳 Cartão Débito</span>
                            </span>
                          )}
                          {pm === 'faturado' && (
                            <span className="bg-purple-100/80 border border-purple-300 px-2 py-0.5 rounded-lg font-black text-purple-900 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-purple-700" />
                              <span>🏢 Faturado Admin</span>
                            </span>
                          )}

                          {reserva.abastecimentoComprovanteUrl && (
                            <a
                              href={reserva.abastecimentoComprovanteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-bold hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>Comprovante</span>
                            </a>
                          )}

                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span>Por: <strong>{reserva.abastecimentoOperador || reserva.operadorChegada || 'Marinheiro'}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-blue-600 font-mono block">
                        {litros} L
                      </span>
                      {Number(valor) > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          R$ {Number(valor).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenFuelModal(reserva)}
                        className={`mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1 ${
                          isCobrado
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isCobrado ? 'Alterar' : 'Resolver'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
