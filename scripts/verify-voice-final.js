const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Team/agency patterns that should NOT appear in Lay's own voice
const teamPatterns = [
    { pattern: /\bwe begin\b/i, label: 'we begin' },
    { pattern: /\bwe analyze\b/i, label: 'we analyze' },
    { pattern: /\bwe identify\b/i, label: 'we identify' },
    { pattern: /\bwe engineer\b/i, label: 'we engineer' },
    { pattern: /\bwe engineered\b/i, label: 'we engineered' },
    { pattern: /\bwe built\b/i, label: 'we built' },
    { pattern: /\bwe build\b/i, label: 'we build' },
    { pattern: /\bwe created\b/i, label: 'we created' },
    { pattern: /\bwe adopted\b/i, label: 'we adopted' },
    { pattern: /\bwe designed\b/i, label: 'we designed' },
    { pattern: /\bwe utilized?\b/i, label: 'we utilized/utilize' },
    { pattern: /\bwe needed\b/i, label: 'we needed' },
    { pattern: /\bwe can\b/i, label: 'we can' },
    { pattern: /\bour stack\b/i, label: 'our stack' },
    { pattern: /\bour team\b/i, label: 'our team' },
    { pattern: /\bour site\b/i, label: 'our site' },
    { pattern: /\bour services\b/i, label: 'our services' },
    { pattern: /\bour work\b/i, label: 'our work' },
    { pattern: /\bour agency\b/i, label: 'our agency' },
    { pattern: /\bour portfolio\b/i, label: 'our portfolio' },
    { pattern: /\bour approach\b/i, label: 'our approach' },
    { pattern: /\bour process\b/i, label: 'our process' },
    { pattern: /allows us to/i, label: 'allows us to' },
    { pattern: /approached us/i, label: 'approached us' },
    { pattern: /Lay Shah Web Development/i, label: 'Lay Shah Web Development (org name)' },
    { pattern: /"@type":\s*"Organization"/i, label: '@type Organization in structured data' },
    { pattern: /Share it with your team/i, label: 'Share it with your team' },
    { pattern: /We are a\b/i, label: 'We are a' },
    { pattern: /we offer\b/i, label: 'we offer' },
    { pattern: /we provide\b/i, label: 'we provide' },
    { pattern: /we deliver\b/i, label: 'we deliver' },
    { pattern: /we help\b/i, label: 'we help' },
];

// Lines that are legitimately "we/our" in CLIENT voice (testimonials, code examples, advisory text to readers)
const legitimateContexts = [
    // Client testimonials
    'We needed a digital experience',
    'our commercial tyre retreading',
    'our fabric catalog',
    'how our team manages projects',
    'our inbound B2B inquiries',
    'our vision into a sleek',
    'our premium retail design philosophy',
    'our clients love',
    'our old site',
    'our global B2B partners',
    'our conversion rate',
    'our online presence',
    'our edge in the creator economy',
    'outside our local market',
    'TaskFlow Pro transformed how our team',
    // Blog SEO article - instructional code example
    '"@type": "Organization"',  // code block in blog-seo-developers.html
    '"name": "Lay Shah"',       // code block
    // Blog/service descriptions addressing CLIENT's team (not Lay's team)
    'your team will actually open every morning',
    'your team can use without calling me',
    'your team already knows',
    // Fred Stack review quote
    'We needed something that looked credible to international clients',
    'we started getting inquiries from Dubai',
    'Our old site hadn',
];

// Files to scan
const sourceFiles = [
    'data/projects.json',
    'data/posts.json',
    'pages.json',
    'content/index.html',
    'content/503.html',
    'content/blog-custom-websites.html',
    'content/blog-freelance-developer.html',
    'content/blog-javascript-frameworks.html',
    'content/blog-performance-optimization.html',
    'content/blog-responsive-design.html',
    'content/blog-seo-developers.html',
];

// Built HTML output files
const builtFiles = [
    'index.html',
    '503.html',
    'blog-custom-websites.html',
    'blog-freelance-developer.html',
    'blog-javascript-frameworks.html',
    'blog-performance-optimization.html',
    'blog-responsive-design.html',
    'blog-seo-developers.html',
    'projects/intent-studio.html',
    'projects/capital-tyres.html',
    'projects/ash-clipping.html',
    'projects/ghermar-sons.html',
    'projects/swiftbuild-infratech.html',
];

const allFiles = [...sourceFiles, ...builtFiles];

let issuesFound = 0;
let scanned = 0;

for (const file of allFiles) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) {
        console.log(`SKIP (not found): ${file}`);
        continue;
    }
    scanned++;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip lines that are legitimate contexts
        const isLegitimate = legitimateContexts.some(ctx => line.includes(ctx));
        if (isLegitimate) continue;
        
        for (const { pattern, label } of teamPatterns) {
            if (pattern.test(line)) {
                console.log(`\n❌ ISSUE [${file}:${i+1}] (${label}):`);
                console.log(`   ${line.trim().substring(0, 150)}`);
                issuesFound++;
                break;
            }
        }
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Scanned: ${scanned} files`);
if (issuesFound === 0) {
    console.log(`✅ CLEAN — Zero team/agency voice issues found across all ${scanned} files!`);
} else {
    console.log(`❌ FOUND ${issuesFound} issues — Fix before pushing!`);
}
