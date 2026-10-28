import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Ship,
  Anchor,
  Gauge,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Share2,
  Copy,
  Check,
  QrCode,
  Printer,
  Download,
  Sparkles,
  MessageSquare,
  Phone,
  Users,
  Sliders,
  CheckCircle2,
  LayoutGrid,
  List,
  Star,
  ArrowRight,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Lock,
  Calendar,
  Compass,
  Edit3
} from 'lucide-react';
import { Embarcacao, Cliente, LeadComercial } from '../../types';
import { boatDB, clientDB } from '../../db';
import { getBoatEstoqueResumo, getBoatCotasStatusList } from '../../utils/cotaUtils';
import { getTaxaAdmMensal, isJetSkiBoat } from '../../utils/boatUtils';
import ComercialBoatDrawer from './ComercialBoatDrawer';
import ComercialEquipamentosModal from './ComercialEquipamentosModal';

interface ComercialCatalogoGestaoPageProps {
  operadorNome?: string;
  onOpenProposta?: (lead?: any, boatId?: string, cota?: string) => void;
  onOpenSeaTrial?: (lead?: any, boatId?: string) => void;
  onOpenVenda?: (boatId?: string, cota?: string, clienteId?: string) => void;
  onNavigateToEmbarcacoes?: () => void;
}

const UTM_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp Executivo' },
  { id: 'instagram_bio', label: 'Instagram · Link da Bio' },
  { id: 'instagram_stories', label: 'Instagram · Direct / Stories' },
  { id: 'qrcode_marina', label: 'Placa Píer / Marina (QR Code)' },
  { id: 'indicacao_cliente', label: 'Indicação Private VIP' },
  { id: 'anuncio_digital', label: 'Campanha Digital (Meta / Google)' },
  { id: 'evento_nautico', label: 'Feira / Evento Náutico' },
];

export interface VitrineSettings {
  heroTitle: string;
  heroSubtitle: string;
  collectionTag: string;
  heroDescription: string;
  vendedorPadrao: string;
  showSimulator: boolean;
  showFloatingWhatsapp: boolean;
  showSeaTrial: boolean;
  destaquesIds: string[];
  ocultosIds: string[];
  showroomYachtId?: string;
  showroomJetId?: string;
  showroomCustomTitleYacht?: string;
  showroomCustomTitleJet?: string;
}

const DEFAULT_VITRINE_SETTINGS: VitrineSettings = {
  heroTitle: 'Engenharia náutica.',
  heroSubtitle: 'Fração inteligente.',
  collectionTag: 'EL MEXICANO · COLEÇÃO 2026',
  heroDescription:
    'Acesso ao mais alto padrão náutico com máxima inteligência financeira. Adquira a sua fração ideal de embarcações e motos aquáticas de alta performance com até 80% de economia, divisão justa de custos e gestão integral de marina.',
  vendedorPadrao: 'Vitor Akio Almeida Imoto',
  showSimulator: true,
  showFloatingWhatsapp: true,
  showSeaTrial: true,
  destaquesIds: [],
  ocultosIds: [],
  showroomYachtId: '',
  showroomJetId: '',
  showroomCustomTitleYacht: '',
  showroomCustomTitleJet: '',
};

