# CSS Build Step & Architecture Analysis Report (Milestone 2)

## Summary of Findings
1. **HTML Architecture**: The website consists of 9 static HTML pages in the root directory. They currently load the Tailwind CSS CLI v3 parser via CDN (`https://cdn.tailwindcss.com`) and a browser config file (`tailwind.config.js`). Custom styles are loaded via `./style.css`.
2. **Configuration**: Currently, no `package.json` exists in the workspace. A browser-based `tailwind.config.js` assigns configuration to `window.tailwind.config`.
3. **CSS Specificity and Magic Numbers**: `style.css` is loaded directly but does not follow Tailwind's specificity layers. In addition, there are 8 instances of translateY-based magic numbers (e.g., `translateY(30px)` and `translateY(-5px)`) in animations and hover effects.

---

## 1. Package Configuration (`package.json` & `postcss.config.js`)

To set up a local build environment, we recommend initializing a `package.json` file in the project root containing the necessary scripts and devDependencies.

### Proposed `package.json`
```json
{
  "name": "portfolio-website",
  "version": "1.0.0",
  "description": "Vanilla JS & Tailwind CSS Portfolio Website",
  "main": "script.js",
  "scripts": {
    "build:css": "tailwindcss -i ./style.css -o ./tailwind.css --minify",
    "watch:css": "tailwindcss -i ./style.css -o ./tailwind.css --watch"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4"
  }
}
```

### Proposed `postcss.config.js`
We recommend adding `postcss.config.js` to ensure Standard PostCSS processing, which makes the setup robust and compatible with future plugins:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

---

## 2. Tailwind Configuration Refactoring (`tailwind.config.js`)

The configuration needs to be refactored into a Node.js CommonJS module config. It must scan all root `.html` files and subfolder `.html` components to extract classes correctly.

### Refactored `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./components/**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
```

---

## 3. Stylesheet Refactoring (`style.css`)

The styles must be rewritten using Tailwind's `@tailwind` directive and layered with `@layer base`, `@layer components`, and `@layer utilities`. We will also replace the magic numbers with custom CSS variables declared in the `:root` and `.dark` scopes.

### Identified Magic Numbers to Replace:
| Line | Selector / Rule | Before | Proposed CSS Variable |
|---|---|---|---|
| 84 | `@keyframes fadeUp` | `translateY(30px)` | `var(--reveal-offset)` |
| 98 | `.reveal` | `translateY(30px)` | `var(--reveal-offset)` |
| 126 | `.hover-lift:hover` | `translateY(-5px)` | `var(--hover-offset)` |
| 151 | `.hamburger.active ...:nth-child(1)` | `translateY(8px)` | `var(--hamburger-offset)` |
| 160 | `.hamburger.active ...:nth-child(3)` | `translateY(-8px)` | `calc(-1 * var(--hamburger-offset))` |
| 183 | `.dark .theme-icon.sun` | `translateY(30px)` | `var(--theme-toggle-offset)` |
| 188 | `.theme-icon.moon` | `translateY(-30px)` | `calc(-1 * var(--theme-toggle-offset))` |
| 205 | `.service-card:hover` | `translateY(-5px)` | `var(--hover-offset)` |

### Complete Refactored `style.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    /* CSS Variables for Theming */
    :root {
        /* Base Palette Tokens */
        --color-white: #ffffff;
        --color-black: #080808;
        --color-gray-very-light: #f5f5f5;
        --color-gray-soft: #f0f0f0;
        --color-gray-muted: #666666;
        --color-gray-dark-muted: #999999;
        --color-gray-light-bg: #f2f2f2;
        --color-accent: #FF6B35;
        --color-border-light: #e5e5e5;
        
        --color-dark-card: #121212;
        --color-dark-muted: #1f1f1f;
        --color-dark-border: #262626;

        /* Component-specific & Effect Tokens */
        --navbar-bg: rgba(255, 255, 255, 0.8);
        --shadow-hover: rgba(0, 0, 0, 0.1);

        /* Semantic Variables Mapping (Light Mode) */
        --background: var(--color-white);
        --foreground: var(--color-black);
        --card: var(--color-gray-very-light);
        --card-foreground: var(--color-black);
        --primary: var(--color-black);
        --primary-foreground: var(--color-white);
        --secondary: var(--color-gray-soft);
        --secondary-foreground: var(--color-black);
        --muted: var(--color-gray-very-light);
        --muted-foreground: var(--color-gray-muted);
        --accent: var(--color-accent);
        --accent-foreground: var(--color-white);
        --border: var(--color-border-light);

        /* Animation & Layout Offsets */
        --reveal-offset: 30px;
        --theme-toggle-offset: 30px;
        --hover-offset: -5px;
        --hamburger-offset: 8px;
    }

    .dark {
        /* Component-specific & Effect Tokens (Dark Mode overrides) */
        --navbar-bg: rgba(8, 8, 8, 0.8);
        --shadow-hover: rgba(0, 0, 0, 0.5);

        /* Semantic Variables Mapping (Dark Mode) */
        --background: var(--color-black);
        --foreground: var(--color-gray-light-bg);
        --card: var(--color-dark-card);
        --card-foreground: var(--color-gray-light-bg);
        --primary: var(--color-white);
        --primary-foreground: var(--color-black);
        --secondary: var(--color-dark-muted);
        --secondary-foreground: var(--color-white);
        --muted: var(--color-dark-muted);
        --muted-foreground: var(--color-gray-dark-muted);
        --accent: var(--color-accent);
        --accent-foreground: var(--color-white);
        --border: var(--color-dark-border);
    }

    /* Smooth Scrolling */
    html {
        scroll-behavior: smooth;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
    }
    ::-webkit-scrollbar-track {
        background: var(--background);
    }
    ::-webkit-scrollbar-thumb {
        background: var(--muted-foreground);
        border-radius: 4px;
        opacity: 0.5;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: var(--accent);
    }
}

