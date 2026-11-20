import config from './config.generated.js';
export const motion = config;
let cleanups = null;
const activeReveals = new Set();

export function motionAllowed() {
    return config.enabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Register teardown while a motion session is being initialized. */
export function onMotionCleanup(cleanup) {
    cleanups?.push(cleanup);
}

/** Restore pre-animation inline styles, including styles set by hover handlers. */
export function preserveMotionStyles(elements) {
    const originals = [...elements].map(element => [element, element.getAttribute('style')]);
    onMotionCleanup(() => originals.forEach(([element, style]) => {
        window.gsap?.killTweensOf(element);
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
    }));
}

/** React to OS preferences without a reload; restore content and release listeners. */
export function initMotion(setup) {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let stop = null;
    const update = () => {
        stop?.();
        stop = null;
        if (!config.enabled || preference.matches) return;
        const session = [];
        cleanups = session;
        let context;
        try {
            if (window.gsap?.context) context = window.gsap.context(setup);
            else setup();
        } finally {
            cleanups = null;
        }
        stop = () => {
            for (const animation of activeReveals) animation.cancel();
            activeReveals.clear();
            context?.revert();
            for (const cleanup of session.reverse()) cleanup();
        };
    };
    update();
    preference.addEventListener('change', update);
    return () => {
        preference.removeEventListener('change', update);
        stop?.();
        stop = null;
    };
}

/** Progressive reveal: content remains visible when motion stops or scripts fail. */
export function reveal(element, index = 0) {
    if (!motionAllowed() || element.contains?.(document.activeElement)) return;
    const animation = element.animate?.([
        { opacity: 0, transform: `translateY(${config.offset}px)` },
        { opacity: 1, transform: 'none' },
    ], { duration: config.durations.reveal, delay: index * config.stagger, easing: config.easing.css });
    if (animation) {
        activeReveals.add(animation);
        const cancel = () => animation.cancel();
        const release = () => {
            activeReveals.delete(animation);
            element.removeEventListener('focusin', cancel);
        };
        element.addEventListener('focusin', cancel, { once: true });
        animation.addEventListener('finish', release, { once: true });
        animation.addEventListener('cancel', release, { once: true });
    }
    return animation;
}
