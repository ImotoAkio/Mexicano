import React, { useState, useEffect } from 'react';
import {
  Sparkles, Clock, Send, CheckCircle2, AlertCircle, RefreshCw,
  Plus, X, Bot, DollarSign, CalendarCheck, ShieldCheck, Check,
  Play, MessageSquare, AlertTriangle, FileText, ShieldAlert,
  Sliders, UserCheck, CheckSquare, Square, RotateCcw, Smartphone,
  ExternalLink
} from 'lucide-react';
import { getAuthHeaders } from '../utils/apiAuth';

export const DEFAULT_10_CONFIRMATION_TITLES = [
  "1º Envio: Boas-vindas matinais e acolhimento",
  "2º Envio: Lembrete amigável e agilidade",
  "3º Envio: Organização do pátio e prioridade na descida",
  "4º Envio: Normas da Marinha e dados obrigatórios",
  "5º Envio: Apoio aos marinheiros e pontualidade",
  "6º Envio: Alinhamento operacional de uso do barco",
  "7º Envio: Movimentação intensa no píer",
  "8º Envio: Urgência moderada de atendimento",
  "9º Envio: Penúltimo aviso de liberação de vaga",
  "10º Envio: Última chamada antes do cancelamento"
];

export const DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT = [
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nSua embarcação *{barco}* está agendada para *{quando}*! 🚤\n\nNossa equipe de marinharia já está preparando tudo. Para adiantarmos a descida da embarcação e seu plano de navegação, por favor confirme sua saída pelo link direto no app:\n\n👉 {link}\n\nTenha um excelente passeio!",
  "Olá, *{cliente}*! Passando para checar os detalhes do seu passeio de *{quando}* com a *{barco}*. ⚓\n\nVocê consegue nos confirmar rapidinho? Leva menos de 1 minuto pelo seu link de acesso rápido:\n\n👉 {link}\n\nAssim garantimos sua embarcação pronta e revisada para a sua chegada!",
  "Oi, *{cliente}*! 🚤 A equipe do pátio está organizando a fila de descida das embarcações desta manhã. Para mantermos a prioridade da sua lancha *{barco}*, confirme seus horários de saída pelo link:\n\n👉 {link}\n\nEstamos aguardando sua resposta para colocar seu barco na água a tempo!",
  "Olá, *{cliente}*! ⚠️ Lembrando que a Capitania dos Portos exige o Plano de Navegação prévio (destino e quantidade de passageiros a bordo). Agilize sua liberação no píer confirmando os dados pelo app:\n\n👉 {link}\n\nSua segurança e conforto são nossas prioridades!",
  "Oi, *{cliente}*! Tudo certo para navegar *{quando}* com a *{barco}*? 🌊\n\nPara que nossa equipe organize os marinheiros de apoio e você não pegue fila no píer, confirme sua saída agora pelo link:\n\n👉 {link}\n\nQualquer dúvida, estamos à disposição aqui no WhatsApp!",
  "Olá, *{cliente}*! Ainda não identificamos sua confirmação para o agendamento de *{quando}* na embarcação *{barco}*.\n\nCaso vá utilizar a embarcação hoje, por favor valide sua presença pelo link abaixo:\n\n👉 {link}\n\nAssim mantemos os marinheiros escalados para recebê-lo!",
  "Oi, *{cliente}*! ⚓ Como as movimentações no píer e no trator de descida estão intensas, precisamos da sua confirmação para mantermos a *{barco}* escalada. Acesse o link rápido para confirmar:\n\n👉 {link}\n\nAgradecemos a sua cooperação!",
  "Olá, *{cliente}*! 😊 Queremos garantir que sua navegação ocorra sem qualquer atraso ou fila de espera! Caso ainda vá sair hoje com a *{barco}*, clique aqui para confirmar agora:\n\n👉 {link}\n\nNossa equipe aguarda sua resposta!",
  "Oi, *{cliente}*! ⚠️ Nossa marinharia precisa confirmar se a embarcação *{barco}* vai para a água hoje. Caso o passeio esteja mantido, confirme pelo link:\n\n👉 {link}\n\nSe tiver ocorrido algum imprevisto e não for utilizar, nos avise por favor para liberarmos o espaço.",
  "Olá, *{cliente}*! Última verificação da marina: sua reserva da *{barco}* para *{quando}* continua pendente de confirmação. Para evitarmos o cancelamento do agendamento por ausência de check-in, confirme no link abaixo:\n\n👉 {link}\n\nContamos com sua compreensão!"
];

