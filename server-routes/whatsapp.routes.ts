import { Router, Request, Response as ExpressResponse } from "express";
import { requireAdminAuth, requireAnyAuth, whatsappLimiter } from "./middlewares";
import https from "https";
import http from "http";

const router = Router();

const evolutionHttpsAgent = new https.Agent({ rejectUnauthorized: false });

// Helper: fetch com tolerância a certificados SSL autoassinados para a Evolution API (Usando https nativo para evitar bugs do undici/vite-node)
async function evolutionFetch(urlStr: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers as any || {},
        agent: isHttps ? evolutionHttpsAgent : undefined,
      };

      const req = (isHttps ? https : http).request(url, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          const response = {
            ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 500,
            statusText: res.statusMessage || '',
            headers: {
              get: (name: string) => res.headers[name.toLowerCase()]
            },
            text: async () => bodyBuffer.toString('utf-8'),
            json: async () => JSON.parse(bodyBuffer.toString('utf-8'))
          } as unknown as Response;
          resolve(response);
        });
      });

      req.on('error', reject);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy(new Error('Aborted'));
        });
      }

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function parseEvolutionError(errorText: string, fallbackText: string, recipient: string) {
  try {
    const parsed = JSON.parse(errorText);
    if (parsed?.response?.message) {
      const firstMsg = Array.isArray(parsed.response.message) ? parsed.response.message[0] : parsed.response.message;
      if (firstMsg?.exists === false) {
        return { isClientError: true, message: `O número ${firstMsg.number || recipient} não possui conta ativa no WhatsApp.` };
      }
      const msg = typeof firstMsg === 'string' ? firstMsg : (firstMsg?.message || JSON.stringify(firstMsg));
      return { isClientError: false, message: msg };
    }
    if (parsed?.message) {
      const msg = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
      return { isClientError: false, message: msg };
    }
  } catch (e) {}
  return { isClientError: false, message: errorText || fallbackText };
}

// Route: Get WhatsApp Connection Status (Evolution API)
router.get("/whatsapp/status", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.json({ instance: { state: "not_configured" }, message: "Evolution API (EVOLUTION_API_URL / EVOLUTION_API_KEY) não configurada nas variáveis de ambiente." });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ error: "Not Found", instance: { state: "not_created" }, message: "Instância não existe" });
      }
      return res.json({ instance: { state: "close" }, message: `Evolution API status: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn("Error checking WhatsApp status (safe handling):", err?.message);
    res.json({ instance: { state: "close" }, message: err?.message || "Failed to fetch status" });
  }
});

// Route: Get WhatsApp Connect / QR Code (Evolution API)
router.get("/whatsapp/connect", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = (req.query.instance as string) || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.json({ base64: null, count: 0, message: "Evolution API não configurada nas variáveis de ambiente." });
    }

    let response = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      const statusText = (response.statusText || '').toLowerCase();
      if (response.status === 404 || statusText.includes('not found')) {
        console.log(`[WhatsApp Connect] Instance '${instance}' not found on Evolution API. Creating automatically...`);
        const createRes = await evolutionFetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" })
        });

        if (createRes.ok || createRes.status === 403 || createRes.status === 409) {
          await new Promise(r => setTimeout(r, 1500));
          response = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
            method: "GET",
            headers: { "apikey": apiKey }
          });
        }
      }
    }

    if (!response.ok) {
      return res.json({ base64: null, count: 0, message: `Evolution API instance connect: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn("Error connecting WhatsApp (safe handling):", err?.message);
    res.json({ base64: null, count: 0, message: err?.message || "Failed to connect" });
  }
});

// Route: Get all instances from Evolution API
router.get("/whatsapp/instances", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API não configurada." });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/fetchInstances`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      return res.status(500).json({ error: true, message: `Failed to fetch instances: ${response.statusText}` });
    }

    const data = await response.json();
    // data is typically an array of instances: [{ instance: { instanceName: "mexicano", status: "open" } }, ...] or similar depending on Evolution version.
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err?.message || "Failed to fetch instances" });
  }
});

