const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const baseUrl = 'https://layshahdev.com';


// Priority / changefreq config per page type
function getMeta(file) {
    if (file === 'index.html') return { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'weekly' };
    if (file === 'projects.html') return { loc: `${baseUrl}/projects.html`, priority: '0.9', changefreq: 'weekly' };
    if (file === 'blog.html') return { loc: `${baseUrl}/blog.html`, priority: '0.8', changefreq: 'weekly' };
    if (file.startsWith('projects/')) return { loc: `${baseUrl}/${file}`, priority: '0.8', changefreq: 'monthly' };
    if (file.startsWith('blog-')) return { loc: `${baseUrl}/${file}`, priority: '0.7', changefreq: 'monthly' };
    return { loc: `${baseUrl}/${file}`, priority: '0.5', changefreq: 'monthly' };
}

const files = Object.keys(require('../pages.json')).filter(file => !['404.html', '503.html'].includes(file));

// Sort: index first, then projects.html, blog.html, then project pages, then blog posts
const order = ['index.html', 'projects.html', 'blog.html'];
files.sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    // project pages before blog posts
    const aIsProject = a.startsWith('projects/');
    const bIsProject = b.startsWith('projects/');
    if (aIsProject && !bIsProject) return -1;
    if (!aIsProject && bIsProject) return 1;
    return a.localeCompare(b);
});

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

files.forEach(file => {
    const { loc, priority, changefreq } = getMeta(file);
    sitemap += `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
});

sitemap += `</urlset>`;

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log('Sitemap generated.');

