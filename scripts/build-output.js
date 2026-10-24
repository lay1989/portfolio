const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const pages = require('../pages.json');
fs.rmSync(output, { recursive: true, force: true });
for (const file of [...Object.keys(pages), 'bundle.js', 'tailwind.css', 'robots.txt', 'sitemap.xml', 'src/theme-init.js', 'public', 'assets/blog']) {
    const destination = path.join(output, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(path.join(root, file), destination, { recursive: true });
}
console.log('Deployment files prepared in dist/.');
