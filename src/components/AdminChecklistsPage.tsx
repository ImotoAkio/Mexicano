import React, { useState, useMemo, useEffect } from 'react';
import Select from 'react-select';
import {
  ClipboardCheck, Search, Calendar, Download, Edit2, Trash2,
  ArrowDownCircle, ArrowUpCircle, Anchor, Image as ImageIcon,
  Clock, CheckCircle2, MoreVertical, X, List, LayoutList, GitCommit,
  Link as LinkIcon, Share2, Compass, AlertTriangle, Shield, Flame, Activity, FileText, Pocket, LifeBuoy,
  ChevronLeft, ChevronRight, Sliders
} from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { ZoomableImage } from './ZoomableImage';
import UserAvatarMenu from './header/UserAvatarMenu';
import SystemSettingsModal from './header/SystemSettingsModal';

const renderSafetyItem = (reserva: any, key: string, label: string, IconClass: any) => {
  const status = reserva.checklistEquipamentos?.[key];
  const isOk = status !== false; // Considera undefined como OK por padrão no legado
  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between ${
      isOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
    }`}>
      <span className="flex items-center gap-1.5 truncate"><IconClass className="w-4 h-4 shrink-0" /> <span className="truncate">{label}</span></span>
      <span className="shrink-0 ml-1">{isOk ? '✓ OK' : '⚠️ Avaria'}</span>
    </div>
  );
};

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, descida, chegada, subida
  
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [selectedTimelineBoatId, setSelectedTimelineBoatId] = useState<string>('');
  
  const [modalPhotos, setModalPhotos] = useState<{title: string, urls: string[]} | null>(null);
  const [lightbox, setLightbox] = useState<{ currentIndex: number, urls: string[], title: string } | null>(null);
  const [viewingRes, setViewingRes] = useState<Reserva | null>(null);

  const [editingRes, setEditingRes] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState({ descida: '', chegada: '', subida: '' });

  const [storageSize, setStorageSize] = useState<{ totalBytes: number, checklistsBytes: number } | null>(null);
  
  useEffect(() => {
    fetch('/api/admin/storage-size', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
    .then(res => res.json())
    .then(data => setStorageSize(data))
    .catch(() => {});
  }, []);

  const handleCleanup = async () => {
    if (!window.confirm('Tem certeza que deseja apagar os checklists antigos (mais de 30 dias)?')) return;
    try {
      const res = await fetch('/api/admin/cleanup-checklists', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok && reloadData) {
        alert('Checklists antigos apagados com sucesso!');
        reloadData();
      }
    } catch (e) {
      alert('Erro ao apagar checklists.');
    }
  };

  const getClientName = (id: string) => data.clients?.find(c => c.id === id)?.nome || 'Desconhecido';
  const getBoatDetails = (id: string) => {
    const b = data.boats?.find(b => b.id === id);
    return b ? getBoatCode(b) : 'Desconhecido';
  };

  const formatAngleLabel = (key: string) => {
    const labels: Record<string, string> = {
      'frente': 'Frente',
      'traseira': 'Traseira',
      'lat_esquerda': 'Lat. Esquerda',
      'lat_direita': 'Lat. Direita',
      'painel': 'Painel',
      'casco_inferior': 'Casco Inferior',
      'casco_traseiro': 'Casco Traseiro',
      'porta_objetos': 'Porta Objetos',
      'frente_proa': 'Frente - Proa',
      'frente_conves': 'Frente - Convés',
      'traseira_popa': 'Traseira - Popa',
      'traseira_plataforma': 'Traseira - Plataforma',
      'lat_esq_proa': 'Lat. Esq - Proa',
      'lat_esq_popa': 'Lat. Esq - Popa',
      'lat_dir_proa': 'Lat. Dir - Proa',
      'lat_dir_popa': 'Lat. Dir - Popa',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const parseFotos = (fotosStr: any, extras: any = []): { label: string, url: string }[] => {
    let arr: { label: string, url: string }[] = [];
    if (!fotosStr) {
       arr = [];
    } else if (Array.isArray(fotosStr)) {
       arr = fotosStr.map((url, i) => ({ label: `Foto ${i + 1}`, url }));
    } else if (typeof fotosStr === 'object') {
       arr = Object.entries(fotosStr)
         .filter(([_, v]) => typeof v === 'string')
         .map(([k, v]) => ({ label: formatAngleLabel(k), url: v as string }));
    } else if (typeof fotosStr === 'string') {
      try {
        const parsed = JSON.parse(fotosStr);
        arr = Array.isArray(parsed)
          ? parsed.map((url, i) => ({ label: `Foto ${i + 1}`, url }))
          : [];
      } catch (e) {
        arr = fotosStr.split(',').filter((f: string) => f.trim().length > 0).map((url: string, i: number) => ({ label: `Foto ${i + 1}`, url }));
      }
    }

    if (Array.isArray(extras)) {
      extras.forEach((url, i) => {
        if (typeof url === 'string') {
          arr.push({ label: `Extra ${i + 1}`, url });
        }
      });
    }
    return arr;
  };

  const filteredReservations = useMemo(() => {
    if (!data.reservations) return [];
    return data.reservations
      .filter(r => r.data >= startDate && r.data <= endDate)
      .filter(r => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'descida') return !!r.horaDescida;
        if (statusFilter === 'chegada') return !!r.horaChegada;
        if (statusFilter === 'subida') return !!r.horaSubida;
        return true;
      })
      .filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const client = getClientName(r.clienteId).toLowerCase();
        const boat = getBoatDetails(r.embarcacaoId).toLowerCase();
        return client.includes(term) || boat.includes(term);
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [data.reservations, startDate, endDate, statusFilter, searchTerm]);

  const timelineReservations = useMemo(() => {
    if (!data.reservations || !selectedTimelineBoatId) return [];
    return data.reservations
      .filter(r => r.embarcacaoId === selectedTimelineBoatId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [data.reservations, selectedTimelineBoatId]);

  const exportCSV = () => {
    const csvRows = [];
    csvRows.push(['ID', 'Data', 'Cliente', 'Embarcação', 'Hora Descida', 'Hora Chegada', 'Hora Subida', 'Status']);
    filteredReservations.forEach(r => {
      csvRows.push([
        r.id, 
        new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR'),
        getClientName(r.clienteId),
        getBoatDetails(r.embarcacaoId),
        r.horaDescida || '-',
        r.horaChegada || '-',
        r.horaSubida || '-',
        r.statusMarina || r.status
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `checklists_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyShareLink = (id: string) => {
    const link = `${window.location.origin}/checklist/share/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link de compartilhamento copiado!');
  };

  const handleDeleteChecklist = async (reservaId: string) => {
    if (!window.confirm("Apagar APENAS as fotos e horários deste checklist? A reserva continuará existindo.")) return;
    try {
      const res = await fetch(`/api/marina/reservas/${reservaId}/clear-checklist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        if (reloadData) reloadData();
        setViewingRes(null);
      }
    } catch (e) {
      alert("Erro ao limpar checklist.");
    }
  };

  const saveEditedTimes = async (r: Reserva) => {
    try {
      const res = await fetch(`/api/marina/reservas/${r.id}/update-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          horaDescida: editTimes.descida,
          horaChegada: editTimes.chegada,
          horaSubida: editTimes.subida
        })
      });
      if (res.ok) {
        setEditingRes(null);
        if (reloadData) reloadData();
      }
    } catch (e) {
      alert("Erro ao salvar horários.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#eaeff3] p-4 sm:p-6 space-y-6 font-sans text-slate-800">
      
      {/* 1. Header Padronizado (Breadcrumb, Título & Ícones Utilitários à Direita) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
            <span>Frotas</span>
            <span>/</span>
            <span className="text-[#186b77] font-bold">Checklists Diários</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Checklists Diários
          </h1>
        </div>

        {/* Botões Utilitários Circulares Padronizados */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button 
            onClick={() => {
              const input = document.querySelector('input[placeholder*="Nome do cliente"]') as HTMLInputElement;
              if (input) input.focus();
            }}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Configurações do Sistema"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button 
            onClick={exportCSV}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Exportar Dados (CSV)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button 
            onClick={handleCleanup}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
            title="Limpar Antigos"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <UserAvatarMenu />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Busca Livre</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nome do cliente ou embarcação..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Status Checklist</label>
            <select 
              className="w-full min-w-[150px] border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="descida">Descida Realizada</option>
              <option value="chegada">Chegada Realizada</option>
              <option value="subida">Subida Realizada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Período Inicial</label>
            <input 
              type="date" 
              className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Período Final</label>
            <input 
              type="date" 
              className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <LayoutList className="w-4 h-4" /> Lista de Checklists
        </button>
        <button 
          onClick={() => setViewMode('timeline')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${viewMode === 'timeline' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <GitCommit className="w-4 h-4" /> Linha do Tempo
        </button>
      </div>

      {viewMode === 'timeline' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Selecione uma Embarcação para ver o histórico</label>
          <div className="max-w-md">
            <Select
              options={data.boats?.map(b => ({
                value: b.id,
                label: `${getBoatCode(b)} (${b.modelo || (b.tipo === 'jet' ? 'Jet Ski' : 'Lancha')})`
              })) || []}
              placeholder="Pesquisar barco..."
              isClearable
              isSearchable
              value={
                selectedTimelineBoatId 
                  ? {
                      value: selectedTimelineBoatId,
                      label: getBoatCode(data.boats?.find(b => b.id === selectedTimelineBoatId))
                    } 
                  : null
              }
              onChange={(option: any) => setSelectedTimelineBoatId(option ? option.value : '')}
              noOptionsMessage={() => "Nenhum barco encontrado"}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '2px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#94a3b8'
                  }
                })
              }}
            />
          </div>
        </div>
      )}

      {viewMode === 'timeline' && selectedTimelineBoatId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-600" />
            Histórico da Embarcação: {getBoatDetails(selectedTimelineBoatId)}
          </h3>
          <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-8">
            {timelineReservations.length === 0 ? (
              <p className="text-slate-500 italic">Nenhum checklist registrado para esta embarcação.</p>
            ) : (
              timelineReservations.map(r => (
                <div key={r.id} className="relative">
                  <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white"></div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-sm font-semibold text-blue-600">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <p className="text-slate-700 font-medium">{getClientName(r.clienteId)}</p>
                      </div>
                      <button 
                        onClick={() => setViewingRes(r)}
                        className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-3 rounded-lg flex items-center gap-3 ${r.horaDescida ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        <ArrowDownCircle className="w-5 h-5" />
                        <div>
                          <p className="text-xs font-semibold uppercase">Descida</p>
                          <p className="text-sm">{r.horaDescida || 'Pendente'}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg flex items-center gap-3 ${r.horaChegada ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                        <div>
                          <p className="text-xs font-semibold uppercase">Chegada</p>
                          <p className="text-sm">{r.horaChegada || 'Pendente'}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg flex items-center gap-3 ${r.horaSubida ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        <ArrowUpCircle className="w-5 h-5" />
                        <div>
                          <p className="text-xs font-semibold uppercase">Subida</p>
                          <p className="text-sm">{r.horaSubida || 'Pendente'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Cliente / Embarcação</th>
                  <th className="px-6 py-4 text-center">Descida</th>
                  <th className="px-6 py-4 text-center">Chegada</th>
                  <th className="px-6 py-4 text-center">Subida</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      Nenhum checklist encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map(r => {
                    const descidaFotos = parseFotos(r.fotosChecklistDescida || r.fotosChecklistSaida);
                    const chegadaFotos = parseFotos(r.fotosChecklistChegada);
                    const subidaFotos = parseFotos(r.fotosChecklistSubida);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                          {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{getClientName(r.clienteId)}</div>
                          <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            <Anchor className="w-3 h-3" /> {getBoatDetails(r.embarcacaoId)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${r.horaDescida ? 'bg-blue-50 border border-blue-100' : ''}`}>
                            <span className={`text-xs font-semibold ${r.horaDescida ? 'text-blue-700' : 'text-slate-400'}`}>{r.horaDescida || '-'}</span>
                            {descidaFotos.length > 0 && <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full mt-1">{descidaFotos.length} fotos</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${r.horaChegada ? 'bg-amber-50 border border-amber-100' : ''}`}>
                            <span className={`text-xs font-semibold ${r.horaChegada ? 'text-amber-700' : 'text-slate-400'}`}>{r.horaChegada || '-'}</span>
                            {chegadaFotos.length > 0 && <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full mt-1">{chegadaFotos.length} fotos</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${r.horaSubida ? 'bg-emerald-50 border border-emerald-100' : ''}`}>
                            <span className={`text-xs font-semibold ${r.horaSubida ? 'text-emerald-700' : 'text-slate-400'}`}>{r.horaSubida || '-'}</span>
                            {subidaFotos.length > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full mt-1">{subidaFotos.length} fotos</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button 
                            onClick={() => copyShareLink(r.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copiar Link Compartilhável"
                          >
                            <LinkIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setViewingRes(r)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <List className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detalhes do Checklist</h2>
                <p className="text-slate-500 mt-1">
                  {getClientName(viewingRes.clienteId)} • {getBoatDetails(viewingRes.embarcacaoId)} • {new Date(viewingRes.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => setViewingRes(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              
              <div className="flex justify-between gap-4">
                <button 
                  onClick={() => {
                    setEditingRes(viewingRes.id);
                    setEditTimes({
                      descida: viewingRes.horaDescida || '',
                      chegada: viewingRes.horaChegada || '',
                      subida: viewingRes.horaSubida || ''
                    });
                  }}
                  className="flex-1 bg-white border border-slate-200 hover:border-blue-300 text-blue-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Edit2 className="w-4 h-4" /> Editar Horários
                </button>
                <button 
                  onClick={() => copyShareLink(viewingRes.id)}
                  className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4" /> Copiar Link
                </button>
              </div>

              {editingRes === viewingRes.id && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">Edição de Horários (HH:mm)</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Descida</label>
                      <input type="text" className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none" value={editTimes.descida} onChange={e => setEditTimes({...editTimes, descida: e.target.value})} placeholder="Ex: 09:30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Chegada</label>
                      <input type="text" className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none" value={editTimes.chegada} onChange={e => setEditTimes({...editTimes, chegada: e.target.value})} placeholder="Ex: 15:45" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Subida</label>
                      <input type="text" className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none" value={editTimes.subida} onChange={e => setEditTimes({...editTimes, subida: e.target.value})} placeholder="Ex: 17:00" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingRes(null)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={() => saveEditedTimes(viewingRes)} className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Salvar</button>
                  </div>
                </div>
              )}

              {['Descida', 'Chegada', 'Subida'].map(stage => {
                const isDescida = stage === 'Descida';
                const isChegada = stage === 'Chegada';
                const fotosStr = isDescida ? (viewingRes.fotosChecklistDescida || viewingRes.fotosChecklistSaida) : isChegada ? viewingRes.fotosChecklistChegada : viewingRes.fotosChecklistSubida;
                const extrasStr = isDescida ? viewingRes.fotosExtrasDescida : isChegada ? [] : viewingRes.fotosExtrasSubida;
                const fotos = parseFotos(fotosStr, extrasStr);
                const hora = isDescida ? viewingRes.horaDescida : isChegada ? viewingRes.horaChegada : viewingRes.horaSubida;
                const Icon = isDescida ? ArrowDownCircle : isChegada ? CheckCircle2 : ArrowUpCircle;
                const colorClass = isDescida ? 'text-blue-600 bg-blue-50 border-blue-100' : isChegada ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';

                return (
                  <div key={stage} className={`bg-white border rounded-xl p-5 ${colorClass}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <div>
                          <h4 className="font-semibold text-slate-800">{stage}</h4>
                          <p className="text-sm font-medium">{hora || 'Pendente'}</p>
                        </div>
                      </div>
                    </div>
                    {fotos.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {fotos.map((foto, i) => (
                          <div
                            key={i}
                            onClick={() => setModalPhotos({ title: `Fotos - ${stage}`, urls: fotos.map(f => f.url) })}
                            className="aspect-square bg-slate-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-500 transition-all relative group"
                          >
                            <img src={foto.url} alt={`${stage} ${i+1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-center text-[9px] text-white backdrop-blur-sm truncate">
                              {foto.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm opacity-60 italic">Nenhuma foto registrada.</p>
                    )}
                  </div>
                );
              })}

              {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
              {(() => {
                const boat = data.boats?.find((b: any) => b.id === viewingRes.embarcacaoId);
                const isJet = boat 
                  ? (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet'))
                  : ((viewingRes as any)?.embarcacaoTipo === 'jet' || ((viewingRes as any)?.barcoNome || (viewingRes as any)?.embarcacaoNome || '').toLowerCase().includes('jet'));

                if (isJet) {
                  return viewingRes.checklistObservacoes ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
                      <span className="font-bold text-slate-900 block text-xs uppercase mb-1">Observações do Marinheiro:</span>
                      <p>{viewingRes.checklistObservacoes}</p>
                    </div>
                  ) : null;
                }

                return (
                  <div className="bg-white border rounded-xl p-5 border-amber-100">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <span>Segurança & Equipamentos da Lancha</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                      {renderSafetyItem(viewingRes, 'coletes', 'Coletes', Shield)}
                      {renderSafetyItem(viewingRes, 'extintor', 'Extintor', Flame)}
                      {renderSafetyItem(viewingRes, 'cortaCorrente', 'Corta-Corrente', Activity)}
                      {renderSafetyItem(viewingRes, 'ancora', 'Âncora', Anchor)}
                      {renderSafetyItem(viewingRes, 'documento', 'Documentos', FileText)}
                      {renderSafetyItem(viewingRes, 'boiaCircular', 'Bóia Circular', LifeBuoy)}
                      {renderSafetyItem(viewingRes, 'primeirosSocorros', 'P. Socorros', Pocket)}
                    </div>
                    {viewingRes.checklistObservacoes && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium mt-3">
                        <span className="font-bold text-slate-900 block text-xs uppercase mb-1">Observações do Marinheiro:</span>
                        <p>{viewingRes.checklistObservacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-between">
              <button 
                onClick={() => handleDeleteChecklist(viewingRes.id)}
                className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Apagar Dados do Checklist
              </button>
              <button 
                onClick={() => setViewingRes(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPhotos && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 flex justify-between items-center bg-slate-900">
            <h3 className="font-semibold text-white">{modalPhotos.title}</h3>
            <button onClick={() => setModalPhotos(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {modalPhotos.urls.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] ring-1 ring-white/10 group cursor-pointer" onClick={() => setLightbox({ currentIndex: i, urls: modalPhotos.urls, title: modalPhotos.title })}>
                  <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                  <a href={url} download target="_blank" rel="noreferrer" className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-lg transition-colors">
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center animate-fade-in backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
            <button onClick={() => setLightbox(null)} className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer backdrop-blur-md">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null) }}
            className={`absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10 backdrop-blur-md ${lightbox.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={lightbox.currentIndex === 0}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="w-full max-w-5xl h-full max-h-[85vh] flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
             <div className="flex-1 w-full relative min-h-[300px] bg-slate-900/50 rounded-lg overflow-hidden border border-white/10">
               <ZoomableImage 
                 src={lightbox.urls[lightbox.currentIndex]} 
                 alt="Zoomed" 
                 className="max-w-full max-h-[70vh] object-contain" 
               />
             </div>
             <div className="mt-6 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 w-full max-w-2xl shadow-xl flex items-center justify-between text-slate-200">
               <div>
                 <h4 className="font-bold text-white uppercase tracking-wider text-sm">{lightbox.title}</h4>
               </div>
               <div className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
                 {lightbox.currentIndex + 1} / {lightbox.urls.length}
               </div>
             </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1) } : null) }}
            className={`absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10 backdrop-blur-md ${lightbox.currentIndex === lightbox.urls.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={lightbox.currentIndex === lightbox.urls.length - 1}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
       {/* System & Horímetro Settings Modal */}
      {isSettingsOpen && (
        <SystemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={reloadData}
        />
      )}

    </div>
  );
}
