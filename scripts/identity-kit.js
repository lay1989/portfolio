const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const { symbol, wordmark, lockup, svg, validateDevelopment } = require('./identity-development');
const directory = path.resolve(__dirname,'../.cache/identity/evergreen-kit');
const archiveName = 'lay-shah-evergreen-kit.zip';

function validateKit(identity) {
    validateDevelopment(identity);
    if (identity.selection.treatment !== 'green' || identity.selection.treatmentConfirmation !== 'evergreen') throw Error('Evergreen selection required');
    if (!identity.kit || identity.kit.symbolSmall.length !== 3) throw Error('Missing small-size geometry');
    for (const d of identity.kit.symbolSmall) if (!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(d)) throw Error('Invalid small-size path');
    for (const kind of ['horizontal','name','symbol','symbol-small']) {
        const box=identity.kit.canvases[kind];
        if (!Array.isArray(box) || box.length!==4 || !box.every(Number.isFinite) || box[2]<=0 || box[3]<=0) throw Error('Invalid kit canvas');
    }
}
function masterSVG(identity, system, kind, treatment='evergreen') {
    const ink = {evergreen:system.palette['identity-green'],black:system.palette.black,white:system.palette.white}[treatment];
    if (!ink || !Object.hasOwn(identity.kit.canvases,kind)) throw Error('Invalid master variant');
    const dev=identity.development, box=identity.kit.canvases[kind];
    const body=kind==='horizontal' ? lockup(dev,ink) : kind==='name' ? wordmark(dev,ink) : symbol(kind==='symbol-small'?{...dev,symbol:identity.kit.symbolSmall}:dev,ink);
    return svg(box[2],box[3],`Lay Shah, ${kind}, ${treatment}`,body).replace(`viewBox="0 0 ${box[2]} ${box[3]}"`,`viewBox="${box.join(' ')}"`);
}
function tileSVG(identity,system,small=false,reversed=false) {
    const ink=system.palette[reversed?'identity-cream':'identity-green'];
    const paper=system.palette[reversed?'identity-green':'identity-cream'];
    const dev=small?{...identity.development,symbol:identity.kit.symbolSmall}:identity.development;
    return svg(256,256,'Lay Shah ribbon y',`<rect width="256" height="256" fill="${paper}"/>${symbol(dev,ink)}`);
}
function avatarSVG(identity,system) {
    const inset=identity.kit.avatarInset,scale=(256-inset*2)/256;
    return svg(256,256,'Lay Shah social avatar',`<rect width="256" height="256" fill="${system.palette['identity-green']}"/><g transform="translate(${inset} ${inset}) scale(${scale})">${symbol(identity.development,system.palette['identity-cream'])}</g>`);
}
function shareSVG(identity,system) {
    const ink=system.palette['identity-green'],paper=system.palette['identity-cream'];
    return svg(1200,630,'Lay Shah — independent developer',`<rect width="1200" height="630" fill="${paper}"/><g transform="translate(204 52) scale(1.1)">${lockup(identity.development,ink)}</g><text x="600" y="541" text-anchor="middle" fill="${ink}" font-size="${system.details.identitySheetTitleSize}" font-family="${system.fonts.sans.join(', ')}">Independent developer</text><text x="600" y="588" text-anchor="middle" fill="${ink}" font-size="${system.details.identitySheetGroupSize}" font-family="${system.fonts.sans.join(', ')}">layshahdev.com</text>`);
}
function usageGuide(identity,system) {
    const s=system.details,p=system.palette;
    const rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)).join(", ");
    return `# Lay Shah / Evergreen\n\nSelected family: 09 full identity with 05 compact symbol. Evergreen selected by the owner. The owner approved local website and admin integration. Public deployment remains separate.\n\n## Which file to use\n\n- **horizontal-*.svg** — symbol beside the selected two-line name, for headers, footers, proposals and email signatures.\n- **name-*.svg** — the same lettering without the symbol.\n- **symbol-*.svg** — the standard compact mark for avatars and larger placements.\n- **symbol-small-*.svg** — a slightly larger dot and blunter tail for very small use.\n- **favicon.svg / favicon.ico / favicon-16,24,32,48.png** — small cut on warm paper. ICO contains actual 16/32/48 PNG frames.\n- **apple-touch-icon.png** — 180 × 180; **app-icon-192.png / app-icon-512.png** — square app icons.\n- **social-avatar.png** — 1024 × 1024, warm mark on Evergreen. Keep the supplied margin when cropping to a circle.\n- **default-sharing.png** — 1200 × 630 default sharing image. Entry-specific images should continue to take precedence.\n- ***-1024.png** — transparent raster alternatives; PNG width is 1024 pixels.\n\n## Color\n\n| Role | HEX | RGB |\n| --- | --- | --- |\n| Evergreen | ${p['identity-green']} | ${rgb(p['identity-green'])} |\n| Warm paper | ${p['identity-cream']} | ${rgb(p['identity-cream'])} |\n| Black | ${p.black} | 0, 0, 0 |\n| White | ${p.white} | 255, 255, 255 |\n\nUse white on Evergreen for dark surfaces. Transparent files do not supply their own background. This is an RGB/web package; print colors need a printer's proof.\n\n## Size and clear space\n\n| Form | Minimum display size |\n| --- | --- |\n| Horizontal | ${s.identityMinHorizontal} px wide |\n| Name only | ${s.identityMinName} px wide |\n| Standard symbol | ${s.identityMinSymbol} px square |\n| Small favicon | ${s.identityMinFavicon} px square |\n\n${identity.kit.usage.map(x=>'- '+x).join('\n')}\n\nThese are practical screen minimums checked in the preview, not a guarantee for every display or print material. At a smaller size use the compact symbol instead of squeezing the name.\n\n## Source and reproduction\n\nGeometry and placements: source-geometry.json (the development and kit sections). Colors and reusable display values: source-design-system.json. All logo SVGs are editable filled paths with no font, linked image, stroke or filter dependency. Black, white and Evergreen exports derive from the same geometry. The mark was manually reconstructed from the owner's selected AI-assisted sketch; no third-party typeface is embedded in the logo. The sharing artwork contains normal document text; its PNG is the ready-to-use version.\n\nThe small cut changes only the dot and thin endpoints. Use the standard cut for larger sizes. Preserve the detached dot, the space between the two ribbon strokes, the name's proportions and the supplied clear-space canvas.\n\n## Contents and checks\n\nmanifest.json lists file sizes and SHA-256 hashes. The archive contains those exact files, plus the manifest. Technical tests cover transparent masters, SVG structure, small-icon sizes, ICO frames, source-derived variants and authenticated preview access. Character and personal fit are based on owner review, not test scores.\n`;
}
function ico(frames) {
    const header=Buffer.alloc(6+frames.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);
    let offset=header.length;
    frames.forEach(({size,bytes},i)=>{const p=6+i*16;header[p]=size;header[p+1]=size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(bytes.length,p+8);header.writeUInt32LE(offset,p+12);offset+=bytes.length;});
    return Buffer.concat([header,...frames.map(f=>f.bytes)]);
}
/** Store-only ZIP, with fixed DOS epoch timestamps for reproducible archives. */
function zip(files) {
    const crc32=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
    const locals=[],central=[];let offset=0;
    for(const [filename,bytes] of files){const name=Buffer.from(filename),crc=crc32(bytes),local=Buffer.alloc(30),entry=Buffer.alloc(46);
        local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(name.length,26);
        entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(bytes.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
        locals.push(local,name,bytes);central.push(entry,name);offset+=local.length+name.length+bytes.length;
    }
    const center=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.size,8);end.writeUInt16LE(files.size,10);end.writeUInt32LE(center.length,12);end.writeUInt32LE(offset,16);
    return Buffer.concat([...locals,center,end]);
}
async function buildKit(identity,system) {
    validateKit(identity);fs.mkdirSync(directory,{recursive:true});const files=new Map();
    for(const kind of ['horizontal','name','symbol','symbol-small'])for(const color of ['evergreen','black','white']){
        const source=masterSVG(identity,system,kind,color);files.set(`${kind}-${color}.svg`,Buffer.from(source));
        if(kind!=='symbol-small')files.set(`${kind}-${color}-1024.png`,await sharp(Buffer.from(source)).resize({width:1024}).png().toBuffer());
    }
    const small=Buffer.from(tileSVG(identity,system,true));files.set('favicon.svg',small);const frames=[];
    for(const size of [16,24,32,48]){const bytes=await sharp(small).resize(size,size).png().toBuffer();files.set(`favicon-${size}.png`,bytes);if(size!==24)frames.push({size,bytes});}
    files.set('favicon.ico',ico(frames));
    for(const [name,size] of [['apple-touch-icon',180],['app-icon-192',192],['app-icon-512',512]])files.set(name+'.png',await sharp(Buffer.from(tileSVG(identity,system))).resize(size,size).png().toBuffer());
    files.set('social-avatar.svg',Buffer.from(avatarSVG(identity,system)));
    files.set('social-avatar.png',await sharp(Buffer.from(avatarSVG(identity,system))).resize(1024,1024).png().toBuffer());
    const share=shareSVG(identity,system);files.set('default-sharing.svg',Buffer.from(share));files.set('default-sharing.png',await sharp(Buffer.from(share)).png().toBuffer());
    files.set('usage-guide.md',Buffer.from(usageGuide(identity,system)));
    files.set('source-geometry.json',Buffer.from(JSON.stringify({selection:identity.selection,development:identity.development,kit:identity.kit},null,2)+'\n'));
    files.set('source-design-system.json',Buffer.from(JSON.stringify(system,null,2)+'\n'));
    const manifest={name:'Lay Shah Evergreen',stage:'kit-review',files:Object.fromEntries([...files].map(([name,bytes])=>[name,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]))};
    files.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
    for(const [name,bytes] of files)fs.writeFileSync(path.join(directory,name),bytes);
    fs.writeFileSync(path.join(directory,archiveName),zip(files));
    return manifest;
}
module.exports={buildKit,validateKit,masterSVG,tileSVG,avatarSVG,shareSVG,usageGuide,ico,zip,directory,archiveName};
