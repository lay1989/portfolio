const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\SHREE\\Desktop\\portfolio';

const filesToCheck = [];
fs.readdirSync(rootDir).forEach(file => {
    if (file === 'projects.html' || file === 'blog.html' || (file.startsWith('blog-') && file.endsWith('.html'))) {
        filesToCheck.push(path.join(rootDir, file));
    }
});
const projectsDir = path.join(rootDir, 'projects');
if (fs.existsSync(projectsDir)) {
    fs.readdirSync(projectsDir).forEach(file => {
        if (file.endsWith('.html')) {
            filesToCheck.push(path.join(projectsDir, file));
        }
    });
}

const textClasses = new Set();
const bgClasses = new Set();

filesToCheck.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content);
    
    const icons = $('i[data-lucide], [data-lucide]');
    
    icons.each((idx, elem) => {
        let current = $(elem);
        while (current && current.length > 0) {
            const clsAttr = current.attr('class') || '';
            const classes = clsAttr.split(/\s+/).filter(Boolean);
            classes.forEach(c => {
                if (c.includes('text-')) {
                    textClasses.add(c);
                }
                if (c.includes('bg-')) {
                    bgClasses.add(c);
                }
            });
            current = current.parent();
        }
    });
});

console.log('--- TEXT CLASSES ---');
console.log(Array.from(textClasses).sort());
console.log('\n--- BG CLASSES ---');
console.log(Array.from(bgClasses).sort());
