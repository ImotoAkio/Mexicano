import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Wrench,
  Clock,
  Gauge,
  Percent,
  DollarSign,
  Save,
  CheckCircle,
  AlertTriangle,
  History,
  Trash2,
  Calendar,
  FileText
} from 'lucide-react';
import { UtvVeiculo, UtvManutencao } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { formatCurrencyBRL, formatHorimetroDecimal, formatKm, formatDateBR } from '../../utils/utvUtils';

interface UtvRateioTabProps {
  veiculos: UtvVeiculo[];
  ano: number;
}

export default function UtvRateioTab({ veiculos, ano }: UtvRateioTabProps) {
  // Estados do formulário de rateio
  const [selectedVeiculoId, setSelectedVeiculoId] = useState('');
  const [dataManutencao, setDataManutencao] = useState(() => new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [valorTotalInput, setValorTotalInput] = useState<number | ''>('');
  const [criterioRateio, setCriterioRateio] = useState<'horas' | 'km'>('horas');

  // Resultado do cálculo
  const [calculoResultado, setCalculoResultado] = useState<any | null>(null);
  const [isCalculando, setIsCalculando] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lista de manutenções já salvas
  const [manutencoes, setManutencoes] = useState<UtvManutencao[]>([]);
  const [loadingManutencoes, setLoadingManutencoes] = useState(false);

  useEffect(() => {
    if (veiculos.length > 0 && !selectedVeiculoId) {
      setSelectedVeiculoId(veiculos[0].id);
    }
  }, [veiculos]);

  useEffect(() => {
    loadManutencoes();
  }, []);

  // Recalcular sempre que mudar veículo, valor, critério ou ano
  useEffect(() => {
    if (selectedVeiculoId && valorTotalInput !== '' && Number(valorTotalInput) > 0) {
      handleCalcular();
    } else {
      setCalculoResultado(null);
    }
  }, [selectedVeiculoId, valorTotalInput, criterioRateio, ano]);

  const loadManutencoes = async () => {
    setLoadingManutencoes(true);
    try {
      const res = await fetchWithAuth('/api/utv/manutencoes');
      if (res.ok) {
        const data = await res.json();
        setManutencoes(data.manutencoes || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar manutenções:', e);
    } finally {
      setLoadingManutencoes(false);
    }
  };

  const handleCalcular = async () => {
    if (!selectedVeiculoId || valorTotalInput === '' || Number(valorTotalInput) <= 0) return;
    setIsCalculando(true);
    setError(null);

    try {
      const res = await fetchWithAuth('/api/utv/manutencoes/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: selectedVeiculoId,
          valorTotal: Number(valorTotalInput),
          criterioRateio,
          ano
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCalculoResultado(data.calculo);
      } else {
        setError(data.message || 'Erro ao calcular rateio.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao calcular rateio.');
    } finally {
      setIsCalculando(false);
    }
  };

  const handleSalvarRateio = async () => {
    if (!selectedVeiculoId || !descricao || valorTotalInput === '' || !calculoResultado) {
      setError('Preencha a descrição, valor e gere o cálculo antes de salvar.');
      return;
    }

    setIsSalvando(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetchWithAuth('/api/utv/manutencoes/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: selectedVeiculoId,
          data: dataManutencao,
          descricao,
          valorTotal: Number(valorTotalInput),
          criterioRateio,
          detalhesRateio: calculoResultado.detalhes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Rateio de manutenção registrado com sucesso!');
        setDescricao('');
        setValorTotalInput('');
        setCalculoResultado(null);
        loadManutencoes();
      } else {
        setError(data.message || 'Erro ao salvar rateio.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar rateio.');
    } finally {
      setIsSalvando(false);
    }
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!confirm('Deseja excluir este registro de manutenção?')) return;
    try {
      const res = await fetchWithAuth(`/api/utv/manutencoes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadManutencoes();
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao excluir manutenção.');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── CARD PRINCIPAL: SIMULADOR DE RATEIO ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Rateio Proporcional de Manutenção UTV
              </h3>
              <p className="text-xs text-slate-500">
                Apoio a rateios com base no acúmulo real de KM rodados ou Horas de motor (utv.md)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-800 text-xs font-bold">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário de Configuração do Rateio */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">

          {/* Veículo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Veículo UTV
            </label>
            <select
              value={selectedVeiculoId}
              onChange={(e) => setSelectedVeiculoId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Data da Despesa
            </label>
            <input
              type="date"
              value={dataManutencao}
              onChange={(e) => setDataManutencao(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          {/* Valor Total */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Valor Total da Despesa (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={valorTotalInput}
              onChange={(e) => setValorTotalInput(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-700"
            />
          </div>

          {/* Critério de Rateio */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Critério Proporcional
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setCriterioRateio('horas')}
                className={`py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  criterioRateio === 'horas'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Horímetro</span>
              </button>
              <button
                type="button"
                onClick={() => setCriterioRateio('km')}
                className={`py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  criterioRateio === 'km'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>KM</span>
              </button>
            </div>
          </div>

          {/* Descrição da Manutenção */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Descrição do Serviço / Peças Trocadas
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Troca de correia dentada CVT, pastilhas de freio dianteiras e troca de óleo do motor..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

        </div>

        {/* Tabela de Rateio Calculada em Tempo Real */}
        {calculoResultado ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Partilha Calculada por Cotista (Critério: {criterioRateio === 'horas' ? 'Horas de Motor' : 'Quilometragem'})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total acumulado considerado: {criterioRateio === 'horas' ? formatHorimetroDecimal(calculoResultado.totalUsoGeral) : formatKm(calculoResultado.totalUsoGeral)}
                </p>
              </div>

              <span className="text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                Total: {formatCurrencyBRL(calculoResultado.valorTotal)}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">Cota</th>
                    <th className="py-2.5 px-3">Cotista</th>
                    <th className="py-2.5 px-3 text-right">Uso Acumulado Real</th>
                    <th className="py-2.5 px-3 text-right">Participação (%)</th>
                    <th className="py-2.5 px-3 text-right">Valor a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculoResultado.detalhes.map((d: any) => (
                    <tr key={d.cotistaId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-amber-700 uppercase">
                        {d.cotaNumero}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {d.cotistaNome}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {criterioRateio === 'horas' ? formatHorimetroDecimal(d.usoAcumulado) : formatKm(d.usoAcumulado)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-700">
                        {d.percentual.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        {formatCurrencyBRL(d.valorRateado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botão Salvar Rateio */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvarRateio}
                disabled={isSalvando || !descricao.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSalvando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Gravar Histórico de Rateio</span>
              </button>
            </div>

          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Insira o valor da manutenção acima para gerar a simulação do rateio proporcional.
          </div>
        )}

      </div>

      {/* ── HISTÓRICO DE RATEIOS SALVOS ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">

        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-black text-slate-800">
            Histórico de Manutenções & Rateios Registrados ({manutencoes.length})
          </h3>
        </div>

        {manutencoes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhuma manutenção registrada anteriormente.
          </div>
        ) : (
          <div className="space-y-3">
            {manutencoes.map(m => (
              <div key={m.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div>
                    <h4 className="font-black text-sm text-slate-800">{m.descricao}</h4>
                    <span className="text-xs text-slate-500">
                      {formatDateBR(m.data)} • Critério: {m.criterioRateio === 'horas' ? 'Horímetro Decimal' : 'Quilometragem (KM)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-black text-emerald-700 text-sm">
                      {formatCurrencyBRL(m.valorTotal)}
                    </span>
                    <button
                      onClick={() => handleDeleteManutencao(m.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir manutenção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detalhes do Rateio */}
                {m.detalhesRateio && m.detalhesRateio.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {m.detalhesRateio.map(d => (
                      <div key={d.cotistaId} className="p-2 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-800 block truncate">{d.cotistaNome}</span>
                          <span className="text-[10px] text-amber-700 font-medium">{d.cotaNumero} • {d.percentual}%</span>
                        </div>
                        <span className="font-black text-slate-900">
                          {formatCurrencyBRL(d.valorRateado)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
