import { detectPlatform, isRunningStandalone } from './pwaInstall';

/**
 * Notificações Push nativas do Portal do Cliente (Web Push)
 * - Android/Desktop: funcionam no navegador e no app instalado.
 * - iPhone (iOS 16.4+): só funcionam com o app instalado na Tela de Início.
 */

export type ClientPushState = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function hasPushSupport(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

export function getClientPushState(): ClientPushState {
  const platform = detectPlatform();
  if (platform.os === 'ios' && !isRunningStandalone()) {
    return 'needs-install';
  }
  if (!hasPushSupport()) return 'unsupported';
  const perm = Notification.permission;
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'default';
}

function authHeaders(token?: string | null): Record<string, string> {
  const t = token || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

/**
 * Inscreve o dispositivo (deve ser chamado a partir de um toque do usuário no iPhone).
 */
export async function enableClientPush(token?: string | null): Promise<{ ok: boolean; message?: string }> {
  if (!hasPushSupport()) {
    return { ok: false, message: 'Este dispositivo não suporta notificações.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'Permissão de notificações não concedida.' };
  }

  const keyRes = await fetch('/api/client/push/public-key', { headers: authHeaders(token) });
  const keyData = await keyRes.json().catch(() => null);
  if (!keyRes.ok || !keyData?.publicKey) {
    return { ok: false, message: keyData?.message || 'Notificações indisponíveis no momento.' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
    });
  }

  const saveRes = await fetch('/api/client/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });
  if (!saveRes.ok) {
    return { ok: false, message: 'Não foi possível ativar as notificações.' };
  }
  return { ok: true };
}

/**
 * Se a permissão já foi concedida, garante que a inscrição atual esteja vinculada ao cliente logado
 * (útil após trocar de conta, reinstalar o app ou renovar a inscrição).
 */
export async function syncClientPushSubscription(token?: string | null): Promise<void> {
  try {
    if (!hasPushSupport() || Notification.permission !== 'granted') return;
    const platform = detectPlatform();
    if (platform.os === 'ios' && !isRunningStandalone()) return;
    await enableClientPush(token);
  } catch {}
}
