## 2026-06-18T17:37:30Z

You are teamwork_preview_worker. Your working directory is c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_cat2_m2.
Your task is to implement Milestone 2: CSS Build Step & Architecture (R1) of Category 2.

Input Information:
- Verbatim user request is in c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_orchestrator_cat2\ORIGINAL_REQUEST.md.
- Project scope is in c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_orchestrator_cat2\plan.md.
- Reconciled Explorer Analysis is available at c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_explorer_cat2_m2_3\analysis.md and c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_explorer_cat2_m2_1\analysis.md.

Specifically, you must:
1. Create a `package.json` file in the root folder with:
   - name: `lay-shah-portfolio`
   - version: `1.0.0`
   - devDependencies: `tailwindcss` (latest v3, e.g. `^3.4.4`), `postcss` (latest v8), `autoprefixer` (latest v10)
   - scripts:
     - `build:css`: `tailwindcss -i ./style.css -o ./tailwind.css --minify`
     - `watch:css`: `tailwindcss -i ./style.css -o ./tailwind.css --watch`
2. Refactor the existing `tailwind.config.js` to be a standard CommonJS module configuration. Ensure that the `content` array includes root HTML files (`./*.html`), components folder (`./components/**/*.html`), and JS files (`./script.js`), plus `./src/**/*.{ts,tsx,html,js}` to be complete.
3. Refactor `style.css` to organize classes into `@layer base`, `@layer components`, and `@layer utilities` directives. In the base layer, import the three standard `@tailwind` directives: `@tailwind base; @tailwind components; @tailwind utilities;`.
4. Replace magic numbers in translations with CSS variables under `:root` and `.dark` (e.g. `--reveal-offset: 30px;`, `--theme-toggle-offset: 30px;`, `--hover-lift-offset: -5px;`, `--hamburger-translate: 8px;` or similar). The keyframe animations, `.reveal`, hamburger active state, and card lift styles should reference these variables.
5. In all 9 HTML files (index.html, blog.html, project-details.html, blog-custom-websites.html, blog-freelance-developer.html, blog-javascript-frameworks.html, blog-performance-optimization.html, blog-responsive-design.html, blog-seo-developers.html):
   - Remove the Tailwind CDN script tag: `<script src="https://cdn.tailwindcss.com"></script>`
   - Remove the browser-level Tailwind config script tag: `<script src="tailwind.config.js"></script>`
   - Replace the stylesheet link: `<link rel="stylesheet" href="./style.css">` with `<link rel="stylesheet" href="./tailwind.css">`
6. Run `npm install` and `npm run build:css` to compile the CSS.
7. Verify that `tailwind.css` is generated and that the project compiles cleanly.
8. Document all changes and build results in `changes.md` and write a handoff report in `handoff.md` in your working directory.
