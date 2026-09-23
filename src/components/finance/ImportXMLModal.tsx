import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X, UploadCloud, CheckCircle, ArrowRight, ArrowLeft,
  AlertTriangle, ChevronLeft, ChevronRight, EyeOff, Eye,
  FileSpreadsheet, Building2, Landmark, FolderTree, Truck,
  CreditCard, FileText, DollarSign, Calendar, User, Ship, Hash
} from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../../types';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface ImportXMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  clientes: Cliente[];
  embarcacoes: Embarcacao[];
  planosContas?: any[];
  fornecedores?: any[];
  centrosDeCusto?: any[];
}

type Step = 'upload' | 'mapping' | 'config' | 'review';

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
  tipo: 'receita' | 'despesa';
  descricao: string;
  planoContasId: string;
  centroCustoId: string;
  fornecedorId: string;
  contaBancariaId: string;
  ignored?: boolean;
}

type FilterMode = 'all' | 'pending' | 'ready' | 'missing_client' | 'ignored';

// ─────────────────────────────────────────────────────────────────────
// Apple-style select for react-select
// ─────────────────────────────────────────────────────────────────────

const appleSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '40px',
    borderRadius: '12px',
    borderColor: state.isFocused ? '#0071e3' : '#d2d2d7',
    backgroundColor: '#fff',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(0,113,227,0.15)' : 'none',
    fontSize: '14px',
    fontWeight: 500,
    '&:hover': { borderColor: '#86868b' },
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: state.isSelected ? '#0071e3' : state.isFocused ? '#f5f5f7' : '#fff',
    color: state.isSelected ? '#fff' : '#1d1d1f',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#86868b',
    fontSize: '14px',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#1d1d1f',
    fontWeight: 500,
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  }),
};

const appleSelectErrorStyles = {
  ...appleSelectStyles,
  control: (base: any, state: any) => ({
    ...appleSelectStyles.control(base, state),
    borderColor: state.isFocused ? '#e30000' : '#fca5a5',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(227,0,0,0.10)' : 'none',
  }),
};


// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function ImportXMLModal({ isOpen, onClose, onImportSuccess, clientes, embarcacoes, planosContas: planosContasProp, fornecedores: fornecedoresProp, centrosDeCusto: centrosDeCustoProp }: ImportXMLModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);

  const [mapping, setMapping] = useState<ColumnMapping>({
    cliente: '', valor: '', data: '', status: '', descricao: ''
  });

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [importMode, setImportMode] = useState<'append' | 'overwrite_clients' | 'overwrite_all'>('overwrite_clients');

  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [centrosDeCusto, setCentrosDeCusto] = useState<any[]>([]);

  // Global config for this import batch
  const [importEmpresa, setImportEmpresa] = useState('Marina Velho Chico');
  const [importTipo, setImportTipo] = useState<'receita' | 'despesa'>('receita');
  const [importPlanoContasId, setImportPlanoContasId] = useState('');
  const [importCentroCustoId, setImportCentroCustoId] = useState('');
  const [importContaBancariaId, setImportContaBancariaId] = useState('');
  const [importFornecedorId, setImportFornecedorId] = useState('');

  const listRef = useRef<HTMLDivElement>(null);

  // ── Fetch auxiliary data ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (token) {
        const headers = { 'Authorization': `Bearer ${token}` };
        fetch('/api/financeiro/contas-bancarias', { headers })
          .then(res => res.json())
          .then(data => setContasBancarias(data))
          .catch(console.error);

        if (planosContasProp && planosContasProp.length > 0) {
          setPlanosContas(planosContasProp);
        } else {
          fetch('/api/financeiro/planos-contas', { headers })
            .then(res => res.json())
            .then(data => setPlanosContas(data))
            .catch(console.error);
        }
        if (fornecedoresProp && fornecedoresProp.length > 0) {
          setFornecedores(fornecedoresProp);
        } else {
          fetch('/api/financeiro/fornecedores', { headers })
            .then(res => res.json())
            .then(data => setFornecedores(data))
            .catch(console.error);
        }
        if (centrosDeCustoProp && centrosDeCustoProp.length > 0) {
          setCentrosDeCusto(centrosDeCustoProp);
        } else {
          fetch('/api/financeiro/centros-custo', { headers })
            .then(res => res.json())
            .then(data => setCentrosDeCusto(data))
            .catch(console.error);
        }
      }
    }
  }, [isOpen, planosContasProp, fornecedoresProp, centrosDeCustoProp]);

  // ── Restore saved mapping ─────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('nautical_csv_mapping');
    if (saved) {
      try { setMapping(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'review' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true' ||
        activeEl.tagName === 'SELECT'
      );
      if (isTyping) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentReviewIndex(prev => Math.min(previewRows.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentReviewIndex(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isOpen, currentReviewIndex, previewRows.length]);

  // ── Derived data ──────────────────────────────────────────────────
  const filteredPlanos = useMemo(() =>
    planosContas.filter(p => !p.tipo || p.tipo === importTipo),
    [planosContas, importTipo]
  );

  const filteredCentros = useMemo(() =>
    centrosDeCusto.filter(c => !c.empresa || c.empresa === importEmpresa || c.empresa === 'Todos'),
    [centrosDeCusto, importEmpresa]
  );

  const stats = useMemo(() => {
    const active = previewRows.filter(r => !r.ignored);
    const withClient = active.filter(r => r.clienteIdEncontrado);
    const withPlano = active.filter(r => r.planoContasId);
    const total = active.reduce((s, r) => s + r.valor, 0);
    return { total: previewRows.length, active: active.length, withClient: withClient.length, withPlano: withPlano.length, totalValue: total };
  }, [previewRows]);

  if (!isOpen) return null;

  // ── File Upload ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rawData.length === 0) {
          alert("O arquivo parece estar vazio.");
          return;
        }

        // Try automatic parsing for FastReport XML format first
        let clientIdx = 4, tipoIdx = 18, docIdx = 24, dateVencIdx = 42, valorIdx = 48;

        for (let i = 0; i < Math.min(40, rawData.length); i++) {
          const row = rawData[i] || [];
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().trim();
            if (cellVal === 'nome') clientIdx = j;
            else if (cellVal === 'tipo') tipoIdx = j;
            else if (cellVal === 'doc/prc') docIdx = j;
            else if (cellVal === 'data venc' || cellVal === 'data venc.') dateVencIdx = j;
            else if (cellVal === 'valor título' || cellVal === 'valor titulo' || cellVal === 'valor tit.') valorIdx = j;
          }
        }

        const autoParsedRows: PreviewRow[] = [];
        let currentClientName = '';

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i] || [];
          const clientCell = row[clientIdx];
          const dateVencCell = row[dateVencIdx];
          const valorCell = row[valorIdx];

          if (clientCell && typeof clientCell === 'string' && clientCell.trim() !== '' && clientCell.trim().toUpperCase() !== 'NOME') {
            currentClientName = clientCell.trim();
          }

          if (dateVencCell && valorCell && currentClientName && currentClientName.toUpperCase() !== 'NOME') {
            const dateStr = String(dateVencCell).trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            let isValidDate = false;
            let parsedData = '';

            if (typeof dateVencCell === 'number') {
              const dateObj = new Date(Math.round((dateVencCell - 25569) * 86400 * 1000));
              parsedData = dateObj.toISOString().split('T')[0];
              isValidDate = true;
            } else if (dateRegex.test(dateStr)) {
              const parts = dateStr.split('/');
              parsedData = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              isValidDate = true;
            }

            if (isValidDate) {
              let rawValor = String(valorCell);
              rawValor = rawValor.replace(/[^\d.,]/g, '').replace(',', '.');
              const dotCount = (rawValor.match(/\./g) || []).length;
              if (dotCount > 1) rawValor = rawValor.replace(/\.(?=.*\.)/g, '');
              const parsedValor = parseFloat(rawValor) || 0;

              if (parsedValor > 0) {
                const foundClient = clientes.find(c => c.nome.toLowerCase() === currentClientName.toLowerCase());
                const todayStr = new Date().toISOString().split('T')[0];
                const statusDefault = parsedData < todayStr ? 'vencido' : 'lancado';

                autoParsedRows.push({
                  _originalRow: row,
                  clienteNome: currentClientName,
                  clienteIdEncontrado: foundClient?.id,
                  valor: parsedValor,
                  dataVencimento: parsedData,
                  status: statusDefault,
                  tipo: importTipo,
                  descricao: '',
                  planoContasId: '',
                  centroCustoId: '',
                  fornecedorId: '',
                  contaBancariaId: '',
                });
              }
            }
          }
        }

        if (autoParsedRows.length > 0) {
          setPreviewRows(autoParsedRows);
          setCurrentReviewIndex(0);
          setStep('config');
          return;
        }

        // Fallback: manual column mapping
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

  // ── Process column mapping → preview rows ─────────────────────────
  const processMappingToPreview = () => {
    if (!mapping.cliente || !mapping.valor || !mapping.data) {
      alert("Por favor, mapeie ao menos Cliente, Valor e Data.");
      return;
    }
    localStorage.setItem('nautical_csv_mapping', JSON.stringify(mapping));
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
      if (dotCount > 1) rawValor = rawValor.replace(/\.(?=.*\.)/g, '');
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
            parsedData = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            parsedData = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }
      if (!parsedData) parsedData = new Date().toISOString().split('T')[0];

      const todayStr = new Date().toISOString().split('T')[0];
      const statusDefault = parsedData < todayStr ? 'vencido' : 'lancado';

      return {
        _originalRow: row,
        clienteNome: rawCliente,
        clienteIdEncontrado: foundClient?.id,
        valor: parsedValor,
        dataVencimento: parsedData,
        status: statusDefault,
        tipo: 'receita' as const,
        descricao: '',
        planoContasId: '',
        centroCustoId: '',
        fornecedorId: '',
        contaBancariaId: '',
      };
    });

    setPreviewRows(rows);
    setCurrentReviewIndex(0);
    setStep('config');
  };

  // ── Apply global config to all rows (before moving to review) ─────
  const applyConfigAndGoToReview = () => {
    if (!importEmpresa) {
      alert("Selecione a empresa para esta importação.");
      return;
    }
    const updated = previewRows.map(r => ({
      ...r,
      tipo: importTipo,
      planoContasId: r.planoContasId || importPlanoContasId,
      centroCustoId: r.centroCustoId || importCentroCustoId,
      contaBancariaId: r.contaBancariaId || importContaBancariaId,
      fornecedorId: r.fornecedorId || importFornecedorId,
    }));
    setPreviewRows(updated);
    setCurrentReviewIndex(0);
    setStep('review');
  };

  // ── Update single row ─────────────────────────────────────────────
  const handleUpdatePreviewRow = (index: number, updates: Partial<PreviewRow>) => {
    const newRows = [...previewRows];
    newRows[index] = { ...newRows[index], ...updates };
    setPreviewRows(newRows);
  };

  // ── Import handler ────────────────────────────────────────────────
  const handleImport = async () => {
    setIsProcessing(true);
    const activeRows = previewRows.filter(row => !row.ignored);
    if (activeRows.length === 0) {
      alert("Nenhum lançamento selecionado para importação.");
      setIsProcessing(false);
      return;
    }

    const payloadData = activeRows.map(row => {
      const sigStr = `${row.clienteNome}_${row.dataVencimento}_${row.valor}`.replace(/\s+/g, '').toLowerCase();
      let hash = 0;
      for (let i = 0; i < sigStr.length; i++) {
        hash = Math.imul(31, hash) + sigStr.charCodeAt(i) | 0;
      }
      const uniqueId = `fin_imp_${Math.abs(hash)}`;

      return {
        id: uniqueId,
        tipo: row.tipo || importTipo,
        categoria: 'Não Categorizado', // Legacy fallback for DB schema
        clienteId: row.clienteIdEncontrado,
        valor: row.valor,
        dataVencimento: row.dataVencimento,
        status: row.status,
        descricao: row.descricao || '',
        createdAt: new Date().toISOString(),
        empresa: importEmpresa,
        contaBancariaId: row.contaBancariaId || importContaBancariaId || null,
        planoContasId: row.planoContasId || importPlanoContasId || null,
        centroCustoId: row.centroCustoId || importCentroCustoId || null,
        fornecedorId: row.fornecedorId || importFornecedorId || null,
        embarcacaoId: row.clienteIdEncontrado ? clientes.find(c => c.id === row.clienteIdEncontrado)?.embarcacaoId || null : null,
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

  // ── Reset on close ────────────────────────────────────────────────
  const handleClose = () => {
    setStep('upload');
    setFileData([]);
    setFileName('');
    setColumns([]);
    setPreviewRows([]);
    setCurrentReviewIndex(0);
    onClose();
  };

  // ── Current row helpers ───────────────────────────────────────────
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

  // ── Step indicator labels ─────────────────────────────────────────
  const allSteps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Arquivo' },
    { key: 'mapping', label: 'Mapeamento' },
    { key: 'config', label: 'Configuração' },
    { key: 'review', label: 'Revisão' },
  ];
  // Skip mapping step when auto-parsed
  const visibleSteps = fileData.length === 0 && previewRows.length > 0
    ? allSteps.filter(s => s.key !== 'mapping')
    : allSteps;

  const stepIndex = visibleSteps.findIndex(s => s.key === step);

  // ──────────────────────────────────────────────────────────────────
  // R E N D E R
  // ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#f5f5f7] rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden pointer-events-auto border border-black/[0.04]">

              {/* ════════════ Header ════════════ */}
              <div className="bg-white px-6 py-4 border-b border-black/[0.04] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Importar Lançamentos</h2>
                  <p className="text-[13px] text-[#86868b]">
                    {fileName ? fileName : 'Selecione um arquivo Excel, XML ou CSV'}
                  </p>
                </div>
                <button onClick={handleClose} className="p-2 bg-[#f5f5f7] rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ════════════ Step indicator ════════════ */}
              <div className="bg-white px-6 py-3 border-b border-black/[0.04] shrink-0">
                <div className="flex items-center gap-2">
                  {visibleSteps.map((s, i) => (
                    <React.Fragment key={s.key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors ${
                          i < stepIndex ? 'bg-[#008f5d] text-white' :
                          i === stepIndex ? 'bg-[#0071e3] text-white' :
                          'bg-[#f5f5f7] text-[#86868b]'
                        }`}>
                          {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-[13px] font-medium ${
                          i === stepIndex ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                        }`}>{s.label}</span>
                      </div>
                      {i < visibleSteps.length - 1 && (
                        <div className={`flex-1 h-px ${i < stepIndex ? 'bg-[#008f5d]' : 'bg-[#d2d2d7]'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* ════════════ Content ════════════ */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* ──── STEP: Upload ──── */}
                {step === 'upload' && (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
                    <div className="w-20 h-20 bg-[#edf2ff] rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-[#0071e3]/10">
                      <UploadCloud className="w-10 h-10 text-[#0071e3]" />
                    </div>
                    <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-2 tracking-tight">Selecione o arquivo</h3>
                    <p className="text-[14px] text-[#86868b] mb-8 leading-relaxed">
                      O sistema aceita relatórios exportados no formato Excel (XML ou XLSX). Duplicações são tratadas automaticamente.
                    </p>
                    <label className="cursor-pointer bg-[#0071e3] hover:bg-[#0060c0] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 text-[15px]">
                      <UploadCloud className="w-5 h-5" />
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

                {/* ──── STEP: Mapping ──── */}
                {step === 'mapping' && (
                  <div className="max-w-xl mx-auto p-6">
                    <div className="bg-white rounded-2xl p-6 border border-black/[0.04] shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-[#e5fcf4] rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-[#008f5d]" />
                        </div>
                        <div>
                          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Arquivo lido com sucesso!</h3>
                          <p className="text-[13px] text-[#86868b]">{fileData.length} registros encontrados</p>
                        </div>
                      </div>

                      <p className="text-[14px] text-[#86868b] mb-6 font-medium">
                        Indique qual coluna do arquivo corresponde a cada informação abaixo.
                      </p>

                      <div className="space-y-4">
                        {[
                          { key: 'cliente', label: 'Nome do Cliente', icon: User, req: true },
                          { key: 'valor', label: 'Valor do Lançamento', icon: DollarSign, req: true },
                          { key: 'data', label: 'Data de Vencimento', icon: Calendar, req: true },
                          { key: 'descricao', label: 'Descrição / Detalhes', icon: FileText, req: false },
                        ].map(field => (
                          <div key={field.key} className="flex items-center gap-4">
                            <div className="flex items-center gap-2 w-52 shrink-0">
                              <field.icon className="w-4 h-4 text-[#86868b]" />
                              <label className="text-[14px] font-medium text-[#1d1d1f]">
                                {field.label}
                                {field.req && <span className="text-[#e30000] ml-0.5">*</span>}
                              </label>
                            </div>
                            <select
                              value={(mapping as any)[field.key]}
                              onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                              className="flex-1 px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3] transition-all"
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
                          className="bg-[#0071e3] hover:bg-[#0060c0] text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-[15px] transition-colors cursor-pointer shadow-sm"
                        >
                          Continuar <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP: Config ──── */}
                {step === 'config' && (
                  <div className="max-w-2xl mx-auto p-6">
                    <div className="bg-white rounded-2xl border border-black/[0.04] shadow-sm overflow-hidden">
                      {/* Summary card */}
                      <div className="p-6 border-b border-black/[0.04] flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#edf2ff] rounded-2xl flex items-center justify-center">
                          <FileSpreadsheet className="w-7 h-7 text-[#0071e3]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{previewRows.length} lançamentos detectados</h3>
                          <p className="text-[13px] text-[#86868b]">
                            {stats.withClient} clientes vinculados · Total: R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Config fields */}
                      <div className="p-6 space-y-5">
                        <p className="text-[14px] text-[#86868b] font-medium pb-2 border-b border-black/[0.04]">
                          Configure os parâmetros globais desta importação. Você poderá ajustar individualmente cada registro na próxima etapa.
                        </p>

                        {/* Empresa */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" /> Empresa <span className="text-[#e30000]">*</span>
                            </label>
                            <select
                              value={importEmpresa}
                              onChange={e => setImportEmpresa(e.target.value)}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="Marina Velho Chico">Marina Velho Chico</option>
                              <option value="Vale Administradora">Vale Administradora</option>
                              <option value="Mexicano">Mexicano</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5" /> Tipo <span className="text-[#e30000]">*</span>
                            </label>
                            <select
                              value={importTipo}
                              onChange={e => setImportTipo(e.target.value as 'receita' | 'despesa')}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="receita">Receita</option>
                              <option value="despesa">Despesa</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <FolderTree className="w-3.5 h-3.5" /> Plano de Contas
                            </label>
                            <select
                              value={importPlanoContasId}
                              onChange={e => setImportPlanoContasId(e.target.value)}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="">-- Padrão para todos --</option>
                              {filteredPlanos.map(p => (
                                <option key={p.id} value={p.id}>{p.descricao}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5" /> Centro de Custo
                            </label>
                            <select
                              value={importCentroCustoId}
                              onChange={e => setImportCentroCustoId(e.target.value)}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="">-- Opcional --</option>
                              {filteredCentros.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <Landmark className="w-3.5 h-3.5" /> Conta Bancária
                            </label>
                            <select
                              value={importContaBancariaId}
                              onChange={e => setImportContaBancariaId(e.target.value)}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="">-- Opcional --</option>
                              {contasBancarias.map(c => (
                                <option key={c.id} value={c.id}>{c.nome} - {c.banco}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" /> Fornecedor
                            </label>
                            <select
                              value={importFornecedorId}
                              onChange={e => setImportFornecedorId(e.target.value)}
                              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                            >
                              <option value="">-- Opcional --</option>
                              {fornecedores.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Import mode */}
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Modo de Importação
                          </label>
                          <div className="flex bg-[#f5f5f7] rounded-xl p-1 border border-[#d2d2d7]">
                            {([
                              { v: 'append', l: 'Adicionar' },
                              { v: 'overwrite_clients', l: 'Sobrescrever Clientes' },
                              { v: 'overwrite_all', l: 'Substituir Total' },
                            ] as const).map(opt => (
                              <button
                                key={opt.v}
                                onClick={() => setImportMode(opt.v)}
                                className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
                                  importMode === opt.v
                                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                                }`}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="p-6 border-t border-black/[0.04] bg-[#f5f5f7]/50 flex justify-between items-center">
                        <button
                          onClick={() => setStep(fileData.length > 0 ? 'mapping' : 'upload')}
                          className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                        <button
                          onClick={applyConfigAndGoToReview}
                          className="bg-[#0071e3] hover:bg-[#0060c0] text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-[15px] transition-colors cursor-pointer shadow-sm"
                        >
                          Revisar Lançamentos <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP: Review ──── */}
                {step === 'review' && (
                  <div className="flex flex-col h-full">

                    {/* Stats bar */}
                    <div className="px-6 py-3 bg-white border-b border-black/[0.04] flex items-center gap-4 shrink-0 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[13px] font-semibold text-[#1d1d1f]">{importEmpresa}</span>
                      </div>
                      <div className="w-px h-4 bg-[#d2d2d7]" />
                      <span className={`text-[13px] font-semibold ${importTipo === 'receita' ? 'text-[#008f5d]' : 'text-[#e30000]'}`}>
                        {importTipo === 'receita' ? 'Receitas' : 'Despesas'}
                      </span>
                      <div className="w-px h-4 bg-[#d2d2d7]" />
                      <span className="text-[13px] text-[#86868b]">
                        {stats.active} de {stats.total} ativos · R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>

                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newRows = previewRows.map(r =>
                              !r.clienteIdEncontrado ? { ...r, ignored: true } : r
                            );
                            setPreviewRows(newRows);
                          }}
                          className="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors flex items-center gap-1.5 cursor-pointer border border-[#d2d2d7]"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Ignorar Sem Cliente
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex min-h-0 overflow-hidden">

                      {/* ── Left: item list ── */}
                      <div className="w-72 shrink-0 flex flex-col border-r border-black/[0.04] bg-white">

                        {/* Filter chips */}
                        <div className="px-3 py-3 border-b border-black/[0.04] space-y-2 shrink-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Lançamentos</span>
                            <span className="text-[11px] px-2 py-0.5 bg-[#edf2ff] text-[#0071e3] font-semibold rounded-full">
                              {stats.active}/{stats.total}
                            </span>
                          </div>
                          <select
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                            className="w-full text-[12px] font-medium px-2.5 py-2 border border-[#d2d2d7] rounded-xl bg-[#f5f5f7] text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]"
                          >
                            <option value="all">Todos ({previewRows.length})</option>
                            <option value="pending">Pendentes</option>
                            <option value="ready">Prontos</option>
                            <option value="missing_client">Sem Cliente</option>
                            <option value="ignored">Ignorados</option>
                          </select>
                        </div>

                        {/* Scrollable list */}
                        <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
                          {previewRows.map((row, index) => ({ row, index })).filter(({ row }) => {
                            const isComplete = !!row.clienteIdEncontrado;
                            if (filterMode === 'all') return true;
                            if (filterMode === 'ignored') return row.ignored;
                            if (row.ignored) return false;
                            if (filterMode === 'ready') return isComplete;
                            if (filterMode === 'pending') return !isComplete;
                            if (filterMode === 'missing_client') return !row.clienteIdEncontrado;
                            return true;
                          }).map(({ row, index: idx }) => {
                            const isActive = idx === currentReviewIndex;
                            const isComplete = !!row.clienteIdEncontrado;

                            let badgeColor = 'bg-[#fff5e5] text-[#bf4800]';
                            let badgeText = 'Pendente';
                            if (row.ignored) {
                              badgeColor = 'bg-[#f0f0f5] text-[#86868b]';
                              badgeText = 'Ignorado';
                            } else if (isComplete) {
                              badgeColor = 'bg-[#e5fcf4] text-[#008f5d]';
                              badgeText = 'Pronto';
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => setCurrentReviewIndex(idx)}
                                className={`w-full text-left px-3 py-3 flex flex-col gap-1 transition-all border-l-[3px] cursor-pointer ${
                                  isActive
                                    ? 'bg-[#edf2ff] border-l-[#0071e3]'
                                    : 'hover:bg-[#f5f5f7] border-l-transparent'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`font-semibold text-[13px] truncate max-w-[140px] ${row.ignored ? 'line-through text-[#86868b]' : 'text-[#1d1d1f]'}`}>
                                    {row.clienteNome}
                                  </span>
                                  <span className="text-[11px] text-[#86868b] shrink-0">
                                    {row.dataVencimento.split('-').reverse().slice(0, 2).join('/')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                  <span className={`text-[13px] font-semibold ${row.ignored ? 'text-[#86868b] line-through' : 'text-[#0071e3]'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor)}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                                    {badgeText}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Right: detail editor ── */}
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {currentRow ? (
                          <>
                            {/* Editor header */}
                            <div className="px-6 py-4 bg-white border-b border-black/[0.04] flex items-center justify-between shrink-0">
                              <div>
                                <h4 className="text-[15px] font-semibold text-[#1d1d1f]">Editar Lançamento</h4>
                                <p className="text-[13px] text-[#86868b]">{currentReviewIndex + 1} de {previewRows.length}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {currentRow.ignored ? (
                                  <span className="text-[12px] px-3 py-1 bg-[#f0f0f5] text-[#86868b] font-semibold rounded-full flex items-center gap-1.5">
                                    <EyeOff className="w-3.5 h-3.5" /> Desconsiderado
                                  </span>
                                ) : currentRow.clienteIdEncontrado ? (
                                  <span className="text-[12px] px-3 py-1 bg-[#e5fcf4] text-[#008f5d] font-semibold rounded-full flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5" /> Pronto
                                  </span>
                                ) : (
                                  <span className="text-[12px] px-3 py-1 bg-[#fff5e5] text-[#bf4800] font-semibold rounded-full flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Pendente
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Editor body — scrollable */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

                              {/* Original data card */}
                              <div className="bg-[#f5f5f7] rounded-2xl p-4 border border-black/[0.04]">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileSpreadsheet className="w-4 h-4 text-[#0071e3]" />
                                  <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">Dados Importados do Arquivo</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[13px]">
                                    <span className="text-[#86868b]">Cliente:</span>{' '}
                                    <span className="font-semibold text-[#1d1d1f]">{currentRow.clienteNome}</span>
                                  </div>
                                  {currentRow.descricao && (
                                    <div className="text-[13px]">
                                      <span className="text-[#86868b]">Doc/Origem:</span>{' '}
                                      <span className="font-medium text-[#1d1d1f]">{currentRow.descricao}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Client match + Embarcação */}
                              <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm space-y-4">
                                <h5 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" /> Vinculação de Cliente
                                </h5>
                                <Select
                                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                                  value={currentRow.clienteIdEncontrado ? { value: currentRow.clienteIdEncontrado, label: clientes.find(c => c.id === currentRow.clienteIdEncontrado)?.nome } : null}
                                  onChange={(val: any) => handleUpdatePreviewRow(currentReviewIndex, { clienteIdEncontrado: val?.value })}
                                  placeholder="Buscar cliente..."
                                  isClearable
                                  styles={currentRow.clienteIdEncontrado ? appleSelectStyles : appleSelectErrorStyles}
                                />
                                {!currentRow.clienteIdEncontrado && (
                                  <p className="text-[12px] text-[#e30000] font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Cliente não vinculado. Busque e selecione manualmente.
                                  </p>
                                )}
                                {clientBoats && (
                                  <div className="text-[13px] text-[#0071e3] font-medium bg-[#edf2ff] px-3 py-2 border border-[#0071e3]/10 rounded-xl flex items-center gap-1.5">
                                    <Ship className="w-4 h-4" /> Embarcação: {clientBoats}
                                  </div>
                                )}
                              </div>

                              {/* Financial details */}
                              <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm space-y-4">
                                <h5 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5" /> Dados Financeiros
                                </h5>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Valor (R$)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={currentRow.valor}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { valor: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-semibold text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Data de Vencimento</label>
                                    <input
                                      type="date"
                                      value={currentRow.dataVencimento}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { dataVencimento: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-semibold text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[13px] font-medium text-[#86868b]">Descrição</label>
                                  <input
                                    type="text"
                                    value={currentRow.descricao}
                                    onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { descricao: e.target.value })}
                                    placeholder="Adicione detalhes ou notas..."
                                    className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                  />
                                </div>
                              </div>

                              {/* Classificação contábil */}
                              <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-sm space-y-4">
                                <h5 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                                  <FolderTree className="w-3.5 h-3.5" /> Classificação Contábil
                                </h5>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Plano de Contas</label>
                                    <select
                                      value={currentRow.planoContasId}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { planoContasId: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    >
                                      <option value="">{importPlanoContasId ? '(Usar padrão global)' : '-- Selecione --'}</option>
                                      {filteredPlanos.map(p => (
                                        <option key={p.id} value={p.id}>{p.descricao}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Centro de Custo</label>
                                    <select
                                      value={currentRow.centroCustoId}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { centroCustoId: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    >
                                      <option value="">{importCentroCustoId ? '(Usar padrão global)' : '-- Opcional --'}</option>
                                      {filteredCentros.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Conta Bancária</label>
                                    <select
                                      value={currentRow.contaBancariaId}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { contaBancariaId: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    >
                                      <option value="">{importContaBancariaId ? '(Usar padrão global)' : '-- Opcional --'}</option>
                                      {contasBancarias.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} - {c.banco}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#86868b]">Fornecedor</label>
                                    <select
                                      value={currentRow.fornecedorId}
                                      onChange={(e) => handleUpdatePreviewRow(currentReviewIndex, { fornecedorId: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
                                    >
                                      <option value="">{importFornecedorId ? '(Usar padrão global)' : '-- Opcional --'}</option>
                                      {fornecedores.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Editor footer */}
                            <div className="px-6 py-4 border-t border-black/[0.04] bg-white flex items-center justify-between shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdatePreviewRow(currentReviewIndex, { ignored: !currentRow.ignored })}
                                className={`px-4 py-2 text-[13px] font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  currentRow.ignored
                                    ? 'border-[#008f5d]/20 bg-[#e5fcf4] text-[#008f5d] hover:bg-[#d0f5e8]'
                                    : 'border-[#e30000]/20 bg-[#fef0f0] text-[#e30000] hover:bg-[#fce0e0]'
                                }`}
                              >
                                {currentRow.ignored ? (
                                  <><Eye className="w-4 h-4" /> Incluir</>
                                ) : (
                                  <><EyeOff className="w-4 h-4" /> Ignorar</>
                                )}
                              </button>

                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-[#86868b] mr-1">← → navegar</span>
                                <button
                                  type="button"
                                  disabled={currentReviewIndex === 0}
                                  onClick={() => setCurrentReviewIndex(prev => Math.max(0, prev - 1))}
                                  className="p-2 bg-[#f5f5f7] border border-[#d2d2d7] hover:bg-[#e5e5ea] text-[#86868b] hover:text-[#1d1d1f] rounded-xl disabled:opacity-30 transition-colors cursor-pointer"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={currentReviewIndex === previewRows.length - 1}
                                  onClick={() => setCurrentReviewIndex(prev => Math.min(previewRows.length - 1, prev + 1))}
                                  className="p-2 bg-[#f5f5f7] border border-[#d2d2d7] hover:bg-[#e5e5ea] text-[#86868b] hover:text-[#1d1d1f] rounded-xl disabled:opacity-30 transition-colors cursor-pointer"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                              <FileSpreadsheet className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                              <p className="text-[#86868b] font-medium">Nenhum lançamento carregado para revisão.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ════════════ Footer ════════════ */}
              <div className="px-6 py-4 border-t border-black/[0.04] bg-white flex justify-between items-center shrink-0">
                <div>
                  {step === 'review' && (
                    <button
                      onClick={() => setStep('config')}
                      className="px-4 py-2 rounded-xl text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Configuração
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  {step === 'review' && (
                    <button
                      onClick={handleImport}
                      disabled={isProcessing || stats.active === 0}
                      className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#0071e3] hover:bg-[#0060c0] transition-colors flex items-center gap-2 text-[15px] shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Importação ({stats.active})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
