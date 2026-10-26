import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Ship,
  Save,
  Check,
  AlertCircle,
  Building2,
  Users,
  Anchor,
  Wrench,
  Clock,
  Gauge,
  Camera,
  CheckCircle2,
  FileText,
  Search,
  UserCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  Tag,
  DollarSign,
  Share2,
  Sparkles,
  QrCode,
  Calendar,
  Compass,
  ArrowRight,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { Embarcacao, Cliente, Reserva, LeadComercial } from '../../types';
import { boatDB, clientDB, getAdminToken, syncWithRemote } from '../../db';
import { DEFAULT_TOTAL_COTAS, getBoatCotasStatusList, getBoatEstoqueResumo, normalizeCotaCode } from '../../utils/cotaUtils';
import { isInternalMexicano, formatBoatName, MEXICANO_INTERNAL_CLIENT_ID } from '../../utils/constants';

interface ComercialBoatDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave?: (savedBoat: Embarcacao) => void;
  onDelete?: (id: string, name: string) => void;
  editingBoat?: Embarcacao | null;
  clients: Cliente[];
  isReadOnly?: boolean;
  userRole?: string;
  // Ações Comerciais Integradas
  onOpenProposta?: (boatId: string, cota?: string, lead?: LeadComercial | null) => void;
  onOpenVenda?: (boatId: string, cota?: string, clienteId?: string) => void;
  onOpenSeaTrial?: (boatId: string) => void;
  onOpenCotaModal?: (boatId: string, cota?: string, mode?: 'reserva' | 'repasse' | 'recompra' | 'transferencia') => void;
}

type DrawerTab = 'cotas' | 'agenda' | 'ficha' | 'kit_midia';

