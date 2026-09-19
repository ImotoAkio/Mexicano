const fs = require('fs');
const filepath = 'src/components/ClientDashboardPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');
content = content.replace('        </div>        </div>', '        </div>');
fs.writeFileSync(filepath, content);
