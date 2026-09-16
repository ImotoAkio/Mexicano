import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Plus, Minus,
  Calendar, Clock, Filter, Search, Download, Printer, Eye, Trash2,
  Edit2, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Banknote, QrCode, CreditCard, Ship, ShieldCheck, X, LifeBuoy,
  FileText, Check, ChevronDown, ChevronUp, AlertTriangle, ArrowRight,
  SlidersHorizontal, Link as LinkIcon
} from 'lucide-react';
import { TransacaoCaixaMarina, FechamentoCaixaMarina, Cliente, Embarcacao } from '../types';
import SearchableSelect from './shared/SearchableSelect';
import { generateMarinaCaixaPDF } from '../utils/pdfGenerator';

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

  // ���������������������������� Estados de Dados ����������������������������
  const [transacoes, setTransacoes] = useState<TransacaoCaixaMarina[]>([]);
  const [fechamentoHoje, setFechamentoHoje] = useState<FechamentoCaixaMarina | null>(null);
  const [abastecimentosPendentes, setAbastecimentosPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ���������������������������� Estados de Filtro ����������������������������
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterFormaPagto, setFilterFormaPagto] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // ���������������������������� Modais ����������������������������
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
  const [modalDiaristaNome, setModalDiaristaNome] = useState('');
  const [modalDiaristaData, setModalDiaristaData] = useState(todayStr);
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

  // ���������������������������� Carregamento de Dados ����������������������������
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

  // ���������������������������� Período Preset Handler ����������������������������
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

  // ���������������������������� Cálculos de Métricas e Totais ����������������������������
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
          if (t.categoria === 'saida') {
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

  // ���������������������������� Abertura de Modais com Presets Rápidos ����������������������������
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
      setModalValor('150.00');
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
    } else if (presetKey === 'taxa_limpeza') {
      setModalType('entrada');
      setModalCategoria('taxa_limpeza');
      setModalDescricao('Taxa de Limpeza de Embarcação');
      setModalValor('');
      setModalFormaPagto('pix');
      setModalClienteTipo('cotista');
      setIsModalOpen(true);
    } else if (presetKey === 'diarista') {
      setModalType('saida');
      setModalCategoria('diarista');
      setModalDescricao('Pagamento de Diarista');
      setModalValor('');
      setModalDiaristaNome('');
      setModalDiaristaData(todayStr);
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'compra_operacional') {
      setModalType('saida');
      setModalCategoria('compra_operacional');
      setModalDescricao('Compra Operacional / Insumos do Píer');
      setModalValor('');
      setModalFormaPagto('dinheiro');
      setIsModalOpen(true);
    } else if (presetKey === 'saida') {
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
    if (modalFormaPagto === 'faturado' && !modalClienteId) {
      alert('Para lançamentos "Faturados (Pendurar)" é obrigatório selecionar um cliente.');
      return;
    }

    setIsSubmitting(true);
    let finalDescricao = modalDescricao.trim();
    if (modalCategoria === 'diarista') {
      finalDescricao = `Pagamento de Diarista${modalDiaristaNome ? ` - ${modalDiaristaNome}` : ''}${modalDiaristaData ? ` (Diária: ${formatDisplayDate(modalDiaristaData)})` : ''}`;
    }

    const payload: TransacaoCaixaMarina = {
      id: editingItem ? editingItem.id : `cx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tipo: modalType,
      categoria: modalCategoria,
      descricao: finalDescricao,
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
      case 'combustivel':
        return 'Combustível';
      case 'descida_avulsa_jet': return 'Descida Jet (Rampa)';
      case 'descida_avulsa_lancha': return 'Descida Lancha (Rampa)';
      case 'aluguel_coletes': return 'Aluguel de Coletes';
      case 'taxa_limpeza': return 'Taxa de Limpeza';
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
    <div className="flex-1 bg-[#F2F2F7] min-h-screen text-[#1C1C1E] font-sans pb-20" style={{ fontOpticalSizing: 'auto' }}>

      {/* HEADER FIXO LA iOS */}
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-black/[0.05] px-4 py-3 md:px-8 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight leading-none mb-1">Caixa da Marina</h1>
            {fechamentoHoje?.status === 'aberto' ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aberto por {fechamentoHoje.abertoPor || 'Gerente'}
              </div>
            ) : fechamentoHoje?.status === 'fechado' ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-black/5 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Fechado ({fechamentoHoje.fechadoEm})
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" />
                Aguardando Abertura
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fechamentoHoje?.status !== 'aberto' ? (
            <button
              onClick={() => {
                setAberturaValor('0.00');
                setIsAberturaModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform duration-200 text-white text-sm font-semibold rounded-full shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Abrir Caixa
            </button>
          ) : (
            <button
              onClick={() => {
                setFechamentoContado(metrics.saldoDinheiroGaveta.toFixed(2));
                setFechamentoObs('');
                setIsFechamentoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-zinc-800 active:scale-95 transition-transform duration-200 text-white text-sm font-semibold rounded-full shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Fechar Caixa
            </button>
          )}
          <button
            onClick={async () => {
              const periodLabel = startDate && endDate ? `De ${formatDisplayDate(startDate)} até ${formatDisplayDate(endDate)}` : startDate ? formatDisplayDate(startDate) : 'Período Completo';
              await generateMarinaCaixaPDF(
                transacoes,
                metrics,
                fechamentoHoje,
                currentOperator,
                periodLabel
              );
            }}
            className="w-9 h-9 flex items-center justify-center bg-black/5 hover:bg-black/10 active:scale-95 transition-transform duration-200 rounded-full text-black" title="Imprimir Relatório (PDF)">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={() => fetchCaixaData()} disabled={refreshing} className="w-9 h-9 flex items-center justify-center bg-black/5 hover:bg-black/10 active:scale-95 transition-transform duration-200 rounded-full text-black" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">

        {/* Apple Card Style Balance */}
        <section className="flex flex-col items-center justify-center py-4">
          <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">
            Dinheiro em Gaveta
          </span>
          <h2 className="text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-[#1C1C1E] flex items-center gap-2">
            <span className="text-3xl font-medium text-[#8E8E93] translate-y-1">R$</span>
            {formatCurrency(metrics.saldoDinheiroGaveta).replace('R$', '').trim()}
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
             <div className="px-3.5 py-1.5 bg-black/5 rounded-full text-xs font-semibold flex items-center gap-1.5">
               <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-[#8E8E93]">Entradas:</span> {formatCurrency(metrics.entradasDinheiro)}
             </div>
             <div className="px-3.5 py-1.5 bg-black/5 rounded-full text-xs font-semibold flex items-center gap-1.5">
               <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
               <span className="text-[#8E8E93]">Saídas:</span> {formatCurrency(metrics.saidasDinheiro + metrics.sangriasDinheiro)}
             </div>
          </div>
        </section>

        {/* METRICS - Clean White Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-black/[0.04] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-[#8E8E93]">Total PIX</span>
              <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center"><QrCode className="w-3 h-3 text-teal-600"/></div>
            </div>
            <div className="text-xl font-semibold tracking-tight">{formatCurrency(metrics.totalPix)}</div>
          </div>
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-black/[0.04] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-[#8E8E93]">Cartões (D/C)</span>
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center"><CreditCard className="w-3 h-3 text-blue-600"/></div>
            </div>
            <div className="text-xl font-semibold tracking-tight">{formatCurrency(metrics.totalCartoes)}</div>
          </div>
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-black/[0.04] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-[#8E8E93]">Total Movido</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center"><ArrowUpRight className="w-3 h-3 text-emerald-600"/></div>
            </div>
            <div className="text-xl font-semibold tracking-tight text-emerald-600">{formatCurrency(metrics.totalEntradas)}</div>
          </div>
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-black/[0.04] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-[#8E8E93]">Líquido</span>
              <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center"><DollarSign className="w-3 h-3 text-black"/></div>
            </div>
            <div className={`text-xl font-semibold tracking-tight ${metrics.saldoLiquidoPeriodo >= 0 ? 'text-black' : 'text-rose-600'}`}>
              {formatCurrency(metrics.saldoLiquidoPeriodo)}
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS - Control Center Style */}
        <section className="bg-white rounded-[32px] p-5 shadow-sm border border-black/[0.04]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> Ações Rápidas
            </h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { key: 'descida_jet', icon: Ship, color: 'bg-emerald-500', title: 'Descida Jet', sub: 'R$ 100' },
              { key: 'descida_lancha', icon: Ship, color: 'bg-teal-500', title: 'Descida Lancha', sub: 'R$ 150' },
              { key: 'aluguel_coletes', icon: LifeBuoy, color: 'bg-blue-500', title: 'Colete', sub: 'R$ 100' },
              { key: 'combustivel', icon: QrCode, color: 'bg-indigo-500', title: 'Combustível', sub: 'Entrada' },
              { key: 'taxa_limpeza', icon: FileText, color: 'bg-sky-500', title: 'Limpeza', sub: 'Avulso' },
              { key: 'diarista', icon: Minus, color: 'bg-rose-500', title: 'Diarista', sub: 'Saída' },
              { key: 'compra_operacional', icon: FileText, color: 'bg-amber-500', title: 'Compras', sub: 'Saída' },
              { key: 'sangria', icon: Banknote, color: 'bg-purple-500', title: 'Sangria', sub: 'Retirada' },
              { key: 'outra_entrada', icon: Plus, color: 'bg-[#8E8E93]', title: 'Livre', sub: 'Outros' }
            ].map(act => (
              <button
                key={act.key}
                onClick={() => openPresetModal(act.key as any)}
                className="flex flex-col items-center justify-center aspect-square p-2 rounded-[20px] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-90 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-[14px] text-white flex items-center justify-center mb-1.5 shadow-sm ${act.color}`}>
                  <act.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-[#1C1C1E] leading-tight text-center">{act.title}</span>
                <span className="text-[10px] font-medium text-[#8E8E93]">{act.sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ALERTS (Pendentes e Coletes) iOS Notification Style */}
        {(abastecimentosPendentes.length > 0 || coletesEmUso.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {abastecimentosPendentes.length > 0 && (
              <div className="bg-amber-500/10 rounded-[28px] p-5 shadow-sm border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-[15px] font-semibold text-amber-900 tracking-tight">{abastecimentosPendentes.length} Pendente(s) de Baixa</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {abastecimentosPendentes.map(item => (
                    <div key={item.reservaId} className="bg-white/80 backdrop-blur-md p-3.5 rounded-[20px] shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold">{item.embarcacaoNome}</div>
                        <div className="text-[11px] text-[#8E8E93]">{item.litros}L ⬢ {item.clienteNome}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[13px]">{formatCurrency(item.valorTotal)}</span>
                        <button
                          onClick={() => {
                            setBaixaModalItem(item);
                            setBaixaFormaPagto(item.formaPagamentoSugerida || 'pix');
                            setBaixaValorTotal(item.valorTotal.toFixed(2));
                            setBaixaComprovanteUrl(item.comprovanteUrl || null);
                          }}
                          className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-90 transition-all text-white flex items-center justify-center shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {coletesEmUso.length > 0 && (
              <div className="bg-blue-500/10 rounded-[28px] p-5 shadow-sm border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <LifeBuoy className="w-5 h-5 text-blue-600" />
                  <h3 className="text-[15px] font-semibold text-blue-900 tracking-tight">{coletesEmUso.length} Colete(s) em Uso</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {coletesEmUso.map(c => (
                    <div key={c.id} className="bg-white/80 backdrop-blur-md p-3.5 rounded-[20px] shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold">{c.clienteNome || 'Avulso'}</div>
                        <div className="text-[11px] text-[#8E8E93]">{c.quantidadeColetes || 1} un ⬢ {c.hora}</div>
                      </div>
                      <button
                        onClick={() => handleDevolverColetes(c.id)}
                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white text-[11px] font-semibold rounded-full shadow-sm"
                      >
                        Devolver
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TRANSACTIONS SECTION - Apple Wallet Style List */}
        <section className="bg-white rounded-[32px] p-5 shadow-sm border border-black/[0.04]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-[17px] font-semibold tracking-tight">Movimentações</h3>
              <p className="text-xs text-[#8E8E93]">{transacoes.length} transações no período</p>
            </div>

            {/* Apple Style Segmented Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#F2F2F7] p-1 rounded-full text-xs font-medium">
                {[
                  { key: 'today', label: 'Hoje' },
                  { key: 'yesterday', label: 'Ontem' },
                  { key: '7days', label: '7D' },
                  { key: 'this_month', label: 'Mês' },
                  { key: 'all', label: 'Tudo' }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectPreset(p.key as any)}
                    className={`px-3 py-1 rounded-full transition-all duration-200 ${
                      periodPreset === p.key
                        ? 'bg-white text-black shadow-sm font-semibold'
                        : 'text-[#8E8E93] hover:text-black'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F2F2F7] text-xs rounded-full border-none focus:outline-none focus:ring-2 focus:ring-black/10 transition"
                />
              </div>

              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`p-2 rounded-full transition-colors ${showFiltersPanel ? 'bg-black text-white' : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]'}`}
                title="Filtros Avançados"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {showFiltersPanel && (
            <div className="mb-5 p-4 bg-[#F2F2F7]/60 rounded-2xl border border-black/[0.04] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  className="w-full p-2 bg-white rounded-xl border border-black/[0.06] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  className="w-full p-2 bg-white rounded-xl border border-black/[0.06] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={e => setFilterTipo(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-xl border border-black/[0.06] focus:outline-none"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                  <option value="sangria">Sangrias</option>
                  <option value="abertura">Aberturas</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Pagamento</label>
                <select
                  value={filterFormaPagto}
                  onChange={e => setFilterFormaPagto(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-xl border border-black/[0.06] focus:outline-none"
                >
                  <option value="todas">Todas as Formas</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>
          )}

          {/* Activity List */}
          {loading ? (
            <div className="py-16 text-center text-[#8E8E93]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-black/40" />
              <p className="text-xs font-medium">Carregando movimentações...</p>
            </div>
          ) : transacoes.length === 0 ? (
            <div className="py-16 text-center text-[#8E8E93]">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-[#1C1C1E]">Nenhuma movimentação</p>
              <p className="text-xs">Nenhum registro encontrado para este período.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {transacoes.map((t) => {
                const isEntrada = t.tipo === 'entrada';

                return (
                  <div
                    key={t.id}
                    className="py-3.5 px-2 flex items-center justify-between hover:bg-[#F2F2F7]/50 rounded-2xl transition-colors duration-150 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        t.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-600' :
                        t.tipo === 'saida' ? 'bg-purple-500/10 text-purple-600' :
                        isEntrada ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {t.categoria === 'descida_avulsa_jet' || t.categoria === 'descida_avulsa_lancha' ? <Ship className="w-5 h-5"/> :
                         t.categoria === 'aluguel_coletes' ? <LifeBuoy className="w-5 h-5"/> :
                         (t.categoria === 'combustivel') ? <QrCode className="w-5 h-5"/> :
                         t.categoria === 'saida' ? <Banknote className="w-5 h-5"/> :
                         isEntrada ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                      </div>

                      <div>
                        <div className="text-[13px] font-semibold text-[#1C1C1E] flex items-center gap-2">
                          <span>{t.descricao}</span>
                          {t.clienteNome && (
                            <span className="text-[11px] font-normal text-[#8E8E93]">({t.clienteNome})</span>
                          )}
                          {t.comprovanteUrl && (
                            <button
                              onClick={() => setLightboxUrl(t.comprovanteUrl || null)}
                              className="text-blue-500 hover:text-blue-600 p-0.5"
                              title="Ver Comprovante"
                            >
                              <LinkIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] mt-0.5">
                          <span>{formatDisplayDate(t.data)} ⬢ {t.hora}</span>
                          <span>⬢</span>
                          <span className="uppercase font-medium text-[10px] tracking-wide px-1.5 py-0.5 bg-black/[0.04] rounded-md text-[#1C1C1E]">
                            {t.formaPagamento}
                          </span>
                          {t.registradoPor && (
                            <>
                              <span>⬢</span>
                              <span>{t.registradoPor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-[14px] font-semibold tracking-tight ${
                          t.tipo === 'entrada' ? 'text-emerald-600' :
                          isEntrada ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isEntrada ? '+' : '-'}{formatCurrency(t.valor)}
                        </div>
                        <div className="text-[10px] text-[#8E8E93] capitalize">
                          {getCategoryLabel(t.categoria)}
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => window.print()}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 text-[#8E8E93] hover:text-black transition"
                          title="Imprimir Recibo"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-50 text-[#8E8E93] hover:text-rose-600 transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* MODAL: ABERTURA DE CAIXA */}
      {isAberturaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-black/[0.04] space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold tracking-tight">Abertura de Caixa</h3>
              </div>
              <button onClick={() => setIsAberturaModalOpen(false)} className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Fundo de Gaveta Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                value={aberturaValor}
                onChange={e => setAberturaValor(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-semibold p-3.5 bg-[#F2F2F7] rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsAberturaModalOpen(false)}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirCaixa}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-black hover:bg-zinc-800 text-white transition shadow-sm"
              >
                {isSubmitting ? 'Abrindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FECHAMENTO DE CAIXA */}
      {isFechamentoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-black/[0.04] space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold tracking-tight">Fechamento de Caixa</h3>
              </div>
              <button onClick={() => setIsFechamentoModalOpen(false)} className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F2F2F7] p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-[#8E8E93]">
                <span>Dinheiro Esperado na Gaveta:</span>
                <span className="font-semibold text-[#1C1C1E]">{formatCurrency(metrics.saldoDinheiroGaveta)}</span>
              </div>
              <div className="flex justify-between text-[#8E8E93]">
                <span>Total PIX Registrado:</span>
                <span className="font-semibold text-[#1C1C1E]">{formatCurrency(metrics.totalPix)}</span>
              </div>
              <div className="flex justify-between text-[#8E8E93]">
                <span>Total Cartões Registrado:</span>
                <span className="font-semibold text-[#1C1C1E]">{formatCurrency(metrics.totalCartoes)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Valor Contado em Dinheiro (R$)</label>
              <input
                type="number"
                step="0.01"
                value={fechamentoContado}
                onChange={e => setFechamentoContado(e.target.value)}
                className="w-full text-2xl font-semibold p-3.5 bg-[#F2F2F7] rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                autoFocus
              />
              {parseFloat(fechamentoContado || '0') !== metrics.saldoDinheiroGaveta && (
                <div className={`text-xs mt-1.5 font-medium ${parseFloat(fechamentoContado || '0') > metrics.saldoDinheiroGaveta ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Diferença: {formatCurrency(parseFloat(fechamentoContado || '0') - metrics.saldoDinheiroGaveta)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Observações do Fechamento</label>
              <textarea
                value={fechamentoObs}
                onChange={e => setFechamentoObs(e.target.value)}
                placeholder="Opcional..."
                rows={2}
                className="w-full text-xs p-3 bg-[#F2F2F7] rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsFechamentoModalOpen(false)}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleFecharCaixa}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-black hover:bg-zinc-800 text-white transition shadow-sm"
              >
                {isSubmitting ? 'Fechando...' : 'Finalizar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRESET / NOVO LAN�!AMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-black/[0.04] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center ${modalType === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {modalType === 'entrada' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{getCategoryLabel(modalCategoria) || 'Lançamento'}</h3>
                  <span className="text-[10px] text-[#8E8E93] uppercase font-medium">{modalType}</span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={modalValor}
                onChange={e => setModalValor(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-semibold p-3.5 bg-[#F2F2F7] rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Forma de Pagamento</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'dinheiro', label: 'Dinheiro' },
                  { key: 'pix', label: 'PIX' },
                  { key: 'debito', label: 'Débito' },
                  { key: 'credito', label: 'Crédito' }, { key: 'faturado', label: 'Faturado (Pendurar)' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setModalFormaPagto(f.key as any)}
                    className={`py-2 text-xs font-medium rounded-xl transition-all ${
                      modalFormaPagto === f.key
                        ? 'bg-black text-white shadow-sm font-semibold'
                        : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Descrição</label>
              <input
                type="text"
                value={modalDescricao}
                onChange={e => setModalDescricao(e.target.value)}
                className="w-full text-xs p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {modalCategoria === 'diarista' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Nome do Diarista</label>
                  <input
                    type="text"
                    value={modalDiaristaNome}
                    onChange={e => setModalDiaristaNome(e.target.value)}
                    placeholder="Nome"
                    className="w-full text-xs p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Data da Diária</label>
                  <input
                    type="date"
                    value={modalDiaristaData}
                    onChange={e => setModalDiaristaData(e.target.value)}
                    className="w-full text-xs p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Cliente (Opcional)</label>
                  <input
                    type="text"
                    value={modalClienteNome}
                    onChange={e => setModalClienteNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full text-xs p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Embarcação (Opcional)</label>
                  <input
                    type="text"
                    value={modalEmbarcacaoNome}
                    onChange={e => setModalEmbarcacaoNome(e.target.value)}
                    placeholder="Nome / vaga"
                    className="w-full text-xs p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTransaction}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-black hover:bg-zinc-800 text-white transition shadow-sm"
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA DE ABASTECIMENTO */}
      {baixaModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-black/[0.04] space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">Baixa de Abastecimento</h3>
                  <span className="text-[10px] text-[#8E8E93] font-medium">{baixaModalItem.embarcacaoNome}</span>
                </div>
              </div>
              <button onClick={() => setBaixaModalItem(null)} className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F2F2F7] p-3.5 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between text-[#8E8E93]">
                <span>Cliente:</span>
                <span className="font-medium text-[#1C1C1E]">{baixaModalItem.clienteNome}</span>
              </div>
              <div className="flex justify-between text-[#8E8E93]">
                <span>Volume:</span>
                <span className="font-medium text-[#1C1C1E]">{baixaModalItem.litros} Litros</span>
              </div>
              <div className="flex justify-between text-[#8E8E93]">
                <span>Valor Total:</span>
                <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(baixaModalItem.valorTotal)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Forma de Pagamento Confirmada</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'dinheiro', label: 'Dinheiro' },
                  { key: 'pix', label: 'PIX' },
                  { key: 'debito', label: 'Débito' },
                  { key: 'credito', label: 'Crédito' }, { key: 'faturado', label: 'Faturado (Pendurar)' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBaixaFormaPagto(f.key as any)}
                    className={`py-2 text-xs font-medium rounded-xl transition-all ${
                      baixaFormaPagto === f.key
                        ? 'bg-black text-white shadow-sm font-semibold'
                        : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Valor Confirmado (R$)</label>
              <input
                type="number"
                step="0.01"
                value={baixaValorTotal}
                onChange={e => setBaixaValorTotal(e.target.value)}
                className="w-full text-xl font-semibold p-3 bg-[#F2F2F7] rounded-xl border-none focus:outline-none"
              />
            </div>

            {baixaModalItem.comprovanteUrl && (
              <div className="flex items-center justify-between p-3 bg-[#F2F2F7] rounded-xl text-xs">
                <span className="text-[#8E8E93]">Comprovante enviado pelo operador:</span>
                <button
                  onClick={() => setLightboxUrl(baixaModalItem.comprovanteUrl || null)}
                  className="text-blue-500 font-semibold hover:underline flex items-center gap-1"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Ver Arquivo
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBaixaModalItem(null)}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBaixarAbastecimento}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-semibold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar e Baixar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE COMPROVANTE */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[28px] overflow-hidden max-w-lg w-full shadow-2xl border border-black/10"
          >
            <div className="flex justify-between items-center p-4 border-b border-black/[0.05]">
              <span className="text-xs font-semibold">Comprovante de Pagamento</span>
              <button
                onClick={() => setLightboxUrl(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto flex items-center justify-center bg-[#F2F2F7]">
              {lightboxUrl.endsWith('.pdf') ? (
                <iframe src={lightboxUrl} className="w-full h-96 rounded-xl border" title="Comprovante PDF" />
              ) : (
                <img src={lightboxUrl} alt="Comprovante" className="max-w-full rounded-xl object-contain shadow-sm" />
              )}
            </div>
            <div className="p-3 bg-white text-right">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-500 hover:underline inline-flex items-center gap-1"
              >
                Abrir em nova aba <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

