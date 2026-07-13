# Changes Made

This document outlines the changes made to implement **Category 2 - Milestone 2: CSS Build Step & Architecture (R1)**.

## 1. Created `package.json`
- **Location**: `/package.json`
- **Details**:
  - Name: `lay-shah-portfolio`
  - Version: `1.0.0`
  - devDependencies: `tailwindcss` (`^3.4.4`), `postcss` (`^8.4.38`), `autoprefixer` (`^10.4.19`)
  - Scripts:
    - `build:css`: `tailwindcss -i ./style.css -o ./tailwind.css --minify`
    - `watch:css`: `tailwindcss -i ./style.css -o ./tailwind.css --watch`

## 2. Refactored `tailwind.config.js`
- **Location**: `/tailwind.config.js`
- **Details**: Converted the browser-level runtime configuration into a standard Node.js CommonJS module config.
- **Content Paths**:
  - Added `./*.html` (root HTML files)
  - Added `./components/**/*.html` (components)
  - Added `./script.js` (JavaScript interactions)
  - Added `./src/**/*.{ts,tsx,html,js}` (source directory)

## 3. Refactored `style.css` Architecture
- **Location**: `/style.css`
- **Details**:
  - Organised custom styling into Tailwind layers (`@layer base`, `@layer components`, `@layer utilities`).
  - Added standard directives `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` at the top level.
  - Parameterised layout and animation magic numbers by introducing descriptive CSS variables under `:root` and `.dark`:
    - `--reveal-offset: 30px;` (for scroll-reveal animations)
    - `--theme-toggle-offset: 30px;` (for theme toggle icon translation)
    - `--hover-lift-offset: -5px;` (for card/hover transitions)
    - `--hamburger-translate: 8px;` (for hamburger icon transforms)
  - Keyframe animations, hover lifts, hamburger, theme toggles, and card styles now reference these variables.

## 4. Decoupled HTML Files from CDN and Browser Config
- **Files Modified**:
  1. `index.html`
  2. `blog.html`
  3. `project-details.html`
  4. `blog-custom-websites.html`
  5. `blog-freelance-developer.html`
  6. `blog-javascript-frameworks.html`
  7. `blog-performance-optimization.html`
  8. `blog-responsive-design.html`
  9. `blog-seo-developers.html`
- **Details**:
  - Removed Tailwind CDN script tag: `<script src="https://cdn.tailwindcss.com"></script>`
  - Removed browser-level Tailwind config script tag: `<script src="tailwind.config.js"></script>`
  - Replaced `<link rel="stylesheet" href="./style.css">` with `<link rel="stylesheet" href="./tailwind.css">`
