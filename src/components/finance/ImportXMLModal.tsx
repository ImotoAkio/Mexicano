import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle, XCircle, ArrowRight, AlertTriangle, ChevronLeft, ChevronRight, AlertCircle, EyeOff, Eye, FileSpreadsheet } from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../../types';
import Select from 'react-select';

interface ImportXMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  clientes: Cliente[];
  embarcacoes: Embarcacao[];
}

type Step = 'upload' | 'mapping' | 'review';

interface ColumnMapping {
  cliente: string;
  valor: string;
  data: string;
  status?: string;
  descricao?: string;
}

interface PreviewRow {
  _originalRow: any;
  clienteNome: string;
  clienteIdEncontrado?: string;
  valor: number;
  dataVencimento: string;
  status: TransacaoFinanceira['status'];
  categoria: string;
  descricao: string;
  ignored?: boolean;
}

export default function ImportXMLModal({ isOpen, onClose, onImportSuccess, clientes, embarcacoes }: ImportXMLModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [mapping, setMapping] = useState<ColumnMapping>({
    cliente: '', valor: '', data: '', status: '', descricao: ''
  });
  
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  type FilterMode = 'all' | 'pending' | 'ready' | 'missing_client' | 'missing_category' | 'ignored';
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [importMode, setImportMode] = useState<'append' | 'overwrite_clients' | 'overwrite_all'>('overwrite_clients');

  // Load saved mapping on mount
  useEffect(() => {
    const saved = localStorage.getItem('nautical_csv_mapping');
    if (saved) {
      try { setMapping(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Keyboard shortcuts for quick navigation and category selection
  useEffect(() => {
    if (step !== 'review' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      
      if (isTyping) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentReviewIndex(prev => Math.min(previewRows.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentReviewIndex(prev => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleUpdatePreviewRow(currentReviewIndex, { categoria: 'Mensalidade' });
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleUpdatePreviewRow(currentReviewIndex, { categoria: 'Serviço' });
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleUpdatePreviewRow(currentReviewIndex, { categoria: 'Parcela de Cota' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isOpen, currentReviewIndex, previewRows.length]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of arrays
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (rawData.length === 0) {
          alert("O arquivo parece estar vazio.");
          return;
        }

        // Try automatic parsing for FastReport XML format first
        let clientIdx = 4;
        let tipoIdx = 18;
        let docIdx = 24;
        let dateVencIdx = 42;
        let valorIdx = 48;
        let valorTotalIdx = 59;

        // Scan first 40 rows to locate header columns dynamically
        for (let i = 0; i < Math.min(40, rawData.length); i++) {
          const row = rawData[i] || [];
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().trim();
            if (cellVal === 'nome') clientIdx = j;
            else if (cellVal === 'tipo') tipoIdx = j;
            else if (cellVal === 'doc/prc') docIdx = j;
            else if (cellVal === 'data venc' || cellVal === 'data venc.') dateVencIdx = j;
            else if (cellVal === 'valor título' || cellVal === 'valor titulo' || cellVal === 'valor tit.') valorIdx = j;
            else if (cellVal === 'valor total') valorTotalIdx = j;
          }
        }

        const autoParsedRows: PreviewRow[] = [];
        let currentClientName = '';

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i] || [];
          
          const clientCell = row[clientIdx];
          const docTypeCell = row[tipoIdx];
          const docNumCell = row[docIdx];
          const dateVencCell = row[dateVencIdx];
          const valorCell = row[valorIdx];

          // If there's a client name cell, update the current client context
          if (clientCell && typeof clientCell === 'string' && clientCell.trim() !== '' && clientCell.trim().toUpperCase() !== 'NOME') {
            currentClientName = clientCell.trim();
          }

          if (dateVencCell && valorCell && currentClientName && currentClientName.toUpperCase() !== 'NOME') {
            const dateStr = String(dateVencCell).trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            
            let isValidDate = false;
            let parsedData = '';
            
            if (typeof dateVencCell === 'number') {
              // Excel date serial number
              const dateObj = new Date(Math.round((dateVencCell - 25569) * 86400 * 1000));
              parsedData = dateObj.toISOString().split('T')[0];
              isValidDate = true;
            } else if (dateRegex.test(dateStr)) {
              const parts = dateStr.split('/');
              parsedData = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
              isValidDate = true;
            }

            if (isValidDate) {
              // Parse Value
              let rawValor = String(valorCell);
              rawValor = rawValor.replace(/[^\d.,]/g, '').replace(',', '.');
              const dotCount = (rawValor.match(/\./g) || []).length;
              if (dotCount > 1) {
                rawValor = rawValor.replace(/\.(?=.*\.)/g, ''); // Remove all dots except the last one
              }
              const parsedValor = parseFloat(rawValor) || 0;

              if (parsedValor > 0) {
                const foundClient = clientes.find(c => c.nome.toLowerCase() === currentClientName.toLowerCase());
                const day = parsedData.split('-')[2];
                const categoriaDefault = day === '10' ? 'Mensalidade' : '';
                
                const todayStr = new Date().toISOString().split('T')[0];
                const statusDefault = parsedData < todayStr ? 'vencido' : 'lancado';

                autoParsedRows.push({
                  _originalRow: row,
                  clienteNome: currentClientName,
                  clienteIdEncontrado: foundClient?.id,
                  valor: parsedValor,
                  dataVencimento: parsedData,
                  status: statusDefault,
                  categoria: categoriaDefault,
                  descricao: ''
                });
              }
            }
          }
        }

        if (autoParsedRows.length > 0) {
          setPreviewRows(autoParsedRows);
          setCurrentReviewIndex(0);
          setStep('review');
          return;
        }

        // Fallback: Use manual mapping if auto parsing didn't find any rows
        let headerRowIndex = 0;
        let maxCols = 0;

        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const row = rawData[i] || [];
          const stringCells = row.filter(cell => typeof cell === 'string' && cell.trim() !== '');
          const joined = stringCells.join(' ').toLowerCase();
          if (joined.includes('cliente') || joined.includes('valor') || joined.includes('vencimento') || joined.includes('data') || joined.includes('nome')) {
            headerRowIndex = i;
            break;
          }
          if (stringCells.length > maxCols) {
            maxCols = stringCells.length;
            headerRowIndex = i;
          }
        }

        const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });
        if (data.length > 0) {
          setFileData(data);
          const cols = Object.keys(data[0] as any).filter(c => !c.startsWith('__EMPTY'));
          setColumns(cols);
          
          const newMap = { ...mapping };
          if (!newMap.cliente) newMap.cliente = cols.find(c => c.toLowerCase().includes('cliente') || c.toLowerCase().includes('nome')) || '';
          if (!newMap.valor) newMap.valor = cols.find(c => c.toLowerCase().includes('valor') || c.toLowerCase().includes('total')) || '';
          if (!newMap.data) newMap.data = cols.find(c => c.toLowerCase().includes('data') || c.toLowerCase().includes('vencimento')) || '';
          setMapping(newMap);
          
          setStep('mapping');
        } else {
          alert("Não foi possível processar o arquivo automaticamente, e nenhuma tabela padrão foi encontrada.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo. Certifique-se de que é um Excel, CSV ou XML estruturado.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const processMappingToPreview = () => {
    if (!mapping.cliente || !mapping.valor || !mapping.data) {
      alert("Por favor, mapeie ao menos Cliente, Valor e Data.");
      return;
    }
    localStorage.setItem('nautical_csv_mapping', JSON.stringify(mapping));
    // Persist to centralized database
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ nautical_csv_mapping: mapping }) }).catch(console.warn);

    const rows: PreviewRow[] = fileData.map((row) => {
      const rawCliente = String(row[mapping.cliente] || '').trim();
      const foundClient = clientes.find(c => c.nome.toLowerCase() === rawCliente.toLowerCase());

      let rawValor = String(row[mapping.valor] || '0');
      rawValor = rawValor.replace(/[^\d.,]/g, '').replace(',', '.');
      const dotCount = (rawValor.match(/\./g) || []).length;
      if (dotCount > 1) {
        rawValor = rawValor.replace(/\.(?=.*\.)/g, '');
      }
      const parsedValor = parseFloat(rawValor) || 0;

      let parsedData = '';
      const rawData = row[mapping.data];
      if (typeof rawData === 'number') {
        const dateObj = new Date(Math.round((rawData - 25569) * 86400 * 1000));
        parsedData = dateObj.toISOString().split('T')[0];
      } else {
        const dataStr = String(rawData || '').trim();
        const parts = dataStr.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
             parsedData = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          } else if (parts[0].length === 4) {
             parsedData = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
          }
        }
      }
      if (!parsedData) parsedData = new Date().toISOString().split('T')[0];

      const day = parsedData.split('-')[2];
      const categoriaDefault = day === '10' ? 'Mensalidade' : '';
      const todayStr = new Date().toISOString().split('T')[0];
      const statusDefault = parsedData < todayStr ? 'vencido' : 'lancado';

      return {
        _originalRow: row,
        clienteNome: rawCliente,
        clienteIdEncontrado: foundClient?.id,
        valor: parsedValor,
        dataVencimento: parsedData,
        status: statusDefault,
        categoria: categoriaDefault,
        descricao: ''
      };
    });

    setPreviewRows(rows);
    setCurrentReviewIndex(0);
    setStep('review');
  };

  const handleUpdatePreviewRow = (index: number, updates: Partial<PreviewRow>) => {
    const newRows = [...previewRows];
    let nextUpdates = { ...updates };

    if (updates.categoria === 'Serviço') {
      if (!newRows[index].descricao || newRows[index].descricao === '' || newRows[index].descricao === 'Serviço realizado: ') {
        nextUpdates.descricao = 'Serviço realizado: ';
      }
    } else if (updates.categoria && updates.categoria !== 'Serviço') {
      if (newRows[index].descricao === 'Serviço realizado: ') {
        nextUpdates.descricao = '';
      }
    }

    newRows[index] = { ...newRows[index], ...nextUpdates };
    setPreviewRows(newRows);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    
    // Convert preview rows to TransacaoFinanceira payloads (excluding ignored rows)
    const activeRows = previewRows.filter(row => !row.ignored);
    if (activeRows.length === 0) {
      alert("Nenhum lançamento selecionado para importação.");
      setIsProcessing(false);
      return;
    }

    const payloadData = activeRows.map(row => {
      // Create a deterministic hash string for ID matching later if needed.
      const sigStr = `${row.clienteNome}_${row.dataVencimento}_${row.valor}`.replace(/\s+/g, '').toLowerCase();
      let hash = 0;
      for (let i = 0; i < sigStr.length; i++) {
        hash = Math.imul(31, hash) + sigStr.charCodeAt(i) | 0;
      }
      const uniqueId = `fin_imp_${Math.abs(hash)}`;

      return {
        id: uniqueId,
        tipo: 'receita',
        clienteId: row.clienteIdEncontrado,
        categoria: row.categoria || 'Não Categorizado',
        valor: row.valor,
        dataVencimento: row.dataVencimento,
        status: row.status,
        descricao: row.descricao || '',
        createdAt: new Date().toISOString()
      };
    });

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: payloadData, importMode })
      });
      
      if (res.ok) {
        alert("Importação concluída com sucesso!");
        onImportSuccess();
        onClose();
      } else {
        alert("Erro ao importar no servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar importação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentRow = previewRows[currentReviewIndex];
  
  const clientObj = currentRow?.clienteIdEncontrado ? clientes.find(c => c.id === currentRow.clienteIdEncontrado) : null;
  const clientBoats = clientObj ? (() => {
    const list: string[] = [];
    if (clientObj.embarcacaoId) {
      const b = embarcacoes.find(x => x.id === clientObj.embarcacaoId);
      if (b) list.push(`${b.nome} (${b.numero})`);
    }
    if (clientObj.embarcacoes && clientObj.embarcacoes.length > 0) {
      clientObj.embarcacoes.forEach(cb => {
        if (cb.embarcacaoId !== clientObj.embarcacaoId) {
          const b = embarcacoes.find(x => x.id === cb.embarcacaoId);
          if (b) list.push(`${b.nome} (${b.numero})`);
        }
      });
    }
    return list.join(', ');
  })() : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        
        {/* Content */}
        <div className="flex-1 p-3 bg-slate-50 flex flex-col min-h-0 overflow-hidden">
          
          {step === 'upload' && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Selecione o arquivo</h3>
              <p className="text-slate-500 mb-8 text-sm">
                O sistema aceita os relatórios exportados no formato Excel (XML ou XLSX). As duplicações são tratadas automaticamente.
              </p>
              <label className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                <span>Escolher Arquivo</span>
                <input 
                  type="file" 
                  accept=".xml,.xls,.xlsx,.csv" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Arquivo lido com sucesso! ({fileData.length} registros)
              </h3>
              <p className="text-sm text-slate-600 mb-6 font-medium">
                Por favor, indique qual coluna do seu arquivo corresponde a cada informação abaixo.
              </p>

              <div className="space-y-4">
                {[
                  { key: 'cliente', label: 'Nome do Cliente (Obrigatório)', req: true },
                  { key: 'valor', label: 'Valor do Lançamento (Obrigatório)', req: true },
                  { key: 'data', label: 'Data de Vencimento (Obrigatório)', req: true },
                  { key: 'descricao', label: 'Descrição / Detalhes (Opcional)', req: false },
                ].map(field => (
                  <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-bold text-slate-700">{field.label}</label>
                    <select 
                      value={(mapping as any)[field.key]}
                      onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Selecione a coluna --</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={processMappingToPreview}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700"
                >
                  Continuar para Conferência <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex-grow flex flex-col gap-2 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Conferência de Lançamentos</h3>
                  <p className="text-[11px] text-slate-500">Atalhos: ← / → navegar, M mensalidade, S serviço, P parcela de cota. Apenas faturamentos ativos serão importados.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newRows = previewRows.map(r => 
                      !r.clienteIdEncontrado ? { ...r, ignored: true } : r
                    );
                    setPreviewRows(newRows);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Ignorar Não Localizados
                </button>
              </div>

              {currentRow ? (
                <div className="flex-1 flex flex-col md:flex-row gap-4 items-stretch min-h-0 overflow-hidden">
                  {/* Left list pane */}
                  <div className="w-full md:w-72 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lançamentos</span>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-full">
                          {previewRows.filter(r => !r.ignored).length} / {previewRows.length} ativos
                        </span>
                      </div>
                      <select 
                        value={filterMode} 
                        onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                        className="text-[11px] font-medium p-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 w-full"
                      >
                        <option value="all">Todos ({previewRows.length})</option>
                        <option value="pending">Lançados</option>
                        <option value="ready">Prontos</option>
                        <option value="missing_client">Cliente Não Encontrado</option>
                        <option value="missing_category">Sem Categoria</option>
                        <option value="ignored">Ignorados</option>
                      </select>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {previewRows.map((row, index) => ({ row, index })).filter(({ row }) => {
                        const isComplete = row.clienteIdEncontrado && row.categoria;
                        if (filterMode === 'all') return true;
                        if (filterMode === 'ignored') return row.ignored;
                        if (row.ignored) return false;
                        if (filterMode === 'ready') return isComplete;
                        if (filterMode === 'pending') return !isComplete;
                        if (filterMode === 'missing_client') return !row.clienteIdEncontrado;
                        if (filterMode === 'missing_category') return row.clienteIdEncontrado && !row.categoria;
                        return true;
                      }).map(({ row, index: idx }) => {
                        const isActive = idx === currentReviewIndex;
                        const isComplete = row.clienteIdEncontrado && row.categoria;

                        let badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                        let badgeText = "Lançado";

                        if (row.ignored) {
                          badgeColor = "bg-slate-100 text-slate-500 border-slate-200";
                          badgeText = "Ignorado";
                        } else if (isComplete) {
                          badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                          badgeText = "Pronto";
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentReviewIndex(idx)}
                            className={`w-full text-left p-3 flex flex-col gap-1 transition-all border-l-4 ${
                              isActive 
                                ? 'bg-indigo-50 border-l-indigo-600' 
                                : 'hover:bg-slate-50 border-l-transparent'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-bold text-xs truncate max-w-[130px] ${row.ignored ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {row.clienteNome}
                              </span>
                              <span className="text-[9px] font-medium text-slate-400">
                                {row.dataVencimento.split('-').reverse().slice(0, 2).join('/')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className={`text-xs font-bold ${row.ignored ? 'text-slate-400 line-through' : 'text-indigo-600'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor)}
                              </span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right editor pane */}
                  <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-0">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">Editar Detalhes</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Lançamento {currentReviewIndex + 1} de {previewRows.length}</p>
                      </div>
                      {currentRow.ignored ? (
                        <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1.5">
                          <EyeOff className="w-3.5 h-3.5" /> Desconsiderado
                        </span>
                      ) : (currentRow.clienteIdEncontrado && currentRow.categoria) ? (
                        <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Pronto
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Lançado
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 space-y-3 min-h-0 overflow-y-auto">
                      {/* Original values */}
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                        <div className="font-bold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" /> Dados Importados do Arquivo:
                        </div>
                        <div><span className="text-slate-400 font-medium">Cliente Lido:</span> <span className="font-bold text-slate-700">{currentRow.clienteNome}</span></div>
                        {currentRow.descricao && (
                          <div><span className="text-slate-400 font-medium">Doc/Origem:</span> <span className="font-medium text-slate-600">{currentRow.descricao}</span></div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Client Match */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Vincular Cliente no Sistema</label>
                          <Select
                            options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                            value={currentRow.clienteIdEncontrado ? { value: currentRow.clienteIdEncontrado, label: clientes.find(c => c.id === currentRow.clienteIdEncontrado)?.nome } : null}
                            onChange={(val: any) => handleUpdatePreviewRow(currentReviewIndex, { clienteIdEncontrado: val?.value })}
                            placeholder="Buscar cliente..."
                            className="text-xs"
                            styles={{ control: (base) => ({ ...base, minHeight: '38px', borderColor: currentRow.clienteIdEncontrado ? '#e2e8f0' : '#fca5a5' }) }}
                          />
                          {!currentRow.clienteIdEncontrado && (
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Cliente não vinculado.
                            </p>
                          )}
                          {clientBoats && (
                            <p className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-1.5 border border-sky-100 rounded-lg mt-1 flex items-center gap-1">
                              ⛵ Embarcação: {clientBoats}
                            </p>
                          )}
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Categoria</label>
                          <select
                            value={currentRow.categoria}
                            onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { categoria: e.target.value })}
                            className={`w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-[38px] ${
                              currentRow.categoria ? 'border-slate-200 bg-white text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <option value="">-- Selecione Categoria --</option>
                            <option value="Mensalidade">Mensalidade</option>
                            <option value="Serviço">Serviço</option>
                            <option value="Parcela de Cota">Parcela de Cota</option>
                            <option value="Outro">Outro</option>
                          </select>
                          {!currentRow.categoria && (
                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Escolha uma categoria.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Value */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={currentRow.valor}
                            onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { valor: parseFloat(e.target.value) || 0 })}
                            className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-[38px]"
                          />
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Data de Vencimento</label>
                          <input
                            type="date"
                            value={currentRow.dataVencimento}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const day = newDate.split('-')[2];
                              const updates: Partial<PreviewRow> = { dataVencimento: newDate };
                              if (day === '10' && !currentRow.categoria) {
                                updates.categoria = 'Mensalidade';
                              }
                              handleUpdatePreviewRow(currentReviewIndex, updates);
                            }}
                            className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-[38px]"
                          />
                        </div>
                      </div>

                      {/* Customized Description */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Descrição Personalizada</label>
                        <input
                          type="text"
                          value={currentRow.descricao}
                          onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { descricao: e.target.value })}
                          placeholder="Adicione detalhes ou notas..."
                          className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-[38px]"
                        />
                      </div>
                    </div>

                    {/* Editor Footer Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewRow(currentReviewIndex, { ignored: !currentRow.ignored })}
                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                          currentRow.ignored
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {currentRow.ignored ? (
                          <>
                            <Eye className="w-4 h-4" /> Incluir Lançamento
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" /> Ignorar Lançamento
                          </>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={currentReviewIndex === 0}
                          onClick={() => setCurrentReviewIndex(prev => Math.max(0, prev - 1))}
                          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 transition-colors"
                          title="Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={currentReviewIndex === previewRows.length - 1}
                          onClick={() => setCurrentReviewIndex(prev => Math.min(previewRows.length - 1, prev + 1))}
                          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 transition-colors"
                          title="Próximo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Nenhum lançamento carregado para revisão.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-white flex justify-between gap-3 shrink-0 items-center">
          {step === 'review' ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Modo de Importação:</label>
              <select 
                value={importMode} 
                onChange={e => setImportMode(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
              >
                <option value="append">Adicionar / Atualizar (Padrão)</option>
                <option value="overwrite_clients">Sobrescrever clientes desta planilha (Recomendado)</option>
                <option value="overwrite_all">Sobrescrever TODOS os registros (Atenção!)</option>
              </select>
            </div>
          ) : <div />}
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            
            {step === 'review' && (
              <button 
                onClick={handleImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isProcessing ? 'Importando...' : `Confirmar Importação (${previewRows.filter(r => !r.ignored).length})`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
