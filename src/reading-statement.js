import { motion, motionAllowed, onMotionCleanup } from './motion/index.js';

/** Number of words passed by the reading line, independent of frame rate. */
export function readingWordCount(top, height, viewportHeight, count, settings) {
    const distance = height + viewportHeight * (settings.readingStart - settings.readingEnd);
    const progress = Math.max(0, Math.min(1, (viewportHeight * settings.readingStart - top) / Math.max(1, distance)));
    return Math.floor(progress * count);
}

/** One geometry read per frame; activated words stay readable when scrolling back. */
export function trackReadingWords(heading, words, settings) {
    let frame = null;
    let completed = false;
    let disposed = false;
    let highWater = -1;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);

    function detach() {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        observer?.disconnect();
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
    }
    function update() {
        frame = null;
        if (disposed || completed) return;
        const rect = heading.getBoundingClientRect();
        const visible = Math.max(highWater, readingWordCount(rect.top, rect.height, window.innerHeight, words.length, settings));
        if (visible !== highWater) {
            words.forEach((word, index) => { word.style.opacity = String(index < visible ? 1 : settings.mutedOpacity); });
            highWater = visible;
        }
        if (visible === words.length) {
            completed = true;
            detach();
        }
    }
    function schedule() {
        if (!disposed && !completed && frame === null) frame = window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    observer?.observe(heading);
    update();
    return () => {
        disposed = true;
        detach();
        words.forEach(word => { word.style.opacity = '1'; });
    };
}

/** Enhance server-rendered copy; cleanup restores its exact original markup. */
export function initReadingStatements() {
    if (!motionAllowed() || !motion.tagline || !window.requestAnimationFrame) return;
    document.querySelectorAll('[data-reading-statement]').forEach(heading => {
        const original = [...heading.childNodes].map(node => node.cloneNode(true));
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        const words = [];
        nodes.forEach(node => {
            const fragment = document.createDocumentFragment();
            node.textContent.split(/(\s+)/u).filter(Boolean).forEach(token => {
                if (/^\s+$/u.test(token)) fragment.append(document.createTextNode(token));
                else {
                    const word = document.createElement('span');
                    word.className = 'home-reading-word';
                    word.textContent = token;
                    fragment.append(word);
                    words.push(word);
                }
            });
            node.replaceWith(fragment);
        });
        const stop = trackReadingWords(heading, words, motion.tagline);
        onMotionCleanup(() => {
            stop();
            heading.replaceChildren(...original);
        });
    });
}
