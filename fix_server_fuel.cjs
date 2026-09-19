const fs = require('fs');

let serverPath = './server.ts';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Replace standard fuel routes with authenticated ones
// And add /api/fuel/consume and /api/fuel/restore
const oldFuelStr = `app.get("/api/fuel/inventory", async (req, res) => {
  try {
    const inv = await getFuelInventoryFromDb();
    res.json(inv || {
      tanquePrincipalLitros: 0,
      tanqueCapacidadeMaxima: 1000,
      alertaMinimoTanque: 200,
      galoesPierQuantidade: 0,
      galoesCapacidadeLitros: 20,
      galaoParcialLitros: 0,
      ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/inventory", async (req, res) => {
  try {
    const inv = req.body;
    await saveFuelInventoryInDb(inv);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/fuel/history", async (req, res) => {
  try {
    const history = await getFuelHistoryFromDb();
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/history", async (req, res) => {
  try {
    const history = req.body;
    await saveFuelHistoryInDb(history);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});`;

const replaceStr = `import { consumeFuelAtomicDb, restoreFuelAtomicDb } from "./server-db";

// ---------------- Fuel Inventory & History Endpoints ----------------
app.get("/api/fuel/inventory", requireAdminAuth, async (req, res) => {
  try {
    const inv = await getFuelInventoryFromDb();
    res.json(inv || {
      tanquePrincipalLitros: 0,
      tanqueCapacidadeMaxima: 1000,
      alertaMinimoTanque: 200,
      galoesPierQuantidade: 0,
      galoesCapacidadeLitros: 20,
      galaoParcialLitros: 0,
      ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/inventory", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const inv = req.body;
    await saveFuelInventoryInDb(inv);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/fuel/history", requireAdminAuth, async (req, res) => {
  try {
    const history = await getFuelHistoryFromDb();
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/history", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const history = req.body;
    await saveFuelHistoryInDb(history);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/consume", requireAdminAuth, async (req: any, res: express.Response) => {
  try {
    const { litros, barcoNome, detalhes } = req.body;
    const operador = req.user?.username || req.user?.nome || 'Operador';
    
    if (!litros || litros <= 0) {
      return res.status(400).json({ error: true, message: 'Invalid litros' });
    }
    
    await consumeFuelAtomicDb(litros, barcoNome, operador, detalhes);
    
    // Broadcast the new inventory state automatically
    const novoEstoque = await getFuelInventoryFromDb();
    io.emit('fuel_inventory_updated', novoEstoque);
    
    res.json({ success: true, message: 'Combustível consumido com sucesso (atomic)' });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/api/fuel/restore", requireAdminAuth, async (req: any, res: express.Response) => {
  try {
    const { litros, motivo } = req.body;
    const operador = req.user?.username || req.user?.nome || 'Operador';
    
    if (!litros || litros <= 0) {
      return res.status(400).json({ error: true, message: 'Invalid litros' });
    }
    
    await restoreFuelAtomicDb(litros, motivo || 'Estorno via UI', operador);
    
    const novoEstoque = await getFuelInventoryFromDb();
    io.emit('fuel_inventory_updated', novoEstoque);
    
    res.json({ success: true, message: 'Combustível estornado com sucesso (atomic)' });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});`;

// Replace
if (serverContent.includes('app.get("/api/fuel/inventory", async (req, res) => {')) {
  serverContent = serverContent.replace(oldFuelStr, replaceStr);
  
  // Also we need to make sure the imports don't duplicate. We can just inject the new import at top.
  serverContent = serverContent.replace('import { getFuelInventoryFromDb', 'import { getFuelInventoryFromDb'); 
  fs.writeFileSync(serverPath, serverContent);
  console.log("Updated server.ts fuel routes");
} else {
  console.log("Fuel routes not found or already modified");
}