interface NotifConfig {
  notif_modo_operacao: 'automatico' | 'manual';
  notif_reservas_ativa: boolean;
  notif_reservas_horarios: string[];
  notif_financeiro_ativa: boolean;
  notif_financeiro_template: string;
  whatsapp_conf_templates_10: string[];
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
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  embarcacaoId: string;
  embarcacaoNome: string;
  embarcacaoNumero: string;
}

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function WhatsAppAutomationsTab({ showToast }: Props) {
  const [config, setConfig] = useState<NotifConfig>({
    notif_modo_operacao: 'automatico',
    notif_reservas_ativa: true,
    notif_reservas_horarios: ['08:00', '09:00'],
    notif_financeiro_ativa: true,
    notif_financeiro_template: "Olá, *{cliente}*! 😊\n\nIdentificamos um novo lançamento no seu cadastro:\n\n📋 *Descrição:* {descricao}\n💰 *Valor:* R$ {valor}\n📅 *Vencimento:* {vencimento}{link_info}\n\nFicamos à disposição para qualquer dúvida! 👍",
    whatsapp_conf_templates_10: [...DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT]
  });

  const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
  const [novoHorario, setNovoHorario] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Reservas pendentes de hoje para envio manual supervisionado
  const [reservasPendentes, setReservasPendentes] = useState<ReservaPendente[]>([]);
  const [selectedReservaIds, setSelectedReservaIds] = useState<string[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [runningDisparo, setRunningDisparo] = useState(false);
  const [lastDisparoResult, setLastDisparoResult] = useState<any | null>(null);

  // Teste de disparo individual
  const [testNumber, setTestNumber] = useState('');
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [lastTestMagicLink, setLastTestMagicLink] = useState<string | null>(null);

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
            whatsapp_conf_templates_10: data.config.whatsapp_conf_templates_10 && data.config.whatsapp_conf_templates_10.length === 10
              ? data.config.whatsapp_conf_templates_10
              : DEFAULT_10_CONFIRMATION_TEMPLATES_FRONT
          }));
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
      const res = await fetch('/api/notifications/logs?limit=50', { headers: getAuthHeaders() });
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

  const handleResetTemplates = async () => {
    if (!confirm('Deseja restaurar os 10 modelos de mensagens para o padrão do sistema? Suas personalizações serão substituídas.')) return;
    try {
      const res = await fetch('/api/notifications/reset-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, whatsapp_conf_templates_10: data.templates }));
        showToast('10 modelos restaurados com sucesso!', 'success');
      }
    } catch (e) {
      showToast('Erro ao restaurar modelos', 'error');
    }
  };

  const handleSwitchModo = (novoModo: 'automatico' | 'manual') => {
    setConfig(prev => ({ ...prev, notif_modo_operacao: novoModo }));
    handleSaveConfig({ notif_modo_operacao: novoModo });
    if (novoModo === 'manual') {
      loadReservasPendentes();
    }
  };

  const handleAddHorario = () => {
    const trimmed = novoHorario.trim();
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
      showToast('Informe um horário válido no formato HH:mm (ex: 08:30)', 'error');
      return;
    }
    if (config.notif_reservas_horarios.includes(trimmed)) {
      showToast('Este horário já está na lista.', 'error');
      return;
    }
    const updated = [...config.notif_reservas_horarios, trimmed].sort();
    setConfig(prev => ({ ...prev, notif_reservas_horarios: updated }));
    setNovoHorario('');
    handleSaveConfig({ notif_reservas_horarios: updated });
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
    const comTelefone = reservasPendentes.filter(r => !!r.clienteTelefone).map(r => r.id);
    if (selectedReservaIds.length === comTelefone.length) {
      setSelectedReservaIds([]);
    } else {
      setSelectedReservaIds(comTelefone);
    }
  };

  const handleDispararManual = async () => {
    if (selectedReservaIds.length === 0) {
      showToast('Selecione pelo menos uma reserva para disparar', 'error');
      return;
    }

    try {
      setRunningDisparo(true);
      setLastDisparoResult(null);
      const res = await fetch('/api/notifications/test-reserva-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ selectedReservaIds })
      });
      const data = await res.json();
      setLastDisparoResult(data);
      if (data.success) {
        showToast(`Disparo concluído! ${data.disparos} confirmações enviadas com link de acesso.`, 'success');
        loadLogs();
        loadReservasPendentes();
      } else {
        showToast(data.message || 'Erro durante o disparo', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao executar disparo', 'error');
    } finally {
      setRunningDisparo(false);
    }
  };

  const handleSendTestConfirmation = async () => {
    if (!testNumber) {
      showToast('Informe o número com DDD para enviar o teste', 'error');
      return;
    }
    try {
      setSendingTestMessage(true);
      const currentText = config.whatsapp_conf_templates_10[activeTemplateIdx] || config.whatsapp_conf_templates_10[0];

      const res = await fetch('/api/notifications/test-send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          number: testNumber,
          templateIndex: activeTemplateIdx,
          text: currentText,
          origin: window.location.origin
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.magicLink) {
          setLastTestMagicLink(data.magicLink);
        }
        showToast('Mensagem de teste enviada com Magic Link direto no WhatsApp!', 'success');
      } else {
        showToast(data.message || 'Falha no envio de teste', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao disparar teste', 'error');
    } finally {
      setSendingTestMessage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-[#186b77]" />
      </div>
    );
  }

  const isModoManual = config.notif_modo_operacao === 'manual';
  const currentTemplateText = config.whatsapp_conf_templates_10[activeTemplateIdx] || '';

  // Simulação de prévia do WhatsApp
  const previewText = currentTemplateText
    .replace(/\{\s*cliente\s*\}/gi, 'Gabriel')
    .replace(/\{\s*barco\s*\}/gi, 'M15 (Real 280)')
    .replace(/\{\s*quando\s*\}/gi, 'hoje')
    .replace(/\{\s*data\s*\}/gi, new Date().toLocaleDateString('pt-BR'))
    .replace(/\{\s*link\s*\}/gi, `https://${window.location.host}/m/a8k9z2`);

  return (
    <div className="space-y-6">
      {/* 1. CHAVE MESTRA DE SEGURANÇA: MODO AUTOMÁTICO VS MANUAL */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#186b77]" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Modo de Operação do Sistema de Notificações
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trava de segurança: escolha se o robô dispara sozinho nos horários ou se requer autorização manual da equipe.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
            <button
              type="button"
              onClick={() => handleSwitchModo('automatico')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                !isModoManual
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              🟢 Modo Automático
            </button>
            <button
              type="button"
              onClick={() => handleSwitchModo('manual')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                isModoManual
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              🔒 Modo Manual (Segurança)
            </button>
          </div>
        </div>

        {isModoManual ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">
                TRAVA DE SEGURANÇA ATIVA — Robô em Modo Manual
              </p>
              <p className="text-amber-800 leading-relaxed">
                Nenhum envio será feito sozinho pelo servidor. Os horários e os avisos financeiros ficam <strong>congelados</strong> para evitar mensagens quando não deve. Você pode revisar as reservas pendentes abaixo e disparar apenas quando autorizar.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-950">
                MODO AUTOMÁTICO ATIVO — Servidor Operando
              </p>
              <p className="text-emerald-800 leading-relaxed">
                O servidor verifica a agenda nos horários programados (ex: {config.notif_reservas_horarios.join(', ')}) e envia mensagens para os clientes que ainda não confirmaram. A cada reenvio, ele utiliza um dos <strong>10 modelos de mensagens diferentes</strong> e anexa o <strong>link direto de check-in</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. SE ESTIVER NO MODO MANUAL: MOSTRA PAINEL DE DISPARO SUPERVISIONADO */}
      {isModoManual && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reservas Pendentes de Confirmação (Hoje)
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {reservasPendentes.length} pendente(s)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Marque os clientes que você deseja notificar agora com link de acesso rápido ao app.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadReservasPendentes}
                disabled={loadingPendentes}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPendentes ? 'animate-spin' : ''}`} />
                Atualizar Lista
              </button>

              <button
                type="button"
                onClick={handleDispararManual}
                disabled={runningDisparo || selectedReservaIds.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {runningDisparo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando ({selectedReservaIds.length})...
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

          {reservasPendentes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhuma reserva pendente de confirmação encontrada para hoje. Todas estão confirmadas ou não há agendamentos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-8">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-slate-800"
                        title="Selecionar todos"
                      >
                        {selectedReservaIds.length > 0 && selectedReservaIds.length === reservasPendentes.filter(r => !!r.clienteTelefone).length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3">Embarcação</th>
                    <th className="py-2 px-3">Telefone</th>
                    <th className="py-2 px-3">Próximo Modelo a Enviar</th>
                    <th className="py-2 px-3">Tentativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservasPendentes.map((r) => {
                    const isSelected = selectedReservaIds.includes(r.id);
                    const hasPhone = !!r.clienteTelefone;
                    const boatCode = r.embarcacaoNumero ? `M${r.embarcacaoNumero}` : (r.embarcacaoNome || 'Embarcação');
                    const proximaTentativa = Number(r.tentativasConfirmacao || 0) + 1;
                    const proximoModelo = Math.min(proximaTentativa, 10);

                    return (
                      <tr
                        key={r.id}
                        onClick={() => hasPhone && toggleSelectReserva(r.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                        } ${!hasPhone ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!hasPhone}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.clienteNome || 'Cliente'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#186b77]">{boatCode}</span>
                          {r.embarcacaoNome && r.embarcacaoNumero && (
                            <span className="text-slate-400 text-[11px] ml-1">({r.embarcacaoNome})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {hasPhone ? r.clienteTelefone : <span className="text-red-500 text-[11px]">Sem telefone</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            Modelo {proximoModelo} ({proximaTentativa}º Envio)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {r.tentativasConfirmacao || 0} envio(s)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {lastDisparoResult && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Resultado do Último Disparo Manual:</div>
              <div>Mensagens enviadas com link: <span className="font-semibold text-emerald-600">{lastDisparoResult.disparos}</span></div>
            </div>
          )}
        </div>
      )}

      {/* 3. 10 MODELOS DE MENSAGENS DE CONFIRMAÇÃO PROGRESSIVAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                10 Modelos de Confirmação com Acesso Direto ao App
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada vez que o robô reenvia a mensagem, ele avança para o próximo modelo, evitando repetições robóticas e anexando o link do app.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetTemplates}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors shrink-0"
            title="Restaurar textos recomendados pela marina"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar 10 Textos Padrões
          </button>
        </div>

        {/* Seletor de Etapas (Abas de 1 a 10) */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {config.whatsapp_conf_templates_10.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTemplateIdx(idx)}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTemplateIdx === idx
                  ? 'bg-[#186b77] text-white shadow-xs'
                  : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <span>{idx + 1}º Envio</span>
            </button>
          ))}
        </div>

        {/* Título e Editor do Modelo Selecionado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Lado Esquerdo: Editor do Modelo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#186b77] uppercase tracking-wider">
                  Etapa {activeTemplateIdx + 1} de 10
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {DEFAULT_10_CONFIRMATION_TITLES[activeTemplateIdx]}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentTemplateText.length} caracteres
              </span>
            </div>

            <textarea
              rows={9}
              value={currentTemplateText}
              onChange={(e) => {
                const updated = [...config.whatsapp_conf_templates_10];
                updated[activeTemplateIdx] = e.target.value;
                setConfig(prev => ({ ...prev, whatsapp_conf_templates_10: updated }));
              }}
              className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186b77]/20 focus:border-[#186b77] text-slate-900 leading-relaxed"
            />

            {/* Tags dinâmicas clicáveis */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 text-[11px]">Tags dinâmicas disponíveis:</span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <code className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
                  {'{cliente}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
                  {'{barco}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
                  {'{quando}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
                  {'{data}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-bold">
                  {'{link}'} (Magic Link direto no app)
                </code>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-[#186b77] hover:bg-[#13545e] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Alterações dos 10 Modelos
              </button>
            </div>
          </div>

          {/* Lado Direito: Simulador Visual de WhatsApp no Celular */}
          <div className="bg-[#e5ddd5] rounded-2xl p-4 border border-slate-300 shadow-inner flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-black/10 pb-2 text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-800" />
                  Como o cliente recebe no WhatsApp (Modelo {activeTemplateIdx + 1})
                </span>
                <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded font-mono text-slate-600">
                  Prévia ao Vivo
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
                <span className="block text-right text-[10px] text-slate-400 mt-1">
                  08:00 ✓✓
                </span>
              </div>
            </div>

            {/* Teste de disparo direto */}
            <div className="mt-4 pt-3 border-t border-black/10 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                Disparar este modelo como teste no seu WhatsApp
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Magic Link autenticado gerado!
                    </span>
                    <a
                      href={lastTestMagicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      Abrir no Navegador ↗
                    </a>
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

      {/* 4. CONFIGURAÇÃO DE HORÁRIOS & GATILHO FINANCEIRO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD DE HORÁRIOS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#186b77]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Horários de Disparo Diários</h3>
                <p className="text-xs text-slate-500">Programação das rodadas matinais</p>
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

          <div className="flex flex-wrap gap-2">
            {config.notif_reservas_horarios.map((horario) => (
              <span
                key={horario}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm font-bold shadow-2xs"
              >
                ⏰ {horario}
                <button
                  type="button"
                  onClick={() => handleRemoveHorario(horario)}
                  className="text-teal-600 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                  title="Remover horário"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="time"
              value={novoHorario}
              onChange={(e) => setNovoHorario(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white text-slate-800"
            />
            <button
              type="button"
              onClick={handleAddHorario}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#186b77] hover:bg-[#13545e] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Horário
            </button>
          </div>
        </div>

        {/* CARD FINANCEIRO */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Notificação Financeira Automática</h3>
                <p className="text-xs text-slate-500">Avisa o cotista no WhatsApp com link PIX/Boleto</p>
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

          <textarea
            rows={4}
            value={config.notif_financeiro_template}
            onChange={(e) => setConfig(prev => ({ ...prev, notif_financeiro_template: e.target.value }))}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none text-slate-800"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar Template Financeiro
            </button>
          </div>
        </div>
      </div>

      {/* 5. HISTÓRICO E AUDITORIA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Histórico de Disparos de Notificações</h3>
              <p className="text-xs text-slate-500">Últimos envios com status de entrega e modelo utilizado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loadingLogs}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Recarregar Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhum disparo registrado ainda. Os envios aparecerão aqui.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">Slot / Horário</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = log.status === 'sucesso';
                  const dateFormatted = new Date(log.createdAt).toLocaleString('pt-BR');
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{dateFormatted}</td>
                      <td className="py-2.5 px-3">
                        {log.tipo === 'reserva_confirmacao' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            Reserva
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Financeiro
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{log.clienteNome || 'Cliente'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{log.telefone}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{log.horarioSlot || '-'}</td>
                      <td className="py-2.5 px-3">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Enviado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold" title={log.erro || ''}>
                            <AlertCircle className="w-3.5 h-3.5" /> Erro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
