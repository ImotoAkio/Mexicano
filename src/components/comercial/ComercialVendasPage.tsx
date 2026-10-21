import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
  Layers,
  TrendingUp,
  Wallet,
  Paperclip,
  Eye,
  XCircle
} from 'lucide-react';
import { VendaComercial, Cliente, Embarcacao } from '../../types';
import { clientDB, boatDB, syncWithRemote, onDbUpdate } from '../../db';
import ComercialVendaDrawer from './ComercialVendaDrawer';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import ClientProfileModal from '../ClientProfileModal';

export default function ComercialVendasPage() {
  const [vendas, setVendas] = useState<VendaComercial[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [entradaFilter, setEntradaFilter] = useState<'all' | 'paga' | 'pendente'>('all');
  const [statusFilter, setStatusFilter] = useState<'ativas' | 'cancelada' | 'all'>('ativas');

  // Modais / Drawers
  const [isVendaDrawerOpen, setIsVendaDrawerOpen] = useState<boolean>(false);
  const [contractViewerClient, setContractViewerClient] = useState<Cliente | null>(null);
  const [profileClient, setProfileClient] = useState<Cliente | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadLocalStores = () => {
    setClients([...clientDB.getAll()]);
    setBoats([...boatDB.getAll()]);
  };

  const fetchVendas = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/comercial/vendas', {
        credentials: 'include',
        headers: getAuthHeader()
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.vendas)) {
          setVendas(data.vendas);
        }
      } else if (!res.ok) {
        console.warn('Resposta não OK do endpoint de vendas:', res.status);
      }
    } catch (err) {
      console.error('Erro ao buscar vendas:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLocalStores();
    fetchVendas();

    const unsub = onDbUpdate(() => {
      loadLocalStores();
    });

    if (clientDB.getAll().length === 0) {
      syncWithRemote().then(loadLocalStores).catch(() => {});
    }

    return () => unsub();
  }, []);

  const handleCancelVenda = async (venda: VendaComercial) => {
    const msg =
      `Deseja cancelar a venda ${venda.codigoVenda} (${venda.clienteNome || 'Cliente'} - ${venda.embarcacaoNome || 'Embarcação'})?\n\n` +
      `Isso removerá automaticamente do Financeiro todas as parcelas pendentes geradas por esta venda (mantendo apenas lançamentos que já estejam pagos).`;
    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`/api/comercial/vendas/${venda.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeader()
      });
      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await res.text();
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch {
            data = {};
          }
        }
      }
      if (!res.ok || data.error) {
        alert(data.message || `Erro ao cancelar venda (Status ${res.status})`);
        return;
      }
      fetchVendas(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('comercial-venda-updated'));
      }
    } catch (err) {
      console.error('Erro ao cancelar venda:', err);
      alert('Erro ao comunicar com o servidor.');
    }
  };

  // KPIs calculados sobre as vendas ativas
  const stats = useMemo(() => {
    const ativas = vendas.filter(v => v.status !== 'cancelada');
    const vgvTotal = ativas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
    const totalEntradas = ativas.reduce((acc, v) => acc + (Number(v.valorEntrada) || 0), 0);
    const entradasLiquidadas = ativas.filter(v => v.entradaPaga || v.statusEntradaFinanceiro === 'pago').length;
    const totalRecebidoFinanceiro = ativas.reduce((acc, v) => acc + (Number(v.totalRecebidoCota) || 0), 0);
    const totalParcelasVencidas = ativas.reduce((acc, v) => acc + (Number(v.parcelasVencidas) || 0), 0);

    return {
      totalAtivas: ativas.length,
      vgvTotal,
      totalEntradas,
      entradasLiquidadas,
      totalRecebidoFinanceiro,
      totalParcelasVencidas
    };
  }, [vendas]);

  // Lista filtrada
  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (statusFilter === 'ativas' && v.status === 'cancelada') return false;
      if (statusFilter === 'cancelada' && v.status !== 'cancelada') return false;

      if (boatFilter !== 'all' && v.embarcacaoId !== boatFilter) return false;

      const isEntradaPaid = v.entradaPaga || v.statusEntradaFinanceiro === 'pago';
      if (entradaFilter === 'paga' && !isEntradaPaid) return false;
      if (entradaFilter === 'pendente' && isEntradaPaid) return false;

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchCode = (v.codigoVenda || '').toLowerCase().includes(q);
        const matchClient = (v.clienteNome || '').toLowerCase().includes(q);
        const matchCpf = (v.clienteCpf || '').toLowerCase().includes(q);
        const matchBoat = (v.embarcacaoNome || '').toLowerCase().includes(q);
        if (!matchCode && !matchClient && !matchCpf && !matchBoat) return false;
      }

      return true;
    });
  }, [vendas, statusFilter, boatFilter, entradaFilter, searchTerm]);

  const formatBRL = (val: number) =>
    `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Cabeçalho da Página (Alinhado ao padrão Comercial) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Lançamento de Vendas</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Registre vendas de cotas, anexe o comprovante da entrada, vincule o cliente à embarcação e gere as parcelas no Financeiro.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchVendas()}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Atualizar lista de vendas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Atualizando…' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVendaDrawerOpen(true)}
            className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">VGV Total (Vendas Ativas)</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-stone-900 tabular-nums">{formatBRL(stats.vgvTotal)}</div>
            <div className="text-xs text-stone-400 mt-0.5 tabular-nums">
              {stats.totalAtivas} {stats.totalAtivas === 1 ? 'cota vendida ativa' : 'cotas vendidas ativas'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total em Entradas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700 tabular-nums">{formatBRL(stats.totalEntradas)}</div>
            <div className="text-xs text-stone-400 mt-0.5 tabular-nums">
              {stats.entradasLiquidadas} de {stats.totalAtivas} entradas pagas
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Recebido (Cotas)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-blue-700 tabular-nums">{formatBRL(stats.totalRecebidoFinanceiro)}</div>
            <div className="text-xs text-stone-400 mt-0.5">
              Entrada + parcelas baixadas
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Parcelas Vencidas</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.totalParcelasVencidas > 0 ? 'bg-rose-50 text-rose-600' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-bold tabular-nums ${
                stats.totalParcelasVencidas > 0 ? 'text-rose-600' : 'text-stone-900'
              }`}
            >
              {stats.totalParcelasVencidas}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {stats.totalParcelasVencidas > 0
                ? 'Aguardando baixa no Financeiro'
                : 'Nenhuma parcela em atraso'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-3 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código (VND-0001), cliente, CPF ou embarcação..."
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white focus:border-mx-ink transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={boatFilter}
            onChange={e => setBoatFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
          >
            <option value="all">Todas as Embarcações</option>
            {boats.map(b => (
              <option key={b.id} value={b.id}>
                {b.numero ? `M${String(b.numero).replace(/^M/i, '')} - ` : ''}{b.nome}
              </option>
            ))}
          </select>

          <select
            value={entradaFilter}
            onChange={e => setEntradaFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
          >
            <option value="all">Entrada: Todas</option>
            <option value="paga">Entrada Paga</option>
            <option value="pendente">Entrada Pendente</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer"
          >
            <option value="ativas">Vendas Ativas</option>
            <option value="cancelada">Canceladas</option>
            <option value="all">Todas</option>
          </select>
        </div>
      </div>

      {/* 4. Tabela de Vendas */}
      <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-stone-400 text-xs font-semibold animate-pulse">
            Carregando histórico de vendas...
          </div>
        ) : filteredVendas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-stone-800">Nenhuma venda encontrada</div>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Clique em <strong>"Nova Venda"</strong> para vincular um cliente a uma embarcação e gerar automaticamente a entrada e as parcelas de cota no módulo Financeiro.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsVendaDrawerOpen(true)}
                className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white inline-flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Venda</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-50/90 text-stone-500 uppercase font-bold tracking-wider border-b border-stone-200/80 text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Venda / Data</th>
                  <th className="px-4 py-3.5">Cliente Comprador</th>
                  <th className="px-4 py-3.5">Embarcação & Cota</th>
                  <th className="px-4 py-3.5 text-right">Valor Total</th>
                  <th className="px-4 py-3.5">Entrada & Comprovante</th>
                  <th className="px-4 py-3.5">Parcelas no Financeiro</th>
                  <th className="px-4 py-3.5 text-center">Taxa Adm</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVendas.map(venda => {
                  const isEntradaPaid = venda.entradaPaga || venda.statusEntradaFinanceiro === 'pago';
                  const isCancelled = venda.status === 'cancelada';
                  const progressPct =
                    venda.numParcelas > 0
                      ? Math.min(100, Math.round(((venda.parcelasPagas || 0) / venda.numParcelas) * 100))
                      : 100;

                  const clientObj = clients.find(c => c.id === venda.clienteId) || null;

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-stone-50/80 transition-colors ${isCancelled ? 'opacity-50 bg-stone-50/40' : ''}`}
                    >
                      {/* Código / Data */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 tabular-nums">{venda.codigoVenda}</span>
                          {isCancelled && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                              CANCELADA
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 tabular-nums">
                          <Calendar className="w-3 h-3" />
                          {formatDateBR(venda.dataVenda)}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900">{venda.clienteNome || 'Cliente'}</div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          {venda.clienteCpf || venda.clienteTelefone || '-'}
                        </div>
                      </td>

                      {/* Embarcação & Cota */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800">{venda.embarcacaoNome || 'Embarcação'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-mx-ink-100 text-mx-ink text-[10px] font-bold tabular-nums">
                            {venda.cota}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {(venda as any).formaPagamento || 'Boleto / PIX'}
                        </div>
                      </td>

                      {/* Valor Total */}
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <div className="font-bold text-stone-900">{formatBRL(venda.valorTotal)}</div>
                        <div className="text-[10px] text-stone-500">
                          Recebido: {formatBRL(venda.totalRecebidoCota || 0)}
                        </div>
                      </td>

                      {/* Entrada & Comprovante */}
                      <td className="px-4 py-3.5">
                        {venda.valorEntrada > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-800 tabular-nums">{formatBRL(venda.valorEntrada)}</span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isEntradaPaid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isEntradaPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" /> Paga
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" /> A Receber
                                  </>
                                )}
                              </span>
                            </div>
                            {venda.comprovanteEntrada && (
                              <a
                                href={venda.comprovanteEntrada}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:underline"
                              >
                                <Paperclip className="w-3 h-3" />
                                Ver Comprovante
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Sem entrada</span>
                        )}
                      </td>

                      {/* Parcelas no Financeiro */}
                      <td className="px-4 py-3.5">
                        {venda.numParcelas > 0 ? (
                          <div className="space-y-1 min-w-[155px]">
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="font-bold text-stone-800">
                                {venda.numParcelas}x de {formatBRL(venda.valorParcela)}
                              </span>
                              <span className="font-semibold text-stone-500">
                                {venda.parcelasPagas || 0}/{venda.numParcelas} pagas
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-stone-400 tabular-nums">
                              <span>Venc. dia {venda.diaVencimento}</span>
                              {(venda.parcelasVencidas || 0) > 0 && (
                                <span className="text-rose-600 font-bold">
                                  {venda.parcelasVencidas} em atraso
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            À Vista
                          </span>
                        )}
                      </td>

                      {/* Taxa de Administração */}
                      <td className="px-4 py-3.5 text-center">
                        {venda.gerouTaxaAdm ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 tabular-nums"
                            title={`${venda.mesesTaxaAdm}x de ${formatBRL(venda.valorTaxaAdm)}`}
                          >
                            <Layers className="w-3 h-3" />
                            {venda.mesesTaxaAdm}m ({formatBRL(venda.valorTaxaAdm)})
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Não gerada</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {clientObj && (
                            <>
                              <button
                                type="button"
                                onClick={() => setContractViewerClient(clientObj)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Abrir Contrato de Aquisição do Cliente"
                              >
                                <FileSignature className="w-3.5 h-3.5 text-stone-600" />
                                Contrato
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfileClient(clientObj)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Ver ficha completa do cliente"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleCancelVenda(venda)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Cancelar venda e remover parcelas pendentes"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal de Lançamento de Venda */}
      <ComercialVendaDrawer
        open={isVendaDrawerOpen}
        onClose={() => setIsVendaDrawerOpen(false)}
        onSuccess={() => {
          loadLocalStores();
          fetchVendas(true);
        }}
      />

      {/* Visualizador de Contrato do Cliente */}
      {contractViewerClient && (
        <ComercialContratoViewerModal
          isOpen={!!contractViewerClient}
          onClose={() => setContractViewerClient(null)}
          cliente={contractViewerClient}
          embarcacao={boats.find(b => b.id === contractViewerClient.embarcacaoId) || null}
          initialType="aquisicao"
        />
      )}

      {/* Modal de Ficha do Cliente */}
      {profileClient && (
        <ClientProfileModal
          client={profileClient}
          boats={boats}
          onClose={() => setProfileClient(null)}
        />
      )}
    </div>
  );
}
