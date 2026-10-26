import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Xmark,
  QrCode,
  ShareIos,
  Copy,
  Check,
  OpenNewWindow,
  Download,
  Printer,
  Search
} from 'iconoir-react';
import { Embarcacao, Cliente } from '../../types';
import { boatDB, clientDB } from '../../db';
import { getBoatEstoqueResumo } from '../../utils/cotaUtils';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';

interface ComercialCatalogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendedorNome?: string;
  onLeadCaptured?: () => void;
}

const UTM_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp Executivo' },
  { id: 'instagram_bio', label: 'Instagram · Bio' },
  { id: 'instagram_stories', label: 'Instagram · Direct' },
  { id: 'qrcode_marina', label: 'Placa Píer / Marina' },
  { id: 'indicacao_cliente', label: 'Indicação Private' },
  { id: 'anuncio_digital', label: 'Campanha Digital' },
];

function TricolorBar({ className = 'w-9 h-[2px]' }: { className?: string }) {
  return (
    <div className={`flex overflow-hidden shrink-0 ${className}`} aria-hidden="true">
      <span className="flex-1 bg-[#4f7d32]" />
      <span className="flex-1 bg-[#d6d3d1]" />
      <span className="flex-1 bg-[#b4402f]" />
    </div>
  );
}

export default function ComercialCatalogoModal({
  isOpen,
  onClose,
  vendedorNome = 'Consultoria Private El Mexicano',
}: ComercialCatalogoModalProps) {
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() as Embarcacao[]);
  const [clients] = useState<Cliente[]>(() => clientDB.getAll() as Cliente[]);

  const [selectedUtm, setSelectedUtm] = useState('whatsapp');
  const [filtroApenasDisponiveis, setFiltroApenasDisponiveis] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de QR Code
  const [selectedBoatForQr, setSelectedBoatForQr] = useState<Embarcacao | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Estados de feedback de cópia
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [copiadoKit, setCopiadoKit] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFrota = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/comercial/frota-cotas', { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.frota) && data.frota.length > 0) {
            setBoats(data.frota);
          }
        }
      } catch {
        // Fallback silencioso para cache local
      }
    };

    if (isOpen) {
      fetchFrota();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const catalogBoats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return boats
      .filter((b) => b.nome && !b.nome.toLowerCase().includes('test boat'))
      .map((b) => {
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
          temEstoqueOuRepasse: totalDisponiveis > 0,
        };
      })
      .filter((item) => {
        if (filtroApenasDisponiveis && !item.temEstoqueOuRepasse) return false;
        if (q) {
          const hay = `${item.boat.nome} ${item.boat.modelo || ''} ${item.boat.fabricante || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [boats, clients, filtroApenasDisponiveis, searchQuery]);

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
    setTimeout(() => setCopiadoId(null), 2400);
  };

  const copyKitMidia = (b: Embarcacao, vagasLivres: number, valorCota: number, taxaAdmMensal: number) => {
    const boatUrl = getShareUrl(b.id);
    const totalCotas = Number((b as any).totalCotas) || 4;

    const texto =
      `EL MEXICANO\n` +
      `Dossiê de Ativo Náutico — ${b.modelo || b.nome}\n\n` +
      `ESPECIFICAÇÕES TÉCNICAS\n` +
      `• Modelo: ${b.fabricante || 'Premium'} · ${b.modelo || 'Série Especial'}\n` +
      `• Propulsão: ${b.potencia || 'Motorização Homologada'}\n` +
      `• Capacidade: ${b.capacidadePassageiros || 10} passageiros\n` +
      `• Alocação: ${b.vaga || 'Marina Náutica Privativa'}\n\n` +
      `ESTRUTURA SOCIETÁRIA & VALUATION\n` +
      `• Sistema: Cotas inteligentes (${totalCotas} frações totais)\n` +
      `• Disponibilidade atual: ${vagasLivres} ${vagasLivres === 1 ? 'fração disponível' : 'frações disponíveis'}\n` +
      `• Valor de aquisição da fração: R$ ${valorCota.toLocaleString('pt-BR')}\n` +
      `• Taxa de gestão e marinharia: R$ ${taxaAdmMensal.toLocaleString('pt-BR')}/mês\n\n` +
      `Ficha técnica e galeria completa:\n` +
      `${boatUrl}\n\n` +
      `${vendedorNome}\nConsultoria Náutica · El Mexicano`;

    navigator.clipboard.writeText(texto);
    setCopiadoKit(b.id);
    setTimeout(() => setCopiadoKit(null), 2400);
  };

  const handleOpenQrModal = async (boat: Embarcacao) => {
    setSelectedBoatForQr(boat);
    setQrGenerating(true);
    try {
      const url = getShareUrl(boat.id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 520,
        margin: 1,
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

  const handlePrintMarinaPlacard = () => {
    if (!selectedBoatForQr || !qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Dossiê Píer — ${selectedBoatForQr.modelo || selectedBoatForQr.nome} | El Mexicano</title>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif;
            text-align: center;
            color: #111113;
            padding: 20px;
            margin: 0;
            background: #FFFFFF;
          }
          .sheet {
            border: 1px solid #D4D4D8;
            padding: 56px 48px;
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .tricolor {
            display: flex;
            width: 54px;
            height: 2px;
            margin-bottom: 24px;
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
            margin-bottom: 8px;
          }
          .boat-name {
            font-size: 36px;
            font-weight: 600;
            letter-spacing: -0.035em;
            color: #111113;
            margin: 0 0 6px;
          }
          .boat-spec {
            font-size: 14px;
            color: #52525B;
            margin-bottom: 32px;
          }
          .qr-img {
            width: 240px;
            height: 240px;
            margin: 0 auto 28px;
            border: 1px solid #E4E4E7;
            padding: 16px;
            background: #FAFAFA;
          }
          .instructions {
            font-size: 13px;
            color: #3F3F46;
            max-width: 380px;
            line-height: 1.55;
            margin-bottom: 36px;
          }
          .footer {
            width: 100%;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #71717A;
            border-top: 1px solid #E4E4E7;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="tricolor"><span></span><span></span><span></span></div>
          <div class="eyebrow">El Mexicano</div>
          <div class="boat-name">${selectedBoatForQr.modelo || selectedBoatForQr.nome}</div>
          <div class="boat-spec">${selectedBoatForQr.fabricante || 'Estaleiro Premium'} · Ano ${selectedBoatForQr.ano || ''}</div>
          <img src="${qrDataUrl}" class="qr-img" />
          <div class="instructions">
            Aponte a câmera do smartphone para acessar o dossiê completo do ativo, disponibilidade societária e agendamento de visita privada.
          </div>
          <div class="footer">
            Consultor: ${vendedorNome} · Governança Vale Administradora
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

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !selectedBoatForQr) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${(selectedBoatForQr.modelo || selectedBoatForQr.nome).toLowerCase().replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <TricolorBar className="w-full h-[2.5px]" />
        {/* ── Cabeçalho Minimalista ─────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-5 border-b border-neutral-200/80 bg-[#FBFBFD] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={logoMexicano} alt="El Mexicano" className="h-8 w-auto object-contain" />
            <span className="h-4 w-px bg-neutral-300 hidden sm:block" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 block">
                Studio de Captação & Distribuição
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#111113] tracking-tight">
                Catálogo Private Fleet
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-[#111113] hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Xmark className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Barra de Controle UTM & Busca ─────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-3.5 bg-[#F5F5F7] border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-56">
              <Search
                className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.6}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar ativo..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs text-[#111113] outline-none focus:border-[#111113]"
              />
            </div>

            <select
              value={selectedUtm}
              onChange={(e) => setSelectedUtm(e.target.value)}
              className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 font-medium text-[#111113] outline-none cursor-pointer"
            >
              {UTM_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Canal: {opt.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroApenasDisponiveis}
                onChange={(e) => setFiltroApenasDisponiveis(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#111113] border-neutral-300 focus:ring-[#111113]"
              />
              <span className="font-medium text-neutral-600">Apenas com frações livres</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyVendedorLink()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#111113] hover:bg-[#2B1120] text-white rounded-full font-medium transition-colors cursor-pointer"
            >
              {copiadoId === 'geral' ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>Link Geral Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Copiar Link da Coleção</span>
                </>
              )}
            </button>

            <a
              href={getShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full border border-neutral-300 bg-white hover:border-[#111113] text-[#111113] transition-colors"
              title="Abrir Catálogo Público"
            >
              <OpenNewWindow className="w-4 h-4" strokeWidth={1.6} />
            </a>
          </div>
        </div>

        {/* ── Lista de Ativos ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              {catalogBoats.length} {catalogBoats.length === 1 ? 'ativo listado' : 'ativos listados'}
            </span>
            <span>
              Consultor: <strong className="text-[#111113] font-medium">{vendedorNome}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogBoats.map(({ boat, estoque, valorCota, taxaAdmMensal, totalDisponiveis }) => (
              <div
                key={boat.id}
                className="bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-400 p-5 flex flex-col justify-between space-y-5 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400 block">
                        {boat.fabricante || 'Estaleiro'} · {boat.ano || 2025}
                      </span>
                      <h3 className="text-lg font-semibold text-[#111113] tracking-tight">{boat.modelo || boat.nome}</h3>
                      <p className="text-xs text-neutral-500">{boat.fabricante || 'Estaleiro Premium'}</p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#111113] text-[11px] font-medium tabular-nums shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          totalDisponiveis > 0 ? 'bg-[#111113]' : 'bg-neutral-300'
                        }`}
                      />
                      {totalDisponiveis > 0 ? `${totalDisponiveis}/${estoque.totalCotas} livres` : 'Alocada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 border-y border-neutral-100 py-3 text-xs tabular-nums">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                        Fração
                      </span>
                      <span className="font-semibold text-[#111113]">R$ {valorCota.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="border-l border-neutral-100 pl-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                        Taxa Mensal
                      </span>
                      <span className="font-medium text-neutral-700">R$ {taxaAdmMensal.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="border-l border-neutral-100 pl-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                        Estoque / Rep.
                      </span>
                      <span className="font-medium text-neutral-700">
                        {estoque.cotasDisponiveis} / {estoque.cotasRepasse}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(boat)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                      <span>Placa QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyKitMidia(boat, totalDisponiveis, valorCota, taxaAdmMensal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {copiadoKit === boat.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                          <span>Dossiê Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                          <span>Dossiê WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyVendedorLink(boat.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#111113] hover:bg-[#2B1120] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ShareIos className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>{copiadoId === boat.id ? 'Link Copiado' : 'Copiar Link'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MODAL QR CODE DA EMBARCAÇÃO ──────────────────────────────────── */}
        {selectedBoatForQr && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setSelectedBoatForQr(null)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-black/[0.08] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div className="text-left">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                    QR Code Píer
                  </span>
                  <h3 className="text-base font-semibold text-[#111113]">{selectedBoatForQr.modelo || selectedBoatForQr.nome}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBoatForQr(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-[#111113] cursor-pointer"
                >
                  <Xmark className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.04] inline-block mx-auto">
                {qrGenerating || !qrDataUrl ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#111113] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${selectedBoatForQr.modelo || selectedBoatForQr.nome}`}
                    className="w-48 h-48 mx-auto rounded-lg bg-white p-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 border border-neutral-200 hover:border-neutral-400 text-[#111113] rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Baixar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintMarinaPlacard}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3 bg-[#111113] hover:bg-[#2B1120] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.6} />
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
