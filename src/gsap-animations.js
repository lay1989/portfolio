import { prefersReducedMotion } from './utils.js';

/**
 * @file gsap-animations.js
 * @description GSAP animation module for the portfolio redesign.
 * Handles Lenis smooth scrolling, block-level scroll reveals, marquee,
 * hero entry animation, and stat counters.
 *
 * NOTE: Word-splitting DOM mutation was intentionally removed.
 * It destroyed nested <span> HTML inside headings (serif italic accents etc.)
 * and caused invisible text on load when GSAP is deferred.
 * All reveals are block-level: whole elements animate, not individual words.
 */

/**
 * Initializes Lenis smooth scrolling.
 * Falls back gracefully if Lenis is not available (CDN fail).
 * @returns {object|null} The Lenis instance or null
 */
export function initLenisScroll() {
    if (prefersReducedMotion()) return;
    if (typeof Lenis === 'undefined') return null;

    const lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    // GSAP ScrollTrigger integration — keeps ScrollTrigger positions in sync
    if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
    } else {
        // Fallback: standalone rAF loop
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    return lenis;
}

/**
 * Initializes scroll-triggered reveal animations on heading elements.
 * Uses simple block-level fade + slide — preserves all child HTML.
 * Targets elements with [data-split-reveal] attribute.
 * @returns {void}
 */
export function initSplitTextReveal() {
    if (prefersReducedMotion()) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    const targets = document.querySelectorAll('[data-split-reveal]');
    if (!targets.length) return;

    targets.forEach((el) => {
        // Ensure the element is visible before animating (never invisible by default)
        el.style.visibility = 'visible';

        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
            },
            y: 48,
            opacity: 0,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: 'all', // Clean up inline styles after animation finishes
        });
    });
}

/**
 * Initializes the hero section GSAP animation.
 * Staggers the label, heading, sub, stats row, and CTA buttons.
 * Operates on whole block elements — no text splitting.
 * @returns {void}
 */
export function initHeroAnimation() {
    if (prefersReducedMotion()) return;
    const hero = document.getElementById('hero');
    if (!hero) return;
    hero.querySelectorAll('.hero-label, .hero-headline, .hero-sub, .hero-ctas').forEach((element, index) => {
        element.animate?.(
            [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
            { duration: 550, delay: index * 70, easing: 'ease-out' }
        );
    });
}

/**
 * Marquee strip — handled entirely by CSS animation (marquee-scroll keyframe).
 * This function handles direction reversal for any strip with data-direction="reverse".
 * @returns {void}
 */
export function initMarquee() {
    const strips = document.querySelectorAll('.marquee-strip');
    strips.forEach((strip) => {
        if (strip.dataset.direction === 'reverse') {
            strip.style.animationDirection = 'reverse';
        }
    });
}

/**
 * Animates count-up stat counters when scrolled into view.
 * Targets elements with [data-count] attribute.
 * @returns {void}
 */
export function initCounters() {
    if (prefersReducedMotion()) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    counters.forEach((counter) => {
        const target = parseInt(counter.dataset.count, 10);
        const suffix = counter.dataset.suffix || '';
        const obj    = { val: 0 };

        gsap.to(obj, {
            scrollTrigger: {
                trigger: counter,
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            val: target,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate() {
                counter.textContent = Math.round(obj.val) + suffix;
            },
        });
    });
}

/**
 * Adds subtle parallax lift to project thumbnail images on scroll.
 * Only activates on elements with .project-thumb-parallax class.
 * @returns {void}
 */
export function initProjectParallax() {
    if (prefersReducedMotion()) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    const images = document.querySelectorAll('.project-thumb-parallax');
    if (!images.length) return;

    images.forEach((img) => {
        gsap.fromTo(
            img,
            { yPercent: -5 },
            {
                yPercent: 5,
                ease: 'none',
                scrollTrigger: {
                    trigger: img.closest('section, article, [data-project]') || img.parentElement,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            }
        );
    });
}
