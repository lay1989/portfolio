const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const files = [];
fs.readdirSync(rootDir).forEach(f => {
    if (f.endsWith('.html')) {
        files.push(f);
    }
});
const projectsDir = path.join(rootDir, 'projects');
if (fs.existsSync(projectsDir)) {
    fs.readdirSync(projectsDir).forEach(f => {
        if (f.endsWith('.html')) {
            files.push(`projects/${f}`);
        }
    });
}

const baseUrl = 'https://layshahdev.com';

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

files.forEach(file => {
    sitemap += `  <url>\n    <loc>${baseUrl}/${file}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n  </url>\n`;
});

sitemap += `</urlset>`;

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log('Sitemap generated.');
