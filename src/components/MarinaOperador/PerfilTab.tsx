import React, { useState } from 'react';
import { User as UserIcon, LogOut, Key, Loader2, ShieldCheck, UserCircle } from 'lucide-react';

export interface PerfilTabProps {
  operadorNome: string;
  isSocketConnected?: boolean;
  onLogout: () => void;
  showToast: (msg: string, type: 'info'|'success'|'warning') => void;
}

export const PerfilTab: React.FC<PerfilTabProps> = ({ operadorNome, isSocketConnected, onLogout, showToast }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  const username = localStorage.getItem('admin_username') || 'Usuário';
  const role = localStorage.getItem('admin_role') || 'Operador';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos da senha.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('A nova senha não confere.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao alterar a senha.');
      }

      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwdForm(false);
    } catch (err: any) {
      showToast(err.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6 pb-24">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-6 relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 z-0" />

        <div className="relative z-10">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-md mx-auto text-blue-600">
            <UserCircle className="w-14 h-14" />
          </div>

          <div className="mt-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{operadorNome}</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              {role === 'admin' ? 'Administrador' : role === 'marina_gerente' ? 'Gerente' : 'Terminal de Operação'}
            </p>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login de Acesso</span>
            <span className="text-sm font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
              {username}
            </span>
          </div>

          <div className={`mt-4 w-full py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase flex items-center justify-center gap-2 border transition-colors ${
            isSocketConnected
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
              : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isSocketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{isSocketConnected ? 'Sistema Online Conectado' : 'Desconectado / Reconectando...'}</span>
          </div>
        </div>
      </div>

      {/* Change Password Block */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <button
          className="w-full flex items-center justify-between py-2 text-left"
          onClick={() => setShowPwdForm(!showPwdForm)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Alterar Senha</h3>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gerencie sua segurança</p>
            </div>
          </div>
          <div className="text-blue-600 font-bold text-xl leading-none px-2 relative top-[-2px]">
            {showPwdForm ? '-' : '+'}
          </div>
        </button>

        {showPwdForm && (
          <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                placeholder="Min. 6 caracteres"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Confirme Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                placeholder="Repita a nova senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </button>
          </form>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={() => {
          if (window.confirm('Deseja realmente sair?')) {
            onLogout();
          }
        }}
        className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold uppercase tracking-wider rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
      >
        <LogOut className="w-5 h-5" />
        Sair da Conta
      </button>

    </main>
  );
};
