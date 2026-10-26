import React, { useState } from 'react';
import { 
  X, Compass, MapPin, Clock, Users, User, Phone, 
  Printer, Download, CheckCircle2, AlertCircle,
  Ship, Calendar, Droplets, Check, MessageCircle
} from 'lucide-react';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { getBoatCode } from '../utils/boatUtils';
import logoMarinaSrc from '../../logos/logo_marina.svg';

interface PlanoNavegacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  boat?: any;
  client?: any;
  bannerText?: string;
  logoUrl?: string;
}

export default function PlanoNavegacaoModal({
  isOpen,
  onClose,
  reservation,
  boat,
  client,
  bannerText,
  logoUrl
}: PlanoNavegacaoModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !reservation) return null;

  // Determine boat info
  const boatName = boat?.nome || reservation.modeloAvulso || reservation.barcoNome || reservation.embarcacaoNome || 'Embarcação';
  const boatCode = boat ? getBoatCode(boat) : (reservation.modeloAvulso || reservation.barcoNome || reservation.embarcacaoNome || 'Embarcação');
  const boatType = (boat?.tipo === 'jet' || reservation.tipoAvulso === 'jet' || reservation.embarcacaoTipo === 'jet') ? 'Jetski' : 'Lancha';
  const boatVaga = boat?.vaga || reservation.embarcacaoVaga;
  const maxCap = boat?.capacidadePassageiros || (boatType === 'Jetski' ? 3 : null);

  // Determine client info
  const clientName = client?.nome || reservation.nomeAvulso || reservation.clienteNome || 'Cliente';
  const clientPhone = client?.telefone || reservation.telefoneAvulso || reservation.clienteTelefone;

  // Confirmation status
  const isConfirmed = reservation.status === 'confirmado' || reservation.statusMarina === 'confirmada' || !!reservation.destino;

  // Date formatting
  let formattedDate = reservation.data || '';
  if (formattedDate.includes('-')) {
    const parts = formattedDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
  }

  // Parse accessories
  let acessorios: any = reservation.acessoriosSolicitados;
  if (typeof acessorios === 'string') {
    try {
      acessorios = JSON.parse(acessorios);
    } catch {
      acessorios = {};
    }
  }

  const accessList: string[] = [];
  if (acessorios) {
    if (acessorios.tenda) accessList.push('Tenda');
    if (acessorios.mesa) accessList.push('Mesa');
    if (acessorios.churrasqueira) accessList.push('Churrasqueira');
    if (acessorios.bancos && Number(acessorios.bancos) > 0) accessList.push(`${acessorios.bancos} Cadeiras`);
    if (acessorios.gelo) accessList.push('Gelo');
  }

  const handlePrintPDF = async (action: 'print' | 'download') => {
    setIsGeneratingPdf(true);
    try {
      const savedLogo = localStorage.getItem('avisos_saida_customLogo');
      const savedLogoOption = localStorage.getItem('avisos_saida_logoOption');
      let effectiveLogo: string | undefined = logoUrl;
      if (!effectiveLogo) {
        if (savedLogoOption === 'empty') {
          effectiveLogo = 'empty';
        } else if (savedLogoOption === 'custom' && savedLogo) {
          effectiveLogo = savedLogo;
        } else {
          effectiveLogo = logoMarinaSrc;
        }
      }

      const effectiveBanner = bannerText || localStorage.getItem('avisos_saida_bannerText') || 'MARINA CLUB VELHO CHICO';

      await generateAvisoSaidaPDF({
        data: formattedDate || ' ',
        nome: clientName || ' ',
        tipo: boatType,
        nomeEmbarcacao: boatCode || ' ',
        pessoasABordo: String(reservation.pessoasABordo || '02'),
        destino: reservation.destino || 'Não informado',
        previsaoSaida: reservation.previsaoSaida || (reservation.periodo === 'tarde' ? '13:00' : '09:00'),
        previsaoChegada: reservation.previsaoChegada || (reservation.periodo === 'manha' ? '13:00' : '17:00'),
        observacao: reservation.observações || 'Nenhuma'
      }, {
        autoPrint: action === 'print',
        download: action === 'download',
        logoUrl: effectiveLogo,
        bannerText: effectiveBanner
      });
    } catch (err) {
      console.error('Erro ao gerar PDF do Plano de Navegação:', err);
      alert('Erro ao gerar documento do Plano de Navegação.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean & Quiet */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#B69D74]" />
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Plano de Navegação
              </h2>
              <p className="text-[11px] text-slate-400">
                NORMAM-211 / DPC • ANEXO 4-A
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span>{isConfirmed ? 'Confirmado' : 'Aguardando'}</span>
            </span>

            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body - Clean Document Flow, No Nested Boxes */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 px-4 bg-slate-50/80 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Saída Prevista
              </span>
              <span className="font-mono text-sm font-bold text-slate-900">
                {reservation.previsaoSaida || '09:00'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Retorno Previsto
              </span>
              <span className="font-mono text-sm font-bold text-slate-900">
                {reservation.previsaoChegada || '17:00'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                A Bordo
              </span>
              <span className="text-sm font-bold text-slate-900">
                {reservation.pessoasABordo || '2'} <span className="text-xs font-normal text-slate-500">pess.</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Data
              </span>
              <span className="text-xs font-medium text-slate-800">
                {formattedDate || 'Hoje'}
              </span>
            </div>
          </div>

          {/* Destino Principal */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Destino Pretendido
            </span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{reservation.destino || 'Não informado previamente pelo cliente'}</span>
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Embarcação e Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Embarcação */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Embarcação
              </span>
              <p className="text-sm font-bold text-slate-900">
                {boatName}
              </p>
              <p className="text-xs text-slate-500">
                {boatCode !== boatName ? `${boatCode} • ` : ''}
                {boatType}
                {boatVaga ? ` • Vaga ${boatVaga}` : ''}
                {maxCap ? ` • Capacidade: ${maxCap}` : ''}
              </p>
            </div>

            {/* Cliente */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Comandante / Cliente
              </span>
              <p className="text-sm font-bold text-slate-900">
                {clientName}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{clientPhone || 'Telefone não informado'}</span>
                {clientPhone && (
                  <a 
                    href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-[#B69D74] hover:underline font-medium"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Combustível e Acessórios (se houver) */}
          <div className={`grid grid-cols-1 ${accessList.length > 0 ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Combustível
              </span>
              <p className="text-xs font-medium text-slate-800">
                {reservation.combustivelInicial === 'tanque_cheio'
                  ? 'Completar Tanque Cheio'
                  : reservation.litrosAbastecerPrevio
                  ? `Abastecer ${reservation.litrosAbastecerPrevio} Litros`
                  : 'Nível Atual'}
              </p>
            </div>

            {accessList.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Acessórios Solicitados
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {accessList.map((item, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          {reservation.observações && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Observações
              </span>
              <p className="text-xs text-slate-600 whitespace-pre-wrap">
                {reservation.observações}
              </p>
            </div>
          )}

          {/* Registro Operacional do Píer (se houver) */}
          {(reservation.horaDescida || reservation.horaSaida || reservation.horaChegada || reservation.horaSubida) && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Registros do Píer
              </span>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 flex-wrap">
                {reservation.horaDescida && <span>Descida: <b>{reservation.horaDescida}</b></span>}
                {reservation.horaSaida && <span>• Saída: <b>{reservation.horaSaida}</b></span>}
                {reservation.horaChegada && <span>• Chegada: <b>{reservation.horaChegada}</b></span>}
                {reservation.horaSubida && <span>• Subida: <b>{reservation.horaSubida}</b></span>}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions - Clean & Executive */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400">
            Marinha do Brasil • Formulário Oficial
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintPDF('download')}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Baixar</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintPDF('print')}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir NORMAM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
