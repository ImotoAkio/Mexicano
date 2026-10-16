import React, { useState, memo } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Edit2, 
  Paperclip, 
  Ship, 
  CheckCircle2, 
  Clock, 
  FileX2, 
  Anchor
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import { formatBoatName } from '../../utils/constants';

interface ComercialClient3DFolderProps {
  client: Cliente;
  boat: Embarcacao | null;
  onOpenViewer: (client: Cliente, type?: 'aquisicao' | 'adm') => void;
  onOpenDetails: (client: Cliente) => void;
  onDownloadPdf: (client: Cliente, e: React.MouseEvent, type?: 'aquisicao' | 'adm') => void;
  onEditContract: (clientId: string) => void;
  onStatusChange?: (clientId: string, newStatus: StatusContrato) => void;
}

interface ContractDocSheet {
  id: string;
  title: string;
  type: 'aquisicao' | 'adm' | 'anexo';
  badge: string;
  badgeHeaderClass: string;
}

const ComercialClient3DFolder = memo(function ComercialClient3DFolder({
  client,
  boat,
  onOpenViewer,
  onOpenDetails,
  onDownloadPdf,
  onEditContract,
}: ComercialClient3DFolderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const status = client.statusContrato || 'sem_contrato';
  const cotaVal = client.embarcacoes?.[0]?.cota || client.cota || 'Cota 25%';
  const boatName = boat ? formatBoatName(boat.nome) : 'Embarcação não vinculada';
  const hasAnexo = Boolean(client.contratoArquivoUrl);

  // Documentos deste cliente (Minutas A4 que se abrem em leque 3D ao passar o mouse)
  const docs: ContractDocSheet[] = [
    {
      id: `${client.id}-aquisicao`,
      title: "Aquisição de Cota",
      type: 'aquisicao',
      badge: "Cota Náutica",
      badgeHeaderClass: "bg-amber-800 text-white"
    },
    {
      id: `${client.id}-adm`,
      title: "Gestão Náutica",
      type: 'adm',
      badge: "Marina",
      badgeHeaderClass: "bg-stone-800 text-white"
    }
  ];

  if (hasAnexo) {
    docs.push({
      id: `${client.id}-anexo`,
      title: "Via Digitalizada",
      type: 'anexo',
      badge: "Assinada",
      badgeHeaderClass: "bg-emerald-800 text-white"
    });
  }

  // Configurações de Status no rigoroso padrão Mexicano Dashboard
  const statusConfig = {
    assinado: {
      label: "Assinado",
      badgeClass: "bg-mx-green-50 text-mx-green border-mx-green/30",
      accentBar: "bg-mx-green",
      icon: CheckCircle2
    },
    pendente: {
      label: "Pendente",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      accentBar: "bg-amber-500",
      icon: Clock
    },
    sem_contrato: {
      label: "Sem Contrato",
      badgeClass: "bg-stone-100 text-stone-600 border-stone-200",
      accentBar: "bg-stone-300",
      icon: FileX2
    }
  };

  const currentTheme = statusConfig[status] || statusConfig.sem_contrato;
  const StatusIcon = currentTheme.icon;

  return (
    <div
      className="relative flex flex-col cursor-pointer group select-none pt-8 pb-1 w-full"
      style={{
        perspective: "1000px",
        contain: "layout style",
        transform: "translate3d(0, 0, 0)"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenDetails(client)}
    >
      {/* ─── 1. Orelha Superior / Tab de Pasta de Arquivo (Folder Back) ─── */}
      <div
        className="absolute top-2 left-5 h-7 px-3 rounded-t-xl border-t border-x border-stone-300/80 bg-stone-200/90 text-stone-700 flex items-center gap-1.5 shadow-2xs z-10 transition-transform duration-300"
        style={{
          transformOrigin: "bottom center",
          transform: isHovered ? "rotateX(-18deg) translateY(-2px)" : "rotateX(0deg) translateY(0)",
          transition: "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <Anchor className="w-3 h-3 text-stone-500" />
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-700">
          DOSSIÊ • {client.nome ? client.nome.split(' ')[0] : 'CLIENTE'}
        </span>
      </div>

      {/* ─── 2. Placa Traseira do Diretório ─── */}
      <div
        className="absolute inset-x-0 bottom-1 top-8 rounded-2xl bg-stone-100 border border-stone-300/80 shadow-2xs z-10 pointer-events-none transition-transform duration-300"
        style={{
          transformOrigin: "bottom center",
          transform: isHovered ? "rotateX(-12deg) translateY(-1px)" : "rotateX(0deg) translateY(0)",
          transition: "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />

      {/* ─── 3. Documentos em Leque 3D (Minutas A4 que sobem ao passar o mouse) ─── */}
      <div 
        className="absolute w-full flex justify-center pointer-events-none"
        style={{ 
          top: "14px", 
          zIndex: 15,
          left: 0,
          right: 0
        }}
      >
        {docs.map((doc, index) => {
          const middleIndex = (docs.length - 1) / 2;
          const factor = docs.length > 1 ? (index - middleIndex) / middleIndex : 0;
          
          // Ângulos e deslocamentos suaves para a fanação das minutas
          const rotation = factor * 12;
          const translationX = factor * (docs.length === 3 ? 56 : 42);
          const translationY = Math.abs(factor) * 8;

          return (
            <div
              key={doc.id}
              className="absolute w-34 h-48 sm:w-36 sm:h-50 cursor-pointer group/card"
              style={{
                transform: isHovered
                  ? `translateY(calc(-108px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
                  : "translateY(0px) translateX(0px) rotate(0deg) scale(0.4)",
                opacity: isHovered ? 1 : 0,
                transition: `transform 400ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 35}ms, opacity 250ms ease`,
                zIndex: 10 + index,
                pointerEvents: isHovered ? 'auto' : 'none',
                backfaceVisibility: "hidden"
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenViewer(client, doc.type === 'adm' ? 'adm' : 'aquisicao');
              }}
            >
              {/* Folha de Minuta Jurídica A4 Oficial Mexicano */}
              <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-stone-300 bg-[#fefdfb] flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:border-stone-900 hover:ring-2 hover:ring-stone-900/10">
                {/* Faixa Superior da Minuta */}
                <div className={`px-2 py-1 flex items-center justify-between text-white ${doc.badgeHeaderClass}`}>
                  <span className="text-[7.5px] font-black uppercase tracking-wider truncate">
                    {doc.badge}
                  </span>
                  <Anchor className="w-2.5 h-2.5 opacity-80" />
                </div>

                {/* Corpo do Contrato com Linhas Simuladas */}
                <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                    <span className="text-[8px] font-bold text-stone-800 uppercase tracking-tight truncate max-w-[90px]">
                      {doc.title}
                    </span>
                    <FileText className="w-2.5 h-2.5 text-stone-400" />
                  </div>

                  <div className="space-y-1.5 opacity-60">
                    <div className="h-0.5 bg-stone-300 rounded w-full" />
                    <div className="h-0.5 bg-stone-300 rounded w-5/6" />
                    <div className="h-0.5 bg-stone-300 rounded w-11/12" />
                    <div className="h-0.5 bg-stone-300 rounded w-3/4" />
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[6px] font-mono text-stone-400 font-semibold">
                      MEX-OFICIAL
                    </span>
                    <span className="text-[6.5px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                      {cotaVal}
                    </span>
                  </div>
                </div>

                {/* Rodapé da Minuta com CTA */}
                <div className="px-2 py-1 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between text-[7px] font-semibold text-stone-700">
                  <span className="truncate max-w-[65px]">{doc.title}</span>
                  <span className="font-bold text-mx-ink">VER →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 4. Face Frontal do Diretório (O Bloco Mexicano em Formato de Pasta) ─── */}
      <div
        className="relative bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] group-hover:shadow-md group-hover:border-stone-300 transition-all duration-300 p-4.5 flex flex-col justify-between min-h-[196px] z-20"
        style={{
          transformOrigin: "bottom center",
          transform: isHovered ? "rotateX(18deg) translateY(8px)" : "rotateX(0deg) translateY(0)",
          transition: "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div>
          {/* Linha Superior: Filete de Status + Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentTheme.accentBar}`} />
              <span className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-wider">
                ID: {client.id.slice(0, 6)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${currentTheme.badgeClass}`}>
                <StatusIcon className="w-2.5 h-2.5" />
                <span>{currentTheme.label}</span>
              </span>

              {hasAnexo && (
                <span 
                  className="p-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300/80" 
                  title="Possui contrato físico assinado anexado"
                >
                  <Paperclip className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Dados do Cotista */}
          <div className="flex items-start gap-3 mt-3">
            <div className="w-9 h-9 rounded-xl bg-mx-ink-100 text-mx-ink font-bold text-xs flex items-center justify-center shrink-0 border border-mx-ink/10">
              {client.nome ? client.nome.slice(0, 2).toUpperCase() : 'CL'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-[13px] text-stone-900 group-hover:text-mx-ink transition-colors truncate" title={client.nome}>
                {client.nome}
              </h4>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5 truncate">
                {client.cpf ? `CPF: ${client.cpf}` : (client.email || 'Sem documento')}
              </p>
            </div>
          </div>

          {/* Dados da Embarcação & Cota */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-stone-50 border border-stone-100/90 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Ship className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-semibold text-stone-800 text-[11px] truncate max-w-[130px]">
                {boatName}
              </span>
            </div>
            <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-[10px] shrink-0">
              {cotaVal}
            </span>
          </div>
        </div>

        {/* Rodapé do Bloco / Ações Rápidas */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>{docs.length} {docs.length === 1 ? 'minuta' : 'minutas'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenViewer(client, 'aquisicao')}
              className="h-7 px-2.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Visualizar Contrato Oficial"
            >
              <Eye className="w-3 h-3" />
              <span>Ver</span>
            </button>

            <button
              onClick={(e) => onDownloadPdf(client, e)}
              className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Baixar PDF Oficial"
            >
              <Download className="w-3 h-3" />
            </button>

            <button
              onClick={() => onEditContract(client.id)}
              className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Editar dados do contrato"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ComercialClient3DFolder;
