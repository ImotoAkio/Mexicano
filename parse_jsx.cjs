const fs = require('fs');

const code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');
const renderStart = code.lastIndexOf('  return (');
const content = code.substring(renderStart);
console.log("JSX structure check (number of div tags)...");
const divOpen = (content.match(/<div(\s|>)/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;

console.log("div open: ", divOpen);
console.log("div close:", divClose);

const returnEnd = content.substring(content.length - 50);
console.log("File ends with:", JSON.stringify(returnEnd));
