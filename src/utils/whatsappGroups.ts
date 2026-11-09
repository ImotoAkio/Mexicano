// Helper and shared cache for WhatsApp Groups fetched from Evolution API

export interface WhatsAppGroup {
  id: string;
  subject?: string;
  name?: string;
  pictureUrl?: string | null;
  size?: number;
  [key: string]: any;
}

let cachedGroups: WhatsAppGroup[] = [];
let fetchPromise: Promise<WhatsAppGroup[]> | null = null;

export function getCachedWhatsAppGroups(): WhatsAppGroup[] {
  return cachedGroups;
}

export async function fetchWhatsAppGroups(forceRefresh = false): Promise<WhatsAppGroup[]> {
  if (!forceRefresh && cachedGroups.length > 0) {
    return cachedGroups;
  }

  if (fetchPromise && !forceRefresh) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('client_token');
      const res = await fetch('/api/whatsapp/groups', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Falha HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        const uniqueMap = new Map<string, WhatsAppGroup>();
        for (const g of data.groups) {
          const gid = g.id || g.jid;
          if (gid && !uniqueMap.has(gid)) {
            uniqueMap.set(gid, {
              ...g,
              id: gid,
              subject: g.subject || g.name || gid
            });
          }
        }

        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
          const nameA = (a.subject || a.name || a.id).toUpperCase();
          const nameB = (b.subject || b.name || b.id).toUpperCase();
          return nameA.localeCompare(nameB, 'pt-BR');
        });

        cachedGroups = sorted;
        return sorted;
      }

      return cachedGroups;
    } catch (err) {
      console.warn('[WhatsAppGroups] Erro ao carregar grupos do WhatsApp:', err);
      return cachedGroups;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function findWhatsAppGroup(groupId?: string, groups = cachedGroups): WhatsAppGroup | undefined {
  if (!groupId) return undefined;
  const cleanTarget = String(groupId).trim();
  const targetWithoutDomain = cleanTarget.replace(/@g\.us$/, '');

  return groups.find(g => {
    const gid = String(g.id || g.jid || '').trim();
    if (!gid) return false;
    if (gid === cleanTarget) return true;
    if (gid.replace(/@g\.us$/, '') === targetWithoutDomain) return true;
    return false;
  });
}
