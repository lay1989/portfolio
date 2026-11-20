import { motion, onMotionCleanup } from './motion/index.js';

/** Enhance the readable project stack with a reversible desktop horizontal reel. */
export function initWorkReel() {
    const reel = document.querySelector('[data-work-reel]');
    const gsap = window.gsap;
    if (!reel || !gsap?.matchMedia || !window.ScrollTrigger) return;
    gsap.registerPlugin(window.ScrollTrigger);
    const media = gsap.matchMedia();
    onMotionCleanup(() => media.revert());
    media.add(motion.reelQuery, () => {
        const viewport = reel.querySelector('.work-reel__viewport');
        const track = reel.querySelector('[data-work-track]');
        const slides = [...reel.querySelectorAll('[data-work-slide]')];
        const bar = reel.querySelector('[data-work-bar]');
        if (slides.length < 2) return;
        const count = bar.querySelector('[data-work-count]');
        const progress = bar.querySelector('[data-work-progress]');
        const previous = bar.querySelector('[data-work-prev]');
        const next = bar.querySelector('[data-work-next]');
        const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
        let active = 0, tween, resize, frame, disposed = false;
        const refresh = () => {
            if (disposed) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => { if (!disposed) window.ScrollTrigger.refresh(); });
        };
        const sync = () => {
            const moved = Math.abs(Number(gsap.getProperty(track, 'x')) || 0);
            active = slides.reduce((best, slide, index) =>
                Math.abs(slide.offsetLeft - moved) < Math.abs(slides[best].offsetLeft - moved) ? index : best, 0);
            count.textContent = slides[active].querySelector('.work-slide__number').textContent;
            previous.disabled = active === 0;
            next.disabled = active === slides.length - 1;
            progress.style.transform = `scaleX(${distance() ? moved / distance() : 1})`;
        };
        const show = index => {
            const trigger = tween.scrollTrigger;
            const fraction = Math.min(1, slides[index].offsetLeft / (distance() || 1));
            window.scrollTo({ top: trigger.start + fraction * (trigger.end - trigger.start), behavior: 'instant' });
            window.ScrollTrigger.update();
        };
        const back = () => show(Math.max(0, active - 1));
        const forward = () => show(Math.min(slides.length - 1, active + 1));
        const focus = event => {
            const index = slides.indexOf(event.target.closest('[data-work-slide]'));
            if (index < 0) return;
            viewport.scrollLeft = 0;
            const rect = slides[index].getBoundingClientRect();
            if (rect.left < 0 || rect.right > viewport.clientWidth) show(index);
        };
        const cleanup = () => {
            disposed = true;
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('pageshow', refresh);
            resize?.disconnect();
            previous.removeEventListener('click', back);
            next.removeEventListener('click', forward);
            reel.removeEventListener('focusin', focus);
            reel.removeAttribute('data-reel-ready');
            bar.hidden = true;
            progress.style.removeProperty('transform');
        };
        reel.setAttribute('data-reel-ready', '');
        bar.hidden = false;
        try {
            tween = gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: {
                trigger: viewport, start: `top ${top}`, end: () => `+=${distance()}`,
                pin: true, scrub: true, invalidateOnRefresh: true, onUpdate: sync, onRefresh: sync,
            } });
            previous.addEventListener('click', back);
            next.addEventListener('click', forward);
            reel.addEventListener('focusin', focus);
            window.addEventListener('pageshow', refresh);
            document.fonts?.ready.then(refresh);
            resize = new ResizeObserver(() => {
                if (slides.some(slide => slide.querySelector('.work-slide__copy').scrollHeight > slide.clientHeight)) media.revert();
            });
            slides.forEach(slide => resize.observe(slide.querySelector('.work-slide__copy')));
            sync();
        } catch {
            tween?.scrollTrigger?.kill();
            tween?.revert();
            cleanup();
        }
        return cleanup;
    });
}
