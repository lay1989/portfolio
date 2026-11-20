const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const directory = path.resolve(__dirname, '../.cache/identity/development');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const pathPattern = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/;

function validateDevelopment(identity) {
    const dev = identity.development;
    if (JSON.stringify(identity.selection?.numbers) !== '[5,9]' || !identity.selection.confirmation) throw Error('Development needs the confirmed 05 / 09 family');
    if (!dev || dev.symbol.length !== 3 || dev.wordmark.placements.length !== 7) throw Error('Incomplete developed geometry');
    for (const d of [...dev.symbol, ...Object.values(dev.letters)]) if (!pathPattern.test(d)) throw Error('Invalid developed path');
    for (const item of dev.wordmark.placements) if (!dev.letters[item.letter] || !Number.isFinite(item.x) || !Number.isFinite(item.y)) throw Error('Invalid letter placement');
    if (dev.wordmark.placements.map(item => item.letter).join('') !== 'layshah') throw Error('Name must read lay shah');
    for (const placement of [dev.lockup.symbol, dev.lockup.wordmark]) if (![placement.x, placement.y, placement.scale].every(Number.isFinite) || placement.scale <= 0) throw Error('Invalid lockup placement');
    if (JSON.stringify(dev.treatments.map(item => item.id)) !== '["green","blue"]') throw Error('Unexpected development treatments');
}

function symbol(dev, ink) {
    return `<g fill="${ink}">${dev.symbol.map(d => `<path d="${escape(d)}"/>`).join('')}</g>`;
}
function wordmark(dev, ink) {
    return `<g fill="${ink}" fill-rule="evenodd">${dev.wordmark.placements.map(item => `<path transform="translate(${item.x} ${item.y})" d="${escape(dev.letters[item.letter])}"/>`).join('')}</g>`;
}
function lockup(dev, ink) {
    const mark = dev.lockup.symbol, name = dev.lockup.wordmark;
    return `<g transform="translate(${mark.x} ${mark.y}) scale(${mark.scale})">${symbol(dev, ink)}</g><g transform="translate(${name.x} ${name.y}) scale(${name.scale})">${wordmark(dev, ink)}</g>`;
}
function colors(dev, palette, treatment) {
    if (treatment === 'black') return {ink:palette.black, paper:palette.white};
    if (treatment === 'reversed') return {ink:palette.white, paper:palette.black};
    const setting = dev.treatments.find(item => item.id === treatment);
    if (!setting || !palette[setting.ink] || !palette[setting.paper]) throw Error('Unknown identity treatment');
    return {ink:palette[setting.ink], paper:palette[setting.paper]};
}
function svg(width, height, title, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="identity-title"><title id="identity-title">${escape(title)}</title>${body}</svg>`;
}
function artworkSVG(identity, system, kind, treatment) {
    const dev = identity.development;
    const {ink, paper} = colors(dev, system.palette, treatment);
    const size = kind === 'symbol' ? dev.symbolCanvas : [dev.lockup.width,dev.lockup.height];
    return svg(...size, `Lay Shah ${kind}, ${treatment} development study`, `<rect width="${size[0]}" height="${size[1]}" fill="${paper}"/>${kind === 'symbol' ? symbol(dev, ink) : lockup(dev, ink)}`);
}
function applicationSVG(identity, system, treatment) {
    const dev = identity.development;
    const {ink,paper} = colors(dev, system.palette, treatment);
    const white = system.palette.white;
    const type = escape(system.fonts.sans.join(', '));
    const labelSize = system.details.identitySheetBodySize;
    const titleSize = system.details.identitySheetGroupSize;
    const text = (x,y,size,value) => `<text x="${x}" y="${y}" font-family="${type}" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
    const label = dev.treatments.find(item=>item.id===treatment).name;
    let body = `<rect width="1200" height="980" fill="${paper}"/>`;
    body += text(48,58,titleSize,label + ' / Application study');
    body += `<g transform="translate(240 80) scale(.95)">${lockup(dev,ink)}</g>`;
    body += text(48,480,labelSize,'Website header');
    body += `<rect x="48" y="504" width="1104" height="105" fill="${white}"/><g transform="translate(66 509) scale(.25)">${lockup(dev,ink)}</g>`;
    body += text(790,565,labelSize,'About    Work    Contact');
    body += text(48,666,labelSize,'Social avatar');
    body += `<rect x="48" y="690" width="228" height="228" fill="${ink}"/><g transform="translate(51 693) scale(.86)">${symbol(dev,paper)}</g>`;
    body += text(360,666,labelSize,'Proposal cover');
    body += `<rect x="360" y="690" width="792" height="228" fill="${white}"/><g transform="translate(384 708) scale(.25)">${lockup(dev,ink)}</g>`;
    body += text(672,776,titleSize,'Website & product development');
    body += text(672,814,labelSize,'Lay Shah / Project proposal');
    body += text(48,955,labelSize,'Development previews. Palette and lettering await your review.');
    return svg(1200,980,`${label}: full identity, website header, avatar and proposal cover`,body);
}

async function buildDevelopment(identity, system) {
    validateDevelopment(identity);
    fs.mkdirSync(directory,{recursive:true});
    for (const treatment of ['green','blue','black','reversed']) {
        for (const kind of ['symbol','lockup']) fs.writeFileSync(path.join(directory,`${kind}-${treatment}.svg`),artworkSVG(identity,system,kind,treatment));
        for (const size of [16,24,32]) await sharp(Buffer.from(artworkSVG(identity,system,'symbol',treatment))).resize(size,size).png().toFile(path.join(directory,`icon-${treatment}-${size}.png`));
    }
    for (const treatment of ['green','blue']) {
        const board=applicationSVG(identity,system,treatment);
        fs.writeFileSync(path.join(directory,`applications-${treatment}.svg`),board);
        await sharp(Buffer.from(board)).png().toFile(path.join(directory,`applications-${treatment}.png`));
    }
}
module.exports = { validateDevelopment, artworkSVG, applicationSVG, buildDevelopment, directory, symbol, wordmark, lockup, svg };
