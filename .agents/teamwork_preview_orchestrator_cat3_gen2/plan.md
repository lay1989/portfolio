# Plan: Portfolio Website Category 3 (JavaScript Pro) Integration

## Architecture & Requirements Reference
- **ES Modules & Modularity (R2)**:
  - Monolithic `script.js` split into modules under `src/`:
    - `src/utils.js`: Utility functions (throttle, debounce).
    - `src/theme.js`: Light/dark mode theme toggling and state (cached `document.documentElement`).
    - `src/nav.js`: Link rewrites, page active highlight, mobile menu interaction, back-to-top button, navbar scroll effects.
    - `src/animations.js`: Scroll reveal logic using IntersectionObserver.
    - `src/components.js`: Component fetching (dynamic headers/footers) and dynamic injection.
    - `script.js` (Root): Main entry point coordinating imports.
  - All HTML files updated to load `script.js` as `<script type="module" src="./script.js"></script>`.
- **Performance & Encapsulation (R1)**:
  - Cache DOM elements to avoid redundant query overhead in high-frequency handlers or loop iterations.
  - Implement a `throttle` helper and throttle high-frequency scroll listeners (back-to-top visibility and navbar scrolled state).
  - Modernize loop iterations by replacing legacy loop structures (e.g. `.forEach`) with modern `for...of` loops.
  - Clean encapsulation in ES modules (no global variables leaked, `window` properties kept clean).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Planning | Initialize planning artifacts and start heartbeat cron. | None | DONE |
| 2 | Implementation of R1 & R2 | Implement performance optimizations (caching, throttling, modern loops) and ES module structure. Update HTML scripts. | M1 | DONE |
| 3 | Review & QA | Spawn fresh reviewer and challenger subagents to perform code review and verify the implementation (verifying throttled scroll listeners, ES module loading, cached DOM elements, loop modernization, and lack of global namespace leaks). | M2 | DONE |
| 4 | Final Verification & Forensic Audit | Spawn Forensic Auditor to verify integrity and compile completion report. | M3 | DONE |
