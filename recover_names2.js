import { JWT } from 'google-auth-library';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const saJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let credentials = {};
  try { credentials = JSON.parse(saJsonString.replace(/\\"/g, '"')); } catch(e) {}
  
  let key = process.env.GOOGLE_PRIVATE_KEY || credentials.private_key;
  key = key.replace(/\\n/g, "\n");
  const cleanedLines = key.split("\n").map(line => {
    if (line.includes("-----BEGIN") || line.includes("-----END")) return line.trim();
    return line.replace(/[^a-zA-Z0-9+/= ]/g, "").trim();
  });
  key = cleanedLines.filter(line => line.length > 0).join("\n");

  const client = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL || credentials.client_email,
    key: key,
    scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
  });

  const tokenInfo = await client.getAccessToken();
  const token = tokenInfo.token;

  const pool = mysql.createPool({ host: "84.247.143.102", port: 13306, user: "nautico_user", password: "Akio2604*", database: "gestao_nautica" });
  
  // 1. Get calendar mappings
  const [boats] = await pool.query("SELECT id, googleCalendarId, nome FROM Embarcacoes");
  const calIds = new Set();
  calIds.add('primary');
  boats.forEach(b => { if (b.googleCalendarId) calIds.add(b.googleCalendarId); });
  
  // Also get config mappings
  const [config] = await pool.query("SELECT valor FROM Config WHERE chave = 'calendar_mappings'");
  if (config.length > 0) {
    try {
      const maps = JSON.parse(config[0].valor);
      Object.values(maps).forEach(v => calIds.add(v));
    } catch(e) {}
  }

  const eventMap = new Map();
  console.log(`Checking ${calIds.size} specific calendar IDs...`);
  
  for (const calId of calIds) {
    console.log(`Fetching events for calendar: ${calId}`);
    let pageToken = null;
    try {
      do {
        let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?maxResults=2500`;
        if (pageToken) url += `&pageToken=${pageToken}`;
        const evtRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!evtRes.ok) break;
        const evtData = await evtRes.json();
        for (const item of (evtData.items || [])) {
          eventMap.set(item.id, item.summary);
        }
        pageToken = evtData.nextPageToken;
      } while(pageToken);
    } catch (e) {}
  }

  console.log(`Cached ${eventMap.size} events from Google.`);

  const [clients] = await pool.query("SELECT id FROM Clientes");
  const clientIds = new Set(clients.map(c => c.id));
  const [reservas] = await pool.query("SELECT * FROM Reservas");
  const orphans = reservas.filter(r => !clientIds.has(r.clienteId) && r.googleEventId);

  let updatedCount = 0;
  for (const r of orphans) {
    const summary = eventMap.get(r.googleEventId);
    if (summary) {
      const parts = summary.split('-');
      const extractedName = parts.length > 1 ? parts[1].trim() : summary;
      const newObs = `[NOME_RECUPERADO:${extractedName}] ${r.observacoes || ''}`;
      await pool.query("UPDATE Reservas SET observacoes = ? WHERE id = ?", [newObs, r.id]);
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} reservations with recovered names.`);
  pool.end();
}

main().catch(console.error);
