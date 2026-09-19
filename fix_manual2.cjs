const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldHiddenBlock = `{bloqueioSelectedIds.length > 0 && (
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.filter(res => bloqueioSelectedIds.includes(res.id)).map(res => {`;

const newHiddenBlock = `<div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.map(res => {`;

content = content.replace(oldHiddenBlock, newHiddenBlock);

// We also need to remove the closing bracket of `bloqueioSelectedIds.length > 0 && (` which is after the map.
// Let's just do a regex replace for the map setup.
content = content.replace(/\{bloqueioSelectedIds\.length \> 0 && \(\s*<div className="fixed -left-\[9999px\] top-0 opacity-0 pointer-events-none aria-hidden">\s*\{bloqueioReservations\.filter\(res => bloqueioSelectedIds\.includes\(res\.id\)\)\.map\(res => \{/, 
`<div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.map(res => {`);

// Now fix the end of that block where the React condition was closed
// It looks like:
//           })}
//         </div>
//       )}

content = content.replace(/\s*\}\)\}\s*<\/div>\s*\)\}/, `\n          })}\n        </div>`);

fs.writeFileSync(filepath, content);
