import React, { useState } from 'react';
import { 
  Camera, ChevronLeft, ChevronRight, CheckCircle2, Ship, User as UserIcon, 
  Droplets, MapPin, Clock, Search, Filter, Layers, Navigation, Anchor, 
  Eye, FileText, Download, Printer, Check, X, ShieldAlert, ArrowUpRight, Plus, Loader2, Save
} from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';
import { logAction } from '../db';

const CHECKLIST_ANGLES = [
  { id: 'proa', label: 'Proa (Frente)', icon: Navigation },
  { id: 'popa', label: 'Popa (Motor/Traseira)', icon: Anchor },
  { id: 'bombordo', label: 'Lateral Esquerda', icon: Camera },
  { id: 'estibordo', label: 'Lateral Direita', icon: Camera },
  { id: 'painel', label: 'Interior / Painel', icon: Ship },
  { id: 'casco', label: 'Casco (Ângulo Inferior)', icon: Layers }
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

  // Search & Advanced Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'todos' | 'casco' | 'completos' | 'pendentes'>('todos');
  
  // Inspection Modal State
  const [inspectionReserva, setInspectionReserva] = useState<Reserva | null>(null);
  const [activePhotoAngle, setActivePhotoAngle] = useState<string>('todos');

  // New Checklist Modal State
  const [isNewChecklistOpen, setIsNewChecklistOpen] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
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
      const hasCasco = totalFotos.some(url => url.toLowerCase().includes('casco'));
      return hasCasco;
    } else if (photoFilter === 'completos') {
      return descidaFotos.length >= 4 || subidaFotos.length >= 4;
    } else if (photoFilter === 'pendentes') {
      return totalFotos.length === 0;
    }

    return true;
  });

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
      statusMarina: checklistMode === 'subida' ? 'guardada' : checklistMode === 'chegada' ? 'chegada' : 'pronta',
      createdAt: new Date().toISOString()
    };

    if (checklistMode === 'descida') {
      newReserva.horaDescida = horaAtual;
      newReserva.fotosChecklistDescida = allPhotoUrls;
      newReserva.operadorDescida = operadorNome || 'Operador';
    } else if (checklistMode === 'chegada') {
      newReserva.horaChegada = horaAtual;
      newReserva.fotosChecklistChegada = allPhotoUrls;
      newReserva.operadorChegada = operadorNome || 'Operador';
    } else {
      newReserva.horaSubida = horaAtual;
      newReserva.fotosChecklistSubida = allPhotoUrls;
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
    <div className="w-full max-w-7xl mx-auto space-y-4 text-slate-800">
      
      {/* Top Header Administrativo de Checklists */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200 mb-1 inline-block">
            Central de Auditoria
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>Visualizador Administrativo de Checklists</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Inspeção fotográfica de 6 ângulos (incluindo o Casco) e registros de segurança das embarcações.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Navegador de Data */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button onClick={handlePrevDay} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 font-mono capitalize">{displayDateStr}</span>
            <button onClick={handleNextDay} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setIsNewChecklistOpen(true);
              setSelectedBoatId('');
              setSelectedClientId('');
              setChecklistFotos({});
              setChecklistMode('descida');
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Campo de Pesquisa Global */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar barco, cliente, CPF, vaga ou marinheiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Categoria de Foto */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto overflow-x-auto subtle-scrollbar">
          {[
            { id: 'todos', label: 'Todos os Registros' },
            { id: 'casco', label: 'Com Foto do Casco' },
            { id: 'completos', label: 'Fotos Completas' },
            { id: 'pendentes', label: 'Sem Fotos' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setPhotoFilter(f.id as any)}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                photoFilter === f.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Administrativa Densa (Desktop Data Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredChecklists.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Camera className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">Nenhum registro de checklist encontrado para esta busca.</p>
            <p className="text-[11px] text-slate-400">Tente alterar o termo de pesquisa ou a data selecionada no topo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Embarcação / Vaga</th>
                  <th className="p-3.5">Cliente / Responsável</th>
                  <th className="p-3.5">Horários da Operação</th>
                  <th className="p-3.5">Marinheiro / Operador</th>
                  <th className="p-3.5 text-center">Registros (6 Ângulos)</th>
                  <th className="p-3.5 text-right">Ação / Vistoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredChecklists.map(reserva => {
                  const boat = getEmbarcacao(reserva.embarcacaoId);
                  const client = getCliente(reserva.clienteId);
                  
                  const descidaFotos = parseFotos(reserva.fotosChecklistDescida || reserva.fotosChecklistSaida);
                  const chegadaFotos = parseFotos(reserva.fotosChecklistChegada);
                  const subidaFotos = parseFotos(reserva.fotosChecklistSubida);
                  const totalFotos = descidaFotos.concat(chegadaFotos).concat(subidaFotos);

                  const hasCasco = totalFotos.some(f => f.toLowerCase().includes('casco'));

                  return (
                    <tr key={reserva.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                            <Ship className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block text-sm">{boat?.nome || 'Embarcação'}</span>
                            <span className="text-[11px] text-slate-400 font-semibold block">Vaga: {boat?.vaga || 'N/A'} • {boat?.modelo || 'Lancha'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">{client?.nome || 'Cliente'}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">CPF: {client?.cpf || 'N/I'}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {reserva.horaDescida && (
                            <span className="text-amber-700 font-bold block">Descida: {reserva.horaDescida}</span>
                          )}
                          {reserva.horaChegada && (
                            <span className="text-blue-700 font-bold block">Chegada: {reserva.horaChegada}</span>
                          )}
                          {reserva.horaSubida && (
                            <span className="text-emerald-700 font-bold block">Subida: {reserva.horaSubida}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-700 block">
                          {reserva.operadorDescida || reserva.operadorSubida || 'Operador Marina'}
                        </span>
                        <span className="text-[10px] text-slate-400 block uppercase">Inspeção Concluída</span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            descidaFotos.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            Descida ({descidaFotos.length})
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            subidaFotos.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            Subida ({subidaFotos.length})
                          </span>

                          {hasCasco && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>Casco OK</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setInspectionReserva(reserva)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Modal / Drawer de Inspeção Executiva Fotográfica (HD 6 Ângulos) */}
      {inspectionReserva && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider mb-1 inline-block">
                  Relatório de Vistoria Fotográfica
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {getEmbarcacao(inspectionReserva.embarcacaoId)?.nome || 'Embarcação'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cliente: {getCliente(inspectionReserva.clienteId)?.nome || 'Cliente'} • Data: {inspectionReserva.data}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-white flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button 
                  onClick={() => setInspectionReserva(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 subtle-scrollbar">
              
              {/* Photos Gallery per Phase */}
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
                      <h4 className="font-extrabold text-sm text-slate-900 capitalize flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Checklist de {phase} ({photos.length} Fotos)</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {phase === 'descida' ? inspectionReserva.horaDescida : phase === 'chegada' ? inspectionReserva.horaChegada : inspectionReserva.horaSubida}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos.map((url, i) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video shadow-xs hover:shadow-md transition-all">
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ampliar HD</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
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
                <Camera className="w-4 h-4 text-blue-600" />
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
                    <option key={b.id} value={b.id}>{b.nome} ({b.vaga || 'Sem Vaga'})</option>
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
                        checklistMode === mode ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
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
                      <span className="text-[10px] font-bold text-blue-600 font-mono">
                        {checklistFotos[angle.id]?.length || 0} 📸
                      </span>
                    </label>
                  ))}
                </div>
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
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Checklist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
