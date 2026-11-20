/** Build the existing local icon asset from icons actually used by authored sources. */
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const folders = ['components', 'content', 'templates', 'app/templates', 'src', 'data'];

function discoverIcons(directory, sources = folders) {
    const names = new Set();
    function visit(folder) {
        for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
            const file = path.join(folder, item.name);
            if (item.isDirectory()) visit(file);
            else if (/\.(html|js|json)$/.test(item.name) && !item.name.includes('.generated.')) {
                const text = fs.readFileSync(file, 'utf8');
                for (const match of text.matchAll(/data-lucide\s*=\s*["']([a-z0-9-]+)["']/g)) names.add(match[1]);
            }
        }
    }
    sources.forEach(folder => visit(path.join(directory, folder)));
    return [...names].sort();
}

function buildIcons() {
    const names = discoverIcons(root);
    const exports = require('lucide');
    const symbols = names.map(name => name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(''));
    for (const [index, symbol] of symbols.entries()) {
        if (!Object.hasOwn(exports, symbol)) throw new Error(`Unknown Lucide icon: ${names[index]}`);
    }
    buildSync({
        stdin: {
            contents: `import {createIcons as render,${symbols.join(',')}} from 'lucide';
window.lucide={createIcons:()=>render({icons:{${symbols.join(',')}},attrs:{'aria-hidden':'true',focusable:'false'}})};`,
            resolveDir: root,
        },
        bundle: true,
        minify: true,
        format: 'iife',
        platform: 'browser',
        outfile: path.join(root, 'public/js/lucide.min.js'),
    });
    console.log(`Built ${names.length} referenced Lucide icons.`);
}

module.exports = { discoverIcons, buildIcons };
if (require.main === module) buildIcons();
