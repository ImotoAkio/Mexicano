import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Clock, Send, CheckCircle2, AlertCircle, RefreshCw,
  Plus, X, DollarSign, ShieldCheck, Check,
  FileText, ShieldAlert,
  UserCheck, CheckSquare, Square, RotateCcw, Smartphone,
  ExternalLink, Search, Copy, Zap, Info, Eye, Link2
} from 'lucide-react';
import { getAuthHeaders } from '../utils/apiAuth';

export const DEFAULT_10_CONFIRMATION_TITLES = [
  "1º Envio: Boas-vindas matinais e acolhimento",
  "2º Envio: Lembrete amigável e agilidade",
  "3º Envio: Organização do pátio e prioridade na descida",
  "4º Envio: Normas da Marinha e dados obrigatórios",
  "5º Envio: Apoio aos marinheiros e pontualidade",
  "6º Envio: Alinhamento operacional + Dica de cancelamento",
  "7º Envio: Movimentação no píer + Opção de liberar vaga",
  "8º Envio: Urgência moderada + Cancelamento no portal",
  "9º Envio: Penúltimo aviso + Cancelamento para liberação",
  "10º Envio: Última chamada antes do cancelamento automático"
];

export const DEFAULT_10_DEBT_CONFIRMATION_TITLES = [
  "1º Envio (Débito): Aviso cordial de pendência + Quitação PIX no link",
  "2º Envio (Débito): Lembrete de liberação financeira para descida",
  "3º Envio (Débito): Organização do pátio + Desbloqueio imediato via PIX",
  "4º Envio (Débito): Normas operacionais + Regularização em 1 minuto",
  "5º Envio (Débito): Alinhamento de marinharia + Quitação expressa",
  "6º Envio (Débito): Pendência ativa + Opção de pagar ou cancelar saída",
  "7º Envio (Débito): Movimentação intensa no píer + Regularização necessária",
  "8º Envio (Débito): Urgência moderada + Quitação PIX ou cancelamento",
  "9º Envio (Débito): Penúltimo aviso antes de suspender a descida",
  "10º Envio (Débito): Última chamada para regularização e confirmação hoje"
];

export const DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT = [
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nSua embarcação *{barco}* está agendada para *{quando}*! 🚤\n\nNossa equipe de marinharia já está preparando tudo. Para adiantarmos a descida {do_seu_barco} e seu plano de navegação, por favor confirme sua saída pelo link direto no app:\n\n👉 {link}\n\nTenha um excelente passeio!",
  "Olá, *{cliente}*! Passando para checar os detalhes do seu passeio de *{quando}* com {seu_barco} *{barco}*. ⚓\n\nVocê consegue nos confirmar rapidinho? Leva menos de 1 minuto pelo seu link de acesso rápido:\n\n👉 {link}\n\nAssim garantimos {seu_barco} pronta e revisada para a sua chegada!",
  "Oi, *{cliente}*! 🚤 A equipe do pátio está organizando a fila de descida das embarcações desta manhã. Para mantermos a prioridade {do_seu_barco} *{barco}*, confirme seus horários de saída pelo link:\n\n👉 {link}\n\nEstamos aguardando sua resposta para colocar {seu_barco} na água a tempo!",
  "Olá, *{cliente}*! ⚠️ Lembrando que a Capitania dos Portos exige o Plano de Navegação prévio (destino e quantidade de passageiros a bordo). Agilize sua liberação no píer confirmando os dados {do_seu_barco} pelo app:\n\n👉 {link}\n\nSua segurança e conforto são nossas prioridades!",
  "Oi, *{cliente}*! Tudo certo para navegar *{quando}* com {seu_barco} *{barco}*? 🌊\n\nPara que nossa equipe organize os marinheiros de apoio e você não pegue fila no píer, confirme sua saída agora pelo link:\n\n👉 {link}\n\nQualquer dúvida, estamos à disposição aqui no WhatsApp!",
  "Olá, *{cliente}*! Ainda não identificamos sua confirmação para o agendamento de *{quando}* em {seu_barco} *{barco}*.\n\nPara validar sua presença, acesse o link rápido:\n👉 {link}\n\n💡 *Dica de cancelamento:* Se teve algum imprevisto e não for mais utilizar hoje, você pode cancelar a reserva direto pelo portal no link acima para liberar a marinharia.",
  "Oi, *{cliente}*! ⚓ Como as movimentações no píer e nos tratores de descida estão intensas, precisamos da sua confirmação para manter {seu_barco} *{barco}* escalado.\n\nAcesse o link rápido para confirmar:\n👉 {link}\n\n💡 *Não vai navegar?* Cancele sua reserva pelo link para liberar a vaga no pátio e evitar desencontros operacionais.",
  "Olá, *{cliente}*! 😊 Queremos garantir que sua navegação ocorra sem qualquer atraso ou fila de espera! Se ainda for sair hoje com {seu_barco} *{barco}*, clique abaixo para confirmar:\n\n👉 {link}\n\n⚠️ *Mudança de planos?* Caso não vá utilizar hoje, você pode efetuar o cancelamento em 1 clique pelo portal no link acima, liberando a vaga para outro cotista.",
  "Oi, *{cliente}*! ⚠️ Nossa marinharia precisa confirmar se {seu_barco} *{barco}* vai para a água hoje. Caso o passeio esteja mantido, confirme pelo link:\n\n👉 {link}\n\nCaso tenha ocorrido algum imprevisto e não vá utilizar, por favor acesse o link e cancele a reserva para liberarmos o espaço na marina.",
  "Olá, *{cliente}*! Última verificação da marina: sua reserva {do_seu_barco} *{barco}* para *{quando}* continua pendente de confirmação.\n\nPara confirmar sua saída ou cancelar a reserva sem penalidades, acesse o link abaixo:\n👉 {link}\n\nContamos com sua compreensão para mantermos o pátio e as descidas organizadas!"
];

