/**
 * components.js, Shared components & page logic for layshahdev.com
 *
 * Injects the navbar and footer into every page, then initialises
 * all interactive behaviour (theme, mobile menu, scroll effects,
 * contact form, load-more projects).
 *
 * Each HTML page only needs two placeholder divs:
 *   <div id="navbar-placeholder"></div>   ← top of <body>
 *   <div id="footer-placeholder"></div>   ← after </main>
 * …and a single <script src="./js/components.js"></script> at the end.
 */

// ─── 1. HTML Templates ────────────────────────────────────────────────────────

function getNavbarHTML() {
    return `
    <nav id="navbar" class="fixed top-0 left-0 w-full z-50 transition-all duration-300 py-6">
        <div class="container mx-auto px-6 flex items-center justify-between">
            <a href="./index.html" class="text-xl font-display font-bold tracking-tighter hover:text-accent transition-colors">
                LAY SHAH
            </a>

            <!-- Desktop Menu -->
            <div class="hidden md:flex items-center gap-8">
                <a href="./index.html#about"   data-nav="home" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</a>
                <a href="./index.html#process" data-nav="home" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Process</a>
                <a href="./index.html#work"    data-nav="home" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Work</a>
                <a href="./index.html#reviews" data-nav="home" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Reviews</a>
                <a href="./index.html#faq"     data-nav="home" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">FAQ</a>
                <a href="./blog.html"          data-nav="blog" class="nav-link text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Blog</a>

                <button class="theme-toggle-btn p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Toggle Dark Mode">
                    <div class="theme-toggle-wrapper">
                        <div class="theme-icon moon"><i data-lucide="moon" class="w-5 h-5"></i></div>
                        <div class="theme-icon sun"><i data-lucide="sun" class="w-5 h-5"></i></div>
                    </div>
                </button>

                <a href="./index.html#contact" class="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-accent hover:text-white transition-colors">
                    Let's Talk
                </a>
            </div>

            <!-- Mobile Toggle -->
            <div class="flex items-center gap-4 md:hidden">
                <button class="theme-toggle-btn p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Toggle Dark Mode">
                    <div class="theme-toggle-wrapper">
                        <div class="theme-icon moon"><i data-lucide="moon" class="w-5 h-5"></i></div>
                        <div class="theme-icon sun"><i data-lucide="sun" class="w-5 h-5"></i></div>
                    </div>
                </button>
                <button id="mobile-menu-btn" class="text-foreground p-2" aria-label="Open Menu">
                    <div class="hamburger">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </div>
                </button>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div id="mobile-menu" class="absolute top-full left-0 w-full bg-background border-b border-border p-6 hidden md:hidden flex-col gap-4 shadow-lg">
            <a href="./index.html#about"   class="text-lg font-medium text-muted-foreground hover:text-primary">About</a>
            <a href="./index.html#process" class="text-lg font-medium text-muted-foreground hover:text-primary">Process</a>
            <a href="./index.html#work"    class="text-lg font-medium text-muted-foreground hover:text-primary">Work</a>
            <a href="./index.html#reviews" class="text-lg font-medium text-muted-foreground hover:text-primary">Reviews</a>
            <a href="./index.html#faq"     class="text-lg font-medium text-muted-foreground hover:text-primary">FAQ</a>
            <a href="./blog.html"          class="text-lg font-medium text-muted-foreground hover:text-primary" data-mobile-nav="blog">Blog</a>
            <a href="./index.html#contact" class="text-lg font-medium text-primary">Contact</a>
        </div>
    </nav>`;
}

function getFooterHTML() {
    return `
    <footer class="bg-background text-foreground py-8 px-6 border-t border-border">
        <div class="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© ${new Date().getFullYear()} Lay Shah. All rights reserved.</p>
            <div class="flex items-center gap-6">
                <a href="tel:+919099340548"            class="hover:text-accent transition-colors" aria-label="Call"><i data-lucide="phone" class="w-5 h-5"></i></a>
                <a href="mailto:layshah1989@gmail.com" class="hover:text-accent transition-colors" aria-label="Email"><i data-lucide="mail" class="w-5 h-5"></i></a>
                <a href="https://github.com/lay1989"   class="hover:text-accent transition-colors" aria-label="GitHub"><i class="fa-brands fa-github text-xl"></i></a>
                <button onclick="window.scrollTo({top:0,behavior:'smooth'})" class="hover:text-accent transition-colors" aria-label="Back to Top">
                    <i data-lucide="arrow-up" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    </footer>`;
}

// ─── 2. Inject Components ─────────────────────────────────────────────────────

