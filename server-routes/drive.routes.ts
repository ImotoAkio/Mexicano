import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdminAuth, upload } from "./middlewares";
import { getDbPool } from "../server-db";
import { uploadToR2 } from "../server-r2";

const router = Router();
const driveUploadsDir = path.join(process.cwd(), 'uploads', 'drive');
if (!fs.existsSync(driveUploadsDir)) {
  fs.mkdirSync(driveUploadsDir, { recursive: true });
}

// [Routes]
// ---------------- Internal Chat & Drive (Admin/Financeiro) ----------------

router.get("/drive/folders", requireAdminAuth, async (req, res) => {
  try {
    const clienteId = req.query.clienteId;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    let query = "SELECT * FROM DriveFolders WHERE clienteId IS NULL ORDER BY name ASC";
    let params: any[] = [];
    if (clienteId) {
      query = "SELECT * FROM DriveFolders WHERE clienteId = ? ORDER BY name ASC";
      params = [clienteId];
    }
    const [folders] = await currentPool.query(query, params);
    res.json({ success: true, folders });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.get("/drive/files", requireAdminAuth, async (req, res) => {
  try {
    const clienteId = req.query.clienteId;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    let query = "SELECT * FROM DriveFiles WHERE clienteId IS NULL ORDER BY createdAt DESC";
    let params: any[] = [];
    if (clienteId) {
      query = "SELECT * FROM DriveFiles WHERE clienteId = ? ORDER BY createdAt DESC";
      params = [clienteId];
    }
    const [files] = await currentPool.query(query, params);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post("/drive/folder", requireAdminAuth, async (req, res) => {
  try {
    const { name, parentId, clienteId } = req.body;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    const id = `folder_${Date.now()}`;
    await currentPool.query(
      "INSERT INTO DriveFolders (id, name, parentId, clienteId, createdAt) VALUES (?, ?, ?, ?, ?)",
      [id, name, parentId || null, clienteId || null, new Date().toISOString()]
    );
    res.json({ success: true, folder: { id, name, parentId: parentId || null, clienteId: clienteId || null } });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post("/drive/upload", requireAdminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "Nenhum arquivo enviado." });

    const { folderId, clienteId } = req.body;
    const uploaderName = (req as any).user.username;

    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });

    const uniqueFilename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    let publicUrl = "";

    try {
      publicUrl = await uploadToR2(req.file.buffer, `drive/${uniqueFilename}`, req.file.mimetype);
    } catch (r2Err) {
      console.error("R2 Upload Failed:", r2Err);
      const filePath = path.join(driveUploadsDir, uniqueFilename);
      fs.writeFileSync(filePath, req.file.buffer);
      publicUrl = uniqueFilename; // keep old format if local
    }

    const id = `file_${Date.now()}`;
    const fileRecord = {
      id,
      folderId: folderId || null,
      filename: publicUrl.startsWith("http") ? publicUrl : uniqueFilename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: uploaderName,
      createdAt: new Date().toISOString()
    };

    await currentPool.query(
      "INSERT INTO DriveFiles (id, folderId, filename, originalName, mimeType, size, uploadedBy, clienteId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, fileRecord.folderId, fileRecord.filename, fileRecord.originalName, fileRecord.mimeType, fileRecord.size, fileRecord.uploadedBy, clienteId || null, fileRecord.createdAt]
    );

    res.json({ success: true, file: fileRecord });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

router.delete("/drive/file/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    const [files] = await currentPool.query("SELECT * FROM DriveFiles WHERE id = ?", [id]);
    if ((files as any[]).length > 0) {
      const file = (files as any[])[0];
      const filePath = path.join(driveUploadsDir, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await currentPool.query("DELETE FROM DriveFiles WHERE id = ?", [id]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.delete("/drive/folder/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    const [files] = await currentPool.query("SELECT * FROM DriveFiles WHERE folderId = ?", [id]);
    for (const file of (files as any[])) {
      const filePath = path.join(driveUploadsDir, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await currentPool.query("DELETE FROM DriveFiles WHERE folderId = ?", [id]);
    await currentPool.query("DELETE FROM DriveFolders WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
