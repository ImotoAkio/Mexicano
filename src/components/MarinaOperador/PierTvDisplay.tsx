import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Navigation, Clock, CheckCircle2 } from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import Logo from '../../components/Logo';

export default function PierTvDisplay() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination / Rotation state
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('Não autenticado. Faça login no sistema primeiro para exibir o painel.');
        return;
      }
      const res = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }
      if (!res.ok) throw new Error('Falha ao obter dados.');
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Backstop para 30s

    // Inicia a conexão do socket para receber push updates
    const token = localStorage.getItem('admin_token');
    if (!token) return () => clearInterval(interval);

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      console.log('[TVPier] Socket conectado:', socket.id);
    });

    socket.on('marina_update', (msg) => {
      console.log('[TVPier] Recebeu marina_update pelo Socket, buscando novos dados...', msg);
      fetchData(); // Atualiza a tela imediatamente quando recebe uma mudança
    });

    socket.on('disconnect', (reason) => {
       console.log('[TVPier] Socket desconectado:', reason);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const getEmbarcacao = (id: string) => data?.boats?.find((e: any) => e.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const reservasDoDia = (data?.reservations || []).filter((r: any) => {
    const dStr = (r.data || r.date || '').split('T')[0];
    return dStr === todayStr && r.status !== 'cancelado';
  });

  const activeItems = reservasDoDia.map((reserva: any) => {
    const boat = getEmbarcacao(reserva.embarcacaoId);

    // Default mapped values
    const isGuardado = reserva.statusMarina === 'guardada' || reserva.statusOperacional === 'guardado';
    const isChegada = reserva.statusMarina === 'chegada' || reserva.statusOperacional === 'retornou';
    const isPronto = reserva.statusMarina === 'pronta' || reserva.statusOperacional === 'pronto_na_agua' || (reserva.horaDescida && !reserva.horaSubida && !isGuardado && !isChegada);
    const isSaidaMar = !!reserva.horaSaida;
    const isConfirmado = !isGuardado && !isChegada && !isPronto && (reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada');

    let statusText = 'Agendado';
    let statusClass = 'bg-[#f0f0f5] text-[#86868b]';
    let dotColor = 'bg-[#86868b]';

    if (isGuardado) {
      statusText = 'Finalizada';
      statusClass = 'bg-[#f0f0f5] text-[#1d1d1f] opacity-60';
      dotColor = 'hidden';
    }
    else if (isChegada) {
      statusText = 'No Píer (Retorno)';
      statusClass = 'bg-[#fff5e5] text-[#bf4800]';
      dotColor = 'bg-[#f56108]';
    }
    else if (isSaidaMar) {
      statusText = 'Em Navegação';
      statusClass = 'bg-[#f0f4ff] text-[#0066cc]';
      dotColor = 'bg-[#0066cc]';
    }
    else if (isPronto) {
      statusText = 'Pronto no Píer';
      statusClass = 'bg-[#e5fcf4] text-[#008f5d]';
      dotColor = 'bg-[#00d084]';
    }
    else if (isConfirmado) {
      statusText = 'Em Preparação';
      statusClass = 'bg-[#ffffff] text-[#1d1d1f] border border-[#d2d2d7]/40 shadow-sm';
      dotColor = 'bg-[#0071e3]';
    }

    let timeLabel = reserva.previsaoSaida;
    if (!timeLabel) {
      if (statusText === 'Agendado') {
        timeLabel = '---';
      } else {
        timeLabel = reserva.periodo === 'manha' ? 'MANHÃ' : reserva.periodo === 'tarde' ? 'TARDE' : 'DIA TODO';
      }
    }

    return {
      id: reserva.id,
      boatName: boat ? getBoatCode(boat) : (reserva.barcoNome || 'S/N'),
      boatNumber: boat?.numero?.toString().padStart(2, '0') || boat?.nome?.match(/\d+/)?.[0]?.padStart(2, '0') || '--',
      time: timeLabel,
      statusText,
      statusClass,
      dotColor,
      isFinished: isGuardado,
      sortTime: reserva.previsaoSaida || '23:59',
      isLate: false
    };
  }).filter((i: any) => !i.isFinished);

  // Mark as late if scheduled time < currentTime and not ready
  activeItems.forEach((item: any) => {
    if (item.statusText.toUpperCase() === 'AGENDADO' || item.statusText.toUpperCase() === 'EM PREPARAÇÃO') {
      if (item.time && item.time.includes(':')) {
        const [h, m] = item.time.split(':').map(Number);
        const schedTime = new Date();
        schedTime.setHours(h, m, 0, 0);
        if (currentTime > schedTime) {
          item.statusText = 'Atrasada';
          item.statusClass = 'bg-[#fef0f0] text-[#e30000]';
          item.dotColor = 'bg-[#e30000]';
          item.isLate = true;
        }
      }
    }
  });

  activeItems.sort((a: any, b: any) => {
    if (a.isLate && !b.isLate) return -1;
    if (!a.isLate && b.isLate) return 1;
    return a.sortTime.localeCompare(b.sortTime);
  });

  const totalPages = Math.ceil(activeItems.length / ITEMS_PER_PAGE) || 1;
  const currentItems = activeItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Tempo dinâmico mais rápido: 2s por barco exibido + 4s fixos
  // 5 barcos = 14s. 1 barco = 6s.
  const pageTime = 4000 + (currentItems.length * 2000);

  useEffect(() => {
    if (totalPages > 1) {
      const rotTimer = setTimeout(() => {
        setPage(p => (p + 1) % totalPages);
      }, pageTime);
      return () => clearTimeout(rotTimer);
    } else {
      setPage(0);
    }
  }, [totalPages, page, currentItems.length, pageTime]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f7] text-[#1d1d1f]">
        <div className="w-12 h-12 border-4 border-[#e5e5ea] border-t-[#0071e3] rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#86868b]">Preparando Painel...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f7] text-[#1d1d1f] text-center px-4">
        <AlertTriangle className="w-16 h-16 mb-4 text-[#e30000]" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em] mb-2">Conexão Perdida</h2>
        <p className="text-[#86868b] text-lg mb-8 max-w-md">{error}</p>
        <button onClick={() => window.location.href = '/admin'} className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-medium rounded-full text-[17px] transition-colors">
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.05 } // Transição mais rápida entre os itens
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.99 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', bounce: 0, duration: 0.35 } // Mais rápido e com menos deslocamento (`y: 15` em vez de 30)
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.99,
      transition: { type: 'spring', bounce: 0, duration: 0.25 }
    }
  };

  return (
    <div className="h-screen w-full bg-[#f5f5f7] text-[#1d1d1f] overflow-hidden flex flex-col font-sans select-none antialiased">
      <style>
        {`
          @keyframes progressiveSlide {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
        `}
      </style>

      {/* HEADER - Apple Translucent Material */}
      <header className="px-12 py-6 bg-white/70 backdrop-blur-2xl border-b border-[#d2d2d7]/60 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center justify-center">
            <Logo useCustomLogo={true} className="h-14 w-auto max-w-[200px]" />
          </div>
          <div>
            <h1 className="text-[36px] leading-none font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Painel de Saídas
            </h1>
            <p className="text-[#86868b] font-medium tracking-tight mt-1">
              Ao vivo &bull; {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-5xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[26px] text-[#86868b] font-medium mb-1 tracking-tight">
                {currentTime.toLocaleTimeString('pt-BR', { second: '2-digit' }).split(':')[2] || currentTime.getSeconds().toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-[#86868b] text-[13px] font-medium mt-1 flex items-center justify-end gap-1.5 opacity-80 uppercase tracking-widest">
              Ao Vivo no Píer
            </div>
          </div>
        </div>
      </header>

      {/* COLUMNS HEADER */}
      <div className="w-full bg-transparent">
        <div className="w-full max-w-[1920px] mx-auto px-12">
          <div className="px-8 py-5 grid grid-cols-12 gap-8 text-[#86868b] text-[12px] font-semibold uppercase tracking-[0.05em]">
            <div className="col-span-2 flex items-center gap-2 pt-1"><Clock className="w-3.5 h-3.5"/> Previsão</div>
            <div className="col-span-1 flex justify-center pt-1">Vaga</div>
            <div className="col-span-5 pl-4 pt-1">Embarcação</div>
            <div className="col-span-4 flex justify-center pt-1">Status de Partida</div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <main className="flex-1 px-12 py-2 flex flex-col gap-4 overflow-hidden justify-center max-w-[1920px] mx-auto w-full">
        {activeItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 1.0, duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center opacity-80"
          >
            <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm border border-[#d2d2d7]/50 mb-6">
              <Navigation className="w-10 h-10 stroke-[1.5] text-[#86868b]" />
            </div>
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-2">O Píer está livre</h2>
            <p className="text-[19px] text-[#86868b]">Nenhuma saída programada para este momento.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout" custom={page}>
            <motion.div
              key={page}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-[14px] w-full"
            >
              {currentItems.map((item: any, i: number) => (
                <motion.div
                  layout
                  variants={itemVariants}
                  key={`${item.id}-${item.statusText}`}
                  className="grid grid-cols-12 gap-8 items-center bg-white rounded-[2rem] px-8 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow duration-300 border border-black/[0.02] will-change-transform"
                >
                  <div className="col-span-2 text-[38px] font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                    {item.time}
                  </div>

                  <div className="col-span-1 flex justify-center">
                     <div className="w-14 h-14 bg-[#f5f5f7] rounded-[14px] flex items-center justify-center border border-[#e5e5ea]">
                       <span className="text-[22px] font-medium text-[#86868b] tracking-tight">{item.boatNumber}</span>
                     </div>
                  </div>

                  <div className="col-span-5 flex flex-col justify-center pl-4 border-l border-[#e5e5ea] h-full">
                    <h3 className="text-[30px] font-semibold tracking-tight text-[#1d1d1f] truncate mt-0.5">
                      {item.boatName}
                    </h3>
                  </div>

                  <div className="col-span-4 flex justify-center">
                    <motion.div
                      layout="position"
                      className={`px-6 py-[14px] rounded-full flex items-center gap-3 w-full max-w-[320px] justify-center transition-colors duration-400 ${item.statusClass}`}
                    >
                      {item.dotColor !== 'hidden' && (
                        <div className={`w-2.5 h-2.5 rounded-full ${item.dotColor} ${item.statusText.toUpperCase() === 'EM PREPARAÇÃO' ? 'animate-pulse' : ''}`} />
                      )}
                      {item.statusText.toUpperCase() === 'PRONTO NO PÍER' && <CheckCircle2 className="w-5 h-5 opacity-90" />}
                      {item.isLate && <AlertTriangle className="w-5 h-5 opacity-90" />}
                      <span className="text-[19px] font-semibold tracking-[-0.01em] text-center">{item.statusText}</span>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* FOOTER PAGING & PROGRESS BAR - Apple Slim Design */}
      {totalPages > 1 && (
        <footer className="pb-8 pt-4 px-12 w-full flex flex-col gap-3 relative z-20">
          <div className="h-2.5 w-full flex gap-3">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className="flex-1 relative overflow-hidden rounded-full bg-[#d2d2d7]"
              >
                {i < page && <div className="absolute inset-0 bg-[#0071e3] rounded-full" />}
                {i === page && (
                  <div
                    key={`progress-${page}`}
                    className="absolute inset-0 bg-[#0071e3] rounded-full"
                    style={{ animation: `progressiveSlide ${pageTime}ms linear forwards`, transformOrigin: 'left' }}
                  />
                )}
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}