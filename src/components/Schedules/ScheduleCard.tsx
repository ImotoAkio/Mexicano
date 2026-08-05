import React from 'react';
import { Reserva } from '../../types';
import { boatDB, clientDB } from '../../db';
import { 
  Anchor, Wrench, AlertTriangle, RefreshCw, FileDown, ClipboardList, Trash2,
  X, Wallet, Calendar, AlertCircle, ExternalLink 
} from 'lucide-react';

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

  const [showFinanceModal, setShowFinanceModal] = React.useState(false);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = React.useState(false);
  const [financeError, setFinanceError] = React.useState<string | null>(null);

  const loadTransactions = async () => {
    if (!client) return;
    setLoadingTransactions(true);
    setFinanceError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/financeiro/transacoes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Não foi possível carregar os lançamentos financeiros.');
      }
      const data = await response.json();
      const clientTx = data
        .filter((t: any) => t.clienteId === client.id)
        .sort((a: any, b: any) => {
          const statusOrder: Record<string, number> = { 'atrasado': 1, 'pendente': 2, 'pago': 3 };
          const orderA = statusOrder[a.status] || 99;
          const orderB = statusOrder[b.status] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime();
        });
      setTransactions(clientTx);
    } catch (err: any) {
      setFinanceError(err.message || 'Erro ao buscar transações.');
    } finally {
      setLoadingTransactions(false);
    }
  };
  
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
  
  let currentStatus = isConfirmed ? 'Confirmado' : isCanceled ? 'Cancelado' : 'Agendado';
  let statusClasses = 'bg-slate-50 text-slate-700 border-slate-200';
  let dotClasses = 'bg-slate-400';

  if (isCanceled) {
    currentStatus = 'Cancelado';
    statusClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    dotClasses = 'bg-rose-500';
  } else if (res.statusMarina) {
    switch (res.statusMarina) {
      case 'agendado':
        if (isConfirmed) {
          currentStatus = 'Confirmado';
          statusClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-extrabold';
          dotClasses = 'bg-emerald-500';
        } else {
          currentStatus = 'Agendado';
          statusClasses = 'bg-slate-50 text-slate-700 border-slate-200';
          dotClasses = 'bg-slate-400';
        }
        break;
      case 'descida':
        currentStatus = 'Em Descida';
        statusClasses = 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-extrabold';
        dotClasses = 'bg-blue-500';
        break;
      case 'pier':
        currentStatus = 'No Pier';
        statusClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs font-extrabold';
        dotClasses = 'bg-indigo-500';
        break;
      case 'saida':
        currentStatus = 'Navegando';
        statusClasses = 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs font-extrabold';
        dotClasses = 'bg-amber-500';
        break;
      case 'chegada':
        currentStatus = 'Chegou';
        statusClasses = 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs font-extrabold';
        dotClasses = 'bg-teal-500';
        break;
      case 'guardada':
        currentStatus = 'Guardada';
        statusClasses = 'bg-green-50 text-green-800 border-green-300 shadow-2xs font-extrabold';
        dotClasses = 'bg-green-600';
        break;
      default:
        currentStatus = 'Confirmado';
        statusClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-extrabold';
        dotClasses = 'bg-emerald-500';
        break;
    }
  } else if (isConfirmed) {
    currentStatus = 'Confirmado';
    statusClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-extrabold';
    dotClasses = 'bg-emerald-500';
  } else {
    currentStatus = 'Agendado';
    statusClasses = 'bg-slate-50 text-slate-700 border-slate-200';
    dotClasses = 'bg-slate-400';
  }

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
            
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-sans uppercase flex items-center gap-1 border ${statusClasses}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
              {currentStatus}
            </span>

            {boat?.emManutencao && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs shrink-0">
                <Wrench className="w-2.5 h-2.5 mr-0.5" />
                Manutenção
              </span>
            )}

            {client?.statusFinanceiro === 'inadimplente' ? (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFinanceModal(true);
                  loadTransactions();
                }}
                className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-rose-600 text-white border border-rose-700 flex items-center shadow-xs shrink-0 cursor-pointer hover:bg-rose-700 transition-colors animate-pulse"
                title="Cliente em atraso. Clique para ver o extrato financeiro"
              >
                <AlertTriangle className="w-3 h-3 mr-1 text-white" />
                <span>Em Atraso (Inadimplente)</span>
              </span>
            ) : (client?.temValoresEmAberto || client?.statusFinanceiro === 'pendente') ? (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFinanceModal(true);
                  loadTransactions();
                }}
                className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-amber-500 text-white border border-amber-600 flex items-center shadow-xs shrink-0 cursor-pointer hover:bg-amber-600 transition-colors"
                title="Cliente possui valores em aberto. Clique para ver o resumo financeiro"
              >
                <Wallet className="w-3 h-3 mr-1 text-white" />
                <span>Possui Lançamentos em Aberto</span>
              </span>
            ) : client?.temLancamentos ? (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFinanceModal(true);
                  loadTransactions();
                }}
                className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center shadow-2xs shrink-0 cursor-pointer hover:bg-slate-200 transition-colors"
                title="Cliente possui lançamentos no sistema. Clique para ver o histórico"
              >
                <Wallet className="w-3 h-3 mr-1 text-slate-500" />
                <span>Com Lançamentos</span>
              </span>
            ) : null}
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

      {showFinanceModal && (
        <FinanceSummaryModal
          clientName={ownerName}
          observacoesFinanceiras={client?.observacoesFinanceiras}
          transactions={transactions}
          isLoading={loadingTransactions}
          error={financeError}
          onClose={() => setShowFinanceModal(false)}
        />
      )}
    </div>
  );
}