// Route: Debug WhatsApp Connection & Evolution API Diagnostics
router.get("/whatsapp/debug", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = (req.query.instance as string) || process.env.EVOLUTION_INSTANCE || "mexicano";

    const report: any = {
      timestamp: new Date().toISOString(),
      env: {
        EVOLUTION_API_URL: apiUrl ? apiUrl : "NÃO CONFIGURADO",
        EVOLUTION_API_KEY: apiKey ? `${apiKey.substring(0, 6)}...` : "NÃO CONFIGURADO",
        EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "mexicano",
        targetInstance: instance
      },
      tests: {}
    };

    if (!apiUrl || !apiKey) {
      report.status = "ERROR_ENV_MISSING";
      return res.json(report);
    }

    // Test 1: fetchInstances
    try {
      const resInst = await evolutionFetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { "apikey": apiKey }
      });
      const instData = await resInst.json();
      report.tests.fetchInstances = {
        status: resInst.status,
        ok: resInst.ok,
        instancesCount: Array.isArray(instData) ? instData.length : 0,
        instances: Array.isArray(instData) ? instData.map((i: any) => ({ name: i.name, connectionStatus: i.connectionStatus, ownerJid: i.ownerJid })) : instData
      };
    } catch (e: any) {
      report.tests.fetchInstances = { error: e.message };
    }

    // Test 2: connectionState
    try {
      const resState = await evolutionFetch(`${apiUrl}/instance/connectionState/${instance}`, {
        headers: { "apikey": apiKey }
      });
      report.tests.connectionState = {
        status: resState.status,
        ok: resState.ok,
        data: await resState.json()
      };
    } catch (e: any) {
      report.tests.connectionState = { error: e.message };
    }

    // Test 3: connect (QR code endpoint)
    try {
      const resConn = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
        headers: { "apikey": apiKey }
      });
      const connData = await resConn.json();
      report.tests.connect = {
        status: resConn.status,
        ok: resConn.ok,
        keysReturned: Object.keys(connData || {}),
        hasBase64: !!(connData?.base64 || connData?.qrcode?.base64),
        hasCode: !!connData?.code,
        dataSummary: {
          instance: connData?.instance,
          state: connData?.instance?.state || connData?.state,
          pairingCode: connData?.pairingCode,
          codePreview: connData?.code ? (connData.code.substring(0, 30) + "...") : null
        }
      };
    } catch (e: any) {
      report.tests.connect = { error: e.message };
    }

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Logout WhatsApp (Evolution API)
router.delete("/whatsapp/logout", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    res.json({ success: true, message: "Deslogado com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to logout" });
  }
});

// Route: Create WhatsApp Instance (Evolution API)
router.post("/whatsapp/instance/create", requireAdminAuth, async (req, res) => {
  try {
    const { instanceName } = req.body;
    if (!instanceName) {
      return res.status(400).json({ error: true, message: "instanceName is required" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: true, message: `Evolution API failure: ${errorText}` });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to create instance" });
  }
});

// Route: Delete WhatsApp Instance (Evolution API)
router.delete("/whatsapp/instance/delete/:instanceName", requireAdminAuth, async (req, res) => {
  try {
    const { instanceName } = req.params;
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: true, message: `Evolution API failure: ${errorText}` });
    }

    res.json({ success: true, message: "Instância deletada com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to delete instance" });
  }
});

// Route: Get WhatsApp Groups (Evolution API)
router.get("/whatsapp/groups", requireAnyAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await evolutionFetch(`${apiUrl}/group/fetchAllGroups/${instance}?getParticipants=false`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    const rawGroups = Array.isArray(data) ? data : (data?.data || []);
    const uniqueGroupsMap = new Map();
    for (const g of rawGroups) {
      const gid = g?.id || g?.jid;
      if (gid && !uniqueGroupsMap.has(gid)) {
        uniqueGroupsMap.set(gid, { ...g, id: gid, subject: g.subject || g.name || gid });
      }
    }
    const deduplicatedGroups = Array.from(uniqueGroupsMap.values());
    res.json({ success: true, groups: deduplicatedGroups });
  } catch (err: any) {
    console.error("Error fetching WhatsApp groups:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch WhatsApp groups" });
  }
});

