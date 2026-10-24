// Cache root element inside module scope
const htmlElement = document.documentElement;

/**
 * Toggles the application theme between light and dark modes.
 */
export function toggleTheme() {
    const dark = !htmlElement.classList.contains('dark');
    htmlElement.classList.toggle('dark', dark);
    htmlElement.classList.toggle('light', !dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* Keep the toggle usable. */ }
    syncThemeButtons();
}

function syncThemeButtons() {
    const dark = htmlElement.classList.contains('dark');
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', 'Dark mode');
    });
}

/**
 * Initializes the theme click handlers on target elements.
 * Replaces legacy iteration with modern for...of loop.
 * @param {NodeList|HTMLElement[]} themeToggleBtns - List of buttons that trigger theme toggle.
 */
export function initTheme(themeToggleBtns) {
    syncThemeButtons();
    if (!themeToggleBtns) return;
    for (const btn of themeToggleBtns) {
        btn.removeEventListener('click', toggleTheme); // Prevent duplicate listeners
        btn.addEventListener('click', toggleTheme);
    }
}
