import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Filter, Search, 
  MoreVertical, CheckCircle, Clock, XCircle, AlertCircle, FileText,
  Calendar, Upload, Copy, Download, Eye, Users, Check, ExternalLink,
  HelpCircle, AlertTriangle, UserCheck
} from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao, Reserva } from '../types';
import { jsPDF } from 'jspdf';
import { toPng, toBlob } from 'html-to-image';
import logoUrl from '../assets/images/vale_nauticos_logo_1780256879963.png';
import FinanceDashboard from './finance/FinanceDashboard';
import FinanceKanban from './finance/FinanceKanban';
import TransactionDetailsModal from './finance/TransactionDetailsModal';
import ImportXMLModal from './finance/ImportXMLModal';
import Select from 'react-select';
import { clientDB } from '../db';

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

export default function FinancePage({ initialTab = 'lancamentos' }: { initialTab?: 'dashboard' | 'lancamentos' | 'atividades' | 'agenda' | 'cobranca' }) {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs state: 'dashboard' | 'lancamentos' | 'atividades' | 'agenda' | 'cobranca'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos' | 'atividades' | 'agenda' | 'cobranca'>(initialTab as any);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Logged User Details
  const [loggedUser, setLoggedUser] = useState<{ role: string; username: string } | null>(null);

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
  const [manualStatusFinanceiro, setManualStatusFinanceiro] = useState<'em_dia' | 'inadimplente'>('em_dia');
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
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let transacoesData: any[] = [];
      if (res.ok) {
        transacoesData = await res.json();
        setTransacoes(transacoesData);
      }
      
      const resDb = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resDb.ok) {
        const dbData = await resDb.json();
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

    if (isPeriodMode && !isEditing) {
      const generated: any[] = [];
      const nowStr = new Date().toISOString();
      for (let i = 0; i < periodMonths; i++) {
        const dueDate = generateDueDateForMonth(periodStartMonth, periodDueDay, i);
        const [yearPart, monthPart] = dueDate.split('-').map(Number);
        const refMonth = String(monthPart).padStart(2, '0') + '/' + yearPart;
        const indexStr = `${i + 1}/${periodMonths}`;
        
        generated.push({
          ...formData,
          id: `fin_${Date.now()}_${i}`,
          dataVencimento: dueDate,
          descricao: `${formData.descricao ? formData.descricao + ' | ' : ''}Ref: ${refMonth} (${indexStr})`,
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
      setPeriodMonths(12);
      setPeriodStartMonth(new Date().toISOString().slice(0, 7));
      setPeriodDueDay(new Date().getDate());
    }
    setIsModalOpen(true);
  };

  // Filtered transactions for Tab 1
  const filteredTransacoes = transacoes.filter(t => {
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
    const baseClasses = "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit shadow-sm border";
    
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
      case 'lancado': 
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
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
                Financeiro & Conciliação
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Gestão unificada de pagamentos, conciliação diária e controle de inadimplência. Autenticado como <strong className="font-semibold text-slate-700 capitalize">{loggedUser?.username || 'Carregando...'}</strong>.
            </p>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="group relative inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-300 shadow-sm overflow-hidden shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                <span>Importar Planilha</span>
              </button>
              <button 
                onClick={() => openModal()}
                className="group relative inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 overflow-hidden shrink-0 cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl"></div>
                <Plus className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">Novo Lançamento</span>
              </button>
            </div>
          )}
        </div>
      )}

      <>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <FinanceDashboard transacoes={transacoes} />
          </div>
        )}

        {activeTab === 'atividades' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <FinanceKanban />
          </div>
        )}

        {/* Tab 1: Lançamentos & Conciliação */}
        {activeTab === 'lancamentos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 bg-emerald-100/50 rounded-lg text-emerald-600">
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
                <div className="p-1.5 bg-indigo-100/50 rounded-lg text-indigo-600">
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
                <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
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

          {/* Control Bar & Transactions List */}
          <div className="bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-50/30">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                  <FileText className="w-4 h-4" />
                </div>
                Histórico de Lançamentos
              </h2>
              <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
                <div className="relative flex-grow w-full sm:w-auto min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar lançamentos..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
                
                <div className="relative w-full sm:w-auto">
                  <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-slate-700 shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="baixas">Apenas Solicitações de Baixa</option>
                    <option value="lancado">Lançado</option>
                    <option value="vencido">Vencido</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-auto">
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-slate-700 shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="todos">Todos os Tipos</option>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 relative w-full sm:w-auto flex-1 z-10">
                  <input 
                    type="date"
                    value={dataInicioFilter}
                    onChange={(e) => setDataInicioFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-600 shadow-sm h-[42px]"
                    title="Data Inicial"
                  />
                  <span className="text-slate-400 text-xs font-bold uppercase">Até</span>
                  <input 
                    type="date"
                    value={dataFimFilter}
                    onChange={(e) => setDataFimFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-600 shadow-sm h-[42px]"
                    title="Data Final"
                  />
                </div>

                <div className="relative w-full sm:w-56 z-20">
                  <Select
                    value={{ value: clienteFilter, label: clienteFilter === 'todos' ? 'Todos os Clientes' : clientes.find(c => c.id === clienteFilter)?.nome || 'Cliente não encontrado' }}
                    onChange={(selected) => setClienteFilter(selected?.value || 'todos')}
                    options={[
                      { value: 'todos', label: 'Todos os Clientes' },
                      ...clientes.map(c => ({ value: c.id, label: c.nome }))
                    ]}
                    styles={{ control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '42px', fontSize: '0.875rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }) }}
                    placeholder="Selecione um cliente..."
                  />
                </div>

                <div className="relative w-full sm:w-56 z-10">
                  <Select
                    value={{ value: embarcacaoFilter, label: embarcacaoFilter === 'todos' ? 'Todas as Embarcações' : embarcacoes.find(b => b.id === embarcacaoFilter)?.nome || 'Embarcação não encontrada' }}
                    onChange={(selected) => setEmbarcacaoFilter(selected?.value || 'todos')}
                    options={[
                      { value: 'todos', label: 'Todas as Embarcações' },
                      ...embarcacoes.map(b => ({ value: b.id, label: b.nome }))
                    ]}
                    styles={{ control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '42px', fontSize: '0.875rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }) }}
                    placeholder="Selecione uma embarcação..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
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
                  <p className="font-semibold text-sm text-slate-500">Nenhum lançamento encontrado.</p>
                  <p className="text-xs text-slate-400">Tente ajustar os filtros ou realizar uma nova busca.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Embarcação</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Vencimento</th>
                      <th className="px-6 py-4">Valor</th>
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Agenda de Saídas */}
      {activeTab === 'agenda' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100/80 p-5 rounded-[1.5rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </div>
                Agenda de Saídas (Conciliação Diária)
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
                Acompanhe as saídas dos próximos dias. Clientes marcados em <span className="text-rose-600 font-bold">vermelho</span> possuem pendências e precisam ser contatados antes do embarque.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="font-semibold text-sm">Carregando agendamentos...</p>
              </div>
            ) : upcomingReservas.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm animate-in zoom-in-95">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-semibold text-sm text-slate-500">Nenhum agendamento futuro.</p>
                <p className="text-xs text-slate-400">Não há embarcações programadas para sair nos próximos dias.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Array.from(new Set(upcomingReservas.map(r => r.data))).map((dateStr) => {
                  const dayReservas = upcomingReservas.filter(r => r.data === dateStr);
                  const isToday = dateStr === todayStr;
                  const dateObj = new Date(dateStr + 'T12:00:00');
                  
                  return (
                    <div key={dateStr} className="space-y-4">
                      {/* Date Header */}
                      <div className="flex items-center gap-3">
                        <h3 className={`text-xl font-black ${isToday ? 'text-indigo-700' : 'text-slate-800'}`}>
                          {dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </h3>
                        {isToday && (
                          <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                            Hoje
                          </span>
                        )}
                        <div className="flex-grow h-px bg-slate-200 ml-2"></div>
                      </div>

                      {/* Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayReservas.map(r => {
                          const cliente = clientes.find(c => c.id === r.clienteId);
                          const barco = embarcacoes.find(b => b.id === r.embarcacaoId);
                          const isInadimplente = cliente?.statusFinanceiro === 'inadimplente';

                          return (
                            <div 
                              key={r.id} 
                              className={`group relative bg-white border p-5 rounded-[1.25rem] transition-all hover:shadow-md ${
                                isInadimplente 
                                  ? 'border-rose-200 hover:border-rose-300' 
                                  : 'border-slate-100 hover:border-indigo-100'
                              }`}
                            >
                              {/* Background subtle glow for inadimplente */}
                              {isInadimplente && (
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent rounded-[1.25rem] pointer-events-none"></div>
                              )}

                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                      <span className={`w-2.5 h-2.5 rounded-full ${barco?.tipo === 'lancha' ? 'bg-indigo-500' : 'bg-sky-400'}`}></span>
                                      {barco ? barco.nome : 'Excluída'}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                      {cliente ? cliente.nome : 'Cliente Excluído'}
                                    </p>
                                  </div>
                                  
                                  {/* Status Badge */}
                                  {isInadimplente ? (
                                    <div className="bg-rose-100 text-rose-800 p-1.5 rounded-lg shrink-0 animate-pulse border border-rose-200" title="Cliente Inadimplente">
                                      <AlertTriangle className="w-5 h-5" />
                                    </div>
                                  ) : (
                                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg shrink-0 border border-emerald-100" title="Cliente Em Dia">
                                      <CheckCircle className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>

                                {r.observações && (
                                  <div className="mt-auto pt-4 border-t border-slate-100">
                                    <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                      <strong className="font-semibold text-slate-700 block mb-0.5">Obs do Atendimento:</strong>
                                      {r.observações}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Tab 3: Débitos & Cobrança */}
      {activeTab === 'cobranca' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Filter Bar */}
          <div className="bg-white border border-slate-100/80 p-6 rounded-[1.5rem] shadow-sm flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 w-full relative">
                 <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">Selecione o Cliente</span>
                 </div>
                 <Select
                    options={[{ value: '', label: 'Busque ou Selecione um Cliente' }, ...clientes.map(c => ({ value: c.id, label: c.nome }))]}
                    value={{ value: selectedClienteId, label: selectedClienteId ? clientes.find(c => c.id === selectedClienteId)?.nome : 'Busque ou Selecione um Cliente' }}
                    onChange={(selected: any) => setSelectedClienteId(selected?.value || '')}
                    className="react-select-container flex-1 shadow-sm"
                    classNamePrefix="react-select"
                    placeholder="Selecione um Cliente"
                    isSearchable
                  />
             </div>
          </div>

          {!selectedClienteId ? (
              <div className="bg-white border border-slate-100/80 p-12 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-600 text-lg">Extrato Financeiro</p>
                  <p className="text-sm mt-1 max-w-sm mx-auto">Selecione um cliente acima para visualizar os débitos lançados, calcular juros e gerar faturas em PDF.</p>
                </div>
              </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300 flex-grow flex flex-col">
              {(() => {
                const clienteObj = clientes.find(c => c.id === selectedClienteId);
                if (!clienteObj) return null;

                const totalOriginal = clientUnpaidTransactions.reduce((acc, t) => acc + Number(t.valor), 0);
                
                let sumJuros = 0;
                clientUnpaidTransactions.forEach(t => {
                  const { interest } = calculateTransactionInterest(t);
                  sumJuros += interest;
                });
                const totalGeralComJuros = totalOriginal + sumJuros;

                return (
                  <>
                    <div className="bg-white border border-slate-100/80 p-6 rounded-[1.5rem] shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                        {/* Client Info */}
                        <div className="flex-1">
                          <h3 className="font-black text-slate-800 text-2xl tracking-tight flex items-center gap-2">
                            <UserCheck className="w-6 h-6 text-indigo-600" />
                            {clienteObj.nome}
                          </h3>
                          <p className="text-sm text-slate-500 mt-2 font-medium flex gap-4">
                            <span className="inline-flex items-center gap-1.5"><span className="text-slate-400">📞</span> {clienteObj.telefone || 'N/A'}</span>
                            <span className="inline-flex items-center gap-1.5"><span className="text-slate-400">✉️</span> {clienteObj.email || 'N/A'}</span>
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleCopyWhatsappMessage(clienteObj, clientUnpaidTransactions)}
                            disabled={clientUnpaidTransactions.length === 0}
                            className={`flex-grow md:flex-grow-0 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                              copySuccess 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50'
                            }`}
                          >
                            <Copy className="w-4 h-4" /> {copySuccess ? 'Mensagem Copiada!' : 'Copiar Texto'}
                          </button>

                          <button
                            onClick={() => handleCopyImage(clienteObj)}
                            disabled={clientUnpaidTransactions.length === 0 || isCopyingImage}
                            className="flex-grow md:flex-grow-0 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                          >
                            {isCopyingImage ? (
                              <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin"></div>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            Copiar Imagem
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPDF(clienteObj, clientUnpaidTransactions)}
                            disabled={clientUnpaidTransactions.length === 0}
                            className="flex-grow md:flex-grow-0 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                          >
                            <Download className="w-4 h-4" /> Gerar Fatura PDF
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status do Cliente</label>
                          <div
                            className={`w-full px-4 py-3 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${
                              clientes.find(c => c.id === selectedClienteId)?.statusFinanceiro === 'em_dia' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                          >
                            {clientes.find(c => c.id === selectedClienteId)?.statusFinanceiro === 'em_dia' ? '🟢 Em Dia' : '🔴 Inadimplente'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Anotações Internas & Ação</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualObservacoesFinanceiras}
                              onChange={(e) => setManualObservacoesFinanceiras(e.target.value)}
                              placeholder="Adicione notas visíveis apenas para a equipe..."
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                            />
                            <button
                              onClick={handleUpdateClientStatus}
                              disabled={isUpdatingClientStatus}
                              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group whitespace-nowrap"
                            >
                              {isUpdatingClientStatus ? (
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unpaid transactions table */}
                    <div id="fatura-container" className="bg-white border border-slate-100/80 p-6 rounded-[1.5rem] shadow-sm flex-grow flex flex-col">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
                        <div className="p-1 bg-rose-50 text-rose-600 rounded">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        Débitos em Aberto
                      </h4>

                      {clientUnpaidTransactions.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-sm">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                          <h4 className="font-black text-emerald-800 text-lg">Tudo certo por aqui!</h4>
                          <p className="text-emerald-600/80 text-sm mt-1 font-medium">Este cliente não possui nenhuma pendência financeira.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200/60 rounded-2xl overflow-x-auto bg-white shadow-sm flex-grow">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs font-bold tracking-wider">
                              <tr>
                                <th className="px-5 py-4 border-b border-slate-100">Vencimento</th>
                                <th className="px-5 py-4 border-b border-slate-100">Categoria</th>
                                <th className="px-5 py-4 border-b border-slate-100">Valor Orig.</th>
                                <th className="px-5 py-4 border-b border-slate-100">Juros/Atraso</th>
                                <th className="px-5 py-4 border-b border-slate-100 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/80">
                              {clientUnpaidTransactions.map(t => {
                                const { days, interest, total } = calculateTransactionInterest(t);
                                const categoryNameUI = t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç');
                                return (
                                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                      <span className="font-bold text-slate-700">
                                        {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4">
                                      <p className="font-bold text-slate-800">{categoryNameUI}</p>
                                      <p className="text-xs text-slate-400 truncate max-w-[150px] mt-0.5">{cleanDescription(t.descricao) || '-'}</p>
                                      {t.status === 'lancado' && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[10px] font-bold mt-1.5 inline-block">Lançado</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">
                                      R$ {Number(t.valor).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-4">
                                      {days > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="text-rose-600 font-bold">+ R$ {interest.toFixed(2)}</span>
                                          <span className="text-[10px] text-slate-400 font-semibold">{days} dias de atraso</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {t.status === 'lancado' && isFinanceiroOrAdmin && (
                                          <button 
                                            onClick={() => handleAprovarLancamento(t)}
                                            className="text-white bg-indigo-500 hover:bg-indigo-600 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                          >
                                            <Check className="w-3.5 h-3.5" /> Aprovar
                                          </button>
                                        )}
                                        
                                        {t.status !== 'pago' && t.status !== 'cancelado' && !!t.comprovante && isFinanceiroOrAdmin && (
                                          <button 
                                            onClick={() => handleConfirmarBaixa(t)}
                                            className="text-white bg-emerald-500 hover:bg-emerald-600 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                          >
                                            <Check className="w-3.5 h-3.5" /> Baixa
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {/* Resumo Row (Invoice Footer) */}
                              <tr className="bg-slate-900 border-none">
                                <td colSpan={2} className="px-5 py-4 rounded-bl-2xl">
                                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Total Original</span>
                                  <span className="text-slate-200 font-bold text-sm">R$ {totalOriginal.toFixed(2)}</span>
                                </td>
                                <td colSpan={1} className="px-5 py-4">
                                  <span className="text-rose-400/85 text-[10px] font-bold uppercase tracking-wider block mb-1">Juros Acumulados</span>
                                  <span className="text-rose-400 font-bold text-sm">+ R$ {sumJuros.toFixed(2)}</span>
                                </td>
                                <td colSpan={2} className="px-5 py-4 text-right rounded-br-2xl">
                                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Total a Pagar</span>
                                  <span className="text-xl font-black text-white tracking-tight">R$ {totalGeralComJuros.toFixed(2)}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Hidden Invoice Container for Image Export */}
                      <div className="fixed -left-[9999px] -top-[9999px]">
                        <div id={`invoice-capture-${clienteObj.id}`} className="bg-white p-10 w-[800px] text-slate-800 font-sans shadow-none rounded-none border-none">
                          <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
                            <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                            <div className="text-right">
                              <h1 className="text-3xl font-black text-slate-900">Fatura e Extrato</h1>
                              <p className="text-slate-500 mt-1 font-medium">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          
                          <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800">{clienteObj.nome}</h2>
                            <p className="text-slate-600 mt-1">Telefone: {clienteObj.telefone || 'Não cadastrado'}</p>
                            <p className="text-slate-600 mt-1">E-mail: {clienteObj.email || 'Não cadastrado'}</p>
                            <p className={`font-bold mt-2 ${clienteObj.statusFinanceiro === 'inadimplente' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              Status de Cobrança: {clienteObj.statusFinanceiro === 'inadimplente' ? 'INADIMPLENTE' : 'EM DIA'}
                            </p>
                          </div>

                          <table className="w-full text-left mb-8 border-collapse">
                            <thead className="bg-slate-50 border-y border-slate-200">
                              <tr>
                                <th className="py-3 px-4 font-bold text-sm text-slate-500 uppercase">Categoria</th>
                                <th className="py-3 px-4 font-bold text-sm text-slate-500 uppercase">Vencimento</th>
                                <th className="py-3 px-4 font-bold text-sm text-slate-500 uppercase text-right">Valor Orig.</th>
                                <th className="py-3 px-4 font-bold text-sm text-slate-500 uppercase text-right">Juros/Atraso</th>
                                <th className="py-3 px-4 font-bold text-sm text-slate-500 uppercase text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {clientUnpaidTransactions.map(t => {
                                const { interest, total } = calculateTransactionInterest(t);
                                const categoryName = t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç');
                                return (
                                  <tr key={t.id}>
                                    <td className="py-4 px-4">
                                      <p className="font-bold text-slate-800">{categoryName}</p>
                                      {cleanDescription(t.descricao) && (
                                        <p className="text-xs text-slate-400 font-normal mt-0.5">{cleanDescription(t.descricao)}</p>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 font-semibold text-slate-600">{new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="py-4 px-4 text-slate-600 text-right">R$ {Number(t.valor).toFixed(2)}</td>
                                    <td className="py-4 px-4 text-rose-600 font-bold text-right">{interest > 0 ? `+ R$ ${interest.toFixed(2)}` : '-'}</td>
                                    <td className="py-4 px-4 font-black text-slate-800 text-right">R$ {total.toFixed(2)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>

                          <div className="border-t-2 border-slate-800 pt-6 text-right">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total a Pagar</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                              R$ {totalGeralComJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}


      </>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">
                {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
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
              className="p-4 space-y-4"
            >
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria de Cobrança</label>
                  <select 
                    value={isCustomCategoria ? 'Outro' : formData.categoria}
                    onChange={(e) => {
                      if (e.target.value === 'Outro') {
                        setIsCustomCategoria(true);
                        setFormData({...formData, categoria: ''});
                      } else {
                        setIsCustomCategoria(false);
                        setFormData({...formData, categoria: e.target.value});
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                  >
                    <option value="Mensalidade">Mensalidade</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Outro">Outra Categoria...</option>
                  </select>
                  {isCustomCategoria && (
                    <input 
                      type="text" required
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      placeholder="Digite a categoria"
                      className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$)</label>
                  <input 
                    autoFocus
                    type="number" step="0.01" min="0" required
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value === '' ? ('' as any) : parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-base font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                  >
                    
                    <option value="lancado">Lançado</option>
                    <option value="pago">Pago</option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {!editingItem && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Mensalidade em Período (Lote)</span>
                    <span className="text-[10px] text-slate-500">Lançamentos recorrentes automáticos.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPeriodMode}
                      onChange={(e) => setIsPeriodMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}

              {isPeriodMode ? (
                <div className="p-3 border border-indigo-150 bg-indigo-50/20 rounded-lg grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Qtd. Meses</label>
                    <input 
                      type="number" min="2" max="48" required
                      value={periodMonths}
                      onChange={(e) => setPeriodMonths(parseInt(e.target.value) || 12)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Mês Inicial</label>
                    <input 
                      type="month" required
                      value={periodStartMonth}
                      onChange={(e) => setPeriodStartMonth(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Dia Vencto.</label>
                    <input 
                      type="number" min="1" max="31" required
                      value={periodDueDay}
                      onChange={(e) => setPeriodDueDay(parseInt(e.target.value) || 10)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Vencimento</label>
                    <input 
                      type="date" required
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({...formData, dataVencimento: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  {formData.status === 'pago' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Pagamento</label>
                      <input 
                        type="date" required
                        value={formData.dataPagamento || formData.dataVencimento}
                        onChange={(e) => setFormData({...formData, dataPagamento: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vincular Cliente (Opcional)</label>
                <Select
                  placeholder="Buscar cliente..."
                  isClearable
                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                  value={formData.clienteId ? { value: formData.clienteId, label: clientes.find(c => c.id === formData.clienteId)?.nome } : null}
                  onChange={(val: any) => setFormData({ ...formData, clienteId: val?.value || undefined })}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '36px',
                      fontSize: '0.875rem',
                      borderRadius: '0.5rem',
                      borderColor: '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vincular Embarcação (Opcional)</label>
                <Select
                  placeholder="Buscar embarcação..."
                  isClearable
                  options={embarcacoes.map(b => ({ value: b.id, label: `${b.nome} (${b.numero})` }))}
                  value={formData.embarcacaoId ? { value: formData.embarcacaoId, label: `${embarcacoes.find(b => b.id === formData.embarcacaoId)?.nome} (${embarcacoes.find(b => b.id === formData.embarcacaoId)?.numero})` } : null}
                  onChange={(val: any) => setFormData({ ...formData, embarcacaoId: val?.value || undefined })}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '36px',
                      fontSize: '0.875rem',
                      borderRadius: '0.5rem',
                      borderColor: '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                />
                {formData.embarcacaoId && !formData.clienteId && (
                  <div className="mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Rateado igualmente entre os cotistas.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  rows={2}
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Detalhes adicionais..."
                />
              </div>

              {/* Show attached file url in edit mode if exists */}
              {editingItem?.comprovante && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg flex items-center justify-between text-emerald-900 text-[10px]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Comprovante vinculado.
                  </span>
                  <a href={editingItem.comprovante} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                    Ver <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg font-bold text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
