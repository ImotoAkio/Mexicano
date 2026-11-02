import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  TrendingUp,
  Bell,
  Monitor,
  Keyboard,
  Check,
  RotateCcw,
  Sliders,
  DollarSign,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface ComercialSettings {
  nome: string;
  telefone: string;
  cargo: string;
  email?: string;
  metaMensalFaturamento: number;
  faturamentoAtual: number;
  metaNovosContratos: number;
  metaNovosLeads: number;
  metaVisitas?: number;
  metaPropostas?: number;
  metaIndividualVendedor?: number;
  diasAlertaVencimento: number;
  notificarNovosLeads: boolean;
  notificarPropostasSemResposta: boolean;
  notificarContratosPendentes: boolean;
  somNotificacoes: boolean;
  sidebarColapsadaPadrao: boolean;
  densidadeTabelas: 'confortavel' | 'compacta';
  ocultarValoresDashboard: boolean;
  tema?: 'light' | 'dark';
}

export const DEFAULT_COMERCIAL_SETTINGS: ComercialSettings = {
  nome: '',
  telefone: '',
  cargo: 'Comercial Mexicano',
  metaMensalFaturamento: 600000,
  faturamentoAtual: 0,
  metaNovosContratos: 20,
  metaNovosLeads: 100,
  metaVisitas: 30,
  metaPropostas: 50,
  metaIndividualVendedor: 250000,
  diasAlertaVencimento: 30,
  notificarNovosLeads: true,
  notificarPropostasSemResposta: true,
  notificarContratosPendentes: true,
  somNotificacoes: true,
  sidebarColapsadaPadrao: false,
  densidadeTabelas: 'confortavel',
  ocultarValoresDashboard: false,
  tema: 'light',
};

const STORAGE_KEY = 'comercial_user_settings';

export function playNotificationBeep(force = false): void {
  try {
    const current = loadComercialSettings();
    if (!force && !current.somNotificacoes) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primeiro tom suave (E5 -> 659.25Hz) e segundo tom (A5 -> 880Hz)
    const freqs = [659.25, 880];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.2);
    });
  } catch {
    // Ignorar se o navegador bloquear autoplay de áudio
  }
}

export function syncThemeWithDOM(tema?: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const isDark = tema === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function loadComercialSettings(): ComercialSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const adminName = localStorage.getItem('admin_name') || localStorage.getItem('admin_username');

    // Remove valor padrão mock antigo de telefone '(11) 98765-4321' para iniciar em branco
    let telefone = parsed.telefone ?? '';
    if (telefone === '(11) 98765-4321') {
      telefone = '';
    }

    const settings: ComercialSettings = {
      ...DEFAULT_COMERCIAL_SETTINGS,
      ...(adminName ? { nome: adminName } : {}),
      ...parsed,
      telefone,
    };

    // Remove email da persistência se houver
    if ('email' in settings) {
      delete (settings as any).email;
    }

    syncThemeWithDOM(settings.tema);
    return settings;
  } catch {
    return DEFAULT_COMERCIAL_SETTINGS;
  }
}

export function saveComercialSettings(settings: ComercialSettings): void {
  try {
    const cleaned = { ...settings };
    delete cleaned.email;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    if (settings.nome) {
      localStorage.setItem('admin_name', settings.nome);
    }
    localStorage.setItem('comercial_sidebar_collapsed', String(Boolean(settings.sidebarColapsadaPadrao)));
    syncThemeWithDOM(settings.tema);
    window.dispatchEvent(new CustomEvent('comercial-settings-updated', { detail: cleaned }));
  } catch (err) {
    console.error('Erro ao salvar configurações do Comercial:', err);
  }
}

export function updateComercialSettings(partial: Partial<ComercialSettings>): ComercialSettings {
  const next = { ...loadComercialSettings(), ...partial };
  saveComercialSettings(next);
  return next;
}

