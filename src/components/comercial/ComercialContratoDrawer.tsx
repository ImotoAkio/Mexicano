import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSignature,
  FileText,
  ShieldCheck,
  UserCheck,
  DollarSign,
  CheckCircle2,
  Clock,
  FileX2,
  Upload,
  Download,
  Trash2,
  Loader2,
  Eye,
  Check,
  FileCheck2,
  SlidersHorizontal,
  Edit3
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import { clientDB, boatDB } from '../../db';
import { formatBoatName } from '../../utils/constants';
import { generateContract } from '../ContractGenerator';
import { uploadContratoToStorage, validateContratoFile } from '../../utils/contratoStorage';
import ComercialContratoModeloModal from './ComercialContratoModeloModal';

interface ComercialContratoDrawerProps {
  open: boolean;
  onClose: () => void;
  clienteId?: string | null;
  onSave?: (cliente: Cliente) => void;
  onOpenViewer?: (cliente: Cliente, type: 'aquisicao' | 'adm') => void;
}

export default function ComercialContratoDrawer({
  open,
  onClose,
  clienteId,
  onSave,
  onOpenViewer
}: ComercialContratoDrawerProps) {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [contractType, setContractType] = useState<'aquisicao' | 'adm'>('aquisicao');
  const [contractStatus, setContractStatus] = useState<StatusContrato>('pendente');
  const [dataEmissao, setDataEmissao] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dataAssinatura, setDataAssinatura] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');

  // Valores de pagamento (Aquisição)
  const [valorTotal, setValorTotal] = useState('55.000,00');
  const [valorEntrada, setValorEntrada] = useState('12.040,00');
  const [numParcelas, setNumParcelas] = useState('24');
  const [valorParcela, setValorParcela] = useState('1.790,00');
  const [formaPagamento, setFormaPagamento] = useState('boleto / transferência bancária');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [cota, setCota] = useState('C1');

  // Anexo
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [arquivoKey, setArquivoKey] = useState<string | null>(null);
  const [arquivoStorage, setArquivoStorage] = useState<'r2' | 'local' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [modeloModalOpen, setModeloModalOpen] = useState(false);

  // Sincronizar listas ao abrir
  useEffect(() => {
    if (open) {
      setClients(clientDB.getAll());
      setBoats(boatDB.getAll());
    }
  }, [open]);

  // Carregar dados específicos de acordo com o modelo selecionado
  const loadClientContractData = (client: Cliente, type: 'aquisicao' | 'adm') => {
    if (type === 'aquisicao') {
      const st = client.contratoAquisicaoStatus || (client.tipoContrato !== 'adm' ? client.statusContrato : undefined) || 'pendente';
      const url = client.contratoAquisicaoArquivoUrl || (client.tipoContrato !== 'adm' ? client.contratoArquivoUrl : undefined) || null;
      const nome = client.contratoAquisicaoArquivoNome || (client.tipoContrato !== 'adm' ? client.contratoArquivoNome : undefined) || null;
      const key = client.contratoAquisicaoArquivoKey || null;
      const storage = client.contratoAquisicaoArquivoStorage || null;
      const dtAssinatura = client.contratoAquisicaoDataAssinatura || (client.tipoContrato !== 'adm' ? client.contratoDataAssinatura : undefined) || '';

      setContractStatus(st);
      setArquivoUrl(url);
      setArquivoNome(nome);
      setArquivoKey(key);
      setArquivoStorage(storage);
      setDataAssinatura(dtAssinatura);
    } else {
      const st = client.contratoAdmStatus || (client.tipoContrato === 'adm' ? client.statusContrato : undefined) || 'pendente';
      const url = client.contratoAdmArquivoUrl || (client.tipoContrato === 'adm' ? client.contratoArquivoUrl : undefined) || null;
      const nome = client.contratoAdmArquivoNome || (client.tipoContrato === 'adm' ? client.contratoArquivoNome : undefined) || null;
      const key = client.contratoAdmArquivoKey || null;
      const storage = client.contratoAdmArquivoStorage || null;
      const dtAssinatura = client.contratoAdmDataAssinatura || (client.tipoContrato === 'adm' ? client.contratoDataAssinatura : undefined) || '';

      setContractStatus(st);
      setArquivoUrl(url);
      setArquivoNome(nome);
      setArquivoKey(key);
      setArquivoStorage(storage);
      setDataAssinatura(dtAssinatura);
    }

    setDataEmissao(client.contratoDataEmissao || new Date().toISOString().split('T')[0]);
    setObservacoes(client.contratoObservacoes || '');

    if (client.contratoValores) {
      setValorTotal(client.contratoValores.valorTotal || '55.000,00');
      setValorEntrada(client.contratoValores.valorEntrada || '12.040,00');
      setNumParcelas(client.contratoValores.numParcelas || '24');
      setValorParcela(client.contratoValores.valorParcela || '1.790,00');
      setFormaPagamento(client.contratoValores.formaPagamento || 'boleto / transferência bancária');
      setDiaVencimento(client.contratoValores.diaVencimento || '10');
    }
  };

  // Carregar dados do cliente selecionado
  useEffect(() => {
    if (clienteId && open) {
      const foundClient = clientDB.getById(clienteId);
      if (foundClient) {
        setSelectedClientId(foundClient.id);
        const boatId = foundClient.embarcacoes?.[0]?.embarcacaoId || foundClient.embarcacaoId;
        setSelectedBoatId(boatId || '');
        setCota(foundClient.embarcacoes?.[0]?.cota || foundClient.cota || 'C1');

        const initialType = foundClient.tipoContrato === 'adm' ? 'adm' : 'aquisicao';
        setContractType(initialType);
        loadClientContractData(foundClient, initialType);
      }
    } else if (open && !clienteId) {
      setSelectedClientId('');
      setSelectedBoatId('');
      setContractType('aquisicao');
      setContractStatus('pendente');
      setDataEmissao(new Date().toISOString().split('T')[0]);
      setDataAssinatura('');
      setObservacoes('');
      setArquivoUrl(null);
      setArquivoNome(null);
      setArquivoKey(null);
      setArquivoStorage(null);
    }
  }, [clienteId, open]);

  // Alternar modelo (Aquisição vs Administração)
  const handleTypeChange = (newType: 'aquisicao' | 'adm') => {
    setContractType(newType);
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      loadClientContractData(client, newType);
    }
  };

  // Se trocar cliente selecionado no dropdown
  const handleClientChange = (cId: string) => {
    setSelectedClientId(cId);
    const client = clients.find(c => c.id === cId);
    if (client) {
      const bId = client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId;
      if (bId) setSelectedBoatId(bId);
      setCota(client.embarcacoes?.[0]?.cota || client.cota || 'C1');
      loadClientContractData(client, contractType);
    }
  };

  // Upload de anexo com validação e envio para R2 (fallback local)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationMsg = validateContratoFile(file);
    if (validationMsg) {
      setUploadError(validationMsg);
      alert(validationMsg);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const uploadRes = await uploadContratoToStorage(
        file,
        contractType,
        selectedClientId || 'temp',
        percent => setUploadProgress(percent)
      );

      setArquivoUrl(uploadRes.url);
      setArquivoNome(uploadRes.filename);
      setArquivoKey(uploadRes.key || null);
      setArquivoStorage(uploadRes.storage || 'r2');

      if (contractStatus === 'sem_contrato') {
        setContractStatus('assinado');
      }
      if (!dataAssinatura) {
        setDataAssinatura(new Date().toISOString().split('T')[0]);
      }
    } catch (err: any) {
      console.error('Falha no upload para R2, fallback local:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setArquivoUrl(reader.result as string);
        setArquivoNome(file.name);
        setArquivoStorage('local');
        if (contractStatus === 'sem_contrato') setContractStatus('assinado');
        if (!dataAssinatura) setDataAssinatura(new Date().toISOString().split('T')[0]);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remover anexo
  const handleRemoveAnexo = () => {
    if (!window.confirm('Deseja remover o anexo deste contrato?')) return;
    setArquivoUrl(null);
    setArquivoNome(null);
    setArquivoKey(null);
    setArquivoStorage(null);
  };

  // Salvar alterações no contrato
  const handleSave = () => {
    if (!selectedClientId) {
      alert('Por favor selecione um cliente.');
      return;
    }

    setIsSaving(true);
    try {
      const isAquisicao = contractType === 'aquisicao';
      const effectiveAssinatura = contractStatus === 'assinado' ? (dataAssinatura || new Date().toISOString().split('T')[0]) : undefined;
      const currentClient = clients.find(c => c.id === selectedClientId);

      const otherHasSigned = isAquisicao
        ? Boolean(currentClient?.contratoAdmArquivoUrl || currentClient?.contratoAdmStatus === 'assinado')
        : Boolean(currentClient?.contratoAquisicaoArquivoUrl || currentClient?.contratoAquisicaoStatus === 'assinado');

      let overallStatus: StatusContrato = 'pendente';
      if (contractStatus === 'assinado') {
        overallStatus = currentClient?.tipoContrato === 'ambos' ? (otherHasSigned ? 'assinado' : 'pendente') : 'assinado';
      } else if (contractStatus === 'sem_contrato') {
        overallStatus = otherHasSigned ? 'pendente' : 'sem_contrato';
      } else {
        overallStatus = 'pendente';
      }

      const updated = clientDB.update(selectedClientId, {
        statusContrato: overallStatus,
        tipoContrato: currentClient?.tipoContrato === 'ambos' ? 'ambos' : contractType,
        contratoDataEmissao: dataEmissao,
        contratoDataAssinatura: effectiveAssinatura,
        contratoObservacoes: observacoes,
        embarcacaoId: selectedBoatId || undefined,
        cota: cota,
        ...(isAquisicao ? {
          contratoAquisicaoStatus: contractStatus,
          contratoAquisicaoDataAssinatura: effectiveAssinatura,
          contratoAquisicaoArquivoUrl: arquivoUrl || undefined,
          contratoAquisicaoArquivoNome: arquivoNome || undefined,
          contratoAquisicaoArquivoKey: arquivoKey || undefined,
          contratoAquisicaoArquivoStorage: (arquivoStorage as any) || undefined,
          contratoArquivoUrl: arquivoUrl || undefined,
          contratoArquivoNome: arquivoNome || undefined
        } : {
          contratoAdmStatus: contractStatus,
          contratoAdmDataAssinatura: effectiveAssinatura,
          contratoAdmArquivoUrl: arquivoUrl || undefined,
          contratoAdmArquivoNome: arquivoNome || undefined,
          contratoAdmArquivoKey: arquivoKey || undefined,
          contratoAdmArquivoStorage: (arquivoStorage as any) || undefined,
          ...(currentClient?.tipoContrato === 'adm' ? {
            contratoArquivoUrl: arquivoUrl || undefined,
            contratoArquivoNome: arquivoNome || undefined
          } : {})
        }),
        contratoValores: {
          valorTotal,
          valorEntrada,
          numParcelas,
          valorParcela,
          formaPagamento,
          diaVencimento
        }
      });

      if (onSave) onSave(updated);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar contrato:', err);
      alert('Erro ao salvar dados do contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  // Download rápido do PDF
  const handleQuickDownload = async () => {
    const client = clients.find(c => c.id === selectedClientId);
    const boat = boats.find(b => b.id === selectedBoatId);
    if (!client) {
      alert('Selecione um cliente primeiro.');
      return;
    }

    setIsDownloading(true);
    try {
      await generateContract(
        contractType,
        {
          nome: client.nome,
          cpf: client.cpf,
          rg: client.rg,
          cnh_cha: client.cnh_cha || client.numeroHabilitacao,
          cidade: client.cidade,
          estado: client.estado,
          telefone: client.telefone,
          logradouro: client.logradouro,
          numeroEnd: client.numeroEnd,
          bairro: client.bairro,
          cep: client.cep,
          cota: cota,
          dataAssinatura: contractStatus === 'assinado' ? dataAssinatura : undefined,
          dataCadastro: dataEmissao
        },
        {
          nome: boat?.nome ? formatBoatName(boat.nome) : 'MEXICANO',
          modelo: boat?.modelo || 'Lancha',
          chassi: boat?.chassi || boat?.numero || '',
          inscricao: boat?.inscricao || '',
          tipo_propulsao: boat?.tipo_propulsao || 'MOTOR CENTRO-RABETA',
          potencia: boat?.potencia || '',
        },
        {
          valorTotal,
          valorEntrada,
          numParcelas,
          valorParcela,
          formaPagamento,
          diaVencimento
        }
      );
    } catch (err) {
      console.error('Erro no download rápido da minuta:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Atalho de teclado para fechar (Esc)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const selectedBoat = useMemo(() => {
    return boats.find(b => b.id === selectedBoatId) || null;
  }, [boats, selectedBoatId]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop padronizado com o dashboard */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel — Floating layout idêntico ao ComercialClientDrawer */}
      <aside
        role="dialog"
        aria-label="Gerenciar contrato"
        className={`absolute top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[500px] lg:w-[540px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header no padrão exato do Dashboard */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-stone-100 shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink font-bold text-xs flex items-center justify-center shrink-0">
              <FileSignature className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-stone-900 truncate">
                  {clienteId ? 'Gerenciar Contrato' : 'Emitir Contrato'}
                </h2>
                {selectedClient && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      contractStatus === 'assinado'
                        ? 'bg-emerald-50 text-emerald-700'
                        : contractStatus === 'pendente'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {contractStatus === 'assinado' ? 'Assinado' : contractStatus === 'pendente' ? 'Pendente' : 'Sem contrato'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {selectedClient ? (
                  <span>
                    Cotista: <strong className="text-stone-700 font-semibold">{selectedClient.nome}</strong>
                    {selectedBoat && ` • ${formatBoatName(selectedBoat.nome)} (${cota})`}
                  </span>
                ) : (
                  'Formalização de cotistas e minutas'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Formulário com Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-stone-800">

          {/* CARD 1: COTISTA & EMBARCAÇÃO */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900">
                <UserCheck className="w-4 h-4 text-stone-500" />
                <h3 className="text-[13px] font-semibold">Cotista & Embarcação</h3>
              </div>
              {selectedClient?.cpf && (
                <span className="text-[11px] font-mono text-stone-400">
                  CPF: {selectedClient.cpf}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Cliente / Cotista <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => handleClientChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white cursor-pointer"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cpf ? `(CPF: ${c.cpf})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Embarcação Objeto
                  </label>
                  <select
                    value={selectedBoatId}
                    onChange={e => setSelectedBoatId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {boats.map(b => (
                      <option key={b.id} value={b.id}>
                        {formatBoatName(b.nome)} ({b.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Cota
                  </label>
                  <select
                    value={cota}
                    onChange={e => setCota(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white cursor-pointer"
                  >
                    <option value="C1">Cota C1 (25%)</option>
                    <option value="C2">Cota C2 (25%)</option>
                    <option value="C3">Cota C3 (25%)</option>
                    <option value="C4">Cota C4 (25%)</option>
                    <option value="50%">Cota 50% (Dupla)</option>
                    <option value="100%">100% (Integral)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: MODELO DE CONTRATO & SITUAÇÃO FORMAL */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <FileText className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Modelo de Contrato & Situação</h3>
            </div>

            <div className="space-y-3">
              {/* Seletor Segmentado de Modelo */}
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                  Tipo de Contrato
                </label>
                <div className="grid grid-cols-2 gap-2 bg-stone-50 p-1 rounded-lg border border-stone-200/80">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('aquisicao')}
                    className={`h-8 px-3 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contractType === 'aquisicao'
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Aquisição (Cota)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('adm')}
                    className={`h-8 px-3 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contractType === 'adm'
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administração</span>
                  </button>
                </div>
              </div>

              {/* Seletor Segmentado de Status */}
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                  Status do Contrato
                </label>
                <div className="grid grid-cols-3 gap-2 bg-stone-50 p-1 rounded-lg border border-stone-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setContractStatus('assinado');
                      if (!dataAssinatura) setDataAssinatura(new Date().toISOString().split('T')[0]);
                    }}
                    className={`h-8 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contractStatus === 'assinado'
                        ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Assinado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContractStatus('pendente')}
                    className={`h-8 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contractStatus === 'pendente'
                        ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pendente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContractStatus('sem_contrato')}
                    className={`h-8 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contractStatus === 'sem_contrato'
                        ? 'bg-white text-stone-700 shadow-xs border border-stone-200'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <FileX2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Não possui</span>
                  </button>
                </div>
              </div>

              {/* Datas de Emissão e Assinatura */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={e => setDataEmissao(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                {contractStatus === 'assinado' ? (
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-700 block mb-1">
                      Data da Assinatura
                    </label>
                    <input
                      type="date"
                      value={dataAssinatura}
                      onChange={e => setDataAssinatura(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-emerald-300 text-xs text-emerald-950 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex items-center text-[11px] text-stone-400 pt-5">
                    {contractStatus === 'pendente' ? 'Aguardando assinatura' : 'Sem formalização'}
                  </div>
                )}
              </div>

              {/* Ações de Edição do Modelo Base e Edição Direta no Texto */}
              <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModeloModalOpen(true)}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Editar o modelo institucional base deste contrato"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                  <span>Editar Modelo Base</span>
                </button>

                {selectedClientId && onOpenViewer && (
                  <button
                    type="button"
                    onClick={() => {
                      const client = clients.find(c => c.id === selectedClientId);
                      if (client) onOpenViewer(client, contractType);
                    }}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Editar as cláusulas e o texto diretamente na folha para este cotista"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Editar no Texto Direto</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* CARD 3: CONDIÇÕES COMERCIAIS & PAGAMENTO (APENAS AQUISIÇÃO) */}
          {contractType === 'aquisicao' && (
            <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
              <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
                <DollarSign className="w-4 h-4 text-stone-500" />
                <h3 className="text-[13px] font-semibold">Condições Comerciais & Pagamento</h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Valor Total da Cota (R$)
                  </label>
                  <input
                    type="text"
                    value={valorTotal}
                    onChange={e => setValorTotal(e.target.value)}
                    placeholder="55.000,00"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Valor de Entrada (R$)
                  </label>
                  <input
                    type="text"
                    value={valorEntrada}
                    onChange={e => setValorEntrada(e.target.value)}
                    placeholder="12.040,00"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Nº de Parcelas
                  </label>
                  <input
                    type="text"
                    value={numParcelas}
                    onChange={e => setNumParcelas(e.target.value)}
                    placeholder="24"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="text"
                    value={valorParcela}
                    onChange={e => setValorParcela(e.target.value)}
                    placeholder="1.790,00"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Dia do Vencimento
                  </label>
                  <input
                    type="text"
                    value={diaVencimento}
                    onChange={e => setDiaVencimento(e.target.value)}
                    placeholder="10"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Forma de Pagamento
                  </label>
                  <input
                    type="text"
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    placeholder="boleto / transferência bancária"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>
              </div>
            </section>
          )}

          {/* CARD 4: CÓPIA DO CONTRATO ASSINADO (ANEXO) */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Upload className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Cópia do Contrato Assinado (Opcional)</h3>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-red-500 hover:text-red-700 font-bold px-1"
                >
                  ×
                </button>
              </div>
            )}

            {isUploading ? (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-stone-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
                  <span>Enviando ({uploadProgress}%)...</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-stone-800 h-1 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : arquivoUrl ? (
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium text-stone-800 truncate">
                    {arquivoNome || 'Arquivo anexado'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={arquivoUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={arquivoNome || 'contrato_assinado.pdf'}
                    className="p-1 hover:bg-stone-200 text-stone-600 rounded transition-colors"
                    title="Baixar anexo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveAnexo}
                    className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block p-3 border border-dashed border-stone-200 hover:border-stone-400 rounded-lg text-center hover:bg-stone-50 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                  <span className="text-xs font-medium text-stone-700 block">
                    Clique para selecionar cópia assinada (PDF ou Foto)
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    PDF, JPG ou PNG
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </section>

          {/* CARD 5: OBSERVAÇÕES */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-2">
            <label className="text-[11px] font-semibold text-stone-600 block">
              Observações Jurídicas / Comerciais
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex: Assinatura presencial colhida na marina..."
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white resize-none"
            />
          </section>

        </div>

        {/* Rodapé fixo do Drawer — Padrão Comercial */}
        <footer className="h-16 px-5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDownloading || !selectedClientId}
              onClick={handleQuickDownload}
              className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar minuta em PDF"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>Baixar Minuta</span>
            </button>

            {selectedClientId && onOpenViewer && (
              <button
                type="button"
                onClick={() => {
                  const client = clients.find(c => c.id === selectedClientId);
                  if (client) onOpenViewer(client, contractType);
                }}
                className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir no visualizador oficial"
              >
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>Abrir Visualizador</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-8 px-3.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedClientId}
              className="h-8 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar alterações</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </aside>

      {/* Modal de Edição de Modelo Base */}
      <ComercialContratoModeloModal
        isOpen={modeloModalOpen}
        onClose={() => setModeloModalOpen(false)}
        initialType={contractType}
      />
    </div>
  );
}
