const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

async function main() {
    require('./copy-lucide.js');
    const socialCard = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#020617"/>
      <path d="M72 78h64" stroke="#34d399" stroke-width="6"/>
      <text x="72" y="148" fill="#94a3b8" font-family="sans-serif" font-size="26" letter-spacing="4">LAY SHAH · INDEPENDENT DEVELOPER</text>
      <text x="72" y="280" fill="#f8fafc" font-family="Georgia,serif" font-size="82">A better website.</text>
      <text x="72" y="380" fill="#34d399" font-family="Georgia,serif" font-size="82">A simpler workday.</text>
      <text x="72" y="535" fill="#94a3b8" font-family="sans-serif" font-size="28">Custom websites, web apps &amp; internal tools · layshahdev.com</text>
    </svg>`);
    await sharp(socialCard).png().toFile(path.join(root, 'public/images/og-image.png'));
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
