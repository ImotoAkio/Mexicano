import { Cliente, Embarcacao, Reserva } from './types';

// Storage keys
const MOCK_CALENDAR_KEY = 'nautical_mock_calendar';
const CLIENT_ID_KEY = 'nautical_google_client_id';

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  creator?: { email?: string };
  htmlLink?: string;
  calendarId?: string;
  calendarSummary?: string;
}

// Service account state variables
let serviceAccountConfigured = false;
let serviceAccountEmail: string | null = null;

export function isServiceAccountMode(): boolean {
  return serviceAccountConfigured;
}

export function getServiceAccountEmail(): string | null {
  return serviceAccountEmail;
}

export async function checkServerConfig(): Promise<boolean> {
  // Only admins can fetch server config. Skip if no admin token to prevent 401 errors.
  if (!localStorage.getItem('admin_token')) {
    return false;
  }

  try {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/config', { headers });
    if (res.ok) {
      const data = await res.json();
      
      // Update Service Account state
      serviceAccountConfigured = !!data.has_service_account;
      serviceAccountEmail = data.service_account_email || null;
      if (serviceAccountConfigured) {
        simulatedConnected = false;
      }

      // Automatically sync Client ID to local browser localStorage if synced from DB
      if (data.google_client_id) {
        localStorage.setItem(CLIENT_ID_KEY, data.google_client_id.trim());
      }

      // Bidirectional Calendar Mappings synchronization with the central database
      const localDataStr = localStorage.getItem('nautical_calendar_mappings');
      let localMappings: Record<string, string> = {};
      if (localDataStr) {
        try {
          localMappings = JSON.parse(localDataStr);
        } catch {}
      }

      const hasLocal = Object.keys(localMappings).some(k => !!localMappings[k] && localMappings[k].trim() !== '');
      const hasServer = data.calendar_mappings && typeof data.calendar_mappings === 'object' && Object.keys(data.calendar_mappings).length > 0;

      if (hasServer) {
        // Server has stored mappings, overwrite browser's local state with central config
        localStorage.setItem('nautical_calendar_mappings', JSON.stringify(data.calendar_mappings));
      } else if (hasLocal && !hasServer) {
        // Server has no mappings but this active browser has some mappings, upload them to central database!
        saveCalendarMappings(localMappings);
      }

      return serviceAccountConfigured;
    }
  } catch (e) {
    console.warn('Erro ao verificar config central no backend:', e);
  }
  return false;
}

export function getApiUrl(url: string): string {
  if (serviceAccountConfigured) {
    return url.replace('https://www.googleapis.com', '/api/calendar-proxy');
  }
  return url;
}

// Persisted Token cache in sessionStorage
let cachedToken: string | null = sessionStorage.getItem('nautical_google_access_token');
let simulatedConnected = (cachedToken || serviceAccountConfigured) ? false : true;

export interface GoogleCalendarEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

let cachedCalendarList: GoogleCalendarEntry[] | null = null;

export function getCachedToken(): string | null {
  return cachedToken;
}

export function setCachedToken(token: string | null) {
  cachedToken = token;
  cachedCalendarList = null; // Clear cached calendar entries on login status change
  if (token) {
    sessionStorage.setItem('nautical_google_access_token', token);
    simulatedConnected = false;
  } else {
    sessionStorage.removeItem('nautical_google_access_token');
    simulatedConnected = true;
  }
}

export function getGoogleClientId(): string {
  const current = localStorage.getItem(CLIENT_ID_KEY);
  const newFallback = '884329037050-bbpggmocqtjr17j6a5cf5pts3gpslg82.apps.googleusercontent.com';
  // Auto-migrate if empty or if using the old deleted client ID
  if (!current || current.includes('ld4033qcs1fvlfsri7kus5drsll5tl4o')) {
    localStorage.setItem(CLIENT_ID_KEY, newFallback);
    return newFallback;
  }
  return current;
}

export function setGoogleClientId(clientId: string) {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch('/api/config', {
    method: 'POST',
    headers,
    body: JSON.stringify({ google_client_id: clientId.trim() })
  }).catch(err => console.warn('Erro ao sincronizar Client ID com banco remoto:', err));
}

