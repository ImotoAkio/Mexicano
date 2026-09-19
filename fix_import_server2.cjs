const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

if (!serverContent.includes('consumeFuelAtomicDb')) {
  // It already contains it, but let's check for the import
}
if (!serverContent.includes('consumeFuelAtomicDb,')) {
  serverContent = serverContent.replace('getFuelInventoryFromDb, saveFuelInventoryInDb, getFuelHistoryFromDb, saveFuelHistoryInDb, resetFuelDataInDb,', 'getFuelInventoryFromDb, saveFuelInventoryInDb, getFuelHistoryFromDb, saveFuelHistoryInDb, resetFuelDataInDb, consumeFuelAtomicDb, restoreFuelAtomicDb,');
  fs.writeFileSync('server.ts', serverContent);
}
