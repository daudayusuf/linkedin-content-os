const fs = require('fs');
let c = fs.readFileSync('src/lib/send-audit-email.ts', 'utf8');
c = c.replace(/\\\\\`/g, '\`');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\\\n/g, '\\n');
fs.writeFileSync('src/lib/send-audit-email.ts', c);
