# Handoff Report: Milestone 2 — Hover States and Layout Standardization

## 1. Observation

A detailed investigation was conducted on `style.css`, `tailwind.config.js`, all 9 HTML pages, and layout component files (`components/header.html`, `components/footer.html`) in the portfolio workspace. Below are the verbatim definitions, line references, and patterns observed.

### A. Custom Hover and Card Classes in `style.css`
Two custom CSS classes and their hover rules are defined in `style.css`:

1. **`.service-card` and `.service-card:hover` (Lines 161–174):**
   ```css
   /* Card Grid for Services */
   .service-card {
       border: 1px solid var(--border);
       background-color: var(--card);
       border-radius: 1rem;
       padding: 2rem;
       transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
   }
   .service-card:hover {
       transform: translateY(var(--hover-lift-offset));
       border-color: var(--accent);
       box-shadow: 0 10px 30px -10px var(--shadow-hover);
   }
   ```

2. **`.hover-lift` and `.hover-lift:hover` (Lines 190–198):**
   ```css
   /* Subtle Hover Animations */
   .hover-lift {
       transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
   }
   .hover-lift:hover {
       transform: translateY(var(--hover-lift-offset));
       box-shadow: 0 10px 30px -10px var(--shadow-hover);
   }
   ```

### B. Usages of `.service-card` and `.hover-lift` in HTML files
These classes are used exclusively inside `index.html`:

- **`.service-card`:** Used for 9 card elements inside the services grid:
  - Lines 165, 181, 197, 213, 229, 245, 261, 277, 293:
    `<div class="service-card group">`

- **`.hover-lift`:** Used for process steps, project cards, and review cards:
  - Process steps (Lines 377, 387, 397, 407):
    `<div class="relative p-6 border border-border bg-card rounded-2xl hover-lift group">`
  - Project/Work cards (Lines 432, 462, 492, 522, 552, 582, 612):
    `<div class="overflow-hidden rounded-lg border border-border shadow-lg hover-lift">`
  - Review cards (Lines 660, 683, 706, 729):
    `<div class="p-10 border border-border bg-card rounded-2xl hover-lift reveal delay-[...]">`

### C. Container and Wrapper Classes in HTML files
The wrapper `max-w-6xl` (corresponding to 72rem or 1152px) is used in multiple HTML files to constrain container widths:

- **`index.html`:**
  - Line 132: `<div class="container mx-auto max-w-6xl">` (About section)
  - Line 157: `<div class="container mx-auto max-w-6xl reveal">` (Services sub-section)
  - Line 369: `<div class="container mx-auto max-w-6xl reveal">` (Process section)
  - Line 421: `<div class="container mx-auto max-w-6xl reveal">` (Work/Projects section)
  - Line 652: `<div class="container mx-auto max-w-6xl reveal">` (Reviews section)
  - Line 854: `<div class="container mx-auto max-w-6xl pt-10 reveal">` (Contact section)
- **`blog.html`:**
  - Line 74: `<div class="container mx-auto max-w-6xl px-6">` (Blog listing container)

Additionally, narrower containers of `max-w-4xl` (56rem or 896px) are used for single-article / detailed pages to preserve reading readability:
- **`blog-*.html` (all 6 blog post detail pages):**
  - Line 74/78: `<div class="container mx-auto max-w-4xl px-6">`
- **`project-details.html`:**
  - Line 96: `<div class="container mx-auto max-w-4xl px-6">`
- **`index.html`:**
  - Line 756: `<div class="container mx-auto max-w-4xl reveal">` (FAQ section)

Other containers use standard `container mx-auto px-6` without max-width overrides:
- **`components/header.html`** Line 1: `<div class="container mx-auto px-6 flex ...">`
- **`components/footer.html`** Line 1: `<div class="container mx-auto flex ...">`
- **`index.html`** Line 97: `<div class="container mx-auto px-6 z-10 relative">` (Hero section)

