import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Truck, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { UtvVeiculo, UtvCotista, UtvControleAnualItem } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';

interface UtvReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  veiculos: UtvVeiculo[];
  cotistas: UtvCotista[];
}

export default function UtvReservaModal({
  isOpen,
  onClose,
  onSuccess,
  veiculos,
  cotistas
}: UtvReservaModalProps) {
  const [selectedVeiculoId, setSelectedVeiculoId] = useState('');
  const [selectedCotistaId, setSelectedCotistaId] = useState('');
  const [dataUso, setDataUso] = useState(() => new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [controleAnual, setControleAnual] = useState<UtvControleAnualItem[]>([]);
  const [loadingControle, setLoadingControle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (veiculos.length > 0 && !selectedVeiculoId) {
        setSelectedVeiculoId(veiculos[0].id);
      }
      loadControleAnual();
    }
  }, [isOpen, veiculos]);

  const loadControleAnual = async () => {
    setLoadingControle(true);
    try {
      const ano = parseInt(dataUso.split('-')[0], 10) || new Date().getFullYear();
      const res = await fetchWithAuth(`/api/utv/controle-anual?ano=${ano}`);
      if (res.ok) {
        const data = await res.json();
        setControleAnual(data.controle || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar controle anual:', e);
    } finally {
      setLoadingControle(false);
    }
  };

  if (!isOpen) return null;

  const cotistaSelecionadoControle = controleAnual.find(c => c.cotistaId === selectedCotistaId);
  const semSaldo = cotistaSelecionadoControle && cotistaSelecionadoControle.saldoDisponivel <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeiculoId || !selectedCotistaId || !dataUso) {
      setError('Selecione o veículo, o cotista e a data de uso.');
      return;
    }

    if (semSaldo) {
      setError(`Cotista esgotou a franquia de 30 dias anuais. Saldo restante: 0 dias.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth('/api/utv/usos/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: selectedVeiculoId,
          cotistaId: selectedCotistaId,
          dataUso,
          observacoesSaida: observacoes
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || 'Erro ao realizar reserva de UTV.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao criar reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Nova Reserva de UTV</h3>
              <p className="text-xs text-amber-100">Bloqueia 1 dia na franquia anual do cotista</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Selecionar Veículo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Veículo UTV
            </label>
            <div className="relative">
              <Truck className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <select
                value={selectedVeiculoId}
                onChange={(e) => setSelectedVeiculoId(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
              >
                <option value="">Selecione o veículo...</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nome} {v.modelo ? `(${v.modelo})` : ''} - KM: {v.kmAtual || 0} | Horímetro: {v.horimetroAtual || 0}h
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selecionar Cotista */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cotista Responsável
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <select
                value={selectedCotistaId}
                onChange={(e) => setSelectedCotistaId(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
              >
                <option value="">Selecione o cotista...</option>
                {cotistas.map(c => {
                  const info = controleAnual.find(ctrl => ctrl.cotistaId === c.id);
                  const saldo = info ? info.saldoDisponivel : 30;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.cotaNumero} - {c.nome} (Saldo: {saldo} dias disponíveis)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Informações da Franquia do Cotista */}
            {cotistaSelecionadoControle && (
              <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                semSaldo
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div>
                  <span className="font-bold">Franquia 30 Dias: </span>
                  <span>{cotistaSelecionadoControle.diasRealizados} realizados, {cotistaSelecionadoControle.diasReservados} reservados.</span>
                </div>
                <span className="font-black px-2 py-0.5 rounded-md bg-white/80 shadow-2xs">
                  {cotistaSelecionadoControle.saldoDisponivel} dias livres
                </span>
              </div>
            )}
          </div>

          {/* Data de Uso */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Data de Utilização
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dataUso}
                onChange={(e) => {
                  setDataUso(e.target.value);
                  setTimeout(loadControleAnual, 100);
                }}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Apenas 1 uso por dia por veículo. O ato de reservar bloqueia temporariamente o dia do cotista.
            </p>
          </div>

          {/* Observações da Reserva */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações Pré-Reserva (Opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Cotista solicitou saída às 08h com destino Trilha da Serra..."
              rows={2}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>

          {/* Regras Operacionais Resumo */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Regras de Operação do UTV:</span>
            </div>
            <p>• O saldo só será efetivamente baixado após a devolução e conferência ("Realizado").</p>
            <p>• Retirada obrigatória com tanque 100% cheio e retorno 100% abastecido com comprovante.</p>
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || semSaldo}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Confirmar Reserva</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
