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
import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';
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
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState<number>(2.2);
  const [taxaMultaAtraso, setTaxaMultaAtraso] = useState<number>(2.0);
      
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
  const isGerente = loggedUser?.role === 'marina_gerente' || loggedUser?.role === 'gerente';
  const isFinanceiroOrAdmin = isAdmin || isFinanceiro || isGerente;

  const getDaysDiff = (dateStr: string) => {
    const due = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateTransactionInterest = (t: TransacaoFinanceira) => {
    const baseVal = Number(t.valor || 0);
    if (t.tipo !== 'receita' || t.status === 'pago' || t.status === 'cancelado') {
      return { days: 0, interest: 0, total: baseVal };
    }
    
    const isOverdue = t.status === 'vencido' || (t.status === 'lancado' && new Date(t.dataVencimento + 'T23:59:59') < new Date());
    
    if (!isOverdue) return { days: 0, interest: 0, total: baseVal };

    const days = getDaysDiff(t.dataVencimento);
    if (days <= 0) return { days: 0, interest: 0, total: baseVal };

    const fine = baseVal * (Math.max(0, taxaMultaAtraso) / 100);
    const ratePerDay = (Math.max(0, taxaJurosMensal) / 100) / 30;
    const interestOnly = baseVal * ratePerDay * days;
    const totalFees = Number((fine + interestOnly).toFixed(2));
    const total = Number((baseVal + totalFees).toFixed(2));

    return { days, interest: totalFees, total };
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
        const [resContas, resPlanos, resForn, resCentros, resConfig] = await Promise.all([
          fetch('/api/financeiro/contas-bancarias', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/planos-contas', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/fornecedores', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/centros-custo', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/financeiro/configuracoes', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (resContas.ok) setContasBancarias(await resContas.json());
        if (resPlanos.ok) setPlanosContas(await resPlanos.json());
        if (resForn.ok) setFornecedores(await resForn.json());
        if (resCentros.ok) setCentrosCusto(await resCentros.json());
        if (resConfig.ok) {
           const d = await resConfig.json();
           if (d.success && d.configuracoes) {
               setTaxaJurosMensal(parseFloat(d.configuracoes.taxaJurosMensal ?? '2.2'));
               setTaxaMultaAtraso(parseFloat(d.configuracoes.taxaMultaAtraso ?? '2.0'));
           }
        }
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

  const handleSaveLancamentos = async (novosLancamentos: Partial<TransacaoFinanceira>[]) => {
    setIsModalOpen(false);
    setEditingItem(null);
    const withIds = novosLancamentos.map(l => ({
      ...l, id: l.id || `fin_${Date.now()}_${Math.random().toString(36).substring(7)}`, createdAt: l.createdAt || new Date().toISOString()
    }));

    setTransacoes(prev => {
      const updated = [...prev];
      withIds.forEach(newItem => {
        const idx = updated.findIndex(t => t.id === newItem.id);
        if (idx !== -1) updated[idx] = newItem as any;
        else updated.unshift(newItem as any);
      });
      return updated;
    });

    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });
      fetchData();
    } catch(e) {
      console.error("Erro ao salvar lançamentos", e);
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
    doc.text(`Juros (${taxaJurosMensal.toFixed(2)}%/mês)`, 145, y);
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
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  // Filtered transactions for Tab 1
  const filteredTransacoes = transacoes.filter(t => {
    // Empresa Filter
    if (empresaFiltro !== 'Todos') {
      if (t.empresa !== empresaFiltro) return false;
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
                <option value="Marina Velho Chico">Marina Velho Chico</option>
                <option value="Vale Administradora">Vale Administradora</option>
                <option value="Mexicano">Mexicano</option>
              </select>
              {isFinanceiroOrAdmin && (
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
        planosContas={planosContas}
        fornecedores={fornecedores}
        centrosDeCusto={centrosCusto}
      />

      <FinanceLancamentoDrawer
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveLancamentos}
        editingItem={editingItem}
        defaultEmpresa={empresaFiltro}
        planosContas={planosContas}
        centrosCusto={centrosCusto}
        clientes={clientes}
        fornecedores={fornecedores}
        contasBancarias={contasBancarias}
        embarcacoes={embarcacoes}
      />

    </div>
  );
}
