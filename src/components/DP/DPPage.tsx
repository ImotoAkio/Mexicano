import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Briefcase, ChevronRight, Calendar, Shield, MapPin, Phone, CreditCard, Building, FileText, CheckCircle2, X, Check } from 'lucide-react';
import { funcionarioDB } from '../../db';
import { Funcionario } from '../../types';
import FuncionarioPerfil from './FuncionarioPerfil';

export default function DPPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFunc, setSelectedFunc] = useState<Funcionario | null>(null);
  const [isNewFuncModalOpen, setIsNewFuncModalOpen] = useState(false);
  const [newFuncData, setNewFuncData] = useState<Partial<Funcionario>>({
    nome: '',
    cargo: '',
    setor: 'Administrativo'
  });

  const loadData = () => {
    setFuncionarios([...funcionarioDB.getAll()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNewFunc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuncData.nome) return;
    
    funcionarioDB.create(newFuncData as any);
    setIsNewFuncModalOpen(false);
    setNewFuncData({ nome: '', cargo: '', setor: 'Administrativo' });
    loadData();
  };

  const filteredFuncs = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.cargo && f.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (selectedFunc) {
    return (
      <FuncionarioPerfil 
        funcionario={selectedFunc} 
        onBack={() => setSelectedFunc(null)} 
        onUpdate={() => { loadData(); setSelectedFunc(funcionarioDB.getById(selectedFunc.id) || selectedFunc); }} 
      />
    );
  }

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Departamento Pessoal</h2>
          <p className="text-sm text-slate-500">Gestão completa de colaboradores, férias e documentos.</p>
        </div>
        <button onClick={() => setIsNewFuncModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center hover:bg-slate-800 transition-colors">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador por nome ou cargo..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Colaborador</th>
                <th className="p-4 font-semibold">Setor / Cargo</th>
                <th className="p-4 font-semibold">Admissão</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFuncs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Nenhum colaborador encontrado.</td>
                </tr>
              ) : (
                filteredFuncs.map(func => (
                  <tr key={func.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold mr-3 border border-slate-200">
                          {func.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{func.nome}</div>
                          <div className="text-xs text-slate-500">{func.cpf || 'CPF pendente'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Building className="w-4 h-4 mr-1.5 text-slate-400" />
                        {func.setor}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{func.cargo}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600">
                        {func.admissao ? new Date(func.admissao).toLocaleDateString('pt-BR') : 'Não informada'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSelectedFunc(func)} className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors inline-flex items-center">
                        Abrir Ficha <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVO COLABORADOR */}
      {isNewFuncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-xl max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="font-bold text-slate-800 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-slate-500" /> Cadastro de Novo Colaborador</h2>
              <button onClick={() => setIsNewFuncModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm p-1 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <div className="overflow-y-auto p-6 subtle-scrollbar">
              <form onSubmit={handleSaveNewFunc} className="space-y-6">
                
                {/* DADOS PRINCIPAIS */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center border-b pb-2"><Briefcase className="w-4 h-4 mr-2" /> Dados Funcionais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                      <input type="text" required value={newFuncData.nome || ''} onChange={e => setNewFuncData(prev => ({ ...prev, nome: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data de Admissão</label>
                      <input type="date" value={newFuncData.admissao || ''} onChange={e => setNewFuncData(prev => ({ ...prev, admissao: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Setor</label>
                      <select value={newFuncData.setor || 'Administrativo'} onChange={e => setNewFuncData(prev => ({ ...prev, setor: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none">
                        <option value="Administrativo">Administrativo</option>
                        <option value="Operacional">Operacional</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Atendimento">Atendimento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cargo *</label>
                      <input type="text" required value={newFuncData.cargo || ''} onChange={e => setNewFuncData(prev => ({ ...prev, cargo: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Salário Base</label>
                      <input type="text" placeholder="R$ 0,00" value={newFuncData.salarioBase || ''} onChange={e => setNewFuncData(prev => ({ ...prev, salarioBase: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dias de Experiência</label>
                      <input type="number" placeholder="Ex: 90" onChange={e => {
                        const dias = parseInt(e.target.value);
                        if (!isNaN(dias) && newFuncData.admissao) {
                          // The time is treated as UTC in JS when parsing YYYY-MM-DD
                          const date = new Date(newFuncData.admissao + 'T00:00:00');
                          date.setDate(date.getDate() + dias);
                          setNewFuncData(prev => ({ ...prev, contratoExperiencia: date.toISOString().split('T')[0] }));
                        }
                      }} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data Fim Contrato Exp.</label>
                      <input type="date" value={newFuncData.contratoExperiencia || ''} onChange={e => setNewFuncData(prev => ({ ...prev, contratoExperiencia: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={newFuncData.primeiroEmprego || false} onChange={e => setNewFuncData(prev => ({ ...prev, primeiroEmprego: e.target.checked }))} className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 border-slate-300" />
                        <span>É Primeiro Emprego?</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* DOCUMENTAÇÃO */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center border-b pb-2"><FileText className="w-4 h-4 mr-2" /> Documentação Pessoal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CPF</label>
                      <input type="text" value={newFuncData.cpf || ''} onChange={e => setNewFuncData(prev => ({ ...prev, cpf: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">RG</label>
                      <input type="text" value={newFuncData.rg || ''} onChange={e => setNewFuncData(prev => ({ ...prev, rg: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Emissão RG</label>
                      <input type="date" value={newFuncData.rgEmissao || ''} onChange={e => setNewFuncData(prev => ({ ...prev, rgEmissao: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Órgão Emissor</label>
                      <input type="text" value={newFuncData.rgOrgao || ''} onChange={e => setNewFuncData(prev => ({ ...prev, rgOrgao: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">UF RG</label>
                      <input type="text" maxLength={2} value={newFuncData.rgUF || ''} onChange={e => setNewFuncData(prev => ({ ...prev, rgUF: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CTPS</label>
                      <input type="text" value={newFuncData.ctps || ''} onChange={e => setNewFuncData(prev => ({ ...prev, ctps: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PIS</label>
                      <input type="text" value={newFuncData.pis || ''} onChange={e => setNewFuncData(prev => ({ ...prev, pis: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data Nascimento</label>
                      <input type="date" value={newFuncData.dataNascimento || ''} onChange={e => setNewFuncData(prev => ({ ...prev, dataNascimento: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Estado Civil</label>
                      <select value={newFuncData.estadoCivil || ''} onChange={e => setNewFuncData(prev => ({ ...prev, estadoCivil: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none">
                        <option value="">Selecione</option>
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cônjuge</label>
                      <input type="text" value={newFuncData.conjugue || ''} onChange={e => setNewFuncData(prev => ({ ...prev, conjugue: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Grau de Instrução</label>
                      <input type="text" value={newFuncData.grauInstrucao || ''} onChange={e => setNewFuncData(prev => ({ ...prev, grauInstrucao: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Filiação (Mãe/Pai)</label>
                      <input type="text" value={newFuncData.filiacao || ''} onChange={e => setNewFuncData(prev => ({ ...prev, filiacao: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                  </div>
                </div>

                {/* CONTATO & ENDEREÇO */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center border-b pb-2"><MapPin className="w-4 h-4 mr-2" /> Contato e Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CEP</label>
                      <input type="text" value={newFuncData.cep || ''} onChange={e => setNewFuncData(prev => ({ ...prev, cep: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Endereço (Rua)</label>
                      <input type="text" value={newFuncData.endereco || ''} onChange={e => setNewFuncData(prev => ({ ...prev, endereco: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Número / Comp.</label>
                      <input type="text" value={newFuncData.numero || ''} onChange={e => setNewFuncData(prev => ({ ...prev, numero: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                      <input type="text" value={newFuncData.cidade || ''} onChange={e => setNewFuncData(prev => ({ ...prev, cidade: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Estado (UF)</label>
                      <input type="text" maxLength={2} value={newFuncData.estado || ''} onChange={e => setNewFuncData(prev => ({ ...prev, estado: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / Celular</label>
                      <input type="text" value={newFuncData.telefone || ''} onChange={e => setNewFuncData(prev => ({ ...prev, telefone: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contato de Emergência</label>
                      <input type="text" placeholder="Nome - Telefone" value={newFuncData.contatoEmergencia || ''} onChange={e => setNewFuncData(prev => ({ ...prev, contatoEmergencia: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dados Bancários</label>
                      <input type="text" placeholder="Banco, Agência, Conta, PIX..." value={newFuncData.dadosBancarios || ''} onChange={e => setNewFuncData(prev => ({ ...prev, dadosBancarios: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                  </div>
                </div>

                {/* FARDAMENTO */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center border-b pb-2"><Shield className="w-4 h-4 mr-2" /> Tamanhos (Fardamento)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Calça</label>
                      <input type="text" value={newFuncData.tamanhoCalca || ''} onChange={e => setNewFuncData(prev => ({ ...prev, tamanhoCalca: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Camisa</label>
                      <input type="text" value={newFuncData.tamanhoCamisa || ''} onChange={e => setNewFuncData(prev => ({ ...prev, tamanhoCamisa: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bota</label>
                      <input type="text" value={newFuncData.tamanhoBota || ''} onChange={e => setNewFuncData(prev => ({ ...prev, tamanhoBota: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cinto</label>
                      <input type="text" value={newFuncData.tamanhoCinto || ''} onChange={e => setNewFuncData(prev => ({ ...prev, tamanhoCinto: e.target.value }))} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setIsNewFuncModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 mr-2">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
                    <Check className="w-4 h-4"/> Salvar Cadastro
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
