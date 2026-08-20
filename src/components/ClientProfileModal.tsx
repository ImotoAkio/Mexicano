import React, { useState } from 'react';
import { 
  X, User, Folder, Calendar, Printer, Download, MapPin, 
  CreditCard, FileText, Anchor, Award, Phone, Mail, 
  ShieldCheck, Briefcase, HeartHandshake, Ship, ShieldAlert, Sparkles
} from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import InternalDrive from './finance/InternalDrive';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientProfileModalProps {
  client: Cliente;
  boats: Embarcacao[];
  onClose: () => void;
}

export default function ClientProfileModal({ client, boats, onClose }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos'>('dados');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header Banner
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(14, y, 182, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VILA NÁUTICA', 20, y + 9);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('FICHA CADASTRAL DO CLIENTE / DOSSIÊ NÁUTICO', 20, y + 16);

    const nowStr = new Date().toLocaleString('pt-BR');
    doc.setFontSize(8);
    doc.text(`Emissão: ${nowStr}`, pageWidth - 20, y + 16, { align: 'right' });

    y += 28;

    // Client Summary Block
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text((client.nome || 'CLIENTE').toUpperCase(), 18, y + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const linkedBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes
      : [{ embarcacaoId: client.embarcacaoId, cota: client.cota }];

    const statusFin = client.statusFinanceiro === 'inadimplente' ? 'INADIMPLENTE' : 'EM DIA';
    const planoStr = (client.plano || 'normal').toUpperCase();
    doc.text(`Plano: ${planoStr}  |  Situação Financeira: ${statusFin}  |  Veículos Vinculados: ${linkedBoatsList.length}`, 18, y + 12);

    y += 22;

    const renderSectionHeader = (title: string) => {
      doc.setFillColor(238, 242, 255); // Indigo-50
      doc.rect(14, y, 182, 7, 'F');
      doc.setFillColor(79, 70, 229);
      doc.rect(14, y, 3, 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(title.toUpperCase(), 20, y + 5);
      y += 9;
    };

    // Section 1: Dados Pessoais e de Contato
    renderSectionHeader('1. Informações Pessoais e de Contato');

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
        { content: formatDate(client.dataNascimento) }
      ],
      [
        { content: 'E-mail:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.email || 'Não informado' },
        { content: 'Telefone / WhatsApp:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.telefone || 'Não informado' }
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
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Section 2: Habilitação Náutica (CHA / CNH)
    renderSectionHeader('2. Habilitação Náutica (CHA / CNH)');

    const habNum = client.numeroHabilitacao || client.cnh_cha || 'Não informada';
    const habData = [
      [
        { content: 'Nº Habilitação / CHA:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: habNum },
        { content: 'Categoria:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.categoriaHabilitacao || 'Não informada' }
      ],
      [
        { content: 'Validade:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatDate(client.validadeHabilitacao) },
        { content: 'Órgão Emissor:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro' }
      ]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: habData as any,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Section 3: Endereço
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
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Section 4: Situação Financeira & Plano
    renderSectionHeader('4. Situação Financeira & Plano');

    const finData = [
      [
        { content: 'Status Financeiro:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: statusFin },
        { content: 'Plano de Assinatura:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: planoStr }
      ],
      [
        { content: 'ID Integração Asaas:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.asaasCustomerId || 'Não vinculado' },
        { content: 'Obs. Financeiras:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: client.observacoesFinanceiras || 'Nenhuma observação registrada' }
      ]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      body: finData as any,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 56 },
        2: { cellWidth: 35 },
        3: { cellWidth: 56 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Section 5: Embarcações e Cotas Vinculadas
    renderSectionHeader('5. Embarcações e Cotas Vinculadas');

    const boatRows = linkedBoatsList.map((item, idx) => {
      const boat = boats.find(b => b.id === item.embarcacaoId);
      return [
        (idx + 1).toString(),
        boat?.nome || 'Não identificada',
        boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha',
        item.cota || 'N/A',
        `${boat?.fabricante || '-'} / ${boat?.modelo || '-'} (${boat?.ano || '-'})`,
        boat?.inscricao || '-'
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['#', 'Embarcação', 'Tipo', 'Cota', 'Fabricante / Modelo (Ano)', 'Inscrição Marinha']],
      body: boatRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    // Footer for each page
    const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 285, 196, 285);
      doc.text('Vila Náutica - Documento Interno de Gestão de Clientes', 14, 289);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 289, { align: 'right' });
    }

    const safeName = (client.nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Ficha_Cliente_${safeName}.pdf`);
  };

  const linkedBoats = client.embarcacoes && client.embarcacoes.length > 0 
    ? client.embarcacoes 
    : [{ embarcacaoId: client.embarcacaoId, cota: client.cota }];

  const numeroHab = client.numeroHabilitacao || client.cnh_cha;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl overflow-hidden h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header Superior */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-13 h-13 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {client.nome ? client.nome.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 truncate">{client.nome}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  client.statusFinanceiro === 'inadimplente' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Plano {client.plano === 'completo' ? 'Completo' : 'Normal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  {linkedBoats.length} {linkedBoats.length === 1 ? 'Veículo Vinculado' : 'Veículos Vinculados'}
                </span>
                <span>•</span>
                <span>Cadastrado em {formatDate(client.dataCadastro)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              title="Gerar PDF da Ficha Cadastral"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ficha (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white shrink-0 px-4 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
              activeTab === 'dados' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" /> Dados Gerais do Cliente
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
              activeTab === 'documentos' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Folder className="w-4 h-4" /> Gestor de Arquivos do Cliente
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          {activeTab === 'dados' && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              
              {/* Bloco 1: Informações Pessoais & Contato */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-indigo-600" />
                  Informações Pessoais & Contato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">E-mail</span> 
                    <span className="font-semibold text-slate-800 break-all">{client.email || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Telefone / WhatsApp</span> 
                    <span className="font-semibold font-mono text-slate-800">{client.telefone || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">CPF</span> 
                    <span className="font-semibold font-mono text-slate-800">{client.cpf || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">RG / Órgão Emissor</span> 
                    <span className="font-semibold font-mono text-slate-800">
                      {client.rg ? `${client.rg} ${client.orgaoEmissor ? `(${client.orgaoEmissor})` : ''}` : 'Não informado'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Data de Nascimento</span> 
                    <span className="font-semibold font-mono text-slate-800">
                      {formatDate(client.dataNascimento)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Estado Civil</span> 
                    <span className="font-semibold text-slate-800">{client.estadoCivil || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Profissão</span> 
                    <span className="font-semibold text-slate-800">{client.profissao || 'Não informada'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Data de Cadastro</span> 
                    <span className="font-semibold font-mono text-slate-800">{formatDate(client.dataCadastro)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">ID do Cliente</span> 
                    <span className="font-semibold font-mono text-slate-500 text-xs truncate block">{client.id}</span>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Habilitação Náutica (CHA / CNH) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Habilitação Náutica (CHA / CNH)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Nº da Habilitação / CHA</span> 
                    <span className="font-semibold font-mono text-slate-800">{numeroHab || 'Não informada'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Categoria</span> 
                    <span className="font-semibold text-slate-800">{client.categoriaHabilitacao || 'Não informada'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Validade</span> 
                    <span className="font-semibold font-mono text-slate-800">{formatDate(client.validadeHabilitacao)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Órgão Emissor</span> 
                    <span className="font-semibold text-slate-800">{client.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro'}</span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Endereço Completo */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Endereço Residencial / Comercial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Logradouro / Rua e Número</span> 
                    <span className="font-semibold text-slate-800">
                      {client.logradouro ? `${client.logradouro}${client.numeroEnd ? `, Nº ${client.numeroEnd}` : ''}` : 'Não informado'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Complemento</span> 
                    <span className="font-semibold text-slate-800">{client.complemento || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Bairro</span> 
                    <span className="font-semibold text-slate-800">{client.bairro || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">CEP</span> 
                    <span className="font-semibold font-mono text-slate-800">{client.cep || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Cidade / Estado (UF)</span> 
                    <span className="font-semibold text-slate-800">
                      {client.cidade ? `${client.cidade}${client.estado ? ` - ${client.estado}` : ''}` : 'Não informada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 4: Situação Financeira & Plano */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Situação Financeira & Plano
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Situação Financeira</span> 
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border mt-0.5 ${
                      client.statusFinanceiro === 'inadimplente' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Plano Escolhido</span> 
                    <span className="font-semibold text-slate-800 uppercase text-xs tracking-wider">
                      Plano {client.plano === 'completo' ? 'Completo' : 'Normal'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">ID Integração Asaas</span> 
                    <span className="font-semibold font-mono text-slate-800 text-xs">
                      {client.asaasCustomerId || 'Não vinculado'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-3">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Observações Financeiras</span> 
                    <p className="text-slate-700 font-medium text-xs whitespace-pre-wrap">
                      {client.observacoesFinanceiras || 'Nenhuma observação registrada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco 5: Veículos & Cotas Vinculadas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Anchor className="w-4 h-4 text-indigo-600" />
                  Veículos & Cotas Vinculadas ({linkedBoats.length})
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {linkedBoats.map((item, idx) => {
                    const boat = boats.find(b => b.id === item.embarcacaoId);
                    return (
                      <div key={idx} className="p-4 border border-slate-200 bg-slate-50 rounded-2xl hover:border-indigo-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-slate-900 text-base">{boat?.nome || 'Não identificada'}</h5>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                {boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600 mt-2">
                              <div><span className="font-semibold text-slate-500">Fabricante/Modelo:</span> {boat?.fabricante || '-'} {boat?.modelo || ''}</div>
                              <div><span className="font-semibold text-slate-500">Ano:</span> {boat?.ano || '-'}</div>
                              <div><span className="font-semibold text-slate-500">Inscrição Marinha:</span> {boat?.inscricao || '-'}</div>
                              <div><span className="font-semibold text-slate-500">Nº Chassi:</span> {boat?.chassi || '-'}</div>
                              <div><span className="font-semibold text-slate-500">Horímetro:</span> {boat?.horasMotor != null ? `${boat.horasMotor}h` : '-'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 shrink-0 text-right self-end md:self-center w-full md:w-auto">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Cota de Acesso</span>
                          <span className="font-mono font-black text-indigo-700 text-lg">{item.cota}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="absolute inset-0 bg-white">
              <InternalDrive forcedClienteId={client.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
