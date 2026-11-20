(function() {
    let savedTheme;
    try { savedTheme = localStorage.getItem('theme'); } catch { /* Storage may be unavailable. */ }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }
    // Line drawings start hidden only when they will be drawn in; otherwise they stay whole.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const root = document.documentElement;
        root.classList.add('js-motion');
        // If the page script never arrives, show every drawing whole.
        setTimeout(() => { if (!root.classList.contains('line-ready')) root.classList.remove('js-motion'); }, 4000);
    }
})();
