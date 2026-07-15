const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const files = [];
fs.readdirSync('.').forEach(f => {
    if (f.endsWith('.html')) files.push(f);
});
if (fs.existsSync('projects')) {
    fs.readdirSync('projects').forEach(f => {
        if (f.endsWith('.html')) files.push('projects/' + f);
    });
}

files.forEach(f => {
    const html = fs.readFileSync(f, 'utf8');
    const $ = cheerio.load(html);
    $('[data-lucide]').each((i, el) => {
        const name = $(el).attr('data-lucide');
        let parent = $(el);
        let classes = '';
        for (let d = 0; d < 4; d++) {
            const c = parent.attr('class') || '';
            if (c.includes('text-')) {
                classes += ` [L${d}: ${c}]`;
            }
            parent = parent.parent();
        }
        if (classes) {
            console.log(`${f} -> ${name} classes: ${classes}`);
        } else {
            console.log(`${f} -> ${name} NO COLOR CLASSES FOUND`);
        }
    });
});
