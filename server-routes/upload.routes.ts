import { Router } from "express";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import { requireAdminAuth, upload } from "./middlewares";
import { uploadToR2, generatePresignedUrl } from "../server-r2";

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
    const outBuf = await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

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

export default router;
