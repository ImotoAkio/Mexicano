import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MessageSquare, Star, ArrowRight, ArrowLeft, Send, CheckCircle2, User, Phone, Clipboard, EyeOff } from 'lucide-react';
import Logo from './Logo';

type StepType = 'rating' | 'content' | 'identification' | 'success';
type CategoryType = 'reclamacao' | 'sugestao' | 'elogio' | 'outro';

const EMOJIS = [
  { value: 1, char: '😠', label: 'Muito Insatisfeito', color: 'text-red-500' },
  { value: 2, char: '🙁', label: 'Insatisfeito', color: 'text-orange-400' },
  { value: 3, char: '😐', label: 'Neutro', color: 'text-yellow-400' },
  { value: 4, char: '🙂', label: 'Satisfeito', color: 'text-green-400' },
  { value: 5, char: '😍', label: 'Muito Satisfeito', color: 'text-emerald-500' }
];

const CATEGORIES = [
  { id: 'reclamacao' as CategoryType, label: 'Reclamação', desc: 'Nos ajude a corrigir problemas ou falhas.' },
  { id: 'sugestao' as CategoryType, label: 'Sugestão', desc: 'Ideias de melhoria para os nossos serviços.' },
  { id: 'elogio' as CategoryType, label: 'Elogio', desc: 'Reconheça nossa equipe ou instalações.' },
  { id: 'outro' as CategoryType, label: 'Outro', desc: 'Outros assuntos ou dúvidas gerais.' }
];

