const fs = require('fs');

let code = fs.readFileSync('src/components/MarinaOperador/ViewChecklistModal.tsx', 'utf8');

if (!code.includes('import { X, Shield, Activity, FileText, Pocket, Anchor, CheckCircle, Clock } from')) {
    code = code.replace(/import \{ LifeBuoy, Flame, Anchor, CheckCircle, Clock \} from 'lucide-react';/g, "import { X, Shield, Activity, FileText, Pocket, Anchor, CheckCircle, Clock, LifeBuoy, Flame } from 'lucide-react';");
}
fs.writeFileSync('src/components/MarinaOperador/ViewChecklistModal.tsx', code);