@layer components {
    /* Animation Components / Classes */
    .reveal {
        opacity: 0;
        transform: translateY(var(--reveal-offset));
        transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .reveal.active {
        opacity: 1;
        transform: translateY(0);
    }

    /* Navbar Blur */
    .nav-scrolled {
        background-color: var(--navbar-bg);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
    }

    /* Subtle Hover Animations */
    .hover-lift {
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hover-lift:hover {
        transform: translateY(var(--hover-offset));
        box-shadow: 0 10px 30px -10px var(--shadow-hover);
    }

    /* Hamburger Menu Animation */
    .hamburger {
        width: 24px;
        height: 24px;
        position: relative;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        z-index: 60;
    }

    .hamburger-line {
        width: 100%;
        height: 2px;
        background-color: var(--foreground);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: center;
    }

    .hamburger.active .hamburger-line:nth-child(1) {
        transform: translateY(var(--hamburger-offset)) rotate(45deg);
    }

    .hamburger.active .hamburger-line:nth-child(2) {
        opacity: 0;
        transform: translateX(-10px);
    }

    .hamburger.active .hamburger-line:nth-child(3) {
        transform: translateY(calc(-1 * var(--hamburger-offset))) rotate(-45deg);
    }

    /* Theme Toggle Animation */
    .theme-toggle-wrapper {
        position: relative;
        width: 20px;
        height: 20px;
        overflow: hidden;
    }

    .theme-icon {
        position: absolute;
        top: 0;
        left: 0;
        transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .theme-icon.sun {
        transform: translateY(0) rotate(0);
        opacity: 1;
    }
    .dark .theme-icon.sun {
        transform: translateY(var(--theme-toggle-offset)) rotate(90deg);
        opacity: 0;
    }

    .theme-icon.moon {
        transform: translateY(calc(-1 * var(--theme-toggle-offset))) rotate(-90deg);
        opacity: 0;
    }
    .dark .theme-icon.moon {
        transform: translateY(0) rotate(0);
        opacity: 1;
    }

    /* Card Grid for Services */
    .service-card {
        border: 1px solid var(--border);
        background-color: var(--card);
        border-radius: 1rem;
        padding: 2rem;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .service-card:hover {
        transform: translateY(var(--hover-offset));
        border-color: var(--accent);
        box-shadow: 0 10px 30px -10px var(--shadow-hover);
    }
}

@layer utilities {
    @keyframes fadeUp {
        from {
            opacity: 0;
            transform: translateY(var(--reveal-offset));
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-up {
        animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Staggered Animation Delays */
    .delay-100 { transition-delay: 100ms; }
    .delay-200 { transition-delay: 200ms; }
    .delay-300 { transition-delay: 300ms; }
}
```

---

## 4. HTML Modifications

In all 9 HTML files, the Tailwind CDN scripts should be removed, and the stylesheet reference must be updated from `style.css` to `tailwind.css`.

### Targeted HTML Files:
1. `index.html`
2. `blog.html`
3. `blog-custom-websites.html`
4. `blog-freelance-developer.html`
5. `blog-javascript-frameworks.html`
6. `blog-performance-optimization.html`
7. `blog-responsive-design.html`
8. `blog-seo-developers.html`
9. `project-details.html`

### Diffs for HTML Replacements:

#### A. Removal of CDN Scripts
Replace:
```html
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="tailwind.config.js"></script>
```
With:
```html
    <!-- Tailwind CSS (compiled stylesheet loaded below) -->
```

#### B. Stylesheet Path Update
Replace:
```html
    <!-- Custom Styles -->
    <link rel="stylesheet" href="./style.css">
```
With:
```html
    <!-- Custom Styles -->
    <link rel="stylesheet" href="./tailwind.css">
```
