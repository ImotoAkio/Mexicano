import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Star, Search, Filter, RefreshCw, Trash2, Reply, CheckCircle, 
  Clock, AlertCircle, Archive, QrCode, Download, Printer, Copy, Check, ExternalLink, X, ArrowUpRight
} from 'lucide-react';
import { Feedback } from '../types';

export default function FeedbackAdmin() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [ratingFilter, setRatingFilter] = useState<string>('todas');

  // QR Code Config
  const [qrUrl, setQrUrl] = useState(() => `${window.location.origin}/feedback`);
  const [isCopied, setIsCopied] = useState(false);

  // Selected feedback for modal view/edit
  const [selectedFb, setSelectedFb] = useState<Feedback | null>(null);
  const [modalStatus, setModalStatus] = useState<'pendente' | 'em_analise' | 'resolvido' | 'arquivado'>('pendente');
  const [modalResponse, setModalResponse] = useState('');
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  // Fetch Feedbacks
  const fetchFeedbacks = () => {
    setIsLoading(true);
    setError('');
    fetch('/api/feedbacks', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Não foi possível carregar os feedbacks.');
      return res.json();
    })
    .then(data => {
      if (data.success && data.feedbacks) {
        setFeedbacks(data.feedbacks);
      }
    })
    .catch(err => {
      setError(err.message || 'Erro ao carregar dados do servidor.');
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Print QR Code
  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrUrl)}`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir QR Code - Central de Opiniões</title>
          <style>
            body {
              font-family: 'Inter', system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              text-align: center;
              color: #0f172a;
              background-color: #ffffff;
              padding: 40px;
            }
            .container {
              border: 3px double #b69d74;
              border-radius: 24px;
              padding: 40px;
              max-width: 500px;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            }
            h1 {
              font-size: 26px;
              margin: 10px 0;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            p {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 30px;
              max-width: 400px;
              line-height: 1.5;
            }
            .qr-frame {
              padding: 15px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              background-color: #ffffff;
            }
            img {
              width: 300px;
              height: 300px;
              display: block;
            }
            .footer-text {
              margin-top: 40px;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #b69d74;">VILA NÁUTICA</h1>
            <h2 style="font-size: 16px; margin-top: 0; color: #475569; letter-spacing: 1px;">Sua Opinião Vale Muito</h2>
            <p>Escaneie o QR Code abaixo com a câmera do seu celular para registrar sua reclamação, sugestão ou elogio diretamente na nossa ouvidoria.</p>
            <div class="qr-frame">
              <img src="${qrImageUrl}" alt="QR Code Ouvidoria" />
            </div>
            <div class="footer-text">Obrigado por nos ajudar a melhorar!</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Open Edit Modal
  const handleOpenModal = (fb: Feedback) => {
    setSelectedFb(fb);
    setModalStatus(fb.status);
    setModalResponse(fb.respostaAdmin || '');
  };

  // Save Response & Status
  const handleSaveResponse = async () => {
    if (!selectedFb) return;
    setIsSavingResponse(true);
    try {
      const response = await fetch(`/api/feedbacks/${selectedFb.id}/responder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          status: modalStatus,
          respostaAdmin: modalResponse
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao salvar resposta.');

      // Update local state
      setFeedbacks(prev => prev.map(f => f.id === selectedFb.id ? data.feedback : f));
      setSelectedFb(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alteração.');
    } finally {
      setIsSavingResponse(false);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Deseja realmente deletar este feedback? Esta ação não pode ser desfeita.')) return;
    try {
      const response = await fetch(`/api/feedbacks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (response.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao deletar feedback.');
      }
    } catch (err: any) {
      alert(err.message || 'Houve um erro ao deletar.');
    }
  };

  // Date Formatting Helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Render Stars Rating
  const renderStars = (score: number) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            className={`w-3.5 h-3.5 ${
              s <= score 
                ? 'fill-amber-400 text-amber-400' 
                : 'text-slate-200'
            }`} 
          />
        ))}
      </div>
    );
  };

  // Filtered List calculation
  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesSearch = 
      (fb.nomeCliente?.toLowerCase() || 'anônimo').includes(searchTerm.toLowerCase()) ||
      (fb.comentario?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'todos' || fb.status === statusFilter;
    const matchesCategory = categoryFilter === 'todos' || fb.categoria === categoryFilter;
    const matchesRating = ratingFilter === 'todas' || fb.nota.toString() === ratingFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesRating;
  });

  // Calculate Metrics
  const totalCount = feedbacks.length;
  const averageScore = totalCount > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.nota, 0) / totalCount).toFixed(1) 
    : '0.0';
  
  const pendingCount = feedbacks.filter(f => f.status === 'pendente').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'resolvido').length;
  const resolutionRate = totalCount > 0 
    ? Math.round((resolvedCount / totalCount) * 100) 
    : 0;

  // Category badges configuration
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'reclamacao': return { label: 'Reclamação', color: 'bg-red-50 text-red-700 border-red-100' };
      case 'sugestao': return { label: 'Sugestão', color: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'elogio': return { label: 'Elogio', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      default: return { label: 'Outro', color: 'bg-slate-50 text-slate-700 border-slate-100' };
    }
  };

  // Status badges configuration
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'pendente': return { label: 'Pendente', icon: AlertCircle, color: 'bg-rose-50 text-rose-700 border-rose-100' };
      case 'em_analise': return { label: 'Em Análise', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'resolvido': return { label: 'Resolvido', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'arquivado': return { label: 'Arquivado', icon: Archive, color: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: return { label: 'Pendente', icon: AlertCircle, color: 'bg-rose-50 text-rose-700 border-rose-100' };
    }
  };

  const getEmojiChar = (score: number) => {
    switch (score) {
      case 1: return '😠';
      case 2: return '🙁';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😍';
      default: return '😐';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Title and Refresh button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Central de Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie opiniões, reclamações e sugestões dos proprietários do Vila Náutica.
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Grid of KPIs & QR Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KPI Cards (Left/Center columns) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          
          {/* Card 1: Total feedbacks */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total de Envios</span>
              <MessageSquare className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{totalCount}</span>
              <div className="text-xs text-slate-400 mt-1">feedbacks registrados</div>
            </div>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Média de Satisfação</span>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div className="mt-4">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-extrabold text-slate-900">{averageScore}</span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
              <div className="flex items-center mt-1 space-x-1.5">
                {renderStars(Math.round(parseFloat(averageScore)))}
              </div>
            </div>
          </div>

          {/* Card 3: Pending */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Pendentes</span>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{pendingCount}</span>
              <div className="text-xs text-rose-500/80 font-semibold mt-1">necessitam de resposta</div>
            </div>
          </div>

          {/* Card 4: Resolution Rate */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Taxa de Resolução</span>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{resolutionRate}%</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${resolutionRate}%` }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* QR Code Utility Card (Right column) */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Divulgação Ouvidoria</span>
            <QrCode className="w-5 h-5 text-[#B69D74]" />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="p-2 border border-slate-100 rounded-xl bg-slate-50 shrink-0">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrUrl)}`}
                alt="Ouvidoria QR"
                className="w-24 h-24 block"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-900">QR Code da Central</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Imprima este QR code para colar nas áreas comuns da marina e barcos para facilitar o acesso dos clientes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:border-slate-400"
                placeholder="URL da central"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Copiar Link"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{isCopied ? 'Copiado' : 'Link'}</span>
              </button>

              <button
                onClick={handlePrintQr}
                className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Imprimir QR Code"
              >
                <Printer className="w-4 h-4" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Imprimir</span>
              </button>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-center"
                title="Abrir Imagem"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Abrir</span>
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Main Feedback Content and Table List */}
      <div className="bg-white border border-slate-150/60 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Filters and Search Bar Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por cliente ou comentário..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Filter Selectors */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* Category Filter */}
            <div className="flex items-center space-x-1 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="todos">Todas Categorias</option>
                <option value="reclamacao">Reclamação</option>
                <option value="sugestao">Sugestão</option>
                <option value="elogio">Elogio</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="todas">Todas as Notas</option>
              <option value="5">5 estrelas 😍</option>
              <option value="4">4 estrelas 🙂</option>
              <option value="3">3 estrelas 😐</option>
              <option value="2">2 estrelas 🙁</option>
              <option value="1">1 estrela 😠</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="todos">Todos Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_analise">Em Análise</option>
              <option value="resolvido">Resolvido</option>
              <option value="arquivado">Arquivado</option>
            </select>

          </div>

        </div>

        {/* Table list view */}
        <div className="overflow-x-auto subtle-scrollbar">
          {filteredFeedbacks.length > 0 ? (
            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-center">Nota</th>
                  <th className="px-6 py-4 w-96">Comentário</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredFeedbacks.map((fb) => {
                  const catDetails = getCategoryDetails(fb.categoria);
                  const statusDetails = getStatusDetails(fb.status);
                  const StatusIcon = statusDetails.icon;

                  return (
                    <tr key={fb.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Customer Name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {fb.nomeCliente ? (
                          <div className="space-y-0.5">
                            <div>{fb.nomeCliente}</div>
                            {fb.telefoneCliente && (
                              <div className="text-[10px] text-slate-400 font-normal">{fb.telefoneCliente}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Anônimo</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide ${catDetails.color}`}>
                          {catDetails.label}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-lg mb-0.5">{getEmojiChar(fb.nota)}</span>
                          {renderStars(fb.nota)}
                        </div>
                      </td>

                      {/* Comment */}
                      <td className="px-6 py-4 max-w-xs md:max-w-sm truncate text-slate-600 font-normal leading-relaxed">
                        <span className="block truncate font-medium text-slate-700" title={fb.comentario}>
                          {fb.comentario}
                        </span>
                        {fb.respostaAdmin && (
                          <span className="block text-[10px] text-emerald-600 font-semibold mt-1 truncate">
                            Resp: {fb.respostaAdmin}
                          </span>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-medium">
                        {formatDate(fb.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-full border text-[10px] font-semibold tracking-wide ${statusDetails.color}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusDetails.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2.5">
                          <button
                            onClick={() => handleOpenModal(fb)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Responder / Detalhes"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <p className="font-medium text-sm">Nenhum feedback corresponde aos filtros selecionados.</p>
              <p className="text-xs text-slate-350 mt-1">Tente ajustar ou limpar seus parâmetros de busca.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FOR RESPONSE / EDIT */}
      {selectedFb && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">Detalhes do Feedback</h3>
                <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-full">
                  ID: {selectedFb.id.split('_')[1]?.substring(0, 8) || selectedFb.id}
                </span>
              </div>
              <button 
                onClick={() => setSelectedFb(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto subtle-scrollbar">
              
              {/* Customer and date block */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remetente</h4>
                  <div className="text-xs font-semibold text-slate-900 mt-1">
                    {selectedFb.nomeCliente ? (
                      <div className="space-y-0.5">
                        <p>{selectedFb.nomeCliente}</p>
                        {selectedFb.telefoneCliente && <p className="text-[10px] text-slate-500 font-normal">{selectedFb.telefoneCliente}</p>}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">Enviado Anonimamente</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviado em</h4>
                  <div className="text-xs font-semibold text-slate-700 mt-1">
                    {formatDate(selectedFb.createdAt)}
                  </div>
                </div>
              </div>

              {/* Category & Rating */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</h4>
                  <div className="mt-1.5">
                    <span className={`px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide ${getCategoryDetails(selectedFb.categoria).color}`}>
                      {getCategoryDetails(selectedFb.categoria).label}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação</h4>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="text-lg">{getEmojiChar(selectedFb.nota)}</span>
                    {renderStars(selectedFb.nota)}
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="border-t border-slate-100 pt-4 space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensagem do Cliente</h4>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-750 font-normal leading-relaxed whitespace-pre-wrap">
                  {selectedFb.comentario}
                </div>
              </div>

              {/* Action Form Settings */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                
                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alterar Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['pendente', 'em_analise', 'resolvido', 'arquivado'] as const).map((st) => {
                      const det = getStatusDetails(st);
                      const Icon = det.icon;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setModalStatus(st)}
                          className={`py-2 px-1 rounded-lg border text-[10px] font-semibold tracking-wide flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                            modalStatus === st
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{det.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Admin Note / Response text */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resposta do Administrador / Notas Internas</label>
                  <textarea
                    value={modalResponse}
                    onChange={(e) => setModalResponse(e.target.value)}
                    placeholder="Digite uma resposta ou observações internas sobre a solução desse feedback..."
                    rows={4}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Nota: Esta resposta serve para acompanhamento interno e registro das tratativas efetuadas pela diretoria da marina.
                  </p>
                </div>

              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                disabled={isSavingResponse}
                onClick={() => setSelectedFb(null)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={isSavingResponse}
                onClick={handleSaveResponse}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSavingResponse ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
