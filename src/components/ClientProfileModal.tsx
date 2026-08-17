import React, { useState } from 'react';
import { X, User, Folder, Calendar } from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import InternalDrive from './finance/InternalDrive';

interface ClientProfileModalProps {
  client: Cliente;
  boats: Embarcacao[];
  onClose: () => void;
}

export default function ClientProfileModal({ client, boats, onClose }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos'>('dados');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{client.nome}</h3>
              <p className="text-xs font-mono text-slate-500 font-semibold mt-0.5">
                {client.embarcacoes && client.embarcacoes.length > 0 
                  ? `${client.embarcacoes.length} Veículos Vinculados` 
                  : `Cota: ${client.cota}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-white shrink-0 px-2 pt-2">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-lg ${
              activeTab === 'dados' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" /> Dados Gerais
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-lg ${
              activeTab === 'documentos' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Folder className="w-4 h-4" /> Gestor de Arquivos do Cliente
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          {activeTab === 'dados' && (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações de Contato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Email</span> 
                    <span className="font-semibold text-slate-800">{client.email || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Telefone/WhatsApp</span> 
                    <span className="font-semibold font-mono text-slate-800">{client.telefone || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">CPF</span> 
                    <span className="font-semibold font-mono text-slate-800">{client.cpf || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Data de Nascimento</span> 
                    <span className="font-semibold font-mono text-slate-800">
                      {client.dataNascimento ? new Date(client.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Situação Financeira</span> 
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                      client.statusFinanceiro === 'inadimplente' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-600 mb-5 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Veículos Vinculados
                </h4>
                <div className="grid gap-3">
                  {(client.embarcacoes && client.embarcacoes.length > 0 ? client.embarcacoes : [{ embarcacaoId: client.embarcacaoId, cota: client.cota }]).map((item, idx) => {
                    const boat = boats.find(b => b.id === item.embarcacaoId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-base">{boat?.nome || 'Não identificada'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">{boat?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Cota de Acesso</p>
                          <p className="font-mono font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg inline-block">{item.cota}</p>
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
