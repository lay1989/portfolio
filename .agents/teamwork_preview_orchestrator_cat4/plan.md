# Plan: Tailwind Patterns (Category 4) Migration

We will execute the migration in three distinct milestones. Since we are a DISPATCH-ONLY orchestrator, we will spawn Explorer, Worker, and Reviewer subagents to perform the actual exploration, modification, and verification steps.

## Milestone 1: Native Tailwind Capabilities
1. **Explore**:
   - Query all occurrences of `.nav-scrolled`, `@keyframes fadeUp`, `.animate-fade-up`, `.delay-100`, `.delay-200`, `.delay-300`, `.delay-400` in the codebase.
   - Formulate exact replacements for CSS keyframes in `tailwind.config.js` and styling via data-attribute on the `<nav>` element.
2. **Implement**:
   - Update `src/nav.js` to change `data-scrolled` attribute on the `#navbar` element instead of toggling `nav-scrolled` class.
   - Modify `style.css` to delete `@keyframes fadeUp`, `.nav-scrolled`, `.delay-100`, `.delay-200`, `.delay-300`.
   - Update `tailwind.config.js` to define `fadeUp` keyframes and `fade-up` animation.
   - Update HTML files to use native Tailwind delay classes (`delay-100`, etc.) and data-[scrolled=true] styling.
3. **Verify**:
   - Run `npm run build:css` and ensure it compiles successfully.
   - Verify visually/functionally.

## Milestone 2: Hover States & Standardization
1. **Explore**:
   - Identify all usages of `.service-card`, `.service-card:hover`, `.hover-lift`, `.hover-lift:hover` in the CSS and HTML files.
   - Identify all usages of `max-w-6xl` in HTML and other files.
2. **Implement**:
   - Configure `.container` settings in `tailwind.config.js` (`center: true`, `padding: '1.5rem'`, and max-width screens capped at `1152px`).
   - Replace `container mx-auto max-w-6xl px-6` (or variation) with `container` in HTML files.
   - Replace `.service-card:hover` and `.hover-lift:hover` in `style.css` with native inline Tailwind hover/transition classes on target elements in HTML.
3. **Verify**:
   - Run `npm run build:css` and check compilation.

## Milestone 3: Validation and Forensic Integrity Audit
1. **Run Verification & Checks**:
   - Compile CSS and verify output file size and contents.
   - Launch local HTTP server and confirm that all pages render correctly and layout is identical.
   - Execute Forensic Auditor to ensure no cheating, no hardcoding, and complete replacement of custom utilities with Tailwind patterns.
