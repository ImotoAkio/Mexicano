import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdminAuth, upload } from "./middlewares";
import { getDbPool, getUserPreferences, upsertUserPreferences } from "../server-db";
import { uploadToR2 } from "../server-r2";

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

// ==========================================
// Chat Messages
// ==========================================
router.get("/chat/messages", requireAdminAuth, async (req, res) => {
  try {
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    const [messages] = await currentPool.query("SELECT * FROM ChatMessages ORDER BY createdAt ASC LIMIT 500");
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ==========================================
// User Preferences
// ==========================================
router.get("/preferences", requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });
    const prefs = await getUserPreferences(user.id);
    res.json(prefs || {});
  } catch(err: any) {
    res.status(500).json({ error: true, message: err.message || "Error fetching preferences" });
  }
});

router.post("/preferences", requireAdminAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });

    const { greetingText } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let logoUrl = req.body.logoUrl || null;
    let backgroundUrl = req.body.backgroundUrl || null;

    if (files && files['logo'] && files['logo'][0]) {
      const file = files['logo'][0];
      const filename = `logo_${Date.now()}_${Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      try {
        logoUrl = await uploadToR2(file.buffer, `comercial/${filename}`, file.mimetype);
      } catch (e) {
        console.error("R2 fail:", e);
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        logoUrl = `/uploads/${filename}`;
      }
    }

    if (files && files['background'] && files['background'][0]) {
      const file = files['background'][0];
      const filename = `bg_${Date.now()}_${Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      try {
        backgroundUrl = await uploadToR2(file.buffer, `comercial/${filename}`, file.mimetype);
      } catch (e) {
        console.error("R2 fail:", e);
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        backgroundUrl = `/uploads/${filename}`;
      }
    }

    const prefs = await getUserPreferences(user.id);
    await upsertUserPreferences(user.id, {
      logoUrl: logoUrl !== undefined ? logoUrl : (prefs?.logoUrl || null),
      backgroundUrl: backgroundUrl !== undefined ? backgroundUrl : (prefs?.backgroundUrl || null),
      greetingText: greetingText !== undefined ? greetingText : (prefs?.greetingText || null)
    });

    res.json({ success: true, logoUrl, backgroundUrl, greetingText });
  } catch(err: any) {
    console.error(err);
    res.status(500).json({ error: true, message: err.message || "Error saving preferences" });
  }
});

export default router;
