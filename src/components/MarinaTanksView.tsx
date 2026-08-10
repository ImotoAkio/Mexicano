import React, { useState } from 'react';
import { 
  Droplets, 
  TrendingUp, 
  Plus, 
  Loader2, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  X
} from 'lucide-react';

interface Tank {
  id: string;
  nome: string;
  tipo: 'podium' | 'diesel';
  capacidadeTotal: number;
  nivelAtual: number;
  alertaMinimo: number;
  ultimaEntradaData?: string;
  ultimaEntradaLitros?: number;
}

interface MarinaTanksViewProps {
  operadorNome?: string;
  showToast?: (message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function MarinaTanksView({ operadorNome, showToast }: MarinaTanksViewProps) {
  // Initial Tank State (stored in localStorage or memory)
  const [tanks, setTanks] = useState<Tank[]>(() => {
    const saved = localStorage.getItem('marina_tanks_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'tanque_podium',
        nome: 'Tanque 1 - Gasolina Podium',
        tipo: 'podium',
        capacidadeTotal: 10000,
        nivelAtual: 7650,
        alertaMinimo: 2000,
        ultimaEntradaData: new Date().toLocaleDateString('pt-BR'),
        ultimaEntradaLitros: 3000
      },
      {
        id: 'tanque_diesel',
        nome: 'Tanque 2 - Diesel Náutico',
        tipo: 'diesel',
        capacidadeTotal: 10000,
        nivelAtual: 4200,
        alertaMinimo: 2500,
        ultimaEntradaData: new Date(Date.now() - 86400000 * 3).toLocaleDateString('pt-BR'),
        ultimaEntradaLitros: 5000
      }
    ];
  });

  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('marina_tanks_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: '1',
        tanqueId: 'tanque_podium',
        tipo: 'entrada',
        litros: 3000,
        notaFiscal: 'NF-8921',
        fornecedor: 'Distribuidora BR',
        data: new Date().toLocaleDateString('pt-BR'),
        operador: operadorNome || 'Gerente'
      },
      {
        id: '2',
        tanqueId: 'tanque_diesel',
        tipo: 'entrada',
        litros: 5000,
        notaFiscal: 'NF-8840',
        fornecedor: 'Ipiranga Produtos de Petróleo',
        data: new Date(Date.now() - 86400000 * 3).toLocaleDateString('pt-BR'),
        operador: operadorNome || 'Gerente'
      }
    ];
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTankId, setSelectedTankId] = useState('tanque_podium');
  const [litersToAdd, setLitersToAdd] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveTanksState = (updatedTanks: Tank[], updatedHistory: any[]) => {
    setTanks(updatedTanks);
    setHistory(updatedHistory);
    localStorage.setItem('marina_tanks_config', JSON.stringify(updatedTanks));
    localStorage.setItem('marina_tanks_history', JSON.stringify(updatedHistory));
  };

  const handleAddFuelToTank = (e: React.FormEvent) => {
    e.preventDefault();
    const addedNum = parseFloat(litersToAdd);
    if (!addedNum || addedNum <= 0) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toLocaleDateString('pt-BR');
      const updatedTanks = tanks.map(t => {
        if (t.id === selectedTankId) {
          const newLevel = Math.min(t.capacidadeTotal, t.nivelAtual + addedNum);
          return {
            ...t,
            nivelAtual: newLevel,
            ultimaEntradaData: today,
            ultimaEntradaLitros: addedNum
          };
        }
        return t;
      });

      const newHistoryItem = {
        id: Date.now().toString(),
        tanqueId: selectedTankId,
        tipo: 'entrada',
        litros: addedNum,
        notaFiscal: notaFiscal || 'N/I',
        fornecedor: fornecedor || 'Fornecedor Direto',
        data: today,
        operador: operadorNome || 'Gerente'
      };

      const updatedHistory = [newHistoryItem, ...history];
      saveTanksState(updatedTanks, updatedHistory);

      if (showToast) {
        showToast(`Carga de ${addedNum}L inserida com sucesso!`, 'success');
      }
      setModalOpen(false);
      setLitersToAdd('');
      setNotaFiscal('');
      setFornecedor('');
    } catch (e) {
      if (showToast) showToast('Erro ao atualizar tanque', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 space-y-4 text-slate-800">
      {/* Header section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider border border-blue-200 mb-1 inline-block">
            Gestão da Marina
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            <span>Controle de Tanques & Estudo de Estoque</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitoramento dos reservatórios de combustível e registro de fornecimento de carga.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Truck className="w-4 h-4" />
          <span>Registrar Carga / Abastecer Tanque</span>
        </button>
      </div>

      {/* Tank Level Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tanks.map(tank => {
          const percent = Math.round((tank.nivelAtual / tank.capacidadeTotal) * 100);
          const isCritical = tank.nivelAtual <= tank.alertaMinimo;

          return (
            <div 
              key={tank.id} 
              className={`bg-white rounded-2xl p-5 border transition-all shadow-sm space-y-4 ${
                isCritical ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {tank.tipo === 'podium' ? 'Gasolina de Alta Octanagem' : 'Combustível Pesado'}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">{tank.nome}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                  percent > 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  percent > 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200 animate-pulse'
                }`}>
                  {percent}%
                </span>
              </div>

              {/* Tank Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Nível Atual</span>
                  <span className="text-slate-900 font-mono">{tank.nivelAtual.toLocaleString('pt-BR')} L / {tank.capacidadeTotal.toLocaleString('pt-BR')} L</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent > 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                      percent > 20 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                      'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Tank Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 rounded-xl p-3 border border-slate-100 font-medium">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Último Reabastecimento</span>
                  <span className="text-slate-800 font-bold">{tank.ultimaEntradaData || 'N/I'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Última Carga</span>
                  <span className="text-slate-800 font-bold font-mono">{tank.ultimaEntradaLitros ? `+${tank.ultimaEntradaLitros}L` : 'N/I'}</span>
                </div>
              </div>

              {isCritical && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Atenção: Nível mínimo atingido ({tank.alertaMinimo}L). Solicitar reposição.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Histórico de Entradas no Reservatório</span>
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center font-medium">Nenhum registro de carga cadastrado.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {history.map(item => {
              const tank = tanks.find(t => t.id === item.tanqueId);
              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{tank?.nome || 'Tanque'}</span>
                      <span className="text-[11px] text-slate-400 block font-medium">NF: {item.notaFiscal} • Fornecedor: {item.fornecedor}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-emerald-600 text-sm font-mono block">+{item.litros.toLocaleString('pt-BR')} L</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{item.data}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Carga Tanque */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Registrar Carga de Combustível</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFuelToTank} className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Selecione o Reservatório *</label>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                >
                  {tanks.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} (Atual: {t.nivelAtual}L)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Quantidade de Litros Recebida *</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="Ex: 5000"
                  value={litersToAdd}
                  onChange={(e) => setLitersToAdd(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Número da Nota Fiscal / Comprovante</label>
                <input
                  type="text"
                  placeholder="Ex: NF-99210"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Fornecedor / Distribuidora</label>
                <input
                  type="text"
                  placeholder="Ex: Distribuidora Shell / Vibra"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !litersToAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Carga</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