// Initiate Standard Google OAuth Implicit Flow
export function initiateOAuthLogin(clientId: string) {
  if (!clientId) return;
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ].join(' ');

  // Standard Implicit Flow URL matching registered client credentials character-for-character
  const redirectUri = window.location.origin;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId.trim())}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=nautical_oauth`;

  // Use elegant popup window to prevent iframe block in AI Studio sandbox
  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  
  const popup = window.open(
    authUrl,
    'google_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
  );

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    // Fallback block: Direct navigation if browser blocks popups
    console.warn('Popup blocker is active, redirecting current window.');
    window.location.href = authUrl;
  }
}

// Check and extract token from hash callback upon page mount/load
export function handleOAuthCallback(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;

  try {
    // URLSearchParams parser for implicit hash parameters (e.g. #access_token=...&expires_in=...)
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    
    if (token) {
      setCachedToken(token);
      
      // If running inside a popup panel, notify main frame and close safely
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'nautical_oauth_success', token }, '*');
          window.close();
        } catch (e) {
          console.error('Falha de postMessage com a aba pai:', e);
        }
      } else {
        // Clear hash parameters on standard direct redirect to keep URL clean
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return token;
    }
  } catch (error) {
    console.error('Error parsing OAuth callback hash:', error);
  }
  return null;
}

function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Initialize mock events with some defaults matching the DB
const INITIAL_MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'g_event_1',
    summary: 'M30 - ABRAÃO RIBEIRO SILVA',
    description: 'Embarcação: VX 1100 (M30) (Jet).\nProprietário: ABRAÃO RIBEIRO SILVA.\nPeríodo: Dia Inteiro.\nObs: Reserva para passeio em família na enseada.',
    start: {
      dateTime: `${getRelativeDateStr(0)}T08:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${getRelativeDateStr(0)}T18:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    }
  },
  {
    id: 'g_event_2',
    summary: 'M44 - ALBERT EINSTEIN ASSIS CARTAXO',
    description: 'Embarcação: WAKE 170 (M44) (Jet).\nProprietário: ALBERT EINSTEIN ASSIS CARTAXO.\nPeríodo: Manhã.\nObs: Nenhuma.',
    start: {
      dateTime: `${getRelativeDateStr(0)}T08:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${getRelativeDateStr(0)}T13:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    }
  },
  {
    id: 'g_event_3',
    summary: 'M05 - PLINIO',
    description: 'Embarcação: TRIDENT 290 (M05) (Lancha).\nProprietário: PLINIO AUGUSTO.\nPeríodo: Dia Inteiro.\nObs: Navegação costeira programada.',
    start: {
      dateTime: `${getRelativeDateStr(1)}T08:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${getRelativeDateStr(1)}T18:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    }
  },
  {
    id: 'g_event_4',
    summary: 'M18 - ERNESTO',
    description: 'Embarcação: VENTURA 300 (M18) (Lancha).\nProprietário: ERNESTO SIMÕES.\nPeríodo: Tarde.\nObs: Reserva para pesca esportiva com amigos.',
    start: {
      dateTime: `${getRelativeDateStr(2)}T13:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${getRelativeDateStr(2)}T18:00:00-03:00`,
      timeZone: 'America/Sao_Paulo'
    }
  },
  {
    id: 'g_event_5',
    summary: 'CATAMARÃ-ALUGUE',
    description: 'Reserva especial de aluguel turístico.\nPeríodo: Dia Inteiro.\nObs: Aluguel corporativo marina.',
    start: {
      date: getRelativeDateStr(3)
    },
    end: {
      date: getRelativeDateStr(3)
    }
  },
  {
    id: 'g_event_6',
    summary: 'FECHADO',
    description: 'Dia reservado para manutenção das poitas e rampas da marina.',
    start: {
      date: getRelativeDateStr(4)
    },
    end: {
      date: getRelativeDateStr(4)
    }
  }
];

// Helper to check for active token or simulation
export function isCalendarConnected(): boolean {
  return serviceAccountConfigured || cachedToken !== null || simulatedConnected;
}

export function setSimulatedConnection(connected: boolean) {
  simulatedConnected = connected;
  if (connected) {
    // Seed mock calendar if empty
    if (!localStorage.getItem(MOCK_CALENDAR_KEY)) {
      localStorage.setItem(MOCK_CALENDAR_KEY, JSON.stringify(INITIAL_MOCK_EVENTS));
    }
    setCachedToken(null);
  } else {
    // Keep cachedToken as is
  }
}

export function getMockCalendarEvents(): CalendarEvent[] {
  const data = localStorage.getItem(MOCK_CALENDAR_KEY);
  return data ? JSON.parse(data) : INITIAL_MOCK_EVENTS;
}

export function saveMockCalendarEvents(events: CalendarEvent[]) {
  localStorage.setItem(MOCK_CALENDAR_KEY, JSON.stringify(events));
}

// Format start & end dates based on reserving date as an all-day event for proper styling
export function formatEventTimes(date: string, period: 'dia_inteiro' | 'manha' | 'tarde') {
  // Construct the next day date for end date parameter (exclusive in Google Calendar API for all-day events)
  const dt = new Date(`${date}T12:00:00`);
  dt.setDate(dt.getDate() + 1);
  const nextDayStr = dt.toISOString().split('T')[0];

  return {
    start: {
      date: date
    },
    end: {
      date: nextDayStr
    }
  };
}

// Generate the required event title format: M00 - Nome Cliente (Primeiro e segundo nome apenas)
export function generateEventTitle(boat: Embarcacao, client: Cliente): string {
  const padNum = boat.numero.padStart(2, '0');
  const parts = client.nome.trim().replace(/\s+/g, ' ').split(' ');
  const shortName = parts.length <= 2 ? client.nome : `${parts[0]} ${parts[1]}`;
  return `M${padNum} - ${shortName.toUpperCase()}`;
}

// Set temporary developer access token manually
export function setDeveloperToken(token: string) {
  if (token) {
    cachedToken = token;
    simulatedConnected = false;
  }
}

// Retrieve active Google Calendar mappings from local storage configuration
export function getCalendarMappings(): Record<string, string> {
  const data = localStorage.getItem('nautical_calendar_mappings');
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

// Persist the custom Google Calendar ID mappings and clear temporary caches
export function saveCalendarMappings(mappings: Record<string, string>) {
  localStorage.setItem('nautical_calendar_mappings', JSON.stringify(mappings));
  cachedCalendarList = null; // Flush cache to guarantee instant refresh
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch('/api/config', {
    method: 'POST',
    headers,
    body: JSON.stringify({ calendar_mappings: mappings })
  }).catch(err => console.warn('Erro ao sincronizar mapeamento de agendas com banco remoto:', err));
}

// Persist centralized Google Service Account JSON to VPS database
export async function saveGoogleServiceAccount(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/config', {
      method: 'POST',
      headers,
      body: JSON.stringify({ google_service_account_json: jsonString })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || 'Falha ao salvar credencial no banco remoto.' };
    }
    // Refresh configuration locally after successfully updating
    await checkServerConfig();
    return { success: true, message: 'Google Service Account salva e ativada no Banco de Dados com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro de conexão ao salvar na VPS.' };
  }
}

