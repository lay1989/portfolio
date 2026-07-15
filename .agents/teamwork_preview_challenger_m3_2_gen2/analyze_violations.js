const fs = require('fs');

const data = JSON.parse(fs.readFileSync('all_icons_data.json', 'utf-8'));
const violations = data.violations;

const countsByFile = {};
const violationsByFile = {};

violations.forEach(v => {
    const f = v.icon.file;
    countsByFile[f] = (countsByFile[f] || 0) + 1;
    if (!violationsByFile[f]) {
        violationsByFile[f] = [];
    }
    violationsByFile[f].push(v);
});

console.log('--- Violations count by file ---');
console.log(JSON.stringify(countsByFile, null, 2));

console.log('\n--- Specific violations in projects.html, blog.html, blog-*.html ---');
Object.keys(violationsByFile).forEach(f => {
    if (f === 'projects.html' || f === 'blog.html' || (f.startsWith('blog-') && f.endsWith('.html'))) {
        console.log(`\nFile: ${f} (${violationsByFile[f].length} violations)`);
        violationsByFile[f].forEach((v, idx) => {
            console.log(`  [${idx+1}] ${v.type} for icon "${v.icon.icon}"`);
            console.log(`      Snippet: ${v.icon.snippet}`);
            console.log(`      Light Mode: Text ${v.icon.light.textColor} (${v.icon.light.textClass}) on Bg ${v.icon.light.bgColor} (${v.icon.light.bgClass}) - Contrast ${v.icon.light.contrast}:1`);
            console.log(`      Dark Mode: Text ${v.icon.dark.textColor} (${v.icon.dark.textClass}) on Bg ${v.icon.dark.bgColor} (${v.icon.dark.bgClass}) - Contrast ${v.icon.dark.contrast}:1`);
        });
    }
});
