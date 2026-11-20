/** The line: drawings that draw themselves once, the homepage thread that follows
 *  the reader down the page, and the small controls that belong to the same system.
 *  Everything here enhances markup that is complete without it. */
import { motionAllowed, onMotionCleanup } from './motion/index.js';

const root = document.documentElement;
const clamp = value => Math.max(0, Math.min(1, value));

/** Draw each `[data-draw]` once, when a third of it is on screen. */
function initDrawings() {
    const targets = [...document.querySelectorAll('[data-draw], .home-feedback-item')];
    if (!targets.length) return;
    if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
        targets.forEach(target => target.classList.add('is-drawn'));
        return;
    }
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-drawn');
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(target => observer.observe(target));
    onMotionCleanup(() => { observer.disconnect(); targets.forEach(target => target.classList.add('is-drawn')); });
}

/** A path written as a pen would draw it: straight runs, S-curves to change lanes,
 *  and a small loop (a bead) at each stop along the way. */
export class ThreadPath {
    constructor(x, y) { this.d = `M${x.toFixed(1)} ${y.toFixed(1)}`; this.x = x; this.y = y; }
    line(x, y) { if (Math.abs(x - this.x) + Math.abs(y - this.y) > 0.5) this.d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; this.x = x; this.y = y; return this; }
    /** Change lanes with a vertical S-curve between the current point and (x, y). */
    curve(x, y) {
        if (Math.abs(x - this.x) < 0.5) return this.line(x, y);
        const mid = (y - this.y) / 2;
        this.d += ` C${this.x.toFixed(1)} ${(this.y + mid).toFixed(1)} ${x.toFixed(1)} ${(y - mid).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
        this.x = x; this.y = y; return this;
    }
    /** A loop on the line at (x, y), drawn on the side the page has room for. */
    bead(y, r = 7, side = 1) {
        this.line(this.x, y - r);
        const sweep = side > 0 ? 1 : 0;
        this.d += ` a${r} ${r} 0 1 ${sweep} 0 ${2 * r} a${r} ${r} 0 1 ${sweep} 0 ${-2 * r}`;
        return this.line(this.x, y + r);
    }
}

/** Where the line runs on the homepage: the outer edge each section names, crossing in the gaps. */
function sectionRoute(page, box, at, narrow) {
    const sections = [...page.querySelectorAll(':scope > section[data-lane]')];
    const shell = page.querySelector('.home-shell').getBoundingClientRect();
    const edge = narrow ? 9 : Math.max(12, (shell.left - box.left) / 2);
    const lanes = { left: edge, right: box.width - edge };
    const [sx, sy] = at(page.querySelector('[data-thread-start]'));
    const path = new ThreadPath(sx, sy);
    const stops = [];
    sections.slice(1).forEach(section => {
        const top = section.offsetTop;
        const x = lanes[section.dataset.lane] ?? lanes.left;
        path.line(path.x, Math.max(path.y, top - 70)).curve(x, top + 34);
        const heading = section.querySelector('.home-heading');
        if (heading) {
            const [, hy] = at(heading);
            const y = hy + heading.offsetHeight / 2;
            // Beads sit on the outer side of the line, away from the text.
            path.bead(y, narrow ? 4 : 7, (x < box.width / 2) === narrow ? -1 : 1);
            stops.push([heading, y]);
        }
    });
    const [ex, ey] = at(page.querySelector('[data-thread-end]'));
    path.line(path.x, Math.max(path.y, ey - 90)).curve(ex, ey);
    return { d: path.d, stops };
}

/** Where the line runs on other pages: beside each stop (a heading or a drawing), with a bead at each. */
function stopRoute(page, box, at, narrow) {
    const stops = [...page.querySelectorAll(page.dataset.threadStops || '[data-thread-stop]')].filter(stop => stop.offsetParent);
    const start = page.querySelector('[data-thread-start]');
    const end = page.querySelector('[data-thread-end]');
    if (!stops.length || !start || !end) return null;
    const blockOf = stop => (page.dataset.threadBlock && stop.closest(page.dataset.threadBlock)) || stop;
    // "gutter": the line keeps to the outer margin, beside the content rather than through it.
    const laneFor = stop => narrow ? 9 : page.dataset.threadLane === 'gutter' ? Math.max(12, at(blockOf(stop))[0] / 2) : Math.max(12, at(stop)[0] - 26);
    const [sx, sy] = at(start);
    const path = new ThreadPath(sx, sy);
    const reached = [];
    stops.forEach(stop => {
        const [, top] = at(stop);
        const y = top + Math.min(stop.offsetHeight, 48) / 2;
        const x = laneFor(stop);
        // Change lanes in the space above the stop's block, never across its content.
        const crossAt = blockOf(stop) === stop ? y - 30 : at(blockOf(stop))[1] - 14;
        if (Math.abs(x - path.x) > 0.5) path.line(path.x, Math.max(path.y, crossAt - 90)).curve(x, crossAt);
        path.bead(y, narrow ? 4 : 7, narrow ? -1 : 1);
        reached.push([stop, y]);
    });
    const [ex, ey] = at(end);
    path.line(path.x, Math.max(path.y, ey - 110)).curve(ex, ey);
    return { d: path.d, stops: reached };
}

/** One line per page, drawn as far as the reader has read; the dot is the pen. */
function initThread() {
    const page = document.querySelector('[data-thread-page]');
    if (!page || !page.querySelector('[data-thread-start]') || !page.querySelector('[data-thread-end]')) return;
    let svg = page.querySelector(':scope > .thread');
    if (!svg) {
        page.insertAdjacentHTML('afterbegin', '<svg class="thread" aria-hidden="true" focusable="false"><path class="thread__path"/><circle class="thread__pen" r="5"/></svg>');
        svg = page.querySelector(':scope > .thread');
    }
    const path = svg.querySelector('.thread__path');
    const pen = svg.querySelector('.thread__pen');
    if (!path.getTotalLength) return;
    const animated = motionAllowed();
    let samples = [], length = 0, stops = [], request = null, current = null, target = 0, easing = null;

    const layout = () => {
        const box = page.getBoundingClientRect();
        const at = element => { const r = element.getBoundingClientRect(); return [r.left - box.left, r.top - box.top]; };
        const narrow = window.innerWidth < 900;
        const route = page.dataset.threadMode === 'sections' ? sectionRoute(page, box, at, narrow) : stopRoute(page, box, at, narrow);
        if (!route) { svg.hidden = true; return; }
        svg.hidden = false;
        path.setAttribute('d', route.d);
        stops = route.stops;
        length = path.getTotalLength();
        current = null;
        path.style.strokeDasharray = `${length} ${length}`;
        samples = [];
        for (let s = 0; s <= length; s += 8) samples.push([s, path.getPointAtLength(s).y]);
        samples.push([length, path.getPointAtLength(length).y]);
        draw();
    };
    const lengthAt = y => {
        let best = 0;
        for (const [s, py] of samples) { if (py <= y) best = s; else if (py > y + 400) break; }
        return best;
    };
    const render = drawn => {
        path.style.strokeDashoffset = String(length - drawn);
        const point = path.getPointAtLength(drawn);
        pen.setAttribute('cx', point.x); pen.setAttribute('cy', point.y);
        svg.toggleAttribute('data-live', animated && drawn > 2 && drawn < length - 2);
    };
    /** The pen never jumps: it eases toward the reading position at a steady, capped pace,
     *  so long crossings draw across instead of snapping into place. */
    const ease = () => {
        easing = null;
        const gap = target - current;
        if (Math.abs(gap) < 0.5) current = target;
        else current += Math.sign(gap) * Math.max(1, Math.min(Math.abs(gap) * 0.1, 14));
        render(current);
        if (current !== target) easing = requestAnimationFrame(ease);
    };
    const draw = () => {
        request = null;
        if (!length) return;
        const box = page.getBoundingClientRect();
        const reading = window.innerHeight * 0.72 - box.top;
        target = animated ? lengthAt(reading) : length;
        stops.forEach(([stop, y]) => stop.toggleAttribute('data-reached', !animated || y <= reading));
        if (current === null || !animated) { current = target; render(current); return; }
        if (easing === null) easing = requestAnimationFrame(ease);
    };
    const schedule = () => { if (request === null) request = requestAnimationFrame(draw); };
    let timer;
    const relayout = () => { clearTimeout(timer); timer = setTimeout(layout, 120); };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(relayout).observe(page);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('load', layout);
    document.fonts?.ready.then(layout);
    layout();
}

/** Services on wide screens: a drawing board beside the list shows the service being read. */
function initServiceBoard() {
    const section = document.getElementById('services');
    const list = section?.querySelector('#services-list');
    const rows = list ? [...list.querySelectorAll('.home-service-row')] : [];
    if (rows.length < 2) return;
    const board = document.createElement('div');
    board.className = 'service-board';
    board.setAttribute('aria-hidden', 'true');
    rows.forEach((row, index) => {
        const item = document.createElement('div');
        item.className = 'service-board__item';
        item.dataset.index = index;
        const art = row.querySelector('.home-service-glyph svg')?.cloneNode(true);
        if (art) { const holder = document.createElement('div'); holder.className = 'service-board__art'; holder.setAttribute('data-draw', ''); holder.append(art); item.append(holder); }
        const title = document.createElement('p');
        title.className = 'service-board__title';
        title.textContent = row.querySelector('.home-service-title')?.textContent.trim() || '';
        item.append(title);
        board.append(item);
    });
    const counter = document.createElement('p');
    counter.className = 'service-board__count';
    board.append(counter);
    list.before(board);
    section.classList.add('has-board');
    const items = [...board.querySelectorAll('.service-board__item')];
    let active = -1;
    const show = index => {
        if (index === active) return;
        active = index;
        rows.forEach((row, i) => row.toggleAttribute('data-active', i === index));
        items.forEach((item, i) => {
            const on = i === index;
            item.classList.toggle('is-active', on);
            const art = item.querySelector('[data-draw]');
            if (!art) return;
            if (on) { art.classList.remove('is-drawn'); void art.offsetWidth; art.classList.add('is-drawn'); }
        });
        counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(rows.length).padStart(2, '0')}`;
    };
    show(0);
    rows.forEach((row, index) => {
        row.addEventListener('pointerenter', () => show(index));
        row.addEventListener('focusin', () => show(index));
    });
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) show(rows.indexOf(entry.target));
    }, { rootMargin: '-48% 0px -48% 0px' });
    rows.forEach(row => observer.observe(row));
}