const cleanDescription = (desc: string) => {
  if (!desc) return '';
  let cleaned = desc.replace(/^Serviço realizado:\s*/i, '');
  cleaned = cleaned.replace(/\s*-\s*Cliente Ref:.*$/i, '');
  cleaned = cleaned.replace(/^Cliente Ref:.*$/i, '');
  return cleaned.trim();
};

function FinanceSummaryModal({
  clientName,
  observacoesFinanceiras,
  transactions,
  isLoading,
  error,
  onClose
}: {
  clientName: string;
  observacoesFinanceiras?: string;
  transactions: any[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const formatCurrency = (val: number | string) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const totalAtrasado = transactions
    .filter(t => t.status === 'atrasado' || t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr))
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const totalPendente = transactions
    .filter(t => t.status === 'pendente' || (t.status === 'lancado' && t.dataVencimento >= todayStr))
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const totalPago = transactions
    .filter(t => t.status === 'pago')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-xs border border-rose-100">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Extrato Financeiro</h3>
              <p className="text-xs text-slate-500 font-semibold">{clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">Buscando lançamentos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-sm font-bold text-slate-800">Erro ao carregar dados</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex flex-col">
                  <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Atrasado</span>
                  <span className="text-lg font-black text-rose-600 font-mono mt-1">{formatCurrency(totalAtrasado)}</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex flex-col">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Pendente</span>
                  <span className="text-lg font-black text-amber-600 font-mono mt-1">{formatCurrency(totalPendente)}</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Pago Recente</span>
                  <span className="text-lg font-black text-emerald-600 font-mono mt-1">{formatCurrency(totalPago)}</span>
                </div>
              </div>

              {/* Financial Observations */}
              {observacoesFinanceiras && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3">
                  <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider block mb-1">
                    📌 Observações Financeiras:
                  </span>
                  <p className="text-xs text-amber-900 font-medium italic leading-relaxed">
                    {observacoesFinanceiras}
                  </p>
                </div>
              )}

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Lançamentos</h4>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">Nenhum lançamento encontrado para este cliente.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {cleanDescription(tx.descricao) || tx.categoria}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              Venc: {formatDate(tx.dataVencimento)}
                            </span>
                            {tx.dataPagamento && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                                Pago: {formatDate(tx.dataPagamento)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-extrabold font-mono text-slate-800">
                            {formatCurrency(tx.valor)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            tx.status === 'pago' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : tx.status === 'atrasado'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {tx.status}
                          </span>
                          {tx.comprovante && (
                            <a 
                              href={tx.comprovante} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Ver Comprovante"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
