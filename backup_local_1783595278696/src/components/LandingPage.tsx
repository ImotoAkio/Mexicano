import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, Anchor, MapPin, Phone, Mail, Shield, Calendar, Ship, Users, Star } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Início', href: '#inicio' },
  { label: 'Frota', href: '#frota' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Blog', href: '#blog' },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [boats, setBoats] = useState<any[]>([]);
  const [filter, setFilter] = useState('Todas');

  useEffect(() => {
    fetch('/api/public/boats')
      .then(r => r.ok ? r.json() : [])
      .then(setBoats)
      .catch(() => {});
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredBoats = filter === 'Todas' ? boats : boats.filter(b => b.tipo === filter);

  return (
    <div className="bg-white text-[#111111] font-sans overflow-x-hidden selection:bg-[#FF4E00] selection:text-white">

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className="fixed top-0 w-full z-50 bg-white py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          
          <button onClick={() => scrollTo('#inicio')} className="flex items-center gap-2 group shrink-0">
            <img src="/MEXICANO.png" alt="Mexicano Lanchas" className="h-10 md:h-12 w-auto object-contain" />
          </button>

          {/* Links */}
          <div className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map(l => (
              <button 
                key={l.href} 
                onClick={() => scrollTo(l.href)} 
                className="text-[13px] font-bold text-[#111111] hover:text-[#FF4E00] transition-colors uppercase tracking-wider"
              >
                {l.label}
              </button>
            ))}
            <a 
              href="/portal" 
              className="px-6 py-2.5 bg-[#FF4E00] text-white rounded-full text-[13px] font-bold hover:bg-[#E64600] transition-colors tracking-wide"
            >
              Área do Cliente
            </a>
          </div>

          {/* Location / Meta */}
          <div className="hidden lg:block text-right shrink-0">
            <p className="text-[11px] font-bold text-[#111111] tracking-wider uppercase">Petrolina - PE</p>
            <p className="text-[11px] font-medium text-[#666666]">Juazeiro - BA</p>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-[#111111]">
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 py-6 px-6 space-y-4 shadow-xl">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="block w-full text-left text-sm font-bold text-[#111111] hover:text-[#FF4E00] py-2 uppercase tracking-wide">
                {l.label}
              </button>
            ))}
            <a href="/portal" className="block w-full text-center mt-4 px-5 py-3 bg-[#FF4E00] text-white rounded-full text-sm font-bold">
              Área do Cliente
            </a>
          </div>
        )}
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section id="inicio" className="pt-32 pb-16 px-6 max-w-[1400px] mx-auto text-center">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[140px] font-black tracking-tighter text-[#111111] leading-none mb-8">
          FROTA NÁUTICA
        </h1>
        
        <div className="w-full h-[40vh] md:h-[50vh] lg:h-[60vh] rounded-[40px] overflow-hidden bg-gray-100 relative shadow-2xl mb-12">
          <img 
            src="/hero-boat.png" 
            alt="Hero Boat" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {['Todas', 'lancha', 'jet'].map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                filter === cat 
                  ? 'bg-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/20' 
                  : 'bg-white text-[#111111] border border-gray-200 hover:border-[#111111]'
              }`}
            >
              {cat === 'Todas' ? 'Todas as Embarcações' : cat === 'lancha' ? 'Lanchas' : 'Jet Skis'}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════ LIST ═══════════════ */}
      <section id="frota" className="pb-32 px-6 max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tight">TODAS AS EMBARCAÇÕES</h2>

        {boats.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 gap-8">
              {filteredBoats.slice(0, 2).map((boat: any, i: number) => (
                <div key={boat.id || i} className="bg-[#F7F7F7] rounded-[40px] p-8 md:p-12 flex relative overflow-hidden group">
                  
                  {/* Left Content */}
                  <div className="w-[60%] flex flex-col justify-between relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-[11px] font-bold text-[#FF4E00] shadow-sm mb-6 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#FF4E00] animate-pulse"></span>
                        M {boat.numero}
                      </div>

                      <h3 className="text-3xl md:text-4xl font-black text-[#111111] mb-2 leading-tight uppercase">
                        {boat.nome}
                      </h3>
                      <p className="text-sm font-bold text-[#666666] mb-8">
                        {boat.fabricante || 'Fabricante'} | {boat.ano || '2023'}
                      </p>

                      <div>
                        <p className="text-2xl font-black text-[#111111]">
                          Mexicano Lanchas
                        </p>
                        <p className="text-xs font-bold text-[#666666] mt-1 uppercase tracking-wider">
                          Embarcação Exclusiva
                        </p>
                      </div>
                    </div>

                    <div className="mt-10">
                      <button onClick={() => window.open('https://wa.me/5587999827267', '_blank')} className="px-6 py-3 bg-white text-[#111111] font-bold text-sm rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 w-fit">
                        Ver Detalhes
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right Image (Top Down) */}
                  <div className="w-[40%] absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4 pointer-events-none">
                    <img 
                      src={boat.tipo === 'jet' ? '/boat-top.png' : '/boat-top.png'} 
                      alt={boat.nome} 
                      className="h-[120%] w-auto max-w-none object-contain translate-x-12 group-hover:-translate-y-4 transition-transform duration-700 ease-out"
                      style={{ filter: 'drop-shadow(-20px 20px 30px rgba(0,0,0,0.15))' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {filteredBoats.length > 2 && (
              <div className="mt-12 text-center">
                <button 
                  onClick={() => window.open('https://wa.me/5587999827267', '_blank')} 
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#111111] text-[#111111] font-black text-[15px] rounded-full shadow-sm hover:bg-[#111111] hover:text-white transition-all uppercase tracking-wide"
                >
                  Consultar Frota Completa
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-[#F7F7F7] rounded-[40px] h-[400px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#FF4E00] rounded-full animate-spin"></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════ SOBRE ═══════════════ */}
      <section id="sobre" className="py-24 bg-[#F9F9F9]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl h-[500px]">
              <img src="/about-marina.png" alt="Marina Vale Náuticos" className="w-full h-full object-cover" />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-bold text-[#FF4E00] shadow-sm mb-6 uppercase tracking-wider">
                Quem Somos
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#111111] leading-tight mb-6 tracking-tight">
                COMPRA <br className="hidden md:block"/>INTELIGENTE
              </h2>
              <p className="text-lg text-[#666666] mb-6 leading-relaxed font-medium">
                A Mexicano Lanchas é especialista na venda de cotas náuticas (lanchas e jet skis), revolucionando a forma como você adquire e desfruta de uma embarcação de luxo.
              </p>
              <p className="text-[#666666] mb-8 leading-relaxed">
                O nosso sistema de multipropriedade permite que uma única embarcação tenha mais de um dono. Os custos de aquisição, manutenção e o usufruto são divididos proporcionalmente entre os sócios, garantindo economia inteligente e zero preocupação.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Shield, title: 'Economia Compartilhada' },
                  { icon: Users, title: 'Multipropriedade' },
                  { icon: Anchor, title: 'Sem Dor de Cabeça' },
                  { icon: Ship, title: 'Barcos de Alto Padrão' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                      <item.icon className="w-5 h-5 text-[#FF4E00]" />
                    </div>
                    <span className="font-bold text-[#111111]">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ DIFERENCIAIS ═══════════════ */}
      <section id="servicos" className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[#111111] mb-6 tracking-tight">COMO FUNCIONA?</h2>
            <p className="text-lg text-[#666666] font-medium">Conheça as vantagens exclusivas do modelo de cotas da Mexicano Lanchas.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { 
                icon: Ship, 
                title: 'Sistema de Multipropriedade', 
                focus: 'Seu barco, sua cota', 
                desc: 'Acesse um bem náutico de alto padrão por um valor significativamente abaixo do mercado tradicional. A mesma embarcação, o mesmo luxo, mas dividido de forma inteligente e legalizada.' 
              },
              { 
                icon: Shield, 
                title: 'Economia Inteligente', 
                focus: 'Custos fracionados', 
                desc: 'Não pague sozinho por uma embarcação que você não usa todos os dias. Na Mexicano, os custos de aquisição, manutenção mensal, seguro e marina são divididos proporcionalmente entre os sócios.' 
              },
              { 
                icon: Users, 
                title: 'Sem Dor de Cabeça', 
                focus: 'Nós cuidamos de tudo', 
                desc: 'Você foca apenas no lazer. Toda a gestão administrativa, manutenção preventiva e resolução de problemas burocráticos fica por nossa conta para que você não tenha estresse.' 
              },
              { 
                icon: Star, 
                title: 'Experiência Plug & Play', 
                focus: 'Chegue e Navegue', 
                desc: 'Suas preocupações terminam no momento em que você chega à marina. Embarcações sempre prontas, limpas e revisadas. É só subir, curtir o dia no lago e, ao voltar, nós guardamos e lavamos o barco.' 
              },
            ].map((s, i) => (
              <div key={i} className="bg-[#F7F7F7] rounded-[30px] p-8 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                  <s.icon className="w-6 h-6 text-[#FF4E00]" />
                </div>
                <h3 className="text-2xl font-black text-[#111111] mb-2 uppercase tracking-wide">{s.title}</h3>
                <p className="text-sm font-bold text-[#FF4E00] uppercase tracking-wider mb-4">{s.focus}</p>
                <p className="text-[#666666] leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTATO ═══════════════ */}
      <section id="contato" className="py-24 bg-[#F9F9F9]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="bg-white rounded-[40px] p-8 md:p-16 shadow-xl grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-[#111111] mb-6 tracking-tight">FALE CONOSCO</h2>
              <p className="text-lg text-[#666666] mb-10 font-medium">
                Quer saber mais sobre o sistema de cotas? Estamos à disposição para esclarecer todas as suas dúvidas.
              </p>

              <div className="space-y-8">
                {[
                  { icon: MapPin, label: 'Localização', value: 'Petrolina - PE / Juazeiro - BA' },
                  { icon: Phone, label: 'WhatsApp', value: '(87) 99982-7267' },
                  { icon: Mail, label: 'E-mail', value: 'contato@valenauticos.com.br' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-[#F7F7F7] flex items-center justify-center shrink-0">
                      <c.icon className="w-6 h-6 text-[#FF4E00]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-1">{c.label}</p>
                      <p className="text-lg font-black text-[#111111]">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#F7F7F7] rounded-[30px] p-8 md:p-10">
              <h3 className="text-2xl font-black text-[#111111] mb-8 tracking-tight">ENVIE UMA MENSAGEM</h3>
              <form onSubmit={(e) => { e.preventDefault(); window.open('https://wa.me/5587999827267', '_blank'); }} className="space-y-5">
                <div>
                  <input type="text" className="w-full px-6 py-4 bg-white border-none rounded-2xl text-[#111111] placeholder-[#999999] font-medium focus:ring-2 focus:ring-[#FF4E00] outline-none transition-shadow" placeholder="Seu nome completo" />
                </div>
                <div>
                  <input type="tel" className="w-full px-6 py-4 bg-white border-none rounded-2xl text-[#111111] placeholder-[#999999] font-medium focus:ring-2 focus:ring-[#FF4E00] outline-none transition-shadow" placeholder="Seu WhatsApp" />
                </div>
                <button type="submit" className="w-full py-4 bg-[#FF4E00] text-white rounded-2xl font-black text-[15px] tracking-wide hover:bg-[#E64600] transition-colors flex items-center justify-center gap-2">
                  Falar no WhatsApp
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="bg-[#111111] text-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-8">
            <img src="/MEXICANO.png" alt="Mexicano Lanchas" className="h-16 w-auto object-contain brightness-0 invert" />
          </div>
          <p className="text-sm font-medium text-white/50 max-w-md mx-auto mb-8">
            Acesso inteligente ao mundo náutico através de cotas e multipropriedade. O máximo de prazer com o mínimo de preocupação.
          </p>
          <div className="flex items-center justify-center gap-8">
            <a href="/portal" className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">Área do Cliente</a>
            <a href="/admin" className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
