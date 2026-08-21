import React, { useState } from 'react';
import { 
  Camera, ChevronLeft, ChevronRight, CheckCircle2, Ship, User as UserIcon, 
  Droplets, MapPin, Clock, Search, Filter, Layers, Navigation, Anchor, 
  Eye, FileText, Download, Printer, Check, X, ShieldAlert, ArrowUpRight, ArrowDownRight, Share2, Shield, Volume2, LifeBuoy, Flame,
  Plus, Loader2, Save, MoreVertical, SlidersHorizontal, LayoutGrid, List, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';
import { getBoatCode } from '../utils/boatUtils';
import { ZoomableImage } from './ZoomableImage';
import { logAction } from '../db';

const CHECKLIST_ANGLES = [
  { id: 'painel', label: 'Painel', icon: Ship },
  { id: 'lateral_direita', label: 'Lateral Direita', icon: Camera },
  { id: 'lateral_esquerda', label: 'Lateral Esquerda', icon: Camera },
  { id: 'casco', label: 'Casco', icon: Layers },
  { id: 'superior', label: 'Superior', icon: ArrowUpCircle },
  { id: 'frontal_45_dir', label: '45° Frontal Direita', icon: Camera },
  { id: 'frontal_45_esq', label: '45° Frontal Esquerda', icon: Camera },
  { id: 'traseira_45_dir', label: '45° Traseira Direita', icon: Camera },
  { id: 'traseira_45_esq', label: '45° Traseira Esquerda', icon: Camera },
  { id: 'traseira_inf', label: 'Traseira Inferior', icon: ArrowDownCircle }
];

interface MarinaChecklistsViewProps {
  data: {
    reservations?: Reserva[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
  operadorNome?: string;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
  isAdmin?: boolean;
}

export default function MarinaChecklistsView({ data, operadorNome, setData, reloadData, isAdmin }: MarinaChecklistsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'todos' | 'casco' | 'completos' | 'pendentes'>('todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Lightbox State
  const [lightbox, setLightbox] = useState<{
    photos: { url: string; title: string; time: string; operador: string; phase: string }[];
    currentIndex: number;
  } | null>(null);

  // Inspection Modal State
  const [inspectionReserva, setInspectionReserva] = useState<Reserva | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = (id: string) => {
    const link = `${window.location.origin}/checklist/share/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // New Checklist Modal State
  const [isNewChecklistOpen, setIsNewChecklistOpen] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
  const [checklistObservacoes, setChecklistObservacoes] = useState('');
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const getEmbarcacao = (id: string) => data?.boats?.find(b => b.id === id);
  const getCliente = (id: string) => data?.clients?.find(c => c.id === id);

  const openLightboxForPhase = (phase: string, startIndex: number) => {
    if (!inspectionReserva) return;
    const allPhotos: any[] = [];
    ['descida', 'chegada', 'subida'].forEach(p => {
      const pFotos = parseFotos(
        p === 'descida' ? (inspectionReserva.fotosChecklistDescida || inspectionReserva.fotosChecklistSaida) :
        p === 'chegada' ? inspectionReserva.fotosChecklistChegada :
        inspectionReserva.fotosChecklistSubida
      );
      const time = p === 'descida' ? inspectionReserva.horaDescida : p === 'chegada' ? inspectionReserva.horaChegada : inspectionReserva.horaSubida;
      const operador = p === 'descida' ? (inspectionReserva.operadorDescida || inspectionReserva.operadorSaida || 'Desconhecido') : p === 'chegada' ? (inspectionReserva.operadorChegada || 'Desconhecido') : (inspectionReserva.operadorSubida || 'Desconhecido');
      pFotos.forEach((url: string) => {
        allPhotos.push({
          url,
          title: `Checklist de ${p.charAt(0).toUpperCase() + p.slice(1)}`,
          time: time || '--:--',
          operador: operador,
          phase: p
        });
      });
    });

    let absIndex = 0;
    let found = false;
    for (let i = 0; i < allPhotos.length; i++) {
      if (allPhotos[i].phase === phase) {
        if (startIndex === 0) {
          absIndex = i;
          found = true;
          break;
        } else {
          startIndex--;
        }
      }
    }
    
    setLightbox({
      photos: allPhotos,
      currentIndex: found ? absIndex : 0
    });
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const displayDateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  // Filtered Checklists
  const filteredChecklists = (data?.reservations || []).filter(r => {
    if (r.status === 'cancelado') return false;
    
    // Date match
    const matchesDate = r.data === selectedDate;
    if (!matchesDate) return false;

    const boat = getEmbarcacao(r.embarcacaoId);
    const client = getCliente(r.clienteId);

    // Search query match
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      boat?.nome?.toLowerCase().includes(term) ||
      boat?.vaga?.toLowerCase().includes(term) ||
      client?.nome?.toLowerCase().includes(term) ||
      client?.cpf?.includes(term) ||
      r.operadorDescida?.toLowerCase().includes(term) ||
      r.operadorSubida?.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    // Photo filter match
    const descidaFotos = parseFotos(r.fotosChecklistDescida || r.fotosChecklistSaida);
    const subidaFotos = parseFotos(r.fotosChecklistSubida);
    const totalFotos = descidaFotos.concat(subidaFotos);

    if (photoFilter === 'casco') {
      return totalFotos.some(url => url.toLowerCase().includes('casco'));
    } else if (photoFilter === 'completos') {
      return descidaFotos.length >= 4 || subidaFotos.length >= 4;
    } else if (photoFilter === 'pendentes') {
      return totalFotos.length === 0;
    }

    return true;
  });

  // Calculate Metrics for Biosynthesia KPI Cards
  const totalCount = filteredChecklists.length;
  const cascoCount = filteredChecklists.filter(r => {
    const fotos = parseFotos(r.fotosChecklistDescida || r.fotosChecklistSaida).concat(parseFotos(r.fotosChecklistSubida));
    return fotos.some(u => u.toLowerCase().includes('casco'));
  }).length;
  const completosCount = filteredChecklists.filter(r => parseFotos(r.fotosChecklistDescida).length > 0 && parseFotos(r.fotosChecklistSubida).length > 0).length;
  const naAguaCount = filteredChecklists.filter(r => r.horaDescida && !r.horaSubida).length;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredChecklists.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredChecklists.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, angleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAngle(angleId);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Falha no upload');
      const dataRes = await res.json();
      
      setChecklistFotos(prev => ({
        ...prev,
        [angleId]: [...(prev[angleId] || []), dataRes.url]
      }));
    } catch (err) {
      alert('Erro ao enviar foto.');
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleSaveAvulsoChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoatId) {
      alert('Selecione uma embarcação.');
      return;
    }

    setIsSubmitting(true);
    const allPhotoUrls = Object.values(checklistFotos).flat();
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newReserva: Partial<Reserva> = {
      id: `chk_${Date.now()}`,
      data: selectedDate,
      embarcacaoId: selectedBoatId,
      clienteId: selectedClientId || getEmbarcacao(selectedBoatId)?.donos?.[0] || '',
      status: 'confirmado',
      statusMarina: checklistMode === 'subida' ? 'guardada' : checklistMode === 'chegada' ? 'chegada' : 'descida',
      createdAt: new Date().toISOString()
    };

    if (checklistMode === 'descida') {
      newReserva.horaDescida = horaAtual;
      newReserva.fotosChecklistDescida = allPhotoUrls;
      newReserva.observacoesChecklistDescida = checklistObservacoes;
      newReserva.operadorDescida = operadorNome || 'Operador';
    } else if (checklistMode === 'chegada') {
      newReserva.horaChegada = horaAtual;
      newReserva.fotosChecklistChegada = allPhotoUrls;
      newReserva.observacoesChecklistChegada = checklistObservacoes;
      newReserva.operadorChegada = operadorNome || 'Operador';
    } else {
      newReserva.horaSubida = horaAtual;
      newReserva.fotosChecklistSubida = allPhotoUrls;
      newReserva.observacoesChecklistSubida = checklistObservacoes;
      newReserva.operadorSubida = operadorNome || 'Operador';
    }

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: newReserva })
      });
      
      if (setData) {
        setData((prev: any) => ({
          ...prev,
          reservations: [...(prev.reservations || []), newReserva]
        }));
      }

      await logAction(`Checklist ${checklistMode}`, `Checklist salvo avulso.`, selectedBoatId, operadorNome);
      setIsNewChecklistOpen(false);
      alert('Checklist salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar checklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-800 font-sans relative pb-24">
      
      {/* Outer Card Canvas (Biosynthesia Aesthetic) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Checklists & Vistorias</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gerencie auditorias fotográficas nos 6 ângulos (incluindo o Casco) e relatórios de conservação.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Navigator Pill */}
            <div className="flex items-center bg-slate-100 border border-slate-200/80 rounded-xl p-1">
              <button onClick={handlePrevDay} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-800 font-mono capitalize">{displayDateStr}</span>
              <button onClick={handleNextDay} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar</span>
            </button>

              <button 
                onClick={() => {
                  setSelectedBoatId('');
                  setSelectedClientId('');
                  setChecklistMode('descida');
                  setChecklistFotos({});
                  setChecklistObservacoes('');
                  setIsNewChecklistOpen(true);
                }}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Checklist</span>
            </button>
          </div>
        </div>

        {/* Biosynthesia 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI Card 1: Total Checklists */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Checklists</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalCount}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+4.2%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Últimos 7 dias</span>
            </div>
          </div>

          {/* KPI Card 2: Fotos do Casco */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fotos de Casco</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">{cascoCount}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+12.5%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Ângulo Inferior</span>
            </div>
          </div>

          {/* KPI Card 3: Completos */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completos (Entrada/Saída)</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">{completosCount}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>-1.4%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Últimos 7 dias</span>
            </div>
          </div>

          {/* KPI Card 4: Na Água Agora */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Embarcações na Água</span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-900">{naAguaCount}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+2.1%</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Em navegação</span>
            </div>
          </div>

        </div>

        {/* Search, Filter & Tabs Bar (Biosynthesia Bar) */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-2">
          
          {/* Left: Search Box + Filter Button */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por barco, cliente ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white font-medium transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button className="px-3.5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span>Filtros</span>
            </button>
          </div>

          {/* Right: Tab Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-full lg:w-auto overflow-x-auto subtle-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'casco', label: 'Com Foto do Casco' },
              { id: 'completos', label: 'Completos' },
              { id: 'pendentes', label: 'Pendentes' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPhotoFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  photoFilter === tab.id ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Clean Data Table */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
          {filteredChecklists.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <Camera className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Nenhum registro encontrado com a busca atual.</p>
              <p className="text-[11px] text-slate-400">Tente ajustar seus filtros de busca ou período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === filteredChecklists.length && filteredChecklists.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Embarcação</th>
                    <th className="p-3.5">Código & Data</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5 text-center">Fotos por Ângulo</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredChecklists.map(reserva => {
                    const boat = getEmbarcacao(reserva.embarcacaoId);
                    const client = getCliente(reserva.clienteId);
                    const isSelected = selectedIds.includes(reserva.id);
                    
                    const descidaFotos = parseFotos(reserva.fotosChecklistDescida || reserva.fotosChecklistSaida);
                    const subidaFotos = parseFotos(reserva.fotosChecklistSubida);
                    const totalFotos = descidaFotos.concat(subidaFotos);

                    const hasCasco = totalFotos.some(f => f.toLowerCase().includes('casco'));

                    return (
                      <tr 
                        key={reserva.id} 
                        className={`transition-colors hover:bg-slate-50/60 ${isSelected ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectOne(reserva.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                          />
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            {boat?.imagemUrl ? (
                              <img src={boat.imagemUrl} alt={boat.nome} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200/80">
                                {boat?.nome ? boat.nome.substring(0, 2).toUpperCase() : 'BT'}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">{getBoatCode(boat)}</span>
                              <span className="text-[11px] text-slate-400 font-medium block">Vaga: {boat?.vaga || 'N/A'} • {boat?.modelo || 'Lancha'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-800 block text-[11px]">#{reserva.id.substring(reserva.id.length - 8)}</span>
                          <span className="text-[11px] text-slate-400 font-medium block">{reserva.data}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800 block">{client?.nome || 'Cliente'}</span>
                          <span className="text-[11px] text-slate-400 font-mono block">CPF: {client?.cpf || 'N/I'}</span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              descidaFotos.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-400'
                            }`}>
                              Descida ({descidaFotos.length})
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              subidaFotos.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-400'
                            }`}>
                              Subida ({subidaFotos.length})
                            </span>

                            {hasCasco && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                <span>Casco</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setInspectionReserva(reserva)}
                            className="px-3.5 py-1.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspecionar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Floating Action Bar at Bottom (When 1+ Items Selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200/90 shadow-2xl rounded-2xl px-5 py-3 flex items-center space-x-4 animate-slide-up-fast">
          <span className="text-xs font-black text-slate-900">{selectedIds.length} Selecionado(s)</span>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <button 
            onClick={() => window.print()} 
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
          <button 
            onClick={() => setSelectedIds([])} 
            className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Inspeção HD */}
      {inspectionReserva && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-extrabold uppercase tracking-wider mb-1 inline-block">
                  Relatório de Vistoria Fotográfica
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {getBoatCode(getEmbarcacao(inspectionReserva.embarcacaoId))}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cliente: {getCliente(inspectionReserva.clienteId)?.nome || 'Cliente'} • Data: {inspectionReserva.data}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyShareLink(inspectionReserva.id)}
                  className={`px-3.5 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedLink 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                      : 'border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                  title="Copiar Link Compartilhável da Vistoria"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Gerar Link'}</span>
                </button>
                <button 
                  onClick={() => setInspectionReserva(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 subtle-scrollbar">
              {['descida', 'chegada', 'subida'].map(phase => {
                const photos = parseFotos(
                  phase === 'descida' ? (inspectionReserva.fotosChecklistDescida || inspectionReserva.fotosChecklistSaida) :
                  phase === 'chegada' ? inspectionReserva.fotosChecklistChegada :
                  inspectionReserva.fotosChecklistSubida
                );

                if (photos.length === 0) return null;

                return (
                  <div key={phase} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-sm text-slate-900 capitalize flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#2563EB]" />
                        <span>Checklist de {phase} ({photos.length} Fotos)</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {phase === 'descida' ? inspectionReserva.horaDescida : phase === 'chegada' ? inspectionReserva.horaChegada : inspectionReserva.horaSubida}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos.map((url, i) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video shadow-2xs hover:shadow-md transition-all cursor-pointer" onClick={() => openLightboxForPhase(phase, i)}>
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> Ampliar
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
              {(() => {
                const boat = getEmbarcacao(inspectionReserva.embarcacaoId);
                const isJet = boat 
                  ? (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet'))
                  : ((inspectionReserva as any)?.embarcacaoTipo === 'jet' || ((inspectionReserva as any)?.barcoNome || (inspectionReserva as any)?.embarcacaoNome || '').toLowerCase().includes('jet'));

                if (isJet) {
                  return inspectionReserva.checklistObservacoes ? (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs text-slate-700 font-medium">
                        <span className="font-bold text-slate-900 block text-xs uppercase mb-1">Observações do Marinheiro:</span>
                        <p>{inspectionReserva.checklistObservacoes}</p>
                      </div>
                    </div>
                  ) : null;
                }

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>Segurança & Equipamentos da Lancha</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        inspectionReserva.checklistEquipamentos?.som !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Som</span>
                        <span>{inspectionReserva.checklistEquipamentos?.som !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        inspectionReserva.checklistEquipamentos?.boias !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><LifeBuoy className="w-4 h-4" /> Bóias</span>
                        <span>{inspectionReserva.checklistEquipamentos?.boias !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        inspectionReserva.checklistEquipamentos?.coletes !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Coletes</span>
                        <span>{inspectionReserva.checklistEquipamentos?.coletes !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        inspectionReserva.checklistEquipamentos?.extintor !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Flame className="w-4 h-4" /> Extintor</span>
                        <span>{inspectionReserva.checklistEquipamentos?.extintor !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                    </div>
                    {inspectionReserva.checklistObservacoes && (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs text-slate-700 font-medium mt-2">
                        <span className="font-bold text-slate-900 block text-xs uppercase mb-1">Observações do Marinheiro:</span>
                        <p>{inspectionReserva.checklistObservacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setInspectionReserva(null)}
                className="px-6 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Fechar Vistoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Checklist Avulso */}
      {isNewChecklistOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2563EB]" />
                <span>Novo Checklist Fotográfico</span>
              </h3>
              <button onClick={() => setIsNewChecklistOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAvulsoChecklist} className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Selecione a Embarcação *</label>
                <select
                  value={selectedBoatId}
                  onChange={(e) => {
                    setSelectedBoatId(e.target.value);
                    const b = getEmbarcacao(e.target.value);
                    if (b?.donos?.[0]) setSelectedClientId(b.donos[0]);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="">Selecione a lancha ou jet...</option>
                  {(data?.boats || []).map(b => (
                    <option key={b.id} value={b.id}>{getBoatCode(b)} ({b.vaga || 'Sem Vaga'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tipo de Checklist *</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {(['descida', 'chegada', 'subida'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChecklistMode(mode)}
                      className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all ${
                        checklistMode === mode ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload nos 6 Ângulos */}
              <div className="space-y-2 pt-2">
                <label className="font-bold text-slate-700 block">Upload de Fotos nos 6 Ângulos:</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHECKLIST_ANGLES.map(angle => (
                    <label key={angle.id} className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between">
                      <span className="font-semibold text-slate-700 text-[11px] truncate">{angle.label}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadPhoto(e, angle.id)}
                      />
                      <span className="text-[10px] font-bold text-[#2563EB] font-mono">
                        {checklistFotos[angle.id]?.length || 0} 📸
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detalhes / Observações</label>
                <textarea
                  value={checklistObservacoes}
                  onChange={(e) => setChecklistObservacoes(e.target.value)}
                  placeholder="Alguma avaria, item faltando, ou observação importante?"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none min-h-[80px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewChecklistOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBoatId}
                  className="px-4 py-2 bg-[#2563EB] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Checklist</span>
                </button>
              </div>
            </form>
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
                 src={lightbox.photos[lightbox.currentIndex].url} 
                 alt="Zoomed" 
                 className="max-w-full max-h-[70vh] object-contain" 
               />
             </div>
             <div className="mt-6 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 w-full max-w-2xl shadow-xl flex items-center justify-between text-slate-200">
               <div>
                 <h4 className="font-bold text-white uppercase tracking-wider text-sm">{lightbox.photos[lightbox.currentIndex].title}</h4>
                 <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                   <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {lightbox.photos[lightbox.currentIndex].time}</span>
                   <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {lightbox.photos[lightbox.currentIndex].operador}</span>
                 </div>
               </div>
               <div className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
                 {lightbox.currentIndex + 1} / {lightbox.photos.length}
               </div>
             </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, currentIndex: Math.min(prev.photos.length - 1, prev.currentIndex + 1) } : null) }}
            className={`absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10 backdrop-blur-md ${lightbox.currentIndex === lightbox.photos.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={lightbox.currentIndex === lightbox.photos.length - 1}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

    </div>
  );
}
