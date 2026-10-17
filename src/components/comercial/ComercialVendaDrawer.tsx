import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Ship,
  User,
  UserPlus,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Layers,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Cliente, Embarcacao } from '../../types';
import { clientDB, boatDB, syncWithRemote } from '../../db';
import { formatBoatName } from '../../utils/constants';
import ComercialClientModal from './ComercialClientModal';

interface ComercialVendaDrawerProps {
  open: boolean;
  onClose: () => void;
  preselectedClientId?: string | null;
  preselectedBoatId?: string | null;
  onSuccess?: (result: any) => void;
}

const COTAS_LIST = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

function getNextMonthDueDate(day: number): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day || 10), maxDay);
  const yyyy = nextMonth.getFullYear();
  const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ComercialVendaDrawer({
  open,
  onClose,
  preselectedClientId,
  preselectedBoatId,
  onSuccess
}: ComercialVendaDrawerProps) {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Dados de vínculo Cliente + Embarcação + Cota
  const [clienteId, setClienteId] = useState<string>('');
  const [embarcacaoId, setEmbarcacaoId] = useState<string>('');
  const [cota, setCota] = useState<string>('C1');
  const [dataVenda, setDataVenda] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Valores da Venda e Entrada
  const [valorTotal, setValorTotal] = useState<string>('55000');
  const [valorEntrada, setValorEntrada] = useState<string>('12040');
  const [dataEntrada, setDataEntrada] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entradaPaga, setEntradaPaga] = useState<boolean>(false);
  const [comprovanteEntrada, setComprovanteEntrada] = useState<string | null>(null);
  const [comprovanteNome, setComprovanteNome] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState<boolean>(false);

  // Parcelas da Cota
  const [numParcelas, setNumParcelas] = useState<string>('24');
  const [valorParcelaManual, setValorParcelaManual] = useState<string>('');
  const [diaVencimento, setDiaVencimento] = useState<string>('10');
  const [primeiroVencimento, setPrimeiroVencimento] = useState<string>(() => getNextMonthDueDate(10));
  const [formaPagamento, setFormaPagamento] = useState<string>('Boleto / PIX');
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(false);

  // Taxa de Administração Opcional
  const [gerarTaxaAdm, setGerarTaxaAdm] = useState<boolean>(false);
  const [valorTaxaAdm, setValorTaxaAdm] = useState<string>('850.00');
  const [mesesTaxaAdm, setMesesTaxaAdm] = useState<string>('12');
  const [diaVencimentoTaxaAdm, setDiaVencimentoTaxaAdm] = useState<string>('10');
  const [primeiroVencimentoTaxaAdm, setPrimeiroVencimentoTaxaAdm] = useState<string>(() => getNextMonthDueDate(10));

  // Configurações padrão carregadas do Administrador
  const [defaultConfigInfo, setDefaultConfigInfo] = useState<{
    vendaPadraoEmpresa: string;
    vendaPadraoCategoria: string;
    taxaAdmPadraoEmpresa: string;
    taxaAdmPadraoCategoria: string;
  }>({
    vendaPadraoEmpresa: 'Mexicano',
    vendaPadraoCategoria: 'Venda de Cota',
    taxaAdmPadraoEmpresa: 'Vale Administradora',
    taxaAdmPadraoCategoria: 'Taxa de Administração'
  });

  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Carregar clientes, embarcações e configuração padrão ao abrir
  useEffect(() => {
    if (!open) return;

    const cl = clientDB.getAll();
    const bt = boatDB.getAll();
    setClients([...cl]);
    setBoats([...bt]);
    setErrorMsg(null);

    if (preselectedClientId) {
      setClienteId(preselectedClientId);
    } else if (cl.length > 0 && !clienteId) {
      setClienteId('');
    }

    if (preselectedBoatId) {
      setEmbarcacaoId(preselectedBoatId);
    }

    // Buscar configurações padrão definidas pelo Administrador
    fetch('/api/financeiro/configuracoes', {
      credentials: 'include',
      headers: getAuthHeader()
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.configuracoes) {
          const cfg = data.configuracoes;
          setDefaultConfigInfo({
            vendaPadraoEmpresa: cfg.vendaPadraoEmpresa || 'Mexicano',
            vendaPadraoCategoria: cfg.vendaPadraoCategoria || 'Venda de Cota',
            taxaAdmPadraoEmpresa: cfg.taxaAdmPadraoEmpresa || 'Vale Administradora',
            taxaAdmPadraoCategoria: cfg.taxaAdmPadraoCategoria || 'Taxa de Administração'
          });
          if (cfg.taxaAdmPadraoValor) {
            setValorTaxaAdm(String(cfg.taxaAdmPadraoValor));
          }
        }
      })
      .catch(() => {});
  }, [open, preselectedClientId, preselectedBoatId]);

  // Atualizar data do 1º vencimento quando o dia de vencimento mudar
  const handleDiaVencimentoChange = (val: string) => {
    setDiaVencimento(val);
    const numDay = parseInt(val, 10);
    if (!isNaN(numDay) && numDay >= 1 && numDay <= 31) {
      setPrimeiroVencimento(getNextMonthDueDate(numDay));
    }
  };

  const handleDiaVencimentoTaxaAdmChange = (val: string) => {
    setDiaVencimentoTaxaAdm(val);
    const numDay = parseInt(val, 10);
    if (!isNaN(numDay) && numDay >= 1 && numDay <= 31) {
      setPrimeiroVencimentoTaxaAdm(getNextMonthDueDate(numDay));
    }
  };

  // Cálculos financeiros em tempo real
  const valorTotalNum = useMemo(() => Math.max(0, parseFloat(valorTotal.replace(',', '.')) || 0), [valorTotal]);
  const valorEntradaNum = useMemo(() => Math.max(0, parseFloat(valorEntrada.replace(',', '.')) || 0), [valorEntrada]);
  const saldoRemanescente = useMemo(() => Math.max(0, Math.round((valorTotalNum - valorEntradaNum) * 100) / 100), [valorTotalNum, valorEntradaNum]);
  const numParcelasInt = useMemo(() => Math.max(0, parseInt(numParcelas, 10) || 0), [numParcelas]);

  const valorParcelaCalculado = useMemo(() => {
    if (numParcelasInt <= 0 || saldoRemanescente <= 0) return 0;
    return Math.round((saldoRemanescente / numParcelasInt) * 100) / 100;
  }, [saldoRemanescente, numParcelasInt]);

  const valorParcelaFinal = useMemo(() => {
    if (valorParcelaManual.trim() !== '') {
      const manual = parseFloat(valorParcelaManual.replace(',', '.'));
      if (!isNaN(manual) && manual >= 0) return manual;
    }
    return valorParcelaCalculado;
  }, [valorParcelaManual, valorParcelaCalculado]);

  // Verificar ocupação de cotas na embarcação selecionada
  const cotasOcupadasMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!embarcacaoId) return map;
    clients.forEach(c => {
      if (c.status === 'inativo') return;
      if (c.embarcacaoId === embarcacaoId && c.cota) {
        map.set(c.cota.toUpperCase(), c.nome);
      }
      if (Array.isArray(c.embarcacoes)) {
        c.embarcacoes.forEach(v => {
          if (v.embarcacaoId === embarcacaoId && v.cota) {
            map.set(v.cota.toUpperCase(), c.nome);
          }
        });
      }
    });
    return map;
  }, [clients, embarcacaoId]);

  // Prévia das parcelas de cota
  const previewParcelas = useMemo(() => {
    if (numParcelasInt <= 0 || valorParcelaFinal <= 0) return [];
    const list: { numero: number; vencimento: string; valor: number }[] = [];
    const [bYear, bMonth] = (primeiroVencimento || getNextMonthDueDate(10)).split('-').map(Number);
    const dueDay = parseInt(diaVencimento, 10) || 10;

    for (let i = 0; i < Math.min(numParcelasInt, 60); i++) {
      const d = new Date(bYear, bMonth - 1 + i, 1);
      const maxD = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const day = Math.min(dueDay, maxD);
      const venc = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      list.push({
        numero: i + 1,
        vencimento: venc,
        valor: valorParcelaFinal
      });
    }
    return list;
  }, [numParcelasInt, valorParcelaFinal, primeiroVencimento, diaVencimento]);

  // Upload do comprovante da entrada
  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComprovante(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('comprovante', file);

      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeader(),
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Falha ao enviar comprovante.');
      }

      setComprovanteEntrada(data.url);
      setComprovanteNome(file.name);
      // Ao anexar comprovante da entrada, sugerir marcação como paga
      setEntradaPaga(true);
    } catch (err: any) {
      console.error('Erro no upload de comprovante:', err);
      setErrorMsg(err.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setIsUploadingComprovante(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submissão completa da Venda
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clienteId) {
      setErrorMsg('Selecione o cliente comprador.');
      return;
    }
    if (!embarcacaoId) {
      setErrorMsg('Selecione a embarcação adquirida.');
      return;
    }
    if (valorTotalNum <= 0) {
      setErrorMsg('Informe um valor total de venda válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clienteId,
        embarcacaoId,
        cota,
        dataVenda,
        valorTotal: valorTotalNum,
        valorEntrada: valorEntradaNum,
        dataEntrada,
        entradaPaga,
        comprovanteEntrada,
        numParcelas: numParcelasInt,
        valorParcela: valorParcelaFinal,
        diaVencimento: parseInt(diaVencimento, 10) || 10,
        primeiroVencimento,
        formaPagamento,
        gerarTaxaAdm,
        valorTaxaAdm: parseFloat(valorTaxaAdm.replace(',', '.')) || 0,
        mesesTaxaAdm: parseInt(mesesTaxaAdm, 10) || 12,
        diaVencimentoTaxaAdm: parseInt(diaVencimentoTaxaAdm, 10) || 10,
        primeiroVencimentoTaxaAdm,
        observacoes
      };

      const res = await fetch('/api/comercial/vendas', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      }
      if (!res.ok || data.error) {
        throw new Error(data.message || `Falha ao lançar a venda (Status ${res.status}).`);
      }

      // Sincronizar o banco em memória para refletir imediatamente o vínculo Cliente <-> Embarcação e Contrato
      await syncWithRemote().catch(() => {});

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Erro ao lançar venda:', err);
      setErrorMsg(err.message || 'Erro inesperado ao registrar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedClient = clients.find(c => c.id === clienteId);
  const selectedBoat = boats.find(b => b.id === embarcacaoId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          className="relative w-full max-w-3xl bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">Lançar Nova Venda de Cota</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30">
                    Integração Financeira
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Vincula o cliente à embarcação e gera automaticamente a entrada e as parcelas no Financeiro
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/60">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SEÇÃO 1: CLIENTE, EMBARCAÇÃO E COTA */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">1. Cliente, Embarcação e Cota</h3>
                    <p className="text-[11px] text-stone-500">
                      O cliente será vinculado automaticamente como cotista da embarcação selecionada
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Novo Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Cliente Comprador *
                  </label>
                  <select
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  >
                    <option value="">-- Selecione um cliente cadastrado --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cpf ? `(${c.cpf})` : ''} {c.telefone ? `• ${c.telefone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Embarcação */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Embarcação *
                  </label>
                  <select
                    value={embarcacaoId}
                    onChange={e => setEmbarcacaoId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  >
                    <option value="">-- Selecione a Embarcação --</option>
                    {boats.map(b => (
                      <option key={b.id} value={b.id}>
                        {formatBoatName(b.nome)} ({b.donos?.length || 0}/{b.totalCotas || 4} cotas)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data da Venda */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Data da Venda *
                  </label>
                  <input
                    type="date"
                    value={dataVenda}
                    onChange={e => setDataVenda(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>

                {/* Seleção Visual da Cota */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Cota Adquirida *
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {COTAS_LIST.map(cItem => {
                      const ocupante = cotasOcupadasMap.get(cItem);
                      const isSelected = cota === cItem;
                      return (
                        <button
                          key={cItem}
                          type="button"
                          onClick={() => setCota(cItem)}
                          title={ocupante ? `Ocupada por: ${ocupante}` : `Cota ${cItem} disponível`}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                              : ocupante
                              ? 'bg-amber-50/70 text-amber-800 border-amber-200 hover:border-amber-400'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{cItem}</span>
                          <span className={`text-[9px] font-medium truncate max-w-full ${
                            isSelected ? 'text-stone-300' : ocupante ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {ocupante ? 'Ocupada' : 'Livre'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {cotasOcupadasMap.get(cota) && (
                    <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
                      Nota: A cota {cota} já possui vínculo com <strong>{cotasOcupadasMap.get(cota)}</strong> nesta embarcação.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: ENTRADA (SINAL) E COMPROVANTE */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">2. Valor da Venda & Entrada</h3>
                    <p className="text-[11px] text-stone-500">
                      A entrada é um valor único e pode ser lançada já como paga com comprovante anexo
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                  Destino: {defaultConfigInfo.vendaPadraoEmpresa}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Valor Total da Cota (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorTotal}
                    onChange={e => {
                      setValorTotal(e.target.value);
                      setValorParcelaManual('');
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Valor da Entrada (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorEntrada}
                    onChange={e => {
                      setValorEntrada(e.target.value);
                      setValorParcelaManual('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-emerald-700 focus:bg-white focus:border-emerald-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Data de Vencimento / Pagamento da Entrada
                  </label>
                  <input
                    type="date"
                    value={dataEntrada}
                    onChange={e => setDataEntrada(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Box de Status da Entrada + Upload de Comprovante */}
              {valorEntradaNum > 0 && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entradaPaga
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={entradaPaga}
                        onChange={e => setEntradaPaga(e.target.checked)}
                        className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          Entrada já foi paga pelo cliente
                          {entradaPaga && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              <Check className="w-3 h-3" /> Liquidada no Financeiro
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-stone-500">
                          {entradaPaga
                            ? 'O registro da entrada será lançado como PAGO e somará imediatamente ao caixa.'
                            : 'O registro da entrada será lançado como A RECEBER (pendente) na data informada.'}
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleUploadComprovante}
                        className="hidden"
                      />
                      {comprovanteEntrada ? (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                          <a
                            href={comprovanteEntrada}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1.5 max-w-[160px] truncate"
                            title={comprovanteNome || 'Ver comprovante'}
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            {comprovanteNome || 'Comprovante anexado'}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setComprovanteEntrada(null);
                              setComprovanteNome(null);
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Remover comprovante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploadingComprovante}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingComprovante ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 text-emerald-600" />
                              Anexar Comprovante
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: PARCELAMENTO DA COTA */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">3. Parcelamento do Saldo Remanescente</h3>
                    <p className="text-[11px] text-stone-500">
                      Saldo a parcelar:{' '}
                      <strong className="text-stone-800">
                        R$ {saldoRemanescente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </p>
                  </div>
                </div>
                {numParcelasInt > 0 && valorParcelaFinal > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                    {numParcelasInt}x de R$ {valorParcelaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Nº de Parcelas
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={numParcelas}
                    onChange={e => {
                      setNumParcelas(e.target.value);
                      setValorParcelaManual('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorParcelaManual !== '' ? valorParcelaManual : valorParcelaCalculado}
                    onChange={e => setValorParcelaManual(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-indigo-700 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diaVencimento}
                    onChange={e => handleDiaVencimentoChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    1º Vencimento
                  </label>
                  <input
                    type="date"
                    value={primeiroVencimento}
                    onChange={e => setPrimeiroVencimento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Forma de Pagamento Padrão
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                  >
                    <option value="Boleto / PIX">Boleto / PIX</option>
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>
                </div>
              </div>

              {/* Botão para ver prévia do cronograma */}
              {previewParcelas.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSchedulePreview(prev => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {showSchedulePreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showSchedulePreview
                      ? 'Ocultar prévia de vencimentos'
                      : `Visualizar cronograma das ${previewParcelas.length} parcelas`}
                  </button>

                  {showSchedulePreview && (
                    <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {previewParcelas.map(p => (
                        <div
                          key={p.numero}
                          className="bg-white px-3 py-2 rounded-lg border border-stone-200/80 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-bold text-stone-700">
                            {p.numero}/{numParcelasInt} • {p.vencimento.split('-').reverse().join('/')}
                          </span>
                          <span className="font-semibold text-emerald-700">
                            R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEÇÃO 4: TAXA DE ADMINISTRAÇÃO OPCIONAL */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gerarTaxaAdm}
                    onChange={e => setGerarTaxaAdm(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      4. Gerar registros financeiros de Taxa de Administração
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Opcional: já agenda as mensalidades de Taxa de Administração ({defaultConfigInfo.taxaAdmPadraoEmpresa})
                    </p>
                  </div>
                </label>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  {gerarTaxaAdm ? 'Ativado' : 'Opcional'}
                </span>
              </div>

              {gerarTaxaAdm && (
                <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Valor Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorTaxaAdm}
                      onChange={e => setValorTaxaAdm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-amber-700 focus:bg-white focus:border-amber-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Meses de Recorrência
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={mesesTaxaAdm}
                      onChange={e => setMesesTaxaAdm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-bold text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Dia de Vencimento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={diaVencimentoTaxaAdm}
                      onChange={e => handleDiaVencimentoTaxaAdmChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      1º Vencimento (Taxa Adm)
                    </label>
                    <input
                      type="date"
                      value={primeiroVencimentoTaxaAdm}
                      onChange={e => setPrimeiroVencimentoTaxaAdm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 5: OBSERVAÇÕES & RESUMO DE AUTOMAÇÃO */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Observações da Negociação
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Condições especiais negociadas, detalhes sobre a entrada ou observações para o financeiro..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none transition-all resize-none"
                />
              </div>

              {/* Resumo do que será executado automaticamente */}
              <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Resumo da Automação ao Confirmar Venda</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-1.5 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Vínculo imediato de{' '}
                      <strong className="text-white">{selectedClient?.nome || 'Cliente'}</strong> à embarcação{' '}
                      <strong className="text-white">
                        {selectedBoat ? formatBoatName(selectedBoat.nome) : 'Embarcação'} ({cota})
                      </strong>
                    </span>
                  </li>
                  {valorEntradaNum > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        1 Lançamento de <strong>Entrada</strong> de{' '}
                        <strong className="text-emerald-300">
                          R$ {valorEntradaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>{' '}
                        ({entradaPaga ? 'Status: PAGO' : 'Status: A RECEBER'}) em{' '}
                        <strong className="text-white">{defaultConfigInfo.vendaPadraoEmpresa}</strong>
                      </span>
                    </li>
                  )}
                  {numParcelasInt > 0 && valorParcelaFinal > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{numParcelasInt} Parcelas de Cota</strong> de{' '}
                        <strong className="text-emerald-300">
                          R$ {valorParcelaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>{' '}
                        em Parcelas Fixas ({defaultConfigInfo.vendaPadraoEmpresa})
                      </span>
                    </li>
                  )}
                  {gerarTaxaAdm && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        <strong>{parseInt(mesesTaxaAdm, 10) || 12} Mensalidades de Taxa de Administração</strong> de{' '}
                        <strong className="text-amber-300">
                          R$ {(parseFloat(valorTaxaAdm.replace(',', '.')) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>{' '}
                        ({defaultConfigInfo.taxaAdmPadraoEmpresa})
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando Venda e Lançamentos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Venda e Gerar Financeiro
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Rápido para Cadastrar Novo Cliente sem sair do Lançamento de Venda */}
      <ComercialClientModal
        isOpen={isNewClientModalOpen}
        editingClient={null}
        boats={boats}
        onClose={() => setIsNewClientModalOpen(false)}
        onSave={savedClient => {
          const updatedClients = clientDB.getAll();
          setClients([...updatedClients]);
          if (savedClient?.id) {
            setClienteId(savedClient.id);
            if (savedClient.embarcacaoId && !embarcacaoId) {
              setEmbarcacaoId(savedClient.embarcacaoId);
            }
          }
          setIsNewClientModalOpen(false);
        }}
      />
    </>
  );
}