// ---------------- Real API Integrations ----------------

// Fetch entire list of calendars to allow dynamic auto-routing
export async function fetchCalendarList(): Promise<GoogleCalendarEntry[]> {
  const localMappings = getCalendarMappings();

  if (simulatedConnected) {
    const list: GoogleCalendarEntry[] = [
      { id: 'primary', summary: 'Principal', primary: true },
      { id: 'marina_id', summary: 'marina' }
    ];
    // Merge local mappings as fallback simulated entries
    Object.entries(localMappings).forEach(([summary, id]) => {
      if (!list.some(cal => cal.id === id || cal.summary.toLowerCase() === summary.toLowerCase())) {
        list.push({ id, summary, description: 'Simulado (Mapeamento Local)' });
      }
    });
    return list;
  }

  if (cachedCalendarList) {
    return cachedCalendarList;
  }

  const list: GoogleCalendarEntry[] = [];

  // Try to query real Google API users/me/calendarList
  if (cachedToken || serviceAccountConfigured) {
    try {
      const response = await fetch(getApiUrl('https://www.googleapis.com/calendar/v3/users/me/calendarList'), {
        headers: {
          'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const apiList = (data.items || []).map((item: any) => ({
          id: item.id,
          summary: item.summary || '',
          description: '',
          primary: item.primary || false
        }));
        
        list.push(...apiList);

        // Auto-cache real mappings if retrieved via OAuth
        if (cachedToken && apiList.length > 0) {
          const updatedMappings = { ...localMappings };
          apiList.forEach((item: any) => {
            if (item.summary) {
              const summaryKey = item.summary.toLowerCase().trim();
              updatedMappings[summaryKey] = item.id;
            }
          });
          localStorage.setItem('nautical_calendar_mappings', JSON.stringify(updatedMappings));
        }
      }
    } catch (error: any) {
      console.warn('Erro ao carregar lista de agendas do Google via API:', error);
    }
  }

  // Merge local storage maps for missing entries (enables Service Account direct fetching)
  Object.entries(localMappings).forEach(([summary, id]) => {
    const isAlreadyPresent = list.some(
      cal => cal.id === id || cal.summary.toLowerCase().trim() === summary.toLowerCase().trim()
    );
    if (!isAlreadyPresent) {
      list.push({
        id,
        summary,
        description: 'Mapeado Localmente (Conta de Serviço)'
      });
    }
  });

  // Ensure 'primary' fallback is guaranteed to exist
  if (!list.some(cal => cal.primary || cal.id === 'primary')) {
    list.push({ id: 'primary', summary: 'Principal', primary: true });
  }

  cachedCalendarList = list;
  return list;
}

// Helper: Find calendar named exactly "marina" or search for fallback
export async function findMarinaCalendar(): Promise<string> {
  try {
    const list = await fetchCalendarList();
    const marina = list.find(cal => cal.summary.toLowerCase().includes('marina'));
    return marina ? marina.id : 'primary';
  } catch (e) {
    console.warn('Erro ao mapear agenda Marina:', e);
    return 'primary';
  }
}

// Helper: Map boat identifier to its specific secondary calendar (e.g. MO1, MO2, M30, M44, etc.)
export async function findCalendarForBoat(boatCode: string): Promise<string> {
  try {
    // 0. Prioritize googleCalendarId configured directly on the vessel/boat settings
    try {
      const { boatDB } = await import('./db');
      const allBoats = boatDB.getAll();
      const cleanTargetCode = boatCode.toLowerCase().trim().replace(/[^a-z0-9]/g, ''); // e.g. "m30", "m01"

      const matchedBoat = allBoats.find(b => {
        const cleanBoatNum = `m${(b.numero || '').padStart(2, '0')}`.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return cleanBoatNum === cleanTargetCode;
      });

      if (matchedBoat && matchedBoat.googleCalendarId) {
        return matchedBoat.googleCalendarId;
      }
    } catch (dbErr) {
      console.warn('Erro ao consultar googleCalendarId diretamente no barco do BD:', dbErr);
    }

    const list = await fetchCalendarList();
    const cleanCode = boatCode.toLowerCase().trim(); // e.g. "m30", "m05", "mcs"
    const numOnly = cleanCode.replace(/\D/g, '');    // e.g. "30", "05"
    const intNumStr = numOnly ? parseInt(numOnly, 10).toString() : ''; // e.g. "30", "5"
    
    // 1. Direct match: Exact code (matches "m30" or similar)
    let match = list.find(cal => cal.summary.toLowerCase().trim() === cleanCode);
    if (match) return match.id;

    // 2. Transliteration match: change 0 to letter O (matches "mo1", "mo2", "mo5" etc.)
    const alternateCodeO = cleanCode.replace('0', 'o');
    match = list.find(cal => cal.summary.toLowerCase().trim() === alternateCodeO);
    if (match) return match.id;

    const alternateCode0 = cleanCode.replace('o', '0');
    match = list.find(cal => cal.summary.toLowerCase().trim() === alternateCode0);
    if (match) return match.id;

    // 3. Match calendar ending or starting with numerical digits (handles MO-5, M-5, M5)
    if (intNumStr) {
      match = list.find(cal => {
        const title = cal.summary.toLowerCase();
        // Check if starts with m and has the target number
        return title.startsWith('m') && (title.includes(intNumStr) || title.includes(numOnly));
      });
      if (match) return match.id;
    }

    // 4. Default to marina calendar
    const marinaId = await findMarinaCalendar();
    if (marinaId !== 'primary') {
      return marinaId;
    }
  } catch (e) {
    console.error('Falha de mapeamento de agenda do veículo:', e);
  }
  return 'primary';
}

