const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const root = path.resolve(__dirname, '..');
const schema = require('../design/system.schema.json');
const validate = new Ajv({ allErrors: true }).compile(schema);

/** Semantic roles and their derived Tailwind alpha channels share one adapter. */
function themeDeclarations(theme) {
    return Object.entries(theme).flatMap(([key, value]) => [`--${key}: ${value}`, ...(/^#[\da-f]{6}$/i.test(value) ? [`--${key}-rgb: ${[1,3,5].map(i => parseInt(value.slice(i,i+2),16)).join(' ')}`] : [])]);
}

/** Resolve authored design tokens once for CSS, Tailwind, and browser motion. */
function compileDesign(system) {
    if (!validate(system)) throw new Error(`Invalid design file: ${JSON.stringify(validate.errors)}`);
    const cssLength = /^(?:-?\d*\.?\d+(?:px|rem|em|ch|vw|vh|%)?|clamp\([-\d.,\sremvw%]+\))$/;
    for (const [name, role] of Object.entries(system.type)) {
        if (!system.fonts[role.family] || !Object.hasOwn(system.fontWeights, role.weight)) throw new Error(`Unknown font in type.${name}`);
        for (const prop of ['size', 'lineHeight', 'tracking']) if (!cssLength.test(role[prop])) throw new Error(`Invalid unit in type.${name}.${prop}`);
    }
    for (const [name, weight] of Object.entries(system.fontWeights)) if (![300, 400, 500, 600, 700].includes(weight)) throw new Error(`Unsupported loaded font weight: ${name}`);
    for (const [name, size] of Object.entries(system.fontSizes)) if (!cssLength.test(size.size) || !cssLength.test(size.lineHeight)) throw new Error(`Invalid font size: ${name}`);
    for (const group of ['layout', 'radii', 'breakpoints', 'legacy']) for (const [key, value] of Object.entries(system[group])) if (!cssLength.test(value) && !(group === 'legacy' && /^[-.\d\srempx%]+$/.test(value))) throw new Error(`Invalid design length: ${group}.${key}`);
    if (!(system.spacing.unitRem > 0 && system.spacing.unitRem <= 1) || !system.spacing.steps.every(n => typeof n === 'number' && n >= 0)) throw new Error('Invalid spacing scale');
    const resolveTheme = theme => {
        const resolve = (value, trail = []) => String(value).replace(/\{([\w.-]+)\}/g, (_, ref) => {
            if (trail.includes(ref)) throw new Error(`Design alias cycle: ${[...trail, ref].join(' → ')}`);
            const next = ref.startsWith('palette.') ? system.palette[ref.slice(8)] : theme[ref];
            if (next === undefined) throw new Error(`Unknown design alias: ${ref}`);
            return resolve(next, [...trail, ref]);
        });
        return Object.fromEntries(Object.entries(theme).map(([key, value]) => [key, resolve(value, [key])]));
    };
    const themes = Object.fromEntries(Object.entries(system.themes).map(([name, theme]) => [name, resolveTheme(theme)]));
    for (const theme of Object.values(themes)) for (const required of ['background','foreground','accent','accent-foreground','heading','heading-accent','border','card','muted-foreground']) if (!/^#[\da-f]{6}$/i.test(theme[required] || '')) throw new Error(`Missing or invalid theme role: ${required}`);
    if (system.media.ratios.original !== null) throw new Error('The original image format must preserve its natural proportions');
    for (const key of Object.keys(system.media.ratios)) if (!/^[a-z][a-z0-9-]*$/.test(key) || !system.media.labels[key]) throw new Error('Every image format needs a safe name and label');
    const reading = system.details.homepageApproach;
    if (reading && (!Number.isFinite(reading.readingStart) || !Number.isFinite(reading.readingEnd) || !Number.isFinite(reading.mutedOpacity) || reading.readingEnd < 0 || reading.readingStart > 1 || reading.readingStart <= reading.readingEnd || reading.mutedOpacity < 0 || reading.mutedOpacity > 1)) throw new Error('Invalid homepage reading statement settings');
    const declarations = [];
    for (const [key, ratio] of Object.entries(system.media.ratios)) if (ratio) declarations.push(`--media-ratio-${key}: ${ratio[0]} / ${ratio[1]}`);
    for (const [key, value] of Object.entries(system.fontWeights)) declarations.push(`--font-weight-${key}: ${value}`);
    for (const [key, value] of Object.entries(system.radii)) declarations.push(`--radius-${key}: ${value}`);
    for (const [key, color] of Object.entries(system.palette)) declarations.push(`--color-${key}: ${color}`);
    for (const [key, families] of Object.entries(system.fonts)) declarations.push(`--font-${key}: ${families.map(f => /\s/.test(f) ? JSON.stringify(f) : f).join(', ')}`);
    for (const [name, role] of Object.entries(system.type)) {
        declarations.push(`--type-${name}-size: ${role.size}`, `--type-${name}-leading: ${role.lineHeight}`, `--type-${name}-tracking: ${role.tracking}`, `--type-${name}-weight: ${system.fontWeights[role.weight]}`, `--type-${name}-family: var(--font-${role.family})`);
    }
    for (const [key, value] of Object.entries(system.layout)) declarations.push(`--layout-${key}: ${value}`);
    for (const [key, value] of Object.entries(system.legacy)) declarations.push(`--recipe-${key}: ${value}`);
    for (const [key, value] of Object.entries(system.motion.durations)) declarations.push(`--motion-${key}: ${value}ms`);
    declarations.push(`--layer-admin-toolbar: ${system.details.adminToolbarLayer}`, `--motion-press-scale: ${system.motion.pressScale}`, `--motion-ripple-scale: ${system.motion.rippleScale}`, `--motion-ease: ${system.motion.easing.css}`, `--motion-offset: ${system.motion.offset}px`, `--reveal-offset: ${system.motion.revealOffset}px`, `--theme-toggle-offset: ${system.motion.themeOffset}px`, `--hover-lift-offset: ${system.motion.hoverLift}px`, `--radius-control: ${system.radii.control || system.radii.full}`, `--radius-surface: ${system.radii.surface || system.radii['2xl']}`, `--figure-shadow-opacity: ${system.details.figureShadowOpacity}`, `--figure-stroke: ${system.details.figureStroke}`, `--layer-skip-link: ${system.details.skipLinkLayer}`, `--focus-width: ${system.details.focusWidth}`, `--focus-offset: ${system.details.focusOffset}`);
    const themeCSS = Object.entries(themes).map(([name, theme]) => {
        const props = themeDeclarations(theme);
        return `${name === 'light' ? ':root' : '.dark'} {\n${props.map(p => `  ${p};`).join('\n')}\n}`;
    }).join('\n');
    const rolesCSS = Object.keys(system.type).map(name => `.type-${name} { font-family:var(--type-${name}-family);font-size:var(--type-${name}-size);font-weight:var(--type-${name}-weight);line-height:var(--type-${name}-leading);letter-spacing:var(--type-${name}-tracking); }`).join('\n');
    const home = system.details.homepageReview;
    const homeVars = home ? `:root{${Object.entries(home.shared).map(([key,value])=>`--home-b-${key}:${value}`).join(';')}}\n` + Object.entries({light:home.a,dark:home.b}).map(([mode,palette])=>`${mode==='dark'?'.dark ':''}body:has(.home-direction-b){${Object.entries(palette).map(([key,value])=>`--home-b-${key}:${value}`).join(';')};${themeDeclarations({background:palette.bg,foreground:palette.fg,'muted-foreground':palette.muted,accent:palette.accent,'accent-foreground':palette.accentText,card:palette.surface,border:palette.border,primary:palette.fg,'primary-foreground':palette.bg,secondary:palette.panel}).join(';')}}`).join('\n') : '';
    const css = `/* Generated from design/system.json. Do not edit. */\n:root {\n${declarations.map(p => `  ${p};`).join('\n')}\n}\n${themeCSS}\n${rolesCSS}\n` + (!system.motion.enabled ? '*,:before,:after {animation:none!important;transition:none!important;scroll-behavior:auto!important}\n' : '');
    const componentVars = Object.entries({homepageSections:'home-section',homepageApproach:'home-approach',homepageServices:'home-services',homepageProcess:'home-process',homepageFeedback:'home-feedback',homepageWriting:'home-writing',homepageTools:'home-tools'})
        .filter(([key])=>system.details[key])
        .map(([key,prefix])=>`:root{${Object.entries(system.details[key]).map(([name,value])=>`--${prefix}-${name}:${value}`).join(';')}}\n`).join('');
    return { css:css+'\n'+homeVars+componentVars, themes, motion: system.motion, system };
}

function readDesign() { return compileDesign(JSON.parse(fs.readFileSync(path.join(root, 'design/system.json'), 'utf8'))); }
function writeIfChanged(filename, value) {
    if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== value) fs.writeFileSync(filename, value);
}
function writeDesign() {
    const design = readDesign();
    writeIfChanged(path.join(root, 'styles/design.generated.css'), design.css);
    writeIfChanged(path.join(root, 'src/motion/config.generated.js'), `// Generated from design/system.json. Do not edit.\nexport default ${JSON.stringify({...design.motion, tagline: {readingStart:design.system.details.homepageApproach.readingStart, readingEnd:design.system.details.homepageApproach.readingEnd, mutedOpacity:design.system.details.homepageApproach.mutedOpacity}, reelQuery: `(min-width: ${design.system.breakpoints.lg}) and (min-height: ${design.system.layout.reelMinViewport})`}, null, 2)};\n`);
    writeIfChanged(path.join(root, 'src/admin-layout.generated.js'), `// Generated from design/system.json. Do not edit.\nexport default ${JSON.stringify({desktopQuery: `(min-width: ${design.system.breakpoints.lg})`})};\n`);
    return design;
}
module.exports = { compileDesign, readDesign, writeDesign, themeDeclarations };
if (require.main === module) { writeDesign(); console.log('Design system validated; CSS and motion adapters generated.'); }