export default function ComercialBoatDrawer({
  open,
  onClose,
  onSave,
  onDelete,
  editingBoat = null,
  clients = [],
  isReadOnly = false,
  userRole,
  onOpenProposta,
  onOpenVenda,
  onOpenSeaTrial,
  onOpenCotaModal
}: ComercialBoatDrawerProps) {
  const isEditing = !!editingBoat;

  const effectiveRole = (userRole || localStorage.getItem('admin_role') || 'comercial').toLowerCase().trim();
  const isMarinaGerente = effectiveRole === 'marina_gerente' || effectiveRole === 'marina';
  const isComercial = effectiveRole === 'comercial';
  const isAdmin = effectiveRole === 'admin';

  const [activeTab, setActiveTab] = useState<DrawerTab>('cotas');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCopyText, setCopiedCopyText] = useState(false);

  // Estados do Formulário - Identificação Técnica
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'lancha' | 'jet'>('lancha');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  // Valores Comerciais & Cotas
  const [valorCota, setValorCota] = useState<number>(0);
  const [taxaAdmMensal, setTaxaAdmMensal] = useState<number>(0);
  const [totalCotas, setTotalCotas] = useState<number>(DEFAULT_TOTAL_COTAS);

  // Especificações
  const [tamanho, setTamanho] = useState('');
  const [potencia, setPotencia] = useState('');
  const [capacidadePassageiros, setCapacidadePassageiros] = useState<number>(8);
  const [vaga, setVaga] = useState('');

  // Status & Operação
  const [statusOperacional, setStatusOperacional] = useState<'disponivel' | 'em_manutencao' | 'pendencia'>('disponivel');
  const [horasMotor, setHorasMotor] = useState<number>(0);
  const [empresas, setEmpresas] = useState<string[]>(['VALE', 'MEXICANO']);
  const [imagemUrl, setImagemUrl] = useState('');

  // Cotistas Vinculados
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]);

  // Acessórios
  const [acessorios, setAcessorios] = useState({
    tenda: false,
    mesa: false,
    churrasqueira: false,
    bancosCadeiras: false,
    extintores: true
  });

  // Reservas e Manutenções ativas carregadas do servidor
  const [activeReservas, setActiveReservas] = useState<any[]>([]);
  const [proximasSaidas, setProximasSaidas] = useState<Reserva[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Carregar dados da embarcação
  useEffect(() => {
    if (!open) return;

    if (editingBoat) {
      setNome(editingBoat.nome || '');
      setNumero(editingBoat.numero || '');
      setTipo(editingBoat.tipo === 'jet' ? 'jet' : 'lancha');
      setFabricante(editingBoat.fabricante || '');
      setModelo(editingBoat.modelo || '');
      setAno(editingBoat.ano || new Date().getFullYear());
      setTamanho(editingBoat.tamanho ? String(editingBoat.tamanho) : '');
      setPotencia(editingBoat.potencia || '');
      setCapacidadePassageiros(editingBoat.capacidadePassageiros || 8);
      setTotalCotas(editingBoat.totalCotas && Number(editingBoat.totalCotas) > 0 ? Number(editingBoat.totalCotas) : DEFAULT_TOTAL_COTAS);
      setValorCota(editingBoat.valorCota ? Number(editingBoat.valorCota) : 0);
      setTaxaAdmMensal(editingBoat.taxaAdmMensal ? Number(editingBoat.taxaAdmMensal) : 0);
      setVaga(editingBoat.vaga || '');
      setStatusOperacional(editingBoat.statusOperacional || (editingBoat.emManutencao ? 'em_manutencao' : 'disponivel'));
      setHorasMotor(editingBoat.horasMotor || editingBoat.horimetroActual || 0);
      setEmpresas(editingBoat.empresas && editingBoat.empresas.length > 0 ? editingBoat.empresas : ['VALE', 'MEXICANO']);
      setImagemUrl(editingBoat.imagemUrl || '');
      setSelectedDonos(Array.isArray(editingBoat.donos) ? [...editingBoat.donos] : []);

      setAcessorios({
        tenda: !!editingBoat.acessorios?.tenda,
        mesa: !!editingBoat.acessorios?.mesa,
        churrasqueira: !!editingBoat.acessorios?.churrasqueira,
        bancosCadeiras: !!editingBoat.acessorios?.bancosCadeiras,
        extintores: editingBoat.acessorios?.extintores !== undefined ? !!editingBoat.acessorios.extintores : true
      });

      // Carregar reservas e bloqueios da embarcação
      loadBoatAgendaAndReservas(editingBoat.id);
    } else {
      setNome('');
      setNumero('');
      setTipo('lancha');
      setFabricante('');
      setModelo('');
      setAno(new Date().getFullYear());
      setTamanho('');
      setPotencia('');
      setCapacidadePassageiros(8);
      setTotalCotas(DEFAULT_TOTAL_COTAS);
      setValorCota(180000);
      setTaxaAdmMensal(2500);
      setVaga('');
      setStatusOperacional('disponivel');
      setHorasMotor(0);
      setEmpresas(isMarinaGerente ? ['MARINA'] : ['VALE', 'MEXICANO']);
      setImagemUrl('');
      setSelectedDonos([]);
      setAcessorios({
        tenda: false,
        mesa: false,
        churrasqueira: false,
        bancosCadeiras: false,
        extintores: true
      });
      setActiveTab('ficha');
    }

    setErrorMessage(null);
    setSuccessMessage(null);
  }, [open, editingBoat, isMarinaGerente]);

  // Carregar dados de bloqueios 48h e agenda de saídas
  const loadBoatAgendaAndReservas = async (boatId: string) => {
    setIsLoadingAgenda(true);
    try {
      const token = getAdminToken() || localStorage.getItem('admin_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resReservas, resBloqueios] = await Promise.all([
        fetch('/api/db/pull', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/comercial/cotas-reservadas', { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (resBloqueios && Array.isArray(resBloqueios.reservas)) {
        setActiveReservas(resBloqueios.reservas.filter((r: any) => r.embarcacaoId === boatId));
      }

      if (resReservas && Array.isArray(resReservas.reservations)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const boatSaidas = resReservas.reservations
          .filter((r: Reserva) => r.embarcacaoId === boatId && r.data >= todayStr && r.status !== 'cancelado')
          .sort((a: Reserva, b: Reserva) => a.data.localeCompare(b.data))
          .slice(0, 15);
        setProximasSaidas(boatSaidas);
      }
    } catch (err) {
      console.error('Erro ao carregar agenda da embarcação:', err);
    } finally {
      setIsLoadingAgenda(false);
    }
  };

  // Liberar bloqueio de 48h
  const handleLiberarCota = async (reservaId: string, cotaCode: string) => {
    if (!confirm(`Deseja realmente liberar a cota ${cotaCode} de volta para o estoque disponível da El Mexicano?`)) return;

    try {
      const token = getAdminToken() || localStorage.getItem('admin_token');
      const res = await fetch(`/api/comercial/cotas-reservadas/${reservaId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setSuccessMessage(`✅ Cota ${cotaCode} liberada com sucesso para venda!`);
        if (editingBoat) loadBoatAgendaAndReservas(editingBoat.id);
        await syncWithRemote().catch(() => {});
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao liberar cota.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de comunicação');
    }
  };

  // Lista de Cotas detalhadas com status unificado
  const cotasStatusList = useMemo(() => {
    if (!editingBoat) return [];
    return getBoatCotasStatusList(editingBoat.id, clients, editingBoat, activeReservas);
  }, [editingBoat, clients, activeReservas]);

  // Resumo de Estoque
  const resumoEstoque = useMemo(() => {
    if (!editingBoat) return null;
    return getBoatEstoqueResumo(editingBoat.id, clients, editingBoat, activeReservas);
  }, [editingBoat, clients, activeReservas]);

  // Status Físico na Marina
  const statusMarina = useMemo(() => {
    if (!editingBoat) return { label: 'Disponível na Vaga', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    const todayStr = new Date().toISOString().split('T')[0];

    if (editingBoat.emManutencao || statusOperacional === 'em_manutencao') {
      return { label: 'Em Manutenção / OS Aberta', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
    }

    const saidaHoje = proximasSaidas.find(s => s.data === todayStr);
    if (saidaHoje) {
      return { label: `Navegando Hoje (${saidaHoje.periodo || 'Em uso'})`, badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' };
    }

    return { label: 'Na Marina (Pronta p/ Visita)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }, [editingBoat, statusOperacional, proximasSaidas]);

  // Salvar Alterações na Embarcação
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da embarcação.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: Partial<Embarcacao> = {
        nome: nome.trim(),
        numero: numero.trim(),
        tipo,
        fabricante: fabricante.trim(),
        modelo: modelo.trim(),
        ano: Number(ano) || new Date().getFullYear(),
        tamanho: tamanho.trim(),
        potencia: potencia.trim(),
        capacidadePassageiros: Number(capacidadePassageiros) || 0,
        totalCotas: Math.max(4, Math.min(8, Number(totalCotas) || DEFAULT_TOTAL_COTAS)),
        valorCota: Number(valorCota) || 0,
        taxaAdmMensal: Number(taxaAdmMensal) || 0,
        vaga: vaga.trim(),
        statusOperacional,
        emManutencao: statusOperacional === 'em_manutencao',
        horasMotor: Number(horasMotor) || 0,
        horimetroActual: Number(horasMotor) || 0,
        empresas,
        imagemUrl: imagemUrl.trim(),
        donos: selectedDonos,
        acessorios
      };

      let savedBoat: Embarcacao;
      if (isEditing && editingBoat) {
        savedBoat = boatDB.update(editingBoat.id, payload);
      } else {
        savedBoat = boatDB.create(payload as any);
      }

      await syncWithRemote().catch(() => {});
      if (onSave) onSave(savedBoat);
      setSuccessMessage('✅ Embarcação salva com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setErrorMessage(err.message || 'Falha ao salvar dados da embarcação.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copiar link rastreável
  const handleCopyCatalogoLink = () => {
    if (!editingBoat) return;
    const vendedor = localStorage.getItem('admin_nome') || 'comercial';
    const link = `${window.location.origin}/catalogo?barco=${editingBoat.id}&vendedor=${encodeURIComponent(vendedor)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copiar copy formatado para WhatsApp
  const handleCopyWhatsAppText = () => {
    if (!editingBoat) return;
    const vendedor = localStorage.getItem('admin_nome') || 'Comercial Mexicano';
    const link = `${window.location.origin}/catalogo?barco=${editingBoat.id}&vendedor=${encodeURIComponent(vendedor)}`;

    const text = `🌊 *OPORTUNIDADE NÁUTICA EXCLUSIVA - EL MEXICANO* 🚤\n\n` +
      `*Embarcação:* ${editingBoat.nome} (${editingBoat.modelo || editingBoat.fabricante || 'Lancha'})\n` +
      `*Ano:* ${editingBoat.ano} | *Motorização:* ${editingBoat.potencia || 'Embarcada'}\n` +
      `*Capacidade:* ${editingBoat.capacidadePassageiros || 8} pessoas a bordo\n` +
      `*Localização:* Marina Náutica (Vaga ${editingBoat.vaga || 'Privativa'})\n\n` +
      `💰 *Valor da Fração (Cota):* R$ ${Number(editingBoat.valorCota || valorCota || 180000).toLocaleString('pt-BR')}\n` +
      `🏢 *Taxa Condominial Mensal (Vale Administradora):* R$ ${Number(editingBoat.taxaAdmMensal || taxaAdmMensal || 2500).toLocaleString('pt-BR')}/mês\n\n` +
      `✨ *Diferenciais:* Gestão náutica 100% descomplicada, marinharia inclusa, manutenção preventiva rigorosa e agendamento digital no aplicativo.\n\n` +
      `📲 *Acesse o Catálogo Digital & Fotos:* ${link}\n\n` +
      `_Podemos agendar uma visita presencial ou Sea Trial neste final de semana?_`;

    navigator.clipboard.writeText(text);
    setCopiedCopyText(true);
    setTimeout(() => setCopiedCopyText(false), 2000);
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        className={`absolute top-2 right-2 bottom-2 w-[calc(100%-1rem)] sm:w-[620px] lg:w-[680px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-stone-200/80 overflow-hidden ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header no Padrão Vila Náutica */}
        <header className="px-6 py-4 border-b border-stone-200/70 bg-[#F8F7F4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2D0A16] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              <Ship className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 truncate">
                  {nome || 'Nova Embarcação'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMarina.badgeClass}`}>
                  {statusMarina.label}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">
                {modelo ? `${modelo} • ` : ''}{fabricante ? `${fabricante} • ` : ''}Ano {ano} {vaga ? `• Vaga ${vaga}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing && (
              <button
                type="button"
                onClick={handleCopyCatalogoLink}
                className="h-8 px-2.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Copiar link do Catálogo Comercial com seu ID de vendedor"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-stone-500" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiado!' : 'Link'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Abas do Drawer */}
        <div className="px-6 border-b border-stone-200/70 bg-white flex items-center gap-2 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cotas')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'cotas'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Espelho de Cotas (C1–C{totalCotas})</span>
            {resumoEstoque && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {resumoEstoque.cotasDisponiveis} livres
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'agenda'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Agenda & Visitas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ficha'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Ficha Técnica & Edição</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kit_midia')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kit_midia'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Share2 className="w-4 h-4 text-purple-600" />
            <span>Kit Mídia & WhatsApp</span>
          </button>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8F7F4]/40">
          {/* ============================================================= */}
          {/* ABA 1: ESPELHO DE COTAS & QUADRO SOCIETÁRIO */}
          {/* ============================================================= */}
          {activeTab === 'cotas' && (
            <div className="space-y-4">
              {/* Barra de Resumo Rápido */}
              {resumoEstoque && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-white rounded-xl border border-stone-200/70 shadow-2xs">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-stone-400 block">Total Cotas</span>
                    <span className="text-base font-bold text-stone-900">{resumoEstoque.totalCotas} frações</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-stone-400 block">Estoque Mexicano</span>
                    <span className="text-base font-bold text-stone-900">{resumoEstoque.cotasDisponiveisMexicano} livres</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-stone-400 block">Em Repasse</span>
                    <span className="text-base font-bold text-stone-900">{resumoEstoque.cotasRepasse} cotas</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-stone-400 block">Bloqueios 48h</span>
                    <span className="text-base font-bold text-stone-900">{resumoEstoque.cotasReservadas} cotas</span>
                  </div>
                </div>
              )}

              {/* Lista Detalhada das Cotas C1 até C8 */}
              <div className="space-y-3">
                {cotasStatusList.map(cotaInfo => {
                  const isMexicano = cotaInfo.status === 'disponivel_mexicano';
                  const isRepasse = cotaInfo.status === 'em_repasse';
                  const isReservada = cotaInfo.status === 'reservada';
                  const isVendida = cotaInfo.status === 'vendida';

                  return (
                    <div
                      key={cotaInfo.cota}
                      className={`p-4 rounded-xl border transition-all bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        isMexicano
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : isRepasse
                          ? 'border-sky-200 hover:border-sky-300'
                          : isReservada
                          ? 'border-amber-200 bg-amber-50/20'
                          : 'border-stone-200/80'
                      }`}
                    >
                      {/* Lado Esquerdo: Identificação & Titular */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                            isMexicano
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isRepasse
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : isReservada
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {cotaInfo.cota}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                                isMexicano
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                                  : isRepasse
                                  ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                                  : isReservada
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                                  : 'bg-stone-100 text-stone-600 border-stone-200/70'
                              }`}
                            >
                              {isMexicano
                                ? 'Disponível (Estoque Mexicano)'
                                : isRepasse
                                ? 'Disponível em Repasse'
                                : isReservada
                                ? 'Bloqueio Comercial 48h'
                                : 'Cota Vendida'}
                            </span>

                            {isReservada && cotaInfo.reservaInfo && (
                              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Expira em {new Date(cotaInfo.reservaInfo.expiraEm).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-bold text-stone-900">
                            {isMexicano
                              ? 'El Mexicano (Pronta para Venda Direta)'
                              : isReservada
                              ? `Reservado para: ${cotaInfo.reservaInfo?.leadNome || 'Lead Comercial'}`
                              : cotaInfo.clienteNome}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                            {isMexicano && (
                              <span>Valor de Venda: <strong>R$ {Number(valorCota || 180000).toLocaleString('pt-BR')}</strong></span>
                            )}
                            {isRepasse && (
                              <span>Valor Pedido pelo Cotista: <strong>R$ {Number(cotaInfo.valorRepasse || valorCota || 180000).toLocaleString('pt-BR')}</strong></span>
                            )}
                            {isReservada && (
                              <span>Vendedor Responsável: <strong>{cotaInfo.reservaInfo?.vendedorNome || 'Comercial'}</strong></span>
                            )}
                            {isVendida && cotaInfo.cliente && (
                              <span>Contato: {cotaInfo.cliente.telefone || cotaInfo.cliente.email || 'Cadastrado'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Ações por Cota */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Ações para Cotas Disponíveis ou Repasse */}
                        {(isMexicano || isRepasse) && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'reserva');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Bloquear fração por 48h para um Lead"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Bloquear 48h</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenProposta && editingBoat) {
                                  onOpenProposta(editingBoat.id, cotaInfo.cota, null);
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Gerar Proposta Comercial para esta cota"
                            >
                              <FileText className="w-3.5 h-3.5 text-stone-600" />
                              <span>Proposta</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenVenda && editingBoat) {
                                  onOpenVenda(editingBoat.id, cotaInfo.cota, isRepasse ? cotaInfo.clienteId : undefined);
                                }
                              }}
                              className="h-8 px-3 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title="Lançar Venda Direta desta cota"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-amber-300" />
                              <span>Vender</span>
                            </button>
                          </>
                        )}

                        {/* Ações para Cotas Reservadas 48h */}
                        {isReservada && cotaInfo.reservaInfo && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLiberarCota(cotaInfo.reservaInfo!.id, cotaInfo.cota)}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Liberar cota de volta ao estoque"
                            >
                              <Unlock className="w-3.5 h-3.5 text-stone-500" />
                              <span>Liberar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenProposta && editingBoat) {
                                  const leadMock: any = {
                                    id: cotaInfo.reservaInfo!.leadId,
                                    nome: cotaInfo.reservaInfo!.leadNome
                                  };
                                  onOpenProposta(editingBoat.id, cotaInfo.cota, leadMock);
                                }
                              }}
                              className="h-8 px-3 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-300" />
                              <span>Converter em Proposta</span>
                            </button>
                          </>
                        )}

                        {/* Ações para Cotas Vendidas */}
                        {isVendida && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'repasse');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Colocar cota deste cotista em repasse comercial"
                            >
                              <Tag className="w-3.5 h-3.5 text-sky-600" />
                              <span>Repasse</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'recompra');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Recomprar cota de volta para a El Mexicano"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                              <span>Recomprar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ABA 2: AGENDA & DISPONIBILIDADE NA MARINA */}
          {/* ============================================================= */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-600" />
                    Direito de Uso Comercial & Sea Trials
                  </h3>
                  <button
                    type="button"
                    onClick={() => onOpenSeaTrial && editingBoat && onOpenSeaTrial(editingBoat.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Anchor className="w-3.5 h-3.5 text-amber-300" />
                    <span>Agendar Sea Trial / Visita</span>
                  </button>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Como a <strong>El Mexicano</strong> é titular das cotas em estoque, a equipe comercial possui direito de uso oficial para realizar apresentações a bordo e <em>Sea Trials</em> com Leads quentes, desde que não haja reserva de cotista titular no mesmo horário.
                </p>
              </div>

              {/* Status Atual na Marina */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Status Operacional Hoje:</span>
                  <span className="text-sm font-bold text-stone-900">{statusMarina.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block font-medium">Vaga Oficial na Marina:</span>
                  <span className="text-sm font-bold text-stone-900">{vaga || 'Não informada'}</span>
                </div>
              </div>

              {/* Próximas Saídas Agendadas */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Próximas Saídas & Reservas de Cotistas
                </h4>

                {isLoadingAgenda ? (
                  <div className="p-8 text-center text-xs text-stone-400">Carregando calendário da marina...</div>
                ) : proximasSaidas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200/80">
                    Nenhuma saída agendada para os próximos dias. Barco disponível na Marina para visitas imediatas!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proximasSaidas.map(reserva => (
                      <div
                        key={reserva.id}
                        className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">
                              {new Date(reserva.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                              <span className="ml-2 font-normal text-stone-500">({reserva.periodo || 'Dia inteiro'})</span>
                            </p>
                            <p className="text-[11px] text-stone-400">
                              {reserva.observacoes || reserva.destino || 'Saída de lazer cotista'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {reserva.status || 'Confirmada'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ABA 3: FICHA TÉCNICA, CUSTOS VALE & EDIÇÃO */}
          {/* ============================================================= */}
          {activeTab === 'ficha' && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Resumo de Custos Vale Administradora */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="flex items-center gap-2 text-stone-900">
                  <Building2 className="w-4 h-4 text-[#2D0A16]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Custos & Regras da Vale Administradora</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Rateio mensal fixo estimado para o cotista: <strong>R$ {Number(taxaAdmMensal || 2500).toLocaleString('pt-BR')}/mês</strong>. Inclui marinharia de cais, vaga seca/molhada, lavagem pós-uso, seguro náutico e vistorias preventivas da embarcação.
                </p>
              </div>

              {/* Campos do Formulário Técnico */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider pb-1 border-b border-stone-100">
                  Dados Principais da Embarcação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Nome do Barco *</label>
                    <input
                      type="text"
                      required
                      disabled={isReadOnly}
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Ex: EL MEXICANO 45"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Modelo / Estaleiro</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={modelo}
                      onChange={e => setModelo(e.target.value)}
                      placeholder="Ex: Focker 272 GTO"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Ano de Fabricação</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={ano}
                      onChange={e => setAno(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Motorização / Potência</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={potencia}
                      onChange={e => setPotencia(e.target.value)}
                      placeholder="Ex: Mercury 250 HP"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Horímetro Atual (Horas)</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={horasMotor}
                      onChange={e => setHorasMotor(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Capacidade (Passageiros)</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={capacidadePassageiros}
                      onChange={e => setCapacidadePassageiros(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Vaga na Marina</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={vaga}
                      onChange={e => setVaga(e.target.value)}
                      placeholder="Ex: Pier A - Vaga 12"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Total de Cotas (4 a 8)</label>
                    <select
                      disabled={isReadOnly}
                      value={totalCotas}
                      onChange={e => setTotalCotas(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs font-bold text-[#2D0A16] focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                    >
                      <option value={4}>4 Cotas (C1 a C4)</option>
                      <option value={6}>6 Cotas (C1 a C6)</option>
                      <option value={8}>8 Cotas (C1 a C8 - Padrão Náutico)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Valores Comerciais */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider pb-1 border-b border-stone-100">
                  Preços & Condomínio Comercial
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Valor da Cota Padrão (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                      <input
                        type="number"
                        step="1000"
                        disabled={isReadOnly}
                        value={valorCota}
                        onChange={e => setValorCota(Number(e.target.value))}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 block">Taxa Adm Mensal Vale (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                      <input
                        type="number"
                        step="50"
                        disabled={isReadOnly}
                        value={taxaAdmMensal}
                        onChange={e => setTaxaAdmMensal(Number(e.target.value))}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações */}
              {!isReadOnly && (
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isSaving ? 'Salvando dados...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ============================================================= */}
          {/* ABA 4: GALERIA & KIT MÍDIA EXPRESS */}
          {/* ============================================================= */}
          {activeTab === 'kit_midia' && (
            <div className="space-y-4">
              {/* Foto da Embarcação */}
              <div className="p-4 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Foto de Capa Comercial
                </h4>

                <div className="relative w-full h-48 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center">
                  {imagemUrl ? (
                    <img
                      src={imagemUrl}
                      alt={nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-stone-400 space-y-1">
                      <ImageIcon className="w-8 h-8 mx-auto" />
                      <p className="text-xs">Sem foto cadastrada</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="URL da Imagem..."
                    value={imagemUrl}
                    onChange={e => setImagemUrl(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    className="h-9 px-3 rounded-lg bg-stone-900 text-white text-xs font-semibold"
                  >
                    Salvar Imagem
                  </button>
                </div>
              </div>

              {/* Botões do Kit Mídia Express */}
              <div className="p-4 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Divulgação Comercial & WhatsApp
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppText}
                    className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-left transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                        Texto de Venda p/ WhatsApp
                      </span>
                      {copiedCopyText && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200 px-1.5 py-0.5 rounded">
                          Copiado!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-tight">
                      Gera resumo pronto formatado com fotos, valor da cota, condomínio e link para colar na conversa com o Lead.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCatalogoLink}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-left transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
                        Link Rastreável do Catálogo
                      </span>
                      {copiedLink && (
                        <span className="text-[10px] font-bold text-stone-800 bg-stone-200 px-1.5 py-0.5 rounded">
                          Copiado!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-tight">
                      Link direto da embarcação com parâmetro ?vendedor={localStorage.getItem('admin_nome') || 'comercial'} para atribuição de comissão.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