export default function ComercialCatalogoGestaoPage({
  operadorNome = 'Vitor Akio Almeida Imoto',
  onOpenProposta,
  onOpenSeaTrial,
  onOpenVenda,
  onNavigateToEmbarcacoes,
}: ComercialCatalogoGestaoPageProps) {
  // Modos e Navegação
  const [activeTab, setActiveTab] = useState<'frota' | 'campanhas' | 'leads' | 'config'>('frota');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(1);
  const [previewBoatTarget, setPreviewBoatTarget] = useState<string | null>(null);

  // Dados
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() as Embarcacao[]);
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll() as Cliente[]);
  const [leads, setLeads] = useState<LeadComercial[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Configurações da Vitrine
  const [vitrineSettings, setVitrineSettings] = useState<VitrineSettings>(() => {
    try {
      const stored = localStorage.getItem('vitrine_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.heroDescription && parsed.heroDescription.toLowerCase().includes('tripula')) {
          parsed.heroDescription = DEFAULT_VITRINE_SETTINGS.heroDescription;
        }
        return { ...DEFAULT_VITRINE_SETTINGS, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_VITRINE_SETTINGS, vendedorPadrao: operadorNome };
  });

  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'lancha' | 'jet'>('all');
  const [filterStatusVitrine, setFilterStatusVitrine] = useState<'all' | 'publicados' | 'ocultos' | 'destaques'>('all');

  // Gerador de Links UTM
  const [selectedUtm, setSelectedUtm] = useState('whatsapp');
  const [selectedBoatForUtm, setSelectedBoatForUtm] = useState<string>('geral');
  const [selectedConsultant, setSelectedConsultant] = useState(operadorNome);

  // Modais de Operação
  const [boatDrawerOpen, setBoatDrawerOpen] = useState(false);
  const [selectedBoatForEdit, setSelectedBoatForEdit] = useState<Embarcacao | null>(null);
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [selectedBoatForEquip, setSelectedBoatForEquip] = useState<Embarcacao | null>(null);
  const [qrModalBoat, setQrModalBoat] = useState<Embarcacao | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carregar dados remotos
  const loadData = async () => {
    try {
      setIsSyncing(true);
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [resFrota, resLeads] = await Promise.all([
        fetch('/api/comercial/frota-cotas', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/leads', { headers, credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resFrota && Array.isArray(resFrota.frota) && resFrota.frota.length > 0) {
        setBoats(resFrota.frota);
      } else {
        setBoats(boatDB.getAll() as Embarcacao[]);
      }

      setClients(clientDB.getAll() as Cliente[]);

      if (resLeads && Array.isArray(resLeads)) {
        setLeads(resLeads);
      }
    } catch {
      setBoats(boatDB.getAll() as Embarcacao[]);
      setClients(clientDB.getAll() as Cliente[]);
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  };

  useEffect(() => {
    loadData();
    fetch('/api/comercial/vitrine/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) {
          setVitrineSettings((prev) => ({ ...prev, ...d.settings }));
          localStorage.setItem('vitrine_settings', JSON.stringify(d.settings));
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveSettings = (newSettings: VitrineSettings) => {
    setVitrineSettings(newSettings);
    localStorage.setItem('vitrine_settings', JSON.stringify(newSettings));
    fetch('/api/comercial/vitrine/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }).catch(console.error);
    setPreviewKey((k) => k + 1);
    showToast('Configurações da vitrine salvas com sucesso');
  };

  const handleToggleOculto = (boatId: string) => {
    const isOculto = vitrineSettings.ocultosIds.includes(boatId);
    const newOcultos = isOculto
      ? vitrineSettings.ocultosIds.filter((id) => id !== boatId)
      : [...vitrineSettings.ocultosIds, boatId];
    handleSaveSettings({ ...vitrineSettings, ocultosIds: newOcultos });
  };

  const handleToggleDestaque = (boatId: string) => {
    const isDestaque = vitrineSettings.destaquesIds.includes(boatId);
    const newDestaques = isDestaque
      ? vitrineSettings.destaquesIds.filter((id) => id !== boatId)
      : [...vitrineSettings.destaquesIds, boatId];
    handleSaveSettings({ ...vitrineSettings, destaquesIds: newDestaques });
  };

  // Estatísticas Consolidadas da Vitrine
  const fleetStats = useMemo(() => {
    let lanchasCount = 0;
    let jetsCount = 0;
    let totalCotasDisponiveis = 0;
    let cotasEstoqueTotal = 0;
    let cotasRepasseTotal = 0;
    let ativosNaVitrine = 0;

    boats.forEach((b) => {
      const isOculto = vitrineSettings.ocultosIds.includes(b.id);
      const isJet =
        b.tipo === 'jet' ||
        `${b.nome} ${b.modelo}`.toUpperCase().includes('JET') ||
        `${b.nome} ${b.modelo}`.toUpperCase().includes('SEA DOO') ||
        `${b.nome} ${b.modelo}`.toUpperCase().includes('RXT') ||
        `${b.nome} ${b.modelo}`.toUpperCase().includes('GTI');

      if (isJet) jetsCount++;
      else lanchasCount++;

      const estoque = getBoatEstoqueResumo(b.id, clients, b);
      const totalDisp = estoque.cotasDisponiveis + estoque.cotasRepasse;
      totalCotasDisponiveis += totalDisp;
      cotasEstoqueTotal += estoque.cotasDisponiveis;
      cotasRepasseTotal += estoque.cotasRepasse;

      if (!isOculto) ativosNaVitrine++;
    });

    return {
      totalBoats: boats.length,
      ativosNaVitrine,
      lanchasCount,
      jetsCount,
      totalCotasDisponiveis,
      cotasEstoqueTotal,
      cotasRepasseTotal,
    };
  }, [boats, clients, vitrineSettings.ocultosIds]);

  // Lista processada de embarcações
  const processedBoats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return boats
      .filter((b) => b.nome && !b.nome.toLowerCase().includes('test boat'))
      .map((b) => {
        const estoque = getBoatEstoqueResumo(b.id, clients, b);
        const slots = getBoatCotasStatusList(b.id, clients, b);
        const valorCota = Number((b as any).valorCota) || 180000;
        const isJet = isJetSkiBoat(b);
        const taxaAdmMensal = getTaxaAdmMensal(b);
        const totalDisponiveis = estoque.cotasDisponiveis + estoque.cotasRepasse;
        const isOculto = vitrineSettings.ocultosIds.includes(b.id);
        const isDestaque = vitrineSettings.destaquesIds.includes(b.id);

        return {
          boat: b,
          estoque,
          slots,
          valorCota,
          taxaAdmMensal,
          totalDisponiveis,
          isOculto,
          isDestaque,
          isJet,
        };
      })
      .filter((item) => {
        if (filterTipo === 'lancha' && item.isJet) return false;
        if (filterTipo === 'jet' && !item.isJet) return false;
        if (filterStatusVitrine === 'publicados' && item.isOculto) return false;
        if (filterStatusVitrine === 'ocultos' && !item.isOculto) return false;
        if (filterStatusVitrine === 'destaques' && !item.isDestaque) return false;

        if (q) {
          const hay = `${item.boat.nome} ${item.boat.modelo || ''} ${item.boat.fabricante || ''} ${item.boat.vaga || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [boats, clients, searchTerm, filterTipo, filterStatusVitrine, vitrineSettings]);

  // Leads da vitrine
  const vitrineLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        l.origem === 'catalogo' ||
        (l as any).utmSource ||
        (l.detalhes && l.detalhes.toLowerCase().includes('catálogo')) ||
        (l.detalhes && l.detalhes.toLowerCase().includes('vitrine'))
    );
  }, [leads]);

  // Links UTM
  const buildShareUrl = (boatId?: string, customUtm?: string, customConsultor?: string) => {
    const base = window.location.origin;
    const vendorParam = encodeURIComponent(customConsultor || selectedConsultant || operadorNome);
    const utm = encodeURIComponent(customUtm || selectedUtm);
    if (boatId && boatId !== 'geral') {
      return `${base}/catalogo?barco=${boatId}&vendedor=${vendorParam}&utm_source=${utm}`;
    }
    return `${base}/catalogo?vendedor=${vendorParam}&utm_source=${utm}`;
  };

  const currentGeneratedUrl = useMemo(() => {
    return buildShareUrl(selectedBoatForUtm, selectedUtm, selectedConsultant);
  }, [selectedBoatForUtm, selectedUtm, selectedConsultant]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2400);
    showToast('Link copiado para a área de transferência');
  };

  const copyKitDossie = (b: Embarcacao, valorCota: number, taxaAdmMensal: number, totalDisponiveis: number) => {
    const boatUrl = buildShareUrl(b.id, 'whatsapp', selectedConsultant);
    const totalCotas = Number((b as any).totalCotas) || 4;

    const texto =
      `EL MEXICANO | PRIVATE FLEET\n` +
      `Dossiê Executivo de Ativo Náutico — ${b.nome}\n\n` +
      `ESPECIFICAÇÕES TÉCNICAS\n` +
      `• Estaleiro / Modelo: ${b.fabricante || 'Premium'} · ${b.modelo || 'Série Especial'}\n` +
      `• Propulsão: ${b.potencia || 'Motorização Homologada'}\n` +
      `• Capacidade: ${b.capacidadePassageiros || 10} passageiros\n` +
      `• Alocação: ${b.vaga && b.vaga !== 'Marina Náutica' && b.vaga !== 'Marina Náutica Privativa' ? b.vaga : 'Marina Club Velho Chico'}\n\n` +
      `ESTRUTURA SOCIETÁRIA & VALUATION\n` +
      `• Sistema: Propriedade compartilhada (${totalCotas} frações societárias)\n` +
      `• Disponibilidade atual: ${totalDisponiveis} ${totalDisponiveis === 1 ? 'fração livre' : 'frações livres'}\n` +
      `• Valor da Fração: R$ ${valorCota.toLocaleString('pt-BR')}\n` +
      `• Taxa de Gestão na Marina Club Velho Chico: R$ ${taxaAdmMensal.toLocaleString('pt-BR')}/mês\n\n` +
      `Acesse a vitrine digital interativa e galeria fotográfica:\n` +
      `${boatUrl}\n\n` +
      `${selectedConsultant}\nConsultoria Náutica Patrimonial · El Mexicano`;

    copyToClipboard(texto, `kit_${b.id}`);
  };

  const handleOpenQrModal = async (boat: Embarcacao) => {
    setQrModalBoat(boat);
    setQrGenerating(true);
    try {
      const url = buildShareUrl(boat.id, 'qrcode_marina', selectedConsultant);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: '#111113',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !qrModalBoat) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${qrModalBoat.nome.toLowerCase().replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download do QR Code concluído');
  };

  const handlePrintMarinaPlacard = () => {
    if (!qrModalBoat || !qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Placa Píer Marina — ${qrModalBoat.nome} | El Mexicano</title>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            color: #111113;
            padding: 24px;
            margin: 0;
            background: #FFFFFF;
          }
          .sheet {
            border: 2px solid #E4E4E7;
            border-radius: 12px;
            padding: 48px 36px;
            max-width: 580px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .tricolor {
            display: flex;
            width: 60px;
            height: 3px;
            margin-bottom: 24px;
          }
          .tricolor span:nth-child(1) { flex: 1; background: #4f7d32; }
          .tricolor span:nth-child(2) { flex: 1; background: #d6d3d1; }
          .tricolor span:nth-child(3) { flex: 1; background: #b4402f; }
          .eyebrow {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            color: #71717A;
            margin-bottom: 8px;
          }
          .boat-name {
            font-size: 34px;
            font-weight: 700;
            letter-spacing: -0.03em;
            color: #111113;
            margin: 0 0 6px;
          }
          .boat-spec {
            font-size: 14px;
            color: #52525B;
            margin-bottom: 28px;
          }
          .qr-img {
            width: 250px;
            height: 250px;
            margin: 0 auto 24px;
            border: 1px solid #E4E4E7;
            border-radius: 8px;
            padding: 12px;
            background: #FFFFFF;
          }
          .instructions {
            font-size: 13px;
            color: #3F3F46;
            max-width: 400px;
            line-height: 1.55;
            margin-bottom: 32px;
          }
          .footer {
            width: 100%;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #71717A;
            border-top: 1px solid #E4E4E7;
            padding-top: 18px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="tricolor"><span></span><span></span><span></span></div>
          <div class="eyebrow">El Mexicano · Private Fleet</div>
          <div class="boat-name">${qrModalBoat.nome}</div>
          <div class="boat-spec">${qrModalBoat.fabricante || 'Estaleiro Premium'} · ${qrModalBoat.modelo || 'Série Especial'}</div>
          <img src="${qrDataUrl}" class="qr-img" />
          <div class="instructions">
            Aponte a câmera do smartphone para acessar o dossiê completo, galeria de fotos, especificações náuticas e agendamento de visita na Marina.
          </div>
          <div class="footer">
            Consultor: ${selectedConsultant} · Governança Vale Administradora
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const previewIframeUrl = useMemo(() => {
    const base = window.location.origin;
    const vendorParam = encodeURIComponent(selectedConsultant || operadorNome);
    const boatParam = previewBoatTarget ? `&barco=${previewBoatTarget}` : '';
    return `${base}/catalogo?vendedor=${vendorParam}${boatParam}&preview=1`;
  }, [selectedConsultant, operadorNome, previewBoatTarget]);

  return (
    <div className="space-y-4">
      {/* ── TOAST DISCRETO ─────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium shadow-xl border border-stone-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. CABEÇALHO PADRÃO DO COMERCIAL ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Catálogo & Captação
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Vitrine Online
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Painel de gestão da vitrine pública em <code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">/catalogo</code>, distribuição de links UTM e acompanhamento de captações.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            title="Atualizar dados da vitrine"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Atualizando…' : 'Atualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPreviewBoatTarget(null);
              setIsPreviewOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-stone-500" />
            <span>Visualizar Vitrine</span>
          </button>

          <a
            href={`/catalogo?vendedor=${encodeURIComponent(operadorNome)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-xl bg-[#2D0A16] text-white hover:bg-[#3B0D1E] flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <span>Abrir Página Pública</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* ── 2. KPIS HARMONIOSOS (DESIGN SYSTEM VILA NÁUTICA) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Ativos na Vitrine</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Ship className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {fleetStats.ativosNaVitrine}
            </span>
            <span className="text-xs text-stone-400 font-normal">de {fleetStats.totalBoats} cadastrados</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
            {fleetStats.lanchasCount} lanchas • {fleetStats.jetsCount} motos aquáticas
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Cotas em Captação</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Anchor className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {fleetStats.totalCotasDisponiveis}
            </span>
            <span className="text-xs text-stone-400 font-normal">cotas livres</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
            {fleetStats.cotasEstoqueTotal} estoque Mexicano • {fleetStats.cotasRepasseTotal} repasses
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Leads Convertidos</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {vitrineLeads.length}
            </span>
            <span className="text-xs text-stone-400 font-normal">solicitações</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
            Origem: formulário e campanhas UTM
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 tracking-tight">Canal Principal</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 tracking-tight truncate">
              WhatsApp Executivo
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
            Maior índice de conversão em visita
          </div>
        </div>
      </div>

      {/* ── 3. BARRA DE NAVEGAÇÃO E FILTROS UNIFICADA ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200/70 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Navegação por Abas (Segmented Control Quieter) */}
          <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70 text-xs shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('frota')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap ${
                activeTab === 'frota'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Ativos na Vitrine ({fleetStats.ativosNaVitrine})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('campanhas')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap ${
                activeTab === 'campanhas'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Links & Campanhas UTM
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'leads'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Leads Convertidos</span>
              {vitrineLeads.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-semibold">
                  {vitrineLeads.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Personalização
            </button>
          </div>

          {/* Filtros Contextuais (Apenas na Aba Frota) */}
          {activeTab === 'frota' && (
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              {/* Campo de Busca */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar embarcação ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
                />
              </div>

              {/* Segmented Tipo */}
              <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTipo('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                    filterTipo === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo('lancha')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                    filterTipo === 'lancha'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Lanchas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo('jet')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                    filterTipo === 'jet'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Jets
                </button>
              </div>

              {/* Status Vitrine */}
              <select
                value={filterStatusVitrine}
                onChange={(e: any) => setFilterStatusVitrine(e.target.value)}
                className="h-8.5 px-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:bg-white transition-colors"
              >
                <option value="all">Vitrine: Todos</option>
                <option value="publicados">Apenas Publicados</option>
                <option value="ocultos">Apenas Ocultos</option>
                <option value="destaques">Apenas Destaques</option>
              </select>

              {/* Alternância Grid / Tabela */}
              <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                  }`}
                  title="Exibir em tabela"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                  }`}
                  title="Exibir em grade de cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. CONTEÚDO PRINCIPAL (BASEADO NAS OUTRAS PÁGINAS COMERCIAIS) ───── */}

      {/* ABA 1: ATIVOS NA VITRINE */}
      {activeTab === 'frota' && (
        <>
          {processedBoats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200/70 p-12 text-center text-xs text-stone-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              Nenhuma embarcação encontrada com os filtros selecionados.
            </div>
          ) : viewMode === 'table' ? (
            /* TABELA COMPACTA E LIMPA (PADRÃO COMERCIALATIVOSPAGE / VENDAS) */
            <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 text-stone-500 font-medium uppercase tracking-wider text-[10px] border-b border-stone-200/70">
                      <th className="py-3 px-4">Embarcação</th>
                      <th className="py-3 px-3">Status na Vitrine</th>
                      <th className="py-3 px-3">Cotas Livres</th>
                      <th className="py-3 px-3">Valor Fração</th>
                      <th className="py-3 px-3">Taxa Adm.</th>
                      <th className="py-3 px-4 text-right">Ações da Vitrine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {processedBoats.map((item) => {
                      const { boat, estoque, valorCota, taxaAdmMensal, totalDisponiveis, isOculto, isDestaque, isJet } = item;
                      return (
                        <tr
                          key={boat.id}
                          className={`hover:bg-stone-50/60 transition-colors ${isOculto ? 'opacity-60 bg-stone-50/30' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200/60 overflow-hidden shrink-0 relative">
                                {boat.imagemUrl ? (
                                  <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <Ship className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-stone-900">{boat.nome}</p>
                                  {isDestaque && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                                      <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                                      Coleção
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-400">
                                  {boat.fabricante || 'Estaleiro'} • {boat.modelo || (isJet ? 'Jet' : 'Lancha')} • {boat.vaga || 'Marina'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleOculto(boat.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                                isOculto
                                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                              }`}
                              title={isOculto ? 'Clique para publicar na vitrine' : 'Clique para ocultar da vitrine'}
                            >
                              {isOculto ? <EyeOff className="w-3 h-3 text-stone-400" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                              <span>{isOculto ? 'Oculto' : 'Publicado'}</span>
                            </button>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                totalDisponiveis > 0
                                  ? 'bg-stone-50 text-stone-700 border-stone-200/70 font-semibold'
                                  : 'bg-stone-50 text-stone-400 border-stone-200/40'
                              }`}
                            >
                              {totalDisponiveis} {totalDisponiveis === 1 ? 'fração livre' : 'frações'}
                            </span>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {estoque.cotasDisponiveis} est. / {estoque.cotasRepasse} rep.
                            </div>
                          </td>

                          <td className="py-3 px-3 font-semibold text-stone-900 tabular-nums">
                            R$ {valorCota.toLocaleString('pt-BR')}
                          </td>

                          <td className="py-3 px-3 text-stone-600 tabular-nums">
                            R$ {taxaAdmMensal.toLocaleString('pt-BR')}/mês
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Destaque */}
                              <button
                                type="button"
                                onClick={() => handleToggleDestaque(boat.id)}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                                  isDestaque
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-white text-stone-400 hover:text-stone-700 border-stone-200'
                                }`}
                                title={isDestaque ? 'Remover dos destaques' : 'Destacar na Coleção 2026'}
                              >
                                <Star className={`w-3.5 h-3.5 ${isDestaque ? 'fill-current text-amber-500' : ''}`} />
                              </button>

                              {/* Copiar Link UTM */}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(buildShareUrl(boat.id), `link_${boat.id}`)}
                                className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                title="Copiar link rastreado com UTM do consultor"
                              >
                                {copiedId === `link_${boat.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Kit Dossiê WhatsApp */}
                              <button
                                type="button"
                                onClick={() => copyKitDossie(boat, valorCota, taxaAdmMensal, totalDisponiveis)}
                                className="h-7 px-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Copiar dossiê completo para envio no WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3 text-stone-400" />
                                <span>Kit WhatsApp</span>
                              </button>

                              {/* Configurar Equipamentos e Acessórios no Catálogo */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBoatForEquip(boat);
                                  setEquipModalOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg bg-stone-900 hover:bg-black text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Configurar Acessórios Inclusos no Catálogo (Som, Tenda, Mesa, Cadeira, Churrasqueira, Ducha, Diferenciais...)"
                              >
                                <Sliders className="w-3 h-3 text-stone-300" />
                                <span>Equipamentos</span>
                              </button>

                              {/* QR Code / Placa Marina */}
                              <button
                                type="button"
                                onClick={() => handleOpenQrModal(boat)}
                                className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                title="Gerar QR Code ou Imprimir Placa A4 para Marina"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Dados de Engenharia & Comercial */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBoatForEdit(boat);
                                  setBoatDrawerOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-950 hover:border-stone-400 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                title="Editar Especificações (Motor, Potência, Horímetro, Capacidade)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Visualizar no Preview */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewBoatTarget(boat.id);
                                  setIsPreviewOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                                title="Visualizar este ativo no Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
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
            /* GRADE DE CARDS REFINADOS (PADRÃO COMERCIALATIVOSPAGE) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedBoats.map((item) => {
                const { boat, estoque, valorCota, taxaAdmMensal, totalDisponiveis, isOculto, isDestaque, isJet } = item;
                return (
                  <div
                    key={boat.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                      isOculto
                        ? 'border-stone-200/60 opacity-60 bg-stone-50/40'
                        : 'border-stone-200/70 hover:border-stone-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Imagem e Badges */}
                      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                        {boat.imagemUrl ? (
                          <img
                            src={boat.imagemUrl}
                            alt={boat.nome}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <Ship className="w-10 h-10" />
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-stone-900 shadow-xs backdrop-blur-xs">
                            {isJet ? 'JET SKI' : 'LANCHA'}
                          </span>
                          {isDestaque && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-amber-950 shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Destaque
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleOculto(boat.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium shadow-xs transition-colors cursor-pointer ${
                              isOculto
                                ? 'bg-stone-800 text-white'
                                : 'bg-white/95 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isOculto ? 'Oculto na Vitrine' : 'Publicado'}
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-stone-900 text-sm">{boat.nome}</h3>
                            <span className="text-[11px] text-stone-400 font-mono">Ano {boat.ano || '—'}</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {boat.fabricante || 'Estaleiro'} · {boat.modelo || 'Série Especial'} · {boat.vaga || 'Marina'}
                          </p>
                        </div>

                        {/* Valuation */}
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">Fração</span>
                            <span className="font-bold text-stone-900 tabular-nums">
                              R$ {valorCota.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">Taxa Adm</span>
                            <span className="font-medium text-stone-700 tabular-nums">
                              R$ {taxaAdmMensal.toLocaleString('pt-BR')}/mês
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                          <span>
                            {totalDisponiveis} {totalDisponiveis === 1 ? 'cota livre' : 'cotas livres'}
                          </span>
                          <span className="text-stone-400 font-mono">
                            {estoque.cotasDisponiveis} estoque / {estoque.cotasRepasse} repasse
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="px-4 py-3 bg-stone-50/50 border-t border-stone-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyKitDossie(boat, valorCota, taxaAdmMensal, totalDisponiveis)}
                        className="flex-1 h-8 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3 h-3 text-stone-400" />
                        <span>Kit WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(buildShareUrl(boat.id), `card_link_${boat.id}`)}
                        className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Copiar link com parâmetros UTM"
                      >
                        {copiedId === `card_link_${boat.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Configurar Equipamentos e Acessórios no Catálogo */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBoatForEquip(boat);
                          setEquipModalOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Configurar Acessórios e Diferenciais desta embarcação no Catálogo"
                      >
                        <Sliders className="w-3.5 h-3.5 text-stone-300" />
                        <span>Equipamentos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenQrModal(boat)}
                        className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Gerar QR Code ou Placa Píer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBoatForEdit(boat);
                          setBoatDrawerOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-950 hover:border-stone-400 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Editar Especificações Técnicas"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewBoatTarget(boat.id);
                          setIsPreviewOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Visualizar no Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ABA 2: LINKS & CAMPANHAS UTM */}
      {activeTab === 'campanhas' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div>
              <h2 className="font-bold text-base text-stone-900 tracking-tight">
                Gerador de Links de Captação e Rastreamento UTM
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Crie links trackeados para anúncios, redes sociais, placas da marina ou abordagem direta. O lead que converter cairá atribuído ao consultor escolhido.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* Canal UTM */}
              <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                  Canal de Captação (UTM)
                </label>
                <select
                  value={selectedUtm}
                  onChange={(e) => setSelectedUtm(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400 transition-colors"
                >
                  {UTM_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 block mt-0.5">Identifica a fonte no CRM</span>
              </div>

              {/* Destino */}
              <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                  Destino da Vitrine
                </label>
                <select
                  value={selectedBoatForUtm}
                  onChange={(e) => setSelectedBoatForUtm(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400 transition-colors"
                >
                  <option value="geral">Vitrine Geral (Todos os Ativos)</option>
                  {boats
                    .filter((b) => b.nome && !b.nome.toLowerCase().includes('test'))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({b.modelo || 'Série'})
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-stone-400 block mt-0.5">Barco específico ou catálogo completo</span>
              </div>

              {/* Consultor */}
              <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                  Consultor Atribuído
                </label>
                <input
                  type="text"
                  value={selectedConsultant}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                  placeholder="Nome do Consultor"
                  className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400 transition-colors"
                />
                <span className="text-[10px] text-stone-400 block mt-0.5">Receberá as conversões do link</span>
              </div>
            </div>

            {/* URL Gerada com botão de copiar */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1.5">
                Link Rastreado Pronto
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentGeneratedUrl}
                  className="flex-1 h-9 px-3 text-xs font-mono rounded-xl border border-stone-200 bg-stone-50 text-stone-800 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentGeneratedUrl, 'current_url')}
                  className="h-9 px-4 rounded-xl bg-[#2D0A16] text-white hover:bg-[#3B0D1E] flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  {copiedId === 'current_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'current_url' ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cartões auxiliares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-stone-900 text-sm">Dossiê Executivo WhatsApp</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Envie fichas técnicas completas com valuation, taxa de condomínio e link rastreado para prospects de forma ágil e padronizada.
              </p>
              <button
                type="button"
                onClick={() => {
                  const firstBoat = boats[0];
                  if (firstBoat) copyKitDossie(firstBoat, 180000, 2500, 2);
                }}
                className="text-xs font-medium text-[#2D0A16] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Copiar modelo da primeira embarcação</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-stone-900 text-sm">Placa Marina A4 com QR Code</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Gere folhas prontas para impressão no formato A4 com layout institucional e QR Code para afixação nas vagas da marina ou eventos.
              </p>
              <button
                type="button"
                onClick={() => {
                  const firstBoat = boats[0];
                  if (firstBoat) handleOpenQrModal(firstBoat);
                }}
                className="text-xs font-medium text-[#2D0A16] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Gerar placa de píer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: LEADS CONVERTIDOS */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-stone-900 tracking-tight">Leads da Vitrine</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Contatos e agendamentos convertidos através da vitrine pública ou links UTM.
              </p>
            </div>
            <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
              Total: {vitrineLeads.length} solicitações
            </span>
          </div>

          {vitrineLeads.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400">
              Nenhuma solicitação registrada pela vitrine no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 text-stone-500 font-medium uppercase tracking-wider text-[10px] border-b border-stone-200/70">
                    <th className="py-3 px-4">Lead / Contato</th>
                    <th className="py-3 px-3">Origem UTM</th>
                    <th className="py-3 px-3">Interesse / Detalhes</th>
                    <th className="py-3 px-4 text-right">Ações Imediatas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {vitrineLeads.map((lead) => {
                    const telLimpo = lead.telefone ? lead.telefone.replace(/\D/g, '') : '';
                    const waLink = telLimpo ? `https://wa.me/55${telLimpo}` : null;
                    return (
                      <tr key={lead.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-stone-900">{lead.nome}</p>
                          <p className="text-[11px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {lead.telefone || 'Sem telefone'}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-100 text-stone-700 border border-stone-200/60">
                            {lead.origem || 'Vitrine'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-stone-600 text-xs">
                          {lead.detalhes || 'Interesse na aquisição de fração'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            {onOpenProposta && (
                              <button
                                type="button"
                                onClick={() => onOpenProposta(lead)}
                                className="h-7 px-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                              >
                                Proposta
                              </button>
                            )}
                            {onOpenSeaTrial && (
                              <button
                                type="button"
                                onClick={() => onOpenSeaTrial(lead)}
                                className="h-7 px-2.5 rounded-lg bg-[#2D0A16] text-white hover:bg-[#3B0D1E] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                              >
                                Test Drive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: CONFIGURAÇÕES E PERSONALIZAÇÃO */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl border border-stone-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
          <div>
            <h2 className="font-bold text-base text-stone-900 tracking-tight">
              Personalização da Vitrine Pública
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Edite os textos de destaque editorial e habilite ou desabilite módulos públicos da página.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                Título Principal (Hero)
              </label>
              <input
                type="text"
                value={vitrineSettings.heroTitle}
                onChange={(e) => setVitrineSettings({ ...vitrineSettings, heroTitle: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">Exibido na primeira dobra da vitrine</span>
            </div>

            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                Subtítulo Destacado
              </label>
              <input
                type="text"
                value={vitrineSettings.heroSubtitle}
                onChange={(e) => setVitrineSettings({ ...vitrineSettings, heroSubtitle: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">Texto em destaque editorial</span>
            </div>

            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                Assinatura Tricolor / Tag da Coleção
              </label>
              <input
                type="text"
                value={vitrineSettings.collectionTag}
                onChange={(e) => setVitrineSettings({ ...vitrineSettings, collectionTag: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                Descrição Editorial de Governança
              </label>
              <textarea
                rows={3}
                value={vitrineSettings.heroDescription}
                onChange={(e) => setVitrineSettings({ ...vitrineSettings, heroDescription: e.target.value })}
                className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                Consultor Padrão de Plantão
              </label>
              <input
                type="text"
                value={vitrineSettings.vendedorPadrao}
                onChange={(e) => setVitrineSettings({ ...vitrineSettings, vendedorPadrao: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Showroom Studio Curadoria Inteligente */}
            <div className="bg-gradient-to-br from-amber-50/40 via-white to-stone-50/60 rounded-2xl border border-amber-200/80 p-5 space-y-4 sm:col-span-2 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 tracking-tight">
                      Curadoria Showroom Studio (Hero em Destaque)
                    </h3>
                    <p className="text-xs text-stone-500">
                      Defina quem aparece no palco de estúdio interativo no topo da vitrine pública ou use a seleção inteligente automática.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-amber-100/70 text-amber-900 px-2.5 py-1 rounded-full font-semibold">
                  Hero Stage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Seleção Lancha */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
                  <label className="text-[11px] font-bold text-stone-800 flex items-center justify-between">
                    <span>Lancha no Showroom Studio</span>
                    <span className="text-[10px] font-semibold text-stone-400 font-mono">Linha Lanchas</span>
                  </label>
                  <select
                    value={vitrineSettings.showroomYachtId || ''}
                    onChange={(e) => setVitrineSettings({ ...vitrineSettings, showroomYachtId: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
                  >
                    <option value="">★ Automático (Primeira lancha marcada com estrela de Destaque)</option>
                    {processedBoats
                      .filter((b) => !b.isJet && !b.isOculto)
                      .map((item) => (
                        <option key={item.boat.id} value={item.boat.id}>
                          {item.boat.nome} · {item.boat.fabricante} {item.boat.modelo} {item.isDestaque ? '★ Destaque' : ''} (R$ {item.valorCota.toLocaleString('pt-BR')})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Título personalizado (opcional, ex: Linha Lanchas)"
                    value={vitrineSettings.showroomCustomTitleYacht || ''}
                    onChange={(e) => setVitrineSettings({ ...vitrineSettings, showroomCustomTitleYacht: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                  />
                  <span className="text-[10px] text-stone-400 block">
                    Se vazio, o sistema usa o nome e estaleiro oficial do ativo selecionado.
                  </span>
                </div>

                {/* Seleção Jetski */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
                  <label className="text-[11px] font-bold text-stone-800 flex items-center justify-between">
                    <span>Jetski no Showroom Studio</span>
                    <span className="text-[10px] font-semibold text-stone-400 font-mono">Linha Jetski</span>
                  </label>
                  <select
                    value={vitrineSettings.showroomJetId || ''}
                    onChange={(e) => setVitrineSettings({ ...vitrineSettings, showroomJetId: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-400"
                  >
                    <option value="">★ Automático (Primeiro jetski marcado com estrela de Destaque)</option>
                    {processedBoats
                      .filter((b) => b.isJet && !b.isOculto)
                      .map((item) => (
                        <option key={item.boat.id} value={item.boat.id}>
                          {item.boat.nome} · {item.boat.fabricante} {item.boat.modelo} {item.isDestaque ? '★ Destaque' : ''} (R$ {item.valorCota.toLocaleString('pt-BR')})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Título personalizado (opcional, ex: Linha Jetskis)"
                    value={vitrineSettings.showroomCustomTitleJet || ''}
                    onChange={(e) => setVitrineSettings({ ...vitrineSettings, showroomCustomTitleJet: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                  />
                  <span className="text-[10px] text-stone-400 block">
                    Se vazio, o sistema usa o modelo e estaleiro oficial do jet selecionado.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveSettings(vitrineSettings)}
              className="h-9 px-4 rounded-xl bg-[#2D0A16] text-white hover:bg-[#3B0D1E] flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 5. MODAL / OVERLAY DE PREVIEW LIMPO E DEDICADO ─────────────────── */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra do Navegador Simulado (Elegante & Quieter) */}
            <div className="h-12 bg-stone-100/90 border-b border-stone-200/80 px-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-stone-500" />
                  <span>Preview da Vitrine</span>
                </span>
                <span className="text-[11px] font-mono text-stone-400 hidden sm:inline">
                  /catalogo?vendedor={encodeURIComponent(selectedConsultant || operadorNome)}
                </span>
              </div>

              {/* Seletor de Dispositivo */}
              <div className="flex p-0.5 bg-stone-200/70 rounded-xl border border-stone-300/60 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500'
                  }`}
                  title="Desktop (100%)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'tablet' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500'
                  }`}
                  title="Tablet (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500'
                  }`}
                  title="Smartphone (390px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 flex items-center justify-center transition-colors cursor-pointer"
                  title="Recarregar preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <a
                  href={`/catalogo?vendedor=${encodeURIComponent(selectedConsultant || operadorNome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 flex items-center justify-center transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="Fechar preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Container Iframe */}
            <div className="flex-1 bg-stone-100 flex items-center justify-center p-3 overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-200 rounded-xl shadow-lg border border-stone-200 overflow-hidden flex flex-col ${
                  previewDevice === 'mobile'
                    ? 'w-[390px] border-[6px] border-stone-800 rounded-[32px]'
                    : previewDevice === 'tablet'
                    ? 'w-[768px]'
                    : 'w-full'
                }`}
              >
                <iframe
                  key={previewKey}
                  src={previewIframeUrl}
                  title="Preview da Vitrine Pública"
                  className="w-full flex-1 border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL DE QR CODE / PLACA MARINA A4 ───────────────────────────── */}
      {qrModalBoat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs"
          onClick={() => setQrModalBoat(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 space-y-4 text-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400 block">
                  Placa Píer Marina
                </span>
                <h3 className="text-base font-bold text-stone-900">{qrModalBoat.nome}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalBoat(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                {qrGenerating ? (
                  <div className="w-44 h-44 flex items-center justify-center text-stone-400 text-xs">
                    Gerando QR Code...
                  </div>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code Píer" className="w-48 h-48 object-contain" />
                ) : null}
              </div>

              <p className="text-[11px] text-stone-400 text-center max-w-xs leading-relaxed">
                Rastreado para <strong>{selectedConsultant}</strong>. Escaneado no píer, abre o dossiê com agendamento de test drive.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="h-9 px-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Baixar PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintMarinaPlacard}
                className="h-9 px-3 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 opacity-80" />
                <span>Imprimir Placa A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 7. DRAWER DE EDIÇÃO DE ATIVO (MOTOR, HORÍMETRO, ESPECIFICAÇÕES) ── */}
      <ComercialBoatDrawer
        open={boatDrawerOpen}
        onClose={() => {
          setBoatDrawerOpen(false);
          setSelectedBoatForEdit(null);
        }}
        editingBoat={selectedBoatForEdit}
        clients={clients}
        onSave={(saved) => {
          setBoats(boatDB.getAll() as Embarcacao[]);
          setToastMessage(`Ativo "${saved.modelo || saved.nome}" atualizado com sucesso.`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* ── 8. MODAL DE CONFIGURAÇÃO DE EQUIPAMENTOS & ACESSÓRIOS ── */}
      <ComercialEquipamentosModal
        isOpen={equipModalOpen}
        onClose={() => {
          setEquipModalOpen(false);
          setSelectedBoatForEquip(null);
        }}
        boat={selectedBoatForEquip}
        onSaveSuccess={(saved) => {
          setBoats(boatDB.getAll() as Embarcacao[]);
          setToastMessage(`Memorial descritivo de "${saved.modelo || saved.nome}" salvo com sucesso.`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    </div>
  );
}
