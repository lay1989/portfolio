const fs = require('fs');
const path = require('path');

const HTML_FILES = [
  'index.html',
  'blog.html',
  'project-details.html',
  'blog-custom-websites.html',
  'blog-freelance-developer.html',
  'blog-javascript-frameworks.html',
  'blog-performance-optimization.html',
  'blog-responsive-design.html',
  'blog-seo-developers.html'
];

const rootDir = 'c:\\Users\\SHREE\\Desktop\\portfolio';

HTML_FILES.forEach(filename => {
  const filePath = path.join(rootDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  console.log(`\n========================================`);
  console.log(`AUDITING FILE: ${filename}`);
  console.log(`========================================`);

  // 1. Check Title
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  console.log(`Title: ${titleMatch ? titleMatch[1].trim() : 'MISSING'}`);

  // 2. Check Meta Description
  const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>|<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  const description = descMatch ? (descMatch[1] || descMatch[2]) : 'MISSING';
  console.log(`Description: ${description}`);

  // 3. Check Canonical Link
  const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  console.log(`Canonical URL: ${canonicalMatch ? canonicalMatch[1] : 'MISSING'}`);

  // 4. Check all <img> tags
  console.log(`Images:`);
  // Match both <img ...> and <img ... />
  const imgRegex = /<img\s+([^>]*?)>/gi;
  let imgMatch;
  let imgCount = 0;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imgCount++;
    const attrs = imgMatch[1];
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i); // Match empty alt too

    const src = srcMatch ? srcMatch[1] : 'unknown src';
    const alt = altMatch ? altMatch[1] : 'MISSING ALT ATTRIBUTE';

    console.log(`  - Img ${imgCount}: src="${src}" | alt="${alt}"`);
  }
  if (imgCount === 0) {
    console.log(`  No <img> tags found in markup.`);
  }
});
