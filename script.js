import { throttle } from './src/utils.js';
import { initTheme } from './src/theme.js';
import { rewriteLinks, highlightActivePage, initNav } from './src/nav.js';
import { initScrollReveal, initReadingProgressBar, initMagneticButtons, initServicesAnimations, initProcessAnimations, initReviewBubbleAnimations } from './src/animations.js';
import { initContactForm, initLoadMoreProjects, initBlogFilter } from './src/components.js';
import { initLenisScroll, initSplitTextReveal, initHeroAnimation, initMarquee, initCounters, initProjectParallax, initWorkReel } from './src/gsap-animations.js';

// Determine if current page is the homepage
const isHomePage = window.location.pathname === '/' ||
                   window.location.pathname.endsWith('/index.html') ||
                   window.location.pathname === '' ||
                   !window.location.pathname.includes('.html');

/**
 * Coordinates application initialization on DOMContentLoaded.
 * Resolves link rewriting, theme togglers, navigation, animations, and forms.
 */
function initializeApp() {
    // 0. Initialize Lucide icons globally on page load
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    const navbar = document.getElementById('navbar');
    const footer = document.querySelector('footer');

    // 1. Rewrite links for static SPA behavior
    rewriteLinks(navbar, isHomePage);
    rewriteLinks(footer, isHomePage);

    // 2. Highlight active links
    highlightActivePage(navbar);

    // 3. Cache and initialize theme toggles
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    initTheme(themeToggleBtns);

    // 4. Initialize navigation event handlers and scroll listeners (throttled)
    initNav(isHomePage, throttle);

    // 5. Lenis smooth scrolling (replaces native scroll-behavior: smooth)
    initLenisScroll();

    // 5.1. Scroll reveal animation observer (legacy CSS fallback)
    initScrollReveal();

    // 5.2. Initialize services list animations with GSAP
    initServicesAnimations();

    // 5.3. Initialize process (How I Work) animations with GSAP
    initProcessAnimations();

    // 5.4. Initialize iMessage-style review bubble directional animations
    initReviewBubbleAnimations();

    // 5.4. Split-word text reveals on headings (data-split-reveal)
    initSplitTextReveal();

    // 5.5. Hero entry animation sequence
    initHeroAnimation();
    
    // 5.6. Work Reel animation (only active on /work or projects list)
    initWorkReel();

    // 5.6. Marquee strip initialization
    initMarquee();

    // 5.7. Stat counter animations (data-count)
    initCounters();

    // 5.8. Project thumbnail subtle parallax
    initProjectParallax();

    // 5.9. Initialize reading progress bar for blog articles
    initReadingProgressBar(throttle);

    // 6. Contact form AJAX submission
    initContactForm();

    // 7. Initialize magnetic buttons for premium cursor interaction
    initMagneticButtons();

    // 8. Homepage projects pagination load-more controls
    initLoadMoreProjects();

    // 9. Blog filter and search logic
    initBlogFilter();
}

// Initialize on DOMContentLoaded or immediately if DOM is already fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