---

## 2. Logic Chain

### A. Hover States Migration
1. **Replacement of `.service-card`:**
   - The base attributes are: border (`border border-border`), background (`bg-card`), border radius (`rounded-2xl`), and padding (`p-8`).
   - The transition is a custom cubic-bezier timing function (`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`).
   - The hover properties are: border color (`hover:border-accent`), translateY translation (`hover:translate-y-[var(--hover-lift-offset)]`), and box shadow (`hover:shadow-[0_10px_30px_-10px_var(--shadow-hover)]`).
   - By mapping these directly or extending the Tailwind configuration with custom theme objects (e.g. `'out-expo'` for the timing function and `'hover-lift'` for the shadow), we can replace the custom class completely with standard Tailwind utilities.
2. **Replacement of `.hover-lift`:**
   - Similarly, `.hover-lift` can be represented purely by inline classes: `transition-all duration-300 ease-out-expo hover:translate-y-[var(--hover-lift-offset)] hover:shadow-hover-lift` (using the extended config).

### B. Layout Standardization via `.container`
1. **Configuring `tailwind.config.js`:**
   - Setting `theme.container.center = true` instructs Tailwind to automatically apply `margin-left: auto; margin-right: auto;` to `.container`, making `mx-auto` redundant on all pages.
   - Setting `theme.container.padding = '1.5rem'` adds default horizontal padding to `.container` (equivalent to `px-6`), making `px-6` redundant on all containers.
   - Setting `theme.container.screens` to override values dynamically constraints the maximum width of the container. If we want it to cap at `1152px` (the exact width of `max-w-6xl`), we configure:
     ```javascript
     screens: {
         sm: '100%',
         md: '100%',
         lg: '1024px',
         xl: '1152px',
         '2xl': '1152px'
     }
     ```
     This keeps container widths at `100%` on mobile and tablets (`sm` and `md`), caps at `1024px` on desktop (`lg`), and caps at `1152px` on large screen sizes (`xl` and `2xl`). This matches the behavior of a `max-w-6xl` wrapper exactly.
