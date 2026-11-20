document.addEventListener('DOMContentLoaded', () => {
  // ── Lightbox Modal ──
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  let activeTrigger = null;

  if (modal && modalImg && closeBtn) {
    const openLightbox = (src, trigger) => {
      activeTrigger = trigger;
      modalImg.src = src;
      modal.classList.add('active');
      closeBtn.focus();
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      modal.classList.remove('active');
      modalImg.src = '';
      document.body.style.overflow = '';
      if (activeTrigger) {
        activeTrigger.focus();
        activeTrigger = null;
      }
    };

    document.querySelectorAll('[data-zoom-src]').forEach((el) => {
      el.addEventListener('click', () => openLightbox(el.dataset.zoomSrc, el));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(el.dataset.zoomSrc, el);
        }
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // ── ScrollSpy for Case Study Outline ──
  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
    const sections = tocLinks
      .map((link) => {
        const id = link.getAttribute('href')?.replace('#', '');
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    const setActiveToc = (id) => {
      tocLinks.forEach((link) => {
        const match = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', match);
        if (match) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveToc(entry.target.id);
          }
        });
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: 0.1 }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  // ── GSAP Entrance & Scroll Animations ──
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero
  gsap.from('#hero [data-eyebrow] > *', { y: 20, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'expo.out' });
  gsap.fromTo('#hero .reveal-word > span', { y: '110%', yPercent: 0 }, { y: '0%', yPercent: 0, stagger: 0.05, duration: 0.9, delay: 0.15, ease: 'expo.out' });
  gsap.to('#hero [data-underline]', { scaleX: 1, duration: 1.1, delay: 0.6, ease: 'expo.out', transformOrigin: '0% 50%' });
  gsap.from('#hero [data-tagline]', { y: 16, opacity: 0, delay: 0.4, duration: 0.8, ease: 'expo.out' });
  gsap.fromTo(
    '#hero [data-cover]',
    { clipPath: 'inset(8% round 16px)' },
    { clipPath: 'inset(0% round 16px)', duration: 1.2, ease: 'expo.out' }
  );
  gsap.to('#hero [data-cover] img', {
    scale: 1.05,
    yPercent: 6,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=80%', scrub: true },
  });

  // Prose reveal — any element with data-reveal
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: 'expo.out',
    });
  });
});
