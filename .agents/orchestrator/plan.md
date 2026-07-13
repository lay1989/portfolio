# Project: Portfolio Website Category 1 Integration
# Scope: Portfolio Guidelines - Vanilla Stack Specifics

## Architecture
- **Vanilla Stack**: Static HTML, global styles (`style.css`), interactivity and dynamic features (`script.js`).
- **CDN Scripts**: Tailwind CSS CDN and Lucide Icons script are loaded in the `<head>` or body.
- **Dynamic Components**: Navigation and Footer are loaded dynamically via vanilla fetch and injected into page placeholders.
- **FOUC Prevention**: Inline `<script>` block in `<head>` initializes dark mode class before browser renders.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Planning & Setup | Initialize plan.md, progress.md, and BRIEFING.md; set up background tasks. | None | DONE |
| 2 | Configuration & Logic Consolidation (R1) | 1. Create tailwind.config.js and load it in all 9 pages.<br>2. Extract theme color variables and centralize them in style.css.<br>3. Move dark mode initialization to inline script in <head> for all 9 pages. | M1 | DONE |
| 3 | Reusability & Asset Management (R2) | 1. Extract Navbar and Footer to separate HTML files.<br>2. Replace Navbar and Footer code in all 9 HTML files with placeholders.<br>3. Implement script logic to fetch, inject, post-process links, and initialize Lucide icons + toggle event listeners. | M2 | DONE |
| 4 | Verification & Quality Assurance | 1. Start local server and visually inspect layouts and theme toggling.<br>2. Run static analysis/linting and review console errors.<br>3. Run Forensic Auditor check for integrity and cleanliness. | M3 | DONE |

## Interface & Code Contracts

### Global Theme Variables (style.css)
- CSS variables must define colors for light and dark modes:
  - `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`
- Tailwind configuration (`tailwind.config.js`) maps these CSS variables directly.
- The scrollbar and navigation background colors must resolve via CSS variables rather than hardcoded hex values in `script.js` or `style.css`.

### FOUC Script (HTML `<head>`)
- A small blocking script tag in `<head>` prior to body rendering:
  ```html
  <script>
      (function() {
          const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          if (theme === 'dark') {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
      })();
  </script>
  ```

### Shared Components Layout & Injection (script.js)
- Common components will be placed in `components/navbar.html` and `components/footer.html`.
- Placeholders in HTML pages:
  - `<div id="navbar-placeholder"></div>`
  - `<div id="footer-placeholder"></div>`
- After injection, `lucide.createIcons()` and event listener setup for mobile hamburger / theme toggle must be run to restore interactivity.
- Navbar link rewriting:
  - If current URL path is `index.html` or `/`, rewrite links pointing to `index.html#section` to `#section` for smooth scroll.
  - If not on `index.html`, rewrite links pointing to `#section` to `./index.html#section`.
