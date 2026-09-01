import React, { useState, useEffect } from 'react';
import { Reserva, Embarcacao, Cliente } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { boatDB, clientDB, reservationDB } from '../../db';
import { updateGoogleCalendarEvent } from '../../googleCalendar';
import { generateAvisoSaidaPDF } from '../../utils/pdfGenerator';
import { ClipboardList, RefreshCw } from 'lucide-react';

interface StatusModalProps {
  isOpen: boolean;
  reserva: Reserva | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onUpdateCompleted: () => void;
}

const getLocalDateStr = (d: Date = new Date()) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

export default function StatusModal({
  isOpen,
  reserva,
  onClose,
  onSuccess,
  onError,
  onUpdateCompleted
}: StatusModalProps) {
  const [statusVal, setStatusVal] = useState<'Agendado' | 'Confirmado' | 'Cancelado'>('Agendado');
  const [destino, setDestino] = useState('Iate Club - Rodeadouro');
  const [horaSaida, setHoraSaida] = useState('11:30');
  const [horaChegada, setHoraChegada] = useState('17:28');
  const [pessoasABordo, setPessoasABordo] = useState('02');
  const [numObs, setNumObs] = useState('');
  
  const [somTesteSaida, setSomTesteSaida] = useState<'ok'|'defeito'|'nao_realizado'>('nao_realizado');
  const [somTesteRetorno, setSomTesteRetorno] = useState<'ok'|'defeito'|'nao_realizado'>('nao_realizado');
  const [somRetirado, setSomRetirado] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (reserva && isOpen) {
      const cleanStatus = reserva.status === 'confirmado' ? 'Confirmado' : reserva.status === 'cancelado' ? 'Cancelado' : 'Agendado';
      setStatusVal(cleanStatus);
      
      setDestino(reserva.destino || 'Iate Club - Rodeadouro');
      setHoraSaida(reserva.previsaoSaida || '11:30');
      setHoraChegada(reserva.previsaoChegada || '17:28');
      setPessoasABordo(String(reserva.pessoasABordo || '02'));
      
      setNumObs(reserva.observações || '');
      setSomRetirado(!!reserva.somRetirado);
      setSomTesteSaida((reserva.somTesteSaida as any) || 'nao_realizado');
      setSomTesteRetorno((reserva.somTesteRetorno as any) || 'nao_realizado');
    }
  }, [reserva, isOpen]);

  if (!isOpen || !reserva) return null;

  const handleUpdateEventStatus = async () => {
    if (statusVal === 'Confirmado') {
      if (!destino || !horaSaida || !horaChegada || !pessoasABordo) {
        onError('Para confirmar a reserva, preencha todos os dados de saída obrigatórios.');
        return;
      }
    }

    setIsUpdatingStatus(true);
    try {
      const boat = boatDB.getById(reserva.embarcacaoId);
      const client = clientDB.getById(reserva.clienteId);
      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
      let ownerName = client ? client.nome : 'Desconhecido';
      if (!client && reserva.observações?.includes('[NOME_RECUPERADO:')) {
        const match = reserva.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
        if (match) ownerName = match[1].trim();
      }
      
      let baseTitle = `${boatCode} - ${ownerName}`;
      let finalTitle = baseTitle;
      if (statusVal === 'Cancelado') {
        finalTitle = `${baseTitle} (CANCELADO)`;
      }

      const lines: string[] = [];
      lines.push('Reservado via Reservas Náuticas');
      lines.push(`Status: ${statusVal}`);
      
      if (statusVal === 'Confirmado') {
        lines.push(`Destino: ${destino}`);
        lines.push(`Previsão de Saída: ${horaSaida}`);
        lines.push(`Previsão de Chegada: ${horaChegada}`);
        lines.push(`Pessoas a bordo: ${pessoasABordo}`);
      }

      if (boat) lines.push(`Embarcação: ${getBoatCode(boat)}`);
      if (client) lines.push(`Proprietário: ${client.nome}`);
      if (client?.telefone) lines.push(`Contato: ${client.telefone}`);
      lines.push(`Período: ${reserva.periodo === 'dia_inteiro' ? 'Dia Inteiro' : reserva.periodo === 'manha' ? 'Manhã' : 'Tarde'}`);
      
      const finalObs = numObs.trim() || reserva.observações || 'Nenhuma';
      lines.push(`Obs: ${finalObs}`);

      const finalDescription = lines.join('\n');

      const mappedStatus = statusVal === 'Cancelado' ? 'cancelado' : statusVal === 'Confirmado' ? 'confirmado' : 'agendado';
      reservationDB.update(reserva.id, {
        status: mappedStatus,
        observações: finalObs,
        somRetirado,
        somTesteSaida,
        somTesteRetorno,
        previsaoSaida: horaSaida || reserva.previsaoSaida,
        previsaoChegada: horaChegada || reserva.previsaoChegada,
        destino: destino || reserva.destino,
        pessoasABordo: pessoasABordo || reserva.pessoasABordo,
        statusMarina: statusVal === 'Confirmado' ? 'confirmada' : (reserva.statusMarina || 'agendada')
      });

      let success = true;
      if (reserva.googleEventId && !reserva.googleEventId.startsWith('g_sim_')) {
        success = await updateGoogleCalendarEvent(reserva.googleEventId, boatCode, {
          summary: finalTitle,
          description: finalDescription
        });
      }

      if (success) {
        if (boat?.temSom) {
          try {
            const dataToSave = {
              id: `som_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
              reservaId: reserva.id,
              embarcacaoId: boatCode,
              clienteId: client?.id || 'N/A',
              data: getLocalDateStr(),
              somRetirado,
              somTesteSaida,
              somTesteRetorno,
              observacoes: finalObs,
              createdAt: new Date().toISOString()
            };
            const { fetchWithAuth } = await import('../../utils/apiAuth');

            await fetchWithAuth('/api/db/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'controles_som', action: 'upsert', data: dataToSave })
            });
          } catch(e) { console.error('Failed to save to ControlesSom db', e); }
        }

        onSuccess(`Status atualizado para "${statusVal}" com sucesso!`);
      } else {
        onError('Atualizado localmente, mas não foi possível sincronizar a alteração no Google Calendar.');
      }

      if (statusVal === 'Confirmado') {
        try {
          const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
          let finalDate = reserva.data;
          if (finalDate.includes('-')) {
            const p = finalDate.split('-');
            finalDate = `${p[2]} / ${p[1]} / ${p[0]}`;
          }

          await generateAvisoSaidaPDF({
            data: finalDate,
            nome: ownerName,
            tipo: boatType,
            nomeEmbarcacao: boatCode,
            pessoasABordo: pessoasABordo || '02',
            destino: destino || 'Iate Club - Rodeadouro',
            previsaoSaida: horaSaida || '11:30',
            previsaoChegada: horaChegada || '17:28',
            observacao: numObs.trim() || 'Nenhuma'
          });
          
          try {
            const textToCopy = `CONFIRMADO - ${boatCode} - ${ownerName.toUpperCase()}    |  Saída: ${horaSaida || '11:30'}`;
            await navigator.clipboard.writeText(textToCopy);
          } catch (err) {
            console.error('Erro ao copiar para clipboard:', err);
          }
          
          onSuccess('Documento "Aviso de Saída" gerado e pronto para impressão!');
        } catch (pdfErr) {
          console.error('Erro ao gerar PDF ao confirmar:', pdfErr);
        }
      }

      onUpdateCompleted();
      onClose();
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Erro ao atualizar status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        {/* Header banner */}
        <div className="bg-orange-50/50 px-5 py-3 border-b border-orange-100 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 text-sm font-sans">
                Atualizar Status
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate font-sans">
              Edite as condições e o fluxo do agendamento atual.
            </p>
          </div>
        </div>

        {/* Form Body content scrollable */}
        <div className="p-5 overflow-y-auto subtle-scrollbar space-y-6 flex-1">
          {/* Status buttons selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Status da Reserva</label>
            <div className="grid grid-cols-3 gap-2">
              {['Agendado', 'Confirmado', 'Cancelado'].map((st) => {
                const isSelected = statusVal === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusVal(st as any)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 font-semibold text-xs cursor-pointer ${
                      isSelected
                        ? st === 'Confirmado' 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' 
                          : st === 'Cancelado'
                            ? 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500'
                            : 'border-slate-800 bg-slate-800 text-white ring-1 ring-slate-800'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'Confirmado' && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-transparent'}`} />}
                    {st === 'Cancelado' && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-500' : 'bg-transparent'}`} />}
                    {st === 'Agendado' && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-400' : 'bg-transparent'}`} />}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>

            {/* Confirmed Specific Information */}
            {statusVal === 'Confirmado' && (
              <div className="bg-orange-50/20 rounded-xl border border-orange-100/60 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-orange-100/35">
                  <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-mono">
                    Dados de Saída
                  </span>
                  <span className="text-[10px] text-orange-600 font-medium">Requeridos para a Marinha e Seguradora</span>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Destino (Plano de Navegação)</label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white text-slate-850 font-sans"
                    placeholder="Ex: Iate Club - Rodeadouro"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Hora Saída</label>
                    <input
                      type="time"
                      value={horaSaida}
                      onChange={(e) => setHoraSaida(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white text-slate-850 font-sans"
                      placeholder="Ex: 11:30"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Hora Chegada</label>
                    <input
                      type="time"
                      value={horaChegada}
                      onChange={(e) => setHoraChegada(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white text-slate-850 font-sans"
                      placeholder="Ex: 17:28"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">A Bordo</label>
                    <input
                      type="text"
                      value={pessoasABordo}
                      onChange={(e) => setPessoasABordo(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white text-slate-850 font-sans"
                      placeholder="Ex: 02"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const boatObj = boatDB.getById(reserva.embarcacaoId);
              if (!boatObj?.temSom) return null;

              return (
                <div className="bg-amber-50/75 border border-amber-200/80 rounded-xl p-3.5 space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex items-start space-x-2 shrink-0">
                    <div className="p-1 bg-amber-100 rounded text-amber-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <div className="leading-none">
                      <h4 className="text-xs font-bold text-amber-900 font-sans">🔊 Controle de Som Mandatório</h4>
                      <p className="text-[10px] text-amber-700 font-medium font-sans mt-1">Controlar acoplamento e testes antes de ir (saída) e no retorno.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-amber-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={somTesteSaida === 'ok'}
                        onChange={(e) => setSomTesteSaida(e.target.checked ? 'ok' : 'nao_realizado')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-700 font-sans leading-tight">
                        Som verificado e está OK na Saída
                      </span>
                    </label>

                    <label className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-amber-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={somTesteRetorno === 'ok'}
                        onChange={(e) => setSomTesteRetorno(e.target.checked ? 'ok' : 'nao_realizado')}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-700 font-sans leading-tight">
                        Som verificado e está OK no Retorno
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                    <input
                      type="checkbox"
                      id="somRetiradoCheckModal"
                      checked={somRetirado}
                      onChange={(e) => setSomRetirado(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="somRetiradoCheckModal" className="text-[10px] font-semibold text-slate-700 cursor-pointer font-sans leading-tight">
                      Confirmar acoplamento de som (Equipamento liberado e testado pelo marinheiro)
                    </label>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1 mt-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Observação / Notas</label>
              <textarea
                value={numObs}
                onChange={(e) => setNumObs(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 font-sans min-h-[48px] h-12"
                placeholder="Ex: Nenhuma ou observações sobre manutenção, convidados etc."
              />
            </div>
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-705 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={handleUpdateEventStatus}
            className="flex-1 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isUpdatingStatus ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar Status</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
