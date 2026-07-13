// Cache root element inside module scope
const htmlElement = document.documentElement;

/**
 * Toggles the application theme between light and dark modes.
 */
export function toggleTheme() {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    }
}

/**
 * Initializes the theme click handlers on target elements.
 * Replaces legacy iteration with modern for...of loop.
 * @param {NodeList|HTMLElement[]} themeToggleBtns - List of buttons that trigger theme toggle.
 */
export function initTheme(themeToggleBtns) {
    if (!themeToggleBtns) return;
    for (const btn of themeToggleBtns) {
        btn.removeEventListener('click', toggleTheme); // Prevent duplicate listeners
        btn.addEventListener('click', toggleTheme);
    }
}