2. **Simplifying HTML Elements:**
   - Once `.container` is configured, `<div class="container mx-auto max-w-6xl px-6">` and `<div class="container mx-auto max-w-6xl">` can both be simplified to `<div class="container">`.
   - Any custom wrappers configured for narrower pages (like `max-w-4xl` for blog posts) can be updated to `<div class="container max-w-4xl">` (as the custom `max-w-4xl` utility overrides the default container's width, while still benefiting from automatic centering and 1.5rem padding).
   - Parent `<section>` containers that had `px-6` to avoid container padding constraints (e.g. `<section class="... px-6">`) should have `px-6` removed to avoid doubling the horizontal padding on mobile devices.

---

## 3. Caveats

- **Narrow Layout Pages (`max-w-4xl`):**
  A global standardization to `.container` will default to `1152px` max-width. Care must be taken to explicitly add `max-w-4xl` to elements on the blog detail pages (`blog-*.html`), project details page, and FAQ section to prevent the text from stretching too wide, which reduces readability.
- **Double Padding on `<section>` elements:**
  Multiple sections (e.g. lines 131, 156, 368 in `index.html`) have `px-6` hardcoded on the `<section>` element, which wraps `<div class="container">`. If the new `.container` class automatically applies `padding: 1.5rem` (`px-6`), keeping `px-6` on the section will cause `3rem` total padding. The implementer must remove `px-6` from the parent `<section>` tags when updating the HTML files.
- **Custom Variables Reference:**
  The inline hover transition code relies on CSS custom properties `--hover-lift-offset` and `--shadow-hover` defined in `style.css`. These variables must remain active in `style.css` so that utility classes like `hover:translate-y-[var(--hover-lift-offset)]` continue to reference them correctly.

---

## 4. Conclusion

The custom stylesheet rules `.service-card` / `.service-card:hover` and `.hover-lift` / `.hover-lift:hover` can be completely eliminated from `style.css`.
Standardizing layout wrappers can be achieved cleanly by configuring the top-level `theme.container` key in `tailwind.config.js` and updating all 9 HTML files.

### Proposed Code Recommendations:

#### A. Refactoring `tailwind.config.js`
Update `tailwind.config.js` to include custom container styling, custom timing function, and custom shadow configuration:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./components/**/*.html",
        "./src/**/*.{ts,tsx,html,js}",
        "./script.js"
    ],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
            padding: '1.5rem',
            screens: {
                sm: '100%',
                md: '100%',
                lg: '1024px',
                xl: '1152px',
                '2xl': '1152px',
            },
        },
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
            },
            boxShadow: {
                'hover-lift': '0 10px 30px -10px var(--shadow-hover)',
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeUp: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(var(--reveal-offset, 30px))',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
            },
            animation: {
                'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            transitionDelay: {
                400: '400ms',
            }
        }
    },
    plugins: [],
};
```

#### B. Refactoring `style.css`
Remove the custom `.service-card`, `.service-card:hover`, `.hover-lift`, and `.hover-lift:hover` rules from `style.css`.
Keep the CSS variables definitions inside `:root` and `.dark` scopes, as they are referenced in the inline style configs.

#### C. HTML Replacement Mapping
Replace the custom classes in the HTML files according to the following mapping:

| Old HTML Markup | New Standardized Tailwind HTML Markup |
| --- | --- |
| `<div class="service-card group">` | `<div class="border border-border bg-card rounded-2xl p-8 transition-all duration-300 ease-out-expo hover:translate-y-[var(--hover-lift-offset)] hover:border-accent hover:shadow-hover-lift group">` |
| `<div class="... hover-lift ...">` | Add `transition-all duration-300 ease-out-expo hover:translate-y-[var(--hover-lift-offset)] hover:shadow-hover-lift` inline |
| `<div class="container mx-auto max-w-6xl">` | `<div class="container">` |
| `<div class="container mx-auto max-w-6xl px-6">` | `<div class="container">` |
| `<div class="container mx-auto max-w-6xl reveal">` | `<div class="container reveal">` |
| `<div class="container mx-auto max-w-4xl px-6">` | `<div class="container max-w-4xl">` |
| `<div class="container mx-auto px-6 ...">` | `<div class="container ...">` |
| `<div class="container mx-auto ...">` | `<div class="container ...">` |

*Note: Ensure to strip `px-6` from parent `<section>` containers (e.g. `<section class="py-20 px-6">` becomes `<section class="py-20">`) when container padding is activated in configuration.*

---

## 5. Verification Method

To verify the correct application of these changes:
1. **Compilation Check:**
   Run the stylesheet compiler to verify configuration integration and compile check output:
   `npm run build:css`
   Confirm that the build compiles successfully without errors, and that the compiled `tailwind.css` size is valid.
2. **Class Integration Check:**
   Open the generated `tailwind.css` file and verify that the `.container` class is generated with `margin-left: auto`, `margin-right: auto`, and custom padding rules:
   - For width constraints at breakpoints (e.g. `@media (min-width: 1024px) { .container { max-width: 1024px; } }` and `@media (min-width: 1280px) { .container { max-width: 1152px; } }`).
   - For custom shadows (e.g. `.shadow-hover-lift`).
   - For custom transition timing functions (e.g. `.ease-out-expo`).
3. **Visual Verification:**
   Launch the portfolio page in a browser and check:
   - Hovering over cards in the services section triggers a smooth `-5px` lift, accent border change, and light/dark theme-responsive shadow.
   - Hovering over process steps and project blocks triggers a smooth lift and shadow.
   - Maximizing screen size above `1152px` constraints the page margins on all pages, keeping elements centered with equal padding, matching the previous custom layout perfectly.
