const fs = require('fs');
const path = require('path');

const root = process.cwd();

const teamPatterns = [
    { pattern: /\bwe begin\b/i, label: 'we begin' },
    { pattern: /\bwe analyze\b/i, label: 'we analyze' },
    { pattern: /\bwe identify\b/i, label: 'we identify' },
    { pattern: /\bwe engineer\b/i, label: 'we engineer' },
    { pattern: /\bwe built\b/i, label: 'we built' },
    { pattern: /\bwe build\b/i, label: 'we build' },
    { pattern: /\bwe created\b/i, label: 'we created' },
    { pattern: /\bwe adopted\b/i, label: 'we adopted' },
    { pattern: /\bwe used\b/i, label: 'we used' },
    { pattern: /\bwe designed\b/i, label: 'we designed' },
    { pattern: /\bwe utilize\b/i, label: 'we utilize' },
    { pattern: /\bwe needed\b/i, label: 'we needed' },
    { pattern: /\bwe can\b/i, label: 'we can' },
    { pattern: /\bwe engineered\b/i, label: 'we engineered' },
    { pattern: /\bour stack\b/i, label: 'our stack' },
    { pattern: /\bour team\b/i, label: 'our team' },
    { pattern: /\bour site\b/i, label: 'our site' },
    { pattern: /allows us to/i, label: 'allows us to' },
    { pattern: /approached us/i, label: 'approached us' },
    { pattern: /Lay Shah Web Development/i, label: 'Lay Shah Web Development' },
    { pattern: /"@type": "Organization"/i, label: '@type Organization (publisher)' },
    { pattern: /Share it with your team/i, label: 'Share it with your team' },
];

// Client testimonial indicators (skip these lines)
const testimonialIndicators = [
    '"quote"', 'We needed a digital experience', 'our commercial tyre',
    'our fabric catalog', 'our team manages projects', 'inbound B2B inquiries',
    'our vision into a sleek', 'our premium retail', 'our clients love',
    'our old site', 'our global B2B', 'our conversion rate',
    'our online presence', 'our brand', 'TaskFlow Pro transformed how our team',
    'our edge in the creator', 'outside our local market',
];

const filesToCheck = [
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

let issuesFound = 0;
for (const file of filesToCheck) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTestimonial = testimonialIndicators.some(t => line.includes(t));
        if (isTestimonial) continue;
        for (const { pattern, label } of teamPatterns) {
            if (pattern.test(line)) {
                console.log(`ISSUE [${file}:${i+1}] (${label}): ${line.trim().substring(0, 110)}`);
                issuesFound++;
                break;
            }
        }
    }
}

if (issuesFound === 0) {
    console.log('\n✅ CLEAN — No team/group language found in any source file!');
} else {
    console.log(`\n❌ ${issuesFound} remaining issues found above.`);
}