/** The process line fills as the steps are reached. */
function initProcessLine() {
    const steps = document.getElementById('process-container');
    if (!steps || !motionAllowed()) return;
    let request = null;
    const update = () => {
        request = null;
        const rect = steps.getBoundingClientRect();
        steps.style.setProperty('--steps', clamp((window.innerHeight * 0.85 - rect.top) / Math.max(1, rect.width * 0.5)).toFixed(3));
    };
    window.addEventListener('scroll', () => { if (request === null) request = requestAnimationFrame(update); }, { passive: true });
    update();
}

/** When a message is sent, the paper plane at the end of the line flies off. */
function initPlane() {
    const status = document.getElementById('contact-status');
    const art = document.querySelector('.home-contact__art');
    if (!status || !art) return;
    new MutationObserver(() => {
        if (status.dataset.state === 'success') art.classList.add('is-sent');
    }).observe(status, { attributes: true, attributeFilter: ['data-state'] });
}

/** The bar steps aside while reading down and returns on the way up; home links follow the section in view. */
function initNavBehaviour() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    let last = window.scrollY, request = null;
    const update = () => {
        request = null;
        const y = window.scrollY;
        if (Math.abs(y - last) < 6) return;
        nav.toggleAttribute('data-hidden', y > last && y > 360);
        last = y;
    };
    window.addEventListener('scroll', () => { if (request === null) request = requestAnimationFrame(update); }, { passive: true });
    if (typeof IntersectionObserver === 'undefined') return;
    const links = new Map();
    nav.querySelectorAll('.nav-links-desktop a[href*="#"]').forEach(link => {
        const section = document.getElementById(link.getAttribute('href').split('#')[1]);
        if (section && section.id !== 'contact') links.set(section, link);
    });
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) links.get(entry.target)?.toggleAttribute('data-active', entry.isIntersecting);
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, section) => observer.observe(section));
}

