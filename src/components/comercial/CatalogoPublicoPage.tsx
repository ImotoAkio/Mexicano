import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  ArrowRight,
  NavArrowLeft,
  NavArrowRight,
  Search,
  Copy,
  Check,
  QrCode,
  Xmark,
  ViewGrid,
  List,
  ShareIos,
  ShieldCheck,
  Compass,
  Printer,
  Download,
  OpenNewWindow
} from 'iconoir-react';
import QRCode from 'qrcode';
import { boatDB } from '../../db';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';
import studioJetImg from '../../assets/images/1.webp';
import studioBoatImg from '../../assets/images/2.webp';
import editorialHeroBg from '../../assets/images/boat_jet_bg.webp';

export interface PublicBoat {
  id: string;
  nome: string;
  modelo: string;
  fabricante: string;
  ano: number;
  motorizacao: string;
  potencia?: string;
  marcaMotor?: string;
  tipoPropulsao?: string;
  horasUso?: number;
  capacidade: number;
  fotos: string[];
  imagemPrincipal?: string;
  itensConforto: string[];
  valorCota: number;
  taxaAdmMensal: number;
  totalCotas: number;
  cotasDisponiveisCount: number;
  cotasEstoqueCount: number;
  cotasRepasseCount: number;
  vaga?: string;
  tamanho?: string;
  statusMarina?: string;
}

interface VendedorInfo {
  id: string;
  nome: string;
  cargo: string;
  whatsapp: string;
}

export interface CatalogoPublicoPageProps {
  /** Quando renderizado dentro do painel Comercial, ativa a barra executiva de captação, links UTM e QR Code */
  consultantMode?: boolean;
  vendedorNomeProp?: string;
  onBackToDashboard?: () => void;
}

const UTM_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp Executivo' },
  { id: 'instagram_bio', label: 'Instagram · Bio' },
  { id: 'instagram_stories', label: 'Instagram · Direct' },
  { id: 'qrcode_marina', label: 'Placa Píer / Marina' },
  { id: 'indicacao_cliente', label: 'Indicação Private' },
  { id: 'anuncio_digital', label: 'Campanha Digital' },
];

function isJetSkiAsset(boat: PublicBoat): boolean {
  const text = `${boat.nome} ${boat.modelo} ${boat.fabricante}`.toUpperCase();
  return (
    text.includes('RXT') ||
    text.includes('GTI') ||
    text.includes('GTX') ||
    text.includes('WAKE') ||
    text.includes('SEA DOO') ||
    text.includes('SEADOO') ||
    text.includes('VX ') ||
    text.includes('VX1100') ||
    text.includes('JET')
  );
}

export function getMotorizacaoExata(boat: PublicBoat): string {
  const parts: string[] = [];
  if (boat.marcaMotor) parts.push(boat.marcaMotor);
  if (boat.potencia) parts.push(boat.potencia);
  if (parts.length > 0) return parts.join(' · ');
  return boat.motorizacao || 'Motorização Homologada';
}

export function getTipoPropulsao(boat: PublicBoat): string {
  if (boat.tipoPropulsao) return boat.tipoPropulsao;
  const isJet = isJetSkiAsset(boat);
  return isJet ? 'Hidrojato' : 'Centro-Rabeta';
}

export function getHorasUso(boat: PublicBoat): string {
  const hrs = Number(boat.horasUso);
  if (isNaN(hrs) || hrs <= 0) return '0h (Zero Milhas)';
  return `${hrs}h de uso`;
}

function getCuratedBoatPhotos(boat: PublicBoat): string[] {
  const isJet = isJetSkiAsset(boat);
  const defaultGenericUrls = [
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
  ];

  const validCustomPhotos = (boat.fotos || []).filter(
    (url) =>
      url &&
      typeof url === 'string' &&
      !defaultGenericUrls.includes(url) &&
      !url.includes('1507652313519')
  );

  if (validCustomPhotos.length > 0) {
    return validCustomPhotos;
  }

  if (isJet) {
    return [studioJetImg];
  }

  return [studioBoatImg, editorialHeroBg];
}

function TricolorBar({ className = 'w-9 h-[2px]' }: { className?: string }) {
  return (
    <div className={`flex overflow-hidden shrink-0 ${className}`} aria-hidden="true">
      <span className="flex-1 bg-[#4f7d32]" />
      <span className="flex-1 bg-[#d6d3d1]" />
      <span className="flex-1 bg-[#b4402f]" />
    </div>
  );
}

