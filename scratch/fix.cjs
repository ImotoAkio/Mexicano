const fs = require('fs');
const path = require('path');

const code = fs.readFileSync('c:/mexicano/server.ts', 'utf8');
const start = code.indexOf('// Route: Upload boat image');
const end = code.indexOf('// Route: Get all admin users');

if (start === -1 || end === -1) {
  console.log("Could not find start or end markers");
  process.exit(1);
}

const newRoutes = `// Route: Upload boat image
app.post("/api/upload/boat-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = \`boat_\${Date.now()}.webp\`;
    const outputPath = path.join(boatsUploadsDir, filename);
    await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outputPath);
    res.json({ success: true, imageUrl: \`/uploads/boats/\${filename}\` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to upload image" });
  }
});

// Route: Upload boat document
app.post("/api/upload/boat-document", requireAdminAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No file provided." });
    const isPDF = req.file.mimetype === 'application/pdf';
    let filename = '';
    if (isPDF) {
      filename = \`doc_\${Date.now()}_\${Math.floor(Math.random()*1000)}.pdf\`;
      require('fs').writeFileSync(path.join(boatsUploadsDir, filename), req.file.buffer);
    } else {
      filename = \`doc_\${Date.now()}_\${Math.floor(Math.random()*1000)}.webp\`;
      await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(boatsUploadsDir, filename));
    }
    res.json({ success: true, documentUrl: \`/uploads/boats/\${filename}\` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Upload checklist image
app.post("/api/upload/checklist-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = \`chk_\${Date.now()}_\${Math.floor(Math.random()*1000)}.webp\`;
    await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(checklistUploadsDir, filename));
    res.json({ success: true, imageUrl: \`/uploads/checklists/\${filename}\` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Upload comprovante (accepts images and PDF files)
app.post("/api/upload/comprovante", requireAdminAuth, upload.single('comprovante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "Nenhum arquivo fornecido." });
    const isPdf = req.file.mimetype === 'application/pdf';
    const isImage = req.file.mimetype.startsWith('image/');
    if (!isPdf && !isImage) return res.status(400).json({ error: true, message: "Apenas imagens e arquivos PDF sao permitidos." });
    let filename;
    const originalNameClean = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    if (isImage) {
      filename = \`comp_\${Date.now()}_\${Math.floor(Math.random()*1000)}.webp\`;
      await sharp(req.file.buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(comprovantesUploadsDir, filename));
    } else {
      filename = \`comp_\${Date.now()}_\${originalNameClean}\`;
      require('fs').writeFileSync(path.join(comprovantesUploadsDir, filename), req.file.buffer);
    }
    res.json({ success: true, url: \`/uploads/comprovantes/\${filename}\` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

`;

fs.writeFileSync('c:/mexicano/server.ts', code.substring(0, start) + newRoutes + code.substring(end));
console.log("Success");
