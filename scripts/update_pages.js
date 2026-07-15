const fs = require('fs');
const path = require('path');

const pagesPath = path.join(__dirname, '..', 'pages.json');
const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));

Object.entries(pages).forEach(([filename, config]) => {
    if (filename.startsWith('blog-') && filename !== 'blog.html') {
        const slug = filename.replace('.html', '');
        config.type = 'post';
        config.postSlug = slug;
        delete config.content;
    }
});

fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
console.log('Updated pages.json');
