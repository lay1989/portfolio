const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const changes = [];

// ────────────────────────────────────────────────────────────────────────────
// 1. Fix pages.json — Capital Tyres meta "we improved" → "I improved"
//    and 503 meta "Our site" → "The site"
// ────────────────────────────────────────────────────────────────────────────
const pagesPath = path.join(root, 'pages.json');
const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf-8'));

// Capital Tyres meta description
const ct = pages['projects/capital-tyres.html'];
if (ct) {
    const fixes = [
        ['See how we improved local SEO', 'See how I improved local SEO'],
    ];
    for (const [from, to] of fixes) {
        if (ct.description && ct.description.includes(from)) {
            ct.description = ct.description.replace(from, to);
            changes.push(`pages.json [projects/capital-tyres.html] description: "${from}" → "${to}"`);
        }
        if (ct.ogDescription && ct.ogDescription.includes(from)) {
            ct.ogDescription = ct.ogDescription.replace(from, to);
            changes.push(`pages.json [projects/capital-tyres.html] ogDescription: "${from}" → "${to}"`);
        }
    }
}

// 503 meta
const p503 = pages['503.html'];
if (p503) {
    const from = 'Our site is currently undergoing maintenance. Please check back later.';
    const to = 'The site is currently undergoing maintenance. Please check back soon.';
    if (p503.description && p503.description.includes('Our site')) {
        p503.description = p503.description.replace(from, to);
        changes.push(`pages.json [503.html] description: "Our site..." → "The site..."`);
    }
    if (p503.ogDescription && p503.ogDescription.includes('Our site')) {
        p503.ogDescription = p503.ogDescription.replace(from, to);
        changes.push(`pages.json [503.html] ogDescription: "Our site..." → "The site..."`);
    }
}

// Homepage: improve title and update structuredData @type from ProfessionalService to Person
const idx = pages['index.html'];
if (idx) {
    if (idx.description && !idx.description.startsWith('Lay Shah')) {
        const oldDesc = idx.description;
        idx.description = 'Lay Shah — Freelance web developer & designer based in Ahmedabad, India. I build custom, high-performance websites and web apps for founders. Fast, SEO-ready, no templates.';
        changes.push(`pages.json [index.html] description: improved meta description with first-person personal voice`);
    }
    if (idx.ogTitle && idx.ogTitle.includes('Frontend Developer')) {
        idx.ogTitle = 'Lay Shah | Freelance Web Developer & Designer';
        changes.push(`pages.json [index.html] ogTitle: updated to "Freelance Web Developer & Designer"`);
    }
    if (idx.ogDescription) {
        idx.ogDescription = 'I design and build custom websites and web apps — hand-coded, SEO-optimized, and built to perform. Based in Ahmedabad, India. Available for freelance projects.';
        changes.push(`pages.json [index.html] ogDescription: updated to first-person voice`);
    }
    if (idx.structuredData && idx.structuredData['@type'] === 'ProfessionalService') {
        idx.structuredData['@type'] = 'Person';
        idx.structuredData.name = 'Lay Shah';
        idx.structuredData.jobTitle = 'Freelance Web Developer & Designer';
        idx.structuredData.description = 'Freelance full-stack web developer and designer based in Ahmedabad, India. I build custom, high-performance websites and web applications for founders and growing businesses.';
        delete idx.structuredData.logo;
        changes.push(`pages.json [index.html] structuredData: @type ProfessionalService → Person, added jobTitle, removed logo`);
    }
}

fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2), 'utf-8');
console.log('✓ pages.json additional fixes applied');

// ────────────────────────────────────────────────────────────────────────────
// 2. Fix data/projects.json — "we/us" → "I/me" in overview, challenge, solution
// ────────────────────────────────────────────────────────────────────────────
const projPath = path.join(root, 'data', 'projects.json');
const projData = JSON.parse(fs.readFileSync(projPath, 'utf-8'));

// Intent Studio
const intentStudio = projData.projects.find(p => p.slug === 'intent-studio');
if (intentStudio) {
    // Fix overview
    if (intentStudio.overview && intentStudio.overview.includes('They approached us')) {
        intentStudio.overview = intentStudio.overview
            .replace('They approached us with a clear vision', 'They approached me with a clear vision')
            .replace('We engineered a digital presence', 'I engineered a digital presence');
        changes.push(`data/projects.json [intent-studio] overview: "They approached us/We engineered" → "They approached me/I engineered"`);
    }
    // Fix challenge
    if (intentStudio.challenge && intentStudio.challenge.includes('We needed to communicate')) {
        intentStudio.challenge = intentStudio.challenge.replace('We needed to communicate', 'I needed to communicate');
        changes.push(`data/projects.json [intent-studio] challenge: "We needed to communicate" → "I needed to communicate"`);
    }
}

