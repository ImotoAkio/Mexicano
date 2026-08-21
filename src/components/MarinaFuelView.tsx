import React, { useState } from 'react';
import { Droplets, ChevronLeft, ChevronRight, FileText, User as UserIcon, CheckCircle2, Clock, Info, ChevronDown, ChevronUp, Plus, Loader2, Save, Upload, Ship, Search, SlidersHorizontal, MoreVertical, ArrowUpRight, ArrowDownRight, X, Download, Building2, CreditCard, DollarSign, Send, Calendar, Filter, RefreshCw, Check, SquarePen, Trash2, Banknote, QrCode } from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { logAction } from '../db';
import SearchableSelect from './shared/SearchableSelect';

interface MarinaFuelViewProps {
  data: {
    transacoes?: any[];
    boats?: Embarcacao[];
    clients?: Cliente[];
    reservations?: any[];
  };
  operadorNome?: string;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
  isAdmin?: boolean;
}

export default function MarinaFuelView({ data, operadorNome, setData, reloadData, isAdmin }: MarinaFuelViewProps) {
  const getTodayStr = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Period & Filter State
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [modalComprovante, setModalComprovante] = useState<string | null>(null);

  // New Fuel Modal state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'dinheiro' | 'credit' | 'debit' | 'admin'>('pix');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charge Item Modal state
  const [chargeTargetItem, setChargeTargetItem] = useState<any | null>(null);
  const [chargePaymentType, setChargePaymentType] = useState<'pix' | 'dinheiro' | 'credit' | 'debit' | 'admin'>('pix');
  const [chargeComprovanteUrl, setChargeComprovanteUrl] = useState<string | null>(null);
  const [isUploadingChargeComprovante, setIsUploadingChargeComprovante] = useState(false);

  // Edit Fuel Modal state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editBoatId, setEditBoatId] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editLiters, setEditLiters] = useState('');
  const [editPaymentType, setEditPaymentType] = useState<'pix' | 'dinheiro' | 'credit' | 'debit' | 'admin'>('pix');
  const [editStatus, setEditStatus] = useState<'pago' | 'pendente'>('pago');
  const [editDate, setEditDate] = useState('');

  // Dropdown action menu per row
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeActionTargetItem, setActiveActionTargetItem] = useState<any | null>(null);

  const handleToggleActionMenu = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (activeActionMenuId === item.id) {
      setActiveActionMenuId(null);
      setMenuPosition(null);
      setActiveActionTargetItem(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = item.comprovanteUrl ? 130 : 90;
      
      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }
      
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;

      setMenuPosition({ top, left });
      setActiveActionMenuId(item.id);
      setActiveActionTargetItem(item);
    }
  };

  const handleSelectPeriodPreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'all' | 'custom') => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = getTodayStr();

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yyyy = y.getFullYear();
      const mm = String(y.getMonth() + 1).padStart(2, '0');
      const dd = String(y.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate(`${yyyy}-${mm}-${dd}`);
    } else if (preset === '7days') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      const yyyy = d7.getFullYear();
      const mm = String(d7.getMonth() + 1).padStart(2, '0');
      const dd = String(d7.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const d30 = new Date(today);
      d30.setDate(d30.getDate() - 29);
      const yyyy = d30.getFullYear();
      const mm = String(d30.getMonth() + 1).padStart(2, '0');
      const dd = String(d30.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const yyyy = lm.getFullYear();
      const mm = String(lm.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      const lastDayStr = String(lastDay).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(`${yyyy}-${mm}-${lastDayStr}`);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const getPeriodLabel = () => {
    if (periodPreset === 'today') return 'Hoje';
    if (periodPreset === 'yesterday') return 'Ontem';
    if (periodPreset === '7days') return 'Últimos 7 dias';
    if (periodPreset === '30days') return 'Últimos 30 dias';
    if (periodPreset === 'this_month') return 'Este Mês';
    if (periodPreset === 'last_month') return 'Mês Passado';
    if (periodPreset === 'all') return 'Todo o Período';
    if (startDate && endDate) {
      if (startDate === endDate) {
        const [y, m, d] = startDate.split('-');
        return `${d}/${m}/${y}`;
      }
      const [y1, m1, d1] = startDate.split('-');
      const [y2, m2, d2] = endDate.split('-');
      return `${d1}/${m1} a ${d2}/${m2}/${y2}`;
    }
    return 'Personalizado';
  };

  const getDateOnlyStr = (dateVal?: string | null): string | null => {
    if (!dateVal) return null;
    const str = String(dateVal).trim();
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const isDateInRange = (dateVal?: string | null, start?: string, end?: string): boolean => {
    if (!start && !end) return true;
    const d = getDateOnlyStr(dateVal);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const getEmbarcacao = (id: string) => data?.boats?.find(b => b.id === id);
  const getCliente = (id: string) => data?.clients?.find(c => c.id === id);

  // Filter fuel transactions from financial transactions based on period date range
  const directTransactions = (data?.transacoes || [])
    .filter(t => {
      const isFuelCategory = 
        t.categoria === 'receita_combustivel' || 
        t.categoria === 'Combustível' || 
        t.categoria === 'combustivel' || 
        (t.descricao && (t.descricao.toLowerCase().includes('abastecimento') || t.descricao.toLowerCase().includes('litros')));
      
      if (!isFuelCategory) return false;

      const tDate = t.data || t.dataVencimento || t.dataPagamento || t.createdAt;
      return isDateInRange(tDate, startDate, endDate);
    })
    .map(t => {
      const descLower = (t.descricao || '').toLowerCase();
      let pm = t.metodoPagamento;
      let st = t.status;

      if (!pm || pm === 'Pendente' || pm === 'pendente') {
        if (descLower.includes('faturado') || descLower.includes('administradora') || descLower.includes('admin')) {
          pm = 'admin';
          if (!st || st === 'pendente') st = 'lancado';
        } else if (descLower.includes('crédito') || descLower.includes('credito') || descLower.includes('credit')) {
          pm = 'credit';
          if (!st || st === 'pendente') st = 'pago';
        } else if (descLower.includes('débito') || descLower.includes('debito')) {
          pm = 'debit';
          if (!st || st === 'pendente') st = 'pago';
        } else if (descLower.includes('dinheiro') || descLower.includes('caixa')) {
          pm = 'dinheiro';
          if (!st || st === 'pendente') st = 'pago';
        } else if (descLower.includes('pix')) {
          pm = 'pix';
          if (!st || st === 'pendente') st = 'pago';
        }
      }

      return {
        ...t,
        metodoPagamento: pm || t.metodoPagamento,
        status: st || t.status
      };
    });

  // Include fuel recorded in reservations for period date range
  const reservationFuelTransactions = (data?.reservations || [])
    .filter((r: any) => {
      const litros = Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0;
      if (litros <= 0) return false;
      const rDate = r.data || r.abastecimentoDataHora || r.horaChegada;
      return isDateInRange(rDate, startDate, endDate);
    })
    .map((r: any) => {
      const litros = Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0;
      const isCobrado = r.abastecimentoStatusCobranca === 'cobrado';
      const pm = (r.abastecimentoFormaPagamento || 'pix').toLowerCase();
      const unitPrice = pm === 'credit' ? 10 : pm === 'admin' ? 13 : 9;
      const valorTotal = r.abastecimentoValorTotal || (litros * unitPrice);
      return {
        id: `res_fuel_${r.id}`,
        reservaId: r.id,
        tipo: 'receita',
        categoria: 'receita_combustivel',
        descricao: `Abastecimento Marina (${pm === 'dinheiro' ? 'Dinheiro (Caixa)' : pm === 'credit' ? 'Crédito' : pm === 'debit' ? 'Débito' : pm === 'admin' ? 'Faturado Admin' : 'PIX'}): ${litros}L`,
        valor: valorTotal,
        status: isCobrado ? 'pago' : 'pendente',
        metodoPagamento: r.abastecimentoFormaPagamento || 'Pendente',
        data: r.data || getTodayStr(),
        clienteId: r.clienteId,
        embarcacaoId: r.embarcacaoId,
        comprovanteUrl: r.abastecimentoComprovanteUrl,
        operador: r.abastecimentoOperador || r.operadorChegada || 'Marinheiro',
        isFromReservation: true,
        reservationRef: r
      };
    });

  const allTransactions = [
    ...directTransactions,
    ...reservationFuelTransactions.filter(rf => {
      const isAlreadySaved = directTransactions.some(dt => {
        if (dt.reservaId && (dt.reservaId === rf.reservaId || dt.reservaId === rf.reservationRef?.id)) return true;
        if (dt.embarcacaoId === rf.embarcacaoId && dt.data === rf.data && (dt.metodoPagamento === 'admin' || dt.status === 'pago' || dt.status === 'lancado' || (dt.descricao && dt.descricao.toLowerCase().includes('abastecimento')))) return true;
        return false;
      });
      return !isAlreadySaved;
    })
  ];

  const fuelTransactions = allTransactions.filter(t => {
    // Boat filter
    if (boatFilter !== 'all' && t.embarcacaoId !== boatFilter) {
      return false;
    }

    // Client filter
    if (clientFilter !== 'all' && t.clienteId !== clientFilter) {
      return false;
    }

    // Payment method filter
    if (paymentFilter !== 'all') {
      const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      if (paymentFilter === 'dinheiro') {
        if (pm !== 'dinheiro' && !desc.includes('dinheiro') && !desc.includes('caixa')) return false;
      } else if (paymentFilter === 'pix') {
        if (pm === 'dinheiro' || desc.includes('dinheiro')) return false;
        if (pm !== 'pix' && !desc.includes('pix') && pm !== 'pendente') return false;
      } else if (paymentFilter === 'credit') {
        if (pm !== 'credit' && !desc.includes('crédito') && !desc.includes('credito') && !desc.includes('credit')) return false;
      } else if (paymentFilter === 'debit') {
        if (pm !== 'debit' && !desc.includes('débito') && !desc.includes('debito')) return false;
      } else if (paymentFilter === 'admin') {
        if (pm !== 'admin' && !desc.includes('admin') && !desc.includes('faturado') && !desc.includes('administradora')) return false;
      }
    }

    // Status filter match
    const isCobradoItem = t.status === 'pago' || t.status === 'cobrado' || t.status === 'lancado' || t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoStatusCobranca === 'cobrado';
    if (statusFilter === 'pago' && !isCobradoItem) return false;
    if (statusFilter === 'pendente' && isCobradoItem) return false;

    // Search query match
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const boat = getEmbarcacao(t.embarcacaoId);
      const client = getCliente(t.clienteId);
      const matchesSearch = (
        boat?.nome?.toLowerCase().includes(term) ||
        client?.nome?.toLowerCase().includes(term) ||
        t.descricao?.toLowerCase().includes(term) ||
        t.id?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    return true;
  });

  const activeFilterCount = 
    (periodPreset !== 'this_month' ? 1 : 0) +
    (boatFilter !== 'all' ? 1 : 0) +
    (clientFilter !== 'all' ? 1 : 0) +
    (paymentFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchTerm.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    handleSelectPeriodPreset('this_month');
    setBoatFilter('all');
    setClientFilter('all');
    setPaymentFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  let totalLiters = 0;
  let totalValue = 0;
  let totalPendingValue = 0;
  let totalDinheiro = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalAdmin = 0;

  fuelTransactions.forEach(t => {
    const isCobradoItem = t.status === 'pago' || t.status === 'cobrado' || t.status === 'lancado' || t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoStatusCobranca === 'cobrado';
    const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
    const desc = (t.descricao || '').toLowerCase();
    const valor = Number(t.valor || 0);

    if (isCobradoItem) {
      totalValue += valor;
      if (pm === 'dinheiro' || desc.includes('dinheiro') || desc.includes('caixa')) {
        totalDinheiro += valor;
      } else if (pm === 'admin' || desc.includes('faturado') || desc.includes('administradora')) {
        totalAdmin += valor;
      } else if (pm === 'credit' || pm === 'debit' || desc.includes('crédito') || desc.includes('débito') || desc.includes('cartão')) {
        totalCartao += valor;
      } else {
        totalPix += valor;
      }
    } else {
      totalPendingValue += valor;
    }
    
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    if (match) {
      totalLiters += parseFloat(match[1].replace(',', '.'));
    } else if (t.litrosAbastecidos || t.reservationRef?.abastecimentoLitros) {
      totalLiters += Number(t.litrosAbastecidos || t.reservationRef?.abastecimentoLitros || 0);
    }
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === fuelTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(fuelTransactions.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComprovante(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      if (!res.ok) throw new Error('Falha no upload');
      const dataRes = await res.json();
      setComprovanteUrl(dataRes.url);
    } catch (err) {
      alert('Erro ao enviar comprovante.');
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  const handleSaveFuelTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoatId || !liters) {
      alert('Selecione uma embarcação e informe os litros.');
      return;
    }

    setIsSubmitting(true);
    
    const litrosNum = parseFloat(liters.replace(',', '.'));
    let precoPorLitro = 9.0;
    let paymentLabel = 'PIX (Digital)';
    if (paymentType === 'dinheiro') {
      precoPorLitro = 9.0;
      paymentLabel = 'Dinheiro (Caixa Físico)';
    } else if (paymentType === 'credit') {
      precoPorLitro = 10.0;
      paymentLabel = 'Cartão de Crédito';
    } else if (paymentType === 'debit') {
      precoPorLitro = 9.0;
      paymentLabel = 'Cartão de Débito';
    } else if (paymentType === 'admin') {
      precoPorLitro = 13.0;
      paymentLabel = 'Enviar p/ Administradora';
    }
    const valorTotal = litrosNum * precoPorLitro;

    const boat = getEmbarcacao(selectedBoatId);
    const clientId = selectedClientId || boat?.donos?.[0] || '';

    const newTransacao = {
      id: `trans_${Date.now()}`,
      tipo: 'receita',
      categoria: 'receita_combustivel',
      descricao: `Abastecimento Marina (${paymentLabel}): ${litrosNum}L`,
      valor: valorTotal,
      status: paymentType === 'admin' ? 'pendente' : 'pago',
      metodoPagamento: paymentType,
      data: getTodayStr(),
      dataVencimento: getTodayStr(),
      dataPagamento: paymentType === 'admin' ? null : getTodayStr(),
      clienteId: clientId,
      embarcacaoId: selectedBoatId,
      comprovanteUrl,
      operadorMarina: operadorNome || 'Operador',
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: newTransacao })
      });
      
      const { consumeFuelForEmbarcacao } = await import('../utils/fuelInventory');
      consumeFuelForEmbarcacao(litrosNum, boat?.nome || 'Embarcação', operadorNome || 'Gerente');

      if (setData) {
        setData((prev: any) => ({
          ...prev,
          transacoes: [...(prev.transacoes || []), newTransacao]
        }));
      }

      await logAction('Abastecimento Avulso', `Registrou abastecimento de ${litrosNum}L (R$ ${valorTotal}).`, selectedBoatId, operadorNome);
      setIsFuelModalOpen(false);
      alert('Abastecimento registrado com sucesso!');
    } catch (err) {
      alert('Erro ao salvar abastecimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToAdmin = async (t: any) => {
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    const litrosNum = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || t.reservationRef?.litrosAbastecidos || 0);

    if (litrosNum <= 0) {
      alert('Quantidade de litros inválida.');
      return;
    }

    const pricePerLiter = 13.0;
    const totalValue = litrosNum * pricePerLiter;
    const boat = getEmbarcacao(t.embarcacaoId);
    const boatName = getBoatCode(boat);

    if (!confirm(`Confirmar envio de ${litrosNum}L (${boatName}) para a Administradora a R$ 13,00/L?\nValor Total: R$ ${totalValue.toFixed(2)}`)) {
      return;
    }

    setIsSubmitting(true);
    const transacao = {
      id: t.isFromReservation ? `trx_fuel_${Date.now()}` : t.id,
      reservaId: t.reservaId || t.reservationRef?.id || null,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: totalValue,
      data: t.data || getTodayStr(),
      dataVencimento: t.data || getTodayStr(),
      dataPagamento: null,
      status: 'pendente',
      metodoPagamento: 'admin',
      descricao: `Abastecimento Faturado Administradora: ${litrosNum}L a R$13,00/L`,
      clienteId: t.clienteId,
      embarcacaoId: t.embarcacaoId,
      operador: operadorNome || 'Gerente',
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: transacao })
      });

      if (t.reservationRef) {
        const updatedReserva = {
          ...t.reservationRef,
          abastecimentoStatusCobranca: 'cobrado',
          abastecimentoFormaPagamento: 'admin',
          abastecimentoValorTotal: totalValue
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      await logAction('Abastecimento Administradora', `Enviou ${litrosNum}L de ${boatName} para Administradora (R$ ${totalValue.toFixed(2)})`, t.embarcacaoId, operadorNome);
      alert('Abastecimento enviado para a Administradora com sucesso!');
      if (reloadData) reloadData();
    } catch (err: any) {
      alert('Erro ao enviar abastecimento para a administradora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmChargeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeTargetItem) return;

    setIsSubmitting(true);
    const t = chargeTargetItem;
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    const litrosNum = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || t.reservationRef?.litrosAbastecidos || 0);

    let pricePerLiter = 9.0;
    let paymentLabel = 'PIX (Digital)';
    let txStatus = 'pago';

    if (chargePaymentType === 'dinheiro') {
      pricePerLiter = 9.0;
      paymentLabel = 'Dinheiro (Caixa Físico)';
      txStatus = 'pago';
    } else if (chargePaymentType === 'credit') {
      pricePerLiter = 10.0;
      paymentLabel = 'Cartão de Crédito';
      txStatus = 'pago';
    } else if (chargePaymentType === 'debit') {
      pricePerLiter = 9.0;
      paymentLabel = 'Cartão de Débito';
      txStatus = 'pago';
    } else if (chargePaymentType === 'admin') {
      pricePerLiter = 13.0;
      paymentLabel = 'Enviar para a Administradora';
      txStatus = 'pendente';
    }

    const totalValue = litrosNum * pricePerLiter;
    const boat = getEmbarcacao(t.embarcacaoId);
    const boatName = getBoatCode(boat);

    const transacao = {
      id: t.isFromReservation ? `trx_fuel_${Date.now()}` : t.id,
      reservaId: t.reservaId || t.reservationRef?.id || null,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: totalValue,
      data: t.data || getTodayStr(),
      dataVencimento: t.data || getTodayStr(),
      dataPagamento: txStatus === 'pago' ? (t.data || getTodayStr()) : null,
      status: txStatus,
      metodoPagamento: chargePaymentType,
      descricao: `Abastecimento Marina (${paymentLabel}): ${litrosNum}L a R$${pricePerLiter.toFixed(2)}/L`,
      clienteId: t.clienteId,
      embarcacaoId: t.embarcacaoId,
      operador: operadorNome || 'Gerente',
      comprovanteUrl: chargeComprovanteUrl || t.comprovanteUrl || null,
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: transacao })
      });

      if (t.reservationRef) {
        const updatedReserva = {
          ...t.reservationRef,
          abastecimentoStatusCobranca: 'cobrado',
          abastecimentoFormaPagamento: chargePaymentType,
          abastecimentoValorTotal: totalValue,
          abastecimentoComprovanteUrl: chargeComprovanteUrl || t.reservationRef.abastecimentoComprovanteUrl
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      if (setData) {
        setData((prev: any) => {
          const currentTxs = prev?.transacoes || [];
          const updatedTxs = [transacao, ...currentTxs.filter((x: any) => x.id !== transacao.id)];
          const currentRes = prev?.reservations || [];
          const updatedRes = t.reservationRef 
            ? currentRes.map((r: any) => r.id === t.reservationRef.id ? { 
                ...r, 
                abastecimentoStatusCobranca: 'cobrado', 
                abastecimentoFormaPagamento: chargePaymentType, 
                abastecimentoValorTotal: totalValue,
                abastecimentoComprovanteUrl: chargeComprovanteUrl || t.reservationRef.abastecimentoComprovanteUrl
              } : r)
            : currentRes;
          return {
            ...prev,
            transacoes: updatedTxs,
            reservations: updatedRes
          };
        });
      }

      await logAction('Cobrança Combustível', `Registrou cobrança de ${litrosNum}L de ${boatName} via ${paymentLabel} (R$ ${totalValue.toFixed(2)})`, t.embarcacaoId, operadorNome);
      setChargeTargetItem(null);
      alert('Cobrança realizada com sucesso!');
      if (reloadData) reloadData();
    } catch (err: any) {
      alert('Erro ao salvar cobrança.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadChargeComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingChargeComprovante(true);
    const formData = new FormData();
    formData.append('comprovante', file);

    try {
      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      const json = await res.json();
      const imgUrl = json.url || json.imageUrl;
      if (imgUrl) {
        setChargeComprovanteUrl(imgUrl);
      } else {
        alert('Erro ao processar arquivo.');
      }
    } catch (err) {
      alert('Erro ao enviar comprovante.');
    } finally {
      setIsUploadingChargeComprovante(false);
    }
  };

  const handleDeleteFuel = async (t: any) => {
    const boat = getEmbarcacao(t.embarcacaoId);
    const boatName = getBoatCode(boat);

    if (!window.confirm(`Tem certeza que deseja excluir o lançamento de abastecimento de ${boatName}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (t.id && !t.id.startsWith('res_fuel_')) {
        await fetch('/api/financeiro/transacoes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ action: 'delete', data: t.id })
        });
      }

      if (t.reservationRef) {
        const updatedReserva = {
          ...t.reservationRef,
          abastecimentoLitros: 0,
          litrosAbastecidos: 0,
          abastecimentoStatusCobranca: null,
          abastecimentoValorTotal: 0
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      if (setData) {
        setData((prev: any) => ({
          ...prev,
          transacoes: (prev?.transacoes || []).filter((item: any) => item.id !== t.id),
          reservations: (prev?.reservations || []).map((r: any) => {
            if (r.id === t.reservaId || r.id === t.reservationRef?.id) {
              return {
                ...r,
                abastecimentoLitros: 0,
                litrosAbastecidos: 0,
                abastecimentoStatusCobranca: null,
                abastecimentoValorTotal: 0
              };
            }
            return r;
          })
        }));
      }

      await logAction('Exclusão de Abastecimento', `Excluiu lançamento de abastecimento (${boatName})`, t.embarcacaoId, operadorNome);
      alert('Registro excluído com sucesso!');
      if (reloadData) reloadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDeleteFuel = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir os ${selectedIds.length} lançamentos selecionados?`)) return;

    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        const target = fuelTransactions.find(t => t.id === id);
        if (target) {
          if (target.id && !target.id.startsWith('res_fuel_')) {
            await fetch('/api/financeiro/transacoes/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
              },
              body: JSON.stringify({ action: 'delete', data: target.id })
            });
          }
          if (target.reservationRef) {
            const updatedReserva = {
              ...target.reservationRef,
              abastecimentoLitros: 0,
              litrosAbastecidos: 0,
              abastecimentoStatusCobranca: null,
              abastecimentoValorTotal: 0
            };
            await fetch('/api/db/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
              },
              body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
            });
          }
        }
      }

      setSelectedIds([]);
      if (reloadData) reloadData();
      alert('Registros selecionados excluídos com sucesso!');
    } catch (err: any) {
      alert('Erro ao excluir lançamentos selecionados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (t: any) => {
    setEditingItem(t);
    setEditBoatId(t.embarcacaoId || '');
    setEditClientId(t.clienteId || '');
    
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    const litersVal = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || t.reservationRef?.litrosAbastecidos || 0);
    setEditLiters(String(litersVal || ''));
    
    const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
    if (pm === 'dinheiro') setEditPaymentType('dinheiro');
    else if (pm === 'credit') setEditPaymentType('credit');
    else if (pm === 'debit') setEditPaymentType('debit');
    else if (pm === 'admin') setEditPaymentType('admin');
    else setEditPaymentType('pix');

    setEditStatus(t.status === 'pago' ? 'pago' : 'pendente');
    setEditDate(t.data || getTodayStr());
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editBoatId || !editLiters) {
      alert('Informe a embarcação e a quantidade de litros.');
      return;
    }

    setIsSubmitting(true);
    const litrosNum = parseFloat(editLiters.replace(',', '.'));
    let pricePerLiter = 9.0;
    let paymentLabel = 'PIX (Digital)';
    if (editPaymentType === 'dinheiro') {
      pricePerLiter = 9.0;
      paymentLabel = 'Dinheiro (Caixa Físico)';
    } else if (editPaymentType === 'credit') {
      pricePerLiter = 10.0;
      paymentLabel = 'Cartão de Crédito';
    } else if (editPaymentType === 'debit') {
      pricePerLiter = 9.0;
      paymentLabel = 'Cartão de Débito';
    } else if (editPaymentType === 'admin') {
      pricePerLiter = 13.0;
      paymentLabel = 'Faturado / Administradora';
    }

    const valorTotal = litrosNum * pricePerLiter;
    const boat = getEmbarcacao(editBoatId);
    const boatName = getBoatCode(boat);

    const updatedTrans = {
      id: editingItem.isFromReservation ? `trx_fuel_${Date.now()}` : editingItem.id,
      reservaId: editingItem.reservaId || editingItem.reservationRef?.id || null,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: valorTotal,
      data: editDate,
      dataVencimento: editDate,
      dataPagamento: editStatus === 'pago' ? editDate : null,
      status: editStatus,
      metodoPagamento: editPaymentType,
      descricao: `Abastecimento Marina (${paymentLabel}): ${litrosNum}L a R$${pricePerLiter.toFixed(2)}/L`,
      clienteId: editClientId || boat?.donos?.[0] || '',
      embarcacaoId: editBoatId,
      operador: editingItem.operador || operadorNome || 'Gerente',
      comprovanteUrl: editingItem.comprovanteUrl || null,
      createdAt: editingItem.createdAt || new Date().toISOString()
    };

    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });

      if (editingItem.reservationRef) {
        const updatedReserva = {
          ...editingItem.reservationRef,
          abastecimentoLitros: litrosNum,
          litrosAbastecidos: litrosNum,
          abastecimentoStatusCobranca: editStatus === 'pago' ? 'cobrado' : 'pendente',
          abastecimentoFormaPagamento: editPaymentType,
          abastecimentoValorTotal: valorTotal
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      await logAction('Edição de Abastecimento', `Atualizou abastecimento de ${boatName} (${litrosNum}L - R$ ${valorTotal.toFixed(2)})`, editBoatId, operadorNome);
      setEditingItem(null);
      alert('Lançamento atualizado com sucesso!');
      if (reloadData) reloadData();
    } catch (err: any) {
      alert('Erro ao atualizar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportSelected = () => {
    const itemsToExport = selectedIds.length > 0 
      ? fuelTransactions.filter(t => selectedIds.includes(t.id))
      : fuelTransactions;

    if (itemsToExport.length === 0) {
      alert('Nenhum registro selecionado para exportar.');
      return;
    }

    // Calculation Metrics for PDF Report
    let totalLiters = 0;
    let totalRevenue = 0;
    let totalPixValue = 0;
    let totalCreditValue = 0;
    let totalAdminValue = 0;
    let totalPixLiters = 0;
    let totalCreditLiters = 0;
    let totalAdminLiters = 0;

    const boatMap: Record<string, { name: string; liters: number; value: number; count: number }> = {};

    itemsToExport.forEach(t => {
      const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
      const litersVal = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || 0);
      const val = Number(t.valor) || 0;

      totalLiters += litersVal;
      totalRevenue += val;

      const pm = t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || 'pix';
      if (pm === 'credit') {
        totalCreditValue += val;
        totalCreditLiters += litersVal;
      } else if (pm === 'admin') {
        totalAdminValue += val;
        totalAdminLiters += litersVal;
      } else {
        totalPixValue += val;
        totalPixLiters += litersVal;
      }

      const boat = getEmbarcacao(t.embarcacaoId);
      const boatName = boat?.nome || 'Venda Avulsa';
      if (!boatMap[boatName]) {
        boatMap[boatName] = { name: boatName, liters: 0, value: 0, count: 0 };
      }
      boatMap[boatName].liters += litersVal;
      boatMap[boatName].value += val;
      boatMap[boatName].count += 1;
    });

    const topBoats = Object.values(boatMap).sort((a, b) => b.value - a.value);

    // Build Executive PDF Document HTML window
    const logoSrc = localStorage.getItem('custom_sidebar_logo') || '';
    const nowStr = new Date().toLocaleString('pt-BR');
    const periodStr = getPeriodLabel();

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Por favor, permita pop-ups no navegador para visualizar e salvar o PDF.');
      return;
    }

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatorio_Abastecimentos_${getTodayStr()}.pdf</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 16px;
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand img {
            max-height: 44px;
            max-width: 150px;
            object-fit: contain;
          }
          .title-area h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .title-area p {
            margin: 2px 0 0 0;
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
          }
          .meta-box {
            text-align: right;
            font-size: 10px;
            color: #475569;
          }
          .meta-box strong {
            color: #0f172a;
          }

          /* KPI Grid Cards */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px;
          }
          .kpi-card .label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 3px;
          }
          .kpi-card .val {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
          }
          .kpi-card .sub {
            font-size: 9px;
            color: #2563eb;
            font-weight: 700;
            margin-top: 2px;
          }

          /* Charts & Analytics Section */
          .analytics-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
          .chart-box {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
          }
          .chart-box h3 {
            margin: 0 0 10px 0;
            font-size: 12px;
            font-weight: 800;
            color: #1e293b;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
          }
          
          /* Progress bar chart */
          .bar-item {
            margin-bottom: 8px;
          }
          .bar-label {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .bar-bg {
            height: 7px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
          }
          .bar-fill {
            height: 100%;
            border-radius: 4px;
          }
          .bg-pix { background: #2563eb; }
          .bg-credit { background: #0284c7; }
          .bg-admin { background: #d97706; }

          /* Table Styling */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 8px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 7px 8px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 7px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 800;
          }
          .badge-pago { background: #dcfce7; color: #15803d; }
          .badge-pendente { background: #fef3c7; color: #b45309; }

          .total-row td {
            font-weight: 900;
            background: #eff6ff;
            color: #1e40af;
            border-top: 2px solid #2563eb;
            font-size: 11px;
          }

          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
          }

          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>

        <!-- Top Action Bar for Exporting PDF -->
        <div class="no-print" style="background:#0f172a; padding:12px 20px; margin:-16px -16px 16px -16px; display:flex; align-items:center; justify-content:space-between; color:white;">
          <div style="font-weight:bold; font-size:13px;">📄 Relatório de Abastecimentos Prontos para PDF</div>
          <div style="display:flex; gap:10px;">
            <button onclick="window.print()" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">🖨️ Baixar / Salvar PDF</button>
            <button onclick="window.close()" style="background:#334155; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">Fechar</button>
          </div>
        </div>

        <!-- Header -->
        <div class="header">
          <div class="brand">
            ${logoSrc ? `<img src="${logoSrc}" alt="Logo" />` : `<div style="font-size:20px; font-weight:900; color:#2563eb;">MARINA ERP</div>`}
            <div class="title-area">
              <h1>Relatório de Abastecimentos</h1>
              <p>Gestão Executiva de Combustível e Vendas</p>
            </div>
          </div>
          <div class="meta-box">
            <div>Data de Emissão: <strong>${nowStr}</strong></div>
            <div>Período: <strong>${periodStr}</strong></div>
            <div>Operador: <strong>${operadorNome || 'Gerente de Marina'}</strong></div>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="label">Faturamento Total</div>
            <div class="val">${totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="sub">${itemsToExport.length} Registros</div>
          </div>
          <div class="kpi-card">
            <div class="label">Volume Total</div>
            <div class="val">${totalLiters.toFixed(1)} L</div>
            <div class="sub">Dispensado na Bomba</div>
          </div>
          <div class="kpi-card">
            <div class="label">Enviar p/ Administradora</div>
            <div class="val">${totalAdminValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="sub">${totalAdminLiters.toFixed(1)} L faturados</div>
          </div>
          <div class="kpi-card">
            <div class="label">Pix + Crédito (Direto)</div>
            <div class="val">${(totalPixValue + totalCreditValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="sub">${(totalPixLiters + totalCreditLiters).toFixed(1)} L recebidos</div>
          </div>
        </div>

        <!-- Analytics Section (Charts & Breakdown) -->
        <div class="analytics-section">
          <!-- Chart 1: Payment Method Distribution -->
          <div class="chart-box">
            <h3>📊 Distribuição por Forma de Pagamento</h3>
            
            <div class="bar-item">
              <div class="bar-label">
                <span>Pix / Dinheiro (R$ 9,00/L)</span>
                <span>${totalPixValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${totalRevenue > 0 ? Math.round((totalPixValue / totalRevenue) * 100) : 0}%)</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill bg-pix" style="width: ${totalRevenue > 0 ? (totalPixValue / totalRevenue) * 100 : 0}%"></div>
              </div>
            </div>

            <div class="bar-item">
              <div class="bar-label">
                <span>Cartão de Crédito (R$ 10,00/L)</span>
                <span>${totalCreditValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${totalRevenue > 0 ? Math.round((totalCreditValue / totalRevenue) * 100) : 0}%)</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill bg-credit" style="width: ${totalRevenue > 0 ? (totalCreditValue / totalRevenue) * 100 : 0}%"></div>
              </div>
            </div>

            <div class="bar-item">
              <div class="bar-label">
                <span>Enviar p/ Administradora (R$ 13,00/L)</span>
                <span>${totalAdminValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${totalRevenue > 0 ? Math.round((totalAdminValue / totalRevenue) * 100) : 0}%)</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill bg-admin" style="width: ${totalRevenue > 0 ? (totalAdminValue / totalRevenue) * 100 : 0}%"></div>
              </div>
            </div>
          </div>

          <!-- Chart 2: Top Boats Breakdown -->
          <div class="chart-box">
            <h3>⛵ Top Embarcações por Volume</h3>
            ${topBoats.slice(0, 4).map(b => `
              <div class="bar-item">
                <div class="bar-label">
                  <span>${b.name} (${b.count}x)</span>
                  <span>${b.liters.toFixed(1)} L - ${b.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill bg-pix" style="width: ${totalLiters > 0 ? (b.liters / totalLiters) * 100 : 0}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Detailed Transactions Table -->
        <h3 style="font-size:13px; font-weight:800; margin: 0 0 6px 0; color:#1e293b;">📋 Detalhamento dos Lançamentos (${itemsToExport.length})</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Embarcação</th>
              <th>Cotista / Cliente</th>
              <th>Litros (L)</th>
              <th>Valor (R$)</th>
              <th>Forma de Pagamento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToExport.map(t => {
              const boat = getEmbarcacao(t.embarcacaoId);
              const client = getCliente(t.clienteId);
              const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
              const litersVal = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || 0);
              const isFaturado = (t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoFormaPagamento === 'admin');
              const isPago = t.status === 'pago' || t.status === 'cobrado' || t.status === 'lancado';

              return `
                <tr>
                  <td style="font-family:monospace; font-weight:bold; font-size:9px;">#${t.id.substring(t.id.length - 8)}</td>
                  <td>${t.data}</td>
                  <td><strong>${boat?.nome || 'Venda Avulsa'}</strong></td>
                  <td>${client?.nome || 'N/A'}</td>
                  <td style="font-weight:bold;">${litersVal.toFixed(1)} L</td>
                  <td style="font-weight:bold;">${Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td>${isFaturado ? 'Enviar p/ Administradora' : t.metodoPagamento === 'credit' ? 'Cartão Crédito' : 'Pix / Dinheiro'}</td>
                  <td><span class="badge ${isPago ? 'badge-pago' : 'badge-pendente'}">${isPago ? 'Concluído' : 'Pendente'}</span></td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align:right;">TOTAL ACUMULADO:</td>
              <td>${totalLiters.toFixed(1)} L</td>
              <td>${totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div>Documento gerado eletronicamente pelo Marina ERP.</div>
          <div>Relatório Oficial de Gestão</div>
        </div>

        <script>
          // Automatically prompt print dialog when opened
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>

      </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-800 font-sans relative pb-24">
      
      {/* Outer Card Canvas (Biosynthesia Aesthetic) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financeiro & Abastecimento</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gerencie receitas de combustíveis, vendas e controle de bombas da marina.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector Button */}
            <div className="relative">
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                  isFilterPanelOpen || activeFilterCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{getPeriodLabel()}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => handleExportSelected()}
              className="px-4 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar</span>
            </button>

            <button
              onClick={() => {
                setIsFuelModalOpen(true);
                setSelectedBoatId('');
                setSelectedClientId('');
                setLiters('');
                setComprovanteUrl(null);
                setPaymentType('pix');
              }}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Venda Rápida</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Cards (Hidden on mobile, visible on desktop/tablet) */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* KPI Card 1: Total Revenue (Pago) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receita Recebida</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+12.5%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Últimos 7 dias</span>
            </div>
          </div>

          {/* KPI Card 2: Liters Sold */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Litros (Vendas)</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {totalLiters.toFixed(1)} <span className="text-xl font-bold text-slate-500">L</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+5.2%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Fluxo na Bomba</span>
            </div>
          </div>

          {/* KPI Card 3: Pending Bills */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faturamentos Abertos</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {totalPendingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>-2.4%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Pendentes na data</span>
            </div>
          </div>

          {/* KPI Card 4: Orders/Transactions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Abastecimentos</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">{fuelTransactions.length}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+1.1%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Tickets de venda</span>
            </div>
          </div>

        </div>

        {/* Caixa Físico vs PIX vs Cartões vs Administradora Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 tracking-tight">Conferência & Fechamento de Caixa da Marina</h3>
                <p className="text-[11px] text-slate-500">Separação de dinheiro físico em espécie vs transações bancárias / faturadas</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Geral Recebido</span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Dinheiro em Espécie (Caixa da Marina) */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Caixa Físico (Dinheiro)</span>
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-900 font-mono">
                {totalDinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[10px] text-emerald-600/80 font-medium">
                💵 Cédulas na gaveta do caixa
              </p>
            </div>

            {/* 2. PIX (Conta Bancária) */}
            <div className="bg-cyan-50/50 border border-cyan-200/60 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-cyan-600" />
                <span>PIX (Conta Bancária)</span>
              </span>
              <p className="text-lg sm:text-xl font-black text-cyan-900 font-mono">
                {totalPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[10px] text-cyan-600/80 font-medium">
                📱 Transferência / QR Code
              </p>
            </div>

            {/* 3. Cartões (Crédito & Débito) */}
            <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Cartões (Maquininha)</span>
              </span>
              <p className="text-lg sm:text-xl font-black text-blue-900 font-mono">
                {totalCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[10px] text-blue-600/80 font-medium">
                💳 Maquininha no píer
              </p>
            </div>

            {/* 4. Administradora (Faturado Pós-pago) */}
            <div className="bg-purple-50/50 border border-purple-200/60 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Administradora (Faturado)</span>
              </span>
              <p className="text-lg sm:text-xl font-black text-purple-900 font-mono">
                {totalAdmin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[10px] text-purple-600/80 font-medium">
                🏢 Faturamento pós-pago
              </p>
            </div>
          </div>
        </div>

        {/* Search, Filter & Tabs Bar */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-xl">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente, barco ou detalhes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white font-medium transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Toggle Filter Panel Button */}
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`px-3.5 py-2.5 border text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isFilterPanelOpen || activeFilterCount > 0
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-blue-600 font-extrabold text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-full lg:w-auto overflow-x-auto subtle-scrollbar">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pago', label: 'Pagos / Concluídos' },
                { id: 'pendente', label: 'Faturamento / Pendentes' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>

          {/* Expandable Filter Panel */}
          {isFilterPanelOpen && (
            <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Filtros Avançados</span>
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Período Preset */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Período</span>
                  </label>
                  <select
                    value={periodPreset}
                    onChange={(e) => handleSelectPeriodPreset(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="7days">Últimos 7 dias</option>
                    <option value="30days">Últimos 30 dias</option>
                    <option value="this_month">Este Mês</option>
                    <option value="last_month">Mês Passado</option>
                    <option value="all">Todo o Período</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* 2. Embarcação Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Ship className="w-3.5 h-3.5 text-slate-400" />
                    <span>Embarcação</span>
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'all', label: 'Todas as Embarcações' },
                      ...(data?.boats || []).map((boat) => ({
                        value: boat.id,
                        label: getBoatCode(boat),
                        sublabel: boat.vaga ? `Vaga: ${boat.vaga}` : 'Sem Vaga',
                      })),
                    ]}
                    value={boatFilter}
                    onChange={(val) => setBoatFilter(val)}
                    placeholder="Selecione a embarcação..."
                    searchPlaceholder="Pesquisar embarcação..."
                  />
                </div>

                {/* 3. Cliente Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cliente</span>
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'all', label: 'Todos os Clientes' },
                      ...(data?.clients || []).map((client) => ({
                        value: client.id,
                        label: client.nome,
                        sublabel: client.telefone || undefined,
                      })),
                    ]}
                    value={clientFilter}
                    onChange={(val) => setClientFilter(val)}
                    placeholder="Selecione o cliente..."
                    searchPlaceholder="Pesquisar cliente..."
                  />
                </div>

                {/* 4. Forma de Pagamento Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Forma de Pagamento</span>
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="all">Todas as Formas</option>
                    <option value="dinheiro">💵 Dinheiro (Caixa Físico)</option>
                    <option value="pix">📱 PIX (Conta Digital)</option>
                    <option value="credit">💳 Cartão de Crédito</option>
                    <option value="debit">💳 Cartão de Débito</option>
                    <option value="admin">🏢 Administradora (Faturado)</option>
                  </select>
                </div>

              </div>

              {/* Date pickers row if custom or date selected */}
              {(periodPreset === 'custom' || periodPreset === 'all') && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">De:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPeriodPreset('custom');
                      }}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Até:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPeriodPreset('custom');
                      }}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Filters Chips Bar */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Filtros ativos:</span>
              
              {periodPreset !== 'this_month' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                  <span>Período: {getPeriodLabel()}</span>
                  <button onClick={() => handleSelectPeriodPreset('this_month')} className="hover:text-blue-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {boatFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                  <span>Barco: {getEmbarcacao(boatFilter)?.nome || boatFilter}</span>
                  <button onClick={() => setBoatFilter('all')} className="hover:text-indigo-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {clientFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                  <span>Cliente: {getCliente(clientFilter)?.nome || clientFilter}</span>
                  <button onClick={() => setClientFilter('all')} className="hover:text-purple-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {paymentFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                  <span>Pagamento: {paymentFilter === 'pix' ? 'Pix/Dinheiro' : paymentFilter === 'credit' ? 'Cartão Crédito' : 'Admin'}</span>
                  <button onClick={() => setPaymentFilter('all')} className="hover:text-amber-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm.trim() !== '' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                  <span>Busca: "{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')} className="hover:text-slate-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-1"
              >
                Limpar tudo
              </button>
            </div>
          )}

        </div>

        {/* Clean Data Table Container (Mobile Cards + Desktop Table) */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
          {fuelTransactions.length === 0 ? (
            <div className="p-10 sm:p-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <Droplets className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Nenhum registro de abastecimento encontrado com os filtros aplicados.</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on Phone/Mobile) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {fuelTransactions.map(t => {
                  const boat = getEmbarcacao(t.embarcacaoId);
                  const client = getCliente(t.clienteId);
                  const isSelected = selectedIds.includes(t.id);
                  
                  const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                  const litersVal = match ? parseFloat(match[1].replace(',', '.')) : 0;
                  const isItemCobrado = t.status === 'pago' || t.status === 'cobrado' || t.status === 'lancado' || t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoStatusCobranca === 'cobrado';
                  const isFaturado = (t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoFormaPagamento === 'admin');

                  return (
                    <div 
                      key={t.id}
                      className={`p-3.5 sm:p-4 transition-colors space-y-2.5 ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      {/* Top Row: Checkbox, Boat Name, Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectOne(t.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer shrink-0"
                          />
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                            <Droplets className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-sm truncate block leading-tight">{boat ? getBoatCode(boat) : 'Venda Avulsa'}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">#{t.id.substring(t.id.length - 8)}</span>
                          </div>
                        </div>

                        {isItemCobrado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{isFaturado ? 'Faturado' : 'Pago'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Pendente</span>
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Value & Liters, Client & Date */}
                      <div className="grid grid-cols-2 gap-2 pt-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Valor & Litros</span>
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">{litersVal.toFixed(1)} Litros</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Cotista / Data</span>
                          <span className="font-bold text-slate-800 truncate block">{client?.nome || 'N/A'}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">{t.data}</span>
                        </div>
                      </div>

                      {/* Bottom Actions Row */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {(() => {
                            const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
                            const desc = (t.descricao || '').toLowerCase();
                            if (isFaturado || pm === 'admin' || desc.includes('admin') || desc.includes('faturado')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Building2 className="w-3 h-3 text-purple-600" />
                                  <span>Faturado Admin</span>
                                </span>
                              );
                            }
                            if (pm === 'dinheiro' || desc.includes('dinheiro') || desc.includes('caixa')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <Banknote className="w-3 h-3 text-emerald-600" />
                                  <span>Dinheiro (Caixa)</span>
                                </span>
                              );
                            }
                            if (pm === 'pix' || desc.includes('pix')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-300">
                                  <QrCode className="w-3 h-3 text-cyan-600" />
                                  <span>PIX (Digital)</span>
                                </span>
                              );
                            }
                            if (pm === 'credit' || desc.includes('crédito') || desc.includes('credito') || desc.includes('credit')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>Cartão Crédito</span>
                                </span>
                              );
                            }
                            if (pm === 'debit' || desc.includes('débito') || desc.includes('debito')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>Cartão Débito</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Pendente</span>
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (!isItemCobrado) {
                                setChargeTargetItem(t);
                                const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
                                setChargePaymentType(pm === 'dinheiro' ? 'dinheiro' : pm === 'credit' ? 'credit' : pm === 'debit' ? 'debit' : pm === 'admin' ? 'admin' : 'pix');
                                setChargeComprovanteUrl(t.comprovanteUrl || null);
                              }
                            }}
                            disabled={isItemCobrado}
                            className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 ${
                              isItemCobrado
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-default opacity-90'
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                            }`}
                          >
                            {isItemCobrado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Droplets className="w-3.5 h-3.5" />}
                            <span>{isItemCobrado ? 'Cobrado' : 'Cobrar'}</span>
                          </button>

                          <button
                            onClick={(e) => handleToggleActionMenu(e, t)}
                            className="p-1.5 rounded-xl transition-colors cursor-pointer border border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
                            title="Opções"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Data Table (Visible on Tablet/Desktop) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === fuelTransactions.length && fuelTransactions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Produto & ID</th>
                    <th className="p-3.5">Valor & Litros</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Pagamento</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {fuelTransactions.map(t => {
                    const boat = getEmbarcacao(t.embarcacaoId);
                    const client = getCliente(t.clienteId);
                    const isSelected = selectedIds.includes(t.id);
                    
                    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                    const litersVal = match ? parseFloat(match[1].replace(',', '.')) : 0;
                    const isItemCobrado = t.status === 'pago' || t.status === 'cobrado' || t.status === 'lancado' || t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoStatusCobranca === 'cobrado';
                    const isFaturado = (t.metodoPagamento === 'admin' || t.reservationRef?.abastecimentoFormaPagamento === 'admin');

                    return (
                      <tr 
                        key={t.id} 
                        className={`transition-colors hover:bg-slate-50/60 ${isSelected ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectOne(t.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                          />
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100/80">
                              <Droplets className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">{boat ? getBoatCode(boat) : 'Venda Avulsa'}</span>
                              <span className="text-[11px] text-slate-400 font-mono block">#{t.id.substring(t.id.length - 8)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block text-sm">
                            {Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block">{litersVal.toFixed(1)} Litros</span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800 block">{client?.nome || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span>Lançado por: <strong className="text-slate-600 font-semibold">{t.operador || 'Marinheiro'}</strong></span>
                          </span>
                        </td>

                        <td className="p-3.5">
                          {(() => {
                            const pm = (t.metodoPagamento || t.reservationRef?.abastecimentoFormaPagamento || '').toLowerCase();
                            const desc = (t.descricao || '').toLowerCase();
                            if (isFaturado || pm === 'admin' || desc.includes('admin') || desc.includes('faturado')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Building2 className="w-3 h-3 text-purple-600" />
                                  <span>Faturado Admin</span>
                                </span>
                              );
                            }
                            if (pm === 'dinheiro' || desc.includes('dinheiro') || desc.includes('caixa')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <Banknote className="w-3 h-3 text-emerald-600" />
                                  <span>Dinheiro (Caixa)</span>
                                </span>
                              );
                            }
                            if (pm === 'pix' || desc.includes('pix')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-300">
                                  <QrCode className="w-3 h-3 text-cyan-600" />
                                  <span>PIX (Digital)</span>
                                </span>
                              );
                            }
                            if (pm === 'credit' || desc.includes('crédito') || desc.includes('credito') || desc.includes('credit')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>Cartão Crédito</span>
                                </span>
                              );
                            }
                            if (pm === 'debit' || desc.includes('débito') || desc.includes('debito')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>Cartão Débito</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Pendente</span>
                              </span>
                            );
                          })()}
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{t.data}</span>
                        </td>

                        <td className="p-3.5 text-center">
                          {isItemCobrado ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{isFaturado ? 'Concluído (Faturado)' : 'Concluído (Pago)'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 1. Cobrar button */}
                            <button
                              onClick={() => {
                                if (!isItemCobrado) {
                                  setChargeTargetItem(t);
                                  setChargePaymentType(t.metodoPagamento === 'credit' ? 'credit' : t.metodoPagamento === 'admin' ? 'admin' : 'pix');
                                  setChargeComprovanteUrl(t.comprovanteUrl || null);
                                }
                              }}
                              disabled={isItemCobrado}
                              className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 ${
                                isItemCobrado
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-default opacity-90'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                              }`}
                            >
                              {isItemCobrado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Droplets className="w-3.5 h-3.5" />}
                              <span>{isItemCobrado ? 'Cobrado' : 'Cobrar'}</span>
                            </button>

                            {/* 2. 3 pontinhos button */}
                            <button
                              onClick={(e) => handleToggleActionMenu(e, t)}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                                activeActionMenuId === t.id
                                  ? 'bg-slate-200 text-slate-900 border-slate-300'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-slate-200'
                              }`}
                              title="Opções"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
          )}
        </div>

      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white shadow-2xl rounded-2xl px-5 py-3 flex items-center space-x-3 animate-slide-up-fast">
          <span className="text-xs font-black">{selectedIds.length} Selecionado(s)</span>
          <div className="h-4 w-[1px] bg-slate-700"></div>
          
          <button 
            onClick={handleExportSelected}
            className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar</span>
          </button>

          <button 
            onClick={handleBulkDeleteFuel}
            className="text-xs font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1.5 cursor-pointer bg-rose-950/80 hover:bg-rose-900/90 border border-rose-800/60 px-3 py-1.5 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Apagar</span>
          </button>

          <button 
            onClick={() => setSelectedIds([])} 
            className="text-xs font-bold text-slate-400 hover:text-slate-200 p-1 cursor-pointer ml-1"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Comprovante */}
      {modalComprovante && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">Comprovante de Pagamento</h3>
              <button onClick={() => setModalComprovante(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-100">
              <img src={modalComprovante} alt="Comprovante" className="w-full rounded-2xl border border-slate-200 shadow-sm" />
            </div>
          </div>
        </div>
      )}

      {/* New Fuel Record Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden"></div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-[#2563EB]" />
                <span>Nova Venda / Abastecimento</span>
              </h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full shadow-xs">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFuelTransaction} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 subtle-scrollbar">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Embarcação *</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Selecione o barco...' },
                    ...(data?.boats || []).map((b) => ({
                      value: b.id,
                      label: b.nome,
                      sublabel: b.vaga ? `Vaga: ${b.vaga}` : 'Sem Vaga',
                    })),
                  ]}
                  value={selectedBoatId}
                  onChange={(boatId) => {
                    setSelectedBoatId(boatId);
                    const b = getEmbarcacao(boatId);
                    if (b?.donos?.[0]) {
                      setSelectedClientId(b.donos[0]);
                    } else {
                      setSelectedClientId('');
                    }
                  }}
                  placeholder="Selecione o barco..."
                  searchPlaceholder="Pesquisar barco..."
                />
              </div>

              {/* Seleção do Cotista / Cliente */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Cotista / Cliente *</label>
                <SearchableSelect
                  disabled={!selectedBoatId}
                  options={[
                    { value: '', label: !selectedBoatId ? 'Selecione a embarcação primeiro...' : 'Selecione o cotista...' },
                    ...((data?.clients || []).filter((c) => {
                      const selectedBoat = getEmbarcacao(selectedBoatId);
                      if (!selectedBoat) return true;
                      if (selectedBoat.donos && Array.isArray(selectedBoat.donos) && selectedBoat.donos.length > 0) {
                        return selectedBoat.donos.includes(c.id);
                      }
                      return true;
                    })).map((c) => ({
                      value: c.id,
                      label: c.nome,
                      sublabel: c.cota ? `Cota ${c.cota}` : c.cpf ? `CPF: ${c.cpf}` : undefined,
                    })),
                  ]}
                  value={selectedClientId}
                  onChange={(val) => setSelectedClientId(val)}
                  placeholder={!selectedBoatId ? 'Selecione a embarcação primeiro...' : 'Selecione o cotista...'}
                  searchPlaceholder="Pesquisar cotista/cliente..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Litros Abastecidos (L) *</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value.replace(',', '.'))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-xl font-black text-slate-900 focus:ring-[#2563EB]"
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs block">Forma de Pagamento *</label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentType === 'dinheiro' ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" value="dinheiro" checked={paymentType === 'dinheiro'} onChange={() => setPaymentType('dinheiro')} className="sr-only" />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>Dinheiro (Caixa Físico)</span>
                      </span>
                      <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">R$ 9,00/L (Entrada física de cédulas no caixa da marina)</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentType === 'pix' ? 'border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" value="pix" checked={paymentType === 'pix'} onChange={() => setPaymentType('pix')} className="sr-only" />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-cyan-950 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-cyan-600" />
                        <span>PIX (Conta Bancária)</span>
                      </span>
                      <span className="block text-[11px] text-cyan-700 font-medium mt-0.5">R$ 9,00/L (Transferência bancária / QR Code)</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentType === 'credit' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} className="sr-only" />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Cartão de Crédito</span>
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium mt-0.5">R$ 10,00/L (Recebido na maquininha)</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentType === 'debit' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" value="debit" checked={paymentType === 'debit'} onChange={() => setPaymentType('debit')} className="sr-only" />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Cartão de Débito</span>
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium mt-0.5">R$ 9,00/L (Recebido na maquininha)</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentType === 'admin' ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" value="admin" checked={paymentType === 'admin'} onChange={() => setPaymentType('admin')} className="sr-only" />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span>Enviar para a Administradora</span>
                      </span>
                      <span className="block text-[11px] text-purple-700 font-medium mt-0.5">R$ 13,00/L (Cobrança Mensal Pendente)</span>
                    </div>
                  </label>
                </div>

                {/* Banner de Orientação */}
                {paymentType === 'dinheiro' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-medium flex items-start gap-2 animate-in fade-in">
                    <Banknote className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-bold">💵 Entrada no Caixa Físico da Marina</strong>
                      O valor deve ser recebido em cédulas e recolhido na gaveta física para a conferência diária do caixa.
                    </div>
                  </div>
                )}
                {paymentType === 'pix' && (
                  <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-xl text-xs text-cyan-900 font-medium flex items-start gap-2 animate-in fade-in">
                    <QrCode className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-cyan-950 font-bold">📱 Pagamento Digital PIX</strong>
                      Transação direta na conta bancária da Marina. Anexe o comprovante abaixo caso desejado.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs block">Comprovante (Opcional)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploadingComprovante ? (
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      ) : comprovanteUrl ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      )}
                      <p className="text-xs text-slate-500 font-medium">
                        {comprovanteUrl ? 'Comprovante anexado' : 'Clique para enviar foto/PDF'}
                      </p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUploadComprovante} disabled={isUploadingComprovante} />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBoatId || !liters}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Registrar Venda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cobrar / Enviar para Administradora */}
      {chargeTargetItem && (() => {
        const t = chargeTargetItem;
        const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
        const litrosNum = match ? parseFloat(match[1].replace(',', '.')) : (t.reservationRef?.abastecimentoLitros || t.reservationRef?.litrosAbastecidos || 0);
        const boat = getEmbarcacao(t.embarcacaoId);
        const client = getCliente(t.clienteId);

        let preco = 9.0;
        if (chargePaymentType === 'credit') preco = 10.0;
        if (chargePaymentType === 'admin') preco = 13.0;
        const totalCalc = litrosNum * preco;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden"></div>
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <span>Cobrança de Combustível</span>
                </h3>
                <button onClick={() => setChargeTargetItem(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full shadow-xs cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmChargeItem} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 subtle-scrollbar">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                    <span>Embarcação: {boat?.nome || 'M99'}</span>
                    <span className="font-mono text-sm font-black">{litrosNum} Litros</span>
                  </div>
                  <div className="text-xs text-blue-700 font-medium">
                    Cliente: {client?.nome || 'Cliente'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 text-xs block">Selecione a Modalidade de Cobrança *</label>
                  
                  {/* Dinheiro */}
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${chargePaymentType === 'dinheiro' ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="chargePayment" value="dinheiro" checked={chargePaymentType === 'dinheiro'} onChange={() => setChargePaymentType('dinheiro')} className="sr-only" />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Dinheiro (Caixa Físico)</span>
                        </span>
                        <span className="block text-[11px] text-emerald-700 font-medium">R$ 9,00 / Litro (Entrada no caixa do píer)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-emerald-900">
                        {(litrosNum * 9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </label>

                  {/* PIX */}
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${chargePaymentType === 'pix' ? 'border-cyan-600 bg-cyan-50/60 ring-1 ring-cyan-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="chargePayment" value="pix" checked={chargePaymentType === 'pix'} onChange={() => setChargePaymentType('pix')} className="sr-only" />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-cyan-950 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-cyan-600" />
                          <span>PIX (Conta Bancária)</span>
                        </span>
                        <span className="block text-[11px] text-cyan-700 font-medium">R$ 9,00 / Litro (Transferência digital)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-cyan-900">
                        {(litrosNum * 9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </label>

                  {/* Cartão de Crédito */}
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${chargePaymentType === 'credit' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="chargePayment" value="credit" checked={chargePaymentType === 'credit'} onChange={() => setChargePaymentType('credit')} className="sr-only" />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Cartão de Crédito</span>
                        </span>
                        <span className="block text-[11px] text-slate-500 font-medium">R$ 10,00 / Litro (Maquininha)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-blue-900">
                        {(litrosNum * 10).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </label>

                  {/* Cartão de Débito */}
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${chargePaymentType === 'debit' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="chargePayment" value="debit" checked={chargePaymentType === 'debit'} onChange={() => setChargePaymentType('debit')} className="sr-only" />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Cartão de Débito</span>
                        </span>
                        <span className="block text-[11px] text-slate-500 font-medium">R$ 9,00 / Litro (Maquininha)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-blue-900">
                        {(litrosNum * 9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </label>

                  {/* Administradora */}
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${chargePaymentType === 'admin' ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="chargePayment" value="admin" checked={chargePaymentType === 'admin'} onChange={() => setChargePaymentType('admin')} className="sr-only" />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          <span>Enviar para a Administradora</span>
                        </span>
                        <span className="block text-[11px] text-purple-700 font-bold">Faturado Pós-pago (R$ 13,00 / Litro)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-purple-900">
                        {(litrosNum * 13).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block">Anexar Comprovante / Recibo (Imagem ou PDF - Opcional)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        {isUploadingChargeComprovante ? (
                          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                        ) : chargeComprovanteUrl ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Comprovante Anexado com Sucesso!</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <p className="text-[11px] text-slate-500 font-medium">Clique para anexar Imagem ou PDF</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,.pdf,application/pdf" 
                        onChange={handleUploadChargeComprovante} 
                        disabled={isUploadingChargeComprovante} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Valor Total a Lançar:</span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {totalCalc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Confirmar Lançamento</span>
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Editar Lançamento */}
      {editingItem && (() => {
        const boat = getEmbarcacao(editBoatId);
        const litrosNum = parseFloat(editLiters.replace(',', '.') || '0');
        let preco = 9.0;
        if (editPaymentType === 'credit') preco = 10.0;
        if (editPaymentType === 'admin') preco = 13.0;
        const totalCalc = litrosNum * preco;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden"></div>
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <SquarePen className="w-5 h-5 text-amber-600" />
                  <span>Editar Lançamento</span>
                </h3>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full shadow-xs cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditItem} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 subtle-scrollbar">
                
                {/* Embarcação */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Embarcação *</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Selecione a embarcação...' },
                      ...(data?.boats || []).map((b) => ({
                        value: b.id,
                        label: getBoatCode(b),
                        sublabel: b.vaga ? `Vaga: ${b.vaga}` : 'Sem Vaga',
                      })),
                    ]}
                    value={editBoatId}
                    onChange={(val) => {
                      setEditBoatId(val);
                      const b = getEmbarcacao(val);
                      if (b?.donos?.[0]) setEditClientId(b.donos[0]);
                    }}
                    placeholder="Selecione a embarcação..."
                    searchPlaceholder="Pesquisar embarcação..."
                  />
                </div>

                {/* Cliente */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Cliente / Proprietário</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Selecione o cliente...' },
                      ...(data?.clients || []).map((c) => ({
                        value: c.id,
                        label: c.nome,
                        sublabel: c.telefone || undefined,
                      })),
                    ]}
                    value={editClientId}
                    onChange={(val) => setEditClientId(val)}
                    placeholder="Selecione o cliente..."
                    searchPlaceholder="Pesquisar cliente..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Litros */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs">Litros (L) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editLiters}
                      onChange={(e) => setEditLiters(e.target.value.replace(',', '.'))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-amber-500"
                      placeholder="0.0"
                    />
                  </div>

                  {/* Data */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs">Data do Lançamento</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-medium text-xs focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Status & Forma de Pagamento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-semibold text-xs focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="pago">Pago / Publicado</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs">Forma de Pagamento</label>
                    <select
                      value={editPaymentType}
                      onChange={(e) => setEditPaymentType(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-semibold text-xs focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="dinheiro">💵 Dinheiro (Caixa Físico - R$9/L)</option>
                      <option value="pix">📱 PIX (Conta Bancária - R$9/L)</option>
                      <option value="credit">💳 Cartão Crédito (R$10/L)</option>
                      <option value="debit">💳 Cartão Débito (R$9/L)</option>
                      <option value="admin">🏢 Administradora (R$13/L)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase">Valor Total Calculado:</span>
                  <span className="text-base font-black text-amber-950 font-mono">
                    {totalCalc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !editBoatId || !editLiters}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Salvar Alterações</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* Global Fixed Popover Menu for 3-dots */}
      {activeActionMenuId && menuPosition && activeActionTargetItem && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setActiveActionMenuId(null);
              setMenuPosition(null);
              setActiveActionTargetItem(null);
            }}
          />

          <div
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed w-44 bg-white border border-slate-200 shadow-2xl rounded-2xl p-1.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150 text-left space-y-0.5"
          >
            <button
              onClick={() => {
                const item = activeActionTargetItem;
                setActiveActionMenuId(null);
                setMenuPosition(null);
                setActiveActionTargetItem(null);
                handleOpenEditModal(item);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <SquarePen className="w-3.5 h-3.5 text-amber-600" />
              <span>Editar</span>
            </button>

            {activeActionTargetItem.comprovanteUrl && (
              <button
                onClick={() => {
                  const url = activeActionTargetItem.comprovanteUrl;
                  setActiveActionMenuId(null);
                  setMenuPosition(null);
                  setActiveActionTargetItem(null);
                  setModalComprovante(url);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Ver Recibo</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100"></div>

            <button
              onClick={() => {
                const item = activeActionTargetItem;
                setActiveActionMenuId(null);
                setMenuPosition(null);
                setActiveActionTargetItem(null);
                handleDeleteFuel(item);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Apagar</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
