const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

async function main() {
    require('./copy-lucide.js').buildIcons();
    // Imported blog covers also appear in listings now. Prepare responsive WebP
    // siblings once, before the manifest, without rewriting original PNGs.
    const posts = require('../data/posts.json').posts;
    for (const source of new Set(posts.map(post => post.cover))) {
        if (!/^assets\/blog\/[^/]+\.png$/.test(source)) continue;
        const input = path.join(root, source);
        const stem = input.slice(0, -4);
        for (const [suffix, width] of [['-small', 600], ['', 1200]]) {
            const output = `${stem}${suffix}.webp`;
            if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs) continue;
            await sharp(input).resize({width, withoutEnlargement:true}).webp({quality:82}).toFile(output);
        }
    }
    await require('./build-public-identity').buildPublicIdentity();
    const manifest = {};
    for (const directory of ['public/images', 'assets/blog']) {
        const files = fs.readdirSync(path.join(root, directory)).filter(file => /\.(png|jpe?g|webp)$/i.test(file));
        await Promise.all(files.map(async file => {
            const asset = `${directory}/${file}`;
            const { width, height } = await sharp(path.join(root, asset)).metadata();
            manifest[asset] = { width, height };
        }));
    }
    fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(root, '.cache/image-manifest.json'), JSON.stringify(manifest, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
