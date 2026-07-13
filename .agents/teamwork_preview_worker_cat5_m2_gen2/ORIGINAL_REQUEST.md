## 2026-06-20T07:21:41Z

You are teamwork_preview_worker.
Your working directory is: c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_cat5_m2_gen2
Please load the skill c:\Users\SHREE\Desktop\portfolio\.agents\skills\portfolio-guidelines\SKILL.md.

We are executing Category 5 ("Web Design Guidelines"). Your task is to implement the following changes:

1. **Tailwind Config Extensions (`tailwind.config.js`)**:
   - Add a premium cubic-bezier ease curve in transition timing functions, e.g. `'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)'`.

2. **Update Components Header (`components/header.html`)**:
   - Apply transition-all duration-300 ease-out-expo (or equivalent utility) to desktop menu links, theme toggles, and buttons.
   - Refactor the mobile menu container: replace the toggled `hidden`/`flex` layout with a CSS-transitioned layout using: `flex md:hidden opacity-0 pointer-events-none -translate-y-4 transition-all duration-300 ease-out-expo [&.open]:opacity-100 [&.open]:translate-y-0 [&.open]:pointer-events-auto`.
   - Add transition classes to mobile menu links.

3. **Update Mobile Menu Controller (`src/nav.js`)**:
   - Update the mobile menu toggler code so it toggles the `open` class on the mobile menu element (`mobileMenu.classList.toggle('open')`) rather than class toggles of `hidden`/`flex`.
   - Ensure the cached DOM elements check is maintained (do not do direct document queries inside `handleScroll`).

4. **Update Styles (`style.css`)**:
   - Add transition support to `::-webkit-scrollbar-thumb:hover` or scrollbar animations to make it smooth.

5. **Update Home Page (`index.html`)**:
   - Ensure Frequently Asked Questions and Contact section H2 headings use the responsive typography scale: `text-4xl md:text-5xl`.
   - Add responsive text classes (e.g. using `md:` responsive prefixes) to Service cards, Process steps, and FAQ item H3 headings.
   - In the contact form, ensure label mapping is correct (e.g., label has `for="..."` matching the input's `id`).
   - Add `name="name"`, `name="email"`, and `name="message"`/`name="project"` to the respective form inputs. Add `aria-required="true"`.
   - Add a status element right above the submit button:
     `<div id="contact-status" class="hidden text-sm font-medium rounded-lg p-4 mt-4" role="status" aria-live="polite"></div>`.

6. **Update Form JS Handling (`src/components.js`)**:
   - In `initContactForm()`, replace native window `alert()` notifications with DOM updates to the `#contact-status` element. Show success with green styling, or show failure with red styling. Ensure it transitions smoothly or displays clearly.

7. **Update Other Pages (`blog.html`, `project-details.html`, and `blog-*.html` files)**:
   - Check and adjust headings to have responsive and consistent typographic scales.
   - Apply transitions to links, buttons, and list cards.

8. **Clean up Comment References**:
   - `verify-changes.js` checks that there are no `.forEach` strings in target JS files. However, it fails if comment blocks contain the string `.forEach`.
   - Scan `src/theme.js`, `src/nav.js`, and `src/components.js`, and edit/rewrite any comment blocks that contain the text `.forEach` (change it to `for...of` or rewrite the description) so that the `loopModernization` check in `verify-changes.js` passes.

9. **Build and Verify**:
   - Run `npm run build:css` to compile the CSS.
   - Run `node verify-changes.js` to ensure all tests pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document your changes and write handoff.md in your working directory. Notify when done.
