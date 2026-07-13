/**
 * extract-all.js
 * Extracts content fragments, project data, and page metadata
 * from the existing monolithic HTML files.
 *
 * Run once: node scripts/extract-all.js
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');

// Ensure directories exist
['content', 'data', 'templates'].forEach(dir => {
    const p = path.join(root, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ─────────────────────────────────────────────
// 1.  Extract content fragments from HTML pages
// ─────────────────────────────────────────────
const htmlFiles = [
    'index.html',
    'blog.html',
    'blog-custom-websites.html',
    'blog-freelance-developer.html',
    'blog-javascript-frameworks.html',
    'blog-performance-optimization.html',
    'blog-responsive-design.html',
    'blog-seo-developers.html',
];

htmlFiles.forEach(file => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`  SKIP ${file} (not found)`);
        return;
    }
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });

    // Remove nav and footer, keep everything in between
    const nav = $('nav#navbar');
    const footer = $('footer');

    // Get the main content: everything after nav, before footer
    // Strategy: get all direct children of body, filter out nav/footer/scripts
    let contentParts = [];
    $('body').children().each((i, el) => {
        const tag = el.tagName?.toLowerCase();
        const id = $(el).attr('id');
        if (tag === 'nav' && id === 'navbar') return; // skip nav
        if (tag === 'footer') return; // skip footer
        if (tag === 'script') return; // skip scripts
        contentParts.push($.html(el));
    });

    const content = contentParts.join('\n').trim();
    const outPath = path.join(root, 'content', file);
    fs.writeFileSync(outPath, content + '\n', 'utf-8');
    console.log(`  ✓ content/${file} (${content.length} bytes)`);
});

// ─────────────────────────────────────────────
// 2.  Extract project data from project-details.html
// ─────────────────────────────────────────────
const pdPath = path.join(root, 'project-details.html');
const pdHtml = fs.readFileSync(pdPath, 'utf-8');

// Find the inline script with project data
const scriptMatch = pdHtml.match(/const projects = \{([\s\S]*?)\n\s*\};/);
if (!scriptMatch) {
    console.error('ERROR: Could not find projects data in project-details.html');
    process.exit(1);
}

// We'll use a different approach — eval the JS object in a sandboxed way
// First, extract the full script content
const inlineScriptMatch = pdHtml.match(/<script>\s*\/\/ Project Data\s*([\s\S]*?)<\/script>/);
if (!inlineScriptMatch) {
    console.error('ERROR: Could not find inline script block');
    process.exit(1);
}

// Extract just the projects object definition and utility functions needed
const scriptContent = inlineScriptMatch[1];

// Create a sandboxed extraction
const extractScript = `
    ${scriptContent.split('// Load project')[0]}
    // Output projects as JSON
    const output = JSON.stringify(projects, null, 2);
    process.stdout.write(output);
`;

// Write temp file and execute
const tempFile = path.join(root, 'scripts', '_temp_extract.js');
fs.writeFileSync(tempFile, extractScript, 'utf-8');

const { execSync } = require('child_process');
let projectsRaw;
try {
    projectsRaw = execSync(`node "${tempFile}"`, { encoding: 'utf-8', cwd: root });
} catch (e) {
    console.error('ERROR executing extraction script:', e.message);
    // Fallback: try to manually parse
    // Clean up
    fs.unlinkSync(tempFile);
    process.exit(1);
}
fs.unlinkSync(tempFile);

const projectsObj = JSON.parse(projectsRaw);

const slugMap = {
    1: 'ghermar-sons',
    2: 'swiftbuild-infratech',
    3: 'crypto-trading-analytics',
    4: 'kamaldeep-enterprise',
    5: 'aroma-cafe',
    6: 'stark-ev',
    7: 'taskflow-pro',
};

const projectsArray = Object.entries(projectsObj).map(([id, data]) => ({
    id: parseInt(id),
    slug: slugMap[parseInt(id)] || `project-${id}`,
    ...data,
}));

// Sort by id
projectsArray.sort((a, b) => a.id - b.id);

const projectsJson = { projects: projectsArray };
fs.writeFileSync(
    path.join(root, 'data', 'projects.json'),
    JSON.stringify(projectsJson, null, 2),
    'utf-8'
);
console.log(`  ✓ data/projects.json (${projectsArray.length} projects)`);

// ─────────────────────────────────────────────
// 3.  Build pages.json metadata registry
// ─────────────────────────────────────────────
const allHtmlFiles = [...htmlFiles, 'project-details.html'];
const pagesJson = {};

allHtmlFiles.forEach(file => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) return;
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });

    const title = $('title').text() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    let canonical = $('link[rel="canonical"]').attr('href') || '';
    // Fix trailing slash after .html
    canonical = canonical.replace(/\.html\/$/,'.html');

    const ogType = $('meta[property="og:type"]').attr('content') || 'website';
    const ogTitle = $('meta[property="og:title"]').attr('content') || title;
    const ogDescription = $('meta[property="og:description"]').attr('content') || description;
    const ogUrl = $('meta[property="og:url"]').attr('content') || canonical;
    const ogImage = $('meta[property="og:image"]').attr('content') || 'https://layshahdev.com/og-image.jpg';

    // Structured data
    let structuredData = null;
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            structuredData = JSON.parse($(el).html());
        } catch (e) { /* ignore parse errors */ }
    });

    // Article meta
    const articleAuthor = $('meta[property="article:author"]').attr('content');
    const articlePublished = $('meta[property="article:published_time"]').attr('content');
    let articleMeta = null;
    if (articleAuthor || articlePublished) {
        articleMeta = {};
        if (articleAuthor) articleMeta.author = articleAuthor;
        if (articlePublished) articleMeta.publishedTime = articlePublished;
    }

    // Keywords
    const keywords = $('meta[name="keywords"]').attr('content') || null;

    // Twitter overrides
    const twitterTitle = $('meta[name="twitter:title"]').attr('content') || null;
    const twitterDescription = $('meta[name="twitter:description"]').attr('content') || null;

    const entry = {
        title,
        description,
        canonical,
        ogType,
        ogTitle,
        ogDescription,
        ogUrl,
        ogImage,
    };

    if (structuredData) entry.structuredData = structuredData;
    if (articleMeta) entry.articleMeta = articleMeta;
    if (keywords) entry.keywords = keywords;
    if (twitterTitle) entry.twitterTitle = twitterTitle;
    if (twitterDescription) entry.twitterDescription = twitterDescription;

    // Skip project-details.html (replaced by individual pages)
    if (file === 'project-details.html') return;

    entry.content = `content/${file}`;
    pagesJson[file] = entry;
});

