import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
// @ts-ignore
import bgVideo from '../assets/videos/login_bg.mp4';
// @ts-ignore
import bgImage from '../assets/images/boat_jet_bg.webp';
import Logo from './Logo';

interface LoginPageProps {
  onLogin: (role?: string, name?: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Usuário ou senha inválidos.');
      }

      // Store JWT token securely
      localStorage.setItem('admin_token', data.token);
      if (data.role) localStorage.setItem('admin_role', data.role);
      if (data.nome || data.username) localStorage.setItem('admin_name', data.nome || data.username);
      onLogin(data.role, data.nome || data.username);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4 md:p-8 font-sans overflow-hidden">
      
      {/* Full screen video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-bottom z-0"
      >
        <source src={bgVideo} type="video/mp4" />
      </video>
      
      {/* Dark overlay for readability over the video background */}
      <div className="absolute inset-0 bg-slate-950/30 z-0" />

      {/* Main Container - True Glassmorphism */}
      <div className="relative z-10 w-full max-w-5xl bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex overflow-hidden min-h-[600px] border border-white/20">
        
        {/* Left Side - Image (Hidden on small screens) */}
        <div className="hidden md:block w-1/2 relative">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-70 mix-blend-overlay"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          {/* Logo Overlay */}
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center gap-3 border border-white/20 shadow-lg">
              <Logo className="h-9 w-9 text-[#B69D74]" />
              <span className="text-white font-medium tracking-[0.2em] text-sm uppercase">VILA NÁUTICA</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col bg-slate-900/40 text-white backdrop-blur-sm border-l border-white/10">

          <div className="mb-10 mt-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo className="h-10 w-10 text-[#B69D74] shrink-0" />
              <span className="text-[#B69D74] font-medium tracking-[0.2em] text-xs uppercase">VILA NÁUTICA</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-white">Acesso Interno</h1>
            <p className="text-white/70 text-sm leading-relaxed">
              Portal de colaboradores (Marina, Vale Administradora e Mexicano Lanchas).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-full text-white !text-white dark-input placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all sm:text-sm backdrop-blur-md"
                placeholder="Digite seu usuário"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-full text-white !text-white dark-input placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all sm:text-sm backdrop-blur-md"
                  placeholder="Sua senha"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-300 text-sm font-medium bg-red-900/30 p-3 rounded-lg border border-red-500/30 backdrop-blur-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white disabled:opacity-70 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin mx-auto" />
              ) : (
                "Entrar"
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
