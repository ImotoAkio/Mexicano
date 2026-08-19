import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Ship, 
  Download, 
  Printer, 
  ExternalLink,
  Filter,
  Check,
  Building2
} from 'lucide-react';
import { Manutencao, Embarcacao, Cliente } from '../../types';
import { generateOrcamentoOSPDF } from '../../utils/pdfGenerator';
import { clientDB } from '../../db';

interface MaintenanceDocumentsViewProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  onOpenOS: (item: Manutencao) => void;
  onRefresh: () => void;
  searchTerm?: string;
}

export default function MaintenanceDocumentsView({
  manutencoes,
  embarcacoes,
  onOpenOS,
  onRefresh,
  searchTerm = ''
}: MaintenanceDocumentsViewProps) {

  const [approvalFilter, setApprovalFilter] = useState<'todos' | 'aprovado' | 'pendente'>('todos');
  const clientesList = useMemo(() => clientDB.getAll(), []);

  // Filtered List
  const filteredDocs = useMemo(() => {
    return manutencoes.filter(m => {
      // Must have budget or parts
      const hasBudget = (m.orcamento && m.orcamento > 0) || (m.pecas && m.pecas.length > 0);
      if (!hasBudget) return false;

      const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
      const searchLower = searchTerm.toLowerCase();
      const codeStr = m.codigoOS || ('OS-' + m.id.substring(0, 6));

      const matchesSearch = 
        (m.tituloChamado && m.tituloChamado.toLowerCase().includes(searchLower)) ||
        (codeStr.toLowerCase().includes(searchLower)) ||
        (boat && boat.nome.toLowerCase().includes(searchLower)) ||
        (boat && boat.numero && boat.numero.toLowerCase().includes(searchLower));

      const matchesApproval = 
        approvalFilter === 'todos' ||
        (approvalFilter === 'aprovado' && m.orcamentoAprovado) ||
        (approvalFilter === 'pendente' && !m.orcamentoAprovado);

      return matchesSearch && matchesApproval;
    });
  }, [manutencoes, embarcacoes, searchTerm, approvalFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDocs = manutencoes.filter(m => (m.orcamento && m.orcamento > 0) || (m.pecas && m.pecas.length > 0)).length;
    const aprovados = manutencoes.filter(m => m.orcamentoAprovado).length;
    const pendentes = manutencoes.filter(m => !m.orcamentoAprovado && (m.orcamento && m.orcamento > 0)).length;
    const valorTotal = manutencoes.reduce((acc, m) => acc + (m.orcamento || 0), 0);

    return { totalDocs, aprovados, pendentes, valorTotal };
  }, [manutencoes]);

  const handleSendWpp = async (m: Manutencao) => {
    const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
    if (!boat?.whatsappGroupId) {
      alert("Embarcação não possui grupo de WhatsApp cadastrado.");
      return;
    }

    let texto = `*ORÇAMENTO DE MANUTENÇÃO - ${boat?.nome || 'Embarcação'}*\n\n`;
    texto += `*Serviço:* ${m.tituloChamado || 'Manutenção'}\n`;
    texto += `*Status:* ${m.orcamentoAprovado ? 'Aprovado' : 'Aguardando Aprovação'}\n\n`;
    
    if (m.pecas && m.pecas.length > 0) {
      texto += `*Peças & Materiais:*\n`;
      m.pecas.forEach(p => {
        const totalStr = (p.quantidade * p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        texto += `- ${p.quantidade}x ${p.nome} (${totalStr})\n`;
      });
      texto += `\n`;
    }

    texto += `*VALOR TOTAL:* ${(m.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;

    try {
      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: boat.whatsappGroupId,
          text: texto
        })
      });

      if (response.ok) {
        alert("Orçamento enviado para o grupo de WhatsApp com sucesso!");
        onRefresh();
      } else {
        alert("Falha ao enviar mensagem.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar mensagem.");
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar space-y-6">
      
      {/* Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase text-slate-400">Total Propostas/PDFs</span>
          <div className="text-2xl font-black text-slate-900">{metrics.totalDocs}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Orçamentos gerados</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase text-emerald-600">Aprovados pelo Cliente</span>
          <div className="text-2xl font-black text-emerald-800">{metrics.aprovados}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Liberados para execução</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase text-amber-600">Aguardando Aprovação</span>
          <div className="text-2xl font-black text-amber-800">{metrics.pendentes}</div>
          <span className="text-[10px] text-amber-600 font-semibold">Propostas enviadas ao cliente</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase text-[#186b77]">Volume Orçado Acumulado</span>
          <div className="text-2xl font-black text-[#186b77]">
            {metrics.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <span className="text-[10px] text-[#186b77] font-semibold">Soma dos orçamentos</span>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Aprovação:
          </span>
          <button
            onClick={() => setApprovalFilter('todos')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              approvalFilter === 'todos' ? 'bg-[#186b77] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({metrics.totalDocs})
          </button>
          <button
            onClick={() => setApprovalFilter('aprovado')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              approvalFilter === 'aprovado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Aprovados ({metrics.aprovados})
          </button>
          <button
            onClick={() => setApprovalFilter('pendente')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              approvalFilter === 'pendente' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Aguardando ({metrics.pendentes})
          </button>
        </div>
      </div>

      {/* Grid of Quote Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(m => {
          const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
          const clienteObj = clientesList.find(c => c.id === boat?.proprietarioId);
          const osCode = m.codigoOS || ('OS-' + m.id.substring(0, 6).toUpperCase());

          return (
            <div 
              key={m.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-black bg-teal-50 text-[#186b77] px-2.5 py-1 rounded-lg border border-teal-200/80">
                    {osCode}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-2">
                    {m.tituloChamado || 'Manutenção'}
                  </h3>
                </div>

                {m.orcamentoAprovado ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Aprovado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3 text-amber-500" /> Pendente
                  </span>
                )}
              </div>

              {/* Details Box */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Embarcação</span>
                  <strong className="text-slate-800 font-bold">{boat?.nome} (M{boat?.numero})</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Proprietário</span>
                  <span className="text-slate-700 font-semibold">{clienteObj?.nome || 'Proprietário Registrado'}</span>
                </div>

                {m.pecas && m.pecas.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 block mb-1">Peças discriminadas ({m.pecas.length}):</span>
                    <ul className="space-y-0.5 max-h-16 overflow-y-auto custom-scrollbar">
                      {m.pecas.map((p, i) => (
                        <li key={i} className="flex justify-between text-[10px]">
                          <span>{p.quantidade}x {p.nome}</span>
                          <strong className="text-slate-800">
                            {((p.quantidade || 1) * (p.valorUnitario || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Total Value */}
              <div className="flex items-center justify-between p-3 bg-teal-50/60 border border-teal-200/60 rounded-2xl text-xs">
                <span className="font-bold text-teal-900 uppercase text-[10px]">Valor Total do Orçamento:</span>
                <strong className="text-sm font-black text-[#186b77]">
                  {(m.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => generateOrcamentoOSPDF(m, boat, clienteObj)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#186b77]" />
                  <span>Emitir PDF</span>
                </button>

                <button
                  onClick={() => handleSendWpp(m)}
                  className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Enviar Orçamento no WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WPP</span>
                </button>

                <button
                  onClick={() => onOpenOS(m)}
                  className="py-2 px-3 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Editar
                </button>
              </div>

            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-800 text-base">Nenhum orçamento emitido</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Ao adicionar orçamento ou peças em uma Ordem de Serviço, o documento aparecerá automaticamente nesta central.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
