# Category 6 Layout Integrity Test Plan

This document outlines the adversarial testing steps to verify visual and code integrity of the Category 6 layout changes.

## Verification Steps

### 1. Compile CSS and Verify Build Success
- **Action**: Run `npm run build:css` (or `npx tailwindcss -i ./style.css -o ./tailwind.css --minify`).
- **Verifiable Outcome**: The command must compile the CSS successfully without errors and generate `tailwind.css`.

### 2. Verify Horizontal Scroll Prevention on Mobile Viewports
- **Action**: Inspect all 9 HTML files (`index.html`, `blog.html`, `project-details.html`, and 6 blog post detail files).
- **Verifiable Outcome**: The `<body>` element in all 9 files must contain the `overflow-x-hidden` class.

### 3. Verify Navbar Subtle Glassmorphism
- **Action**: Check the navigation bar element `<nav id="navbar">` class definition across all 9 HTML files.
- **Verifiable Outcome**: The attribute `data-[scrolled=true]:backdrop-blur-sm` must be present instead of `data-[scrolled=true]:backdrop-blur-md` to apply subtle glassmorphism on scroll.

### 4. Verify Service Card Icon Design & Contrast
- **Action**: Inspect the "What I Can Do For You" section in `index.html`.
- **Verifiable Outcome**:
  - The 9 service cards must have their icons wrapped in a contrast badge: `w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent`.
  - Icon elements must be shrunk to `w-6 h-6`.

### 5. Verify Border-Radius Consistency
- **Action**: Inspect border-radius values in `index.html` and `project-details.html`.
- **Verifiable Outcome**:
  - Main cards (e.g. project items, testomonials, process steps) must have `rounded-2xl`.
  - Project thumbnail images/wrappers must have `rounded-xl`.
  - Buttons and circular shapes must have `rounded-full`.

### 6. Verify Line-Height and Typography Readability
- **Action**: Inspect `style.css` and `blog.html` for line-height definitions.
- **Verifiable Outcome**:
  - Global base rules must override `.prose p, .prose li, .prose blockquote` to set line-height to `1.75`.
  - Intro and blog post cards in `blog.html` must utilize `leading-relaxed` for excerpt text.

### 7. Perform Stress Testing for Potential Bugs & Regressions
- **Action**: Evaluate the compiled output and logic implementation.
- **Verifiable Outcome**: Check for:
  - Specifity issues (like base line-heights overriding typography size styles like `.prose-lg`).
  - CORS/Dynamic fetch issues when viewing static HTML pages locally using `file://` protocol.
  - Inverted light/dark theme classes in the contact form submit response handler.
  - Inconsistencies in border-radius inside detail pages (`blog-*.html` callouts).
