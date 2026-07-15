# Project: Lucide Icon Visibility and Emoji Replacement

## Architecture
- **Static Website Architecture**: Built with standard HTML, Tailwind CSS, and Vanilla JavaScript.
- **Static Site Generation**: Pages in `content/` and `templates/` along with data from `data/projects.json` are processed by `scripts/build-html.js` to compile the final `.html` pages.
- **Icon Infrastructure**: Lucide icons are declared using `<i data-lucide="icon-name"></i>` and initialized client-side via JavaScript.
- **Theme System**: Light/Dark mode toggling by modifying class on `<html>` tag, which changes CSS variable mappings for colors.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Exploration | Identify all emojis in `content/`, `templates/`, and `data/projects.json`. Trace the CSS cascade or Tailwind configuration issue rendering icons invisible in light/dark modes on projects and blog pages and theme toggles. | none | DONE |
| M2 | Implementation | Replace all emojis with appropriate Lucide icons. Correct Lucide icon visibility issues. Write `verify_emojis.js` to verify 0 emojis in output. Run `node scripts/build-html.js`. | M1 | DONE |
| M3 | Verification & Review | Validate that `.lucide` icons are strongly visible and contrast well in light/dark modes. Run all checks via Reviewer and Challenger agents. | M2 | DONE (IDs: 551e9250, 1c1afe82) |
| M4 | Forensic Audit | Perform audit check for integrity violations and cheating. Finalize report and Victory Claim. | M3 | DONE (ID: f30f1bf4) |

## Code Layout
- `content/`: Source HTML page fragments containing content and structure.
- `templates/`: Templates for pages (e.g., `base.html` for main layout, `project-case-study.html` for case studies).
- `data/projects.json`: Database of project metadata, descriptions, features, and metrics.
- `components/`: HTML component fragments (like header/footer).
- `style.css`: Main custom CSS style definitions and theme variables.
- `tailwind.config.js`: Tailwind configuration.
- `scripts/build-html.js`: SSG build script.
