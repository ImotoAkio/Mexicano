/**
 * PWA install support
 * ───────────────────
 * - Captures `beforeinstallprompt` globally (must run before React mounts, otherwise
 *   Chrome may fire the event while the lazy client dashboard is not mounted yet and
 *   the native install prompt is lost).
 * - Detects platform/browser so the UI can show the right install instructions
 *   (iOS has no install API: the user must use Safari's "Adicionar à Tela de Início").
 * - Persists dismissals so the invitation is not shown repeatedly.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

export type PWAOS = 'ios' | 'android' | 'desktop';

export type PWABrowser =
  | 'safari'
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'samsung'
  | 'opera'
  | 'inapp'
  | 'other';

export interface PWAPlatform {
  os: PWAOS;
  browser: PWABrowser;
  /** Friendly name of the in-app browser (Instagram, Facebook…), when detected */
  inAppName?: string;
  isIPad: boolean;
  /** Safari major version (iOS 26 moved "Compartilhar" into the "•••" menu) */
  safariMajor: number | null;
  isMobile: boolean;
}

/* ───────────────────────── Detection ───────────────────────── */

const IN_APP_PATTERNS: Array<[RegExp, string]> = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, 'Facebook'],
  [/WhatsApp/i, 'WhatsApp'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/TikTok|musical_ly|Bytedance/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/Pinterest/i, 'Pinterest'],
  [/Twitter/i, 'X'],
  [/Line\//i, 'Line'],
  [/Telegram/i, 'Telegram'],
  [/GSA\//i, 'Google'],
];

let cachedPlatform: PWAPlatform | null = null;

export function detectPlatform(): PWAPlatform {
  if (cachedPlatform) return cachedPlatform;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIPad =
    /iPad/.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const isIOS = /iPhone|iPod/.test(ua) || isIPad;
  const isAndroid = /Android/i.test(ua);
  const os: PWAOS = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  let browser: PWABrowser = 'other';
  let inAppName: string | undefined;

  const inApp = IN_APP_PATTERNS.find(([re]) => re.test(ua));
  if (inApp) {
    browser = 'inapp';
    inAppName = inApp[1];
  } else if (isIOS) {
    if (/CriOS/.test(ua)) browser = 'chrome';
    else if (/EdgiOS/.test(ua)) browser = 'edge';
    else if (/FxiOS/.test(ua)) browser = 'firefox';
    else if (/OPiOS|OPT\//.test(ua)) browser = 'opera';
    else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'safari';
    else browser = 'inapp'; // WKWebView without the Safari token = embedded browser
  } else if (isAndroid) {
    if (/; wv\)/.test(ua)) browser = 'inapp';
    else if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
    else if (/EdgA/i.test(ua)) browser = 'edge';
    else if (/Firefox/i.test(ua)) browser = 'firefox';
    else if (/OPR\//i.test(ua)) browser = 'opera';
    else if (/Chrome\//i.test(ua)) browser = 'chrome';
  } else {
    if (/Edg\//.test(ua)) browser = 'edge';
    else if (/Firefox/.test(ua)) browser = 'firefox';
    else if (/Chrome\//.test(ua)) browser = 'chrome';
    else if (/Safari\//.test(ua)) browser = 'safari';
  }

  const safariMatch = browser === 'safari' ? ua.match(/Version\/(\d+)/) : null;

  cachedPlatform = {
    os,
    browser,
    inAppName,
    isIPad,
    safariMajor: safariMatch ? parseInt(safariMatch[1], 10) : null,
    isMobile: os === 'ios' || os === 'android',
  };
  return cachedPlatform;
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  );
}

/* ───────────────────────── Global store ───────────────────────── */

interface InstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  installedThisSession: boolean;
}

let state: InstallState = {
  deferredPrompt: null,
  isStandalone: false,
  installedThisSession: false,
};
const listeners = new Set<() => void>();
let initialized = false;

function setState(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Call once, as early as possible (main.tsx, before rendering). */
export function initPWAInstallCapture() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  state = { ...state, isStandalone: isRunningStandalone() };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own UI
    setState({ deferredPrompt: e as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
    setState({ deferredPrompt: null, installedThisSession: true });
  });

  const mq = window.matchMedia?.('(display-mode: standalone)');
  mq?.addEventListener?.('change', () => setState({ isStandalone: isRunningStandalone() }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Triggers the native Android/Chrome install dialog. */
export async function promptNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const evt = state.deferredPrompt;
  if (!evt) return 'unavailable';
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    // The event can only be used once
    setState({ deferredPrompt: null });
    if (outcome === 'accepted') {
      markInstalled();
      setState({ installedThisSession: true });
    }
    return outcome;
  } catch {
    setState({ deferredPrompt: null });
    return 'unavailable';
  }
}

/* ───────────────────────── Dismissal policy ───────────────────────── */

const STORAGE_KEY = 'vn_pwa_install_v1';
const SESSION_KEY = 'vn_pwa_install_shown';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const MAX_AUTO_DISMISSALS = 3;

interface DismissRecord {
  count: number;
  last: number;
  installedAt?: number;
}

function readRecord(): DismissRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { count: 0, last: 0, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { count: 0, last: 0 };
}

function writeRecord(rec: DismissRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch { /* ignore */ }
}

export function recordDismissal() {
  const rec = readRecord();
  writeRecord({ ...rec, count: rec.count + 1, last: Date.now() });
}

function markInstalled() {
  writeRecord({ ...readRecord(), installedAt: Date.now() });
}

function markShownThisSession() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
}

function wasShownThisSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

/* ───────────────────────── React hook ───────────────────────── */

export type InstallMethod =
  | 'native'          // Android/Chrome/Edge/Samsung with beforeinstallprompt
  | 'ios-safari'      // Safari: Share → Adicionar à Tela de Início
  | 'ios-chrome'      // Chrome iOS (16.4+): Share → Adicionar à Tela de Início
  | 'ios-other'       // Edge/Firefox/Opera iOS: open in Safari
  | 'inapp'           // Instagram/Facebook/WhatsApp webviews: open in the real browser
  | 'android-manual'  // Android browser without prompt (Firefox, prompt not fired yet…)
  | 'unsupported';    // Desktop without prompt

export function resolveInstallMethod(platform: PWAPlatform, hasNativePrompt: boolean): InstallMethod {
  if (hasNativePrompt) return 'native';
  if (platform.browser === 'inapp') return 'inapp';
  if (platform.os === 'ios') {
    if (platform.browser === 'safari') return 'ios-safari';
    if (platform.browser === 'chrome') return 'ios-chrome';
    return 'ios-other';
  }
  if (platform.os === 'android') return 'android-manual';
  return 'unsupported';
}

interface UsePWAInstallOptions {
  /** Automatically open the invitation (respecting the dismissal policy) */
  autoShow?: boolean;
  /** Delay before auto-opening, so the invitation doesn't compete with the first paint */
  autoShowDelayMs?: number;
}

export function usePWAInstall({ autoShow = false, autoShowDelayMs = 2500 }: UsePWAInstallOptions = {}) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  const platform = detectPlatform();
  const method = resolveInstallMethod(platform, !!snapshot.deferredPrompt);
  const isInstalled = snapshot.isStandalone || snapshot.installedThisSession;

  /** Whether an "Instalar app" entry point makes sense on this device */
  const canOfferInstall = !isInstalled && method !== 'unsupported';

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!autoShow || isInstalled || isOpen) return;
    if (!platform.isMobile) return;
    if (wasShownThisSession()) return;

    // Android Chrome without the prompt usually means "already installed" or
    // "criteria not met yet" — don't nag; the manual entry point is still available.
    if (method === 'android-manual' || method === 'unsupported') return;

    const rec = readRecord();
    if (rec.installedAt && platform.os !== 'ios') return;
    if (rec.count >= MAX_AUTO_DISMISSALS) return;
    if (rec.last && Date.now() - rec.last < SNOOZE_MS) return;

    const t = window.setTimeout(() => {
      markShownThisSession();
      setIsOpen(true);
    }, autoShowDelayMs);
    return () => window.clearTimeout(t);
  }, [autoShow, autoShowDelayMs, isInstalled, isOpen, method, platform.isMobile, platform.os]);

  // Close automatically once installed
  useEffect(() => {
    if (isInstalled) setIsOpen(false);
  }, [isInstalled]);

  return {
    platform,
    method,
    isInstalled,
    canOfferInstall,
    hasNativePrompt: !!snapshot.deferredPrompt,
    isOpen,
    open: () => {
      markShownThisSession();
      setIsOpen(true);
    },
    /** Close + count as a dismissal (snooze) */
    dismiss: () => {
      recordDismissal();
      setIsOpen(false);
    },
    promptNativeInstall,
  };
}
