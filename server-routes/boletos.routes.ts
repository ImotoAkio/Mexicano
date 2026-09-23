import { Router } from "express";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { requireAdminAuth, upload, whatsappLimiter } from "./middlewares";
import { pullDatabase } from "../server-db";

const router = Router();
const boletosUploadsDir = path.join(process.cwd(), 'uploads', 'boletos');
if (!fs.existsSync(boletosUploadsDir)) fs.mkdirSync(boletosUploadsDir, { recursive: true });

function normalizeString(str: string) {
  if (!str) return "";
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

router.post("/boletos/upload", upload.array('boletos', 50), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: true, message: "Nenhum arquivo enviado" });
    }

    const results = [];

    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        continue;
      }

      // Load PDF to check and split pages
      const pdfDoc = await PDFDocument.load(file.buffer);
      const pageCount = pdfDoc.getPageCount();

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        // Extract single page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();
        const singlePageBuffer = Buffer.from(singlePageBytes);

        // Parse single page PDF
        const parser = new PDFParse({ data: singlePageBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const text = pdfData.text;
        
        let payerName = "";
        
        // Basic extraction logic: try to find "Pagador" or "Sacado"
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const upperLine = line.toUpperCase();
          
          // Remove accents for checking
          const cleanLine = upperLine.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          
          if (cleanLine === "PAGADOR" || cleanLine === "SACADO" || cleanLine.startsWith("PAGADOR:") || cleanLine.startsWith("PAGADOR -") || cleanLine.startsWith("SACADO:") || cleanLine.startsWith("SACADO -")) {
            if (cleanLine === "PAGADOR" || cleanLine === "SACADO") {
               // The name is on the next line
               if (i + 1 < lines.length) {
                 payerName = lines[i + 1].trim();
                 if (payerName.includes(" - CPF/CNPJ")) payerName = payerName.split(" - CPF/CNPJ")[0].trim();
                 if (payerName.length > 3) break;
               }
            } else {
              // It's on the same line like PAGADOR: Nome
              const match = cleanLine.match(/^(?:PAGADOR|SACADO)(?:\s*:\s*|\s+-\s+)(.+)/);
              if (match && match[1].trim().length > 3) {
                payerName = match[1].trim();
                if (payerName.includes(" - CPF/CNPJ")) payerName = payerName.split(" - CPF/CNPJ")[0].trim();
                break;
              }
            }
          }
        }
        
        // Save temporarily
        const originalBase = file.originalname.replace('.pdf', '');
        const tempFilename = `boleto_${Date.now()}_${Math.random().toString(36).substring(2,7)}.pdf`;
        const tempPath = path.join(boletosUploadsDir, tempFilename);
        fs.writeFileSync(tempPath, singlePageBuffer);
        
        const displayOriginalName = pageCount > 1 ? `${originalBase} - Pag ${pageIndex + 1}.pdf` : file.originalname;

        results.push({
          originalName: displayOriginalName,
          payerName,
          tempPath: `/uploads/boletos/${tempFilename}`,
          localPath: tempPath // Keep local path for later sending
        });
      }
    }

    res.json({ success: true, boletos: results });
  } catch (err: any) {
    console.error("Error processing boletos:", err);
    fs.appendFileSync('boleto-debug.log', new Date().toISOString() + ' | ' + err.message + '\n' + err.stack + '\n---\n');
    res.status(500).json({ error: true, message: "Erro ao processar boletos. Verifique o arquivo boleto-debug.log no servidor." });
  }
});

router.post("/boletos/match-clients", requireAdminAuth, async (req, res) => {
  try {
    const { names } = req.body; // array of strings
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: true, message: "Names array is required" });
    }

    const dbData = await pullDatabase();
    const clients = dbData.clients || [];
    
    const results = names.map((name: string) => {
      if (!name) return { name, match: null, confidence: 'none' };
      
      const normName = normalizeString(name);
      
      // Exact match
      let match = clients.find((c: any) => normalizeString(c.nome) === normName);
      if (match) return { name, match, confidence: 'alta' };
      
      // Includes / partial match
      match = clients.find((c: any) => {
        const normC = normalizeString(c.nome);
        return normName.includes(normC) || normC.includes(normName);
      });
      if (match) return { name, match, confidence: 'media' };
      
      // Very basic fuzzy (split words)
      const nameWords = normName.split(/\s+/).filter(w => w.length > 2);
      match = clients.find((c: any) => {
        const cWords = normalizeString(c.nome).split(/\s+/);
        let matches = 0;
        for (const w of nameWords) {
          if (cWords.includes(w)) matches++;
        }
        return matches >= 2; // at least 2 words match
      });
      
      if (match) return { name, match, confidence: 'baixa' };
      
      return { name, match: null, confidence: 'none' };
    });

    res.json({ success: true, matches: results });
  } catch (err: any) {
    console.error("Error matching clients:", err);
    res.status(500).json({ error: true, message: "Erro ao fazer matching de clientes." });
  }
});

router.post("/boletos/send", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { instanceName, boletos } = req.body;
    // boletos = [{ clientId, number, text, localPath, fileName }]
    
    if (!instanceName || !boletos || !Array.isArray(boletos)) {
      return res.status(400).json({ error: true, message: "Parâmetros inválidos" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const results = [];

    for (const boleto of boletos) {
      try {
        let cleanedNumber = boleto.number.replace(/\D/g, "");
        if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
          cleanedNumber = `55${cleanedNumber}`;
        }
        
        // Read file
        if (!fs.existsSync(boleto.localPath)) {
          results.push({ clientId: boleto.clientId, status: 'error', error: 'Arquivo não encontrado' });
          continue;
        }
        
        const fileBuffer = fs.readFileSync(boleto.localPath);
        const base64Data = fileBuffer.toString('base64');
        
        const payload = {
          number: cleanedNumber,
          mediatype: "document",
          mimetype: "application/pdf",
          caption: boleto.text || "",
          media: base64Data,
          fileName: boleto.fileName || "boleto.pdf"
        };
        
        const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          results.push({ clientId: boleto.clientId, status: 'error', error: errorText });
        } else {
          results.push({ clientId: boleto.clientId, status: 'success' });
          // Cleanup file after successful send
          try {
            fs.unlinkSync(boleto.localPath);
          } catch (e) {
            console.error("Erro ao deletar boleto temporário:", e);
          }
        }
        
        // Wait 2 seconds before sending next (rate limiting)
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err: any) {
        results.push({ clientId: boleto.clientId, status: 'error', error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error("Error sending boletos:", err);
    res.status(500).json({ error: true, message: "Erro ao enviar boletos." });
  }
});

export default router;
