import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Percent,
  Bell,
  Monitor,
  Keyboard,
  Check,
  RotateCcw,
  Sliders,
  Lock,
  Building2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2
} from 'lucide-react';

export interface FinanceiroSettings {
  // Perfil
  nome: string; // Colaborador Vinculado
  cargo: string;

  // Regras de Cobrança & Juros
  taxaJurosMensal: number;
  taxaMultaAtraso: number;
  diasFaturaAtual: number;
  billingTypePadrao: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  empresaPadrao: string;
  registrarTaxaGateway: boolean;

  // Notificações
  notificarVencimentosHoje: boolean;
  notificarInadimplentes: boolean;
  notificarBaixasBancarias: boolean;
  notificarNovosLancamentos: boolean;
  somNotificacoes: boolean;

  // Interface & Sistema
  densidadeTabelas: 'confortavel' | 'compacta';
  sidebarColapsadaPadrao: boolean;
  modoPrivacidadePadrao: boolean;
  empresaFiltroPadrao: string;
}

export const DEFAULT_FINANCEIRO_SETTINGS: FinanceiroSettings = {
  nome: 'Financeiro Mexicano',
  cargo: 'Financeiro',
  taxaJurosMensal: 2.2,
  taxaMultaAtraso: 2.0,
  diasFaturaAtual: 30,
  billingTypePadrao: 'PIX',
  empresaPadrao: 'Mexicano',
  registrarTaxaGateway: true,
  notificarVencimentosHoje: true,
  notificarInadimplentes: true,
  notificarBaixasBancarias: true,
  notificarNovosLancamentos: true,
  somNotificacoes: true,
  densidadeTabelas: 'confortavel',
  sidebarColapsadaPadrao: false,
  modoPrivacidadePadrao: false,
  empresaFiltroPadrao: 'Todos',
};

export const STORAGE_KEY_FINANCEIRO = 'financeiro_user_settings';

export function playFinanceNotificationBeep(force = false): void {
  try {
    const current = loadFinanceiroSettings();
    if (!force && !current.somNotificacoes) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Dois tons suaves harmônicos (D5 -> 587.33Hz e A5 -> 880Hz)
    const freqs = [587.33, 880];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.07, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.17);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.19);
    });
  } catch {
    // Autoplay bloqueado pelo navegador
  }
}

export function loadFinanceiroSettings(): FinanceiroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FINANCEIRO);
    const adminName = localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || 'Financeiro';
    if (!raw) {
      return {
        ...DEFAULT_FINANCEIRO_SETTINGS,
        nome: adminName,
        sidebarColapsadaPadrao: localStorage.getItem('financeiro_sidebar_collapsed') === 'true',
        modoPrivacidadePadrao: localStorage.getItem('financeiro_privacy_mode') === 'true',
        empresaFiltroPadrao: localStorage.getItem('financeiro_empresa_filtro') || 'Todos',
        densidadeTabelas: (localStorage.getItem('financeiro_table_density') as 'confortavel' | 'compacta') || 'confortavel',
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FINANCEIRO_SETTINGS,
      ...parsed,
      nome: parsed.nome || adminName,
    };
  } catch {
    return DEFAULT_FINANCEIRO_SETTINGS;
  }
}

export function saveFinanceiroSettings(settings: FinanceiroSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_FINANCEIRO, JSON.stringify(settings));
    if (settings.nome) {
      localStorage.setItem('admin_name', settings.nome);
    }
    localStorage.setItem('financeiro_sidebar_collapsed', String(Boolean(settings.sidebarColapsadaPadrao)));
    localStorage.setItem('financeiro_privacy_mode', String(Boolean(settings.modoPrivacidadePadrao)));
    localStorage.setItem('financeiro_empresa_filtro', settings.empresaFiltroPadrao || 'Todos');
    localStorage.setItem('financeiro_table_density', settings.densidadeTabelas || 'confortavel');

    window.dispatchEvent(new CustomEvent('financeiro-settings-updated', { detail: settings }));
  } catch (err) {
    console.error('Erro ao salvar configurações do Financeiro:', err);
  }
}

export function updateFinanceiroSettings(partial: Partial<FinanceiroSettings>): FinanceiroSettings {
  const next = { ...loadFinanceiroSettings(), ...partial };
  saveFinanceiroSettings(next);
  return next;
}

