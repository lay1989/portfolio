## 2026-07-10T10:58:15Z

You are teamwork_preview_worker.
Your working directory is: c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_homepage
Your mission is to modify content/index.html to implement the homepage refactoring plan.

Please follow these detailed steps:

1. Modifying content/index.html:
   a. Hero Section:
      - Remove the glowing Hero Pill:
        ```html
        <div class="flex items-center gap-2 mb-6">
            <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <span class="text-sm font-medium text-muted-foreground tracking-wide uppercase">Accepting Projects for Q3 2026</span>
        </div>
        ```
      - Remove the background blob:
        ```html
        <!-- Blob -->
        <div class="absolute right-0 top-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
        ```
      - Rewrite the Hook copy and paragraph (lines 11-19) to be:
        ```html
        <h1 class="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] tracking-tighter mb-8 text-balance">
            <span class="sr-only">Freelance Web Developer &amp; Web Designer - </span>
            High-performance web apps <br>
            <span class="text-muted-foreground">built for speed.</span>
        </h1>

        <p class="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            I engineer fast, reliable web applications and custom e-commerce engines. Stop losing users to bloated templates. Get clean, optimized code that scales with your growth.
        </p>
        ```

   b. About Section Copy (Line 52):
      - Replace the em-dash line:
        `My focus isn't just on writing clean code—it's on building digital assets that solve your specific business bottlenecks and drive measurable growth.`
        with:
        `My focus goes beyond writing clean code. I build digital assets that resolve specific business bottlenecks and drive growth.`

   c. Services Bento Box Section:
      - Replace the 9-card services grid (lines 68-207) with a 3-cell Bento Box layout showcasing Web Applications, E-Commerce, and Technical SEO.
      - Grid wrapper layout: `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">`
      - Cell 1: Web Applications
        - Spans: `md:col-span-2 md:row-span-2`
        - Structure:
          ```html
          <div class="md:col-span-2 md:row-span-2 border border-border bg-card rounded-3xl p-8 lg:p-12 flex flex-col justify-between group hover:border-accent transition-all duration-300 relative min-h-[380px]">
              <div class="relative z-10 max-w-lg">
                  <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block font-medium">01 // WEB APPLICATIONS</span>
                  <h3 class="text-3xl font-display font-bold mb-4 text-balance">Custom Web Applications</h3>
                  <p class="text-muted-foreground leading-relaxed">
                      I build fast, secure web applications designed to scale. By writing clean, modular vanilla JavaScript and optimized backend logic, I eliminate framework overhead to keep load times under 100ms.
                  </p>
              </div>
              <!-- CSS Grid Geometry Mockup -->
              <div class="mt-8 grid grid-cols-6 gap-2 w-full opacity-60 group-hover:opacity-90 transition-opacity duration-300 select-none" aria-hidden="true">
                  <div class="col-span-2 h-20 bg-secondary/50 rounded-xl border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground">/sidebar</div>
                  <div class="col-span-4 h-20 bg-secondary/50 rounded-xl border border-border flex flex-col justify-between p-3">
                      <div class="h-1.5 w-12 bg-accent rounded-full"></div>
                      <div class="h-8 w-full bg-background rounded-md border border-border flex items-center justify-between px-2">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span class="text-[9px] font-mono text-muted-foreground">app-config.js</span>
                      </div>
                  </div>
              </div>
          </div>
          ```
      - Cell 2: E-Commerce
        - Spans: `md:col-span-1`
        - Structure:
          ```html
          <div class="md:col-span-1 border border-border bg-card rounded-3xl p-8 flex flex-col justify-between group hover:border-accent transition-all duration-300 relative min-h-[380px]">
              <div>
                  <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block font-medium">02 // E-COMMERCE</span>
                  <h3 class="text-2xl font-bold mb-3 text-balance">E-Commerce</h3>
                  <p class="text-muted-foreground text-sm leading-relaxed">
                      High-performance online stores optimized to convert traffic. Fast checkouts and headless architecture that keep the purchasing flow friction-free.
                  </p>
              </div>
              <!-- Typographic Visual (Checkout Success Card) -->
              <div class="border border-border/60 rounded-xl p-4 bg-secondary/30 font-mono text-xs text-muted-foreground mt-6 space-y-3 select-none" aria-hidden="true">
                  <div class="flex justify-between items-center text-xs">
                      <span class="font-bold text-foreground">Checkout Flow</span>
                      <span class="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full text-[10px]">Success</span>
                  </div>
                  <div class="space-y-1.5 border-t border-border/40 pt-2 text-[11px]">
                      <div class="flex justify-between">
                          <span>Transaction Time</span>
                          <span class="text-foreground font-semibold">180ms</span>
                      </div>
                      <div class="flex justify-between text-green-500 font-medium">
                          <span>Conversion Lift</span>
                          <span>+38%</span>
                      </div>
                  </div>
              </div>
          </div>
          ```
      - Cell 3: Technical SEO
        - Spans: `md:col-span-1`
        - Structure:
          ```html
          <div class="md:col-span-1 border border-border bg-card rounded-3xl p-8 flex flex-col justify-between group hover:border-accent transition-all duration-300 relative min-h-[380px]">
              <div>
                  <span class="text-xs font-mono text-accent uppercase tracking-wider mb-2 block font-medium">03 // SEO & SPEED</span>
                  <h3 class="text-2xl font-bold mb-3 text-balance">Technical SEO</h3>
                  <p class="text-muted-foreground text-sm leading-relaxed">
                      Speed is a search ranking factor. I optimize site speed, semantic markup, and metadata to help search engines index your pages and keep bounce rates low.
                  </p>
              </div>
              <!-- Typographic Visual (Performance metrics card) -->
              <div class="border border-border/60 rounded-xl p-4 bg-secondary/30 font-mono text-xs text-muted-foreground mt-6 space-y-3 select-none" aria-hidden="true">
                  <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-foreground">Speed Index</span>
                      <span class="text-green-500 font-bold text-lg bg-green-500/10 px-2.5 py-0.5 rounded-full">100</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-[10px]">
                      <div class="border border-border/40 rounded p-1.5">
                          <span class="block text-muted-foreground/60">LCP</span>
                          <span class="font-bold text-foreground">0.6s</span>
                      </div>
                      <div class="border border-border/40 rounded p-1.5">
                          <span class="block text-muted-foreground/60">CLS</span>
                          <span class="font-bold text-foreground">0.00</span>
                      </div>
                  </div>
              </div>
          </div>
          ```

   d. Engineering Philosophy Section:
      - Replace lines 263-305 with a 2-column sticky-scroll layout:
        ```html
        <!-- Philosophy Section (Sticky-Scroll Refactor) -->
        <section id="principles" class="py-24 md:py-32 px-6">
            <div class="container mx-auto max-w-6xl reveal">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
                    <!-- Left Sticky Column -->
                    <div class="md:col-span-4 md:sticky md:top-24 space-y-4">
                        <h2 class="text-4xl md:text-5xl font-display font-bold text-balance">Engineering Philosophy</h2>
                        <p class="text-muted-foreground text-lg">My uncompromising approach to building the web.</p>
                    </div>

                    <!-- Right Scrollable Column -->
                    <div class="md:col-span-8 space-y-12">
                        <!-- Principle 1 -->
                        <div class="p-8 border border-border bg-card rounded-2xl group hover-lift transition-all duration-300">
                            <div class="mb-6 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <i data-lucide="gauge" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Performance First</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                I build with vanilla JavaScript where possible to eliminate framework bloat. Static site generation, minimal dependencies, and compressed assets deliver sub-100ms load times and top-tier Core Web Vitals.
                            </p>
                        </div>

                        <!-- Principle 2 -->
                        <div class="p-8 border border-border bg-card rounded-2xl group hover-lift transition-all duration-300">
                            <div class="mb-6 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                <i data-lucide="accessibility" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Accessibility by Default</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                A beautiful website that cannot be navigated by keyboard is a broken website. I strictly enforce semantic HTML, proper ARIA roles, and WCAG compliance from the very first line of code.
                            </p>
                        </div>

                        <!-- Principle 3 -->
                        <div class="p-8 border border-border bg-card rounded-2xl group hover-lift transition-all duration-300">
                            <div class="mb-6 w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <i data-lucide="scaling" class="w-6 h-6"></i>
                            </div>
                            <h3 class="text-2xl font-bold mb-4 text-balance">Fluid Responsiveness</h3>
                            <p class="text-muted-foreground leading-relaxed">
                                I reject rigid breakpoints. Leveraging CSS clamp() for fluid typography and container queries for modular layouts allows elements to adapt naturally to any screen.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        ```

2. Verification:
   - Make sure no banned words ("seamless", "empower", "streamline") exist in content/index.html.
   - Run the build: `npm run build` using run_command in the repository root directory. Ensure it compiles cleanly with zero errors.
   - Verify that your changes compile successfully and write a detailed handoff report in your directory.
