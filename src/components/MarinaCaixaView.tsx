import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Plus, Minus,
  Calendar, Clock, Filter, Search, Download, Printer, Eye, Trash2,
  Edit2, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Banknote, QrCode, CreditCard, Ship, ShieldCheck, X, LifeBuoy,
  FileText, Check, ChevronDown, ChevronUp, AlertTriangle, ArrowRight
} from 'lucide-react';
import { TransacaoCaixaMarina, FechamentoCaixaMarina, Cliente, Embarcacao } from '../types';
import SearchableSelect from './shared/SearchableSelect';

interface MarinaCaixaViewProps {
  operadorNome?: string;
  clients?: Cliente[];
  boats?: Embarcacao[];
  reloadData?: () => void;
}

const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatCurrency = (val: number | null | undefined) => {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function MarinaCaixaView({ operadorNome, clients = [], boats = [], reloadData }: MarinaCaixaViewProps) {
  const currentOperator = operadorNome || localStorage.getItem('admin_name') || 'Gerente';
  const todayStr = getTodayStr();

  // ────────────── Estados de Dados ──────────────
  const [transacoes, setTransacoes] = useState<TransacaoCaixaMarina[]>([]);
  const [fechamentoHoje, setFechamentoHoje] = useState<FechamentoCaixaMarina | null>(null);
  const [abastecimentosPendentes, setAbastecimentosPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ────────────── Estados de Filtro ──────────────
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterFormaPagto, setFilterFormaPagto] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // ────────────── Modais ──────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransacaoCaixaMarina | null>(null);
  const [modalType, setModalType] = useState<'entrada' | 'saida'>('entrada');
  const [modalCategoria, setModalCategoria] = useState<string>('outros_entrada');
  const [modalDescricao, setModalDescricao] = useState('');
  const [modalValor, setModalValor] = useState('');
  const [modalFormaPagto, setModalFormaPagto] = useState<string>('dinheiro');
  const [modalData, setModalData] = useState(todayStr);
  const [modalHora, setModalHora] = useState('');
  const [modalClienteTipo, setModalClienteTipo] = useState<'avulso' | 'mensalista' | 'cotista'>('avulso');
  const [modalClienteId, setModalClienteId] = useState('');
  const [modalClienteNome, setModalClienteNome] = useState('');
  const [modalEmbarcacaoId, setModalEmbarcacaoId] = useState('');
  const [modalEmbarcacaoNome, setModalEmbarcacaoNome] = useState('');
  const [modalCombustivelLitros, setModalCombustivelLitros] = useState('');
  const [modalQtdColetes, setModalQtdColetes] = useState('1');
  const [modalObservacoes, setModalObservacoes] = useState('');
  const [modalComprovanteUrl, setModalComprovanteUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modais específicos
  const [isAberturaModalOpen, setIsAberturaModalOpen] = useState(false);
  const [aberturaValor, setAberturaValor] = useState('');
  const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
  const [fechamentoContado, setFechamentoContado] = useState('');
  const [fechamentoObs, setFechamentoObs] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal de Baixa de Abastecimento
  const [baixaModalItem, setBaixaModalItem] = useState<any | null>(null);
  const [baixaFormaPagto, setBaixaFormaPagto] = useState<string>('pix');
  const [baixaValorTotal, setBaixaValorTotal] = useState('');
  const [baixaComprovanteUrl, setBaixaComprovanteUrl] = useState<string | null>(null);

  // ────────────── Carregamento de Dados ──────────────
  const fetchCaixaData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    const token = localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // 1. Transações do Caixa
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterTipo !== 'todos') params.append('tipo', filterTipo);
      if (filterCategoria !== 'todas') params.append('categoria', filterCategoria);
      if (filterFormaPagto !== 'todas') params.append('formaPagamento', filterFormaPagto);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const resTrx = await fetch(`/api/marina/caixa/transacoes?${params.toString()}`, { headers });
      if (resTrx.ok) {
        const dataTrx = await resTrx.json();
        setTransacoes(Array.isArray(dataTrx) ? dataTrx : []);
      }

      // 2. Fechamento de Hoje
      const resFech = await fetch(`/api/marina/caixa/fechamento?data=${todayStr}`, { headers });
      if (resFech.ok) {
        const dataFech = await resFech.json();
        setFechamentoHoje(dataFech);
      }

      // 3. Abastecimentos Pendentes
      const resPend = await fetch('/api/marina/caixa/abastecimentos-pendentes', { headers });
      if (resPend.ok) {
        const dataPend = await resPend.json();
        setAbastecimentosPendentes(Array.isArray(dataPend) ? dataPend : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do caixa:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCaixaData();
  }, [startDate, endDate, filterTipo, filterCategoria, filterFormaPagto, searchTerm]);

  // ────────────── Período Preset Handler ──────────────
  const handleSelectPreset = (preset: typeof periodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const today = getTodayStr();

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
      setStartDate(d7Str);
      setEndDate(today);
    } else if (preset === 'this_month') {
      const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(mStart);
      setEndDate(today);
    } else if (preset === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      const lmStart = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`;
      const lmEnd = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(lmStart);
      setEndDate(lmEnd);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // ────────────── Cálculos de Métricas e Totais ──────────────
  const metrics = useMemo(() => {
    let entradasDinheiro = 0;
    let saidasDinheiro = 0;
    let sangriasDinheiro = 0;
    let suprimentosDinheiro = 0;
    let totalPix = 0;
    let totalCartaoDebito = 0;
    let totalCartaoCredito = 0;
    let totalOutros = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    transacoes.forEach(t => {
      const val = Number(t.valor) || 0;
      const fp = (t.formaPagamento || '').toLowerCase();

      if (t.tipo === 'entrada') {
        totalEntradas += val;
        if (fp === 'dinheiro') {
          if (t.categoria === 'suprimento') {
            suprimentosDinheiro += val;
          } else {
            entradasDinheiro += val;
          }
        } else if (fp === 'pix') {
          totalPix += val;
        } else if (fp === 'cartao_debito' || fp === 'debito') {
          totalCartaoDebito += val;
        } else if (fp === 'cartao_credito' || fp === 'credito') {
          totalCartaoCredito += val;
        } else {
          totalOutros += val;
        }
      } else if (t.tipo === 'saida') {
        totalSaidas += val;
        if (fp === 'dinheiro') {
          if (t.categoria === 'sangria') {
            sangriasDinheiro += val;
          } else {
            saidasDinheiro += val;
          }
        }
      }
    });

    const fundoTroco = Number(fechamentoHoje?.saldoAberturaDinheiro) || 0;
    const saldoDinheiroGaveta = fundoTroco + entradasDinheiro + suprimentosDinheiro - saidasDinheiro - sangriasDinheiro;
    const saldoLiquidoPeriodo = totalEntradas - totalSaidas;

    return {
      fundoTroco,
      entradasDinheiro,
      saidasDinheiro,
      sangriasDinheiro,
      suprimentosDinheiro,
      saldoDinheiroGaveta,
      totalPix,
      totalCartaoDebito,
      totalCartaoCredito,
      totalCartoes: totalCartaoDebito + totalCartaoCredito,
      totalOutros,
      totalEntradas,
      totalSaidas,
      saldoLiquidoPeriodo
    };
  }, [transacoes, fechamentoHoje]);

  // Lista de coletes em uso
  const coletesEmUso = useMemo(() => {
    return transacoes.filter(t => t.categoria === 'aluguel_coletes' && !t.coletesDevolvidos);
  }, [transacoes]);

  // ────────────── Abertura de Modais com Presets Rápidos ──────────────
  const openPresetModal = (presetKey: string) => {
    setEditingItem(null);
    setModalData(todayStr);
    setModalHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setModalComprovanteUrl(null);
    setModalObservacoes('');
    setModalClienteId('');
    setModalClienteNome('');
    setModalEmbarcacaoId('');
    setModalEmbarcacaoNome('');
    setModalCombustivelLitros('');
    setModalQtdColetes('1');

    if (presetKey === 'descida_jet') {
      setModalType('entrada');
      setModalCategoria('descida_avulsa_jet');
      setModalDescricao('Descida Avulsa de Jet Ski (Rampa)');
      setModalValor('100.00');
      setModalFormaPagto('pix');
      setModalClienteTipo('avulso');
      setIsModalOpen(true);
    } else if (presetKey === 'descida_lancha') {
      setModalType('entrada');
      setModalCategoria('descida_avulsa_lancha');
      setModalDescricao('Descida Avulsa de Lancha (Rampa)');
      setModalValor('50.00');
      setModalFormaPagto('pix');
      setModalClienteTipo('avulso');
      setIsModalOpen(true);
    } else if (presetKey === 'aluguel_coletes') {
      setModalType('entrada');
      setModalCategoria('aluguel_coletes');
      setModalDescricao('Aluguel de Colete Salva-Vidas (1 un)');
      setModalValor('100.00');
      setModalQtdColetes('1');
      setModalFormaPagto('pix');
      setModalClienteTipo('avulso');
      setIsModalOpen(true);
    } else if (presetKey === 'combustivel') {
      setModalType('entrada');
      setModalCategoria('combustivel');
      setModalDescricao('Abastecimento de Combustível');
      setModalValor('');
      setModalFormaPagto('pix');
      setModalClienteTipo('cotista');
      setIsModalOpen(true);
    } else if (presetKey === 'diarista') {
      setModalType('saida');
      setModalCategoria('diarista');
      setModalDescricao('Pagamento de Diarista');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'compra_operacional') {
      setModalType('saida');
      setModalCategoria('compra_operacional');
      setModalDescricao('Compra Operacional / Insumos do Píer');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'sangria') {
      setModalType('saida');
      setModalCategoria('sangria');
      setModalDescricao('Sangria de Caixa (Retirada de Dinheiro da Gaveta)');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'suprimento') {
      setModalType('entrada');
      setModalCategoria('suprimento');
      setModalDescricao('Suprimento de Caixa (Fundo de Troco Adicional)');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'outra_entrada') {
      setModalType('entrada');
      setModalCategoria('outros_entrada');
      setModalDescricao('');
      setModalValor('');
      setModalFormaPagto('pix');
      setIsModalOpen(true);
    } else if (presetKey === 'outra_saida') {
      setModalType('saida');
      setModalCategoria('outros_saida');
      setModalDescricao('');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    }
  };

  // Abrir modal para edição de transação existente
  const handleEditItem = (item: TransacaoCaixaMarina) => {
    setEditingItem(item);
    setModalType(item.tipo);
    setModalCategoria(item.categoria);
    setModalDescricao(item.descricao);
    setModalValor(item.valor.toString());
    setModalFormaPagto(item.formaPagamento);
    setModalData(item.data);
    setModalHora(item.hora || '');
    setModalClienteTipo(item.clienteTipo || 'avulso');
    setModalClienteId(item.clienteId || '');
    setModalClienteNome(item.clienteNome || '');
    setModalEmbarcacaoId(item.embarcacaoId || '');
    setModalEmbarcacaoNome(item.embarcacaoNome || '');
    setModalCombustivelLitros(item.combustivelLitros ? item.combustivelLitros.toString() : '');
    setModalQtdColetes(item.quantidadeColetes ? item.quantidadeColetes.toString() : '1');
    setModalObservacoes(item.observacoes || '');
    setModalComprovanteUrl(item.comprovanteUrl || null);
    setIsModalOpen(true);
  };

  // Upload de Comprovante
  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>, targetSetter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        targetSetter(data.url);
      } else {
        alert(data.message || 'Erro ao enviar comprovante.');
      }
    } catch (err) {
      alert('Erro de conexão ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Salvar Transação (Criação / Atualização)
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const valNum = Number(modalValor);
    if (isNaN(valNum) || valNum <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }
    if (!modalDescricao.trim()) {
      alert('Por favor, preencha a descrição do lançamento.');
      return;
    }

    setIsSubmitting(true);
    const payload: TransacaoCaixaMarina = {
      id: editingItem ? editingItem.id : `cx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tipo: modalType,
      categoria: modalCategoria,
      descricao: modalDescricao.trim(),
      valor: valNum,
      formaPagamento: modalFormaPagto,
      data: modalData,
      hora: modalHora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'confirmado',
      clienteTipo: modalClienteTipo,
      clienteId: modalClienteId || null,
      clienteNome: modalClienteNome ? modalClienteNome.trim() : (modalClienteId ? clients.find(c => c.id === modalClienteId)?.nome : null),
      embarcacaoId: modalEmbarcacaoId || null,
      embarcacaoNome: modalEmbarcacaoNome ? modalEmbarcacaoNome.trim() : (modalEmbarcacaoId ? boats.find(b => b.id === modalEmbarcacaoId)?.nome : null),
      combustivelLitros: modalCombustivelLitros ? Number(modalCombustivelLitros) : null,
      quantidadeColetes: modalCategoria === 'aluguel_coletes' ? (Number(modalQtdColetes) || 1) : null,
      coletesDevolvidos: editingItem ? editingItem.coletesDevolvidos : false,
      comprovanteUrl: modalComprovanteUrl,
      observacoes: modalObservacoes ? modalObservacoes.trim() : null,
      registradoPor: currentOperator,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/marina/caixa/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: payload })
      });

      if (!res.ok) throw new Error('Falha ao salvar lançamento');

      setIsModalOpen(false);
      fetchCaixaData(true);
      if (reloadData) reloadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar no caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir Lançamento
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento do caixa? Esta ação ficará registrada.')) return;

    try {
      const res = await fetch('/api/marina/caixa/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'delete', data: { id } })
      });

      if (!res.ok) throw new Error('Falha ao excluir');
      fetchCaixaData(true);
      if (reloadData) reloadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir lançamento.');
    }
  };

  // Devolver Coletes
  const handleDevolverColetes = async (id: string) => {
    if (!window.confirm('Confirmar a devolução dos coletes salva-vidas?')) return;
    try {
      const res = await fetch('/api/marina/caixa/transacoes/devolver-coletes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ id, devolvidoPor: currentOperator })
      });
      if (!res.ok) throw new Error('Erro ao registrar devolução');
      fetchCaixaData(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar devolução.');
    }
  };

  // Abertura de Caixa
  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const fundoNum = Number(aberturaValor);
    if (isNaN(fundoNum) || fundoNum < 0) {
      alert('Informe um valor de fundo de troco válido (pode ser R$ 0,00).');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: `fech_${todayStr}`,
      data: todayStr,
      saldoAberturaDinheiro: fundoNum,
      totalEntradasDinheiro: 0,
      totalSaidasDinheiro: 0,
      totalSangriasDinheiro: 0,
      saldoEsperadoDinheiro: fundoNum,
      saldoContadoDinheiro: 0,
      diferencaDinheiro: 0,
      totalPix: 0,
      totalCartaoDebito: 0,
      totalCartaoCredito: 0,
      totalGeralEntradas: 0,
      totalGeralSaidas: 0,
      saldoFinalTotal: fundoNum,
      status: 'aberto',
      abertoPor: currentOperator,
      abertoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/marina/caixa/fechamento/salvar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao abrir caixa');
      setIsAberturaModalOpen(false);
      fetchCaixaData(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fechamento Diário de Caixa
  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const contadoNum = Number(fechamentoContado);
    if (isNaN(contadoNum) || contadoNum < 0) {
      alert('Informe o valor total em dinheiro físico contado na gaveta.');
      return;
    }

    setIsSubmitting(true);
    const esperadoDinheiro = metrics.saldoDinheiroGaveta;
    const diferenca = contadoNum - esperadoDinheiro;

    const payload = {
      id: fechamentoHoje ? fechamentoHoje.id : `fech_${todayStr}`,
      data: todayStr,
      saldoAberturaDinheiro: metrics.fundoTroco,
      totalEntradasDinheiro: metrics.entradasDinheiro,
      totalSaidasDinheiro: metrics.saidasDinheiro,
      totalSangriasDinheiro: metrics.sangriasDinheiro,
      saldoEsperadoDinheiro: esperadoDinheiro,
      saldoContadoDinheiro: contadoNum,
      diferencaDinheiro: diferenca,
      totalPix: metrics.totalPix,
      totalCartaoDebito: metrics.totalCartaoDebito,
      totalCartaoCredito: metrics.totalCartaoCredito,
      totalGeralEntradas: metrics.totalEntradas,
      totalGeralSaidas: metrics.totalSaidas,
      saldoFinalTotal: contadoNum + metrics.totalPix + metrics.totalCartoes,
      status: 'fechado',
      abertoPor: fechamentoHoje?.abertoPor || currentOperator,
      abertoEm: fechamentoHoje?.abertoEm || '08:00',
      fechadoPor: currentOperator,
      fechadoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      observacoesFechamento: fechamentoObs.trim() || null,
      createdAt: fechamentoHoje?.createdAt || new Date().toISOString()
    };

    try {
      const res = await fetch('/api/marina/caixa/fechamento/salvar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao salvar fechamento');
      setIsFechamentoModalOpen(false);
      fetchCaixaData(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar fechamento do caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Baixa de Abastecimento do Píer
  const handleBaixarAbastecimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baixaModalItem) return;

    const valNum = Number(baixaValorTotal);
    if (isNaN(valNum) || valNum <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marina/caixa/abastecimentos-baixar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          reservaId: baixaModalItem.reservaId,
          formaPagamento: baixaFormaPagto,
          valorTotal: valNum,
          operadorNome: currentOperator,
          comprovanteUrl: baixaComprovanteUrl
        })
      });

      if (!res.ok) throw new Error('Erro ao dar baixa no abastecimento');

      setBaixaModalItem(null);
      fetchCaixaData(true);
      if (reloadData) reloadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar baixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para badge de forma de pagamento
  const renderPaymentBadge = (fp: string) => {
    const p = (fp || '').toLowerCase();
    if (p === 'dinheiro') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><Banknote className="w-3.5 h-3.5" /> Dinheiro (Gaveta)</span>;
    }
    if (p === 'pix') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200"><QrCode className="w-3.5 h-3.5" /> PIX</span>;
    }
    if (p === 'cartao_debito' || p === 'debito') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><CreditCard className="w-3.5 h-3.5" /> Débito</span>;
    }
    if (p === 'cartao_credito' || p === 'credito') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"><CreditCard className="w-3.5 h-3.5" /> Crédito</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{fp}</span>;
  };

  // Helper para categoria formatada
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'combustivel': return 'Combustível';
      case 'descida_avulsa_jet': return 'Descida Jet (Rampa)';
      case 'descida_avulsa_lancha': return 'Descida Lancha (Rampa)';
      case 'aluguel_coletes': return 'Aluguel de Coletes';
      case 'diarista': return 'Diarista';
      case 'compra_operacional': return 'Compra Operacional';
      case 'manutencao_equipamentos': return 'Manutenção / Trator';
      case 'limpeza_pier': return 'Limpeza do Píer';
      case 'sangria': return 'Sangria de Gaveta';
      case 'suprimento': return 'Fundo de Troco / Suprimento';
      case 'outros_entrada': return 'Outra Entrada';
      case 'outros_saida': return 'Outra Saída';
      default: return cat;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 md:p-8 space-y-6">
      
      {/* ══════════════════ CABEÇALHO DO CAIXA ══════════════════ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Controle de Caixa da Marina</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestão financeira independente do píer, rampa, coletes, abastecimentos e saídas diárias.
              </p>
            </div>
          </div>
        </div>

        {/* Status do Dia & Ações do Caixa */}
        <div className="flex flex-wrap items-center gap-3">
          {fechamentoHoje?.status === 'aberto' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caixa Aberto hoje por <strong>{fechamentoHoje.abertoPor || 'Gerente'}</strong> (Fundo: {formatCurrency(fechamentoHoje.saldoAberturaDinheiro)})</span>
            </div>
          ) : fechamentoHoje?.status === 'fechado' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Caixa Fechado em {fechamentoHoje.fechadoEm || 'Hoje'} por <strong>{fechamentoHoje.fechadoPor}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Caixa do dia ainda não aberto</span>
            </div>
          )}

          {fechamentoHoje?.status !== 'aberto' ? (
            <button
              onClick={() => {
                setAberturaValor('0.00');
                setIsAberturaModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Abrir Caixa do Dia
            </button>
          ) : (
            <button
              onClick={() => {
                setFechamentoContado(metrics.saldoDinheiroGaveta.toFixed(2));
                setFechamentoObs('');
                setIsFechamentoModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Fechar Caixa do Dia
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition shadow-sm"
            title="Imprimir Relatório do Período"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Imprimir
          </button>

          <button
            onClick={() => fetchCaixaData()}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-400' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* ══════════════════ CARDS DE MÉTRICAS EM TEMPO REAL ══════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Saldo Dinheiro Gaveta */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dinheiro em Espécie</span>
            <Banknote className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.saldoDinheiroGaveta)}
          </div>
          <p className="text-xs text-emerald-700 mt-1 font-medium">
            Saldo Físico na Gaveta
          </p>
        </div>

        {/* PIX Recebido */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-teal-200/80 bg-gradient-to-br from-white to-teal-50/40">
          <div className="flex items-center justify-between text-teal-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Recebido via PIX</span>
            <QrCode className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.totalPix)}
          </div>
          <p className="text-xs text-teal-700 mt-1 font-medium">
            Entradas no Período
          </p>
        </div>

        {/* Cartões (Débito + Crédito) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cartão Débito / Crédito</span>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.totalCartoes)}
          </div>
          <p className="text-xs text-blue-700 mt-1 font-medium">
            Déb: {formatCurrency(metrics.totalCartaoDebito)} | Créd: {formatCurrency(metrics.totalCartaoCredito)}
          </p>
        </div>

        {/* Total Entradas */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Entradas</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(metrics.totalEntradas)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receitas de Rampa, Coletes e Píer
          </p>
        </div>

        {/* Total Saídas */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Saídas</span>
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(metrics.totalSaidas)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Diaristas, Compras e Sangrias
          </p>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Líquido</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black tracking-tight ${metrics.saldoLiquidoPeriodo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(metrics.saldoLiquidoPeriodo)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Entradas (-) Saídas do Período
          </p>
        </div>

      </div>

      {/* ══════════════════ ATALHOS RÁPIDOS DE 1 CLIQUE ══════════════════ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Lançamentos Rápidos de Caixa
          </h2>
          <span className="text-xs text-slate-500">Clique para lançar instantaneamente</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          {/* Descida Jet R$ 100 */}
          <button
            onClick={() => openPresetModal('descida_jet')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Ship className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Descida Jet</span>
            <span className="text-sm font-black text-emerald-700 mt-0.5">R$ 100</span>
          </button>

          {/* Descida Lancha R$ 50 */}
          <button
            onClick={() => openPresetModal('descida_lancha')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100 hover:border-teal-300 text-teal-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Ship className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Descida Lancha</span>
            <span className="text-sm font-black text-teal-700 mt-0.5">R$ 50</span>
          </button>

          {/* Aluguel Colete R$ 100 */}
          <button
            onClick={() => openPresetModal('aluguel_coletes')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 text-blue-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Aluguel Colete</span>
            <span className="text-sm font-black text-blue-700 mt-0.5">R$ 100</span>
          </button>

          {/* Abastecimento */}
          <button
            onClick={() => openPresetModal('combustivel')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Combustível</span>
            <span className="text-xs text-indigo-600 font-semibold mt-0.5">Entrada</span>
          </button>

          {/* Pagamento Diarista */}
          <button
            onClick={() => openPresetModal('diarista')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 text-rose-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Minus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Diarista</span>
            <span className="text-xs text-rose-600 font-semibold mt-0.5">Saída</span>
          </button>

          {/* Compra Operacional */}
          <button
            onClick={() => openPresetModal('compra_operacional')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 text-amber-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Compras / Píer</span>
            <span className="text-xs text-amber-700 font-semibold mt-0.5">Saída</span>
          </button>

          {/* Sangria */}
          <button
            onClick={() => openPresetModal('sangria')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300 text-purple-950 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Banknote className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Sangria Gaveta</span>
            <span className="text-xs text-purple-600 font-semibold mt-0.5">Retirada</span>
          </button>

          {/* Outro Lançamento */}
          <button
            onClick={() => openPresetModal('outra_entrada')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 transition text-center group shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Outra Entrada</span>
            <span className="text-xs text-slate-500 font-semibold mt-0.5">Livre</span>
          </button>

        </div>
      </div>

      {/* ══════════════════ ABASTECIMENTOS PENDENTES DE BAIXA NO CAIXA ══════════════════ */}
      {abastecimentosPendentes.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {abastecimentosPendentes.length} Abastecimento(s) do Píer Aguardando Recebimento no Caixa
                </h3>
                <p className="text-xs text-amber-800">
                  Registrados pelos marinheiros na chegada de embarcações que precisam de baixa financeira.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {abastecimentosPendentes.map((item) => (
              <div key={item.reservaId} className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.embarcacaoNome}</span>
                    <span className="text-xs text-slate-500">{formatDisplayDate(item.data)}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Cliente: <strong>{item.clienteNome}</strong>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">{item.litros} Litros</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.valorTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBaixaModalItem(item);
                    setBaixaFormaPagto(item.formaPagamentoSugerida || 'pix');
                    setBaixaValorTotal(item.valorTotal.toFixed(2));
                    setBaixaComprovanteUrl(item.comprovanteUrl || null);
                  }}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dar Baixa no Caixa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════ COLETES EM USO (ALUGADOS) ══════════════════ */}
      {coletesEmUso.length > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">
                  {coletesEmUso.length} Aluguel(is) de Coletes em Aberto (Pendente de Devolução)
                </h3>
                <p className="text-xs text-blue-800">
                  Acompanhamento de coletes alugados em uso no píer/água.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {coletesEmUso.map(c => (
              <div key={c.id} className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">{c.clienteNome || 'Cliente Avulso'}</div>
                  <div className="text-xs text-slate-500">{c.quantidadeColetes || 1} colete(s) • {formatDisplayDate(c.data)} {c.hora}</div>
                </div>
                <button
                  onClick={() => handleDevolverColetes(c.id)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm shrink-0"
                  title="Confirmar devolução do colete"
                >
                  <Check className="w-3.5 h-3.5" /> Devolvido
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════ FILTROS E EXTRATO GERAL ══════════════════ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        
        {/* Barra de Busca e Atalhos de Período */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Presets de Data */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => handleSelectPreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodPreset === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => handleSelectPreset('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodPreset === 'yesterday' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ontem
            </button>
            <button
              onClick={() => handleSelectPreset('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodPreset === '7days' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              7 Dias
            </button>
            <button
              onClick={() => handleSelectPreset('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodPreset === 'this_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handleSelectPreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodPreset === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos
            </button>
          </div>

          {/* Busca e Botão de Filtros */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar no caixa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>

            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${showFiltersPanel ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
          </div>

        </div>

        {/* Painel Avançado de Filtros */}
        {showFiltersPanel && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="entrada">Apenas Entradas (+)</option>
                <option value="saida">Apenas Saídas (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="todas">Todas as Categorias</option>
                <option value="combustivel">Combustível</option>
                <option value="descida_avulsa_jet">Descida Jet (Rampa)</option>
                <option value="descida_avulsa_lancha">Descida Lancha (Rampa)</option>
                <option value="aluguel_coletes">Aluguel de Coletes</option>
                <option value="diarista">Diarista</option>
                <option value="compra_operacional">Compra Operacional</option>
                <option value="manutencao_equipamentos">Manutenção / Trator</option>
                <option value="sangria">Sangria</option>
                <option value="suprimento">Suprimento / Troco</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Forma de Pagamento</label>
              <select
                value={filterFormaPagto}
                onChange={e => setFilterFormaPagto(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="todas">Todas as Formas</option>
                <option value="dinheiro">Dinheiro (Gaveta)</option>
                <option value="pix">PIX</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="cartao_credito">Cartão de Crédito</option>
              </select>
            </div>
          </div>
        )}

        {/* ══════════════════ TABELA DO EXTRATO ══════════════════ */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Descrição & Vínculo</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4">Comprovante</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
                    Carregando lançamentos do caixa...
                  </td>
                </tr>
              ) : transacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum lançamento encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                transacoes.map((item) => {
                  const isEntrada = item.tipo === 'entrada';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Data / Hora */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold">{formatDisplayDate(item.data)}</div>
                        <div className="text-[11px] text-slate-400">{item.hora || '--:--'}</div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEntrada ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <ArrowUpRight className="w-3 h-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <ArrowDownRight className="w-3 h-3" /> Saída
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {getCategoryLabel(item.categoria)}
                      </td>

                      {/* Descrição & Vínculo */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{item.descricao}</div>
                        {(item.clienteNome || item.embarcacaoNome) && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.clienteNome && <span>Cli: {item.clienteNome} </span>}
                            {item.embarcacaoNome && <span>• Barco: {item.embarcacaoNome}</span>}
                          </div>
                        )}
                        {item.categoria === 'aluguel_coletes' && (
                          <div className="text-[11px] mt-0.5">
                            {item.coletesDevolvidos ? (
                              <span className="text-emerald-600 font-semibold">✓ Coletes Devolvidos</span>
                            ) : (
                              <span className="text-blue-600 font-semibold">● Em Uso na Marina</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Forma Pagto */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPaymentBadge(item.formaPagamento)}
                      </td>

                      {/* Comprovante */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {item.comprovanteUrl ? (
                          <button
                            onClick={() => setLightboxUrl(item.comprovanteUrl || null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> Ver
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">Sem anexo</span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`text-sm font-black ${isEntrada ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isEntrada ? '+' : '-'} {formatCurrency(item.valor)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ══════════════════ MODAL DE LANÇAMENTO / EDIÇÃO ══════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${modalType === 'entrada' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                  {modalType === 'entrada' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingItem ? 'Editar Lançamento' : modalType === 'entrada' ? 'Nova Entrada no Caixa' : 'Nova Saída do Caixa'}
                  </h3>
                  <span className="text-xs text-slate-500">Preencha os detalhes da movimentação</span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              
              {/* Tipo de Lançamento */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setModalType('entrada');
                    if (!editingItem) setModalCategoria('outros_entrada');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${modalType === 'entrada' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Entrada (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('saida');
                    if (!editingItem) setModalCategoria('outros_saida');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${modalType === 'saida' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Saída (-)
                </button>
              </div>

              {/* Categoria & Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={modalCategoria}
                    onChange={e => {
                      const cat = e.target.value;
                      setModalCategoria(cat);
                      if (cat === 'descida_avulsa_jet') {
                        setModalValor('100.00');
                        setModalDescricao('Descida Avulsa de Jet Ski (Rampa)');
                      } else if (cat === 'descida_avulsa_lancha') {
                        setModalValor('50.00');
                        setModalDescricao('Descida Avulsa de Lancha (Rampa)');
                      } else if (cat === 'aluguel_coletes') {
                        setModalValor('100.00');
                        setModalDescricao('Aluguel de Colete Salva-Vidas (1 un)');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    {modalType === 'entrada' ? (
                      <>
                        <option value="descida_avulsa_jet">Descida Jet (R$ 100)</option>
                        <option value="descida_avulsa_lancha">Descida Lancha (R$ 50)</option>
                        <option value="aluguel_coletes">Aluguel de Coletes</option>
                        <option value="combustivel">Combustível</option>
                        <option value="suprimento">Suprimento / Fundo de Troco</option>
                        <option value="outros_entrada">Outra Entrada Avulsa</option>
                      </>
                    ) : (
                      <>
                        <option value="diarista">Pagamento de Diarista</option>
                        <option value="compra_operacional">Compra Operacional / Insumos</option>
                        <option value="manutencao_equipamentos">Manutenção / Trator</option>
                        <option value="limpeza_pier">Limpeza do Píer</option>
                        <option value="sangria">Sangria (Retirada de Dinheiro da Gaveta)</option>
                        <option value="outros_saida">Outra Saída Avulsa</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento *</label>
                  <select
                    value={modalFormaPagto}
                    onChange={e => setModalFormaPagto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="dinheiro">💵 Dinheiro (Espécie - Gaveta)</option>
                    <option value="pix">⚡ PIX</option>
                    <option value="cartao_debito">💳 Cartão de Débito</option>
                    <option value="cartao_credito">💳 Cartão de Crédito</option>
                    <option value="transferencia">🏦 Transferência Bancária</option>
                    <option value="faturado">📄 Faturado / Outro</option>
                  </select>
                </div>
              </div>

              {/* Descrição & Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Lançamento *</label>
                  <input
                    type="text"
                    value={modalDescricao}
                    onChange={e => setModalDescricao(e.target.value)}
                    placeholder="Ex: Descida de Jet, Diária Maria..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalValor}
                    onChange={e => setModalValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Campos específicos para Aluguel de Coletes */}
              {modalCategoria === 'aluguel_coletes' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">Qtd. de Coletes</label>
                    <input
                      type="number"
                      min="1"
                      value={modalQtdColetes}
                      onChange={e => {
                        const qtd = Number(e.target.value) || 1;
                        setModalQtdColetes(e.target.value);
                        setModalValor((qtd * 100).toFixed(2));
                        setModalDescricao(`Aluguel de Colete Salva-Vidas (${qtd} un)`);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">Nome / Identificação</label>
                    <input
                      type="text"
                      value={modalClienteNome}
                      onChange={e => setModalClienteNome(e.target.value)}
                      placeholder="Nome do cliente ou cotista"
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Vínculo Opcional de Cliente / Embarcação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente / Solicitante (Opcional)</label>
                  <SearchableSelect
                    options={clients.map(c => ({ value: c.id, label: c.nome }))}
                    value={modalClienteId}
                    onChange={val => {
                      setModalClienteId(val);
                      if (val) {
                        const cli = clients.find(c => c.id === val);
                        if (cli) setModalClienteNome(cli.nome);
                      }
                    }}
                    placeholder="Selecione um cliente (ou deixe livre)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Embarcação (Opcional)</label>
                  <SearchableSelect
                    options={boats.map(b => ({ value: b.id, label: `${b.numero ? `M${b.numero} - ` : ''}${b.nome}` }))}
                    value={modalEmbarcacaoId}
                    onChange={val => {
                      setModalEmbarcacaoId(val);
                      if (val) {
                        const boat = boats.find(b => b.id === val);
                        if (boat) setModalEmbarcacaoNome(boat.nome);
                      }
                    }}
                    placeholder="Selecione a embarcação"
                  />
                </div>
              </div>

              {/* Data & Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={modalData}
                    onChange={e => setModalData(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={modalHora}
                    onChange={e => setModalHora(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Comprovante / Foto de Nota / Recibo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comprovante / Recibo / Foto da Nota (Opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
                    <Upload className="w-4 h-4 text-slate-500" />
                    {isUploading ? 'Enviando...' : modalComprovanteUrl ? 'Trocar Anexo' : 'Anexar Foto/PDF'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => handleUploadComprovante(e, setModalComprovanteUrl)}
                    />
                  </label>
                  {modalComprovanteUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <span>✓ Anexo salvo</span>
                      <button
                        type="button"
                        onClick={() => setModalComprovanteUrl(null)}
                        className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 ${modalType === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL DE BAIXA DE ABASTECIMENTO ══════════════════ */}
      {baixaModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dar Baixa no Abastecimento</h3>
                  <span className="text-xs text-slate-500">{baixaModalItem.embarcacaoNome}</span>
                </div>
              </div>
              <button onClick={() => setBaixaModalItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBaixarAbastecimento} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600 border border-slate-100">
                <div>Cliente: <strong>{baixaModalItem.clienteNome}</strong></div>
                <div>Combustível: <strong>{baixaModalItem.litros} Litros</strong></div>
                <div>Data: <strong>{formatDisplayDate(baixaModalItem.data)}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={baixaValorTotal}
                  onChange={e => setBaixaValorTotal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento Real *</label>
                <select
                  value={baixaFormaPagto}
                  onChange={e => setBaixaFormaPagto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                >
                  <option value="pix">⚡ PIX</option>
                  <option value="dinheiro">💵 Dinheiro (Gaveta)</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBaixaModalItem(null)}
                  className="px-3.5 py-2 text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar Baixa no Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL DE ABERTURA DE CAIXA ══════════════════ */}
      {isAberturaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Abertura de Caixa Diário</h3>
                <span className="text-xs text-slate-500">Data: {formatDisplayDate(todayStr)}</span>
              </div>
            </div>

            <form onSubmit={handleAbrirCaixa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fundo de Troco Inicial em Gaveta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={aberturaValor}
                  onChange={e => setAberturaValor(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Informe o valor em cédulas/moedas deixado para troco na abertura.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAberturaModalOpen(false)}
                  className="px-3 py-2 text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL DE FECHAMENTO DIÁRIO ══════════════════ */}
      {isFechamentoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Fechamento do Caixa do Dia</h3>
                  <span className="text-xs text-slate-500">Conferência de gaveta e valores de {formatDisplayDate(todayStr)}</span>
                </div>
              </div>
              <button onClick={() => setIsFechamentoModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFecharCaixa} className="space-y-4">
              
              {/* Resumo do Sistema */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">Resumo das Movimentações do Dia:</div>
                <div className="flex justify-between text-slate-600">
                  <span>Fundo de Troco Inicial:</span>
                  <span className="font-semibold">{formatCurrency(metrics.fundoTroco)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>(+) Entradas em Dinheiro (Gaveta):</span>
                  <span>{formatCurrency(metrics.entradasDinheiro)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>(-) Saídas / Sangrias em Dinheiro:</span>
                  <span>{formatCurrency(metrics.saidasDinheiro + metrics.sangriasDinheiro)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1">
                  <span>Saldo Físico Esperado na Gaveta:</span>
                  <span className="text-emerald-700">{formatCurrency(metrics.saldoDinheiroGaveta)}</span>
                </div>
                <div className="flex justify-between text-teal-700 border-t border-slate-100 pt-1">
                  <span>Total Recebido em PIX:</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalPix)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Total Recebido em Cartões:</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalCartoes)}</span>
                </div>
              </div>

              {/* Dinheiro Físico Contado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dinheiro Físico Contado na Gaveta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fechamentoContado}
                  onChange={e => setFechamentoContado(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900"
                  required
                />
                {fechamentoContado && (
                  <div className="text-xs mt-1 font-semibold">
                    {Number(fechamentoContado) === metrics.saldoDinheiroGaveta ? (
                      <span className="text-emerald-600">✓ Saldo físico exato conferido (sem sobras ou faltas).</span>
                    ) : Number(fechamentoContado) > metrics.saldoDinheiroGaveta ? (
                      <span className="text-blue-600">Sobrando: +{formatCurrency(Number(fechamentoContado) - metrics.saldoDinheiroGaveta)}</span>
                    ) : (
                      <span className="text-rose-600">Faltando: {formatCurrency(Number(fechamentoContado) - metrics.saldoDinheiroGaveta)}</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Fechamento (Opcional)</label>
                <textarea
                  value={fechamentoObs}
                  onChange={e => setFechamentoObs(e.target.value)}
                  placeholder="Informações sobre divergências, troco retido ou sangrias para o cofre..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFechamentoModalOpen(false)}
                  className="px-3 py-2 text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  Encerrar e Fechar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL DE LIGHTBOX / ZOOM COMPROVANTE ══════════════════ */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Visualização do Comprovante / Recibo</span>
              <button onClick={() => setLightboxUrl(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {lightboxUrl.endsWith('.pdf') ? (
              <iframe src={lightboxUrl} className="w-full h-[70vh] rounded-xl border border-slate-200" title="PDF Comprovante" />
            ) : (
              <img src={lightboxUrl} alt="Comprovante" className="max-h-[75vh] w-auto rounded-xl object-contain shadow-md" />
            )}

            <div className="flex items-center gap-2">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black transition"
              >
                <Download className="w-4 h-4" /> Baixar Arquivo
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