export default function CatalogoPublicoPage({
  consultantMode = false,
  vendedorNomeProp,
  onBackToDashboard,
}: CatalogoPublicoPageProps = {}) {
  const [boats, setBoats] = useState<PublicBoat[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedor, setVendedor] = useState<VendedorInfo | null>(null);

  // Controles de Vitrine & Filtros (Apple Segmented Style)
  const [categoryFilter, setCategoryFilter] = useState<'jets' | 'yachts'>('jets');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'scarcity'>('featured');
  const [viewLayout, setViewLayout] = useState<'editorial' | 'grid'>('editorial');
  const [heroShowcaseType, setHeroShowcaseType] = useState<'yacht' | 'jet'>('yacht');

  // Galeria e Inspecionar Ativo
  const [activePhotoMap, setActivePhotoMap] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [dossierBoat, setDossierBoat] = useState<PublicBoat | null>(null);
  const [compareBoatId, setCompareBoatId] = useState<string>('');

  // Modal de Agendamento Private / Captação de Lead
  const [selectedBoatForModal, setSelectedBoatForModal] = useState<PublicBoat | null>(null);
  const [leadNome, setLeadNome] = useState('');
  const [leadTelefone, setLeadTelefone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [possuiPermuta, setPossuiPermuta] = useState(false);
  const [descricaoPermuta, setDescricaoPermuta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ whatsappUrl: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Studio do Consultor (UTM, Links e Placa QR Code)
  const [selectedUtm, setSelectedUtm] = useState('whatsapp');
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [copiedBriefKey, setCopiedBriefKey] = useState<string | null>(null);
  const [qrModalBoat, setQrModalBoat] = useState<PublicBoat | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Parâmetros de URL
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialBarcoId = searchParams.get('barco');
  const vendedorParam = searchParams.get('vendedor') || vendedorNomeProp || '';
  const utmSource = searchParams.get('utm_source') || 'catalogo';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';

  // Configurações personalizadas da Vitrine (via Painel de Gestão)
  const vitrineSettings = useMemo(() => {
    try {
      const stored = localStorage.getItem('vitrine_settings');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  }, []);

  const heroDescriptionText = useMemo(() => {
    const raw = vitrineSettings?.heroDescription;
    if (raw && !raw.toLowerCase().includes('tripula')) {
      return raw;
    }
    return 'Acesso ao mais alto padrão náutico com máxima inteligência financeira. Adquira a sua fração ideal de embarcações e motos aquáticas de alta performance com até 80% de economia, divisão justa de custos e gestão integral de marina.';
  }, [vitrineSettings]);

  // Fallback inteligente para dados locais ou mock caso API esteja offline
  const resolveFallbackList = (): PublicBoat[] => {
    try {
      const local = boatDB.getAll() || [];
      const valid = local.filter((b: any) => b.nome && !b.nome.toLowerCase().includes('test boat'));
      if (valid.length > 0) {
        return valid.map((b: any) => {
          const isJet = b.tipo === 'jet' || isJetSkiAsset({ nome: b.nome, modelo: b.modelo, fabricante: b.fabricante } as any);
          const fallbackImg = isJet ? studioJetImg : studioBoatImg;
          const fotos: string[] = [];
          if (b.imagemUrl) fotos.push(b.imagemUrl);
          if (fotos.length === 0) fotos.push(fallbackImg);
          return {
            id: b.id,
            nome: b.nome || '',
            modelo: b.modelo || (isJet ? 'GTI 130' : 'NX 280 Sport'),
            fabricante: b.fabricante || (isJet ? 'Sea-Doo' : 'NX Boats'),
            ano: Number(b.ano) || new Date().getFullYear(),
            motorizacao: b.potencia || b.tipo_propulsao || 'Motorização Homologada',
            potencia: b.potencia || '',
            marcaMotor: b.marcaMotor || '',
            tipoPropulsao: b.tipo_propulsao || (isJet ? 'Hidrojato' : 'Centro-Rabeta'),
            horasUso: Number(b.horasMotor) || Number(b.horimetroActual) || 0,
            capacidade: Number(b.capacidadePassageiros) || (isJet ? 3 : 8),
            fotos,
            imagemPrincipal: fotos[0],
            itensConforto: Array.isArray(b.acessorios)
              ? b.acessorios
              : [
                  'Churrasqueira Gourmet',
                  'Som Náutico Bluetooth',
                  'Toldo Retrátil',
                  'Ducha de Popa Pressurizada',
                  'Solário de Proa',
                  'Mesa de Centro Rebatível'
                ],
            valorCota: Number(b.valorCota) || 180000,
            taxaAdmMensal: Number(b.taxaAdmMensal) || 2500,
            totalCotas: Number(b.totalCotas) || 4,
            cotasDisponiveisCount: 1,
            cotasEstoqueCount: 1,
            cotasRepasseCount: 0,
            vaga: b.vaga || 'Marina Náutica Privativa',
            tamanho: b.tamanho ? String(b.tamanho) : (isJet ? '3 Lugares' : '28 pés'),
            statusMarina: 'na_marina'
          };
        });
      }
    } catch {}
    return getFallbackBoats();
  };

  // Carregar dados da Frota Pública
  useEffect(() => {
    let isMounted = true;
    const fetchCatalogo = async () => {
      try {
        setLoading(true);
        const query = vendedorParam ? `?vendedor=${encodeURIComponent(vendedorParam)}` : '';
        const res = await fetch(`/api/comercial/catalogo/public${query}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const rawBoats: PublicBoat[] = (data.barcos || []).filter(
              (b: PublicBoat) => b.nome && !b.nome.toLowerCase().includes('test boat')
            );
            const filtered = Array.isArray(vitrineSettings?.ocultosIds)
              ? rawBoats.filter((b) => !vitrineSettings.ocultosIds.includes(b.id))
              : rawBoats;
            setBoats(filtered.length > 0 ? filtered : resolveFallbackList());
            if (data.vendedor) setVendedor(data.vendedor);
          }
        } else {
          if (isMounted) setBoats(resolveFallbackList());
        }
      } catch {
        if (isMounted) setBoats(resolveFallbackList());
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCatalogo();
    return () => {
      isMounted = false;
    };
  }, [vendedorParam, vitrineSettings]);

  // Inicializa barco do comparador patrimonial
  useEffect(() => {
    if (boats.length > 0 && !compareBoatId) {
      setCompareBoatId(boats[0].id);
    }
  }, [boats, compareBoatId]);

  // Sincroniza categoria inicial com o inventário real disponível
  useEffect(() => {
    if (boats.length > 0) {
      const hasJets = boats.some((b) => isJetSkiAsset(b));
      const hasYachts = boats.some((b) => !isJetSkiAsset(b));
      if (categoryFilter === 'yachts' && !hasYachts && hasJets) {
        setCategoryFilter('jets');
      } else if (categoryFilter === 'jets' && !hasJets && hasYachts) {
        setCategoryFilter('yachts');
      }
    }
  }, [boats]);

  // Se veio parâmetro de barco específico na URL, rolar suavemente até ele
  useEffect(() => {
    if (!loading && initialBarcoId && boats.length > 0) {
      const target = boats.find((b) => b.id === initialBarcoId);
      if (target) {
        const el = document.getElementById(`asset-${initialBarcoId}`);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        }
      }
    }
  }, [loading, initialBarcoId, boats]);

  const activeConsultantName = vendedorNomeProp || vendedor?.nome || 'Consultoria Private El Mexicano';
  const activeConsultantWhatsapp = vendedor?.whatsapp || '558791229333';

  // Sistema inteligente de verificação do vendedor vinculado
  const vendedorVerification = useMemo(() => {
    const rawName = (vendedorNomeProp || vendedor?.nome || vendedorParam || '').trim();

    // Termos que indicam fallback/genérico e não uma pessoa física
    const termosGenericos = [
      'equipe',
      'comercial',
      'consultoria',
      'el mexicano',
      'atendimento',
      'mexicano',
      'admin',
      'vendas',
    ];
    const isNomeGenerico =
      !rawName || termosGenericos.some((t) => rawName.toLowerCase() === t || rawName.toLowerCase().includes(t));

    let primeiroNome = 'Consultor';
    if (!isNomeGenerico) {
      const firstWord = rawName.split(/[\s._-]+/)[0];
      if (firstWord) {
        primeiroNome = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      }
    } else if (vendedor?.nome) {
      const firstWord = vendedor.nome.split(/[\s._-]+/)[0];
      if (!termosGenericos.some((t) => firstWord.toLowerCase().includes(t))) {
        primeiroNome = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      }
    }

    // Validação inteligente:
    // 1. Possui número de WhatsApp válido (com DDD)
    const rawPhone = (vendedor?.whatsapp || '').replace(/\D/g, '');
    const hasValidPhone = rawPhone.length >= 10;

    // 2. Possui identificador registrado no banco de dados e não é o ID genérico 'comercial'
    const isRegisteredAdvisor = Boolean(vendedor?.id && vendedor.id !== 'comercial');

    // 3. Status de homologação / verificação
    const isVerificado = Boolean(!isNomeGenerico && (isRegisteredAdvisor || hasValidPhone || vendedorParam));

    const cargo = vendedor?.cargo || (isVerificado ? 'Consultor Náutico Homologado' : 'Canal Oficial');
    const whatsapp = hasValidPhone ? vendedor!.whatsapp : '558791229333';

    return {
      primeiroNome,
      nomeCompleto: rawName || 'Consultor El Mexicano',
      isVerificado,
      cargo,
      whatsapp,
    };
  }, [vendedorNomeProp, vendedor, vendedorParam]);

  // Filtragem e Ordenação da Coleção
  const filteredBoats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = boats.filter((b) => {
      const isJet = isJetSkiAsset(b);
      if (categoryFilter === 'yachts' && isJet) return false;
      if (categoryFilter === 'jets' && !isJet) return false;

      if (q) {
        const hay = `${b.nome} ${b.modelo} ${b.fabricante} ${b.motorizacao} ${b.vaga || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.valorCota - b.valorCota;
      if (sortBy === 'price_desc') return b.valorCota - a.valorCota;
      if (sortBy === 'scarcity') return a.cotasDisponiveisCount - b.cotasDisponiveisCount;
      // Featured: Lanchas primeiro, depois menor disponibilidade
      const aJet = isJetSkiAsset(a) ? 1 : 0;
      const bJet = isJetSkiAsset(b) ? 1 : 0;
      if (aJet !== bJet) return aJet - bJet;
      return a.cotasDisponiveisCount - b.cotasDisponiveisCount;
    });
  }, [boats, categoryFilter, searchQuery, sortBy]);

  // Métricas da Coleção
  const fleetMetrics = useMemo(() => {
    const totalAssets = boats.length;
    const totalYachts = boats.filter((b) => !isJetSkiAsset(b)).length;
    const totalJets = boats.filter((b) => isJetSkiAsset(b)).length;
    const totalFractionsAvailable = boats.reduce((acc, b) => acc + (Number(b.cotasDisponiveisCount) || 0), 0);
    return { totalAssets, totalYachts, totalJets, totalFractionsAvailable };
  }, [boats]);

  const selectedCompareBoat = useMemo(() => {
    return boats.find((b) => b.id === compareBoatId) || boats[0] || null;
  }, [boats, compareBoatId]);

  // Funções de Rastreamento & Compartilhamento (Consultor)
  const getTrackedUrl = (boatId?: string) => {
    const base = window.location.origin;
    const vendorEncoded = encodeURIComponent(activeConsultantName);
    const utm = encodeURIComponent(selectedUtm);
    if (boatId) {
      return `${base}/catalogo?barco=${boatId}&vendedor=${vendorEncoded}&utm_source=${utm}`;
    }
    return `${base}/catalogo?vendedor=${vendorEncoded}&utm_source=${utm}`;
  };

  const handleCopyLink = (boatId?: string) => {
    const url = getTrackedUrl(boatId);
    navigator.clipboard.writeText(url);
    const key = boatId || 'global';
    setCopiedLinkKey(key);
    setTimeout(() => setCopiedLinkKey(null), 2400);
  };

  const handleCopyExecutiveBrief = (boat: PublicBoat) => {
    const url = getTrackedUrl(boat.id);
    const isJet = isJetSkiAsset(boat);
    const specLine = isJet
      ? `${boat.fabricante} · ${boat.modelo} (${boat.ano})`
      : `${boat.fabricante} · ${boat.modelo} · ${boat.tamanho || '28 pés'} (${boat.ano})`;

    const text =
      `EL MEXICANO\n` +
      `Dossiê de Ativo Náutico — ${boat.modelo}\n\n` +
      `ESPECIFICAÇÕES TÉCNICAS\n` +
      `• Modelo: ${specLine}\n` +
      `• Propulsão: ${boat.motorizacao}\n` +
      `• Capacidade: ${boat.capacidade} passageiros\n` +
      `• Alocação: ${boat.vaga || 'Marina Náutica Privativa'}\n\n` +
      `ESTRUTURA SOCIETÁRIA & VALUATION\n` +
      `• Sistema: Cotas Inteligentes (${boat.totalCotas} frações totais)\n` +
      `• Disponibilidade atual: ${boat.cotasDisponiveisCount} ${boat.cotasDisponiveisCount === 1 ? 'fração disponível' : 'frações disponíveis'}\n` +
      `• Valor de aquisição da fração: R$ ${boat.valorCota.toLocaleString('pt-BR')}\n` +
      `• Taxa de gestão e marinharia: R$ ${boat.taxaAdmMensal.toLocaleString('pt-BR')}/mês\n\n` +
      `Ficha técnica e galeria completa:\n${url}\n\n` +
      `${activeConsultantName}\nConsultoria Náutica · El Mexicano`;

    navigator.clipboard.writeText(text);
    setCopiedBriefKey(boat.id);
    setTimeout(() => setCopiedBriefKey(null), 2400);
  };

  const handleOpenQrStudio = async (boat: PublicBoat) => {
    setQrModalBoat(boat);
    setQrGenerating(true);
    try {
      const url = getTrackedUrl(boat.id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 520,
        margin: 1,
        color: {
          dark: '#111113',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error('Erro ao gerar QR Code:', e);
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !qrModalBoat) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `el_mexicano_${qrModalBoat.modelo.toLowerCase().replace(/\s+/g, '_')}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPlacaMarina = () => {
    if (!qrModalBoat || !qrDataUrl) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Dossiê Píer — ${qrModalBoat.modelo} | El Mexicano</title>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif;
            color: #111113;
            background: #FFFFFF;
            margin: 0;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
          }
          .sheet {
            border: 1px solid #D4D4D8;
            padding: 56px 48px;
            max-width: 620px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .tricolor {
            display: flex;
            width: 54px;
            height: 2px;
            margin-bottom: 28px;
          }
          .tricolor span:nth-child(1) { flex: 1; background: #4f7d32; }
          .tricolor span:nth-child(2) { flex: 1; background: #d6d3d1; }
          .tricolor span:nth-child(3) { flex: 1; background: #b4402f; }
          .eyebrow {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #71717A;
            margin-bottom: 10px;
          }
          .title {
            font-size: 38px;
            font-weight: 600;
            letter-spacing: -0.035em;
            color: #111113;
            margin: 0 0 8px;
          }
          .subtitle {
            font-size: 14px;
            color: #52525B;
            letter-spacing: -0.01em;
            margin-bottom: 36px;
          }
          .qr-frame {
            padding: 20px;
            border: 1px solid #E4E4E7;
            background: #FAFAFA;
            margin-bottom: 32px;
          }
          .qr-frame img {
            width: 240px;
            height: 240px;
            display: block;
          }
          .specs {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            width: 100%;
            border-top: 1px solid #E4E4E7;
            border-bottom: 1px solid #E4E4E7;
            padding: 18px 0;
            margin-bottom: 28px;
          }
          .spec-item {
            border-right: 1px solid #E4E4E7;
            padding: 0 12px;
          }
          .spec-item:last-child { border-right: none; }
          .spec-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #71717A;
            display: block;
            margin-bottom: 4px;
          }
          .spec-val {
            font-size: 13px;
            font-weight: 600;
            color: #111113;
          }
          .instruction {
            font-size: 13px;
            color: #3F3F46;
            max-width: 400px;
            line-height: 1.55;
            margin-bottom: 36px;
          }
          .footer {
            width: 100%;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #71717A;
            padding-top: 20px;
            border-top: 1px solid #F4F4F5;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="tricolor"><span></span><span></span><span></span></div>
          <div class="eyebrow">El Mexicano</div>
          <h1 class="title">${qrModalBoat.modelo}</h1>
          <div class="subtitle">${qrModalBoat.fabricante} · Ano ${qrModalBoat.ano}</div>
          <div class="qr-frame">
            <img src="${qrDataUrl}" alt="QR Code" />
          </div>
          <div class="specs">
            <div class="spec-item">
              <span class="spec-label">Sistema Societário</span>
              <span class="spec-val">${qrModalBoat.cotasDisponiveisCount} de ${qrModalBoat.totalCotas} disponíveis</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Capacidade</span>
              <span class="spec-val">${qrModalBoat.capacidade} Passageiros</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Aquisição da Fração</span>
              <span class="spec-val">R$ ${qrModalBoat.valorCota.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div class="instruction">
            Aponte a câmera do smartphone para acessar o dossiê completo do ativo, especificações de engenharia e agendamento de visita privada na Marina.
          </div>
          <div class="footer">
            <span>Consultor: ${activeConsultantName}</span>
            <span>Gestão Vale Administradora</span>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // Formatador de Telefone no Input
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 7 && raw.length <= 11) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 11) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setLeadTelefone(formatted);
  };

  // Envio de Lead para o CRM
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = leadTelefone.replace(/\D/g, '');
    if (!leadNome.trim()) {
      setFormError('Informe seu nome completo para registro do atendimento.');
      return;
    }
    if (cleanPhone.length < 10) {
      setFormError('Informe um número de telefone válido com DDD.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nome: leadNome.trim(),
        telefone: leadTelefone.trim(),
        email: leadEmail.trim() || undefined,
        embarcacaoId: selectedBoatForModal?.id,
        vendedorId: vendedor?.id,
        vendedorNome: activeConsultantName,
        origem: utmSource || 'catalogo',
        possuiPermuta,
        descricaoPermuta: possuiPermuta ? descricaoPermuta.trim() : undefined,
        utmSource,
        utmMedium,
        utmCampaign,
      };

      const res = await fetch('/api/leads/captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível concluir a solicitação.');
      }

      setSuccessResult({
        whatsappUrl: data.whatsappUrl,
        message: data.message || 'Atendimento alocado ao consultor responsável.',
      });

      if (data.whatsappUrl) {
        setTimeout(() => {
          window.location.href = data.whatsappUrl;
        }, 1400);
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro de comunicação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const openConversionModal = (boat: PublicBoat) => {
    setSelectedBoatForModal(boat);
    setFormError(null);
    setSuccessResult(null);
  };

  const closeConversionModal = () => {
    setSelectedBoatForModal(null);
    setSuccessResult(null);
    setFormError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#111113] font-sans antialiased selection:bg-[#2B1120] selection:text-white">
      {/* ── BARRA EXECUTIVA DO CONSULTOR (Quando aberto no Painel Comercial) ── */}
      {consultantMode && (
        <div className="bg-[#111113] text-white border-b border-white/10 px-4 sm:px-8 py-2.5 text-xs">
          <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors pr-3 border-r border-white/15 cursor-pointer"
                >
                  <NavArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Painel</span>
                </button>
              )}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Studio de Captação
              </span>
              <span className="text-neutral-300 hidden md:inline">
                Consultor: <strong className="text-white font-medium">{activeConsultantName}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">Canal UTM</span>
                <select
                  value={selectedUtm}
                  onChange={(e) => setSelectedUtm(e.target.value)}
                  className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                >
                  {UTM_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-[#111113] text-white">
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleCopyLink()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#111113] hover:bg-neutral-200 font-medium transition-colors cursor-pointer"
              >
                {copiedLinkKey === 'global' ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Link Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>Copiar Link da Coleção</span>
                  </>
                )}
              </button>

              <a
                href={getTrackedUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Abrir vitrine pública em nova guia"
              >
                <span>Vitrine Externa</span>
                <OpenNewWindow className="w-3.5 h-3.5" strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVEGAÇÃO ARQUITETÔNICA (Apple Glass Header) ────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FBFBFD]/85 backdrop-blur-xl border-b border-black/[0.06] transition-colors">
        <TricolorBar className="w-full h-[2.5px]" />
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          {/* Identidade El Mexicano */}
          <div className="flex items-center gap-4">
            <a
              href="#top"
              className="flex items-center group focus:outline-none"
              aria-label="El Mexicano — Início do Catálogo"
            >
              <img
                src={logoMexicano}
                alt="El Mexicano"
                className="h-8 sm:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>
          </div>

          {/* Navegação Rápida de Seções */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-medium text-neutral-500">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('jets');
                document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#111113] transition-colors cursor-pointer"
            >
              Jetski ({fleetMetrics.totalJets})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('yachts');
                document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#111113] transition-colors cursor-pointer"
            >
              Lancha ({fleetMetrics.totalYachts})
            </button>
            <a href="#arquitetura-patrimonial" className="hover:text-[#111113] transition-colors">
              Arquitetura Patrimonial
            </a>
          </nav>

          {/* Atendimento Direto — Consultor Verificado */}
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${vendedorVerification.whatsapp}?text=${encodeURIComponent(
                `Olá, ${vendedorVerification.primeiroNome}! Estou no Catálogo da El Mexicano e gostaria de atendimento.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-xs font-medium tracking-tight transition-all cursor-pointer group shadow-2xs border border-white/10"
              title={
                vendedorVerification.isVerificado
                  ? `${vendedorVerification.primeiroNome} · ${vendedorVerification.cargo} (Verificado)`
                  : 'Atendimento Comercial Oficial'
              }
            >
              {/* Indicador inteligente de verificação / online */}
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>

              <span>{vendedorVerification.primeiroNome}</span>

              {vendedorVerification.isVerificado && (
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400"
                  title="Consultor Homologado e Verificado"
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                </span>
              )}

              <ArrowUpRight
                className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.75}
              />
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO MONUMENTAL (Inspiração Apple Studio + Nike Lookbook) ─────── */}
      <section id="top" className="relative overflow-hidden bg-[#FFFFFF] border-b border-black/[0.06]">
        {/* Marca d'água arquitetônica da logo El Mexicano em grande escala */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.028] hidden xl:block"
        >
          <img src={logoMexicano} alt="" className="w-[760px] h-auto object-contain grayscale" />
        </div>

        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Coluna Tipográfica */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                {/* Assinatura Tricolor Minimalista El Mexicano */}
                <div className="flex items-center gap-3">
                  <TricolorBar className="w-10 h-[2.5px]" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    {vitrineSettings?.collectionTag || `El Mexicano · Custo-Benefício & Fração Inteligente`}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-semibold tracking-[-0.04em] leading-[1.02] text-[#111113]">
                  {vitrineSettings?.heroTitle || 'Toda a experiência náutica.'}
                  <br />
                  <span className="text-neutral-400">
                    {vitrineSettings?.heroSubtitle || 'Com até 80% de economia.'}
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-neutral-600 font-normal leading-relaxed max-w-xl tracking-[-0.01em]">
                  {heroDescriptionText}
                </p>
              </div>

              {/* Ações Principais */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#colecao"
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-sm font-medium tracking-tight transition-all group"
                >
                  <span>Explorar Frota Disponível</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                    strokeWidth={1.75}
                  />
                </a>

                <a
                  href="#arquitetura-patrimonial"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-neutral-300 hover:border-[#111113] text-[#111113] text-sm font-medium tracking-tight transition-colors"
                >
                  <span>Comparar Economia Real</span>
                </a>
              </div>

              {/* Métricas Estruturais de Custo-Benefício */}
              <div className="pt-8 border-t border-neutral-200/80 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                    Economia Inicial
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#111113] mt-1 block">
                    Até 80%
                  </span>
                  <span className="text-xs text-neutral-500">Menos aporte de capital</span>
                </div>

                <div className="border-l border-neutral-200/80 pl-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                    Custos Rateados
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#111113] mt-1 block">
                    1/4 e 1/8
                  </span>
                  <span className="text-xs text-neutral-500">Marina, seguro & revisão</span>
                </div>

                <div className="border-l border-neutral-200/80 pl-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                    Uso Inteligente
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#111113] mt-1 block">
                    Zero Ociosidade
                  </span>
                  <span className="text-xs text-neutral-500">Pague só o que usa</span>
                </div>
              </div>
            </div>

            {/* Coluna Studio Stage (Apple Product Stage com recorte puro) */}
            <div className="lg:col-span-6">
              <div className="relative bg-[#F5F5F7] rounded-3xl p-6 sm:p-10 border border-black/[0.05]">
                {/* Seletor de Categoria em Destaque no Stage */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TricolorBar className="w-6 h-[2px]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                        Showroom Studio
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#111113]">
                      {heroShowcaseType === 'yacht' ? 'Linha Yachts & Sport Boats' : 'Linha High-Output Watercraft'}
                    </h2>
                  </div>

                  <div className="inline-flex p-1 rounded-full bg-neutral-200/70 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setHeroShowcaseType('jet')}
                      className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                        heroShowcaseType === 'jet'
                          ? 'bg-white text-[#111113] shadow-2xs font-semibold'
                          : 'text-neutral-600 hover:text-[#111113]'
                      }`}
                    >
                      Jetski
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroShowcaseType('yacht')}
                      className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                        heroShowcaseType === 'yacht'
                          ? 'bg-white text-[#111113] shadow-2xs font-semibold'
                          : 'text-neutral-600 hover:text-[#111113]'
                      }`}
                    >
                      Lancha
                    </button>
                  </div>
                </div>

                {/* Imagem Studio com Transição Suave */}
                <div className="relative h-[280px] sm:h-[360px] flex items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={heroShowcaseType}
                      src={heroShowcaseType === 'yacht' ? studioBoatImg : studioJetImg}
                      alt={heroShowcaseType === 'yacht' ? 'NX Boats NX280 Studio' : 'Sea-Doo RXT-X 300 Studio'}
                      initial={{ opacity: 0, scale: 0.96, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -8 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="max-h-full max-w-full object-contain mix-blend-multiply select-none"
                    />
                  </AnimatePresence>
                </div>

                {/* Especificação de Rodapé do Stage */}
                <div className="mt-4 pt-5 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-mono uppercase tracking-wider">
                        Destaque da Linha
                      </span>
                      <span className="font-semibold text-[#111113]">
                        {heroShowcaseType === 'yacht' ? 'NX Boats · Focker · Phoenix' : 'Sea-Doo RXT-X 300 · Wake · GTI'}
                      </span>
                    </div>
                    <div className="hidden sm:block border-l border-neutral-200 pl-6">
                      <span className="text-neutral-400 block text-[10px] font-mono uppercase tracking-wider">
                        Operação
                      </span>
                      <span className="font-medium text-neutral-700">Marina, Seguro & Gestão Rateados</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter(heroShowcaseType === 'yacht' ? 'yachts' : 'jets');
                      document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 font-medium text-[#111113] hover:text-[#2B1120] transition-colors cursor-pointer group"
                  >
                    <span>Ver {heroShowcaseType === 'yacht' ? 'Lanchas' : 'Jetskis'}</span>
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATÁLOGO DE ATIVOS (Apple Spec Grid & Editorial Lookbook) ──────── */}
      <main id="colecao" className="max-w-[1360px] mx-auto px-4 sm:px-8 py-16 sm:py-24 space-y-12">
        {/* Cabeçalho da Coleção & Barra de Filtros Minimalista */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <TricolorBar className="w-8 h-[2px]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400 block">
                  Portfólio de Ativos
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113]">
                Frota Disponível para Aquisição.
              </h2>
            </div>

            <p className="text-sm text-neutral-500 max-w-md leading-relaxed">
              Todos os ativos listados encontram-se operacionais na Marina, revisados e com frações disponíveis para
              transferência imediata de titularidade.
            </p>
          </div>

          {/* Barra de Controle Apple Segmented + Busca */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Abas de Categoria — Apenas Jetski e Lancha */}
            <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-xl">
              {[
                { id: 'jets' as const, label: 'Jetski', count: fleetMetrics.totalJets },
                { id: 'yachts' as const, label: 'Lancha', count: fleetMetrics.totalYachts },
              ].map((tab) => {
                const active = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`relative px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                      active
                        ? 'bg-white text-[#111113] shadow-2xs font-semibold'
                        : 'text-neutral-500 hover:text-[#111113]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        active ? 'text-[#111113]' : 'text-neutral-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Busca, Ordenação e Modo de Exibição */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search
                  className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.6}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar modelo, estaleiro..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-neutral-300 text-xs text-[#111113] placeholder:text-neutral-400 outline-none transition-all"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Ordenar ativos"
                className="px-3.5 py-2 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200/70 text-xs font-medium text-[#111113] outline-none cursor-pointer transition-colors"
              >
                <option value="featured">Curadoria El Mexicano</option>
                <option value="scarcity">Menor Disponibilidade</option>
                <option value="price_asc">Menor Valor de Fração</option>
                <option value="price_desc">Maior Valor de Fração</option>
              </select>

              <div className="hidden sm:inline-flex items-center bg-[#F5F5F7] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewLayout('editorial')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'editorial' ? 'bg-white text-[#111113] shadow-2xs' : 'text-neutral-400 hover:text-[#111113]'
                  }`}
                  title="Visualização Editorial"
                >
                  <List className="w-4 h-4" strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'grid' ? 'bg-white text-[#111113] shadow-2xs' : 'text-neutral-400 hover:text-[#111113]'
                  }`}
                  title="Visualização em Grade"
                >
                  <ViewGrid className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estado de Carregamento ou Lista de Ativos */}
        {loading ? (
          <div className="py-28 text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#111113] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
              Sincronizando disponibilidade da frota...
            </p>
          </div>
        ) : filteredBoats.length === 0 ? (
          <div className="bg-white rounded-3xl border border-black/[0.06] p-16 text-center max-w-lg mx-auto space-y-4">
            <Compass className="w-8 h-8 text-neutral-400 mx-auto" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-[#111113] tracking-tight">
              Nenhum ativo corresponde ao filtro selecionado.
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Redefina os critérios de busca ou consulte diretamente nossa equipe para verificar frações em processo de
              liberação contratual.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter(categoryFilter === 'jets' ? 'yachts' : 'jets');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-full bg-[#111113] text-white text-xs font-medium cursor-pointer"
            >
              Alternar Categoria
            </button>
          </div>
        ) : (
          <div
            className={
              viewLayout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
                : 'space-y-10'
            }
          >
            {filteredBoats.map((boat, index) => {
              const isJet = isJetSkiAsset(boat);
              const curatedPhotos = getCuratedBoatPhotos(boat);
              const activeIdx = activePhotoMap[boat.id] || 0;
              const rawCurrentPhoto = curatedPhotos[activeIdx] || curatedPhotos[0];
              const imageKey = `${boat.id}-${activeIdx}`;
              const displayPhoto = failedImages[imageKey]
                ? isJet
                  ? studioJetImg
                  : studioBoatImg
                : rawCurrentPhoto;
              const isStudioCutout = displayPhoto === studioJetImg || displayPhoto === studioBoatImg;
              const isHighlighted = initialBarcoId === boat.id;
              const occupiedCotas = Math.max(0, boat.totalCotas - boat.cotasDisponiveisCount);

              return (
                <article
                  id={`asset-${boat.id}`}
                  key={boat.id}
                  className={`group bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isHighlighted
                      ? 'border-[#2B1120] ring-1 ring-[#2B1120]'
                      : 'border-black/[0.06] hover:border-black/[0.15]'
                  }`}
                >
                  <div
                    className={
                      viewLayout === 'grid'
                        ? 'flex flex-col h-full'
                        : 'grid grid-cols-1 lg:grid-cols-12'
                    }
                  >
                    {/* ── PALCO DE IMAGEM DO ATIVO ─────────────────────────── */}
                    <div
                      className={`${
                        viewLayout === 'grid' ? 'w-full h-[280px]' : 'lg:col-span-6 min-h-[320px] sm:min-h-[420px]'
                      } relative bg-[#F5F5F7] flex flex-col justify-between overflow-hidden`}
                    >
                      {/* Barra Superior Silenciosa sobre a Imagem */}
                      <div className="relative z-10 p-5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-black/[0.05] inline-flex items-center gap-2">
                          <TricolorBar className="w-4 h-[1.5px]" />
                          {String(index + 1).padStart(2, '0')} · {isJet ? 'WATERCRAFT' : 'YACHT / SPORT'}
                        </span>

                        {/* Indicador Minimalista de Disponibilidade (Sem Emojis / Sem Chamas) */}
                        <span className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md text-[#111113] text-xs font-medium px-3.5 py-1 rounded-full border border-black/[0.06] tabular-nums">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              boat.cotasDisponiveisCount === 1 ? 'bg-[#b4402f]' : 'bg-[#111113]'
                            }`}
                          />
                          {boat.cotasDisponiveisCount === 1
                            ? 'Última fração disponível'
                            : `${boat.cotasDisponiveisCount} de ${boat.totalCotas} frações livres`}
                        </span>
                      </div>

                      {/* Imagem Central */}
                      <div
                        onClick={() => setDossierBoat(boat)}
                        className="relative flex-1 flex items-center justify-center px-6 py-4 cursor-pointer"
                      >
                        <img
                          src={displayPhoto}
                          alt={boat.modelo}
                          onError={() => setFailedImages((prev) => ({ ...prev, [imageKey]: true }))}
                          className={`transition-transform duration-700 ease-out group-hover:scale-[1.03] ${
                            isStudioCutout
                              ? 'max-h-[240px] sm:max-h-[290px] w-auto object-contain mix-blend-multiply'
                              : 'absolute inset-0 w-full h-full object-cover'
                          }`}
                          loading="lazy"
                        />
                      </div>

                      {/* Rodapé da Galeria */}
                      <div className="relative z-10 p-5 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-neutral-600 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-black/[0.05]">
                          {boat.vaga || 'Marina Náutica Privativa'}
                        </span>

                        {curatedPhotos.length > 1 && (
                          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full border border-black/[0.06]">
                            <button
                              type="button"
                              onClick={() =>
                                setActivePhotoMap((prev) => ({
                                  ...prev,
                                  [boat.id]: (activeIdx - 1 + curatedPhotos.length) % curatedPhotos.length,
                                }))
                              }
                              className="p-1 text-neutral-500 hover:text-[#111113] cursor-pointer"
                              aria-label="Foto anterior"
                            >
                              <NavArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                            <span className="font-mono text-[10px] tabular-nums text-neutral-600 px-1">
                              {activeIdx + 1}/{curatedPhotos.length}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setActivePhotoMap((prev) => ({
                                  ...prev,
                                  [boat.id]: (activeIdx + 1) % curatedPhotos.length,
                                }))
                              }
                              className="p-1 text-neutral-500 hover:text-[#111113] cursor-pointer"
                              aria-label="Próxima foto"
                            >
                              <NavArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── ESPECIFICAÇÕES DE ENGENHARIA & VALUATION ─────────── */}
                    <div
                      className={`${
                        viewLayout === 'grid' ? 'flex-1' : 'lg:col-span-6'
                      } p-6 sm:p-10 flex flex-col justify-between space-y-8`}
                    >
                      <div className="space-y-6">
                        {/* Título e Estaleiro */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                              <span>{boat.fabricante}</span>
                              <span>·</span>
                              <span>Série {boat.ano}</span>
                              {boat.cotasRepasseCount > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#2B1120] font-semibold">Repasse Ativo</span>
                                </>
                              )}
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111113] mt-1">
                              {boat.modelo}
                            </h3>
                            <p className="text-sm text-neutral-500 mt-0.5">
                              {boat.fabricante} { !isJet && boat.tamanho ? `· ${boat.tamanho}` : '' }
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDossierBoat(boat)}
                            className="text-xs font-medium text-neutral-500 hover:text-[#111113] inline-flex items-center gap-1 py-1 px-2.5 rounded-full border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer shrink-0"
                          >
                            <span>Ficha Completa</span>
                            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                          </button>
                        </div>

                        {/* Barra Visual de Composição Societária (Inspiração Apple Storage Bar) */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500 font-medium">Composição Societária do Ativo</span>
                            <span className="font-mono text-[11px] tabular-nums text-[#111113]">
                              {occupiedCotas} {occupiedCotas === 1 ? 'alocada' : 'alocadas'} ·{' '}
                              <strong>{boat.cotasDisponiveisCount} disponível</strong>
                            </span>
                          </div>
                          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${boat.totalCotas}, minmax(0, 1fr))` }}>
                            {Array.from({ length: boat.totalCotas }).map((_, segIdx) => {
                              const isOccupied = segIdx < occupiedCotas;
                              return (
                                <div
                                  key={segIdx}
                                  className={`h-1.5 rounded-full transition-colors ${
                                    isOccupied ? 'bg-neutral-200' : 'bg-[#2B1120]'
                                  }`}
                                  title={isOccupied ? `Cota ${segIdx + 1}: Alocada` : `Cota ${segIdx + 1}: Disponível para aquisição`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Grade Arquitetônica de Engenharia & Performance */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-neutral-200/80 py-4 gap-4">
                          <div className="pr-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                              Motorização Exata
                            </span>
                            <span
                              className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block truncate"
                              title={getMotorizacaoExata(boat)}
                            >
                              {getMotorizacaoExata(boat)}
                            </span>
                            <span className="text-[11px] text-neutral-500 block mt-0.5 truncate">
                              {getTipoPropulsao(boat)}
                            </span>
                          </div>

                          <div className="sm:border-l border-neutral-200/80 sm:px-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                              Horímetro Atual
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block tabular-nums">
                              {getHorasUso(boat)}
                            </span>
                            <span className="text-[11px] text-neutral-500 block mt-0.5">
                              Horas de uso
                            </span>
                          </div>

                          <div className="sm:border-l border-neutral-200/80 sm:px-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                              Capacidade Homologada
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block tabular-nums">
                              {boat.capacidade} passageiros
                            </span>
                            <span className="text-[11px] text-neutral-500 block mt-0.5">
                              Lotação autorizada
                            </span>
                          </div>

                          <div className="sm:border-l border-neutral-200/80 sm:pl-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                              Divisão Societária
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block tabular-nums">
                              Fração 1/{boat.totalCotas} avos
                            </span>
                            <span className="text-[11px] text-neutral-500 block mt-0.5">
                              Vale Administradora
                            </span>
                          </div>
                        </div>

                        {/* Configuração de Bordo (Tipográfica, sem ícones repetitivos) */}
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block mb-2">
                            Configuração & Equipamentos de Série
                          </span>
                          <p className="text-xs text-neutral-600 leading-relaxed">
                            {boat.itensConforto.join('  ·  ')}
                          </p>
                        </div>
                      </div>

                      {/* Bloco de Valuation & CTAs */}
                      <div className="pt-6 border-t border-neutral-200/80 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                              Investimento da Fração (1/{boat.totalCotas})
                            </span>
                            <div className="flex items-baseline gap-3 mt-1">
                              <span className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] tabular-nums text-[#111113]">
                                R$ {boat.valorCota.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-xs text-neutral-500 tabular-nums">
                                + R$ {boat.taxaAdmMensal.toLocaleString('pt-BR')}/mês
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 mt-0.5 block">
                              Taxa mensal contempla vaga privativa, seguro e manutenção preventiva.
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openConversionModal(boat)}
                              className="px-6 py-3.5 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-xs sm:text-sm font-medium tracking-tight transition-all cursor-pointer inline-flex items-center gap-2 group/btn"
                            >
                              <span>Agendar Visita Privada</span>
                              <ArrowRight
                                className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                                strokeWidth={1.75}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Ferramentas do Consultor por Embarcação (Visível apenas em consultantMode) */}
                        {consultantMode && (
                          <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                              Ações do Consultor
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenQrStudio(boat)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                                <span>Placa QR Píer</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyExecutiveBrief(boat)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium transition-colors cursor-pointer"
                              >
                                {copiedBriefKey === boat.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    <span>Dossiê Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                                    <span>Copiar Dossiê Executivo</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyLink(boat.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#111113] font-medium transition-colors cursor-pointer"
                              >
                                <ShareIos className="w-3.5 h-3.5" strokeWidth={1.6} />
                                <span>{copiedLinkKey === boat.id ? 'Link Copiado' : 'Link Direto'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── ARQUITETURA PATRIMONIAL (Comparador Interativo Apple Style) ─────── */}
      {selectedCompareBoat && (
        <section
          id="arquitetura-patrimonial"
          className="bg-white border-t border-black/[0.06] py-20 sm:py-28 px-4 sm:px-8"
        >
          <div className="max-w-[1360px] mx-auto space-y-14">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-neutral-200/80 pb-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <TricolorBar className="w-8 h-[2px]" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400 block">
                    Racionalidade Patrimonial & Custo-Benefício
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-[#111113] leading-tight">
                  Propriedade Integral vs.
                  <br />
                  <span className="text-neutral-400">Fração El Mexicano.</span>
                </h2>
              </div>

              {/* Seletor de Ativo para Simulação Real */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                  Simular com o Ativo
                </label>
                <select
                  value={selectedCompareBoat.id}
                  onChange={(e) => setCompareBoatId(e.target.value)}
                  className="w-full sm:w-80 px-4 py-3 rounded-xl bg-[#F5F5F7] border border-neutral-200 text-sm font-medium text-[#111113] outline-none cursor-pointer"
                >
                  {boats.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.modelo} — {b.fabricante} (R$ {b.valorCota.toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela Comparativa de Precisão */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Modelo Tradicional 100% */}
              <div className="lg:col-span-5 bg-[#F5F5F7] rounded-3xl p-8 sm:p-10 border border-black/[0.04] flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                      Aquisição Tradicional (100%)
                    </span>
                    <h3 className="text-xl font-semibold text-neutral-700 mt-1">
                      Propriedade Individual Isolada
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-neutral-200/80">
                    <span className="text-xs text-neutral-500 block">Capital Imobilizado Estimado</span>
                    <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-neutral-500 mt-1 block">
                      R$ {(selectedCompareBoat.valorCota * selectedCompareBoat.totalCotas).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <dl className="space-y-4 pt-4 border-t border-neutral-200/80 text-xs">
                    <div className="flex justify-between gap-4 py-1">
                      <dt className="text-neutral-500">Custo Operacional Mensal</dt>
                      <dd className="font-medium text-neutral-800 tabular-nums">100% assumido pelo titular</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-1 border-t border-neutral-200/60 pt-3">
                      <dt className="text-neutral-500">Gestão Operacional & Limpeza</dt>
                      <dd className="font-medium text-neutral-800">Contratação e encargos próprios</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-1 border-t border-neutral-200/60 pt-3">
                      <dt className="text-neutral-500">Manutenção Preventiva</dt>
                      <dd className="font-medium text-neutral-800">Tempo ocioso sob gestão do dono</dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Estatisticamente, embarcações de propriedade individual permanecem ociosas na marina por mais de 330
                  dias ao ano, absorvendo depreciação e custo fixo integral.
                </p>
              </div>

              {/* Modelo Fração Inteligente El Mexicano */}
              <div className="lg:col-span-7 bg-[#111113] text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden">
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <TricolorBar className="w-6 h-[2px]" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                          Sistema Societário El Mexicano
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white mt-1">
                        {selectedCompareBoat.modelo} · Fração 1/{selectedCompareBoat.totalCotas}
                      </h3>
                    </div>
                    <img
                      src={logoMexicano}
                      alt="El Mexicano"
                      className="h-8 w-auto object-contain brightness-0 invert opacity-90"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <span className="text-xs text-neutral-400 block">Valor de Aquisição da Cota</span>
                      <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-white mt-1 block">
                        R$ {selectedCompareBoat.valorCota.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[11px] text-neutral-400 mt-1 block">
                        Economia de capital de{' '}
                        {Math.round(((selectedCompareBoat.totalCotas - 1) / selectedCompareBoat.totalCotas) * 100)}% na
                        aquisição
                      </span>
                    </div>

                    <div className="sm:border-l border-white/10 sm:pl-6">
                      <span className="text-xs text-neutral-400 block">Taxa Condominial Rateada</span>
                      <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-white mt-1 block">
                        R$ {selectedCompareBoat.taxaAdmMensal.toLocaleString('pt-BR')}
                        <span className="text-sm font-normal text-neutral-400">/mês</span>
                      </span>
                      <span className="text-[11px] text-neutral-400 mt-1 block">
                        Vaga na marina, manutenção e seguro inclusos
                      </span>
                    </div>
                  </div>

                  <dl className="space-y-3 pt-4 border-t border-white/10 text-xs">
                    <div className="flex justify-between gap-4 py-1">
                      <dt className="text-neutral-400">Operação de Descida & Abastecimento</dt>
                      <dd className="font-medium text-white">Pronta no píer mediante agendamento digital</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-1 border-t border-white/10 pt-3">
                      <dt className="text-neutral-400">Governança Financeira & Jurídica</dt>
                      <dd className="font-medium text-white">Auditada pela Vale Administradora</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-1 border-t border-white/10 pt-3">
                      <dt className="text-neutral-400">Liquidez Patrimonial</dt>
                      <dd className="font-medium text-white">Direito de repasse assistido pela mesa comercial</dd>
                    </div>
                  </dl>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <span className="text-xs text-neutral-400">
                    Restam {selectedCompareBoat.cotasDisponiveisCount} de {selectedCompareBoat.totalCotas} frações
                    neste ativo.
                  </span>

                  <button
                    type="button"
                    onClick={() => openConversionModal(selectedCompareBoat)}
                    className="px-6 py-3 rounded-full bg-white text-[#111113] hover:bg-neutral-200 text-xs font-semibold tracking-tight transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Solicitar Proposta desta Fração</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── MODAL DOSSIÊ TÉCNICO DO ATIVO (Inspeção Detalhada) ──────────────── */}
      <AnimatePresence>
        {dossierBoat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDossierBoat(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-10 space-y-8"
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <img src={logoMexicano} alt="El Mexicano" className="h-5 w-auto object-contain" />
                    <TricolorBar className="w-5 h-[2px]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                      Dossiê Técnico de Ativo
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111113] pt-1">
                    {dossierBoat.modelo}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {dossierBoat.fabricante} {!isJetSkiAsset(dossierBoat) && dossierBoat.tamanho ? `· ${dossierBoat.tamanho}` : ''} · Ano {dossierBoat.ano}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDossierBoat(null)}
                  className="p-2 rounded-full text-neutral-400 hover:text-[#111113] hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Xmark className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Motorização Exata
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block">
                    {getMotorizacaoExata(dossierBoat)}
                  </span>
                  <span className="text-neutral-500 text-[11px] mt-0.5 block">
                    Propulsão: {getTipoPropulsao(dossierBoat)}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Horímetro Atual
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block tabular-nums">
                    {getHorasUso(dossierBoat)}
                  </span>
                  <span className="text-neutral-500 text-[11px] mt-0.5 block">
                    Horas de navegação
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Capacidade Homologada
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block tabular-nums">
                    {dossierBoat.capacidade} passageiros
                  </span>
                  <span className="text-neutral-500 text-[11px] mt-0.5 block">
                    Lotação oficial homologada
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Localização / Marina
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block">
                    {dossierBoat.vaga || 'Marina Náutica Privativa'}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Quadro Societário Total
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block">
                    {dossierBoat.totalCotas} frações ({dossierBoat.cotasDisponiveisCount} disponível)
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Taxa de Gestão & Marina
                  </span>
                  <span className="font-semibold text-[#111113] text-sm mt-1 block">
                    R$ {dossierBoat.taxaAdmMensal.toLocaleString('pt-BR')}/mês
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-neutral-200 pt-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                  Memorial Descritivo de Equipamentos
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-neutral-700">
                  {dossierBoat.itensConforto.map((item, i) => (
                    <div key={i} className="py-2 px-3 rounded-xl bg-[#F5F5F7] font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    Valor da Fração
                  </span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-[#111113]">
                    R$ {dossierBoat.valorCota.toLocaleString('pt-BR')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const target = dossierBoat;
                    setDossierBoat(null);
                    openConversionModal(target);
                  }}
                  className="px-6 py-3.5 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>Agendar Visita Privada na Marina</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL DE AGENDAMENTO PRIVATE / CAPTAÇÃO DE LEAD ───────────────── */}
      <AnimatePresence>
        {selectedBoatForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeConversionModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho Minimalista */}
              <div className="p-6 sm:p-8 border-b border-neutral-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <img src={logoMexicano} alt="El Mexicano" className="h-5 w-auto object-contain" />
                    <TricolorBar className="w-5 h-[2px]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                      Atendimento Exclusivo
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111113] pt-1">
                    {selectedBoatForModal.modelo}
                  </h3>
                  <p className="text-xs text-neutral-500 tabular-nums">
                    {selectedBoatForModal.fabricante} · Fração 1/{selectedBoatForModal.totalCotas}: R${' '}
                    {selectedBoatForModal.valorCota.toLocaleString('pt-BR')} ·{' '}
                    {selectedBoatForModal.cotasDisponiveisCount} disponível
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeConversionModal}
                  className="p-2 rounded-full text-neutral-400 hover:text-[#111113] hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Xmark className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {/* Corpo do Formulário */}
              <div className="p-6 sm:p-8">
                {successResult ? (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-12 h-12 rounded-full bg-[#111113] text-white flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" strokeWidth={1.6} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold text-[#111113]">Solicitação Registrada</h4>
                      <p className="text-xs text-neutral-500">{successResult.message}</p>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Conectando ao atendimento direto com {activeConsultantName}...
                    </p>
                    <a
                      href={successResult.whatsappUrl}
                      className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-[#111113] hover:bg-[#2B1120] text-white font-medium text-xs rounded-full transition-colors"
                    >
                      <span>Iniciar Atendimento Direto</span>
                      <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="space-y-5">
                    {formError && (
                      <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-300 text-[#111113] text-xs font-medium">
                        {formError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-700 block">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={leadNome}
                        onChange={(e) => setLeadNome(e.target.value)}
                        placeholder="Nome e sobrenome"
                        className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#111113] outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-700 block">Telefone / WhatsApp</label>
                        <input
                          type="tel"
                          required
                          value={leadTelefone}
                          onChange={handleTelefoneChange}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#111113] outline-none text-sm transition-all tabular-nums"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-700 block">E-mail (Opcional)</label>
                        <input
                          type="email"
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          placeholder="nome@dominio.com"
                          className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#111113] outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    {/* Permuta de Ativo */}
                    <div className="pt-2 border-t border-neutral-100 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={possuiPermuta}
                          onChange={(e) => setPossuiPermuta(e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-[#111113] focus:ring-[#111113]"
                        />
                        <span className="text-xs font-medium text-neutral-700">
                          Desejo incluir ativo na negociação (embarcação, moto aquática ou veículo)
                        </span>
                      </label>

                      {possuiPermuta && (
                        <textarea
                          rows={2}
                          value={descricaoPermuta}
                          onChange={(e) => setDescricaoPermuta(e.target.value)}
                          placeholder="Informe marca, modelo, ano e valor estimado para avaliação prévia..."
                          className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#111113] outline-none text-xs transition-all"
                        />
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 px-6 bg-[#111113] hover:bg-[#2B1120] disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <span>Processando solicitação...</span>
                        ) : (
                          <>
                            <span>Confirmar Agendamento & Abrir Atendimento</span>
                            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL QR CODE DO ATIVO (Consultor) ─────────────────────────────── */}
      <AnimatePresence>
        {qrModalBoat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setQrModalBoat(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 border border-black/[0.08] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="text-left">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                    Placa Píer / Marina
                  </span>
                  <h3 className="text-base font-semibold text-[#111113]">{qrModalBoat.modelo}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalBoat(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-[#111113] cursor-pointer"
                >
                  <Xmark className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="bg-[#F5F5F7] p-6 rounded-2xl border border-black/[0.04] inline-block mx-auto">
                {qrGenerating || !qrDataUrl ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#111113] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <img src={qrDataUrl} alt={qrModalBoat.modelo} className="w-48 h-48 mx-auto rounded-lg bg-white p-2" />
                )}
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                O QR Code direciona o cliente para o dossiê digital deste ativo com atribuição automática ao consultor{' '}
                <strong className="text-[#111113]">{activeConsultantName}</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 rounded-xl border border-neutral-200 hover:border-neutral-400 text-[#111113] text-xs font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Baixar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPlacaMarina}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 rounded-xl bg-[#111113] hover:bg-[#2B1120] text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Imprimir Placa</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RODAPÉ ARQUITETÔNICO ───────────────────────────────────────────── */}
      <footer className="bg-[#111113] text-neutral-400 py-16 px-4 sm:px-8 border-t border-white/10 text-xs">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={logoMexicano}
                alt="El Mexicano"
                className="h-7 w-auto object-contain brightness-0 invert opacity-90"
              />
              <span className="h-3.5 w-px bg-white/20" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-300">
                Private Fleet · Cotas Náuticas
              </span>
            </div>
            <p className="text-neutral-500 max-w-md leading-relaxed">
              Gestão operacional de marina, manutenção preventiva de engenharia e administração condominial sob
              governança da Vale Administradora.
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="flex sm:justify-end gap-1 mb-2">
              <span className="w-4 h-[2px] bg-[#4f7d32]" />
              <span className="w-4 h-[2px] bg-neutral-400" />
              <span className="w-4 h-[2px] bg-[#b4402f]" />
            </div>
            <p className="text-neutral-400 font-medium">El Mexicano Gestão Náutica</p>
            <p className="text-[11px] text-neutral-600">
              © {new Date().getFullYear()} Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getFallbackBoats(): PublicBoat[] {
  return [
    {
      id: 'boat_M55',
      nome: 'M55',
      modelo: 'NX 280 Sport',
      fabricante: 'NX Boats',
      ano: 2025,
      motorizacao: 'Mercruiser 300HP V8',
      potencia: '300 HP V8',
      marcaMotor: 'Mercruiser',
      tipoPropulsao: 'Centro-Rabeta',
      horasUso: 48,
      capacidade: 11,
      fotos: [studioBoatImg, editorialHeroBg],
      imagemPrincipal: studioBoatImg,
      itensConforto: [
        'Espaço Gourmet de Popa',
        'T-Top Rígido Aerodinâmico',
        'Sistema de Áudio Marítimo',
        'Solário de Proa com Encosto',
        'Ducha de Água Doce Pressurizada',
        'Sonar & GPS Integrado',
      ],
      valorCota: 180000,
      taxaAdmMensal: 2500,
      totalCotas: 8,
      cotasDisponiveisCount: 1,
      cotasEstoqueCount: 1,
      cotasRepasseCount: 0,
      vaga: 'Marina Náutica Privativa',
      tamanho: '28 pés',
      statusMarina: 'na_marina',
    },
    {
      id: 'boat_M20',
      nome: 'M20',
      modelo: 'RXT-X 300 RS',
      fabricante: 'Sea-Doo BRP',
      ano: 2025,
      motorizacao: 'Rotax 1630 ACE 300HP Supercharged',
      potencia: '300 HP Supercharged',
      marcaMotor: 'Rotax',
      tipoPropulsao: 'Hidrojato',
      horasUso: 24,
      capacidade: 3,
      fotos: [studioJetImg],
      imagemPrincipal: studioJetImg,
      itensConforto: [
        'Sistema de Áudio BRP Bluetooth',
        'Casco ST3 de Alta Estabilidade',
        'Assento Ergolock de Competição',
        'Controle de Largada & Trim Variável (VTS)',
        'Freio e Reverso Inteligente (iBR)',
      ],
      valorCota: 180000,
      taxaAdmMensal: 2500,
      totalCotas: 4,
      cotasDisponiveisCount: 1,
      cotasEstoqueCount: 1,
      cotasRepasseCount: 0,
      vaga: 'Vaga Seca Coberta',
      tamanho: 'Triple-Seater',
      statusMarina: 'na_marina',
    },
  ];
}
