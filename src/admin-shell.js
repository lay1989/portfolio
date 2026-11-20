import layout from './admin-layout.generated.js';

/** Native dialog handles mobile focus containment; ordinary links remain the fallback. */
export function initAdminNavigation(doc = document, host = window) {
    const trigger = doc.querySelector('[data-admin-menu]');
    const drawer = doc.querySelector('[data-admin-drawer]');
    const fallback = doc.querySelector('[data-admin-nav-fallback]');
    if (!trigger || !drawer || typeof drawer.showModal !== 'function') return;
    const desktop = host.matchMedia(layout.desktopQuery);
    let restoreFocus = true;
    const open = () => {
        if (desktop.matches || drawer.open) return;
        restoreFocus = true;
        drawer.showModal();
        trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => { if (drawer.open) drawer.close(); };
    const closed = () => {
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus && !desktop.matches) trigger.focus();
    };
    const click = event => {
        if (event.target.closest('[data-admin-drawer-close]')) close();
        else if (event.target.closest('a[href]')) { restoreFocus = false; close(); }
    };
    const containFocus = event => {
        if (event.key !== 'Tab') return;
        const focusable = [...drawer.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resized = () => {
        if (!desktop.matches || !drawer.open) return;
        restoreFocus = false;
        close();
        doc.querySelector('.admin-sidebar [aria-current="page"]')?.focus();
    };
    trigger.hidden = false;
    if (fallback) fallback.open = false;
    doc.body.setAttribute('data-admin-nav-ready', '');
    trigger.addEventListener('click', open);
    drawer.addEventListener('click', click);
    drawer.addEventListener('close', closed);
    drawer.addEventListener('keydown', containFocus);
    desktop.addEventListener('change', resized);
    return () => {
        close();
        trigger.removeEventListener('click', open);
        drawer.removeEventListener('click', click);
        drawer.removeEventListener('close', closed);
        drawer.removeEventListener('keydown', containFocus);
        desktop.removeEventListener('change', resized);
        trigger.hidden = true;
        doc.body.removeAttribute('data-admin-nav-ready');
    };
}

if (typeof document !== 'undefined') initAdminNavigation();
