import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Ship,
  Sparkles,
  QrCode,
  Share2,
  Copy,
  ExternalLink,
  MessageSquare,
  Flame,
  CheckCircle2,
  Clock,
  Download,
  Send,
  Users,
  Printer,
  Compass,
  Filter,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';
import { Embarcacao, Cliente } from '../../types';
import { boatDB, clientDB } from '../../db';
import { getBoatEstoqueResumo } from '../../utils/cotaUtils';

interface ComercialCatalogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendedorNome?: string;
  onLeadCaptured?: () => void;
}

const UTM_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp (Conversa Direta)' },
  { id: 'instagram_bio', label: 'Instagram (Link na Bio)' },
  { id: 'instagram_stories', label: 'Instagram (Stories / Arraste)' },
  { id: 'qrcode_marina', label: 'QR Code (Placa Marina / Pier)' },
  { id: 'indicacao_cliente', label: 'Indicação de Cotista' },
  { id: 'anuncio_digital', label: 'Campanha Digital / Anúncio' }
];

export default function ComercialCatalogoModal({
  isOpen,
  onClose,
  vendedorNome = 'Equipe Comercial',
  onLeadCaptured
}: ComercialCatalogoModalProps) {
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() as Embarcacao[]);
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll() as Cliente[]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // Filtros internos
  const [selectedUtm, setSelectedUtm] = useState('whatsapp');
  const [filtroApenasDisponiveis, setFiltroApenasDisponiveis] = useState(true);

  // Estados de QR Code
  const [selectedBoatForQr, setSelectedBoatForQr] = useState<Embarcacao | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Estados de feedback de cópia
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [copiadoKit, setCopiadoKit] = useState<string | null>(null);

  // Carregar dados frescos da frota comercial
  useEffect(() => {
    let isMounted = true;
    const fetchFrota = async () => {
      try {
        setLoadingRemote(true);
        const token = localStorage.getItem('admin_token');
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/comercial/frota-cotas', { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.frota) && data.frota.length > 0) {
            setBoats(data.frota);
          }
        }
      } catch (e) {
        console.warn("Usando cache local de embarcações:", e);
      } finally {
        if (isMounted) setLoadingRemote(false);
      }
    };

    if (isOpen) {
      fetchFrota();
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  // Lista de barcos com cálculos consolidados de estoque e cotas disponíveis
  const catalogBoats = useMemo(() => {
    return boats
      .map(b => {
        const estoque = getBoatEstoqueResumo(b.id, clients, b);
        const valorCota = Number((b as any).valorCota) || 180000;
        const taxaAdmMensal = Number((b as any).taxaAdmMensal) || 2500;
        const totalDisponiveis = estoque.cotasDisponiveis + estoque.cotasRepasse;

        return {
          boat: b,
          estoque,
          valorCota,
          taxaAdmMensal,
          totalDisponiveis,
          temEstoqueOuRepasse: totalDisponiveis > 0
        };
      })
      .filter(item => {
        if (filtroApenasDisponiveis) {
          return item.temEstoqueOuRepasse;
        }
        return true;
      });
  }, [boats, clients, filtroApenasDisponiveis]);

  // Gerador de links com parâmetros rastreáveis do vendedor
  const getShareUrl = (boatId?: string) => {
    const base = window.location.origin;
    const vendorParam = encodeURIComponent(vendedorNome);
    const utm = encodeURIComponent(selectedUtm);
    if (boatId) {
      return `${base}/catalogo?barco=${boatId}&vendedor=${vendorParam}&utm_source=${utm}`;
    }
    return `${base}/catalogo?vendedor=${vendorParam}&utm_source=${utm}`;
  };

  const copyVendedorLink = (boatId?: string) => {
    const url = getShareUrl(boatId);
    navigator.clipboard.writeText(url);
    const key = boatId || 'geral';
    setCopiadoId(key);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // Copiador de Apresentação Express formatada para WhatsApp
  const copyKitMidia = (b: Embarcacao, vagasLivres: number, valorCota: number, taxaAdmMensal: number) => {
    const boatUrl = getShareUrl(b.id);
    const totalCotas = Number((b as any).totalCotas) || 4;

    const texto = `🌊 *OPORTUNIDADE EXCLUSIVA EL MEXICANO* 🚤\n\n` +
      `Conheça a *${b.nome}* (${b.modelo || b.fabricante || 'Lancha de Alto Padrão'}).\n\n` +
      `✨ *Ficha Rápida da Embarcação:*\n` +
      `• Fabricante / Modelo: ${b.fabricante || 'Premium'} ${b.modelo || ''}\n` +
      `• Motorização: ${b.potencia || 'Motor Centro-Rabeta'}\n` +
      `• Capacidade: ${b.capacidadePassageiros || 10} passageiros a bordo\n` +
      `• Vaga: Marina Náutica (${b.vaga || 'Vaga Privativa'})\n` +
      `• Estrutura: Churrasqueira gourmet, som náutico e conveniência completa\n\n` +
      `💰 *Valores da Cota Inteligente:*\n` +
      `• Fração (Cota): *R$ ${valorCota.toLocaleString('pt-BR')}*\n` +
      `• Taxa Condominial Mensal (Vale Administradora): *R$ ${taxaAdmMensal.toLocaleString('pt-BR')}/mês*\n` +
      `  _(Cobre marinharia, vaga na Marina, seguro e limpeza pós-uso)_\n\n` +
      `🔥 *Disponibilidade Imediata:*\n` +
      `Restam apenas *${vagasLivres} ${vagasLivres === 1 ? 'cota disponível' : 'cotas disponíveis'}* do total de ${totalCotas} cotas!\n\n` +
      `💼 *Economia Real:*\n` +
      `Economize até 80% em relação ao barco 100% individual, sem dor de cabeça com marinheiro ou manutenção.\n\n` +
      `📲 *Acesse o Catálogo Digital com Fotos & Ficha Completa:*\n` +
      `${boatUrl}\n\n` +
      `_Podemos agendar uma visita presencial na Marina ou tirar suas dúvidas?_\n` +
      `Atenciosamente,\n*${vendedorNome}* | Consultor Náutico El Mexicano`;

    navigator.clipboard.writeText(texto);
    setCopiadoKit(b.id);
    setTimeout(() => setCopiadoKit(null), 2500);
  };

  // Gerar QR Code via biblioteca oficial
  const handleOpenQrModal = async (boat: Embarcacao) => {
    setSelectedBoatForQr(boat);
    setQrGenerating(true);
    try {
      const url = getShareUrl(boat.id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        color: {
          dark: '#2D0A16',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
    } finally {
      setQrGenerating(false);
    }
  };

  // Imprimir Placa Física Oficial da Marina
  const handlePrintMarinaPlacard = () => {
    if (!selectedBoatForQr || !qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Placa Marina - ${selectedBoatForQr.nome} - El Mexicano</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            text-align: center;
            color: #1c1917;
            padding: 30px;
            margin: 0;
            background: #fff;
          }
          .border-box {
            border: 4px solid #2D0A16;
            border-radius: 24px;
            padding: 40px 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          .brand-title {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #2D0A16;
            margin-bottom: 4px;
          }
          .brand-subtitle {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #78716c;
            margin-bottom: 25px;
          }
          .boat-name {
            font-size: 34px;
            font-weight: 800;
            color: #0c0a09;
            margin: 10px 0 4px;
          }
          .boat-spec {
            font-size: 15px;
            color: #57534e;
            margin-bottom: 25px;
          }
          .qr-img {
            width: 260px;
            height: 260px;
            margin: 15px auto;
            border: 2px solid #e7e5e4;
            border-radius: 16px;
            padding: 10px;
          }
          .cta {
            font-size: 18px;
            font-weight: bold;
            color: #2D0A16;
            margin-top: 20px;
          }
          .instructions {
            font-size: 13px;
            color: #78716c;
            margin-top: 6px;
            line-height: 1.4;
          }
          .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #a8a29e;
            border-top: 1px solid #e7e5e4;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="border-box">
          <div class="brand-title">EL MEXICANO</div>
          <div class="brand-subtitle">Gestão Náutica • Cotas Inteligentes</div>

          <div class="boat-name">${selectedBoatForQr.nome}</div>
          <div class="boat-spec">${selectedBoatForQr.modelo || 'Lancha de Alto Padrão'} • ${selectedBoatForQr.fabricante || 'Estaleiro Premium'}</div>

          <img src="${qrDataUrl}" class="qr-img" />

          <div class="cta">Aponte a câmera do seu celular</div>
          <div class="instructions">
            Escaneie o QR Code para visualizar a ficha técnica completa, fotos em alta resolução,
            disponibilidade de cotas e agendar um Test Drive exclusivo.
          </div>

          <div class="footer">
            Atendimento Consultivo: ${vendedorNome} • Gestão Náutica Vale Administradora
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Baixar imagem do QR Code em PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !selectedBoatForQr) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${selectedBoatForQr.nome.toLowerCase().replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedBoatForQr) setSelectedBoatForQr(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedBoatForQr, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header no Padrão Vila Náutica ─────────────────────────── */}
        <div className="px-6 py-4 border-b border-stone-200/80 bg-[#F8F7F4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D0A16] text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  Central do Catálogo Digital & Captação Ativa
                </h2>
                <span className="text-[10px] font-bold bg-[#2D0A16]/10 text-[#2D0A16] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Vila Náutica
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Gere links com sua tag de vendedor, cópias persuasivas para WhatsApp e QR Codes para placas da Marina.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Barra de Rastreamento & UTMs ──────────────────────────── */}
        <div className="px-6 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-stone-700">Origem de Captação (UTM):</span>
            <select
              value={selectedUtm}
              onChange={e => setSelectedUtm(e.target.value)}
              className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 font-semibold text-stone-800 focus:border-[#2D0A16] focus:ring-1 focus:ring-[#2D0A16] outline-hidden cursor-pointer"
            >
              {UTM_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={filtroApenasDisponiveis}
                onChange={e => setFiltroApenasDisponiveis(e.target.checked)}
                className="w-4 h-4 rounded text-[#2D0A16] border-stone-300 focus:ring-[#2D0A16]"
              />
              <span className="font-semibold text-stone-600 text-xs">Apenas barcos com cotas livres</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyVendedorLink()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2D0A16] text-white rounded-xl font-bold hover:bg-[#3D0E1F] transition-colors cursor-pointer shadow-xs"
            >
              {copiadoId === 'geral' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Link Geral Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Link Geral do Catálogo
                </>
              )}
            </button>

            <a
              href={getShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors shadow-2xs"
              title="Abrir vitrine como cliente visualiza"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* ── Grid de Embarcações ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>
              Exibindo {catalogBoats.length} {catalogBoats.length === 1 ? 'embarcação' : 'embarcações'}
            </span>
            <span className="text-[11px] text-stone-400">
              Vendedor Ativo: <strong className="text-stone-700">{vendedorNome}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogBoats.map(({ boat, estoque, valorCota, taxaAdmMensal, totalDisponiveis }) => {
              const vagasLivres = estoque.cotasDisponiveis;
              const vagasRepasse = estoque.cotasRepasse;

              return (
                <div
                  key={boat.id}
                  className="bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400 p-5 space-y-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Topo do Barco */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-stone-900">{boat.nome}</h3>
                          {boat.tamanho && (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                              {boat.tamanho}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">
                          {boat.modelo || 'Lancha'} • {boat.fabricante || 'Estaleiro'} • Ano {boat.ano || 2022}
                        </p>
                      </div>

                      {/* Badge de Escassez */}
                      {totalDisponiveis > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0">
                          <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          {totalDisponiveis === 1 ? 'Última cota livre!' : `${totalDisponiveis} cotas livres`}
                        </div>
                      ) : (
                        <div className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0">
                          100% Vendida
                        </div>
                      )}
                    </div>

                    {/* Especificações Rápidas */}
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl text-center text-xs text-stone-700">
                      <div>
                        <span className="text-stone-400 text-[10px] uppercase font-bold block">Quadro</span>
                        <span className="font-bold text-stone-900">{estoque.totalCotas} cotas</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] uppercase font-bold block">Estoque</span>
                        <span className="font-bold text-emerald-700">{vagasLivres}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] uppercase font-bold block">Repasse</span>
                        <span className="font-bold text-stone-900">{vagasRepasse}</span>
                      </div>
                    </div>

                    {/* Ficha Financeira */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                      <div>
                        <span className="text-stone-400 text-[10px] block">Cota</span>
                        <span className="font-extrabold text-stone-900 text-sm">
                          R$ {valorCota.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-stone-400 text-[10px] block">Taxa Adm Mensal</span>
                        <span className="font-bold text-stone-700">
                          R$ {taxaAdmMensal.toLocaleString('pt-BR')}/mês
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações por Embarcação */}
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenQrModal(boat)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
                        title="Ver e Imprimir Placa com QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-stone-800" />
                        <span>Placa Marina</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyKitMidia(boat, totalDisponiveis, valorCota, taxaAdmMensal)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                        title="Copiar texto de vendas completo formatado para WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{copiadoKit === boat.id ? 'Copiado!' : 'Kit WhatsApp'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyVendedorLink(boat.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D0A16] hover:bg-[#3D0E1F] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      title="Copiar link direto dessa lancha com UTM do vendedor"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>{copiadoId === boat.id ? 'Link Copiado!' : 'Link c/ Tag'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MODAL QR CODE DA EMBARCAÇÃO (Impressão & Download) ───── */}
        {selectedBoatForQr && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
            onClick={() => setSelectedBoatForQr(null)}
          >
            <div 
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 cursor-default"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-stone-900 tracking-tight">QR Code da Embarcação</h3>
                  <p className="text-xs text-stone-500">{selectedBoatForQr.nome}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBoatForQr(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Box de Exibição do QR Code */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 inline-block mx-auto shadow-inner">
                {qrGenerating || !qrDataUrl ? (
                  <div className="w-52 h-52 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#2D0A16] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${selectedBoatForQr.nome}`}
                      className="w-52 h-52 mx-auto rounded-xl shadow-xs bg-white p-2"
                    />
                    <span className="text-[11px] font-mono font-bold text-stone-600 block">
                      Tag: {selectedBoatForQr.nome} ({selectedUtm})
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                Ao apontar o celular para a placa, o visitante abre a ficha técnica com fotos da embarcação e entra direto no seu CRM com seu rastreio.
              </p>

              {/* Botões de Ação do QR Code */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintMarinaPlacard}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 bg-[#2D0A16] hover:bg-[#3D0E1F] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Imprimir Placa</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
