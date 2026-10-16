import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface AddWidgetDrawerProps {
  open: boolean;
  onClose: () => void;
}

/* Mini illustrations rendered inside each widget preview tile */

function DonutArt() {
  return (
    <div className="w-[72px] h-[72px] rounded-full bg-white shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 42 42" className="w-14 h-14 -rotate-90">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ece5e0" strokeWidth="6" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#2b1120" strokeWidth="6" strokeDasharray="58 42" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#8a6b78" strokeWidth="6" strokeDasharray="22 78" strokeDashoffset="-60" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#d9c8cf" strokeWidth="6" strokeDasharray="12 88" strokeDashoffset="-84" />
      </svg>
    </div>
  );
}

function BarsArt() {
  return (
    <div className="w-[88px] h-[64px] rounded-xl bg-white shadow-sm flex items-end justify-center gap-1.5 p-2.5">
      <span className="w-3.5 h-[45%] rounded bg-stone-200" />
      <span className="w-3.5 h-[75%] rounded bg-stone-200" />
      <span className="w-3.5 h-[95%] rounded bg-gradient-to-b from-mx-ink-500 to-mx-ink" />
    </div>
  );
}

function TrendArt() {
  return (
    <div className="w-[96px] h-[64px] rounded-xl bg-white shadow-sm p-2">
      <svg viewBox="0 0 80 46" className="w-full h-full">
        <defs>
          <linearGradient id="trendArtFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b4402f" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b4402f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M2 38 L20 26 L34 30 L52 16 L66 20 L78 6 L78 46 L2 46 Z" fill="url(#trendArtFill)" />
        <path d="M2 38 L20 26 L34 30 L52 16 L66 20 L78 6" fill="none" stroke="#b4402f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function SegmentArt() {
  return (
    <div className="w-[72px] h-[72px] rounded-full bg-white shadow-sm flex items-center justify-center">
      <div
        className="w-14 h-14 rounded-full"
        style={{ background: 'conic-gradient(#2b1120 0 40%, #b4402f 40% 65%, #4f7d32 65% 85%, #ece5e0 85% 100%)' }}
      />
    </div>
  );
}

function OverviewArt() {
  return (
    <div className="w-[96px] h-[64px] rounded-xl bg-white shadow-sm p-2.5 flex flex-col justify-between">
      <span className="h-1.5 w-10 rounded-full bg-stone-200" />
      <div className="flex items-end gap-1.5">
        <span className="text-[15px] font-semibold text-stone-900 leading-none tabular-nums">1.682</span>
        <span className="h-3 w-6 rounded bg-mx-green-50" />
      </div>
      <span className="h-1 w-14 rounded-full bg-stone-100" />
    </div>
  );
}

const WIDGETS = [
  {
    title: 'Origem dos leads',
    desc: 'Veja de onde vêm seus contatos: Instagram, indicação, site, WhatsApp ou visita ao Mexicano.',
    tag: '#Captação',
    art: <DonutArt />,
  },
  {
    title: 'Visão geral do funil',
    desc: 'Acompanhe as principais métricas do funil comercial e a evolução das negociações.',
    tag: '#Desempenho',
    art: <OverviewArt />,
  },
  {
    title: 'Desempenho de propostas',
    desc: 'Monitore propostas enviadas, aceitas e recusadas por vendedor em tempo real.',
    tag: '#Operação',
    art: <BarsArt />,
  },
  {
    title: 'Análise de tendência',
    desc: 'Compare a receita por período e identifique a sazonalidade das vendas de cotas e vagas.',
    tag: '#Estratégia',
    art: <TrendArt />,
  },
  {
    title: 'Segmentação de clientes',
    desc: 'Agrupe clientes por tipo de embarcação, plano contratado e frequência de uso.',
    tag: '#Público',
    art: <SegmentArt />,
  },
];

export default function AddWidgetDrawer({ open, onClose }: AddWidgetDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/25 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Adicionar widget"
        className={`absolute top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] max-w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        <header className="h-14 px-5 flex items-center justify-between border-b border-stone-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-stone-900">Adicionar widget</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {WIDGETS.map(w => (
            <article
              key={w.title}
              className="group flex gap-4 p-3 rounded-xl border border-stone-200/80 hover:border-mx-ink-100 hover:bg-mx-ink-50 transition-colors"
            >
              <div className="w-[120px] h-[104px] shrink-0 rounded-xl bg-stone-100 flex items-center justify-center">
                {w.art}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <h3 className="text-[13px] font-semibold text-stone-900">{w.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{w.desc}</p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-stone-500 bg-stone-100 rounded-md px-1.5 py-0.5">{w.tag}</span>
                  <button
                    onClick={onClose}
                    className="h-7 px-3 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Selecionar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
