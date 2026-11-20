let disposeCurrent = null;

/** Fraction of an article traversed, excluding the footer and recommendations. */
export function readingFraction(scroll, start, height, viewport) {
    return Math.min(1, Math.max(0, (scroll - start) / Math.max(1, height - viewport)));
}

/** One paint per frame; image/font/layout changes update the article's bounds. */
export function initReadingProgressBar() {
    disposeCurrent?.();
    disposeCurrent = null;
    const article = document.querySelector('[data-reading-content]');
    if (!article) return;
    let bar = document.getElementById('reading-progress');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'reading-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
    }
    bar.className = 'reading-progress';
    bar.style.removeProperty('width');
    let frame = null;
    const render = () => {
        frame = null;
        const rect = article.getBoundingClientRect();
        bar.style.transform = `scaleX(${readingFraction(window.scrollY, rect.top + window.scrollY, rect.height, window.innerHeight)})`;
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(render); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(article);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    window.addEventListener('pageshow', schedule);
    render();
    disposeCurrent = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        observer?.disconnect();
        for (const event of ['scroll', 'resize', 'load', 'pageshow']) window.removeEventListener(event, schedule);
    };
    return disposeCurrent;
}
