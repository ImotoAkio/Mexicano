import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship,
  Sparkles,
  Flame,
  CheckCircle2,
  Calendar,
  Shield,
  Clock,
  Users,
  Compass,
  ArrowRight,
  MessageSquare,
  ChevronRight,
  Check,
  Send,
  X,
  Phone,
  RefreshCw,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

interface PublicBoat {
  id: string;
  nome: string;
  modelo: string;
  fabricante: string;
  ano: number;
  motorizacao: string;
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

export default function CatalogoPublicoPage() {
  const [boats, setBoats] = useState<PublicBoat[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedor, setVendedor] = useState<VendedorInfo | null>(null);
  const [selectedBoatForModal, setSelectedBoatForModal] = useState<PublicBoat | null>(null);
  const [activePhotoMap, setActivePhotoMap] = useState<Record<string, number>>({});

  // Mini-Formulário de Captação
  const [leadNome, setLeadNome] = useState('');
  const [leadTelefone, setLeadTelefone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [possuiPermuta, setPossuiPermuta] = useState(false);
  const [descricaoPermuta, setDescricaoPermuta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ whatsappUrl: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Parâmetros de URL
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialBarcoId = searchParams.get('barco');
  const vendedorParam = searchParams.get('vendedor') || '';
  const utmSource = searchParams.get('utm_source') || 'catalogo';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';

  // Carregar dados da Vitrine Pública
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
            setBoats(data.barcos || []);
            if (data.vendedor) setVendedor(data.vendedor);
          }
        } else {
          // Fallback gracioso caso endpoint retorne status diferente
          if (isMounted) setBoats(getFallbackBoats());
        }
      } catch (e) {
        console.warn("Erro ao buscar catálogo comercial:", e);
        if (isMounted) setBoats(getFallbackBoats());
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCatalogo();
    return () => { isMounted = false; };
  }, [vendedorParam]);

  // Se veio parâmetro de barco específico, abrir ou rolar até ele
  useEffect(() => {
    if (!loading && initialBarcoId && boats.length > 0) {
      const el = document.getElementById(`barco-${initialBarcoId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [loading, initialBarcoId, boats]);

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
      setFormError('Por favor, informe seu nome completo.');
      return;
    }
    if (cleanPhone.length < 10) {
      setFormError('Por favor, digite um número de WhatsApp válido com DDD.');
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
        vendedorNome: vendedor?.nome,
        origem: utmSource || 'catalogo',
        possuiPermuta,
        descricaoPermuta: possuiPermuta ? descricaoPermuta.trim() : undefined,
        utmSource,
        utmMedium,
        utmCampaign
      };

      const res = await fetch('/api/leads/captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar interesse');
      }

      setSuccessResult({
        whatsappUrl: data.whatsappUrl,
        message: data.message || 'Interesse registrado com sucesso!'
      });

      // Redireciona automaticamente para o WhatsApp após breve delay
      if (data.whatsappUrl) {
        setTimeout(() => {
          window.location.href = data.whatsappUrl;
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Falha ao enviar interesse. Tente novamente.');
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
    <div className="min-h-screen bg-[#F8F7F4] text-stone-900 font-sans antialiased selection:bg-[#2D0A16] selection:text-white">
      {/* ── Top Bar Institucional ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D0A16] text-white flex items-center justify-center font-bold shadow-xs">
              <Ship className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base sm:text-lg text-stone-900">EL MEXICANO</span>
                <span className="text-[10px] font-bold bg-[#2D0A16]/10 text-[#2D0A16] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gestão Náutica
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                Cotas Inteligentes & Marinharia de Alto Padrão
              </p>
            </div>
          </div>

          {/* Atendimento do Vendedor / Consultor Comercial */}
          {vendedor && (
            <div className="flex items-center gap-2 sm:gap-3 bg-stone-100/90 border border-stone-200 px-3 py-1.5 rounded-2xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                  Seu Consultor Náutico
                </span>
                <span className="text-xs font-bold text-stone-800">{vendedor.nome}</span>
              </div>
              <a
                href={`https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(`Olá ${vendedor.nome}! Estive no Catálogo Digital da El Mexicano e gostaria de conversar.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-xs"
                title="Conversar direto no WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero Promocional & Persuasivo ─────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2D0A16] to-[#1E050D] text-white py-12 sm:py-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-300/30 text-amber-200 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            CATÁLOGO EXCLUSIVO DE COTAS DISPONÍVEIS
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Navegue no Melhor da Náutica com <br className="hidden sm:inline" />
            <span className="text-amber-300">Custo até 80% Menor</span> e Zero Preocupação
          </h1>

          <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Tenha uma lancha premium 100% pronta na Marina, com marinharia inclusa, manutenção preventiva rigorosa
            e agendamento fácil no aplicativo. Escolha sua embarcação abaixo e garanta sua fração antes do encerramento das cotas.
          </p>

          {/* Selos de Confiança Náutica */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-300">
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Vaga & Marinheiro Inclusos
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Sem Fila de Espera
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Gestão Vale Administradora
            </span>
          </div>
        </div>
      </section>

      {/* ── Vitrine de Embarcações ─────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-10">
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-[#2D0A16] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-stone-600 animate-pulse">
              Carregando disponibilidade de frota e cotas ativas...
            </p>
          </div>
        ) : boats.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-3 max-w-lg mx-auto shadow-xs">
            <Ship className="w-12 h-12 text-stone-400 mx-auto" />
            <h3 className="text-lg font-bold text-stone-900">Todas as cotas estão temporariamente alocadas!</h3>
            <p className="text-xs text-stone-500">
              Novas frações e repasses entram regularmente em nosso portfólio.
              Fale com nosso consultor no WhatsApp para receber o aviso em primeira mão.
            </p>
            <a
              href={`https://wa.me/${vendedor?.whatsapp || '558791229333'}?text=${encodeURIComponent("Olá! Gostaria de entrar na lista de espera para novas cotas náuticas El Mexicano.")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D0A16] text-white rounded-xl text-xs font-bold hover:bg-[#3D0E1F] transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Entrar em Contato no WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Embarcações Disponíveis para Entrada Imediata
                </h2>
                <p className="text-xs sm:text-sm text-stone-500">
                  Mostrando apenas lanchas com cotas em estoque El Mexicano ou repasse ativo.
                </p>
              </div>

              <div className="text-xs font-bold text-stone-700 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {boats.length} {boats.length === 1 ? 'embarcação disponível' : 'embarcações disponíveis'}
              </div>
            </div>

            {/* Lista dos Cards de Barcos */}
            <div className="grid grid-cols-1 gap-10">
              {boats.map((boat) => {
                const photos = boat.fotos && boat.fotos.length > 0
                  ? boat.fotos
                  : [boat.imagemPrincipal || 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80'];

                const activeIdx = activePhotoMap[boat.id] || 0;
                const isSelected = initialBarcoId === boat.id;

                const isUltimaCota = boat.cotasDisponiveisCount === 1;
                const hasRepasse = boat.cotasRepasseCount > 0;

                return (
                  <article
                    id={`barco-${boat.id}`}
                    key={boat.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                      isSelected ? 'border-[#2D0A16] ring-2 ring-[#2D0A16]/20' : 'border-stone-200/90'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                      {/* Galeria de Fotos (Mobile-friendly) */}
                      <div className="lg:col-span-5 relative bg-stone-100 flex flex-col justify-between min-h-[280px] sm:min-h-[360px]">
                        <div className="relative w-full h-full min-h-[260px] sm:min-h-[340px]">
                          <img
                            src={photos[activeIdx]}
                            alt={boat.nome}
                            className="w-full h-full object-cover transition-opacity duration-300"
                            loading="lazy"
                          />

                          {/* Badges Flutuantes sobre a Imagem */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                            {isUltimaCota ? (
                              <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md animate-pulse">
                                <Flame className="w-3.5 h-3.5 text-amber-200" /> ÚLTIMA COTA DISPONÍVEL!
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-stone-900 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
                                <Flame className="w-3.5 h-3.5 text-white" />
                                Apenas {boat.cotasDisponiveisCount} cotas restantes
                              </span>
                            )}

                            {hasRepasse && (
                              <span className="inline-flex items-center gap-1 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                <RefreshCw className="w-3 h-3 text-amber-300" />
                                Oportunidade de Repasse
                              </span>
                            )}
                          </div>

                          {/* Indicador de Vaga na Marina */}
                          <div className="absolute bottom-3 left-3 z-10">
                            <span className="bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                              <Compass className="w-3 h-3 text-amber-300" />
                              Vaga: {boat.vaga || 'Marina Náutica'}
                            </span>
                          </div>

                          {/* Navegação de Fotos caso haja mais de 1 */}
                          {photos.length > 1 && (
                            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg text-white text-[10px] font-mono">
                              <span>{activeIdx + 1}</span> / <span>{photos.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Miniaturas de Fotos */}
                        {photos.length > 1 && (
                          <div className="p-2.5 bg-stone-50 border-t border-stone-200/80 flex items-center gap-2 overflow-x-auto">
                            {photos.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActivePhotoMap(prev => ({ ...prev, [boat.id]: i }))}
                                className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                  activeIdx === i ? 'border-[#2D0A16] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Informações da Embarcação & Ficha Técnica */}
                      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                          {/* Cabeçalho do Card */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black text-stone-900 tracking-tight">{boat.nome}</h3>
                                {boat.tamanho && (
                                  <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                    {boat.tamanho}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                                {boat.modelo} • {boat.fabricante} • Ano {boat.ano}
                              </p>
                            </div>

                            {/* Status da Marina */}
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl self-start">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Pronta na Marina
                            </div>
                          </div>

                          {/* Especificações em Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-stone-50/90 border border-stone-200/70 p-3.5 rounded-2xl text-stone-800 text-xs">
                            <div>
                              <span className="text-[10px] font-semibold text-stone-400 block uppercase tracking-wider">
                                Capacidade
                              </span>
                              <span className="font-extrabold text-stone-900">{boat.capacidade} pessoas</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-stone-400 block uppercase tracking-wider">
                                Motorização
                              </span>
                              <span className="font-extrabold text-stone-900 truncate block">{boat.motorizacao}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-stone-400 block uppercase tracking-wider">
                                Quadro Societário
                              </span>
                              <span className="font-extrabold text-stone-900">{boat.totalCotas} cotas totais</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-stone-400 block uppercase tracking-wider">
                                Disponibilidade
                              </span>
                              <span className="font-extrabold text-amber-700">
                                {boat.cotasDisponiveisCount} {boat.cotasDisponiveisCount === 1 ? 'cota livre' : 'cotas livres'}
                              </span>
                            </div>
                          </div>

                          {/* Itens de Conforto e Conveniência */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                              Itens de Conforto & Acessórios
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {boat.itensConforto.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200/60 px-2.5 py-1 rounded-lg"
                                >
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Box Comparativo de Economia Inteligente */}
                          <div className="bg-[#2D0A16]/5 border border-[#2D0A16]/15 rounded-2xl p-4 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-[#2D0A16]">
                              <Shield className="w-4 h-4" />
                              Comparativo: Barco Próprio vs. Modelo Inteligente El Mexicano
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700 pt-1">
                              <div className="space-y-1">
                                <span className="text-[10px] text-stone-400 uppercase font-bold block">100% Individual</span>
                                <p className="font-medium">
                                  Investimento total de <strong className="text-stone-900">R$ {(boat.valorCota * boat.totalCotas).toLocaleString('pt-BR')}</strong>, vaga de até R$ 5.000/mês e marinheiro por sua conta.
                                </p>
                              </div>
                              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#2D0A16]/15 pt-2 sm:pt-0 sm:pl-3">
                                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Fração El Mexicano</span>
                                <p className="font-medium text-stone-900">
                                  Você paga apenas a sua cota de <strong className="text-emerald-700">R$ {boat.valorCota.toLocaleString('pt-BR')}</strong> e a taxa rateada cobre marinheiro, marina e seguro.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bloco Financeiro e Botão de Ação */}
                        <div className="pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                              Valor da Cota (Fração)
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                                R$ {boat.valorCota.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-xs text-stone-500 font-medium">
                                + R$ {boat.taxaAdmMensal.toLocaleString('pt-BR')}/mês
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 block">
                              Taxa condominial náutica com marinheiro e vaga inclusos
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openConversionModal(boat)}
                              className="px-5 py-3 rounded-xl bg-[#2D0A16] hover:bg-[#3D0E1F] text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2 group"
                            >
                              <span>Tenho Interesse / Agendar Visita</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-amber-300" />
                            </button>

                            <a
                              href={`https://wa.me/${vendedor?.whatsapp || '558791229333'}?text=${encodeURIComponent(`Olá! Vi a embarcação ${boat.nome} no Catálogo Digital da El Mexicano e gostaria de mais detalhes.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 rounded-xl border border-stone-300 hover:border-stone-400 bg-white text-stone-700 hover:text-stone-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                              title="Tirar dúvidas no WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4 text-emerald-600" />
                              <span className="sm:hidden">WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DE CAPTAÇÃO DE LEAD / AGENDAMENTO ───────────────── */}
      {selectedBoatForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="p-5 bg-gradient-to-r from-[#2D0A16] to-[#3D0E1F] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Visita na Marina & Agendamento
                </span>
                <h3 className="text-lg font-black tracking-tight">{selectedBoatForModal.nome}</h3>
                <p className="text-xs text-stone-300">
                  Cota: R$ {selectedBoatForModal.valorCota.toLocaleString('pt-BR')} • {selectedBoatForModal.cotasDisponiveisCount} disponíveis
                </p>
              </div>

              <button
                type="button"
                onClick={closeConversionModal}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <div className="p-6">
              {successResult ? (
                <div className="text-center py-6 space-y-4 animate-in fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-stone-900">Interesse Registrado com Sucesso!</h4>
                    <p className="text-xs text-stone-600 mt-1">
                      {successResult.message}
                    </p>
                  </div>

                  <p className="text-xs text-stone-500 font-medium">
                    Redirecionando você direto para o WhatsApp do nosso consultor...
                  </p>

                  <div className="pt-2">
                    <a
                      href={successResult.whatsappUrl}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Abrir WhatsApp Agora
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={leadNome}
                      onChange={e => setLeadNome(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silveira"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#2D0A16] focus:ring-1 focus:ring-[#2D0A16] outline-hidden text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">
                      WhatsApp com DDD <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={leadTelefone}
                      onChange={handleTelefoneChange}
                      placeholder="(47) 99999-9999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#2D0A16] focus:ring-1 focus:ring-[#2D0A16] outline-hidden text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">
                      E-mail (Opcional)
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#2D0A16] focus:ring-1 focus:ring-[#2D0A16] outline-hidden text-sm transition-all"
                    />
                  </div>

                  {/* Campo de Permuta / Troca */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={possuiPermuta}
                        onChange={e => setPossuiPermuta(e.target.checked)}
                        className="w-4 h-4 rounded text-[#2D0A16] border-stone-300 focus:ring-[#2D0A16]"
                      />
                      <span className="text-xs font-bold text-stone-800">
                        Tenho um bem para avaliação / permuta (veículo, jet-ski ou barco)
                      </span>
                    </label>

                    {possuiPermuta && (
                      <div className="animate-in fade-in duration-150 pt-1">
                        <textarea
                          rows={2}
                          value={descricaoPermuta}
                          onChange={e => setDescricaoPermuta(e.target.value)}
                          placeholder="Informe modelo, ano e valor aproximado do seu bem..."
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-[#2D0A16] focus:ring-1 focus:ring-[#2D0A16] outline-hidden text-xs transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-400">
                    Ao clicar abaixo, seus dados serão registrados em nosso sistema seguro e você será redirecionado para o WhatsApp com o consultor comercial.
                  </p>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-4 bg-[#2D0A16] hover:bg-[#3D0E1F] disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Registrando interesse...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar & Iniciar Conversa no WhatsApp</span>
                          <ArrowRight className="w-4 h-4 text-amber-300" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Institucional ──────────────────────────────────── */}
      <footer className="bg-stone-900 text-stone-400 py-10 px-4 border-t border-stone-800 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-extrabold text-white text-sm tracking-tight mb-1">
              EL MEXICANO • GESTÃO NÁUTICA
            </div>
            <p className="text-stone-500">
              Operação e administração náutica inteligente sob gestão da Marina & Vale Administradora.
            </p>
          </div>

          <div className="text-[11px] text-stone-500">
            © {new Date().getFullYear()} El Mexicano. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Fallback de barcos para visualização imediata caso o DB esteja iniciando
function getFallbackBoats(): PublicBoat[] {
  return [
    {
      id: 'boat_M55',
      nome: 'M55',
      modelo: 'Sessa Marine C44',
      fabricante: 'Sessa Marine',
      ano: 2023,
      motorizacao: '2x Volvo Penta IPS 600',
      capacidade: 14,
      fotos: [
        'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80'
      ],
      imagemPrincipal: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
      itensConforto: [
        'Churrasqueira Gourmet',
        'Plataforma Hidráulica',
        'Gerador & Ar Condicionado',
        'Som Náutico JBL',
        'Solário de Proa',
        'Cozinha Completa'
      ],
      valorCota: 380000,
      taxaAdmMensal: 4200,
      totalCotas: 8,
      cotasDisponiveisCount: 1,
      cotasEstoqueCount: 1,
      cotasRepasseCount: 0,
      vaga: 'Vaga Molhada VIP Pier A',
      tamanho: '44 pés',
      statusMarina: 'na_marina'
    },
    {
      id: 'boat_280',
      nome: 'El Mexicano 280',
      modelo: 'Focker 280 GT',
      fabricante: 'Fibrafort',
      ano: 2022,
      motorizacao: 'Mercruiser 300HP V8',
      capacidade: 10,
      fotos: [
        'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80'
      ],
      imagemPrincipal: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
      itensConforto: [
        'Churrasqueira de Popa',
        'Toldo Retrátil',
        'Som Bluetooth',
        'Ducha Pressurizada',
        'Mesa de Centro'
      ],
      valorCota: 145000,
      taxaAdmMensal: 2100,
      totalCotas: 4,
      cotasDisponiveisCount: 2,
      cotasEstoqueCount: 1,
      cotasRepasseCount: 1,
      vaga: 'Vaga Seca Galpão 1',
      tamanho: '28 pés',
      statusMarina: 'na_marina'
    }
  ];
}
