import { Router } from "express";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import { requireAdminAuth, upload } from "./middlewares";
import { uploadToR2, generatePresignedUrl, isR2Configured } from "../server-r2";
import { getDbPool, invalidateDbCache } from "../server-db";

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
const boatsUploadsDir = path.join(uploadsDir, 'boats');
const checklistUploadsDir = path.join(uploadsDir, 'checklists');
const comprovantesUploadsDir = path.join(uploadsDir, 'comprovantes');

// R2: Gerar Presigned URL para upload direto de vídeos via Client-side
router.post("/presigned-url", requireAdminAuth, async (req, res) => {
  try {
    const { filename, mimeType } = req.body;
    if (!filename || !mimeType) {
      return res.status(400).json({ error: true, message: "filename e mimeType são obrigatórios" });
    }

    if (!mimeType.startsWith("video/")) {
      return res.status(400).json({ error: true, message: "Apenas vídeos podem utilizar este endpoint" });
    }

    const { uploadUrl, publicUrl } = await generatePresignedUrl(filename, mimeType);

    res.json({ success: true, uploadUrl, publicUrl });
  } catch (err: any) {
    console.error("Presigned URL error:", err);
    res.status(500).json({ error: true, message: err.message || "Falha ao gerar URL de upload rápido" });
  }
});