export const DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES_FRONT = [
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nSua saída com {seu_barco} *{barco}* está agendada para *{quando}*! 🚤\n\nIdentificamos uma pendência financeira em aberto no valor de *R$ {valor_debito}*. Para liberar a descida {do_seu_barco} e preencher seu Plano de Navegação, acesse o link abaixo para quitar via PIX instantâneo e confirmar seu check-in:\n\n👉 {link}\n\nAssim que o pagamento for identificado, sua embarcação é liberada automaticamente!",
  "Olá, *{cliente}*! Passando para lembrar do seu agendamento para *{quando}* com {seu_barco} *{barco}*. ⚓\n\nPara que a marinharia possa programar a descida {do_seu_barco}, é necessário regularizar a pendência em aberto (*R$ {valor_debito}*) e confirmar seus horários de saída no link rápido:\n\n👉 {link}\n\nNo próprio link você gera o PIX Copia e Cola e já conclui o check-in na hora!",
  "Oi, *{cliente}*! 🚤 Nossa equipe de pátio está organizando a fila de descida das embarcações de hoje.\n\nSua reserva {do_seu_barco} *{barco}* aguarda a quitação do saldo vencido de *R$ {valor_debito}* para liberação operacional. Regularize e confirme sua saída em 1 minuto pelo link:\n\n👉 {link}\n\nEstamos à disposição caso precise de apoio!",
  "Olá, *{cliente}*! ⚠️ Lembrando que para a liberação {do_seu_barco} *{barco}* no píer hoje, o sistema requer a situação financeira em dia (*R$ {valor_debito}* em aberto) e o preenchimento do Plano de Navegação obrigatório.\n\nResolva tudo em uma única tela pelo seu link exclusivo:\n\n👉 {link}\n\nA liberação via PIX é imediata!",
  "Oi, *{cliente}*! Tudo bem? Ainda pretende sair *{quando}* com {seu_barco} *{barco}*? 🌊\n\nPara desbloquear a descida {do_seu_barco} junto à marinharia, acesse o link abaixo, quite a pendência de *R$ {valor_debito}* via PIX e informe seu destino e passageiros:\n\n👉 {link}\n\nQualquer dúvida sobre os valores, estamos à disposição aqui no WhatsApp!",
  "Olá, *{cliente}*! Sua reserva para *{quando}* em {seu_barco} *{barco}* segue retida aguardando regularização financeira (*R$ {valor_debito}*) e confirmação de check-in.\n\nAcesse seu link direto para quitar e liberar a embarcação:\n👉 {link}\n\n💡 *Não vai mais sair hoje?* Você também pode cancelar a reserva em 1 clique pelo link acima.",
  "Oi, *{cliente}*! ⚓ O movimento nos tratores de descida está intenso nesta manhã. Para mantermos {seu_barco} *{barco}* na programação de hoje, precisamos da quitação do débito em aberto (*R$ {valor_debito}*) e da confirmação do passeio:\n\n👉 {link}\n\n💡 Caso tenha mudado de planos, cancele a reserva pelo link para liberarmos a fila do pátio.",
  "Olá, *{cliente}*! 😊 Queremos evitar qualquer espera na sua chegada à marina! Se ainda for navegar hoje com {seu_barco} *{barco}*, regularize o saldo de *R$ {valor_debito}* via PIX no link abaixo e libere seu check-in imediatamente:\n\n👉 {link}\n\n⚠️ Se não for utilizar a embarcação hoje, basta cancelar a saída pelo próprio link.",
  "Oi, *{cliente}*! ⚠️ Penúltimo aviso da marinharia: {seu_barco} *{barco}* permanece bloqueada para descida hoje devido à pendência de *R$ {valor_debito}* e falta de check-in.\n\nPara quitar agora via PIX e liberar sua saída, acesse:\n👉 {link}\n\nSe não for comparecer, pedimos a gentileza de cancelar a reserva no link acima.",
  "Olá, *{cliente}*! Última chamada operacional: a reserva {do_seu_barco} *{barco}* para *{quando}* continua bloqueada por pendência financeira (*R$ {valor_debito}*).\n\nRealize a quitação imediata e confirme sua saída ou cancele o agendamento pelo link:\n👉 {link}\n\nAgradecemos sua atenção e parceria!"
];

interface NotifConfig {
  notif_modo_operacao: 'automatico' | 'manual';
  notif_reservas_ativa: boolean;
  notif_usar_mensagem_debito: boolean;
  notif_sandbox_ativa?: boolean;
  notif_sandbox_telefone?: string;
  notif_reservas_horarios: string[];
  notif_financeiro_ativa: boolean;
  notif_financeiro_template: string;
  whatsapp_conf_templates_10: string[];
  whatsapp_conf_debt_templates_10: string[];
}

interface SchedulerRuntime {
  isRunning: boolean;
  executedSlotsToday: string[];
  currentTimeBR: string;
  todayStr: string;
}

interface NotifLog {
  id: string;
  tipo: string;
  referenciaId: string;
  clienteId: string;
  clienteNome?: string;
  telefone: string;
  horarioSlot?: string;
  mensagem?: string;
  status: string;
  erro?: string;
  createdAt: string;
}

interface ReservaPendente {
  id: string;
  data: string;
  periodo: string;
  status: string;
  statusMarina: string;
  confirmacaoEnviada: number | boolean;
  tentativasConfirmacao: number;
  ultimaTentativaConfirmacao?: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteStatusFinanceiro?: string;
  embarcacaoId: string;
  embarcacaoNome: string;
  embarcacaoNumero: string;
  embarcacaoTipo?: string;
  embarcacaoModelo?: string;
  embarcacaoFabricante?: string;
  isInadimplente?: boolean;
  bloqueioManualSemFaturas?: boolean;
  valorDebito?: number;
  qtdFaturasVencidas?: number;
}

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type ActiveSection = 'fila' | 'modelos' | 'horarios' | 'historico';

