# Handoff: Homepage Refactoring Plan (Bento Box, Hero, Sticky-Scroll, Copywriting Slop Removal)

This report outlines the proposed refactoring plan for `content/index.html` to align with `.agentrules` and implement specific design upgrades.

---

## 1. Observation

### Hero Section
- **File path**: `content/index.html`
- **Lines 6–9**: Contains the glowing Hero Pill badge:
  ```html
  <div class="flex items-center gap-2 mb-6">
      <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
      <span class="text-sm font-medium text-muted-foreground tracking-wide uppercase">Accepting Projects for Q3 2026</span>
  </div>
  ```
- **Line 34**: Contains the blurred background blob:
  ```html
  <!-- Blob -->
  <div class="absolute right-0 top-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
  ```
- **Lines 11–19**: Verbatim current copy containing generic headings/descriptions:
  ```html
  <h1 class="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] tracking-tighter mb-8 text-balance">
      <span class="sr-only">Freelance Web Developer &amp; Web Designer - </span>
      Turn your website into a <br>
      <span class="text-muted-foreground">revenue engine.</span>
  </h1>

  <p class="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
      I build high-performance custom websites and e-commerce stores that scale your business. Stop losing customers to slow, generic templates.
  </p>
  ```

### Services Section
- **File path**: `content/index.html`
- **Lines 60–207**: Contains a 9-card standard feature grid layout with generic Lucide icons (`code`, `shopping-bag`, `database`, `bar-chart-3`, `smartphone`, `bot`, `palette`, `search`, `lightbulb`) representing services.
- **Copywriting Slop**:
  - Line 75: uses banned word `"seamless"` (`"...Turn your complex business logic into a seamless user experience."`)
  - Line 103: uses banned word `"empower"` (`"...Digitize your catalogs and empower your team..."`)
  - Line 134: uses banned word `"Seamless"` (`"Seamless API integrations..."`)
  - Line 150: uses banned word `"streamline"` (`"...workflow automation that streamline your business..."`)

### About Section
- **Line 52**: Uses an em-dash (`—`) to connect thoughts:
  ```html
  My focus isn't just on writing clean code—it's on building digital assets that solve your specific business bottlenecks and drive measurable growth.
  ```

### Engineering Philosophy Section
- **Lines 263–305**: Currently laid out as a standard 3-card grid:
  ```html
  <div class="grid md:grid-cols-3 gap-8">
  ```
  with identical cards floating next to each other.

---

## 2. Logic Chain

1. **Hero Refactor**: 
   - By deleting lines 6–9 and line 34, we remove the glowing Hero Pill and the background blur blob, conforming to the design restriction that rejects basic generic "Hero Pills" and classic "gradient blob" layouts.
   - The Hook copy must be rewritten to highlight "high-performance web applications" using active verbs ("build", "code", "load", "scale", "convert", "losing") and a punchy tone.
2. **Services Bento Box**:
   - The current 9-card services grid violates the ".agentrules" design preference to avoid "3-Card Feature Grids" and generic Lucide icon usage.
   - Replacing it with a 3-cell Bento Box (E-Commerce, Web Apps, SEO) on a 3-column Tailwind CSS grid (with cells spanning 2-cols, 1-col, and 3-cols) creates a modern asymmetrical layout.
   - The icons are replaced by CSS grid/flex geometry representing UI elements (e.g. sidebar grid mockup, mini payment transaction block, SVG-rendered circular PageSpeed dial indicators) and bold typography ("01", "02", "03"), aligning with UI standards.
3. **Engineering Philosophy Sticky-Scroll**:
   - Refactoring the grid into a 12-column grid (`grid-cols-1 md:grid-cols-12`) splits the section into a left sticky column (`md:col-span-4 md:sticky md:top-28`) and a right scrolling column (`md:col-span-8`).
   - The left side displays the section headings pinned to the viewport, while the three philosophy principles scroll on the right as larger, more readable cards, resolving the "3-Card Feature Grid" violation.
4. **Copywriting Clean-Up**:
   - All occurrences of banned words (`"seamless"`, `"empower"`, `"streamline"`, `"bespoke"`) must be eliminated.
   - The em-dash in line 52 is split into separate, clean sentences to improve readability and satisfy the banned punctuation constraints.

---

