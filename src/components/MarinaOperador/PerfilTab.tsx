import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  Key, 
  Loader2, 
  ShieldCheck, 
  UserCircle,
  Bell,
  Smartphone,
  Volume2,
  VolumeX,
  Vibrate,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  isSoundEnabled,
  setSoundEnabled,
  isVibrationEnabled,
  setVibrationEnabled,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  testMobileAlert,
  getStoredNotifications,
  getUnreadNotificationsCount
} from '../../utils/marinaNotifications';

export interface PerfilTabProps {
  operadorNome: string;
  isSocketConnected?: boolean;
  onLogout: () => void;
  showToast: (msg: string, type: 'info'|'success'|'warning') => void;
  onOpenNotifications?: () => void;
}

export const PerfilTab: React.FC<PerfilTabProps> = ({ 
  operadorNome, 
  isSocketConnected, 
  onLogout, 
  showToast,
  onOpenNotifications 
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  // Estados de Notificação
  const [soundActive, setSoundActive] = useState(isSoundEnabled());
  const [vibrationActive, setVibrationActive] = useState(isVibrationEnabled());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermissionStatus()
  );
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [testAlertMessage, setTestAlertMessage] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState({ total: 0, unread: 0 });

  const username = localStorage.getItem('admin_username') || 'Usuário';
  const role = localStorage.getItem('admin_role') || 'Operador';

  const refreshNotificationState = () => {
    setSoundActive(isSoundEnabled());
    setVibrationActive(isVibrationEnabled());
    setPermissionStatus(getNotificationPermissionStatus());
    const stored = getStoredNotifications();
    setNotifCount({
      total: stored.length,
      unread: stored.filter((n) => !n.read).length
    });
  };

  useEffect(() => {
    refreshNotificationState();

    const handleUpdate = () => {
      refreshNotificationState();
    };

    window.addEventListener('marina:notifications_updated', handleUpdate);
    window.addEventListener('marina:notification_settings_changed', handleUpdate);

    return () => {
      window.removeEventListener('marina:notifications_updated', handleUpdate);
      window.removeEventListener('marina:notification_settings_changed', handleUpdate);
    };
  }, []);

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    showToast(next ? 'Som de alertas ativado' : 'Som de alertas desativado', 'info');
  };

  const handleToggleVibration = () => {
    const next = !vibrationActive;
    setVibrationActive(next);
    setVibrationEnabled(next);
    showToast(next ? 'Vibração do celular ativada' : 'Vibração desativada', 'info');
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionStatus(res);
    if (res === 'granted') {
      showToast('Notificações no celular ativadas com sucesso!', 'success');
    } else if (res === 'denied') {
      showToast('Permissão de notificações bloqueada no navegador.', 'warning');
    }
  };

  const handleTestAlert = async () => {
    setIsTestingAlert(true);
    setTestAlertMessage(null);
    try {
      const res = await testMobileAlert();
      let msg = 'Alerta emitido!';
      if (res.vibrated && res.soundPlayed) {
        msg = 'Celular vibrou e tocou com sucesso!';
      } else if (res.vibrated) {
        msg = 'Celular vibrou com sucesso!';
      } else if (res.soundPlayed) {
        msg = 'Sinal sonoro reproduzido!';
      }
      setTestAlertMessage(msg);
      showToast(msg, 'success');
      setTimeout(() => setTestAlertMessage(null), 4000);
    } catch {
      showToast('Erro ao testar alerta.', 'warning');
    } finally {
      setIsTestingAlert(false);
    }
  };

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
    <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5 pb-24">
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
            <span>{isSocketConnected ? 'Sistema Online Conectado (Socket.io)' : 'Desconectado / Reconectando...'}</span>
          </div>
        </div>
      </div>

      {/* Alertas & Notificações no Celular */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Alertas no Celular</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Vibração, Som e Notificações Push
              </p>
            </div>
          </div>

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Histórico</span>
              {notifCount.unread > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {notifCount.unread}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Permissão de Notificações do Navegador */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-700 block truncate">Notificação Nativa</span>
              <span className="text-[10px] text-slate-500 block truncate">
                {permissionStatus === 'granted'
                  ? 'Ativada no aparelho'
                  : permissionStatus === 'denied'
                  ? 'Bloqueada no navegador'
                  : 'Necessita permissão'}
              </span>
            </div>
          </div>

          {permissionStatus === 'granted' ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ativo
            </span>
          ) : permissionStatus === 'unsupported' ? (
            <span className="text-[10px] text-slate-400 font-semibold">Não suportado</span>
          ) : (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              Ativar
            </button>
          )}
        </div>

        {/* Toggles: Som e Vibração */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Som Switch */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              soundActive
                ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {soundActive ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
              <span className="text-xs font-bold">Som</span>
            </div>
            <span className={`text-[10px] font-black uppercase ${soundActive ? 'text-blue-600' : 'text-slate-400'}`}>
              {soundActive ? 'Ligado' : 'Mudo'}
            </span>
          </button>

          {/* Vibração Switch */}
          <button
            type="button"
            onClick={handleToggleVibration}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              vibrationActive
                ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <Vibrate className={`w-4 h-4 ${vibrationActive ? 'text-blue-600' : ''}`} />
              <span className="text-xs font-bold">Vibração</span>
            </div>
            <span className={`text-[10px] font-black uppercase ${vibrationActive ? 'text-blue-600' : 'text-slate-400'}`}>
              {vibrationActive ? 'Ligada' : 'Desl.'}
            </span>
          </button>
        </div>

        {/* Test Alert Button */}
        <button
          type="button"
          onClick={handleTestAlert}
          disabled={isTestingAlert}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <Vibrate className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>{isTestingAlert ? 'Testando Dispositivo...' : 'Testar Vibração e Som no Celular'}</span>
        </button>

        {testAlertMessage && (
          <p className="text-xs font-bold text-center text-emerald-600 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
            {testAlertMessage}
          </p>
        )}
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
              <h3 className="font-bold text-slate-800 text-sm">Alterar Senha</h3>
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
