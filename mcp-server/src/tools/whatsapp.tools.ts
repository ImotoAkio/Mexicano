import { z } from "zod";
import https from "https";
import http from "http";
import { config } from "../config.js";
import { queryReadOnly, getConfigValue } from "../db.js";
import { maskPhone } from "../security.js";

const evolutionHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function resolveEvolutionInstance(customInstance?: string): string {
  const fallback = config.evolution.instance || "mexicano";
  if (!customInstance || typeof customInstance !== "string") return fallback;
  const cleaned = customInstance.trim();
  if (!/^[a-zA-Z0-9_\-]+$/.test(cleaned)) return fallback;
  return cleaned;
}

async function evolutionRequest(
  urlStr: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; statusText: string; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === "https:";
      const reqOptions: https.RequestOptions = {
        method: options.method || "GET",
        headers: options.headers || {},
        agent: isHttps ? evolutionHttpsAgent : undefined,
        timeout: options.timeoutMs || 15000,
      };

      const req = (isHttps ? https : http).request(url, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          resolve({
            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode || 500,
            statusText: res.statusMessage || "",
            text,
          });
        });
      });

      req.on("timeout", () => {
        req.destroy(new Error("Timeout ao comunicar com a Evolution API."));
      });
      req.on("error", reject);

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const VerificarStatusWhatsappSchema = z.object({
  instancia: z
    .string()
    .optional()
    .describe("Nome opcional da instância na Evolution API (padrão configurado no servidor)"),
});

export const EnviarMensagemWhatsappSchema = z.object({
  clienteId: z
    .string()
    .optional()
    .describe("ID do cliente cadastrado no sistema (o servidor buscará o telefone automaticamente no banco sem expor dados sensíveis)"),
  telefone: z
    .string()
    .optional()
    .describe("Número do telefone/WhatsApp com DDD (ex: '11999999999' ou '5511999999999') caso não seja informado clienteId"),
  mensagem: z
    .string()
    .min(1, "A mensagem não pode estar vazia")
    .max(4000, "A mensagem excede o limite de 4000 caracteres")
    .describe("Texto da mensagem a ser enviada via WhatsApp"),
});

export async function handlerVerificarStatusWhatsapp(
  args: z.infer<typeof VerificarStatusWhatsappSchema>
) {
  const { apiUrl, apiKey } = config.evolution;
  const instance = resolveEvolutionInstance(args.instancia);
  const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
  const sandboxTelefone = await getConfigValue("notif_sandbox_telefone");

  if (!apiUrl || !apiKey) {
    return {
      conectado: false,
      estado: "not_configured",
      instancia: instance,
      sandboxAtiva,
      mensagem: "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas no ambiente.",
    };
  }

  try {
    const response = await evolutionRequest(`${apiUrl}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: { apikey: apiKey },
      timeoutMs: 10000,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(response.text);
    } catch {}

    return {
      conectado: response.ok && parsed?.instance?.state === "open",
      estado: parsed?.instance?.state || (response.status === 404 ? "not_created" : "close"),
      instancia: instance,
      sandboxAtiva,
      sandboxTelefoneMascarado: sandboxTelefone ? maskPhone(sandboxTelefone) : null,
      detalhes: parsed,
    };
  } catch (err: any) {
    return {
      conectado: false,
      estado: "error",
      instancia: instance,
      sandboxAtiva,
      erro: err.message || "Falha ao verificar status da Evolution API",
    };
  }
}

export async function handlerEnviarMensagemWhatsapp(
  args: z.infer<typeof EnviarMensagemWhatsappSchema>
) {
  const { clienteId, telefone, mensagem } = args;

  if (!clienteId && !telefone) {
    return {
      sucesso: false,
      erro: "Informe 'clienteId' (para buscar o telefone no cadastro do cliente) ou 'telefone' diretamente.",
    };
  }

  let targetPhone = telefone || "";
  let destinatarioNome = "Número avulso";

  if (clienteId) {
    const rows = await queryReadOnly<any>(
      "SELECT id, nome, telefone FROM Clientes WHERE id = ? LIMIT 1",
      [clienteId]
    );
    const client = rows[0];
    if (!client) {
      return {
        sucesso: false,
        erro: `Cliente '${clienteId}' não encontrado.`,
      };
    }
    destinatarioNome = client.nome || clienteId;
    if (!targetPhone) {
      targetPhone = client.telefone || "";
    }
    if (!targetPhone) {
      return {
        sucesso: false,
        erro: `O cliente '${destinatarioNome}' não possui telefone cadastrado no sistema.`,
      };
    }
  }

  // Formata número brasileiro
  let cleanedNumber = String(targetPhone).trim();
  if (!cleanedNumber.includes("@g.us")) {
    cleanedNumber = cleanedNumber.replace(/\D/g, "");
    if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
      cleanedNumber = `55${cleanedNumber}`;
    }
  }

  if (!cleanedNumber || cleanedNumber.length < 10) {
    return {
      sucesso: false,
      erro: "Número de telefone inválido para envio no WhatsApp.",
    };
  }

  // 🛡️ Trava física de Sandbox idêntica ao backend principal (server-routes/whatsapp.routes.ts)
  const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
  const sandboxTelefone = (await getConfigValue("notif_sandbox_telefone")) || "";
  if (sandboxAtiva) {
    let cleanedSandbox = sandboxTelefone.replace(/\D/g, "");
    if (cleanedSandbox.length >= 10 && cleanedSandbox.length <= 11 && !cleanedSandbox.startsWith("55")) {
      cleanedSandbox = `55${cleanedSandbox}`;
    }
    if (!cleanedSandbox || cleanedNumber !== cleanedSandbox) {
      console.error(`🛡️ [MCP-WHATSAPP SANDBOX] Envio para ${maskPhone(cleanedNumber)} (${destinatarioNome}) interceptado pelo Modo Sandbox.`);
      return {
        sucesso: true,
        sandboxInterceptado: true,
        destinatario: destinatarioNome,
        telefoneMascarado: maskPhone(cleanedNumber),
        mensagem: "Modo Sandbox ativo no sistema: o envio para cliente real foi interceptado e bloqueado com segurança.",
      };
    }
  }

  const { apiUrl, apiKey } = config.evolution;
  const instance = resolveEvolutionInstance();

  if (!apiUrl || !apiKey) {
    return {
      sucesso: false,
      erro: "Evolution API (EVOLUTION_API_URL / EVOLUTION_API_KEY) não configurada no servidor.",
    };
  }

  try {
    const response = await evolutionRequest(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: cleanedNumber,
        text: mensagem,
      }),
    });

    if (!response.ok) {
      return {
        sucesso: false,
        destinatario: destinatarioNome,
        telefoneMascarado: maskPhone(cleanedNumber),
        statusHttp: response.status,
        erro: response.text || response.statusText || "Erro ao enviar mensagem pela Evolution API.",
      };
    }

    console.error(`[AUDIT-MCP] SEND_WHATSAPP | Destinatario: ${destinatarioNome} (${maskPhone(cleanedNumber)}) | Instancia: ${instance}`);

    return {
      sucesso: true,
      sandboxInterceptado: false,
      destinatario: destinatarioNome,
      telefoneMascarado: maskPhone(cleanedNumber),
      instancia: instance,
      mensagem: "Mensagem enviada com sucesso via WhatsApp.",
    };
  } catch (err: any) {
    return {
      sucesso: false,
      destinatario: destinatarioNome,
      telefoneMascarado: maskPhone(cleanedNumber),
      erro: err.message || "Falha de conexão com a Evolution API.",
    };
  }
}
