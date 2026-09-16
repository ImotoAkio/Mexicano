import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Filter, Search, 
  MoreVertical, CheckCircle, Clock, XCircle, AlertCircle, FileText,
  Calendar, Upload, Copy, Download, Eye, Users, Check, ExternalLink,
  HelpCircle, AlertTriangle, UserCheck
} from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao, Reserva } from '../../types';
import { jsPDF } from 'jspdf';
import { toPng, toBlob } from 'html-to-image';
// @ts-ignore
import logoUrl from '../../assets/images/vale_nauticos_logo_1780256879963.png';



import TransactionDetailsModal from './TransactionDetailsModal';
import ImportXMLModal from './ImportXMLModal';
import Select from 'react-select';
import { clientDB } from '../../db';

const cleanDescription = (desc: string) => {
  if (!desc) return '';
  // Remove "Serviço realizado: " prefix case-insensitively
  let cleaned = desc.replace(/^Serviço realizado:\s*/i, '');
  // Remove " - Cliente Ref: <any name>" suffix
  cleaned = cleaned.replace(/\s*-\s*Cliente Ref:.*$/i, '');
  // Remove exactly "Cliente Ref: <any name>"
  cleaned = cleaned.replace(/^Cliente Ref:.*$/i, '');
  return cleaned.trim();
};

