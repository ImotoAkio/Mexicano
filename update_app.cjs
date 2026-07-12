const fs = require('fs'); 
let code = fs.readFileSync('src/App.tsx', 'utf8'); 
code = code.replace(`import BoletosPage from './components/finance/BoletosPage';\r\nimport { clientDB`, `import BoletosPage from './components/finance/BoletosPage';\nimport { RetroativoPage } from './components/RetroativoPage';\nimport { clientDB`); 
code = code.replace(`  if (!isAuthenticated) {\r\n    return (\r\n      <LoginPage`, `  if (currentPath === '/simulador-epi') {\n    return <RetroativoPage />;\n  }\n\n  if (!isAuthenticated) {\n    return (\n      <LoginPage`); 
fs.writeFileSync('src/App.tsx', code);