// Helper to resolve all active target calendars configured in the system
export async function resolveTargetCalendars(): Promise<GoogleCalendarEntry[]> {
  const list = await fetchCalendarList();
  const localMappings = getCalendarMappings();
  const mappedIds = new Set<string>();

  // Include any configured custom IDs in local mappings (M01, M30, etc.)
  Object.values(localMappings).forEach(id => {
    if (id) mappedIds.add(String(id).trim());
  });

  // Include any boat-specific calendar IDs configured directly on boats
  try {
    const { boatDB } = await import('./db');
    boatDB.getAll().forEach(b => {
      if (b.googleCalendarId) {
        mappedIds.add(String(b.googleCalendarId).trim());
      }
    });
  } catch (e) {
    console.warn('Erro ao carregar calendar IDs das embarcações:', e);
  }

  // Include primary or marina if found in user lists as backups
  const marinaCal = list.find(cal => cal.summary.toLowerCase().includes('marina'));
  const primaryCal = list.find(cal => cal.primary);

  if (marinaCal) mappedIds.add(marinaCal.id);
  if (primaryCal) mappedIds.add(primaryCal.id);

  // Construct target calendars dynamically, guaranteeing query even if the list is missing elements
  const targets: GoogleCalendarEntry[] = [];
  const processedIds = new Set<string>();

  mappedIds.forEach(id => {
    if (!id || processedIds.has(id)) return;
    processedIds.add(id);

    const found = list.find(c => c.id === id);
    if (found) {
      targets.push(found);
    } else {
      let summary = 'Agenda Mapeada';
      // Find labeled key name in localMappings
      for (const [key, val] of Object.entries(localMappings)) {
        if (val === id) {
          summary = key;
          break;
        }
      }
      targets.push({
        id,
        summary,
        description: 'Mapeada Dinamicamente'
      });
    }
  });

  // If filtered targets list is empty, fallback to primary/marina
  if (targets.length === 0) {
    const fallback = marinaCal || primaryCal || list[0] || { id: 'primary', summary: 'Principal', primary: true };
    targets.push(fallback);
  }

  return targets;
}

interface CacheEntry {
  timestamp: number;
  data: CalendarEvent[];
}

const fetchEventsCache = new Map<string, CacheEntry>();
const fetchEventsRangeCache = new Map<string, CacheEntry>();

const inFlightFetches = new Map<string, Promise<CalendarEvent[]>>();
const inFlightRangeFetches = new Map<string, Promise<CalendarEvent[]>>();

const CACHE_STALE_MS = 15000; // 15 seconds cache to handle rapid component re-renders and page navigation

export function clearGoogleCalendarCache() {
  fetchEventsCache.clear();
  fetchEventsRangeCache.clear();
  inFlightFetches.clear();
  inFlightRangeFetches.clear();
}

