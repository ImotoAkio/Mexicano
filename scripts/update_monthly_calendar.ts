import * as fs from 'fs';

const file = 'C:/Users/Akio/Documents/mexicano/src/components/MonthlyCalendarGenerator.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Update Props
txt = txt.replace(/interface MonthlyCalendarGeneratorProps \{[\s\S]*?\}/, `interface MonthlyCalendarGeneratorProps {
  initialBoatId?: string;
  initialDate?: Date | string;
  onClose?: () => void;
  autoExport?: boolean;
  onExport?: (base64: string) => void;
  // Make it usable by client dashboard
  providedBoats?: Embarcacao[];
  providedReservations?: any[];
  providedClients?: Cliente[];
}`);

// Update signature
txt = txt.replace(/export default function MonthlyCalendarGenerator\(\{ initialBoatId, initialDate, onClose, autoExport, onExport \}: MonthlyCalendarGeneratorProps\) \{/, 'export default function MonthlyCalendarGenerator({ initialBoatId, initialDate, onClose, autoExport, onExport, providedBoats, providedReservations, providedClients }: MonthlyCalendarGeneratorProps) {');

// Update boats initialization to use providedBoats
txt = txt.replace(/const \[boats\] = useState<Embarcacao\[\]>\(\(\) => \[\.\.\.boatDB\.getAll\(\)\]\.sort\(\(a, b\) => a\.nome\.localeCompare\(b\.nome\)\)\);/, `const [boats] = useState<Embarcacao[]>(() => {
    if (providedBoats) return [...providedBoats].sort((a, b) => a.nome.localeCompare(b.nome));
    return [...boatDB.getAll()].sort((a, b) => a.nome.localeCompare(b.nome));
  });`);

// Fix loadEvents
const loadEventsRegex = /const localResRange = reservationDB\.getAll\(\)\.filter\(r =>\s*\(\r\.status === 'confirmado' \|\| r\.status === 'agendado'\) &&\s*r\.data >= startStr &&\s*r\.data <= endStr\s*\);\s*const boatsList = boatDB\.getAll\(\);\s*const clientsList = clientDB\.getAll\(\);/m;

const loadEventsReplace = `let localResRange;
      if (providedReservations) {
        localResRange = providedReservations.filter(r => 
          (r.status === 'confirmado' || r.status === 'agendado') && 
          r.data >= startStr && 
          r.data <= endStr
        );
      } else {
        localResRange = reservationDB.getAll().filter(r => 
          (r.status === 'confirmado' || r.status === 'agendado') && 
          r.data >= startStr && 
          r.data <= endStr
        );
      }

      const boatsList = providedBoats || boatDB.getAll();
      const clientsList = providedClients || clientDB.getAll();`;

txt = txt.replace(loadEventsRegex, loadEventsReplace);

fs.writeFileSync(file, txt);
console.log('Fixed MonthlyCalendarGenerator.tsx');