## 3. Caveats

- **No CSS Styles Added**: All bento geometry is implemented using native Tailwind CSS utility classes and inline styles where needed (e.g., SVG dash arrays), which aligns with the instruction to not add custom utility rules in `style.css`.
- **Deep Technical Expertise Preservation**: The "Deep Technical Expertise" sub-section under Services remains intact. We preserve its layout and location.
- **Scroll Reveal Dependency**: The parent container elements must retain the `.reveal` class. The custom JS script (`src/animations.js`) relies on `.reveal` to trigger fade-up scroll animations using `IntersectionObserver`.

---

## 4. Conclusion

The proposed implementation transforms the homepage from a generic templates-style site into a modern, high-end, slop-free experience that conforms to all styling and copywriting guidelines in `.agentrules`.

### A. Proposed Hero Section HTML Structure (Lines 2–35 Replacement)

```html
        <!-- Hero Section -->
        <section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            <div class="container mx-auto px-6 z-10 relative">
                <div class="max-w-4xl animate-fade-up">
                    <h1 class="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] tracking-tighter mb-8 text-balance">
                        <span class="sr-only">Freelance Web Developer &amp; Web Designer - </span>
                        Build fast web applications <br>
                        <span class="text-muted-foreground">that drive actual growth.</span>
                    </h1>

                    <p class="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
                        I code clean, high-performance web applications and storefronts that load instantly, scale under pressure, and convert users. Stop losing customers to slow, bloated templates.
                    </p>

                    <div class="flex flex-wrap gap-4">
                        <a href="#work" class="group flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-accent hover:text-white transition-all duration-300 magnetic-btn inline-block">
                            View Projects
                            <i data-lucide="arrow-down-right" class="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" aria-hidden="true"></i>
                        </a>
                        <a href="#contact" class="px-8 py-4 border border-border rounded-full font-medium hover:bg-secondary transition-all magnetic-btn inline-block">
                            Contact Me
                        </a>
                    </div>
                </div>
            </div>
        </section>
```

### B. Proposed Services Bento Box Structure (Lines 60–259 Replacement)

