import webpush from "web-push";
import { getDbPool, getConfigValue, setConfigValue } from "./server-db";

/**
 * Notificações Push nativas do PWA (Web Push / VAPID)
 *
 * Tocar na notificação abre diretamente o app instalado (iOS 16.4+ e Android),
 * já autenticado via Magic Link e com o check-in aberto.
 */

let vapidReady: Promise<{ publicKey: string; privateKey: string } | null> | null = null;
let tableReady = false;

async function ensurePushTable() {
  if (tableReady) return;
  const pool = getDbPool();
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS PushSubscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clienteId VARCHAR(60) NOT NULL,
      endpoint VARCHAR(700) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      userAgent VARCHAR(500) NULL,
      createdAt VARCHAR(50) NOT NULL,
      lastSuccessAt VARCHAR(50) NULL,
      UNIQUE KEY uq_push_endpoint (endpoint(500)),
      INDEX idx_push_cliente (clienteId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  tableReady = true;
}

/**
 * Obtém (ou gera e persiste uma única vez) o par de chaves VAPID.
 * Prioriza variáveis de ambiente VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  if (!vapidReady) {
    vapidReady = (async () => {
      try {
        let publicKey = process.env.VAPID_PUBLIC_KEY || "";
        let privateKey = process.env.VAPID_PRIVATE_KEY || "";

        if (!publicKey || !privateKey) {
          publicKey = (await getConfigValue("push_vapid_public_key")) || "";
          privateKey = (await getConfigValue("push_vapid_private_key")) || "";
        }

        if (!publicKey || !privateKey) {
          const generated = webpush.generateVAPIDKeys();
          publicKey = generated.publicKey;
          privateKey = generated.privateKey;
          await setConfigValue("push_vapid_public_key", publicKey);
          await setConfigValue("push_vapid_private_key", privateKey);
          console.log("[Push] Novo par de chaves VAPID gerado e salvo nas configurações.");
        }

        const subject = process.env.VAPID_SUBJECT || "mailto:contato@vilanautica.com.br";
        webpush.setVapidDetails(subject, publicKey, privateKey);
        return { publicKey, privateKey };
      } catch (e) {
        console.warn("[Push] Não foi possível preparar as chaves VAPID:", e);
        vapidReady = null;
        return null;
      }
    })();
  }
  return vapidReady;
}

export async function saveClientPushSubscription(
  clienteId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
) {
  const pool = getDbPool();
  if (!pool) throw new Error("Banco de dados indisponível.");
  await ensurePushTable();
  await pool.query(
    `INSERT INTO PushSubscriptions (clienteId, endpoint, p256dh, auth, userAgent, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE clienteId = VALUES(clienteId), p256dh = VALUES(p256dh), auth = VALUES(auth), userAgent = VALUES(userAgent)`,
    [
      clienteId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      (userAgent || "").slice(0, 500),
      new Date().toISOString()
    ]
  );
}

export async function removeClientPushSubscription(endpoint: string, clienteId?: string) {
  const pool = getDbPool();
  if (!pool) return;
  await ensurePushTable();
  if (clienteId) {
    await pool.query("DELETE FROM PushSubscriptions WHERE endpoint = ? AND clienteId = ?", [endpoint, clienteId]);
  } else {
    await pool.query("DELETE FROM PushSubscriptions WHERE endpoint = ?", [endpoint]);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Envia uma notificação para todos os dispositivos inscritos de um cliente.
 * Retorna quantos dispositivos receberam com sucesso. Inscrições expiradas (404/410) são removidas.
 */
export async function sendPushToClient(clienteId: string, payload: PushPayload): Promise<number> {
  const pool = getDbPool();
  if (!pool || !clienteId) return 0;
  const keys = await getVapidKeys();
  if (!keys) return 0;

  try {
    await ensurePushTable();
    const [rows] = await pool.query(
      "SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE clienteId = ?",
      [clienteId]
    );
    const subs = rows as any[];
    if (subs.length === 0) return 0;

    const body = JSON.stringify(payload);
    let delivered = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 6, urgency: "high" }
          );
          delivered++;
          pool.query("UPDATE PushSubscriptions SET lastSuccessAt = ? WHERE endpoint = ?", [new Date().toISOString(), s.endpoint]).catch(() => {});
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await removeClientPushSubscription(s.endpoint).catch(() => {});
          } else {
            console.warn(`[Push] Falha ao enviar para ${clienteId} (status ${status}):`, err?.body || err?.message);
          }
        }
      })
    );

    return delivered;
  } catch (e) {
    console.warn("[Push] Erro ao enviar notificação:", e);
    return 0;
  }
}
