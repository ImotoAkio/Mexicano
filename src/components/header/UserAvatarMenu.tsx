import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  NavArrowDown,
  Settings,
  StatsReport,
  KeyCommand,
} from 'iconoir-react';
import ComercialSettingsModal, {
  loadComercialSettings,
} from '../comercial/ComercialSettingsModal';

export interface UserAvatarMenuProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  onLogout?: () => void;
  onOpenSettings?: () => void;
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
  const [initialSettingsTab, setInitialSettingsTab] = useState<'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos'>('perfil');
  const menuRef = useRef<HTMLDivElement>(null);

  const isMexicano =
    brand === 'mexicano' ||
    (brand !== 'marina' &&
      (userRole === 'comercial' ||
        (buttonClassName && buttonClassName.includes('mx-')) ||
        (typeof window !== 'undefined' && window.location.pathname.includes('comercial'))));

  // Dynamic state
  const [displayName, setDisplayName] = useState<string>(() => {
    if (userName) return userName;
    if (isMexicano) {
      const comercialSettings = loadComercialSettings();
      if (comercialSettings.nome) return comercialSettings.nome;
    }
    return (
      localStorage.getItem('admin_name') ||
      localStorage.getItem('admin_username') ||
      (isMexicano ? 'Comercial' : 'Operador')
    );
  });

  const [displayRole, setDisplayRole] = useState<string>(() => {
    return userRole || localStorage.getItem('admin_role') || (isMexicano ? 'comercial' : 'marina_operador');
  });

  const [email, setEmail] = useState<string>(() => {
    if (userEmail) return userEmail;
    if (isMexicano) {
      const comercialSettings = loadComercialSettings();
      if (comercialSettings.email) return comercialSettings.email;
    }
    return 'comercial@elmexicano.com.br';
  });

  // Listen for settings update events
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.nome) setDisplayName(customEvent.detail.nome);
        if (customEvent.detail.email) setEmail(customEvent.detail.email);
        if (customEvent.detail.cargo) setDisplayRole(customEvent.detail.cargo);
      }
    };
    window.addEventListener('comercial-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('comercial-settings-updated', handleSettingsUpdate);
  }, []);

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
          const resolvedName = data.nome || data.username;
          if (resolvedName) {
            setDisplayName(resolvedName);
            localStorage.setItem('admin_name', resolvedName);
          }
          if (data.role) {
            setDisplayRole(data.role);
            localStorage.setItem('admin_role', data.role);
          }
        }
      })
      .catch(console.warn);
  }, []);

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
    if (!name || name.trim() === '') return isMexicano ? 'MX' : 'OP';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(displayName);

  const getRoleLabel = (role?: string) => {
    if (isMexicano) {
      switch (role) {
        case 'admin':
          return 'Administrador';
        case 'comercial':
          return 'Comercial Mexicano';
        case 'financeiro':
          return 'Financeiro';
        default:
          return role || 'Comercial';
      }
    }
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'marina_gerente':
        return 'Gerente';
      case 'marina_operador':
        return 'Operador';
      case 'pecas_servicos':
        return 'Peças & Serviços';
      case 'financeiro':
        return 'Financeiro';
      default:
        return 'Operador';
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

  const handleOpenSettingsTab = (tab: 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos') => {
    setIsOpen(false);
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setInitialSettingsTab(tab);
      setInternalSettingsOpen(true);
    }
  };

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
            <span className="text-[13px] font-medium text-stone-800 group-hover:text-stone-900 truncate max-w-[120px]">
              {displayName}
            </span>
            <span className="text-[11px] text-stone-400 truncate max-w-[120px] mt-0.5 font-normal">
              {getRoleLabel(displayRole)}
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
        <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_4px_10px_-3px_rgba(0,0,0,0.03)] border border-stone-200/90 z-50 p-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100">
          
          {/* Cabeçalho limpo */}
          <div className="px-2.5 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-stone-900 truncate leading-tight">
                  {displayName}
                </div>
                <div className="text-[11px] text-stone-400 truncate leading-tight mt-0.5">
                  {email}
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-stone-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Mexicano Comercial
              </span>
              <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-200/60 px-1.5 py-0.2 rounded font-medium">
                Ativo
              </span>
            </div>
          </div>

          {/* Opções de Navegação & Configurações */}
          <div className="py-1 space-y-0.5">
            <button
              onClick={() => handleOpenSettingsTab('metas')}
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

            <button
              onClick={() => handleOpenSettingsTab('metas')}
              className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-[12.5px] text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <StatsReport className="w-3.5 h-3.5 text-stone-400" />
              <span className="flex-1 font-normal">Metas Comerciais</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded tabular-nums">
                81%
              </span>
            </button>

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
      <ComercialSettingsModal
        isOpen={internalSettingsOpen}
        onClose={() => setInternalSettingsOpen(false)}
        initialTab={initialSettingsTab}
      />
    </div>
  );
}