export default function FeedbackForm() {
  const [step, setStep] = useState<StepType>('rating');
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<CategoryType>('sugestao');
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  // Identification state
  const [cpf, setCpf] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCpfLoading, setIsCpfLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [identifiedClientName, setIdentifiedClientName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-format CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    
    let formatted = val;
    if (val.length > 9) {
      formatted = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6, 9)}-${val.substring(9)}`;
    } else if (val.length > 6) {
      formatted = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6)}`;
    } else if (val.length > 3) {
      formatted = `${val.substring(0, 3)}.${val.substring(3)}`;
    }
    setCpf(formatted);
    setCpfError('');
    setIdentifiedClientName('');
  };

  // Safe client search by CPF
  useEffect(() => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      setIsCpfLoading(true);
      setCpfError('');
      fetch('/api/feedbacks/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf })
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data.success && data.nome) {
          setIdentifiedClientName(data.nome);
        } else {
          setCpfError('Cadastro não localizado. Digite seus dados manualmente se preferir.');
        }
      })
      .catch(() => {
        setCpfError('Cadastro não localizado. Digite seus dados manualmente se preferir.');
      })
      .finally(() => {
        setIsCpfLoading(false);
      });
    }
  }, [cpf]);

  // Submit Feedback
  const handleSubmit = async () => {
    if (!rating) return;
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        nota: rating,
        categoria: category,
        comentario: comment,
        cpf: !isAnonymous ? cpf : undefined,
        nomeCliente: !isAnonymous ? (identifiedClientName || clientName) : undefined,
        telefoneCliente: !isAnonymous ? phone : undefined
      };

      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar feedback.');
      }

      setStep('success');
      triggerConfetti();
    } catch (err: any) {
      setError(err.message || 'Houve um erro de rede. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simple and gorgeous Canvas Confetti
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#B69D74', '#D4AF37', '#FFF', '#8A6D3B', '#E6C687'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    // Spawning particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height + 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 12,
        speedY: -(Math.random() * 15 + 10),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5
      });
    }

    let animationFrameId: number;

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.3; // Gravity
        p.speedX *= 0.98; // Air resistance
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 50) {
          active = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    update();

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-white selection:bg-[#B69D74]/30 selection:text-white">
      {/* Canvas for Success Confetti */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />

      {/* Decorative luxury radial background glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(182,157,116,0.06)_0%,_transparent_50%)] animate-pulse" style={{ animationDuration: '6s' }}></div>
      </div>

      <div className="w-full max-w-[460px] min-h-[100dvh] md:min-h-[780px] md:h-[780px] md:rounded-[2.5rem] bg-[#0c0c0c]/85 backdrop-blur-3xl md:border border-white/[0.04] shadow-[0_0_80px_rgba(0,0,0,0.9)] relative z-10 flex flex-col p-6 sm:p-10 justify-between overflow-y-auto subtle-scrollbar">
        
        {/* Top Header */}
        <header className="flex flex-col items-center pt-2">
          <div className="w-20 h-20 opacity-90 p-3 bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-inner mb-4">
            <Logo className="w-full h-full text-[#B69D74]" />
          </div>
          <h1 className="text-lg font-bold tracking-[0.25em] text-white/95 uppercase">
            Marina Club
          </h1>
          <p className="text-[10px] text-[#B69D74] font-semibold tracking-widest uppercase mt-1">
            Central de Opiniões
          </p>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#B69D74]/30 to-transparent mt-3 w-32"></div>
        </header>

        {/* STEP-BY-STEP WORKSPACE */}
        <main className="flex-1 my-8 flex flex-col justify-center">

          {/* STEP 1: RATING SELECTION */}
          {step === 'rating' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-white">Como foi sua experiência?</h2>
                <p className="text-xs text-white/50 px-4">Sua nota nos ajuda a mensurar o padrão do nosso atendimento e serviços.</p>
              </div>

              <div className="flex justify-between items-center px-2 py-4">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji.value}
                    onClick={() => setRating(emoji.value)}
                    className="flex flex-col items-center group relative focus:outline-none transition-all duration-300 transform hover:scale-115"
                  >
                    <span 
                      className={`text-4xl sm:text-5xl transition-all duration-300 filter drop-shadow-md select-none ${
                        rating === emoji.value 
                          ? 'scale-120 saturate-125 filter drop-shadow-[0_0_12px_rgba(182,157,116,0.4)]' 
                          : 'opacity-50 saturate-50 hover:opacity-90 hover:saturate-100'
                      }`}
                    >
                      {emoji.char}
                    </span>
                    <span 
                      className={`absolute -bottom-8 text-[9px] font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${
                        rating === emoji.value 
                          ? 'text-[#B69D74] opacity-100 scale-100 translate-y-0' 
                          : 'text-white/30 opacity-0 scale-90 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-95'
                      }`}
                    >
                      {emoji.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-8 flex justify-center">
                <button
                  disabled={rating === null}
                  onClick={() => setStep('content')}
                  className={`w-full max-w-[240px] flex items-center justify-center py-3.5 rounded-full font-semibold text-xs tracking-widest uppercase transition-all duration-300 border ${
                    rating !== null
                      ? 'bg-[#B69D74] text-[#050505] border-[#B69D74] hover:bg-[#a58c63] hover:shadow-[0_4px_20px_rgba(182,157,116,0.3)] cursor-pointer'
                      : 'bg-white/[0.02] text-white/20 border-white/[0.05] cursor-not-allowed'
                  }`}
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY & DETAILED FEEDBACK */}
          {step === 'content' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-500">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-white">Sobre o que gostaria de falar?</h2>
                <p className="text-xs text-white/50">Escolha a categoria e digite o seu comentário.</p>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                      category === cat.id
                        ? 'bg-[#B69D74]/10 border-[#B69D74] shadow-[0_0_15px_rgba(182,157,116,0.1)]'
                        : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                    }`}
                  >
                    <span className={`text-xs font-bold tracking-wide transition-colors ${
                      category === cat.id ? 'text-[#B69D74]' : 'text-white/80'
                    }`}>
                      {cat.label}
                    </span>
                    <p className="text-[9px] text-white/40 leading-snug mt-1 transition-colors group-hover:text-white/50">
                      {cat.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] text-white/50 font-bold tracking-wider uppercase">Sua Mensagem</label>
                  <span className={`text-[10px] ${comment.length > 450 ? 'text-red-400 font-bold' : 'text-white/30'}`}>
                    {comment.length}/500
                  </span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.substring(0, 500))}
                  placeholder="Escreva aqui sua reclamação, sugestão ou elogio de forma sincera. Sua opinião é muito valiosa para nós..."
                  rows={5}
                  className="w-full p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/70 focus:bg-white/[0.03] focus:ring-1 focus:ring-[#B69D74]/30 transition-all duration-300 resize-none"
                />
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setStep('rating')}
                  className="p-3.5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-white/80 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <button
                  disabled={!comment.trim()}
                  onClick={() => setStep('identification')}
                  className={`flex-1 flex items-center justify-center py-3.5 rounded-full font-semibold text-xs tracking-widest uppercase transition-all duration-300 border ${
                    comment.trim()
                      ? 'bg-[#B69D74] text-[#050505] border-[#B69D74] hover:bg-[#a58c63] hover:shadow-[0_4px_20px_rgba(182,157,116,0.3)] cursor-pointer'
                      : 'bg-white/[0.02] text-white/20 border-white/[0.05] cursor-not-allowed'
                  }`}
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IDENTIFICATION (OPTIONAL) */}
          {step === 'identification' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-6 duration-500">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-white">Identificação Opcional</h2>
                <p className="text-xs text-white/50">Você pode enviar este feedback anonimamente ou identificar-se se deseja um retorno direto.</p>
              </div>

              {/* Toggle Switch */}
              <div className="grid grid-cols-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <button
                  onClick={() => {
                    setIsAnonymous(true);
                    setError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                    isAnonymous
                      ? 'bg-[#B69D74] text-[#050505] font-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Anônimo</span>
                </button>
                
                <button
                  onClick={() => setIsAnonymous(false)}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                    !isAnonymous
                      ? 'bg-[#B69D74] text-[#050505] font-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Identificado</span>
                </button>
              </div>

              {/* Identified Fields Form */}
              {!isAnonymous && (
                <div className="space-y-3.5 p-4 border border-white/[0.04] bg-white/[0.01] rounded-2xl animate-in slide-in-from-top-4 duration-300">
                  
                  {/* CPF Search */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/50 font-bold tracking-wider uppercase">CPF cadastrado (Marina Club)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={cpf}
                        onChange={handleCpfChange}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/70 transition-all duration-300"
                      />
                      {isCpfLoading && (
                        <div className="absolute right-3.5 w-4 h-4 border-2 border-[#B69D74] border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>

                  {identifiedClientName ? (
                    <div className="p-3 bg-[#B69D74]/5 border border-[#B69D74]/20 rounded-xl flex items-center space-x-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#B69D74]" />
                      <div className="text-left">
                        <p className="text-[9px] text-[#B69D74] font-extrabold uppercase tracking-wide">Identificado com sucesso</p>
                        <p className="text-xs text-white/95 font-semibold mt-0.5">Olá, {identifiedClientName}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {cpfError && (
                        <p className="text-[10px] text-yellow-500/90 font-medium leading-relaxed px-1">
                          {cpfError}
                        </p>
                      )}
                      
                      {/* Manual Name */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-white/50 font-bold tracking-wider uppercase">Seu Nome Completo</label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Digite seu nome"
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/70 transition-all duration-300"
                        />
                      </div>

                      {/* Manual Phone */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-white/50 font-bold tracking-wider uppercase">Telefone para Contato</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(99) 99999-9999"
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#B69D74]/70 transition-all duration-300"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl text-xs text-center">
                  {error}
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="flex items-center space-x-3 pt-3">
                <button
                  disabled={isLoading}
                  onClick={() => setStep('content')}
                  className="p-3.5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-white/80 rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <button
                  disabled={isLoading || (!isAnonymous && !identifiedClientName && !clientName.trim())}
                  onClick={handleSubmit}
                  className={`flex-1 flex items-center justify-center py-3.5 rounded-full font-semibold text-xs tracking-widest uppercase transition-all duration-300 border ${
                    !isLoading && (isAnonymous || identifiedClientName || clientName.trim())
                      ? 'bg-[#B69D74] text-[#050505] border-[#B69D74] hover:bg-[#a58c63] hover:shadow-[0_4px_20px_rgba(182,157,116,0.3)] cursor-pointer'
                      : 'bg-white/[0.02] text-white/20 border-white/[0.05] cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Enviar Feedback</span>
                      <Send className="w-3.5 h-3.5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {step === 'success' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
              <div className="flex justify-center">
                <div className="relative">
                  {/* Outer breathing ring */}
                  <div className="absolute inset-0 bg-[#B69D74]/20 rounded-full scale-120 animate-ping" style={{ animationDuration: '3s' }}></div>
                  <div className="w-20 h-20 bg-gradient-to-br from-[#B69D74] to-[#8A6D3B] rounded-full flex items-center justify-center shadow-lg relative z-10 border border-[#B69D74]/30">
                    <CheckCircle2 className="w-10 h-10 text-[#050505]" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Muito obrigado!</h2>
                <p className="text-xs text-white/50 px-4 leading-relaxed">
                  Sua opinião é vital para nos ajudar a construir uma experiência excepcional para todos os proprietários do Marina Club.
                </p>
              </div>

              {rating !== null && rating >= 4 && (
                <div className="p-4 bg-[#B69D74]/5 border border-[#B69D74]/15 rounded-2xl space-y-3.5 mx-2 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                  <p className="text-xs text-[#B69D74] font-black uppercase tracking-wider">Sua avaliação foi incrível! ⭐</p>
                  <p className="text-[11px] text-white/60 leading-relaxed px-1">
                    Ficamos extremamente felizes! Se puder, nos dedique 30 segundos para deixar uma avaliação também no nosso perfil do Google. Isso nos apoia imensamente!
                  </p>
                  <a
                    href="https://g.page/r/CWQvwGdYpbNQEBM/review"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#B69D74] hover:bg-[#a58c63] text-[#050505] font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all duration-300 shadow-md hover:shadow-[0_4px_15px_rgba(182,157,116,0.35)] cursor-pointer"
                  >
                    <span>Avaliar no Google</span>
                    <Star className="w-3.5 h-3.5 ml-1.5 fill-current text-current" />
                  </a>
                </div>
              )}

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => {
                    setRating(null);
                    setComment('');
                    setCpf('');
                    setClientName('');
                    setPhone('');
                    setIdentifiedClientName('');
                    setIsAnonymous(true);
                    setStep('rating');
                  }}
                  className="w-full max-w-[220px] py-3 rounded-full border border-[#B69D74]/40 text-[#B69D74] hover:bg-[#B69D74]/10 font-semibold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
                >
                  Enviar Outro Feedback
                </button>
              </div>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="text-center pb-2 text-[9px] text-white/20 select-none">
          <p>© {new Date().getFullYear()} Grupo Marina Club. Todos os direitos reservados.</p>
        </footer>

      </div>
    </div>
  );
}