/** An outline beside long text, built from its own headings. */
function initOutline() {
    const nav = document.querySelector('[data-entry-outline]');
    const story = document.querySelector('[data-entry-story]');
    if (!nav || !story) return;
    const headings = [...story.querySelectorAll('h2')].filter(heading => heading.textContent.trim());
    if (headings.length < 3) return;
    const links = headings.map((heading, index) => {
        heading.id ||= `section-${index + 1}`;
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent.trim();
        nav.append(link);
        return link;
    });
    nav.hidden = false;
    let request = null;
    const update = () => {
        request = null;
        const passed = headings.filter(heading => heading.getBoundingClientRect().top < window.innerHeight * 0.35);
        const current = passed.at(-1) || headings[0];
        links.forEach((link, index) => link.toggleAttribute('aria-current', headings[index] === current));
        const box = story.getBoundingClientRect();
        const read = Math.min(1, Math.max(0, (window.innerHeight * 0.35 - box.top) / box.height));
        nav.style.setProperty('--read', read.toFixed(3));
    };
    window.addEventListener('scroll', () => { if (request === null) request = requestAnimationFrame(update); }, { passive: true });
    update();
}

/** On case studies, articles and Tools, each part of the story rises in as it is reached. */
function initStoryReveal() {
    const story = document.querySelector('[data-entry-story]');
    if (!story || !root.classList.contains('js-motion') || !('IntersectionObserver' in window)) return;
    // Plain wrappers (sections, rich-text containers) are opened up so paragraphs arrive one by one.
    const open = element => (element.matches('section, div:not([class*="media"]):not(.entry-verdict)') && element.children.length > 1)
        ? [...element.children].flatMap(open) : [element];
    const parts = [...story.children].filter(part => !part.matches('.thread-start')).flatMap(open)
        .concat([...document.querySelectorAll('.entry-figures, .entry-quote, .entry-gallery, .entry-next')]);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px' });
    parts.forEach(part => { part.dataset.reveal = ''; observer.observe(part); });
}

