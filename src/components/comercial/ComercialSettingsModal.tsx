import React, { useState, useEffect } from 'react';
import {
  Xmark,
  User,
  Mail,
  Phone,
  StatsReport,
  Bell,
  Computer,
  KeyCommand,
  Check,
  Restart,
} from 'iconoir-react';

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
    window.dispatchEvent(new CustomEvent('comercial-settings-updated', { detail: settings }));
  } catch (err) {
    console.error('Erro ao salvar configurações do Comercial:', err);
  }
}

interface ComercialSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos';
}

export default function ComercialSettingsModal({
  isOpen,
  onClose,
  initialTab = 'perfil',
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

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaving(true);
    saveComercialSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    }, 300);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Restaurar configurações para o padrão?')) {
      setSettings(DEFAULT_COMERCIAL_SETTINGS);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const progressPercent = Math.min(100, Math.round((settings.faturamentoAtual / (settings.metaMensalFaturamento || 1)) * 100));

  const TABS = [
    { id: 'perfil', label: 'Perfil & Conta', icon: User },
    { id: 'metas', label: 'Metas & Vendas', icon: StatsReport },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'interface', label: 'Interface', icon: Computer },
    { id: 'atalhos', label: 'Atalhos', icon: KeyCommand },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.04)] border border-stone-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Limpo */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-stone-900 tracking-tight">
              Configurações do Comercial
            </h3>
            <p className="text-[12px] text-stone-400 mt-0.5">
              El Mexicano • Preferências da conta, metas e alertas
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <Xmark className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Clean */}
        <div className="flex items-center gap-1 px-6 border-b border-stone-200/80 bg-stone-50/40 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 px-3 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-stone-900 text-stone-900 font-semibold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {/* TAB: PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Nome de exibição
                  </label>
                  <input
                    type="text"
                    value={settings.nome}
                    onChange={e => setSettings({ ...settings, nome: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all placeholder:text-stone-400"
                    placeholder="Nome completo"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">Exibido na topbar e propostas</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={settings.cargo}
                    onChange={e => setSettings({ ...settings, cargo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all placeholder:text-stone-400"
                    placeholder="Ex: Comercial Mexicano"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">Identificação no Mexicano</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    E-mail comercial
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={settings.email}
                      onChange={e => setSettings({ ...settings, email: e.target.value })}
                      className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={settings.telefone}
                      onChange={e => setSettings({ ...settings, telefone: e.target.value })}
                      className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-medium text-stone-800">Unidade Vinculada</div>
                  <div className="text-[11px] text-stone-400">El Mexicano • Setor Comercial & Contratos</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-600 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Sessão ativa no Mexicano
                </span>
              </div>
            </div>
          )}

          {/* TAB: METAS */}
          {activeTab === 'metas' && (
            <div className="space-y-5">
              {/* Progresso minimalista */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-stone-700">Meta do Mês (Outubro)</span>
                  <span className="font-semibold text-stone-900 tabular-nums">{progressPercent}% atingida</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-stone-200/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-stone-900 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 tabular-nums">
                  <span>Atual: {formatBRL(settings.faturamentoAtual)}</span>
                  <span>Alvo: {formatBRL(settings.metaMensalFaturamento)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Meta de faturamento (R$)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={settings.metaMensalFaturamento}
                    onChange={e => setSettings({ ...settings, metaMensalFaturamento: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">Valor exibido no card da sidebar</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Faturamento acumulado (R$)
                  </label>
                  <input
                    type="number"
                    step={5000}
                    value={settings.faturamentoAtual}
                    onChange={e => setSettings({ ...settings, faturamentoAtual: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">Total atingido no mês atual</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Meta de novos contratos
                  </label>
                  <input
                    type="number"
                    value={settings.metaNovosContratos}
                    onChange={e => setSettings({ ...settings, metaNovosContratos: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Meta de novos leads
                  </label>
                  <input
                    type="number"
                    value={settings.metaNovosLeads}
                    onChange={e => setSettings({ ...settings, metaNovosLeads: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-900 text-[13px] focus:outline-hidden focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICAÇÕES */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-3.5 divide-y divide-stone-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Novos leads recebidos</div>
                  <div className="text-[11px] text-stone-400">Notificar chegada de contatos via WhatsApp ou site</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificarNovosLeads}
                  onChange={e => setSettings({ ...settings, notificarNovosLeads: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Propostas pendentes</div>
                  <div className="text-[11px] text-stone-400">Alertar propostas sem resposta há mais de 48 horas</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificarPropostasSemResposta}
                  onChange={e => setSettings({ ...settings, notificarPropostasSemResposta: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Contratos próximos ao vencimento</div>
                  <div className="text-[11px] text-stone-400">Exibir badge de renovação de cotas e guarda</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificarContratosPendentes}
                  onChange={e => setSettings({ ...settings, notificarContratosPendentes: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Antecedência dos alertas</div>
                  <div className="text-[11px] text-stone-400">Tempo prévio para aviso de renovação</div>
                </div>
                <select
                  value={settings.diasAlertaVencimento}
                  onChange={e => setSettings({ ...settings, diasAlertaVencimento: Number(e.target.value) })}
                  className="h-8.5 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 text-[12px] focus:outline-hidden focus:border-stone-400"
                >
                  <option value={15}>15 dias antes</option>
                  <option value={30}>30 dias antes</option>
                  <option value={45}>45 dias antes</option>
                  <option value={60}>60 dias antes</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB: INTERFACE */}
          {activeTab === 'interface' && (
            <div className="space-y-3.5 divide-y divide-stone-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Barra lateral compacta</div>
                  <div className="text-[11px] text-stone-400">Iniciar com o menu lateral recolhido por padrão</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sidebarColapsadaPadrao}
                  onChange={e => setSettings({ ...settings, sidebarColapsadaPadrao: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Efeitos sonoros</div>
                  <div className="text-[11px] text-stone-400">Sons discretos ao concluir ações e salvar propostas</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.somNotificacoes}
                  onChange={e => setSettings({ ...settings, somNotificacoes: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-medium text-stone-800">Densidade das tabelas</div>
                  <div className="text-[11px] text-stone-400">Espaçamento entre as linhas de dados</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, densidadeTabelas: 'confortavel' })}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      settings.densidadeTabelas === 'confortavel'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, densidadeTabelas: 'compacta' })}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      settings.densidadeTabelas === 'compacta'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Compacta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ATALHOS */}
          {activeTab === 'atalhos' && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Busca rápida', shortcut: 'Ctrl + K' },
                  { label: 'Fechar gavetas e modais', shortcut: 'Esc' },
                  { label: 'Ir para Dashboard', shortcut: 'Alt + D' },
                  { label: 'Ir para Clientes', shortcut: 'Alt + C' },
                  { label: 'Ir para Embarcações', shortcut: 'Alt + E' },
                  { label: 'Ir para Contratos', shortcut: 'Alt + T' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="h-9 px-3 rounded-lg border border-stone-100 bg-stone-50 flex items-center justify-between"
                  >
                    <span className="text-[12px] text-stone-700">{item.label}</span>
                    <kbd className="text-[10px] font-mono font-medium text-stone-500 bg-white border border-stone-200 rounded px-1.5 py-0.5">
                      {item.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Limpo */}
        <div className="px-6 py-3.5 bg-stone-50/70 border-t border-stone-200/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[12px] text-stone-400 hover:text-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Restart className="w-3 h-3" />
            <span>Restaurar padrões</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salvo</span>
                </>
              ) : isSaving ? (
                <span>Salvando…</span>
              ) : (
                <span>Salvar alterações</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
