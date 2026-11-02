import * as React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  X, Share, SquarePlus, Ellipsis, EllipsisVertical, Lock, ChevronLeft, ChevronRight,
  BookOpen, Copy, Check, Download, Compass, ExternalLink, ToggleRight, Smartphone,
} from 'lucide-react';
import type { InstallMethod, PWAPlatform } from '../../lib/pwaInstall';

interface InstallAppSheetProps {
  open: boolean;
  onClose: () => void;
  method: InstallMethod;
  platform: PWAPlatform;
  onNativeInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** On the dashboard (iOS) we remind that the installed app asks for login once */
  context: 'login' | 'dashboard';
}

const GOLD = '#B69D74';
const PORTAL_PATH = '/portal';

function portalUrl() {
  return `${window.location.origin}${PORTAL_PATH}`;
}

/* ───────────────────────── Browser chrome mocks ─────────────────────────
   Small, exact replicas of the bar the client must tap, with the target
   highlighted. Showing the real control beats describing it. */

function Target({ children, label }: { children: React.ReactNode; label: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex items-center justify-center w-9 h-9" aria-label={label}>
      {!reduce && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${GOLD}` }}
          animate={{ scale: [1, 1.35], opacity: [0.9, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <span className="absolute inset-0 rounded-full bg-[#B69D74]/20 ring-2 ring-[#B69D74]" />
      <span className="relative text-[#E2CDA8]">{children}</span>
    </span>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center justify-center w-9 h-9 text-white/35">{children}</span>;
}

function SafariModernBar() {
  // Safari 26 (iOS 26) compact layout: back · address · "•••"
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#1c1c1e] px-2 py-1.5 border border-white/[0.06]">
      <Muted><ChevronLeft className="w-5 h-5" /></Muted>
      <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5 text-[12px] text-white/70">
        <Lock className="w-3 h-3 shrink-0" />
        <span className="truncate">{window.location.host}</span>
      </div>
      <Target label="Botão Mais (•••)"><Ellipsis className="w-5 h-5" /></Target>
    </div>
  );
}

function SafariClassicBar() {
  // iOS ≤ 18 bottom toolbar: ‹ › Share Bookmarks Tabs
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#1c1c1e] px-3 py-1.5 border border-white/[0.06]">
      <Muted><ChevronLeft className="w-5 h-5" /></Muted>
      <Muted><ChevronRight className="w-5 h-5" /></Muted>
      <Target label="Botão Compartilhar"><Share className="w-5 h-5" /></Target>
      <Muted><BookOpen className="w-5 h-5" /></Muted>
      <Muted><Copy className="w-5 h-5" /></Muted>
    </div>
  );
}

function TopAddressBar({ target }: { target: 'share' | 'menu-vertical' | 'menu-dots' }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#1c1c1e] px-2 py-1.5 border border-white/[0.06]">
      <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-[12px] text-white/70">
        <Lock className="w-3 h-3 shrink-0" />
        <span className="truncate">{window.location.host}</span>
      </div>
      {target === 'share' && <Target label="Botão Compartilhar"><Share className="w-5 h-5" /></Target>}
      {target === 'menu-vertical' && <Target label="Menu (⋮)"><EllipsisVertical className="w-5 h-5" /></Target>}
      {target === 'menu-dots' && <Target label="Menu (•••)"><Ellipsis className="w-5 h-5" /></Target>}
    </div>
  );
}

/** Mimics a row of the iOS share sheet / Android menu so the client recognizes it */
function MenuRow({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl bg-[#1c1c1e] border border-white/[0.06] px-3.5 py-2.5">
      <span className="text-[13px] text-white/90">{label}</span>
      <span className="text-white/70">{icon}</span>
    </div>
  );
}

/* ───────────────────────── Steps ───────────────────────── */

interface Step {
  title: React.ReactNode;
  hint?: React.ReactNode;
  visual?: React.ReactNode;
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3.5">
          <span
            className="mt-0.5 w-6 h-6 shrink-0 rounded-full border border-[#B69D74]/40 text-[#D9C29B] text-[11px] font-semibold flex items-center justify-center tabular-nums"
            aria-hidden
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] leading-snug text-white/90">{s.title}</p>
            {s.hint && <p className="mt-1 text-[12px] leading-relaxed text-white/55">{s.hint}</p>}
            {s.visual && <div className="mt-2.5">{s.visual}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function iosSafariSteps(platform: PWAPlatform): Step[] {
  const modern = (platform.safariMajor ?? 0) >= 26;
  const addRow = <MenuRow label="Adicionar à Tela de Início" icon={<SquarePlus className="w-4 h-4" />} />;
  const finalStep: Step = {
    title: <>Toque em <strong className="font-semibold text-white">Adicionar</strong></>,
    hint: modern
      ? <>Deixe a opção <span className="text-white/80">“Abrir como App Web”</span> ativada.</>
      : 'O ícone da Vila Náutica vai aparecer na sua tela de início.',
    visual: modern ? <MenuRow label="Abrir como App Web" icon={<ToggleRight className="w-5 h-5 text-[#34C759]" />} /> : undefined,
  };

  if (platform.isIPad) {
    return [
      {
        title: <>Toque em <strong className="font-semibold text-white">Compartilhar</strong>, no topo da tela</>,
        hint: modern ? 'Se não aparecer, toque em ••• ao lado do endereço e depois em Compartilhar.' : 'Fica à direita da barra de endereço.',
        visual: <TopAddressBar target="share" />,
      },
      { title: <>Escolha <strong className="font-semibold text-white">Adicionar à Tela de Início</strong></>, visual: addRow },
      finalStep,
    ];
  }

  if (modern) {
    return [
      {
        title: <>Toque em <strong className="font-semibold text-white">•••</strong> na barra do Safari</>,
        hint: 'Fica ao lado do endereço do site, normalmente na parte de baixo da tela.',
        visual: <SafariModernBar />,
      },
      {
        title: <>Toque em <strong className="font-semibold text-white">Compartilhar</strong></>,
        visual: <MenuRow label="Compartilhar" icon={<Share className="w-4 h-4" />} />,
      },
      {
        title: <>Role a lista e toque em <strong className="font-semibold text-white">Adicionar à Tela de Início</strong></>,
        hint: 'Se não aparecer, toque em “Ver Mais” no fim da lista.',
        visual: addRow,
      },
      finalStep,
    ];
  }

  return [
    {
      title: <>Toque em <strong className="font-semibold text-white">Compartilhar</strong> na barra de baixo</>,
      hint: 'O quadrado com a seta para cima. Se a barra sumiu, role a página um pouco para cima.',
      visual: <SafariClassicBar />,
    },
    {
      title: <>Role a lista e toque em <strong className="font-semibold text-white">Adicionar à Tela de Início</strong></>,
      visual: addRow,
    },
    finalStep,
  ];
}

/* ───────────────────────── Sheet ───────────────────────── */

export default function InstallAppSheet({ open, onClose, method, platform, onNativeInstall, context }: InstallAppSheetProps) {
  const titleId = useId();
  const reduce = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [nativeFailed, setNativeFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setNativeFailed(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), 350);
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(t); };
  }, [open, onClose]);

  const copyLink = async () => {
    const url = portalUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const openInSystemBrowser = () => {
    const { host } = window.location;
    if (platform.os === 'android') {
      window.location.href = `intent://${host}${PORTAL_PATH}#Intent;scheme=https;package=com.android.chrome;end`;
    } else if (platform.os === 'ios') {
      // Opens Safari from embedded browsers on recent iOS versions; "Copiar link" is the fallback.
      window.location.href = `x-safari-https://${host}${PORTAL_PATH}`;
    }
  };

  const handleNative = async () => {
    setInstalling(true);
    const result = await onNativeInstall();
    setInstalling(false);
    if (result === 'accepted') onClose();
    else if (result === 'unavailable') setNativeFailed(true);
  };

  /* ── Content per method ── */
  let subtitle = 'Abra com um toque, em tela cheia, sem procurar o link.';
  let body: React.ReactNode = null;
  let primary: { label: string; icon: React.ReactNode; onClick: () => void; busy?: boolean } | null = null;
  let secondaryCopy = false;
  let footnote: React.ReactNode = null;

  const safariName = platform.os === 'ios' ? 'Safari' : 'Chrome';

  switch (method) {
    case 'native':
      subtitle = 'Instale em segundos. Não ocupa espaço como um app de loja.';
      body = nativeFailed ? (
        <p className="text-[13px] text-white/70 leading-relaxed">
          Não foi possível abrir a instalação automática. Toque em <strong className="text-white">⋮</strong> no navegador
          e escolha <strong className="text-white">Instalar app</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.
        </p>
      ) : (
        <ul className="space-y-2.5 text-[13px] text-white/75">
          <li className="flex items-center gap-2.5"><Smartphone className="w-4 h-4 text-[#B69D74] shrink-0" /> Ícone na tela inicial, como os outros apps</li>
          <li className="flex items-center gap-2.5"><Lock className="w-4 h-4 text-[#B69D74] shrink-0" /> Seu acesso fica salvo no aparelho</li>
        </ul>
      );
      primary = nativeFailed ? null : { label: 'Instalar agora', icon: <Download className="w-4 h-4" />, onClick: handleNative, busy: installing };
      break;

    case 'ios-safari':
      body = <Steps steps={iosSafariSteps(platform)} />;
      footnote = (
        <>
          Não encontrou a opção? Se você abriu pelo WhatsApp, toque no ícone do Safari{' '}
          <Compass className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden /> ou em “Abrir no Safari” e repita os passos.
        </>
      );
      break;

    case 'ios-chrome':
      body = (
        <Steps
          steps={[
            {
              title: <>Toque em <strong className="font-semibold text-white">Compartilhar</strong> ao lado do endereço</>,
              hint: 'Fica no topo da tela, à direita.',
              visual: <TopAddressBar target="share" />,
            },
            {
              title: <>Toque em <strong className="font-semibold text-white">Adicionar à Tela de Início</strong></>,
              hint: 'Se não aparecer, role a lista ou toque em “Mais”.',
              visual: <MenuRow label="Adicionar à Tela de Início" icon={<SquarePlus className="w-4 h-4" />} />,
            },
            { title: <>Confirme em <strong className="font-semibold text-white">Adicionar</strong></> },
          ]}
        />
      );
      footnote = 'Não apareceu? Copie o link, abra no Safari e instale por lá.';
      secondaryCopy = true;
      break;

    case 'ios-other':
      subtitle = 'No iPhone, a instalação funciona pelo Safari.';
      body = (
        <Steps
          steps={[
            { title: <>Toque em <strong className="font-semibold text-white">Copiar link</strong> aqui embaixo</> },
            { title: <>Abra o <strong className="font-semibold text-white">Safari</strong> e cole o link na barra de endereço</> },
            { title: 'Abra o portal e toque em “Instalar app” para ver os passos' },
          ]}
        />
      );
      primary = { label: copied ? 'Link copiado' : 'Copiar link', icon: copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: copyLink };
      break;

    case 'inapp':
      subtitle = `Dentro do ${platform.inAppName || 'aplicativo'} não é possível instalar. Abra no ${safariName}.`;
      body = (
        <Steps
          steps={[
            {
              title: <>Toque no menu <strong className="font-semibold text-white">{platform.os === 'android' ? '⋮' : '•••'}</strong> do {platform.inAppName || 'aplicativo'}</>,
              hint: 'Normalmente no canto superior direito.',
              visual: <TopAddressBar target={platform.os === 'android' ? 'menu-vertical' : 'menu-dots'} />,
            },
            {
              title: <>Escolha <strong className="font-semibold text-white">Abrir no {platform.os === 'ios' ? 'Safari' : 'navegador'}</strong></>,
              visual: <MenuRow label={platform.os === 'ios' ? 'Abrir no Safari' : 'Abrir no Chrome'} icon={<ExternalLink className="w-4 h-4" />} />,
            },
            { title: 'No navegador, toque em “Instalar app” e siga os passos' },
          ]}
        />
      );
      primary = { label: `Abrir no ${safariName}`, icon: <ExternalLink className="w-4 h-4" />, onClick: openInSystemBrowser };
      secondaryCopy = true;
      break;

    case 'android-manual': {
      const samsung = platform.browser === 'samsung';
      body = (
        <Steps
          steps={samsung ? [
            { title: <>Toque no menu <strong className="font-semibold text-white">≡</strong> na barra de baixo</> },
            { title: <>Toque em <strong className="font-semibold text-white">Adicionar página a</strong> e depois em <strong className="font-semibold text-white">Tela de início</strong></> },
            { title: <>Confirme em <strong className="font-semibold text-white">Adicionar</strong></> },
          ] : [
            {
              title: <>Toque em <strong className="font-semibold text-white">⋮</strong> no canto superior direito</>,
              visual: <TopAddressBar target="menu-vertical" />,
            },
            {
              title: <>Toque em <strong className="font-semibold text-white">Instalar app</strong> ou <strong className="font-semibold text-white">Adicionar à tela inicial</strong></>,
              visual: <MenuRow label="Instalar app" icon={<Download className="w-4 h-4" />} />,
            },
            { title: <>Confirme em <strong className="font-semibold text-white">Instalar</strong></> },
          ]}
        />
      );
      footnote = 'Se aparecer “Abrir app” no menu, o app já está instalado no seu celular.';
      break;
    }

    default:
      body = <p className="text-[13px] text-white/70">Abra este endereço no seu celular para instalar o app.</p>;
      secondaryCopy = true;
  }

  const iosLoginNote = context === 'dashboard' && platform.os === 'ios' && method !== 'inapp' && method !== 'ios-other';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full sm:max-w-[420px] max-h-[88dvh] flex flex-col bg-[#0c0c0c] text-white rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-white/[0.07] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.85)] font-sans"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* Grab handle */}
            <div className="pt-2.5 flex justify-center sm:hidden" aria-hidden>
              <span className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-5 flex items-start gap-4">
              <img
                src="/icons/icon-192x192.png"
                alt=""
                width={56}
                height={56}
                className="w-14 h-14 rounded-[14px] shrink-0 shadow-[0_6px_20px_-6px_rgba(182,157,116,0.45)]"
              />
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 id={titleId} className="text-[17px] font-medium tracking-[-0.01em] text-white leading-snug [text-wrap:balance]">
                  Vila Náutica na sua tela de início
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="-mr-2 -mt-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B69D74] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-2 overflow-y-auto overscroll-contain">
              {body}

              {iosLoginNote && (
                <p className="mt-5 text-[12px] leading-relaxed text-[#D9C29B]/90 bg-[#B69D74]/[0.08] rounded-xl px-3.5 py-3">
                  Ao abrir pelo ícone, entre de novo com seu CPF. É só na primeira vez.
                </p>
              )}

              {footnote && <p className="mt-5 text-[12px] leading-relaxed text-white/50">{footnote}</p>}
            </div>

            {/* Actions */}
            <div className="px-6 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
              {primary && (
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={primary.onClick}
                  disabled={primary.busy}
                  className="w-full h-12 rounded-xl bg-[#B69D74] hover:bg-[#c4ab82] active:scale-[0.99] disabled:opacity-60 text-[#141210] text-[13px] font-semibold tracking-wide flex items-center justify-center gap-2 transition-[background-color,transform] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B69D74]"
                >
                  {primary.busy ? (
                    <span className="w-4 h-4 rounded-full border-2 border-[#141210]/30 border-t-[#141210] animate-spin" />
                  ) : primary.icon}
                  {primary.label}
                </button>
              )}

              {secondaryCopy && (
                <button
                  type="button"
                  onClick={copyLink}
                  className="w-full h-11 rounded-xl border border-white/10 hover:bg-white/[0.04] text-white/80 text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B69D74]"
                >
                  {copied ? <Check className="w-4 h-4 text-[#B69D74]" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link copiado' : 'Copiar link'}
                </button>
              )}

              <button
                ref={primary ? undefined : primaryRef}
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl text-white/55 hover:text-white/85 text-[13px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B69D74]"
              >
                {primary || secondaryCopy ? 'Agora não' : 'Entendi'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
