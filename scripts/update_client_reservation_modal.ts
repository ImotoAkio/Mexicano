import * as fs from 'fs';

let file = 'C:/Users/Akio/Documents/mexicano/src/components/ClientReservationModal.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Update Props
txt = txt.replace(/boats: any\[\];/, `boats: any[];\n  reservations?: any[];`);

// Update signature
txt = txt.replace(/boats,\r?\n\s*preselectedBoatId,/, `boats,\n  reservations = [],\n  preselectedBoatId,`);

// In MonthlyCalendarGenerator usage (there is only one)
txt = txt.replace(/<MonthlyCalendarGenerator\s+initialBoatId=\{selectedBoatId\}\s+initialDate=\{selectedDate\}\s+autoExport=\{true\}/s, `<MonthlyCalendarGenerator
                initialBoatId={selectedBoatId}
                initialDate={selectedDate}
                autoExport={true}
                providedBoats={boats}
                providedReservations={[...reservations, createdReservation].filter(Boolean)}
                providedClients={[client]}`);

fs.writeFileSync(file, txt);
console.log('Fixed ClientReservationModal.tsx');
