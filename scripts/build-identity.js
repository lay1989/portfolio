const fs = require('node:fs');
const path = require('node:path');
const { transform } = require('esbuild');
const sharp = require('sharp');
const { createHash } = require('node:crypto');
const { validateDevelopment, buildDevelopment } = require('./identity-development');
const { validateKit, buildKit } = require('./identity-kit');
const { readDesign } = require('./design-system');
const root = path.resolve(__dirname, '..');

const sketchDirectory = path.join(root, '.cache/identity/current-sketches');

function studySource(identity) {
    const artwork = identity.artwork;
    if (!artwork || !/^identity-studies\/round-\d+\/[a-z0-9-]+\.png$/.test(artwork.source)) throw Error('Invalid study source');
    const source = fs.readFileSync(path.join(root, 'design', artwork.source));
    if (source.length < 24 || !source.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Invalid study PNG');
    if (source.readUInt32BE(16) !== artwork.width || source.readUInt32BE(20) !== artwork.height) throw Error('Study dimensions do not match');
    if (createHash('sha256').update(source).digest('hex') !== artwork.sha256) throw Error('Study checksum does not match');
    return source;
}

/** Reference captures and proposed artwork have separate, explicit allowlists. */
function validateResearch(identity) {
    if (!['brief', 'sketches', 'development', 'kit-review'].includes(identity.stage)) throw Error('Unknown identity review stage');
    if (Object.keys(identity.glyphs).length) throw Error('Withdrawn glyph system must stay empty');
    if (identity.stage === 'brief' && identity.concepts.length) throw Error('Brief stage must not contain proposed marks');
    if (identity.references.length !== 6) throw Error('The review needs six comparison identities');
    const ids = new Set();
    for (const reference of [identity.muse, ...identity.references]) {
        if (!/^[a-z]+(?:-[a-z]+)*$/.test(reference.id) || ids.has(reference.id)) throw Error('Invalid or duplicate reference ID');
        ids.add(reference.id);
        if (!reference.url.startsWith('https://') || !reference.alt) throw Error('Every reference needs attribution and descriptive text');
        const file = path.join(root, 'design/identity-references', reference.id + '.png');
        const png = fs.readFileSync(file);
        if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Invalid PNG reference: ' + reference.id);
        if (png.readUInt32BE(16) !== reference.width || png.readUInt32BE(20) !== reference.height) throw Error('Reference capture dimensions do not match: ' + reference.id);
    }
    if (['sketches', 'development', 'kit-review'].includes(identity.stage)) validateSketches(identity);
    if (['development', 'kit-review'].includes(identity.stage)) validateDevelopment(identity);
    if (identity.stage === 'kit-review') validateKit(identity);
}

function validateSketches(identity) {
    if (!identity.stageOneApproval || identity.concepts.length !== 12) throw Error('Sketch stage needs the approved brief and twelve sketches');
    if (identity.medium && !['vector', 'raster-study'].includes(identity.medium)) throw Error('Unknown sketch medium');
    const raster = identity.medium === 'raster-study';
    if (raster) studySource(identity);
    const ids = new Set();
    const numbers = new Set();
    const groups = { lettering: 0, symbol: 0, combined: 0 };
    for (const item of identity.concepts) {
        if (!/^[a-z]+(?:-[a-z]+)*$/.test(item.id) || ids.has(item.id) || identity.rejected.some(name => name.toLowerCase() === item.id)) throw Error('Invalid sketch ID');
        ids.add(item.id);
        if (!Number.isInteger(item.number) || item.number < 1 || item.number > 12 || numbers.has(item.number)) throw Error('Invalid sketch number');
        numbers.add(item.number);
        if (!Object.hasOwn(groups, item.kind)) throw Error('Unknown sketch group');
        groups[item.kind]++;
        if (!item.name || !item.idea || !item.risk || !item.alt || !item.construction || !item.caption) throw Error('Sketch needs an explanation, critique and accessible description');
        if (raster) {
            if (item.layers || item.viewBox) throw Error('Raster studies must not claim native vector geometry');
            continue;
        }
        if (JSON.stringify(item.viewBox) !== '[0,0,600,240]' || !item.layers.length) throw Error('Invalid sketch canvas');
        for (const layer of item.layers) {
            if (Object.keys(layer).some(key => !['d', 'fill', 'fillRule', 'stroke', 'strokeWidth', 'linecap', 'linejoin'].includes(key))) throw Error('Unknown geometry property');
            if (!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(layer.d)) throw Error('Invalid path');
            if (layer.fill && !['ink', 'paper', 'none'].includes(layer.fill)) throw Error('Sketches are monochrome');
            if (layer.stroke && layer.stroke !== 'ink') throw Error('Invalid sketch stroke');
            if (layer.strokeWidth !== undefined && !(Number.isFinite(layer.strokeWidth) && layer.strokeWidth > 0 && layer.strokeWidth < 100)) throw Error('Invalid stroke width');
            if (layer.fillRule && layer.fillRule !== 'evenodd') throw Error('Invalid fill rule');
            if (layer.linecap && layer.linecap !== 'round') throw Error('Invalid line cap');
            if (layer.linejoin && layer.linejoin !== 'round') throw Error('Invalid line join');
        }
    }
    if (Object.values(groups).some(count => count !== 4)) throw Error('Sketches must be four lettering, four symbol and four combined');
}

const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

/** All variants derive from the same authored paths; no font or image dependency. */
function sketchSVG(item, system, reversed = false) {
    const ink = system.palette[reversed ? 'white' : 'black'];
    const paper = system.palette[reversed ? 'black' : 'white'];
    const color = role => role === 'none' ? 'none' : role === 'paper' ? paper : ink;
    const paths = item.layers.map(layer => `<path d="${escapeXML(layer.d)}" fill="${color(layer.fill)}"${layer.fillRule ? ' fill-rule="evenodd"' : ''}${layer.stroke ? ` stroke="${ink}" stroke-width="${layer.strokeWidth}" stroke-linecap="${layer.linecap || 'butt'}" stroke-linejoin="${layer.linejoin || 'miter'}"` : ''}/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${item.viewBox.join(' ')}" width="600" height="240" role="img" aria-labelledby="sketch-title"><title id="sketch-title">${escapeXML(String(item.number).padStart(2, '0') + ' · ' + item.name + '. ' + item.alt)}</title><rect width="600" height="240" fill="${paper}"/>${paths}</svg>`;
}

/** Typography here labels the document only. The twelve marks contain paths only. */
function comparisonSVG(identity, system) {
    const { identitySheetWidth: width, identitySheetHeight: height, identitySheetMargin: margin, identitySheetCellHeight: cellHeight, identitySheetHeader: header } = system.details;
    const cellWidth = (width - margin * 2) / 4;
    const ink = system.palette.black;
    const sizes = system.details;
    const type = system.fonts.sans.join(', ');
    const text = (x, y, size, value, weight = system.fontWeights.normal) => `<text x="${x}" y="${y}" font-family="${escapeXML(type)}" font-size="${size}" font-weight="${weight}">${escapeXML(value)}</text>`;
    let content = text(margin, margin + 12, sizes.identitySheetTitleSize, 'Lay Shah / Twelve starting points', system.fontWeights.semibold);
    content += text(margin, margin + 54, sizes.identitySheetSubtitleSize, 'Curiosity. Understanding. Clear communication.');
    content += text(width - margin - 356, margin + 12, sizes.identitySheetMetaSize, 'STAGE 2 · BLACK & WHITE');
    content += text(width - margin - 356, margin + 48, sizes.identitySheetBodySize, 'Exploration sketches · Choose two');
    for (const [row, group] of identity.sketchGroups.entries()) {
        const top = header + row * cellHeight;
        content += `<path d="M${margin} ${top}H${width - margin}" stroke="${ink}"/>`;
        content += text(margin, top + 35, sizes.identitySheetGroupSize, group.title, system.fontWeights.semibold);
        for (const [column, item] of identity.concepts.filter(item => item.kind === group.id).entries()) {
            const x = margin + column * cellWidth;
            const svg = sketchSVG(item, system).replace('<svg ', `<svg x="${x}" y="${top + 53}" `).replace('width="600" height="240"', `width="${cellWidth}" height="${cellWidth * .4}"`);
            content += svg.replaceAll('sketch-title', 'sketch-' + item.id);
            content += text(x + 14, top + 286, sizes.identitySheetLabelSize, `${String(item.number).padStart(2, '0')} / ${item.name}`, system.fontWeights.semibold);
            content += text(x + 14, top + 319, sizes.identitySheetBodySize, item.caption);
        }
    }
    content += text(margin, height - margin, sizes.identitySheetBodySize, 'Ideas for review. No direction selected. Lettering, proportions and small-size variants remain to be developed.');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="sheet-title"><title id="sheet-title">Twelve black-and-white Lay Shah identity sketches: four lettering-led, four symbols, four combined.</title><rect width="${width}" height="${height}" fill="${system.palette.white}"/><g fill="${ink}">${content}</g></svg>`;
}

function readIdentity() {
    const identity = JSON.parse(fs.readFileSync(path.join(root, 'design/identity-concepts.json'), 'utf8'));
    validateResearch(identity);
    return identity;
}

async function buildIdentity() {
    const identity = readIdentity();
    const { system } = readDesign();
    const source = fs.readFileSync(path.join(root, 'styles/identity-review.css'), 'utf8')
        .replaceAll('(min-width: 768px)', `(min-width: ${system.breakpoints.md})`)
        .replaceAll('(min-width: 1280px)', `(min-width: ${system.breakpoints.xl})`);
    fs.writeFileSync(path.join(root, 'public/css/identity-review.css'), (await transform(source, { loader: 'css', minify: true })).code);
    if (['development', 'kit-review'].includes(identity.stage)) {
        fs.mkdirSync(sketchDirectory, { recursive: true });
        fs.writeFileSync(path.join(sketchDirectory, 'comparison.png'), studySource(identity));
        await buildDevelopment(identity, system);
        if (identity.stage === 'kit-review') await buildKit(identity, system);
        console.log('Private 05 / 09 identity previews prepared.');
        return;
    }
    if (identity.stage === 'sketches') {
        fs.mkdirSync(sketchDirectory, { recursive: true });
        if (identity.medium === 'raster-study') {
            fs.writeFileSync(path.join(sketchDirectory, 'comparison.png'), studySource(identity));
            console.log('Private raster study prepared; vector construction follows selection.');
            return;
        }
        for (const item of identity.concepts) {
            fs.writeFileSync(path.join(sketchDirectory, item.id + '.svg'), sketchSVG(item, system));
            fs.writeFileSync(path.join(sketchDirectory, item.id + '-reversed.svg'), sketchSVG(item, system, true));
        }
        const sheet = comparisonSVG(identity, system);
        fs.writeFileSync(path.join(sketchDirectory, 'comparison.svg'), sheet);
        await sharp(Buffer.from(sheet)).png().toFile(path.join(sketchDirectory, 'comparison.png'));
    }
    console.log(`Private identity ${identity.stage} prepared; published branding unchanged.`);
}

module.exports = { readIdentity, validateResearch, buildIdentity, sketchSVG, comparisonSVG, sketchDirectory };
if (require.main === module) buildIdentity().catch(error => { console.error(error); process.exitCode = 1; });
