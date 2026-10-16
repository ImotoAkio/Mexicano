import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  FileCheck2,
  Clock,
  FileX2,
  Paperclip,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileText,
  Calendar,
  Upload,
  ChevronDown,
  Trash2,
  Loader2,
  AlertTriangle,
  Edit3,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Plus,
  Sparkles
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato, ContractSections } from '../../types';
import {
  getContractSections,
  generateContract
} from '../ContractGenerator';
import { formatBoatName } from '../../utils/constants';
import { uploadContratoToStorage } from '../../utils/contratoStorage';
import { onContractTemplateChange } from '../../utils/contratoTemplates';
import { clientDB } from '../../db';
import ComercialContratoModeloModal from './ComercialContratoModeloModal';
import logoVale from '../../assets/images/vale_nauticos_logo_1780256879963.png';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';

interface ComercialContratoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  embarcacao?: Embarcacao | null;
  initialType?: 'aquisicao' | 'adm' | 'aditivo';
  initialTab?: 'documento' | 'pdf' | 'anexo';
  startDirectEdit?: boolean;
  onStatusChange?: (clientId: string, newStatus: StatusContrato, extraData?: Partial<Cliente>) => void;
}

export default function ComercialContratoViewerModal({
  isOpen,
  onClose,
  cliente,
  embarcacao,
  initialType = 'aquisicao',
  initialTab = 'documento',
  startDirectEdit = false,
  onStatusChange
}: ComercialContratoViewerModalProps) {
  const [contractType, setContractType] = useState<'aquisicao' | 'adm' | 'aditivo'>(initialType);
  const [activeTab, setActiveTab] = useState<'documento' | 'anexo'>(
    initialTab === 'anexo' ? 'anexo' : 'documento'
  );
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Modo de Edição Direta no Texto do Contrato
  const [isDirectEditing, setIsDirectEditing] = useState(startDirectEdit);
  const [directSections, setDirectSections] = useState<ContractSections | null>(null);
  const [saveDirectSuccess, setSaveDirectSuccess] = useState(false);
  const [templateVersion, setTemplateVersion] = useState(0);

  // Modal para Edição do Modelo Base do Contrato
  const [modeloModalOpen, setModeloModalOpen] = useState(false);

  // Status de assinatura local para exibição/edição
  const [currentStatus, setCurrentStatus] = useState<StatusContrato>('sem_contrato');
  const [dataAssinatura, setDataAssinatura] = useState<string>('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Arquivo anexo
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setContractType(initialType);
      setActiveTab(initialTab === 'anexo' ? 'anexo' : 'documento');
      if (startDirectEdit) {
        setIsDirectEditing(true);
      }
    }
  }, [isOpen, initialType, initialTab, startDirectEdit]);

  // Listener para quando o modelo base de contrato for editado
  useEffect(() => {
    const unsub = onContractTemplateChange(() => {
      setTemplateVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Sincronizar dados do contrato conforme contractType selecionado
  useEffect(() => {
    if (!cliente) return;
    if (contractType === 'aquisicao') {
      const url = cliente.contratoAquisicaoArquivoUrl || (cliente.tipoContrato !== 'adm' ? cliente.contratoArquivoUrl : undefined) || null;
      const nome = cliente.contratoAquisicaoArquivoNome || (cliente.tipoContrato !== 'adm' ? cliente.contratoArquivoNome : undefined) || null;
      const data = cliente.contratoAquisicaoDataAssinatura || (cliente.tipoContrato !== 'adm' ? cliente.contratoDataAssinatura : undefined) || new Date().toISOString().split('T')[0];
      const st = cliente.contratoAquisicaoStatus || (url ? 'assinado' : (cliente.tipoContrato !== 'adm' ? (cliente.statusContrato || 'sem_contrato') : 'pendente'));

      setAnexoUrl(url);
      setAnexoNome(nome);
      setDataAssinatura(data);
      setCurrentStatus(st);
    } else if (contractType === 'aditivo') {
      const url = cliente.contratoAditivoArquivoUrl || null;
      const nome = cliente.contratoAditivoArquivoNome || null;
      const data = cliente.contratoAditivoDataAssinatura || new Date().toISOString().split('T')[0];
      const st = cliente.contratoAditivoStatus || (url ? 'assinado' : 'pendente');

      setAnexoUrl(url);
      setAnexoNome(nome);
      setDataAssinatura(data);
      setCurrentStatus(st);
    } else {
      const url = cliente.contratoAdmArquivoUrl || (cliente.tipoContrato === 'adm' ? cliente.contratoArquivoUrl : undefined) || null;
      const nome = cliente.contratoAdmArquivoNome || (cliente.tipoContrato === 'adm' ? cliente.contratoArquivoNome : undefined) || null;
      const data = cliente.contratoAdmDataAssinatura || (cliente.tipoContrato === 'adm' ? cliente.contratoDataAssinatura : undefined) || new Date().toISOString().split('T')[0];
      const st = cliente.contratoAdmStatus || (url ? 'assinado' : (cliente.tipoContrato === 'adm' ? (cliente.statusContrato || 'sem_contrato') : 'pendente'));

      setAnexoUrl(url);
      setAnexoNome(nome);
      setDataAssinatura(data);
      setCurrentStatus(st);
    }
  }, [cliente, contractType, isOpen]);

  // Determinar se este cotista possui customização direta salva
  const clientSavedCustomSections: ContractSections | undefined = useMemo(() => {
    if (!cliente) return undefined;
    if (contractType === 'aquisicao') {
      return (
        cliente.contratoValores?.customSectionsAquisicao ||
        cliente.contratoAquisicaoCustomSections
      );
    } else if (contractType === 'aditivo') {
      return (
        cliente.contratoValores?.customSectionsAditivo ||
        cliente.contratoAditivoCustomSections
      );
    } else {
      return (
        cliente.contratoValores?.customSectionsAdm ||
        cliente.contratoAdmCustomSections
      );
    }
  }, [cliente, contractType]);

  const hasCustomEdits = Boolean(clientSavedCustomSections);

  // Seções base calculadas a partir dos dados do cliente e do modelo
  const baseContractSections: ContractSections | null = useMemo(() => {
    if (!cliente) return null;

    const clientData = {
      nome: cliente.nome,
      cpf: cliente.cpf,
      rg: cliente.rg,
      orgaoEmissor: cliente.orgaoEmissor,
      nacionalidade: cliente.nacionalidade || 'BRASILEIRO',
      cnh_cha: cliente.cnh_cha || cliente.numeroHabilitacao,
      numeroHabilitacao: cliente.numeroHabilitacao,
      validadeHabilitacao: cliente.validadeHabilitacao,
      orgaoEmissorHabilitacao: cliente.orgaoEmissorHabilitacao,
      categoriaHabilitacao: cliente.categoriaHabilitacao,
      estadoCivil: cliente.estadoCivil || 'Solteiro(a)',
      profissao: cliente.profissao || 'Empresário',
      logradouro: cliente.logradouro,
      numeroEnd: cliente.numeroEnd,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade || 'Petrolina',
      estado: cliente.estado || 'PE',
      cep: cliente.cep,
      telefone: cliente.telefone,
      email: cliente.email,
      cota: cliente.cota || cliente.embarcacoes?.[0]?.cota || '25%',
      dataAssinatura: cliente.contratoDataAssinatura,
      dataCadastro: cliente.contratoDataEmissao || cliente.dataCadastro,
    };

    const boatData = {
      nome: embarcacao?.nome ? formatBoatName(embarcacao.nome) : 'MEXICANO',
      modelo: embarcacao?.modelo || 'Lancha / Jet',
      chassi: embarcacao?.chassi || embarcacao?.numero || 'N/A',
      inscricao: embarcacao?.inscricao || 'N/A',
      tipo_propulsao: embarcacao?.tipo_propulsao || (embarcacao?.tipo === 'jet' ? 'TURBO JATO' : 'MOTOR CENTRO-RABETA'),
      potencia: embarcacao?.potencia || 'N/A',
      tipo: embarcacao?.tipo,
      capacidadePassageiros: embarcacao?.capacidadePassageiros,
    };

    return getContractSections(contractType, clientData, boatData, cliente.contratoValores);
  }, [cliente, embarcacao, contractType, templateVersion]);

  // Sincronizar directSections sempre que o cliente ou tipo de contrato mudar
  useEffect(() => {
    if (clientSavedCustomSections) {
      setDirectSections(JSON.parse(JSON.stringify(clientSavedCustomSections)));
    } else if (baseContractSections) {
      setDirectSections(JSON.parse(JSON.stringify(baseContractSections)));
    }
  }, [clientSavedCustomSections, baseContractSections, contractType]);

  // Seções atualmente ativas
  const contractSections = directSections || baseContractSections;

  // Atualizar status
  const handleUpdateStatus = (newStatus: StatusContrato, dateVal?: string) => {
    if (!cliente) return;
    setCurrentStatus(newStatus);
    setStatusMenuOpen(false);
    setShowDatePicker(false);

    const effectiveDate = dateVal || (newStatus === 'assinado' ? dataAssinatura || new Date().toISOString().split('T')[0] : undefined);
    if (newStatus === 'assinado' && effectiveDate) {
      setDataAssinatura(effectiveDate);
    }

    const isAquisicao = contractType === 'aquisicao';
    const otherHasSigned = isAquisicao
      ? Boolean(cliente.contratoAdmArquivoUrl || cliente.contratoAdmStatus === 'assinado')
      : Boolean(cliente.contratoAquisicaoArquivoUrl || cliente.contratoAquisicaoStatus === 'assinado');

    let overallStatus: StatusContrato = 'sem_contrato';
    if (newStatus === 'assinado') {
      overallStatus = otherHasSigned ? 'assinado' : 'pendente';
    } else if (newStatus === 'pendente') {
      overallStatus = 'pendente';
    } else {
      overallStatus = otherHasSigned ? 'pendente' : 'sem_contrato';
    }

    const updateData: Partial<Cliente> = contractType === 'aquisicao'
      ? {
          contratoAquisicaoStatus: newStatus,
          contratoAquisicaoDataAssinatura: newStatus === 'assinado' ? effectiveDate : undefined,
          statusContrato: overallStatus,
          contratoDataAssinatura: newStatus === 'assinado' ? effectiveDate : undefined,
          contratoDataEmissao: cliente.contratoDataEmissao || new Date().toISOString().split('T')[0]
        }
      : contractType === 'aditivo'
      ? {
          contratoAditivoStatus: newStatus,
          contratoAditivoDataAssinatura: newStatus === 'assinado' ? effectiveDate : undefined
        }
      : {
          contratoAdmStatus: newStatus,
          contratoAdmDataAssinatura: newStatus === 'assinado' ? effectiveDate : undefined,
          statusContrato: overallStatus,
          contratoDataEmissao: cliente.contratoDataEmissao || new Date().toISOString().split('T')[0]
        };

    if (onStatusChange) {
      onStatusChange(cliente.id, overallStatus, updateData);
    }
  };

  // Upload de arquivo anexo assinado
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cliente) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const uploadRes = await uploadContratoToStorage(
        file,
        contractType,
        cliente.id,
        (percent) => setUploadProgress(percent)
      );
      setAnexoUrl(uploadRes.url);
      setAnexoNome(uploadRes.filename);
      setActiveTab('anexo');

      const todayStr = new Date().toISOString().split('T')[0];
      const effectiveAssinaturaDate = dataAssinatura || todayStr;
      setDataAssinatura(effectiveAssinaturaDate);

      setCurrentStatus('assinado');

      const isAquisicao = contractType === 'aquisicao';
      const clientType = cliente.tipoContrato || 'aquisicao';
      let newOverallStatus: StatusContrato = 'assinado';
      if (clientType === 'ambos') {
        const otherHasSigned = isAquisicao
          ? Boolean(cliente.contratoAdmArquivoUrl || (cliente.tipoContrato === 'adm' && cliente.contratoArquivoUrl))
          : Boolean(cliente.contratoAquisicaoArquivoUrl || (cliente.tipoContrato !== 'adm' && cliente.contratoArquivoUrl));
        newOverallStatus = otherHasSigned ? 'assinado' : 'pendente';
      } else {
        newOverallStatus = 'assinado';
      }

      const updateData: Partial<Cliente> = isAquisicao
        ? {
            contratoAquisicaoArquivoUrl: uploadRes.url,
            contratoAquisicaoArquivoNome: uploadRes.filename,
            contratoAquisicaoArquivoTamanho: uploadRes.size,
            contratoAquisicaoArquivoKey: uploadRes.key,
            contratoAquisicaoArquivoStorage: uploadRes.storage,
            contratoAquisicaoStatus: 'assinado',
            contratoAquisicaoDataAssinatura: effectiveAssinaturaDate,
            statusContrato: newOverallStatus,
            contratoArquivoUrl: uploadRes.url,
            contratoArquivoNome: uploadRes.filename,
            contratoArquivoTamanho: uploadRes.size,
            contratoDataAssinatura: effectiveAssinaturaDate
          }
        : contractType === 'aditivo'
        ? {
            contratoAditivoArquivoUrl: uploadRes.url,
            contratoAditivoArquivoNome: uploadRes.filename,
            contratoAditivoArquivoTamanho: uploadRes.size,
            contratoAditivoArquivoKey: uploadRes.key,
            contratoAditivoArquivoStorage: uploadRes.storage,
            contratoAditivoStatus: 'assinado',
            contratoAditivoDataAssinatura: effectiveAssinaturaDate
          }
        : {
            contratoAdmArquivoUrl: uploadRes.url,
            contratoAdmArquivoNome: uploadRes.filename,
            contratoAdmArquivoTamanho: uploadRes.size,
            contratoAdmArquivoKey: uploadRes.key,
            contratoAdmArquivoStorage: uploadRes.storage,
            contratoAdmStatus: 'assinado',
            contratoAdmDataAssinatura: effectiveAssinaturaDate,
            statusContrato: newOverallStatus,
            ...(cliente.tipoContrato === 'adm'
              ? {
                  contratoArquivoUrl: uploadRes.url,
                  contratoArquivoNome: uploadRes.filename,
                  contratoArquivoTamanho: uploadRes.size,
                  contratoDataAssinatura: effectiveAssinaturaDate
                }
              : {})
          };

      if (onStatusChange) {
        onStatusChange(cliente.id, newOverallStatus, updateData);
      }
    } catch (err: any) {
      console.error('Erro no upload de contrato para bucket R2:', err);
      const msg = err?.message || 'Erro ao enviar o contrato assinado.';
      setUploadError(msg);
      alert(msg);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remover anexo
  const handleRemoveAnexo = () => {
    if (!cliente) return;
    const typeLabel = contractType === 'aquisicao' ? 'Contrato de Aquisição' : contractType === 'aditivo' ? 'Aditivo Náutico' : 'Contrato de Gestão Náutica';
    if (!window.confirm(`Tem certeza que deseja remover o anexo assinado de ${typeLabel}?`)) return;

    setAnexoUrl(null);
    setAnexoNome(null);
    setCurrentStatus('pendente');

    const isAquisicao = contractType === 'aquisicao';
    const otherHasSigned = isAquisicao
      ? Boolean(cliente.contratoAdmArquivoUrl)
      : Boolean(cliente.contratoAquisicaoArquivoUrl);

    const newOverallStatus: StatusContrato = otherHasSigned ? 'pendente' : 'pendente';

    const updateData: Partial<Cliente> = isAquisicao
      ? {
          contratoAquisicaoArquivoUrl: null as any,
          contratoAquisicaoArquivoNome: null as any,
          contratoAquisicaoArquivoTamanho: null as any,
          contratoAquisicaoArquivoKey: null as any,
          contratoAquisicaoArquivoStorage: null as any,
          contratoAquisicaoStatus: 'pendente',
          contratoAquisicaoDataAssinatura: null as any,
          statusContrato: newOverallStatus,
          contratoArquivoUrl: null as any,
          contratoArquivoNome: null as any,
          contratoArquivoTamanho: null as any,
          contratoDataAssinatura: null as any
        }
      : contractType === 'aditivo'
      ? {
          contratoAditivoArquivoUrl: null as any,
          contratoAditivoArquivoNome: null as any,
          contratoAditivoArquivoTamanho: null as any,
          contratoAditivoArquivoKey: null as any,
          contratoAditivoArquivoStorage: null as any,
          contratoAditivoStatus: 'pendente',
          contratoAditivoDataAssinatura: null as any
        }
      : {
          contratoAdmArquivoUrl: null as any,
          contratoAdmArquivoNome: null as any,
          contratoAdmArquivoTamanho: null as any,
          contratoAdmArquivoKey: null as any,
          contratoAdmArquivoStorage: null as any,
          contratoAdmStatus: 'pendente',
          contratoAdmDataAssinatura: null as any,
          statusContrato: newOverallStatus
        };

    if (onStatusChange) {
      onStatusChange(cliente.id, newOverallStatus, updateData);
    }
  };

  // Baixar PDF Oficial
  const handleDownloadPdf = async () => {
    if (!cliente) return;
    setIsGeneratingPdf(true);
    try {
      const clientData = {
        nome: cliente.nome,
        cpf: cliente.cpf,
        rg: cliente.rg,
        orgaoEmissor: cliente.orgaoEmissor,
        nacionalidade: cliente.nacionalidade || 'BRASILEIRO',
        cnh_cha: cliente.cnh_cha || cliente.numeroHabilitacao,
        numeroHabilitacao: cliente.numeroHabilitacao,
        validadeHabilitacao: cliente.validadeHabilitacao,
        orgaoEmissorHabilitacao: cliente.orgaoEmissorHabilitacao,
        categoriaHabilitacao: cliente.categoriaHabilitacao,
        estadoCivil: cliente.estadoCivil || 'Solteiro(a)',
        profissao: cliente.profissao || 'Empresário',
        logradouro: cliente.logradouro,
        numeroEnd: cliente.numeroEnd,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade || 'Petrolina',
        estado: cliente.estado || 'PE',
        cep: cliente.cep,
        telefone: cliente.telefone,
        email: cliente.email,
        cota: cliente.cota || cliente.embarcacoes?.[0]?.cota || '25%',
        dataAssinatura: cliente.contratoDataAssinatura,
        dataCadastro: cliente.contratoDataEmissao || cliente.dataCadastro,
      };

      const boatData = {
        nome: embarcacao?.nome ? formatBoatName(embarcacao.nome) : 'MEXICANO',
        modelo: embarcacao?.modelo || 'Lancha / Jet',
        chassi: embarcacao?.chassi || embarcacao?.numero || 'N/A',
        inscricao: embarcacao?.inscricao || 'N/A',
        tipo_propulsao: embarcacao?.tipo_propulsao || (embarcacao?.tipo === 'jet' ? 'TURBO JATO' : 'MOTOR CENTRO-RABETA'),
        potencia: embarcacao?.potencia || 'N/A',
        tipo: embarcacao?.tipo,
        capacidadePassageiros: embarcacao?.capacidadePassageiros,
      };

      await generateContract(
        contractType,
        clientData,
        boatData,
        cliente.contratoValores,
        contractSections || undefined
      );
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Imprimir documento com iframe isolado de alta fidelidade
  const handlePrint = async () => {
    if (!cliente || isPrinting) return;
    setIsPrinting(true);
    try {
      // Caso 1: Impressão de Arquivo Anexo
      if (activeTab === 'anexo' && anexoUrl) {
        const isPdf =
          anexoUrl.startsWith('data:application/pdf') ||
          anexoUrl.toLowerCase().endsWith('.pdf') ||
          anexoNome?.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          const printWindow = window.open(anexoUrl, '_blank');
          if (printWindow) {
            printWindow.focus();
          } else {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = anexoUrl;
            document.body.appendChild(iframe);
            iframe.onload = () => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } catch {
                window.open(anexoUrl, '_blank');
              }
              setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
              }, 4000);
            };
          }
        } else {
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          document.body.appendChild(iframe);

          const doc = iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Imprimir Contrato Anexo - ${cliente?.nome || 'Cliente'}</title>
                  <style>
                    @page { size: auto; margin: 10mm; }
                    body { margin: 0; display: flex; justify-content: center; align-items: center; background: white; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                  </style>
                </head>
                <body>
                  <img src="${anexoUrl}" />
                </body>
              </html>
            `);
            doc.close();

            const img = doc.querySelector('img');
            if (img) {
              img.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                  if (document.body.contains(iframe)) document.body.removeChild(iframe);
                }, 3000);
              };
            }
          }
        }
        return;
      }

      // Caso 2: Impressão da Minuta A4
      const printContent = document.getElementById('contrato-print-content');
      if (!printContent) {
        window.print();
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${contractSections?.title || 'Contrato'} - ${cliente?.nome || ''}</title>
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #1c1917 !important;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #contrato-print-content {
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
              .watermark-badge {
                position: absolute !important;
                top: 0px !important;
                right: 0px !important;
                opacity: 0.8 !important;
              }
              .no-print-toolbar, .edit-mode-controls {
                display: none !important;
              }
              p {
                margin: 0 0 6px 0 !important;
                line-height: 1.5 !important;
                text-align: justify !important;
                page-break-inside: avoid !important;
              }
              .signatures-block {
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body>
            <div id="contrato-print-content">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      const imgs = Array.from(doc.images);
      const imgPromises = imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => {
          img.onload = res;
          img.onerror = res;
        });
      });

      await Promise.all(imgPromises);

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Erro na impressão do iframe:', err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 200);

    } catch (err) {
      console.error('Erro na impressão:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Funções de manipulação do texto direto
  const handleDirectTitleChange = (val: string) => {
    if (!contractSections) return;
    setDirectSections({ ...contractSections, title: val });
  };

  const handleDirectClientStrChange = (val: string) => {
    if (!contractSections) return;
    setDirectSections({ ...contractSections, clientStr: val });
  };

  const handleDirectVendorStrChange = (val: string) => {
    if (!contractSections) return;
    setDirectSections({ ...contractSections, vendorStr: val });
  };

  const handleDirectIntroStrChange = (val: string) => {
    if (!contractSections) return;
    setDirectSections({ ...contractSections, introStr: val });
  };

  const handleDirectClauseChange = (idx: number, val: string) => {
    if (!contractSections) return;
    const newClauses = [...contractSections.clauses];
    newClauses[idx] = val;
    setDirectSections({ ...contractSections, clauses: newClauses });
  };

  const handleAddDirectClause = () => {
    if (!contractSections) return;
    const nextNum = contractSections.clauses.length + 1;
    setDirectSections({
      ...contractSections,
      clauses: [...contractSections.clauses, `<b>${nextNum}. <u>NOVA CLÁUSULA</u></b>\n${nextNum}.1. Descreva os termos acordados aqui...`]
    });
  };

  const handleAddDirectClauseAfter = (idx: number) => {
    if (!contractSections) return;
    const newClauses = [...contractSections.clauses];
    newClauses.splice(idx + 1, 0, `<b>NOVA CLÁUSULA ADICIONAL</b>\nDescreva os termos acordados aqui...`);
    setDirectSections({ ...contractSections, clauses: newClauses });
  };

  const handleRemoveDirectClause = (idx: number) => {
    if (!contractSections) return;
    const newClauses = contractSections.clauses.filter((_, i) => i !== idx);
    setDirectSections({ ...contractSections, clauses: newClauses });
  };

  // Salvar o texto editado diretamente no cliente
  const handleSaveDirectText = () => {
    if (!cliente || !directSections) return;
    const newContratoValores = {
      ...(cliente.contratoValores || {}),
      ...(contractType === 'aquisicao'
        ? { customSectionsAquisicao: directSections }
        : contractType === 'aditivo'
        ? { customSectionsAditivo: directSections }
        : { customSectionsAdm: directSections })
    };

    const updatePatch: Partial<Cliente> = contractType === 'aquisicao'
      ? {
          contratoValores: newContratoValores,
          contratoAquisicaoCustomSections: directSections
        }
      : contractType === 'aditivo'
      ? {
          contratoValores: newContratoValores,
          contratoAditivoCustomSections: directSections
        }
      : {
          contratoValores: newContratoValores,
          contratoAdmCustomSections: directSections
        };

    try {
      clientDB.update(cliente.id, updatePatch);
      if (onStatusChange) {
        onStatusChange(cliente.id, currentStatus, updatePatch);
      }
      setSaveDirectSuccess(true);
      setTimeout(() => setSaveDirectSuccess(false), 3000);
    } catch (e) {
      console.error('Erro ao salvar texto do contrato:', e);
      alert('Erro ao salvar texto do contrato.');
    }
  };

  // Restaurar para o modelo padrão (remove customização do cliente)
  const handleResetDirectTextToModel = () => {
    if (!cliente) return;
    if (!window.confirm('Deseja descartar as alterações diretas deste cotista e restaurar o texto padrão do modelo?')) {
      return;
    }

    const newContratoValores = { ...(cliente.contratoValores || {}) };
    if (contractType === 'aquisicao') {
      delete newContratoValores.customSectionsAquisicao;
    } else if (contractType === 'aditivo') {
      delete newContratoValores.customSectionsAditivo;
    } else {
      delete newContratoValores.customSectionsAdm;
    }

    const updatePatch: Partial<Cliente> = contractType === 'aquisicao'
      ? {
          contratoValores: newContratoValores,
          contratoAquisicaoCustomSections: undefined
        }
      : contractType === 'aditivo'
      ? {
          contratoValores: newContratoValores,
          contratoAditivoCustomSections: undefined
        }
      : {
          contratoValores: newContratoValores,
          contratoAdmCustomSections: undefined
        };

    try {
      clientDB.update(cliente.id, updatePatch);
      if (baseContractSections) {
        setDirectSections(JSON.parse(JSON.stringify(baseContractSections)));
      }
      if (onStatusChange) {
        onStatusChange(cliente.id, currentStatus, updatePatch);
      }
      setIsDirectEditing(false);
    } catch (e) {
      console.error('Erro ao restaurar texto padrão:', e);
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen || !cliente) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (statusMenuOpen) {
          setStatusMenuOpen(false);
        } else if (showDatePicker) {
          setShowDatePicker(false);
        } else if (isDirectEditing) {
          setIsDirectEditing(false);
        } else {
          onClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && isDirectEditing) {
        e.preventDefault();
        handleSaveDirectText();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cliente, statusMenuOpen, showDatePicker, isDirectEditing, directSections, isPrinting]);

  // Converter tags de marcação em elementos React
  const renderFormattedParagraph = (htmlText: string) => {
    const lines = htmlText.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-stone-800 text-[12.5px]">
        {lines.map((line, lIdx) => {
          const parts = line.split(/(<\/?(?:b|u|mark)>)/gi);
          let isBold = false;
          let isUnderline = false;
          let isMark = false;

          const elements: React.ReactNode[] = [];

          parts.forEach((part, pIdx) => {
            const lower = part.toLowerCase();
            if (lower === '<b>') { isBold = true; return; }
            if (lower === '</b>') { isBold = false; return; }
            if (lower === '<u>') { isUnderline = true; return; }
            if (lower === '</u>') { isUnderline = false; return; }
            if (lower === '<mark>') { isMark = true; return; }
            if (lower === '</mark>') { isMark = false; return; }

            if (!part) return;

            let className = '';
            if (isBold) className += ' font-bold text-stone-900';
            if (isUnderline) className += ' underline';
            if (isMark) className += ' bg-amber-200/70 text-stone-950 font-bold px-1 py-0.5 rounded-sm';

            elements.push(
              <span key={pIdx} className={className}>
                {part}
              </span>
            );
          });

          return (
            <p key={lIdx} className="text-justify indent-4">
              {elements}
            </p>
          );
        })}
      </div>
    );
  };

  if (!isOpen || !cliente) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className={`bg-stone-100 rounded-2xl shadow-2xl flex flex-col border border-stone-200/80 transition-all duration-200 overflow-hidden ${
            isFullscreen
              ? 'w-full h-full rounded-none'
              : 'w-full max-w-5xl h-[92vh] max-h-[1050px]'
          }`}
        >
          {/* ================= HEADER BAR PRINCIPAL ================= */}
          <div className="bg-white px-5 sm:px-6 py-3 border-b border-stone-200 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-mx-ink-100 text-mx-ink flex items-center justify-center shrink-0 border border-mx-ink/10">
                <FileText className="w-5 h-5 text-mx-ink" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    Visualizador de Contrato
                  </h2>

                  {/* Badge de Status Interativo */}
                  <div className="relative">
                    <button
                      onClick={() => setStatusMenuOpen(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        currentStatus === 'assinado'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : currentStatus === 'pendente'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      {currentStatus === 'assinado' ? (
                        <>
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Contrato Assinado</span>
                        </>
                      ) : currentStatus === 'pendente' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Contrato Pendente</span>
                        </>
                      ) : (
                        <>
                          <FileX2 className="w-3.5 h-3.5 text-stone-500" />
                          <span>Não Possui Contrato</span>
                        </>
                      )}
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                    </button>

                    {/* Dropdown de Status */}
                    {statusMenuOpen && (
                      <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Alterar Status do Contrato
                        </div>
                        <button
                          onClick={() => {
                            setShowDatePicker(true);
                            setStatusMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-emerald-800 hover:bg-emerald-50 font-semibold cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div>Marcar como Assinado</div>
                            <span className="text-[10px] text-stone-500 font-normal">Registra assinatura e data</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('pendente')}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-amber-800 hover:bg-amber-50 font-semibold cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-amber-600" />
                          <div>
                            <div>Marcar como Pendente</div>
                            <span className="text-[10px] text-stone-500 font-normal">Aguardando cliente assinar</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('sem_contrato')}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-stone-700 hover:bg-stone-100 font-semibold cursor-pointer"
                        >
                          <FileX2 className="w-4 h-4 text-stone-500" />
                          <div>
                            <div>Sem Contrato / Não Possui</div>
                            <span className="text-[10px] text-stone-500 font-normal">Limpa formalização</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {hasCustomEdits && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Texto Personalizado</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 truncate">
                  <span className="font-semibold text-stone-800">{cliente.nome}</span>
                  <span>•</span>
                  <span>CPF: {cliente.cpf || 'Não informado'}</span>
                  {embarcacao && (
                    <>
                      <span>•</span>
                      <span className="text-stone-700 font-medium">
                        {formatBoatName(embarcacao.nome)} ({cliente.cota || cliente.embarcacoes?.[0]?.cota || 'Cota'})
                      </span>
                    </>
                  )}
                  {currentStatus === 'assinado' && dataAssinatura && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Assinado em {new Date(dataAssinatura).toLocaleDateString('pt-BR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controles de Janela */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsFullscreen(prev => !prev)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ================= SUB-TOOLBAR: MODELO + ABAS + EDIÇÃO DIRETA ================= */}
          <div className="bg-stone-50/90 px-5 sm:px-6 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Lado Esquerdo: Modelo de Contrato + Alternador Minuta/Anexo + Editar Modelo Base */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Seletor de Modelo */}
              <div className="flex items-center bg-stone-200/70 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => setContractType('aquisicao')}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    contractType === 'aquisicao'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Aquisição (Cota)
                </button>
                <button
                  onClick={() => setContractType('adm')}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    contractType === 'adm'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Administração
                </button>
                <button
                  onClick={() => setContractType('aditivo')}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    contractType === 'aditivo'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Aditivo (Seg/Ter)
                </button>
              </div>

              {/* Botão de Editar Modelo Base */}
              <button
                type="button"
                onClick={() => setModeloModalOpen(true)}
                className="h-7 px-2.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Personalizar as cláusulas e o modelo padrão deste tipo de contrato"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                <span>Editar Modelo Base</span>
              </button>

              <div className="h-4 w-px bg-stone-300 hidden sm:block" />

              {/* Alternador de Modo: Minuta Digital vs Arquivo Anexo */}
              <div className="flex items-center bg-stone-200/70 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => setActiveTab('documento')}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'documento'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Minuta do contrato em formato padrão A4"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-600" />
                  <span>Minuta A4</span>
                </button>

                <button
                  onClick={() => setActiveTab('anexo')}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'anexo'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Visualizar arquivo do contrato assinado / escaneado"
                >
                  <Paperclip className="w-3.5 h-3.5 text-stone-600" />
                  <span>Arquivo Anexo</span>
                  {anexoUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </button>
              </div>

              {/* Botão de Edição Direta no Texto */}
              {activeTab === 'documento' && (
                <button
                  type="button"
                  onClick={() => setIsDirectEditing(prev => !prev)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isDirectEditing
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      : hasCustomEdits
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                  title="Editar diretamente o texto desta minuta na tela"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isDirectEditing ? 'Modo Edição Ativo' : 'Editar Texto Direto'}</span>
                </button>
              )}
            </div>

            {/* Lado Direito: Zoom + Imprimir + Baixar PDF */}
            <div className="flex items-center gap-2.5 ml-auto">
              {/* Controles de Zoom */}
              {activeTab === 'documento' && (
                <>
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-stone-200 shadow-xs">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(100)}
                      className="text-[11px] font-semibold text-stone-700 px-1 py-0.5 rounded hover:bg-stone-100 transition-colors text-center tabular-nums cursor-pointer"
                      title="Restaurar zoom para 100%"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-stone-300" />
                </>
              )}

              {/* Botão Imprimir */}
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="h-8 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-300 shadow-xs flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-60"
                title="Imprimir contrato (Ctrl+P)"
              >
                {isPrinting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-stone-700" />
                )}
                <span>Imprimir</span>
              </button>

              {/* Botão Baixar PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="h-8 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
                title="Baixar Contrato em formato PDF"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-white" />
                )}
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* ================= BARRA DE AÇÃO DA EDIÇÃO DIRETA ================= */}
          {isDirectEditing && activeTab === 'documento' && (
            <div className="bg-amber-50/95 border-b border-amber-200/90 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in shrink-0">
              <div className="flex items-center gap-2 text-amber-950 font-semibold">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span>Edição Direta no Texto do Contrato</span>
                <span className="text-[11px] font-normal text-amber-800 hidden md:inline">
                  • Altere os parágrafos e cláusulas diretamente na folha abaixo
                </span>
              </div>

              <div className="flex items-center gap-2">
                {saveDirectSuccess && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-md flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>Texto salvo!</span>
                  </span>
                )}

                {hasCustomEdits && (
                  <button
                    type="button"
                    onClick={handleResetDirectTextToModel}
                    className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Descartar alterações diretas deste cotista e restaurar o texto base do modelo"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                    <span>Restaurar Modelo Base</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddDirectClause}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Cláusula</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDirectText}
                  className="px-4 py-1 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Texto no Contrato</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDirectEditing(false)}
                  className="px-3 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium cursor-pointer"
                >
                  Concluir Edição
                </button>
              </div>
            </div>
          )}

          {/* Modal Pequeno para Escolher Data de Assinatura */}
          {showDatePicker && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="font-bold">Informe a data da assinatura do contrato:</span>
                <input
                  type="date"
                  value={dataAssinatura}
                  onChange={e => setDataAssinatura(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('assinado', dataAssinatura)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar Assinatura
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-2.5 py-1 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ================= BODY / VIEWER CONTENT ================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-200/70 flex justify-center items-start">
            
            {/* ABA 1: DOCUMENTO OFICIAL A4 FORMATADO */}
            {activeTab === 'documento' && contractSections && (
              <div
                ref={printContainerRef}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="transition-transform duration-150 ease-out"
              >
                <div
                  id="contrato-print-content"
                  className="w-[794px] min-h-[1123px] bg-white rounded-md shadow-2xl border border-stone-300 p-12 relative flex flex-col justify-between select-text text-stone-900 font-sans print:shadow-none print:border-none print:m-0 print:p-8"
                >
                  
                  {/* Carimbo de Status Marca D'Água */}
                  <div className="absolute top-12 right-12 pointer-events-none select-none z-10 watermark-badge">
                    {currentStatus === 'assinado' ? (
                      <div className="border-4 border-emerald-600 text-emerald-700 rounded-xl px-4 py-2 font-black uppercase tracking-widest text-xs rotate-[-12deg] opacity-80 shadow-xs flex flex-col items-center bg-white/80 backdrop-blur-xs">
                        <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-700">
                          <FileCheck2 className="w-4 h-4" />
                          CONTRATO ASSINADO
                        </div>
                        <span className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                          REGISTRADO EM {dataAssinatura ? new Date(dataAssinatura).toLocaleDateString('pt-BR') : 'DOCUMENTO VÁLIDO'}
                        </span>
                      </div>
                    ) : currentStatus === 'pendente' ? (
                      <div className="border-4 border-amber-600 text-amber-700 rounded-xl px-4 py-2 font-black uppercase tracking-widest text-xs rotate-[-12deg] opacity-80 shadow-xs flex flex-col items-center bg-white/80 backdrop-blur-xs">
                        <div className="flex items-center gap-1.5 text-sm font-extrabold text-amber-700">
                          <Clock className="w-4 h-4" />
                          PENDENTE DE ASSINATURA
                        </div>
                        <span className="text-[10px] text-amber-800 font-semibold mt-0.5">
                          AGUARDANDO FORMALIZAÇÃO DO COTISTA
                        </span>
                      </div>
                    ) : (
                      <div className="border-3 border-stone-400 text-stone-500 rounded-xl px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] rotate-[-8deg] opacity-70 bg-white/80">
                        MINUTA / NÃO ASSINADO
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Cabeçalho do Documento */}
                    <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-stone-200">
                      <img
                        src={contractType === 'aquisicao' ? logoMexicano : logoVale}
                        alt="Logo Oficial"
                        className="h-16 w-auto object-contain mb-3 select-none"
                      />

                      {/* Título do Contrato (com suporte a edição direta) */}
                      {isDirectEditing ? (
                        <div className="w-full max-w-xl mx-auto space-y-1">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                            Título do Contrato (Edição Direta):
                          </span>
                          <textarea
                            value={contractSections.title}
                            onChange={e => handleDirectTitleChange(e.target.value)}
                            rows={2}
                            className="w-full text-center text-sm font-black tracking-tight text-stone-900 uppercase p-2 border-2 border-dashed border-amber-300 rounded-lg focus:outline-none focus:border-mx-ink bg-amber-50/40 resize-none font-sans"
                          />
                        </div>
                      ) : (
                        <h1 className="text-sm font-black tracking-tight text-stone-900 uppercase max-w-lg">
                          {contractSections.title}
                        </h1>
                      )}

                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                        {contractType === 'aquisicao' ? 'Mexicano Lanchas LTDA' : 'Vale Administradora de Bens Náuticos'}
                      </span>
                    </div>

                    {/* Preâmbulo / Identificação das Partes */}
                    {isDirectEditing ? (
                      <div className="py-5 space-y-3 border-b border-stone-200 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                            Identificação do Cliente / Cotista:
                          </span>
                          <textarea
                            value={contractSections.clientStr}
                            onChange={e => handleDirectClientStrChange(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 rounded-lg border border-dashed border-amber-300 text-xs text-stone-800 leading-relaxed font-sans bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-mx-ink"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                            Identificação da Empresa Vendedora / Administradora:
                          </span>
                          <textarea
                            value={contractSections.vendorStr}
                            onChange={e => handleDirectVendorStrChange(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 rounded-lg border border-dashed border-amber-300 text-xs text-stone-800 leading-relaxed font-sans bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-mx-ink"
                          />
                        </div>

                        {contractSections.introStr !== undefined && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                              Considerandos / Introdução:
                            </span>
                            <textarea
                              value={contractSections.introStr}
                              onChange={e => handleDirectIntroStrChange(e.target.value)}
                              rows={3}
                              className="w-full p-2.5 rounded-lg border border-dashed border-amber-300 text-xs text-stone-800 leading-relaxed font-sans bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-mx-ink"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 space-y-3.5 border-b border-stone-100 text-xs">
                        {renderFormattedParagraph(contractSections.clientStr)}
                        {renderFormattedParagraph(contractSections.vendorStr)}
                        {contractSections.introStr && renderFormattedParagraph(contractSections.introStr)}
                      </div>
                    )}

                    {/* Cláusulas do Contrato */}
                    {isDirectEditing ? (
                      <div className="py-5 space-y-4 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                            Cláusulas Contratuais (Edição Direta no Documento)
                          </span>
                          <button
                            type="button"
                            onClick={handleAddDirectClause}
                            className="px-2.5 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Cláusula</span>
                          </button>
                        </div>

                        {contractSections.clauses.map((clause, idx) => (
                          <div
                            key={idx}
                            className="relative group border border-dashed border-amber-300/80 rounded-xl p-3 bg-amber-50/20 hover:border-amber-400 hover:bg-white transition-all space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                Cláusula #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleAddDirectClauseAfter(idx)}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer flex items-center gap-1"
                                  title="Inserir cláusula logo abaixo"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Abaixo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDirectClause(idx)}
                                  className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                  title="Excluir cláusula deste contrato"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <textarea
                              value={clause}
                              onChange={e => handleDirectClauseChange(idx, e.target.value)}
                              rows={Math.max(2, (clause.split('\n').length || 1) + 1)}
                              className="w-full text-xs text-stone-800 p-2 rounded-lg border border-transparent focus:border-mx-ink focus:bg-white font-sans leading-relaxed resize-none focus:outline-none"
                            />
                          </div>
                        ))}

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={handleAddDirectClause}
                            className="px-4 py-2 rounded-xl border border-dashed border-amber-400 hover:border-amber-600 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Nova Cláusula no Final</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 space-y-4 text-xs">
                        {contractSections.clauses.map((clause, idx) => (
                          <div key={idx}>
                            {renderFormattedParagraph(clause)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bloco de Assinaturas */}
                  <div className="pt-10 pb-6 border-t border-stone-200 mt-8 space-y-8 signatures-block">
                    <div className="text-center text-[11px] text-stone-500 italic">
                      E, por estarem assim justos e contratados, as partes assinam o presente instrumento.
                    </div>

                    <div className="text-center font-bold text-xs text-stone-800">
                      {contractType === 'aquisicao'
                        ? `Petrolina/PE, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                        : `PETROLINA-PE, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}.`}
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-center pt-4">
                      {/* Assinatura Empresa */}
                      <div className="space-y-1">
                        <div className="border-t border-stone-800 w-3/4 mx-auto pt-2">
                          <p className="font-bold text-xs text-stone-900">
                            {contractSections.signCompany.name}
                          </p>
                          {contractSections.signCompany.cnpj && (
                            <p className="text-[10px] text-stone-500 font-mono">
                              {contractSections.signCompany.cnpj}
                            </p>
                          )}
                          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                            {contractType === 'aquisicao' ? 'VENDEDOR' : 'ADMINISTRADOR'}
                          </span>
                        </div>
                      </div>

                      {/* Assinatura Cliente */}
                      <div className="space-y-1">
                        <div className="border-t border-stone-800 w-3/4 mx-auto pt-2">
                          <p className="font-bold text-xs text-stone-900">
                            {contractSections.signClient.name}
                          </p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            CPF: {contractSections.signClient.cpf}
                          </p>
                          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                            {contractType === 'aquisicao' ? 'COMPRADOR / COTISTA' : 'CONTRATANTE / COTISTA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Testemunhas */}
                    <div className="pt-4 border-t border-stone-100">
                      <p className="text-[10px] font-bold text-stone-600 mb-3">TESTEMUNHAS:</p>
                      <div className="grid grid-cols-2 gap-8 text-[11px] text-stone-600">
                        <div>
                          <p>Nome: ____________________________________</p>
                          <p className="mt-1">CPF:   ____________________________________</p>
                        </div>
                        <div>
                          <p>Nome: ____________________________________</p>
                          <p className="mt-1">CPF:   ____________________________________</p>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé da Folha */}
                    <div className="text-center text-[10px] text-stone-400 pt-4 flex items-center justify-between border-t border-stone-100">
                      <span>Sistema Comercial El Mexicano & Vale Náuticos</span>
                      <span>Petrolina - PE</span>
                      <span>Documento Oficial</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ABA 2: ARQUIVO ANEXO (PDF OU FOTO ESCANEADA DO CONTRATO FÍSICO) */}
            {activeTab === 'anexo' && (
              <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border border-stone-300 p-6">
                
                {/* Header da Aba Anexo */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                      <Paperclip className="w-5 h-5 text-stone-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        Arquivo do Contrato Assinado / Digitalizado
                      </h3>
                      <p className="text-xs text-stone-500">
                        {contractType === 'aquisicao'
                          ? 'Cópia digitalizada do Contrato de Aquisição assinado'
                          : 'Cópia digitalizada do Contrato de Gestão Náutica assinado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,image/*"
                      className="hidden"
                    />

                    {anexoUrl ? (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-stone-500" />
                          <span>Substituir Arquivo</span>
                        </button>
                        <button
                          onClick={handleRemoveAnexo}
                          className="h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Remover anexo assinado"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Remover</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-8 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-white" />
                        <span>Anexar Contrato Assinado</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Área de Visualização do Arquivo */}
                <div className="flex-1 overflow-auto mt-4 flex items-center justify-center bg-stone-50 rounded-lg border border-dashed border-stone-200 p-4">
                  {isUploading ? (
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-mx-ink mx-auto" />
                      <div className="text-xs font-semibold text-stone-700">
                        Enviando documento assinado ({uploadProgress}%)...
                      </div>
                      <div className="w-48 h-1.5 bg-stone-200 rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full bg-mx-ink transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : anexoUrl ? (
                    anexoUrl.startsWith('data:application/pdf') || anexoUrl.endsWith('.pdf') || anexoNome?.endsWith('.pdf') ? (
                      <iframe
                        src={anexoUrl}
                        title="Documento PDF Anexo"
                        className="w-full h-full rounded border-0 bg-white"
                      />
                    ) : (
                      <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
                        <img
                          src={anexoUrl}
                          alt="Contrato Digitalizado"
                          className="max-w-full max-h-[70vh] object-contain rounded shadow-md"
                        />
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 max-w-sm">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                        <Paperclip className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Nenhum contrato assinado anexado
                      </h4>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        Envie o documento digitalizado ou fotografado (PDF, PNG ou JPG) para comprovar a assinatura deste contrato.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>Selecionar Arquivo</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* Modal de Edição do Modelo de Contrato Base */}
      <ComercialContratoModeloModal
        isOpen={modeloModalOpen}
        onClose={() => setModeloModalOpen(false)}
        initialType={contractType}
        onSaved={() => {
          setTemplateVersion(v => v + 1);
        }}
      />
    </>
  );
}
