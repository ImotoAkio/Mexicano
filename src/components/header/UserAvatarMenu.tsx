import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield, ChevronDown, CheckCircle } from 'lucide-react';

interface UserAvatarMenuProps {
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function UserAvatarMenu({ 
  userName, 
  userRole,
  onLogout 
}: UserAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic user name and role state
  const [displayName, setDisplayName] = useState<string>(() => {
    return userName || localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || 'Operador';
  });

  const [displayRole, setDisplayRole] = useState<string>(() => {
    return userRole || localStorage.getItem('admin_role') || 'marina_operador';
  });

  // Fetch logged in user info from /api/auth/validate
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    fetch('/api/auth/validate', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
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

  // Compute initials (e.g., "Akio Imoto" -> "AI", "Operador Marina" -> "OM")
  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return 'OP';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(displayName);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador Geral';
      case 'marina_gerente':
      case 'gerente':
        return 'Gerente da Marina';
      case 'marina_operador':
      case 'operador':
        return 'Operador de Pátio';
      case 'pecas_servicos':
        return 'Peças & Serviços';
      case 'financeiro':
        return 'Financeiro';
      case 'comercial':
        return 'Comercial';
      default:
        return 'Funcionário Logado';
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
      window.location.reload();
    }
  };

  return (
    <div className="relative font-sans" ref={menuRef}>
      
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-[#186b77] hover:bg-[#12555f] text-white font-black text-xs flex items-center justify-center shadow-2xs border border-[#145d68] transition-all cursor-pointer hover:scale-105 active:scale-95"
        title={`Perfil de ${displayName}`}
      >
        {initials}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* User Info Header */}
          <div className="p-4 bg-slate-900 text-white space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#186b77] text-white font-black text-sm flex items-center justify-center shadow-2xs border border-teal-400/40">
                {initials}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-extrabold text-sm text-white truncate">{displayName}</h4>
                <span className="text-[11px] font-semibold text-teal-300 block truncate">
                  {getRoleLabel(displayRole)}
                </span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Sessão Ativa na Marina</span>
            </div>
          </div>

          {/* Menu Options */}
          <div className="p-2 space-y-1 bg-white text-xs font-semibold text-slate-700">
            <div className="px-3 py-2 text-[10px] uppercase font-black tracking-wider text-slate-400">
              Conta & Sessão
            </div>

            <button
              onClick={handleLogoutClick}
              className="w-full text-left px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-extrabold transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sair do Sistema (Logout)</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
