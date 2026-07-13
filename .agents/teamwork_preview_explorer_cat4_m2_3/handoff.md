# Handoff Report: Milestone 2 — Hover States and Layout Standardization

## 1. Observation

### Custom Hover Classes in `style.css`
In `style.css` (lines 161–174 and 190–198), the following custom styles are defined:
```css
161:     /* Card Grid for Services */
162:     .service-card {
163:         border: 1px solid var(--border);
164:         background-color: var(--card);
165:         border-radius: 1rem;
166:         padding: 2rem;
167:         transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
168:     }
169:     .service-card:hover {
170:         transform: translateY(var(--hover-lift-offset));
171:         border-color: var(--accent);
172:         box-shadow: 0 10px 30px -10px var(--shadow-hover);
173:     }
...
190:     /* Subtle Hover Animations */
191:     .hover-lift {
192:         transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
193:     }
194:     .hover-lift:hover {
195:         transform: translateY(var(--hover-lift-offset));
196:         box-shadow: 0 10px 30px -10px var(--shadow-hover);
197:     }
```
CSS variables mapping these visual values are defined in `:root` (lines 25, 38, 45) and `.dark` (line 52):
```css
--accent: var(--color-accent); /* #FF6B35 */
--hover-lift-offset: -5px;
--shadow-hover: rgba(0, 0, 0, 0.1); /* Light Mode */
--shadow-hover: rgba(0, 0, 0, 0.5); /* Dark Mode (line 52) */
```

### Usage of Hover Classes in HTML Files
Grep searches confirmed that these hover styles are only referenced in `index.html`:
*   **`.service-card`**: Used 9 times inside `index.html` (lines 165, 181, 197, 213, 229, 245, 261, 277, 293) on service item cards:
    ```html
    <div class="service-card group">
    ```
*   **`.hover-lift`**: Used 15 times inside `index.html`:
    *   Lines 377, 387, 397, 407 (Process Section steps):
        ```html
        <div class="relative p-6 border border-border bg-card rounded-2xl hover-lift group">
        ```
    *   Lines 432, 462, 492, 522, 552, 582, 612 (Project item wrapper divs):
        ```html
        <div class="overflow-hidden rounded-lg border border-border shadow-lg hover-lift">
        ```
    *   Lines 660, 683, 706, 729 (Experience/Education card items):
        ```html
        <div class="p-10 border border-border bg-card rounded-2xl hover-lift reveal delay-100">
        ```

### Layout Wrapper Usages (`max-w-6xl`)
Grep searches located `max-w-6xl` containers across multiple pages:
*   `blog.html` (line 74):
    ```html
    <div class="container mx-auto max-w-6xl px-6">
    ```
*   `index.html` (lines 132, 157, 369, 421, 652, 854):
    ```html
    <div class="container mx-auto max-w-6xl">
    ```
    *(Note: All sections surrounding these `index.html` containers have `px-6` applied directly to the parent `<section>` element, e.g., `<section class="py-20 px-6">` on line 156.)*

*   **Narrower Layouts (`max-w-4xl` = `896px`)**:
    Blog detail posts (`blog-custom-websites.html` line 74, `blog-freelance-developer.html` line 74, `blog-javascript-frameworks.html` line 78, etc.) and specific sections (such as contact section in `index.html` line 756) utilize `container mx-auto max-w-4xl px-6`.

---

## 2. Logic Chain

### Hover States Migration
1.  **Direct Mapping**:
    *   `border: 1px solid var(--border)` maps directly to Tailwind's `border border-border`.
    *   `background-color: var(--card)` maps directly to `bg-card`.
    *   `border-radius: 1rem` maps directly to `rounded-2xl` (which translates to `1rem`).
    *   `padding: 2rem` maps directly to `p-8` (which translates to `2rem`).
2.  **Encapsulating Custom Effects in `tailwind.config.js`**:
    *   Rather than utilizing long, repetitive inline arbitrary values (e.g., `ease-[cubic-bezier(0.16,1,0.3,1)]` and `shadow-[0_10px_30px_-10px_var(--shadow-hover)]`), extending the Tailwind CSS configuration is the cleanest design pattern.
    *   Adding `'out-expo'` under `transitionTimingFunction` compiles to the identical cubic-bezier function.
    *   Adding `'hover-lift'` under `boxShadow` compiles to the identical shadow syntax incorporating CSS theme variables.
    *   Adding `'hover-lift'` under `translate` compiles to `var(--hover-lift-offset)`.
3.  **Inline Replacement**:
    *   `.service-card` becomes `border border-border bg-card rounded-2xl p-8 transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift`.
    *   `.hover-lift` becomes `transition-all duration-300 ease-out-expo hover:translate-y-hover-lift hover:shadow-hover-lift`.
    *   This replacement successfully eliminates `.service-card` and `.hover-lift` CSS rule declarations and allows compiling them entirely via Tailwind.

