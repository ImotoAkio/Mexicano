import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  NavArrowDown,
  Settings,
  StatsReport,
  KeyCommand,
  PercentageSquare,
} from 'iconoir-react';
import ComercialSettingsModal, {
  loadComercialSettings,
} from '../comercial/ComercialSettingsModal';
import FinanceiroSettingsModal, {
  loadFinanceiroSettings,
} from '../finance/FinanceiroSettingsModal';

export interface UserAvatarMenuProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  onLogout?: () => void;
  onOpenSettings?: (tab?: 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos' | 'regras') => void;
  brand?: 'mexicano' | 'marina' | 'auto';
  buttonClassName?: string;
  showDetailsOnDesktop?: boolean;
}

export default function UserAvatarMenu({
  userName,
  userRole,
  userEmail,
  onLogout,
  onOpenSettings,
  brand = 'auto',
  buttonClassName,
  showDetailsOnDesktop = true,
}: UserAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos' | 'regras'>('perfil');
  const menuRef = useRef<HTMLDivElement>(null);

  const isComercialRole =
    userRole?.toLowerCase() === 'comercial' ||
    (typeof window !== 'undefined' && localStorage.getItem('admin_role')?.toLowerCase() === 'comercial') ||
    (typeof window !== 'undefined' && window.location.pathname.includes('/comercial'));

  const isMexicanoBrand =
    brand === 'mexicano' ||
    (buttonClassName && buttonClassName.includes('mx-')) ||
    isComercialRole;

  const [comercialSettings, setComercialSettings] = useState(() => loadComercialSettings());

  // Dynamic state
  const [username, setUsername] = useState<string>(() => {
    return (
      localStorage.getItem('admin_username') ||
      (userName && !userName.includes(' ') && userName.length <= 15 ? userName : '') ||
      'fin'
    );
  });

  const [colaboradorNome, setColaboradorNome] = useState<string>(() => {
    const fs = loadFinanceiroSettings();
    if (fs.nome && fs.nome.trim() && fs.nome !== 'Financeiro Mexicano') return fs.nome;
    const adminName = localStorage.getItem('admin_name');
    if (adminName && adminName.trim()) return adminName;
    if (userName && userName.trim()) return userName;
    return '';
  });

  const [displayName, setDisplayName] = useState<string>(() => {
    if (isComercialRole) {
      const hasSaved = typeof window !== 'undefined' && Boolean(localStorage.getItem('comercial_user_settings'));
      const cs = loadComercialSettings();
      if (hasSaved && cs.nome) return cs.nome;
      if (userName && userName.trim()) return userName;
      if (cs.nome) return cs.nome;
    } else {
      const hasSaved = typeof window !== 'undefined' && Boolean(localStorage.getItem('financeiro_user_settings'));
      const fs = loadFinanceiroSettings();
      if (hasSaved && fs.nome) return fs.nome;
      if (userName && userName.trim()) return userName;
      if (fs.nome) return fs.nome;
    }
    if (userName && userName.trim()) return userName;
    return (
      localStorage.getItem('admin_name') ||
      localStorage.getItem('admin_username') ||
      (isComercialRole ? 'Comercial' : 'Financeiro')
    );
  });

  const [displayRole, setDisplayRole] = useState<string>(() => {
    if (isComercialRole) {
      const cs = loadComercialSettings();
      if (cs.cargo) return cs.cargo;
      return 'Comercial Mexicano';
    }
    const fs = loadFinanceiroSettings();
    if (fs.cargo) return fs.cargo;
    return userRole || localStorage.getItem('admin_role') || 'Financeiro';
  });

  const [email, setEmail] = useState<string>(() => {
    if (userEmail && userEmail.trim()) return userEmail;
    if (isComercialRole) {
      const cs = loadComercialSettings();
      if (cs.email) return cs.email;
      return 'comercial@elmexicano.com.br';
    }
    const fs = loadFinanceiroSettings();
    if (fs.email) return fs.email;
    const r = (userRole || localStorage.getItem('admin_role') || '').toLowerCase();
    if (r === 'financeiro') return 'financeiro@elmexicano.com.br';
    return 'usuario@elmexicano.com.br';
  });

  const [telefone, setTelefone] = useState<string>(() => {
    if (isComercialRole) {
      return loadComercialSettings().telefone || '';
    }
    const fs = loadFinanceiroSettings();
    return fs.telefone || '';
  });

  // Sync state if props change dynamically
  useEffect(() => {
    if (userName && userName.trim()) {
      setDisplayName(userName);
    }
  }, [userName]);

  useEffect(() => {
    if (userRole && userRole.trim()) {
      setDisplayRole(userRole);
    }
  }, [userRole]);

  // Listen for settings update events (comercial or financeiro)
  useEffect(() => {
    if (isComercialRole) {
      const handleSettingsUpdate = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          setComercialSettings(customEvent.detail);
          if (customEvent.detail.nome !== undefined) setDisplayName(customEvent.detail.nome);
          if (customEvent.detail.email !== undefined) setEmail(customEvent.detail.email);
          if (customEvent.detail.cargo !== undefined) setDisplayRole(customEvent.detail.cargo);
          if (customEvent.detail.telefone !== undefined) setTelefone(customEvent.detail.telefone);
        }
      };
      window.addEventListener('comercial-settings-updated', handleSettingsUpdate);
      return () => window.removeEventListener('comercial-settings-updated', handleSettingsUpdate);
    } else {
      const handleFinanceSettingsUpdate = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          if (customEvent.detail.nome !== undefined) {
            setDisplayName(customEvent.detail.nome);
            setColaboradorNome(customEvent.detail.nome);
          }
          if (customEvent.detail.cargo !== undefined) setDisplayRole(customEvent.detail.cargo);
        }
      };
      window.addEventListener('financeiro-settings-updated', handleFinanceSettingsUpdate);
      return () => window.removeEventListener('financeiro-settings-updated', handleFinanceSettingsUpdate);
    }
  }, [isComercialRole]);

  // Fetch logged in user info
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    fetch('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.valid) {
          if (data.username) {
            localStorage.setItem('admin_username', data.username);
            setUsername(data.username);
          }
          const resolvedName = data.nome || data.username;
          if (resolvedName) {
            localStorage.setItem('admin_name', resolvedName);
            setColaboradorNome(resolvedName);
            if (!isComercialRole) {
              setDisplayName(resolvedName);
            }
          }
          if (data.role) {
            localStorage.setItem('admin_role', data.role);
            if (!isComercialRole) {
              setDisplayRole(data.role);
            }
          }
        }
      })
      .catch(console.warn);
  }, [isComercialRole]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getInitials = (name: string) => {
    const target = (colaboradorNome && colaboradorNome.trim()) || (name && name.trim()) || username || (isComercialRole ? 'MX' : 'FN');
    const parts = target.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(colaboradorNome || displayName);

  const getRoleLabel = (role?: string) => {
    const r = (role || '').toLowerCase().trim();
    switch (r) {
      case 'admin':
        return 'Administrador';
      case 'comercial':
        return 'Comercial Mexicano';
      case 'financeiro':
        return 'Financeiro';
      case 'marina_gerente':
      case 'gerente':
        return 'Gerente Marina';
      case 'marina_operador':
        return 'Operador Marina';
      case 'pecas_servicos':
        return 'Peças & Serviços';
      default:
        return role || (isComercialRole ? 'Comercial' : 'Operador');
    }
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_name');
      localStorage.removeItem('admin_role');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
  };

  const handleOpenSettingsTab = (tab: 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos' | 'regras') => {
    setIsOpen(false);
    if (onOpenSettings) {
      onOpenSettings(tab);
    } else {
      setInitialSettingsTab(tab);
      setInternalSettingsOpen(true);
    }
  };

  const metaPercent = Math.min(
    100,
    Math.round(((comercialSettings.faturamentoAtual || 0) / (comercialSettings.metaMensalFaturamento || 1)) * 100)
  );

  return (
    <div className="relative font-sans text-stone-900" ref={menuRef}>
      {/* Trigger Button na Topbar — Clean, fino e alinhado aos outros botões h-9 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-2 rounded-lg flex items-center gap-2 hover:bg-stone-100 transition-colors cursor-pointer group text-left border border-transparent hover:border-stone-200/60"
        title={`Conta de ${displayName}`}
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200/90 text-stone-700 font-semibold text-[11px] flex items-center justify-center shrink-0 group-hover:bg-stone-200/80 transition-colors">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        {showDetailsOnDesktop && (
          <div className="hidden lg:flex flex-col text-left leading-none">
            <span className="text-[13px] font-semibold text-stone-800 group-hover:text-stone-900 truncate max-w-[140px]">
              {colaboradorNome && colaboradorNome.toLowerCase() !== username.toLowerCase()
                ? colaboradorNome
                : username}
            </span>
            <span className="text-[11px] text-stone-400 truncate max-w-[140px] mt-0.5 font-normal">
              @{username} • {getRoleLabel(displayRole)}
            </span>
          </div>
        )}

        <NavArrowDown
          className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Window — Minimalista, leve e clean */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-68 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_4px_10px_-3px_rgba(0,0,0,0.03)] border border-stone-200/90 z-50 p-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100">
          
          {/* Cabeçalho limpo com Usuário e Colaborador Vinculado */}
          <div className="px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {initials}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                  Colaborador Vinculado
                </div>
                <div className="text-[13px] font-bold text-stone-900 truncate leading-tight">
                  {colaboradorNome && colaboradorNome.toLowerCase() !== username.toLowerCase()
                    ? colaboradorNome
                    : 'Sem colaborador vinculado'}
                </div>
                <div className="text-[11px] font-medium text-stone-500 truncate leading-tight flex items-center gap-1 pt-0.5">
                  <span className="text-stone-400 text-[10px]">Usuário:</span>
                  <span className="font-mono text-stone-800 text-[11px]">@{username}</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-stone-500 font-medium truncate max-w-[170px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{getRoleLabel(displayRole)}</span>
              </span>
              <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-200/60 px-1.5 py-0.2 rounded font-medium shrink-0">
                Ativo
              </span>
            </div>
          </div>

          {/* Opções de Navegação & Configurações */}
          <div className="py-1 space-y-0.5">
            <button
              onClick={() => handleOpenSettingsTab('interface')}
              className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-3.5 h-3.5 text-stone-400" />
              <span className="flex-1 font-normal">Configurações</span>
              <span className="text-[10px] text-stone-400 font-normal">Preferências</span>
            </button>

            <button
              onClick={() => handleOpenSettingsTab('perfil')}
              className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="flex-1 font-normal">Meu Perfil</span>
            </button>

            {isComercialRole ? (
              <button
                onClick={() => handleOpenSettingsTab('metas')}
                className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
              >
                <StatsReport className="w-3.5 h-3.5 text-stone-400" />
                <span className="flex-1 font-normal">Metas Comerciais</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded tabular-nums">
                  {metaPercent}%
                </span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenSettingsTab('regras')}
                className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
              >
                <PercentageSquare className="w-3.5 h-3.5 text-stone-400" />
                <span className="flex-1 font-normal">Regras & Cobrança</span>
                <span className="text-[10px] text-stone-400 font-normal">Juros/Asaas</span>
              </button>
            )}

            <button
              onClick={() => handleOpenSettingsTab('atalhos')}
              className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <KeyCommand className="w-3.5 h-3.5 text-stone-400" />
              <span className="flex-1 font-normal">Atalhos</span>
              <kbd className="text-[10px] text-stone-400 border border-stone-200 bg-stone-50 rounded px-1 font-mono">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Sair do Sistema */}
          <div className="pt-1">
            <button
              onClick={handleLogoutClick}
              className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-600 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer text-left group"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-500" strokeWidth={1.75} />
              <span className="flex-1 font-normal">Sair do sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal interno de configurações */}
      {isComercialRole ? (
        <ComercialSettingsModal
          isOpen={internalSettingsOpen}
          onClose={() => setInternalSettingsOpen(false)}
          initialTab={initialSettingsTab === 'regras' ? 'metas' : initialSettingsTab}
        />
      ) : (
        <FinanceiroSettingsModal
          isOpen={internalSettingsOpen}
          onClose={() => setInternalSettingsOpen(false)}
          initialTab={initialSettingsTab === 'metas' ? 'regras' : initialSettingsTab}
        />
      )}
    </div>
  );
}