export default function WhatsAppAutomationsTab({ showToast }: Props) {
  const [config, setConfig] = useState<NotifConfig>({
    notif_modo_operacao: 'automatico',
    notif_reservas_ativa: true,
    notif_usar_mensagem_debito: true,
    notif_reservas_horarios: ['08:00', '09:00'],
    notif_financeiro_ativa: true,
    notif_financeiro_template: "Olá, *{cliente}*! 😊\n\nConsta uma cobrança/débito em aberto no valor de *R$ {valor}* em seu cadastro.\n\nPara consultar os detalhes e efetuar o pagamento com segurança dentro do portal, acesse seu link exclusivo:\n\n👉 {link_pagamento}\n\nFicamos à disposição para qualquer dúvida! 👍",
    whatsapp_conf_templates_10: [...DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT],
    whatsapp_conf_debt_templates_10: [...DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES_FRONT]
  });

  const [runtime, setRuntime] = useState<SchedulerRuntime | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('fila');
  const [templateCategory, setTemplateCategory] = useState<'regular' | 'debt'>('regular');
  const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
  const [previewVessel, setPreviewVessel] = useState<'lancha' | 'jet'>('lancha');
  const [novoHorario, setNovoHorario] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Reservas pendentes
  const [reservasPendentes, setReservasPendentes] = useState<ReservaPendente[]>([]);
  const [selectedReservaIds, setSelectedReservaIds] = useState<string[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [runningDisparo, setRunningDisparo] = useState(false);
  const [singleDisparoId, setSingleDisparoId] = useState<string | null>(null);
  const [generatingLinkForId, setGeneratingLinkForId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [filaFinanceFilter, setFilaFinanceFilter] = useState<'all' | 'em_dia' | 'com_debito'>('all');

  // Modais de confirmação de segurança
  const [showConfirmDisparoModal, setShowConfirmDisparoModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Teste de disparo individual
  const [testNumber, setTestNumber] = useState('');
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [lastTestMagicLink, setLastTestMagicLink] = useState<string | null>(null);

  // Filtro dos logs
  const [logFilterType, setLogFilterType] = useState<'all' | 'reserva' | 'reserva_debito' | 'financeiro' | 'erro'>('all');
  const [logSearch, setLogSearch] = useState('');

  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications/config', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(prev => ({
            ...prev,
            ...data.config,
            notif_usar_mensagem_debito: data.config.notif_usar_mensagem_debito !== false,
            notif_sandbox_ativa: data.config.notif_sandbox_ativa === true,
            notif_sandbox_telefone: data.config.notif_sandbox_telefone || '',
            whatsapp_conf_templates_10: data.config.whatsapp_conf_templates_10 && data.config.whatsapp_conf_templates_10.length === 10
              ? data.config.whatsapp_conf_templates_10
              : DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT,
            whatsapp_conf_debt_templates_10: data.config.whatsapp_conf_debt_templates_10 && data.config.whatsapp_conf_debt_templates_10.length === 10
              ? data.config.whatsapp_conf_debt_templates_10
              : DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES_FRONT
          }));
        }
        if (data.runtime) {
          setRuntime(data.runtime);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar configurações do robô', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/notifications/logs?limit=80', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadReservasPendentes = async () => {
    try {
      setLoadingPendentes(true);
      const res = await fetch('/api/notifications/reservas-pendentes', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list: ReservaPendente[] = data.reservas || [];
        setReservasPendentes(list);
        setSelectedReservaIds(list.filter(r => !!r.clienteTelefone).map(r => r.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPendentes(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
    loadReservasPendentes();
  }, []);

  const handleSaveConfig = async (override?: Partial<NotifConfig>) => {
    try {
      setIsSaving(true);
      const payload = { ...config, ...(override || {}) };
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Configurações salvas com sucesso!', 'success');
        if (override) setConfig(prev => ({ ...prev, ...override }));
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar configurações', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTemplates = async (target: 'regular' | 'debt' | 'all' = 'all') => {
    try {
      const res = await fetch('/api/notifications/reset-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ target })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({
          ...prev,
          ...(data.templates ? { whatsapp_conf_templates_10: data.templates } : {}),
          ...(data.debtTemplates ? { whatsapp_conf_debt_templates_10: data.debtTemplates } : {})
        }));
        showToast('Modelos restaurados para o padrão recomendado!', 'success');
        setShowResetModal(false);
      }
    } catch (e) {
      showToast('Erro ao restaurar modelos', 'error');
    }
  };

  const handleSwitchModo = (novoModo: 'automatico' | 'manual') => {
    // Quando o administrador ativa o modo Automático, garante que notif_reservas_ativa fique true
    // para evitar a armadilha de "Modo Automático + Horários Desativados"
    const updates: Partial<NotifConfig> = {
      notif_modo_operacao: novoModo,
      ...(novoModo === 'automatico' ? { notif_reservas_ativa: true } : {})
    };
    setConfig(prev => ({ ...prev, ...updates }));
    handleSaveConfig(updates);
    if (novoModo === 'manual') {
      loadReservasPendentes();
      setActiveSection('fila');
    }
  };

  const handleAddHorario = () => {
    const trimmed = novoHorario.trim();
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
      showToast('Informe um horário válido (formato HH:mm)', 'error');
      return;
    }
    const normalized = trimmed.split(':').map(p => p.padStart(2, '0')).join(':');
    if (config.notif_reservas_horarios.includes(normalized)) {
      showToast('Este horário já está na lista', 'error');
      return;
    }
    const updated = [...config.notif_reservas_horarios, normalized].sort();
    setConfig(prev => ({ ...prev, notif_reservas_horarios: updated, notif_reservas_ativa: true }));
    setNovoHorario('');
    handleSaveConfig({ notif_reservas_horarios: updated, notif_reservas_ativa: true });
  };

  const handleRemoveHorario = (horarioToRemove: string) => {
    const updated = config.notif_reservas_horarios.filter(h => h !== horarioToRemove);
    setConfig(prev => ({ ...prev, notif_reservas_horarios: updated }));
    handleSaveConfig({ notif_reservas_horarios: updated });
  };

  const toggleSelectReserva = (id: string) => {
    setSelectedReservaIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const comTelefone = filteredReservas.filter(r => !!r.clienteTelefone).map(r => r.id);
    const allFilteredSelected = comTelefone.length > 0 && comTelefone.every(id => selectedReservaIds.includes(id));
    if (allFilteredSelected) {
      setSelectedReservaIds(prev => prev.filter(id => !comTelefone.includes(id)));
    } else {
      setSelectedReservaIds(prev => Array.from(new Set([...prev, ...comTelefone])));
    }
  };

  const executeDisparoManual = async (customIds?: string[]) => {
    const targetIds = customIds || selectedReservaIds;
    if (targetIds.length === 0) return;
    try {
      if (customIds && customIds.length === 1) {
        setSingleDisparoId(customIds[0]);
      } else {
        setRunningDisparo(true);
      }
      setShowConfirmDisparoModal(false);
      const res = await fetch('/api/notifications/test-reserva-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ selectedReservaIds: targetIds })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.disparos} confirmação(ões) enviada(s) com sucesso via WhatsApp!`, 'success');
        loadLogs();
        loadReservasPendentes();
      } else {
        showToast(data.message || 'Erro durante o disparo', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao executar disparo', 'error');
    } finally {
      setRunningDisparo(false);
      setSingleDisparoId(null);
    }
  };

  const handleGenerateAndCopyMagicLink = async (r: ReservaPendente, openInNewTab = false) => {
    try {
      setGeneratingLinkForId(r.id);
      const res = await fetch('/api/notifications/generate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          clienteId: r.clienteId,
          reservaId: r.id,
          origin: window.location.origin
        })
      });
      const data = await res.json();
      if (res.ok && data.magicLink) {
        await navigator.clipboard.writeText(data.magicLink);
        showToast(`Link Mágico de ${r.clienteNome.split(' ')[0]} copiado!`, 'success');
        if (openInNewTab) {
          window.open(data.magicLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        showToast(data.message || 'Erro ao gerar link mágico', 'error');
      }
    } catch (e) {
      showToast('Erro ao gerar link mágico', 'error');
    } finally {
      setGeneratingLinkForId(null);
    }
  };

  const handleSendTestConfirmation = async () => {
    if (!testNumber) {
      showToast('Informe o número com DDD para envio de teste', 'error');
      return;
    }
    try {
      setSendingTestMessage(true);
      const activeList = templateCategory === 'debt'
        ? config.whatsapp_conf_debt_templates_10
        : config.whatsapp_conf_templates_10;
      const currentText = activeList[activeTemplateIdx] || activeList[0];

      const res = await fetch('/api/notifications/test-send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          number: testNumber,
          templateIndex: activeTemplateIdx,
          text: currentText,
          isDebtTemplate: templateCategory === 'debt',
          simulatedDebtValue: 1450.00,
          origin: window.location.origin
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.magicLink) {
          setLastTestMagicLink(data.magicLink);
        }
        showToast('Mensagem de teste enviada via WhatsApp!', 'success');
      } else {
        showToast(data.message || 'Falha no envio de teste', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao disparar teste', 'error');
    } finally {
      setSendingTestMessage(false);
    }
  };

  // Inserção de tags dinâmicas no cursor do textarea
  const insertTag = (tag: string) => {
    const el = templateTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const isDebt = templateCategory === 'debt';
    const currentList = isDebt ? config.whatsapp_conf_debt_templates_10 : config.whatsapp_conf_templates_10;
    const current = currentList[activeTemplateIdx] || '';
    const updated = current.substring(0, start) + tag + current.substring(end);
    const newTemplates = [...currentList];
    newTemplates[activeTemplateIdx] = updated;
    if (isDebt) {
      setConfig(prev => ({ ...prev, whatsapp_conf_debt_templates_10: newTemplates }));
    } else {
      setConfig(prev => ({ ...prev, whatsapp_conf_templates_10: newTemplates }));
    }

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado para a área de transferência!', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-[#186b77]" />
        <span className="text-xs font-medium text-slate-500">Carregando painel de notificações...</span>
      </div>
    );
  }

  const isModoManual = config.notif_modo_operacao === 'manual';
  const activeTemplateList = templateCategory === 'debt'
    ? config.whatsapp_conf_debt_templates_10
    : config.whatsapp_conf_templates_10;
  const activeTitlesList = templateCategory === 'debt'
    ? DEFAULT_10_DEBT_CONFIRMATION_TITLES
    : DEFAULT_10_CONFIRMATION_TITLES;
  const currentTemplateText = activeTemplateList[activeTemplateIdx] || '';

  // Simulação inteligente de prévia do WhatsApp (Lancha vs Jet Ski + Débito)
  const isSimulatingJet = previewVessel === 'jet';
  let previewText = currentTemplateText
    .replace(/\{\s*cliente\s*\}/gi, 'Gabriel')
    .replace(/\{\s*barco\s*\}/gi, isSimulatingJet ? 'JET 02 (Sea-Doo RXT)' : 'M15 (Real 280)')
    .replace(/\{\s*quando\s*\}/gi, 'hoje')
    .replace(/\{\s*data\s*\}/gi, new Date().toLocaleDateString('pt-BR'))
    .replace(/\{\s*link\s*\}/gi, `https://${window.location.host}/m/a8k9z2`)
    .replace(/\{\s*valor_debito\s*\}/gi, '1.450,00')
    .replace(/\{\s*debito\s*\}/gi, '1.450,00')
    .replace(/\{\s*qtd_faturas\s*\}/gi, '2')
    .replace(/\{\s*tipo\s*\}/gi, isSimulatingJet ? 'jet' : 'lancha')
    .replace(/\{\s*tipo_barco\s*\}/gi, isSimulatingJet ? 'jet' : 'lancha')
    .replace(/\{\s*seu_barco\s*\}/gi, isSimulatingJet ? 'seu jet' : 'sua lancha')
    .replace(/\{\s*do_seu_barco\s*\}/gi, isSimulatingJet ? 'do seu jet' : 'da sua lancha')
    .replace(/\{\s*o_barco\s*\}/gi, isSimulatingJet ? 'o jet' : 'a lancha')
    .replace(/\{\s*no_barco\s*\}/gi, isSimulatingJet ? 'no jet' : 'na lancha');

  if (isSimulatingJet) {
    previewText = previewText
      .replace(/da\s+sua\s+lancha/gi, 'do seu jet')
      .replace(/da\s+lancha/gi, 'do jet')
      .replace(/sua\s+lancha/gi, 'seu jet')
      .replace(/na\s+lancha/gi, 'no jet')
      .replace(/a\s+lancha/gi, 'o jet')
      .replace(/\blancha\b/gi, 'jet');
  }

  // Contadores financeiros na fila de hoje
  const totalEmDiaCount = reservasPendentes.filter(r => !r.isInadimplente).length;
  const totalInadimplentesCount = reservasPendentes.filter(r => !!r.isInadimplente).length;

  // Filtragem de reservas pendentes
  const filteredReservas = reservasPendentes.filter(r => {
    if (filaFinanceFilter === 'em_dia' && r.isInadimplente) return false;
    if (filaFinanceFilter === 'com_debito' && !r.isInadimplente) return false;
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const cliente = (r.clienteNome || '').toLowerCase();
    const barco = (r.embarcacaoNome || '').toLowerCase();
    const num = (r.embarcacaoNumero || '').toLowerCase();
    return cliente.includes(q) || barco.includes(q) || num.includes(q);
  });

  // Filtragem de logs
  const filteredLogs = logs.filter(log => {
    if (logFilterType === 'reserva' && log.tipo !== 'reserva_confirmacao') return false;
    if (logFilterType === 'reserva_debito' && log.tipo !== 'reserva_confirmacao_debito') return false;
    if (logFilterType === 'financeiro' && (log.tipo === 'reserva_confirmacao' || log.tipo === 'reserva_confirmacao_debito')) return false;
    if (logFilterType === 'erro' && log.status === 'sucesso') return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      const nome = (log.clienteNome || '').toLowerCase();
      const tel = (log.telefone || '').toLowerCase();
      return nome.includes(q) || tel.includes(q);
    }
    return true;
  });

  const validPhoneCount = filteredReservas.filter(r => !!r.clienteTelefone).length;
  const selectedInFilteredCount = filteredReservas.filter(r => selectedReservaIds.includes(r.id)).length;

  return (
    <div className="space-y-6">
      {/* 1. BARRA MESTRA DE OPERAÇÃO & STATUS (CLEAN & OBJETIVO) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Modo Operacional com Indicador Claro */}
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isModoManual ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isModoManual ? <ShieldAlert className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Modo de Operação
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isModoManual
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isModoManual ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                  {isModoManual ? 'Manual (Supervisionado)' : 'Automático (Ativo)'}
                </span>
                {runtime?.currentTimeBR && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    Relógio Servidor: {runtime.currentTimeBR}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isModoManual
                  ? 'Trava ativa: nenhum disparo automático é feito sem sua autorização prévia.'
                  : config.notif_reservas_ativa && config.notif_reservas_horarios.length > 0
                    ? `Disparos automáticos para reservas do dia às ${config.notif_reservas_horarios.join(', ')} (com janela inteligente de recuperação de 15 min).`
                    : 'Atenção: adicione ao menos um horário na aba Programação para o disparo automático.'}
              </p>
            </div>
          </div>

          {/* Lado Direito: Seletor de Modo Compacto (Segmented Control) */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleSwitchModo('automatico')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  !isModoManual
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Automático
              </button>
              <button
                type="button"
                onClick={() => handleSwitchModo('manual')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isModoManual
                    ? 'bg-white text-amber-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Manual (Seguro)
              </button>
            </div>
          </div>
        </div>

        {/* Mini KPIs de Status do Sistema */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Pendentes Hoje</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-base font-bold ${reservasPendentes.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {reservasPendentes.length}
              </span>
              {totalInadimplentesCount > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                  {totalInadimplentesCount} c/ débito
                </span>
              )}
              {reservasPendentes.length > 0 && totalInadimplentesCount === 0 && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                  Requer ação
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setActiveSection('horarios')}
            className="bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer transition-colors rounded-xl p-3 border border-slate-100"
            title="Clique para configurar os horários de disparo"
          >
            <span className="text-[11px] text-slate-500 block">Horários Ativos</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className={`text-xs font-bold truncate ${config.notif_reservas_ativa && config.notif_reservas_horarios.length > 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {config.notif_reservas_ativa && config.notif_reservas_horarios.length > 0
                  ? config.notif_reservas_horarios.join(', ')
                  : 'Desativado (Clique p/ ativar)'}
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveSection('modelos')}
            className="bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer transition-colors rounded-xl p-3 border border-slate-100"
          >
            <span className="text-[11px] text-slate-500 block">Régua Inteligente</span>
            <span className="text-xs font-bold text-[#186b77] mt-0.5 block truncate">
              {config.notif_usar_mensagem_debito ? '10 Níveis + Aviso Débito' : '10 Modelos Padrão'}
            </span>
          </div>

          <div
            onClick={() => setActiveSection('horarios')}
            className="bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer transition-colors rounded-xl p-3 border border-slate-100"
          >
            <span className="text-[11px] text-slate-500 block">Avisos Financeiros</span>
            <span className={`text-xs font-bold mt-0.5 block ${config.notif_financeiro_ativa ? 'text-emerald-700' : 'text-slate-400'}`}>
              {config.notif_financeiro_ativa ? 'Ativo com PIX no Check-in' : 'Pausado'}
            </span>
          </div>
        </div>

        {/* 1.1 BARRA DE SEGURANÇA / MODO SANDBOX (TESTE SEGURO) */}
        <div className={`mt-4 p-3.5 rounded-xl border transition-all ${
          config.notif_sandbox_ativa
            ? 'bg-amber-500/10 border-amber-300 text-amber-950'
            : 'bg-slate-50/80 border-slate-200 text-slate-700'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                config.notif_sandbox_ativa ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
              }`}>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Modo Sandbox de Teste Seguro
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                    config.notif_sandbox_ativa
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {config.notif_sandbox_ativa ? 'ATIVADO (Trava de Clientes Ligada)' : 'Desativado (Modo Real)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {config.notif_sandbox_ativa
                    ? 'Nenhum cotista real receberá mensagens. Todos os envios serão desviados para o número de teste abaixo ou registrados apenas em tela.'
                    : 'Atenção: com o sandbox desativado, qualquer disparo autorizado é enviado diretamente para o WhatsApp do cliente.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500">Enviar p/:</span>
                <input
                  type="text"
                  placeholder="(DDD) 99999-9999"
                  value={config.notif_sandbox_telefone || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, notif_sandbox_telefone: e.target.value }))}
                  onBlur={() => handleSaveConfig({ notif_sandbox_telefone: config.notif_sandbox_telefone })}
                  className="text-xs font-mono w-32 border-0 p-0 focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const novoStatus = !config.notif_sandbox_ativa;
                  setConfig(prev => ({ ...prev, notif_sandbox_ativa: novoStatus }));
                  handleSaveConfig({ notif_sandbox_ativa: novoStatus });
                  showToast(
                    novoStatus ? 'Modo Sandbox ATIVADO! Clientes protegidos.' : 'Modo Sandbox DESATIVADO. Disparos reais liberados.',
                    novoStatus ? 'success' : 'error'
                  );
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs ${
                  config.notif_sandbox_ativa
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {config.notif_sandbox_ativa ? 'Desativar Sandbox' : 'Ativar Modo Sandbox'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVEGAÇÃO POR ABAS LIMPAS */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('fila')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeSection === 'fila'
              ? 'border-[#186b77] text-[#186b77] bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Fila de Confirmação (Hoje)
          {reservasPendentes.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeSection === 'fila' ? 'bg-[#186b77] text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {reservasPendentes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('modelos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeSection === 'modelos'
              ? 'border-[#186b77] text-[#186b77] bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Modelos de Mensagem (Em Dia & Débito)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('horarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeSection === 'horarios'
              ? 'border-[#186b77] text-[#186b77] bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Programação & Gatilhos
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('historico');
            loadLogs();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeSection === 'historico'
              ? 'border-[#186b77] text-[#186b77] bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Histórico de Envios
          {logs.length > 0 && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. ABA 1: FILA DE CONFIRMAÇÃO & DISPARO */}
      {activeSection === 'fila' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          {/* Header da Fila */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Fila de Confirmações para Hoje
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Apenas reservas agendadas para hoje que ainda não fizeram check-in e não desceram para a água. Clientes inadimplentes recebem automaticamente o aviso de débito com quitação PIX no próprio link mágico.
              </p>
            </div>

            {/* Ações da Tabela */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadReservasPendentes}
                disabled={loadingPendentes}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Recarregar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPendentes ? 'animate-spin' : ''}`} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmDisparoModal(true)}
                disabled={runningDisparo || selectedReservaIds.length === 0}
                className="px-4 py-2 bg-[#186b77] hover:bg-[#12535d] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {runningDisparo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Disparando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Autorizar e Disparar ({selectedReservaIds.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barra de Filtro Financeiro, Busca e Seleção Rápida */}
          {reservasPendentes.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por cliente ou barco..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#186b77] focus:border-[#186b77]"
                  />
                </div>

                {/* Pílulas de Filtro Financeiro */}
                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilaFinanceFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      filaFinanceFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({reservasPendentes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilaFinanceFilter('em_dia')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      filaFinanceFilter === 'em_dia' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Em Dia ({totalEmDiaCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilaFinanceFilter('com_debito')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      filaFinanceFilter === 'com_debito' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Com Débito ({totalInadimplentesCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  <strong>{selectedInFilteredCount}</strong> de {validPhoneCount} selecionado(s)
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold text-[#186b77] hover:underline"
                >
                  {selectedInFilteredCount === validPhoneCount && validPhoneCount > 0 ? 'Desmarcar visíveis' : 'Marcar visíveis'}
                </button>
              </div>
            </div>
          )}

          {/* Tabela de Reservas Pendentes */}
          {reservasPendentes.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Tudo em dia para hoje!
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Não há reservas pendentes de confirmação nesta data. Todos os clientes já fizeram check-in ou não há saídas pendentes hoje.
              </p>
            </div>
          ) : filteredReservas.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma reserva encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-slate-800"
                        title="Alternar todos"
                      >
                        {selectedInFilteredCount > 0 && selectedInFilteredCount === validPhoneCount ? (
                          <CheckSquare className="w-4 h-4 text-[#186b77]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Embarcação</th>
                    <th className="py-2.5 px-3">Situação / Mensagem</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Próxima Etapa</th>
                    <th className="py-2.5 px-3 text-center">Envios</th>
                    <th className="py-2.5 px-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReservas.map((r) => {
                    const isSelected = selectedReservaIds.includes(r.id);
                    const hasPhone = !!r.clienteTelefone;
                    const boatCode = r.embarcacaoNumero ? `M${r.embarcacaoNumero}` : (r.embarcacaoNome || 'Embarcação');
                    const proximaTentativa = Number(r.tentativasConfirmacao || 0) + 1;
                    const proximoModelo = Math.min(proximaTentativa, 10);
                    const hasDebt = !!r.isInadimplente;
                    const valorDebitoFormatted = Number(r.valorDebito || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });

                    return (
                      <tr
                        key={r.id}
                        onClick={() => hasPhone && toggleSelectReserva(r.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                        } ${!hasPhone ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                      >
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!hasPhone}
                            onChange={() => hasPhone && toggleSelectReserva(r.id)}
                            className="rounded border-slate-300 text-[#186b77] focus:ring-[#186b77]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{r.clienteNome || 'Cliente'}</div>
                          {r.ultimaTentativaConfirmacao && (
                            <div className="text-[10px] text-slate-400">
                              Último envio: {new Date(r.ultimaTentativaConfirmacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#186b77]">{boatCode}</span>
                          {r.embarcacaoNome && r.embarcacaoNumero && (
                            <span className="text-slate-400 text-[11px] ml-1">({r.embarcacaoNome})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasDebt ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                {Number(r.valorDebito || 0) > 0
                                  ? `Débito: R$ ${valorDebitoFormatted}`
                                  : 'Inadimplente'}
                              </span>
                              <div className="text-[10px] text-rose-600/80 font-medium">
                                {config.notif_usar_mensagem_debito ? 'Envia Modelo c/ Débito + PIX' : 'Bloqueio c/ PIX no Link'}
                              </div>
                            </div>
                          ) : r.bloqueioManualSemFaturas ? (
                            <div className="space-y-0.5">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                title="O cadastro está marcado como inadimplente, mas não há nenhuma fatura vencida vinculada a este cliente."
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Marcado inadimplente
                              </span>
                              <div className="text-[10px] text-amber-700/80 font-medium">
                                Sem faturas vencidas • revisar cadastro
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Em dia
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Envia Modelo Padrão
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {hasPhone ? (
                            <span className="text-slate-700">{r.clienteTelefone}</span>
                          ) : (
                            <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Sem telefone
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            hasDebt && config.notif_usar_mensagem_debito
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}>
                            Modelo {proximoModelo} ({proximaTentativa}º Envio)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {r.tentativasConfirmacao || 0} de 10
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleGenerateAndCopyMagicLink(r, false)}
                              disabled={generatingLinkForId === r.id}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-[#186b77] bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                              title="Copiar Link Mágico de Check-in deste cliente"
                            >
                              {generatingLinkForId === r.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Link2 className="w-3 h-3" />
                              )}
                              Link
                            </button>

                            <button
                              type="button"
                              onClick={() => executeDisparoManual([r.id])}
                              disabled={!hasPhone || singleDisparoId === r.id || runningDisparo}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#186b77] hover:bg-[#12535d] rounded-lg inline-flex items-center gap-1 transition-colors disabled:opacity-40"
                              title="Disparar confirmação via WhatsApp agora para este cliente"
                            >
                              {singleDisparoId === r.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Enviar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. ABA 2: MODELOS DE MENSAGEM (10 NÍVEIS REGULARES + 10 NÍVEIS COM DÉBITO) */}
      {activeSection === 'modelos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Modelos de Confirmação Progressiva (10 Níveis)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalize a régua de mensagens tanto para clientes em dia quanto para clientes com pendência financeira vencida.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrões
              </button>

              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#186b77] hover:bg-[#12535d] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Alterações
              </button>
            </div>
          </div>

          {/* Seletor de Categoria de Modelo: Cliente em Dia vs. Cliente com Débito */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="inline-flex bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTemplateCategory('regular')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  templateCategory === 'regular'
                    ? 'bg-white text-[#186b77] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Cliente em Dia (10 Modelos)
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategory('debt')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  templateCategory === 'debt'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4 text-rose-600" />
                Cliente com Débito / Inadimplente (10 Modelos)
              </button>
            </div>

            {/* Switch para ativar/desativar o envio diferenciado para inadimplentes */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.notif_usar_mensagem_debito}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setConfig(prev => ({ ...prev, notif_usar_mensagem_debito: checked }));
                  handleSaveConfig({ notif_usar_mensagem_debito: checked });
                }}
                className="rounded border-slate-300 text-[#186b77] focus:ring-[#186b77] w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-700">
                Usar mensagem diferenciada com valor do débito quando houver atraso
              </span>
            </label>
          </div>

          {/* Stepper / Abas das 10 Etapas */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/80">
            {activeTemplateList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTemplateIdx(idx)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTemplateIdx === idx
                    ? templateCategory === 'debt'
                      ? 'bg-rose-700 text-white shadow-xs font-bold'
                      : 'bg-[#186b77] text-white shadow-xs font-bold'
                    : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {idx + 1}º Envio
              </button>
            ))}
          </div>

          {/* Editor e Simulador do WhatsApp Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
            {/* Lado Esquerdo: Editor com Tags Interativas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    templateCategory === 'debt' ? 'text-rose-700' : 'text-[#186b77]'
                  }`}>
                    {templateCategory === 'debt' ? 'Régua de Cobrança & Check-in' : 'Régua Padrão'} • Etapa {activeTemplateIdx + 1} de 10
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeTitlesList[activeTemplateIdx]}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentTemplateText.length} caracteres
                </span>
              </div>

              <textarea
                ref={templateTextareaRef}
                rows={9}
                value={currentTemplateText}
                onChange={(e) => {
                  const updated = [...activeTemplateList];
                  updated[activeTemplateIdx] = e.target.value;
                  if (templateCategory === 'debt') {
                    setConfig(prev => ({ ...prev, whatsapp_conf_debt_templates_10: updated }));
                  } else {
                    setConfig(prev => ({ ...prev, whatsapp_conf_templates_10: updated }));
                  }
                }}
                className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] text-slate-900 leading-relaxed"
                placeholder="Escreva a mensagem aqui..."
              />

              {/* Tags dinâmicas clicáveis */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Clique em uma tag para inserir no cursor:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => insertTag('{cliente}')}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold transition-colors"
                  >
                    + {'{cliente}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{barco}')}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold transition-colors"
                  >
                    + {'{barco}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{quando}')}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold transition-colors"
                  >
                    + {'{quando}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{data}')}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold transition-colors"
                  >
                    + {'{data}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{link}')}
                    className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold transition-colors"
                  >
                    + {'{link}'} (Link Mágico)
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{valor_debito}')}
                    className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold transition-colors"
                    title="Valor atualizado das faturas vencidas (ex: 1.450,00)"
                  >
                    + {'{valor_debito}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{qtd_faturas}')}
                    className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold transition-colors"
                    title="Quantidade de faturas vencidas do cliente"
                  >
                    + {'{qtd_faturas}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{tipo}')}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold transition-colors"
                    title="Substitui por 'lancha' ou 'jet'"
                  >
                    + {'{tipo}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{seu_barco}')}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold transition-colors"
                    title="Substitui por 'sua lancha' ou 'seu jet'"
                  >
                    + {'{seu_barco}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{do_seu_barco}')}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold transition-colors"
                    title="Substitui por 'da sua lancha' ou 'do seu jet'"
                  >
                    + {'{do_seu_barco}'}
                  </button>
                </div>
              </div>
            </div>

            {/* Lado Direito: Simulador de WhatsApp */}
            <div className="bg-[#e5ddd5] rounded-2xl p-4 border border-slate-300 shadow-inner flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 pb-2 text-[11px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Smartphone className="w-4 h-4 text-emerald-800" />
                      Modelo {activeTemplateIdx + 1} ({templateCategory === 'debt' ? 'Com Débito' : 'Em Dia'})
                    </span>
                    <div className="inline-flex bg-black/10 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPreviewVessel('lancha')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${previewVessel === 'lancha' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        🛥️ Lancha
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewVessel('jet')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${previewVessel === 'jet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        🌊 Jet Ski
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded font-mono text-slate-600">
                    Ao Vivo
                  </span>
                </div>

                {/* Balão de mensagem do WhatsApp */}
                <div className="bg-white rounded-xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-w-[92%] relative">
                  {previewText.split('\n').map((line, lIdx) => {
                    if (line.includes('https://') || line.includes('http://')) {
                      return (
                        <p key={lIdx} className="my-1.5 p-2 bg-slate-50 border border-blue-200 rounded-lg text-blue-700 font-bold font-mono text-[11px] flex items-center gap-1.5 break-all">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          {line}
                        </p>
                      );
                    }
                    return <p key={lIdx}>{line}</p>;
                  })}
                  <span className="block text-right text-[10px] text-slate-400 mt-1 font-mono">
                    08:00 ✓✓
                  </span>
                </div>
              </div>

              {/* Teste Direto para um Telefone */}
              <div className="mt-4 pt-3 border-t border-black/10 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  Enviar teste deste modelo para seu WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestConfirmation}
                    disabled={sendingTestMessage}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
                  >
                    {sendingTestMessage ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Enviar Teste
                  </button>
                </div>

                {lastTestMagicLink && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Link gerado:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lastTestMagicLink)}
                          className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-50"
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                        <a
                          href={lastTestMagicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          Abrir ↗
                        </a>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono truncate select-all">
                      {lastTestMagicLink}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA 3: PROGRAMAÇÃO & GATILHOS */}
      {activeSection === 'horarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARD DE HORÁRIOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#186b77]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Horários de Verificação Diária</h3>
                  <p className="text-xs text-slate-500">Momentos em que o robô dispara confirmações para as reservas do dia</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notif_reservas_ativa}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConfig(prev => ({ ...prev, notif_reservas_ativa: checked }));
                    handleSaveConfig({ notif_reservas_ativa: checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#186b77]"></div>
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">Horários Configurados:</span>
              <div className="flex flex-wrap gap-2">
                {config.notif_reservas_horarios.map((horario) => {
                  const wasExecutedToday = runtime?.executedSlotsToday?.some(k => k.endsWith(`_${horario}`));
                  return (
                    <span
                      key={horario}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold"
                    >
                      ⏰ {horario}
                      {wasExecutedToday && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                          Executado hoje
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveHorario(horario)}
                        className="text-teal-600 hover:text-rose-600 rounded-full p-0.5 transition-colors"
                        title="Remover horário"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddHorario}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#186b77] hover:bg-[#12535d] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Horário
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                <strong>Proteção anti-falha ativa:</strong> Caso o servidor reinicie exatamente no minuto programado, o robô possui uma janela inteligente de recuperação de 15 minutos e verificação em banco de dados para garantir que nenhum horário seja perdido ou disparado em duplicidade.
              </div>
            </div>
          </div>

          {/* CARD FINANCEIRO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Avisos Financeiros de Novas Cobranças</h3>
                  <p className="text-xs text-slate-500">Notificação enviada quando uma nova cobrança é lançada para o cliente</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notif_financeiro_ativa}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConfig(prev => ({ ...prev, notif_financeiro_ativa: checked }));
                    handleSaveConfig({ notif_financeiro_ativa: checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">Modelo da Mensagem de Nova Cobrança:</span>
              <textarea
                rows={4}
                value={config.notif_financeiro_template}
                onChange={(e) => setConfig(prev => ({ ...prev, notif_financeiro_template: e.target.value }))}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvar Mensagem Financeira
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ABA 4: HISTÓRICO & AUDITORIA */}
      {activeSection === 'historico' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Histórico & Auditoria de Disparos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro detalhado dos envios realizados pelo robô (clique em uma linha para ler a mensagem enviada)
              </p>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={loadingLogs}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg self-start sm:self-auto transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Recarregar Logs
            </button>
          </div>

          {/* Filtros de Logs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setLogFilterType('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  logFilterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilterType('reserva')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  logFilterType === 'reserva' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Reservas (Em Dia)
              </button>
              <button
                type="button"
                onClick={() => setLogFilterType('reserva_debito')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  logFilterType === 'reserva_debito' ? 'bg-white text-rose-800 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Reservas (c/ Débito)
              </button>
              <button
                type="button"
                onClick={() => setLogFilterType('financeiro')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  logFilterType === 'financeiro' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Financeiro
              </button>
              <button
                type="button"
                onClick={() => setLogFilterType('erro')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  logFilterType === 'erro' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Falhas
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente ou telefone..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#186b77] focus:border-[#186b77]"
              />
            </div>
          </div>

          {/* Tabela de Logs */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Nenhum registro encontrado para este filtro.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Slot</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === 'sucesso';
                    const dateFormatted = new Date(log.createdAt).toLocaleString('pt-BR');
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{dateFormatted}</td>
                          <td className="py-2.5 px-3">
                            {log.tipo === 'reserva_confirmacao_debito' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                Reserva + Aviso Débito
                              </span>
                            ) : log.tipo === 'reserva_confirmacao' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                Reserva (Em Dia)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Financeiro
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{log.clienteNome || 'Cliente'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{log.telefone}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{log.horarioSlot || '-'}</td>
                          <td className="py-2.5 px-3">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold" title={log.erro || ''}>
                                <AlertCircle className="w-3.5 h-3.5" /> Erro
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              className="text-[11px] text-[#186b77] hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <Eye className="w-3 h-3" />
                              {isExpanded ? 'Ocultar' : 'Ver texto'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={7} className="p-3.5">
                              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {log.mensagem || 'Sem texto registrado.'}
                                {log.erro && (
                                  <div className="mt-2 pt-2 border-t border-rose-100 text-rose-600 font-semibold">
                                    Detalhe do erro: {log.erro}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRMAÇÃO DE SEGURANÇA PARA DISPARO EM MASSA */}
      {showConfirmDisparoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#186b77] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Disparo de Notificações
                </h3>
                <p className="text-xs text-slate-500">
                  Autorização manual supervisionada
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p>
                Você está prestes a autorizar o envio de confirmação para <strong>{selectedReservaIds.length} reserva(s)</strong> selecionada(s) de hoje.
              </p>
              <p className="text-slate-500">
                Clientes em dia receberão o modelo padrão e clientes inadimplentes receberão o aviso de débito com link mágico para quitação PIX + check-in.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDisparoModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDisparoManual()}
                disabled={runningDisparo}
                className="px-4 py-2 bg-[#186b77] hover:bg-[#12535d] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {runningDisparo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Confirmar e Disparar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAÇÃO DE RESTAURAÇÃO DE MODELOS */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Restaurar Modelos Padrões
                </h3>
                <p className="text-xs text-slate-500">
                  Substituir textos personalizados pelos padrões do sistema
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja restaurar os modelos de mensagem para o padrão recomendado da marina (10 níveis regulares e 10 níveis com aviso de débito)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleResetTemplates('all')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Restaurar Todos os Modelos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
