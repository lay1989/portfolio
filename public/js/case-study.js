document.addEventListener('DOMContentLoaded', () => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero
  gsap.from('#hero [data-eyebrow] > *', { y: 20, opacity: 0, stagger: .06, duration: .7, ease: 'expo.out' });
  gsap.fromTo('#hero .reveal-word > span', { y: '110%', yPercent: 0 }, { y: '0%', yPercent: 0, stagger: .05, duration: .9, delay: .15, ease: 'expo.out' });
  gsap.to('#hero [data-underline]',      { scaleX: 1, duration: 1.1, delay: .6, ease: 'expo.out', transformOrigin: '0% 50%' });
  gsap.from('#hero [data-tagline]',      { y: 16, opacity: 0, delay: .4, duration: .8, ease: 'expo.out' });
  gsap.fromTo('#hero [data-cover]',
    { clipPath: 'inset(8% round 16px)' },
    { clipPath: 'inset(0% round 16px)', duration: 1.2, ease: 'expo.out' });
  gsap.to('#hero [data-cover] img', {
    scale: 1.1, yPercent: 8,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=80%', scrub: true },
  });

  // Prose reveal — any element with data-reveal
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 24, opacity: 0, duration: .9, ease: 'expo.out',
    });
  });
});



document.querySelectorAll('#decisions button[aria-controls]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('#decisions button[aria-controls]').forEach((b) => {
      if (b === btn) return;
      b.setAttribute('aria-expanded', 'false');
      const p = document.getElementById(b.getAttribute('aria-controls'));
      p.classList.remove('grid-rows-[1fr]', 'opacity-100');
      p.classList.add('grid-rows-[0fr]', 'opacity-0');
    });
    btn.setAttribute('aria-expanded', String(!open));
    panel.classList.toggle('grid-rows-[1fr]', !open);
    panel.classList.toggle('opacity-100', !open);
    panel.classList.toggle('grid-rows-[0fr]', open);
    panel.classList.toggle('opacity-0', open);
  });
});

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in'));
}, { threshold: .3 });
document.querySelectorAll('[data-counter]').forEach((el) => io.observe(el));
