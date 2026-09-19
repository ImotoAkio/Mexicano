const fs = require('fs');
fs.readdirSync('server-routes').forEach(f => {
  const content = fs.readFileSync('server-routes/' + f, 'utf8');
  if (content.includes('/pull')) {
    console.log(f);
  }
});
