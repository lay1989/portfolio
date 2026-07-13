let backToTopBtn = null;
let mobileMenuBtn = null;
let mobileMenu = null;
let hamburgerElement = null;
let navbarWrapper = null;
let throttledScrollHandler = null;

/**
 * Rewrites links inside a container to enable SPA-like navigation in a static site.
 * Replaces legacy iteration with modern for...of loop.
 * @param {HTMLElement} container - The container element (navbar or footer).
 * @param {boolean} isHome - Whether the current page is the homepage.
 */
export function rewriteLinks(container, isHome) {
    if (!container) return;
    const links = container.querySelectorAll('a');
    for (const link of links) {
        const href = link.getAttribute('href');
        if (href) {
            if (isHome) {
                // For Homepage: convert `./index.html#about` to `#about`
                if (href.includes('index.html#')) {
                    const hash = href.split('#')[1];
                    link.setAttribute('href', `#${hash}`);
                } else if (href === './index.html' || href === 'index.html' || href === '/index.html') {
                    link.setAttribute('href', '#');
                }
            } else {
                // For subpages: convert absolute `/index.html` to `./index.html` to prevent hosting breakage
                if (href.startsWith('/index.html')) {
                    link.setAttribute('href', `.${href}`);
                } else if (href.startsWith('/blog.html')) {
                    link.setAttribute('href', `.${href}`);
                }
            }
        }
    }
}

/**
 * Highlights the active page link in the desktop and mobile navbars.
 * Replaces legacy iteration with modern for...of loops.
 * @param {HTMLElement} navbar - The navbar container.
 */
export function highlightActivePage(navbar) {
    if (!navbar) return;
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);

    const isBlog = filename === 'blog.html' || filename.startsWith('blog-');

    const updateActiveStyles = (link) => {
        const href = link.getAttribute('href');
        if (isBlog && href && href.includes('blog.html')) {
            link.classList.add('text-primary');
            link.classList.remove('text-muted-foreground');
        }
    };

    const desktopLinks = navbar.querySelectorAll('.nav-links-desktop a');
    for (const link of desktopLinks) {
        updateActiveStyles(link);
    }

    const mobileMenuEl = document.getElementById('mobile-menu');
    if (mobileMenuEl) {
        const mobileLinks = mobileMenuEl.querySelectorAll('a');
        for (const link of mobileLinks) {
            updateActiveStyles(link);
        }
    }
}

/**
 * Initializes navbar scroll styling, back-to-top button scrolling, and mobile menu behaviors.
 * Caches DOM query selectors within its scope, utilizes throttled scroll listener,
 * and uses modern for...of loops.
 * @param {boolean} isHomePage - Whether the current page is the homepage.
 * @param {Function} throttle - Throttling utility function.
 */
export function initNav(isHomePage, throttle) {
    // Cache dynamic controls immediately upon navigation initialization
    navbarWrapper = document.getElementById('navbar');
    backToTopBtn = document.getElementById('back-to-top-btn');
    mobileMenuBtn = document.getElementById('mobile-menu-btn');
    mobileMenu = document.getElementById('mobile-menu');
    hamburgerElement = document.querySelector('.hamburger');

    // 1. Mobile Menu Logic
    if (mobileMenuBtn && mobileMenu) {
        // Prevent duplicate listener in case it runs twice
        const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);
        mobileMenuBtn = newMobileMenuBtn;

        // Cache the hamburger element outside click handler closures to prevent redundant DOM queries
        const cachedHamburger = hamburgerElement;

        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            const isOpen = mobileMenu.classList.contains('open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
            if (cachedHamburger) {
                cachedHamburger.classList.toggle('active');
            }
        });

        mobileMenu.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                mobileMenu.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                if (cachedHamburger) {
                    cachedHamburger.classList.remove('active');
                }
            }
        });
    }

    // 2. Back to Top Button Logic
    if (backToTopBtn) {
        // Prevent duplicate listeners
        const newBackToTopBtn = backToTopBtn.cloneNode(true);
        backToTopBtn.parentNode.replaceChild(newBackToTopBtn, backToTopBtn);
        backToTopBtn = newBackToTopBtn;

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 3. Scroll event listener logic, throttled to 100ms
    const handleScroll = () => {
        // Toggle Back-To-Top button visibility
        if (backToTopBtn) {
            if (window.scrollY > 300) {
                backToTopBtn.classList.remove('hidden');
            } else {
                backToTopBtn.classList.add('hidden');
            }
        }

        // Toggle Navbar scrolled shadow class
        if (navbarWrapper) {
            navbarWrapper.setAttribute('data-scrolled', window.scrollY > 50 ? 'true' : 'false');
        }
    };

    // Clean up previous event listener if it exists to avoid duplication
    if (throttledScrollHandler) {
        window.removeEventListener('scroll', throttledScrollHandler);
    }

    throttledScrollHandler = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScrollHandler);

    // Initial check
    handleScroll();
}
