const fs = require('fs');
const path = require('path');

const files = [
  'blog-custom-websites.html',
  'blog-freelance-developer.html',
  'blog-javascript-frameworks.html',
  'blog-performance-optimization.html',
  'blog-responsive-design.html',
  'blog-seo-developers.html'
];

let failed = false;

files.forEach(file => {
  const filePath = path.join(__dirname, '..', '..', file);
  console.log(`Checking ${file}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    failed = true;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Verify that </head> exists and that the file has only one <head> and </head>
  const headOpenCount = (content.match(/<head>/gi) || []).length;
  const headCloseCount = (content.match(/<\/head>/gi) || []).length;
  if (headOpenCount !== 1 || headCloseCount !== 1) {
    console.error(`Error: File has invalid head structure. Open tags: ${headOpenCount}, Close tags: ${headCloseCount}`);
    failed = true;
  }

  // Find all application/ld+json script tags
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  let found = false;
  while ((match = jsonLdRegex.exec(content)) !== null) {
    found = true;
    const jsonText = match[1].trim();
    try {
      const parsed = JSON.parse(jsonText);
      console.log(`  Valid JSON-LD schema found: Type = ${parsed['@type']}, Headline = "${parsed['headline']}"`);
      if (parsed['@type'] !== 'BlogPosting') {
        console.error(`  Error: Schema type is ${parsed['@type']}, expected BlogPosting`);
        failed = true;
      }
    } catch (e) {
      console.error(`  Error parsing JSON-LD: ${e.message}`);
      console.error(`  JSON content was:\n${jsonText}`);
      failed = true;
    }
  }
  
  if (!found) {
    console.error(`  Error: No JSON-LD schema found!`);
    failed = true;
  }
});

// Check sitemap.xml
console.log('Checking sitemap.xml...');
const sitemapPath = path.join(__dirname, '..', '..', 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('sitemap.xml does not exist!');
  failed = true;
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  // Simple XML tag matching
  const urlsetOpen = sitemapContent.includes('<urlset');
  const urlsetClose = sitemapContent.includes('</urlset>');
  if (!urlsetOpen || !urlsetClose) {
    console.error('sitemap.xml does not have valid urlset tags!');
    failed = true;
  }
  
  // check loc counts
  const locs = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
  console.log(`  Found ${locs.length} loc entries in sitemap.xml.`);
  
  // check that none have trailing slashes except maybe none? Wait, layshahdev.com/ shouldn't have trailing slash
  locs.forEach(loc => {
    const url = loc.replace('<loc>', '').replace('</loc>', '');
    if (url === 'https://layshahdev.com/') {
      console.error(`  Error: Found trailing slash in sitemap loc: ${url}`);
      failed = true;
    }
  });
}

// Check index.html
console.log('Checking index.html...');
const indexPath = path.join(__dirname, '..', '..', 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('index.html does not exist!');
  failed = true;
} else {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('href="https://layshahdev.com/"') && indexContent.includes('rel="canonical"')) {
    console.error('Error: index.html canonical still has trailing slash!');
    failed = true;
  }
  if (indexContent.includes('content="https://layshahdev.com/"') && indexContent.includes('property="og:url"')) {
    console.error('Error: index.html og:url still has trailing slash!');
    failed = true;
  }
}

if (failed) {
  console.log('\nVerification FAILED!');
  process.exit(1);
} else {
  console.log('\nVerification PASSED!');
}
