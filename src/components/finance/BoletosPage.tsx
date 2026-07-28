import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowRight, XCircle, Search, Calendar, FileText, Send, EyeOff, Eye, AlertCircle, ChevronLeft, ChevronRight, MessageSquare, Trash2, X, Users } from 'lucide-react';
import { clientDB } from '../../db';
import { Cliente } from '../../types';
import Select from 'react-select';
import { motion } from 'motion/react';

interface BoletoFile {
  originalName: string;
  payerName: string;
  tempPath: string;
  localPath: string;
  clientIdEncontrado?: string;
  confidence: 'alta' | 'media' | 'baixa' | 'none';
  ignored?: boolean;
}

const ALREADY_SENT_NAMES = [
  "ALLISON GABRIEL", "ALISSON GABRIEL", "ERIVAN DA COSTA", "RINALDO LUIZ", "DOMINGOS ANGELO",
  "PLINIO VICTOR", "THIAGO DOS REIS", "ALBERT EINSTEN", "JACKSON FERREIRA",
  "JOAO PAULO FIGUEIREDO", "JOAO EDUARDO DE SOUZA", "IAGO DA SILVA",
  "JEFERSON DOS SANTOS BARBOSA", "JOSIMAR RODRIGUES", "EUDES SOBREIRA",
  "RAFAEL CAMPELO", "LUAN YURI", "HUIGO GOMES", "DARK BLACK", "FERNANDO VIEIRA",
  "DIOGO VARGAS", "FRANCISCO BEZERRA", "JULIA INEZ CORREIA NOBRE MOTA",
  "VICTOR GOMES", "THULIO RAMIREZ", "DIEGO BARROSO", "JOSE PHELIPE",
  "DANILO PORTO", "FELIPE FRANCISCO", "ITALO GOMES", "LUIZ TORRISI", "WALNEY ARAUJO"
];

