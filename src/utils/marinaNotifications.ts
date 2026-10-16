// Utility for Marina Operacional notifications, sound synthesis, phone vibration and localStorage history

export type MarinaNotificationType =
  | 'agendamento'
  | 'confirmacao'
  | 'cancelamento'
  | 'descida'
  | 'abastecimento'
  | 'pronta'
  | 'saida'
  | 'chegada'
  | 'subida'
  | 'cancelado'
  | 'combustivel'
  | 'fila'
  | 'update'
  | 'info';

export type MarinaNotificationSeverity = 'info' | 'success' | 'warning' | 'alert';

export interface MarinaNotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number; // ms
  type: MarinaNotificationType;
  severity: MarinaNotificationSeverity;
  read: boolean;
  operacao?: string;       // ex: "Nova Descida"
  boatCode?: string;       // ex: "M99" (apenas o código da embarcação)
  boatName?: string;       // ex: "M99"
  clientName?: string;     // ex: "Carlos Silva"
  previsaoSaida?: string;  // ex: "14:00"
  vaga?: string;
  reservationId?: string;
  details?: string;
}

/**
 * Retorna ESTRITAMENTE o código da embarcação no formato Mxx (ex: M99, M16, M03).
 * Prioriza código puro de duas ou mais casas sobre nome da embarcação.
 */
export function getStrictBoatCode(boat?: any, reservation?: any): string {
  if (boat) {
    if (boat.numero) {
      const cleanNum = String(boat.numero).trim().toUpperCase().replace(/^M/i, '');
      if (cleanNum) return `M${cleanNum.padStart(2, '0')}`;
    }
    if (boat.nome) {
      const match = String(boat.nome).match(/M\d+/i);
      if (match) return match[0].toUpperCase();
    }
    if (boat.id) {
      const match = String(boat.id).match(/M\d+/i);
      if (match) return match[0].toUpperCase();
    }
    if (typeof boat === 'string') {
      const match = boat.match(/M\d+/i);
      if (match) return match[0].toUpperCase();
      const clean = boat.trim().toUpperCase().replace(/^M/i, '');
      if (/^\d+$/.test(clean)) return `M${clean.padStart(2, '0')}`;
    }
  }

  if (reservation) {
    const fields = [
      reservation.embarcacaoNumero,
      reservation.barcoNome,
      reservation.embarcacaoNome,
      reservation.embarcacaoId,
      reservation.modeloAvulso
    ];
    for (const f of fields) {
      if (!f) continue;
      const str = String(f).trim();
      const match = str.match(/M\d+/i);
      if (match) return match[0].toUpperCase();
      const clean = str.replace(/^M/i, '').trim();
      if (/^\d+$/.test(clean)) return `M${clean.padStart(2, '0')}`;
    }
  }

  return 'M--';
}

const STORAGE_KEY_NOTIFICATIONS = 'marina_operador_notifications_history_v1';
const STORAGE_KEY_SOUND = 'marina_notification_sound_enabled';
const STORAGE_KEY_VIBRATION = 'marina_notification_vibration_enabled';
const STORAGE_KEY_PUSH = 'marina_notification_push_enabled';
const MAX_NOTIFICATIONS = 100;

// AudioContext singleton & unlocker
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('[MarinaNotifications] Erro ao instanciar AudioContext:', err);
    return null;
  }
}

// Ensure audio context is unlocked upon user gesture
export function initAudioUnlock() {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            isAudioUnlocked = true;
          });
        } else {
          isAudioUnlocked = true;
        }
      }
    } catch {
      // Ignorar
    }
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('touchend', unlock);
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

// Call on startup
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

/* -------------------------------------------------------------
   PREFERENCE GETTERS & SETTERS
------------------------------------------------------------- */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_SOUND);
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SOUND, enabled ? 'true' : 'false');
  dispatchSettingsChanged();
}

export function isVibrationEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_VIBRATION);
  return val === null ? true : val === 'true';
}

export function setVibrationEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VIBRATION, enabled ? 'true' : 'false');
  dispatchSettingsChanged();
}

export function isPushEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_PUSH);
  return val === null ? true : val === 'true';
}

export function setPushEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PUSH, enabled ? 'true' : 'false');
  dispatchSettingsChanged();
}

function dispatchSettingsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('marina:notification_settings_changed'));
  }
}

/* -------------------------------------------------------------
   VIBRATION ENGINE (HTML5 Vibration API)
------------------------------------------------------------- */
export function triggerMobileVibration(pattern: number[] = [300, 100, 300, 100, 450]): boolean {
  if (typeof window === 'undefined') return false;
  if (!isVibrationEnabled()) return false;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch (err) {
    console.warn('[MarinaNotifications] Vibração não suportada ou bloqueada:', err);
  }
  return false;
}

