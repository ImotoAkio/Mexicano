import React, { useState, useEffect, useRef } from 'react';
import { Funcionario, CatalogoEpi, EpiEntrega } from '../types';
import { funcionarioDB, epiDB, catalogoEpiDB, historicoEpiDB } from '../db';
import { Shield, Printer, Plus, Trash2, Calendar, FileText, Briefcase, User, Settings, X, CheckSquare, Clock, Check } from 'lucide-react';

export default function ControleEpiPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string>('');
  const [epiList, setEpiList] = useState<EpiEntrega[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogoEpi[]>([]);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAddEpiModalOpen, setIsAddEpiModalOpen] = useState(false);
  
  // For Catalog management modal
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogCA, setNewCatalogCA] = useState('');
  
  // For Add EPIs modal
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());

  // For History modal
  const [epiWithHistory, setEpiWithHistory] = useState<EpiEntrega | null>(null);

  // Dados fixos da empresa
  const EMPRESA = "C L S DE CASTRO VILA NÁUTICA VELHO CHICO";
  const CNPJ = "65.614.161/0001-10";

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = () => {
    const list = funcionarioDB.getAll();
    setFuncionarios(list);
    setCatalogItems(catalogoEpiDB.getAll());
  };

  useEffect(() => {
    if (selectedFuncId) {
      const savedEpis = epiDB.getByFuncionarioId(selectedFuncId);
      setEpiList(savedEpis || []);
    } else {
      setEpiList([]);
    }
  }, [selectedFuncId]);

  // Catalog Management
  const handleAddCatalogItem = async () => {
    if (!newCatalogName) return;
    await catalogoEpiDB.create({ nome: newCatalogName, caPadrao: newCatalogCA });
    setNewCatalogName('');
    setNewCatalogCA('');
    setCatalogItems(catalogoEpiDB.getAll());
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if(confirm('Tem certeza que deseja remover este EPI do catálogo?')) {
      await catalogoEpiDB.delete(id);
      setCatalogItems(catalogoEpiDB.getAll());
    }
  };

  // Fixed List Management
  const openAddEpiModal = () => {
    setSelectedCatalogIds(new Set());
    setIsAddEpiModalOpen(true);
  };

  const toggleCatalogSelection = (id: string) => {
    const newSet = new Set(selectedCatalogIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCatalogIds(newSet);
  };

  const selectAllCatalog = () => {
    if (selectedCatalogIds.size === catalogItems.length) {
      setSelectedCatalogIds(new Set()); // deselect all
    } else {
      setSelectedCatalogIds(new Set(catalogItems.map(c => c.id)));
    }
  };

  const handleAddSelectedEpis = async () => {
    if (!selectedFuncId) return;
    const newEpis: EpiEntrega[] = [];
    
    for (const catId of Array.from(selectedCatalogIds)) {
      const catItem = catalogItems.find(c => c.id === catId);
      if (!catItem) continue;
      
      const newEpi: any = {
        id: `epi_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        funcionarioId: selectedFuncId,
        quantidade: '1',
        descricao: catItem.nome,
        ca: catItem.caPadrao || '',
        dataEntrega: '',
        dataDevolucao: '',
        status: 'pendente',
        geradoEm: new Date().toISOString()
      };
      
      const saved = await epiDB.create(selectedFuncId, newEpi);
      if (saved) newEpis.push(saved);
    }
    
    setEpiList([...epiList, ...newEpis]);
    setIsAddEpiModalOpen(false);
  };

  const handleRemoveEpi = async (id: string) => {
    if(confirm('Remover este item da lista do funcionário?')) {
      await epiDB.delete(id);
      setEpiList(epiList.filter(item => item.id !== id));
    }
  };

  const handleEntregar = async (epi: EpiEntrega) => {
    const dataEntrega = prompt('Data de Entrega (DD/MM/AAAA):', new Date().toLocaleDateString('pt-BR'));
    if (!dataEntrega) return;
    
    let formattedDate = dataEntrega;
    if (dataEntrega.includes('/')) {
      const [d, m, y] = dataEntrega.split('/');
      formattedDate = `${y}-${m}-${d}`;
    }

    const ca = prompt('C.A. do Equipamento:', epi.ca);
    
    const updatedEpi = {
      ...epi,
      dataEntrega: formattedDate,
      ca: ca || epi.ca,
      status: 'em_uso' as const
    };

    const saved = await epiDB.create(selectedFuncId, updatedEpi);
    if (saved) {
      setEpiList(epiList.map(item => item.id === epi.id ? saved : item));
    }
  };

  const handleDevolver = async (epi: EpiEntrega) => {
    const dataDevolucao = prompt('Data de Devolução (DD/MM/AAAA):', new Date().toLocaleDateString('pt-BR'));
    if (!dataDevolucao) return;

    let formattedDate = dataDevolucao;
    if (dataDevolucao.includes('/')) {
      const [d, m, y] = dataDevolucao.split('/');
      formattedDate = `${y}-${m}-${d}`;
    }

    const updatedEpi = {
      ...epi,
      dataDevolucao: formattedDate,
      status: 'devolvido' as const
    };

    const saved = await epiDB.create(selectedFuncId, updatedEpi);
    if (saved) {
      setEpiList(epiList.map(item => item.id === epi.id ? saved : item));
    }
  };

  const handleSubstituir = async (epi: EpiEntrega) => {
    const dataDevolucao = prompt('Qual a data que o equipamento VELHO foi devolvido? (DD/MM/AAAA):', new Date().toLocaleDateString('pt-BR'));
    if (!dataDevolucao) return;

    const dataEntrega = prompt('Qual a data que o NOVO equipamento está sendo entregue? (DD/MM/AAAA):', new Date().toLocaleDateString('pt-BR'));
    if (!dataEntrega) return;

    const ca = prompt('Qual o C.A. do NOVO Equipamento:', epi.ca);

    let formatDev = dataDevolucao;
    if (dataDevolucao.includes('/')) formatDev = dataDevolucao.split('/').reverse().join('-');
    
    let formatEnt = dataEntrega;
    if (dataEntrega.includes('/')) formatEnt = dataEntrega.split('/').reverse().join('-');

    const trocaRecord = {
      ca: epi.ca,
      dataEntrega: epi.dataEntrega,
      dataDevolucao: formatDev
    };

    const updatedEpi = {
      ...epi,
      dataEntrega: formatEnt,
      dataDevolucao: '',
      ca: ca || epi.ca,
      status: 'em_uso' as const,
      historicoTrocas: [...(epi.historicoTrocas || []), trocaRecord]
    };

    const saved = await epiDB.create(selectedFuncId, updatedEpi);
    if (saved) {
      setEpiList(epiList.map(item => item.id === epi.id ? saved : item));
    }
  };

  const selectedFunc = funcionarios.find(f => f.id === selectedFuncId);

  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = async () => {
    if (!selectedFunc || epiList.length === 0) {
      alert("Selecione um funcionário e adicione EPIs na lista dele primeiro.");
      return;
    }
    
    setIsSaving(true);
    try {
      // Save Monthly Log
      const mesAno = new Date().toISOString().substring(0, 7); // YYYY-MM
      await historicoEpiDB.create(selectedFuncId, {
        id: `hist_epi_${Date.now()}`,
        mesAno,
        dadosSnapshot: JSON.stringify(epiList)
      });
      
    } catch(e) {
      console.error('Error saving EPI log', e);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header visível apenas na tela */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Controle de Entrega de EPI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie a posse de EPIs e imprima a ficha mensal do funcionário.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/simulador-epi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm border border-slate-200"
          >
            Fichas Antigas (Simulador)
          </a>
          <button 
          onClick={handlePrint}
          disabled={!selectedFunc || isSaving || epiList.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Printer className="w-4 h-4" />
          {isSaving ? 'Registrando Log...' : 'Gerar Ficha Mensal'}
        </button>
      </div>
    </div>

      {/* Conteúdo principal na tela */}
      <div className="flex-1 overflow-y-auto p-6 z-10">
        <div className="max-w-5xl mx-auto space-y-6">
          
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

          {/* Lista de EPIs do Funcionário */}
          {selectedFuncId && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
               
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Lista Fixa de EPIs (Histórico)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Gerencie os equipamentos exigidos para o setor deste colaborador.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Catálogo Geral
                  </button>
                  <button 
                    onClick={openAddEpiModal}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm px-4 py-2 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Equipamentos
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {epiList.map((epi) => (
                  <div key={epi.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors group">
                    <div className="col-span-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Descrição do EPI</div>
                      <div className="text-sm font-semibold text-slate-800">{epi.descricao}</div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">C.A.</div>
                      <div className="text-sm text-slate-600">{epi.ca || '-'}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Status</div>
                      <div className="flex items-center">
                        {epi.status === 'pendente' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Pendente</span>}
                        {epi.status === 'em_uso' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Em Uso</span>}
                        {epi.status === 'devolvido' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Devolvido</span>}
                      </div>
                    </div>

                    <div className="col-span-3 flex justify-end gap-2">
                      {epi.status === 'pendente' && (
                        <button onClick={() => handleEntregar(epi)} className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                          Registrar Entrega
                        </button>
                      )}
                      {epi.status === 'em_uso' && (
                        <>
                          <button onClick={() => handleSubstituir(epi)} className="text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                            Substituir
                          </button>
                          <button onClick={() => handleDevolver(epi)} className="text-xs font-medium bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                            Devolver
                          </button>
                        </>
                      )}
                      {epi.status === 'devolvido' && (
                        <button onClick={() => handleEntregar(epi)} className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm" title="Entregar novo item">
                          Nova Entrega
                        </button>
                      )}
                    </div>
                    
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => handleRemoveEpi(epi.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Linha de Datas (Embaixo) se já entregou */}
                    {(epi.dataEntrega || epi.dataDevolucao || (epi.historicoTrocas && epi.historicoTrocas.length > 0)) && (
                      <div className="col-span-12 flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                        <div className="flex gap-6">
                          {epi.dataEntrega && (
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">Entregue em:</span> {epi.dataEntrega.split('-').reverse().join('/')}
                            </div>
                          )}
                          {epi.dataDevolucao && (
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">Devolvido em:</span> {epi.dataDevolucao.split('-').reverse().join('/')}
                            </div>
                          )}
                        </div>
                        {epi.historicoTrocas && epi.historicoTrocas.length > 0 && (
                          <button onClick={() => setEpiWithHistory(epi)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Ver Histórico ({epi.historicoTrocas.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {epiList.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                    <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-600 mb-1">A lista está vazia</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">Adicione os EPIs necessários para o setor deste colaborador para iniciar o controle.</p>
                    <button onClick={openAddEpiModal} className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                      Adicionar Equipamentos
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
            {Array.from({ length: Math.max(7, epiList.length) }).map((_, i) => {
              const item = epiList[i];
              return (
                <tr key={item ? item.id : `empty-${i}`} className="even:bg-emerald-50/20">
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900 font-medium">{item?.quantidade || ''}</td>
                  <td className="border border-emerald-700 p-1 text-[11px] h-7 text-emerald-900">{item?.descricao || ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.ca || ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataEntrega ? item.dataEntrega.split('-').reverse().join('/') : ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataDevolucao ? item.dataDevolucao.split('-').reverse().join('/') : ''}</td>
                  <td className="border border-emerald-700 p-1 text-center text-[10px] h-7 text-emerald-900 font-bold uppercase">{item ? (item.status === 'em_uso' ? 'Em Uso' : item.status === 'pendente' ? 'Pendente' : 'Devolvido') : ''}</td>
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
      
      {/* Modal Adicionar EPIs da Lista */}
      {isAddEpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Adicionar à Lista Fixa
                </h2>
                <p className="text-xs text-slate-500 mt-1">Selecione os EPIs necessários para este funcionário.</p>
              </div>
              <button onClick={() => setIsAddEpiModalOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-700">{selectedCatalogIds.size} selecionados</span>
                <button onClick={selectAllCatalog} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  {selectedCatalogIds.size === catalogItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
              
              <div className="space-y-2">
                {catalogItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedCatalogIds.has(item.id)}
                      onChange={() => toggleCatalogSelection(item.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{item.nome}</div>
                      {item.caPadrao && <div className="text-xs text-slate-500">C.A. Padrão: {item.caPadrao}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddEpiModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddSelectedEpis}
                disabled={selectedCatalogIds.size === 0}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                Adicionar Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Catálogo EPI */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                Gerenciar Catálogo Geral de EPIs
              </h2>
              <button onClick={() => setIsCatalogModalOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-emerald-800 mb-3">Adicionar Novo EPI ao Catálogo</h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Descrição</label>
                    <input 
                      type="text" 
                      value={newCatalogName}
                      onChange={e => setNewCatalogName(e.target.value)}
                      placeholder="Ex: Luva de Raspa"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">CA Padrão (Opcional)</label>
                    <input 
                      type="text" 
                      value={newCatalogCA}
                      onChange={e => setNewCatalogCA(e.target.value)}
                      placeholder="Ex: 12345"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <button 
                    onClick={handleAddCatalogItem}
                    disabled={!newCatalogName}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">EPIs Cadastrados ({catalogItems.length})</h3>
                {catalogItems.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-slate-100">Nenhum EPI cadastrado.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">Nome / Descrição</th>
                          <th className="px-4 py-3 font-medium">CA Padrão</th>
                          <th className="px-4 py-3 text-right font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {catalogItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.nome}</td>
                            <td className="px-4 py-3 text-slate-600">{item.caPadrao || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handleDeleteCatalogItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button 
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico de Trocas */}
      {epiWithHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Histórico de Trocas
                </h2>
                <p className="text-xs text-slate-500 mt-1">{epiWithHistory.descricao}</p>
              </div>
              <button onClick={() => setEpiWithHistory(null)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {epiWithHistory.historicoTrocas?.map((troca, index) => (
                  <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold uppercase text-slate-400">C.A. {troca.ca || 'N/A'}</div>
                        <div className="text-xs font-medium text-slate-500">Troca #{index + 1}</div>
                      </div>
                      <div className="text-sm text-slate-700">
                        <p><span className="font-semibold">Entregue:</span> {troca.dataEntrega ? troca.dataEntrega.split('-').reverse().join('/') : '?'}</p>
                        <p><span className="font-semibold">Devolvido:</span> {troca.dataDevolucao ? troca.dataDevolucao.split('-').reverse().join('/') : '?'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button 
                onClick={() => setEpiWithHistory(null)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
