let revealElements = null;
let revealObserver = null;

/**
 * Initializes Scroll Reveal animation observers on elements matching the '.reveal' class.
 * Caches the reveal elements list in module scope and utilizes modern for...of loops.
 */
export function initScrollReveal() {
    revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        revealObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            }
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -60px 0px'
        });

        for (const el of revealElements) {
            revealObserver.observe(el);
        }
    }
}

/**
 * Adds a magnetic hover effect to primary buttons for a premium interaction.
 */
export function initMagneticButtons() {
    const buttons = document.querySelectorAll('.magnetic-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px)';
            btn.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transition = 'none';
        });
    });
}

let readingProgressScrollHandler = null;

/**
 * Initializes the Reading Progress Bar on blog articles.
 * Dynamically injects a progress bar element and tracks scroll progress.
 */
export function initReadingProgressBar(throttle) {
    const isBlogArticle = window.location.pathname.includes('blog-') && document.querySelector('article');
    if (!isBlogArticle) {
        return;
    }

    let progressBar = document.getElementById('reading-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'reading-progress';
        progressBar.className = 'fixed top-0 left-0 w-0 h-1 bg-accent z-[60] pointer-events-none transition-all duration-75';
        progressBar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(progressBar);
    }

    const updateWidth = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${scrollPercent}%`;
    };

    updateWidth();

    if (readingProgressScrollHandler) {
        window.removeEventListener('scroll', readingProgressScrollHandler);
    }

    readingProgressScrollHandler = throttle(updateWidth, 100);
    window.addEventListener('scroll', readingProgressScrollHandler, { passive: true });
}

/**
 * Initializes GSAP scroll triggers and hover effects for the services listing section.
 * @returns {void}
 */
export function initServicesAnimations() {
    const list = document.getElementById('services-list');
    const rows = document.querySelectorAll('.service-row');
    
    if (list && rows.length > 0 && window.gsap && window.ScrollTrigger) {
        // Register ScrollTrigger
        gsap.registerPlugin(ScrollTrigger);

        // Entry scroll reveal animation
        gsap.from(rows, {
            scrollTrigger: {
                trigger: list,
                start: 'top 85%',
                toggleActions: 'play none none none'
            },
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out'
        });

        // Hover interactions
        rows.forEach(row => {
            const title = row.querySelector('.service-title');
            const number = row.querySelector('.service-number');
            const mediaQuery = window.matchMedia('(hover: hover)');
            
            const onEnter = () => {
                gsap.to(row, { backgroundColor: 'var(--secondary)', duration: 0.3 });
                if (title) gsap.to(title, { x: 12, color: 'var(--accent)', duration: 0.3, ease: 'power2.out' });
                if (number) gsap.to(number, { x: 4, color: 'var(--accent)', duration: 0.3, ease: 'power2.out' });
            };

            const onLeave = () => {
                gsap.to(row, { backgroundColor: 'transparent', duration: 0.3 });
                if (title) gsap.to(title, { x: 0, color: 'var(--foreground)', duration: 0.3, ease: 'power2.out' });
                if (number) gsap.to(number, { x: 0, color: 'var(--muted-foreground)', duration: 0.3, ease: 'power2.out' });
            };

            if (mediaQuery.matches) {
                row.addEventListener('mouseenter', onEnter);
                row.addEventListener('mouseleave', onLeave);
            }
        });
    }
}

/**
 * Initializes GSAP scroll triggers and hover effects for the process (How I Work) grid section.
 * @returns {void}
 */
export function initProcessAnimations() {
    // Animations removed entirely as requested to ensure columns render statically and reliably.
}

/**
 * Initializes the iMessage-style directional stagger-in animation for review bubbles.
 * Left bubbles slide in from the left, right bubbles from the right, with progressive stagger.
 */
export function initReviewBubbleAnimations() {
    const leftBubbles = document.querySelectorAll('.review-bubble-left');
    const rightBubbles = document.querySelectorAll('.review-bubble-right');
    const allBubbles = document.querySelectorAll('.review-bubble-left, .review-bubble-right');

    if (allBubbles.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const index = [...allBubbles].indexOf(entry.target);
                const delay = index * 150;
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, delay);
                observer.unobserve(entry.target);
            }
        }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    for (const el of allBubbles) {
        observer.observe(el);
    }
}
