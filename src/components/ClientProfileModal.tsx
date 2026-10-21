import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  User,
  Folder,
  Calendar,
  Printer,
  Download,
  MapPin,
  CreditCard,
  FileText,
  Anchor,
  Award,
  Phone,
  Mail,
  ShieldCheck,
  Ship,
  Package,
  MessageSquare,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import InternalDrive from './finance/InternalDrive';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBoatCode } from '../utils/boatUtils';
import { formatBoatName } from '../utils/constants';

import defaultJetImg from '../assets/images/jet.webp';
import defaultLanchaImg from '../assets/images/lancha.webp';
import ComercialContratoViewerModal from './comercial/ComercialContratoViewerModal';

interface ClientProfileModalProps {
  client: Cliente;
  boats: Embarcacao[];
  onClose: () => void;
  initialTab?: 'dados' | 'veiculos' | 'documentos';
}

export default function ClientProfileModal({
  client,
  boats,
  onClose,
  initialTab = 'dados'
}: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'veiculos' | 'documentos'>(initialTab);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !contractViewerOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, contractViewerOpen]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    try {
      const cleanStr = birthDateStr.includes('T') ? birthDateStr : birthDateStr + 'T00:00:00';
      const birth = new Date(cleanStr);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  };

  const getHabilitacaoStatus = (validadeStr?: string) => {
    if (!validadeStr) {
      return {
        status: 'desconhecido',
        label: 'Não informada',
        badgeColor: 'bg-stone-100 text-stone-600 border-stone-200'
      };
    }
    try {
      const cleanStr = validadeStr.includes('T') ? validadeStr : validadeStr + 'T00:00:00';
      const validade = new Date(cleanStr);
      if (isNaN(validade.getTime())) {
        return {
          status: 'desconhecido',
          label: validadeStr,
          badgeColor: 'bg-stone-100 text-stone-600 border-stone-200'
        };
      }
      const today = new Date();
      const diffTime = validade.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          status: 'vencida',
          label: `Vencida (${Math.abs(diffDays)}d atrás)`,
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      }
      if (diffDays <= 60) {
        return {
          status: 'a_vencer',
          label: `Vence em ${diffDays} dias`,
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      }
      return {
        status: 'valida',
        label: 'Válida',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    } catch {
      return {
        status: 'desconhecido',
        label: validadeStr,
        badgeColor: 'bg-stone-100 text-stone-600 border-stone-200'
      };
    }
  };

  const formatWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return null;
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${withCountry}`;
  };

  const linkedBoats = useMemo(() => {
    const list: Array<{
      embarcacaoId: string;
      cota: string;
      acessorios?: any;
      boat?: Embarcacao;
    }> = [];

    if (client.embarcacoes && client.embarcacoes.length > 0) {
      client.embarcacoes.forEach(eb => {
        const boat = boats.find(b => b.id === eb.embarcacaoId);
        list.push({
          embarcacaoId: eb.embarcacaoId,
          cota: eb.cota || client.cota || 'N/A',
          acessorios: eb.acessorios,
          boat
        });
      });
    } else if (client.embarcacaoId) {
      const boat = boats.find(b => b.id === client.embarcacaoId);
      list.push({
        embarcacaoId: client.embarcacaoId,
        cota: client.cota || 'N/A',
        acessorios: client.acessorios,
        boat
      });
    }

    boats.forEach(b => {
      if (Array.isArray(b.donos) && b.donos.includes(client.id)) {
        const alreadyExists = list.some(item => item.embarcacaoId === b.id);
        if (!alreadyExists) {
          list.push({
            embarcacaoId: b.id,
            cota: client.cota || 'Cota',
            boat: b
          });
        }
      }
    });

    return list;
  }, [client, boats]);

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    // Header Banner — Paleta Mexicana Ink #2B1120
    doc.setFillColor(43, 17, 32);
    doc.rect(14, y, 182, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('EL MEXICANO / VILA NÁUTICA', 20, y + 9);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('DOSSIÊ CADASTRAL DO COTISTA / FICHA TÉCNICA OPERACIONAL', 20, y + 16);

    const nowStr = new Date().toLocaleString('pt-BR');
    doc.setFontSize(7.5);
    doc.text(`Emissão: ${nowStr}`, pageWidth - 20, y + 16, { align: 'right' });

    y += 26;

    // Client Summary Block
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 17, 2, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text((client.nome || 'CLIENTE').toUpperCase(), 18, y + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const statusFin = client.statusFinanceiro === 'inadimplente' ? 'INADIMPLENTE' : client.statusFinanceiro === 'pendente' ? 'PENDENTE' : 'EM DIA';
    const statusCad = (client.status || 'ativo').toUpperCase();
    const planoStr = (client.plano || 'normal').toUpperCase();
    const empresasStr = client.empresas && client.empresas.length > 0 ? client.empresas.join(', ') : 'VALE NÁUTICA';
    doc.text(
      `Situação: ${statusFin}  |  Cadastro: ${statusCad}  |  Plano: ${planoStr}  |  Empresa: ${empresasStr}  |  Veículos: ${linkedBoats.length}`,
      18,
      y + 13
    );

    y += 22;

    const renderSectionHeader = (title: string) => {
      doc.setFillColor(245, 245, 244); // Stone-100
      doc.rect(14, y, 182, 7, 'F');
      doc.setFillColor(43, 17, 32); // Mexicano Ink
      doc.rect(14, y, 3, 7, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(43, 17, 32);
      doc.text(title.toUpperCase(), 20, y + 5);
      y += 9;
    };

    // 1. Informações Pessoais
    renderSectionHeader('1. Informações Pessoais & Contatos');

    const age = calculateAge(client.dataNascimento);
    const birthFormatted = client.dataNascimento ? `${formatDate(client.dataNascimento)}${age !== null ? ` (${age} anos)` : ''}` : 'Não informada';

    const personalData = [
      [
        { content: 'Nome Completo:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.nome || 'Não informado' },
        { content: 'CPF:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.cpf || 'Não informado' }
      ],
      [
        { content: 'RG / Órgão:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${client.rg || 'Não informado'} ${client.orgaoEmissor ? `(${client.orgaoEmissor})` : ''}` },
        { content: 'Data de Nascimento:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: birthFormatted }
      ],
      [
        { content: 'Telefone / WhatsApp:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.telefone || 'Não informado' },
        { content: 'E-mail:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.email || 'Não informado' }
      ],
      [
        { content: 'Estado Civil:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.estadoCivil || 'Não informado' },
        { content: 'Profissão:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.profissao || 'Não informada' }
      ],
      [
        { content: 'Data Cadastro:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatDate(client.dataCadastro) },
        { content: 'ID do Cliente:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.id || '-' }
      ]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: personalData as any,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 2. Habilitação Náutica
    renderSectionHeader('2. Habilitação Náutica (CHA / CNH)');

    const habNum = client.numeroHabilitacao || client.cnh_cha || 'Não informada';
    const habStatus = getHabilitacaoStatus(client.validadeHabilitacao);

    const habData = [
      [
        { content: 'Nº Habilitação / CHA:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: habNum },
        { content: 'Categoria:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.categoriaHabilitacao || 'Não informada' }
      ],
      [
        { content: 'Validade:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${formatDate(client.validadeHabilitacao)} (${habStatus.label})` },
        { content: 'Órgão Emissor:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.orgaoEmissorHabilitacao || 'Capitania dos Portos' }
      ]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: habData as any,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 3. Endereço Completo
    renderSectionHeader('3. Endereço Completo');

    const addressData = [
      [
        { content: 'Logradouro / Rua:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${client.logradouro || 'Não informado'}${client.numeroEnd ? `, Nº ${client.numeroEnd}` : ''}` },
        { content: 'Complemento:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.complemento || 'Não informado' }
      ],
      [
        { content: 'Bairro:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.bairro || 'Não informado' },
        { content: 'CEP:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.cep || 'Não informado' }
      ],
      [
        { content: 'Cidade / UF:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${client.cidade || 'Não informada'}${client.estado ? ` - ${client.estado}` : ''}` },
        { content: '', styles: { fillColor: [248, 250, 252] } },
        { content: '' }
      ]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: addressData as any,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 4. Situação Financeira & Plano
    renderSectionHeader('4. Situação Financeira & Contrato');

    const finData = [
      [
        { content: 'Status Cadastro:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: statusCad === 'INATIVO' ? 'INATIVO' : 'ATIVO' },
        { content: 'Situação Financeira:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: statusFin }
      ],
      [
        { content: 'Plano:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: planoStr },
        { content: 'ID Asaas:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.asaasCustomerId || 'Não vinculado' }
      ]
    ];

    if (client.observacoesFinanceiras) {
      finData.push([
        { content: 'Obs. Financeiras:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.observacoesFinanceiras },
        { content: '', styles: { fillColor: [248, 250, 252] } },
        { content: '' }
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: finData as any,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 5. Embarcações & Cotas
    renderSectionHeader('5. Embarcações & Cotas Vinculadas');

    const boatRows = linkedBoats.map((item, idx) => {
      const b = item.boat;
      return [
        (idx + 1).toString(),
        getBoatCode(b),
        formatBoatName(b?.nome || 'Embarcação'),
        b?.tipo === 'jet' ? 'Jet Ski' : 'Lancha',
        b?.vaga || 'Sem vaga',
        item.cota || 'N/A',
        `${b?.fabricante || '-'} / ${b?.modelo || '-'} (${b?.ano || '-'})`,
        b?.horasMotor !== undefined ? `${b.horasMotor}h` : '--'
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['#', 'Cód.', 'Embarcação', 'Tipo', 'Vaga', 'Cota', 'Modelo / Fabricante', 'Horas']],
      body: boatRows,
      theme: 'striped',
      headStyles: { fillColor: [43, 17, 32], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 }
    });

    const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.text('El Mexicano / Gestão de Cotistas', 14, 289);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 289, { align: 'right' });
    }

    const safeName = (client.nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Ficha_Cotista_${safeName}.pdf`);
  };

  const age = calculateAge(client.dataNascimento);
  const numeroHab = client.numeroHabilitacao || client.cnh_cha;
  const habStatus = getHabilitacaoStatus(client.validadeHabilitacao);
  const waUrl = formatWhatsAppUrl(client.telefone);

  const PROFILE_TABS = [
    { id: 'dados', label: 'Ficha Cadastral', icon: User },
    { id: 'veiculos', label: 'Embarcações & Cotas', icon: Ship, count: linkedBoats.length },
    { id: 'documentos', label: 'Documentos & Arquivos', icon: Folder }
  ];

  const currentTabMeta = useMemo(() => {
    switch (activeTab) {
      case 'veiculos':
        return {
          title: 'Embarcações & Cotas Vinculadas',
          description: 'Detalhes técnicos, vagas na marina e cotas associadas ao cotista.'
        };
      case 'documentos':
        return {
          title: 'Documentos & Arquivos',
          description: 'Armazenamento de anexos, comprovantes e documentação digital do cliente.'
        };
      case 'dados':
      default:
        return {
          title: 'Ficha Cadastral Completa',
          description: 'Informações civis, identificação, canais de contato e parâmetros financeiros.'
        };
    }
  }, [activeTab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View El Mexicano) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-5xl h-[90vh] max-h-[720px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            {/* Cabeçalho do Cotista */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0 font-bold text-xs uppercase tracking-tight">
                  {client.nome ? client.nome.substring(0, 2).toUpperCase() : 'CO'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[14px] text-stone-900 tracking-tight truncate">
                    {client.nome || 'Cotista'}
                  </h3>
                  <span className="text-[10px] text-stone-400 font-mono block">
                    ID: {client.id}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Dossiê cadastral, vínculos de embarcações, contratos e arquivos de <span className="font-semibold text-stone-800">{client.nome || 'cliente'}</span>.
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {PROFILE_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-stone-600" />
                      <span>{tab.label}</span>
                    </div>
                    {typeof tab.count === 'number' && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-stone-100 text-stone-800'
                            : 'bg-stone-200/80 text-stone-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda: Status + Ações Rápidas */}
          <div className="pt-4 border-t border-stone-200/60 space-y-3 mt-4">
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Situação:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                    client.status === 'inativo'
                      ? 'bg-stone-200 text-stone-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      client.status === 'inativo' ? 'bg-stone-400' : 'bg-emerald-600'
                    }`}
                  />
                  {client.status === 'inativo' ? 'Inativo' : 'Ativo'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-500 font-medium">Financeiro:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    client.statusFinanceiro === 'inadimplente'
                      ? 'bg-rose-100 text-rose-800'
                      : client.statusFinanceiro === 'pendente'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {client.statusFinanceiro === 'inadimplente'
                    ? 'Inadimplente'
                    : client.statusFinanceiro === 'pendente'
                    ? 'Pendente'
                    : 'Em Dia'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5">
                <span className="font-medium text-stone-600">
                  Plano {client.plano === 'completo' ? 'Completo' : 'Normal'}
                </span>
                {client.empresas && client.empresas.length > 0 && (
                  <span className="font-semibold text-stone-700">
                    {client.empresas.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas no Rodapé Lateral */}
            <div className="pt-2 flex flex-col gap-1.5">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  title="Conversar no WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  <span>WhatsApp</span>
                </a>
              )}
              {client.telefone && (
                <a
                  href={`tel:${client.telefone}`}
                  className="w-full h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  title="Ligar para o Cotista"
                >
                  <Phone className="w-3.5 h-3.5 text-stone-600" />
                  <span className="truncate">Ligar {client.telefone}</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Exportar Dossiê em PDF"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>Imprimir Ficha</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
          {/* Cabeçalho da Seção Ativa + Botão Fechar */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
            <div>
              <h2 className="font-bold text-base text-stone-900 tracking-tight">
                {currentTabMeta.title}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {currentTabMeta.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="h-8 px-3 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Exportar Dossiê em PDF"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Corpo com Scroll */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 custom-scrollbar">
            {/* ═════════ ABA 1: FICHA CADASTRAL ═════════ */}
            {activeTab === 'dados' && (
              <div className="space-y-4">
                {/* BLOCO 1: DADOS PESSOAIS */}
                <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-stone-600" />
                      Dados Pessoais & Identificação Civil
                    </h4>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Cadastrado em {formatDate(client.dataCadastro)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Nome Completo
                      </span>
                      <span className="font-bold text-stone-900 text-sm">
                        {client.nome || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                          CPF
                        </span>
                        {client.cpf && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.cpf!, 'cpf')}
                            className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 cursor-pointer"
                            title="Copiar CPF"
                          >
                            {copiedField === 'cpf' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className="font-bold font-mono text-stone-800 text-xs">
                        {client.cpf || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        RG / Órgão Emissor
                      </span>
                      <span className="font-bold font-mono text-stone-800 text-xs">
                        {client.rg
                          ? `${client.rg} ${client.orgaoEmissor ? `(${client.orgaoEmissor})` : ''}`
                          : 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Data de Nascimento
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {formatDate(client.dataNascimento)}
                        {age !== null && (
                          <span className="text-stone-500 font-medium ml-1">({age} anos)</span>
                        )}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Estado Civil
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {client.estadoCivil || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Profissão
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {client.profissao || 'Não informada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: CONTATO & CANAIS */}
                <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-4 h-4 text-stone-600" />
                      Canais de Contato & Comunicação
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100/90 flex items-center justify-between">
                      <div>
                        <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                          Telefone / Celular
                        </span>
                        <span className="font-bold font-mono text-stone-900 text-sm">
                          {client.telefone || 'Não informado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {client.telefone && (
                          <a
                            href={`tel:${client.telefone}`}
                            className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors"
                            title="Ligar"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100/90 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                          E-mail Principal
                        </span>
                        <span className="font-bold text-stone-900 text-xs truncate block">
                          {client.email || 'Não informado'}
                        </span>
                      </div>

                      {client.email && (
                        <a
                          href={`mailto:${client.email}`}
                          className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Enviar</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* BLOCO 3: HABILITAÇÃO NÁUTICA */}
                <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-stone-600" />
                      Habilitação Náutica (CHA - Carteira de Habilitação de Amador)
                    </h4>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${habStatus.badgeColor}`}
                    >
                      {habStatus.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Nº CHA / Registro
                      </span>
                      <span className="font-bold font-mono text-stone-900 text-xs">
                        {numeroHab || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Categoria de Amador
                      </span>
                      <span className="font-bold text-stone-900 text-xs">
                        {client.categoriaHabilitacao || 'Não informada'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Data de Validade
                      </span>
                      <span className="font-bold font-mono text-stone-900 text-xs">
                        {formatDate(client.validadeHabilitacao)}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Capitania / Órgão Emissor
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {client.orgaoEmissorHabilitacao || 'Capitania dos Portos'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 4: ENDEREÇO */}
                <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-stone-600" />
                      Endereço Residencial & Correspondência
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Logradouro / Rua e Nº
                      </span>
                      <span className="font-bold text-stone-900 text-xs">
                        {client.logradouro
                          ? `${client.logradouro}${client.numeroEnd ? `, Nº ${client.numeroEnd}` : ''}`
                          : 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Complemento
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {client.complemento || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Bairro
                      </span>
                      <span className="font-bold text-stone-800 text-xs">
                        {client.bairro || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        CEP
                      </span>
                      <span className="font-bold font-mono text-stone-800 text-xs">
                        {client.cep || 'Não informado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                        Cidade / UF
                      </span>
                      <span className="font-bold text-stone-900 text-xs">
                        {client.cidade
                          ? `${client.cidade}${client.estado ? ` - ${client.estado}` : ''}`
                          : 'Não informada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 5: SITUAÇÃO FINANCEIRA & CONTRATOS */}
                <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-stone-600" />
                      Situação Financeira & Contrato
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        Status Financeiro
                      </span>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          client.statusFinanceiro === 'inadimplente'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : client.statusFinanceiro === 'pendente'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {client.statusFinanceiro === 'inadimplente'
                          ? 'Inadimplente'
                          : client.statusFinanceiro === 'pendente'
                          ? 'Pendente'
                          : 'Em Dia'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        Plano Escolhido
                      </span>
                      <span className="font-bold text-stone-900 uppercase text-xs">
                        Plano {client.plano === 'completo' ? 'Completo' : 'Normal'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        ID Asaas (Cobranças)
                      </span>
                      <span className="font-bold font-mono text-stone-700 text-xs truncate block">
                        {client.asaasCustomerId || 'Não vinculado'}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                          Situação do Contrato
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              client.statusContrato === 'assinado'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : client.statusContrato === 'pendente'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {client.statusContrato === 'assinado'
                              ? 'Contrato Assinado'
                              : client.statusContrato === 'pendente'
                              ? 'Contrato Pendente'
                              : 'Não Possui Contrato'}
                          </span>
                          {client.contratoDataAssinatura && client.statusContrato === 'assinado' && (
                            <span className="text-[11px] text-emerald-800 font-semibold">
                              Assinado em {new Date(client.contratoDataAssinatura).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {client.contratoArquivoUrl && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-1.5 py-0.5 rounded">
                              Arquivo Anexo OK
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setContractViewerOpen(true)}
                        className="px-3.5 py-2 bg-mx-ink hover:bg-mx-ink-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Visualizar Contrato Oficial</span>
                      </button>
                    </div>

                    {client.observacoesFinanceiras && (
                      <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 sm:col-span-3">
                        <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Observações Financeiras Registradas
                        </span>
                        <p className="text-amber-950 font-medium text-xs whitespace-pre-wrap leading-relaxed">
                          {client.observacoesFinanceiras}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOCO 6: ACESSÓRIOS */}
                {client.acessorios && (
                  <div className="bg-white border border-stone-200/70 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-stone-600" />
                        Kit de Acessórios de Pátio do Cotista
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          client.acessorios.tenda
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-stone-50 border-stone-100 text-stone-400'
                        }`}
                      >
                        <span className="font-semibold">Tenda</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.acessorios.tenda
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {client.acessorios.tenda ? 'SIM' : 'NÃO'}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          client.acessorios.mesa
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-stone-50 border-stone-100 text-stone-400'
                        }`}
                      >
                        <span className="font-semibold">Mesa</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.acessorios.mesa
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {client.acessorios.mesa ? 'SIM' : 'NÃO'}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          client.acessorios.bancosCadeiras
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-stone-50 border-stone-100 text-stone-400'
                        }`}
                      >
                        <span className="font-semibold">Bancos/Cadeiras</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.acessorios.bancosCadeiras
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {client.acessorios.bancosCadeiras ? 'SIM' : 'NÃO'}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          client.acessorios.churrasqueira
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-stone-50 border-stone-100 text-stone-400'
                        }`}
                      >
                        <span className="font-semibold">Churrasqueira</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.acessorios.churrasqueira
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {client.acessorios.churrasqueira ? 'SIM' : 'NÃO'}
                        </span>
                      </div>

                      {client.acessorios.observacoes && (
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 sm:col-span-4 mt-1">
                          <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                            Observações de Acessórios
                          </span>
                          <p className="text-stone-700 font-medium text-xs whitespace-pre-wrap">
                            {client.acessorios.observacoes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═════════ ABA 2: EMBARCAÇÕES & COTAS ═════════ */}
            {activeTab === 'veiculos' && (
              <div className="space-y-4">
                {linkedBoats.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-12 text-center">
                    <Ship className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-stone-800">Nenhum veículo vinculado</h4>
                    <p className="text-xs text-stone-500 mt-1">
                      Este cliente ainda não possui nenhuma cota de embarcação associada.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {linkedBoats.map((item, idx) => {
                      const boat = item.boat;
                      const code = getBoatCode(boat);
                      const defaultImg = boat?.tipo === 'jet' ? defaultJetImg : defaultLanchaImg;
                      const isMaintenance =
                        boat?.emManutencao || boat?.statusOperacional === 'em_manutencao';

                      return (
                        <div
                          key={idx}
                          className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col hover:border-stone-300 transition-all group"
                        >
                          {/* Imagem de Topo com Badges */}
                          <div className="relative h-40 bg-stone-100 overflow-hidden">
                            <img
                              src={boat?.imagemUrl || defaultImg}
                              alt={boat?.nome || 'Embarcação'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30" />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                              <span className="px-2.5 py-1 bg-stone-950/90 backdrop-blur-md text-white font-bold text-xs rounded-xl border border-white/20 shadow-md">
                                {code}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {isMaintenance ? (
                                  <span className="px-2.5 py-1 bg-amber-500/90 text-white font-bold text-[10px] rounded-xl shadow-md">
                                    Manutenção
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-emerald-600/90 text-white font-bold text-[10px] rounded-xl shadow-md">
                                    Pronta
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Título e Vaga na base da imagem */}
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <h4 className="font-bold text-base leading-tight truncate drop-shadow-md">
                                {formatBoatName(boat?.nome)}
                              </h4>
                              <p className="text-[11px] text-white/80 font-medium truncate mt-0.5">
                                {boat?.fabricante} {boat?.modelo} {boat?.ano ? `(${boat.ano})` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Corpo com Informações Chave */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            {/* Destaque: Cota e Vaga */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-mx-ink-50 border border-mx-ink/20 p-2.5 rounded-xl">
                                <span className="text-[9px] font-bold text-mx-ink uppercase tracking-wider block">
                                  Cota do Cotista
                                </span>
                                <span className="font-bold text-mx-ink text-base font-mono block mt-0.5">
                                  {item.cota}
                                </span>
                              </div>

                              <div className="bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl flex items-center gap-2">
                                <Anchor className="w-4 h-4 text-stone-600 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                                    Vaga na Marina
                                  </span>
                                  <span className="font-bold text-stone-900 truncate block">
                                    {boat?.vaga || 'Não informada'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Dados Técnicos em Linha */}
                            <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-stone-100">
                              <div className="flex items-center justify-between">
                                <span className="text-stone-400">Tipo de Embarcação:</span>
                                <span className="font-bold text-stone-800">
                                  {boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-stone-400">Horímetro Atual:</span>
                                <span className="font-bold text-amber-700 font-mono">
                                  {boat?.horasMotor !== undefined ? `${boat.horasMotor} horas` : '--'}
                                </span>
                              </div>

                              {boat?.tamanho && (
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Tamanho / Pés:</span>
                                  <span className="font-bold text-stone-800">{boat.tamanho} pés</span>
                                </div>
                              )}

                              {boat?.inscricao && (
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Inscrição Marinha:</span>
                                  <span className="font-mono text-stone-800 text-[11px]">
                                    {boat.inscricao}
                                  </span>
                                </div>
                              )}

                              {boat?.chassi && (
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Chassi:</span>
                                  <span className="font-mono text-stone-700 text-[10px] truncate max-w-[150px]">
                                    {boat.chassi}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═════════ ABA 3: DOCUMENTOS & ARQUIVOS ═════════ */}
            {activeTab === 'documentos' && (
              <div className="h-[460px] rounded-2xl border border-stone-200/80 overflow-hidden bg-white">
                <InternalDrive forcedClienteId={client.id} />
              </div>
            )}
          </div>

          {/* Rodapé da Coluna Direita */}
          <footer className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ficha cadastral auditada e sincronizada com a base de dados.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              Fechar
            </button>
          </footer>
        </main>
      </div>

      {contractViewerOpen && (
        <ComercialContratoViewerModal
          isOpen={contractViewerOpen}
          onClose={() => setContractViewerOpen(false)}
          cliente={client}
          embarcacao={
            boats.find(
              b => b.id === (client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId)
            ) || null
          }
        />
      )}
    </div>
  );
}
