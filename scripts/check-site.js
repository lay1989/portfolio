const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');
const pages = require('../pages.json');
const site = require('../data/site.json');
const errors = [];
const documents = new Map();
for (const file of Object.keys(pages)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (/\{\{[A-Z_]+\}\}/.test(source.replace(/<!--[\s\S]*?-->/g, ''))) errors.push(`${file}: unresolved template token`);
    documents.set(file, cheerio.load(source));
}
for (const [file, $] of documents) {
    const ids = new Set();
    $('[id]').each((_, element) => {
        const id = $(element).attr('id');
        if (ids.has(id)) errors.push(`${file}: duplicate ID ${id}`);
        ids.add(id);
    });
    if ($('main#main-content').length !== 1 || $('h1').length !== 1) errors.push(`${file}: expected one main and one h1`);
    $('a[href],script[src],link[href],img[src],source[srcset],meta[property="og:image"]').each((_, element) => {
        const el = $(element);
        const references = el.attr('srcset') ? el.attr('srcset').split(',').map(candidate => candidate.trim().split(/\s+/)[0]) : [el.attr('href') || el.attr('src') || el.attr('content')];
        for (let reference of references) {
            if (!reference || /^(mailto:|tel:|data:|javascript:)/.test(reference)) continue;
            if (/^https?:/.test(reference)) {
                const url = new URL(reference);
                if (url.origin !== site.url) continue;
                reference = url.pathname + url.hash;
            }
            const [pathname, fragment] = reference.split('#');
            let target = pathname ? path.resolve(path.dirname(path.join(root, file)), decodeURIComponent(pathname.split('?')[0])) : path.join(root, file);
            if (pathname.startsWith('/')) target = path.join(root, decodeURIComponent(pathname));
            if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
            if (!fs.existsSync(target)) { errors.push(`${file}: missing ${reference}`); continue; }
            const targetDoc = documents.get(path.relative(root, target));
            if (fragment && targetDoc && !targetDoc('[id]').toArray().some(node => node.attribs.id === fragment)) errors.push(`${file}: missing anchor ${reference}`);
        }
    });
    $('img').each((_, element) => {
        if (!$(element).attr('width') || !$(element).attr('height') || $(element).attr('alt') === undefined) errors.push(`${file}: image needs dimensions and alt text`);
    });
    $('form input:not([type="hidden"]),form textarea').each((_, element) => {
        if ($(element).attr('name') === 'bot-field') return;
        const id = $(element).attr('id');
        if (!id || !$('label').toArray().some(label => label.attribs.for === id)) errors.push(`${file}: unassociated form label`);
    });
    const gsapScripts = $('script[src]').toArray().filter(node => /\/gsap\//.test(node.attribs.src) && /\/gsap.min.js/.test(node.attribs.src));
    if (gsapScripts.length > 1) errors.push(`${file}: duplicate GSAP`);
}
const selectors = new Set();
postcss.parse(fs.readFileSync(path.join(root, 'tailwind.css'), 'utf8')).walkRules(rule => selectors.add(rule.selector));
for (const utility of ['bg-background/80', 'border-background/20', 'bg-accent/10']) {
    const selector = '.' + utility.replace(/\//g, '\\/');
    if (![...selectors].some(value => value.includes(selector))) errors.push(`CSS missing ${utility}`);
}
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
for (const resource of ['/bundle.js', '/tailwind.css', '/src/']) if (robots.includes(`Disallow: ${resource}`)) errors.push(`Crawler blocked from ${resource}`);
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exitCode = 1; }
else console.log(`Checked ${documents.size} pages: links, anchors, images, labels, scripts, theme styles and crawler access passed.`);
