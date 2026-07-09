import React, { useState } from 'react';
import { 
  ArrowLeft, AlertCircle, CheckCircle, Info, Database, Play, 
  HelpCircle, Check, AlertTriangle, FileText, BadgeHelp
} from 'lucide-react';
import { TransacaoFinanceira, Cliente, Embarcacao } from '../types';

interface BulkImportPageProps {
  onClose: () => void;
  onSuccess: () => void;
  clientes: Cliente[];
  embarcacoes: Embarcacao[];
}

interface ValidatedItem {
  raw: any;
  validated: Partial<TransacaoFinanceira>;
  errors: string[];
  warnings: string[];
  resolvedClientName?: string;
  resolvedBoatName?: string;
}

export default function BulkImportPage({ onClose, onSuccess, clientes, embarcacoes }: BulkImportPageProps) {
  const [jsonText, setJsonText] = useState('');
  const [parsedItems, setParsedItems] = useState<ValidatedItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const sampleJSON = [
    {
      "tipo": "receita",
      "categoria": "Mensalidade",
      "valor": 450.00,
      "dataVencimento": "2026-07-10",
      "status": "pendente",
      "descricao": "Mensalidade de Cotista - Julho/2026",
      "clienteId": clientes[0]?.id || "id-do-cliente",
      "embarcacaoId": embarcacoes[0]?.id || "id-da-embarcacao"
    },
    {
      "tipo": "despesa",
      "categoria": "Manutenção",
      "valor": 1200.00,
      "dataVencimento": "2026-06-25",
      "status": "pago",
      "descricao": "Troca de óleo e revisão de motor",
      "embarcacaoId": embarcacoes[0]?.id || "id-da-embarcacao"
    }
  ];

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(sampleJSON, null, 2));
    validateJSON(JSON.stringify(sampleJSON, null, 2));
  };

  const validateJSON = (text: string) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    
    if (!text.trim()) {
      setParsedItems([]);
      setParseError(null);
      return;
    }

    try {
      let rawData = JSON.parse(text);
      setParseError(null);

      const items = Array.isArray(rawData) ? rawData : [rawData];
      const validated: ValidatedItem[] = items.map((item, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate tipo
        let tipo = item.tipo;
        if (!tipo) {
          tipo = 'receita';
          warnings.push('Tipo ausente. Definido como "receita".');
        } else if (tipo !== 'receita' && tipo !== 'despesa') {
          errors.push(`Tipo inválido: "${tipo}". Deve ser "receita" ou "despesa".`);
        }

        // Validate valor
        const valor = Number(item.valor);
        if (item.valor === undefined || item.valor === null) {
          errors.push('Valor é obrigatório.');
        } else if (isNaN(valor) || valor <= 0) {
          errors.push(`Valor inválido: "${item.valor}". Deve ser um número maior que zero.`);
        }

        // Validate dataVencimento
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const dataVencimento = item.dataVencimento;
        if (!dataVencimento) {
          errors.push('Data de vencimento é obrigatória (dataVencimento).');
        } else if (typeof dataVencimento !== 'string' || !dateRegex.test(dataVencimento)) {
          errors.push(`Formato de dataVencimento inválido: "${dataVencimento}". Use o formato AAAA-MM-DD.`);
        } else {
          const parsedDate = new Date(dataVencimento);
          if (isNaN(parsedDate.getTime())) {
            errors.push(`Data de vencimento inválida: "${dataVencimento}".`);
          }
        }

        // Validate descricao
        const descricao = item.descricao;
        if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
          errors.push('Descrição é obrigatória (descricao).');
        }

        // Validate status
        let status = item.status;
        const validStatuses = ['pendente', 'pago', 'atrasado', 'cancelado', 'aguardando_aprovacao'];
        if (!status) {
          status = 'pendente';
          warnings.push('Status ausente. Definido como "pendente".');
        } else if (!validStatuses.includes(status)) {
          warnings.push(`Status incomum/inválido: "${status}". Definido como "pendente".`);
          status = 'pendente';
        }

        // Resolve clienteId
        let resolvedClientName = '';
        if (item.clienteId) {
          const client = clientes.find(c => c.id === item.clienteId);
          if (client) {
            resolvedClientName = client.nome;
          } else {
            warnings.push(`clienteId "${item.clienteId}" não encontrado no cadastro de clientes.`);
          }
        }

        // Resolve embarcacaoId
        let resolvedBoatName = '';
        if (item.embarcacaoId) {
          const boat = embarcacoes.find(b => b.id === item.embarcacaoId);
          if (boat) {
            resolvedBoatName = `${boat.nome} (${boat.numero})`;
          } else {
            warnings.push(`embarcacaoId "${item.embarcacaoId}" não encontrado no cadastro de embarcações.`);
          }
        }

        const validItem: Partial<TransacaoFinanceira> = {
          id: item.id || `fin_${Date.now()}_import_${index}_${Math.random().toString(36).substring(2, 7)}`,
          tipo: tipo as 'receita' | 'despesa',
          categoria: item.categoria || 'Importação JSON',
          valor: valor,
          dataVencimento: dataVencimento,
          dataPagamento: item.dataPagamento || undefined,
          status: status as any,
          descricao: descricao,
          clienteId: item.clienteId || undefined,
          embarcacaoId: item.embarcacaoId || undefined,
          comprovante: item.comprovante || undefined,
          createdAt: item.createdAt || new Date().toISOString()
        };

        return {
          raw: item,
          validated: validItem,
          errors,
          warnings,
          resolvedClientName,
          resolvedBoatName
        };
      });

      setParsedItems(validated);
    } catch (e: any) {
      setParseError(e.message || 'Erro ao processar JSON.');
      setParsedItems([]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    validateJSON(text);
  };

  const handleImport = async () => {
    const validPayload = parsedItems
      .filter(item => item.errors.length === 0)
      .map(item => item.validated);

    if (validPayload.length === 0) {
      alert('Nenhum lançamento válido para importar.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'upsert',
          data: validPayload
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        const errorData = await res.json();
        setSubmitError(errorData.message || 'Erro ao salvar os lançamentos no servidor.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalErrors = parsedItems.reduce((acc, item) => acc + item.errors.length, 0);
  const totalWarnings = parsedItems.reduce((acc, item) => acc + item.warnings.length, 0);
  const validItemsCount = parsedItems.filter(item => item.errors.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" />
              Importação em Massa via JSON
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Insira um JSON com os lançamentos e envie todos de uma vez para o sistema.
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-all"
        >
          Carregar Exemplo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              Editor JSON
            </span>
            {jsonText && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                parseError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                {parseError ? 'JSON Inválido' : 'JSON Válido'}
              </span>
            )}
          </div>

          <textarea
            value={jsonText}
            onChange={handleTextChange}
            placeholder='Coloque seu JSON aqui. Exemplo:&#10;[&#10;  { "tipo": "receita", "valor": 150.00, "descricao": "Exemplo", "dataVencimento": "2026-07-01" }&#10;]'
            className="w-full h-96 p-4 font-mono text-sm bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 overflow-y-auto"
          />

          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Falha ao analisar JSON</p>
                <p className="text-xs text-red-700 font-mono mt-1 leading-relaxed">{parseError}</p>
              </div>
            </div>
          )}

          {!jsonText && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">Instruções de Formato:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>O JSON pode ser um <strong>Objeto Único</strong> ou um <strong>Array de Objetos</strong>.</li>
                  <li>Campos Obrigatórios: <code className="bg-slate-100 px-1 py-0.5 rounded">tipo</code> ("receita" ou "despesa"), <code className="bg-slate-100 px-1 py-0.5 rounded">valor</code> (número positivo), <code className="bg-slate-100 px-1 py-0.5 rounded">dataVencimento</code> (AAAA-MM-DD), <code className="bg-slate-100 px-1 py-0.5 rounded">descricao</code> (texto).</li>
                  <li>Campos Opcionais: <code className="bg-slate-100 px-1 py-0.5 rounded">clienteId</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">embarcacaoId</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">categoria</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">status</code> ("pendente", "pago", etc).</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Preview & Submit */}
        <div className="space-y-4 flex flex-col">
          <span className="text-sm font-bold text-slate-700">Preview dos Lançamentos</span>

          <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-sm p-4 overflow-y-auto max-h-[26rem] space-y-3">
            {parsedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <HelpCircle className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Aguardando inserção de dados</p>
                <p className="text-xs">Insira um JSON no editor à esquerda para ver a validação.</p>
              </div>
            ) : (
              parsedItems.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    item.errors.length > 0 
                      ? 'bg-red-50/30 border-red-100' 
                      : item.warnings.length > 0 
                      ? 'bg-amber-50/30 border-amber-100' 
                      : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          item.validated.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.validated.tipo}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          R$ {Number(item.validated.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Venc: {item.validated.dataVencimento}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-1">{item.validated.descricao}</p>
                      
                      {/* Metadata resolved fields */}
                      {(item.resolvedClientName || item.resolvedBoatName) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500 bg-white/50 border border-slate-100 p-1.5 rounded-lg">
                          {item.resolvedClientName && (
                            <span className="flex items-center gap-1">
                              <strong>Dono:</strong> {item.resolvedClientName}
                            </span>
                          )}
                          {item.resolvedBoatName && (
                            <span className="flex items-center gap-1">
                              <strong>Barco:</strong> {item.resolvedBoatName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.validated.status}
                    </span>
                  </div>

                  {/* Errors */}
                  {item.errors.map((err, errIdx) => (
                    <div key={errIdx} className="flex items-center gap-1.5 text-[10.5px] text-red-700 font-medium mt-2 bg-red-50/60 px-2 py-1 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span>{err}</span>
                    </div>
                  ))}

                  {/* Warnings */}
                  {item.warnings.map((warn, warnIdx) => (
                    <div key={warnIdx} className="flex items-center gap-1.5 text-[10.5px] text-amber-700 font-medium mt-2 bg-amber-50/60 px-2 py-1 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Validation summary and Submit */}
          {parsedItems.length > 0 && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                  <p className="text-lg font-black">{parsedItems.length}</p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/15">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Válidos</p>
                  <p className="text-lg font-black text-emerald-400">{validItemsCount}</p>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/15">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Erros</p>
                  <p className="text-lg font-black text-rose-400">{parsedItems.length - validItemsCount}</p>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200">{submitError}</p>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-200 font-bold">Lançamentos importados com sucesso!</p>
                </div>
              )}

              <button
                disabled={isSubmitting || validItemsCount === 0 || submitSuccess}
                onClick={handleImport}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Importar {validItemsCount} Lançamento(s)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