// 1. Fetch Google Calendar Events for a single day
export async function fetchGoogleCalendarEvents(dateFilter?: string): Promise<CalendarEvent[]> {
  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    // Read from mock storage
    const mockEvents = getMockCalendarEvents();
    if (dateFilter) {
      return mockEvents.filter(e => {
        const eDate = e.start.dateTime ? e.start.dateTime.substring(0, 10) : (e.start.date || '');
        return eDate === dateFilter;
      });
    }
    return mockEvents;
  }

  const cacheKey = dateFilter || 'all';
  const cachedVal = fetchEventsCache.get(cacheKey);
  const now = Date.now();
  if (cachedVal && (now - cachedVal.timestamp < CACHE_STALE_MS)) {
    return cachedVal.data;
  }
  if (inFlightFetches.has(cacheKey)) {
    return inFlightFetches.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const targetCalendars = await resolveTargetCalendars();
      const allFetchedEvents: CalendarEvent[] = [];
      const seenEvents = new Set<string>();

      const results: CalendarEvent[][] = [];
      const chunkSize = 5;
      for (let i = 0; i < targetCalendars.length; i += chunkSize) {
        const chunk = targetCalendars.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (cal) => {
          try {
            let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?singleEvents=true&orderBy=startTime`;
            if (dateFilter) {
              // Parse dateFilter to subtract 1 day and add 1 day to fetch a wider envelope.
              // This ensures that all-day events starting at 00:00:00 UTC and timezone-shifted entries are not missed.
              const baseDate = new Date(dateFilter + 'T12:00:00');
              
              const prevDate = new Date(baseDate);
              prevDate.setDate(prevDate.getDate() - 1);
              const prevDateStr = prevDate.toISOString().split('T')[0];

              const nextDate = new Date(baseDate);
              nextDate.setDate(nextDate.getDate() + 1);
              const nextDateStr = nextDate.toISOString().split('T')[0];

              const timeMin = encodeURIComponent(`${prevDateStr}T00:00:00-03:00`);
              const timeMax = encodeURIComponent(`${nextDateStr}T23:59:59-03:00`);
              url += `&timeMin=${timeMin}&timeMax=${timeMax}`;
            }

            const response = await fetch(getApiUrl(url), {
              headers: {
                'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                setCachedToken(null);
              }
              return [];
            }

            const data = await response.json();
            return (data.items || []).map((item: any) => ({
              id: item.id,
              summary: item.summary || 'Sem Título',
              description: '',
              start: item.start || {},
              end: item.end || {},
              creator: item.creator,
              htmlLink: item.htmlLink,
              calendarSummary: cal.summary,
              calendarId: cal.id
            }));
          } catch (e) {
            console.warn(`Erro ao buscar agenda ${cal.summary}:`, e);
            return [];
          }
        });
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        if (i + chunkSize < targetCalendars.length) {
          await new Promise(res => setTimeout(res, 500));
        }
      }
      results.forEach(evtList => {
        evtList.forEach(evt => {
          const timeKey = evt.start?.dateTime || evt.start?.date || '';
          const compositeId = `${evt.summary.toUpperCase().trim()}_${timeKey}`;
          if (!seenEvents.has(compositeId)) {
            seenEvents.add(compositeId);
            allFetchedEvents.push(evt);
          }
        });
      });

      if (dateFilter) {
        const filtered = allFetchedEvents.filter(evt => {
          const evtDate = evt.start?.dateTime ? evt.start.dateTime.substring(0, 10) : (evt.start?.date || '');
          return evtDate === dateFilter;
        });
        fetchEventsCache.set(cacheKey, { timestamp: Date.now(), data: filtered });
        return filtered;
      }

      fetchEventsCache.set(cacheKey, { timestamp: Date.now(), data: allFetchedEvents });
      return allFetchedEvents;
    } catch (error: any) {
      console.warn('Falha ao obter eventos reais do Google Calendar. Ativando simulado.', error);
      if (error && (error.message?.includes('fetch') || error.message?.includes('Network') || error.message?.includes('Load failed'))) {
        setCachedToken(null);
      }
      // Fallback to simulation to preserve user flow
      const mockEvents = getMockCalendarEvents();
      return mockEvents.filter(e => {
        if (!dateFilter) return true;
        const eDate = e.start.dateTime ? e.start.dateTime.substring(0, 10) : (e.start.date || '');
        return eDate === dateFilter;
      });
    } finally {
      inFlightFetches.delete(cacheKey);
    }
  })();
  
  inFlightFetches.set(cacheKey, promise);
  return promise;
}

// 1b. Fetch Google Calendar Events for a Date Range (Selected Day + Subsequent Days)
export async function fetchGoogleCalendarEventsRange(dateFilter: string, daysLimit: number = 14): Promise<CalendarEvent[]> {
  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    const mockEvents = getMockCalendarEvents();
    return mockEvents.filter(e => {
      const eDate = e.start.dateTime ? e.start.dateTime.substring(0, 10) : (e.start.date || '');
      // Calculate max upper bound date
      const d = new Date(dateFilter);
      d.setDate(d.getDate() + daysLimit);
      const limitStr = d.toISOString().split('T')[0];
      return eDate >= dateFilter && eDate <= limitStr;
    });
  }

  const cacheKey = `${dateFilter}_${daysLimit}`;
  const cachedVal = fetchEventsRangeCache.get(cacheKey);
  const now = Date.now();
  if (cachedVal && (now - cachedVal.timestamp < CACHE_STALE_MS)) {
    return cachedVal.data;
  }
  if (inFlightRangeFetches.has(cacheKey)) {
    return inFlightRangeFetches.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const targetCalendars = await resolveTargetCalendars();

      // Expand query range slightly to start 1 day earlier and end 1 day later
      const startObj = new Date(dateFilter + 'T12:00:00');
      startObj.setDate(startObj.getDate() - 1);
      const startStr = startObj.toISOString().split('T')[0];
      const timeMin = encodeURIComponent(`${startStr}T00:00:00-03:00`);
      
      // Add daysLimit + 1 to specify upper bound timeMax
      const dateObj = new Date(dateFilter + 'T12:00:00');
      dateObj.setDate(dateObj.getDate() + daysLimit + 1);
      const endStr = dateObj.toISOString().split('T')[0];
      const timeMax = encodeURIComponent(`${endStr}T23:59:59-03:00`);

      const allFetchedEvents: CalendarEvent[] = [];
      const seenEvents = new Set<string>();

      const results: CalendarEvent[][] = [];
      const chunkSize = 5;
      for (let i = 0; i < targetCalendars.length; i += chunkSize) {
        const chunk = targetCalendars.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (cal) => {
          try {
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=2500`;
            const response = await fetch(getApiUrl(url), {
              headers: {
                'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                setCachedToken(null);
              }
              return [];
            }

            const data = await response.json();
            return (data.items || []).map((item: any) => ({
              id: item.id,
              summary: item.summary || 'Sem Título',
              description: '',
              start: item.start || {},
              end: item.end || {},
              creator: item.creator,
              htmlLink: item.htmlLink,
              calendarSummary: cal.summary,
              calendarId: cal.id
            }));
          } catch (e) {
            console.warn(`Erro ao buscar agenda ${cal.summary} em escala:`, e);
            return [];
          }
        });
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        if (i + chunkSize < targetCalendars.length) {
          await new Promise(res => setTimeout(res, 500));
        }
      }
      results.forEach(evtList => {
        evtList.forEach(evt => {
          const timeKey = evt.start?.dateTime || evt.start?.date || '';
          const compositeId = `${evt.summary.toUpperCase().trim()}_${timeKey}`;
          if (!seenEvents.has(compositeId)) {
            seenEvents.add(compositeId);
            allFetchedEvents.push(evt);
          }
        });
      });

      const filteredRange = allFetchedEvents.filter(evt => {
        const evtDate = evt.start?.dateTime ? evt.start.dateTime.substring(0, 10) : (evt.start?.date || '');
        const d = new Date(dateFilter + 'T12:00:00');
        d.setDate(d.getDate() + daysLimit);
        const limitStr = d.toISOString().split('T')[0];
        return evtDate >= dateFilter && evtDate <= limitStr;
      });

      fetchEventsRangeCache.set(cacheKey, { timestamp: Date.now(), data: filteredRange });
      return filteredRange;
    } catch (error: any) {
      console.warn('Erro ao buscar amplitude de eventos do Google:', error);
      if (error && (error.message?.includes('fetch') || error.message?.includes('Network') || error.message?.includes('Load failed'))) {
        setCachedToken(null);
      }
      const mockEvents = getMockCalendarEvents();
      return mockEvents.filter(e => {
        const eDate = e.start.dateTime ? e.start.dateTime.substring(0, 10) : (e.start.date || '');
        const d = new Date(dateFilter);
        d.setDate(d.getDate() + daysLimit);
        const limitStr = d.toISOString().split('T')[0];
        return eDate >= dateFilter && eDate <= limitStr;
      });
    } finally {
      inFlightRangeFetches.delete(cacheKey);
    }
  })();
  
  inFlightRangeFetches.set(cacheKey, promise);
  return promise;
}

