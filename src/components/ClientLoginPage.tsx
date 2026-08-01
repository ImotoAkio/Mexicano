import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, ArrowLeft, ShieldCheck, Lock, Eye, FileText, Database, Info, X } from 'lucide-react';
import Logo from './Logo';

interface ClientLoginPageProps {
  onLoginSuccess: (token: string) => void;
}

type ViewState = 'splash' | 'welcome' | 'identifier' | 'password' | 'setup_password';

export default function ClientLoginPage({ onLoginSuccess }: ClientLoginPageProps) {
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('client_last_cpf') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<ViewState>('splash');
  
  const [clientName, setClientName] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [consent, setConsent] = useState(false);
  const [privacyTab, setPrivacyTab] = useState<'general' | 'data' | 'rights' | 'dpo'>('general');

  useEffect(() => {
    if (view === 'splash') {
      const timer = setTimeout(() => {
        setView('welcome');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Simple mask for CPF if it's only numbers, otherwise treat as username
    const onlyNumbers = val.replace(/\D/g, '');
    if (onlyNumbers.length > 0 && val.match(/^[0-9.-]+$/)) {
      if (onlyNumbers.length > 11) val = onlyNumbers.substring(0, 11);
      let formatted = onlyNumbers;
      if (onlyNumbers.length > 9) {
        formatted = `${onlyNumbers.substring(0, 3)}.${onlyNumbers.substring(3, 6)}.${onlyNumbers.substring(6, 9)}-${onlyNumbers.substring(9)}`;
      } else if (onlyNumbers.length > 6) {
        formatted = `${onlyNumbers.substring(0, 3)}.${onlyNumbers.substring(3, 6)}.${onlyNumbers.substring(6)}`;
      } else if (onlyNumbers.length > 3) {
        formatted = `${onlyNumbers.substring(0, 3)}.${onlyNumbers.substring(3)}`;
      }
      setIdentifier(formatted);
    } else {
      setIdentifier(val);
    }
  };

  const handleCheckIdentifier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier.trim()) {
      setError('Informe seu CPF ou nome de usuário.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/client/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar cadastro.');
      }
      
      if (data.needsRegistration) {
        setClientName(data.clientName || 'Cliente');
        setView('setup_password');
      } else {
        setClientName(data.clientName || 'Cliente');
        setView('password');
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao verificar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanId = identifier.replace(/\D/g, '');
      const response = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar login.');
      }

      try {
        localStorage.setItem('client_last_cpf', identifier);
      } catch (err) {}
      onLoginSuccess(data.token);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanId = identifier.replace(/\D/g, '');
      const response = await fetch('/api/auth/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar senha.');
      }

      // After successful registration, log them in automatically
      const loginResponse = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanId, password }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.token) {
        onLoginSuccess(loginData.token);
      } else {
        // Fallback if auto-login fails
        setView('password');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao configurar acesso.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-white selection:bg-[#B69D74]/30 selection:text-white">
      
      {/* Absolute Minimal Background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_50%)]"></div>
      </div>

      {/* Mobile Container */}
      <div className="w-full max-w-[420px] min-h-screen md:min-h-[820px] md:h-[820px] md:rounded-[2.5rem] bg-[#0a0a0a]/90 backdrop-blur-2xl md:border border-white/[0.03] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative z-10 flex flex-col p-8 md:p-10 overflow-y-auto subtle-scrollbar">
        
        {/* === SPLASH SCREEN VIEW === */}
        {view === 'splash' && (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="relative w-28 h-28 flex items-center justify-center [animation:luxury-scale-up_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
              <div className="w-full h-full opacity-90 p-4">
                <Logo className="w-full h-full text-[#B69D74]" />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center">
              <h1 className="text-xl font-medium tracking-[0.2em] text-white/90 [animation:luxury-reveal_1.5s_ease-out_0.5s_both]">
                VILA NÁUTICA
              </h1>
              <div className="h-[1px] bg-[#B69D74]/30 mt-4 [animation:luxury-line-expand_2.5s_ease-in-out_infinite_1s]"></div>
            </div>
          </div>
        )}

        {/* === WELCOME VIEW === */}
        {view === 'welcome' && (
          <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-700">
            <div className="pt-12 pb-8 flex justify-center">
              <div className="w-16 h-16 opacity-80">
                <Logo className="w-full h-full text-[#B69D74]" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
              <h1 className="text-2xl md:text-3xl font-light text-white tracking-wide leading-tight mb-4">
                Sua embarcação, <br /><span className="font-medium text-[#B69D74]">seu controle.</span>
              </h1>
              <p className="text-white/40 text-sm font-light leading-relaxed max-w-[280px]">
                Agendamentos, disponibilidade, status da lancha e painel financeiro.
              </p>
            </div>

            <div className="mt-auto pb-6 flex flex-col items-center">
              <button
                onClick={() => setView('identifier')}
                className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              </button>

              <div className="mt-12 text-center text-[10px] text-white/30 uppercase tracking-widest leading-loose">
                Ao prosseguir, você aceita nossos <br />
                <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors">Termos & Privacidade</button>
              </div>
            </div>
          </div>
        )}

        {/* === IDENTIFIER VIEW (CPF or Username) === */}
        {view === 'identifier' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="pt-2 pb-12">
              <button 
                onClick={() => { setView('welcome'); setError(''); }}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-2xl font-light text-white tracking-wide mb-1">
              Acesso
            </h2>
            <p className="text-white/40 text-sm font-light mb-10">
              Identifique-se para acessar o sistema.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleCheckIdentifier(e); }} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">CPF ou Usuário</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/50 focus:bg-[#151515] transition-all text-sm shadow-inner"
                  placeholder="Seu CPF ou usuário"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400/90 text-xs font-light flex items-center space-x-3">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full mt-4 py-4 bg-white hover:bg-white/90 text-black rounded-xl font-medium transition-all disabled:opacity-50 text-sm h-[54px] flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  'Continuar'
                )}
              </button>
            </form>

            <div className="mt-auto pt-10 text-center text-[10px] font-light text-white/30 uppercase tracking-widest leading-relaxed">
              Acesso restrito a clientes cadastrados.
            </div>
          </div>
        )}

        {/* === PASSWORD VIEW === */}
        {view === 'password' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="pt-2 pb-12">
              <button 
                onClick={() => { setView('identifier'); setError(''); setPassword(''); }}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-2xl font-light text-white tracking-wide mb-1">
              Olá, {clientName || 'Cliente'}
            </h2>
            <p className="text-white/40 text-sm font-light mb-10">
              Digite sua senha para acessar sua conta.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin(e); }} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">Senha secreta</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/50 focus:bg-[#151515] transition-all text-sm shadow-inner"
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400/90 text-xs font-light flex items-center space-x-3">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full mt-4 py-4 bg-white hover:bg-white/90 text-black rounded-xl font-medium transition-all disabled:opacity-50 text-sm h-[54px] flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  'Entrar no Portal'
                )}
              </button>
            </form>
          </div>
        )}

        {/* === SETUP PASSWORD VIEW === */}
        {view === 'setup_password' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="pt-2 pb-8">
              <button 
                onClick={() => { setView('identifier'); setError(''); setPassword(''); setConfirmPassword(''); }}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-2xl font-light text-white tracking-wide mb-1">
              Ativação
            </h2>
            <p className="text-white/40 text-sm font-light mb-8">
              Localizamos seu cadastro. Como este é seu primeiro acesso, crie uma senha segura.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleSetupPassword(e); }} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">Criar senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/50 focus:bg-[#151515] transition-all text-sm shadow-inner"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">Repetir senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/50 focus:bg-[#151515] transition-all text-sm shadow-inner"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400/90 text-xs font-light flex items-center space-x-3">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-start space-x-4 pt-2 pb-4">
                <div className="relative flex items-start pt-0.5">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="w-4 h-4 border-white/20 rounded bg-transparent checked:bg-[#B69D74] checked:border-[#B69D74] cursor-pointer appearance-none transition-colors"
                    required
                  />
                  {consent && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-black top-0.5">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 14 14" fill="none"><path d="M2 7.5L5.5 11L12 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
                <label htmlFor="consent" className="text-xs text-white/40 font-light cursor-pointer leading-relaxed">
                  Estou ciente e concordo com a <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-white hover:text-[#B69D74] transition-colors">Política de Privacidade</button>.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !consent}
                className="w-full py-4 bg-white hover:bg-white/90 text-black rounded-xl font-medium transition-all disabled:opacity-50 text-sm h-[54px] flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  'Ativar e Entrar'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Administrative Link at the bottom if on welcome screen */}
        {view === 'welcome' && (
          <div className="absolute top-8 right-8">
             <a href="/admin" className="text-[9px] uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors">
               Admin
             </a>
          </div>
        )}

        <div className="mt-auto pt-8 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">
            Um portal do Grupo Vila Náutica
          </p>
          <p className="text-[9px] text-white/10 mt-1">
            Desenvolvido por Echo
          </p>
        </div>

      </div>

      {/* Privacy Modal (Minimalist Premium Dark) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/95 backdrop-blur-xl transition-all duration-300">
          <div className="w-full max-w-xl bg-[#090909] rounded-[2rem] border border-white/[0.06] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 pb-4 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#B69D74]" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-light tracking-wide text-white">Segurança de Dados</h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#B69D74] mt-0.5">Política de Privacidade & LGPD</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrivacyModal(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex border-b border-white/[0.04] overflow-x-auto subtle-scrollbar">
              {[
                { id: 'general', label: 'Compromisso', icon: Info },
                { id: 'data', label: 'Dados Coletados', icon: Database },
                { id: 'rights', label: 'Seus Direitos', icon: Lock },
                { id: 'dpo', label: 'Contato DPO', icon: Eye }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = privacyTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPrivacyTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-5 py-3.5 text-xs font-medium tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                      isActive 
                        ? 'border-[#B69D74] text-[#B69D74] bg-[#B69D74]/[0.02]' 
                        : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="px-6 md:px-8 py-6 overflow-y-auto text-white/60 text-sm font-light leading-relaxed space-y-4 subtle-scrollbar flex-1">
              
              {privacyTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-white/80">
                    O <strong className="font-medium text-white/95">Grupo Vila Náutica</strong> composto por Vila Náutica, Vila Náutica, Vale Administradora e Passeios do Vale, preza pelo mais alto rigor no tratamento dos seus dados.
                  </p>
                  <p>
                    Esta aplicação foi desenvolvida sob rígidos padrões de segurança cibernética pela <strong className="text-white/85">Echo Desenvolvimento de Software</strong>, assegurando que toda informação trafegada e armazenada esteja devidamente protegida contra acessos não autorizados.
                  </p>
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-start space-x-3.5 mt-2">
                    <ShieldCheck className="w-5 h-5 text-[#B69D74] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/40 leading-relaxed">
                      Nosso compromisso é garantir a transparência no ciclo de vida dos seus dados pessoais, desde a coleta inicial até a eventual eliminação.
                    </p>
                  </div>
                </div>
              )}

              {privacyTab === 'data' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-white/90 font-medium text-xs uppercase tracking-wider mb-2">Quais informações tratamos?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Identificação Cadastral</span>
                      <p className="text-white/40">Nome completo, CPF, e-mail e telefone para autenticação e comunicação direta.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Vínculo de Cotas</span>
                      <p className="text-white/40">Associação às embarcações que você possui direito de cota compartilhada.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Histórico de Reservas</span>
                      <p className="text-white/40">Registro de das e períodos solicitados para navegação das embarcações.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Registros de Acesso</span>
                      <p className="text-white/40">Registros de login e IP para auditorias de segurança e prevenção a fraudes.</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 pt-2 border-t border-white/[0.04]">
                    <strong>Base Legal (Art. 7º, V da LGPD):</strong> O tratamento é fundamental para a execução de contrato ou de procedimentos preliminares relacionados a contrato do qual o cotista seja parte.
                  </p>
                </div>
              )}

              {privacyTab === 'rights' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-white/90 font-medium text-xs uppercase tracking-wider mb-2">Seus Direitos Previstos no Artigo 18 da LGPD</h3>
                  <ul className="space-y-2.5 text-xs text-white/50">
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Confirmação e Acesso:</strong> Confirmar que tratamos seus dados e solicitar cópia estruturada dos registros.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Retificação:</strong> Solicitar correção de dados que estejam errados, incompletos ou desatualizados.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Portabilidade:</strong> Exportar os seus dados pessoais (disponível no seu painel de cliente pós-login).</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Eliminação / Revogação:</strong> Solicitar exclusão do cadastro. Por motivos contratuais ou regulatórios de cotas ativas, alguns dados podem ser retidos conforme a legislação vigente.</span>
                    </li>
                  </ul>
                </div>
              )}

              {privacyTab === 'dpo' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-[#B69D74]" />
                  </div>
                  <h3 className="text-white font-medium text-sm">Encarregado pelo Tratamento de Dados (DPO)</h3>
                  <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                    Dúvidas sobre como seus dados são tratados ou solicitações de direitos previstos na LGPD podem ser enviadas diretamente ao nosso encarregado.
                  </p>
                  <div className="mt-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl inline-block">
                    <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">Canal de Atendimento DPO</span>
                    <span className="text-sm font-semibold font-mono text-[#B69D74]">dpo@valenauticos.com.br</span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 pt-4 flex justify-end border-t border-white/[0.04] bg-[#070707]">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-8 py-3.5 bg-white hover:bg-white/90 text-black rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg hover:shadow-white/5"
              >
                Compreendi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