// Add projects listing page
pagesJson['projects.html'] = {
    title: 'Projects - Lay Shah | Web Development Portfolio',
    description: 'Browse my complete portfolio of web development projects. From landing pages to full-stack applications, each case study details the problem, approach, and measurable results.',
    canonical: 'https://layshahdev.com/projects.html',
    ogType: 'website',
    ogTitle: 'Projects - Lay Shah | Web Development Portfolio',
    ogDescription: 'Browse my complete portfolio of web development projects with detailed case studies.',
    ogUrl: 'https://layshahdev.com/projects.html',
    ogImage: 'https://layshahdev.com/og-image.jpg',
    content: 'content/projects.html',
};

// Add individual project pages
projectsArray.forEach(project => {
    const slug = project.slug;
    const pageFile = `projects/${slug}.html`;
    pagesJson[pageFile] = {
        type: 'project',
        projectSlug: slug,
        title: `${project.title} - Case Study | Lay Shah`,
        description: project.shortDesc || project.overview?.substring(0, 160) || '',
        canonical: `https://layshahdev.com/projects/${slug}.html`,
        ogType: 'article',
        ogTitle: `${project.title} - Case Study | Lay Shah`,
        ogDescription: project.shortDesc || '',
        ogUrl: `https://layshahdev.com/projects/${slug}.html`,
        ogImage: 'https://layshahdev.com/og-image.jpg',
        structuredData: {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${project.title} - Case Study`,
            author: {
                '@type': 'Person',
                name: 'Lay Shah',
                url: 'https://layshahdev.com',
            },
            publisher: {
                '@type': 'Organization',
                name: 'Lay Shah Web Development',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://layshahdev.com/logo.png',
                },
            },
            datePublished: '2025-02-07',
            dateModified: '2025-02-07',
        },
    };
});

fs.writeFileSync(
    path.join(root, 'pages.json'),
    JSON.stringify(pagesJson, null, 2),
    'utf-8'
);
console.log(`  ✓ pages.json (${Object.keys(pagesJson).length} pages)`);

console.log('\nExtraction complete!');
