const fs = require('fs');

const files = [
  'src/lib/charts.ts',
  'src/lib/pdf-generator.tsx',
  'src/trigger/linkedin-audit-bot.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '\`');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\\\n/g, '\\n');
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
