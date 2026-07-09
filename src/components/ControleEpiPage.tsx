import React, { useState, useEffect, useRef } from 'react';
import { Funcionario } from '../types';
import { funcionarioDB, epiDB } from '../db';
import { Shield, Printer, Plus, Trash2, Calendar, FileText, Briefcase, User } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EPIItem {
  id: string;
  quantidade: string;
  descricao: string;
  ca: string;
  dataEntrega: string;
  dataDevolucao: string;
}

export default function ControleEpiPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string>('');
  const [epiList, setEpiList] = useState<EPIItem[]>([
    { id: Date.now().toString(), quantidade: '1', descricao: '', ca: '', dataEntrega: '', dataDevolucao: '' }
  ]);
  
  // Dados fixos da empresa
  const EMPRESA = "C L S DE CASTRO MARINA CLUB VELHO CHICO";
  const CNPJ = "65.614.161/0001-10";

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = () => {
    const list = funcionarioDB.getAll();
    setFuncionarios(list);
  };

  useEffect(() => {
    if (selectedFuncId) {
      const savedEpis = epiDB.getByFuncionarioId(selectedFuncId);
      if (savedEpis && savedEpis.length > 0) {
        setEpiList(savedEpis);
      } else {
        setEpiList([{ id: Date.now().toString(), quantidade: '1', descricao: '', ca: '', dataEntrega: '', dataDevolucao: '' }]);
      }
    } else {
      setEpiList([{ id: Date.now().toString(), quantidade: '1', descricao: '', ca: '', dataEntrega: '', dataDevolucao: '' }]);
    }
  }, [selectedFuncId]);

  
  const commonEPIs = [
    "Óculos de Segurança Escuro",
    "Óculos de Segurança Incolor",
    "Chapéu de Proteção (Árabe)",
    "Luva Nitrílica (Borracha)",
    "Luva de Malha (Algodão)",
    "Calçado Sapatilha Náutica",
    "Calça Térmica",
    "Camisa Proteção Solar UV",
    "Protetor Auditivo"
  ];

  const handleQuickAdd = (descricao: string) => {
    const emptyIndex = epiList.findIndex(e => !e.descricao && !e.ca && !e.dataEntrega);
    if (emptyIndex >= 0) {
       const newList = [...epiList];
       newList[emptyIndex].descricao = descricao;
       setEpiList(newList);
    } else {
      setEpiList([...epiList, { id: Date.now().toString() + Math.random(), quantidade: '1', descricao, ca: '', dataEntrega: '', dataDevolucao: '' }]);
    }
  };

  const handleAddEpi = () => {
    setEpiList([
      ...epiList,
      { id: Date.now().toString(), quantidade: '1', descricao: '', ca: '', dataEntrega: '', dataDevolucao: '' }
    ]);
  };

  const handleRemoveEpi = (id: string) => {
    setEpiList(epiList.filter(item => item.id !== id));
  };

  const handleUpdateEpi = (id: string, field: keyof EPIItem, value: string) => {
    setEpiList(epiList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const selectedFunc = funcionarios.find(f => f.id === selectedFuncId);

  
  

  
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = async () => {
    if (!selectedFunc) return;
    setIsSaving(true);
    try {
      for (const epi of epiList) {
        if (epi.descricao || epi.ca || epi.dataEntrega) {
          await epiDB.create(selectedFuncId, {
            id: epi.id,
            quantidade: epi.quantidade,
            descricao: epi.descricao,
            ca: epi.ca,
            dataEntrega: epi.dataEntrega,
            dataDevolucao: epi.dataDevolucao
          });
        }
      }
      
      // Reset after save
      setEpiList([{ id: Date.now().toString(), quantidade: '1', descricao: '', ca: '', dataEntrega: '', dataDevolucao: '' }]);
    } catch(e) {
      console.error('Error saving EPIs', e);
    }
    setIsSaving(false);

    const element = document.getElementById('print-section');
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups neste site para imprimir.');
      return;
    }
    
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');
      
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Controle de EPI</title>
          ${styles}
          <style>
            body { background: white; margin: 0; padding: 0; }
            #print-section { 
              position: static !important; 
              width: 100% !important; 
              z-index: 1 !important; 
              display: block !important; 
            }
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const episForPrint = epiList.filter(epi => {
    if (!epi.dataDevolucao) return true;
    const devMonth = epi.dataDevolucao.substring(0, 7);
    return devMonth === currentMonthPrefix;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header visível apenas na tela */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Controle de Entrega de EPI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gere e imprima a ficha de controle de Equipamentos de Proteção Individual.</p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={!selectedFunc || isSaving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Printer className="w-4 h-4" />
          {isSaving ? 'Salvando e Gerando...' : 'Imprimir Ficha'}
        </button>
      </div>

      {/* Conteúdo principal na tela */}
      <div className="flex-1 overflow-y-auto p-6 z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Seleção de Funcionário */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Selecione o Colaborador
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <select 
                  value={selectedFuncId} 
                  onChange={e => setSelectedFuncId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 font-medium transition-shadow"
                >
                  <option value="">Selecione um colaborador...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>
                  ))}
                </select>
              </div>

              {selectedFunc && (
                <>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200"><FileText className="w-4 h-4 text-slate-400"/></div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">CPF</div>
                      <div className="text-sm font-medium text-slate-700">{selectedFunc.cpf || 'Não informado'}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200"><Briefcase className="w-4 h-4 text-slate-400"/></div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Cargo</div>
                      <div className="text-sm font-medium text-slate-700">{selectedFunc.cargo || 'Não informado'}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200"><Calendar className="w-4 h-4 text-slate-400"/></div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Admissão</div>
                      <div className="text-sm font-medium text-slate-700">{selectedFunc.admissao ? selectedFunc.admissao.split('-').reverse().join('/') : 'Não informada'}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200"><User className="w-4 h-4 text-slate-400"/></div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Setor</div>
                      <div className="text-sm font-medium text-slate-700">{selectedFunc.setor || 'Não informado'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de EPIs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
             
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Equipamentos (EPIs)
              </h2>
              <button 
                onClick={handleAddEpi}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar EPI
              </button>
            </div>

            
            
            
            <div className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Adição Rápida (Clique para adicionar)</p>
              <div className="flex flex-wrap gap-2">
                {commonEPIs.map(epi => (
                  <button
                    key={epi}
                    onClick={() => handleQuickAdd(epi)}
                    className="text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
                  >
                    + {epi}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {epiList.map((epi, index) => (
                <div key={epi.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-blue-200 transition-colors group">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qtd</label>
                    <input type="number" min="1" value={epi.quantidade} onChange={e => handleUpdateEpi(epi.id, 'quantidade', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição do EPI</label>
                    <input type="text" placeholder="Ex: Luva de segurança, Capacete..." value={epi.descricao} onChange={e => handleUpdateEpi(epi.id, 'descricao', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">C.A.</label>
                    <input type="text" placeholder="Número do CA" value={epi.ca} onChange={e => handleUpdateEpi(epi.id, 'ca', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Entrega</label>
                    <input type="date" value={epi.dataEntrega} onChange={e => handleUpdateEpi(epi.id, 'dataEntrega', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Devolução</label>
                    <input type="date" value={epi.dataDevolucao} onChange={e => handleUpdateEpi(epi.id, 'dataDevolucao', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                    <div className="flex items-center justify-center h-[34px]">
                      {epi.dataDevolucao ? (
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">Devolvido</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">Em Uso</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center mt-4">
                    <button onClick={() => handleRemoveEpi(epi.id)} disabled={epiList.length === 1} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {epiList.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                  Nenhum EPI adicionado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW DE IMPRESSÃO (Oculta na tela normal, visível apenas no @media print) */}
      <div id="print-section" className="absolute left-[-9999px] top-0 w-[794px] bg-white p-8 font-sans text-black z-[-10] print:!text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4 border-b-2 border-emerald-700 pb-3">
          <div className="w-24">
            <img src="/cipa.png" alt="CIPA" className="w-16 h-16 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div className="text-center flex-1 px-2">
            <h1 className="text-xl font-bold uppercase mb-1 tracking-wider text-emerald-800">Ficha de Controle e Termo de Posse Mensal de EPI</h1>
            <p className="text-[10px] font-bold uppercase bg-emerald-700 text-white inline-block px-3 py-0.5 mt-1">
              (Com base na CLT e nas Normas Regulamentadoras NR 01 e NR 16, do MTE)
            </p>
          </div>
          <div className="w-24 flex justify-end">
            <img src="/assets/vale_nauticos_logo_1780256879963-XjhI_CnN.png" alt="Logo" className="w-16 h-16 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
        </div>

        {/* Dados da Empresa e Colaborador */}
        <div className="border-2 border-emerald-700 mb-4 rounded-sm overflow-hidden">
          <div className="grid grid-cols-12 border-b border-emerald-700">
            <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center bg-emerald-50/30">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Empresa:</span>
              <span className="text-xs uppercase font-medium">{EMPRESA}</span>
            </div>
            <div className="col-span-4 p-1.5 flex items-center bg-emerald-50/30">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">CNPJ:</span>
              <span className="text-xs font-medium">{CNPJ}</span>
            </div>
          </div>
          <div className="grid grid-cols-12 border-b border-emerald-700">
            <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Colaborador:</span>
              <span className="text-xs uppercase font-medium">{selectedFunc?.nome || ''}</span>
            </div>
            <div className="col-span-4 p-1.5 flex items-center">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">CPF:</span>
              <span className="text-xs font-medium">{selectedFunc?.cpf || ''}</span>
            </div>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center bg-emerald-50/30">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Cargo:</span>
              <span className="text-xs uppercase font-medium">{selectedFunc?.cargo || ''}</span>
            </div>
            <div className="col-span-4 p-1.5 flex items-center bg-emerald-50/30">
              <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Admissão:</span>
              <span className="text-xs font-medium">{selectedFunc?.admissao ? selectedFunc.admissao.split('-').reverse().join('/') : ''}</span>
            </div>
          </div>
        </div>

        {/* Tabela de EPIs */}
        <table className="w-full border-2 border-emerald-700 mb-4 text-sm rounded-sm">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="border border-emerald-700 p-1 text-center w-12 text-[10px] uppercase leading-tight">Qtd</th>
              <th className="border border-emerald-700 p-1 text-center text-[10px] uppercase leading-tight">Descrição do Equipamento de Proteção Individual (EPI)</th>
              <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">C.A.</th>
              <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">Entrega</th>
              <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">Devol.</th>
              <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">Status</th>
              <th className="border border-emerald-700 p-1 text-center w-24 text-[10px] uppercase leading-tight">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(7, episForPrint.length) }).map((_, i) => {
              const item = episForPrint[i];
              return (
                <tr key={item ? item.id : `empty-${i}`} className="even:bg-emerald-50/20">
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900 font-medium">{item?.quantidade || ''}</td>
                  <td className="border border-emerald-700 p-1 text-[11px] h-7 text-emerald-900">{item?.descricao || ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.ca || ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataEntrega ? item.dataEntrega.split('-').reverse().join('/') : ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataDevolucao ? item.dataDevolucao.split('-').reverse().join('/') : ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[10px] h-7 text-emerald-900 font-bold uppercase">{item ? (item.dataDevolucao ? 'Devolvido' : 'Em Uso') : ''}</td>
                  <td className="border border-emerald-700 p-1 text-center h-7"></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Termo de Responsabilidade */}
        <div className="text-[9px] leading-tight text-justify space-y-1 mb-6 mt-2">
          <h3 className="font-bold text-center text-[11px] mb-2">Declaro estar de posse e ter recebido treinamento quanto ao uso dos EPIs listados como "Em Uso".</h3>
          <p className="font-bold uppercase mb-2 text-[8px]">DECLARO PARA TODOS EFEITOS LEGAIS QUE ESTOU EM POSSE E/OU RECEBI OS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSTANTES NA LISTA ACIMA COMO "EM USO", EM PERFEITAS CONDIÇÕES DE USO, E QUE ESTOU CIENTE DAS OBRIGAÇÕES DESCRITAS NA NR 06, BAIXADA PELA PORTARIA MTB 3214/78, SUB-ITEM 6.7, A SABER:</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold mb-1">NR 06: 6.6 Responsabilidades do trabalhador.</p>
              <p>a) usar o fornecido pela organização, observado o disposto no item 6.5.2;</p>
              <p>b) utilizar apenas para a finalidade a que se destina;</p>
              <p>c) responsabilizar-se pela limpeza, guarda e conservação;</p>
              <p>d) comunicar à organização quando extraviado, danificado ou qualquer alteração que o torne impróprio para uso; e</p>
              <p>e) cumprir as determinações da organização sobre o uso adequado.</p>
            </div>
            <div>
              <p className="font-bold uppercase text-[8px] mb-2">DECLARO AINDA QUE ESTOU CIENTE DAS DISPOSIÇÕES DO ARTIGO 158, ALÍNEA 'A', DA CLT, E DO ITEM 1.8 DA NR 01, EM ESPECIAL DAQUELA DO SUBITEM 1.8.1.</p>
              <p className="font-bold mb-1">NR 01: 1.4.2 Cabe ao trabalhador:</p>
              <p>a) cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho;</p>
              <p>b) submeter-se aos exames médicos previstos nas NR;</p>
              <p>c) colaborar com a organização na aplicação das NR; e usar o EPI fornecido.</p>
              <p>1.4.2.1 Constitui ato faltoso a recusa injustificada do empregado.</p>
            </div>
          </div>

          <p className="mt-2 font-medium">Declaro, também, que estou ciente das disposições do Art. 462 e § 1º da CLT, e autorizo o desconto salarial proporcional aos custos de reparação do dano que os EPI's aos meus cuidados venham apresentar. (CLT, Art. 462 e § 1º - em caso de dano causado pelo empregado, o desconto será lícito).</p>
        </div>

        {/* Assinaturas */}
        <div className="mt-12 pt-6">
          <div className="flex justify-between items-end px-8">
            <div className="w-[40%] text-center border-t border-emerald-700 pt-1">
              <span className="font-bold uppercase text-[10px] text-emerald-900">(Assinatura do colaborador)</span>
            </div>
            
            <div className="w-[40%] text-center border-t border-emerald-700 pt-1">
              <span className="font-bold uppercase text-[10px] text-emerald-900">(Assinatura do responsável)</span>
            </div>
          </div>
          <div className="text-center mt-8 text-emerald-900">
             <span className="text-[11px] font-medium">_____________________________ de ___________________________________ de 20________</span>
          </div>
        </div>

      </div>
    </div>
  );
}
