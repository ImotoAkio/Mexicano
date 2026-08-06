import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, Search, Calendar, Download, Edit2, Trash2, 
  ArrowDownCircle, ArrowUpCircle, Anchor, Image as ImageIcon, 
  Clock, CheckCircle2, MoreVertical, X
} from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';

interface AdminChecklistsPageProps {
  data: {
    reservations?: Reserva[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
}

export default function AdminChecklistsPage({ data, setData, reloadData }: AdminChecklistsPageProps) {
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Hoje
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, descida, chegada, subida
  
  const [modalPhotos, setModalPhotos] = useState<{title: string, urls: string[]} | null>(null);
  const [viewingRes, setViewingRes] = useState<Reserva | null>(null);

  // Time editing state
  const [editingRes, setEditingRes] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState({
    descida: '',
    chegada: '',
    subida: ''
  });

  // Process data
  const checklistData = useMemo(() => {
    const res = (data?.reservations || []).filter(r => {
      const rDate = r.data || r.dataAgendamento?.split('T')[0];
      if (!rDate) return false;
      if (rDate < startDate || rDate > endDate) return false;
      return true;
    });
    
    return res.filter(r => {
      const boat = data?.boats?.find(b => b.id === r.embarcacaoId);
      const client = data?.clients?.find(c => c.id === r.clienteId);
      
      const matchesSearch = 
        boat?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
        
      if (searchTerm && !matchesSearch) return false;
      
      if (statusFilter === 'pending' && r.statusMarina !== 'agendado') return false;
      if (statusFilter === 'descida' && r.statusMarina !== 'na_agua') return false;
      if (statusFilter === 'chegada' && r.statusMarina !== 'chegou_marina') return false;
      if (statusFilter === 'subida' && r.statusMarina !== 'subiu') return false;
      
      return true;
    }).sort((a, b) => {
      const dateA = a.data || a.dataAgendamento;
      const dateB = b.data || b.dataAgendamento;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data, startDate, endDate, searchTerm, statusFilter]);

  const { totalChecklists, totalNaAgua, totalFinalizados } = useMemo(() => {
    return {
      totalChecklists: checklistData.length,
      totalNaAgua: checklistData.filter(r => r.statusMarina === 'na_agua' || r.statusMarina === 'chegou_marina').length,
      totalFinalizados: checklistData.filter(r => r.statusMarina === 'subiu').length
    };
  }, [checklistData]);

  const exportToCSV = () => {
    const headers = ['Data', 'Embarcacao', 'Cliente', 'Status', 'Hora Descida', 'Hora Chegada', 'Hora Subida'];
    const rows = checklistData.map(r => {
      const boat = data?.boats?.find(b => b.id === r.embarcacaoId)?.nome || 'N/A';
      const client = data?.clients?.find(c => c.id === r.clienteId)?.nome || 'N/A';
      
      return [
        r.data || r.dataAgendamento, 
        boat, 
        client, 
        r.statusMarina, 
        r.horaDescida || '-', 
        r.horaChegada || '-', 
        r.horaSubida || '-'
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `checklists_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartEdit = (r: Reserva) => {
    setEditingRes(r.id);
    setEditTimes({
      descida: r.horaDescida || '',
      chegada: r.horaChegada || '',
      subida: r.horaSubida || ''
    });
  };

  const handleSaveTimes = async (r: Reserva) => {
    try {
      const res = await fetch(`/api/marina/reservas/${r.id}/update-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          horaDescida: editTimes.descida || null,
          horaChegada: editTimes.chegada || null,
          horaSubida: editTimes.subida || null
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      if (setData) {
        setData((prev: any) => ({
          ...prev,
          reservations: prev?.reservations?.map((prevRes: Reserva) => 
            prevRes.id === r.id ? { ...prevRes, ...editTimes } : prevRes
          )
        }));
      }
      if (reloadData) reloadData();
      setEditingRes(null);
    } catch (err: any) {
      alert('Erro ao salvar horários: ' + err.message);
    }
  };

  const handleClearChecklistData = async (reservaId: string, tipo: 'descida' | 'chegada' | 'subida') => {
    if (!window.confirm(`Tem certeza que deseja limpar os dados de ${tipo}? As fotos serão perdidas e o status voltará para a etapa anterior.`)) return;
    
    try {
      const res = await fetch(`/api/marina/reservas/${reservaId}/clear-checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ tipo })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      if (reloadData) reloadData();
      alert(`Checklist de ${tipo} desfeito.`);
    } catch (err: any) {
      alert('Erro ao limpar checklist: ' + err.message);
    }
  };

  const parseFotos = (fotosStr: any): string[] => {
    if (!fotosStr) return [];
    if (Array.isArray(fotosStr)) return fotosStr;
    if (typeof fotosStr !== 'string') return [];
    try {
      const parsed = JSON.parse(fotosStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return fotosStr.split(',').filter((f: string) => f.trim().length > 0);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      <div className="bg-white border-b border-slate-200 p-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" /> Histórico de Checklists
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestão de descidas, chegadas e subidas com registro fotográfico e de horários.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Período</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <span className="text-slate-400">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-600 uppercase">Pesquisar</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar embarcação ou cliente..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Todas as operações</option>
              <option value="pending">Agendados (Aguardando)</option>
              <option value="descida">Na Água (Saiu)</option>
              <option value="chegada">Na Marina (Chegou)</option>
              <option value="subida">Subiu (Finalizado)</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">Total de Agendamentos</span>
              <span className="text-3xl font-black text-slate-800">{totalChecklists}</span>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-2xl shadow-sm border border-blue-100 p-6 flex items-center justify-between">
            <div>
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider block mb-1">Embarcações na Água</span>
              <span className="text-3xl font-black text-blue-700">{totalNaAgua}</span>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
          </div>
          
          <div className="bg-emerald-50 rounded-2xl shadow-sm border border-emerald-100 p-6 flex items-center justify-between">
            <div>
              <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider block mb-1">Checklists Finalizados</span>
              <span className="text-3xl font-black text-emerald-700">{totalFinalizados}</span>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Embarcação / Cliente</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center bg-blue-50/50">Descida</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center bg-amber-50/50">Chegada</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center bg-emerald-50/50">Subida</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checklistData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhum checklist encontrado neste período.</td>
                  </tr>
                ) : (
                  checklistData.map(r => {
                    const boat = data?.boats?.find(b => b.id === r.embarcacaoId);
                    const client = data?.clients?.find(c => c.id === r.clienteId);
                    
                    const dateObj = r.data || r.dataAgendamento?.split('T')[0];
                    const dateStr = dateObj ? new Date(dateObj + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                    
                    const isEditing = editingRes === r.id;

                    const renderChecklistCell = (hora: string | null | undefined, fotosStr: string | null | undefined, tipo: 'descida'|'chegada'|'subida', title: string, bgClass: string) => {
                      const fotos = parseFotos(fotosStr);
                      if (isEditing) {
                        return (
                          <div className={`p-2 ${bgClass}`}>
                            <input 
                              type="time" 
                              value={editTimes[tipo]}
                              onChange={(e) => setEditTimes({...editTimes, [tipo]: e.target.value})}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            {fotos.length > 0 && (
                              <button onClick={() => handleClearChecklistData(r.id, tipo)} className="mt-1 w-full text-[10px] text-red-600 hover:bg-red-50 py-1 rounded flex items-center justify-center gap-1 transition-colors">
                                <Trash2 className="w-3 h-3" /> Limpar Dados
                              </button>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <div className={`flex flex-col items-center justify-center p-2 h-full min-h-[60px] ${bgClass}`}>
                          {hora ? (
                            <>
                              <span className="font-mono text-sm font-bold text-slate-700">{hora}</span>
                              {fotos.length > 0 ? (
                                <button 
                                  onClick={() => setModalPhotos({ title: `${title} - ${boat?.nome || 'Embarcação'}`, urls: fotos })}
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded text-[10px] font-bold transition-colors"
                                >
                                  <ImageIcon className="w-3 h-3" /> {fotos.length} fotos
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 mt-1">Sem fotos</span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      );
                    };

                    let statusBadge = <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Agendado</span>;
                    if (r.statusMarina === 'na_agua') statusBadge = <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Na Água</span>;
                    if (r.statusMarina === 'chegou_marina') statusBadge = <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Na Marina</span>;
                    if (r.statusMarina === 'subiu') statusBadge = <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Subiu</span>;

                    return (
                      <tr 
                        key={r.id} 
                        onClick={() => setViewingRes(r)}
                        className="hover:bg-slate-50 transition-colors group h-16 cursor-pointer"
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-600">
                          {dateStr}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{boat?.nome || 'N/A'} {boat?.numero ? `#${boat.numero}` : ''}</span>
                            <span className="text-xs text-slate-500 truncate max-w-[200px]">{client?.nome || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="p-0 text-center border-l border-slate-100">
                          {renderChecklistCell(r.horaDescida, r.fotosChecklistDescida, 'descida', 'Descida', 'bg-blue-50/30')}
                        </td>
                        <td className="p-0 text-center border-l border-slate-100">
                          {renderChecklistCell(r.horaChegada, r.fotosChecklistChegada, 'chegada', 'Chegada', 'bg-amber-50/30')}
                        </td>
                        <td className="p-0 text-center border-l border-r border-slate-100">
                          {renderChecklistCell(r.horaSubida, r.fotosChecklistSubida, 'subida', 'Subida', 'bg-emerald-50/30')}
                        </td>
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <button onClick={() => handleSaveTimes(r)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Salvar</button>
                              <button onClick={() => setEditingRes(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => handleStartEdit(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Editar Horários e Dados">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Photo Gallery Modal */}
      {modalPhotos && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-black tracking-tight text-white text-xl">{modalPhotos.title}</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setModalPhotos(null); }} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer backdrop-blur-md"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative z-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {modalPhotos.urls.map((url, i) => (
                <div key={i} className="relative group rounded-2xl overflow-hidden bg-slate-900 aspect-video ring-1 ring-white/10 shadow-2xl">
                  <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-white text-sm font-bold flex items-center gap-1 hover:underline">
                      <Download className="w-4 h-4" /> Ampliar Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Checklist Details Modal */}
      {viewingRes && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingRes(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-indigo-500" />
                Detalhes do Checklist
              </h3>
              <button onClick={() => setViewingRes(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 subtle-scrollbar">
              {/* Info Header */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full shrink-0">
                  <Anchor className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{data?.boats?.find(b => b.id === viewingRes.embarcacaoId)?.nome}</h4>
                  <p className="text-sm font-medium text-slate-500">{data?.clients?.find(c => c.id === viewingRes.clienteId)?.nome}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-bold text-slate-700">{viewingRes.data || (viewingRes as any).dataAgendamento}</p>
                  <p className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded uppercase mt-1 inline-block">{viewingRes.statusMarina}</p>
                </div>
              </div>

              {/* Descida Section */}
              {viewingRes.horaDescida && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ArrowDownCircle className="w-5 h-5 text-blue-500" /> Descida <span className="text-slate-400 text-sm font-normal ml-auto">às {viewingRes.horaDescida}</span>
                  </h5>
                  <p className="text-sm text-slate-500 mb-4 font-medium">Operador: <span className="font-bold text-slate-700">{viewingRes.operadorDescida || 'N/A'}</span></p>
                  
                  {parseFotos(viewingRes.fotosChecklistDescida || (viewingRes as any).fotosChecklistSaida).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {parseFotos(viewingRes.fotosChecklistDescida || (viewingRes as any).fotosChecklistSaida).map((url, i) => (
                        <div 
                          key={i} 
                          onClick={() => setModalPhotos({ title: 'Descida', urls: parseFotos(viewingRes.fotosChecklistDescida || (viewingRes as any).fotosChecklistSaida) })}
                          className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 cursor-pointer ring-1 ring-slate-200 hover:ring-indigo-400 transition-all shadow-sm"
                        >
                          <img src={url} alt="Descida" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed">Sem fotos registradas.</p>
                  )}
                </div>
              )}

              {/* Chegada Section */}
              {viewingRes.horaChegada && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-500" /> Chegada <span className="text-slate-400 text-sm font-normal ml-auto">às {viewingRes.horaChegada}</span>
                  </h5>
                  <p className="text-sm text-slate-500 mb-4 font-medium">Operador: <span className="font-bold text-slate-700">{viewingRes.operadorChegada || 'N/A'}</span></p>
                  
                  {parseFotos(viewingRes.fotosChecklistChegada).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {parseFotos(viewingRes.fotosChecklistChegada).map((url, i) => (
                        <div 
                          key={i} 
                          onClick={() => setModalPhotos({ title: 'Chegada', urls: parseFotos(viewingRes.fotosChecklistChegada) })}
                          className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 cursor-pointer ring-1 ring-slate-200 hover:ring-indigo-400 transition-all shadow-sm"
                        >
                          <img src={url} alt="Chegada" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed">Sem fotos registradas.</p>
                  )}
                </div>
              )}

              {/* Subida Section */}
              {viewingRes.horaSubida && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ArrowUpCircle className="w-5 h-5 text-emerald-500" /> Subida <span className="text-slate-400 text-sm font-normal ml-auto">às {viewingRes.horaSubida}</span>
                  </h5>
                  <p className="text-sm text-slate-500 mb-4 font-medium">Operador: <span className="font-bold text-slate-700">{viewingRes.operadorSubida || 'N/A'}</span></p>
                  
                  {parseFotos(viewingRes.fotosChecklistSubida).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {parseFotos(viewingRes.fotosChecklistSubida).map((url, i) => (
                        <div 
                          key={i} 
                          onClick={() => setModalPhotos({ title: 'Subida', urls: parseFotos(viewingRes.fotosChecklistSubida) })}
                          className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 cursor-pointer ring-1 ring-slate-200 hover:ring-indigo-400 transition-all shadow-sm"
                        >
                          <img src={url} alt="Subida" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed">Sem fotos registradas.</p>
                  )}
                </div>
              )}
              
              {!viewingRes.horaDescida && !viewingRes.horaChegada && !viewingRes.horaSubida && (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Nenhum checklist registrado para esta reserva.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