// Capital Tyres
const capitalTyres = projData.projects.find(p => p.slug === 'capital-tyres');
if (capitalTyres) {
    if (capitalTyres.overview && capitalTyres.overview.includes('We built a fast')) {
        capitalTyres.overview = capitalTyres.overview.replace('We built a fast', 'I built a fast');
        changes.push(`data/projects.json [capital-tyres] overview: "We built" → "I built"`);
    }
    if (capitalTyres.solution && capitalTyres.solution.includes('we created a digital asset')) {
        capitalTyres.solution = capitalTyres.solution.replace('we created a digital asset', 'I created a digital asset');
        changes.push(`data/projects.json [capital-tyres] solution: "we created" → "I created"`);
    }
}

// Ghermar & Sons
const ghermar = projData.projects.find(p => p.slug === 'ghermar-sons');
if (ghermar) {
    if (ghermar.solution && ghermar.solution.includes('We adopted a minimalist')) {
        ghermar.solution = ghermar.solution
            .replace('We adopted a minimalist', 'I adopted a minimalist')
            .replace('We used the brand\'s logo', 'I used the brand\'s logo');
        changes.push(`data/projects.json [ghermar-sons] solution: "We adopted/We used" → "I adopted/I used"`);
    }
}

// SwiftBuild Infratech
const swiftbuild = projData.projects.find(p => p.slug === 'swiftbuild-infratech');
if (swiftbuild) {
    if (swiftbuild.solution && swiftbuild.solution.includes('We designed a timeless')) {
        swiftbuild.solution = swiftbuild.solution.replace('We designed a timeless professional website', 'I designed a timeless professional website');
        changes.push(`data/projects.json [swiftbuild-infratech] solution: "We designed" → "I designed"`);
    }
}

fs.writeFileSync(projPath, JSON.stringify(projData, null, 2), 'utf-8');
console.log('✓ data/projects.json fixed');

// ────────────────────────────────────────────────────────────────────────────
// 3. Fix data/posts.json — "we/our/us" → "I/my/me" in blog post bodies
// ────────────────────────────────────────────────────────────────────────────
const postsPath = path.join(root, 'data', 'posts.json');
const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));

// blog-custom-websites
const customWebPost = postsData.posts.find(p => p.slug === 'blog-custom-websites');
if (customWebPost && customWebPost.body) {
    const replacements = [
        ['We begin by mapping your specific business objectives to technical requirements.',
         'I begin by mapping your specific business objectives to technical requirements.'],
        ['we analyze your target audience to understand their pain points',
         'I analyze your target audience to understand their pain points'],
        ['we identify structural weaknesses in your competitors\' websites.',
         'I identify structural weaknesses in your competitors\' websites.'],
        ['We then engineer your custom solution', 'I then engineer your custom solution'],
        ['Our stack is chosen strictly for speed, security, and scalability.',
         'My stack is chosen strictly for speed, security, and scalability.'],
        ['A custom-built platform allows us to strip away bloated third-party code',
         'A custom-built platform allows me to strip away bloated third-party code'],
    ];
    let changed = false;
    for (const [from, to] of replacements) {
        if (customWebPost.body.includes(from)) {
            customWebPost.body = customWebPost.body.replace(from, to);
            changes.push(`data/posts.json [blog-custom-websites] body: "${from.substring(0, 50)}..." → first-person`);
            changed = true;
        }
    }
}

// blog-performance-optimization
const perfPost = postsData.posts.find(p => p.slug === 'blog-performance-optimization');
if (perfPost && perfPost.body) {
    const replacements = [
        ['we can slash payload sizes by half', 'I can slash payload sizes by half'],
        ['We utilize techniques like Web Workers', 'I utilize techniques like Web Workers'],
    ];
    for (const [from, to] of replacements) {
        if (perfPost.body.includes(from)) {
            perfPost.body = perfPost.body.replace(from, to);
            changes.push(`data/posts.json [blog-performance-optimization] body: "${from}" → first-person`);
        }
    }
}

// blog-responsive-design
const responsivePost = postsData.posts.find(p => p.slug === 'blog-responsive-design');
if (responsivePost && responsivePost.body) {
    const replacements = [
        ['We utilize modern CSS functions like', 'I utilize modern CSS functions like'],
        ['allows us to serve mathematically optimized', 'allows me to serve mathematically optimized'],
    ];
    for (const [from, to] of replacements) {
        if (responsivePost.body.includes(from)) {
            responsivePost.body = responsivePost.body.replace(from, to);
            changes.push(`data/posts.json [blog-responsive-design] body: "${from}" → first-person`);
        }
    }
}

fs.writeFileSync(postsPath, JSON.stringify(postsData, null, 2), 'utf-8');
console.log('✓ data/posts.json fixed');

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────
console.log('\n========= ALL CHANGES =========');
changes.forEach((c, i) => console.log(`${i + 1}. ${c}`));
console.log(`\nTotal: ${changes.length} changes made.`);
