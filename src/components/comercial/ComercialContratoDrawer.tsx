import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Edit3,
  Sparkles,
  ExternalLink,
  Ship,
  Info,
  Calendar,
  CreditCard,
  AlertCircle
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
  onOpenViewer?: (cliente: Cliente, type: 'aquisicao' | 'adm' | 'aditivo') => void;
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

  // Aba ativa do modal split-view
  const [activeTab, setActiveTab] = useState<'minuta' | 'condicoes' | 'arquivo' | 'cotista' | 'observacoes'>('minuta');

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [contractType, setContractType] = useState<'aquisicao' | 'adm' | 'aditivo'>('aquisicao');
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincronizar listas ao abrir
  useEffect(() => {
    if (open) {
      setClients(clientDB.getAll());
      setBoats(boatDB.getAll());
      setActiveTab('minuta');
    }
  }, [open]);

  // Carregar dados específicos de acordo com o modelo selecionado
  const loadClientContractData = (client: Cliente, type: 'aquisicao' | 'adm' | 'aditivo') => {
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
    } else if (type === 'aditivo') {
      const st = client.contratoAditivoStatus || 'pendente';
      const url = client.contratoAditivoArquivoUrl || null;
      const nome = client.contratoAditivoArquivoNome || null;
      const key = client.contratoAditivoArquivoKey || null;
      const storage = client.contratoAditivoArquivoStorage || null;
      const dtAssinatura = client.contratoAditivoDataAssinatura || '';

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

  // Alternar modelo (Aquisição vs Administração vs Aditivo)
  const handleTypeChange = (newType: 'aquisicao' | 'adm' | 'aditivo') => {
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
      const isAditivo = contractType === 'aditivo';
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
        statusContrato: isAditivo ? (currentClient?.statusContrato || overallStatus) : overallStatus,
        tipoContrato: currentClient?.tipoContrato === 'ambos' ? 'ambos' : (isAditivo ? (currentClient?.tipoContrato || 'aquisicao') : contractType),
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
        } : isAditivo ? {
          contratoAditivoStatus: contractStatus,
          contratoAditivoDataAssinatura: effectiveAssinatura,
          contratoAditivoArquivoUrl: arquivoUrl || undefined,
          contratoAditivoArquivoNome: arquivoNome || undefined,
          contratoAditivoArquivoKey: arquivoKey || undefined,
          contratoAditivoArquivoStorage: (arquivoStorage as any) || undefined
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
          plano: client.plano
        },
        {
          nome: boat ? formatBoatName(boat.nome) : 'EMBARCAÇÃO NÃO IDENTIFICADA',
          modelo: boat?.modelo || '',
          fabricante: boat?.fabricante || '',
          ano: boat?.ano,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View do Dossiê do Cotista) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[660px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <FileSignature className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  {clienteId ? 'Gerenciar Contrato' : 'Emitir Contrato'}
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                {selectedClient ? (
                  <>Formalização e minutas de <span className="font-semibold text-stone-800">{selectedClient.nome}</span>.</>
                ) : (
                  'Formalização de cotistas, minutas e condições comerciais.'
                )}
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {/* Item 1: Minuta & Modelo */}
              <button
                type="button"
                onClick={() => setActiveTab('minuta')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'minuta'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSignature className="w-4 h-4 text-stone-600" />
                  <span>Contrato & Modelo</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  contractType === 'aquisicao'
                    ? 'bg-amber-100/80 text-amber-800'
                    : contractType === 'aditivo'
                    ? 'bg-emerald-100/80 text-emerald-800'
                    : 'bg-stone-200/80 text-stone-700'
                }`}>
                  {contractType === 'aquisicao' ? 'Aquisição' : contractType === 'aditivo' ? 'Aditivo' : 'Gestão'}
                </span>
              </button>

              {/* Item 2: Condições & Valores */}
              <button
                type="button"
                onClick={() => setActiveTab('condicoes')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'condicoes'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-stone-600" />
                  <span>Condições & Valores</span>
                </div>
              </button>

              {/* Item 3: Arquivo Assinado */}
              <button
                type="button"
                onClick={() => setActiveTab('arquivo')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'arquivo'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-stone-600" />
                  <span>Arquivo Assinado</span>
                </div>
                {arquivoUrl && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Arquivo anexado" />
                )}
              </button>

              {/* Item 4: Cotista & Embarcação */}
              <button
                type="button"
                onClick={() => setActiveTab('cotista')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'cotista'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-stone-600" />
                  <span>Cotista & Embarcação</span>
                </div>
              </button>

              {/* Item 5: Observações */}
              <button
                type="button"
                onClick={() => setActiveTab('observacoes')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'observacoes'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-stone-600" />
                  <span>Observações</span>
                </div>
              </button>
            </nav>

          </div>

          {/* Rodapé da Coluna Esquerda */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 font-medium">Situação Formal:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                contractStatus === 'assinado'
                  ? 'bg-emerald-100 text-emerald-800'
                  : contractStatus === 'pendente'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  contractStatus === 'assinado' ? 'bg-emerald-600' : contractStatus === 'pendente' ? 'bg-amber-500' : 'bg-stone-400'
                }`} />
                {contractStatus === 'assinado' ? 'Assinado' : contractStatus === 'pendente' ? 'Pendente' : 'Sem Contrato'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-400 pt-0.5">
              <span className="truncate max-w-[130px] font-medium text-stone-600">
                {selectedBoat ? formatBoatName(selectedBoat.nome) : 'Sem embarcação'}
              </span>
              <span className="font-semibold text-stone-700">{cota}</span>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
          
          {/* Cabeçalho da Seção Ativa + Botão Fechar */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
            <div>
              <h2 className="font-bold text-base text-stone-900 tracking-tight">
                {activeTab === 'minuta' && 'Contrato & Modelo Institucional'}
                {activeTab === 'condicoes' && 'Condições Comerciais & Pagamento'}
                {activeTab === 'arquivo' && 'Documento Assinado & Minutas'}
                {activeTab === 'cotista' && 'Vínculo de Cotista & Embarcação'}
                {activeTab === 'observacoes' && 'Observações do Contrato'}
              </h2>
              <p className="text-xs text-stone-500 font-normal mt-0.5">
                {activeTab === 'minuta' && 'Defina o tipo de minuta jurídica, status formal e datas oficiais de emissão e assinatura.'}
                {activeTab === 'condicoes' && 'Informações financeiras acordadas para aquisição e taxas mensais de gestão náutica.'}
                {activeTab === 'arquivo' && 'Gestão de arquivos digitalizados, armazenamento na nuvem e emissão de minuta em PDF.'}
                {activeTab === 'cotista' && 'Associe o contrato a um cotista cadastrado e selecione a embarcação e cota acordadas.'}
                {activeTab === 'observacoes' && 'Notas internas e termos específicos acordados entre as partes.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Área de Conteúdo Scrollável com Cards Padronizados */}
          <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
            
            {/* ─── ABA 1: MINUTA & MODELO ─── */}
            {activeTab === 'minuta' && (
              <div className="space-y-4">
                {/* Card de Tipo de Contrato */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Modelo de Contrato
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('aquisicao')}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractType === 'aquisicao'
                          ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>Aquisição</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeChange('adm')}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractType === 'adm'
                          ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>Gestão Náutica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeChange('aditivo')}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractType === 'aditivo'
                          ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Termo Aditivo</span>
                    </button>
                  </div>
                </div>

                {/* Card de Status Formal */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Status do Contrato
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setContractStatus('assinado');
                        if (!dataAssinatura) setDataAssinatura(new Date().toISOString().split('T')[0]);
                      }}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractStatus === 'assinado'
                          ? 'bg-white text-emerald-800 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assinado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContractStatus('pendente')}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractStatus === 'pendente'
                          ? 'bg-white text-amber-800 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pendente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContractStatus('sem_contrato')}
                      className={`h-9 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        contractStatus === 'sem_contrato'
                          ? 'bg-white text-stone-800 shadow-2xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <FileX2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>Sem Contrato</span>
                    </button>
                  </div>
                </div>

                {/* Card de Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={dataEmissao}
                      onChange={e => setDataEmissao(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Data da Assinatura
                    </label>
                    <input
                      type="date"
                      value={dataAssinatura}
                      onChange={e => setDataAssinatura(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── ABA 2: CONDIÇÕES & VALORES ─── */}
            {activeTab === 'condicoes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Valor Total da Cota (R$)
                    </label>
                    <input
                      type="text"
                      value={valorTotal}
                      onChange={e => setValorTotal(e.target.value)}
                      placeholder="Ex: 55.000,00"
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Valor da Entrada (R$)
                    </label>
                    <input
                      type="text"
                      value={valorEntrada}
                      onChange={e => setValorEntrada(e.target.value)}
                      placeholder="Ex: 12.040,00"
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Parcelamento (Nº de Parcelas)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={numParcelas}
                        onChange={e => setNumParcelas(e.target.value)}
                        placeholder="24"
                        className="w-20 h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold text-center focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="text-xs text-stone-400 font-semibold">x de R$</span>
                      <input
                        type="text"
                        value={valorParcela}
                        onChange={e => setValorParcela(e.target.value)}
                        placeholder="1.790,00"
                        className="flex-1 h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Vencimento Mensal
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">Todo dia</span>
                      <input
                        type="text"
                        value={diaVencimento}
                        onChange={e => setDiaVencimento(e.target.value)}
                        placeholder="10"
                        className="w-20 h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold text-center focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="text-xs text-stone-400">de cada mês</span>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Forma de Pagamento
                  </label>
                  <input
                    type="text"
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    placeholder="Boleto / Transferência Bancária / Pix"
                    className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                  />
                </div>
              </div>
            )}

            {/* ─── ABA 3: ARQUIVO ASSINADO & MINUTA ─── */}
            {activeTab === 'arquivo' && (
              <div className="space-y-4">
                {/* Upload ou Arquivo Anexado */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Arquivo do Contrato Assinado
                    </label>
                    {arquivoStorage && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                        {arquivoStorage === 'r2' ? 'Cloudflare R2' : 'Local'}
                      </span>
                    )}
                  </div>

                  {arquivoUrl ? (
                    <div className="p-3.5 rounded-xl border border-stone-200/80 bg-white flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                          <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {arquivoNome || 'Contrato_Assinado.pdf'}
                          </p>
                          <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                            <span>Documento formalizado</span>
                            {dataAssinatura && <span>• Assinado em {dataAssinatura}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedClient && onOpenViewer && (
                          <button
                            type="button"
                            onClick={() => onOpenViewer(selectedClient, contractType)}
                            className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Visualizar documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        )}

                        <a
                          href={arquivoUrl}
                          download={arquivoNome || 'Contrato_Assinado.pdf'}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Baixar arquivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleRemoveAnexo}
                          className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full p-6 rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-400 bg-white/70 hover:bg-white text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-6 h-6 text-stone-500 animate-spin" />
                            <span className="text-xs font-semibold text-stone-700">
                              Enviando arquivo... {uploadProgress > 0 && `${uploadProgress}%`}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-stone-800">
                                Clique para anexar o contrato assinado
                              </p>
                              <p className="text-[11px] text-stone-400">
                                Suporta PDF, PNG, JPG ou WEBP (até 25 MB)
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {uploadError}
                    </p>
                  )}
                </div>

                {/* Ações Rápidas de Minuta */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Geração & Modelos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleQuickDownload}
                      disabled={isDownloading || !selectedClientId}
                      className="h-10 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                          <span>Gerando Minuta...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-stone-600" />
                          <span>Baixar Minuta Oficial (PDF)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModeloModalOpen(true)}
                      className="h-10 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-stone-600" />
                      <span>Configurar Modelos Jurídicos</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── ABA 4: COTISTA & EMBARCAÇÃO ─── */}
            {activeTab === 'cotista' && (
              <div className="space-y-4">
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Cotista / Titular
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={e => handleClientChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400 cursor-pointer"
                  >
                    <option value="">Selecione um cotista...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cpf ? `(CPF: ${c.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Embarcação Vinculada
                    </label>
                    <select
                      value={selectedBoatId}
                      onChange={e => setSelectedBoatId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400 cursor-pointer"
                    >
                      <option value="">Selecione uma embarcação...</option>
                      {boats.map(b => (
                        <option key={b.id} value={b.id}>
                          {formatBoatName(b.nome)} ({b.modelo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Fração / Cota
                    </label>
                    <select
                      value={cota}
                      onChange={e => setCota(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400 cursor-pointer"
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

                {selectedClient && (
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1 text-xs text-stone-600">
                    <div className="flex items-center justify-between pb-1 border-b border-stone-200/50">
                      <span className="font-medium text-stone-400">CPF do Cotista:</span>
                      <span className="font-semibold text-stone-800">{selectedClient.cpf || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-medium text-stone-400">Telefone / WhatsApp:</span>
                      <span className="font-semibold text-stone-800">{selectedClient.telefone || 'Não informado'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA 5: OBSERVAÇÕES ─── */}
            {activeTab === 'observacoes' && (
              <div className="space-y-4">
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Observações e Notas do Contrato
                  </label>
                  <textarea
                    rows={8}
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Insira detalhes adicionais, condições comerciais específicas, termos de garantia ou observações gerais..."
                    className="w-full p-3.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-hidden focus:border-stone-400 resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

          </div>

          {/* ================= RODAPÉ PRINCIPAL DO MODAL ================= */}
          <footer className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
            {/* Ação Auxiliar na Esquerda */}
            <div>
              {selectedClient && onOpenViewer && (
                <button
                  type="button"
                  onClick={() => onOpenViewer(selectedClient, contractType)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visualizar Minuta no Navegador</span>
                </button>
              )}
            </div>

            {/* Botões de Ação na Direita */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Contrato</span>
                  </>
                )}
              </button>
            </div>
          </footer>

        </main>
      </div>

      {/* Modal de Configuração de Modelos */}
      {modeloModalOpen && (
        <ComercialContratoModeloModal
          isOpen={modeloModalOpen}
          onClose={() => setModeloModalOpen(false)}
          initialType={contractType}
        />
      )}
    </div>
  );
}
