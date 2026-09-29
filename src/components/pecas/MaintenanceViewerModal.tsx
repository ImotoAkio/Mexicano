import React from 'react';
import {
  X,
  Wrench,
  Calendar,
  Ship,
  FileText,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  Building2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { generateOrcamentoOSPDF } from '../../utils/pdfGenerator';
import { maintenanceDB } from '../../db';

interface MaintenanceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Manutencao;
  embarcacao?: Embarcacao;
  mecanico?: Mecanico;
  onEditClick: () => void;
}

export default function MaintenanceViewerModal({
  isOpen,
  onClose,
  item,
  embarcacao,
  mecanico,
  onEditClick
}: MaintenanceViewerModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'aguardando_orcamento':
        return { label: '1. Aguardando Orçamento', bg: 'bg-pink-100 text-pink-900 border-pink-200' };
      case 'aguardando_aprovacao':
        return { label: '2. Aguardando Aprovação', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'em_execucao':
        return { label: '3. Execução da OS', bg: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'reprovado':
        return { label: 'Cancelado / Reprovado', bg: 'bg-red-100 text-red-900 border-red-200' };
      case 'concluido':
        return { label: '4. Concluído & Liberado', bg: 'bg-purple-100 text-purple-900 border-purple-200' };
      default:
        return { label: 'Em Manutenção', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const badge = getStatusBadge(item.status);
  const totalPecas = (item.pecas || []).reduce((acc, p) => acc + ((p.quantidade || 0) * (p.valorUnitario || 0)), 0);

  const isAwaitingBudget = item.status === 'aguardando_orcamento';

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja apagar esta OS permanentemente? A ação não pode ser desfeita.')) {
      try {
        await maintenanceDB.delete(item.id);
        onClose();
      } catch (e) {
        console.error('Erro ao excluir:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm sm:p-6">
      <div
        className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col font-sans max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Visualizador */}
        <div className="relative px-6 py-5 border-b shrink-0 flex items-center justify-between overflow-hidden bg-slate-50 border-slate-200">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#186b77]">
              {isAwaitingBudget ? <AlertCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#186b77] text-xs font-black font-mono">
                  {item.codigoOS || ('OS-' + item.id.substring(0, 6).toUpperCase())}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {isAwaitingBudget ? 'Avaliação Técnica Pendente' : (item.tituloChamado || item.tipoManutencaoNome || 'Ficha de Manutenção')}
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors z-10 cursor-pointer"
              title="Apagar Ordem de Serviço"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo (Read-only) */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar space-y-6">

          {/* Relato / Descrição - Highlighted when Awaiting Budget */}
          <div className="flex-none">
            <h3 className="text-xs flex items-center gap-1.5 font-extrabold text-slate-800 uppercase tracking-tight mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              {isAwaitingBudget ? 'Problema Reportado pelo Cliente' : 'Relato Técnico do Serviço Base'}
            </h3>
            <div className={`p-4 rounded-xl text-sm font-medium whitespace-pre-wrap leading-relaxed ${isAwaitingBudget ? 'bg-pink-50 border border-pink-100 text-pink-900' : 'bg-slate-50 border border-slate-100 text-slate-600 shadow-inner shadow-slate-100/50'}`}>
              {item.descricaoServico || <span className="italic font-normal opacity-70">O problema/serviço a ser realizado não foi detalhado na abertura da OS.</span>}
            </div>
          </div>

          {/* Informações Básicas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-none">

            {/* Barco */}
            <div className="bg-slate-50 p-4 flex gap-3 rounded-2xl border border-slate-100">
              <div className="p-2 h-max bg-white rounded-xl shadow-xs text-blue-600 border border-slate-100">
                <Ship className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Embarcação / Dono</span>
                <p className="text-sm font-extrabold text-slate-900 leading-tight block mt-1">
                  {embarcacao ? getBoatCode(embarcacao) : 'Embarcação não encontrada'}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {embarcacao?.modelo || embarcacao?.tipo || 'N/A'}
                </p>
              </div>
            </div>

            {/* Mecânico */}
            <div className="bg-slate-50 p-4 flex gap-3 rounded-2xl border border-slate-100">
              <div className="p-2 h-max bg-white rounded-xl shadow-xs text-amber-600 border border-slate-100">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Técnico / Oficina</span>
                <p className="text-sm font-extrabold text-slate-900 leading-tight block mt-1">
                  {mecanico ? mecanico.nome : (isAwaitingBudget ? 'Pendente de Avaliação' : 'Nenhum Mecânico')}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {mecanico?.tipo === 'oficina_externa' ? 'Oficina Terceirizada' : (mecanico ? 'Funcionário Interno' : 'Aguardando')}
                </p>
              </div>
            </div>

            {/* Prazos */}
            <div className="bg-slate-50 p-4 flex gap-3 rounded-2xl border border-slate-100">
              <div className="p-2 h-max bg-white rounded-xl shadow-xs text-indigo-500 border border-slate-100">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="w-full">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200 pb-1 mb-1 block">
                  Linha do Tempo
                </span>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="font-medium text-slate-500">Data Abertura:</span>
                  <span className="font-bold text-slate-900">
                    {item.dataSaida ? item.dataSaida.split('-').reverse().join('/') : 'Não definida'}
                  </span>
                </div>
                {!isAwaitingBudget && (
                  <div className="flex justify-between items-center text-xs mt-0.5">
                    <span className="font-medium text-slate-500">Prazo Entrega:</span>
                    <span className="font-bold text-slate-900">
                      {item.prazoEntrega ? item.prazoEntrega.split('-').reverse().join('/') : 'Não definido'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Comercial (Omitido em Aguardando Orçamento) */}
            {!isAwaitingBudget && (
              <div className="bg-emerald-50/50 p-4 flex gap-3 rounded-2xl border border-emerald-100">
                <div className="p-2 h-max bg-white rounded-xl shadow-xs text-emerald-600 border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="w-full">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider border-b border-emerald-200/50 pb-1 mb-1 block">
                    Informações Fiscais
                  </span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="font-medium text-emerald-700">Orçamento Cliente:</span>
                    <span className="font-black text-emerald-900 text-sm">
                      {item.orcamento && item.orcamento > 0 ? item.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-0.5">
                    <span className="font-medium text-emerald-600/70">Custo Terceirizado:</span>
                    <span className="font-bold text-emerald-700">
                      {item.custo && item.custo > 0 ? item.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Peças / Sub-serviços Orçados */}
          {!isAwaitingBudget && (
            <div className="flex-none pb-4">
              <h3 className="text-xs flex items-center gap-1.5 font-extrabold text-slate-800 uppercase tracking-tight mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                Itens do Orçamento
              </h3>

              {item.pecas && item.pecas.length > 0 ? (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-1/2">Item/Peça/Serviço</th>
                        <th className="py-2.5 px-3 text-center w-16">Qtd</th>
                        <th className="py-2.5 px-3 text-right">R$ Un.</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {item.pecas.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4">{p.nome || 'Item sem nome'}</td>
                          <td className="py-2.5 px-3 text-center">{p.quantidade}</td>
                          <td className="py-2.5 px-3 text-right">{(p.valorUnitario || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                          <td className="py-2.5 px-4 text-right font-black text-slate-900">
                            {((p.quantidade || 0) * (p.valorUnitario || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-200 border-dashed">
                        <td colSpan={3} className="py-3 px-4 text-right font-extrabold text-slate-500 text-xs">Total Parcial Peças/Itens:</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                          {totalPecas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 border-dashed text-center text-xs text-slate-400 font-medium">
                  Nenhuma peça extra incluída neste orçamento. Apenas o valor global negociado.
                </div>
              )}
            </div>
          )}

          {/* Banner Chamado para Ação (Somente se Aguardando Orçamento) */}
          {isAwaitingBudget && (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800 mb-1">Aguardando Avaliação Técnica</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Vá até a embarcação avaliar o defeito reportado. Após isso, clique em "Formular Orçamento" para adicionar prazos, peças e o financeiro (Custo vs Repasse).
              </p>
            </div>
          )}

        </div>

        {/* Rodapé e Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between shrink-0 rounded-b-3xl gap-3">
          <div className="w-full sm:w-auto">
            {!isAwaitingBudget && (
              <button
                onClick={() => {
                  if(embarcacao) generateOrcamentoOSPDF(item, embarcacao);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 hover:text-[#186b77] hover:bg-teal-50 rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-teal-200 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>PDF Formal p/ Cliente</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              onClick={onEditClick}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer ${isAwaitingBudget ? 'bg-pink-600 hover:bg-pink-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              <Wrench className="w-4 h-4" />
              <span>{isAwaitingBudget ? 'Formular Orçamento OS' : 'Modificar Orçamento ou Dados'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}