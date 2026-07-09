import React, { useState, useEffect } from 'react';
import { Search, Info, Speaker, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { reservationDB, boatDB, clientDB } from '../db';

import { ControleSom, Reserva } from '../types';

export default function SoundControlsPage() {
  const [soundReservations, setSoundReservations] = useState<ControleSom[]>([]);
  const [futureReservations, setFutureReservations] = useState<Reserva[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadFutureReservations();
  }, []);

  const resolveBoatName = (id: string) => {
    if (!id) return 'N/A';
    const b = boatDB.getAll().find(x => x.id === id || x.nome?.toLowerCase() === id.toLowerCase());
    const rawName = b ? b.nome : id;
    let nameToDisplay = rawName.replace(/^(boat|jetski)_/i, '').toUpperCase();
    if (nameToDisplay.startsWith('M00') || nameToDisplay.includes('M00')) {
      nameToDisplay = 'M00';
    }
    return nameToDisplay;
  };

  const resolveClientName = (id: string) => {
    if (!id) return 'N/A';
    // Se o ID vier do google agenda costuma ser um nome ou "Cezar", se vier do app é "cli_..."
    const c = clientDB.getAll().find(x => x.id === id || x.nome?.toLowerCase() === id.toLowerCase());
    let name = c ? c.nome : id.replace(/^cli_/i, '');
    
    // Tratamento para limpar "Cliente N/A" ou outros retornos sujos
    if (name === 'N/A' || name.trim() === '') return 'Não Informado';
    return name;
  };

  const loadFutureReservations = () => {
    // Current date string in YYYY-MM-DD
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateStr = today.toISOString().split('T')[0];

    const all = reservationDB.getAll();
    const future = all.filter(r => {
      if (r.status === 'cancelado') return false;
      if (r.data < dateStr) return false;
      
      const boatObj = boatDB.getById(r.embarcacaoId);
      if (!boatObj?.temSom) return false;

      // Ensure it is pending validation in 'ControleSom' or 'somTesteRetorno' / 'somTesteSaida'
      // If it already has both OK or both defeito and already exists, it might be tested but usually people check it per exit.
      // But we just show scheduled reservations here anyway.
      return true;
    });

    future.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    setFutureReservations(future);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Sincroniza dados base para resolver nomes corretamente
      const { syncWithRemote } = await import('../db');
      await syncWithRemote();

      const res = await fetch('/api/db/controles_som');
      if (res.ok) {
        const data = await res.json();
        setSoundReservations(data);
      } else {
        console.error("Failed to fetch sound controls from database");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReservations = soundReservations.filter(r => {
    const bName = resolveBoatName(r.embarcacaoId).toLowerCase();
    const cName = resolveClientName(r.clienteId).toLowerCase();
    const term = searchTerm.toLowerCase();
    return bName.includes(term) || cName.includes(term);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row shadow-sm bg-white rounded-2xl border border-slate-100 overflow-hidden shrink-0">
        <div className="p-6 sm:w-1/3 bg-slate-900 border-r border-slate-100/10 flex flex-col justify-center">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mb-4 border border-slate-700/50 shadow-inner">
            <Speaker className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">Controles de Som</h2>
          <p className="text-sm text-slate-400 font-sans leading-relaxed">
            Relatório de verificações e checagem de acoplamento do sistema de som das embarcações obrigatórias.
          </p>
        </div>

        <div className="p-6 sm:w-2/3 bg-white/50 backdrop-blur-sm flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-800 font-sans">Consulta e Monitoramento</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-sans">
                Acesse o histórico dos testes realizados nos sistemas de som das lanchas e jets durante a confirmação de saída ou retorno. 
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Future Reservations Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Futuras Saídas Agendadas (Para Verificação)</h3>
          <p className="text-xs text-slate-500 mt-1">Próximos agendamentos ativos para embarcações que possuem som.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Embarcação</th>
                <th className="px-6 py-4">Cliente (Cota)</th>
                <th className="px-6 py-4">Status de Som (Saída)</th>
                <th className="px-6 py-4">Status de Som (Retorno)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {futureReservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhum agendamento futuro para verificação.
                  </td>
                </tr>
              ) : (
                futureReservations.map(res => {
                  const dataObj = new Date(res.data);
                  const dataStr = res.data.split('-').reverse().join('/'); // Format DD/MM/YYYY
                  
                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{dataStr}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{resolveBoatName(res.embarcacaoId)}</td>
                      <td className="px-6 py-4 text-xs">{resolveClientName(res.clienteId)}</td>
                      <td className="px-6 py-4">
                        {res.somTesteSaida === 'ok' ? (
                          <div className="flex items-center text-emerald-600 font-medium text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verificado (OK)
                          </div>
                        ) : res.somTesteSaida === 'defeito' ? (
                          <div className="flex items-center text-rose-600 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Defeito
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-500 font-medium text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Pendente Verificação
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {res.somTesteRetorno === 'ok' ? (
                          <div className="flex items-center text-emerald-600 font-medium text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verificado (OK)
                          </div>
                        ) : res.somTesteRetorno === 'defeito' ? (
                          <div className="flex items-center text-rose-600 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Defeito
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-500 font-medium text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Pendente Verificação
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Histórico de Verificações</h3>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar embarcação ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Data / Criação</th>
                <th className="px-6 py-4">Embarcação</th>
                <th className="px-6 py-4">Cliente (Cota)</th>
                <th className="px-6 py-4 text-center">Som Acoplado?</th>
                <th className="px-6 py-4">Teste Saída</th>
                <th className="px-6 py-4">Teste Retorno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma verificação de som encontrada.
                  </td>
                </tr>
              ) : (
                filteredReservations.map(res => {
                  const dataObj = new Date(res.createdAt || 0);
                  const dataStr = isNaN(dataObj.getTime()) ? res.data : dataObj.toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
                  
                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{res.data}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Reg: {dataStr}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{resolveBoatName(res.embarcacaoId)}</td>
                      <td className="px-6 py-4 text-xs">{resolveClientName(res.clienteId)}</td>
                      <td className="px-6 py-4 text-center">
                        {res.somRetirado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Equip. Retirado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {res.somTesteSaida === 'ok' ? (
                          <div className="flex items-center text-emerald-600 font-medium text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> OK
                          </div>
                        ) : res.somTesteSaida === 'defeito' ? (
                          <div className="flex items-center text-rose-600 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Defeito
                          </div>
                        ) : (
                          <div className="flex items-center text-slate-400 font-medium text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Pendente
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {res.somTesteRetorno === 'ok' ? (
                          <div className="flex items-center text-emerald-600 font-medium text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> OK
                          </div>
                        ) : res.somTesteRetorno === 'defeito' ? (
                          <div className="flex items-center text-rose-600 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Defeito
                          </div>
                        ) : (
                          <div className="flex items-center text-slate-400 font-medium text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Pendente
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
