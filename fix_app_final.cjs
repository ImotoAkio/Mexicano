const fs = require('fs');

let code = fs.readFileSync('src/components/ClientDashboardPage.tsx', 'utf8');
code = code.replace(/chamados=\{clientData\.chamados \|\| \[\]\}/g, '');
fs.writeFileSync('src/components/ClientDashboardPage.tsx', code);

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/chamados=\{clientData\.chamados \|\| \[\]\}/g, '');
fs.writeFileSync('src/App.tsx', appCode);