export interface CalendarSyncResult {
  eventId: string;
  boatCalendarSynced: boolean;
  boatCalendarError?: string;
  marinaCalendarSynced: boolean;
  marinaCalendarError?: string;
  isSimulated: boolean;
  boatCalendarId: string;
  marinaCalendarId: string;
}

// 2. Create Event on Google Calendar (MANDATORY explicit confirmation is done in UI)
export async function createGoogleCalendarEvent(
  boat: Embarcacao,
  client: Cliente,
  reserva: Omit<Reserva, 'id' | 'createdAt'>
): Promise<CalendarSyncResult> {
  clearGoogleCalendarCache();
  const title = generateEventTitle(boat, client);
  const { start, end } = formatEventTimes(reserva.data, reserva.periodo);
  
  const description = `Reservado via Reservas Náuticas\nEmbarcação: ${boat.nome} (${boat.tipo === 'jet' ? 'Jet' : 'Lancha'})\nProprietário: ${client.nome}\nContato: ${client.telefone || 'Nenhuma'}\nPeríodo: ${reserva.periodo === 'dia_inteiro' ? 'Dia Inteiro' : reserva.periodo === 'manha' ? 'Manhã' : 'Tarde'}\nObs: ${reserva.observações || 'Nenhuma'}`;

  const eventPayload: any = {
    summary: title,
    description,
    start,
    end,
    colorId: '6' // 6 is tangerine/orange standard for all events as requested
  };

  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    // Create local mock event
    const mockEvents = getMockCalendarEvents();
    const newId = `g_sim_${Date.now()}`;
    const newMockEvent: CalendarEvent = {
      id: newId,
      summary: title,
      description,
      start,
      end
    };
    mockEvents.push(newMockEvent);
    saveMockCalendarEvents(mockEvents);

    return {
      eventId: newId,
      boatCalendarSynced: true,
      marinaCalendarSynced: true,
      isSimulated: true,
      boatCalendarId: 'simulated_boat',
      marinaCalendarId: 'simulated_marina'
    };
  }

  // Real connection flow
  let boatCalendarSynced = false;
  let boatCalendarError = '';
  let marinaCalendarSynced = false;
  let marinaCalendarError = '';
  let finalEventId = '';

  const padNum = boat.numero.padStart(2, '0');
  const boatCode = `M${padNum}`;
  
  let boatCalendarId = 'primary';
  let marinaCalendarId = 'primary';

  try {
    boatCalendarId = await findCalendarForBoat(boatCode);
  } catch (e: any) {
    boatCalendarError = `Erro ao buscar id da agenda do barco: ${e.message || e}`;
  }

  try {
    marinaCalendarId = await findMarinaCalendar();
  } catch (e: any) {
    marinaCalendarError = `Erro ao buscar id da agenda da marina: ${e.message || e}`;
  }


  // 1. Try to sync with boat calendar
  if (!boatCalendarError) {
    try {
      let response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(boatCalendarId)}/events`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!response.ok) {
        console.warn(`Tentativa de inserção na agenda secundária (${boatCalendarId}) deu erro: ${response.statusText}. Retentando no primary...`);
        boatCalendarError = `Erro API secundária: ${response.statusText} (${response.status})`;
        
        if (boatCalendarId !== 'primary') {
          response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/primary/events`), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventPayload)
          });
          
          if (response.ok) {
            const result = await response.json();
            finalEventId = result.id;
            boatCalendarSynced = true;
            boatCalendarError = ''; // Primary fallback succeeded
          } else {
            boatCalendarError += ` | Fallback primary falhou: ${response.statusText} (${response.status})`;
          }
        }
      } else {
        const result = await response.json();
        finalEventId = result.id;
        boatCalendarSynced = true;
      }
    } catch (e: any) {
      boatCalendarError = `Falha de rede/requisição: ${e.message || e}`;
    }
  }

  // 2. Try to sync with marina calendar if different from the boat calendar
  if (marinaCalendarId !== boatCalendarId && marinaCalendarId !== 'primary') {
    try {
      // Se já criamos no calendário do barco, usamos o MESMO ID para a marina
      if (finalEventId) {
        eventPayload.id = finalEventId;
      }
      
      const response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(marinaCalendarId)}/events`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (response.ok) {
        const result = await response.json();
        marinaCalendarSynced = true;
        if (!finalEventId) {
          finalEventId = result.id;
        }
      } else {
        marinaCalendarError = `Erro API marina: ${response.statusText} (${response.status})`;
      }
    } catch (e: any) {
      marinaCalendarError = `Falha de rede marina: ${e.message || e}`;
    }
  } else {
    marinaCalendarSynced = boatCalendarSynced;
    marinaCalendarError = boatCalendarError;
  }

  // If both failed to write to Google Calendar, generate a fallback local mock event to keep system running but return the errors
  if (!boatCalendarSynced && !marinaCalendarSynced) {
    const mockEvents = getMockCalendarEvents();
    finalEventId = `g_sim_fb_${Date.now()}`;
    const newMockEvent: CalendarEvent = {
      id: finalEventId,
      summary: title,
      description,
      start,
      end
    };
    mockEvents.push(newMockEvent);
    saveMockCalendarEvents(mockEvents);
  }

  return {
    eventId: finalEventId || `g_sim_err_${Date.now()}`,
    boatCalendarSynced,
    boatCalendarError: boatCalendarError || undefined,
    marinaCalendarSynced,
    marinaCalendarError: marinaCalendarError || undefined,
    isSimulated: false,
    boatCalendarId,
    marinaCalendarId
  };
}

// 3. Delete event from Google Calendar
export async function deleteGoogleCalendarEvent(eventId: string, boatCode?: string): Promise<boolean> {
  clearGoogleCalendarCache();
  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    const mockEvents = getMockCalendarEvents();
    const filtered = mockEvents.filter(e => e.id !== eventId);
    saveMockCalendarEvents(filtered);
    return true;
  }

  try {
    let targetCalendarId = 'primary';
    if (boatCode) {
      try { targetCalendarId = await findCalendarForBoat(boatCode); } catch (e) {}
    }

    // Deleta do calendário da embarcação
    let boatDeleted = false;
    if (targetCalendarId && targetCalendarId !== 'primary') {
      try {
        const response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(eventId)}`), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${cachedToken || 'service_account_active'}` }
        });
        if (response.ok || response.status === 404) boatDeleted = true;
      } catch (e) {}
    }

    // Deleta do calendário da marina usando o mesmo ID
    let marinaDeleted = false;
    try {
      const marinaId = await findMarinaCalendar();
      if (marinaId && marinaId !== 'primary' && marinaId !== targetCalendarId) {
        const response2 = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(marinaId)}/events/${encodeURIComponent(eventId)}`), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${cachedToken || 'service_account_active'}` }
        });
        if (response2.ok || response2.status === 404) marinaDeleted = true;
      }
    } catch (e) {}

    // Fallback: Se não encontrou ou não apagou em nenhum dos dois, tenta o primary
    if (!boatDeleted && !marinaDeleted) {
      const response3 = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${cachedToken || 'service_account_active'}` }
      });
      if (!response3.ok && response3.status !== 404) {
        throw new Error(`Google Calendar API delete error: ${response3.statusText}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar do Google Calendar. Removendo do simulado.', error);
    const mockEvents = getMockCalendarEvents();
    const filtered = mockEvents.filter(e => e.id !== eventId);
    saveMockCalendarEvents(filtered);
    return true;
  }
}

export interface EventUpdatePayload {
  summary?: string;
  description?: string;
  start?: any;
  end?: any;
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  boatCode: string,
  payload: EventUpdatePayload,
  explicitCalendarId?: string
): Promise<boolean> {
  clearGoogleCalendarCache();
  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    const mockEvents = getMockCalendarEvents();
    const idx = mockEvents.findIndex(e => e.id === eventId);
    if (idx !== -1) {
      if (payload.summary) mockEvents[idx].summary = payload.summary;
      if (payload.description) mockEvents[idx].description = payload.description;
      if (payload.start) mockEvents[idx].start = payload.start;
      if (payload.end) mockEvents[idx].end = payload.end;
      saveMockCalendarEvents(mockEvents);
      return true;
    }
    return false;
  }

  try {
    let boatCalendarId = explicitCalendarId;
    if (!boatCalendarId) {
      try {
        boatCalendarId = await findCalendarForBoat(boatCode);
      } catch (e) {
        console.warn('Erro ao buscar calendar barco para update:', e);
      }
    }
    if (!boatCalendarId) {
      boatCalendarId = 'primary';
    }

    let response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(boatCalendarId)}/events/${eventId}`), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: payload.summary,
        description: payload.description
      })
    });

    if (!response.ok && boatCalendarId !== 'primary') {
      console.warn(`Tentativa de update na agenda secundária (${boatCalendarId}) deu erro (${response.statusText}). Retentando no primary...`);
      response = await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: payload.summary,
          description: payload.description
        })
      });
    }

    let marinaCalendarId = 'primary';
    try {
      marinaCalendarId = await findMarinaCalendar();
    } catch (e) {
      console.warn('Erro ao buscar calendar marina para update:', e);
    }

    if (marinaCalendarId !== boatCalendarId && marinaCalendarId !== 'primary') {
      try {
        await fetch(getApiUrl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(marinaCalendarId)}/events/${eventId}`), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: payload.summary,
            description: payload.description
          })
        });
      } catch (e) {
        console.warn('Erro ao atualizar na agenda marina secundaria:', e);
      }
    }

    return response.ok;
  } catch (error) {
    console.error('Erro ao atualizar no Google Calendar. Atualizando simulado.', error);
    const mockEvents = getMockCalendarEvents();
    const idx = mockEvents.findIndex(e => e.id === eventId);
    if (idx !== -1) {
      mockEvents[idx].summary = payload.summary;
      mockEvents[idx].description = payload.description;
      saveMockCalendarEvents(mockEvents);
    }
    return true;
  }
}

// Map a local Reserva object into the same CalendarEvent structure used by Google Calendar
export function mapReservationToCalendarEvent(
  res: Reserva,
  boats: Embarcacao[],
  clients: Cliente[]
): CalendarEvent | null {
  const boat = boats.find(b => b.id === res.embarcacaoId);
  const client = clients.find(c => c.id === res.clienteId);
  if (!boat || !client) return null;

  // Utilize the exact same titles and times as google calendar
  const padNum = boat.numero.padStart(2, '0');
  const parts = client.nome.trim().replace(/\s+/g, ' ').split(' ');
  const shortName = parts.length <= 2 ? client.nome : `${parts[0]} ${parts[1]}`;
  const title = `M${padNum} - ${shortName.toUpperCase()}`;

  const description = `Reservado via Reservas Náuticas\nEmbarcação: ${boat.nome} (${boat.tipo === 'jet' ? 'Jet' : 'Lancha'})\nProprietário: ${client.nome}\nContato: ${client.telefone || 'Nenhum'}\nPeríodo: ${res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde'}\nObs: ${res.observações || 'Nenhuma'}\nStatus: ${res.status === 'cancelado' ? 'Cancelado' : 'Confirmado'}`;

  let startStr = `${res.data}T08:00:00-03:00`;
  let endStr = `${res.data}T18:00:00-03:00`;
  if (res.periodo === 'manha') {
    startStr = `${res.data}T08:00:00-03:00`;
    endStr = `${res.data}T13:00:00-03:00`;
  } else if (res.periodo === 'tarde') {
    startStr = `${res.data}T13:00:00-03:00`;
    endStr = `${res.data}T18:00:00-03:00`;
  }

  return {
    id: res.id,
    summary: title,
    description,
    start: {
      dateTime: startStr,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: endStr,
      timeZone: 'America/Sao_Paulo'
    },
    creator: {
      email: client.nome.toLowerCase().replace(/[^a-z]/g, '') + '@marina.com'
    },
    htmlLink: ''
  };
}

// Seamlessly merge and deduplicate local database reservations and Google Calendar events
export function mergeLocalAndGoogleEvents(
  gcalEvts: CalendarEvent[],
  localReservations: Reserva[],
  boats: Embarcacao[],
  clients: Cliente[]
): CalendarEvent[] {
  const merged = [...gcalEvts];

  localReservations.forEach(res => {
    // 1. Convert local reservation to virtual event
    const virtualEvt = mapReservationToCalendarEvent(res, boats, clients);
    if (!virtualEvt) return;

    // 2. Check if a duplicate already exists in gcalEvts
    const resDate = res.data;
    const boat = boats.find(b => b.id === res.embarcacaoId);
    const boatCode = boat ? `M${boat.numero.padStart(2, '0')}` : '';

    const isDuplicate = gcalEvts.some(evt => {
      if (res.googleEventId && evt.id === res.googleEventId) return true;

      // Parse date from event
      let evtDate = '';
      if (evt.start?.dateTime) {
        evtDate = evt.start.dateTime.substring(0, 10);
      } else if (evt.start?.date) {
        evtDate = evt.start.date;
      }

      const summaryUpper = evt.summary.toUpperCase();
      const hasBoat = boatCode && (summaryUpper.includes(boatCode) || summaryUpper.replace(/\s+/g, '').includes(boatCode));

      return evtDate === resDate && hasBoat;
    });

    if (!isDuplicate) {
      merged.push(virtualEvt);
    }
  });

  // Sort merged list chronologically by start time
  return merged.sort((a, b) => {
    const aTime = a.start?.dateTime || a.start?.date || '';
    const bTime = b.start?.dateTime || b.start?.date || '';
    return aTime.localeCompare(bTime);
  });
}

// Auto-invoke configuration check on load in browser environments
if (typeof window !== 'undefined') {
  checkServerConfig().catch(err => {
    console.warn('Erro na autoverificação de conta de serviço:', err);
  });
}


export async function fetchAllHistoricalGoogleEvents(
  startDateStr: string = '2026-05-01',
  endDateStr: string = '2028-12-31',
  calendarNameFilter?: string
): Promise<CalendarEvent[]> {
  if (simulatedConnected || (!cachedToken && !serviceAccountConfigured)) {
    throw new Error('Você precisa estar conectado à API Real do Google (via OAuth ou Conta de Serviço) para realizar uma migração de histórico.');
  }

  let targetCalendars = await resolveTargetCalendars();
  if (calendarNameFilter) {
    targetCalendars = targetCalendars.filter(c => c.summary.toLowerCase().includes(calendarNameFilter.toLowerCase()));
  }

  // Wide range from Jan 1st 2024 to Dec 31 2027 (adjust as needed for history)
  const timeMin = encodeURIComponent(`${startDateStr}T00:00:00-03:00`);
  const timeMax = encodeURIComponent(`${endDateStr}T23:59:59-03:00`);

  const allFetchedEvents: CalendarEvent[] = [];
  const seenEvents = new Set<string>();

  const results: CalendarEvent[][] = [];
  const chunkSize = 3; // Smaller chunk for heavy historical loads
  for (let i = 0; i < targetCalendars.length; i += chunkSize) {
    const chunk = targetCalendars.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (cal) => {
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=1000`;
        const response = await fetch(getApiUrl(url), {
          headers: {
            'Authorization': `Bearer ${cachedToken || 'service_account_active'}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return [];
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
          id: item.id,
          summary: item.summary || 'Sem Título',
          description: '',
          start: item.start || {},
          end: item.end || {},
          creator: item.creator,
          htmlLink: item.htmlLink,
          calendarSummary: cal.summary,
          calendarId: cal.id
        }));
      } catch (e) {
        console.warn(`Erro ao buscar histórico da agenda ${cal.summary}:`, e);
        return [];
      }
    });
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    if (i + chunkSize < targetCalendars.length) {
      await new Promise(res => setTimeout(res, 800)); // Rate limiting buffer
    }
  }
  
  results.forEach(evtList => {
    evtList.forEach(evt => {
      const timeKey = evt.start?.dateTime || evt.start?.date || '';
      const compositeId = `${evt.summary.toUpperCase().trim()}_${timeKey}`;
      if (!seenEvents.has(compositeId)) {
        seenEvents.add(compositeId);
        allFetchedEvents.push(evt);
      }
    });
  });

  return allFetchedEvents;
}
