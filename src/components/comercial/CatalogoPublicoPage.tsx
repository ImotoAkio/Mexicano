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
import { Sliders, Sparkles, Edit3 } from 'lucide-react';
import QRCode from 'qrcode';
import { boatDB } from '../../db';
import { VitrineSettings } from '../../types';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';
import studioJetImg from '../../assets/images/1.webp';
import studioBoatImg from '../../assets/images/2.webp';
import editorialHeroBg from '../../assets/images/boat_jet_bg.webp';
import ComercialEquipamentosModal from './ComercialEquipamentosModal';

export interface PublicBoat {
  id: string;
  nome: string;
  numero?: string;
  tipo?: string;
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
  descricaoComercial?: string;
  itensConforto: string[];
  acessorios?: {
    som?: boolean;
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    ducha?: boolean;
    solario?: boolean;
    diferenciais?: string[];
    itensConforto?: string[];
    configurado?: boolean;
    [key: string]: any;
  } | null;
  valorCota: number;
  taxaAdmMensal: number;
  totalCotas: number;
  cotasDisponiveisCount: number;
  cotasEstoqueCount: number;
  cotasRepasseCount: number;
  slots?: Array<{
    cota: string;
    status: 'disponivel' | 'alocada' | 'repasse' | 'reservada';
    valor?: number;
  }>;
  vaga?: string;
  tamanho?: string;
  comprimento?: string;
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
  { id: 'qrcode_marina', label: 'Placa Píer / Marina Club Velho Chico' },
  { id: 'indicacao_cliente', label: 'Indicação Private' },
  { id: 'anuncio_digital', label: 'Campanha Digital' },
];

function formatBoatLocation(vaga?: string): string {
  if (!vaga || !vaga.trim() || vaga === 'Marina Náutica' || vaga === 'Marina Náutica Privativa' || vaga === 'Marina Privativa') {
    return 'Marina Club Velho Chico';
  }
  if (vaga.toLowerCase().includes('velho chico')) {
    return vaga;
  }
  return `${vaga} · Marina Club Velho Chico`;
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.05 20.15ZM16.57 14.39C16.32 14.27 15.1 13.67 14.87 13.58C14.65 13.5 14.48 13.46 14.32 13.7C14.16 13.94 13.68 14.51 13.54 14.67C13.4 14.83 13.25 14.85 13 14.73C12.75 14.61 11.95 14.35 11 13.5C10.26 12.84 9.76 12.03 9.61 11.78C9.47 11.54 9.6 11.4 9.72 11.28C9.83 11.17 9.97 10.99 10.09 10.85C10.21 10.71 10.25 10.61 10.33 10.45C10.41 10.29 10.37 10.14 10.31 10.02C10.25 9.9 9.76 8.7 9.56 8.21C9.36 7.73 9.16 7.8 9.01 7.79C8.87 7.78 8.7 7.78 8.54 7.78C8.38 7.78 8.11 7.84 7.89 8.08C7.66 8.32 7.03 8.91 7.03 10.12C7.03 11.33 7.91 12.49 8.03 12.65C8.15 12.81 9.76 15.3 12.23 16.36C12.82 16.61 13.27 16.76 13.63 16.88C14.22 17.07 14.76 17.04 15.19 16.98C15.67 16.91 16.67 16.38 16.87 15.81C17.07 15.24 17.07 14.75 17.01 14.65C16.95 14.55 16.81 14.51 16.57 14.39Z" />
    </svg>
  );
}