```html
        <!-- Services Section (Bento Box Refactor) -->
        <section class="py-24 px-6">
            <div class="container mx-auto max-w-6xl reveal">
                <div class="mb-16 md:mb-24 text-center">
                    <h2 class="text-4xl md:text-5xl font-display font-bold mb-4 text-balance">Focused Services</h2>
                    <p class="text-muted-foreground text-lg">High-performance solutions built for conversion and search visibility.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    <!-- Bento Cell 1: Web Applications (Spans 2 columns on medium+) -->
                    <div class="md:col-span-2 p-8 lg:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group flex flex-col justify-between overflow-hidden relative min-h-[380px]">
                        <div>
                            <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block">01 / WEB APPLICATIONS</span>
                            <h3 class="text-3xl font-display font-bold mb-4 text-balance">Custom Web Applications</h3>
                            <p class="text-muted-foreground leading-relaxed max-w-md">
                                Build fast, interactive web applications that process complex logic. I write lightweight, modular client-side code and construct optimized backends, avoiding heavy framework overhead to keep load times under 100ms.
                            </p>
                        </div>
                        <!-- CSS Grid Geometry Mockup -->
                        <div class="mt-8 grid grid-cols-6 gap-2 w-full opacity-65 group-hover:opacity-90 transition-opacity duration-300" aria-hidden="true">
                            <div class="col-span-2 h-20 bg-secondary/50 rounded-lg border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground">/sidebar</div>
                            <div class="col-span-4 h-20 bg-secondary/50 rounded-lg border border-border flex flex-col justify-between p-3">
                                <div class="h-1.5 w-12 bg-accent rounded-full"></div>
                                <div class="h-8 w-full bg-background rounded-md border border-border flex items-center justify-between px-2">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span class="text-[9px] font-mono text-muted-foreground">app.js</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bento Cell 2: E-Commerce (Spans 1 column on medium+) -->
                    <div class="md:col-span-1 p-8 lg:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group flex flex-col justify-between overflow-hidden relative min-h-[380px]">
                        <div>
                            <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block">02 / E-COMMERCE</span>
                            <h3 class="text-3xl font-display font-bold mb-4 text-balance">E-Commerce</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                Convert traffic into sales. I develop storefront integrations and custom checkout flows that load instantly, removing frictions that lead to cart abandonment.
                            </p>
                        </div>
                        <!-- CSS/Typography Checkout Mockup -->
                        <div class="mt-8 flex flex-col gap-2 w-full opacity-65 group-hover:opacity-90 transition-opacity duration-300" aria-hidden="true">
                            <div class="p-3 bg-secondary/50 rounded-xl border border-border flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-background rounded-md border border-border flex items-center justify-center font-mono text-xs font-bold text-accent">$99</div>
                                    <div class="space-y-1">
                                        <div class="h-2 w-16 bg-foreground/80 rounded-full"></div>
                                        <div class="h-1.5 w-10 bg-muted-foreground/50 rounded-full"></div>
                                    </div>
                                </div>
                                <div class="h-6 w-12 bg-primary text-primary-foreground rounded-full text-[9px] font-medium flex items-center justify-center">Pay</div>
                            </div>
                        </div>
                    </div>

                    <!-- Bento Cell 3: SEO & Speed (Spans 3 columns on medium+) -->
                    <div class="md:col-span-3 p-8 lg:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group flex flex-col md:flex-row justify-between items-center gap-8 overflow-hidden relative min-h-[320px]">
                        <div class="max-w-xl text-left">
                            <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block">03 / SEO &amp; SPEED</span>
                            <h3 class="text-3xl font-display font-bold mb-4 text-balance">Search &amp; Performance</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                Search engines reward speed. I write semantic, clean HTML markup that Google indexes with ease, set up structured data schemas, and optimize assets to secure perfect PageSpeed scores.
                            </p>
                        </div>
                        <!-- CSS Speed Gauge Graphics -->
                        <div class="flex items-center justify-center gap-6 md:gap-10 py-4 opacity-65 group-hover:opacity-90 transition-opacity duration-300" aria-hidden="true">
                            <!-- Speed Score -->
                            <div class="flex flex-col items-center gap-2">
                                <div class="relative w-20 h-20 flex items-center justify-center">
                                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path class="text-secondary" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path class="text-accent" stroke-width="3" stroke-dasharray="100, 100" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    </svg>
                                    <div class="absolute font-mono text-lg font-bold text-foreground">100</div>
                                </div>
                                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Performance</span>
                            </div>
                            <!-- SEO Score -->
                            <div class="flex flex-col items-center gap-2">
                                <div class="relative w-20 h-20 flex items-center justify-center">
                                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path class="text-secondary" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path class="text-accent" stroke-width="3" stroke-dasharray="100, 100" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    </svg>
                                    <div class="absolute font-mono text-lg font-bold text-foreground">100</div>
                                </div>
                                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">SEO</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Deep Technical Expertise (preserved) -->
                <div class="mt-24 pt-16 border-t border-border">
                    <h4 class="text-3xl font-display font-bold mb-12 text-center text-balance">Deep Technical Expertise</h4>
                    <div class="grid md:grid-cols-2 gap-8 lg:gap-16 max-w-5xl mx-auto text-left">
                        <div class="bg-card border border-border rounded-2xl p-8 hover:border-accent transition-colors">
                            <div class="flex items-center justify-between mb-6">
                                <h5 class="text-xl font-bold">Zero-Jank DOM</h5>
                                <i data-lucide="zap" class="w-5 h-5 text-accent"></i>
                            </div>
                            <p class="text-muted-foreground mb-6 leading-relaxed">
                                Instead of sluggish scroll listeners, I build efficient UIs using the native IntersectionObserver API. This guarantees 60fps performance even on budget mobile devices.
                            </p>
                            <div class="bg-secondary/50 rounded-lg p-4 font-mono text-sm text-muted-foreground overflow-x-auto">
                                <code>
                                    const observer = new IntersectionObserver(<br>
                                    &nbsp;&nbsp;(entries) =&gt; {<br>
                                    &nbsp;&nbsp;&nbsp;&nbsp;if (entries[0].isIntersecting) {<br>
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;loadMoreProjects();<br>
                                    &nbsp;&nbsp;&nbsp;&nbsp;}<br>
                                    &nbsp;&nbsp;}<br>
                                    );
                                </code>
                            </div>
                        </div>

                        <div class="bg-card border border-border rounded-2xl p-8 hover:border-accent transition-colors">
                            <div class="flex items-center justify-between mb-6">
                                <h5 class="text-xl font-bold">Fluid Architecture</h5>
                                <i data-lucide="layout" class="w-5 h-5 text-accent"></i>
                            </div>
                            <p class="text-muted-foreground mb-6 leading-relaxed">
                                I architect layouts using modern CSS container queries (@container) rather than rigid viewport breakpoints, creating perfectly portable and reusable UI components.
                            </p>
                            <div class="bg-secondary/50 rounded-lg p-4 font-mono text-sm text-muted-foreground overflow-x-auto">
                                <code>
                                    .project-item {<br>
                                    &nbsp;&nbsp;container-type: inline-size;<br>
                                    }<br>
                                    <br>
                                    @container (min-width: 42rem) {<br>
                                    &nbsp;&nbsp;.grid { grid-template-columns: 1fr 1fr; }<br>
                                    }
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
```

