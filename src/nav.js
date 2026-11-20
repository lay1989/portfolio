import { motionAllowed } from './motion/index.js';
import layoutBreakpoints from './admin-layout.generated.js';

let backToTopBtn = null;
let mobileMenuBtn = null;
let mobileMenu = null;
let navbarWrapper = null;
let throttledScrollHandler = null;

/**
 * Shortens homepage section links without changing subpage routing.
 * Build-time templates supply the correct paths for static and Flask pages.
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
    for (const link of navbar.querySelectorAll('.nav-links-desktop a, #mobile-menu a')) {
        const href = link.getAttribute('href');
        if (!href) continue;
        const target = new URL(href, window.location.href);
        const exact = target.pathname === path && !target.hash;
        const collection = (target.pathname.endsWith('/blog.html') && path.split('/').pop().startsWith('blog-')) ||
            (target.pathname.endsWith('/projects.html') && path.includes('/projects/'));
        link.removeAttribute('aria-current');
        if (exact || collection) {
            link.setAttribute('aria-current', exact ? 'page' : 'location');
            link.classList.add('text-primary');
            link.classList.remove('text-muted-foreground');
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

    // 1. Mobile Menu Logic
    if (mobileMenuBtn && mobileMenu) {
        // Prevent duplicate listener in case it runs twice
        const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);
        mobileMenuBtn = newMobileMenuBtn;

        // The menu covers the page on every public route.
        const fullHeightMenu = Boolean(mobileMenu.classList.contains('site-menu'));
        const outside = fullHeightMenu ? [...document.querySelectorAll('main,footer')].map(el => [el, el.inert]) : [];
        let originalOverflow = '';
        const setMenuState = open => {
            mobileMenu.classList.toggle('open', open);
            mobileMenuBtn.classList.toggle('active', open);
            mobileMenuBtn.setAttribute('aria-expanded', String(open));
            if (fullHeightMenu) {
                if (open) originalOverflow = document.body.style.overflow;
                document.body.style.overflow = open ? 'hidden' : originalOverflow;
                outside.forEach(([el, original]) => { el.inert = open || original; });
            }
        };
        mobileMenuBtn.addEventListener('click', () => {
            const open = !mobileMenu.classList.contains('open');
            setMenuState(open);
            if (open && fullHeightMenu) {
                const focusFirst = () => { if (mobileMenu.classList.contains('open')) mobileMenu.querySelector('a')?.focus({ preventScroll: true }); };
                requestAnimationFrame(focusFirst);
                mobileMenu.addEventListener('transitionend', focusFirst, { once: true });
            }
        });
        document.addEventListener('keydown', event => {
            if (!mobileMenu.classList.contains('open')) return;
            if (event.key === 'Escape') {
                setMenuState(false);
                mobileMenuBtn.focus();
            } else if (event.key === 'Tab' && fullHeightMenu) {
                const items = [mobileMenuBtn, ...mobileMenu.querySelectorAll('a')];
                const first = items[0], last = items.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) setMenuState(false); });
        if (fullHeightMenu) {
            const desktop = matchMedia(layoutBreakpoints.desktopQuery);
            desktop.addEventListener('change', () => { if (desktop.matches && mobileMenu.classList.contains('open')) setMenuState(false); });
        }
    }

    // 2. Back to Top Button Logic
    if (backToTopBtn) {
        // Prevent duplicate listeners
        const newBackToTopBtn = backToTopBtn.cloneNode(true);
        backToTopBtn.parentNode.replaceChild(newBackToTopBtn, backToTopBtn);
        backToTopBtn = newBackToTopBtn;

        backToTopBtn.addEventListener('click', () => {
            document.getElementById('main-content')?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
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
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });

    // Initial check
    handleScroll();
}
