const fs = require('node:fs');
const postcss = require('postcss');
const { transform } = require('esbuild');
const { writeDesign } = require('./design-system');
(async () => {
    const { system } = writeDesign();
    const breakpoints = css => css.replaceAll('(max-width:1100px)', `(max-width:${system.details.homepageReview.shared.tabletBreakpoint})`).replaceAll('(max-width:1023px)', `(max-width:${parseFloat(system.breakpoints.lg)-1}px)`).replaceAll('(min-width: 768px)', `(min-width: ${system.breakpoints.md})`).replaceAll('(max-width:767px)', `(max-width:${parseFloat(system.breakpoints.md)-1}px)`).replaceAll('(min-width:1024px)', `(min-width:${system.breakpoints.lg})`).replaceAll('(min-width: 1024px)', `(min-width: ${system.breakpoints.lg})`);
    const source = breakpoints(fs.readFileSync('style.css', 'utf8').replace('@import "./styles/components.css";', ''));
    const output = await postcss([require('postcss-import'), require('tailwindcss'), require('autoprefixer')]).process(source, { from: 'style.css' });
    const css = output.css + '\n' + breakpoints(fs.readFileSync('styles/components.css', 'utf8')) + '\n' + breakpoints(fs.readFileSync('styles/site.css', 'utf8'));
    fs.writeFileSync('tailwind.css', (await transform(css, { loader: 'css', minify: true })).code);
})().catch(error => { console.error(error); process.exitCode = 1; });