// Route: Get WhatsApp Contacts (Evolution API)
router.get("/whatsapp/contacts", requireAnyAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await evolutionFetch(`${apiUrl}/chat/findContacts/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API contact fetch error:", response.status, errorText);
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    const rawContacts = Array.isArray(data) ? data : (data?.data || []);
    const uniqueContactsMap = new Map();
    for (const c of rawContacts) {
      const cid = c?.id || c?.remoteJid || c?.jid;
      if (cid && !uniqueContactsMap.has(cid)) {
        uniqueContactsMap.set(cid, { ...c, id: cid, remoteJid: c.remoteJid || cid });
      }
    }
    const deduplicatedContacts = Array.from(uniqueContactsMap.values());
    res.json({ success: true, contacts: deduplicatedContacts });
  } catch (err: any) {
    console.error("Error fetching WhatsApp contacts:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch WhatsApp contacts" });
  }
});

// Route: Evolution Direct Send Message (Text or Media, individual or group)
router.post("/evolution/send-message", requireAnyAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text, media, mimetype, fileName, caption } = req.body;
    const messageText = text || caption || "";

    if (!number || (!messageText && !media)) {
      return res.status(400).json({ error: true, message: "Missing number or message content" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    let targetRecipient = String(number).trim();
    if (!targetRecipient.includes('@g.us')) {
      let cleaned = targetRecipient.replace(/\D/g, "");
      if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith("55")) {
        cleaned = `55${cleaned}`;
      }
      targetRecipient = cleaned;
    }

    if (media && mimetype) {
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: targetRecipient,
        mediatype,
        mimetype,
        caption: messageText,
        media: base64Data,
        fileName: fileName || "documento"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Media error: ${errorText}` });
      }
    } else {
      const payload = {
        number: targetRecipient,
        text: messageText
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Text error: ${errorText}` });
      }
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending Evolution message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send message" });
  }
});

// Route: Send text message (Evolution API)
router.post("/whatsapp/send-text", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text } = req.body;
    
    if (!number || !text) {
      return res.status(400).json({ error: true, message: "Missing number or text" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    // Clean number unless it's a group JID (@g.us)
    let cleanedNumber = number.trim();
    if (!cleanedNumber.includes('@g.us')) {
      cleanedNumber = cleanedNumber.replace(/\D/g, "");
      if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
        cleanedNumber = `55${cleanedNumber}`;
      }
    }

    const payload = {
      number: cleanedNumber,
      text: text
    };

    const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API sendText error:", response.status, errorText);
      const errInfo = parseEvolutionError(errorText, response.statusText, cleanedNumber);
      return res.status(errInfo.isClientError ? 400 : 502).json({ error: true, message: errInfo.message });
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending WhatsApp message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send WhatsApp message" });
  }
});

// Route: Custom flexible send message (Text and/or Media for individuals or groups)
router.post("/whatsapp/send-custom", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text, media, mimetype, fileName } = req.body;
    
    if (!number || (!text && !media)) {
      return res.status(400).json({ error: true, message: "É necessário informar o número/grupo e o texto ou mídia." });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API não configurada na VPS." });
    }

    let targetRecipient = number.trim();
    if (!targetRecipient.includes('@g.us')) {
      let cleanedNumber = targetRecipient.replace(/\D/g, "");
      if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
        cleanedNumber = `55${cleanedNumber}`;
      }
      targetRecipient = cleanedNumber;
    }

    if (media && mimetype) {
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: targetRecipient,
        mediatype,
        mimetype,
        caption: text || "",
        media: base64Data,
        fileName: fileName || "arquivo"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Evolution API sendMedia error:", response.status, errorText);
        const errInfo = parseEvolutionError(errorText, response.statusText, targetRecipient);
        return res.status(errInfo.isClientError ? 400 : 502).json({ error: true, message: errInfo.message });
      }
    } else {
      const payload = {
        number: targetRecipient,
        text: text
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Evolution API sendText error:", response.status, errorText);
        const errInfo = parseEvolutionError(errorText, response.statusText, targetRecipient);
        return res.status(errInfo.isClientError ? 400 : 502).json({ error: true, message: errInfo.message });
      }
    }

    res.json({ success: true, message: "Mensagem enviada com sucesso!" });
  } catch (err: any) {
    console.error("Error sending custom WhatsApp message:", err);
    res.status(500).json({ error: true, message: err.message || "Falha ao enviar mensagem no WhatsApp" });
  }
});

// Route: Generic send message for Finance (Text or Media)
router.post("/whatsapp/finance/send-message", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { instanceName, number, text, media, mimetype, fileName } = req.body;
    
    if (!instanceName || !number) {
      return res.status(400).json({ error: true, message: "Missing instanceName or number" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    let cleanedNumber = number.replace(/\D/g, "");
    if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
      cleanedNumber = `55${cleanedNumber}`;
    }

    if (media && mimetype) {
      // Send Media (Image or Document)
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: cleanedNumber,
        mediatype,
        mimetype,
        caption: text || "",
        media: base64Data,
        fileName: fileName || "arquivo"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Media failure: ${errorText}` });
      }
    } else if (text) {
      // Send Text only
      const payload = { number: cleanedNumber, text };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Text failure: ${errorText}` });
      }
    } else {
      return res.status(400).json({ error: true, message: "No text or media provided to send" });
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending Finance message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send Finance message" });
  }
});

// Endpoint para gerar a foto e notificar no grupo de whatsapp da lancha/jet
router.post("/whatsapp/send-calendar", requireAnyAuth, whatsappLimiter, async (req, res) => {
  try {
    const { base64Image, groupId, boatName, clientName, dates, caption } = req.body;
    
    if (!base64Image || !groupId) {
      return res.status(400).json({ error: true, message: "Missing base64Image or groupId" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const payload = {
      number: groupId,
      mediatype: "image",
      mimetype: "image/png",
      caption: caption || `📅 ✅`,
      media: base64Data
    };

    const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    res.json({ success: true, message: "Calendar sent successfully to WhatsApp" });
  } catch (err: any) {
    console.error("Error sending WhatsApp calendar:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send WhatsApp message" });
  }
});

export default router;
