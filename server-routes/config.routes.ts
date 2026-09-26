import { Router } from "express";
import { JWT } from "google-auth-library";
import { requireAdminAuth, requireAnyAuth, sensitiveLimiter } from "./middlewares";
import { getConfigValue, setConfigValue } from "../server-db";

const router = Router();

export let cachedAuthClient: JWT | null = null;
let lastUsedSAJson: string | null = null;

// Helper to load credentials and initialize standard Google Auth Client
export async function getGoogleAuthClient(): Promise<JWT | null> {
  const saJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || await getConfigValue("google_service_account_json") || "";
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (cachedAuthClient && lastUsedSAJson === saJsonString && !clientEmail && !privateKey) {
    return cachedAuthClient;
  }

  let credentials: { client_email?: string; private_key?: string } = {};

  if (saJsonString) {
    try {
      credentials = JSON.parse(saJsonString);
    } catch (e1: any) {
      try {
        const cleaned = saJsonString.replace(/\\"/g, '"');
        credentials = JSON.parse(cleaned);
      } catch (e2: any) {
        console.warn("Could not parse GOOGLE_SERVICE_ACCOUNT_JSON on server load:", e1.message || e1);
      }
    }
  }

  const email = clientEmail || credentials.client_email;
  let key = privateKey || credentials.private_key;

  if (!email || !key) {
    cachedAuthClient = null;
    lastUsedSAJson = saJsonString;
    return null;
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

  const client = new JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  });

  cachedAuthClient = client;
  lastUsedSAJson = saJsonString;
  return client;
}

