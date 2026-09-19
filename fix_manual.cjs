const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Remove the filter by bloqueioSelectedIds so they are all in DOM for manual download
const oldHiddenBlock = `{bloqueioSelectedIds.length > 0 && (
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.filter(res => bloqueioSelectedIds.includes(res.id)).map(res => {`;

const newHiddenBlock = `      {/* Hidden processing block for Bloqueio Debit Invoices */}
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.map(res => {`;

content = content.replace(oldHiddenBlock, newHiddenBlock);
// Just in case it had already been replaced or white space differs:
const oldHiddenBlockReg = /\{\s*bloqueioSelectedIds\.length\s*>\s*0\s*&&\s*\(\s*<div[^>]*>\s*\{\s*bloqueioReservations\.filter[^\}]+\}\)\.map\(res\s*=>\s*\{/;
content = content.replace(oldHiddenBlockReg, `<div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">\n          {bloqueioReservations.map(res => {`);

// 2. Add an explicit download button inside the row
const oldRow = `<div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">`;
const newRow = `<div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 w-full">`;

content = content.replace(oldRow, newRow);

fs.writeFileSync(filepath, content);