export interface FinanceiroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'perfil' | 'regras' | 'notificacoes' | 'interface' | 'atalhos';
  onNavigateShortcut?: (target: string) => void;
}

export default function FinanceiroSettingsModal({
  isOpen,
  onClose,
  initialTab = 'interface',
  onNavigateShortcut,
}: FinanceiroSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'regras' | 'notificacoes' | 'interface' | 'atalhos'>(initialTab);
  const [settings, setSettings] = useState<FinanceiroSettings>(loadFinanceiroSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  useEffect(() => {
    if (isOpen) {
      const local = loadFinanceiroSettings();
      setSettings(local);
      setActiveTab(initialTab);
      setSaveSuccess(false);
      setPasswordStatus({ type: 'idle', message: '' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Sincronizar com regras do backend /api/financeiro/configuracoes
      const token = localStorage.getItem('admin_token');
      if (token) {
        fetch('/api/financeiro/configuracoes', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(cfg => {
            if (cfg) {
              setSettings(prev => ({
                ...prev,
                taxaJurosMensal: cfg.taxaJurosMensal !== undefined ? Number(cfg.taxaJurosMensal) : prev.taxaJurosMensal,
                taxaMultaAtraso: cfg.taxaMultaAtraso !== undefined ? Number(cfg.taxaMultaAtraso) : prev.taxaMultaAtraso,
                diasFaturaAtual: cfg.diasFaturaAtual !== undefined ? Number(cfg.diasFaturaAtual) : prev.diasFaturaAtual,
                billingTypePadrao: cfg.billingTypePadrao || prev.billingTypePadrao,
                registrarTaxaGateway: cfg.registrarTaxaGateway !== undefined ? Boolean(cfg.registrarTaxaGateway) : prev.registrarTaxaGateway,
              }));
            }
          })
          .catch(console.warn);
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
    saveFinanceiroSettings(settings);

    // Salvar regras no backend
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch('/api/financeiro/configuracoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            taxaJurosMensal: settings.taxaJurosMensal,
            taxaMultaAtraso: settings.taxaMultaAtraso,
            diasFaturaAtual: settings.diasFaturaAtual,
            billingTypePadrao: settings.billingTypePadrao,
            registrarTaxaGateway: settings.registrarTaxaGateway,
          }),
        });
      } catch (err) {
        console.warn('Falha ao sincronizar parâmetros financeiros no servidor:', err);
      }
    }

    if (settings.somNotificacoes) {
      playFinanceNotificationBeep(true);
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
    if (window.confirm('Restaurar preferências financeiras para o padrão de fábrica?')) {
      setSettings(DEFAULT_FINANCEIRO_SETTINGS);
      saveFinanceiroSettings(DEFAULT_FINANCEIRO_SETTINGS);
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

  const TABS = [
    { id: 'perfil', label: 'Perfil & Segurança', icon: User, desc: 'Identificação do operador e credenciais de acesso' },
    { id: 'regras', label: 'Regras & Cobrança', icon: Percent, desc: 'Taxas de juros, multa por atraso e parâmetros Asaas' },
    { id: 'notificacoes', label: 'Alertas & Sons', icon: Bell, desc: 'Notificações de vencimento, baixas bancárias e avisos sonoros' },
    { id: 'interface', label: 'Interface & Sistema', icon: Monitor, desc: 'Densidade de tabelas, menu lateral e privacidade padrão' },
    { id: 'atalhos', label: 'Atalhos do Teclado', icon: Keyboard, desc: 'Comandos rápidos para navegação veloz no módulo financeiro' },
  ] as const;

  const currentTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Split View Mexicano) ─── */}
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
                  Configurações Financeiras
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Preferências de conta, regras de juros, parâmetros de cobrança e interface.
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
                {settings.nome ? settings.nome.slice(0, 2).toUpperCase() : 'FN'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {settings.nome || 'Colaborador Vinculado'}
                </p>
                <p className="text-[10px] text-stone-500 truncate">
                  @{localStorage.getItem('admin_username') || 'fin'} • {settings.cargo || 'Financeiro'}
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
            
            {/* TAB: PERFIL & SEGURANÇA */}
            {activeTab === 'perfil' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Nome de Usuário (Login)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={localStorage.getItem('admin_username') || 'fin'}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-stone-100/80 text-xs text-stone-700 font-semibold cursor-not-allowed"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Identificador de acesso ao sistema</span>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Colaborador Vinculado
                    </label>
                    <input
                      type="text"
                      value={settings.nome}
                      onChange={e => setSettings({ ...settings, nome: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      placeholder="Nome do colaborador vinculado"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Nome do profissional responsável</span>
                  </div>
                </div>

                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Função / Cargo
                  </label>
                  <input
                    type="text"
                    value={settings.cargo}
                    onChange={e => setSettings({ ...settings, cargo: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                    placeholder="Ex: Financeiro"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Identificação de cargo no sistema</span>
                </div>

                {/* Card de Alteração de Senha */}
                <div className="bg-stone-50/60 rounded-2xl p-4.5 border border-stone-200/80 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-200/70 text-stone-700 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">Segurança & Alteração de Senha</h4>
                      <p className="text-[10px] text-stone-500">Altere sua senha de operador para manter o acesso protegido</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Senha Atual
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Nova Senha
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                          placeholder="Mínimo 6 dígitos"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                          Confirmar Nova Senha
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400"
                          placeholder="Repita a senha"
                        />
                      </div>
                    </div>

                    {passwordStatus.type !== 'idle' && (
                      <div
                        className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                          passwordStatus.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {passwordStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{passwordStatus.message}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordLoading || !currentPassword || !newPassword}
                        className="h-8 px-3.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {passwordLoading ? 'Alterando senha…' : 'Atualizar Senha'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: REGRAS & COBRANÇA */}
            {activeTab === 'regras' && (
              <div className="space-y-4">
                {/* Resumo de Regras */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-900">Parâmetros de Cobrança e Inadimplência</p>
                      <p className="text-[11px] text-stone-500">
                        Valores aplicados no cálculo automático de juros e multas nos boletos Asaas e títulos a prazo
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                      Asaas Conectado
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Taxa de Juros Mensal (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        value={settings.taxaJurosMensal}
                        onChange={e => setSettings({ ...settings, taxaJurosMensal: Number(e.target.value) || 0 })}
                        className="w-full h-9 pl-3 pr-8 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-semibold">% a.m.</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Juros pro-rata após vencimento</span>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Taxa de Multa por Atraso (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        value={settings.taxaMultaAtraso}
                        onChange={e => setSettings({ ...settings, taxaMultaAtraso: Number(e.target.value) || 0 })}
                        className="w-full h-9 pl-3 pr-8 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-semibold">%</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Multa única pós-vencimento</span>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Janela de Fatura (Dias)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="180"
                        value={settings.diasFaturaAtual}
                        onChange={e => setSettings({ ...settings, diasFaturaAtual: Number(e.target.value) || 30 })}
                        className="w-full h-9 pl-3 pr-10 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-semibold">dias</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Antecedência de faturamento</span>
                  </div>
                </div>

                {/* Forma de Cobrança Padrão */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Forma de Cobrança Padrão
                  </label>
                  <p className="text-[11px] text-stone-500">
                    Método de pagamento sugerido por padrão na geração de faturas e boletos em lote
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {([
                      { id: 'PIX', label: 'PIX Instantâneo' },
                      { id: 'BOLETO', label: 'Boleto Bancário' },
                      { id: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                    ] as const).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, billingTypePadrao: m.id })}
                        className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          settings.billingTypePadrao === m.id
                            ? 'border-stone-900 bg-white text-stone-900 shadow-2xs'
                            : 'border-stone-200 bg-stone-100/50 text-stone-600 hover:bg-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Empresa Padrão */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Empresa Padrão para Novos Lançamentos
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'].map(emp => (
                      <button
                        key={emp}
                        type="button"
                        onClick={() => setSettings({ ...settings, empresaPadrao: emp })}
                        className={`h-9 px-2 rounded-xl border text-xs font-semibold truncate transition-all cursor-pointer ${
                          settings.empresaPadrao === emp
                            ? 'border-stone-900 bg-white text-stone-900 shadow-2xs'
                            : 'border-stone-200 bg-stone-100/50 text-stone-600 hover:bg-white'
                        }`}
                      >
                        {emp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway fee toggle */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 hover:bg-stone-100/40 transition-colors cursor-pointer">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-stone-900">Registrar automaticamente taxa bancária do gateway</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Cria uma despesa financeira automática para compensar as tarifas do Asaas nas baixas
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.registrarTaxaGateway}
                    onChange={e => setSettings({ ...settings, registrarTaxaGateway: e.target.checked })}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400 cursor-pointer shrink-0"
                  />
                </label>
              </div>
            )}

            {/* TAB: NOTIFICAÇÕES & SONS */}
            {activeTab === 'notificacoes' && (
              <div className="space-y-3">
                {[
                  {
                    key: 'notificarVencimentosHoje' as const,
                    title: 'Títulos e parcelas a vencer hoje',
                    desc: 'Notificar sobre contas a pagar e receber que vencem na data corrente',
                  },
                  {
                    key: 'notificarInadimplentes' as const,
                    title: 'Títulos e faturas em atraso',
                    desc: 'Alertas de inadimplência para cobrança proativa de cotistas',
                  },
                  {
                    key: 'notificarBaixasBancarias' as const,
                    title: 'Confirmações de recebimento via Asaas',
                    desc: 'Notificar em tempo real quando um boleto ou PIX for liquidado pelo cliente',
                  },
                  {
                    key: 'notificarNovosLancamentos' as const,
                    title: 'Novos lançamentos criados no sistema',
                    desc: 'Avisos quando outros operadores cadastrarem movimentações financeiras',
                  },
                  {
                    key: 'somNotificacoes' as const,
                    title: 'Sons de notificação',
                    desc: 'Emitir bipe discreto e suave nas confirmações e novos alertas',
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
                              playFinanceNotificationBeep(true);
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
                          playFinanceNotificationBeep(true);
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
                  <p className="text-[11px] text-stone-500">
                    Ajuste o espaçamento vertical entre linhas nas listagens de lançamentos e parcelas
                  </p>
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
                    <p className="text-[11px] text-stone-500 mt-0.5">Inicia o módulo financeiro com a barra recolhida</p>
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
                    <p className="text-xs font-bold text-stone-900">Modo de Privacidade ativado por padrão</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Substitui cifras e saldos bancários por asteriscos para reuniões públicas
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.modoPrivacidadePadrao}
                    onChange={e => setSettings({ ...settings, modoPrivacidadePadrao: e.target.checked })}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400 cursor-pointer shrink-0"
                  />
                </label>

                {/* Filtro Padrão de Empresa */}
                <div className="p-3.5 rounded-2xl border border-stone-200/70 bg-stone-50/50 space-y-2">
                  <p className="text-xs font-bold text-stone-900">Empresa selecionada ao iniciar</p>
                  <p className="text-[11px] text-stone-500">
                    Define o filtro inicial de empresa aplicado ao abrir o módulo financeiro
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'].map(emp => (
                      <button
                        key={emp}
                        type="button"
                        onClick={() => setSettings({ ...settings, empresaFiltroPadrao: emp })}
                        className={`h-9 px-2 rounded-xl border text-xs font-semibold truncate transition-all cursor-pointer ${
                          settings.empresaFiltroPadrao === emp
                            ? 'border-stone-900 bg-white text-stone-900 shadow-2xs'
                            : 'border-stone-200 bg-stone-100/50 text-stone-600 hover:bg-white'
                        }`}
                      >
                        {emp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ATALHOS */}
            {activeTab === 'atalhos' && (
              <div className="space-y-2">
                {[
                  { label: 'Busca rápida de transações e contas', shortcut: 'Ctrl + K', action: 'search' },
                  { label: 'Cadastrar Novo Lançamento', shortcut: 'Alt + N', action: 'novo' },
                  { label: 'Ir para Visão Geral (Dashboard)', shortcut: 'Alt + D', action: 'dashboard' },
                  { label: 'Ir para Lançamentos (Contas a Pagar/Receber)', shortcut: 'Alt + L', action: 'lancamentos' },
                  { label: 'Ir para Fluxo de Caixa', shortcut: 'Alt + F', action: 'fluxo' },
                  { label: 'Ir para Gestão de Parcelas', shortcut: 'Alt + P', action: 'parcelas' },
                  { label: 'Ir para Boletos & Cobrança Asaas', shortcut: 'Alt + B', action: 'boletos' },
                  { label: 'Ir para Relatórios & DRE', shortcut: 'Alt + R', action: 'relatorios' },
                  { label: 'Fechar modais e gavetas', shortcut: 'Esc', action: 'close' },
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