export default function FinanceLancamentos() {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>(() => clientDB.getAll());
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(() => clientDB.getAll().length === 0);

  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [recorrenciaMode, setRecorrenciaMode] = useState<'Nenhum' | 'Parcelado' | 'Recorrente Mensalidade'>('Nenhum');
  const [qtdParcelas, setQtdParcelas] = useState(2);
  
  // Tabs state: 'dashboard' | 'lancamentos' | 'atividades' | 'agenda' | 'cobranca' | 'configuracoes'
  

  

  // Logged User Details
  const [loggedUser, setLoggedUser] = useState<{ role: string; username: string } | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('todos');
  const [embarcacaoFilter, setEmbarcacaoFilter] = useState<string>('todos');
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransacaoFinanceira | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<TransacaoFinanceira | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<TransacaoFinanceira>>({
    tipo: 'receita',
    categoria: 'Mensalidade',
    status: 'lancado',
    valor: 0,
    dataVencimento: new Date().toISOString().split('T')[0]
  });
  
  const [isCustomCategoria, setIsCustomCategoria] = useState(false);

  // States for Period monthly fee creation
  const [isPeriodMode, setIsPeriodMode] = useState(false);
  const [periodMonths, setPeriodMonths] = useState(12);
  const [periodStartMonth, setPeriodStartMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-06"
  const [periodDueDay, setPeriodDueDay] = useState(10);

  // Upload state
  const [isUploading, setIsUploading] = useState<{[key: string]: boolean}>({});

  // Client Debt check tab states
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [boatFilterId, setBoatFilterId] = useState('');
  const [manualStatusFinanceiro, setManualStatusFinanceiro] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
  const [manualObservacoesFinanceiras, setManualObservacoesFinanceiras] = useState('');
  const [isUpdatingClientStatus, setIsUpdatingClientStatus] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);

  // Copy success feedback state
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setLoggedUser(JSON.parse(jsonPayload));
      } catch (e) {
        console.error("Error decoding token:", e);
      }
    }
  }, []);

  const isAdmin = loggedUser?.role === 'admin';
  const isFinanceiro = loggedUser?.role === 'financeiro';
  const isFinanceiroOrAdmin = isAdmin || isFinanceiro;

  const getDaysDiff = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateTransactionInterest = (t: TransacaoFinanceira) => {
    if (t.tipo !== 'receita') return { days: 0, interest: 0, total: Number(t.valor) };
    
    const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
    
    if (!isOverdue) return { days: 0, interest: 0, total: Number(t.valor) };

    const days = getDaysDiff(t.dataVencimento);
    if (days <= 0) return { days: 0, interest: 0, total: Number(t.valor) };

    const ratePerDay = 0.000733; // 0.0733% ao dia (2.2% ao mês)
    const interest = Number(t.valor) * ratePerDay * days;
    const total = Number(t.valor) + interest;

    return { days, interest, total };
  };

  const generateDueDateForMonth = (startMonthStr: string, dueDay: number, monthOffset: number) => {
    const [yearPart, monthPart] = startMonthStr.split('-').map(Number);
    const date = new Date(yearPart, monthPart - 1 + monthOffset, 1);
    
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(dueDay, lastDay);
    
    const targetDate = new Date(date.getFullYear(), date.getMonth(), targetDay);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchData = async (showLoading = false) => {
    if (showLoading && clientes.length === 0) setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token || token === 'null' || token === 'undefined') return;
      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let transacoesData: any[] = [];
      if (res.ok) {

      try {
        const [resContas, resPlanos, resForn] = await Promise.all([
          fetch('/api/financeiro/contas-bancarias', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/planos-contas', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/fornecedores', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (resContas.ok) setContasBancarias(await resContas.json());
        if (resPlanos.ok) setPlanosContas(await resPlanos.json());
        if (resForn.ok) setFornecedores(await resForn.json());
      } catch (err) { console.error('Erro ao buscar dados complementares no financeiro:', err); }

        transacoesData = await res.json();
        if (Array.isArray(transacoesData)) {
          setTransacoes(transacoesData);
        }
      }
      
      const resDb = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resDb.ok) {
        const dbData = await resDb.json();
        if ((!res.ok || transacoesData.length === 0) && Array.isArray(dbData.transacoes)) {
          transacoesData = dbData.transacoes;
          setTransacoes(transacoesData);
        }
        const clientsArray = dbData.clients || [];
        const todayStr = new Date().toISOString().split('T')[0];
        let clientsUpdated = false;

        const newClients = clientsArray.map((c: any) => {
          const isDefaulting = transacoesData.some((t: any) => {
            if (t.clienteId !== c.id) return false;
            if (t.tipo !== 'receita') return false;
            if (t.status === 'vencido') return true;
            if (t.status === 'lancado' && t.dataVencimento < todayStr) return true;
            return false;
          });
          
          const expectedStatus = isDefaulting ? 'inadimplente' : 'em_dia';
          if (c.statusFinanceiro !== expectedStatus) {
            try {
              clientDB.update(c.id, { statusFinanceiro: expectedStatus });
              clientsUpdated = true;
            } catch (e) {
              console.warn("Failed to auto-update client status", e);
            }
            return { ...c, statusFinanceiro: expectedStatus };
          }
          return c;
        });

        setClientes(newClients);
        setEmbarcacoes(dbData.boats || []);
        setReservas(dbData.reservations || []);
      }
      
    } catch (err) {
      console.error("Failed to load finance data", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // Update selected client states when dropdown changes or clients load
  useEffect(() => {
    if (selectedClienteId) {
      const cliente = clientes.find(c => c.id === selectedClienteId);
      if (cliente) {
        setManualStatusFinanceiro(cliente.statusFinanceiro || 'em_dia');
        setManualObservacoesFinanceiras(cliente.observacoesFinanceiras || '');
      }
    }
  }, [selectedClienteId, clientes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    
    const isEditing = !!editingItem;
    let payloadData: any;

    let isP = isPeriodMode;
    if (recorrenciaMode === 'Recorrente Mensalidade') isP = true;

    if (isP && !isEditing) {
      const generated: any[] = [];
      const nowStr = new Date().toISOString();
      for (let i = 0; i < periodMonths; i++) {
        const dueDate = generateDueDateForMonth(periodStartMonth, periodDueDay, i);
        const [yearPart, monthPart] = dueDate.split('-').map(Number);
        const refMonth = String(monthPart).padStart(2, '0') + '/' + yearPart;
        

        generated.push({
          ...formData,
          id: `fin_${Date.now()}_${i}`,
          dataVencimento: dueDate,
          descricao: `${formData.descricao ? formData.descricao + ' - ' : 'Mensalidade - '}${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][monthPart - 1]}/${yearPart} (Parcela ${i + 1} de ${periodMonths})`,
          createdAt: nowStr
        });
      }
      payloadData = generated;
    } else if (recorrenciaMode === 'Parcelado' && !isEditing) {
      const generated = [];
      const nowStr = new Date().toISOString();
      const baseDate = new Date((formData.dataVencimento || new Date().toISOString().split('T')[0]) + 'T12:00:00');
      const totalParcelas = Number(qtdParcelas) || 2;
      const valorParcela = Number(formData.valor) / totalParcelas;
      const grupoId = 'grp_' + Date.now().toString(36);

      for (let i = 0; i < totalParcelas; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dueDate = `${yyyy}-${mm}-${dd}`;

        generated.push({
          ...formData,
          id: `fin_${Date.now()}_${i}`,
          valor: valorParcela,
          dataVencimento: dueDate,
          grupoParcelamentoId: grupoId,
          numeroParcela: i + 1,
          totalParcelas: totalParcelas,
          descricao: `${formData.descricao ? formData.descricao + ' - ' : ''}Parcela ${i + 1} de ${totalParcelas}`,
          createdAt: nowStr
        });
      }
      payloadData = generated;
    } else {
      payloadData = {
        ...formData,
        id: isEditing ? editingItem.id : `fin_${Date.now()}`,
        createdAt: isEditing ? editingItem.createdAt : new Date().toISOString()
      };
    }

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: payloadData })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchData();
      }
    } catch (err) {
      console.error("Error saving transacao:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    
    const token = localStorage.getItem('admin_token');
    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', data: { id } })
      });
      fetchData();
    } catch (err) {
      console.error("Error deleting transacao:", err);
    }
  };

  const handleUploadFile = async (t: TransacaoFinanceira, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [t.id]: true }));
    const token = localStorage.getItem('admin_token');
    const formDataUpload = new FormData();
    formDataUpload.append('comprovante', file);

    try {
      const resUpload = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      if (!resUpload.ok) {
        const errData = await resUpload.json();
        alert(`Erro no upload: ${errData.message || 'Falha ao enviar arquivo'}`);
        return;
      }

      const uploadResult = await resUpload.json();
      const fileUrl = uploadResult.url;

      // Save transaction with comprovante url, automatically setting it to paid
      const updatedTrans: TransacaoFinanceira = { 
        ...t, 
        comprovante: fileUrl,
        status: 'pago',
        dataPagamento: new Date().toISOString().split('T')[0]
      };
      
      const resSave = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });

      if (resSave.ok) {
        fetchData();
        setViewingTransaction(updatedTrans); // Auto-update local state so modal updates instantly
      } else {
        alert('Erro ao vincular o comprovante ao lançamento.');
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert('Erro de rede ou processamento do arquivo.');
    } finally {
      setIsUploading(prev => ({ ...prev, [t.id]: false }));
    }
  };

  const handleConfirmarBaixa = async (t: TransacaoFinanceira) => {
    if (!confirm("Confirmar baixa (pagamento) deste lançamento?")) return;

    const token = localStorage.getItem('admin_token');
    const updatedTrans: TransacaoFinanceira = {
      ...t,
      status: 'pago',
      dataPagamento: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao confirmar baixa.');
      }
    } catch (err) {
      console.error("Error confirming settlement:", err);
    }
  };

  const handleAprovarLancamento = async (t: TransacaoFinanceira) => {
    if (!confirm("Confirmar a aprovação deste débito?")) return;

    const token = localStorage.getItem('admin_token');
    
    // Determine if it is already overdue (vencimento in the past)
    const isOverdue = new Date(t.dataVencimento + 'T23:59:59') < new Date();
    const updatedTrans: TransacaoFinanceira = {
      ...t,
      status: isOverdue ? 'vencido' : 'lancado'
    };

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedTrans })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao aprovar débito.');
      }
    } catch (err) {
      console.error("Error approving transaction:", err);
    }
  };

  const handleUpdateClientStatus = async () => {
    if (!selectedClienteId) return;
    setIsUpdatingClientStatus(true);
    const token = localStorage.getItem('admin_token');
    const cliente = clientes.find(c => c.id === selectedClienteId);
    if (!cliente) return;

    const updatedCliente = {
      ...cliente,
      observacoesFinanceiras: manualObservacoesFinanceiras
    };

    try {
      const res = await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'clients', action: 'upsert', data: updatedCliente })
      });

      if (res.ok) {
        alert('Status e observações financeiras atualizados com sucesso!');
        fetchData();
      } else {
        alert('Falha ao atualizar dados do cliente.');
      }
    } catch (err) {
      console.error("Error updating client status:", err);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setIsUpdatingClientStatus(false);
    }
  };

  const handleCopyWhatsappMessage = (cliente: Cliente, clientTrans: TransacaoFinanceira[]) => {
    let message = `Bom dia ☀️\n`;
    message += `Prezado(a) *${cliente.nome}*, tudo bem?\n\n`;
    message += `Identificamos uma reserva programada em sua embarcação. No entanto, nosso sistema aponta a existência de valores em aberto, o que poderá impedir o registro da O.S. pelo sistema operacional da marina e, consequentemente, a descida da embarcação na data agendada.\n\n`;
    message += `Segue(m) abaixo o(s) valor(es) em aberto:\n\n`;

    let totalGeral = 0;

    clientTrans.forEach(t => {
      const { total } = calculateTransactionInterest(t);
      totalGeral += total;
      
      const categoryName = t.categoria.replace('Serviço', 'Serviço');
      const cleanDesc = cleanDescription(t.descricao);
      const descPart = cleanDesc ? ` (${cleanDesc})` : '';
      const vencDate = new Date(t.dataVencimento).toLocaleDateString('pt-BR');
      
      message += `• *${categoryName}${descPart}* | Venc: ${vencDate} | *R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
    });

    message += `\n*Valor Total em Aberto: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n\n`;
    message += `Para regularizarmos a situação e liberarmos a descida da embarcação, por favor nos envie o comprovante correspondente respondendo a esta mensagem.\n\n`;
    message += `Agradecemos a atenção!`;

    navigator.clipboard.writeText(message).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const handleDownloadPDF = async (cliente: Cliente, clientTrans: TransacaoFinanceira[]) => {
    const doc = new jsPDF();
    
    // Convert logo to Image for PDF
    const img = new Image();
    img.src = logoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; 
    });

    try {
      doc.addImage(img, 'PNG', 20, 15, 35, 18); // Logo at top left
    } catch(e) {
      console.warn("Could not load logo for PDF", e);
    }
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Fatura e Extrato", 70, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Data de Emissao: ${new Date().toLocaleDateString('pt-BR')}`, 70, 32);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);
    
    // Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(`Cliente: ${cliente.nome}`, 20, 50);
    doc.text(`Telefone: ${cliente.telefone || 'Nao cadastrado'}`, 20, 56);
    doc.text(`E-mail: ${cliente.email || 'Nao cadastrado'}`, 20, 62);
    
    doc.setFont("helvetica", "bold");
    if (cliente.statusFinanceiro === 'inadimplente') {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(`Status de Cobranca: INADIMPLENTE`, 20, 68);
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`Status de Cobranca: EM DIA`, 20, 68);
    }

    doc.setTextColor(51, 65, 85);
    if (cliente.observacoesFinanceiras) {
      doc.setFont("helvetica", "normal");
      doc.text(`Anotacoes: ${cliente.observacoesFinanceiras}`, 20, 74);
    }
    
    let y = 85;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.text("Categoria", 22, y);
    doc.text("Vencimento", 60, y);
    doc.text("Valor Orig.", 95, y);
    doc.text("Atraso", 125, y);
    doc.text("Juros (2.2%/mês)", 145, y);
    doc.text("Total", 175, y);
    
    doc.line(20, y + 4, 190, y + 4);
    y += 10;
    
    doc.setFont("helvetica", "normal");
    let sumOrig = 0;
    let sumTotal = 0;
    
    clientTrans.forEach(t => {
      const { days, interest, total } = calculateTransactionInterest(t);
      sumOrig += Number(t.valor);
      sumTotal += total;
      
      const categoryName = t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç');
      doc.text(categoryName.substring(0, 18), 22, y);
      doc.text(new Date(t.dataVencimento).toLocaleDateString('pt-BR'), 60, y);
      doc.text(`R$ ${Number(t.valor).toFixed(2)}`, 95, y);
      doc.text(days > 0 ? `${days}d` : "0d", 125, y);
      doc.text(`R$ ${interest.toFixed(2)}`, 145, y);
      doc.text(`R$ ${total.toFixed(2)}`, 175, y);
      
      const cleanDesc = cleanDescription(t.descricao);
      if (cleanDesc) {
        y += 4;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(cleanDesc.substring(0, 60), 22, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // slate-700
      }
      
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    // Totals Box
    y += 5;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    
    const titleCaseName = cliente.nome.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    doc.save(`Fatura - Mexicano Gestao Nautica - ${titleCaseName}.pdf`);
  };

  const handleCopyImage = async (cliente: Cliente) => {
    const element = document.getElementById(`invoice-capture-${cliente.id}`);
    if (!element) return;
    
    setIsCopyingImage(true);
    try {
      const blob = await toBlob(element, { 
        backgroundColor: '#ffffff', 
        pixelRatio: 2,
        skipFonts: true 
      });
      
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Imagem copiada para a área de transferência com sucesso!');
        } catch (copyErr) {
          console.error('Erro ao copiar imagem, ativando fallback:', copyErr);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const titleCaseName = cliente.nome.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          link.download = `Fatura - Mexicano Gestao Nautica - ${titleCaseName}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          alert('Seu navegador bloqueou a cópia direta. O download da imagem foi iniciado.');
        }
      }
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Erro ao gerar a imagem. Tente gerar o PDF.');
    } finally {
      setIsCopyingImage(false);
    }
  };

  const openModal = (item?: TransacaoFinanceira) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setIsPeriodMode(false);
      setRecorrenciaMode('Nenhum');
      setQtdParcelas(2);
    } else {
      setEditingItem(null);
      setFormData({
        tipo: 'receita',
        categoria: 'Mensalidade',
        status: 'lancado',
        valor: 0,
        dataVencimento: new Date().toISOString().split('T')[0]
      });
      setIsCustomCategoria(false);
      setIsPeriodMode(false);
      setRecorrenciaMode('Nenhum');
      setQtdParcelas(2);
      setPeriodMonths(12);
      setPeriodStartMonth(new Date().toISOString().slice(0, 7));
      setPeriodDueDay(new Date().getDate());
    }
    setIsModalOpen(true);
  };

  // Filtered transactions for Tab 1
  const filteredTransacoes = transacoes.filter(t => {
    // Empresa Filter
    if (empresaFiltro !== 'Todos') {
      if (t.empresa !== empresaFiltro && !(!t.empresa && empresaFiltro === 'Mexicano')) return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const clientName = clientes.find(c => c.id === t.clienteId)?.nome?.toLowerCase() || '';
    const boatName = embarcacoes.find(b => b.id === t.embarcacaoId)?.nome?.toLowerCase() || '';
    const valueStr = String(t.valor);
    const dateFormatted = new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR');

    const matchesSearch = t.categoria.toLowerCase().includes(searchLower) || 
                          (t.descricao && t.descricao.toLowerCase().includes(searchLower)) ||
                          clientName.includes(searchLower) ||
                          boatName.includes(searchLower) ||
                          valueStr.includes(searchLower) ||
                          dateFormatted.includes(searchLower) ||
                          t.status.toLowerCase().includes(searchLower) ||
                          t.tipo.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'todos' 
      ? true 
      : statusFilter === 'baixas' ? (t.status !== 'pago' && !!t.comprovante) : (t.status === statusFilter);

    const matchesTipo = tipoFilter === 'todos' || t.tipo === tipoFilter;
    const matchesCliente = clienteFilter === 'todos' || t.clienteId === clienteFilter;
    
    // Embarcação filter including fallback to client boats
    let matchesEmbarcacao = true;
    if (embarcacaoFilter !== 'todos') {
      const isDirect = t.embarcacaoId === embarcacaoFilter;
      const cliente = clientes.find(c => c.id === t.clienteId);
      const isClientBoat = !t.embarcacaoId && cliente && (
        cliente.embarcacaoId === embarcacaoFilter || 
        cliente.embarcacoes?.some(e => e.embarcacaoId === embarcacaoFilter)
      );
      matchesEmbarcacao = isDirect || isClientBoat;
    }

    let matchesPeriodo = true;
    const dataRef = new Date(t.dataVencimento + 'T12:00:00');
    if (dataInicioFilter) {
      const inicio = new Date(dataInicioFilter + 'T00:00:00');
      if (dataRef < inicio) matchesPeriodo = false;
    }
    if (dataFimFilter) {
      const fim = new Date(dataFimFilter + 'T23:59:59');
      if (dataRef > fim) matchesPeriodo = false;
    }

    return matchesSearch && matchesStatus && matchesTipo && matchesCliente && matchesEmbarcacao && matchesPeriodo;
  });

  // KPIs calculados com base nas transações filtradas
  const totalRecebidos = filteredTransacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((acc, t) => acc + Number(t.valor), 0);
  const aReceber = filteredTransacoes.filter(t => t.tipo === 'receita' && t.status === 'lancado').reduce((acc, t) => acc + Number(t.valor), 0);
  
  let totalAtrasadoPrincipal = 0;
  let totalAtrasadoJuros = 0;
  filteredTransacoes.forEach(t => {
    if (t.tipo === 'receita') {
      const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
      if (isOverdue) {
        const { interest } = calculateTransactionInterest(t);
        totalAtrasadoPrincipal += Number(t.valor);
        totalAtrasadoJuros += interest;
      }
    }
  });
  const totalVencidosComJuros = totalAtrasadoPrincipal + totalAtrasadoJuros;

  // Today and Future bookings for Tab 2
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingReservas = reservas
    .filter(r => r.status !== 'cancelado' && r.data >= todayStr)
    .sort((a, b) => a.data.localeCompare(b.data));

  // Selected client unpaid list for Tab 3
  const clientUnpaidTransactions = selectedClienteId 
    ? transacoes.filter(t => t.clienteId === selectedClienteId && t.status !== 'pago' && t.status !== 'lancado' && t.tipo === 'receita')
    : [];

  const getStatusBadge = (t: TransacaoFinanceira) => {
    const baseClasses = "px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 w-fit shadow-sm border";
    
    // Se não está pago nem cancelado, mas tem comprovante, é solicitação de baixa
    if (t.status !== 'pago' && t.status !== 'cancelado' && t.status !== 'lancado' && t.comprovante) {
      return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Solicitação de Baixa</span>;
    }

    switch(t.status) {
      case 'pago': 
        return <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-100`}><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Pago</span>;
      case 'lancado': 
        return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-100`}><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Lançado</span>;
      case 'vencido': 
        return <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-100`}><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> Atrasado</span>;
      case 'cancelado': 
        return <span className={`${baseClasses} bg-slate-50 text-slate-600 border-slate-100`}><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Cancelado</span>;
      case 'aguardando_aprovacao': 
        return <span className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-100`}><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Aguardando Apr.</span>;
      default: return null;
    }
  };

    return (
    <div className={`max-w-7xl mx-auto ${isFinanceiro ? 'p-1 md:p-2 space-y-4' : 'p-4 md:p-8 space-y-6'}`}>

      {isFinanceiro ? (
        <div className="flex justify-between items-center py-1 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Olá, <strong className="font-bold text-slate-700 capitalize">{loggedUser?.username || 'Carregando...'}</strong>
          </span>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-xl">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                Lançamentos Financeiros
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Gestão unificada de contas a pagar, contas a receber, conciliação e histórico financeiro.
            </p>
          </div>

          {isFinanceiroOrAdmin && (
            <div className="flex gap-2 items-center">
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="px-3 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Todos">Todas as Empresas</option>
                <option value="Marina">Marina</option>
                <option value="Vale Administradora">Vale Administradora</option>
                <option value="Mexicano">Mexicano</option>
              </select>
              {isAdmin && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-all duration-300 shadow-sm overflow-hidden shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Importar XML/Planilha</span>
                </button>
              )}
              <button
                onClick={() => openModal()}
                className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Novo Lançamento</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-emerald-100/50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-emerald-800">Total Recebido (Pago)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-emerald-700 tracking-tight relative z-10">
            <span className="text-sm opacity-60 mr-1">R$</span>
            {totalRecebidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-indigo-100/50 rounded-xl text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-indigo-800">A Receber (Lançados)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-indigo-700 tracking-tight relative z-10">
            <span className="text-sm opacity-60 mr-1">R$</span>
            {aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-rose-500/10 rounded-xl text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-300">Em Atraso (Com Juros)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-white tracking-tight relative z-10">
            <span className="text-sm text-slate-400 mr-1">R$</span>
            {totalVencidosComJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {totalAtrasadoJuros > 0 && (
            <p className="text-[10px] font-medium text-slate-400 mt-1.5 bg-white/5 inline-block px-2 py-0.5 rounded border border-white/5">
              Principal: R$ {totalAtrasadoPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Juros: R$ {totalAtrasadoJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
        {/* Header Title + Search */}
        <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              Histórico de Lançamentos
            </h2>

            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por descrição, cliente, documento..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Filtros em Grade com Muito Mais Espaço */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="relative z-30">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Classificação & Status</label>
                <div className="flex gap-2">
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-1/2 px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
                  >
                    <option value="todos">Todas as Contas</option>
                    <option value="receita">A Receber (Receitas)</option>
                    <option value="despesa">A Pagar (Despesas)</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-1/2 px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="baixas">Apenas Baixas</option>
                    <option value="lancado">Novos / Em Aberto</option>
                    <option value="vencido">Em Atraso</option>
                    <option value="pago">Quitados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
              </div>

              <div className="relative z-20">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Buscar por Cliente</label>
                <Select
                  value={{ value: clienteFilter, label: clienteFilter === 'todos' ? 'Todos os Clientes' : clientes.find(c => c.id === clienteFilter)?.nome || 'Não encontrado' }}
                  onChange={(selected) => setClienteFilter(selected?.value || 'todos')}
                  options={[
                    { value: 'todos', label: 'Todos os Clientes' },
                    ...clientes.map(c => ({ value: c.id, label: c.nome }))
                  ]}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                      backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      minHeight: '42px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155'
                    }),
                    menu: (base) => ({ ...base, fontSize: '0.875rem', zIndex: 50 })
                  }}
                  placeholder="Filtrar por cliente..."
                />
              </div>

              <div className="relative z-10">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Buscar por Embarcação</label>
                <Select
                  value={{ value: embarcacaoFilter, label: embarcacaoFilter === 'todos' ? 'Todas as Embarcações' : embarcacoes.find(e => e.id === embarcacaoFilter)?.nome || 'Não encontrada' }}
                  onChange={(selected) => setEmbarcacaoFilter(selected?.value || 'todos')}
                  options={[
                    { value: 'todos', label: 'Todas as Embarcações' },
                    ...embarcacoes.map(e => ({ value: e.id, label: e.nome }))
                  ]}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                      backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      minHeight: '42px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155'
                    }),
                    menu: (base) => ({ ...base, fontSize: '0.875rem', zIndex: 50 })
                  }}
                  placeholder="Filtrar por barco..."
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border border-slate-100 rounded-[1rem] p-2 mt-2">
              <div className="flex items-center w-full md:w-auto gap-4">
                <div className="flex items-center gap-2 pl-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-600">Período Selecionado:</span>
                </div>
                <div className="flex items-center gap-2 pr-2 overflow-x-auto max-w-full">
                  <input
                    type="date"
                    value={dataInicioFilter}
                    onChange={(e) => setDataInicioFilter(e.target.value)}
                    className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto"
                  />
                  <span className="text-slate-400 font-bold">até</span>
                  <input
                    type="date"
                    value={dataFimFilter}
                    onChange={(e) => setDataFimFilter(e.target.value)}
                    className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto"
                  />
                </div>
              </div>

              {(searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos' || clienteFilter !== 'todos' || embarcacaoFilter !== 'todos' || dataInicioFilter || dataFimFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todos');
                    setTipoFilter('todos');
                    setClienteFilter('todos');
                    setEmbarcacaoFilter('todos');
                    setDataInicioFilter('');
                    setDataFimFilter('');
                  }}
                  className="mt-3 md:mt-0 px-4 py-2 hover:bg-slate-200/60 rounded-lg text-xs font-bold text-slate-500 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" /> Limpar Filtros
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="font-semibold text-sm">Carregando dados financeiros...</p>
            </div>
          ) : filteredTransacoes.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-sm">Nenhum lançamento encontrado.</p>
              <p className="text-xs max-w-sm text-center opacity-70">Tente ajustar os filtros ou os termos da busca para encontrar o que procura.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Embarcação</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransacoes.map((t) => {
                  const cliente = clientes.find(c => c.id === t.clienteId);
                  const barco = embarcacoes.find(b => b.id === t.embarcacaoId);
                  
                  let nomesEmbarcacoes = barco ? barco.nome : '';
                  if (!nomesEmbarcacoes && cliente) {
                    const clientBoats: string[] = [];
                    if (cliente.embarcacaoId) {
                      const b = embarcacoes.find(x => x.id === cliente.embarcacaoId);
                      if (b) clientBoats.push(b.nome);
                    }
                    if (cliente.embarcacoes?.length) {
                      cliente.embarcacoes.forEach(cb => {
                        if (cb.embarcacaoId !== cliente.embarcacaoId) {
                          const b = embarcacoes.find(x => x.id === cb.embarcacaoId);
                          if (b) clientBoats.push(b.nome);
                        }
                      });
                    }
                    nomesEmbarcacoes = clientBoats.join(' / ');
                  }

                  const hasComprovante = !!t.comprovante;
                  const isUnpaid = t.status === 'lancado' || t.status === 'vencido';

                  return (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setViewingTransaction(t)}>
                      <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                        {cliente ? (
                          <span className="font-bold text-slate-700 block leading-tight">{cliente.nome}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-normal min-w-[150px]">
                        {nomesEmbarcacoes ? (
                          <span className="font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md w-fit inline-block leading-tight">
                            {nomesEmbarcacoes}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{t.categoria}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 mb-1">
                          {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {getStatusBadge(t)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-base tracking-tight">
                            <span className="text-xs opacity-50 font-normal mr-1">R$</span>{Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {(() => {
                            const { days, interest, total } = calculateTransactionInterest(t);
                            if (days > 0) {
                              return (
                                <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                                  + {interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({days}d)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openModal(t); }}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Visualizar/Editar"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* End Table Container */}


{/* Modal de Detalhes da Transação */}
      {viewingTransaction && (
        <TransactionDetailsModal
          transacao={viewingTransaction}
          cliente={clientes.find(c => c.id === viewingTransaction.clienteId)}
          embarcacao={embarcacoes.find(b => b.id === viewingTransaction.embarcacaoId)}
          onClose={() => setViewingTransaction(null)}
          onEdit={() => {
            setViewingTransaction(null);
            openModal(viewingTransaction);
          }}
          onDelete={() => {
            setViewingTransaction(null);
            handleDelete(viewingTransaction.id);
          }}
          onApprove={() => {
            handleAprovarLancamento(viewingTransaction);
            setViewingTransaction(null);
          }}
          onConfirmPayment={() => {
            handleConfirmarBaixa(viewingTransaction);
            setViewingTransaction(null);
          }}
          onUploadReceipt={(e) => {
            handleUploadFile(viewingTransaction, e);
          }}
          isUploading={isUploading[viewingTransaction.id] || false}
          onGenerateAsaas={async (billingType) => {
            try {
              const token = localStorage.getItem('admin_token');
              const res = await fetch(`/api/financeiro/transacoes/${viewingTransaction.id}/gerar-asaas`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ billingType })
              });
              const json = await res.json();
              if (json.success) {
                const updatedTx = {
                  ...viewingTransaction,
                  asaasPaymentId: json.asaasPaymentId,
                  asaasPaymentUrl: json.asaasPaymentUrl
                };
                setViewingTransaction(updatedTx);
                setTransacoes(prev => prev.map(t => t.id === viewingTransaction.id ? updatedTx : t));
                alert("Cobrança Asaas gerada com sucesso!");
              } else {
                alert(`Erro: ${json.message || "Erro desconhecido"}`);
              }
            } catch (err: any) {
              alert(`Erro ao conectar com servidor: ${err.message}`);
            }
          }}
        />
      )}

      {/* Modals */}
      <ImportXMLModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImportSuccess={() => fetchData()} 
        clientes={clientes} 
        embarcacoes={embarcacoes}
      />

      {/* Modal de Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in transition-all">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden border border-white/50 relative flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100/80 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className={`p-2 rounded-xl ${formData.tipo === 'receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {formData.tipo === 'receita' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault();
                  handleSave(e as any);
                }
              }}
              className="p-6 space-y-6 flex-1"
            >
              {/* Resumo do Tipo */}
              <div className="flex bg-slate-100/80 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'receita'})}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.tipo === 'receita' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Receita (Entrada)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'despesa'})}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.tipo === 'despesa' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Despesa (Saída)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Categoria</label>
                  <select
                    value={isCustomCategoria ? 'Outro' : formData.categoria}
                    onChange={(e) => {
                      if (e.target.value === 'Outro') {
                        setIsCustomCategoria(true);
                        setFormData({...formData, categoria: ''});
                      } else {
                        setIsCustomCategoria(false);
                        const selectedPlan = planosContas.find(p => p.descricao === e.target.value);
                        setFormData({...formData, categoria: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-semibold text-sm transition-all shadow-sm"
                  >
                    <option value="">Selecione...</option>
                    {planosContas.filter(p => !p.tipo || p.tipo === formData.tipo).map(p => (
                      <option key={p.id || p.descricao} value={p.descricao}>{p.descricao}</option>
                    ))}
                    {!planosContas.find(p => p.descricao === 'Mensalidade') && <option value="Mensalidade">Mensalidade</option>}
                    {!planosContas.find(p => p.descricao === 'Serviço') && <option value="Serviço">Serviço</option>}
                    <option value="Outro">Outra Categoria...</option>
                  </select>
                  {isCustomCategoria && (
                    <input
                      type="text" required
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      placeholder="Digite a categoria"
                      className="w-full mt-3 px-4 py-3 bg-white border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-indigo-500/30 font-semibold text-sm transition-all shadow-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Conta Bancária</label>
                  <select required value={formData.contaBancariaId || ''}
                      onChange={(e) => setFormData({...formData, contaBancariaId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-semibold text-sm transition-all shadow-sm"
                  >
                    <option value="">Selecione...</option>
                    {contasBancarias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} - {c.banco}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ... The rest of fields carefully translated ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Vínculo: Cliente (Opcional)</label>
                  <Select
                    value={formData.clienteId ? {
                      value: formData.clienteId,
                      label: clientes.find(c => c.id === formData.clienteId)?.nome || ''
                    } : null}
                    onChange={(selected) => setFormData({...formData, clienteId: selected?.value || null})}
                    options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                    isClearable
                    placeholder="Selecione um cliente..."
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                        backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                        padding: '2px',
                        boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        borderWidth: '1px',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      })
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Vínculo: Embarcação (Opcional)</label>
                  <Select
                      value={formData.embarcacaoId ? {
                        value: formData.embarcacaoId,
                        label: embarcacoes.find(b => b.id === formData.embarcacaoId)?.nome || ''
                      } : null}
                      onChange={(selected) => {
                        const boatId = selected?.value || null;
                        const boat = embarcacoes.find(b => b.id === boatId);
                        setFormData({
                          ...formData,
                          embarcacaoId: boatId,
                          ...(boat?.clienteId && !formData.clienteId ? { clienteId: boat.clienteId } : {})
                        });
                      }}
                      options={(() => {
                        let filteredBoats = embarcacoes;
                        if (formData.clienteId) {
                          const c = clientes.find(x => x.id === formData.clienteId);
                          const clientBoatIds = [];
                          if (c?.embarcacaoId) clientBoatIds.push(c.embarcacaoId);
                          if (c?.embarcacoes?.length) c.embarcacoes.forEach(cb => clientBoatIds.push(cb.embarcacaoId));
                          if (clientBoatIds.length > 0) {
                            filteredBoats = embarcacoes.filter(b => clientBoatIds.includes(b.id));
                          }
                        }
                        return filteredBoats.map(b => ({ value: b.id, label: b.nome }));
                      })()}
                      isClearable
                      placeholder="Selecione uma embarcação..."
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                          backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                          padding: '2px',
                          boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          borderWidth: '1px',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        })
                      }}
                  />
                  {formData.embarcacaoId && embarcacoes.find(b => b.id === formData.embarcacaoId)?.donos?.length > 1 && formData.tipo === 'receita' && (
                    <div className="mt-2 text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1.5 animate-in slide-in-from-top-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Embarcação tem múltiplos donos. Considere dividir no lançamento.
                    </div>
                  )}
                </div>
              </div>

              {/* Data and Value in bigger highlight */}
              <div className="bg-slate-50/50 p-5 pl-7 border border-slate-200/50 rounded-2xl relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${formData.tipo === 'receita' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 items-end">
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Vencimento</label>
                    <input
                      type="date" required
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({...formData, dataVencimento: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-sm shadow-sm"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-sm shadow-sm"
                    >
                      <option value="lancado">A Receber / A Pagar</option>
                      <option value="pago">Confirmado / Já Pago</option>
                      {formData.status === 'vencido' && <option value="vencido">Vencido</option>}
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Valor {recorrenciaMode === 'Parcelado' ? 'Total (R$)' : '(R$)'}
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg ${formData.tipo === 'receita' ? 'text-emerald-500' : 'text-rose-500'}`}>R$</span>
                      <input
                        type="number" step="0.01" min="0" required
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value === '' ? ('' as any) : parseFloat(e.target.value)})}
                        className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:ring-4 font-mono text-xl font-bold shadow-sm transition-all ${formData.tipo === 'receita' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-emerald-900' : 'border-rose-200 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {!editingItem && (
                  <div className="mt-5 pt-4 border-t border-slate-200/50">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Padrão de Repetição</label>
                    <select
                      value={recorrenciaMode}
                      onChange={(e) => setRecorrenciaMode(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold mb-3 shadow-sm"
                    >
                      <option value="Nenhum">Única (Não repete, 1x)</option>
                      <option value="Parcelado">Dividir em Parcela (Gera N Lançamentos agora)</option>
                      <option value="Recorrente Mensalidade">Lançamento de Mensalidade (Gera N Lançamentos com dias fixos)</option>
                    </select>

                    {recorrenciaMode === 'Parcelado' && (
                      <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm items-center">
                        <span className="px-3 text-xs font-bold text-slate-500 bg-slate-50 h-full py-2.5 border-r border-slate-200">Parcelas</span>
                        <input
                          type="number" min="2" max="120"
                          value={qtdParcelas}
                          onChange={(e) => setQtdParcelas(parseInt(e.target.value))}
                          className="flex-1 px-4 py-2 text-sm font-bold border-none focus:ring-0 text-slate-800"
                        />
                         {qtdParcelas > 0 && formData.valor ? (
                           <span className="px-4 text-xs font-bold text-indigo-600">{qtdParcelas}x de R$ {(Number(formData.valor)/qtdParcelas).toFixed(2)}</span>
                         ) : null}
                      </div>
                    )}

                    {recorrenciaMode === 'Recorrente Mensalidade' && (
                      <div className="grid grid-cols-3 gap-3">
                         <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duração (Meses)</label>
                          <input type="number" min="1" max="120" value={periodMonths}
                            onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                         </div>
                         <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Início (Mês)</label>
                          <input type="month" value={periodStartMonth}
                            onChange={(e) => setPeriodStartMonth(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                         </div>
                         <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dia do Venc.</label>
                          <input type="number" min="1" max="31" value={periodDueDay}
                            onChange={(e) => setPeriodDueDay(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Descrição Comercial</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all shadow-sm resize-none"
                  placeholder={"Ex: " + (formData.tipo === 'receita' ? "Mensalidade Marina, Manutenção motor..." : "Conta de Luz, Peças reposição...")}
                />
              </div>

              {/* Botões de Ação na Base */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md pb-2 z-10 -mx-2 px-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 text-sm bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-sm hover:shadow-md ${formData.tipo === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {editingItem ? 'Salvar Alterações' : (recorrenciaMode !== 'Nenhum' ? 'Gerar Lançamentos' : 'Criar Lançamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
