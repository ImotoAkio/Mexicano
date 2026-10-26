import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  RefreshCw,
  Compass,
  Search,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  Users,
  Edit3,
  Ship,
  User,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  ArrowUpRight,
  Check,
  MapPin,
  X
} from 'lucide-react';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { getBoatCode } from '../utils/boatUtils';
import PlanoNavegacaoModal from './PlanoNavegacaoModal';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';
import logoMarinaSrc from '../../logos/logo_marina.svg';

interface AvisosSaidaPageProps {
  reservations?: any[];
  boats?: any[];
  clients?: any[];
}

export default function AvisosSaidaPage({
  reservations: propsReservations,
  boats: propsBoats,
  clients: propsClients
}: AvisosSaidaPageProps) {
  // Navigation: 'clientes' (Planos dos Clientes) vs 'gerador' (Gerador Manual / Em Branco)
  const [activeSection, setActiveSection] = useState<'clientes' | 'gerador'>('clientes');
  
  // View mode for client plans: 'tabela' (default, highly scanable) or 'cards' (clean flat cards)
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>('tabela');

  // Form fields (Gerador Manual)
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [nomeEmbarcacao, setNomeEmbarcacao] = useState('');
  const [pessoasABordo, setPessoasABordo] = useState('');
  const [destino, setDestino] = useState('');
  const [previsaoSaida, setPrevisaoSaida] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [observacao, setObservacao] = useState('');

  const userRole = (localStorage.getItem('admin_role') || '').toLowerCase().trim();
  const isGerente = userRole === 'marina_gerente';

  // Logo and Header options
  const [logoOption, setLogoOption] = useState<'default' | 'empty' | 'custom'>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_logoOption')) 
      ? (localStorage.getItem('avisos_saida_logoOption') as 'default' | 'empty' | 'custom') 
      : 'default';
  });
  const [customLogoBase64, setCustomLogoBase64] = useState<string>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_customLogo')) || '';
  });
  const [customLogoName, setCustomLogoName] = useState<string>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_customLogoName')) || '';
  });
  const [bannerText, setBannerText] = useState(() => {
    if (isGerente) {
      const saved = localStorage.getItem('avisos_saida_bannerText');
      if (saved && saved !== 'VILA NÁUTICA') return saved;
      return 'MARINA CLUB VELHO CHICO';
    }
    return 'VILA NÁUTICA';
  });

  // Save preferences for Gerente Marina
  useEffect(() => {
    if (isGerente) {
      localStorage.setItem('avisos_saida_logoOption', logoOption);
      localStorage.setItem('avisos_saida_customLogo', customLogoBase64);
      localStorage.setItem('avisos_saida_customLogoName', customLogoName);
      localStorage.setItem('avisos_saida_bannerText', bannerText);
    }
  }, [isGerente, logoOption, customLogoBase64, customLogoName, bannerText]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client Navigation Plans Data
  const [liveReservas, setLiveReservas] = useState<any[]>(propsReservations || []);
  const [liveBoats, setLiveBoats] = useState<any[]>(propsBoats || []);
  const [liveClients, setLiveClients] = useState<any[]>(propsClients || []);

  // Selected date filter (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'confirmados' | 'pendentes'>('todos');

  // Modal de Detalhes do Plano
  const [modalReserva, setModalReserva] = useState<any | null>(null);

  // Sync props data or fetch from API
  useEffect(() => {
    if (propsReservations && propsReservations.length > 0) setLiveReservas(propsReservations);
    if (propsBoats && propsBoats.length > 0) setLiveBoats(propsBoats);
    if (propsClients && propsClients.length > 0) setLiveClients(propsClients);

    if (!propsReservations || propsReservations.length === 0) {
      const token = localStorage.getItem('admin_token');
      fetch('/api/marina/agendamentos', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLiveReservas(data);
        })
        .catch(() => {});
    }
  }, [propsReservations, propsBoats, propsClients]);

  // Helpers
  const getEmbarcacao = (id: string, r?: any) => {
    if (liveBoats.length > 0) {
      const b = liveBoats.find(item => item.id === id);
      if (b) return b;
    }
    return {
      id,
      nome: r?.embarcacaoNome || r?.modeloAvulso || 'Embarcação',
      tipo: r?.embarcacaoTipo || r?.tipoAvulso || 'lancha',
      vaga: r?.embarcacaoVaga
    };
  };

  const getCliente = (id: string, r?: any) => {
    if (liveClients.length > 0) {
      const c = liveClients.find(item => item.id === id);
      if (c) return c;
    }
    return {
      id,
      nome: r?.clienteNome || r?.nomeAvulso || 'Cliente',
      telefone: r?.clienteTelefone || r?.telefoneAvulso
    };
  };

  // Filtered reservations
  const filteredReservas = useMemo(() => {
    return liveReservas.filter((r: any) => {
      if (selectedDate && r.data !== selectedDate) return false;
      if (r.status === 'cancelado') return false;

      const isConfirmed = r.status === 'confirmado' || r.statusMarina === 'confirmada' || !!r.destino;
      if (statusFilter === 'confirmados' && !isConfirmed) return false;
      if (statusFilter === 'pendentes' && isConfirmed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const b = getEmbarcacao(r.embarcacaoId, r);
        const c = getCliente(r.clienteId, r);
        const bNome = (b?.nome || r.modeloAvulso || '').toLowerCase();
        const cNome = (c?.nome || r.nomeAvulso || '').toLowerCase();
        const dest = (r.destino || '').toLowerCase();
        const vaga = (b?.vaga || r.embarcacaoVaga || '').toLowerCase();
        if (!bNome.includes(q) && !cNome.includes(q) && !dest.includes(q) && !vaga.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      const horaA = a.previsaoSaida || a.horaSaida || '99:99';
      const horaB = b.previsaoSaida || b.horaSaida || '99:99';
      return horaA.localeCompare(horaB);
    });
  }, [liveReservas, selectedDate, statusFilter, searchQuery, liveBoats, liveClients]);

  // Handle custom logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomLogoName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomLogoBase64(event.target.result as string);
          setLogoOption('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogoUpload = () => {
    setCustomLogoBase64('');
    setCustomLogoName('');
    setLogoOption('default');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Set mock data
  const handleLoadMockData = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR');
    
    setData(formattedDate);
    setNome('MARCOS SILVA');
    setTipo('LANCHA');
    setNomeEmbarcacao('FALCON 320');
    setPessoasABordo('06');
    setDestino('ILHA DO RODEADOURO');
    setPrevisaoSaida('10:00');
    setPrevisaoChegada('18:00');
    setObservacao('NENHUMA');
  };

  // Clear all fields
  const handleClearAll = () => {
    setData('');
    setNome('');
    setTipo('');
    setNomeEmbarcacao('');
    setPessoasABordo('');
    setDestino('');
    setPrevisaoSaida('');
    setPrevisaoChegada('');
    setObservacao('');
  };

  // Carregar dados de uma reserva específica no gerador manual
  const handleLoadReservaToForm = (reserva: any) => {
    const boat = getEmbarcacao(reserva.embarcacaoId, reserva);
    const client = getCliente(reserva.clienteId, reserva);

    let formattedDate = reserva.data || '';
    if (formattedDate.includes('-')) {
      const parts = formattedDate.split('-');
      if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    setData(formattedDate);
    setNome(client?.nome || reserva.nomeAvulso || reserva.clienteNome || '');
    setTipo((boat?.tipo === 'jet' || reserva.tipoAvulso === 'jet') ? 'JET SKI' : 'LANCHA');
    setNomeEmbarcacao(boat ? getBoatCode(boat) : (reserva.modeloAvulso || ''));
    setPessoasABordo(String(reserva.pessoasABordo || '2'));
    setDestino(reserva.destino || 'ILHA DO RODEADOURO');
    setPrevisaoSaida(reserva.previsaoSaida || '09:00');
    setPrevisaoChegada(reserva.previsaoChegada || '17:00');
    setObservacao(reserva.observações || 'NENHUMA');

    setActiveSection('gerador');
  };

  // Impressão rápida de uma reserva
  const handleQuickPrintReserva = async (reserva: any, action: 'print' | 'download') => {
    const boat = getEmbarcacao(reserva.embarcacaoId, reserva);
    const client = getCliente(reserva.clienteId, reserva);

    let formattedDate = reserva.data || '';
    if (formattedDate.includes('-')) {
      const parts = formattedDate.split('-');
      if (parts.length === 3) formattedDate = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }

    let effectiveLogo: string | undefined = undefined;
    if (logoOption === 'empty') {
      effectiveLogo = 'empty';
    } else if (logoOption === 'custom') {
      effectiveLogo = customLogoBase64;
    } else if (isGerente && logoOption === 'default') {
      effectiveLogo = logoMarinaSrc;
    }

    try {
      await generateAvisoSaidaPDF({
        data: formattedDate || ' ',
        nome: client?.nome || reserva.nomeAvulso || reserva.clienteNome || ' ',
        tipo: (boat?.tipo === 'jet' || reserva.tipoAvulso === 'jet') ? 'Jetski' : 'Lancha',
        nomeEmbarcacao: boat ? getBoatCode(boat) : (reserva.modeloAvulso || 'Embarcação'),
        pessoasABordo: String(reserva.pessoasABordo || '02'),
        destino: reserva.destino || 'Não informado',
        previsaoSaida: reserva.previsaoSaida || (reserva.periodo === 'tarde' ? '13:00' : '09:00'),
        previsaoChegada: reserva.previsaoChegada || (reserva.periodo === 'manha' ? '13:00' : '17:00'),
        observacao: reserva.observações || 'Nenhuma'
      }, {
        autoPrint: action === 'print',
        download: action === 'download',
        logoUrl: effectiveLogo,
        bannerText: bannerText || (isGerente ? 'MARINA CLUB VELHO CHICO' : 'VILA NÁUTICA')
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar documento.');
    }
  };

  // Generate PDF from manual form
  const handleGeneratePDF = async (action: 'print' | 'download') => {
    let logoUrl: string | undefined = undefined;
    if (logoOption === 'empty') {
      logoUrl = 'empty';
    } else if (logoOption === 'custom') {
      logoUrl = customLogoBase64;
    } else if (isGerente && logoOption === 'default') {
      logoUrl = logoMarinaSrc;
    }

    const pdfData = {
      data: data || ' ',
      nome: nome || ' ',
      tipo: tipo || ' ',
      nomeEmbarcacao: nomeEmbarcacao || ' ',
      pessoasABordo: pessoasABordo || ' ',
      destino: destino || ' ',
      previsaoSaida: previsaoSaida || ' ',
      previsaoChegada: previsaoChegada || ' ',
      observacao: observacao || ' '
    };

    try {
      await generateAvisoSaidaPDF(pdfData, {
        autoPrint: action === 'print',
        download: action === 'download',
        logoUrl,
        bannerText: bannerText || (isGerente ? 'MARINA CLUB VELHO CHICO' : 'VILA NÁUTICA')
      });
    } catch (err) {
      console.error('Erro ao gerar o PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF. Verifique se o logotipo carregado é válido.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Refined Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200/80 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#B69D74]" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Planos de Navegação
            </h1>
            <span className="text-[11px] font-medium text-slate-400">
              NORMAM-211 / ANEXO 4-A
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe as confirmações de saída dos clientes e emita avisos oficiais.
          </p>
        </div>

        {/* Minimalist Tab Navigation */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveSection('clientes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSection === 'clientes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Planos dos Clientes</span>
            {filteredReservas.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-700">
                {filteredReservas.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('gerador')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'gerador'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Gerador Manual</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PLANOS DOS CLIENTES */}
      {activeSection === 'clientes' && (
        <div className="space-y-4">
          
          {/* Calm, Unified Filter Bar */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, barco, vaga ou destino..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B69D74] focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls: Date, Status, View Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Input */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-xs text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                />
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="ml-1 text-[11px] font-semibold text-[#B69D74] hover:underline cursor-pointer"
                  >
                    Hoje
                  </button>
                )}
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="ml-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Todas
                  </button>
                )}
              </div>

              {/* Status Segmented Control */}
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('todos')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'todos' ? 'bg-white shadow-2xs text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('confirmados')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'confirmados' ? 'bg-white shadow-2xs text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Confirmados
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pendentes')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'pendentes' ? 'bg-white shadow-2xs text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pendentes
                </button>
              </div>

              {/* Layout Switcher (Table vs Cards) */}
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('tabela')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'tabela' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Visualização em Tabela (Limpa)"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredReservas.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/70 p-12 text-center">
              <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-slate-700">
                Nenhum plano de navegação encontrado
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Não há confirmações ou reservas com os filtros selecionados.
              </p>
              <button
                type="button"
                onClick={() => { setSelectedDate(''); setStatusFilter('todos'); setSearchQuery(''); }}
                className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : viewMode === 'tabela' ? (
            
            /* TABELA EXECUTIVA (Zero Poluição Visual, Máxima Produtividade) */
            <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4 font-semibold">Horários</th>
                      <th className="py-2.5 px-4 font-semibold">Embarcação</th>
                      <th className="py-2.5 px-4 font-semibold">Cliente / Comandante</th>
                      <th className="py-2.5 px-4 font-semibold">Destino Pretendido</th>
                      <th className="py-2.5 px-4 font-semibold">A Bordo</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredReservas.map((reserva: any) => {
                      const boat = getEmbarcacao(reserva.embarcacaoId, reserva);
                      const client = getCliente(reserva.clienteId, reserva);
                      const isConfirmed = reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada' || !!reserva.destino;

                      return (
                        <tr 
                          key={reserva.id}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                          onClick={() => setModalReserva(reserva)}
                        >
                          {/* Horários */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-slate-900">
                                {reserva.previsaoSaida || '09:00'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Ret: {reserva.previsaoChegada || '17:00'}
                              </span>
                            </div>
                          </td>

                          {/* Embarcação */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900">
                                  {boat ? getBoatCode(boat) : (reserva.modeloAvulso || 'Embarcação')}
                                </span>
                                {boat?.vaga && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    • Vaga {boat.vaga}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {boat?.tipo || reserva.embarcacaoTipo || 'Lancha'}
                              </span>
                            </div>
                          </td>

                          {/* Cliente */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800 truncate max-w-[180px]">
                                {client?.nome || reserva.nomeAvulso || 'Cliente'}
                              </span>
                              {client?.telefone && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {client.telefone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Destino */}
                          <td className="py-3 px-4">
                            {reserva.destino ? (
                              <span className="font-medium text-slate-900 flex items-center gap-1 truncate max-w-[220px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{reserva.destino}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Não informado</span>
                            )}
                          </td>

                          {/* A Bordo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-700 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{reserva.pessoasABordo || '2'}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                              <span className={`text-[11px] font-medium ${isConfirmed ? 'text-slate-800' : 'text-slate-500'}`}>
                                {isConfirmed ? 'Confirmado' : 'Aguardando'}
                              </span>
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setModalReserva(reserva)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                                title="Ver Detalhes do Plano"
                              >
                                Ver Plano
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickPrintReserva(reserva, 'print')}
                                title="Imprimir NORMAM"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickPrintReserva(reserva, 'download')}
                                title="Baixar PDF"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadReservaToForm(reserva)}
                                title="Editar no Gerador Manual"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (

            /* CARDS MINIMALISTAS (Sem caixas aninhadas, sem arco-íris de cores) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredReservas.map((reserva: any) => {
                const boat = getEmbarcacao(reserva.embarcacaoId, reserva);
                const client = getCliente(reserva.clienteId, reserva);
                const isConfirmed = reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada' || !!reserva.destino;

                let acessorios: any = reserva.acessoriosSolicitados;
                if (typeof acessorios === 'string') {
                  try { acessorios = JSON.parse(acessorios); } catch {}
                }

                return (
                  <div
                    key={reserva.id}
                    className="bg-white rounded-xl border border-slate-200/80 p-4 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Header: boat & status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">
                            {boat ? getBoatCode(boat) : (reserva.modeloAvulso || 'Embarcação')}
                          </span>
                          {boat?.vaga && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Vaga {boat.vaga}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {client?.nome || reserva.nomeAvulso || 'Cliente'}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span>{isConfirmed ? 'Confirmado' : 'Aguardando'}</span>
                      </span>
                    </div>

                    {/* Navigation details (clear text, no loud colored containers) */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Destino:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[180px]">
                          {reserva.destino || 'Não informado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Horários:</span>
                        <span className="font-mono text-slate-800 font-medium">
                          {reserva.previsaoSaida || '09:00'} → {reserva.previsaoChegada || '17:00'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Lotação:</span>
                        <span className="font-medium text-slate-800">
                          {reserva.pessoasABordo || '2'} pessoas
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModalReserva(reserva)}
                        className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Ver Detalhes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickPrintReserva(reserva, 'print')}
                        title="Imprimir NORMAM"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickPrintReserva(reserva, 'download')}
                        title="Baixar PDF"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadReservaToForm(reserva)}
                        title="Editar no Gerador Manual"
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: GERADOR MANUAL & CONFIGURAÇÃO */}
      {activeSection === 'gerador' && (
        <div className="space-y-6">
          
          {/* Quick bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/70 text-xs">
            <span className="text-slate-500 font-medium">
              Gere formulários personalizados ou imprima modelos em branco.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMockData}
                className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Exemplo
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-slate-500 hover:text-rose-600 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Identity Settings */}
              <div className="bg-white rounded-xl border border-slate-200/70 p-4 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Identidade do Documento
                </span>
                
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Cabeçalho
                  </label>
                  <input
                    type="text"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder={isGerente ? 'Ex: MARINA CLUB VELHO CHICO' : 'Ex: VILA NÁUTICA'}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#B69D74]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Logotipo
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setLogoOption('default')}
                      className={`py-1.5 px-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                        logoOption === 'default'
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Marina
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoOption('empty')}
                      className={`py-1.5 px-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                        logoOption === 'empty'
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Sem Logo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customLogoBase64) setLogoOption('custom');
                        else fileInputRef.current?.click();
                      }}
                      className={`py-1.5 px-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                        logoOption === 'custom'
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Upload
                    </button>
                  </div>

                  {logoOption === 'custom' && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[180px]">{customLogoName || 'Logo carregado'}</span>
                      <button
                        type="button"
                        onClick={clearLogoUpload}
                        className="text-rose-600 hover:underline text-[11px] font-medium"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Data */}
              <div className="bg-white rounded-xl border border-slate-200/70 p-4 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Dados do Formulário
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Data</label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Tipo</label>
                    <input
                      type="text"
                      placeholder="Lancha / Jetski"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Cliente</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Embarcação</label>
                    <input
                      type="text"
                      placeholder="Nome ou código"
                      value={nomeEmbarcacao}
                      onChange={(e) => setNomeEmbarcacao(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">A Bordo</label>
                    <input
                      type="text"
                      placeholder="02"
                      value={pessoasABordo}
                      onChange={(e) => setPessoasABordo(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Saída</label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={previsaoSaida}
                      onChange={(e) => setPrevisaoSaida(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Retorno</label>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={previsaoChegada}
                      onChange={(e) => setPrevisaoChegada(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] text-slate-500">Destino</label>
                    <span className="text-[9px] text-slate-400">Atalhos</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Ilha do Rodeadouro"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs mb-1.5"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['Ilha do Maroto', 'Ilha do Rodeadouro', 'Ponte Presidente Dutra'].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setDestino(sug)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                          destino === sug ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Observações</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                {/* Primary Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGeneratePDF('print')}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Documento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGeneratePDF('download')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Document Preview (Quiet, Elegant) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl border border-slate-200/70 p-6 shadow-2xs font-sans">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium">Pré-visualização do Formato Oficial</span>
                  <span className="text-slate-500 font-mono text-[11px]">NORMAM-211/DPC</span>
                </div>

                <div className="text-center my-4">
                  <h4 className="text-xs font-semibold text-slate-500 tracking-wider">ANEXO 4-A</h4>
                  <h3 className="text-sm font-bold tracking-widest text-slate-900 mt-0.5">AVISO DE SAÍDA</h3>
                </div>

                {/* Form Outline */}
                <div className="border border-slate-300 rounded-lg overflow-hidden text-xs text-slate-800">
                  <div className="grid grid-cols-2 border-b border-slate-300">
                    <div className="p-2 border-r border-slate-300">
                      <span className="text-[10px] text-slate-400 font-medium block">DATA</span>
                      <span className="font-medium">{data || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-medium block">MARINA / CLUBE</span>
                      <span className="font-semibold">{bannerText || '—'}</span>
                    </div>
                  </div>

                  <div className="p-2 border-b border-slate-300">
                    <span className="text-[10px] text-slate-400 font-medium block">NOME DO COMANDANTE</span>
                    <span className="font-medium uppercase">{nome || '—'}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-300">
                    <div className="p-2 border-r border-slate-300">
                      <span className="text-[10px] text-slate-400 font-medium block">TIPO</span>
                      <span className="font-medium uppercase">{tipo || '—'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 font-medium block">PESSOAS A BORDO</span>
                      <span className="font-medium">{pessoasABordo || '—'}</span>
                    </div>
                  </div>

                  <div className="p-2 border-b border-slate-300">
                    <span className="text-[10px] text-slate-400 font-medium block">EMBARCAÇÃO</span>
                    <span className="font-medium uppercase">{nomeEmbarcacao || '—'}</span>
                  </div>

                  <div className="p-2 border-b border-slate-300">
                    <span className="text-[10px] text-slate-400 font-medium block">DESTINO</span>
                    <span className="font-medium uppercase">{destino || '—'}</span>
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-300">
                    <div className="p-2 border-r border-slate-300">
                      <span className="text-[10px] text-slate-400 font-medium block">PREVISÃO DE SAÍDA</span>
                      <span className="font-medium">{previsaoSaida || '—'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 font-medium block">PREVISÃO DE CHEGADA</span>
                      <span className="font-medium">{previsaoChegada || '—'}</span>
                    </div>
                  </div>

                  <div className="p-2 min-h-[36px]">
                    <span className="text-[10px] text-slate-400 font-medium block">OBSERVAÇÕES</span>
                    <span className="text-slate-600">{observacao || 'Nenhuma'}</span>
                  </div>
                </div>

                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed text-justify">
                  É responsabilidade do comandante da embarcação ter a bordo o material de navegação e de salvatagem compatível com a singradura que irá realizar e o número de pessoas a bordo.
                </p>

                <div className="mt-8 text-center">
                  <div className="w-48 mx-auto border-t border-slate-300 pt-1 text-[10px] text-slate-500">
                    Comandante da Embarcação
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Plano */}
      {modalReserva && (
        <PlanoNavegacaoModal
          isOpen={!!modalReserva}
          onClose={() => setModalReserva(null)}
          reservation={modalReserva}
          boat={getEmbarcacao(modalReserva.embarcacaoId, modalReserva)}
          client={getCliente(modalReserva.clienteId, modalReserva)}
          bannerText={bannerText}
        />
      )}
    </div>
  );
}