### C. Proposed Sticky-Scroll Engineering Philosophy Section (Lines 263–305 Replacement)

```html
        <!-- Engineering Philosophy Section -->
        <section id="principles" class="py-24 md:py-32 px-6">
            <div class="container mx-auto max-w-6xl reveal">
                <div class="grid md:grid-cols-12 gap-12 lg:gap-16 items-start">
                    <!-- Left Column (Sticky) -->
                    <div class="md:col-span-4">
                        <div class="md:sticky md:top-28">
                            <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block">My Code Manifesto</span>
                            <h2 class="text-4xl md:text-5xl font-display font-bold mb-4 text-balance">Engineering Philosophy</h2>
                            <p class="text-muted-foreground text-lg leading-relaxed">My uncompromising approach to building the web.</p>
                        </div>
                    </div>

                    <!-- Right Column (Scrolling cards) -->
                    <div class="md:col-span-8 space-y-8 md:space-y-12">
                        <!-- Principle 1 -->
                        <div class="p-8 md:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group">
                            <div class="mb-6 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <i data-lucide="gauge" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Performance First</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                I build with vanilla JavaScript where possible to eliminate framework bloat. Static site generation, minimal dependencies, and compressed assets deliver sub-100ms load times and top-tier Core Web Vitals.
                            </p>
                        </div>

                        <!-- Principle 2 -->
                        <div class="p-8 md:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group">
                            <div class="mb-6 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                <i data-lucide="accessibility" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Accessibility by Default</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                A beautiful page that cannot be accessed is incomplete. I write semantic HTML5, implement full keyboard navigation, and target strict WCAG accessibility compliance in every build.
                            </p>
                        </div>

                        <!-- Principle 3 -->
                        <div class="p-8 md:p-10 border border-border bg-card rounded-3xl transition-all duration-300 ease-out-expo hover:border-accent hover:translate-y-hover-lift hover:shadow-hover-lift group">
                            <div class="mb-6 w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <i data-lucide="scaling" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Fluid Responsiveness</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                I design without rigid breakpoints. Leveraging fluid typography and CSS container queries allows layouts to adapt naturally to any screen, from mobile devices to ultra-wide displays.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
```

### D. Proposed Copywriting Clean-Up (About Section Replacement, Line 52)

```html
            My focus extends beyond writing clean code. I build digital assets that eliminate your specific business bottlenecks and drive measurable growth.
```

---

## 5. Verification Method

To verify build success and prevent layout/functional regressions:
1. **SSG Compilation Build**: Run `npm run build` in the repository root to verify that the template and body content integrate and compile without errors.
2. **Review Output File**: Inspect the generated root `index.html` file to confirm:
   - The hero pill (`Accepting Projects`) and blurred blob are successfully deleted.
   - The new Bento Box layout replaces the old 9-card services grid.
   - The Engineering Philosophy section correctly features a 12-column grid layout with `md:sticky` and `md:top-28` classes.
   - Banned words (`"seamless"`, `"empower"`, `"streamline"`, `"bespoke"`) and em-dashes (`—`) are completely removed.
3. **Local Visual Inspection**: Verify responsive behavior:
   - On mobile viewports: Sticky columns lay out as normal vertical components.
   - On medium/large viewports: The left title stays sticky at `top-28` while the right column's principles scroll.
