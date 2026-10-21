import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
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
  Sparkles
} from 'lucide-react';

export interface ComercialSettings {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  metaMensalFaturamento: number;
  faturamentoAtual: number;
  metaNovosContratos: number;
  metaNovosLeads: number;
  diasAlertaVencimento: number;
  notificarNovosLeads: boolean;
  notificarPropostasSemResposta: boolean;
  notificarContratosPendentes: boolean;
  somNotificacoes: boolean;
  sidebarColapsadaPadrao: boolean;
  densidadeTabelas: 'confortavel' | 'compacta';
  ocultarValoresDashboard: boolean;
}

export const DEFAULT_COMERCIAL_SETTINGS: ComercialSettings = {
  nome: 'Akio Imoto',
  email: 'comercial@elmexicano.com.br',
  telefone: '(11) 98765-4321',
  cargo: 'Comercial Mexicano',
  metaMensalFaturamento: 600000,
  faturamentoAtual: 486200,
  metaNovosContratos: 64,
  metaNovosLeads: 1284,
  diasAlertaVencimento: 30,
  notificarNovosLeads: true,
  notificarPropostasSemResposta: true,
  notificarContratosPendentes: true,
  somNotificacoes: true,
  sidebarColapsadaPadrao: false,
  densidadeTabelas: 'confortavel',
  ocultarValoresDashboard: false,
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

export function loadComercialSettings(): ComercialSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const adminName = localStorage.getItem('admin_name') || localStorage.getItem('admin_username');
      return adminName ? { ...DEFAULT_COMERCIAL_SETTINGS, nome: adminName } : DEFAULT_COMERCIAL_SETTINGS;
    }
    return { ...DEFAULT_COMERCIAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COMERCIAL_SETTINGS;
  }
}

export function saveComercialSettings(settings: ComercialSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (settings.nome) {
      localStorage.setItem('admin_name', settings.nome);
    }
    localStorage.setItem('comercial_sidebar_collapsed', String(Boolean(settings.sidebarColapsadaPadrao)));
    window.dispatchEvent(new CustomEvent('comercial-settings-updated', { detail: settings }));
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

  useEffect(() => {
    if (isOpen) {
      setSettings(loadComercialSettings());
      setActiveTab(initialTab);
      setSaveSuccess(false);
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

  const handleSave = () => {
    setIsSaving(true);
    saveComercialSettings(settings);
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
    if (window.confirm('Restaurar configurações para o padrão?')) {
      setSettings(DEFAULT_COMERCIAL_SETTINGS);
      saveComercialSettings(DEFAULT_COMERCIAL_SETTINGS);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const progressPercent = Math.min(100, Math.round((settings.faturamentoAtual / (settings.metaMensalFaturamento || 1)) * 100));

  const TABS = [
    { id: 'perfil', label: 'Perfil & Conta', icon: User, desc: 'Identificação do operador e contatos da conta comercial' },
    { id: 'metas', label: 'Metas & Vendas', icon: TrendingUp, desc: 'Metas de faturamento mensal e novos contratos náuticos' },
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
      {/* ─── MODAL CONTAINER (Padrão Split View da Referência) ─── */}
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
                Preferências da conta, metas comerciais, alertas e parâmetros do operador.
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
                  {settings.cargo || 'Comercial Mexicano'}
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
              <h2 className="font-bold text-base text-stone-900 tracking-tight">
                {currentTabMeta.label}
              </h2>
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

          {/* Área de Conteúdo Scrollável com Cards Padronizados */}
          <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
            
            {/* TAB: PERFIL */}
            {activeTab === 'perfil' && (
              <div className="space-y-4">
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
                      placeholder="Nome completo"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Exibido na topbar e propostas</span>
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
                      placeholder="Ex: Comercial Mexicano"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Identificação no Mexicano</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      E-mail Profissional
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={e => setSettings({ ...settings, email: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      placeholder="seu.email@empresa.com"
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={settings.telefone}
                      onChange={e => setSettings({ ...settings, telefone: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      placeholder="(11) 98765-4321"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: METAS */}
            {activeTab === 'metas' && (
              <div className="space-y-4">
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
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Meta de Faturamento (R$)
                    </label>
                    <input
                      type="number"
                      value={settings.metaMensalFaturamento}
                      onChange={e => setSettings({ ...settings, metaMensalFaturamento: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Faturamento Atual (R$)
                    </label>
                    <input
                      type="number"
                      value={settings.faturamentoAtual}
                      onChange={e => setSettings({ ...settings, faturamentoAtual: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Meta de Novos Contratos
                    </label>
                    <input
                      type="number"
                      value={settings.metaNovosContratos}
                      onChange={e => setSettings({ ...settings, metaNovosContratos: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Meta de Novos Leads
                    </label>
                    <input
                      type="number"
                      value={settings.metaNovosLeads}
                      onChange={e => setSettings({ ...settings, metaNovosLeads: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
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
