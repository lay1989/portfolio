import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { buildMachine } from './figures/publishing-machine.mjs';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, '.cache/flask-templates/publishing-machine.html');
const signaturePath = path.join(root, '.cache/workbench-geometry-hash');
const files = ['scripts/figures/publishing-machine.mjs', 'vendor/anatomy/iso-kit.mjs', 'vendor/anatomy/audit.mjs', 'vendor/anatomy/lathe.mjs', 'vendor/anatomy/tube.mjs'];
const signature = crypto.createHash('sha256').update(files.map(file => fs.readFileSync(path.join(root, file))).join('\n')).digest('hex');
const audit = process.argv.includes('--audit');
if (audit || !fs.existsSync(target) || !fs.existsSync(signaturePath) || fs.readFileSync(signaturePath, 'utf8') !== signature) {
    const { svg, parts } = buildMachine({ audit });
    if (process.exitCode) process.exit(process.exitCode);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `<!-- Generated from scripts/figures/publishing-machine.mjs; ${parts} solids. -->\n${svg}\n`);
    fs.writeFileSync(signaturePath, signature);
    console.log(`Publishing machine: ${parts} solids built.`);
}
const { readDesign, themeDeclarations } = require('./design-system.js');
const { system, themes } = readDesign();
const source = fs.readFileSync(path.join(root, 'styles/publishing-workbench.css'), 'utf8').replaceAll('768px', system.breakpoints.md);
const scopedThemes = Object.entries(themes).map(([name, roles]) => `.publishing-workbench[data-theme="${name}"]{${themeDeclarations(roles).join(';')}}`).join('\n');
const css = (await transform(scopedThemes + '\n' + source, { loader: 'css', minify: true })).code;
const destination = path.join(root, 'public/css/publishing-workbench.css');
if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== css) fs.writeFileSync(destination, css);