router.get("/calendar/config", requireAnyAuth, async (req, res) => {
  try {
    const client = await getGoogleAuthClient();
    res.json({
      configured: client !== null,
      email: client?.email || null,
      msg: client 
        ? "Google Service Account is successfully configured and active."
        : "Google Service Account credentials missing (configure GOOGLE_SERVICE_ACCOUNT_JSON inside environment or paste via Calendar settings)."
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Unknown config read error." });
  }
});

// Route: Save calendar configuration and mappings
router.post("/calendar/config", requireAdminAuth, async (req, res) => {
  try {
    const { calendar_mappings } = req.body;
    if (calendar_mappings !== undefined) {
      await setConfigValue("calendar_mappings", JSON.stringify(calendar_mappings));
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Failed to save calendar config." });
  }
});

// Route: Save an activity log (Audit)

// Route: Public config (only safe/cosmetic keys, no auth required)
const PUBLIC_CONFIG_KEYS = new Set(["custom_sidebar_logo", "marina_checkin_saida", "marina_checkin_chegada", "marina_checkin_antecedencia", "marina_abertura", "marina_fechamento", "marina_horarios_semana"]);
router.get("/config/public", async (req, res) => {
  try {
    const chaves = (req.query.chaves as string || "").split(",").filter(k => PUBLIC_CONFIG_KEYS.has(k));
    if (!chaves.length) return res.json({ configs: {} });
    const configs: Record<string, string | null> = {};
    for (const chave of chaves) {
      configs[chave] = await getConfigValue(chave);
    }
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Falha ao buscar configurações públicas." });
  }
});

// Route: Get central configuration details from database
router.get("/config", requireAdminAuth, async (req, res) => {
  try {
    const google_client_id = await getConfigValue("google_client_id");
    const mappingsStr = await getConfigValue("calendar_mappings");
    let calendar_mappings = null;
    if (mappingsStr) {
      try {
        calendar_mappings = JSON.parse(mappingsStr);
      } catch {
        calendar_mappings = {};
      }
    }

    // WhatsApp templates & configs
    const whatsapp_conf_template1 = await getConfigValue("whatsapp_conf_template1");
    const whatsapp_conf_template2 = await getConfigValue("whatsapp_conf_template2");
    const whatsapp_cal_template = await getConfigValue("whatsapp_cal_template");
    const finance_whatsapp_instance = await getConfigValue("finance_whatsapp_instance");
    const finance_whatsapp_custom_templates_str = await getConfigValue("finance_whatsapp_custom_templates");
    let finance_whatsapp_custom_templates = null;
    if (finance_whatsapp_custom_templates_str) {
      try { finance_whatsapp_custom_templates = JSON.parse(finance_whatsapp_custom_templates_str); } catch { finance_whatsapp_custom_templates = []; }
    }
    const dbAsaasApiKey = await getConfigValue("asaas_api_key");
    const dbAsaasApiUrl = await getConfigValue("asaas_api_url");
    const dbAsaasWebhookToken = await getConfigValue("asaas_webhook_token");

    const nautical_csv_mapping_str = await getConfigValue("nautical_csv_mapping");
    let nautical_csv_mapping = null;
    if (nautical_csv_mapping_str) {
      try { nautical_csv_mapping = JSON.parse(nautical_csv_mapping_str); } catch { nautical_csv_mapping = {}; }
    }

    const marina_checkin_saida = await getConfigValue("marina_checkin_saida") || "09:00";
    const marina_checkin_chegada = await getConfigValue("marina_checkin_chegada") || "17:00";
    const marina_checkin_antecedencia = await getConfigValue("marina_checkin_antecedencia") || "40";
    const marina_abertura = await getConfigValue("marina_abertura") || "08:00";
    const marina_fechamento = await getConfigValue("marina_fechamento") || "18:00";

    // Per-day-of-week schedule (JSON). Keys 0-6 map to JS Date.getDay() (0=Sunday)
    const marina_horarios_semana_str = await getConfigValue("marina_horarios_semana");
    let marina_horarios_semana = null;
    if (marina_horarios_semana_str) {
      try { marina_horarios_semana = JSON.parse(marina_horarios_semana_str); } catch { marina_horarios_semana = null; }
    }

    const client = await getGoogleAuthClient();
    res.json({
      google_client_id,
      calendar_mappings,
      has_service_account: client !== null,
      service_account_email: client?.email || null,
      marina_checkin_saida,
      marina_checkin_chegada,
      marina_checkin_antecedencia,
      marina_abertura,
      marina_fechamento,
      marina_horarios_semana,
      whatsapp_conf_template1,
      whatsapp_conf_template2,
      whatsapp_cal_template,
      finance_whatsapp_instance,
      finance_whatsapp_custom_templates,
      nautical_csv_mapping,
      has_asaas_api_key: !!dbAsaasApiKey || !!process.env.ASAAS_API_KEY,
      asaas_api_url: dbAsaasApiUrl || process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3",
      asaas_webhook_token: dbAsaasWebhookToken || process.env.ASAAS_WEBHOOK_TOKEN || ""
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Could not retrieve central configurations from database." });
  }
});

// Route: Save central configuration details to database
router.post("/config", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { google_client_id, calendar_mappings, google_service_account_json,
            whatsapp_conf_template1, whatsapp_conf_template2, whatsapp_cal_template,
            finance_whatsapp_instance, finance_whatsapp_custom_templates,
            nautical_csv_mapping, asaas_api_key, asaas_api_url, asaas_webhook_token,
            marina_checkin_saida, marina_checkin_chegada, marina_checkin_antecedencia,
            marina_abertura, marina_fechamento, marina_horarios_semana } = req.body;

    if (google_client_id !== undefined) {
      await setConfigValue("google_client_id", google_client_id);
    }
    
    if (calendar_mappings !== undefined) {
      await setConfigValue("calendar_mappings", JSON.stringify(calendar_mappings));
    }

    if (google_service_account_json !== undefined) {
      const trimmed = google_service_account_json.trim();
      if (trimmed) {
        try {
          JSON.parse(trimmed);
        } catch {
          return res.status(400).json({ error: true, message: "A credencial da Conta de Serviço fornecida não é um JSON válido." });
        }
      }
      await setConfigValue("google_service_account_json", trimmed);
    }

    // WhatsApp templates
    if (whatsapp_conf_template1 !== undefined) {
      await setConfigValue("whatsapp_conf_template1", whatsapp_conf_template1);
    }
    if (whatsapp_conf_template2 !== undefined) {
      await setConfigValue("whatsapp_conf_template2", whatsapp_conf_template2);
    }
    if (whatsapp_cal_template !== undefined) {
      await setConfigValue("whatsapp_cal_template", whatsapp_cal_template);
    }

    // Finance WhatsApp instance
    if (finance_whatsapp_instance !== undefined) {
      await setConfigValue("finance_whatsapp_instance", finance_whatsapp_instance);
    }
    if (finance_whatsapp_custom_templates !== undefined) {
      await setConfigValue("finance_whatsapp_custom_templates", JSON.stringify(finance_whatsapp_custom_templates));
    }

    // CSV import mapping
    if (nautical_csv_mapping !== undefined) {
      await setConfigValue("nautical_csv_mapping", JSON.stringify(nautical_csv_mapping));
    }

    // Configurações de Checkin
    if (marina_checkin_saida !== undefined) {
      await setConfigValue("marina_checkin_saida", marina_checkin_saida);
    }
    if (marina_checkin_chegada !== undefined) {
      await setConfigValue("marina_checkin_chegada", marina_checkin_chegada);
    }
    if (marina_checkin_antecedencia !== undefined) {
      await setConfigValue("marina_checkin_antecedencia", marina_checkin_antecedencia.toString());
    }
    if (marina_abertura !== undefined) {
      await setConfigValue("marina_abertura", marina_abertura);
    }
    if (marina_fechamento !== undefined) {
      await setConfigValue("marina_fechamento", marina_fechamento);
    }
    if (marina_horarios_semana !== undefined) {
      await setConfigValue("marina_horarios_semana", JSON.stringify(marina_horarios_semana));
    }

    // Asaas integration settings
    if (asaas_api_key !== undefined) {
      if (asaas_api_key !== "__UNCHANGED__" && asaas_api_key !== "") {
        await setConfigValue("asaas_api_key", asaas_api_key.trim());
      }
    }
    if (asaas_api_url !== undefined) {
      await setConfigValue("asaas_api_url", asaas_api_url.trim());
    }
    if (asaas_webhook_token !== undefined) {
      await setConfigValue("asaas_webhook_token", asaas_webhook_token.trim());
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Could not save central configurations to database." });
  }
});

// ---------------- Fuel Inventory & History Endpoints ----------------



// ---------------- Google Calendar Proxy ----------------
// Permite que chamadas à API do Google feitas no frontend utilizem a credencial
// da Service Account carregada de forma centralizada pelo backend, sem expor a chave
router.all("/calendar-proxy/*", requireAnyAuth, async (req, res) => {
  const authClient = await getGoogleAuthClient();
  if (!authClient) {
    return res.status(503).json({
      error: "Google Service Account not configured.",
      message: "Please configure GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in your env secrets."
    });
  }

  const prefix = "/calendar-proxy/";
  let relativePath = req.url.startsWith(prefix) ? req.url.substring(prefix.length) : req.url;
  
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }

  if (!relativePath.startsWith('calendar/v3/')) {
    return res.status(403).json({ error: "Apenas Calendar API é permitida." });
  }

  const googleApiUrl = `https://www.googleapis.com/${relativePath}`;

  try {
    const tokenInfo = await authClient.getAccessToken();
    const token = tokenInfo.token;

    if (!token) {
      throw new Error("Failed to retrieve a valid bearer token for Google Calendar Service Account.");
    }

    const fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`
    };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const isBodyRequest = ["POST", "PUT", "PATCH"].includes(req.method) && req.body;
    
    const response = await fetch(googleApiUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: isBodyRequest ? JSON.stringify(req.body) : undefined
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");

    if (response.status === 404 && relativePath.includes("/events")) {
      res.status(200).json({
        items: [],
        error: {
          code: 404,
          message: `Google Calendar not shared or not found. Please ensure the calendar is shared with the Service Account email: ${authClient?.email || 'configured email'}`
        }
      });
      return;
    }

    res.status(response.status);

    if (!response.ok && response.status !== 404) {
      console.warn(`[PROXY] [${req.method}] ${response.status} from ${googleApiUrl}`);
    }

    if (isJson) {
      const data = await response.json();
      res.json(data);
    } else {
      const data = await response.text();
      res.send(data);
    }
  } catch (error: any) {
    console.error(`Google API Proxy failure on [${req.method}] ${googleApiUrl}:`, error);
    res.status(500).json({
      error: "Proxy Connection Error",
      message: error.message || "An unexpected error occurred while proxying call to Google API."
    });
  }
});

export default router;