router.post("/boat-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = `boat_${Date.now()}.webp`;
    const outBuf = await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

    try {
      const publicUrl = await uploadToR2(outBuf, `boats/${filename}`, "image/webp");
      res.json({ success: true, imageUrl: publicUrl });
    } catch (r2Err) {
      console.error("R2 Upload Failed:", r2Err);
      const outputPath = path.join(boatsUploadsDir, filename);
      fs.writeFileSync(outputPath, outBuf);
      res.json({ success: true, imageUrl: `/uploads/boats/${filename}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to upload image" });
  }
});

// Route: Upload boat document
router.post("/boat-document", requireAdminAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No file provided." });
    const isPDF = req.file.mimetype === 'application/pdf';
    let filename = '';
    let outBuf = req.file.buffer;
    let mime = req.file.mimetype;

    if (isPDF) {
      filename = `doc_${Date.now()}_${Math.floor(Math.random()*1000)}.pdf`;
    } else {
      filename = `doc_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
      outBuf = await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      mime = "image/webp";
    }

    try {
      const publicUrl = await uploadToR2(outBuf, `boats/${filename}`, mime);
      res.json({ success: true, documentUrl: publicUrl });
    } catch (r2Err) {
      console.error("R2 Upload Failed:", r2Err);
      const outputPath = path.join(boatsUploadsDir, filename);
      fs.writeFileSync(outputPath, outBuf);
      res.json({ success: true, documentUrl: `/uploads/boats/${filename}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to upload document" });
  }
});

// Route: Upload checklist image
router.post("/checklist-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = `chk_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;

    // Resize image and convert to webp buffer
    let outBuf: Buffer;
    try {
      outBuf = await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp error, using raw buffer:", sharpErr);
      outBuf = req.file.buffer;
    }

    try {
      const publicUrl = await uploadToR2(outBuf, `checklists/${filename}`, "image/webp");
      res.json({ success: true, imageUrl: publicUrl });
    } catch (r2Err) {
      console.error("R2 Upload Failed:", r2Err);
      // Fallback local
      fs.writeFileSync(path.join(checklistUploadsDir, filename), outBuf);
      res.json({ success: true, imageUrl: `/uploads/checklists/${filename}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Upload comprovante (accepts images and PDF files)
router.post("/comprovante", requireAdminAuth, upload.single('comprovante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "Nenhum arquivo fornecido." });
    const isPdf = req.file.mimetype === 'application/pdf';
    const isImage = req.file.mimetype.startsWith('image/');
    if (!isPdf && !isImage) return res.status(400).json({ error: true, message: "Apenas imagens e arquivos PDF sao permitidos." });
    
    let filename;
    let outBuf = req.file.buffer;
    let mime = req.file.mimetype;
    
    // Fallback originalName cleaning
    const originalNameClean = Buffer.from(req.file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (isImage) {
      filename = `comp_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
      outBuf = await sharp(req.file.buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      mime = "image/webp";
    } else {
      filename = `comp_${Date.now()}_${originalNameClean}`;
    }

    try {
      const publicUrl = await uploadToR2(outBuf, `comprovantes/${filename}`, mime);
      res.json({ success: true, url: publicUrl });
    } catch (r2Err) {
      console.error("R2 Upload Failed:", r2Err);
      fs.writeFileSync(path.join(comprovantesUploadsDir, filename), outBuf);
      res.json({ success: true, url: `/uploads/comprovantes/${filename}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Falha ao enviar comprovante." });
  }
});

// ─── Upload de Contrato Assinado ─────────────────────────────────────────────
// Mesmo bucket R2 dos checklists, porém isolado por prefixo:
//   contratos/aquisicao/<clienteId>/<arquivo>
//   contratos/gestao/<clienteId>/<arquivo>
// PDFs são armazenados byte a byte (sem recompressão) para preservar assinaturas
// digitais (Gov.br / ICP-Brasil). Fotos de contratos físicos são normalizadas em WebP.

const CONTRATO_MAX_BYTES = 20 * 1024 * 1024;

/** Valida a assinatura binária do arquivo — não confia apenas no mimetype enviado pelo navegador. */
function detectContratoKind(buf: Buffer): 'pdf' | 'image' | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image'; // JPEG
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image'; // PNG
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image';
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') return 'image'; // HEIC/HEIF (fotos de iPhone)
  return null;
}

const sanitizeSegment = (value: unknown, fallback: string, max = 40) => {
  const clean = String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, max);
  return clean || fallback;
};

const contratoUpload = upload.single('contrato');

router.post("/contrato", requireAdminAuth, (req, res, next) => {
  // Envolve o multer para devolver mensagens claras em vez de um 500 genérico
  contratoUpload(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: true, message: `Arquivo excede o limite de ${CONTRATO_MAX_BYTES / 1024 / 1024} MB.` });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: true, message: "Envie o arquivo no campo 'contrato'." });
    }
    return res.status(400).json({ error: true, message: err.message || 'Falha ao receber o arquivo.' });
  });
}, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: true, message: "Nenhum arquivo de contrato fornecido." });
    }

    const tipoRaw = String(req.body.tipo || '').toLowerCase().trim();
    const folder = ['aquisicao', 'cota'].includes(tipoRaw)
      ? 'aquisicao'
      : ['adm', 'gestao', 'administracao'].includes(tipoRaw)
      ? 'gestao'
      : ['aditivo', 'aditivo_nautico', 'adit'].includes(tipoRaw)
      ? 'aditivo'
      : 'aquisicao';

    const kind = detectContratoKind(file.buffer);
    if (!kind) {
      return res.status(415).json({ error: true, message: "Formato não suportado. Envie um PDF ou foto (JPG, PNG, WEBP, HEIC) do contrato." });
    }

    const clienteId = sanitizeSegment(req.body.clienteId, 'sem_cliente');
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const baseName = sanitizeSegment(originalName.replace(/\.[^.]+$/, ''), 'contrato', 60);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, ''); // 20261015T182300

    let outBuf: Buffer = file.buffer;
    let mime: string;
    let ext: string;

    if (kind === 'pdf') {
      mime = 'application/pdf';
      ext = 'pdf';
    } else {
      try {
        outBuf = await sharp(file.buffer).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        mime = 'image/webp';
        ext = 'webp';
      } catch (sharpErr) {
        console.warn("[CONTRATO] Sharp não conseguiu processar a imagem, mantendo original:", sharpErr);
        mime = file.mimetype || 'application/octet-stream';
        ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      }
    }

    const filename = `${stamp}_${baseName}.${ext}`;
    const key = `contratos/${folder}/${clienteId}/${filename}`;
    const user = (req as any).user || {};
    const responseBase = {
      success: true,
      filename: originalName,
      size: outBuf.length,
      mime,
      tipo: folder,
      key,
    };

    const persistToDatabase = async (finalUrl: string, storageType: 'r2' | 'local') => {
      const rawId = req.body.clienteId;
      if (!rawId || rawId === 'sem_cliente') return;
      try {
        const pool = getDbPool();
        if (!pool) return;
        const todayStr = new Date().toISOString().split('T')[0];
        if (folder === 'aquisicao') {
          await pool.query(`
            UPDATE Clientes SET
              contratoAquisicaoStatus = 'assinado',
              contratoAquisicaoArquivoUrl = ?,
              contratoAquisicaoArquivoNome = ?,
              contratoAquisicaoArquivoTamanho = ?,
              contratoAquisicaoArquivoKey = ?,
              contratoAquisicaoArquivoStorage = ?,
              contratoAquisicaoDataAssinatura = ?,
              contratoArquivoUrl = ?,
              contratoArquivoNome = ?,
              contratoArquivoTamanho = ?,
              contratoDataAssinatura = ?,
              statusContrato = CASE 
                WHEN tipoContrato = 'ambos' AND (contratoAdmStatus IS NULL OR contratoAdmStatus != 'assinado') THEN 'pendente' 
                ELSE 'assinado' 
              END
            WHERE id = ?
          `, [
            finalUrl, originalName, outBuf.length, key, storageType, todayStr,
            finalUrl, originalName, outBuf.length, todayStr,
            rawId
          ]);
        } else if (folder === 'aditivo') {
          await pool.query(`
            UPDATE Clientes SET
              contratoAditivoStatus = 'assinado',
              contratoAditivoArquivoUrl = ?,
              contratoAditivoArquivoNome = ?,
              contratoAditivoArquivoTamanho = ?,
              contratoAditivoArquivoKey = ?,
              contratoAditivoArquivoStorage = ?,
              contratoAditivoDataAssinatura = ?
            WHERE id = ?
          `, [
            finalUrl, originalName, outBuf.length, key, storageType, todayStr,
            rawId
          ]);
        } else {
          await pool.query(`
            UPDATE Clientes SET
              contratoAdmStatus = 'assinado',
              contratoAdmArquivoUrl = ?,
              contratoAdmArquivoNome = ?,
              contratoAdmArquivoTamanho = ?,
              contratoAdmArquivoKey = ?,
              contratoAdmArquivoStorage = ?,
              contratoAdmDataAssinatura = ?,
              contratoArquivoUrl = CASE WHEN tipoContrato = 'adm' THEN ? ELSE contratoArquivoUrl END,
              contratoArquivoNome = CASE WHEN tipoContrato = 'adm' THEN ? ELSE contratoArquivoNome END,
              contratoArquivoTamanho = CASE WHEN tipoContrato = 'adm' THEN ? ELSE contratoArquivoTamanho END,
              contratoDataAssinatura = CASE WHEN tipoContrato = 'adm' THEN ? ELSE contratoDataAssinatura END,
              statusContrato = CASE 
                WHEN tipoContrato = 'ambos' AND (contratoAquisicaoStatus IS NULL OR contratoAquisicaoStatus != 'assinado') THEN 'pendente' 
                ELSE 'assinado' 
              END
            WHERE id = ?
          `, [
            finalUrl, originalName, outBuf.length, key, storageType, todayStr,
            finalUrl, originalName, outBuf.length, todayStr,
            rawId
          ]);
        }
        invalidateDbCache();
      } catch (dbErr) {
        console.warn("[CONTRATO] Falha ao atualizar banco de dados no upload:", dbErr);
      }
    };

    if (isR2Configured()) {
      try {
        const url = await uploadToR2(outBuf, key, mime, {
          contentDisposition: `inline; filename="${baseName}.${ext}"`,
          metadata: {
            tipo: folder,
            cliente: clienteId,
            enviadopor: sanitizeSegment(user.username || user.id, 'desconhecido'),
          },
        });
        console.log(`[CONTRATO] R2 OK -> ${key} (${outBuf.length} bytes) por ${user.username || 'n/d'}`);
        await persistToDatabase(url, 'r2');
        return res.json({ ...responseBase, url, storage: 'r2' });
      } catch (r2Err: any) {
        console.error("[CONTRATO] Falha no upload R2, usando disco local:", r2Err?.message || r2Err);
      }
    } else {
      console.warn("[CONTRATO] R2 não configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME). Salvando em disco local.");
    }

    // Fallback local espelhando a mesma estrutura de pastas do bucket
    const localDir = path.join(uploadsDir, 'contratos', folder, clienteId);
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(localDir, filename), outBuf);
    const localUrl = `/uploads/${key}`;
    await persistToDatabase(localUrl, 'local');
    return res.json({ ...responseBase, url: localUrl, storage: 'local' });
  } catch (err: any) {
    console.error("[CONTRATO] Erro interno no upload:", err);
    res.status(500).json({ error: true, message: err.message || "Falha ao processar arquivo de contrato." });
  }
});

export default router;