(function injectComponents() {
    const navPlaceholder    = document.getElementById('navbar-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (navPlaceholder)    navPlaceholder.innerHTML    = getNavbarHTML();
    if (footerPlaceholder) footerPlaceholder.innerHTML = getFooterHTML();
})();

// ─── 3. Active Nav-Link Highlighting ─────────────────────────────────────────

(function setActiveLink() {
    const path = window.location.pathname;
    const isBlog = path.includes('blog');

    if (isBlog) {
        document.querySelectorAll('[data-nav="blog"]').forEach(el => {
            el.classList.replace('text-muted-foreground', 'text-primary');
        });
        document.querySelectorAll('[data-mobile-nav="blog"]').forEach(el => {
            el.classList.replace('text-muted-foreground', 'text-primary');
        });
    }
})();

// ─── 4. Theme Toggle ──────────────────────────────────────────────────────────

const htmlElement = document.documentElement;

// Restore persisted preference (default: light)
(function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
})();

function toggleTheme() {
    htmlElement.classList.toggle('dark');
    localStorage.setItem('theme', htmlElement.classList.contains('dark') ? 'dark' : 'light');
}

document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
});

// ─── 5. Mobile Menu ───────────────────────────────────────────────────────────

(function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu    = document.getElementById('mobile-menu');
    const hamburger     = document.querySelector('.hamburger');
    if (!mobileMenuBtn || !mobileMenu) return;

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
        if (hamburger) hamburger.classList.toggle('active');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
            if (hamburger) hamburger.classList.remove('active');
        });
    });
})();

// ─── 6. Navbar Scroll Effect ──────────────────────────────────────────────────

(function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('nav-scrolled');
            navbar.style.backgroundColor = htmlElement.classList.contains('dark')
                ? 'rgba(8, 8, 8, 0.85)'
                : 'rgba(255, 255, 255, 0.85)';
        } else {
            navbar.classList.remove('nav-scrolled');
            navbar.style.backgroundColor = 'transparent';
        }
    });

    // Re-apply correct colour if user toggles theme while scrolled
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.scrollY > 50) {
                navbar.style.backgroundColor = htmlElement.classList.contains('dark')
                    ? 'rgba(8, 8, 8, 0.85)'
                    : 'rgba(255, 255, 255, 0.85)';
            }
        });
    });
})();

// ─── 7. Scroll-Reveal Animation ───────────────────────────────────────────────

(function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealEls.forEach(el => observer.observe(el));
})();

// ─── 8. Contact Form (Netlify) ────────────────────────────────────────────────

(function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled    = true;
            submitBtn.textContent = 'Sending…';
        }

        fetch('/', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    new URLSearchParams(new FormData(form)).toString(),
        })
        .then(() => {
            // Inline success UI, no alert()
            form.innerHTML = `
                <div class="text-center py-12 space-y-4">
                    <div class="w-16 h-16 rounded-full bg-background/20 flex items-center justify-center mx-auto">
                        <i data-lucide="check-circle" class="w-9 h-9"></i>
                    </div>
                    <h3 class="text-2xl font-display font-bold">Message Sent!</h3>
                    <p class="opacity-70 max-w-xs mx-auto">Thank you for reaching out, I'll get back to you shortly.</p>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        })
        .catch(err => {
            if (submitBtn) {
                submitBtn.disabled    = false;
                submitBtn.textContent = 'Send Message';
            }
            // Show an inline error instead of alert()
            const errMsg = form.querySelector('#form-error') || (() => {
                const el = document.createElement('p');
                el.id        = 'form-error';
                el.className = 'text-sm opacity-70 text-center mt-2';
                form.appendChild(el);
                return el;
            })();
            errMsg.textContent = `Oops, something went wrong (${err}). Please try again.`;
        });
    });
})();

// ─── 9. Load More Projects (index.html only) ──────────────────────────────────

(function initLoadMore() {
    const loadMoreBtn       = document.getElementById('load-more-btn');
    const loadMoreContainer = document.getElementById('load-more-container');
    const projectsContainer = document.getElementById('projects-container');
    if (!loadMoreBtn || !projectsContainer) return;

    let currentIndex       = 3;
    const projectsPerLoad  = 3;
    const allProjects      = projectsContainer.querySelectorAll('.project-item');
    const totalProjects    = allProjects.length;

    function showProjects() {
        allProjects.forEach((project, index) => {
            project.style.display = index < currentIndex ? 'block' : 'none';
        });
        if (currentIndex >= totalProjects && loadMoreContainer) {
            loadMoreContainer.style.display = 'none';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    loadMoreBtn.addEventListener('click', () => {
        currentIndex += projectsPerLoad;
        showProjects();
    });

    // Hide all first, then show initial batch
    allProjects.forEach(p => { p.style.display = 'none'; });
    showProjects();
})();

// ─── 10. Initialise Lucide Icons ──────────────────────────────────────────────

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
