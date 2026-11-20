const ADMIN_THEME_KEY = 'admin-theme';
const normalize = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';

/** Apply the independent admin preference before paint, then enhance native controls. */
export function initAdminTheme(doc = document, host = window) {
    const system = host.matchMedia('(prefers-color-scheme: dark)');
    let choice = 'system';
    let controls = [];
    try { choice = normalize(host.localStorage.getItem(ADMIN_THEME_KEY)); } catch { /* Use System without storage. */ }
    const apply = () => {
        const dark = choice === 'dark' || (choice === 'system' && system.matches);
        doc.documentElement.classList.toggle('dark', dark);
        doc.documentElement.classList.toggle('light', !dark);
        doc.documentElement.setAttribute('data-admin-appearance', choice);
        controls.forEach(control => { control.value = choice; });
    };
    const change = event => {
        choice = normalize(event.target.value);
        try { host.localStorage.setItem(ADMIN_THEME_KEY, choice); } catch { /* Keep this page's choice usable. */ }
        apply();
    };
    const mount = () => {
        controls = [...doc.querySelectorAll('[data-admin-theme]')];
        controls.forEach(control => {
            control.disabled = false;
            control.addEventListener('change', change);
        });
        apply();
    };
    const preferenceChanged = () => { if (choice === 'system') apply(); };
    const storageChanged = event => {
        if (event.key !== ADMIN_THEME_KEY && event.key !== null) return;
        // Session-storage events do not change the independent browser preference.
        try { if (event.storageArea && event.storageArea !== host.localStorage) return; } catch { return; }
        choice = normalize(event.newValue);
        apply();
    };
    apply();
    system.addEventListener('change', preferenceChanged);
    host.addEventListener('storage', storageChanged);
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
    return () => {
        system.removeEventListener('change', preferenceChanged);
        host.removeEventListener('storage', storageChanged);
        doc.removeEventListener('DOMContentLoaded', mount);
        controls.forEach(control => control.removeEventListener('change', change));
    };
}

if (typeof document !== 'undefined') initAdminTheme();
