import * as fs from 'fs';

let file = 'C:/Users/Akio/Documents/mexicano/src/components/ClientDashboardPage.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/reservations=\{optimisticReservations\}/, `reservations={mergedReservations}`);

fs.writeFileSync(file, txt);
console.log('Fixed ClientDashboardPage.tsx');
