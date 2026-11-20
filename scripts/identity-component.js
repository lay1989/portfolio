const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../components/identity.html'), 'utf8').trim();
module.exports = html => html.replaceAll('{{IDENTITY}}', source);
