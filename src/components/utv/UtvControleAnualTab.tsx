import React, { useState } from 'react';
import {
  CalendarCheck,
  UserPlus,
  Clock,
  Gauge,
  Phone,
  Shield,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { UtvControleAnualItem, UtvCotista } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { formatHorimetroDecimal, formatKm } from '../../utils/utvUtils';

interface UtvControleAnualTabProps {
  controle: UtvControleAnualItem[];
  ano: number;
  onAnoChange: (ano: number) => void;
  onOpenNovoCotista: () => void;
  onEditCotista: (cotista: UtvCotista) => void;
  onReload: () => void;
}

export default function UtvControleAnualTab({
  controle,
  ano,
  onAnoChange,
  onOpenNovoCotista,
  onEditCotista,
  onReload
}: UtvControleAnualTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Totais agregados do ano
  const totalCotistas = controle.length;
  const totalDiasRealizados = controle.reduce((acc, c) => acc + c.diasRealizados, 0);
  const totalDiasReservados = controle.reduce((acc, c) => acc + c.diasReservados, 0);
  const totalKmAcumulado = controle.reduce((acc, c) => acc + c.kmTotalAcumulado, 0);
  const totalHorasAcumuladas = controle.reduce((acc, c) => acc + c.horasMotorAcumuladas, 0);

  // Filtro de busca
  const filteredControle = controle.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return c.nome.toLowerCase().includes(q) || c.cotaNumero.toLowerCase().includes(q);
  });

  // Excluir cotista
  const handleDeleteCotista = async (cotistaId: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o cotista "${nome}"? Esta ação removerá seus dados cadastrais.`)) return;

    try {
      const res = await fetchWithAuth(`/api/utv/cotistas/${cotistaId}`, { method: 'DELETE' });
      if (res.ok) {
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao excluir cotista.');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── CARDS RESUMO DO CONTROLE ANUAL ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">

        {/* Card 1: Total Cotistas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cotistas Ativos
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {totalCotistas}
          </span>
          <span className="text-[10px] text-slate-500">Exercício {ano}</span>
        </div>

        {/* Card 2: Dias Realizados */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Dias Realizados
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {totalDiasRealizados}
          </span>
          <span className="text-[10px] text-emerald-600">Baixas efetivas na cota</span>
        </div>

        {/* Card 3: Dias Reservados */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Dias Reservados
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {totalDiasReservados}
          </span>
          <span className="text-[10px] text-amber-600">Bloqueio provisório</span>
        </div>

        {/* Card 4: KM Acumulado */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            KM Total Rodado
          </span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {formatKm(totalKmAcumulado)}
          </span>
          <span className="text-[10px] text-blue-600">Acumulado temporada</span>
        </div>

        {/* Card 5: Horas de Motor */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            Horas de Motor
          </span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">
            {formatHorimetroDecimal(totalHorasAcumuladas)}
          </span>
          <span className="text-[10px] text-purple-600">Para rateio de revisões</span>
        </div>

      </div>

      {/* ── TABELA DE COTISTAS E FRANQUIA ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">

        {/* Cabeçalho da Tabela & Controles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800">
              Controle Anual de Cotas & Franquia (30 Dias)
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento estrito de saldo de dias, acúmulo de horas de motor e quilometragem
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Ano */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Ano:</span>
              <select
                value={ano}
                onChange={(e) => onAnoChange(Number(e.target.value))}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cotista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 w-44"
              />
            </div>

            {/* Botão Novo Cotista */}
            <button
              onClick={onOpenNovoCotista}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Cotista</span>
            </button>
          </div>
        </div>

        {/* Tabela de Dados */}
        {filteredControle.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Nenhum cotista cadastrado para o ano {ano}. Clique em "Novo Cotista" para cadastrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Cotista / Cota</th>
                  <th className="py-3 px-3">Contato</th>
                  <th className="py-3 px-3 text-center">Franquia Anual</th>
                  <th className="py-3 px-3 text-center">Reservados</th>
                  <th className="py-3 px-3 text-center">Realizados</th>
                  <th className="py-3 px-3 min-w-[180px]">Saldo Disponível</th>
                  <th className="py-3 px-3 text-right">KM Acumulado</th>
                  <th className="py-3 px-3 text-right">Horímetro Acumulado</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredControle.map((item) => {
                  const percentualUsado = Math.min(
                    100,
                    Math.round(((item.diasRealizados + item.diasReservados) / item.limiteDiasAnual) * 100)
                  );
                  const saldoColor =
                    item.saldoDisponivel > 15
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : item.saldoDisponivel > 5
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-red-700 bg-red-50 border-red-200';

                  const barColor =
                    item.saldoDisponivel > 15
                      ? 'bg-emerald-500'
                      : item.saldoDisponivel > 5
                      ? 'bg-amber-500'
                      : 'bg-red-500';

                  return (
                    <tr key={item.cotistaId} className="hover:bg-slate-50/70 transition-colors">

                      {/* Cotista & Cota */}
                      <td className="py-3.5 px-3">
                        <div className="font-black text-slate-900">{item.nome}</div>
                        <div className="text-[10px] font-bold text-amber-700 uppercase">{item.cotaNumero}</div>
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {item.telefone || '-'}
                      </td>

                      {/* Franquia Total */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                        {item.limiteDiasAnual} dias
                      </td>

                      {/* Reservados (bloqueio temporário) */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-amber-600 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                          {item.diasReservados}
                        </span>
                      </td>

                      {/* Realizados (baixa efetiva) */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                          {item.diasRealizados}
                        </span>
                      </td>

                      {/* Saldo Restante & Barra Visual */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded border ${saldoColor}`}>
                              {item.saldoDisponivel} dias restantes
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {percentualUsado}% usado
                            </span>
                          </div>

                          {/* Barra de Progresso */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-300`}
                              style={{ width: `${percentualUsado}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* KM Total Acumulado */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {formatKm(item.kmTotalAcumulado)}
                      </td>

                      {/* Horímetro Acumulado */}
                      <td className="py-3.5 px-3 text-right font-bold text-amber-700 whitespace-nowrap">
                        {formatHorimetroDecimal(item.horasMotorAcumuladas)}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onEditCotista({
                              id: item.cotistaId,
                              clienteId: item.clienteId,
                              nome: item.nome,
                              cotaNumero: item.cotaNumero,
                              telefone: item.telefone,
                              limiteDiasAnual: item.limiteDiasAnual,
                              anoExercicio: item.anoExercicio,
                              status: 'ativo',
                              createdAt: ''
                            })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Editar cotista"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCotista(item.cotistaId, item.nome)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Excluir cotista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
