import * as fs from 'fs';

const file = 'C:/Users/Akio/Documents/mexicano/src/components/ClientCheckinModal.tsx';
let txt = fs.readFileSync(file, 'utf8');

const diffRegex = /const \[hours, minutes\] = previsaoSaida\.split\(':'\)\.map\(Number\);\r?\n\s*const outputTime = new Date\(\);\r?\n\s*outputTime\.setHours\(hours, minutes, 0, 0\);/;

const diffReplace = `const [hours, minutes] = previsaoSaida.split(':').map(Number);
      const resDateStr = reservation?.data; // YYYY-MM-DD
      const outputTime = resDateStr 
        ? new Date(resDateStr + 'T00:00:00') 
        : new Date();
      outputTime.setHours(hours, minutes, 0, 0);`;

txt = txt.replace(diffRegex, diffReplace);

fs.writeFileSync(file, txt);
console.log('Fixed dates validation');