function isJetSkiAsset(boat: PublicBoat): boolean {
  if (boat.tipo === 'jet') return true;
  if (boat.tipo === 'lancha') return false;
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

  const combined: string[] = [];
  if (boat.imagemPrincipal && typeof boat.imagemPrincipal === 'string') {
    combined.push(boat.imagemPrincipal.trim());
  }
  if (Array.isArray(boat.fotos)) {
    boat.fotos.forEach((f) => {
      if (f && typeof f === 'string' && f.trim() && !combined.includes(f.trim())) {
        combined.push(f.trim());
      }
    });
  }

  const validCustomPhotos = combined.filter(
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

  // Galeria e Página de Venda Completa do Ativo
  const [activePhotoMap, setActivePhotoMap] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [dossierBoat, setDossierBoat] = useState<PublicBoat | null>(null);
  const [dossierPhotoIdx, setDossierPhotoIdx] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [selectedCotaCode, setSelectedCotaCode] = useState<string | null>(null);

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

  // Modal de Configuração de Equipamentos & Acessórios Comercial
  const [equipamentosModalOpen, setEquipamentosModalOpen] = useState(false);
  const [equipamentosModalBoat, setEquipamentosModalBoat] = useState<PublicBoat | null>(null);

  // Parâmetros de URL
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialBarcoId = searchParams.get('barco');
  const vendedorParam = searchParams.get('vendedor') || vendedorNomeProp || '';
  const utmSource = searchParams.get('utm_source') || 'catalogo';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';

  // Configurações personalizadas da Vitrine (via Painel de Gestão e Servidor)
  const [serverVitrineSettings, setServerVitrineSettings] = useState<VitrineSettings | null>(() => {
    try {
      const stored = localStorage.getItem('vitrine_settings');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const vitrineSettings = serverVitrineSettings;

  // Curadoria Inteligente para o Showroom Studio
  const featuredYacht = useMemo(() => {
    if (!boats || boats.length === 0) return null;
    if (vitrineSettings?.showroomYachtId) {
      const found = boats.find((b) => b.id === vitrineSettings.showroomYachtId);
      if (found) return found;
    }
    if (Array.isArray(vitrineSettings?.destaquesIds) && vitrineSettings.destaquesIds.length > 0) {
      const found = boats.find((b) => vitrineSettings.destaquesIds.includes(b.id) && !isJetSkiAsset(b));
      if (found) return found;
    }
    return boats.find((b) => !isJetSkiAsset(b)) || null;
  }, [boats, vitrineSettings]);

  const featuredJet = useMemo(() => {
    if (!boats || boats.length === 0) return null;
    if (vitrineSettings?.showroomJetId) {
      const found = boats.find((b) => b.id === vitrineSettings.showroomJetId);
      if (found) return found;
    }
    if (Array.isArray(vitrineSettings?.destaquesIds) && vitrineSettings.destaquesIds.length > 0) {
      const found = boats.find((b) => vitrineSettings.destaquesIds.includes(b.id) && isJetSkiAsset(b));
      if (found) return found;
    }
    return boats.find((b) => isJetSkiAsset(b)) || null;
  }, [boats, vitrineSettings]);

  const activeHeroBoat = heroShowcaseType === 'yacht' ? featuredYacht : featuredJet;

  const heroDescriptionText = useMemo(() => {
    const raw = vitrineSettings?.heroDescription;
    if (raw && !raw.toLowerCase().includes('tripula')) {
      return raw;
    }
    return 'Acesso ao mais alto padrão náutico com máxima inteligência financeira. Adquira a sua fração ideal de embarcações e motos aquáticas de alta performance com até 80% de economia, divisão justa de custos e gestão integral na Marina Club Velho Chico.';
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
          if (Array.isArray(b.fotos)) {
            b.fotos.forEach((f: any) => {
              if (f && typeof f === 'string' && !fotos.includes(f)) fotos.push(f);
            });
          }
          if (b.acessorios && typeof b.acessorios === 'object' && Array.isArray(b.acessorios.fotos)) {
            b.acessorios.fotos.forEach((f: any) => {
              if (f && typeof f === 'string' && !fotos.includes(f)) fotos.push(f);
            });
          }
          if (fotos.length === 0) fotos.push(fallbackImg);
          const customConforto =
            b.acessorios && typeof b.acessorios === 'object' && Array.isArray(b.acessorios.itensConforto) && b.acessorios.itensConforto.length > 0
              ? b.acessorios.itensConforto
              : Array.isArray(b.acessorios)
              ? b.acessorios
              : [
                  'Churrasqueira Gourmet',
                  'Som Náutico Bluetooth',
                  'Toldo Retrátil',
                  'Ducha de Popa Pressurizada',
                  'Solário de Proa',
                  'Mesa de Centro Rebatível'
                ];
          return {
            id: b.id,
            nome: b.nome || '',
            numero: b.numero || '',
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
            descricaoComercial: b.descricaoComercial || (b.acessorios && b.acessorios.descricaoComercial) || '',
            itensConforto: customConforto,
            valorCota: Number(b.valorCota) || 180000,
            taxaAdmMensal: isJet ? 350 : (Number(b.taxaAdmMensal) > 0 ? Number(b.taxaAdmMensal) : 2500),
            totalCotas: Number(b.totalCotas) || 4,
            cotasDisponiveisCount: 1,
            cotasEstoqueCount: 1,
            cotasRepasseCount: 0,
            vaga: formatBoatLocation(b.vaga),
            tamanho: b.tamanho || b.comprimento ? String(b.tamanho || b.comprimento) : (isJet ? '3 Lugares' : 'Porte Homologado'),
            comprimento: b.comprimento || b.tamanho ? String(b.comprimento || b.tamanho) : (isJet ? '3 Lugares' : 'Porte Homologado'),
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
            setBoats(rawBoats.length > 0 ? rawBoats : resolveFallbackList());
            if (data.vitrineSettings) {
              setServerVitrineSettings(data.vitrineSettings);
              try {
                localStorage.setItem('vitrine_settings', JSON.stringify(data.vitrineSettings));
              } catch {}
            }
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
  }, [vendedorParam]);

  // Sincroniza categoria inicial com o inventário real disponível e destaque definido pelo comercial
  useEffect(() => {
    const hiddenIds = Array.isArray(vitrineSettings?.ocultosIds) ? vitrineSettings.ocultosIds : [];
    const visibleBoats = boats.filter((b) => !hiddenIds.includes(b.id));
    const targetPool = visibleBoats.length > 0 ? visibleBoats : boats;
    if (targetPool.length > 0) {
      // Se há um barco em destaque (★), prioriza abrir na categoria dele!
      const destaqueBoat = targetPool.find((b) => Array.isArray(vitrineSettings?.destaquesIds) && vitrineSettings.destaquesIds.includes(b.id));
      if (destaqueBoat) {
        const isJetDestaque = isJetSkiAsset(destaqueBoat);
        setCategoryFilter(isJetDestaque ? 'jets' : 'yachts');
        setHeroShowcaseType(isJetDestaque ? 'jet' : 'yacht');
        return;
      }

      const hasJets = targetPool.some((b) => isJetSkiAsset(b));
      const hasYachts = targetPool.some((b) => !isJetSkiAsset(b));
      if (categoryFilter === 'yachts' && !hasYachts && hasJets) {
        setCategoryFilter('jets');
        setHeroShowcaseType('jet');
      } else if (categoryFilter === 'jets' && !hasJets && hasYachts) {
        setCategoryFilter('yachts');
        setHeroShowcaseType('yacht');
      }
    }
  }, [boats, vitrineSettings]);

  // Abrir ou fechar a Página Completa de Venda da Embarcação com sincronização de URL
  const openBoatSalesPage = (boat: PublicBoat, cotaPreselect?: string) => {
    setDossierBoat(boat);
    setDossierPhotoIdx(0);
    setIsLightboxOpen(false);
    setSelectedCotaCode(cotaPreselect || null);
    setFormError(null);
    setSuccessResult(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('barco', boat.id);
      window.history.pushState({ barcoId: boat.id }, '', url.toString());
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeBoatSalesPage = () => {
    setDossierBoat(null);
    setIsLightboxOpen(false);
    setSelectedCotaCode(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('barco');
      window.history.pushState({}, '', url.toString());
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Se veio parâmetro de barco específico na URL, abre diretamente a Página de Venda da Embarcação
  useEffect(() => {
    if (!loading && initialBarcoId && boats.length > 0) {
      const target = boats.find((b) => b.id === initialBarcoId);
      if (target) {
        setDossierBoat(target);
        setDossierPhotoIdx(0);
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [loading, initialBarcoId, boats]);

  // Suporte ao botão Voltar do navegador e teclas no Lightbox
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const bId = params.get('barco');
      if (bId && boats.length > 0) {
        const found = boats.find((b) => b.id === bId);
        if (found) {
          setDossierBoat(found);
          setDossierPhotoIdx(0);
          return;
        }
      }
      setDossierBoat(null);
      setIsLightboxOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [boats]);

  useEffect(() => {
    if (!dossierBoat) return;
    const photos = getCuratedBoatPhotos(dossierBoat);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight' && isLightboxOpen && photos.length > 1) {
        setDossierPhotoIdx((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft' && isLightboxOpen && photos.length > 1) {
        setDossierPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dossierBoat, isLightboxOpen]);

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
    const hiddenIds = Array.isArray(vitrineSettings?.ocultosIds) ? vitrineSettings.ocultosIds : [];

    const list = boats.filter((b) => {
      if (hiddenIds.includes(b.id)) return false;
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
      // Featured: Destaques primeiro, depois menor disponibilidade
      const aDestaque = Array.isArray(vitrineSettings?.destaquesIds) && vitrineSettings.destaquesIds.includes(a.id) ? 1 : 0;
      const bDestaque = Array.isArray(vitrineSettings?.destaquesIds) && vitrineSettings.destaquesIds.includes(b.id) ? 1 : 0;
      if (aDestaque !== bDestaque) return bDestaque - aDestaque;
      const aJet = isJetSkiAsset(a) ? 1 : 0;
      const bJet = isJetSkiAsset(b) ? 1 : 0;
      if (aJet !== bJet) return aJet - bJet;
      return a.cotasDisponiveisCount - b.cotasDisponiveisCount;
    });
  }, [boats, categoryFilter, searchQuery, sortBy, vitrineSettings]);

  // Métricas da Coleção
  const fleetMetrics = useMemo(() => {
    const hiddenIds = Array.isArray(vitrineSettings?.ocultosIds) ? vitrineSettings.ocultosIds : [];
    const visibleBoats = boats.filter((b) => !hiddenIds.includes(b.id));
    const totalAssets = visibleBoats.length;
    const totalYachts = visibleBoats.filter((b) => !isJetSkiAsset(b)).length;
    const totalJets = visibleBoats.filter((b) => isJetSkiAsset(b)).length;
    const totalFractionsAvailable = visibleBoats.reduce((acc, b) => acc + (Number(b.cotasDisponiveisCount) || 0), 0);
    return { totalAssets, totalYachts, totalJets, totalFractionsAvailable };
  }, [boats, vitrineSettings]);

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
      : `${boat.fabricante} · ${boat.modelo}${boat.tamanho || boat.comprimento ? ` · ${boat.tamanho || boat.comprimento}` : ''} (${boat.ano})`;

    const text =
      `EL MEXICANO\n` +
      `Dossiê de Ativo Náutico — ${boat.modelo}\n\n` +
      `ESPECIFICAÇÕES TÉCNICAS\n` +
      `• Modelo: ${specLine}\n` +
      `• Propulsão: ${boat.motorizacao}\n` +
      `• Capacidade: ${boat.capacidade} passageiros\n` +
      `• Alocação: ${formatBoatLocation(boat.vaga)}\n\n` +
      `ESTRUTURA SOCIETÁRIA & VALUATION\n` +
      `• Sistema: Cotas Inteligentes (${boat.totalCotas} frações totais)\n` +
      `• Disponibilidade atual: ${boat.cotasDisponiveisCount} ${boat.cotasDisponiveisCount === 1 ? 'fração disponível' : 'frações disponíveis'}\n` +
      `• Valor de aquisição da fração: R$ ${boat.valorCota.toLocaleString('pt-BR')}\n` +
      `• Taxa de gestão na Marina Club Velho Chico: R$ ${boat.taxaAdmMensal.toLocaleString('pt-BR')}/mês\n\n` +
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
            Aponte a câmera do smartphone para acessar o dossiê completo do ativo, especificações de engenharia e agendamento de visita privada na Marina Club Velho Chico.
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
      <header className="sticky top-0 z-40 bg-[#FBFBFD]/90 backdrop-blur-xl border-b border-black/[0.06] transition-colors">
        <TricolorBar className="w-full h-[2.5px]" />
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
          {/* Identidade El Mexicano + Botão Voltar quando na Página de Venda */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="#top"
              onClick={(e) => {
                if (dossierBoat) {
                  e.preventDefault();
                  closeBoatSalesPage();
                }
              }}
              className="flex items-center group focus:outline-none"
              aria-label="El Mexicano — Início do Catálogo"
            >
              <img
                src={logoMexicano}
                alt="El Mexicano"
                className="h-8 sm:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>

            {dossierBoat && (
              <>
                <span className="h-5 w-px bg-neutral-200" aria-hidden="true" />
                <button
                  type="button"
                  onClick={closeBoatSalesPage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-xs font-medium text-[#111113] transition-colors cursor-pointer"
                >
                  <NavArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>Voltar à Frota</span>
                </button>
              </>
            )}
          </div>

          {/* Navegação Rápida de Seções */}
          {dossierBoat ? (
            <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-neutral-500">
              <a href="#venda-galeria" className="hover:text-[#111113] transition-colors">
                Galeria
              </a>
              <a href="#venda-apresentacao" className="hover:text-[#111113] transition-colors">
                Apresentação
              </a>
              <a href="#venda-ficha" className="hover:text-[#111113] transition-colors">
                Ficha Técnica
              </a>
              <a href="#venda-equipamentos" className="hover:text-[#111113] transition-colors">
                Memorial de Bordo
              </a>
              <a href="#venda-cotas" className="hover:text-[#111113] transition-colors">
                Quadro Societário
              </a>
            </nav>
          ) : (
            <nav className="hidden lg:flex items-center gap-8 text-xs font-medium text-neutral-500">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('jets');
                  document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#111113] transition-colors cursor-pointer"
              >
                Jetski
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('yachts');
                  document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#111113] transition-colors cursor-pointer"
              >
                Lancha
              </button>
            </nav>
          )}

          {/* Atendimento Direto — WhatsApp Oficial */}
          <div className="flex items-center gap-2.5">
            {dossierBoat && (
              <button
                type="button"
                onClick={() => openConversionModal(dossierBoat)}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2B1120] hover:bg-[#111113] text-white text-xs font-semibold tracking-tight transition-colors cursor-pointer"
              >
                <span>Solicitar Proposta</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              </button>
            )}

            <a
              href={`https://wa.me/${vendedorVerification.whatsapp}?text=${encodeURIComponent(
                dossierBoat
                  ? `Olá, ${vendedorVerification.primeiroNome}! Estou na página de venda da embarcação ${dossierBoat.modelo} (${dossierBoat.fabricante}) e gostaria de receber informações sobre as frações disponíveis.`
                  : `Olá, ${vendedorVerification.primeiroNome}! Estou no Catálogo da El Mexicano e gostaria de atendimento.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-xs font-medium tracking-tight transition-all cursor-pointer group shadow-2xs border border-white/10"
              title={
                vendedorVerification.isVerificado
                  ? `${vendedorVerification.primeiroNome} · ${vendedorVerification.cargo} (WhatsApp Oficial)`
                  : 'Atendimento Comercial Oficial via WhatsApp'
              }
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
              <span>{vendedorVerification.primeiroNome}</span>
              <ArrowUpRight
                className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.75}
              />
            </a>
          </div>
        </div>
      </header>

      {dossierBoat ? (
        /* ═══════════════════════════════════════════════════════════════════════
           PÁGINA DE VENDA COMPLETA DA EMBARCAÇÃO (Full Dedicated Vessel Page)
           ═══════════════════════════════════════════════════════════════════════ */
        (() => {
          const isJet = isJetSkiAsset(dossierBoat);
          const galleryPhotos = getCuratedBoatPhotos(dossierBoat);
          const safePhotoIdx = Math.min(dossierPhotoIdx, Math.max(0, galleryPhotos.length - 1));
          const activePhotoKey = `sales_${dossierBoat.id}_${safePhotoIdx}`;
          const activePhotoSrc = failedImages[activePhotoKey]
            ? isJet
              ? studioJetImg
              : studioBoatImg
            : galleryPhotos[safePhotoIdx] || (isJet ? studioJetImg : studioBoatImg);
          const isStudioMain = activePhotoSrc === studioJetImg || activePhotoSrc === studioBoatImg;
          const occupiedCotas = Math.max(0, dossierBoat.totalCotas - dossierBoat.cotasDisponiveisCount);
          const valorIntegralEstimado = dossierBoat.valorCota * Math.max(1, dossierBoat.totalCotas);
          const economiaEntrada = Math.max(0, valorIntegralEstimado - dossierBoat.valorCota);
          const economiaEntradaPct =
            dossierBoat.totalCotas > 1 ? Math.round(((dossierBoat.totalCotas - 1) / dossierBoat.totalCotas) * 100) : 0;

          // Geração inteligente de slots societários C1..CN caso o backend não tenha retornado todos
          const quotaSlots =
            Array.isArray(dossierBoat.slots) && dossierBoat.slots.length === dossierBoat.totalCotas
              ? dossierBoat.slots
              : Array.from({ length: dossierBoat.totalCotas }).map((_, idx) => {
                  const isAvailable = idx >= occupiedCotas;
                  const isRepasse =
                    isAvailable &&
                    dossierBoat.cotasRepasseCount > 0 &&
                    idx >= dossierBoat.totalCotas - dossierBoat.cotasRepasseCount;
                  return {
                    cota: `C${idx + 1}`,
                    status: (isRepasse ? 'repasse' : isAvailable ? 'disponivel' : 'alocada') as
                      | 'disponivel'
                      | 'repasse'
                      | 'reservada'
                      | 'alocada',
                    valor: dossierBoat.valorCota,
                  };
                });

          return (
            <main id="pagina-venda-embarcacao" className="bg-[#F5F5F7]">
              {/* ── 1. SUB-BARRA DE MIGALHAS & AÇÕES DO CONSULTOR ────────────── */}
              <div className="bg-white border-b border-black/[0.06]">
                <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-neutral-500">
                    <button
                      type="button"
                      onClick={closeBoatSalesPage}
                      className="hover:text-[#111113] transition-colors cursor-pointer font-medium"
                    >
                      Catálogo Oficial
                    </button>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter(isJet ? 'jets' : 'yachts');
                        closeBoatSalesPage();
                      }}
                      className="hover:text-[#111113] transition-colors cursor-pointer font-medium"
                    >
                      {isJet ? 'Frota Jetski' : 'Frota Lanchas'}
                    </button>
                    <span>/</span>
                    <span className="text-[#111113] font-semibold">
                      {dossierBoat.fabricante} {dossierBoat.modelo}
                    </span>
                    {dossierBoat.numero && (
                      <span className="font-mono text-[10px] uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200">
                        {dossierBoat.numero}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(dossierBoat.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium transition-colors cursor-pointer bg-white"
                    >
                      {copiedLinkKey === dossierBoat.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                          <span>Link da Página Copiado</span>
                        </>
                      ) : (
                        <>
                          <ShareIos className="w-3.5 h-3.5" strokeWidth={1.6} />
                          <span>Compartilhar Página</span>
                        </>
                      )}
                    </button>

                    {consultantMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyExecutiveBrief(dossierBoat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium transition-colors cursor-pointer bg-white"
                        >
                          {copiedBriefKey === dossierBoat.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                              <span>Dossiê Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                              <span>Copiar Dossiê WhatsApp</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenQrStudio(dossierBoat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111113] text-white hover:bg-[#2B1120] font-medium transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                          <span>Placa QR Píer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 2. HERO DE VENDA: GALERIA MULTI-IMAGEM + BUY BOX STICKY ───── */}
              <section id="venda-galeria" className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                  {/* COLUNA ESQUERDA (7 COLUNAS): Galeria Principal + Strip de Miniaturas + Mosaico */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Palco Principal da Foto Ativa */}
                    <div className="relative bg-white rounded-3xl border border-black/[0.08] overflow-hidden aspect-16/10 sm:aspect-16/10 flex items-center justify-center group shadow-2xs">
                      {/* Tags superiores sobre a foto */}
                      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none">
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#111113] bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/[0.06] inline-flex items-center gap-2 shadow-2xs">
                          <TricolorBar className="w-4 h-[2px]" />
                          {isJet ? 'JETSKI HOMOLOGADO' : 'LANCHA DE PASSIO & CRUZEIRO'} · ANO {dossierBoat.ano}
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          className="pointer-events-auto inline-flex items-center gap-1.5 bg-[#111113]/85 hover:bg-[#111113] text-white text-xs font-medium px-3.5 py-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                        >
                          <span>Tela Cheia ({safePhotoIdx + 1}/{galleryPhotos.length})</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>

                      {/* Imagem Principal Clicável para Lightbox */}
                      <div
                        onClick={() => setIsLightboxOpen(true)}
                        className="w-full h-full flex items-center justify-center cursor-zoom-in relative"
                      >
                        <img
                          src={activePhotoSrc}
                          alt={`${dossierBoat.modelo} — Foto ${safePhotoIdx + 1}`}
                          onError={() => setFailedImages((prev) => ({ ...prev, [activePhotoKey]: true }))}
                          className={
                            isStudioMain
                              ? 'max-h-[75%] max-w-[85%] object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.02]'
                              : 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]'
                          }
                        />
                      </div>

                      {/* Controles Anterior / Próxima na Foto Principal */}
                      {galleryPhotos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDossierPhotoIdx((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length)
                            }
                            aria-label="Foto anterior"
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#111113] border border-black/[0.08] shadow-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                          >
                            <NavArrowLeft className="w-5 h-5" strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDossierPhotoIdx((prev) => (prev + 1) % galleryPhotos.length)}
                            aria-label="Próxima foto"
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#111113] border border-black/[0.08] shadow-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                          >
                            <NavArrowRight className="w-5 h-5" strokeWidth={1.8} />
                          </button>
                        </>
                      )}

                      {/* Legenda Inferior na Foto */}
                      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none">
                        <span className="text-xs font-medium text-[#111113] bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/[0.06] shadow-2xs">
                          {formatBoatLocation(dossierBoat.vaga)}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-white bg-[#111113]/80 backdrop-blur-md px-3 py-1 rounded-full">
                          Foto {safePhotoIdx + 1} de {galleryPhotos.length}
                        </span>
                      </div>
                    </div>

                    {/* Tira de Miniaturas (Thumbnails) Interativa */}
                    {galleryPhotos.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                        {galleryPhotos.map((photoUrl, idx) => {
                          const thumbKey = `thumb_${dossierBoat.id}_${idx}`;
                          const thumbSrc = failedImages[thumbKey]
                            ? isJet
                              ? studioJetImg
                              : studioBoatImg
                            : photoUrl;
                          const isSelected = idx === safePhotoIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDossierPhotoIdx(idx)}
                              className={`relative aspect-4/3 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-white ${
                                isSelected
                                  ? 'border-[#2B1120] ring-2 ring-[#2B1120]/20 scale-[1.01]'
                                  : 'border-transparent opacity-75 hover:opacity-100 hover:border-neutral-300'
                              }`}
                            >
                              <img
                                src={thumbSrc}
                                alt={`${dossierBoat.modelo} miniatura ${idx + 1}`}
                                onError={() => setFailedImages((prev) => ({ ...prev, [thumbKey]: true }))}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1.5 font-mono text-[9px] tabular-nums bg-black/65 text-white px-1.5 py-0.5 rounded">
                                {idx + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Mosaico Editorial Completo de Todas as Imagens (quando há 2+ fotos) */}
                    {galleryPhotos.length > 1 && (
                      <div className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                              Inspeção Visual Detalhada
                            </span>
                            <h3 className="text-sm font-semibold text-[#111113] mt-0.5">
                              Galeria Completa da Embarcação ({galleryPhotos.length} imagens)
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="text-xs font-semibold text-[#2B1120] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Abrir Lightbox</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {galleryPhotos.map((photoUrl, idx) => {
                            const mosaicKey = `mosaic_${dossierBoat.id}_${idx}`;
                            const mosaicSrc = failedImages[mosaicKey]
                              ? isJet
                                ? studioJetImg
                                : studioBoatImg
                              : photoUrl;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setDossierPhotoIdx(idx);
                                  setIsLightboxOpen(true);
                                }}
                                className="group/m relative aspect-4/3 rounded-2xl overflow-hidden bg-[#F5F5F7] border border-black/[0.06] cursor-zoom-in"
                              >
                                <img
                                  src={mosaicSrc}
                                  alt={`${dossierBoat.modelo} ângulo ${idx + 1}`}
                                  onError={() => setFailedImages((prev) => ({ ...prev, [mosaicKey]: true }))}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/m:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/m:bg-black/20 transition-colors flex items-end justify-between p-2.5">
                                  <span className="font-mono text-[10px] tabular-nums bg-white/90 text-[#111113] px-2 py-0.5 rounded-md font-semibold">
                                    {idx === 0 ? 'Capa Principal' : `Ângulo ${idx + 1}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COLUNA DIREITA (5 COLUNAS): BUY BOX EXECUTIVO DE AQUISIÇÃO */}
                  <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
                    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-sm space-y-6">
                      {/* Cabeçalho do Ativo */}
                      <div className="space-y-2 border-b border-neutral-200/80 pb-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                            {dossierBoat.fabricante} · Série {dossierBoat.ano}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full tabular-nums ${
                              dossierBoat.cotasDisponiveisCount === 1
                                ? 'bg-[#b4402f]/10 text-[#b4402f]'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dossierBoat.cotasDisponiveisCount === 1 ? 'bg-[#b4402f]' : 'bg-emerald-600'
                              }`}
                            />
                            {dossierBoat.cotasDisponiveisCount === 1
                              ? 'Última fração disponível'
                              : `${dossierBoat.cotasDisponiveisCount} de ${dossierBoat.totalCotas} frações disponíveis`}
                          </span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-[#111113] leading-tight">
                          {dossierBoat.modelo}
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500">
                          {dossierBoat.nome} {!isJet && dossierBoat.tamanho ? `· Porte ${dossierBoat.tamanho}` : ''} ·{' '}
                          {formatBoatLocation(dossierBoat.vaga)}
                        </p>
                      </div>

                      {/* Bloco Principal de Preço da Fração & Economia Real */}
                      <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-black/[0.04] space-y-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500 block">
                              Valor de Aquisição da Fração (1/{dossierBoat.totalCotas})
                            </span>
                            <span className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] tabular-nums text-[#111113] mt-1 block">
                              R$ {dossierBoat.valorCota.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {dossierBoat.cotasRepasseCount > 0 && (
                            <span className="text-[11px] font-semibold bg-[#2B1120] text-white px-2.5 py-1 rounded-lg">
                              Oportunidade de Repasse
                            </span>
                          )}
                        </div>

                        <div className="pt-3 border-t border-neutral-200/80 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-neutral-500 block">Taxa de Gestão · Marina Club Velho Chico</span>
                            <span className="font-semibold text-[#111113] text-sm tabular-nums mt-0.5 block">
                              R$ {dossierBoat.taxaAdmMensal.toLocaleString('pt-BR')}/mês
                            </span>
                            <span className="text-[11px] text-neutral-400 block">Vaga na Marina Club Velho Chico, seguro e preventiva</span>
                          </div>
                          <div className="border-l border-neutral-200/80 pl-4">
                            <span className="text-neutral-500 block">Capital Liberado vs. 100%</span>
                            <span className="font-semibold text-[#4f7d32] text-sm tabular-nums mt-0.5 block">
                              R$ {economiaEntrada.toLocaleString('pt-BR')} ({economiaEntradaPct}%)
                            </span>
                            <span className="text-[11px] text-neutral-400 block">
                              Ativo integral: R$ {valorIntegralEstimado.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resumo Rápido de Engenharia (4 Pilares) */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                            Motorização Exata
                          </span>
                          <span className="font-semibold text-[#111113] text-sm mt-1 block truncate" title={getMotorizacaoExata(dossierBoat)}>
                            {getMotorizacaoExata(dossierBoat)}
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5">{getTipoPropulsao(dossierBoat)}</span>
                        </div>

                        <div className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                            Horímetro Oficial
                          </span>
                          <span className="font-semibold text-[#111113] text-sm mt-1 block tabular-nums">
                            {getHorasUso(dossierBoat)}
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5">Revisões em dia</span>
                        </div>

                        <div className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                            Capacidade Homologada
                          </span>
                          <span className="font-semibold text-[#111113] text-sm mt-1 block tabular-nums">
                            {dossierBoat.capacidade} passageiros
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5">Homologação Marinha</span>
                        </div>

                        <div className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                            Regime Societário
                          </span>
                          <span className="font-semibold text-[#111113] text-sm mt-1 block tabular-nums">
                            Fração 1/{dossierBoat.totalCotas} avos
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5">Escritura de titularidade</span>
                        </div>
                      </div>

                      {/* Barra Visual de Frações no Buy Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-500 font-medium">Ocupação Societária Atual</span>
                          <a href="#venda-cotas" className="font-mono text-[11px] text-[#2B1120] font-semibold hover:underline">
                            Ver quadro C1–C{dossierBoat.totalCotas} →
                          </a>
                        </div>
                        <div
                          className="grid gap-1.5"
                          style={{ gridTemplateColumns: `repeat(${dossierBoat.totalCotas}, minmax(0, 1fr))` }}
                        >
                          {quotaSlots.map((slot, idx) => {
                            const isFree = slot.status === 'disponivel' || slot.status === 'repasse';
                            return (
                              <div
                                key={idx}
                                className={`h-2 rounded-full ${isFree ? 'bg-[#2B1120]' : 'bg-neutral-200'}`}
                                title={`${slot.cota}: ${isFree ? 'Disponível para aquisição' : 'Alocada'}`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Botões de Conversão Direta (Compra / Visita / WhatsApp) */}
                      <div className="space-y-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => openConversionModal(dossierBoat)}
                          className="w-full py-4 px-6 rounded-2xl bg-[#111113] hover:bg-[#2B1120] text-white text-sm font-semibold tracking-tight transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm group"
                        >
                          <span>Agendar Visita Privada / Solicitar Proposta</span>
                          <ArrowRight
                            className="w-4 h-4 transition-transform group-hover:translate-x-1"
                            strokeWidth={1.8}
                          />
                        </button>

                        <a
                          href={`https://wa.me/${vendedorVerification.whatsapp}?text=${encodeURIComponent(
                            `Olá, ${vendedorVerification.primeiroNome}! Estou analisando a página completa da embarcação *${dossierBoat.modelo}* (${dossierBoat.fabricante} · Ano ${dossierBoat.ano}) no catálogo da El Mexicano. Gostaria de receber a proposta da fração de R$ ${dossierBoat.valorCota.toLocaleString('pt-BR')}${selectedCotaCode ? ` (Cota ${selectedCotaCode})` : ''}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-50 text-[#111113] border border-neutral-300 text-xs font-semibold tracking-tight transition-colors flex items-center justify-center gap-2"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                          <span>Falar Agora com {vendedorVerification.primeiroNome} no WhatsApp</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.75} />
                        </a>
                      </div>

                      {/* Garantias Operacionais & Permuta */}
                      <div className="pt-4 border-t border-neutral-200/80 space-y-2 text-[11px] text-neutral-500">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#4f7d32] shrink-0" strokeWidth={2.2} />
                          <span>Avaliamos seu veículo ou embarcação como parte de pagamento (permuta).</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#4f7d32] shrink-0" strokeWidth={2.2} />
                          <span>Embarcação revisada, segurada e pronta para navegação imediata na Marina Club Velho Chico.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#4f7d32] shrink-0" strokeWidth={2.2} />
                          <span>Gestão societária, conciergeria e manutenção pela Vale Administradora.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 3. APRESENTAÇÃO COMERCIAL & EXPERIÊNCIA A BORDO ───────────── */}
              <section id="venda-apresentacao" className="bg-white border-t border-black/[0.06] py-16 sm:py-24 px-4 sm:px-8">
                <div className="max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-2.5">
                      <TricolorBar className="w-8 h-[2px]" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                        Apresentação Executiva da Embarcação
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113] leading-tight">
                      {dossierBoat.fabricante} {dossierBoat.modelo}: engenharia náutica, performance e propriedade inteligente.
                    </h2>

                    <div className="space-y-4 text-sm sm:text-base text-neutral-600 leading-relaxed whitespace-pre-line">
                      {dossierBoat.descricaoComercial && dossierBoat.descricaoComercial.trim().length > 0 ? (
                        <p>{dossierBoat.descricaoComercial}</p>
                      ) : (
                        <>
                          <p>
                            O <strong>{dossierBoat.fabricante} {dossierBoat.modelo}</strong> (Série {dossierBoat.ano}) integra a frota oficial homologada da <strong>El Mexicano</strong>, oferecendo o equilíbrio ideal entre desempenho de navegação, segurança estrutural e conforto para até <strong>{dossierBoat.capacidade} passageiros</strong>.
                          </p>
                          <p>
                            Equipado com motorização <strong>{getMotorizacaoExata(dossierBoat)}</strong> ({getTipoPropulsao(dossierBoat)}) e horímetro auditado em <strong>{getHorasUso(dossierBoat)}</strong>, o ativo passa por protocolo rigoroso de revisão preventiva, higienização detalhada e inspeção mecânica antes e após cada saída.
                          </p>
                          <p>
                            Através do sistema societário de <strong>1/{dossierBoat.totalCotas} avos</strong> administrado pela <strong>Vale Administradora</strong>, você adquire a titularidade patrimonial real da sua fração por <strong>R$ {dossierBoat.valorCota.toLocaleString('pt-BR')}</strong>, eliminando 100% do trabalho operacional com vaga na Marina Club Velho Chico, guarda, seguro e manutenção preventiva.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card dos 4 Pilares de Operação Turnkey El Mexicano */}
                  <div className="lg:col-span-5 bg-[#F5F5F7] rounded-3xl p-6 sm:p-8 border border-black/[0.05] space-y-6">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                        Padrão Concierge El Mexicano
                      </span>
                      <h3 className="text-lg font-semibold text-[#111113] mt-1">
                        Como funciona a posse da sua fração no {dossierBoat.modelo}
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs">
                      {[
                        {
                          step: '01',
                          title: 'Titularidade Patrimonial Direta',
                          desc: `Você é proprietário registrado de 1/${dossierBoat.totalCotas} do ativo, com liberdade para revender ou transferir sua cota a qualquer momento.`,
                        },
                        {
                          step: '02',
                          title: 'Agendamento Digital Ilimitado no App',
                          desc: 'Reserve suas saídas pelo sistema de cotistas com distribuição justa e transparente entre os sócios da embarcação.',
                        },
                        {
                          step: '03',
                          title: 'Barco Pronto no Píer (Zero Trabalho)',
                          desc: `Embarcação alocada na ${formatBoatLocation(dossierBoat.vaga)}. Ao chegar, o ativo já está abastecido, limpo, revisado e na água.`,
                        },
                        {
                          step: '04',
                          title: 'Custo Fixo Rateado entre os Sócios',
                          desc: `Taxa mensal única de R$ ${dossierBoat.taxaAdmMensal.toLocaleString('pt-BR')} cobrindo vaga seca/molhada, seguro, limpeza e gestão.`,
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-black/[0.04]">
                          <span className="font-mono text-xs font-bold text-[#2B1120] bg-[#2B1120]/10 px-2.5 py-1 rounded-lg shrink-0">
                            {item.step}
                          </span>
                          <div>
                            <h4 className="font-semibold text-[#111113] text-xs">{item.title}</h4>
                            <p className="text-neutral-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 4. FICHA TÉCNICA COMPLETA DE ENGENHARIA (3 TABELAS) ──────── */}
              <section id="venda-ficha" className="py-16 sm:py-24 px-4 sm:px-8 border-t border-black/[0.06]">
                <div className="max-w-[1360px] mx-auto space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <TricolorBar className="w-8 h-[2px]" />
                        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                          Especificações de Engenharia & Registro
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113]">
                        Ficha Técnica Completa.
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md">
                      Dados oficiais auditados pela equipe técnica da El Mexicano e Vale Administradora.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tabela 1: Identificação & Casco */}
                    <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 space-y-5">
                      <div className="border-b border-neutral-200 pb-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                          01 · Estrutura & Casco
                        </span>
                        <h3 className="text-base font-semibold text-[#111113] mt-1">Identificação da Embarcação</h3>
                      </div>
                      <dl className="space-y-3.5 text-xs">
                        {[
                          ['Estaleiro / Fabricante', dossierBoat.fabricante],
                          ['Modelo Comercial', dossierBoat.modelo],
                          ['Nome de Batismo', dossierBoat.nome],
                          ['Código na Frota', dossierBoat.numero || dossierBoat.id.toUpperCase()],
                          ['Categoria Náutica', isJet ? 'Moto Aquática (Jetski)' : 'Lancha de Passeio / Cruzeiro'],
                          ['Ano de Fabricação', `${dossierBoat.ano}`],
                          ['Comprimento / Porte', isJet ? (dossierBoat.tamanho || '3 Lugares') : (dossierBoat.tamanho || dossierBoat.comprimento || 'Porte Homologado')],
                          ['Capacidade Homologada', `${dossierBoat.capacidade} pessoas`],
                        ].map(([dt, dd]) => (
                          <div key={dt} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-2.5 last:border-none last:pb-0">
                            <dt className="text-neutral-500">{dt}</dt>
                            <dd className="font-semibold text-[#111113] text-right tabular-nums">{dd}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Tabela 2: Motorização & Propulsão */}
                    <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 space-y-5">
                      <div className="border-b border-neutral-200 pb-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                          02 · Conjunto Mecânico
                        </span>
                        <h3 className="text-base font-semibold text-[#111113] mt-1">Motorização & Performance</h3>
                      </div>
                      <dl className="space-y-3.5 text-xs">
                        {[
                          ['Motorização Principal', getMotorizacaoExata(dossierBoat)],
                          ['Sistema de Propulsão', getTipoPropulsao(dossierBoat)],
                          ['Horímetro Atual', getHorasUso(dossierBoat)],
                          ['Combustível', 'Gasolina (Abastecimento na Marina Club Velho Chico)'],
                          ['Status Operacional', '100% Operacional · Pronto para Navegar'],
                        ].map(([dt, dd]) => (
                          <div key={dt} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-2.5 last:border-none last:pb-0">
                            <dt className="text-neutral-500">{dt}</dt>
                            <dd className="font-semibold text-[#111113] text-right tabular-nums">{dd}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Tabela 3: Governança Societária & Marina Club Velho Chico */}
                    <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 space-y-5">
                      <div className="border-b border-neutral-200 pb-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                          03 · Estrutura Societária
                        </span>
                        <h3 className="text-base font-semibold text-[#111113] mt-1">Marina Club Velho Chico, Cotas & Governança</h3>
                      </div>
                      <dl className="space-y-3.5 text-xs">
                        {[
                          ['Localização / Marina', formatBoatLocation(dossierBoat.vaga)],
                          ['Administradora Oficial', 'Vale Administradora'],
                          ['Divisão Total do Ativo', `${dossierBoat.totalCotas} frações (1/${dossierBoat.totalCotas} avos)`],
                          ['Frações Disponíveis', `${dossierBoat.cotasDisponiveisCount} de ${dossierBoat.totalCotas}`],
                          ['Frações de Repasse', dossierBoat.cotasRepasseCount > 0 ? `${dossierBoat.cotasRepasseCount} disponível` : 'Nenhuma (Direto Frota)'],
                          ['Valor de Aquisição (1 cota)', `R$ ${dossierBoat.valorCota.toLocaleString('pt-BR')}`],
                          ['Taxa Gestão & Marina Club Velho Chico', `R$ ${dossierBoat.taxaAdmMensal.toLocaleString('pt-BR')}/mês`],
                          ['Aceita Permuta', 'Sim (Veículos e Embarcações)'],
                        ].map(([dt, dd]) => (
                          <div key={dt} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-2.5 last:border-none last:pb-0">
                            <dt className="text-neutral-500">{dt}</dt>
                            <dd className="font-semibold text-[#111113] text-right tabular-nums">{dd}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 5. MEMORIAL DESCRITIVO DE EQUIPAMENTOS & CONFORTO A BORDO ── */}
              <section id="venda-equipamentos" className="bg-white border-t border-black/[0.06] py-16 sm:py-24 px-4 sm:px-8">
                <div className="max-w-[1360px] mx-auto space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <TricolorBar className="w-8 h-[2px]" />
                        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                          Memorial Descritivo de Bordo
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113]">
                        Equipamentos, Conforto & Segurança.
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-neutral-500 tabular-nums">
                        {dossierBoat.itensConforto.length} {dossierBoat.itensConforto.length === 1 ? 'item configurado' : 'itens configurados'} neste ativo
                      </span>
                    </div>
                  </div>

                  {dossierBoat.itensConforto.length === 0 ? (
                    <div className="p-10 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] text-center space-y-3">
                      <p className="text-sm text-neutral-500">
                        Nenhum acessório ou diferencial cadastrado para este ativo no momento.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {dossierBoat.itensConforto.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] flex items-start gap-3 hover:border-black/10 transition-colors"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" strokeWidth={2.5} />
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-[#111113] block leading-snug">{item}</span>
                            <span className="text-[11px] text-neutral-400 block mt-0.5">Instalado e homologado</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* ── 6. ESPELHO SOCIETÁRIO DAS FRAÇÕES (C1 a CN) ───────────────── */}
              <section id="venda-cotas" className="py-16 sm:py-24 px-4 sm:px-8 border-t border-black/[0.06]">
                <div className="max-w-[1360px] mx-auto space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <TricolorBar className="w-8 h-[2px]" />
                        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                          Mapa de Disponibilidade Societária
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113]">
                        Quadro de Frações ({dossierBoat.modelo}).
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md">
                      Selecione uma fração disponível abaixo para solicitar uma reserva ou proposta comercial direta.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quotaSlots.map((slot) => {
                      const isAvailable = slot.status === 'disponivel' || slot.status === 'repasse';
                      const isSelected = selectedCotaCode === slot.cota;
                      return (
                        <div
                          key={slot.cota}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedCotaCode(slot.cota);
                              openConversionModal(dossierBoat);
                            }
                          }}
                          className={`rounded-3xl p-5 border transition-all flex flex-col justify-between gap-5 ${
                            isAvailable
                              ? isSelected
                                ? 'bg-[#2B1120] text-white border-[#2B1120] shadow-md cursor-pointer'
                                : 'bg-white hover:border-[#2B1120] border-black/[0.08] cursor-pointer shadow-2xs'
                              : 'bg-neutral-100/80 border-neutral-200/70 opacity-65 cursor-default'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-mono text-sm font-bold px-3 py-1 rounded-xl ${
                                isAvailable
                                  ? isSelected
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#111113] text-white'
                                  : 'bg-neutral-200 text-neutral-500'
                              }`}
                            >
                              Fração {slot.cota}
                            </span>

                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                slot.status === 'repasse'
                                  ? 'bg-amber-100 text-amber-900'
                                  : isAvailable
                                    ? isSelected
                                      ? 'bg-emerald-400/20 text-emerald-300'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-neutral-200 text-neutral-500'
                              }`}
                            >
                              {slot.status === 'repasse'
                                ? 'Repasse Ativo'
                                : isAvailable
                                  ? 'Disponível'
                                  : 'Cotista Alocado'}
                            </span>
                          </div>

                          <div>
                            <span
                              className={`text-[11px] block ${
                                isAvailable ? (isSelected ? 'text-neutral-300' : 'text-neutral-400') : 'text-neutral-400'
                              }`}
                            >
                              Titularidade 1/{dossierBoat.totalCotas} avos
                            </span>
                            <span
                              className={`text-xl font-semibold tabular-nums block mt-0.5 ${
                                isAvailable ? (isSelected ? 'text-white' : 'text-[#111113]') : 'text-neutral-400'
                              }`}
                            >
                              {isAvailable ? `R$ ${(slot.valor || dossierBoat.valorCota).toLocaleString('pt-BR')}` : 'Fração Preenchida'}
                            </span>
                          </div>

                          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs">
                            {isAvailable ? (
                              <>
                                <span className={isSelected ? 'text-white font-semibold' : 'text-[#2B1120] font-semibold'}>
                                  Solicitar esta fração
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <span className="text-neutral-400">Em operação na Marina Club Velho Chico</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </main>
          );
        })()
      ) : (
        <>
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
                      <span className="text-xs text-neutral-500">Marina Club Velho Chico, seguro & revisão</span>
                    </div>

                    <div className="border-l border-neutral-200/80 pl-6">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400 block">
                        Gestão Integral
                      </span>
                      <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#111113] mt-1 block">
                        Zero Preocupação
                      </span>
                      <span className="text-xs text-neutral-500">Só agendar e navegar</span>
                    </div>
                  </div>
                </div>

                {/* Coluna Studio Stage (Apple Product Stage Curadoria Inteligente) */}
                <div className="lg:col-span-6">
                  <div className="relative bg-[#F5F5F7] rounded-3xl p-6 sm:p-10 border border-black/[0.05] shadow-xs">
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
                          {heroShowcaseType === 'yacht'
                            ? vitrineSettings?.showroomCustomTitleYacht ||
                              (activeHeroBoat ? `${activeHeroBoat.fabricante} ${activeHeroBoat.modelo}` : 'Linha Lanchas')
                            : vitrineSettings?.showroomCustomTitleJet ||
                              (activeHeroBoat ? `${activeHeroBoat.fabricante} ${activeHeroBoat.modelo}` : 'Linha Jetskis')}
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

                    {/* Imagem Studio Interativa com Transição Suave e Clique para Página de Venda */}
                    <div
                      className="relative h-[280px] sm:h-[360px] flex items-center justify-center overflow-hidden cursor-pointer group"
                      onClick={() => {
                        if (activeHeroBoat) openBoatSalesPage(activeHeroBoat);
                      }}
                      title={
                        activeHeroBoat ? `Clique para abrir a página completa de ${activeHeroBoat.nome}` : undefined
                      }
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeHeroBoat?.id || heroShowcaseType}
                          initial={{ opacity: 0, scale: 0.96, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98, y: -8 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full h-full flex items-center justify-center relative"
                        >
                          <img
                            src={
                              activeHeroBoat?.imagemPrincipal && !failedImages[`hero_${activeHeroBoat.id}`]
                                ? activeHeroBoat.imagemPrincipal
                                : heroShowcaseType === 'yacht'
                                  ? studioBoatImg
                                  : studioJetImg
                            }
                            alt={
                              activeHeroBoat?.nome ||
                              (heroShowcaseType === 'yacht' ? 'NX Boats NX280 Studio' : 'Sea-Doo RXT-X 300 Studio')
                            }
                            onError={() => {
                              if (activeHeroBoat) {
                                setFailedImages((prev) => ({ ...prev, [`hero_${activeHeroBoat.id}`]: true }));
                              }
                            }}
                            className={`max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.03] select-none ${
                              !activeHeroBoat?.imagemPrincipal || failedImages[`hero_${activeHeroBoat?.id}`]
                                ? 'mix-blend-multiply'
                                : 'rounded-2xl drop-shadow-md'
                            }`}
                          />

                          {/* Tag Flutuante de Fração Disponível */}
                          {activeHeroBoat && (
                            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-white/95 backdrop-blur-md border border-black/[0.08] rounded-xl px-3 py-1.5 shadow-sm text-left pointer-events-none">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block leading-tight">
                                Fração Inteligente
                              </span>
                              <span className="text-xs font-bold text-[#111113] flex items-center gap-1.5 mt-0.5">
                                <span>R$ {activeHeroBoat.valorCota.toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                                  {activeHeroBoat.cotasDisponiveisCount}/{activeHeroBoat.totalCotas} cotas
                                </span>
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Especificação de Rodapé do Stage */}
                    <div className="mt-4 pt-5 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-neutral-400 block text-[10px] font-mono uppercase tracking-wider">
                            Ativo em Destaque
                          </span>
                          <span className="font-semibold text-[#111113]">
                            {activeHeroBoat
                              ? `${activeHeroBoat.nome} · ${activeHeroBoat.fabricante} (${activeHeroBoat.ano})`
                              : heroShowcaseType === 'yacht'
                                ? 'NX Boats · Focker · Phoenix'
                                : 'Sea-Doo RXT-X 300 · Wake · GTI'}
                          </span>
                        </div>
                        <div className="hidden sm:block border-l border-neutral-200 pl-6">
                          <span className="text-neutral-400 block text-[10px] font-mono uppercase tracking-wider">
                            Motorização & Porte
                          </span>
                          <span className="font-medium text-neutral-700">
                            {activeHeroBoat
                              ? `${getMotorizacaoExata(activeHeroBoat)} · ${activeHeroBoat.capacidade} Lugares`
                              : 'Marina Club Velho Chico · Seguro & Gestão Rateados'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {activeHeroBoat && (
                          <button
                            type="button"
                            onClick={() => openBoatSalesPage(activeHeroBoat)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111113] text-white hover:bg-[#2B1120] text-xs font-medium transition-all cursor-pointer shadow-2xs group"
                          >
                            <Compass className="w-3.5 h-3.5 text-neutral-300 group-hover:rotate-45 transition-transform" />
                            <span>Ver Página da Embarcação</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter(heroShowcaseType === 'yacht' ? 'yachts' : 'jets');
                            document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1 font-medium text-neutral-600 hover:text-[#111113] transition-colors cursor-pointer group text-xs"
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
                  Todos os ativos listados encontram-se operacionais na Marina Club Velho Chico, revisados e com frações disponíveis para
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
                        viewLayout === 'editorial'
                          ? 'bg-white text-[#111113] shadow-2xs'
                          : 'text-neutral-400 hover:text-[#111113]'
                      }`}
                      title="Visualização Editorial"
                    >
                      <List className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewLayout('grid')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewLayout === 'grid'
                          ? 'bg-white text-[#111113] shadow-2xs'
                          : 'text-neutral-400 hover:text-[#111113]'
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
                            viewLayout === 'grid' ? 'w-full h-[300px]' : 'lg:col-span-6 min-h-[340px] sm:min-h-[440px]'
                          } relative bg-[#F5F5F7] flex flex-col justify-between overflow-hidden`}
                        >
                          {/* Barra Superior Silenciosa sobre a Imagem */}
                          <div className="relative z-10 p-5 flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-black/[0.05] inline-flex items-center gap-2">
                              <TricolorBar className="w-4 h-[1.5px]" />
                              {String(index + 1).padStart(2, '0')} · {isJet ? 'JETSKI' : 'LANCHA'}
                            </span>

                            {/* Indicador Minimalista de Disponibilidade */}
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

                          {/* Imagem Central Clicável para Página Completa de Venda */}
                          <div
                            onClick={() => openBoatSalesPage(boat)}
                            className="relative flex-1 flex items-center justify-center px-6 py-4 cursor-pointer"
                            title={`Abrir página completa de venda de ${boat.modelo}`}
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

                          {/* Rodapé da Galeria com Miniaturas Rápidas */}
                          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-medium text-neutral-600 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-black/[0.05] truncate max-w-[180px] sm:max-w-none">
                              {formatBoatLocation(boat.vaga)}
                            </span>

                            {curatedPhotos.length > 1 ? (
                              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full border border-black/[0.06]">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoMap((prev) => ({
                                      ...prev,
                                      [boat.id]: (activeIdx - 1 + curatedPhotos.length) % curatedPhotos.length,
                                    }));
                                  }}
                                  className="p-1 text-neutral-500 hover:text-[#111113] cursor-pointer"
                                  aria-label="Foto anterior"
                                >
                                  <NavArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                                <div className="hidden sm:flex items-center gap-1 px-1">
                                  {curatedPhotos.slice(0, 5).map((_, dotIdx) => (
                                    <button
                                      key={dotIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePhotoMap((prev) => ({ ...prev, [boat.id]: dotIdx }));
                                      }}
                                      aria-label={`Ver foto ${dotIdx + 1}`}
                                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                        activeIdx === dotIdx ? 'w-4 bg-[#111113]' : 'w-1.5 bg-neutral-300 hover:bg-neutral-500'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-mono text-[10px] tabular-nums text-neutral-600 px-1">
                                  {activeIdx + 1}/{curatedPhotos.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoMap((prev) => ({
                                      ...prev,
                                      [boat.id]: (activeIdx + 1) % curatedPhotos.length,
                                    }));
                                  }}
                                  className="p-1 text-neutral-500 hover:text-[#111113] cursor-pointer"
                                  aria-label="Próxima foto"
                                >
                                  <NavArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openBoatSalesPage(boat)}
                                className="text-[11px] font-medium text-[#111113] bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-black/[0.06] hover:bg-white cursor-pointer"
                              >
                                Ver Dossiê Completo →
                              </button>
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
                                <h3
                                  onClick={() => openBoatSalesPage(boat)}
                                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111113] hover:text-[#2B1120] transition-colors mt-1 cursor-pointer"
                                >
                                  {boat.modelo}
                                </h3>
                                <p className="text-sm text-neutral-500 mt-0.5">
                                  {boat.fabricante} {!isJet && boat.tamanho ? `· ${boat.tamanho}` : ''}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => openBoatSalesPage(boat)}
                                className="text-xs font-semibold text-[#111113] hover:text-white bg-neutral-100 hover:bg-[#111113] inline-flex items-center gap-1.5 py-2 px-3.5 rounded-full border border-neutral-200 hover:border-[#111113] transition-all cursor-pointer shrink-0"
                              >
                                <span>Ficha & Fotos ({curatedPhotos.length})</span>
                                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.7} />
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
                              <div
                                className="grid gap-1.5"
                                style={{ gridTemplateColumns: `repeat(${boat.totalCotas}, minmax(0, 1fr))` }}
                              >
                                {Array.from({ length: boat.totalCotas }).map((_, segIdx) => {
                                  const isOccupied = segIdx < occupiedCotas;
                                  return (
                                    <div
                                      key={segIdx}
                                      className={`h-1.5 rounded-full transition-colors ${
                                        isOccupied ? 'bg-neutral-200' : 'bg-[#2B1120]'
                                      }`}
                                      title={
                                        isOccupied
                                          ? `Cota ${segIdx + 1}: Alocada`
                                          : `Cota ${segIdx + 1}: Disponível para aquisição`
                                      }
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
                                <span className="text-[11px] text-neutral-500 block mt-0.5">Horas de uso</span>
                              </div>

                              <div className="sm:border-l border-neutral-200/80 sm:px-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                                  Capacidade Homologada
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block tabular-nums">
                                  {boat.capacidade} passageiros
                                </span>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">Lotação autorizada</span>
                              </div>

                              <div className="sm:border-l border-neutral-200/80 sm:pl-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                                  Divisão Societária
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-[#111113] mt-1 block tabular-nums">
                                  Fração 1/{boat.totalCotas} avos
                                </span>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">Vale Administradora</span>
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

                              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openBoatSalesPage(boat)}
                                  className="px-5 py-3.5 rounded-full border border-neutral-300 hover:border-[#111113] text-[#111113] text-xs sm:text-sm font-medium tracking-tight transition-colors cursor-pointer"
                                >
                                  Ver Página de Venda
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openConversionModal(boat)}
                                  className="px-6 py-3.5 rounded-full bg-[#111113] hover:bg-[#2B1120] text-white text-xs sm:text-sm font-medium tracking-tight transition-all cursor-pointer inline-flex items-center gap-2 group/btn"
                                >
                                  <span>Agendar Visita</span>
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
        </>
      )}

      {/* ── OUTRAS EMBARCAÇÕES DA FROTA (Exibido na Página de Venda do Ativo) ── */}
      {dossierBoat && boats.filter((b) => b.id !== dossierBoat.id).length > 0 && (
        <section className="bg-[#F5F5F7] border-t border-black/[0.06] py-16 sm:py-24 px-4 sm:px-8">
          <div className="max-w-[1360px] mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <TricolorBar className="w-8 h-[2px]" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Portfólio Completo El Mexicano
                  </span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111113]">
                  Outras Embarcações Disponíveis.
                </h2>
              </div>

              <button
                type="button"
                onClick={closeBoatSalesPage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#111113] text-[#111113] hover:text-white border border-black/[0.08] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <NavArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Voltar para a Vitrine Completa</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {boats
                .filter((b) => b.id !== dossierBoat.id)
                .slice(0, 3)
                .map((otherBoat) => {
                  const otherIsJet = isJetSkiAsset(otherBoat);
                  const otherPhotos = getCuratedBoatPhotos(otherBoat);
                  const otherKey = `other_${otherBoat.id}`;
                  const otherImg = failedImages[otherKey]
                    ? otherIsJet
                      ? studioJetImg
                      : studioBoatImg
                    : otherPhotos[0];
                  return (
                    <div
                      key={otherBoat.id}
                      onClick={() => openBoatSalesPage(otherBoat)}
                      className="group bg-white rounded-3xl border border-black/[0.06] hover:border-[#2B1120] overflow-hidden transition-all cursor-pointer flex flex-col justify-between shadow-2xs"
                    >
                      <div className="relative h-52 bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                        <img
                          src={otherImg}
                          alt={otherBoat.modelo}
                          onError={() => setFailedImages((prev) => ({ ...prev, [otherKey]: true }))}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#111113] text-[11px] font-semibold px-3 py-1 rounded-full border border-black/[0.06] tabular-nums">
                          {otherBoat.cotasDisponiveisCount}/{otherBoat.totalCotas} livres
                        </span>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                            {otherBoat.fabricante} · Ano {otherBoat.ano}
                          </span>
                          <h3 className="text-xl font-semibold text-[#111113] group-hover:text-[#2B1120] transition-colors mt-0.5">
                            {otherBoat.modelo}
                          </h3>
                        </div>

                        <div className="pt-3 border-t border-neutral-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                              Fração 1/{otherBoat.totalCotas}
                            </span>
                            <span className="text-lg font-semibold tabular-nums text-[#111113]">
                              R$ {otherBoat.valorCota.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-[#2B1120] inline-flex items-center gap-1">
                            <span>Ver Página</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* ── LIGHTBOX EM TELA CHEIA (Inspeção de Múltiplas Fotos) ─────────────── */}
      <AnimatePresence>
        {dossierBoat && isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 select-none"
            onClick={() => setIsLightboxOpen(false)}
          >
            {(() => {
              const lbPhotos = getCuratedBoatPhotos(dossierBoat);
              const lbIdx = Math.min(dossierPhotoIdx, Math.max(0, lbPhotos.length - 1));
              const lbKey = `lb_${dossierBoat.id}_${lbIdx}`;
              const lbSrc = failedImages[lbKey]
                ? isJetSkiAsset(dossierBoat)
                  ? studioJetImg
                  : studioBoatImg
                : lbPhotos[lbIdx];

              return (
                <>
                  {/* Topo do Lightbox */}
                  <div
                    className="max-w-[1360px] w-full mx-auto flex items-center justify-between gap-4 text-white z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                        Galeria Oficial · Foto {lbIdx + 1} de {lbPhotos.length}
                      </span>
                      <h3 className="text-base sm:text-lg font-semibold text-white">
                        {dossierBoat.fabricante} {dossierBoat.modelo} ({dossierBoat.ano})
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <span>Fechar (ESC)</span>
                      <Xmark className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Imagem Central Ampliada */}
                  <div
                    className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lbPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDossierPhotoIdx((prev) => (prev - 1 + lbPhotos.length) % lbPhotos.length)}
                        className="absolute left-2 sm:left-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Foto anterior"
                      >
                        <NavArrowLeft className="w-6 h-6" strokeWidth={2} />
                      </button>
                    )}

                    <img
                      src={lbSrc}
                      alt={`${dossierBoat.modelo} — Foto ${lbIdx + 1}`}
                      onError={() => setFailedImages((prev) => ({ ...prev, [lbKey]: true }))}
                      className="max-h-[72vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
                    />

                    {lbPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDossierPhotoIdx((prev) => (prev + 1) % lbPhotos.length)}
                        className="absolute right-2 sm:right-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Próxima foto"
                      >
                        <NavArrowRight className="w-6 h-6" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* Barra Inferior de Miniaturas no Lightbox */}
                  {lbPhotos.length > 1 && (
                    <div
                      className="max-w-3xl w-full mx-auto flex items-center justify-center gap-2.5 overflow-x-auto py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lbPhotos.map((pUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDossierPhotoIdx(idx)}
                          className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                            idx === lbIdx ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-85'
                          }`}
                        >
                          <img src={pUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
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
                    Placa Píer / Marina Club Velho Chico
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
              Gestão operacional na Marina Club Velho Chico, manutenção preventiva de engenharia e administração condominial sob
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

      {/* Modal Comercial de Configuração de Equipamentos & Acessórios */}
      <ComercialEquipamentosModal
        isOpen={equipamentosModalOpen}
        onClose={() => {
          setEquipamentosModalOpen(false);
          setEquipamentosModalBoat(null);
        }}
        boat={equipamentosModalBoat}
        onSaveSuccess={(updatedBoat) => {
          if (dossierBoat && dossierBoat.id === updatedBoat.id) {
            setDossierBoat(updatedBoat);
          }
          setBoats(prev => prev.map(b => (b.id === updatedBoat.id ? updatedBoat : b)));
        }}
      />
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
      vaga: 'Marina Club Velho Chico',
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
      taxaAdmMensal: 350,
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
