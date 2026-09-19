const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

if (!serverContent.includes('consumeFuelAtomicDb,')) {
  serverContent = serverContent.replace('import { getFuelInventoryFromDb, saveFuelInventoryInDb', 'import { getFuelInventoryFromDb, saveFuelInventoryInDb, consumeFuelAtomicDb, restoreFuelAtomicDb');
}

fs.writeFileSync('server.ts', serverContent);
