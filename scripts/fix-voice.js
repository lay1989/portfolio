const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..'); // portfolio root

// ─── 1. Fix pages.json: publisher Organization → Person, "Lay Shah Web Development" → "Lay Shah" ───
const pagesPath = path.join(root, 'pages.json');
const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf-8'));

let changes = [];

for (const [page, config] of Object.entries(pages)) {
    if (config.structuredData && config.structuredData.publisher) {
        const pub = config.structuredData.publisher;
        if (pub['@type'] === 'Organization' || pub.name === 'Lay Shah Web Development') {
            changes.push(`pages.json [${page}]: publisher @type "${pub['@type']}" → "Person", name "${pub.name}" → "Lay Shah"`);
            pub['@type'] = 'Person';
            pub.name = 'Lay Shah';
            delete pub.logo; // Person schema doesn't use logo
        }
    }
}

fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2), 'utf-8');
console.log('✓ pages.json fixed');

// ─── 2. Fix 503.html: "Our site" → "This site" ───
const page503Path = path.join(root, 'content', '503.html');
let content503 = fs.readFileSync(page503Path, 'utf-8');
const old503 = 'Our site is currently undergoing maintenance. Please check back later.';
const new503 = 'This site is currently undergoing maintenance. Please check back soon.';
if (content503.includes(old503)) {
    content503 = content503.replace(old503, new503);
    fs.writeFileSync(page503Path, content503, 'utf-8');
    changes.push(`content/503.html: "Our site is currently undergoing maintenance..." → "This site is currently undergoing maintenance..."`);
    console.log('✓ content/503.html fixed');
}

// ─── 3. Fix all blog pages: "Share it with your team:" → "Found it useful? Share it:" ───
const blogFiles = [
    'blog-custom-websites.html',
    'blog-freelance-developer.html',
    'blog-javascript-frameworks.html',
    'blog-performance-optimization.html',
    'blog-responsive-design.html',
    'blog-seo-developers.html',
];

const oldShare = 'Was this breakdown helpful? Share it with your team:';
const newShare = 'Found this useful? Share it:';

for (const file of blogFiles) {
    const filePath = path.join(root, 'content', file);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(oldShare)) {
        content = content.replaceAll(oldShare, newShare);
        fs.writeFileSync(filePath, content, 'utf-8');
        changes.push(`content/${file}: "Was this breakdown helpful? Share it with your team:" → "Found this useful? Share it:"`);
        console.log(`✓ content/${file} fixed`);
    }
}

// ─── 4. Fix blog-javascript-frameworks.html: "your team already knows" ───
const jsFrameworksPath = path.join(root, 'content', 'blog-javascript-frameworks.html');
let jsContent = fs.readFileSync(jsFrameworksPath, 'utf-8');
const oldTeam = 'Choose a framework your team already knows or is willing to learn. Consider the learning curve and available training resources.';
const newTeam = 'Choose a framework you already know or can realistically learn. Consider the learning curve and available resources.';
if (jsContent.includes(oldTeam)) {
    jsContent = jsContent.replace(oldTeam, newTeam);
    fs.writeFileSync(jsFrameworksPath, jsContent, 'utf-8');
    changes.push(`content/blog-javascript-frameworks.html: "Choose a framework your team already knows..." → "Choose a framework you already know..."`);
    console.log('✓ content/blog-javascript-frameworks.html (framework team line) fixed');
}

// ─── 5. Fix index.html footer description in base.html ───
// Already looks fine — "Freelance full-stack developer" — no fix needed

console.log('\n========= ALL CHANGES =========');
changes.forEach((c, i) => console.log(`${i + 1}. ${c}`));
console.log(`\nTotal: ${changes.length} changes made.`);
