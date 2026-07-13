# Project: Portfolio Website Category 2 Integration
# Scope: Frontend Dev Guidelines

## Architecture
- **Tailwind CLI Compilation**: Move from browser-compiled CDN to local Tailwind CLI build step. We will configure a local build using `package.json` and `tailwind.config.js`.
- **CSS Architecture**: Refactor `style.css` to use Tailwind's `@layer` directives (`base`, `components`, `utilities`) to enforce proper specificity hierarchy.
- **CSS Variables**: Replace hardcoded/magic numbers in `style.css` (specifically the reveal animations' `translateY(30px)` offsets) with custom CSS variables (e.g., `var(--reveal-offset)`).
- **Responsive Images**: Implement `<picture>` tags or `srcset` attributes in the HTML files to serve appropriately sized images.
- **CDN Fallbacks**: Implement script fallbacks in the HTML pages for external assets like the Lucide icon library so the site continues functioning even if the unpkg CDN is down.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Planning | Create plan.md, progress.md, BRIEFING.md, and start the heartbeat cron. | None | DONE |
| 2 | CSS Build Step & Architecture (R1) | 1. Initialize `package.json` with tailwindcss, postcss, autoprefixer, and devDependencies.<br>2. Add `npm run build:css` script to compile CSS using Tailwind CLI.<br>3. Refactor `tailwind.config.js` as a standard Node.js module config.<br>4. Refactor `style.css` to use `@layer base`, `@layer components`, and `@layer utilities`. Extract magic numbers (offsets) to CSS variables.<br>5. Link HTML pages to the compiled CSS and remove Tailwind CDN tags. | M1 | PLANNED |
| 3 | Responsive Images & CDN Fallbacks (R2) | 1. Implement responsive image syntax (`srcset` / `<picture>`) for hero images, project thumbnails, and blog previews.<br>2. Add fallback mechanism for Lucide CDN script. | M2 | PLANNED |
| 4 | Verification & Quality Assurance | 1. Verify build script compiling and output size/correctness.<br>2. Verify local http-server visual check of the 9 pages.<br>3. Run independent forensic audit to confirm compliance and no regression. | M3 | PLANNED |

## Interface & Code Contracts

### Tailwind CSS Input and Output Paths
- **Input CSS**: `style.css` (refactored to include `@tailwind base; @tailwind components; @tailwind utilities;`)
- **Output CSS**: `tailwind.css` (compiled and minified).
- **HTML Links**: `<link rel="stylesheet" href="./tailwind.css">` replaces `./style.css` and the CDN Tailwind script tag.

### CSS Variables & Specificity Hierarchy
- Centralize custom properties in `:root` and `.dark`:
  - `--reveal-offset: 30px;`
  - `--theme-toggle-offset: 30px;`
- Keyframe animations and `.reveal` classes must reference these variables.
- Place styles under `@layer base`, `@layer components`, and `@layer utilities` respectively in `style.css`.

### Lucide Icon CDN Fallback
- In HTML pages, check if `window.lucide` exists after the CDN script.
- If not loaded, inject a fallback `<script>` pointing to a locally saved copy of `lucide.min.js`.

### Responsive Images
- Ensure `<picture>` tags or `srcset` are used. For example, for a hero image or thumbnail, serve multiple resolutions.
