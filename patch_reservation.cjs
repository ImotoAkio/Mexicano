const fs = require('fs');
const file = 'src/components/ReservationModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /(const activeBookings = \(\(\) => {[\s\S]*?return reservationDB\.getAll\(\)\.filter\(\s*r =>) (r\.clienteId === selectedClientId &&)/;
code = code.replace(regex, "$1 $2\n      r.embarcacaoId === selectedBoatId &&");

fs.writeFileSync(file, code);
