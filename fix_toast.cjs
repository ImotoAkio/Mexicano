const fs = require('fs');
let content = fs.readFileSync('src/components/ClientMaintenanceModal.tsx', 'utf8');
content = content.replace(/import \{ useToast \} from '\.\.\/utils\/useToast';\n?/, '');
content = content.replace(/showToast\([^,]+,([^,]+),([^)]+)\)/g, 'alert($1)');
fs.writeFileSync('src/components/ClientMaintenanceModal.tsx', content);
