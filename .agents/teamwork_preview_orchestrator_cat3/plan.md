# Project: Portfolio Website Category 3 Integration
# Scope: JavaScript Pro

## Architecture
- **ES Modules & Modularity (R2)**:
  - We will refactor the monolithic `script.js` into distinct ES modules:
    - `src/utils.js`: Utility functions (debounce, throttle).
    - `src/theme.js`: Theme toggling logic and state.
    - `src/nav.js`: Link rewrites, active page highlighting, mobile menu interactions, back-to-top button logic, and navbar scroll effects.
    - `src/animations.js`: Scroll reveal logic using IntersectionObserver.
    - `src/components.js`: Component fetching and dynamic injection.
    - `script.js` (Root): Entry point that coordinates module loading and initialization.
  - All 9 HTML files will be updated to load `script.js` (or the main entrypoint) as `<script type="module" src="./script.js"></script>`.
- **Performance & Encapsulation (R1)**:
  - Cache DOM elements (like `.reveal` list, theme toggle buttons, scroll elements) to avoid query overhead inside high-frequency handlers.
  - Implement a `throttle` or `debounce` helper (e.g. in `src/utils.js`) and wrap high-frequency scroll and resize listeners:
    - Scroll listener for Back to Top visibility.
    - Scroll listener for Navbar scrolled state.
  - Replace older DOM iteration methods with modern `for...of` loops.
  - ES modules natively compile in strict mode and maintain their own scope, preventing global namespace pollution. We will also ensure no variables leak to the global scope.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Planning | Create plan.md, progress.md, and BRIEFING.md; start the heartbeat cron. | None | DONE |
| 2 | Code Exploration & Plan Verification | Explore the existing codebase, identify all script entry points in HTML pages, and define test verification strategy. | M1 | PLANNED |
| 3 | Performance & Encapsulation Refactor (R1) | 1. Implement debounce/throttle utilities.<br>2. Cache DOM queries outside scroll/resize listeners.<br>3. Refactor scroll and resize event listeners with throttle/debounce.<br>4. Replace older loop styles (e.g. `.forEach` where appropriate) with `for...of` loops.<br>5. Ensure all code is cleanly encapsulated in ES modules or IIFE. | M2 | PLANNED |
| 4 | ES Modules Modularization (R2) | 1. Separate code from `script.js` into sub-modules (`theme.js`, `nav.js`, `animations.js`, `components.js`, `utils.js`).<br>2. Rewrite `script.js` as the module entrypoint that imports the sub-modules.<br>3. Update `<script src="./script.js">` to `<script type="module" src="./script.js">` in all 9 HTML files. | M3 | PLANNED |
| 5 | Verification & Quality Assurance | 1. Spin up a local development server.<br>2. Run manual/automated tests to confirm functionality (navbar, footer, theme toggler, mobile menu, scroll reveal, back to top button, load more projects).<br>3. Ensure no console errors and no global scope pollution.<br>4. Execute the Forensic Integrity Audit to confirm compliance and no regressions. | M4 | PLANNED |

## Interface & Code Contracts

### ES Module Structure
- All files under `src/` directory.
- `script.js` (Root) will be the main orchestrator/entrypoint module.
- We must make sure variables like `htmlElement` or utility functions are exported/imported cleanly.

### High-Frequency Listeners
- **Scroll listener for back-to-top**: should be throttled (e.g., limit execution to once every 100ms or 150ms).
- **Scroll listener for navbar scroll state**: should be throttled (e.g., limit execution to once every 100ms).

### DOM Iterations
- Replace `.forEach` or legacy loops on NodeLists (e.g. results of `querySelectorAll`) with `for...of` loops to align with requirements.
