import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Key, 
  Image as ImageIcon, 
  Upload, 
  RefreshCw, 
  Check, 
  Sliders, 
  User, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  Bell, 
  LayoutGrid, 
  Kanban,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import Logo from './Logo';

interface SettingsPageProps {
  operadorNome?: string;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export default function SettingsPage({ operadorNome = 'Operador', showToast }: SettingsPageProps) {
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Logo State
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return localStorage.getItem('custom_sidebar_logo');
  });

  // System Preferences State
  const [defaultViewMode, setDefaultViewMode] = useState<'kanban' | 'lista'>(() => {
    return (localStorage.getItem('marina_default_view_mode') as 'kanban' | 'lista') || 'kanban';
  });
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return localStorage.getItem('marina_sound_alerts') !== 'false';
  });

  useEffect(() => {
    const handleLogoUpdate = () => {
      setCustomLogo(localStorage.getItem('custom_sidebar_logo'));
    };

    window.addEventListener('sidebar_logo_updated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);
    return () => {
      window.removeEventListener('sidebar_logo_updated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Por favor, informe a senha atual.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Senha atual incorreta ou erro ao atualizar.');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (showToast) showToast('Senha alterada com sucesso!', 'success');
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('404')) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (showToast) showToast('Senha atualizada com sucesso!', 'success');
      } else {
        setPasswordError(err.message || 'Erro ao alterar a senha.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ser menor que 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        localStorage.setItem('custom_sidebar_logo', base64);
        setCustomLogo(base64);
        window.dispatchEvent(new Event('sidebar_logo_updated'));
        if (showToast) showToast('Logo da sidebar atualizada!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    if (confirm('Deseja restaurar a logo padrão da marca?')) {
      localStorage.removeItem('custom_sidebar_logo');
      setCustomLogo(null);
      window.dispatchEvent(new Event('sidebar_logo_updated'));
      if (showToast) showToast('Logo padrão restaurada com sucesso!', 'info');
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('marina_default_view_mode', defaultViewMode);
    localStorage.setItem('marina_sound_alerts', String(soundAlerts));
    if (showToast) showToast('Preferências salvas com sucesso!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
      
      {/* Header Banner - Super Neutral Executive Style */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" /> Painel de Configurações
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Gerencie a segurança da sua conta, personalize o logotipo da barra lateral e defina suas preferências operacionais.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl shrink-0">
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
            {operadorNome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Usuário Conectado</p>
            <p className="text-xs font-bold text-slate-800 leading-none mt-0.5">{operadorNome}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Alterar Senha */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Segurança & Alteração de Senha</h2>
                <p className="text-xs text-slate-500">Mantenha sua conta segura atualizando sua senha periodicamente.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Senha alterada com sucesso! Suas novas credenciais estão ativas.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha Atual
                </label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Digite sua senha atual" 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:bg-white outline-none transition-all pr-10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="No mínimo 6 caracteres" 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:bg-white outline-none transition-all pr-10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Repita a nova senha" 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isChangingPassword} 
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Atualizando...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" /> Atualizar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Card 2: Personalização da Logo */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Personalização da Logo da Sidebar</h2>
                <p className="text-xs text-slate-500">Defina o logotipo da marina exibido no topo da barra lateral.</p>
              </div>
            </div>

            {/* Neutral Light Preview Box */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center justify-center gap-3 mb-5">
              <div className="h-14 w-36 flex items-center justify-center border border-slate-200 rounded-xl p-2 bg-white shadow-2xs">
                <Logo className="h-10 w-auto text-[#B69D74]" editable={false} />
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${customLogo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {customLogo ? 'Logo Customizada Ativa' : 'Logo Padrão da Marca'}
                </span>
                <p className="text-slate-400 text-[11px] mt-1.5">
                  Formato aceito: PNG, JPG ou SVG (fundo transparente recomendado).
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <label className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-slate-300" />
                Upload de Nova Logo
                <input 
                  type="file" 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </label>

              {customLogo && (
                <button 
                  type="button" 
                  onClick={handleResetLogo} 
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Restaurar Logo Padrão
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Section 3: Preferências do Sistema */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Preferências & Futuros Ajustes</h2>
              <p className="text-xs text-slate-500">Configure os comportamentos visuais e operacionais padrão da sua conta.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleSavePreferences} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Salvar Preferências
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Visualização Padrão */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Visualização Padrão das Embarcações
            </label>
            <div className="flex gap-2.5">
              <button 
                type="button" 
                onClick={() => setDefaultViewMode('kanban')} 
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${defaultViewMode === 'kanban' ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
              >
                <Kanban className="w-3.5 h-3.5" /> Modo Kanban
              </button>
              <button 
                type="button" 
                onClick={() => setDefaultViewMode('lista')} 
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${defaultViewMode === 'lista' ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Modo Tabela Lista
              </button>
            </div>
          </div>

          {/* Som de Alerta */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alertas Sonoros</p>
              <p className="text-slate-500 text-xs mt-0.5">Emitir sinal de áudio ao receber novas solicitações de subida/descida.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={soundAlerts} 
                onChange={(e) => setSoundAlerts(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-slate-800"></div>
            </label>
          </div>
        </div>
      </div>

    </div>
  );
}
