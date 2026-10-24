/** Send only the action type and page path; never include form contents. */
export function trackContactAction(action) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', action, { page_path: window.location.pathname });
    }
}

export function initContactTracking() {
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        if (link.protocol === 'mailto:') trackContactAction('contact_email_click');
        else if (link.hostname === 'calendly.com') trackContactAction('booking_click');
    });
}
