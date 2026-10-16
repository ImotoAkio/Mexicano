import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Ship,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  FileX2,
  Download,
  Eye,
  User,
  Paperclip,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  DollarSign,
  ShieldCheck,
  Folder,
  MessageCircle,
  Upload,
  FileCheck2,
  Loader2,
  Trash2,
  Info,
  Sparkles,
  CreditCard,
  UserCheck,
  Anchor
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import { formatBoatName } from '../../utils/constants';
import { uploadContratoToStorage } from '../../utils/contratoStorage';

interface ComercialFolderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Cliente | null;
  boat: Embarcacao | null;
  onOpenViewer: (client: Cliente, type: 'aquisicao' | 'adm' | 'aditivo', tab?: 'documento' | 'pdf' | 'anexo') => void;
  onDownloadPdf: (client: Cliente, e: React.MouseEvent, type?: 'aquisicao' | 'adm' | 'aditivo') => void;
  onEditContract: (clientId: string) => void;
  onStatusChange: (clientId: string, newStatus: StatusContrato, extraData?: Partial<Cliente>) => void;
  onOpenFullProfile?: (client: Cliente) => void;
}

export default function ComercialFolderDetailsModal({
  isOpen,
  onClose,
  client,
  boat,
  onOpenViewer,
  onDownloadPdf,
  onEditContract,
  onStatusChange,
  onOpenFullProfile
}: ComercialFolderDetailsModalProps) {
  const [localClient, setLocalClient] = useState<Cliente | null>(client);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  // Abas do Menu Lateral (Estilo Split View da Referência)
  const [activeTab, setActiveTab] = useState<'contratos' | 'condicoes' | 'cadastro' | 'embarcacao'>('contratos');

  // Alternador do tipo de contrato ativo na aba Contratos
  const [activeContractSubtype, setActiveContractSubtype] = useState<'aquisicao' | 'adm' | 'aditivo'>('aquisicao');

  // Estados de upload para cada tipo de contrato
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalClient(client);
  }, [client]);

  const activeClient = localClient || client;
  if (!isOpen || !activeClient) return null;

  const status = activeClient.statusContrato || 'sem_contrato';
  const cotaVal = activeClient.embarcacoes?.[0]?.cota || activeClient.cota || 'C1 (25%)';
  const boatName = boat ? formatBoatName(boat.nome) : 'Embarcação não vinculada';

  // Identificação individual e retrocompatível de cada contrato
  const hasAquisicaoAssinado = Boolean(
    activeClient.contratoAquisicaoArquivoUrl ||
    (activeClient.tipoContrato !== 'adm' && activeClient.contratoArquivoUrl)
  );
  const aquisicaoNome = activeClient.contratoAquisicaoArquivoNome ||
    (activeClient.tipoContrato !== 'adm' ? activeClient.contratoArquivoNome : undefined) ||
    'Contrato_Aquisicao_Assinado.pdf';
  const aquisicaoUrl = activeClient.contratoAquisicaoArquivoUrl ||
    (activeClient.tipoContrato !== 'adm' ? activeClient.contratoArquivoUrl : undefined);
  const aquisicaoTamanho = activeClient.contratoAquisicaoArquivoTamanho ||
    (activeClient.tipoContrato !== 'adm' ? activeClient.contratoArquivoTamanho : undefined);
  const aquisicaoData = activeClient.contratoAquisicaoDataAssinatura ||
    (activeClient.tipoContrato !== 'adm' ? activeClient.contratoDataAssinatura : undefined);

  const hasAdmAssinado = Boolean(
    activeClient.contratoAdmArquivoUrl ||
    (activeClient.tipoContrato === 'adm' && activeClient.contratoArquivoUrl)
  );
  const admNome = activeClient.contratoAdmArquivoNome ||
    (activeClient.tipoContrato === 'adm' ? activeClient.contratoArquivoNome : undefined) ||
    'Contrato_Gestao_Nautica_Assinado.pdf';
  const admUrl = activeClient.contratoAdmArquivoUrl ||
    (activeClient.tipoContrato === 'adm' ? activeClient.contratoArquivoUrl : undefined);
  const admTamanho = activeClient.contratoAdmArquivoTamanho ||
    (activeClient.tipoContrato === 'adm' ? activeClient.contratoArquivoTamanho : undefined);
  const admData = activeClient.contratoAdmDataAssinatura ||
    (activeClient.tipoContrato === 'adm' ? activeClient.contratoDataAssinatura : undefined);

  const hasAditivoAssinado = Boolean(
    activeClient.contratoAditivoArquivoUrl || activeClient.contratoAditivoStatus === 'assinado'
  );
  const aditivoNome = activeClient.contratoAditivoArquivoNome || 'Aditivo_Nautico_Assinado.pdf';
  const aditivoUrl = activeClient.contratoAditivoArquivoUrl;
  const aditivoTamanho = activeClient.contratoAditivoArquivoTamanho;
  const aditivoData = activeClient.contratoAditivoDataAssinatura;

  const totalAssinados = (hasAquisicaoAssinado ? 1 : 0) + (hasAdmAssinado ? 1 : 0) + (hasAditivoAssinado ? 1 : 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Data recente';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload de arquivo assinado para o tipo de contrato ativo
  const processContractFile = async (type: 'aquisicao' | 'adm' | 'aditivo', file: File) => {
    if (!activeClient) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const uploadRes = await uploadContratoToStorage(
        file,
        type,
        activeClient.id,
        (percent) => setUploadProgress(percent)
      );
      const today = new Date().toISOString().split('T')[0];

      const isAquisicao = type === 'aquisicao';
      const isAditivo = type === 'aditivo';
      const clientType = activeClient.tipoContrato || 'aquisicao';
      let newOverallStatus: StatusContrato = 'assinado';
      if (clientType === 'ambos') {
        const otherSigned = isAquisicao ? hasAdmAssinado : hasAquisicaoAssinado;
        newOverallStatus = otherSigned ? 'assinado' : 'pendente';
      } else {
        newOverallStatus = isAditivo ? (activeClient.statusContrato || 'assinado') : 'assinado';
      }

      const updateData: Partial<Cliente> = isAquisicao
        ? {
            contratoAquisicaoStatus: 'assinado',
            contratoAquisicaoArquivoUrl: uploadRes.url,
            contratoAquisicaoArquivoNome: uploadRes.filename,
            contratoAquisicaoArquivoTamanho: uploadRes.size,
            contratoAquisicaoArquivoKey: uploadRes.key,
            contratoAquisicaoArquivoStorage: uploadRes.storage,
            contratoAquisicaoDataAssinatura: today,
            statusContrato: newOverallStatus,
            contratoArquivoUrl: uploadRes.url,
            contratoArquivoNome: uploadRes.filename,
            contratoArquivoTamanho: uploadRes.size,
            contratoDataAssinatura: today
          }
        : isAditivo
        ? {
            contratoAditivoStatus: 'assinado',
            contratoAditivoArquivoUrl: uploadRes.url,
            contratoAditivoArquivoNome: uploadRes.filename,
            contratoAditivoArquivoTamanho: uploadRes.size,
            contratoAditivoArquivoKey: uploadRes.key,
            contratoAditivoArquivoStorage: uploadRes.storage,
            contratoAditivoDataAssinatura: today
          }
        : {
            contratoAdmStatus: 'assinado',
            contratoAdmArquivoUrl: uploadRes.url,
            contratoAdmArquivoNome: uploadRes.filename,
            contratoAdmArquivoTamanho: uploadRes.size,
            contratoAdmArquivoKey: uploadRes.key,
            contratoAdmArquivoStorage: uploadRes.storage,
            contratoAdmDataAssinatura: today,
            statusContrato: newOverallStatus,
            ...(activeClient.tipoContrato === 'adm'
              ? {
                  contratoArquivoUrl: uploadRes.url,
                  contratoArquivoNome: uploadRes.filename,
                  contratoArquivoTamanho: uploadRes.size,
                  contratoDataAssinatura: today
                }
              : {})
          };

      setLocalClient(prev => (prev ? { ...prev, ...updateData } : null));
      if (onStatusChange) {
        onStatusChange(activeClient.id, newOverallStatus, updateData);
      }
    } catch (err: any) {
      console.error('Erro ao salvar contrato no bucket R2:', err);
      const msg = err?.message || 'Erro ao enviar o contrato assinado. Tente novamente.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remover contrato assinado
  const handleRemoveContractFile = (type: 'aquisicao' | 'adm' | 'aditivo') => {
    if (!activeClient) return;
    const typeLabel = type === 'aquisicao' ? 'Contrato de Aquisição' : type === 'aditivo' ? 'Aditivo Náutico' : 'Contrato de Gestão Náutica';
    if (!window.confirm(`Tem certeza que deseja remover o documento assinado do ${typeLabel}?`)) return;

    const isAquisicao = type === 'aquisicao';
    const isAditivo = type === 'aditivo';
    const otherSigned = isAquisicao ? hasAdmAssinado : hasAquisicaoAssinado;
    const newOverallStatus: StatusContrato = otherSigned ? 'pendente' : 'pendente';

    const updateData: Partial<Cliente> = isAquisicao
      ? {
          contratoAquisicaoStatus: 'pendente',
          contratoAquisicaoArquivoUrl: null as any,
          contratoAquisicaoArquivoNome: null as any,
          contratoAquisicaoArquivoTamanho: null as any,
          contratoAquisicaoArquivoKey: null as any,
          contratoAquisicaoArquivoStorage: null as any,
          contratoAquisicaoDataAssinatura: null as any,
          statusContrato: newOverallStatus,
          contratoArquivoUrl: hasAdmAssinado ? admUrl : (null as any),
          contratoArquivoNome: hasAdmAssinado ? admNome : (null as any),
          contratoArquivoTamanho: hasAdmAssinado ? admTamanho : (null as any),
          contratoDataAssinatura: hasAdmAssinado ? admData : (null as any)
        }
      : isAditivo
      ? {
          contratoAditivoStatus: 'pendente',
          contratoAditivoArquivoUrl: null as any,
          contratoAditivoArquivoNome: null as any,
          contratoAditivoArquivoTamanho: null as any,
          contratoAditivoArquivoKey: null as any,
          contratoAditivoArquivoStorage: null as any,
          contratoAditivoDataAssinatura: null as any
        }
      : {
          contratoAdmStatus: 'pendente',
          contratoAdmArquivoUrl: null as any,
          contratoAdmArquivoNome: null as any,
          contratoAdmArquivoTamanho: null as any,
          contratoAdmArquivoKey: null as any,
          contratoAdmArquivoStorage: null as any,
          contratoAdmDataAssinatura: null as any,
          statusContrato: newOverallStatus,
          ...(activeClient.tipoContrato === 'adm'
            ? {
                contratoArquivoUrl: hasAquisicaoAssinado ? aquisicaoUrl : (null as any),
                contratoArquivoNome: hasAquisicaoAssinado ? aquisicaoNome : (null as any),
                contratoArquivoTamanho: hasAquisicaoAssinado ? aquisicaoTamanho : (null as any),
                contratoDataAssinatura: hasAquisicaoAssinado ? aquisicaoData : (null as any)
              }
            : {})
        };

    setLocalClient(prev => (prev ? { ...prev, ...updateData } : null));
    if (onStatusChange) {
      onStatusChange(activeClient.id, newOverallStatus, updateData);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return 'Não informado';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const getWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    const full = clean.length <= 11 ? `55${clean}` : clean;
    return `https://wa.me/${full}`;
  };

  const waUrl = getWhatsAppUrl(activeClient.telefone);

  const statusConfig = {
    assinado: {
      label: totalAssinados >= 2 ? `Contratos Assinados (${totalAssinados}/3)` : 'Contrato Assinado',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColor: 'bg-emerald-500'
    },
    pendente: {
      label: totalAssinados >= 1 ? `${totalAssinados} Assinado(s)` : 'Aguardando Assinatura',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500'
    },
    sem_contrato: {
      label: 'Não Possui Contrato',
      badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
      dotColor: 'bg-stone-400'
    }
  };

  const currentStatusTheme = statusConfig[status] || statusConfig.sem_contrato;

  // Informações do contrato atualmente selecionado no seletor segmentado
  const currentSubtypeIsAquisicao = activeContractSubtype === 'aquisicao';
  const currentSubtypeIsAditivo = activeContractSubtype === 'aditivo';
  const currentHasSigned = currentSubtypeIsAquisicao ? hasAquisicaoAssinado : currentSubtypeIsAditivo ? hasAditivoAssinado : hasAdmAssinado;
  const currentFileName = currentSubtypeIsAquisicao ? aquisicaoNome : currentSubtypeIsAditivo ? aditivoNome : admNome;
  const currentFileUrl = currentSubtypeIsAquisicao ? aquisicaoUrl : currentSubtypeIsAditivo ? aditivoUrl : admUrl;
  const currentFileSize = currentSubtypeIsAquisicao ? aquisicaoTamanho : currentSubtypeIsAditivo ? aditivoTamanho : admTamanho;
  const currentSignDate = currentSubtypeIsAquisicao ? aquisicaoData : currentSubtypeIsAditivo ? aditivoData : admData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View da Imagem de Referência) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[660px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        
        {/* ================= COLUNA LATERAL ESQUERDA (ESTILO REFERÊNCIA) ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <FileText className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  Dossiê do Cotista
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Gestão completa de minutas, contratos assinados, cotas e condições comerciais de <span className="font-semibold text-stone-800">{activeClient.nome}</span>.
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {/* Item 1: Contratos & Minutas */}
              <button
                type="button"
                onClick={() => setActiveTab('contratos')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'contratos'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-stone-600" />
                  <span>Contratos & Minutas</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalAssinados > 0 ? 'bg-emerald-100/80 text-emerald-800' : 'bg-stone-200/80 text-stone-600'
                }`}>
                  {totalAssinados}/2
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

              {/* Item 3: Dados Cadastrais */}
              <button
                type="button"
                onClick={() => setActiveTab('cadastro')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'cadastro'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-stone-600" />
                  <span>Dados Cadastrais</span>
                </div>
              </button>

              {/* Item 4: Embarcação & Cota */}
              <button
                type="button"
                onClick={() => setActiveTab('embarcacao')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'embarcacao'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Ship className="w-4 h-4 text-stone-600" />
                  <span>Embarcação & Cota</span>
                </div>
              </button>
            </nav>

          </div>

          {/* Rodapé da Coluna Esquerda: Status do Cotista */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4 md:mt-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500">Situação Formal:</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentStatusTheme.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatusTheme.dotColor}`} />
                <span>{currentStatusTheme.label}</span>
              </span>
            </div>

            {/* Barra de Progresso de Assinatura */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-stone-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-mx-ink transition-all duration-300"
                  style={{ width: `${(totalAssinados / 2) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                <span>{boatName}</span>
                <span>{cotaVal}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= PAINEL PRINCIPAL DIREITO (CANVAS DE CONTEÚDO) ================= */}
        <main className="flex-1 bg-white p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-5">
            {/* Topo do Painel Direito */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-stone-900 tracking-tight">
                  {activeTab === 'contratos' && 'Contratos & Minutas'}
                  {activeTab === 'condicoes' && 'Condições Comerciais & Pagamento'}
                  {activeTab === 'cadastro' && 'Dados Cadastrais do Cotista'}
                  {activeTab === 'embarcacao' && 'Embarcação Vinculada & Cota'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {activeTab === 'contratos' && 'Visualize a minuta em formato A4, baixe o PDF ou faça o envio do documento assinado.'}
                  {activeTab === 'condicoes' && 'Informações financeiras acordadas para aquisição e taxas mensais de gestão náutica.'}
                  {activeTab === 'cadastro' && 'Dados pessoais, documento e contatos registrados no sistema comercial.'}
                  {activeTab === 'embarcacao' && 'Detalhes da embarcação em que a cota compartilhada está registrada.'}
                </p>
              </div>

              {/* Botão Fechar */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: CONTRATOS & MINUTAS */}
            {activeTab === 'contratos' && (
              <div className="space-y-4">
                
                {/* Seletor Segmentado (Estilo "Poll type" da Imagem de Referência) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-600 block">
                    Modelo de Contrato
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60 max-w-lg">
                    <button
                      type="button"
                      onClick={() => setActiveContractSubtype('aquisicao')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeContractSubtype === 'aquisicao'
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-stone-700" />
                      <span>Aquisição (Cota)</span>
                      {hasAquisicaoAssinado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveContractSubtype('adm')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeContractSubtype === 'adm'
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-700" />
                      <span>Gestão Náutica</span>
                      {hasAdmAssinado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveContractSubtype('aditivo')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeContractSubtype === 'aditivo'
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Anchor className="w-3.5 h-3.5 text-stone-700" />
                      <span>Aditivo (Seg/Ter)</span>
                      {hasAditivoAssinado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  </div>
                </div>

                {/* Caixa de Ações do Contrato (Estilo "Options" da Imagem de Referência) */}
                <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">
                        {currentSubtypeIsAquisicao ? 'Contrato de Aquisição de Cota' : currentSubtypeIsAditivo ? 'Aditivo Náutico (Segunda e Terça)' : 'Contrato de Gestão e Administração'}
                      </span>
                      <span className="text-[11px] text-stone-400">•</span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        {currentSubtypeIsAquisicao ? 'Mexicano Lanchas LTDA' : 'Vale Administradora de Bens Náuticos'}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      currentHasSigned ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {currentHasSigned ? 'Assinado' : 'Minuta Pronta'}
                    </span>
                  </div>

                  {/* Linha 1: Visualizar Minuta Oficial */}
                  <div
                    onClick={() => onOpenViewer(activeClient, activeContractSubtype, 'documento')}
                    className="bg-white rounded-xl border border-stone-200/80 p-3 flex items-center justify-between hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-mx-ink-100 group-hover:text-mx-ink text-stone-600 flex items-center justify-center transition-colors">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-900 group-hover:text-mx-ink transition-colors">
                          Visualizar Minuta Oficial A4
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Formato pronto para impressão ou edição direta no texto
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-stone-600 group-hover:text-mx-ink group-hover:translate-x-0.5 transition-all">
                      Abrir →
                    </span>
                  </div>

                  {/* Linha 2: Baixar PDF Oficial */}
                  <div
                    onClick={(e) => onDownloadPdf(activeClient, e, activeContractSubtype)}
                    className="bg-white rounded-xl border border-stone-200/80 p-3 flex items-center justify-between hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-900">
                          Exportar Contrato em PDF
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Gera documento em alta fidelidade pronto para assinatura física
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-900 transition-colors">
                      Baixar PDF
                    </span>
                  </div>

                  {/* Linha 3: Cópia Assinada (Anexo) */}
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processContractFile(activeContractSubtype, f);
                      }}
                      accept=".pdf,image/*"
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="bg-white rounded-xl border border-stone-200/80 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-mx-ink" />
                          <span className="text-xs font-semibold text-stone-700">
                            Enviando documento assinado ({uploadProgress}%)...
                          </span>
                        </div>
                      </div>
                    ) : currentHasSigned && currentFileUrl ? (
                      <div className="bg-white rounded-xl border border-emerald-200/80 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-emerald-950 block truncate">
                              {currentFileName}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono">
                              {formatFileSize(currentFileSize)} • Assinado em {formatDate(currentSignDate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenViewer(activeClient, activeContractSubtype, 'anexo')}
                            className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Ver Anexo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveContractFile(activeContractSubtype)}
                            className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remover documento anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white hover:bg-stone-50/80 rounded-xl border border-dashed border-stone-300 hover:border-stone-400 p-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-stone-400" />
                        <span className="text-xs font-semibold text-stone-700">
                          Anexar via assinada digitalizada (PDF, JPG ou PNG)
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo da Embarcação Vinculada */}
                <div className="bg-stone-50/50 rounded-xl border border-stone-200/60 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-stone-700 font-medium">
                    <Ship className="w-4 h-4 text-stone-500" />
                    <span>Embarcação: <strong className="text-stone-900">{boatName}</strong> ({cotaVal})</span>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">
                    {totalAssinados} de 2 contratos assinados
                  </span>
                </div>

              </div>
            )}

            {/* CONTEÚDO DA ABA 2: CONDIÇÕES & VALORES */}
            {activeTab === 'condicoes' && (
              <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Valor Total da Cota</span>
                    <span className="text-sm font-bold text-stone-900 font-mono">
                      R$ {activeClient.contratoValores?.valorTotal || '55.000,00'}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Valor da Entrada</span>
                    <span className="text-sm font-bold text-stone-900 font-mono">
                      R$ {activeClient.contratoValores?.valorEntrada || '12.040,00'}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Parcelamento</span>
                    <span className="text-xs font-bold text-stone-900">
                      {activeClient.contratoValores?.numParcelas || '24'}x de R$ {activeClient.contratoValores?.valorParcela || '1.790,00'}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Vencimento Mensal</span>
                    <span className="text-xs font-bold text-stone-900">
                      Todo dia {activeClient.contratoValores?.diaVencimento || '10'}
                    </span>
                  </div>

                  <div className="col-span-2 bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Forma de Pagamento</span>
                    <span className="text-xs font-medium text-stone-800">
                      {activeClient.contratoValores?.formaPagamento || 'Boleto / Transferência Bancária'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 3: DADOS CADASTRAIS */}
            {activeTab === 'cadastro' && (
              <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 bg-white rounded-xl border border-stone-200/80 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Nome Completo</span>
                      <span className="text-xs font-bold text-stone-900">{activeClient.nome}</span>
                    </div>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">CPF</span>
                      <span className="text-xs font-semibold text-stone-900 font-mono">{activeClient.cpf || 'Não informado'}</span>
                    </div>
                    {activeClient.cpf && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeClient.cpf || '', 'cpf')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 cursor-pointer"
                        title="Copiar CPF"
                      >
                        {copiedField === 'cpf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Telefone</span>
                    <span className="text-xs font-semibold text-stone-900">{formatPhone(activeClient.telefone)}</span>
                  </div>

                  <div className="col-span-2 bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Endereço</span>
                    <span className="text-xs font-medium text-stone-800">
                      {activeClient.logradouro ? `${activeClient.logradouro}, ${activeClient.numeroEnd || 'S/N'}` : 'Não informado'}
                      {activeClient.bairro ? ` - ${activeClient.bairro}` : ''}
                      {activeClient.cidade ? ` - ${activeClient.cidade}/${activeClient.estado || 'PE'}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 4: EMBARCAÇÃO & COTA */}
            {activeTab === 'embarcacao' && (
              <div className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Embarcação Vinculada</span>
                    <span className="text-sm font-bold text-stone-900 flex items-center gap-2 mt-0.5">
                      <Ship className="w-4 h-4 text-stone-600" />
                      {boatName}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Cota do Cotista</span>
                    <span className="text-xs font-bold text-stone-900">{cotaVal}</span>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200/80 p-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Vaga na Marina</span>
                    <span className="text-xs font-medium text-stone-800">{boat?.vaga || 'Não informada'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ================= RODAPÉ PRINCIPAL (ESTILO DA REFERÊNCIA) ================= */}
          <footer className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
            {/* Link Secundário na Esquerda */}
            <div>
              {onOpenFullProfile && (
                <button
                  type="button"
                  onClick={() => onOpenFullProfile(activeClient)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Ficha Completa do Cliente</span>
                </button>
              )}
            </div>

            {/* Botões na Direita: Cancel / Continue da Referência */}
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
                onClick={() => {
                  onClose();
                  onEditContract(activeClient.id);
                }}
                className="h-9 px-5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Editar Contrato</span>
              </button>
            </div>
          </footer>

        </main>

      </div>
    </div>
  );
}