export default function BoletosPage() {
  const [step, setStep] = useState<'upload' | 'review' | 'message'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const isCancelled = useRef(false);
  
  // Data state
  const [boletos, setBoletos] = useState<BoletoFile[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Review state
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Message state
  const [monthYear, setMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  
  const [messageTemplate, setMessageTemplate] = useState<string>(
    "Olá {nome}! 👋\n\nSegue o boleto referente à *Taxa Administrativa* de {mes}/{ano}.\n\nQualquer dúvida, estamos à disposição!\nGrupo Villa Náutica 🚤"
  );
  
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [sendResults, setSendResults] = useState<{ clientId: string; status: 'success' | 'error'; error?: string }[]>([]);
  const [sendProgress, setSendProgress] = useState(0);

  useEffect(() => {
    setClientes(clientDB.getAll());
  }, []);

  const handleFilesDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      if (files[i].type === 'application/pdf') {
        formData.append('boletos', files[i]);
      }
    }

    try {
      const token = localStorage.getItem('admin_token');
      // 1. Upload and extract names
      const resUpload = await fetch('/api/boletos/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const dataUpload = await resUpload.json();
      
      if (!dataUpload.success) {
        alert("Erro no upload: " + dataUpload.message);
        setIsProcessing(false);
        return;
      }

      const uploadedBoletos = dataUpload.boletos;
      const namesToMatch = uploadedBoletos.map((b: any) => b.payerName);

      // 2. Match with clients
      const resMatch = await fetch('/api/boletos/match-clients', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: namesToMatch })
      });
      const dataMatch = await resMatch.json();

      if (dataMatch.success) {
        const enrichedBoletos = uploadedBoletos.map((b: any, index: number) => {
          const matchResult = dataMatch.matches[index];
          const shouldIgnore = ALREADY_SENT_NAMES.some(n => 
            (b.payerName && b.payerName.toUpperCase().includes(n)) || 
            (matchResult.match?.nome && matchResult.match.nome.toUpperCase().includes(n))
          );
          
          return {
            ...b,
            clientIdEncontrado: matchResult.match?.id,
            confidence: matchResult.confidence,
            ignored: shouldIgnore
          };
        });
        setBoletos(enrichedBoletos);
        setStep('review');
        setCurrentReviewIndex(0);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar boletos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateBoleto = (index: number, updates: Partial<BoletoFile>) => {
    const newBoletos = [...boletos];
    newBoletos[index] = { ...newBoletos[index], ...updates };
    setBoletos(newBoletos);
  };

  const getPersonalizedMessage = (clientId: string) => {
    const client = clientDB.getById(clientId);
    if (!client) return messageTemplate;

    const firstName = client.nome.split(' ')[0];
    const [mes, ano] = monthYear.split('/');
    
    let text = messageTemplate;
    text = text.replace(/\{nome\}/g, firstName);
    text = text.replace(/\{mes\}/g, mes || '');
    text = text.replace(/\{ano\}/g, ano || '');
    return text;
  };

  const activeBoletos = boletos.filter(b => !b.ignored && b.clientIdEncontrado);

  const handleSend = async () => {
    if (activeBoletos.length === 0) return;
    
    // Check if any selected client doesn't have a phone number
    const missingPhones = activeBoletos.filter(b => {
      const c = clientDB.getById(b.clientIdEncontrado!);
      return !c || !c.telefone;
    });

    if (missingPhones.length > 0) {
      alert(`Encontramos ${missingPhones.length} cliente(s) sem telefone cadastrado. Por favor, ajuste antes de enviar.`);
      return;
    }

    isCancelled.current = false;
    setSendingState('sending');
    setSendProgress(0);

    const instanceName = localStorage.getItem('finance_whatsapp_instance');
    if (!instanceName) {
      alert("Nenhuma instância de WhatsApp configurada. Por favor, acesse a aba WhatsApp primeiro.");
      setSendingState('idle');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const statusRes = await fetch(`/api/whatsapp/status?instance=${instanceName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      
      const state = statusData?.instance?.state || 'close';
      if (state !== 'open') {
        alert("O WhatsApp não está conectado! Por favor, acesse a aba WhatsApp e conecte antes de enviar os boletos.");
        setSendingState('idle');
        return;
      }
    } catch (err) {
      alert("Erro ao verificar conexão do WhatsApp. A Evolution API pode estar offline.");
      setSendingState('idle');
      return;
    }

    const payloadBoletos = activeBoletos.map(b => {
      const client = clientDB.getById(b.clientIdEncontrado!)!;
      const msg = getPersonalizedMessage(client.id);
      
      const firstName = client.nome.split(' ')[0];
      const [mes, ano] = monthYear.split('/');
      const fileName = `${firstName} - Taxa Administrativa ${mes}-${ano}.pdf`;

      return {
        clientId: client.id,
        number: client.telefone,
        text: msg,
        localPath: b.localPath,
        fileName
      };
    });

    const token = localStorage.getItem('admin_token');
    const tempResults: { clientId: string; status: 'success' | 'error'; error?: string }[] = [];

    for (let i = 0; i < payloadBoletos.length; i++) {
      if (isCancelled.current) {
        break; // Stop if user cancelled
      }

      try {
        const res = await fetch('/api/boletos/send', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ instanceName, boletos: [payloadBoletos[i]] })
        });
        
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          tempResults.push(data.results[0]);
        } else {
          tempResults.push({ clientId: payloadBoletos[i].clientId, status: 'error', error: data.message || 'Erro' });
        }
      } catch (err) {
        tempResults.push({ clientId: payloadBoletos[i].clientId, status: 'error', error: 'Falha de rede' });
      }

      setSendProgress(Math.round(((i + 1) / payloadBoletos.length) * 100));
    }

    setSendResults(tempResults);
    setSendingState('completed');
  };

  const renderUploadStep = () => (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
      <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-sm border border-indigo-100 relative group overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
        <UploadCloud className="w-12 h-12 relative z-10" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Envio de Boletos em Lote</h2>
      <p className="text-slate-500 mb-8 text-base">
        Arraste múltiplos PDFs de boletos ou um único PDF com várias páginas (o sistema o dividirá automaticamente). O sistema identificará automaticamente os pagadores e os associará aos clientes do sistema.
      </p>

      <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6 text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <label className="block text-sm font-bold text-slate-700 mb-1">Mês/Ano de Referência</label>
          <input 
            type="text" 
            placeholder="MM/AAAA"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="w-full bg-transparent text-slate-900 font-semibold focus:outline-none"
          />
        </div>
      </div>

      <label className="cursor-pointer relative overflow-hidden bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 group">
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
        <UploadCloud className="w-5 h-5 relative z-10" />
        <span className="relative z-10">{isProcessing ? 'Processando PDFs...' : 'Selecionar Arquivos PDF'}</span>
        <input 
          type="file" 
          accept=".pdf" 
          multiple
          className="hidden" 
          onChange={handleFilesDrop}
          disabled={isProcessing}
        />
      </label>
    </div>
  );

  const renderReviewStep = () => {
    const currentRow = boletos[currentReviewIndex];
    if (!currentRow) return null;

    return (
      <div className="flex-grow flex flex-col gap-4 min-h-0 overflow-hidden h-[calc(100vh-140px)]">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Revisão de Associações</h3>
            <p className="text-sm text-slate-500 mt-1">Verifique se o sistema encontrou os clientes corretos para cada boleto.</p>
          </div>
          <button
            onClick={() => setStep('message')}
            disabled={activeBoletos.length === 0}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            Continuar para Mensagem <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 items-stretch min-h-0 overflow-hidden">
          {/* Lista Esquerda */}
          <div className="w-full md:w-80 flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Boletos Lidos</span>
              <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100">
                {activeBoletos.length} / {boletos.length} ativos
              </span>
            </div>
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar pagador..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto subtle-scrollbar divide-y divide-slate-100">
              {boletos
                .map((row, idx) => ({ row, idx }))
                .filter(({ row }) => {
                   if (!searchTerm) return true;
                   const search = searchTerm.toLowerCase();
                   return (row.payerName && row.payerName.toLowerCase().includes(search)) || 
                          row.originalName.toLowerCase().includes(search);
                })
                .map(({ row, idx }) => {
                const isActive = idx === currentReviewIndex;
                const isComplete = !!row.clientIdEncontrado;

                let badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
                let badgeText = "Lançado";
                let Icon = AlertTriangle;

                if (row.ignored) {
                  badgeColor = "bg-slate-50 text-slate-500 border-slate-200";
                  badgeText = "Ignorado";
                  Icon = EyeOff;
                } else if (isComplete) {
                  badgeColor = row.confidence === 'alta' 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : "bg-amber-50 text-amber-600 border-amber-200";
                  badgeText = row.confidence === 'alta' ? "Confiança Alta" : "Confiança Média";
                  Icon = row.confidence === 'alta' ? CheckCircle : AlertCircle;
                }

                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentReviewIndex(idx)}
                    className={`w-full text-left p-4 flex flex-col gap-2 transition-all border-l-4 cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-50/50 border-l-indigo-600' 
                        : 'hover:bg-slate-50 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!row.ignored}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdateBoleto(idx, { ignored: !e.target.checked });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`font-bold text-sm truncate max-w-[150px] ${row.ignored ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {row.payerName || row.originalName}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border flex items-center gap-1 ${badgeColor}`}>
                        <Icon className="w-3 h-3" /> {badgeText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor Direita */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 min-h-0">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-800 tracking-tight">Detalhes do Boleto</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">Arquivo {currentReviewIndex + 1} de {boletos.length}</p>
              </div>
            </div>

            <div className="p-6 flex-1 space-y-6 min-h-0 overflow-y-auto">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-600 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" /> Dados Extraídos do PDF:
                </div>
                <div className="flex items-center gap-2"><span className="text-slate-500 font-medium text-sm">Arquivo:</span> <span className="font-semibold text-slate-800 text-sm">{currentRow.originalName}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-500 font-medium text-sm">Pagador/Sacado:</span> <span className="font-semibold text-slate-800 text-sm">{currentRow.payerName || <span className="text-red-500 italic">Não encontrado</span>}</span></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Vincular ao Cliente no Sistema</label>
                <Select
                  options={clientes.map(c => ({ value: c.id, label: `${c.nome} ${c.telefone ? `(${c.telefone})` : ''}` }))}
                  value={currentRow.clientIdEncontrado ? { 
                    value: currentRow.clientIdEncontrado, 
                    label: clientes.find(c => c.id === currentRow.clientIdEncontrado)?.nome 
                  } : null}
                  onChange={(val: any) => handleUpdateBoleto(currentReviewIndex, { clientIdEncontrado: val?.value, confidence: 'alta' })}
                  placeholder="Buscar cliente pelo nome..."
                  className="text-sm"
                  styles={{ control: (base) => ({ ...base, minHeight: '44px', borderRadius: '0.75rem', borderColor: currentRow.clientIdEncontrado ? '#e2e8f0' : '#fca5a5' }) }}
                />
                
                {currentRow.clientIdEncontrado && (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-indigo-900">
                        {clientes.find(c => c.id === currentRow.clientIdEncontrado)?.nome}
                      </p>
                      <p className="text-xs font-medium text-indigo-700 mt-0.5 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {clientes.find(c => c.id === currentRow.clientIdEncontrado)?.telefone || 'Sem telefone cadastrado'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleUpdateBoleto(currentReviewIndex, { ignored: !currentRow.ignored })}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition-all flex items-center gap-2 ${
                  currentRow.ignored
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {currentRow.ignored ? (
                  <><Eye className="w-4 h-4" /> Incluir Envio</>
                ) : (
                  <><EyeOff className="w-4 h-4" /> Ignorar Envio</>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentReviewIndex === 0}
                  onClick={() => setCurrentReviewIndex(prev => Math.max(0, prev - 1))}
                  className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl disabled:opacity-40 transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  disabled={currentReviewIndex === boletos.length - 1}
                  onClick={() => setCurrentReviewIndex(prev => Math.min(boletos.length - 1, prev + 1))}
                  className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl disabled:opacity-40 transition-colors shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessageStep = () => {
    if (sendingState === 'sending' || sendingState === 'completed') {
      return (
        <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center py-12">
          {sendingState === 'sending' ? (
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#4f46e5" strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * sendProgress) / 100}
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-indigo-600">
                  {sendProgress}%
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Enviando Boletos...</h2>
              <p className="text-slate-500 mt-2">Por favor, não feche esta página.</p>
              
              <button 
                onClick={() => { isCancelled.current = true; }}
                className="mt-6 px-6 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold border border-rose-200 transition-colors flex items-center gap-2 mx-auto"
              >
                <XCircle className="w-5 h-5" /> Parar Envios
              </button>
            </div>
          ) : (
            <div className="w-full">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Envio Concluído!</h2>
                <p className="text-slate-500 mt-2 text-lg">
                  {sendResults.filter(r => r.status === 'success').length} de {activeBoletos.length} boletos enviados com sucesso.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Relatório de Envios</h3>
                  <button
                    onClick={() => {
                      const successList = sendResults
                        .filter(r => r.status === 'success')
                        .map(r => clientDB.getById(r.clientId)?.nome || 'Cliente Removido')
                        .join('\n');
                      navigator.clipboard.writeText("Boletos enviados com sucesso:\n" + successList);
                      alert("Lista copiada para a área de transferência!");
                    }}
                    className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Copiar Lista
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                  {sendResults.map((r, i) => {
                    const client = clientDB.getById(r.clientId);
                    return (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {r.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{client?.nome || 'Cliente Removido'}</p>
                            {r.error && <p className="text-xs text-rose-600 font-medium mt-0.5">{r.error}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => {
                    setStep('upload');
                    setBoletos([]);
                    setSendingState('idle');
                    setSendResults([]);
                  }}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Novo Lote de Boletos
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Preview
    const sampleClient = activeBoletos[0] ? clientDB.getById(activeBoletos[0].clientIdEncontrado!) : null;
    const previewMessage = sampleClient ? getPersonalizedMessage(sampleClient.id) : messageTemplate;
    const [mes, ano] = monthYear.split('/');
    const sampleFileName = sampleClient ? `${sampleClient.nome.split(' ')[0]} - Taxa Administrativa ${mes}-${ano}.pdf` : 'Boleto.pdf';

    return (
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        <div className="mb-6 flex items-center gap-4">
          <button 
            onClick={() => setStep('review')}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Preparar Mensagem</h2>
            <p className="text-slate-500 text-sm mt-1">Personalize o texto que será enviado junto com os boletos.</p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col">
              <label className="block text-sm font-bold text-slate-700 mb-2">Texto da Mensagem</label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none font-medium text-slate-700"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {['{nome}', '{mes}', '{ano}'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setMessageTemplate(prev => prev + ' ' + tag)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSend}
              className="w-full bg-[#25D366] text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20 group active:scale-[0.98]"
            >
              <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Enviar {activeBoletos.length} Boletos via WhatsApp
            </button>
          </div>

          {/* WhatsApp Preview */}
          <div className="bg-slate-100 rounded-[2.5rem] p-4 flex flex-col border-8 border-slate-200 shadow-xl overflow-hidden relative max-h-[600px]">
            <div className="bg-[#075E54] -mx-4 -mt-4 px-4 py-3 flex items-center gap-3 z-10 shadow-md">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Preview para {sampleClient?.nome.split(' ')[0] || 'Cliente'}</h3>
                <p className="text-white/70 text-[10px]">WhatsApp</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] -mx-4 -mb-4 relative" style={{ backgroundImage: "url('https://i.ibb.co/3s1f9bH/wa-bg.png')", backgroundSize: 'cover', opacity: 0.9 }}>
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-[#dcf8c6] rounded-xl rounded-tr-none p-1.5 shadow-sm relative">
                  {/* File Attachment Preview */}
                  <div className="bg-black/5 rounded-lg p-3 flex items-center gap-3 mb-2 border border-black/5">
                    <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{sampleFileName}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">PDF • 1pág</p>
                    </div>
                  </div>
                  
                  <div className="px-2 pb-1">
                    <p className="text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed">{previewMessage}</p>
                  </div>
                  
                  <div className="flex justify-end gap-1 px-2 pb-1 mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${step === 'upload' ? 33 : step === 'review' ? 66 : 100}%` }}
        />
      </div>
      
      <div className="flex-1 p-8 overflow-y-auto subtle-scrollbar">
        {step === 'upload' && renderUploadStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'message' && renderMessageStep()}
      </div>
    </div>
  );
}