### Layout Wrapper Standardization
1.  **Tailwind `.container` Behavior**:
    *   By default, Tailwind's `.container` utility does not center itself, has no padding, and expands up to `1536px` on `2xl` viewports.
    *   Adding a `container` key directly under `theme` in `tailwind.config.js` with `center: true` automatically adds horizontal auto margins.
    *   Adding `padding: '1.5rem'` adds default `1.5rem` (`px-6`) padding globally to all containers, removing the necessity of manually adding `px-6` to layouts or wrapping sections.
    *   Overriding `screens` under `container` lets us control the container's max-width for each viewport independently. Specifying `xl: '1152px'` and `'2xl': '1152px'` caps the max-width of `.container` at `1152px` (matching `max-w-6xl` / `72rem`) on screen sizes larger than `1280px`.
2.  **Simplifying HTML Pages**:
    *   With the configuration updated, standard wrappers like `<div class="container mx-auto max-w-6xl px-6">` or `<div class="container mx-auto max-w-6xl">` simplify down to `<div class="container">`.
    *   For narrower content layouts (e.g., blog pages using `max-w-4xl`), `<div class="container mx-auto max-w-4xl px-6">` simplifies down to `<div class="container max-w-4xl">`. This works because inline max-width utilities override the default container breakpoint max-widths configured in Tailwind.
    *   Horizontal padding (`px-6`) on surrounding `<section>` elements can be removed where containers are used, as the container itself will now natively provide that padding to prevent text from touching screen edges.

---

## 3. Caveats

*   **Custom Transition Scope**: Changing custom transition property definitions from `transition: transform 0.3s cubic-bezier(...), box-shadow 0.3s cubic-bezier(...)` to Tailwind's `transition-all` will also transition background-color and borders. In modern browsers, this has no performance penalty and actually improves visual transitions if border color changes (such as on `.service-card`).
*   **Existing Section Padding**: Care must be taken during implementation to remove `px-6` padding on the parent `<section>` tags when `.container` starts providing it, otherwise it could lead to double-padding (`3rem` or `48px` total) on mobile.

---

## 4. Conclusion

1.  **Hover States**: Custom hover styles in `style.css` can be entirely deleted and replaced with inline Tailwind utilities. By extending `tailwind.config.js` with `out-expo` (easing), `hover-lift` (shadow), and `hover-lift` (translation), class names remain clean, semantic, and maintainable.
2.  **Container Configuration**: Standardizing the `.container` in `tailwind.config.js` allows us to strip `mx-auto max-w-6xl px-6` from the HTML. Narrower pages can override this width natively using `max-w-4xl`.

### Proposed Changes

#### Tailwind Configuration (`tailwind.config.js`)
Update `tailwind.config.js` to look like this:
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
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            boxShadow: {
                'hover-lift': '0 10px 30px -10px var(--shadow-hover)',
            },
            translate: {
                'hover-lift': 'var(--hover-lift-offset)',
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

#### Custom CSS (`style.css`)
Remove the following selectors from `style.css`:
*   `.service-card` (lines 162-168)
*   `.service-card:hover` (lines 169-173)
*   `.hover-lift` (lines 191-193)
*   `.hover-lift:hover` (lines 194-197)

#### HTML files
1.  **Service Cards (`index.html`)**:
    Change `class="service-card group"` to:
    ```html
    class="border border-border bg-card rounded-2xl p-8 transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group"
    ```
2.  **Hover Lifts (`index.html`)**:
    Change `class="... hover-lift ..."` to:
    ```html
    class="... transition-all duration-300 ease-out-expo hover:translate-y-hover-lift hover:shadow-hover-lift ..."
    ```
3.  **Layout Wrappers**:
    *   Replace `<div class="container mx-auto max-w-6xl">` with `<div class="container">`
    *   Replace `<div class="container mx-auto max-w-6xl px-6">` with `<div class="container">`
    *   Replace `<div class="container mx-auto max-w-4xl px-6">` with `<div class="container max-w-4xl">`
    *   Remove `px-6` from parent `<section>` wrapper elements that contain `.container` elements.

---

## 5. Verification Method

To verify these changes after implementation:
1.  **Build Command**:
    Execute `npm run build:css` to verify that Tailwind CSS compiles without syntax errors and creates the updated `tailwind.css` bundle containing the new custom utility classes (`.ease-out-expo`, `.translate-y-hover-lift`, `.shadow-hover-lift`, and `.container`).
2.  **HTML and Layout Inspection**:
    *   Open `index.html` and `blog.html` in a web browser.
    *   Verify that hover states on services and lift elements work identically (with the smooth 5px lift, custom ease-out-expo easing, border accent color change, and shadow rendering).
    *   Verify that layouts behave identically at different screen sizes (specifically capping at `1152px` max-width and maintaining `1.5rem` padding on mobile viewports).
3.  **Invalidation Conditions**:
    *   Compilation failing during `npm run build:css` (which would point to syntax errors in `tailwind.config.js`).
    *   Double-padding on mobile screens (indicating that `px-6` was not removed from parent sections).
    *   The container expanding beyond `1152px` on high-resolution viewports.
