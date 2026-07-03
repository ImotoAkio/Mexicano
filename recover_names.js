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
    scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"]
  });

  const tokenInfo = await client.getAccessToken();
  const token = tokenInfo.token;

  console.log("Fetching calendar list...");
  const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers: { Authorization: `Bearer ${token}` } });
  const calData = await calRes.json();
  
  const calendars = calData.items || [];
  console.log(`Found ${calendars.length} calendars.`);

  const eventMap = new Map();
  for (const cal of calendars) {
    console.log(`Fetching events for ${cal.summary}...`);
    let pageToken = null;
    do {
      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?maxResults=2500`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      const evtRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!evtRes.ok) break;
      const evtData = await evtRes.json();
      for (const item of (evtData.items || [])) {
        eventMap.set(item.id, item.summary);
      }
      pageToken = evtData.nextPageToken;
    } while(pageToken);
  }

  console.log(`Cached ${eventMap.size} events from Google.`);

  const pool = mysql.createPool({
    host: "84.247.143.102",
    port: 13306,
    user: "nautico_user",
    password: "Akio2604*",
    database: "gestao_nautica"
  });

  const [clients] = await pool.query("SELECT id FROM Clientes");
  const clientIds = new Set(clients.map(c => c.id));
  const [reservas] = await pool.query("SELECT * FROM Reservas");
  const orphans = reservas.filter(r => !clientIds.has(r.clienteId) && r.googleEventId);

  console.log(`Found ${orphans.length} orphaned reservations with googleEventId.`);
  let updatedCount = 0;
  for (const r of orphans) {
    const summary = eventMap.get(r.googleEventId);
    if (summary) {
      const parts = summary.split('-');
      const extractedName = parts.length > 1 ? parts[1].trim() : summary;
      console.log(`Reserva ${r.id}: Found name: ${extractedName}`);
      
      // Update observacoes with a special tag
      const newObs = `[NOME_RECUPERADO:${extractedName}] ${r.observacoes || ''}`;
      await pool.query("UPDATE Reservas SET observacoes = ? WHERE id = ?", [newObs, r.id]);
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} reservations with recovered names.`);
  pool.end();
}

main().catch(console.error);
