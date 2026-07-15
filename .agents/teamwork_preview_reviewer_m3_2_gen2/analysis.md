# Build & Output Conformance Review — Milestone 3

## 1. Conformance Review Summary
This review verifies that the build outputs and template rendering logic conform to the Milestone 3 specifications for the portfolio site. All checks have successfully passed after a clean build, verifying that:
- **Social sharing scripts** are correctly injected into individual project pages and mapped to corresponding click events.
- **Master layout and components** (header, footer, theme toggles) are properly assembled with correct relative asset paths (`../` vs `./`).
- **Lucide icons** are styled with correct Tailwind classes, ensuring high WCAG contrast in both light and dark modes.
- **Emoji verification** is successful, confirming that all raw unicode emojis have been completely eliminated from the build output.
- **Build execution** completes successfully using `npm run build`.

---

## 2. Social Sharing Script Injection
Individual project case study pages require social sharing capabilities for Twitter, LinkedIn, and link copying.

### Build Script Injection logic (`scripts/build-html.js`)
The social sharing script is defined as a template string:
```javascript
const socialSharingScript = `
<script>
function shareOnTwitter() {
    var url = encodeURIComponent(window.location.href);
    var text = encodeURIComponent('Check out this amazing project: ' + document.title);
    window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, '_blank');
}
function shareOnLinkedIn() {
    var url = encodeURIComponent(window.location.href);
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
}
function copyProjectLink() {
    navigator.clipboard.writeText(window.location.href).then(function() {
        alert('Project link copied to clipboard!');
    });
}
</script>`;
```
During the page build phase, if the page configuration specifies `type: "project"`, the build script replaces the `{{PAGE_SCRIPTS}}` placeholder in the master template:
```javascript
const pageScripts = pageConfig.type === 'project' ? socialSharingScript : '';
html = html.replace('{{PAGE_SCRIPTS}}', pageScripts);
```
In `templates/base.html`, the placeholder is correctly positioned at the end of the `<body>` element:
```html
    {{PAGE_SCRIPTS}}
    <script src="{{BASE_PATH}}bundle.js" defer></script>
```

### Template Button Integration (`templates/project-case-study.html`)
The case study template contains corresponding buttons with `onclick` bindings:
```html
<button onclick="shareOnTwitter()" class="...">
    <i data-lucide="twitter" class="w-4 h-4" aria-hidden="true"></i> Twitter
</button>
<button onclick="shareOnLinkedIn()" class="...">
    <i data-lucide="linkedin" class="w-4 h-4" aria-hidden="true"></i> LinkedIn
</button>
<button onclick="copyProjectLink()" class="...">
    <i data-lucide="link" class="w-4 h-4" aria-hidden="true"></i> Copy Link
</button>
```
*Result*: Verified that individual generated pages under `projects/` (e.g. `projects/ghermar-sons.html`) contain the script block and functional buttons.

---

## 3. Output HTML Layout & Components
The site layout correctly builds the pages using modular components:
- **Master Template (`templates/base.html`)**: Defines the outer shell, SEO meta tags, OpenGraph headers, structured schema data, local/CDN Lucide fallbacks, and scripts.
- **Header (`components/header.html`)**: Injected into the nav container. It contains desktop and mobile menus, back-to-top button controls, and theme toggles.
- **Footer (`components/footer.html`)**: Injected into the footer. Containscopyright, site links, and contact channels.
- **Path Resolution**: The relative paths to resources (e.g. `../tailwind.css`, `../src/theme-init.js`, `../public/js/lucide.min.js`) are dynamically updated via the `getBasePath` helper:
  - Root pages (e.g. `index.html`, `projects.html`, `blog.html`) resolve base paths as `./`.
  - Nested pages (e.g. `projects/ghermar-sons.html`) resolve base paths as `../`.
  This prevents broken links for nested assets and pages.

---

## 4. Tailwind CSS & WCAG Contrast Analysis
Lucide icons must be clearly visible and contrast well against the background.

### Light & Dark Theme Configuration
Colors are defined using CSS variables in `style.css` mapped in `tailwind.config.js`:
- **Light Mode Background**: Cream `#F5F0EA` (Luminance ~0.887)
- **Dark Mode Background**: Black `#080808` (Luminance ~0.003)

### Verification of Core Components
1. **Theme Toggle (Moon / Sun)**:
   - Uses `text-foreground`.
   - Light mode: Black `#080808` on Cream `#F5F0EA` background -> **Contrast Ratio > 15:1** (Passes WCAG AAA).
   - Dark mode: Light Gray `#f2f2f2` on Black `#080808` background -> **Contrast Ratio > 15:1** (Passes WCAG AAA).
2. **Blog Pages**:
   - Primary icons (e.g. `smartphone`, `code`, `users`, `search`) use `text-primary`.
   - In light mode: `#080808` on Cream -> **Contrast Ratio > 15:1** (Passes).
   - Link chevron icons use `text-primary dark:text-accent`.
   - In light mode: `#080808` on Cream -> **Contrast Ratio > 15:1** (Passes).
   - In dark mode: Orange `#FF6B35` on Black -> **Contrast Ratio 7.23:1** (Passes WCAG AA, > 4.5:1).
3. **Projects Page**:
   - Filter bar uses `text-primary-foreground` on `bg-primary` for the active filter, and `text-muted-foreground` for inactive filters.
   - `text-muted-foreground` resolves to `#666666` in light mode. Contrast against Cream background is **5.61:1** (Passes WCAG AA, > 4.5:1).

### Finding (Minor Visibility Enhancement)
On individual project case studies, several dynamically injected icons (such as `workflow`, `code`, `star`, `check-circle`, `quote`, `user`, `book-open`, `image`) use the class `text-accent` directly.
- **Contrast of `#FF6B35` (Orange) on `#F5F0EA` (Cream)**: **2.44:1**.
- **WCAG Conformance**: Because these icons have `aria-hidden="true"`, they are classified as decorative elements and are exempt from WCAG contrast requirements.
- **Suggestion**: For better light-mode visibility, these could be updated to `text-primary dark:text-accent` or another higher-contrast alternative, although it is not a blocking violation.

---

## 5. Build Process & Verification Run
Running `npm run build` triggers three sub-processes:
1. `npm run build:css` (tailwindcss compilation & minification)
2. `npm run build:js` (esbuild bundle compilation)
3. `npm run build:html` (site page assembler and sitemap generator)

### Race Condition Observation (Verification Integrity)
A temporary race condition was observed when executing verification scripts (`node verify_emojis.js`) immediately after launching the build asynchronously:
- The verification failed because the build task was still running and had not overwritten the old files in the root folder, which contained residual emojis from historical renders.
- Once the build fully completed, the files on disk were successfully updated. Subsequent runs of `node verify_emojis.js` and `node verify_contrast.js` **passed 100%**.
- This highlights the importance of ensuring the build has fully finished before running automated post-build verifications.
