import { fetchWithAuth, getAuthHeaders, getAdminToken } from '../utils/apiAuth';
import React, { useState, useEffect, useRef } from 'react';
import { reservationDB, boatDB, clientDB } from '../db';
import { Embarcacao, Cliente, Reserva, TransacaoFinanceira } from '../types';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import { toPng } from 'html-to-image';
// @ts-ignore
import logoUrl from '../assets/images/vale_nauticos_logo_1780256879963.png';
import { ShieldAlert, Smartphone, UserCheck, UserX, QrCode, LogOut, CheckCircle, MessageSquare, Calendar as CalendarIcon, Check, AlertTriangle, 
  RefreshCw, Search, Send, Clock, Ship, CalendarDays, Wallet, Paperclip, FileText, Users, Plus, Trash2, Play, Pause, X, CheckSquare, Square, File, Image as ImageIcon, Sparkles, Filter
, Download, Clipboard, ArrowLeft } from 'lucide-react';

const formatFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const firstName = fullName.trim().split(' ')[0];
  if (!firstName) return '';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const getQuando = (targetDateStr: string): string => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'hoje';
    } else if (diffDays === 1) {
      return 'amanhã';
    } else {
      return `no dia ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    }
  } catch (e) {
    return 'amanhã';
  }
};


const BLOQUEIO_VARIATIONS_DIA = [
  "Oi, {nome}! 😊\n\nEstou tentando gerar a *OS* para a marina descer sua embarcação, mas o sistema *não permite* a emissão porque identificou valores em aberto no cadastro.\n\nComo sua reserva é *hoje*, você consegue verificar isso com urgência? Se já pagou, envie o comprovante para conferirmos e tentarmos liberar a OS a tempo. 👍",
  "Olá, {nome}! Tudo bem? ⚓\n\nFui emitir a *Ordem de Serviço* para a equipe da marina preparar a sua embarcação para hoje, mas o sistema bloqueou indicando uma pendência financeira no cadastro.\n\nComo o seu passeio é *hoje*, consegue dar uma olhadinha nisso para nós? Se o pagamento já foi realizado, manda o comprovante aqui para liberarmos a sua OS o quanto antes! 👍",
  "Oi, {nome}! 😉\n\nJá estamos organizando os atendimentos de *hoje*, mas ao tentar gerar a *OS* para descer seu barco, o sistema travou a emissão por conta de um valor em aberto.\n\nComo queremos deixar tudo pronto para o seu passeio, você consegue verificar para a gente? Caso já tenha feito o pagamento, basta nos enviar o comprovante por aqui. 👍",
  "Olá, {nome}! 😊\n\nPassando para avisar que tentei emitir a *OS de descida* da sua embarcação para hoje, porém o sistema não liberou devido a uma pendência no seu cadastro.\n\nComo sua reserva é para *hoje*, precisamos regularizar isso com urgência. Se já efetuou o pagamento, nos mande o comprovante para fazermos a liberação manual da OS! 👍",
  "Oi, {nome}! Tudo joia? 🚤\n\nEstamos na fase de liberação das *Ordens de Serviço* da marina para hoje, mas constou um impedimento no sistema referente a valores pendentes no seu cadastro.\n\nVocê consegue conferir para nós? Se o pagamento já tiver sido feito, nos envie o comprovante agora para podermos liberar a OS sem atrasar seu atendimento! 👍",
  "Olá, {nome}! 😊\n\nTudo pronto para o seu passeio de *hoje*? Só tive um probleminha aqui: ao tentar gerar a *OS* para descer a embarcação, o sistema bloqueou por pendência financeira.\n\nPara garantirmos a liberação a tempo, você pode dar uma checada? Se já pagou, é só enviar o comprovante aqui na conversa. Obrigado! 👍",
  "Oi, {nome}! ⚓\n\nEstava gerando as *OSs* do dia para a marinharia preparar os barcos, mas o sistema não permitiu a emissão do seu devido a um débito em aberto no cadastro.\n\nComo a sua reserva é *hoje*, peço que verifique isso quanto antes. Caso já tenha realizado o pagamento, mande o comprovante por aqui para tentarmos a liberação imediata! 👍",
  "Olá, {nome}! 😉\n\nPara deixar sua embarcação pronta para descer *hoje*, fui rodar a *Ordem de Serviço*, mas apareceu uma trava no sistema por conta de um valor pendente.\n\nVocê consegue dar uma olhada nisso pra gente? Se o pagamento já foi feito, manda o comprovante por aqui que a gente já checa e tenta liberar sua OS! 👍",
  "Oi, {nome}! 😊\n\nSua reserva é *hoje* e já estamos preparando a movimentação das embarcações! Porém, o sistema não autorizou a geração da *OS* porque acusou pendência no cadastro.\n\nVocê pode verificar para nós por gentileza? Se o comprovante já estiver em mãos, manda aqui para agilizarmos a autorização da sua descida! 👍",
  "Olá, {nome}! Tudo bem? 🚤\n\nEstou no sistema tentando emitir a *OS* para a marina descer seu barco para a reserva de *hoje*, mas constou um aviso de bloqueio por valor em aberto.\n\nComo o horário está próximo, você consegue conferir com urgência? Se já foi pago, é só mandar o comprovante aqui para conferirmos e liberarmos a OS a tempo. 👍"
];

const BLOQUEIO_VARIATIONS_VESPERA = [
  "Oi, {nome}! 😊 Tudo bem?\n\nSua reserva está marcada para {data}.\n\nEstamos fazendo uma conferência rápida nos cadastros e apareceu um valor pendente no seu. Você consegue verificar para nós? Caso já tenha pago, é só mandar o comprovante por aqui.\n\nAssim deixamos tudo certinho para a sua reserva! 👍",
  "Olá, {nome}! Tudo joia? ⚓\n\nSua reserva para {data} já está no nosso radar! Durante a conferência dos cadastros de amanhã, notamos um valor pendente no seu usuário.\n\nConsegue dar uma olhada para nós? Se já tiver pago, nos envie o comprovante por aqui para deixarmos a sua liberação 100% pronta! 👍",
  "Oi, {nome}! 😊\n\nPassando para lembrar que sua reserva é {data}. Tivemos uma notificação de pendência no seu cadastro ao revisar as descidas.\n\nVocê consegue conferir para a gente? Caso o pagamento já tenha sido realizado, basta mandar o comprovante aqui na conversa. Obrigado! 👍",
  "Olá, {nome}! Tudo bem? 🚤\n\nJá estamos adiantando a organização para {data}, mas apareceu um aviso de pendência financeira no seu cadastro.\n\nVocê pode dar uma checada? Se já estiver pago, envie o comprovante por aqui para deixarmos a Ordem de Serviço liberada antecipadamente! 👍",
  "Oi, {nome}! 😉\n\nTudo certo para a sua reserva do dia {data}? Fazendo a conferência prévia, identificamos um valor pendente na sua ficha.\n\nVocê consegue verificar por favor? Se o pagamento já foi feito, mande o comprovante aqui para deixarmos tudo ajustado a tempo! 👍",
  "Olá, {nome}! ⚓\n\nSua reserva para {data} se aproxima! Durante a nossa verificação interna, o sistema indicou uma pendência em seu cadastro.\n\nPoderia verificar para nós? Se já realizou o pagamento, envie o comprovante por aqui para evitarmos qualquer imprevisto na sua descida! 👍",
  "Oi, {nome}! 😊\n\nEstamos preparando os agendamentos do dia {data} e vimos que há um valor em aberto registrado no seu cadastro.\n\nVocê consegue conferir? Se o pagamento já foi concluído, é só mandar o comprovante para nós que atualizamos tudo por aqui. 👍",
  "Olá, {nome}! Tudo joia? 😉\n\nAmanhã temos a sua reserva marcada ({data})! Ao rodar a pré-conferência das embarcações, constou uma pendência cadastral.\n\nVocê consegue nos ajudar verificando esse ponto? Caso já tenha pago, envie o comprovante aqui para deixarmos sua descida autorizada! 👍",
  "Oi, {nome}! 🚤\n\nConferindo os cadastros das reservas de {data}, notamos um lançamento pendente em seu nome.\n\nPode dar uma olhada para nós? Se o comprovante já estiver com você, manda por aqui para deixarmos tudo alinhado para a sua navegação! 👍",
  "Olá, {nome}! 😊\n\nSua navegação para {data} está chegando! Ao verificar as fichas de atendimento, o sistema apontou um valor em aberto.\n\nConsegue checar pra gente? Se o pagamento já foi efetuado, por favor mande o comprovante por aqui para garantirmos sua liberação sem atropelos! 👍"
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateTransactionInterest = (t: TransacaoFinanceira) => {
  const originalVal = Number(t.valor) || 0;
  if (t.status === 'pago' || !t.dataVencimento) {
    return { daysOverdue: 0, interest: 0, total: originalVal };
  }
  const [y, m, d] = t.dataVencimento.split('-').map(Number);
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return { daysOverdue: 0, interest: 0, total: originalVal };
  }

  const ratePerDay = 0.0007333; // 0.07333% ao dia (~2.2% ao mes)
  const interest = originalVal * ratePerDay * daysOverdue;
  return { daysOverdue, interest, total: originalVal + interest };
};

export default function WhatsAppPage() {
  const [activeMainTab, setActiveMainTab] = useState<'confirmations' | 'bloqueio' | 'calendars' | 'custom' | 'extratos' | 'config'>('confirmations');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [extratoSearchQuery, setExtratoSearchQuery] = useState('');
  const [extratoSelectedClientId, setExtratoSelectedClientId] = useState<string | null>(null);
  const [extratoPreviewImage, setExtratoPreviewImage] = useState<string | null>(null);
  const [extratoGenerating, setExtratoGenerating] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

    const keys = [
      'whatsapp_conf_template1',
      'whatsapp_conf_template2',
      'whatsapp_custom_templates',
      'whatsapp_bloqueio_template_vespera',
      'whatsapp_bloqueio_template_dia',
      'whatsapp_bloqueio_counter',
      'whatsapp_cal_template'
    ].join(',');

    fetch(`/api/config?chaves=${keys}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.configs) {
          if (data.configs.whatsapp_conf_template1) {
            setConfTemplate1(data.configs.whatsapp_conf_template1);
            localStorage.setItem('whatsapp_conf_template1', data.configs.whatsapp_conf_template1);
          }
          if (data.configs.whatsapp_conf_template2) {
            setConfTemplate2(data.configs.whatsapp_conf_template2);
            localStorage.setItem('whatsapp_conf_template2', data.configs.whatsapp_conf_template2);
          }
          if (data.configs.whatsapp_custom_templates) {
            try {
              const parsed = JSON.parse(data.configs.whatsapp_custom_templates);
              setCustomTemplates(parsed);
              localStorage.setItem('whatsapp_custom_templates', data.configs.whatsapp_custom_templates);
            } catch (e) {}
          }
          if (data.configs.whatsapp_bloqueio_template_vespera) {
            setBloqueioTemplateVespera(data.configs.whatsapp_bloqueio_template_vespera);
            localStorage.setItem('whatsapp_bloqueio_template_vespera', data.configs.whatsapp_bloqueio_template_vespera);
          }
          if (data.configs.whatsapp_bloqueio_template_dia) {
            setBloqueioTemplateDia(data.configs.whatsapp_bloqueio_template_dia);
            localStorage.setItem('whatsapp_bloqueio_template_dia', data.configs.whatsapp_bloqueio_template_dia);
          }
          if (data.configs.whatsapp_bloqueio_counter) {
            localStorage.setItem('whatsapp_bloqueio_counter', data.configs.whatsapp_bloqueio_counter);
          }
          if (data.configs.whatsapp_cal_template) {
            setCalMessageTemplate(data.configs.whatsapp_cal_template);
            localStorage.setItem('whatsapp_cal_template', data.configs.whatsapp_cal_template);
          }
        }
      })
      .catch(console.warn);
  }, []);


  const [confTemplate1, setConfTemplate1] = useState(() => {
    return localStorage.getItem('whatsapp_conf_template1') || "Olá, *{cliente}*! 😃\nPosso confirmar sua saída *{quando}* com a embarcação *{barco}*?";
  });

  const [confTemplate2, setConfTemplate2] = useState(() => {
    return localStorage.getItem('whatsapp_conf_template2') || "⚠️ *ATENÇÃO: DADOS OBRIGATÓRIOS PARA NAVEGAÇÃO!* ⚠️\nCaso o passeio esteja confirmado, por favor responda com:\n\n📍 *Destino:*\n⏰ *Previsão de saída às:*\n⏰ *Previsão de chegada às:*\n👥 *Número de pessoas a bordo:*\n\n🚨 *A Marinha exige o Plano de Navegação prévio. Com esses dados, adiantaremos o preenchimento obrigatório para sua segurança!*";
  });

  const [showTemplatesEditor, setShowTemplatesEditor] = useState(false);

  const handleSaveConfTemplate1 = (val: string) => {
    setConfTemplate1(val);
    localStorage.setItem('whatsapp_conf_template1', val);
    // Persist to centralized database
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_conf_template1: val }) }).catch(console.warn);
  };

  const handleSaveConfTemplate2 = (val: string) => {
    setConfTemplate2(val);
    localStorage.setItem('whatsapp_conf_template2', val);
    // Persist to centralized database
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_conf_template2: val }) }).catch(console.warn);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  // --- WHATSAPP CONFIG LOGIC ---
  // WhatsApp States
  const [activeTab, setActiveTab] = useState<'conta' | 'contatos' | 'grupos'>('conta');
  const [waStatus, setWaStatus] = useState<string>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [isFetchingWaStatus, setIsFetchingWaStatus] = useState(false);

  // WhatsApp Contacts Sync States
  const [clients, setClients] = useState<Cliente[]>([]);
  const setClientsFiltered = (allClients: Cliente[]) => {
    setClients(allClients.filter(c => !c.nome.toLowerCase().includes('vila nautica')));
  };
  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [activeContactsTab, setActiveContactsTab] = useState<'todos' | 'sem_telefone' | 'vinculados'>('sem_telefone');
  const [clientSearch, setClientSearch] = useState('');
  const [activeManualSyncClientId, setActiveManualSyncClientId] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState('');

  
  // WhatsApp Groups Sync States
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [boats, setBoats] = useState<any[]>([]);

  

  // --- CUSTOM MESSAGES LOGIC ---
  const [customTargetType, setCustomTargetType] = useState<'clients' | 'groups' | 'custom_number'>('clients');
  const [customClientFilterBoatId, setCustomClientFilterBoatId] = useState<string>('all');
  const [customSearch, setCustomSearch] = useState('');
  
  // Selected IDs
  const [customSelectedClientIds, setCustomSelectedClientIds] = useState<string[]>([]);
  const [customSelectedGroupIds, setCustomSelectedGroupIds] = useState<string[]>([]);
  const [customManualNumbers, setCustomManualNumbers] = useState<string>('');
  
  // Message Content & Media
  const [customText, setCustomText] = useState('');
  const [customMedia, setCustomMedia] = useState<{ base64: string; mimetype: string; fileName: string } | null>(null);
  
  // Templates
  const [customTemplates, setCustomTemplates] = useState<Array<{ id: string; title: string; text: string }>>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_custom_templates');
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'Comunicado Geral', text: 'Prezado(a) *{cliente}*,\n\nInformamos que ...\n\nQualquer dúvida estamos à disposição! ⚓' },
        { id: '2', title: 'Aviso de Manutenção', text: 'Atenção cotistas da embarcação *{barco}* ⚠️\n\nA embarcação passará por manutenção preventiva no período de ...\n\nAgradecemos a compreensão!' }
      ];
    } catch {
      return [];
    }
  });
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Send Execution & Delay
  const [customDelaySeconds, setCustomDelaySeconds] = useState<number>(3);
  const [customSendingStatus, setCustomSendingStatus] = useState<'idle' | 'sending' | 'paused' | 'completed'>('idle');
  const [customSendQueue, setCustomSendQueue] = useState<Array<{
    id: string;
    name: string;
    target: string;
    status: 'pending' | 'sending' | 'success' | 'error';
    error?: string;
    clientObj?: Cliente;
  }>>([]);
  const cancelSendingRef = useRef<boolean>(false);

  const handleSaveCustomTemplate = () => {
    if (!newTemplateTitle.trim() || !customText.trim()) {
      showToast('Preencha o título e o texto da mensagem.', 'error');
      return;
    }
    const newT = { id: Date.now().toString(), title: newTemplateTitle.trim(), text: customText };
    const updated = [...customTemplates, newT];
    setCustomTemplates(updated);
    localStorage.setItem('whatsapp_custom_templates', JSON.stringify(updated));
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_custom_templates: JSON.stringify(updated) }) }).catch(console.warn);
    setNewTemplateTitle('');
    setShowSaveTemplateModal(false);
    showToast('Modelo salvo com sucesso!');
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('whatsapp_custom_templates', JSON.stringify(updated));
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_custom_templates: JSON.stringify(updated) }) }).catch(console.warn);
    showToast('Modelo removido.');
  };

  const handleCustomMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('O arquivo deve ter no máximo 10MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setCustomMedia({
        base64,
        mimetype: file.type,
        fileName: file.name
      });
      showToast(`Arquivo "${file.name}" anexado!`);
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomMedia = () => {
    setCustomMedia(null);
    showToast('Anexo removido.');
  };

  const handleInsertVariable = (variableStr: string) => {
    setCustomText(prev => prev + variableStr);
  };

  // Helper lists for custom selection
  const filteredCustomClients = clients.filter(c => {
    if (!c.telefone) return false;
    if (customSearch) {
      const s = customSearch.toLowerCase();
      const matchName = c.nome.toLowerCase().includes(s);
      const matchPhone = c.telefone.includes(s);
      if (!matchName && !matchPhone) return false;
    }
    if (customClientFilterBoatId !== 'all') {
      const boat = boats.find(b => b.id === customClientFilterBoatId);
      if (!boat || !boat.cotistas?.some((cot: any) => cot.clienteId === c.id)) {
        return false;
      }
    }
    return true;
  });

  
  const generateExtratoBase64 = async (clientId: string) => {
    const captureEl = document.getElementById(`extrato-invoice-capture-${clientId}`) || document.getElementById(`bloqueio-invoice-capture-${clientId}`);
    if (!captureEl) throw new Error("Elemento de extrato não encontrado");
    
    // Mostra brevemente se estiver escondido (necessário pro dom-to-image em alguns casos, mas ele tá num fixed offscreen)
    await new Promise(r => setTimeout(r, 200));

    try {
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
    } catch(e) {
      await new Promise(r => setTimeout(r, 600));
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
    }
  };

  const handleGenerateExtratoPreview = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const b64 = await generateExtratoBase64(clientId);
      setExtratoPreviewImage(b64);
    } catch (err: any) {
      showToast("Erro ao gerar prévia da imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleDownloadExtratoNew = async (clientId: string, clientName: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const a = document.createElement('a');
      a.href = base64Image;
      a.download = `Extrato_${clientName.replace(/s+/g, '_')}.png`;
      a.click();
      showToast("Extrato baixado!", "success");
    } catch (err: any) {
      showToast("Falha ao baixar extrato.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const generateExtratoText = (clientId: string): string => {
    const client = clientDB.getById(clientId);
    if (!client) return '';
    const unpaid = transacoes.filter(t => t.clienteId === clientId && t.status !== 'pago' && t.status !== 'cancelado');
    let text = `Olá, *${formatFirstName(client.nome)}*! Tudo bem? ⚓

`;
    text += `Constam em nosso sistema as seguintes pendências financeiras vinculadas ao seu cadastro:

`;
    let totalGeral = 0;
    unpaid.forEach((t, i) => {
      const { interest, total } = calculateTransactionInterest(t);
      totalGeral += total;
      const catName = t.categoria ? t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç') : 'Lançamento';
      const desc = t.descricao ? ` - ${t.descricao}` : '';
      const venc = t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : '-';
      text += `🔸 *${i+1}. ${catName}*${desc}
`;
      text += `Vencimento: ${venc}
`;
      text += `Valor Orig.: R$ ${Number(t.valor).toFixed(2).replace('.', ',')}`;
      if (interest > 0) {
        text += ` | Juros/Atraso: R$ ${interest.toFixed(2).replace('.', ',')}`;
      }
      text += `
*_Total: R$ ${total.toFixed(2).replace('.', ',')}_*

`;
    });
    
    text += `*Total Geral Pendente: R$ ${totalGeral.toFixed(2).replace('.', ',')}*

`;
    text += `⚠ Sua embarcação/reserva se encontra bloqueada até a regularização.

`;
    text += `Para efetuar o pagamento, utilize a nossa chave PIX:
[ INSERIR CHAVE AQUI ]

`;
    text += `Por favor, nos envie o comprovante assim que realizar o pagamento para liberarmos o seu acesso no sistema! 👍`;
    return text;
  };

  const handleCopyExtratoText = async (clientId: string) => {
    try {
      const text = generateExtratoText(clientId);
      await navigator.clipboard.writeText(text);
      showToast("Texto copiado para a área de transferência!", "success");
    } catch (e) {
      showToast("Erro ao copiar texto.", "error");
    }
  };

  const handleCopyExtratoImage = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      showToast("Imagem copiada para a área de transferência!", "success");
    } catch (err: any) {
      showToast("Seu navegador não suporta cópia direta de imagem. Tente Baixar a imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleSendWAExtrato = (clientId: string) => {
    const client = clientDB.getById(clientId);
    if (!client || !client.telefone) return showToast("Cliente sem telefone válido.", "error");
    const text = generateExtratoText(clientId);
    const wppNum = client.telefone.replace(/D/g, '');
    const url = `https://wa.me/55${wppNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadExtrato = async (clientId: string, clientName: string) => {
    // Mantendo compatibility original pro caso de outro lugar chamar (pouco provável)
    await handleDownloadExtratoNew(clientId, clientName);
  };
const handleToggleSelectClient = (id: string) => {
    setCustomSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllClients = () => {
    const visibleIds = filteredCustomClients.map(c => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => customSelectedClientIds.includes(id));
    if (allSelected) {
      setCustomSelectedClientIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const combined = new Set([...customSelectedClientIds, ...visibleIds]);
      setCustomSelectedClientIds(Array.from(combined));
    }
  };

  // Groups selection helper
  const allAvailableGroupsList = () => {
    const list: Array<{ id: string; name: string; boatName?: string }> = [];
    const addedIds = new Set<string>();

    // Mapped boat groups
    boats.forEach(b => {
      if (b.whatsappGroupId && !addedIds.has(b.whatsappGroupId)) {
        addedIds.add(b.whatsappGroupId);
        list.push({
          id: b.whatsappGroupId,
          name: `Grupo ${b.nome} (${b.numero ? 'M' + b.numero : 'Lancha'})`,
          boatName: b.nome
        });
      }
    });
    // Fetched groups from VPS
    availableGroups.forEach(g => {
      const gid = g?.id || g?.jid;
      if (gid && !addedIds.has(gid)) {
        addedIds.add(gid);
        list.push({
          id: gid,
          name: g.subject || g.name || gid
        });
      }
    });
    return list;
  };

  const filteredCustomGroups = allAvailableGroupsList().filter(g => {
    if (!customSearch) return true;
    const s = customSearch.toLowerCase();
    return g.name.toLowerCase().includes(s) || g.id.toLowerCase().includes(s);
  });

  const handleToggleSelectGroup = (id: string) => {
    setCustomSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllGroups = () => {
    const visibleIds = filteredCustomGroups.map(g => g.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => customSelectedGroupIds.includes(id));
    if (allSelected) {
      setCustomSelectedGroupIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const combined = new Set([...customSelectedGroupIds, ...visibleIds]);
      setCustomSelectedGroupIds(Array.from(combined));
    }
  };

  const handlePrepareCustomSend = () => {
    if (!customText.trim() && !customMedia) {
      showToast('Digite uma mensagem ou selecione um anexo.', 'error');
      return;
    }

    const queue: Array<{ id: string; name: string; target: string; status: 'pending' | 'sending' | 'success' | 'error'; clientObj?: Cliente }> = [];

    if (customTargetType === 'clients') {
      if (customSelectedClientIds.length === 0) {
        showToast('Selecione pelo menos um cliente com WhatsApp.', 'error');
        return;
      }
      for (const clientId of customSelectedClientIds) {
        const client = clients.find(c => c.id === clientId);
        if (client && client.telefone) {
          queue.push({
            id: client.id,
            name: client.nome,
            target: client.telefone,
            status: 'pending',
            clientObj: client
          });
        }
      }
    } else if (customTargetType === 'groups') {
      if (customSelectedGroupIds.length === 0) {
        showToast('Selecione pelo menos um grupo de WhatsApp.', 'error');
        return;
      }
      for (const groupId of customSelectedGroupIds) {
        const groupInfo = allAvailableGroupsList().find(g => g.id === groupId);
        queue.push({
          id: groupId,
          name: groupInfo ? groupInfo.name : groupId,
          target: groupId,
          status: 'pending'
        });
      }
    } else if (customTargetType === 'custom_number') {
      const numbers = customManualNumbers
        .split(/[\n,;]+/)
        .map(n => n.trim())
        .filter(n => n.length >= 8);
      if (numbers.length === 0) {
        showToast('Digite ao menos um número válido.', 'error');
        return;
      }
      numbers.forEach((num, idx) => {
        queue.push({
          id: `manual_${idx}`,
          name: `Contato (${num})`,
          target: num,
          status: 'pending'
        });
      });
    }

    if (queue.length === 0) {
      showToast('Nenhum destinatário válido encontrado.', 'error');
      return;
    }

    setCustomSendQueue(queue);
    cancelSendingRef.current = false;
    setCustomSendingStatus('sending');
    startSendingCustomQueue(queue);
  };

  const startSendingCustomQueue = async (initialQueue: typeof customSendQueue) => {
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

    for (let i = 0; i < initialQueue.length; i++) {
      if (cancelSendingRef.current) {
        showToast('Envio de mensagens cancelado pelo usuário.', 'error');
        setCustomSendingStatus('idle');
        return;
      }

      const item = initialQueue[i];

      // Build custom message variables
      let finalMsg = customText;
      if (item.clientObj) {
        const clientFirstName = formatFirstName(item.clientObj.nome);
        const clientBoats = boats.filter(b => b.cotistas?.some((c: any) => c.clienteId === item.clientObj?.id));
        const boatName = clientBoats.map(b => b.nome).join(', ') || 'Vila Náutica';
        finalMsg = finalMsg
          .replace(/{cliente}/g, item.clientObj.nome)
          .replace(/{primeiro_nome}/g, clientFirstName)
          .replace(/{barco}/g, boatName);
      } else {
        finalMsg = finalMsg
          .replace(/{cliente}/g, item.name)
          .replace(/{primeiro_nome}/g, item.name.split(' ')[0])
          .replace(/{barco}/g, 'Vila Náutica');
      }

      setCustomSendQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'sending' } : q));

      try {
        const res = await fetch('/api/whatsapp/send-custom', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: item.target,
            text: finalMsg,
            media: customMedia?.base64,
            mimetype: customMedia?.mimetype,
            fileName: customMedia?.fileName
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Erro no envio');
        }

        setCustomSendQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'success' } : q));
      } catch (err: any) {
        setCustomSendQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message } : q));
      }

      // Delay between sending items
      if (i < initialQueue.length - 1) {
        await sleep(customDelaySeconds * 1000);
      }
    }

    setCustomSendingStatus('completed');
    showToast('Processo de disparo concluído!', 'success');
  };

  const handleStopCustomSend = () => {
    cancelSendingRef.current = true;
    setCustomSendingStatus('idle');
    showToast('Interrompendo envios...');
  };

  // --- CONFIRMATIONS LOGIC ---
  const [confDate, setConfDate] = useState(() => {
    const today = new Date();
    const localStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    return localStr;
  });
  
  const [confReservations, setConfReservations] = useState<Reserva[]>([]);
  const [confSearch, setConfSearch] = useState('');
  const [confFilter, setConfFilter] = useState<'all' | 'with_contact' | 'without_contact'>('all');
  const [confSelectedIds, setConfSelectedIds] = useState<string[]>([]);
  const [confSendingStatus, setConfSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [confSendResults, setConfSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});

  useEffect(() => {
    const res = reservationDB.getAll().filter(r => r.data === confDate && (r.status === 'agendado' || r.status === 'confirmado'));
    setConfReservations(res);
    
    // Auto-seleciona apenas os que têm telefone e AINDA NÃO tiveram confirmação enviada
    const initialSelected = res
      .filter(r => {
        const client = clientDB.getById(r.clienteId);
        return !!client?.telefone && !r.confirmacaoEnviada && client?.statusFinanceiro !== 'inadimplente';
      })
      .map(r => r.id);
    setConfSelectedIds(initialSelected);

    // Inicializa o status visual mostrando quais já foram enviados no passado
    const initialResults: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    res.forEach(r => {
      initialResults[r.id] = r.confirmacaoEnviada ? 'success' : 'pending';
    });
    setConfSendResults(initialResults);
    setConfSendingStatus('idle');
  }, [confDate]);

  const filteredConfRes = confReservations.filter(res => {
    const client = clientDB.getById(res.clienteId);
    const boat = boatDB.getById(res.embarcacaoId);
    const search = confSearch.toLowerCase();
    
    const matchesSearch = !search || 
      client?.nome?.toLowerCase().includes(search) || 
      boat?.nome?.toLowerCase().includes(search) || 
      String(boat?.numero).includes(search);
      
    if (!matchesSearch) return false;
    
    const hasPhone = !!client?.telefone;
    if (confFilter === 'with_contact' && !hasPhone) return false;
    if (confFilter === 'without_contact' && hasPhone) return false;
    
    return true;
  });

  const visibleIdsWithPhone = filteredConfRes
    .filter(res => !!clientDB.getById(res.clienteId)?.telefone)
    .map(res => res.id);
  
  const allVisibleSelected = visibleIdsWithPhone.length > 0 && visibleIdsWithPhone.every(id => confSelectedIds.includes(id));

  const handleConfToggleSelect = (id: string) => {
    setConfSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleConfToggleSelectAll = () => {
    if (allVisibleSelected) {
      setConfSelectedIds(prev => prev.filter(id => !visibleIdsWithPhone.includes(id)));
    } else {
      const newSelection = new Set([...confSelectedIds, ...visibleIdsWithPhone]);
      setConfSelectedIds(Array.from(newSelection));
    }
  };

  const handleSendConfirmations = async () => {
    if (confSelectedIds.length === 0) {
      showToast('Nenhum agendamento selecionado.', 'error');
      return;
    }
    cancelSendingRef.current = false;
    setConfSendingStatus('sending');
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

    for (const resId of confSelectedIds) {
      if (cancelSendingRef.current) {
        showToast('Envio de confirmações cancelado pelo usuário.', 'error');
        setConfSendingStatus('idle');
        return;
      }

      const res = confReservations.find(r => r.id === resId);
      if (!res) continue;
      const client = clientDB.getById(res.clienteId);
      const boat = boatDB.getById(res.embarcacaoId);
      if (!client || !client.telefone) continue;

      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';
      const clientFirstName = client.nome ? formatFirstName(client.nome) : '';
      const quando = getQuando(res.data);
      const text1 = confTemplate1
        .replace(/{cliente}/g, clientFirstName)
        .replace(/{barco}/g, boatCode)
        .replace(/{quando}/g, quando);
      const text2 = confTemplate2
        .replace(/{cliente}/g, clientFirstName)
        .replace(/{barco}/g, boatCode)
        .replace(/{quando}/g, quando);

      setConfSendResults(prev => ({ ...prev, [resId]: 'sending' }));

      try {
        let response = await fetch('/api/whatsapp/send-text', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: client.telefone, text: text1 })
        });
        if (!response.ok) throw new Error('Falha 1');
        
        await sleep(4000);
        
        response = await fetch('/api/whatsapp/send-text', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: client.telefone, text: text2 })
        });
        if (!response.ok) throw new Error('Falha 2');

        setConfSendResults(prev => ({ ...prev, [resId]: 'success' }));
        reservationDB.update(resId, { confirmacaoEnviada: true });
      } catch (err) {
        setConfSendResults(prev => ({ ...prev, [resId]: 'error' }));
      }
      await sleep(5000);
    }
    setConfSendingStatus('completed');
    showToast('Processo de disparo concluído!', 'success');
  };

  const handleStopConfSend = () => {
    cancelSendingRef.current = true;
    setConfSendingStatus('idle');
    showToast('Interrompendo envios de confirmação...');
  };

  // --- BLOQUEIO LOGIC ---
  const [bloqueioMode, setBloqueioMode] = useState<'vespera' | 'dia'>('vespera');
  const [bloqueioDate, setBloqueioDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  });

  const [bloqueioTemplateVespera, setBloqueioTemplateVespera] = useState(() => {
    return localStorage.getItem('whatsapp_bloqueio_template_vespera') || 
      "Oi, {nome}! 😊 Tudo bem?\n\nSua reserva está marcada para {data}.\n\nEstamos fazendo uma conferência rápida nos cadastros e apareceu um valor pendente no seu. Você consegue verificar para nós? Caso já tenha pago, é só mandar o comprovante por aqui.\n\nAssim deixamos tudo certinho para a sua reserva! 👍";
  });

  const [bloqueioTemplateDia, setBloqueioTemplateDia] = useState(() => {
    const defaultTemplate = "Oi, {nome}! 😊\n\nEstou tentando gerar a *OS* para a marina descer sua embarcação, mas o sistema *não permite* a emissão porque identificou valores em aberto no cadastro.\n\nComo sua reserva é *hoje*, você consegue verificar isso com urgência? Se já pagou, envie o comprovante para conferirmos e tentarmos liberar a OS a tempo. 👍";
    const saved = localStorage.getItem('whatsapp_bloqueio_template_dia');
    if (!saved || saved.includes("queremos muito garantir o passeio")) {
      localStorage.setItem('whatsapp_bloqueio_template_dia', defaultTemplate);
      return defaultTemplate;
    }
    return saved;
  });

  const [showBloqueioTemplatesEditor, setShowBloqueioTemplatesEditor] = useState(false);
  const [useBloqueioVariations, setUseBloqueioVariations] = useState(true);
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);

  useEffect(() => {
    fetch('/api/financeiro/transacoes', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransacoes(data);
      })
      .catch(console.warn);
  }, []);

  const getNextBloqueioVariation = (mode: 'vespera' | 'dia') => {
    const variations = mode === 'vespera' ? BLOQUEIO_VARIATIONS_VESPERA : BLOQUEIO_VARIATIONS_DIA;
    const currentCount = parseInt(localStorage.getItem('whatsapp_bloqueio_counter') || '0', 10);
    const selectedText = variations[currentCount % variations.length];
    const nextCount = String(currentCount + 1);
    localStorage.setItem('whatsapp_bloqueio_counter', nextCount);
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_bloqueio_counter: nextCount }) }).catch(console.warn);
    return selectedText;
  };

  const handleSaveBloqueioTemplateVespera = (val: string) => {
    setBloqueioTemplateVespera(val);
    localStorage.setItem('whatsapp_bloqueio_template_vespera', val);
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_bloqueio_template_vespera: val }) }).catch(console.warn);
  };

  const handleSaveBloqueioTemplateDia = (val: string) => {
    setBloqueioTemplateDia(val);
    localStorage.setItem('whatsapp_bloqueio_template_dia', val);
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_bloqueio_template_dia: val }) }).catch(console.warn);
  };

  const [bloqueioSearch, setBloqueioSearch] = useState('');
  const [bloqueioFilter, setBloqueioFilter] = useState<'all' | 'with_contact' | 'without_contact'>('all');
  const [bloqueioSelectedIds, setBloqueioSelectedIds] = useState<string[]>([]);
  const [bloqueioSendingStatus, setBloqueioSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [bloqueioSendResults, setBloqueioSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [bloqueioReservations, setBloqueioReservations] = useState<Reserva[]>([]);

  const handleChangeBloqueioMode = (mode: 'vespera' | 'dia') => {
    setBloqueioMode(mode);
    const today = new Date();
    if (mode === 'vespera') {
      today.setDate(today.getDate() + 1);
    }
    const localStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setBloqueioDate(localStr);
  };

  useEffect(() => {
    const allRes = reservationDB.getAll().filter(r => r.data === bloqueioDate && (r.status === 'agendado' || r.status === 'confirmado'));
    
    // Filter strictly to inadimplente clients
    const pendingRes = allRes.filter(r => {
      const client = clientDB.getById(r.clienteId);
      if (!client) return false;
      return client.statusFinanceiro === 'inadimplente';
    });

    setBloqueioReservations(pendingRes);

    // Auto-select clients with phone numbers
    const initialSelected = pendingRes
      .filter(r => {
        const client = clientDB.getById(r.clienteId);
        return !!client?.telefone;
      })
      .map(r => r.id);
    setBloqueioSelectedIds(initialSelected);

    const initialResults: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    pendingRes.forEach(r => {
      initialResults[r.id] = (bloqueioMode === 'vespera' ? (r as any).bloqueioVesperaEnviado : (r as any).bloqueioDiaEnviado) ? 'success' : 'pending';
    });
    setBloqueioSendResults(initialResults);
    setBloqueioSendingStatus('idle');
  }, [bloqueioDate, bloqueioMode]);

  const filteredBloqueioRes = bloqueioReservations.filter(res => {
    const client = clientDB.getById(res.clienteId);
    const boat = boatDB.getById(res.embarcacaoId);
    const search = bloqueioSearch.toLowerCase();

    const matchesSearch = !search || 
      client?.nome?.toLowerCase().includes(search) || 
      boat?.nome?.toLowerCase().includes(search) || 
      String(boat?.numero).includes(search);

    if (!matchesSearch) return false;

    const hasPhone = !!client?.telefone;
    if (bloqueioFilter === 'with_contact' && !hasPhone) return false;
    if (bloqueioFilter === 'without_contact' && hasPhone) return false;

    return true;
  });

  const visibleBloqueioIdsWithPhone = filteredBloqueioRes
    .filter(res => !!clientDB.getById(res.clienteId)?.telefone)
    .map(res => res.id);

  const allVisibleBloqueioSelected = visibleBloqueioIdsWithPhone.length > 0 && visibleBloqueioIdsWithPhone.every(id => bloqueioSelectedIds.includes(id));

  const handleBloqueioToggleSelect = (id: string) => {
    setBloqueioSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBloqueioToggleSelectAll = () => {
    if (allVisibleBloqueioSelected) {
      setBloqueioSelectedIds(prev => prev.filter(id => !visibleBloqueioIdsWithPhone.includes(id)));
    } else {
      const newSelection = new Set([...bloqueioSelectedIds, ...visibleBloqueioIdsWithPhone]);
      setBloqueioSelectedIds(Array.from(newSelection));
    }
  };

  const handleSendBloqueio = async () => {
    if (bloqueioSelectedIds.length === 0) {
      showToast('Nenhum agendamento selecionado.', 'error');
      return;
    }
    cancelSendingRef.current = false;
    setBloqueioSendingStatus('sending');
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

    let itemIndex = 0;
    for (const resId of bloqueioSelectedIds) {
      if (cancelSendingRef.current) {
        showToast('Envio de bloqueios cancelado pelo usuário.', 'error');
        setBloqueioSendingStatus('idle');
        return;
      }
      const res = bloqueioReservations.find(r => r.id === resId);
      if (!res) continue;
      const client = clientDB.getById(res.clienteId);
      const boat = boatDB.getById(res.embarcacaoId);
      if (!client || !client.telefone) continue;

      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';
      const clientFirstName = client.nome ? formatFirstName(client.nome) : '';
      
      const dateParts = res.data.split('-');
      const dateBr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : res.data;

      // Select template variation dynamically (cycling through the 10 variations)
      const selectedVariation = useBloqueioVariations 
        ? getNextBloqueioVariation(bloqueioMode)
        : (bloqueioMode === 'vespera' ? bloqueioTemplateVespera : bloqueioTemplateDia);

      const text = selectedVariation
        .replace(/\[nome\]|\{nome\}|\{cliente\}/g, clientFirstName)
        .replace(/\[data\]|\{data\}/g, dateBr)
        .replace(/\{barco\}/g, boatCode);

      itemIndex++;
      // Generate image for client debit statement card
      let base64Image: string | null = null;
      try {
        const captureEl = document.getElementById(`bloqueio-invoice-capture-${client.id}`);
        if (captureEl) {
          // Aguarda um pequeno instante para o DOM estar pronto e as fontes/background renderizarem
          await new Promise(r => setTimeout(r, 250));
          try {
            base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
          } catch (e1) {
            console.warn('Retentando gerar imagem do extrato de débito...');
            await new Promise(r => setTimeout(r, 600));
            base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
          }
        }
      } catch (imgErr) {
        console.warn('Erro fatal ao gerar imagem do extrato de débito:', imgErr);
      }

      setBloqueioSendResults(prev => ({ ...prev, [resId]: 'sending' }));

      try {
        const endpoint = base64Image ? '/api/whatsapp/send-custom' : '/api/whatsapp/send-text';
        const bodyPayload = base64Image ? {
          number: client.telefone,
          text: text,
          media: base64Image,
          mimetype: 'image/png',
          fileName: `Fatura-${clientFirstName}.png`
        } : {
          number: client.telefone,
          text: text
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload)
        });
        if (!response.ok) throw new Error('Falha no envio');

        setBloqueioSendResults(prev => ({ ...prev, [resId]: 'success' }));
        reservationDB.update(resId, { 
          [bloqueioMode === 'vespera' ? 'bloqueioVesperaEnviado' : 'bloqueioDiaEnviado']: true 
        });
      } catch (err) {
        setBloqueioSendResults(prev => ({ ...prev, [resId]: 'error' }));
      }
      await sleep(4000);
    }
    setBloqueioSendingStatus('completed');
    showToast('Disparo de avisos de bloqueio concluído!', 'success');
  };

  const handleStopBloqueioSend = () => {
    cancelSendingRef.current = true;
    setBloqueioSendingStatus('idle');
    showToast('Interrompendo envios de bloqueio...');
  };

  const fetchWaStatus = async () => {
    setIsFetchingWaStatus(true);
    try {
      const res = await fetch('/api/whatsapp/status', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const state = data?.instance?.state || 'close';
      setWaStatus(state);
      if (state !== 'open') {
        fetchWaQrCode();
      } else {
        setWaQrCode(null);
      }
    } catch (err) {
      console.error(err);
      setWaStatus('error');
    } finally {
      setIsFetchingWaStatus(false);
    }
  };

  const fetchWaQrCode = async () => {
    try {
      const res = await fetch('/api/whatsapp/connect', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const qr = data.base64 || data.qrcode?.base64 || data.code;
      if (qr) {
        setWaQrCode(qr);
      } else if (data.instance?.state === 'open') {
        setWaStatus('open');
        setWaQrCode(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWaLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout', {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      showToast('WhatsApp desconectado!');
      setWaStatus('close');
      setTimeout(() => fetchWaQrCode(), 2000);
    } catch (err) {
      showToast('Erro ao desconectar', 'error');
    }
  };

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        const unique = Array.from(new Map(data.groups.map((g: any) => [g.id || g.jid, g])).values());
        setAvailableGroups(unique);
        const newMapping: Record<string, string> = {};
        for (const b of boats) {
          if (b.whatsappGroupId) newMapping[b.id] = b.whatsappGroupId;
        }
        setMappingState(newMapping);
        showToast(`${unique.length} grupos carregados.`);
      } else {
        showToast('Erro ao carregar grupos', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão com grupos', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleMappingChange = (boatId: string, groupId: string) => {
    setMappingState(prev => ({ ...prev, [boatId]: groupId }));
  };

  const handleSaveGroupMapping = () => {
    try {
      let count = 0;
      for (const b of boats) {
        const newGroupId = mappingState[b.id] || '';
        if (newGroupId !== (b.whatsappGroupId || '')) {
          boatDB.update(b.id, { whatsappGroupId: newGroupId || undefined });
          count++;
        }
      }
      setBoats(boatDB.getAll());
      showToast(`Mapeamento salvo! ${count} atualizações.`);
    } catch (err) {
      showToast('Erro ao salvar mapeamento', 'error');
    }
  };

  const fetchWhatsAppContactsList = async () => {
    setIsFetchingContacts(true);
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        const personal = data.contacts.filter((c: any) => c.remoteJid && c.remoteJid.endsWith('@s.whatsapp.net'));
        setWhatsAppContacts(personal);
        showToast(`${personal.length} contatos carregados!`);
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast('Erro ao obter contatos da VPS.', 'error');
    } finally {
      setIsFetchingContacts(false);
    }
  };

  const handleLinkPhone = (clientId: string, phone: string) => {
    try {
      clientDB.update(clientId, { telefone: phone });
      setClientsFiltered(clientDB.getAll());
      showToast('Telefone vinculado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao atualizar cadastro', 'error');
    }
  };

  const handleUnlinkPhone = (clientId: string) => {
    try {
      clientDB.update(clientId, { telefone: '' });
      setClientsFiltered(clientDB.getAll());
      showToast('Vínculo de telefone removido.');
    } catch (err: any) {
      showToast('Erro ao remover vínculo', 'error');
    }
  };

  const formatPhoneNumber = (jid: string): string => {
    const raw = jid.split('@')[0];
    if (raw.startsWith('55') && raw.length >= 12) {
      const ddd = raw.substring(2, 4);
      const rest = raw.substring(4);
      if (rest.length === 9) return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return raw;
  };

  


  useEffect(() => {
    fetchWaStatus();
    setClientsFiltered(clientDB.getAll());
    setBoats(boatDB.getAll());
  }, []);

  // --- CALENDARS LOGIC ---
  const [calMonth, setCalMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [calBoats, setCalBoats] = useState<Embarcacao[]>([]);
  const [calSearch, setCalSearch] = useState('');
  const [calSelectedIds, setCalSelectedIds] = useState<string[]>([]);
  const [calSendingStatus, setCalSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [calSendResults, setCalSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [currentBoatIdx, setCurrentBoatIdx] = useState<number>(-1);

  const [calMessageTemplate, setCalMessageTemplate] = useState(() => {
    return localStorage.getItem('whatsapp_cal_template') || "Olá pessoal! 📅 Segue o calendário de reservas da embarcação {barco} para o mês de {mes}. Bom uso a todos! ☀️⛵";
  });

  const handleSaveCalTemplate = (val: string) => {
    setCalMessageTemplate(val);
    localStorage.setItem('whatsapp_cal_template', val);
    // Persist to centralized database
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_cal_template: val }) }).catch(console.warn);
  };

  useEffect(() => {
    // Only boats with WhatsApp groups
    const all = boatDB.getAll().filter(b => b.whatsappGroupId);
    setCalBoats(all);
  }, []);

  const filteredCalBoats = calBoats.filter(b => {
    if (!calSearch) return true;
    const s = calSearch.toLowerCase();
    return b.nome.toLowerCase().includes(s) || String(b.numero).includes(s);
  });

  const calAllSelected = filteredCalBoats.length > 0 && filteredCalBoats.every(b => calSelectedIds.includes(b.id));

  const handleCalToggleSelectAll = () => {
    if (calAllSelected) {
      setCalSelectedIds(prev => prev.filter(id => !filteredCalBoats.some(b => b.id === id)));
    } else {
      const newSelection = new Set([...calSelectedIds, ...filteredCalBoats.map(b => b.id)]);
      setCalSelectedIds(Array.from(newSelection));
    }
  };

  const handleStartCalSend = () => {
    if (calSelectedIds.length === 0) {
      showToast('Selecione pelo menos uma embarcação.', 'error');
      return;
    }
    setCalSendingStatus('sending');
    setCurrentBoatIdx(0);
    // Initializes the results mapping
    const initialResults: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    calSelectedIds.forEach(id => initialResults[id] = 'pending');
    setCalSendResults(initialResults);
  };

  // Called when MonthlyCalendarGenerator triggers onExport
  const handleCalendarExported = async (base64Image: string) => {
    const boatId = calSelectedIds[currentBoatIdx];
    const boat = boatDB.getById(boatId);
    if (!boat || !boat.whatsappGroupId) {
       nextCalendar();
       return;
    }
    
    setCalSendResults(prev => ({ ...prev, [boatId]: 'sending' }));
    
    try {
      const token = getAdminToken();
      
      const groupObj = availableGroups.find(g => g.id === boat.whatsappGroupId);
      const groupName = groupObj ? (groupObj.subject || groupObj.name || boat.whatsappGroupId) : boat.nome;
      
      const [year, month] = calMonth.split('-');
      const monthsPt = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const monthName = monthsPt[parseInt(month, 10) - 1] || month;
      
      const caption = calMessageTemplate
        .replace(/{barco}/g, boat.nome)
        .replace(/{grupo}/g, groupName)
        .replace(/{mes}/g, `${monthName} de ${year}`)
        .replace(/{ano}/g, year);

      const response = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          base64Image: base64Image,
          groupId: boat.whatsappGroupId,
          boatName: boat.nome,
          caption: caption
        })
      });
      
      if (!response.ok) throw new Error('Falha no envio');
      setCalSendResults(prev => ({ ...prev, [boatId]: 'success' }));
    } catch (err) {
      setCalSendResults(prev => ({ ...prev, [boatId]: 'error' }));
    }
    
    await sleep(3000); // Wait 3 seconds before moving to next boat
    nextCalendar();
  };

  const nextCalendar = () => {
    if (currentBoatIdx + 1 < calSelectedIds.length) {
      setCurrentBoatIdx(currentBoatIdx + 1);
    } else {
      setCalSendingStatus('completed');
      setCurrentBoatIdx(-1);
      showToast('Envio de calendários concluído!', 'success');
    }
  };

  const activeProcessingBoatId = currentBoatIdx >= 0 ? calSelectedIds[currentBoatIdx] : null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" /> Central de WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Dispare confirmações e calendários em massa de forma automatizada</p>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-200/50 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveMainTab('confirmations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'confirmations' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Check className="w-4 h-4" /> Confirmações Diárias
        </button>
        <button 
          onClick={() => setActiveMainTab('bloqueio')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'bloqueio' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" /> Bloqueio Financeiro
        </button>
        <button 
          onClick={() => setActiveMainTab('calendars')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'calendars' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendários Mensais
        </button>
        <button 
          onClick={() => setActiveMainTab('custom')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'custom' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Send className="w-4 h-4 text-emerald-600" /> Envio Avulso / Personalizado
        </button>
        <button
          onClick={() => setActiveMainTab('extratos')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'extratos' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" /> Gerar Extrato
        </button>
        <button
          onClick={() => setActiveMainTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'config' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Configurações & Conexão
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col h-0 overflow-hidden">
        
        {/* CONFIRMATIONS TAB */}
        {activeMainTab === 'confirmations' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex gap-4 items-center mb-2 shrink-0">
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data dos Agendamentos</label>
                <input 
                  type="date" 
                  value={confDate} 
                  onChange={e => setConfDate(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pesquisar</label>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome do cliente ou embarcação..."
                    value={confSearch}
                    onChange={(e) => setConfSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="self-end mb-[2px]">
                <button
                  onClick={() => setShowTemplatesEditor(prev => !prev)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors h-[38px]"
                >
                  <MessageSquare className="w-4 h-4" /> 
                  {showTemplatesEditor ? 'Ocultar Modelos' : 'Editar Modelos'}
                </button>
              </div>
            </div>

            {showTemplatesEditor && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Modelo da 1ª Mensagem (Confirmação)</label>
                  <textarea
                    value={confTemplate1}
                    onChange={e => handleSaveConfTemplate1(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                    placeholder="Ex: Olá, {cliente}! 😃..."
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Modelo da 2ª Mensagem (Dados de Navegação)</label>
                  <textarea
                    value={confTemplate2}
                    onChange={e => handleSaveConfTemplate2(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                    placeholder="Ex: ⚠️ ATENÇÃO: DADOS OBRIGATÓRIOS... ⚠️"
                  />
                </div>
                
                <div className="md:col-span-2 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-bold text-slate-700">Variáveis disponíveis:</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{cliente}'}</code> (Primeiro nome, ex: Adhler)</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Código da embarcação, ex: M18)</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{quando}'}</code> (Dia relativo, ex: hoje / amanhã / no dia 03/07)</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                 <button onClick={() => setConfFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'all' ? 'bg-white shadow' : 'text-slate-500'}`}>Todos</button>
                 <button onClick={() => setConfFilter('with_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'with_contact' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Com Telefone</button>
                 <button onClick={() => setConfFilter('without_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'without_contact' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}>Sem Telefone</button>
              </div>
              <button 
                onClick={handleConfToggleSelectAll}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                 <Check className="w-4 h-4" /> Selecionar Todos Filtrados
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-t pt-4">
              {filteredConfRes.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Nenhum agendamento encontrado para esta data.</div>
              ) : (
                filteredConfRes.map(res => {
                  const client = clientDB.getById(res.clienteId);
                  const boat = boatDB.getById(res.embarcacaoId);
                  const hasPhone = !!client?.telefone;
                  const isSelected = confSelectedIds.includes(res.id);
                  const status = confSendResults[res.id] || 'pending';
                  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';

                  return (
                    <div key={res.id} className={`flex flex-col p-3 rounded-xl border ${isSelected ? 'bg-emerald-50/30 border-emerald-300' : 'bg-slate-50 border-slate-200'} ${!hasPhone ? 'opacity-60 bg-slate-100 grayscale' : 'cursor-pointer hover:border-emerald-400'}`} onClick={() => hasPhone && confSendingStatus !== 'sending' && handleConfToggleSelect(res.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button disabled={!hasPhone || confSendingStatus === 'sending'} className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{boatCode}</span>
                               <span className="font-bold text-sm text-slate-800">{client?.nome || 'Desconhecido'}</span>
                               {client?.statusFinanceiro === 'inadimplente' ? (
                                 <span className="font-bold text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Cliente inadimplente não pode usufruir da embarcação">
                                    <AlertTriangle className="w-3 h-3"/> Inadimplente
                                 </span>
                               ) : (client?.temValoresEmAberto || client?.statusFinanceiro === 'pendente') ? (
                                 <span className="font-bold text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Possui valores lançados em aberto">
                                    <Wallet className="w-3 h-3"/> Possui Lançamentos
                                 </span>
                               ) : client?.temLancamentos ? (
                                 <span className="font-bold text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Possui lançamentos no sistema">
                                    <Wallet className="w-3 h-3"/> Com Lançamentos
                                 </span>
                               ) : null}
                             </div>
                            <div className="mt-1">
                              {hasPhone ? <span className="text-xs text-slate-500">{client.telefone}</span> : <span className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sem telefone</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-bold">
                          {status === 'sending' && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Enviando...</span>}
                          {status === 'success' && <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Enviado</span>}
                          {status === 'error' && <span className="text-rose-600 bg-rose-100 px-2 py-1 rounded">❌ Erro</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="shrink-0 pt-4 border-t flex justify-end gap-3">
              {confSendingStatus === 'sending' && (
                <button
                  onClick={handleStopConfSend}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  <Pause className="w-4 h-4" /> Cancelar Envios
                </button>
              )}
              <button
                disabled={confSendingStatus === 'sending' || confSelectedIds.length === 0}
                onClick={handleSendConfirmations}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {confSendingStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                {confSendingStatus === 'sending' ? `Enviando...` : `Disparar para ${confSelectedIds.length} clientes`}
              </button>
            </div>
          </div>
        )}

        {/* BLOQUEIO TAB */}
        {activeMainTab === 'bloqueio' && (
          <div className="flex flex-col h-full space-y-4">
            
            {/* Top Control Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              
              {/* Mode Pills (Véspera vs Dia) */}
              <div className="flex flex-col space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Envio (Bloqueio)</label>
                <div className="flex gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleChangeBloqueioMode('vespera')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      bloqueioMode === 'vespera'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Dia Anterior (Véspera)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeBloqueioMode('dia')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      bloqueioMode === 'dia'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Dia do Agendamento</span>
                  </button>
                </div>
              </div>

              {/* Date Filter */}
              <div className="w-44">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data dos Agendamentos</label>
                <input 
                  type="date" 
                  value={bloqueioDate} 
                  onChange={e => setBloqueioDate(e.target.value)}
                  className="w-full text-sm py-1.5 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                />
              </div>

              {/* Search Bar */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pesquisar</label>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome do cliente ou embarcação..."
                    value={bloqueioSearch}
                    onChange={(e) => setBloqueioSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Edit Templates & Variation Toggle Buttons */}
              <div className="self-end mb-[2px] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseBloqueioVariations(prev => !prev)}
                  title="Quando ativo, o sistema alterna automaticamente entre 10 variações amigáveis do texto a cada envio para evitar detecção por robôs"
                  className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors h-[38px] cursor-pointer ${
                    useBloqueioVariations
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${useBloqueioVariations ? 'text-emerald-600' : 'text-slate-400'}`} /> 
                  <span>{useBloqueioVariations ? 'Rodízio Antirrobô: Ativo (10 Variações)' : 'Rodízio Antirrobô: Desativado'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBloqueioTemplatesEditor(prev => !prev)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors h-[38px] cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> 
                  {showBloqueioTemplatesEditor ? 'Ocultar Modelos' : 'Editar Modelos'}
                </button>
              </div>
            </div>

            {/* Template Editors */}
            {showBloqueioTemplatesEditor && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Modelo Véspera (Dia Anterior ao Agendamento)</span>
                  </label>
                  <textarea
                    value={bloqueioTemplateVespera}
                    onChange={e => handleSaveBloqueioTemplateVespera(e.target.value)}
                    rows={6}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none font-sans"
                    placeholder="Oi, {nome}! 😊 Tudo bem?..."
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Modelo Dia do Agendamento (Mesmo Dia)</span>
                  </label>
                  <textarea
                    value={bloqueioTemplateDia}
                    onChange={e => handleSaveBloqueioTemplateDia(e.target.value)}
                    rows={6}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none resize-none font-sans"
                    placeholder="Oi, {nome}! 😊..."
                  />
                </div>
                
                <div className="md:col-span-2 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">Variáveis disponíveis:</span>
                  <span><code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">[nome]</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">{'{nome}'}</code> (Primeiro nome)</span>
                  <span><code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">[data]</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">{'{data}'}</code> (Data da reserva formatada)</span>
                  <span><code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">{'{barco}'}</code> (Código da embarcação)</span>
                  <span className="w-full pt-1 border-t border-slate-100 text-amber-700 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span><b>Rodízio Antirrobô Ativo:</b> O disparo alterna automaticamente entre 10 variações amigáveis e naturais da mensagem a cada cliente para evitar repetição do mesmo texto.</span>
                  </span>
                </div>
              </div>
            )}

            {/* Filter Pills & Select All Bar */}
            <div className="flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setBloqueioFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${bloqueioFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
                  <button onClick={() => setBloqueioFilter('with_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${bloqueioFilter === 'with_contact' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Com Telefone</button>
                  <button onClick={() => setBloqueioFilter('without_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${bloqueioFilter === 'without_contact' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Sem Telefone</button>
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {bloqueioReservations.length} cliente(s) inadimplente(s) em {bloqueioDate.split('-').reverse().join('/')}
                </span>
              </div>

              <button 
                type="button"
                onClick={handleBloqueioToggleSelectAll}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Selecionar Todos Filtrados
              </button>
            </div>

            {/* Client Cards List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-t border-slate-100 pt-4 subtle-scrollbar">
              {filteredBloqueioRes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                  <UserCheck className="w-8 h-8 text-emerald-500" />
                  <span className="font-semibold text-slate-600">Nenhum cliente inadimplente agendado para esta data!</span>
                  <span className="text-xs text-slate-400">Todos os clientes agendados para este dia estão com a situação regular.</span>
                </div>
              ) : (
                filteredBloqueioRes.map(res => {
                  const client = clientDB.getById(res.clienteId);
                  const boat = boatDB.getById(res.embarcacaoId);
                  const hasPhone = !!client?.telefone;
                  const isSelected = bloqueioSelectedIds.includes(res.id);
                  const status = bloqueioSendResults[res.id] || 'pending';
                  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';

                  return (
                    <div 
                      key={res.id} 
                      className={`flex flex-col p-3.5 rounded-xl border transition-all ${
                        isSelected ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/50' : 'bg-slate-50 border-slate-200'
                      } ${!hasPhone ? 'opacity-60 bg-slate-100 grayscale' : 'cursor-pointer hover:border-amber-400'}`} 
                      onClick={() => hasPhone && bloqueioSendingStatus !== 'sending' && handleBloqueioToggleSelect(res.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            disabled={!hasPhone || bloqueioSendingStatus === 'sending'} 
                            className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                              isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">{boatCode}</span>
                              <span className="font-bold text-sm text-slate-900">{client?.nome || 'Desconhecido'}</span>
                              
                              {client?.statusFinanceiro === 'inadimplente' ? (
                                <span className="font-extrabold text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider border border-rose-200" title="Cliente marcado como Inadimplente">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Inadimplente
                                </span>
                              ) : (client?.temValoresEmAberto || client?.statusFinanceiro === 'pendente') ? (
                                <span className="font-extrabold text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider border border-amber-200" title="Possui valores em aberto no cadastro">
                                  <Wallet className="w-3 h-3 text-amber-600" /> Valores Em Aberto
                                </span>
                              ) : client?.temLancamentos ? (
                                <span className="font-extrabold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider border border-blue-200" title="Possui lançamentos no sistema">
                                  <Wallet className="w-3 h-3 text-blue-600" /> Com Lançamentos
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 flex items-center gap-3">
                              {hasPhone ? (
                                <span className="text-xs text-slate-500 font-medium">{client.telefone}</span>
                              ) : (
                                <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3"/> Sem telefone cadastrado
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">Reserva: {res.data.split('-').reverse().join('/')} ({res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde'})</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-bold">
                          {status === 'sending' && <span className="text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"><RefreshCw className="w-3.5 h-3.5 animate-spin"/> Enviando...</span>}
                          {status === 'success' && <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">✅ Enviado</span>}
                          {status === 'error' && <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">❌ Erro</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Dispatch Button */}
            <div className="shrink-0 pt-4 border-t border-slate-200 flex justify-end gap-3">
              {bloqueioSendingStatus === 'sending' && (
                <button
                  type="button"
                  onClick={handleStopBloqueioSend}
                  className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-6 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                >
                  <Pause className="w-4 h-4" /> Cancelar Envios
                </button>
              )}
              <button
                type="button"
                disabled={bloqueioSendingStatus === 'sending' || bloqueioSelectedIds.length === 0}
                onClick={handleSendBloqueio}
                className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-6 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md cursor-pointer"
              >
                {bloqueioSendingStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                {bloqueioSendingStatus === 'sending' ? `Enviando avisos...` : `Disparar para ${bloqueioSelectedIds.length} clientes`}
              </button>
            </div>
          </div>
        )}

        {/* CALENDARS TAB */}
        {activeMainTab === 'calendars' && (
          <div className="flex flex-col h-full space-y-4">
             <div className="flex gap-4 items-center mb-2 shrink-0">
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mês de Referência</label>
                <input 
                  type="month" 
                  value={calMonth} 
                  onChange={e => setCalMonth(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Buscar Embarcação</label>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleCalToggleSelectAll}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-end mb-3"
              >
                 <Check className="w-4 h-4" /> Selecionar Todos
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
               <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem de Legenda do Calendário</label>
               <textarea
                 value={calMessageTemplate}
                 onChange={e => handleSaveCalTemplate(e.target.value)}
                 rows={3}
                 className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                 placeholder="Digite a mensagem padrão que será enviada junto com a foto do calendário..."
               />
               <p className="text-[10px] text-slate-500 mt-1">
                 Variáveis disponíveis: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Nome da embarcação), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{grupo}'}</code> (Nome do grupo), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{mes}'}</code> (Mês por extenso, ex: Julho de 2026), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{ano}'}</code> (Ano, ex: 2026).
               </p>
            </div>

            {calBoats.length === 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Nenhuma embarcação possui <b>ID do Grupo do WhatsApp</b> configurado. Vá no Cadastro de Embarcações e informe o ID Evolution do grupo para utilizar essa função.</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-t pt-4">
               {filteredCalBoats.map(boat => {
                  const isSelected = calSelectedIds.includes(boat.id);
                  const status = calSendResults[boat.id] || 'pending';
                  const boatCode = boat.numero ? `M${boat.numero}` : 'MXX';
                  
                  return (
                    <div key={boat.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'bg-emerald-50/30 border-emerald-300' : 'bg-slate-50 border-slate-200'} cursor-pointer hover:border-emerald-400`} onClick={() => calSendingStatus !== 'sending' && setCalSelectedIds(prev => prev.includes(boat.id) ? prev.filter(i => i !== boat.id) : [...prev, boat.id])}>
                       <div className="flex items-center gap-3">
                          <button disabled={calSendingStatus === 'sending'} className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                               <Ship className="w-4 h-4 text-slate-400"/>
                               <span className="font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{boatCode}</span>
                               <span className="font-bold text-sm text-slate-800">{boat.nome}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                               ID: {boat.whatsappGroupId}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-bold">
                          {status === 'sending' && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Renderizando/Enviando...</span>}
                          {status === 'success' && <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Enviado</span>}
                          {status === 'error' && <span className="text-rose-600 bg-rose-100 px-2 py-1 rounded">❌ Erro</span>}
                        </div>
                    </div>
                  );
               })}
            </div>

            <div className="shrink-0 pt-4 border-t flex justify-between items-center">
              <div className="text-xs text-slate-500 font-medium">
                {calSendingStatus === 'sending' && (
                  <span className="flex items-center gap-1 animate-pulse">
                     <Clock className="w-3.5 h-3.5" /> 
                     Processando {currentBoatIdx + 1} de {calSelectedIds.length}... Aguarde (Isso pode demorar um pouco).
                  </span>
                )}
              </div>
              <button
                disabled={calSendingStatus === 'sending' || calSelectedIds.length === 0}
                onClick={handleStartCalSend}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {calSendingStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <CalendarDays className="w-4 h-4"/>}
                {calSendingStatus === 'sending' ? `Enviando...` : `Disparar Calendário p/ ${calSelectedIds.length} grupos`}
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM MESSAGES TAB */}
        {activeMainTab === 'custom' && (
          <div className="flex flex-col h-full space-y-4 overflow-hidden">
            {/* Top Bar / Target Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
              
              {/* LEFT COLUMN: Recipient Selector */}
              <div className="lg:col-span-5 flex flex-col h-full border border-slate-200 rounded-2xl p-4 bg-slate-50/50 overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" /> Destinatários
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    {customTargetType === 'clients' ? `${customSelectedClientIds.length} selecionados` :
                     customTargetType === 'groups' ? `${customSelectedGroupIds.length} grupos selecionados` :
                     'Inserção manual'}
                  </span>
                </div>

                {/* Target Type Switcher */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl mb-3 shrink-0">
                  <button
                    onClick={() => setCustomTargetType('clients')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      customTargetType === 'clients' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Clientes
                  </button>
                  <button
                    onClick={() => setCustomTargetType('groups')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      customTargetType === 'groups' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Grupos
                  </button>
                  <button
                    onClick={() => setCustomTargetType('custom_number')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      customTargetType === 'custom_number' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nº Avulso
                  </button>
                </div>

                {/* CLIENTS RECIPIENT MODE */}
                {customTargetType === 'clients' && (
                  <div className="flex flex-col flex-1 h-0 overflow-hidden space-y-3">
                    <div className="flex gap-2 shrink-0">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar cliente por nome ou telefone..."
                          value={customSearch}
                          onChange={e => setCustomSearch(e.target.value)}
                          className="w-full text-xs py-2 pl-9 pr-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <select
                        value={customClientFilterBoatId}
                        onChange={e => setCustomClientFilterBoatId(e.target.value)}
                        className="text-xs py-2 px-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none max-w-[130px]"
                      >
                        <option value="all">Todas as Lanchas</option>
                        {boats.map(b => (
                          <option key={b.id} value={b.id}>{b.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-between items-center px-1 shrink-0">
                      <button
                        onClick={handleToggleSelectAllClients}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        {filteredCustomClients.length > 0 && filteredCustomClients.every(c => customSelectedClientIds.includes(c.id))
                          ? 'Desmarcar Todos'
                          : 'Selecionar Todos'}
                      </button>
                      <span className="text-[11px] text-slate-400">{filteredCustomClients.length} disponíveis</span>
                    </div>

                    <div className="flex-1 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                      {filteredCustomClients.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">Nenhum cliente com WhatsApp encontrado neste filtro.</div>
                      ) : (
                        filteredCustomClients.map(client => {
                          const isSelected = customSelectedClientIds.includes(client.id);
                          return (
                            <div
                              key={client.id}
                              onClick={() => handleToggleSelectClient(client.id)}
                              className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
                                isSelected ? 'bg-emerald-50/70' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">{client.nome}</p>
                                  <p className="text-[11px] text-slate-500">{client.telefone}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* GROUPS RECIPIENT MODE */}
                {customTargetType === 'groups' && (
                  <div className="flex flex-col flex-1 h-0 overflow-hidden space-y-3">
                    <div className="relative shrink-0">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar grupo..."
                        value={customSearch}
                        onChange={e => setCustomSearch(e.target.value)}
                        className="w-full text-xs py-2 pl-9 pr-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-between items-center px-1 shrink-0">
                      <button
                        onClick={handleToggleSelectAllGroups}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        {filteredCustomGroups.length > 0 && filteredCustomGroups.every(g => customSelectedGroupIds.includes(g.id))
                          ? 'Desmarcar Todos'
                          : 'Selecionar Todos'}
                      </button>
                      <span className="text-[11px] text-slate-400">{filteredCustomGroups.length} grupos</span>
                    </div>

                    <div className="flex-1 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                      {filteredCustomGroups.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">Nenhum grupo encontrado. Certifique-se de sincronizar grupos na aba Configurações.</div>
                      ) : (
                        filteredCustomGroups.map(group => {
                          const isSelected = customSelectedGroupIds.includes(group.id);
                          return (
                            <div
                              key={group.id}
                              onClick={() => handleToggleSelectGroup(group.id)}
                              className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
                                isSelected ? 'bg-emerald-50/70' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">{group.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{group.id}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* MANUAL NUMBER RECIPIENT MODE */}
                {customTargetType === 'custom_number' && (
                  <div className="flex flex-col flex-1 h-0 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Digite ou cole os números (um por linha ou separados por vírgula):</label>
                    <textarea
                      value={customManualNumbers}
                      onChange={e => setCustomManualNumbers(e.target.value)}
                      placeholder="Ex:&#10;5541999999999&#10;5541888888888"
                      className="flex-1 w-full p-3 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono resize-none"
                    />
                    <p className="text-[11px] text-slate-400">Insira com DDD. Exemplo: 41999998888 ou 5541999998888.</p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Message Composer & Send Controls */}
              <div className="lg:col-span-7 flex flex-col h-full border border-slate-200 rounded-2xl p-4 bg-white overflow-hidden space-y-3">
                
                {/* Templates & Variables Header */}
                <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Modelos:</span>
                    <select
                      onChange={e => {
                        const t = customTemplates.find(tmpl => tmpl.id === e.target.value);
                        if (t) setCustomText(t.text);
                      }}
                      defaultValue=""
                      className="text-xs py-1.5 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none max-w-[200px]"
                    >
                      <option value="" disabled>Carregar modelo salvo...</option>
                      {customTemplates.map(tmpl => (
                        <option key={tmpl.id} value={tmpl.id}>{tmpl.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowSaveTemplateModal(true)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl font-semibold transition-colors"
                      title="Salvar mensagem atual como modelo"
                    >
                      + Salvar Modelo
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-400">Variáveis:</span>
                    <button
                      onClick={() => handleInsertVariable(' {cliente}')}
                      className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-mono px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                    >
                      {`{cliente}`}
                    </button>
                    <button
                      onClick={() => handleInsertVariable(' {primeiro_nome}')}
                      className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-mono px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                    >
                      {`{primeiro_nome}`}
                    </button>
                    <button
                      onClick={() => handleInsertVariable(' {barco}')}
                      className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-mono px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                    >
                      {`{barco}`}
                    </button>
                  </div>
                </div>

                {/* Message Text Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  <textarea
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="Digite a mensagem personalizada aqui... Ex: Olá *{primeiro_nome}*, seu agendamento na *{barco}* está confirmado!"
                    className="w-full flex-1 p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans leading-relaxed"
                  />
                </div>

                {/* Media Attachment section */}
                <div className="shrink-0 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {customMedia ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {customMedia.mimetype.includes('image') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="truncate max-w-[250px]">
                        <p className="text-xs font-semibold text-slate-900 truncate">{customMedia.fileName}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Anexo pronto</p>
                      </div>
                      <button
                        onClick={handleClearCustomMedia}
                        className="text-rose-600 hover:text-rose-700 text-xs ml-2 p-1 font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      <span>Anexar Imagem ou Documento (PDF/PNG/JPG)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCustomMediaUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Intervalo:</span>
                    <select
                      value={customDelaySeconds}
                      onChange={e => setCustomDelaySeconds(Number(e.target.value))}
                      className="text-xs py-1 px-2 border border-slate-300 rounded-lg bg-white outline-none"
                    >
                      <option value={2}>2 seg</option>
                      <option value={3}>3 seg</option>
                      <option value={5}>5 seg</option>
                      <option value={8}>8 seg</option>
                    </select>
                  </div>
                </div>

                {/* Submit / Trigger Button */}
                <div className="shrink-0 pt-2 border-t border-slate-100 flex justify-end items-center gap-3">
                  {customSendingStatus === 'sending' ? (
                    <button
                      onClick={handleStopCustomSend}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Pause className="w-4 h-4" /> Cancelar Envios
                    </button>
                  ) : (
                    <button
                      onClick={handlePrepareCustomSend}
                      disabled={
                        customTargetType === 'clients' && customSelectedClientIds.length === 0 ||
                        customTargetType === 'groups' && customSelectedGroupIds.length === 0 ||
                        customTargetType === 'custom_number' && !customManualNumbers.trim()
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      Disparar Mensagem Avulsa
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* SENDING EXECUTION MODAL / PANEL */}
            {customSendingStatus !== 'idle' && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Send className="w-5 h-5 text-emerald-600" />
                      {customSendingStatus === 'sending' ? 'Disparando Mensagens...' : 'Disparo Concluído'}
                    </h3>
                    {customSendingStatus === 'completed' && (
                      <button
                        onClick={() => setCustomSendingStatus('idle')}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Progresso dos envios</span>
                      <span className="text-emerald-700 font-bold">
                        {customSendQueue.filter(q => q.status === 'success' || q.status === 'error').length} / {customSendQueue.length}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(customSendQueue.filter(q => q.status === 'success' || q.status === 'error').length / (customSendQueue.length || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Log List */}
                  <div className="max-h-60 overflow-y-auto subtle-scrollbar border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                    {customSendQueue.map(item => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 truncate max-w-[240px]">{item.name}</span>
                        <div>
                          {item.status === 'pending' && <span className="text-slate-400 font-medium">Aguardando</span>}
                          {item.status === 'sending' && <span className="text-blue-600 font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Enviando</span>}
                          {item.status === 'success' && <span className="text-emerald-600 font-bold">✅ Enviado</span>}
                          {item.status === 'error' && <span className="text-rose-600 font-bold" title={item.error}>❌ Falha</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    {customSendingStatus === 'sending' ? (
                      <button
                        onClick={handleStopCustomSend}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Pausar / Interromper
                      </button>
                    ) : (
                      <button
                        onClick={() => setCustomSendingStatus('idle')}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SAVE TEMPLATE MODAL */}
            {showSaveTemplateModal && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Salvar como Modelo</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Modelo</label>
                    <input
                      type="text"
                      placeholder="Ex: Comunicado de Manutenção"
                      value={newTemplateTitle}
                      onChange={e => setNewTemplateTitle(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowSaveTemplateModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveCustomTemplate}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
                    >
                      Salvar Modelo
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      
        {/* CONFIG TAB */}
        {activeMainTab === 'extratos' && (
          <div className="h-full flex flex-col pt-2 pb-6 px-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!extratoSelectedClientId ? (
              // TELA 1: BUSCA DE CLIENTE
              <div className="flex-1 flex flex-col">
                <div className="text-center space-y-3 mb-8 pt-8">
                  <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Extratos Financeiros</h2>
                  <p className="text-slate-500 font-medium max-w-md mx-auto">Busque um cliente inadimplente para gerar extrato de débitos em imagem PNG ou em texto formatado para o WhatsApp.</p>
                </div>

                <div className="max-w-2xl mx-auto w-full">
                  <div className="relative mb-6 shadow-sm">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Digite o nome do cliente..."
                      value={extratoSearchQuery}
                      onChange={(e) => setExtratoSearchQuery(e.target.value)}
                      className="w-full text-base pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                      autoFocus
                    />
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100 max-h-[400px] overflow-y-auto subtle-scrollbar">
                    {clientDB.getAll()
                      .filter(c =>
                        (!extratoSearchQuery ? transacoes.some(t => t.clienteId === c.id && t.status !== 'pago' && t.status !== 'cancelado') : true) &&
                        (c.nome.toLowerCase().includes(extratoSearchQuery.toLowerCase()) ||
                        (c.telefone && c.telefone.includes(extratoSearchQuery)))
                      )
                      .slice(0, extratoSearchQuery ? 50 : 20)
                      .map(client => {
                        const unpaid = transacoes.filter(t => t.clienteId === client.id && t.status !== 'pago' && t.status !== 'cancelado');
                        if (!extratoSearchQuery && unpaid.length === 0) return null;

                        const totalDebt = unpaid.reduce((acc, t) => {
                          const { total } = calculateTransactionInterest(t);
                          return acc + total;
                        }, 0);

                        return (
                          <div
                            key={client.id}
                            onClick={() => {
                              setExtratoSelectedClientId(client.id);
                              setExtratoPreviewImage(null); // Reset preview
                            }}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50/50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold font-mono">
                                {client.nome.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{client.nome}</h3>
                                <p className="text-xs text-slate-500">{client.telefone || 'Sem contato'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {unpaid.length > 0 ? (
                                <>
                                  <p className="font-black text-rose-600 font-mono">R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  <p className="text-[11px] font-bold text-rose-500 mt-0.5">{unpaid.length} em aberto</p>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                  <CheckCircle className="w-3.5 h-3.5"/> Sem Pendências
                                </span>
                              )}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // TELA 2: EXECUTAR AÇÕES (CLIENTE SELECIONADO)
              <div className="flex flex-col h-full bg-slate-50 p-6 rounded-2xl border border-slate-200">

                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
                  <button
                    onClick={() => {
                      setExtratoSelectedClientId(null);
                      setExtratoPreviewImage(null);
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <h3 className="font-black text-xl text-slate-900">
                    Ações de Extrato - {clientDB.getById(extratoSelectedClientId)?.nome.split(' ')[0]}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-1 items-start">

                  {/* ESQUERDA: Botões de Ação */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6">O que deseja fazer?</h4>

                    <button
                      disabled={extratoGenerating}
                      onClick={() => handleGenerateExtratoPreview(extratoSelectedClientId)}
                      className="w-full relative flex items-center gap-4 bg-white hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 p-4 rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50 group"
                    >
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        {extratoGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-800">Visualizar Imagem (PNG)</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Pré-visualizar o extrato visual na tela.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCopyExtratoImage(extratoSelectedClientId)}
                      disabled={extratoGenerating}
                      className="w-full flex items-center gap-4 bg-white hover:bg-amber-50 border-2 border-transparent hover:border-amber-200 p-4 rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50 group"
                    >
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                         {extratoGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Clipboard className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 group-hover:text-amber-800">Copiar Imagem</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Copia a imagem PNG diretamente para a nuvem/área de transferência.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCopyExtratoText(extratoSelectedClientId)}
                      className="w-full flex items-center gap-4 bg-white hover:bg-slate-100 border-2 border-transparent hover:border-slate-300 p-4 rounded-xl shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 group-hover:text-slate-800">Copiar Texto</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Cópia do relatório formatado para colar direto no WhatsApp.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSendWAExtrato(extratoSelectedClientId)}
                      className="w-full flex items-center gap-4 bg-white hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-200 p-4 rounded-xl shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-800">Enviar Textão (WhatsApp)</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Abre o WhatsApp Web direto com o celular do cliente.</p>
                      </div>
                    </button>

                  </div>

                  {/* DIREITA: PREVIEW DA IMAGEM E DOWNLOAD */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    {extratoGenerating ? (
                       <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                         <div className="w-14 h-14 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin"></div>
                         <p className="text-sm font-bold text-slate-500">Renderizando Extrato...</p>
                       </div>
                    ) : extratoPreviewImage ? (
                      <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <img
                          src={extratoPreviewImage}
                          alt="Prévia do Extrato"
                          className="w-full max-w-[280px] h-auto border border-slate-200 shadow-md rounded border-b-2"
                        />
                        <button
                          onClick={() => handleDownloadExtratoNew(extratoSelectedClientId, clientDB.getById(extratoSelectedClientId)?.nome || 'Cliente')}
                          className="mt-6 font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full max-w-[280px] py-3 rounded-xl transition-colors shadow-blue-500/30 shadow-lg"
                        >
                          <Download className="w-5 h-5" /> Baixar Arquivo PNG
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center opacity-60">
                         <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
                         <p className="font-bold text-slate-400">Nenhuma prévia carregada</p>
                         <p className="text-xs font-medium text-slate-400 mt-1 max-w-[220px]">
                            Clique no botão de "Visualizar Imagem" para renderizar o Extrato.
                         </p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {activeMainTab === 'config' && (
          <div className="flex flex-col h-full overflow-y-auto subtle-scrollbar -mx-6">
            <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4">
              <button
                onClick={() => setActiveTab('conta')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'conta' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Status da Conta
              </button>
              <button
                onClick={() => setActiveTab('grupos')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'grupos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Sincronizar Grupos
              </button>
              <button
                onClick={() => setActiveTab('contatos')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'contatos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Sincronizar Contatos
              </button>
            </div>

            {/* TAB CONTENT: CONTA / QR CODE */}
            {activeTab === 'conta' && (
              <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center">
                {isFetchingWaStatus ? (
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                ) : waStatus === 'open' ? (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">WhatsApp Conectado</h4>
                      <p className="text-sm text-slate-500">A API Evolution está pronta para enviar e receber mensagens.</p>
                    </div>
                    <button onClick={handleWaLogout} className="mt-4 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto transition-colors">
                      <LogOut className="w-4 h-4" /> Desconectar
                    </button>
                  </div>
                ) : waQrCode ? (
                  <div className="text-center space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Conectar WhatsApp</h4>
                      <p className="text-sm text-slate-500">Abra o WhatsApp no celular, vá em Aparelhos Conectados e escaneie o código abaixo:</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 inline-block">
                      <img src={waQrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                    </div>
                    <button onClick={fetchWaStatus} className="text-xs text-slate-500 hover:text-slate-800 underline">Atualizar Status</button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Serviço Indisponível ou Desconectado</p>
                    <button onClick={fetchWaQrCode} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto">
                      <QrCode className="w-4 h-4" /> Gerar Novo QR Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: GRUPOS */}
            {activeTab === 'grupos' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Associe as embarcações aos grupos do WhatsApp encontrados na Evolution API para disparo de calendários.</p>
                  <button onClick={handleFetchGroups} disabled={isFetchingGroups} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} /> Puxar Grupos do WhatsApp
                  </button>
                </div>

                {availableGroups.length > 0 ? (
                  <div className="space-y-3">
                    {boats.map(boat => (
                      <div key={boat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="mb-2 sm:mb-0">
                          <p className="text-sm font-semibold text-slate-800">{boat.nome}</p>
                          <p className="text-xs text-slate-500">Lancha/Jet: {boat.numero}</p>
                        </div>
                        <div className="w-full sm:w-1/2">
                          <select
                            value={mappingState[boat.id] || ''}
                            onChange={(e) => handleMappingChange(boat.id, e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          >
                            <option value="">-- Sem Grupo Associado --</option>
                            {availableGroups.map((g, idx) => (
                              <option key={g.id ? `grp-${g.id}-${idx}` : `grp-${idx}`} value={g.id}>{g.subject || g.name || g.id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-end">
                      <button onClick={handleSaveGroupMapping} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                        Salvar Associações de Grupos
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum grupo carregado. Clique em "Puxar Grupos do WhatsApp".
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CONTATOS */}
            {activeTab === 'contatos' && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setActiveContactsTab('sem_telefone')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'sem_telefone' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Sem WhatsApp</button>
                    <button onClick={() => setActiveContactsTab('vinculados')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'vinculados' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Mapeados</button>
                    <button onClick={() => setActiveContactsTab('todos')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'todos' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Todos</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <button onClick={fetchWhatsAppContactsList} disabled={isFetchingContacts} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingContacts ? 'animate-spin' : ''}`} /> Puxar
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {(() => {
                    const filteredClients = clients.filter(c => {
                      if (clientSearch && !c.nome.toLowerCase().includes(clientSearch.toLowerCase())) return false;
                      if (activeContactsTab === 'sem_telefone') return !c.telefone;
                      if (activeContactsTab === 'vinculados') return !!c.telefone;
                      return true;
                    });

                    if (filteredClients.length === 0) return <div className="p-8 text-center text-slate-400 text-xs">Nenhum cliente encontrado neste filtro.</div>;

                    return filteredClients.map((client) => {
                      return (
                        <div key={client.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-1 max-w-md">
                            <span className="font-semibold text-slate-900 text-xs">{client.nome}</span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:justify-end flex-1">
                            {client.telefone ? (
                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5" /> {formatPhoneNumber(client.telefone)}
                                </div>
                                <button onClick={() => handleUnlinkPhone(client.id)} className="text-[11px] text-rose-600 font-medium">Remover</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                                {activeManualSyncClientId === client.id ? (
                                  <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Buscar contato puxado..."
                                      value={contactQuery}
                                      onChange={(e) => setContactQuery(e.target.value)}
                                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                                      autoFocus
                                    />
                                    <button onClick={() => { setActiveManualSyncClientId(null); setContactQuery(''); }} className="text-[10px] text-slate-400 px-1 py-1">Cancelar</button>
                                    {contactQuery.trim().length > 0 && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-40 divide-y divide-slate-100 subtle-scrollbar">
                                        {whatsAppContacts.filter(c => (c.pushName && c.pushName.toLowerCase().includes(contactQuery.toLowerCase())) || c.remoteJid.includes(contactQuery)).slice(0, 10).map(contact => (
                                          <button
                                            key={contact.id}
                                            onClick={() => { handleLinkPhone(client.id, contact.remoteJid.split('@')[0]); setActiveManualSyncClientId(null); setContactQuery(''); }}
                                            className="w-full text-left p-2 hover:bg-slate-50 text-[11px] transition-colors flex flex-col"
                                          >
                                            <span className="font-semibold text-slate-950">{contact.pushName || 'Sem Nome'}</span>
                                            <span className="text-[9px] text-slate-400 font-mono">{formatPhoneNumber(contact.remoteJid)}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button onClick={() => { setActiveManualSyncClientId(client.id); setContactQuery(''); }} className="text-[11px] text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5" /> Vincular Manualmente
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}


      {/* Hidden processing block for Calendars */}
      {activeMainTab === 'calendars' && calSendingStatus === 'sending' && activeProcessingBoatId && (
         <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
           <MonthlyCalendarGenerator 
             initialBoatId={activeProcessingBoatId}
             initialDate={`${calMonth}-01`}
             autoExport={true}
             onExport={(base64) => {
                handleCalendarExported(base64);
             }}
           />
         </div>
      )}

      {/* Hidden processing block for Bloqueio Debit Invoices */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.map(res => {
            const client = clientDB.getById(res.clienteId);
          if (!client) return null;

          const clientUnpaid = transacoes.filter(t => t.clienteId === client.id && t.status !== 'pago' && t.status !== 'cancelado');
          const totalGeral = clientUnpaid.reduce((acc, t) => {
            const { total } = calculateTransactionInterest(t);
            return acc + total;
          }, 0);

          return (
            <div 
              key={`bloqueio-invoice-${client.id}`} 
              id={`bloqueio-invoice-capture-${client.id}`} 
              className="bg-white p-10 w-[800px] text-slate-800 font-sans shadow-none rounded-none border-none"
            >
              <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Extrato de Débitos em Aberto</h1>
                  <p className="text-slate-500 mt-1 font-semibold text-sm">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900">{client.nome}</h2>
                <p className="text-slate-600 text-sm mt-1 font-medium">Telefone: {client.telefone || 'Não informado'}</p>
                {client.email && <p className="text-slate-600 text-sm mt-0.5 font-medium">E-mail: {client.email}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                  ⚠️ Status de Cobrança: INADIMPLENTE
                </div>
              </div>

              {clientUnpaid.length > 0 ? (
                <table className="w-full text-left mb-8 border-collapse">
                  <thead className="bg-slate-100 border-y-2 border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider">Categoria / Descrição</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider">Vencimento</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-right">Valor Orig.</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-right">Juros/Atraso</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {clientUnpaid.map(t => {
                      const { interest, total } = calculateTransactionInterest(t);
                      const catName = t.categoria ? t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç') : 'Lançamento';
                      return (
                        <tr key={t.id}>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {catName}
                            {t.descricao && <p className="text-xs text-slate-500 font-normal mt-0.5">{t.descricao}</p>}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 text-right font-mono">
                            R$ {Number(t.valor).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-rose-600 font-bold text-right font-mono">
                            {interest > 0 ? `+ R$ ${interest.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-900 text-right font-mono">
                            R$ {total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border text-center text-slate-500 text-sm font-medium mb-8">
                  Pendência financeira ativa no cadastro. Entre em contato para maiores informações.
                </div>
              )}

              <div className="border-t-2 border-slate-900 pt-6 flex justify-between items-center">
                <div className="text-xs text-slate-400 font-medium">
                  Mexicano Gestão Náutica • Central de Atendimento
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Geral Pendente</p>
                  <p className="text-4xl font-black text-rose-600 tracking-tight font-mono">
                    R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
          })}
        </div>

    </div>
  );
}
