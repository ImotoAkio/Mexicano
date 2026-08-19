import React, { useState, useEffect, useMemo } from 'react';
import { maintenanceDB, boatDB, clientDB } from '../../db';
import { Embarcacao, Cliente, Manutencao } from '../../types';
import { getHorimetroSettings, calcularStatusRevisao } from '../../utils/horimetroUtils';
import { 
  User, Users, ShieldAlert, Smartphone, UserCheck, QrCode, LogOut, CheckCircle, MessageSquare, Clock, Check, AlertTriangle, 
  RefreshCw, Search, Send, Wrench, Paperclip, Trash2, X, Sparkles
} from 'lucide-react';

const formatFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const firstName = fullName.trim().split(' ')[0];
  if (!firstName) return '';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PecasWhatsAppPage() {
  const [activeMainTab, setActiveMainTab] = useState<'maintenances' | 'engine_hours' | 'custom' | 'config'>('maintenances');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- TAB 1: MANUTENÇÕES & ORDENS DE SERVIÇO ---
  const [maintenances, setMaintenances] = useState<Manutencao[]>([]);
  const [maintSearch, setMaintSearch] = useState('');
  const [maintStatusFilter, setMaintStatusFilter] = useState<'todos' | 'pendente' | 'aguardando_peca' | 'em_andamento' | 'concluido'>('todos');
  const [maintSelectedIds, setMaintSelectedIds] = useState<string[]>([]);
  const [maintTemplateType, setMaintTemplateType] = useState<'inicio' | 'aprovacao' | 'conclusao'>('conclusao');

  const [maintTemplateInicio, setMaintTemplateInicio] = useState(() => {
    return localStorage.getItem('whatsapp_maint_template_inicio') || "Olá, *{cliente}*! 🛠️\nInformamos que os serviços de manutenção (*{servico}*) na sua embarcação *{barco}* foram iniciados pela nossa equipe de Peças & Serviços.";
  });

  const [maintTemplateAprovacao, setMaintTemplateAprovacao] = useState(() => {
    return localStorage.getItem('whatsapp_maint_template_aprovacao') || "Olá, *{cliente}*! ⏳\nA manutenção (*{servico}*) na embarcação *{barco}* necessita da sua aprovação do orçamento para prosseguimento. Por favor, entre em contato para autorização.";
  });

  const [maintTemplateConclusao, setMaintTemplateConclusao] = useState(() => {
    return localStorage.getItem('whatsapp_maint_template_conclusao') || "Olá, *{cliente}*! ✅\nInformamos que os serviços de manutenção (*{servico}*) na sua embarcação *{barco}* foram concluídos com sucesso! Ela já está pronta para uso.";
  });

  const [showMaintTemplateEditor, setShowMaintTemplateEditor] = useState(false);
  const [maintSendingStatus, setMaintSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [maintSendResults, setMaintSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});

  useEffect(() => {
    const list = maintenanceDB.getAll();
    setMaintenances(list);
  }, []);

  const handleSaveMaintTemplate = (type: 'inicio' | 'aprovacao' | 'conclusao', val: string) => {
    if (type === 'inicio') {
      setMaintTemplateInicio(val);
      localStorage.setItem('whatsapp_maint_template_inicio', val);
    } else if (type === 'aprovacao') {
      setMaintTemplateAprovacao(val);
      localStorage.setItem('whatsapp_maint_template_aprovacao', val);
    } else {
      setMaintTemplateConclusao(val);
      localStorage.setItem('whatsapp_maint_template_conclusao', val);
    }
  };

  const filteredMaintenances = maintenances.filter(m => {
    const boat = boatDB.getById(m.embarcacaoId);
    const client = m.clienteId ? clientDB.getById(m.clienteId) : null;
    const search = maintSearch.toLowerCase();

    const matchesSearch = !search || 
      (m.titulo && m.titulo.toLowerCase().includes(search)) ||
      (boat && boat.nome.toLowerCase().includes(search)) ||
      (boat && String(boat.numero).includes(search)) ||
      (client && client.nome.toLowerCase().includes(search));

    if (!matchesSearch) return false;

    if (maintStatusFilter !== 'todos') {
      if (maintStatusFilter === 'pendente' && m.status !== 'pendente') return false;
      if (maintStatusFilter === 'aguardando_peca' && m.status !== 'aguardando_peca') return false;
      if (maintStatusFilter === 'em_andamento' && m.status !== 'em_andamento') return false;
      if (maintStatusFilter === 'concluido' && m.status !== 'concluido') return false;
    }

    return true;
  });

  const visibleMaintWithTarget = filteredMaintenances.filter(m => {
    const boat = boatDB.getById(m.embarcacaoId);
    const client = m.clienteId ? clientDB.getById(m.clienteId) : null;
    const hasClientPhone = !!client?.telefone;
    const hasGroup = !!boat?.whatsappGroupId;
    const hasCotistaPhone = boat?.cotistas?.some(c => {
      const cl = clientDB.getById(c.clienteId);
      return !!cl?.telefone;
    });
    return hasClientPhone || hasGroup || hasCotistaPhone;
  }).map(m => m.id);

  const allMaintVisibleSelected = visibleMaintWithTarget.length > 0 && visibleMaintWithTarget.every(id => maintSelectedIds.includes(id));

  const handleMaintToggleSelect = (id: string) => {
    setMaintSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleMaintToggleSelectAll = () => {
    if (allMaintVisibleSelected) {
      setMaintSelectedIds(prev => prev.filter(id => !visibleMaintWithTarget.includes(id)));
    } else {
      const newSelection = new Set([...maintSelectedIds, ...visibleMaintWithTarget]);
      setMaintSelectedIds(Array.from(newSelection));
    }
  };

  const handleSendMaintNotifications = async () => {
    if (maintSelectedIds.length === 0) {
      showToast('Nenhuma manutenção selecionada.', 'error');
      return;
    }
    setMaintSendingStatus('sending');
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let currentTemplate = maintTemplateConclusao;
    if (maintTemplateType === 'inicio') currentTemplate = maintTemplateInicio;
    if (maintTemplateType === 'aprovacao') currentTemplate = maintTemplateAprovacao;

    for (const id of maintSelectedIds) {
      const maint = maintenances.find(m => m.id === id);
      if (!maint) continue;
      const boat = boatDB.getById(maint.embarcacaoId);
      const client = maint.clienteId ? clientDB.getById(maint.clienteId) : null;
      
      let targetNumber = client?.telefone;
      let recipientName = client?.nome ? formatFirstName(client.nome) : '';

      if (!targetNumber && boat?.whatsappGroupId) {
        targetNumber = boat.whatsappGroupId;
        recipientName = boat.nome;
      }

      if (!targetNumber && boat?.cotistas) {
        for (const c of boat.cotistas) {
          const cl = clientDB.getById(c.clienteId);
          if (cl?.telefone) {
            targetNumber = cl.telefone;
            recipientName = formatFirstName(cl.nome);
            break;
          }
        }
      }

      if (!targetNumber) continue;

      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';
      const text = currentTemplate
        .replace(/{cliente}/g, recipientName || 'Cotistas')
        .replace(/{barco}/g, boatCode)
        .replace(/{servico}/g, maint.titulo || 'Manutenção');

      setMaintSendResults(prev => ({ ...prev, [id]: 'sending' }));

      try {
        const response = await fetch('/api/whatsapp/send-text?instance=pecas_servicos', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: targetNumber, text })
        });
        if (!response.ok) throw new Error('Falha no envio');

        setMaintSendResults(prev => ({ ...prev, [id]: 'success' }));
      } catch (err) {
        setMaintSendResults(prev => ({ ...prev, [id]: 'error' }));
      }
      await sleep(3000);
    }
    setMaintSendingStatus('completed');
    showToast('Disparo de notificações concluído!', 'success');
  };

  // --- TAB 2: ALERTAS DE HORÍMETRO & REVISÕES ---
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [hoursSearch, setHoursSearch] = useState('');
  const [hoursBoatFilterId, setHoursBoatFilterId] = useState<string>('todas');
  const [hoursStatusFilter, setHoursStatusFilter] = useState<'todos' | 'vencido' | 'proximo' | 'ok'>('todos');
  const [hoursSelectedIds, setHoursSelectedIds] = useState<string[]>([]);

  const defaultHoursTemplate = "Olá, *{cliente}*! ⏰\nInformamos que a embarcação *{barco}* atingiu *{horimetro}h* de uso e será encaminhada para a manutenção preventiva. Qualquer dúvida, estamos à disposição!";
  
  const [hoursMessageTemplate, setHoursMessageTemplate] = useState(() => {
    return localStorage.getItem('whatsapp_hours_template') || defaultHoursTemplate;
  });

  const [hoursSendingStatus, setHoursSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [hoursSendResults, setHoursSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});

  useEffect(() => {
    setBoats(boatDB.getAll());
  }, []);

  const handleSaveHoursTemplate = (val: string) => {
    setHoursMessageTemplate(val);
    localStorage.setItem('whatsapp_hours_template', val);
  };

  const handleResetHoursTemplate = () => {
    setHoursMessageTemplate(defaultHoursTemplate);
    localStorage.setItem('whatsapp_hours_template', defaultHoursTemplate);
    showToast('Mensagem padrão restaurada!');
  };

  const horimetroSettings = getHorimetroSettings();

  // Map each boat to all of its cotistas/clients so every cotista can be selected/notified
  const boatCotistaList = useMemo(() => {
    const items: Array<{
      key: string;
      boat: Embarcacao;
      statusRevisao: ReturnType<typeof calcularStatusRevisao>;
      client: Cliente | null;
    }> = [];

    const allClients = clientDB.getAll();

    boats.forEach(b => {
      const statusRevisao = calcularStatusRevisao(b, maintenances, horimetroSettings);
      
      const clientMap = new Map<string, Cliente>();
      
      if (b.cotistas && b.cotistas.length > 0) {
        b.cotistas.forEach(c => {
          const found = allClients.find(cl => cl.id === c.clienteId);
          if (found) clientMap.set(found.id, found);
        });
      }

      allClients.forEach(c => {
        if (c.embarcacaoId === b.id || c.embarcacoes?.some(e => e.embarcacaoId === b.id)) {
          clientMap.set(c.id, c);
        }
      });

      const clientList = Array.from(clientMap.values());

      if (clientList.length > 0) {
        clientList.forEach(cl => {
          items.push({
            key: `${b.id}_${cl.id}`,
            boat: b,
            statusRevisao,
            client: cl
          });
        });
      } else {
        items.push({
          key: `${b.id}_none`,
          boat: b,
          statusRevisao,
          client: null
        });
      }
    });

    return items;
  }, [boats, maintenances, horimetroSettings]);

  const filteredBoatHours = boatCotistaList.filter(item => {
    if (hoursBoatFilterId !== 'todas' && item.boat.id !== hoursBoatFilterId) {
      return false;
    }

    const search = hoursSearch.toLowerCase();
    const boatCode = item.boat.numero ? `M${item.boat.numero}` : item.boat.nome;
    const matchesSearch = !search ||
      item.boat.nome.toLowerCase().includes(search) ||
      boatCode.toLowerCase().includes(search) ||
      (item.client && item.client.nome.toLowerCase().includes(search));

    if (!matchesSearch) return false;

    if (hoursStatusFilter === 'vencido' && item.statusRevisao.status !== 'vencido') return false;
    if (hoursStatusFilter === 'proximo' && item.statusRevisao.status !== 'proximo') return false;
    if (hoursStatusFilter === 'ok' && item.statusRevisao.status !== 'ok') return false;

    return true;
  });

  const visibleHoursWithPhone = filteredBoatHours
    .filter(item => !!item.client?.telefone)
    .map(item => item.key);

  const allHoursVisibleSelected = visibleHoursWithPhone.length > 0 && visibleHoursWithPhone.every(key => hoursSelectedIds.includes(key));

  const handleHoursToggleSelect = (key: string) => {
    setHoursSelectedIds(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleHoursToggleSelectAll = () => {
    if (allHoursVisibleSelected) {
      setHoursSelectedIds(prev => prev.filter(key => !visibleHoursWithPhone.includes(key)));
    } else {
      const newSelection = new Set([...hoursSelectedIds, ...visibleHoursWithPhone]);
      setHoursSelectedIds(Array.from(newSelection));
    }
  };

  const handleSendHoursNotifications = async () => {
    if (hoursSelectedIds.length === 0) {
      showToast('Nenhum cliente selecionado.', 'error');
      return;
    }
    setHoursSendingStatus('sending');
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (const key of hoursSelectedIds) {
      const item = boatCotistaList.find(i => i.key === key);
      if (!item || !item.client || !item.client.telefone) continue;

      const boatCode = item.boat.numero ? `M${item.boat.numero}` : item.boat.nome;
      const clientFirstName = item.client.nome ? formatFirstName(item.client.nome) : '';
      const text = hoursMessageTemplate
        .replace(/{cliente}/g, clientFirstName)
        .replace(/{barco}/g, boatCode)
        .replace(/{horimetro}/g, String(item.boat.horimetroActual || 0));

      setHoursSendResults(prev => ({ ...prev, [key]: 'sending' }));

      try {
        const response = await fetch('/api/whatsapp/send-text?instance=pecas_servicos', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: item.client.telefone, text })
        });
        if (!response.ok) throw new Error('Falha no envio');

        setHoursSendResults(prev => ({ ...prev, [key]: 'success' }));
      } catch (err) {
        setHoursSendResults(prev => ({ ...prev, [key]: 'error' }));
      }
      await sleep(3000);
    }
    setHoursSendingStatus('completed');
    showToast('Disparo de alertas de horímetro concluído!', 'success');
  };

  // --- TAB 3: COMUNICADOS DE OFICINA & ENVIO AVULSO ---
  const [clients, setClients] = useState<Cliente[]>([]);
  const setClientsFiltered = (allClients: Cliente[]) => {
    setClients(allClients.filter(c => !c.nome.toLowerCase().includes('vila nautica')));
  };

  const [customTargetType, setCustomTargetType] = useState<'clients' | 'groups' | 'custom_number'>('clients');
  const [customSearch, setCustomSearch] = useState('');
  
  const [customSelectedClientIds, setCustomSelectedClientIds] = useState<string[]>([]);
  const [customSelectedGroupIds, setCustomSelectedGroupIds] = useState<string[]>([]);
  const [customManualNumbers, setCustomManualNumbers] = useState<string>('');
  
  const [customText, setCustomText] = useState('');
  const [customMedia, setCustomMedia] = useState<{ base64: string; mimetype: string; fileName: string } | null>(null);
  
  const [customTemplates, setCustomTemplates] = useState<Array<{ id: string; title: string; text: string }>>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_custom_templates_pecas');
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'Aviso de Manutenção Programada', text: 'Prezado(a) *{cliente}*,\n\nInformamos que a embarcação *{barco}* passará por manutenção preventiva no período de ...\n\nQualquer dúvida estamos à disposição! 🛠️' },
        { id: '2', title: 'Solicitação de Peças / Orçamento', text: 'Atenção cotistas da embarcação *{barco}* ⚠️\n\nO orçamento para a substituição de peças está disponível para aprovação.\n\nAgradecemos a confirmação!' }
      ];
    } catch {
      return [];
    }
  });

  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  const [customDelaySeconds] = useState<number>(3);
  const [customSendingStatus, setCustomSendingStatus] = useState<'idle' | 'sending' | 'paused' | 'completed'>('idle');
  const [customSendQueue, setCustomSendQueue] = useState<Array<{
    id: string;
    name: string;
    target: string;
    status: 'pending' | 'sending' | 'success' | 'error';
    error?: string;
  }>>([]);
  const [cancelSendingRef] = useState<boolean>(false);

  const handleSaveCustomTemplate = () => {
    if (!newTemplateTitle.trim() || !customText.trim()) {
      showToast('Preencha o título e o texto da mensagem.', 'error');
      return;
    }
    const newT = { id: Date.now().toString(), title: newTemplateTitle.trim(), text: customText };
    const updated = [...customTemplates, newT];
    setCustomTemplates(updated);
    localStorage.setItem('whatsapp_custom_templates_pecas', JSON.stringify(updated));
    setNewTemplateTitle('');
    setShowSaveTemplateModal(false);
    showToast('Modelo salvo com sucesso!');
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('whatsapp_custom_templates_pecas', JSON.stringify(updated));
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

  const filteredCustomClients = clients.filter(c => {
    if (!c.telefone) return false;
    if (customSearch) {
      const s = customSearch.toLowerCase();
      const matchName = c.nome.toLowerCase().includes(s);
      const matchPhone = c.telefone.includes(s);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleToggleSelectClient = (id: string) => {
    setCustomSelectedClientIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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

  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});

  const allAvailableGroupsList = () => {
    const list: Array<{ id: string; name: string; boatName?: string }> = [];
    boats.forEach(b => {
      if (b.whatsappGroupId) {
        list.push({
          id: b.whatsappGroupId,
          name: `Grupo ${b.nome} (${b.numero ? 'M' + b.numero : 'Lancha'})`,
          boatName: b.nome
        });
      }
    });
    availableGroups.forEach(g => {
      if (g.id && !list.some(l => l.id === g.id)) {
        list.push({
          id: g.id,
          name: g.subject || g.name || g.id
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
    setCustomSelectedGroupIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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

    const queue: Array<{ id: string; name: string; target: string; status: 'pending' | 'sending' | 'success' | 'error' }> = [];

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
            status: 'pending'
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
    setCustomSendingStatus('sending');
    startCustomSendLoop(queue);
  };

  const startCustomSendLoop = async (initialQueue: typeof customSendQueue) => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (let i = 0; i < initialQueue.length; i++) {
      if (cancelSendingRef) break;
      const item = initialQueue[i];

      let finalMsg = customText;
      if (item.name) {
        const firstName = formatFirstName(item.name);
        finalMsg = finalMsg.replace(/{cliente}/g, firstName).replace(/{barco}/g, 'Vila Náutica');
      }

      setCustomSendQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'sending' } : q));

      try {
        const res = await fetch('/api/whatsapp/send-custom?instance=pecas_servicos', {
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

      if (i < initialQueue.length - 1) {
        await sleep(customDelaySeconds * 1000);
      }
    }

    setCustomSendingStatus('completed');
    showToast('Processo de disparo concluído!', 'success');
  };

  // --- TAB 4: CONFIGURAÇÕES & CONEXÃO ---
  const [activeTab, setActiveTab] = useState<'conta' | 'contatos' | 'grupos'>('conta');
  const [waStatus, setWaStatus] = useState<string>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [isFetchingWaStatus, setIsFetchingWaStatus] = useState(false);

  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [activeContactsTab, setActiveContactsTab] = useState<'todos' | 'sem_telefone' | 'vinculados'>('sem_telefone');
  const [clientSearch, setClientSearch] = useState('');
  const [activeManualSyncClientId, setActiveManualSyncClientId] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState('');

  const fetchWaQrCode = async () => {
    setIsFetchingWaStatus(true);
    try {
      let res = await fetch('/api/whatsapp/connect?instance=pecas_servicos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      let data = await res.json();
      let qr = data?.base64 || data?.qrcode?.base64 || data?.code;

      if (!qr) {
        const msgLower = (data?.message || '').toLowerCase();
        if (data?.error || msgLower.includes('not found') || msgLower.includes('404') || msgLower.includes('502') || data?.instance?.state === 'not_created') {
          showToast('Criando instância pecas_servicos no WhatsApp...', 'success');
          const createRes = await fetch('/api/whatsapp/instance/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ instanceName: 'pecas_servicos' })
          });
          
          if (createRes.ok) {
            await sleep(2000);
            res = await fetch('/api/whatsapp/connect?instance=pecas_servicos', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            data = await res.json();
            qr = data?.base64 || data?.qrcode?.base64 || data?.code;
          }
        }
      }

      if (qr) {
        setWaQrCode(qr);
        setWaStatus('connecting');
        showToast('QR Code gerado com sucesso! Escaneie pelo WhatsApp.', 'success');
      } else if (data?.instance?.state === 'open') {
        setWaStatus('open');
        setWaQrCode(null);
        showToast('WhatsApp já está conectado!', 'success');
      } else {
        showToast(data?.message || 'Não foi possível obter o QR Code. Tente novamente.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro de conexão ao gerar QR Code.', 'error');
    } finally {
      setIsFetchingWaStatus(false);
    }
  };

  const fetchWaStatus = async () => {
    setIsFetchingWaStatus(true);
    try {
      const res = await fetch('/api/whatsapp/status?instance=pecas_servicos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      const state = data?.instance?.state || 'close';
      setWaStatus(state);
      if (state !== 'open') {
        await fetchWaQrCode();
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

  const handleWaLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout?instance=pecas_servicos', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
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
      const res = await fetch('/api/whatsapp/groups?instance=pecas_servicos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setAvailableGroups(data.groups);
        const newMapping: Record<string, string> = {};
        for (const b of boats) {
          if (b.whatsappGroupId) newMapping[b.id] = b.whatsappGroupId;
        }
        setMappingState(newMapping);
        showToast(`${data.groups.length} grupos carregados.`);
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
      const res = await fetch('/api/whatsapp/contacts?instance=pecas_servicos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              WhatsApp - Peças & Serviços
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Instância pecas_servicos</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Notifique clientes e cotistas sobre status de Manutenções, Ordens de Serviço, Revisões Preventivas de Horímetro e Comunicados Técnicos.
            </p>
          </div>
        </div>

        {/* STATUS BADGE */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
          <span className="relative flex h-2.5 w-2.5 ml-1">
            {waStatus === 'open' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            )}
          </span>
          <span className="text-xs font-bold text-slate-700">
            {waStatus === 'open' ? 'WhatsApp Conectado' : isFetchingWaStatus ? 'Buscando conexão...' : 'WhatsApp Desconectado'}
          </span>
          {waStatus !== 'open' && (
            <button
              onClick={() => setActiveMainTab('config')}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline ml-1 cursor-pointer"
            >
              Conectar
            </button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto subtle-scrollbar">
        <button
          onClick={() => setActiveMainTab('maintenances')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'maintenances'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Manutenções & O.S.
        </button>

        <button
          onClick={() => setActiveMainTab('engine_hours')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'engine_hours'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Alertas de Horímetro
        </button>

        <button
          onClick={() => setActiveMainTab('custom')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'custom'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          Comunicados de Oficina
        </button>

        <button
          onClick={() => setActiveMainTab('config')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'config'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Configurações & Conexão
        </button>
      </div>

      {/* TAB CONTENT 1: MANUTENÇÕES & ORDENS DE SERVIÇO */}
      {activeMainTab === 'maintenances' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                Notificações de Ordens de Serviço (O.S.)
              </h3>
              <p className="text-xs text-slate-500">
                Selecione as manutenções em aberto ou concluídas para avisar os clientes sobre o andamento e liberação do serviço.
              </p>
            </div>

            <button
              onClick={() => setShowMaintTemplateEditor(!showMaintTemplateEditor)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start lg:self-auto"
            >
              <MessageSquare className="w-4 h-4" />
              {showMaintTemplateEditor ? 'Ocultar Modelos' : 'Editar Modelos de O.S.'}
            </button>
          </div>

          {/* TEMPLATE EDITOR FOR MAINTENANCE */}
          {showMaintTemplateEditor && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">1. Início da Manutenção</label>
                <textarea
                  value={maintTemplateInicio}
                  onChange={e => handleSaveMaintTemplate('inicio', e.target.value)}
                  rows={4}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">2. Aguardando Aprovação / Peça</label>
                <textarea
                  value={maintTemplateAprovacao}
                  onChange={e => handleSaveMaintTemplate('aprovacao', e.target.value)}
                  rows={4}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">3. Conclusão / Pronta para Uso</label>
                <textarea
                  value={maintTemplateConclusao}
                  onChange={e => handleSaveMaintTemplate('conclusao', e.target.value)}
                  rows={4}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                />
              </div>

              <div className="md:col-span-3 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Variáveis dinâmicas:</span>
                <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{cliente}'}</code> (Primeiro nome)</span>
                <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Código da embarcação)</span>
                <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{servico}'}</code> (Título da O.S. / Manutenção)</span>
              </div>
            </div>
          )}

          {/* FILTERS & TEMPLATE TYPE SELECTION */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Tipo de Notificação:</span>
              <button
                onClick={() => setMaintTemplateType('inicio')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  maintTemplateType === 'inicio' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                🛠️ Início de Serviço
              </button>
              <button
                onClick={() => setMaintTemplateType('aprovacao')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  maintTemplateType === 'aprovacao' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                ⏳ Aguardando Aprovação
              </button>
              <button
                onClick={() => setMaintTemplateType('conclusao')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  maintTemplateType === 'conclusao' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                ✅ Serviço Concluído
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por barco, cliente ou título..."
                  value={maintSearch}
                  onChange={e => setMaintSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <select
                value={maintStatusFilter}
                onChange={e => setMaintStatusFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">Pendente</option>
                <option value="aguardando_peca">Aguardando Peça</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <button
              onClick={handleMaintToggleSelectAll}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {allMaintVisibleSelected ? 'Desmarcar Todos' : 'Selecionar Todos Filtrados'}
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              {maintSelectedIds.length} manutenções selecionadas
            </span>
          </div>

          {/* LIST OF MAINTENANCES */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
            {filteredMaintenances.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhuma manutenção encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredMaintenances.map(maint => {
                const boat = boatDB.getById(maint.embarcacaoId);
                const client = maint.clienteId ? clientDB.getById(maint.clienteId) : null;
                const boatGroup = boat?.whatsappGroupId;
                const cotistaWithPhone = boat?.cotistas?.map(c => clientDB.getById(c.clienteId)).find(cl => !!cl?.telefone);
                
                const hasDestination = !!client?.telefone || !!boatGroup || !!cotistaWithPhone;
                const isSelected = maintSelectedIds.includes(maint.id);
                const statusResult = maintSendResults[maint.id] || 'pending';
                const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';

                return (
                  <div
                    key={maint.id}
                    onClick={() => hasDestination && maintSendingStatus !== 'sending' && handleMaintToggleSelect(maint.id)}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isSelected ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    } ${!hasDestination ? 'opacity-60 bg-slate-100 grayscale' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        disabled={!hasDestination || maintSendingStatus === 'sending'}
                        className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono">{boatCode}</span>
                          <span className="font-bold text-sm text-slate-900">{maint.titulo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            maint.status === 'concluido' ? 'bg-emerald-100 text-emerald-800' :
                            maint.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                            maint.status === 'aguardando_peca' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {maint.status ? maint.status.replace('_', ' ') : 'Pendente'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {client?.telefone ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              Cliente: <span className="text-slate-900">{client.nome}</span> ({client.telefone})
                            </span>
                          ) : boatGroup ? (
                            <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-emerald-700" />
                              Grupo da Embarcação ({boat?.nome})
                            </span>
                          ) : cotistaWithPhone ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              Cotista: <span className="text-slate-900">{cotistaWithPhone.nome}</span> ({cotistaWithPhone.telefone})
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Sem WhatsApp (Cadastre o cliente ou vincule um Grupo à embarcação)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold self-end sm:self-center">
                      {statusResult === 'sending' && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                        </span>
                      )}
                      {statusResult === 'success' && (
                        <span className="text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          ✓ Enviado
                        </span>
                      )}
                      {statusResult === 'error' && (
                        <span className="text-rose-600 bg-rose-100 px-2.5 py-1 rounded-lg">
                          ✕ Erro
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleSendMaintNotifications}
              disabled={maintSendingStatus === 'sending' || maintSelectedIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {maintSendingStatus === 'sending' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Disparando para {maintSelectedIds.length} clientes...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Disparar para {maintSelectedIds.length} Manutenções
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ALERTAS DE HORÍMETRO */}
      {activeMainTab === 'engine_hours' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Alertas de Horímetro & Revisões Preventivas
              </h3>
              <p className="text-xs text-slate-500">
                Envie avisos preventivos para proprietários e cotistas sobre a necessidade de troca de óleo e encaminhamento da embarcação para manutenção.
              </p>
            </div>
          </div>

          {/* TEMPLATE EDITOR FOR HOURS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700">Modelo da Mensagem de Alerta de Horímetro</label>
              <button
                onClick={handleResetHoursTemplate}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Restaurar Mensagem Padrão
              </button>
            </div>
            <textarea
              value={hoursMessageTemplate}
              onChange={e => handleSaveHoursTemplate(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
            />
            <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-bold text-slate-700">Variáveis dinâmicas:</span>
              <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{cliente}'}</code> (Primeiro nome)</span>
              <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Código da embarcação)</span>
              <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{horimetro}'}</code> (Horas de motor acumuladas)</span>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Embarcação:</span>
                <select
                  value={hoursBoatFilterId}
                  onChange={e => setHoursBoatFilterId(e.target.value)}
                  className="text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="todas">Todas as Embarcações ({boats.length})</option>
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.numero ? `M${b.numero} - ` : ''}{b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Status:</span>
                <button
                  onClick={() => setHoursStatusFilter('todos')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    hoursStatusFilter === 'todos' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setHoursStatusFilter('vencido')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    hoursStatusFilter === 'vencido' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  ⚠️ Vencidas
                </button>
                <button
                  onClick={() => setHoursStatusFilter('proximo')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    hoursStatusFilter === 'proximo' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  ⏳ Próximas
                </button>
                <button
                  onClick={() => setHoursStatusFilter('ok')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    hoursStatusFilter === 'ok' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  ✅ Ok
                </button>
              </div>
            </div>

            <div className="relative flex-1 lg:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por barco ou cotista..."
                value={hoursSearch}
                onChange={e => setHoursSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <button
              onClick={handleHoursToggleSelectAll}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {allHoursVisibleSelected ? 'Desmarcar Todos' : 'Selecionar Todos Filtrados'}
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              {hoursSelectedIds.length} clientes selecionados
            </span>
          </div>

          {/* LIST OF BOATS & HOURS */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
            {filteredBoatHours.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhuma embarcação ou cotista encontrado neste filtro.
              </div>
            ) : (
              filteredBoatHours.map(item => {
                const boatCode = item.boat.numero ? `M${item.boat.numero}` : item.boat.nome;
                const hasPhone = !!item.client?.telefone;
                const isSelected = hoursSelectedIds.includes(item.key);
                const statusResult = hoursSendResults[item.key] || 'pending';
                const statusRev = item.statusRevisao;

                return (
                  <div
                    key={item.key}
                    onClick={() => hasPhone && hoursSendingStatus !== 'sending' && handleHoursToggleSelect(item.key)}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isSelected ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    } ${!hasPhone ? 'opacity-60 bg-slate-100 grayscale' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        disabled={!hasPhone || hoursSendingStatus === 'sending'}
                        className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono">{boatCode}</span>
                          <span className="font-bold text-sm text-slate-900">{item.boat.nome}</span>
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {item.boat.horimetroActual || 0} hrs
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            statusRev.status === 'vencido' ? 'bg-rose-100 text-rose-800' :
                            statusRev.status === 'proximo' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {statusRev.mensagem}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">Cotista/Cliente: {item.client?.nome || 'Sem cadastro'}</span>
                          {hasPhone ? (
                            <span className="text-emerald-700 font-semibold">{item.client?.telefone}</span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Sem WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold self-end sm:self-center">
                      {statusResult === 'sending' && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                        </span>
                      )}
                      {statusResult === 'success' && (
                        <span className="text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          ✓ Enviado
                        </span>
                      )}
                      {statusResult === 'error' && (
                        <span className="text-rose-600 bg-rose-100 px-2.5 py-1 rounded-lg">
                          ✕ Erro
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleSendHoursNotifications}
              disabled={hoursSendingStatus === 'sending' || hoursSelectedIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {hoursSendingStatus === 'sending' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Disparando alertas...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Disparar Alerta para {hoursSelectedIds.length} Clientes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: COMUNICADOS DE OFICINA & ENVIO AVULSO */}
      {activeMainTab === 'custom' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Comunicados de Oficina & Envio Avulso
              </h3>
              <p className="text-xs text-slate-500">
                Dispare comunicados personalizados para grupos de cotistas das embarcações ou mensagens avulsas com anexo de relatórios/PDFs.
              </p>
            </div>

            <button
              onClick={() => setShowSaveTemplateModal(true)}
              className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start lg:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              Salvar como Modelo
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: MESSAGE COMPOSER & ATTACHMENTS */}
            <div className="lg:col-span-7 space-y-4">
              {/* SAVED TEMPLATES */}
              {customTemplates.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Modelos Salvos de Peças & Serviços</label>
                  <div className="flex flex-wrap gap-2">
                    {customTemplates.map(t => (
                      <div key={t.id} className="group relative flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-xl px-3 py-1.5 transition-colors">
                        <button
                          onClick={() => setCustomText(t.text)}
                          className="text-xs font-semibold text-slate-800 text-left pr-4 cursor-pointer"
                        >
                          {t.title}
                        </button>
                        <button
                          onClick={() => handleDeleteCustomTemplate(t.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                          title="Remover modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MESSAGE TEXTAREA */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700">Texto da Mensagem</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomText(prev => prev + '{cliente}')}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-700 cursor-pointer"
                    >
                      +{'{cliente}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomText(prev => prev + '{barco}')}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-700 cursor-pointer"
                    >
                      +{'{barco}'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  rows={6}
                  placeholder="Escreva aqui sua mensagem de peças ou serviços..."
                  className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                />
              </div>

              {/* ATTACHMENT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Anexo (Fotos de Peças, Orçamentos em PDF)</label>
                {customMedia ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900">{customMedia.fileName}</span>
                    </div>
                    <button onClick={handleClearCustomMedia} className="text-xs text-rose-600 font-bold hover:underline cursor-pointer">
                      Remover
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 rounded-xl cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Clique para anexar um arquivo (máx. 10MB)</span>
                    <input type="file" onChange={handleCustomMediaUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: RECIPIENT SELECTION */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <label className="block text-xs font-bold text-slate-700">Destinatários</label>
              
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCustomTargetType('clients')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    customTargetType === 'clients' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Clientes
                </button>
                <button
                  onClick={() => setCustomTargetType('groups')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    customTargetType === 'groups' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Grupos de Cotistas
                </button>
                <button
                  onClick={() => setCustomTargetType('custom_number')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    customTargetType === 'custom_number' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Número Avulso
                </button>
              </div>

              {/* CLIENTS RECIPIENTS */}
              {customTargetType === 'clients' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={customSearch}
                        onChange={e => setCustomSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <select
                      value={customClientFilterBoatId}
                      onChange={e => setCustomClientFilterBoatId(e.target.value)}
                      className="text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 max-w-[140px]"
                    >
                      <option value="all">Todas as Embarcações</option>
                      {boats.map(b => (
                        <option key={b.id} value={b.id}>{b.numero ? `M${b.numero} - ` : ''}{b.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={handleToggleSelectAllClients} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer">
                      <Check className="w-3.5 h-3.5" />
                      {filteredCustomClients.length > 0 && filteredCustomClients.every(c => customSelectedClientIds.includes(c.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {customSelectedClientIds.length} selecionados
                    </span>
                  </div>

                  {/* REMOVABLE CHIPS LIST OF SELECTED CLIENTS */}
                  {customSelectedClientIds.length > 0 && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span>Clientes Selecionados ({customSelectedClientIds.length}):</span>
                        <button onClick={() => setCustomSelectedClientIds([])} className="text-rose-600 hover:underline cursor-pointer">Limpar tudo</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto subtle-scrollbar">
                        {customSelectedClientIds.map(id => {
                          const c = clients.find(cl => cl.id === id);
                          if (!c) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg shadow-2xs">
                              {c.nome}
                              <button onClick={(e) => { e.stopPropagation(); handleToggleSelectClient(id); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl divide-y divide-slate-100 p-1 space-y-1">
                    {filteredCustomClients.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">Nenhum cliente encontrado.</div>
                    ) : (
                      filteredCustomClients.map(c => {
                        const isSel = customSelectedClientIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleSelectClient(c.id)}
                            className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all border ${
                              isSel 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs' 
                                : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isSel ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-semibold">{c.nome}</span>
                            </div>
                            <span className={`text-[11px] ${isSel ? 'text-emerald-800 font-bold' : 'text-slate-500'}`}>{c.telefone}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* GROUPS RECIPIENTS */}
              {customTargetType === 'groups' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar grupo..."
                      value={customSearch}
                      onChange={e => setCustomSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={handleToggleSelectAllGroups} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer">
                      <Check className="w-3.5 h-3.5" />
                      {filteredCustomGroups.length > 0 && filteredCustomGroups.every(g => customSelectedGroupIds.includes(g.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {customSelectedGroupIds.length} selecionados
                    </span>
                  </div>

                  {/* REMOVABLE CHIPS LIST OF SELECTED GROUPS */}
                  {customSelectedGroupIds.length > 0 && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span>Grupos Selecionados ({customSelectedGroupIds.length}):</span>
                        <button onClick={() => setCustomSelectedGroupIds([])} className="text-rose-600 hover:underline cursor-pointer">Limpar tudo</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto subtle-scrollbar">
                        {customSelectedGroupIds.map(id => {
                          const g = allAvailableGroupsList().find(gr => gr.id === id);
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg shadow-2xs">
                              {g ? g.name : id}
                              <button onClick={(e) => { e.stopPropagation(); handleToggleSelectGroup(id); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-xl divide-y divide-slate-100 p-1 space-y-1">
                    {filteredCustomGroups.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">Nenhum grupo encontrado.</div>
                    ) : (
                      filteredCustomGroups.map(g => {
                        const isSel = customSelectedGroupIds.includes(g.id);
                        return (
                          <div
                            key={g.id}
                            onClick={() => handleToggleSelectGroup(g.id)}
                            className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all border ${
                              isSel 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs' 
                                : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isSel ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-semibold">{g.name}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL NUMBER */}
              {customTargetType === 'custom_number' && (
                <div className="space-y-2">
                  <textarea
                    value={customManualNumbers}
                    onChange={e => setCustomManualNumbers(e.target.value)}
                    rows={5}
                    placeholder="Digite os números separados por vírgula ou linha (ex: 61999998888)..."
                    className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              )}

              <button
                onClick={handlePrepareCustomSend}
                disabled={customSendingStatus === 'sending'}
                className="mt-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Disparar Comunicado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CONFIGURAÇÕES & CONEXÃO */}
      {activeMainTab === 'config' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col h-full overflow-hidden">
          <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4">
            <button
              onClick={() => setActiveTab('conta')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'conta' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Status da Conta
            </button>
            <button
              onClick={() => setActiveTab('grupos')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'grupos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Sincronizar Grupos
            </button>
            <button
              onClick={() => setActiveTab('contatos')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'contatos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Sincronizar Contatos
            </button>
          </div>

          {/* CONTA / QR CODE */}
          {activeTab === 'conta' && (
            <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center">
              {isFetchingWaStatus ? (
                <div className="text-center space-y-4 py-8">
                  <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Conectando ao WhatsApp...</p>
                </div>
              ) : waStatus === 'open' ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">WhatsApp Conectado</h4>
                    <p className="text-sm text-slate-500">A API Evolution está pronta para enviar e receber mensagens (Instância: pecas_servicos).</p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button onClick={fetchWaStatus} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer">
                      <RefreshCw className="w-4 h-4" /> Verificar Status
                    </button>
                    <button onClick={handleWaLogout} className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" /> Desconectar
                    </button>
                  </div>
                </div>
              ) : waQrCode ? (
                <div className="text-center space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Conectar WhatsApp</h4>
                    <p className="text-sm text-slate-500">Abra o WhatsApp no celular, vá em <strong>Aparelhos Conectados</strong> e escaneie o código abaixo:</p>
                  </div>
                  <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-200 inline-block">
                    <img
                      src={waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <div className="flex justify-center items-center gap-4">
                    <button onClick={fetchWaStatus} disabled={isFetchingWaStatus} className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWaStatus ? 'animate-spin' : ''}`} /> Atualizar Status
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={fetchWaQrCode} disabled={isFetchingWaStatus} className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">
                      Gerar Novo QR Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">WhatsApp Desconectado</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">Clique no botão abaixo para criar a sessão e obter o QR Code de autenticação.</p>
                  <button
                    onClick={fetchWaQrCode}
                    disabled={isFetchingWaStatus}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto cursor-pointer transition-all shadow-sm"
                  >
                    {isFetchingWaStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    {isFetchingWaStatus ? 'Gerando QR Code...' : 'Gerar Novo QR Code'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GRUPOS */}
          {activeTab === 'grupos' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Associe as embarcações aos grupos do WhatsApp encontrados na Evolution API para disparo de comunicados.</p>
                <button onClick={handleFetchGroups} disabled={isFetchingGroups} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer">
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
                          {availableGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.subject || g.name || g.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveGroupMapping} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer">
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

          {/* CONTATOS */}
          {activeTab === 'contatos' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                  <button onClick={() => setActiveContactsTab('sem_telefone')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${activeContactsTab === 'sem_telefone' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Sem WhatsApp</button>
                  <button onClick={() => setActiveContactsTab('vinculados')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${activeContactsTab === 'vinculados' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Mapeados</button>
                  <button onClick={() => setActiveContactsTab('todos')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${activeContactsTab === 'todos' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Todos</button>
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
                  <button onClick={fetchWhatsAppContactsList} disabled={isFetchingContacts} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
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
                              <button onClick={() => handleUnlinkPhone(client.id)} className="text-[11px] text-rose-600 font-medium cursor-pointer">Remover</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                              {activeManualSyncClientId === client.id ? (
                                <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Buscar contato..."
                                    value={contactQuery}
                                    onChange={(e) => setContactQuery(e.target.value)}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                                    autoFocus
                                  />
                                  <button onClick={() => { setActiveManualSyncClientId(null); setContactQuery(''); }} className="text-[10px] text-slate-400 px-1 py-1 cursor-pointer">Cancelar</button>
                                  {contactQuery.trim().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-40 divide-y divide-slate-100 subtle-scrollbar">
                                      {whatsAppContacts.filter(c => (c.pushName && c.pushName.toLowerCase().includes(contactQuery.toLowerCase())) || c.remoteJid.includes(contactQuery)).slice(0, 10).map(contact => (
                                        <button
                                          key={contact.id}
                                          onClick={() => { handleLinkPhone(client.id, contact.remoteJid.split('@')[0]); setActiveManualSyncClientId(null); setContactQuery(''); }}
                                          className="w-full text-left p-2 hover:bg-slate-50 text-[11px] transition-colors flex flex-col cursor-pointer"
                                        >
                                          <span className="font-semibold text-slate-950">{contact.pushName || 'Sem Nome'}</span>
                                          <span className="text-[9px] text-slate-400 font-mono">{formatPhoneNumber(contact.remoteJid)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button onClick={() => { setActiveManualSyncClientId(client.id); setContactQuery(''); }} className="text-[11px] text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer">
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

      {/* SAVE TEMPLATE MODAL */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Salvar como Modelo de Oficina</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Modelo</label>
              <input
                type="text"
                placeholder="Ex: Comunicado de Manutenção Preventiva"
                value={newTemplateTitle}
                onChange={e => setNewTemplateTitle(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomTemplate}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
