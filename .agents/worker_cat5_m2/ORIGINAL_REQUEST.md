## 2026-06-20T02:41:13Z

You are a teamwork_preview_worker. Your role is to implement the changes specified in Category 5 ("Web Design Guidelines").
Your working directory is: c:\Users\SHREE\Desktop\portfolio\.agents\worker_cat5_m2

### Mandatory Files to Update:
- package.json
- tailwind.config.js
- components/header.html
- components/footer.html
- src/nav.js
- src/components.js
- index.html
- blog.html
- project-details.html
- All blog article files: blog-custom-websites.html, blog-freelance-developer.html, blog-javascript-frameworks.html, blog-performance-optimization.html, blog-responsive-design.html, blog-seo-developers.html

### Detailed Tasks:
1. **Typography Plugin Integration**:
   - Add `"@tailwindcss/typography": "^0.5.13"` to `devDependencies` in `package.json`.
   - Run `npm install` in the workspace directory.
   - Register `require('@tailwindcss/typography')` inside the `plugins` array of `tailwind.config.js`.

2. **Responsive Typography Scale Refactor**:
   - In `index.html`:
     - About Me H2 heading (line 135): Change `text-xl font-medium text-muted-foreground sticky top-24` to `text-lg md:text-xl font-medium text-muted-foreground sticky top-24`.
     - FAQ H2 heading (line 758): Change `text-4xl md:text-6xl font-display font-bold mb-6` to `text-4xl md:text-5xl font-display font-bold mb-6`.
     - Contact H2 heading (line 857): Change `text-4xl md:text-6xl font-display font-bold mb-8` to `text-4xl md:text-5xl font-display font-bold mb-8`.
     - Service Card H3 headings (lines 169, 185, 201, 217, 233, 249, 265, 281, 297): Change `text-2xl font-bold mb-4` to `text-xl md:text-2xl font-bold mb-4`.
     - Process Step H3 headings (lines 382, 392, 402, 412): Change `text-xl font-bold mb-3` to `text-lg md:text-xl font-bold mb-3`.
     - FAQ item H3 questions (lines 770, 783, 796, 809, 822, 835): Change `text-xl font-bold mb-4` to `text-lg md:text-xl font-bold mb-4`.
   - In `blog.html`:
     - Blog post card H2 headings (lines 91, 110, 129, 148, 167, 186): Change `text-xl font-bold mb-3` to `text-lg md:text-xl font-bold mb-3`.
     - Stay Updated newsletter H2 heading (line 198): Change `text-3xl font-display font-bold mb-4` to `text-2xl md:text-3xl font-display font-bold mb-4`.
   - In `project-details.html` (inside template string `content`):
     - Detail Grid H3 headings (lines 713, 717, 721): Change `text-lg font-bold mb-2` to `text-base md:text-lg font-bold mb-2`.
     - Section H2 headings (lines 730, 743, 762, 784, 804, 821, 845, 867, 882): Change `text-3xl md:text-4xl font-display font-bold mb-8` to `text-4xl md:text-5xl font-display font-bold mb-8`.

3. **Hover Micro-Animations & Easing upgrade**:
   - Transition duration/curve: Add `duration-300 ease-out-expo` to all elements transitioning with `transition-colors`, `transition-all`, or `transition-transform`.
   - Apply to desktop links, mobile links, buttons, social links, theme toggles, back-to-top button, blog cards, back buttons, and input borders in:
     - `components/header.html`
     - `components/footer.html`
     - `index.html`
     - `blog.html`
     - `project-details.html`
     - All 6 blog-*.html article pages (specifically nav and back links).
   - In `index.html`:
     - Target projects link hover arrow: add `duration-300 ease-out-expo` to the arrow's `transition-transform`.
     - Contact Me button hover: add `duration-300 ease-out-expo`.
     - Load More button: replace `transition-all duration-300` with `transition-all duration-300 ease-out-expo`, and add `group-hover:translate-y-1 transition-transform duration-300 ease-out-expo` to the arrow icon.
     - Contact form inputs: replace `transition-colors` with `transition-all duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none`.
   - In `blog.html`:
     - Read More link arrows: add `duration-300 ease-out-expo` to the arrow's `transition-transform`.
   - In `src/components.js`:
     - In `initLoadMoreProjects()`, apply `animate-fade-up` to newly loaded elements when changing `display` from `none` to `block`.

4. **Mobile Menu CSS Transition**:
   - In `components/header.html`:
     - Remove `hidden` from the mobile menu div (line 54) and replace its classes with:
       `absolute top-full left-0 w-full bg-background border-b border-border p-6 flex md:hidden flex-col gap-4 shadow-lg opacity-0 pointer-events-none -translate-y-4 transition-all duration-300 ease-out-expo [&.open]:opacity-100 [&.open]:translate-y-0 [&.open]:pointer-events-auto`
   - In `src/nav.js`:
     - Change the mobile menu click handler from toggling `hidden` and `flex` classes to toggling `open` class on `mobileMenu`. Update the click handler for links inside the menu to remove `open` instead of adding `hidden`.

5. **Contact Form Accessibility & HTML5 constraints**:
   - In `index.html`:
     - Refactor the honeypot: replace `<p style="display: none;">` wrapper with `<div class="hidden" aria-hidden="true">` containing `<label for="contact-bot-field">` and `<input id="contact-bot-field" name="bot-field" tabindex="-1" autocomplete="off">`.
     - Map labels to inputs: set matching `for="..."` and `id="..."` attributes on the name, email, and project fields (e.g. `contact-name`, `contact-email`, `contact-project`).
     - Set `name="name"`, `name="email"`, and `name="project"` so that they serialize.
     - Add `autocomplete="name"` on the name input and `autocomplete="email"` on the email input.
     - Add `minlength` and `maxlength` properties: name `minlength="2" maxlength="50"`, email `maxlength="100"`, project textarea `minlength="10" maxlength="1000"`.
     - Add `aria-required="true"` to name, email, and project inputs.
     - Insert a `<div id="form-status" class="hidden rounded-xl p-4 text-sm font-medium" role="status" aria-live="polite"></div>` alert container inside the form, right above the submit button.
     - Add `id="submit-btn"` to the submit button.
   - In `src/components.js`:
     - Refactor `initContactForm()` to disable the submit button and show "Sending..." during POST fetch.
     - Inject styled success or failure status messages into `#form-status` dynamically instead of showing native `alert()` popups. Clear form and reset states upon success.

6. **Build & Verify**:
   - Run `npm run build:css` to compile output CSS.
   - Run `node verify-changes.js` to ensure script integrity and lack of errors.
