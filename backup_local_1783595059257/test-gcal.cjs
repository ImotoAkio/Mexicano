const { JWT } = require("google-auth-library");
require("dotenv").config();

async function run() {
  const saJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  let credentials = {};
  if (saJsonString) {
    try {
      credentials = JSON.parse(saJsonString);
    } catch (e1) {
      try {
        const cleaned = saJsonString.replace(/\\"/g, '"');
        credentials = JSON.parse(cleaned);
      } catch (e2) {
        console.warn("Could not parse GOOGLE_SERVICE_ACCOUNT_JSON:", e1.message);
      }
    }
  }

  const email = clientEmail || credentials.client_email;
  let key = privateKey || credentials.private_key;

  if (!email || !key) {
    console.log("Missing email or key", { email, key });
    return;
  }
  
  key = key.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1).trim();
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.substring(1, key.length - 1).trim();
  }
  key = key.replace(/\\n/g, "\n");

  const lines = key.split("\n");
  const cleanedLines = lines.map(line => {
    if (line.includes("-----BEGIN") || line.includes("-----END")) {
      return line.trim();
    }
    return line.replace(/[^a-zA-Z0-9+/= ]/g, "").trim();
  });
  key = cleanedLines.filter(line => line.length > 0).join("\n");

  try {
    const client = new JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/calendar"]
    });
    console.log("Client created successfully!", !!client);
  } catch(e) {
    console.error("Error creating client", e);
  }
}
run();
