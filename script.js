import { throttle } from './src/utils.js';
import { initTheme } from './src/theme.js';
import { initContactTracking } from './src/analytics.js';
import { rewriteLinks, highlightActivePage, initNav } from './src/nav.js';
import { initContactForm, initToolsFilter } from './src/components.js';
import { initMotion } from './src/motion/index.js';
import { initReadingStatements } from './src/reading-statement.js';
import { initLine } from './src/line.js';

const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '';

function initializeApp() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    const navbar = document.getElementById('navbar');
    rewriteLinks(navbar, isHomePage);
    rewriteLinks(document.querySelector('footer'), isHomePage);
    highlightActivePage(navbar);
    initTheme(document.querySelectorAll('.theme-toggle-btn'));
    initNav(isHomePage, throttle);
    // The about statement reads into focus; it reverts if motion is turned off while browsing.
    initMotion(() => { initReadingStatements(); });
    initLine();
    initContactForm();
    initContactTracking();
    initToolsFilter();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeApp);
else initializeApp();
