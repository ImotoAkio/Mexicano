import React, { useState } from 'react';
import { X, Search, Plus, Clock, Wrench, ShieldAlert, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { Chamado } from '../types';
import { chamadoDB } from '../db';

interface ClientMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  boats: any[];
  clientId: string;
  clientName: string;
  chamados: Chamado[];
  onSuccess: () => void;
}

export default function ClientMaintenanceModal({ isOpen, onClose, boats, clientId, clientName, chamados, onSuccess }: ClientMaintenanceModalProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    embarcacaoId: boats.length === 1 ? boats[0].id : '',
    titulo: '',
    descricaoAvaria: '',
    urgencia: 'baixa' as 'baixa' | 'media' | 'alta' | 'critica'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.embarcacaoId || !formData.titulo || !formData.descricaoAvaria) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      chamadoDB.create({
        embarcacaoId: formData.embarcacaoId,
        solicitanteTipo: 'cliente',
        solicitanteNome: clientName,
        clienteId: clientId,
        titulo: formData.titulo,
        descricaoAvaria: formData.descricaoAvaria,
        urgencia: formData.urgencia,
        status: 'pendente',
        dataAbertura: new Date().toISOString()
      });

      alert( 'Seu chamado foi aberto com sucesso.');
      setTimeout(() => {
        setIsSubmitting(false);
        setView('list');
        onSuccess();
      }, 500);

      setFormData({
        embarcacaoId: boats.length === 1 ? boats[0].id : '',
        titulo: '',
        descricaoAvaria: '',
        urgencia: 'baixa'
      });
    } catch (err) {
      setIsSubmitting(false);
      console.error(err);
      alert( 'Ocorreu um erro ao criar o chamado.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <span className="bg-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-500/30">Pendente</span>;
      case 'em_analise': return <span className="bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/30">Em Análise</span>;
      case 'os_gerada': return <span className="bg-sky-500/20 text-sky-400 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-500/30">Em Execução</span>;
      case 'concluido': return <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/30">Concluído</span>;
      case 'rejeitado': return <span className="bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30">Rejeitado</span>;
      case 'descartado': return <span className="bg-zinc-500/20 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-500/30">Descartado</span>;
      default: return <span className="bg-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-500/30">{status}</span>;
    }
  };

  const getUrgenciaIcon = (urgencia: string) => {
    switch (urgencia) {
      case 'critica': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'alta': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'media': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'baixa': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const filteredChamados = chamados.filter(c =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.codigoChamado || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#020202]/95 backdrop-blur-xl transition-all duration-300">
      <div className="w-full max-w-2xl bg-[#090909] rounded-[2rem] border border-white/[0.06] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">

        <div className="p-6 md:p-8 pb-4 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-light tracking-wide text-white">
                {view === 'list' ? 'Manutenções' : 'Nova Solicitação'}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500/80 mt-0.5">Peças & Serviços</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {view === 'list' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 md:px-8 py-4 border-b border-white/[0.04] flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Buscar chamados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/20 focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] transition-all outline-none"
                />
              </div>
              <button
                onClick={() => setView('create')}
                className="bg-[#B69D74] hover:bg-[#a38b65] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Chamado</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4 space-y-4 subtle-scrollbar">
              {filteredChamados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-white/80 font-medium mb-1">Nenhum chamado encontrado</h3>
                  <p className="text-sm text-white/40 mb-6">Você ainda não solicitou nenhuma manutenção.</p>
                  <button
                    onClick={() => setView('create')}
                    className="text-[#B69D74] hover:text-[#a38b65] font-medium text-sm transition-colors cursor-pointer"
                  >
                    + Criar primeiro chamado
                  </button>
                </div>
              ) : (
                filteredChamados.map(chamado => (
                  <div key={chamado.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:border-white/[0.1] transition-colors">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-white/40">{chamado.codigoChamado || 'Local'}</span>
                          {getStatusBadge(chamado.status)}
                        </div>
                        <h4 className="text-white font-medium">{chamado.titulo}</h4>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(chamado.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="flex items-center gap-1.5" title="Urgência">
                            {getUrgenciaIcon(chamado.urgencia)}
                            <span className="capitalize">{chamado.urgencia}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-white/50 mb-1">Embarcação</p>
                        <p className="text-sm font-medium text-white/80">
                          {boats.find(b => b.id === chamado.embarcacaoId)?.nome || 'Excluída'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 subtle-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Embarcação</label>
                  <select
                    value={formData.embarcacaoId}
                    onChange={e => setFormData(p => ({ ...p, embarcacaoId: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione a embarcação...</option>
                    {boats.map(boat => (
                      <option key={boat.id} value={boat.id}>{boat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Título do Reparo</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ex: Revisão do motor, Troca de hélice..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all placeholder-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Urgência</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { id: 'baixa', label: 'Baixa', icon: CheckCircle2, color: 'emerald' },
                      { id: 'media', label: 'Média', icon: AlertTriangle, color: 'amber' },
                      { id: 'alta', label: 'Alta', icon: AlertTriangle, color: 'orange' },
                      { id: 'critica', label: 'Crítica', icon: ShieldAlert, color: 'rose' }
                    ].map(u => {
                      const Icon = u.icon;
                      const isActive = formData.urgencia === u.id;

                      let activeClasses = "";
                      if (u.id === 'baixa') activeClasses = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                      else if (u.id === 'media') activeClasses = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                      else if (u.id === 'alta') activeClasses = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
                      else activeClasses = 'bg-rose-500/10 border-rose-500/30 text-rose-400';

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, urgencia: u.id as any }))}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs gap-1.5 transition-all cursor-pointer ${
                            isActive
                              ? activeClasses
                              : 'bg-white/[0.02] border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {u.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Descrição do Problema</label>
                  <textarea
                    value={formData.descricaoAvaria}
                    onChange={e => setFormData(p => ({ ...p, descricaoAvaria: e.target.value }))}
                    placeholder="Descreva com detalhes o que precisa ser feito..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all placeholder-white/20 resize-none"
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="flex-1 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl text-white font-medium text-sm transition-all cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 py-3 bg-[#B69D74] hover:bg-[#a38b65] text-white rounded-xl font-medium text-sm transition-all shadow-[0_5px_20px_rgba(182,157,116,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Solicitar Manutenção'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
