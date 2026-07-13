const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\SHREE\\Desktop\\portfolio';
const files = [];

fs.readdirSync(rootDir).forEach(file => {
    if (file === 'projects.html' || file === 'blog.html' || (file.startsWith('blog-') && file.endsWith('.html'))) {
        files.push(path.join(rootDir, file));
    }
});

const iconClasses = new Set();
const parentClasses = new Set();

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const $ = cheerio.load(content);
    
    $('i[data-lucide], [data-lucide]').each((idx, elem) => {
        const clsAttr = $(elem).attr('class') || '';
        clsAttr.split(/\s+/).filter(Boolean).forEach(c => iconClasses.add(c));
        
        let p = $(elem).parent();
        while (p && p.length > 0) {
            const pClsAttr = p.attr('class') || '';
            pClsAttr.split(/\s+/).filter(Boolean).forEach(c => parentClasses.add(c));
            p = p.parent();
        }
    });
});

console.log("ICON CLASSES:");
console.log(Array.from(iconClasses).sort());
console.log("\nPARENT CLASSES (first 50):");
console.log(Array.from(parentClasses).sort().slice(0, 50));