/* -------------------------------------------------------------
   SOUND SYNTHESIZER (Web Audio API)
------------------------------------------------------------- */
export function playNotificationSound(severity: MarinaNotificationSeverity = 'info'): void {
  if (typeof window === 'undefined') return;
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (severity === 'alert' || severity === 'warning') {
      // Tom de alerta urgente: Tríade com acorde duplo rápido (659Hz -> 880Hz -> 1046Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5
      osc1.frequency.setValueAtTime(1046.50, now + 0.24); // C6

      osc2.frequency.setValueAtTime(329.63, now); // E4 sub harmônico
      osc2.frequency.setValueAtTime(440.00, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } else {
      // Tom suave marítimo: Two-Tone Chime (587.33Hz D5 -> 880Hz A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.12); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (err) {
    console.warn('[MarinaNotifications] Falha na reprodução de som:', err);
  }
}

/* -------------------------------------------------------------
   WEB / MOBILE PUSH NOTIFICATIONS API
------------------------------------------------------------- */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    dispatchSettingsChanged();
    return permission;
  } catch (err) {
    console.warn('[MarinaNotifications] Erro ao solicitar permissão de notificações:', err);
    return 'denied';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function sendSystemNotification(title: string, body: string, data?: any): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (!isPushEnabled() || Notification.permission !== 'granted') return false;

  try {
    const options: NotificationOptions = {
      body,
      icon: '/logos/favicon.ico',
      badge: '/logos/favicon.ico',
      tag: `marina_${Date.now()}`,
      vibrate: [300, 100, 300, 100, 450],
      data
    };

    // Tenta via Service Worker primeiro (melhor para PWA no celular e tela de bloqueio)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, options);
          return true;
        }
      } catch {
        // Fallback para new Notification direto
      }
    }

    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('[MarinaNotifications] Erro ao disparar notificação do sistema:', err);
    return false;
  }
}

/* -------------------------------------------------------------
   LOCALSTORAGE NOTIFICATION STORE & HISTORY
------------------------------------------------------------- */
export function getStoredNotifications(): MarinaNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[MarinaNotifications] Erro ao ler notificações do localStorage:', err);
    return [];
  }
}

export function saveStoredNotifications(items: MarinaNotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = items.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('marina:notifications_updated'));
  } catch (err) {
    console.error('[MarinaNotifications] Erro ao salvar notificações no localStorage:', err);
  }
}

export function addStoredNotification(
  item: Omit<MarinaNotificationItem, 'id' | 'timestamp' | 'read'> & {
    id?: string;
    timestamp?: number;
    read?: boolean;
  }
): MarinaNotificationItem {
  const current = getStoredNotifications();
  const newItem: MarinaNotificationItem = {
    id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: item.timestamp || Date.now(),
    read: item.read ?? false,
    title: item.title,
    message: item.message,
    type: item.type,
    severity: item.severity,
    operacao: item.operacao,
    boatCode: item.boatCode,
    boatName: item.boatCode || item.boatName,
    clientName: item.clientName,
    previsaoSaida: item.previsaoSaida,
    vaga: item.vaga,
    reservationId: item.reservationId,
    details: item.details
  };

  const updated = [newItem, ...current].slice(0, MAX_NOTIFICATIONS);
  saveStoredNotifications(updated);

  // Ativa o celular: Vibração + Som + Notificação Nativa
  triggerMobileVibration();
  playNotificationSound(newItem.severity);
  sendSystemNotification(newItem.title, newItem.message, { id: newItem.id, reservationId: newItem.reservationId });

  return newItem;
}

export function markNotificationAsRead(id: string): void {
  const current = getStoredNotifications();
  let changed = false;
  const updated = current.map((item) => {
    if (item.id === id && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) {
    saveStoredNotifications(updated);
  }
}

export function markAllNotificationsAsRead(): void {
  const current = getStoredNotifications();
  const updated = current.map((item) => ({ ...item, read: true }));
  saveStoredNotifications(updated);
}

export function deleteStoredNotification(id: string): void {
  const current = getStoredNotifications();
  const updated = current.filter((item) => item.id !== id);
  saveStoredNotifications(updated);
}

export function clearNotificationHistory(): void {
  saveStoredNotifications([]);
}

export function getUnreadNotificationsCount(): number {
  const current = getStoredNotifications();
  return current.filter((item) => !item.read).length;
}

/* -------------------------------------------------------------
   TEST FUNCTION FOR MOBILE (Sound + Vibration + Push)
------------------------------------------------------------- */
export async function testMobileAlert(): Promise<{ vibrated: boolean; soundPlayed: boolean; pushSent: boolean }> {
  const soundPlayed = isSoundEnabled();
  if (soundPlayed) {
    playNotificationSound('warning');
  }

  const vibrated = triggerMobileVibration([300, 150, 300, 150, 450]);

  let pushSent = false;
  if (getNotificationPermissionStatus() === 'granted') {
    pushSent = await sendSystemNotification(
      'Agendamento • M99',
      'Cliente: Cliente Teste | Previsão: 14:00'
    );
  }

  return { vibrated, soundPlayed, pushSent };
}
