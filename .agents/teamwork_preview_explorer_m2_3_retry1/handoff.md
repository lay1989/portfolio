# Handoff Report - Dark Mode FOUC Analysis

## 1. Observation
We observed the following across the workspace codebase:
* **HTML Setup**: All 9 HTML files (e.g. `index.html`, `blog.html`, etc.) hardcode the theme as light in the root HTML tag:
  ```html
  <html lang="en" class="light">
  ```
  *(Observed in `index.html:2` and `blog.html:2`)*
* **Script Placement**: `script.js` is loaded at the bottom of the body tag in all 9 HTML files:
  ```html
  <!-- Scripts -->
  <script src="./script.js"></script>
  ```
  *(Observed in `index.html:924` and `blog.html:288`)*
* **Body Classes**: The body element of HTML files contains the color transition class:
  ```html
  <body class="bg-background text-foreground antialiased transition-colors duration-300">
  ```
  *(Observed in `index.html:95`)*
* **Broken Theme Initialization**: Inside `script.js` (lines 8-18), the theme check checks `localStorage` and system preference but has a nested logic bug:
  ```javascript
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      if (savedTheme === 'dark') {
          htmlElement.classList.add('dark');
      } else {
          htmlElement.classList.remove('dark');
      }
  } else {
      htmlElement.classList.remove('dark');
  }
  ```
* **Navbar Style Manipulation**: In `script.js` (lines 55-70), the scrolled navbar background color is set via inline style overrides inside the scroll event listener:
  ```javascript
  if(htmlElement.classList.contains('dark')) {
      navbar.style.backgroundColor = 'rgba(8, 8, 8, 0.8)';
  } else {
      navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  }
  ```
* **CSS Variable Setup**: In `style.css` (lines 90-96), the scrolled navbar is styled using:
  ```css
  .nav-scrolled {
      background-color: rgba(var(--background), 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding-top: 1rem !important;
      padding-bottom: 1rem !important;
  }
  ```
  However, `--background` is defined as a hex color `#ffffff` in `:root` and `#080808` in `.dark` (lines 4 and 21), which is invalid syntax inside `rgba()`.

---

## 2. Logic Chain
1. Because `class="light"` is hardcoded on `<html>` and the logic script `script.js` is loaded at the bottom of the `<body>`, the browser initially renders the page in light mode.
2. Once the browser parses the bottom of the page and executes `script.js`, it determines if dark mode should be applied. If it adds the `.dark` class to `<html>`, the body's `transition-colors duration-300` class triggers a transition from light mode (white background) to dark mode (black background), resulting in a visible **Flash of Unstyled Content (FOUC)**.
3. The nested condition in `script.js` checks `if (savedTheme === 'dark')` inside a block that is also entered when `!savedTheme && prefersDark` is true. If `savedTheme` is null but the system prefers dark mode, the script enters the outer block and then executes the inner `else` block, removing the `.dark` class. This completely breaks system-level preference detection on initial load.
4. Because `--background` is a hex value, `rgba(var(--background), 0.8)` is invalid and rejected by the browser. To work around this, the developer used inline JavaScript styles to change `navbar.style.backgroundColor` on scroll. However, this inline style does not update when the theme is toggled unless the user scrolls again, leading to a theme mismatch for the scrolled navbar.
5. Putting an inline `<script>` in the `<head>` of all HTML files to check `localStorage`/prefers-color-scheme and apply the correct theme class (`dark` or `light`) resolves the FOUC because it runs before the browser starts rendering the `<body>`. Correcting the conditional blocks in `script.js` and shifting the navbar styling to CSS variables resolves the logic and scroll background mismatch bugs.

---

## 3. Caveats
- No caveats. The HTML layout and JS files are fully self-contained static assets, with no external package managers, bundlers, or server-side rendering.

---

## 4. Conclusion
The FOUC is caused by the delayed execution of the theme-setting script (`script.js` at the bottom of HTML files) acting on a hardcoded `<html class="light">` element. A secondary logic bug in `script.js` breaks system dark mode detection for first-time visitors, and a scrolled navbar styling bug leaves the scrolled navbar un-themed when toggled.

The issues can be resolved cleanly by:
1. Adding an inline `<script>` to the `<head>` of all 9 HTML files to immediately apply the theme.
2. Correcting the conditional initialization checks and theme toggles in `script.js`.
3. Defining a custom `--navbar-bg` variable in `style.css` and using it in `.nav-scrolled` to avoid inline style manipulation.

---

## 5. Verification Method
Since this is a static website with no local testing framework, verification must be performed manually in a web browser:
1. **Verify No FOUC**: Open any HTML page in a browser with dark mode enabled/selected. Reload the page. Verify that there is no flash of white background or sun-to-moon icon animation during loading.
2. **Verify System Preference**: Clear `localStorage` (run `localStorage.clear()` in console). Set your OS/browser system preference to Dark Mode. Load the page. Verify that the page loads in dark mode. Repeat with system preference set to Light Mode and verify that the page loads in light mode.
3. **Verify Scrolled Navbar**: Scroll down the page until the navbar background changes. Toggle the theme button. Verify that the navbar background color instantly matches the active theme without needing another scroll action.
