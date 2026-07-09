import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Shield, Calendar, Edit2, Check, X, FileText, Download, Save, Printer } from 'lucide-react';
import { funcionarioDB, epiDB, folgaDB } from '../../db';
import { Funcionario, EpiEntrega, Folga } from '../../types';

interface Props {
  funcionario: Funcionario;
  onBack: () => void;
  onUpdate: () => void;
}

export default function FuncionarioPerfil({ funcionario, onBack, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<'dados' | 'epis' | 'folgas'>('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Funcionario>(funcionario);
  const [epis, setEpis] = useState<EpiEntrega[]>([]);
  const [folgas, setFolgas] = useState<Folga[]>([]);

  useEffect(() => {
    setEpis(epiDB.getByFuncionarioId(funcionario.id));
    setFolgas(folgaDB.getByFuncionarioId(funcionario.id));
  }, [funcionario.id]);

  const handleSave = async () => {
    try {
      await funcionarioDB.update(funcionario.id, formData);
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6" id="print-area">
      <div className="flex items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{funcionario.nome}</h2>
          <p className="text-sm text-slate-500">{funcionario.cargo} • {funcionario.setor}</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-full max-w-lg print:hidden">
        <button
          onClick={() => setActiveTab('dados')}
          className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'dados' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <User className="w-4 h-4 mr-2" />
          Ficha Cadastral
        </button>
        <button
          onClick={() => setActiveTab('epis')}
          className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'epis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Shield className="w-4 h-4 mr-2" />
          Histórico EPI
        </button>
        <button
          onClick={() => setActiveTab('folgas')}
          className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'folgas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Folgas
        </button>
      </div>

      {activeTab === 'dados' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="w-5 h-5 mr-2 text-[#B69D74]" />
              Ficha Cadastral
            </h3>
            <div className="flex gap-2 print:hidden">
              <button 
                onClick={() => window.print()}
                className="text-slate-600 hover:text-slate-900 flex items-center text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Imprimir
              </button>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-slate-600 hover:text-slate-900 flex items-center text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" /> Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsEditing(false); setFormData(funcionario); }}
                    className="text-slate-600 hover:text-slate-900 flex items-center text-sm font-medium px-3 py-1.5"
                  >
                    <X className="w-4 h-4 mr-1.5" /> Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className="bg-emerald-600 text-white flex items-center text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Salvar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 border-b border-slate-100 pb-4 mb-2">
              <h4 className="font-bold text-slate-700 text-sm">Dados Principais</h4>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
              {isEditing ? <input name="nome" value={formData.nome} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.nome}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF</label>
              {isEditing ? <input name="cpf" value={formData.cpf || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.cpf || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">RG</label>
              {isEditing ? <input name="rg" value={formData.rg || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.rg || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Emissão RG</label>
              {isEditing ? <input type="date" name="rgEmissao" value={formData.rgEmissao || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.rgEmissao ? new Date(funcionario.rgEmissao).toLocaleDateString() : '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Órgão / UF (RG)</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input name="rgOrgao" placeholder="Órgão" value={formData.rgOrgao || ''} onChange={handleChange} className="w-2/3 p-2 border rounded" />
                  <input name="rgUF" placeholder="UF" maxLength={2} value={formData.rgUF || ''} onChange={handleChange} className="w-1/3 p-2 border rounded" />
                </div>
              ) : <p className="font-medium">{funcionario.rgOrgao || '-'} / {funcionario.rgUF || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Nascimento</label>
              {isEditing ? <input type="date" name="dataNascimento" value={formData.dataNascimento || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.dataNascimento ? new Date(funcionario.dataNascimento).toLocaleDateString() : '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CTPS</label>
              {isEditing ? <input name="ctps" value={formData.ctps || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.ctps || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">PIS</label>
              {isEditing ? <input name="pis" value={formData.pis || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.pis || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado Civil</label>
              {isEditing ? (
                <select name="estadoCivil" value={formData.estadoCivil || ''} onChange={handleChange as any} className="w-full p-2 border rounded">
                  <option value="">Selecione</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              ) : <p className="font-medium">{funcionario.estadoCivil || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cônjuge</label>
              {isEditing ? <input name="conjugue" value={formData.conjugue || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.conjugue || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Grau de Instrução</label>
              {isEditing ? <input name="grauInstrucao" value={formData.grauInstrucao || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.grauInstrucao || '-'}</p>}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Filiação</label>
              {isEditing ? <input name="filiacao" value={formData.filiacao || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.filiacao || '-'}</p>}
            </div>
            
            <div className="lg:col-span-3 border-b border-slate-100 pb-4 mt-4 mb-2">
              <h4 className="font-bold text-slate-700 text-sm">Contrato</h4>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Primeiro Emprego?</label>
              {isEditing ? (
                <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={formData.primeiroEmprego || false} onChange={e => setFormData(prev => ({...prev, primeiroEmprego: e.target.checked}))} className="w-4 h-4 rounded border-slate-300" />
                  <span>Sim, primeiro emprego</span>
                </label>
              ) : <p className="font-medium">{funcionario.primeiroEmprego ? 'Sim' : 'Não'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Dias de Experiência</label>
              {isEditing ? <input type="number" placeholder="Ex: 90" onChange={(e) => {
                const dias = parseInt(e.target.value);
                if (!isNaN(dias) && formData.admissao) {
                  const date = new Date(formData.admissao + 'T00:00:00');
                  date.setDate(date.getDate() + dias);
                  setFormData(prev => ({ ...prev, contratoExperiencia: date.toISOString().split('T')[0] }));
                }
              }} className="w-full p-2 border rounded" /> : <p className="font-medium">-</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Validade Experiência</label>
              {isEditing ? <input type="date" name="contratoExperiencia" value={formData.contratoExperiencia || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.contratoExperiencia ? new Date(funcionario.contratoExperiencia + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>}
            </div>
            
            <div className="lg:col-span-3 border-b border-slate-100 pb-4 mt-4 mb-2">
              <h4 className="font-bold text-slate-700 text-sm">Endereço e Contato</h4>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CEP</label>
              {isEditing ? <input name="cep" value={formData.cep || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.cep || '-'}</p>}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço / Rua</label>
              {isEditing ? <input name="endereco" value={formData.endereco || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.endereco || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Número / Comp.</label>
              {isEditing ? <input name="numero" value={formData.numero || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.numero || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cidade</label>
              {isEditing ? <input name="cidade" value={formData.cidade || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.cidade || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
              {isEditing ? <input name="estado" maxLength={2} value={formData.estado || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.estado || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Telefone</label>
              {isEditing ? <input name="telefone" value={formData.telefone || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.telefone || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contato de Emergência</label>
              {isEditing ? <input name="contatoEmergencia" value={formData.contatoEmergencia || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.contatoEmergencia || '-'}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Salário Base</label>
              {isEditing ? <input name="salarioBase" value={formData.salarioBase || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.salarioBase ? `R$ ${funcionario.salarioBase}` : '-'}</p>}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Dados Bancários</label>
              {isEditing ? <input name="dadosBancarios" value={formData.dadosBancarios || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.dadosBancarios || '-'}</p>}
            </div>
            
            <div className="lg:col-span-3 mt-4 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-700 mb-4">Tamanhos (Fardamento)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Calça</label>
                  {isEditing ? <input name="tamanhoCalca" value={formData.tamanhoCalca || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.tamanhoCalca || '-'}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Camisa</label>
                  {isEditing ? <input name="tamanhoCamisa" value={formData.tamanhoCamisa || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.tamanhoCamisa || '-'}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bota</label>
                  {isEditing ? <input name="tamanhoBota" value={formData.tamanhoBota || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.tamanhoBota || '-'}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cinto</label>
                  {isEditing ? <input name="tamanhoCinto" value={formData.tamanhoCinto || ''} onChange={handleChange} className="w-full p-2 border rounded" /> : <p className="font-medium">{funcionario.tamanhoCinto || '-'}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'epis' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-semibold flex items-center text-slate-800">
              <Shield className="w-5 h-5 mr-2 text-green-600" />
              Histórico de Entregas
            </h3>
            <button className="bg-slate-900 text-white flex items-center text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <Printer className="w-4 h-4 mr-1.5" /> Emitir Nova Ficha
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Data Documento</th>
                  <th className="p-4 font-semibold">Qtd. Itens</th>
                  <th className="p-4 font-semibold">EPIs</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {epis.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum EPI registrado no histórico.</td></tr>
                ) : (
                  epis.map(epi => (
                    <tr key={epi.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm font-medium">{new Date(epi.geradoEm).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">{epi.quantidade}</td>
                      <td className="p-4 text-sm">{epi.descricao} (CA: {epi.ca})</td>
                      <td className="p-4 text-right">
                        <button className="text-red-500 hover:bg-red-50 p-2 rounded">Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'folgas' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <p className="text-slate-500 text-center py-8">Gestão de Folgas do colaborador (Módulo sendo carregado...)</p>
        </div>
      )}

    </div>
  );
}