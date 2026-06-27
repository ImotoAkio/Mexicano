import React from 'react';
import { Reserva } from '../../types';
import { boatDB, clientDB } from '../../db';
import { Anchor, Wrench, AlertTriangle, RefreshCw, FileDown, ClipboardList, Trash2 } from 'lucide-react';

interface ScheduleCardProps {
  res: Reserva;
  gcalConnected: boolean;
  onSync: (resId: string) => void;
  onGeneratePDF: (res: Reserva) => void;
  onOpenStatus: (res: Reserva) => void;
  onDelete: (res: Reserva) => void;
}

export default function ScheduleCard({
  res,
  gcalConnected,
  onSync,
  onGeneratePDF,
  onOpenStatus,
  onDelete
}: ScheduleCardProps) {
  const boat = boatDB.getById(res.embarcacaoId);
  const client = clientDB.getById(res.clienteId);
  
  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
  const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
  const isJet = boatType === 'Jetski';
  
  let ownerName = client ? client.nome : 'Desconhecido';
  if (!client && res.observações?.includes('[NOME_RECUPERADO:')) {
    const match = res.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
    if (match) ownerName = match[1].trim();
  }
  const clientPhone = client?.telefone || '';
  
  const isClosed = false;
  const isCanceled = res.status === 'cancelado';
  const isConfirmed = res.status === 'confirmado';
  const currentStatus = isConfirmed ? 'Confirmado' : isCanceled ? 'Cancelado' : 'Agendado';
  
  const summary = `${boatCode} - ${ownerName}`;

  return (
    <div 
      className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 ${
        isClosed || isCanceled ? 'bg-rose-50/10 opacity-85' : ''
      }`}
    >
      <div className="flex items-start space-x-4 flex-1 min-w-0">
        <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border select-none ${
          isClosed || isCanceled 
            ? 'bg-rose-50 border-rose-100 text-rose-500' 
            : isConfirmed
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-semibold'
              : isJet 
                ? 'bg-amber-50 border-amber-100 text-amber-600' 
                : 'bg-sky-50 border-sky-100 text-sky-600'
        }`}>
          {boatCode ? (
            <div className="flex flex-col items-center justify-center leading-none">
              {isJet ? (
                <span className="text-[8px] font-extrabold leading-none tracking-tighter opacity-75 mb-0.5 font-mono uppercase">JET</span>
              ) : (
                <Anchor className="w-3 h-3 opacity-75 mb-0.5" />
              )}
              <span className="text-[11px] font-black font-mono tracking-tighter leading-none">
                {boatCode}
              </span>
            </div>
          ) : (
            <Anchor className="w-4.5 h-4.5" />
          )}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-xs font-bold uppercase tracking-wide truncate ${isCanceled ? 'line-through text-slate-400' : 'text-slate-950'}`}>
              {summary}
            </span>
            
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-sans uppercase flex items-center gap-1 border ${
              isConfirmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-extrabold'
                : isCanceled
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isConfirmed ? 'bg-emerald-500' : isCanceled ? 'bg-rose-500' : 'bg-slate-400'
              }`} />
              {currentStatus}
            </span>

            {boat?.emManutencao && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs shrink-0">
                <Wrench className="w-2.5 h-2.5 mr-0.5" />
                Manutenção
              </span>
            )}

            {client?.statusFinanceiro === 'inadimplente' && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center shadow-xs shrink-0" title={client.observacoesFinanceiras || 'Inadimplente'}>
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                {client.observacoesFinanceiras ? 'Pendente' : 'Inadimplente'}
              </span>
            )}
          </div>

          {isConfirmed && clientPhone && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs w-full">
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Proprietário:</span> 
                <strong className="text-slate-700 font-semibold truncate">{ownerName}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Contato:</span> 
                <strong className="text-slate-700 font-semibold truncate">{clientPhone}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Período:</span> 
                <strong className="text-slate-700 font-semibold truncate">{res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde'}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Destino:</span> 
                <strong className="text-slate-700 font-semibold truncate">{res.destino || 'N/A'}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Pessoas a Bordo:</span> 
                <strong className="text-slate-700 font-semibold truncate">{res.pessoasABordo || 'N/A'}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Saída:</span> 
                <strong className="text-slate-700 font-semibold truncate">{res.previsaoSaida || '08:00'}</strong>
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Retorno:</span> 
                <strong className="text-slate-700 font-semibold truncate">{res.previsaoChegada || '18:00'}</strong>
              </p>
            </div>
          )}

          {res.observações && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 p-2 rounded-lg italic mt-2 inline-block">
              📌 {res.observações}
            </p>
          )}

          {boat && boat.temSom && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 bg-amber-50/50 border border-amber-200/50 p-2 rounded-xl text-[10px] leading-none">
              <span className="font-bold text-amber-900 font-sans">🔊 CHEQUE DE SOM:</span>
              <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                res.somRetirado ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {res.somRetirado ? 'Acoplado' : 'Retirado'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-500">Saída:</span>
              <span className={`font-semibold ${
                res.somTesteSaida === 'ok' ? 'text-emerald-700' : res.somTesteSaida === 'defeito' ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {res.somTesteSaida === 'ok' ? '✅ OK' : res.somTesteSaida === 'defeito' ? '❌ Defeito' : '⚠️ Pendente'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-500">Retorno:</span>
              <span className={`font-semibold ${
                res.somTesteRetorno === 'ok' ? 'text-emerald-700' : res.somTesteRetorno === 'defeito' ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {res.somTesteRetorno === 'ok' ? '✅ OK' : res.somTesteRetorno === 'defeito' ? '❌ Defeito' : '⚠️ Pendente'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">

        {res.status === 'confirmado' && !res.googleEventId && gcalConnected && (
          <button
            onClick={() => onSync(res.id)}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/35 hover:border-amber-500/50 rounded-lg transition-colors cursor-pointer flex items-center text-xs font-bold gap-1.5 animate-pulse"
            title="Sincronizar com o Google Calendar agora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Google</span>
          </button>
        )}

        {isConfirmed && (
          <button
            onClick={() => onGeneratePDF(res)}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors cursor-pointer flex items-center text-xs font-semibold font-sans shadow-xs gap-1"
            title="Gerar PDF - Aviso de Saída (NORMAM Anexo 4-A)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Aviso Saída</span>
          </button>
        )}

        <button
          onClick={() => onOpenStatus(res)}
          className="p-2 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 text-slate-500 rounded-lg transition-all cursor-pointer flex items-center justify-center text-xs font-medium font-sans gap-1"
          title="Alterar Status do Agendamento"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Status</span>
        </button>

        <button
          onClick={() => onDelete(res)}
          className="p-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
          title="Excluir Reserva"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