/** Project figures such as "$32k+" count up once, when first seen. */
export function figureParts(text) {
    const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(text.trim());
    if (!match) return null;
    const digits = match[2].replace(/,/g, '');
    return { prefix: match[1], value: Number(digits), decimals: (digits.split('.')[1] || '').length, grouped: match[2].includes(','), suffix: match[3] };
}
function initCountUp() {
    if (!motionAllowed() || typeof IntersectionObserver === 'undefined') return;
    const figures = [...document.querySelectorAll('[data-count-up]')].map(element => ({ element, text: element.textContent, parts: figureParts(element.textContent) })).filter(figure => figure.parts);
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            const figure = figures.find(item => item.element === entry.target);
            const { prefix, value, decimals, grouped, suffix } = figure.parts;
            const begin = performance.now();
            const format = number => grouped ? number.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : number.toFixed(decimals);
            const step = now => {
                const progress = Math.min(1, (now - begin) / 1400);
                figure.element.textContent = progress < 1 ? prefix + format(value * (1 - Math.pow(1 - progress, 4))) + suffix : figure.text;
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }
    }, { rootMargin: '0px 0px -15% 0px' });
    figures.forEach(figure => observer.observe(figure.element));
}

/** Screens from a build open at full size; Escape, the button or the backdrop closes them. */
function initLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const picture = document.getElementById('lightbox-img');
    const close = document.getElementById('lightbox-close');
    if (!modal || !picture || modal.dataset.ready) return;
    modal.dataset.ready = 'true';
    let opener = null;
    const shut = () => { modal.classList.remove('active'); opener?.focus(); opener = null; };
    const open = trigger => {
        const image = trigger.querySelector('img');
        picture.src = trigger.dataset.zoomSrc || image?.currentSrc || image?.src || '';
        picture.alt = image?.alt || '';
        opener = trigger;
        modal.classList.add('active');
        close?.focus();
    };
    document.querySelectorAll('[data-zoom-src], .entry-gallery .media-figure').forEach(trigger => {
        if (!trigger.hasAttribute('tabindex')) { trigger.tabIndex = 0; trigger.setAttribute('role', 'button'); }
        trigger.addEventListener('click', () => open(trigger));
        trigger.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(trigger); } });
    });
    close?.addEventListener('click', shut);
    modal.addEventListener('click', event => { if (event.target === modal) shut(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('active')) shut(); });
}

/** Readable dates in listings; the datetime attribute keeps the machine value. */
function initReadableDates() {
    document.querySelectorAll('main time[datetime]').forEach(time => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(time.textContent.trim());
        if (!match) return;
        time.textContent = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])));
    });
}

export function initLine() {
    initDrawings();
    initThread();
    initServiceBoard();
    initProcessLine();
    initPlane();
    initNavBehaviour();
    initOutline();
    initStoryReveal();
    initCountUp();
    initLightbox();
    initReadableDates();
    root.classList.add('line-ready');
}