export function useComercialSettings(): [ComercialSettings, (partial: Partial<ComercialSettings>) => void] {
  const [settings, setSettingsState] = useState<ComercialSettings>(() => loadComercialSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ComercialSettings>;
      if (custom.detail) {
        setSettingsState({ ...DEFAULT_COMERCIAL_SETTINGS, ...custom.detail });
      } else {
        setSettingsState(loadComercialSettings());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setSettingsState(loadComercialSettings());
      }
    };
    window.addEventListener('comercial-settings-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('comercial-settings-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const update = (partial: Partial<ComercialSettings>) => {
    const updated = updateComercialSettings(partial);
    setSettingsState(updated);
  };

  return [settings, update];
}

interface ComercialSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos';
  onNavigateShortcut?: (target: string) => void;
}

export default function ComercialSettingsModal({
  isOpen,
  onClose,
  initialTab = 'perfil',
  onNavigateShortcut,
}: ComercialSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos'>(initialTab);
  const [settings, setSettings] = useState<ComercialSettings>(loadComercialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados de Redefinição de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  // Identificação do Usuário e Papel
  const userRole = (
    (typeof window !== 'undefined' ? localStorage.getItem('admin_role') : '') || ''
  ).toLowerCase().trim();
  const isAdmin = userRole === 'admin';
  const username = (
    (typeof window !== 'undefined' ? localStorage.getItem('admin_username') : '') || 'comercial'
  );

  useEffect(() => {
    if (isOpen) {
      const loaded = loadComercialSettings();
      setSettings(loaded);
      setActiveTab(initialTab);
      setSaveSuccess(false);

      // Limpar formulário de senha
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordStatus({ type: 'idle', message: '' });

      // Carregar metas corporativas configuradas pelo administrador no backend
      const token = localStorage.getItem('admin_token');
      if (token) {
        fetch('/api/comercial/metas', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.metas) {
              setSettings(prev => ({
                ...prev,
                ...data.metas,
              }));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    saveComercialSettings(settings);

    // Se for administrador, sincronizar as metas no servidor para toda a equipe
    if (isAdmin) {
      try {
        const token = localStorage.getItem('admin_token');
        if (token) {
          await fetch('/api/comercial/metas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              metaMensalFaturamento: settings.metaMensalFaturamento,
              faturamentoAtual: settings.faturamentoAtual,
              metaNovosContratos: settings.metaNovosContratos,
              metaNovosLeads: settings.metaNovosLeads,
              metaVisitas: settings.metaVisitas,
              metaPropostas: settings.metaPropostas,
              metaIndividualVendedor: settings.metaIndividualVendedor,
            }),
          });
        }
      } catch (err) {
        console.warn('Erro ao sincronizar metas no servidor:', err);
      }
    }

    if (settings.somNotificacoes) {
      playNotificationBeep(true);
    }
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 600);
    }, 250);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Restaurar preferências para o padrão?')) {
      if (isAdmin) {
        setSettings(DEFAULT_COMERCIAL_SETTINGS);
        saveComercialSettings(DEFAULT_COMERCIAL_SETTINGS);
      } else {
        // Usuário comum redefine apenas suas preferências pessoais, mantendo as metas da empresa
        const currentMetas = {
          metaMensalFaturamento: settings.metaMensalFaturamento,
          faturamentoAtual: settings.faturamentoAtual,
          metaNovosContratos: settings.metaNovosContratos,
          metaNovosLeads: settings.metaNovosLeads,
          metaVisitas: settings.metaVisitas,
          metaPropostas: settings.metaPropostas,
          metaIndividualVendedor: settings.metaIndividualVendedor,
        };
        const reseted = {
          ...DEFAULT_COMERCIAL_SETTINGS,
          ...currentMetas,
        };
        setSettings(reseted);
        saveComercialSettings(reseted);
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Informe a senha atual.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'A confirmação de senha não confere.' });
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      setPasswordStatus({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordStatus({ type: 'idle', message: '' });

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordStatus({ type: 'success', message: 'Senha atualizada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', message: data.message || 'Falha ao alterar senha.' });
      }
    } catch {
      setPasswordStatus({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const progressPercent = Math.min(100, Math.round((settings.faturamentoAtual / (settings.metaMensalFaturamento || 1)) * 100));

  const TABS = [
    { id: 'perfil', label: 'Perfil & Conta', icon: User, desc: 'Identificação do operador e credenciais de segurança' },
    {
      id: 'metas',
      label: 'Metas & Vendas',
      icon: TrendingUp,
      desc: isAdmin
        ? 'Definição de metas corporativas e individuais de vendas'
        : 'Metas comerciais estabelecidas pela administração do sistema',
    },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, desc: 'Preferências de alertas para leads e contratos pendentes' },
    { id: 'interface', label: 'Interface & Visualização', icon: Monitor, desc: 'Densidade de tabelas e exibição de dados no painel' },
    { id: 'atalhos', label: 'Atalhos do Teclado', icon: Keyboard, desc: 'Comandos rápidos para navegação veloz pelo sistema' },
  ] as const;

  const currentTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER ─── */}
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
                  <Sliders className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  Configurações
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Preferências da conta, segurança, alertas e parâmetros do operador.
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-stone-600" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.id === 'metas' && !isAdmin && (
                      <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-md font-normal">
                        Admin
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda */}
          <div className="pt-4 border-t border-stone-200/60 space-y-1 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {settings.nome ? settings.nome.slice(0, 2).toUpperCase() : 'CO'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {settings.nome || 'Operador Comercial'}
                </p>
                <p className="text-[10px] text-stone-500 truncate">
                  @{username} • {settings.cargo || 'Comercial'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
          
          {/* Cabeçalho da Seção Ativa + Botão Fechar */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-stone-900 tracking-tight">
                  {currentTabMeta.label}
                </h2>
                {activeTab === 'metas' && !isAdmin && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                    Somente Leitura
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-normal mt-0.5">
                {currentTabMeta.desc}
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

          {/* Área de Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
            
            {/* TAB: PERFIL & CONTA */}
            {activeTab === 'perfil' && (
              <div className="space-y-4">
                {/* Dados de Identificação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Nome de Exibição
                    </label>
                    <input
                      type="text"
                      value={settings.nome}
                      onChange={e => setSettings({ ...settings, nome: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      placeholder="Nome completo do operador"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Exibido na barra superior e propostas comerciais</span>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={settings.cargo}
                      onChange={e => setSettings({ ...settings, cargo: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      placeholder="Ex: Consultor Comercial"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Identificação de função no sistema</span>
                  </div>
                </div>

                {/* Telefone / WhatsApp (Deixado em branco para cada usuário configurar; Email removido) */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Telefone / WhatsApp
                    </label>
                    <span className="text-[10px] text-stone-400 font-medium">Configuração individual</span>
                  </div>
                  <input
                    type="text"
                    value={settings.telefone || ''}
                    onChange={e => setSettings({ ...settings, telefone: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                    placeholder="(00) 00000-0000"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Informe seu contato direto com clientes para mensagens e fechamento de propostas
                  </span>
                </div>

                {/* Card de Redefinição de Senha */}
                <div className="bg-stone-50/60 rounded-2xl p-4.5 border border-stone-200/80 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-stone-200/70 text-stone-700 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">Segurança & Redefinição de Senha</h4>
                      <p className="text-[11px] text-stone-500">Altere sua senha de acesso para manter sua conta protegida</p>
                    </div>
                  </div>

                  {passwordStatus.type !== 'idle' && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                        passwordStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                          : 'bg-red-50 text-red-800 border border-red-200/80'
                      }`}
                    >
                      {passwordStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{passwordStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Senha Atual
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={e => {
                              setCurrentPassword(e.target.value);
                              if (passwordStatus.type !== 'idle') setPasswordStatus({ type: 'idle', message: '' });
                            }}
                            className="w-full h-8 px-2.5 pr-8 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Nova Senha
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => {
                              setNewPassword(e.target.value);
                              if (passwordStatus.type !== 'idle') setPasswordStatus({ type: 'idle', message: '' });
                            }}
                            className="w-full h-8 px-2.5 pr-8 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                            placeholder="Mínimo 6 dígitos"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Confirmar Nova Senha
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => {
                              setConfirmPassword(e.target.value);
                              if (passwordStatus.type !== 'idle') setPasswordStatus({ type: 'idle', message: '' });
                            }}
                            className="w-full h-8 px-2.5 pr-8 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                            placeholder="Repita a nova senha"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                        className="h-8 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{passwordLoading ? 'Atualizando…' : 'Atualizar Senha'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: METAS */}
            {activeTab === 'metas' && (
              <div className="space-y-4">
                {/* Banner Informativo de Permissões */}
                {isAdmin ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-950">
                        Gerenciamento de Metas (Acesso de Administrador)
                      </p>
                      <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                        Como administrador, você define as metas corporativas e individuais da equipe comercial. Ao salvar, as metas atualizadas serão compartilhadas com todo o time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-950">
                        Metas Definidas pela Administração
                      </p>
                      <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                        As metas de faturamento, vendas e contratos são configuradas exclusivamente pelo administrador do sistema. Os campos abaixo estão disponíveis para acompanhamento de desempenho da equipe.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card de Progresso */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-900">Atingimento da Meta Mensal</p>
                      <p className="text-[11px] text-stone-500">
                        {formatBRL(settings.faturamentoAtual)} de {formatBRL(settings.metaMensalFaturamento)}
                      </p>
                    </div>
                    <span className="text-sm font-black text-stone-900">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-900 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Meta de Faturamento (R$)
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.metaMensalFaturamento}
                      onChange={e => setSettings({ ...settings, metaMensalFaturamento: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Faturamento Atual (R$)
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.faturamentoAtual}
                      onChange={e => setSettings({ ...settings, faturamentoAtual: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Meta de Novos Contratos
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.metaNovosContratos}
                      onChange={e => setSettings({ ...settings, metaNovosContratos: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Meta de Novos Leads
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.metaNovosLeads}
                      onChange={e => setSettings({ ...settings, metaNovosLeads: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Meta de Visitas / Test Drives
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.metaVisitas || 40}
                      onChange={e => setSettings({ ...settings, metaVisitas: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Meta de Propostas Enviadas
                      </label>
                      {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                    </div>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={settings.metaPropostas || 80}
                      onChange={e => setSettings({ ...settings, metaPropostas: Number(e.target.value) || 0 })}
                      className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                        isAdmin
                          ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                          : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                      }`}
                    />
                  </div>
                </div>

                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Meta Financeira Individual do Vendedor (R$)
                    </label>
                    {!isAdmin && <Lock className="w-3 h-3 text-stone-400" title="Definido pelo administrador" />}
                  </div>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={settings.metaIndividualVendedor || 250000}
                    onChange={e => setSettings({ ...settings, metaIndividualVendedor: Number(e.target.value) || 0 })}
                    className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-hidden ${
                      isAdmin
                        ? 'border-stone-200 bg-white text-stone-900 focus:border-stone-400'
                        : 'border-stone-200 bg-stone-100/70 text-stone-600 cursor-not-allowed select-none'
                    }`}
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Utilizada para o widget de comissão individual e VGV do vendedor logado
                  </span>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICAÇÕES */}
            {activeTab === 'notificacoes' && (
              <div className="space-y-3">
                {[
                  {
                    key: 'notificarNovosLeads' as const,
                    title: 'Novos leads cadastrados',
                    desc: 'Notificar quando uma oportunidade for capturada via landing page ou webhook',
                  },
                  {
                    key: 'notificarPropostasSemResposta' as const,
                    title: 'Propostas sem retorno há mais de 48h',
                    desc: 'Alerta de follow-up para contatar cotistas em negociação',
                  },
                  {
                    key: 'notificarContratosPendentes' as const,
                    title: 'Contratos pendentes de assinatura',
                    desc: 'Lembretes automáticos para acelerar o fechamento formal',
                  },
                  {
                    key: 'somNotificacoes' as const,
                    title: 'Som nas notificações',
                    desc: 'Emitir bipe discreto ao receber novidades e alertas importantes',
                  },
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 hover:bg-stone-100/40 transition-colors cursor-pointer"
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-stone-900">{item.title}</p>
                        {item.key === 'somNotificacoes' && (
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              playNotificationBeep(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[10px] font-semibold text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-colors cursor-pointer"
                          >
                            Testar som
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[item.key]}
                      onChange={e => {
                        const checked = e.target.checked;
                        setSettings({ ...settings, [item.key]: checked });
                        if (item.key === 'somNotificacoes' && checked) {
                          playNotificationBeep(true);
                        }
                      }}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400 cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* TAB: INTERFACE */}
            {activeTab === 'interface' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 space-y-2">
                  <p className="text-xs font-bold text-stone-900">Tema do Painel Comercial</p>
                  <p className="text-[11px] text-stone-500">Alterne entre o tema claro e o tema escuro</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {([
                      { id: 'light', label: 'Modo Claro', icon: Sun },
                      { id: 'dark', label: 'Modo Escuro', icon: Moon },
                    ] as const).map(t => {
                      const Icon = t.icon;
                      const isSelected = (settings.tema || 'light') === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const next = { ...settings, tema: t.id };
                            setSettings(next);
                            syncThemeWithDOM(t.id);
                          }}
                          className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-stone-900 bg-white text-stone-900 shadow-2xs'
                              : 'border-stone-200 bg-stone-100/50 text-stone-600 hover:bg-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${t.id === 'dark' ? 'text-amber-400' : 'text-stone-700'}`} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 space-y-2">
                  <p className="text-xs font-bold text-stone-900">Densidade visual das tabelas</p>
                  <p className="text-[11px] text-stone-500">Ajuste o espaçamento vertical entre linhas nas listagens do sistema</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {([
                      { id: 'confortavel', label: 'Confortável' },
                      { id: 'compacta', label: 'Compacta' },
                    ] as const).map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, densidadeTabelas: d.id })}
                        className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          settings.densidadeTabelas === d.id
                            ? 'border-stone-900 bg-white text-stone-900 shadow-2xs'
                            : 'border-stone-200 bg-stone-100/50 text-stone-600 hover:bg-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 hover:bg-stone-100/40 transition-colors cursor-pointer">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-stone-900">Menu lateral colapsado por padrão</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Inicia a barra de navegação no modo reduzido</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sidebarColapsadaPadrao}
                    onChange={e => setSettings({ ...settings, sidebarColapsadaPadrao: e.target.checked })}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400 cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 hover:bg-stone-100/40 transition-colors cursor-pointer">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-stone-900">Ocultar valores monetários no Dashboard</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Substitui cifras por asteriscos para privacidade em reuniões</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ocultarValoresDashboard}
                    onChange={e => setSettings({ ...settings, ocultarValoresDashboard: e.target.checked })}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400 cursor-pointer shrink-0"
                  />
                </label>
              </div>
            )}

            {/* TAB: ATALHOS */}
            {activeTab === 'atalhos' && (
              <div className="space-y-2">
                {[
                  { label: 'Busca rápida de cotistas', shortcut: 'Ctrl + K', action: 'search' },
                  { label: 'Fechar modais e formulários', shortcut: 'Esc', action: 'close' },
                  { label: 'Ir para Dashboard', shortcut: 'Alt + D', action: 'dashboard' },
                  { label: 'Ir para Vendas', shortcut: 'Alt + V', action: 'vendas' },
                  { label: 'Ir para Clientes', shortcut: 'Alt + C', action: 'clientes' },
                  { label: 'Ir para Embarcações', shortcut: 'Alt + E', action: 'embarcacoes' },
                  { label: 'Ir para Contratos', shortcut: 'Alt + T', action: 'contratos' },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.action === 'close') {
                        onClose();
                      } else if (onNavigateShortcut) {
                        onClose();
                        onNavigateShortcut(item.action);
                      }
                    }}
                    className="w-full h-10 px-4 rounded-2xl border border-stone-200/70 bg-stone-50/50 hover:bg-stone-100/70 transition-colors flex items-center justify-between cursor-pointer text-left group"
                    title="Clique para testar este atalho agora"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-stone-800 group-hover:text-stone-950">{item.label}</span>
                    </div>
                    <kbd className="text-[10px] font-mono font-bold text-stone-600 bg-white border border-stone-200 rounded-lg px-2 py-0.5 shadow-2xs group-hover:border-stone-300">
                      {item.shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* ================= RODAPÉ PRINCIPAL DO MODAL ================= */}
          <footer className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
            {/* Ação Auxiliar na Esquerda */}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar padrões</span>
            </button>

            {/* Botões de Ação na Direita */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salvo com sucesso</span>
                  </>
                ) : isSaving ? (
                  <span>Salvando…</span>
                ) : (
                  <span>Salvar alterações</span>
                )}
              </button>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
