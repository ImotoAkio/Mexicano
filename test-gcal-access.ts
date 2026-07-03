import { JWT } from "google-auth-library";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("Loading Database Configuration...");
  let saJson = "";
  let mappingsStr = "";
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: "gestao_nautica",
    });

    const [rows]: any = await connection.query("SELECT chave, valor FROM Config");
    for (const row of rows) {
      if (row.chave === "google_service_account_json") saJson = row.valor;
      if (row.chave === "calendar_mappings") mappingsStr = row.valor;
    }
    await connection.end();
  } catch (e: any) {
    console.error("DB Error:", e.message);
    return;
  }

  if (!saJson) {
    console.error("No service account JSON stored.");
    return;
  }

  let mappings: Record<string, string> = {};
  if (mappingsStr) {
    try {
      mappings = JSON.parse(mappingsStr);
    } catch {}
  }

  console.log("Active Calendar Mappings keys inside DB:", Object.keys(mappings));

  const credentials = JSON.parse(saJson);
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  });

  const tokenObj = await client.getAccessToken();
  const token = tokenObj.token;
  console.log("Authenticated Service Account with token.");

  // Iterate over mappings and test fetching from each
  for (const [key, calendarId] of Object.entries(mappings)) {
    if (!calendarId) continue;
    console.log(`\nTesting calendar [${key}] Id: ${calendarId}`);

    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId.trim())}/events?maxResults=5&singleEvents=true`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      console.log(`Response Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        const payload = JSON.parse(text);
        console.log(`Success! Found ${payload.items?.length || 0} events.`);
      } else {
        console.warn(`Error from Google Calendar:`, text);
      }
    } catch (err: any) {
      console.error(`Fetch exception for ${key}:`, err.message);
    }
  }
}

run();
