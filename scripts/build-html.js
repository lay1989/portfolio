/**
 * build-html.js — Static Site Generator
 *
 * Assembles all HTML pages from:
 *   - templates/base.html        (master layout)
 *   - templates/project-case-study.html (case study body)
 *   - components/header.html     (nav)
 *   - components/footer.html     (footer)
 *   - content/*.html             (body content fragments)
 *   - pages.json                 (per-page metadata)
 *   - data/projects.json         (project data)
 *
 * Usage: node scripts/build-html.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cheerio = require('cheerio');
const site = require('../data/site.json');
const imageManifest = JSON.parse(fs.readFileSync(path.join(root, '.cache/image-manifest.json'), 'utf8'));

// Social sharing script for project pages
const socialSharingScript = `
<script>
function shareOnTwitter() {
    var url = encodeURIComponent(window.location.href);
    var text = encodeURIComponent('Check out this amazing project: ' + document.title);
    window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, '_blank');
}
function shareOnLinkedIn() {
    var url = encodeURIComponent(window.location.href);
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
}
function copyProjectLink() {
    navigator.clipboard.writeText(window.location.href).then(function() {
        alert('Project link copied to clipboard!');
    });
}
</script>`;

// ──────────────────────────────────────────
// Load all source files
// ──────────────────────────────────────────
const withIdentity = require('./identity-component');
const { drawing, withDrawings } = require('./drawings');
const projectGlyphs = require('../app/templates/drawings/projects.json');
const glyphFor = slug => drawing(projectGlyphs[slug] || 'generic');
const baseTemplate = withIdentity(fs.readFileSync(path.join(root, 'templates', 'base.html'), 'utf-8'));
const caseStudyTemplate = fs.readFileSync(path.join(root, 'templates', 'project-case-study.html'), 'utf-8');
const headerHtml = withIdentity(fs.readFileSync(path.join(root, 'components', 'header.html'), 'utf-8'));
const footerHtml = withIdentity(fs.readFileSync(path.join(root, 'components', 'footer.html'), 'utf-8'));
const pagesJson = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf-8'));
const projectsData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'projects.json'), 'utf-8'));
const postsData = fs.existsSync(path.join(root, 'data', 'posts.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'data', 'posts.json'), 'utf-8')) : { posts: [] };

const projects = projectsData.projects;
const posts = postsData.posts;

// ──────────────────────────────────────────
// Helper: resolve base path for assets
// ──────────────────────────────────────────
function getBasePath(outputFile) {
    return '../'.repeat(outputFile.replace(/\\/g, '/').split('/').length - 1) || './';
}

// ──────────────────────────────────────────
// Helper: build <head> meta tags from page config
// ──────────────────────────────────────────
function buildOgMeta(page) {
    const lines = [];
    lines.push(`<meta property="og:type" content="${page.ogType || 'website'}">`);
    lines.push(`<meta property="og:title" content="${escHtml(page.ogTitle || page.title)}">`);
    lines.push(`<meta property="og:description" content="${escHtml(page.ogDescription || page.description)}">`);
    lines.push(`<meta property="og:url" content="${page.ogUrl || page.canonical}">`);
    lines.push(`<meta property="og:image" content="${page.ogImage || `${site.url}/public/images/og-image.png`}">`);
    return lines.join('\n    ');
}

function buildTwitterMeta(page) {
    const lines = [];
    if (page.twitterTitle) lines.push(`<meta name="twitter:title" content="${escHtml(page.twitterTitle)}">`);
    if (page.twitterDescription) lines.push(`<meta name="twitter:description" content="${escHtml(page.twitterDescription)}">`);
    return lines.join('\n    ');
}

function buildArticleMeta(page) {
    if (!page.articleMeta) return '';
    const lines = [];
    if (page.articleMeta.author) lines.push(`<meta property="article:author" content="${escHtml(page.articleMeta.author)}">`);
    if (page.articleMeta.publishedTime) lines.push(`<meta property="article:published_time" content="${page.articleMeta.publishedTime}">`);
    return lines.join('\n    ');
}

function buildStructuredData(page) {
    if (!page.structuredData) return '';
    return `<script type="application/ld+json">\n    ${JSON.stringify(page.structuredData, null, 4)}\n    </script>`;
}

function buildKeywordsMeta(page) {
    if (!page.keywords) return '';
    return `<meta name="keywords" content="${escHtml(page.keywords)}">`;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ──────────────────────────────────────────
// Helper: render responsive <picture> element
// ──────────────────────────────────────────
function renderResponsivePicture(imgPath, alt, className, sizes, eager, pageBasePath = './') {
    if (!imgPath) return '';

    let resolvedPath = imgPath;
    if (imgPath.startsWith('./')) {
        resolvedPath = imgPath.replace(/^\.\//, pageBasePath);
    } else if (!imgPath.startsWith('http') && !imgPath.startsWith('/')) {
        resolvedPath = pageBasePath + imgPath;
    }

    const asset = imgPath.replace(/^\.\//, '');
    const full = imageManifest[asset];
    if (!full) throw new Error(`Missing image metadata: ${asset}`);
    const base = resolvedPath.replace(/\.(webp|png|jpg|jpeg)$/i, '');
    const assetBase = asset.replace(/\.(webp|png|jpg|jpeg)$/i, '');
    const webp = imageManifest[assetBase + '.webp'];
    const small = imageManifest[assetBase + '-small.webp'];
    const candidates = [];
    if (small) candidates.push(`${encodeURI(base + '-small.webp')} ${small.width}w`);
    if (webp && (!small || webp.width !== small.width)) candidates.push(`${encodeURI(base + '.webp')} ${webp.width}w`);
    const pictureClass = ['block', className.includes('h-full') && 'h-full', className.includes('w-full') && 'w-full'].filter(Boolean).join(' ');
    return `<picture class="${pictureClass}">${candidates.length ? `\n        <source type="image/webp" srcset="${candidates.join(', ')}" sizes="${sizes || '(max-width: 768px) 90vw, 896px'}">` : ''}
        <img src="${encodeURI(resolvedPath)}" width="${full.width}" height="${full.height}" alt="${escHtml(alt)}" class="${className || 'w-full h-auto object-cover'}" decoding="async"${eager ? '' : ' loading="lazy"'}>
    </picture>`;
}

// ──────────────────────────────────────────
// Helper: render project case study body
// ──────────────────────────────────────────
function renderCaseStudy(project, basePath) {
    let html = caseStudyTemplate;

    // Next Project calculation
    const currentIdx = projects.findIndex(p => p.id === project.id);
    const nextProject = projects[(currentIdx + 1) % projects.length];

    // Simple replacements
    html = html.replace(/\{\{BASE_PATH\}\}/g, basePath);
    html = html.replace(/\{\{PROJECT_TITLE\}\}/g, escHtml(project.title));
    html = html.replace(/\{\{PROJECT_CATEGORY\}\}/g, escHtml(project.category));
    html = html.replace(/\{\{PROJECT_CLIENT_TYPE\}\}/g, escHtml(project.clientType || 'Client'));
    html = html.replace(/\{\{PROJECT_YEAR\}\}/g, escHtml(project.year));
    html = html.replace(/\{\{PROJECT_ROLE\}\}/g, escHtml(project.role));
    html = html.replace(/\{\{PROJECT_TIMELINE\}\}/g, escHtml(project.timeline));
    html = html.replace(/\{\{PROJECT_NEXT_URL\}\}/g, `${basePath}projects/${nextProject.slug}.html`);
    html = html.replace(/\{\{PROJECT_NEXT_TITLE\}\}/g, escHtml(nextProject.title));
    
    // Title Words for GSAP
    const titleWords = project.title.split(' ').map(word => 
        `<span class="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom reveal-word"><span class="inline-block word-in">${escHtml(word)}</span></span>`
    ).join('');
    html = html.replace(/\{\{PROJECT_TITLE_WORDS\}\}/g, titleWords);

    // Tagline Snippet
    html = html.replace(/\{\{PROJECT_CHALLENGE_SNIPPET\}\}/g, escHtml(project.shortDesc));
    
    // Overview Drop Cap
    const overview = project.overview || project.shortDesc;
    html = html.replace(/\{\{PROJECT_OVERVIEW_DROP_CAP\}\}/g, `<p class="drop-cap">${escHtml(overview)}</p>`);

    // Tech Chips
    const cleanUrl = (project.liveUrl && project.liveUrl !== '#') ? project.liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : `${project.slug}.internal`;
    html = html.replace(/\{\{PROJECT_CLEAN_URL\}\}/g, cleanUrl);
    const techArr = project.tools ? project.tools.split(',').map(t => t.trim()) : [];
    const chipsHtml = techArr.map(t => `<span class="rounded-full border border-border px-2.5 py-0.5 text-xs">${escHtml(t)}</span>`).join('');
    html = html.replace(/\{\{PROJECT_TECH_CHIPS\}\}/g, chipsHtml);

    // Links Section
    let linksHtml = '';
    const hasLive = project.liveUrl && project.liveUrl !== '#';
    if (hasLive || project.githubUrl) {
        linksHtml += `<div class="mt-6 border-t border-border/50 pt-5 space-y-3">`;
        if (hasLive) {
            linksHtml += `<a href="${project.liveUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-bold text-accent hover:text-foreground transition-colors"><i data-lucide="external-link" class="w-4 h-4" aria-hidden="true"></i> View Live Project</a>`;
        }
        if (project.githubUrl) {
            linksHtml += `<a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"><i data-lucide="github" class="w-4 h-4" aria-hidden="true"></i> GitHub Repository</a>`;
        }
        linksHtml += `</div>`;
    }
    html = html.replace(/\{\{PROJECT_LINKS_SECTION\}\}/g, linksHtml);

    // Metrics Rail & Recap
    let metricsRail = '';
    let metricsRecap = '';
    if (project.metrics) {
        const entries = Object.entries(project.metrics);
        metricsRail = entries.map(([key, value]) => `
            <div class="border-t border-border/50 pt-4 first:border-t-0 first:pt-0">
                <div class="font-serif text-3xl font-medium tracking-tight text-foreground">${escHtml(String(value))}</div>
                <div class="mt-1 text-sm text-muted-foreground capitalize">${key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()}</div>
            </div>
        `).join('');

        metricsRecap = entries.map(([key, value]) => `
            <div>
                <div data-counter class="font-serif text-4xl md:text-6xl font-bold text-foreground mb-2 stat-val">${escHtml(String(value))}</div>
                <div class="text-sm md:text-base text-muted-foreground capitalize stat-label">${key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()}</div>
            </div>
        `).join('');
    }
    html = html.replace(/\{\{PROJECT_METRICS_RAIL\}\}/g, metricsRail);
    html = html.replace(/\{\{PROJECT_METRICS_RECAP\}\}/g, metricsRecap);

    // Process Section
    if (project.process && project.process.length) {
        const processHtml = project.process.map((step, i) => {
            // Split step into title and body if it has a colon
            let title = `Phase ${i+1}`;
            let body = step;
            if (step.includes(':')) {
                const parts = step.split(':');
                title = parts[0].trim();
                body = parts.slice(1).join(':').trim();
            }
            return `
            <li class="grid grid-cols-[auto,1fr] gap-6 border-t border-border/50 pt-8 pb-8">
                <div data-reveal class="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">0${i + 1}</div>
                <div>
                    <h3 data-reveal class="font-serif text-2xl md:text-3xl font-medium mb-3">${escHtml(title)}</h3>
                    <div data-reveal class="text-muted-foreground md:text-lg leading-relaxed">${escHtml(body)}</div>
                </div>
            </li>`;
        }).join('');
        html = html.replace('{{PROJECT_PROCESS_SECTION}}', processHtml);
    } else {
        html = html.replace('{{PROJECT_PROCESS_SECTION}}', '');
    }

    // Gallery Section
    if (project.screenshots && project.screenshots.length > 0) {
        // Use all images for the gallery, including the hero cover
        const galleryImgs = project.screenshots;
        if (galleryImgs.length > 0) {
            const galleryHtml = galleryImgs.map((img, idx) => {
                const isWide = (idx % 3 === 0 && idx !== 0); // make every 3rd wide
                const isLeft = (idx % 2 === 0);
                
                let containerClasses = 'rounded-2xl overflow-hidden bg-card border border-border shadow-lg cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]';
                let figureClasses = 'mb-16';
                let sizes = '(max-width: 768px) 90vw, 85vw';

                if (isWide) {
                    figureClasses += ' -mx-6 md:-mx-10 w-[calc(100%+3rem)] md:w-[calc(100%+5rem)]';
                    sizes = '100vw';
                } else if (isLeft) {
                    figureClasses += ' md:max-w-[85%]';
                } else {
                    figureClasses += ' md:ml-auto md:max-w-[85%]';
                }

                const zoomSrc = `${basePath}${img.replace(/^\.\//, '')}`;
                return `
                <figure class="${figureClasses}">
                    <div class="${containerClasses}" data-zoom-src="${zoomSrc}" role="button" tabindex="0" aria-label="View enlarged screenshot ${idx + 1}">
                        ${renderResponsivePicture(img, `${project.title} Interface ${idx + 1}`, 'w-full h-auto object-cover', sizes, false, basePath)}
                    </div>
                </figure>`;
            }).join('');
            html = html.replace('{{PROJECT_GALLERY_SECTION}}', galleryHtml);
        } else {
            html = html.replace('{{PROJECT_GALLERY_SECTION}}', '');
        }
    } else {
        html = html.replace('{{PROJECT_GALLERY_SECTION}}', '');
    }

    // Testimonial
    if (project.testimonial && project.testimonial.quote) {
        const testHtml = `
            <div class="relative mb-32 rounded-3xl bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-900/50 dark:to-slate-950/50 border border-border px-8 py-14 md:px-16 md:py-20 transition-all hover:border-accent/20">
                <span class="absolute -top-6 left-8 md:-top-10 md:left-10 font-serif text-[8rem] md:text-[10rem] italic leading-none text-accent select-none">&ldquo;</span>
                <blockquote class="relative z-10 mb-8 font-serif text-2xl font-medium italic leading-snug text-foreground md:text-4xl">
                    ${escHtml(project.testimonial.quote)}
                </blockquote>
                <div class="relative z-10 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    &mdash; ${escHtml(project.testimonial.author)}, ${escHtml(project.testimonial.position)}
                </div>
            </div>`;
        html = html.replace('{{PROJECT_TESTIMONIAL_SECTION}}', testHtml);
    } else {
        html = html.replace('{{PROJECT_TESTIMONIAL_SECTION}}', '');
    }

    // Decisions Q&A
    const qaItems = [];
    if (project.challenge) qaItems.push({ q: 'What was the core challenge?', a: project.challenge });
    if (project.solution) qaItems.push({ q: 'How did we approach the solution?', a: project.solution });
    if (project.lessonsLearned) qaItems.push({ q: 'What were the key takeaways?', a: project.lessonsLearned });

    if (qaItems.length > 0) {
        const decisionsHtml = `
            <div class="mb-32 grid md:grid-cols-12 gap-8 md:gap-10">
                <div class="md:col-span-4">
                    <h2 class="font-serif text-3xl md:text-4xl font-bold mb-4">Project Decisions</h2>
                    <p class="text-muted-foreground">Trade-offs, challenges, and insights from the development process.</p>
                </div>
                <div class="md:col-span-7 md:col-start-6">
                    <div class="divide-y divide-border border-y border-border" id="decisions">
                        ${qaItems.map((item, idx) => `
                        <details class="group py-6" ${idx === 0 ? 'open' : ''}>
                            <summary class="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-xl md:text-2xl font-medium hover:text-accent">
                                ${escHtml(item.q)}
                                <span aria-hidden="true" class="text-accent transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p class="max-w-2xl pt-5 text-lg text-muted-foreground leading-relaxed">${escHtml(item.a)}</p>
                        </details>`).join('')}
                    </div>
                </div>
            </div>`;
        html = html.replace('{{PROJECT_DECISIONS_SECTION}}', decisionsHtml);
    } else {
        html = html.replace('{{PROJECT_DECISIONS_SECTION}}', '');
    }

    // Hero Cover Image
    const heroImg = project.heroImg ? renderResponsivePicture(
        project.heroImg,
        `${project.title} - Project Case Study Hero Showcase`,
        'absolute inset-0 w-full h-full object-cover case-hero-cover-img',
        '(max-width: 1600px) 100vw, 1600px',
        true,
        basePath
    ) : '';
    html = html.replace('{{PROJECT_HERO_IMAGE_COVER}}', heroImg);

    // CaseNext Card
    const nextCardHtml = `
        <a href="${basePath}projects/${nextProject.slug}.html" class="block group rounded-[2rem] overflow-hidden relative px-10 py-6 md:px-16 md:py-10 lg:px-20 lg:py-14 transition-all hover:scale-[1.01] duration-500 ease-out-expo border border-border shadow-sm hover:shadow-xl hover:border-accent/30 bg-card">
            <!-- Background Image -->
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[1.5s] ease-out group-hover:scale-105" style="background-image: url('${basePath}${nextProject.heroImg.replace('./', '')}');"></div>
            
            <!-- Glassmorphic Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-slate-50/10 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/10 backdrop-blur-[2px] transition-all duration-700 group-hover:backdrop-blur-0"></div>
            
            <!-- Content -->
            <div class="relative z-10 max-w-2xl transform transition-transform duration-500 group-hover:translate-x-2">
                <div class="flex items-center gap-2 mb-4">
                    <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    <p class="uppercase tracking-widest font-mono text-xs text-accent">Next Project</p>
                </div>
                <h2 class="font-serif text-4xl md:text-5xl lg:text-7xl font-medium mb-3 text-foreground tracking-tight">${escHtml(nextProject.title)}</h2>
                <p class="text-lg md:text-xl text-muted-foreground line-clamp-2 leading-relaxed">${escHtml(nextProject.shortDesc)}</p>
            </div>
            
            <!-- Floating Arrow Icon -->
            <div class="absolute right-8 bottom-6 md:right-16 md:bottom-10 lg:bottom-14 w-14 h-14 rounded-full bg-accent flex items-center justify-center text-accent-foreground transform translate-x-4 opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-x-0 group-hover:opacity-100 shadow-xl shadow-accent/20">
                <i data-lucide="arrow-right" class="w-6 h-6"></i>
            </div>
        </a>`;
    html = html.replace('{{PROJECT_NEXT_CARD}}', nextCardHtml);

    const scriptInjections = `<script src="${basePath}public/js/case-study.js" defer></script>`;
    return html + scriptInjections;
}

// ──────────────────────────────────────────
// Helper: render projects listing page content
// ──────────────────────────────────────────
function renderProjectsListing() {
    const slides = projects.map((p, index) => `<article class="work-slide" data-work-slide data-title="${escHtml(p.title)}">
        <a class="work-slide__image" href="./projects/${p.slug}.html" tabindex="-1" aria-hidden="true">
            <div class="collection-image work-slide__visual">
                ${renderResponsivePicture(p.heroImg, p.title, 'w-full h-auto', '(max-width: 768px) 100vw, 56vw', index === 0, './')}
                <span class="work-slide__number font-mono text-xs" aria-hidden="true">${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}</span>
            </div>
        </a>
        <div class="work-slide__copy">
            <div data-draw>
                <span class="work-slide__glyph" aria-hidden="true">${glyphFor(p.slug)}</span>
                <p class="meta mb-4"><span>${escHtml(String(p.year))}</span>${p.clientType ? `<span>${escHtml(p.clientType)}</span>` : ''}</p>
                <h2 class="site-heading type-workTitle mb-4"><a href="./projects/${p.slug}.html">${escHtml(p.title)}</a></h2>
                <p class="text-muted-foreground leading-relaxed">${escHtml(p.shortDesc)}</p>
            </div>
            <div class="work-slide__details">
                <dl class="work-slide__facts">
                    <div><dt class="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">My role</dt><dd>${escHtml(p.role)}</dd></div>
                    <div><dt class="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Timeline</dt><dd>${escHtml(p.timeline)}</dd></div>
                </dl>
                <a href="./projects/${p.slug}.html" class="line-button work-slide__cta" aria-label="Read the ${escHtml(p.title)} case study">Read the case study</a>
            </div>
        </div>
    </article>`).join('');
    return { workStackHtml: `<section class="work-reel" id="work" data-work-reel aria-label="Project case studies"><div class="work-reel__viewport"><div class="work-reel__track" data-work-track>${slides}</div>
        <div class="work-reel__bar" data-work-bar hidden>
            <span class="font-mono text-sm" data-work-count>01 / ${String(projects.length).padStart(2, '0')}</span>
            <span class="work-reel__progress" aria-hidden="true"><span data-work-progress></span></span>
            <span class="work-reel__hint text-sm ui-muted">Scroll to explore</span>
            <button class="work-reel__button" data-work-prev aria-label="Previous project">←</button>
            <button class="work-reel__button" data-work-next aria-label="Next project">→</button>
            <a class="content-link" href="#after-work">Skip reel</a>
        </div></div></section><div id="after-work" tabindex="-1"></div>` };
}

// ──────────────────────────────────────────
// Helper: render projects on the homepage
// ──────────────────────────────────────────
function renderHomepageProjects() {
    return projects.slice(0, 3).map((p, index) => {
        const url = `./projects/${p.slug}.html`;
        const picture = renderResponsivePicture(p.heroImg, p.title, 'w-full h-auto', index === 0 ? '(max-width: 899px) 100vw, 58vw' : '(max-width: 899px) 100vw, 50vw', false, './');
        const facts = [
            p.role ? `<div><dt>My role</dt><dd>${escHtml(p.role)}</dd></div>` : '',
            p.timeline ? `<div><dt>Timeline</dt><dd>${escHtml(p.timeline)}</dd></div>` : ''
        ].join('');
        return `<article class="work-card${index === 0 ? ' work-card--lead' : ''}" data-project="${escHtml(String(p.id))}"${index === 0 ? ` data-featured-project="${escHtml(String(p.id))}"` : ''} data-draw>
            ${picture ? `<a class="home-work-image" href="${url}" aria-label="View ${escHtml(p.title)} case study">${picture}</a>` : ''}
            <div class="work-card__copy">
                <span class="work-card__glyph" aria-hidden="true">${glyphFor(p.slug)}</span>
                <p class="meta work-card__meta"><span>${escHtml(p.category)}</span>${p.year ? `<span>${escHtml(String(p.year))}</span>` : ''}</p>
                <h3 class="work-card__title"><a href="${url}">${escHtml(p.title)}</a></h3>
                <p class="work-card__summary">${escHtml(p.shortDesc)}</p>
                ${facts ? `<dl class="work-card__facts">${facts}</dl>` : ''}
                <a class="line-link" href="${url}" aria-label="Read the ${escHtml(p.title)} case study">Read the case study</a>
            </div>
        </article>`;
    }).join('\n');
}

/** Render the index from the same post records as article pages. */
function renderBlogIndex(content) {
    const rows = posts.map((post, index) => {
        const dateObj = new Date(post.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const readTime = post.readMinutes ? ` <span aria-hidden="true">·</span> <span>${post.readMinutes} min read</span>` : '';
        return `<article class="journal-entry${index === 0 ? ' journal-entry--lead' : ''}">
        <a href="./${post.slug}.html" class="collection-image journal-entry__image" tabindex="-1" aria-hidden="true">${renderResponsivePicture(post.cover, post.title, 'w-full h-auto', '(max-width: 768px) 100vw, 50vw', index === 0, './')}</a>
        <div class="journal-entry__copy"><p class="font-mono text-xs uppercase tracking-widest text-accent mb-4">${escHtml(post.category)} <span aria-hidden="true">·</span> <time datetime="${post.date}">${formattedDate}</time>${readTime}</p>
            <h2 class="site-heading ${index === 0 ? 'type-workTitle' : 'type-articleHeading'} mb-4"><a href="./${post.slug}.html">${escHtml(post.title)}</a></h2>
            <p class="text-muted-foreground leading-relaxed mb-6">${escHtml(post.dek)}</p>
            <a href="./${post.slug}.html" class="content-link" aria-label="Read article: ${escHtml(post.title)}">Read the article</a>
        </div>
    </article>`;
    }).join('');
    return content.replace('{{BLOG_POST_ROWS}}', () => rows).replace('{{BLOG_FEATURED}}', '');
}

// ──────────────────────────────────────────
// Helper: render blog posts on the homepage
// ──────────────────────────────────────────
function renderHomepagePosts(basePath = './') {
    // Static defaults use recent records; Flask uses the owner's featured order.
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    return sorted.map((post, index) => {
        const url = `${basePath}${post.slug}.html`;
        const picture = renderResponsivePicture(post.cover, post.title, 'w-full h-auto', '(max-width: 767px) 100vw, 50vw', false, basePath);
        return `<article class="home-writing-entry${index === 0 ? ' home-writing-entry--lead' : ''}" data-post="${escHtml(post.slug)}">
            ${picture ? `<a class="home-writing-image" href="${url}" aria-label="Read ${escHtml(post.title)}">${picture}</a>` : ''}
            <div class="home-writing-copy">
                <p class="meta home-writing-meta"><span>${escHtml(post.category)}</span>${post.date ? `<time datetime="${escHtml(post.date)}">${escHtml(post.date)}</time>` : ''}</p>
                <h3><a href="${url}">${escHtml(post.title)}</a></h3>
                <p class="home-writing-summary">${escHtml(post.dek)}</p>
                <a class="home-writing-read site-link" href="${url}" aria-label="Read ${escHtml(post.title)}">Read article</a>
            </div>
        </article>`;
    }).join('\n');
}

// ──────────────────────────────────────────
// Helper: generate footer content
// ──────────────────────────────────────────
function buildFooterRecentPosts(basePath) {
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    return sorted.map(p => `
        <a href="${basePath}${p.slug}.html" class="group flex flex-col hover:text-accent transition-colors">
            <span class="text-foreground group-hover:text-accent transition-colors">${escHtml(p.title)}</span>
            <span class="text-xs text-muted-foreground opacity-70">${escHtml(p.category)}</span>
        </a>
    `).join('');
}

function buildFooterFeaturedProjects(basePath) {
    const sorted = [...projects].slice(0, 3);
    return sorted.map(p => `
        <a href="${basePath}projects/${p.slug}.html" class="group flex flex-col hover:text-accent transition-colors">
            <span class="text-foreground group-hover:text-accent transition-colors">${escHtml(p.title)}</span>
            <span class="text-xs text-muted-foreground opacity-70">${escHtml(p.category)}</span>
        </a>
    `).join('');
}

// ──────────────────────────────────────────
// Helper: render blog post page content
// ──────────────────────────────────────────
function renderBlogPost(post, basePath) {
    // Formatting date
    const dateObj = new Date(post.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Header
    const headerHtml = `
        <div class="max-w-[680px] mx-auto text-center public-page-start pb-14 px-6">
            <nav aria-label="Breadcrumb" class="mb-6 text-sm text-muted-foreground font-mono uppercase tracking-widest flex justify-center">
                <ol class="flex items-center gap-2">
                    <li><a href="${basePath}index.html" class="hover:text-accent transition-colors">Home</a></li>
                    <li><span class="text-border" aria-hidden="true">/</span></li>
                    <li><a href="${basePath}blog.html" class="hover:text-accent transition-colors">Blog</a></li>
                    <li><span class="text-border" aria-hidden="true">/</span></li>
                    <li class="text-foreground" aria-current="page">${escHtml(post.title)}</li>
                </ol>
            </nav>
            
            <div class="mt-10 flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-muted-foreground tracking-wide uppercase">
                <span class="border border-accent/30 bg-accent/10 text-accent rounded-full px-2.5 py-0.5">${escHtml(post.category)}</span>
                <span class="text-foreground/30" aria-hidden="true">&middot;</span>
                <span>${formattedDate}</span>
                <span class="text-foreground/30" aria-hidden="true">&middot;</span>
                <span>${post.readMinutes || 5} min read</span>
            </div>
            
            <h1 class="font-serif font-medium text-4xl md:text-6xl leading-[1.05] tracking-tight mt-8 text-foreground">${escHtml(post.title)}</h1>
            
            <p class="text-xl md:text-2xl leading-snug text-muted-foreground mt-6">${escHtml(post.dek)}</p>
            
            <div class="mt-10 flex items-center justify-center gap-3">
                <div class="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center font-serif text-sm">LS</div>
                <div class="text-left leading-tight">
                    <div class="text-sm font-medium text-foreground">Lay Shah</div>
                    <div class="text-xs text-muted-foreground mt-0.5">Full-Stack Engineer</div>
                </div>
            </div>
        </div>
    `;

    // Cover (optional)
    let coverHtml = '';
    if (post.cover) {
        coverHtml = `
            <div class="max-w-[1100px] mx-auto px-6 mb-16">
                <div class="rounded-2xl bg-card overflow-hidden border border-border shadow-lg">
                    ${renderResponsivePicture(post.cover, post.title, 'w-full h-auto object-cover aspect-video md:aspect-[21/9]', '(max-width: 1100px) 100vw, 1100px', true, basePath)}
                </div>
            </div>
        `;
    }

    // Body
    const bodyHtml = `
        <div class="max-w-[680px] mx-auto px-6 prose-reveal public-story">
            ${post.body}
        </div>
    `;

    // End Rule
    const endRuleHtml = `
        <div aria-hidden="true" class="max-w-[680px] mx-auto flex items-center gap-6 my-16 px-6">
            <div class="h-px flex-1 bg-foreground/10"></div>
            <div class="font-serif text-2xl text-accent">&sect;</div>
            <div class="h-px flex-1 bg-foreground/10"></div>
        </div>
    `;

    // Author Card
    const authorCardHtml = `
        <div class="max-w-[680px] mx-auto px-6">
            <div class="p-6 md:p-8 rounded-2xl border border-border bg-card/30 flex flex-col md:flex-row items-center md:items-center justify-between text-center md:text-left gap-6 transition-all hover:border-accent/30">
                <div class="flex flex-col md:flex-row items-center gap-5">
                    <div class="w-16 h-16 rounded-full bg-slate-900 text-white flex-shrink-0 flex items-center justify-center font-serif text-xl border border-border">LS</div>
                    <div>
                        <span class="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-1">Written by</span>
                        <h3 class="font-serif font-medium text-xl text-foreground mb-1">Lay Shah</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed max-w-md">Independent developer building fast, hand-crafted websites and platforms for founders and small teams.</p>
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <a href="mailto:{{CONTACT_EMAIL}}" class="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors font-medium text-sm gap-1.5 bg-background">Work with me <i data-lucide="arrow-up-right" class="w-4 h-4" aria-hidden="true"></i></a>
                </div>
            </div>
        </div>
    `;

    // Contact CTA
    const contactCtaHtml = `
        <div class="max-w-[1100px] mx-auto mt-24 mb-16 px-6">
            <div class="p-8 md:p-12 rounded-3xl border border-border bg-card/60 backdrop-blur-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative overflow-hidden transition-all hover:border-accent/20">
                
                <!-- Content (Left side) -->
                <div class="flex-grow max-w-2xl">
                    <div class="flex items-center gap-2 mb-6">
                        <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        <span class="text-accent text-xs font-mono uppercase tracking-widest">{{AVAILABILITY}}</span>
                    </div>
                    <h2 class="text-3xl md:text-5xl font-serif font-medium leading-tight text-foreground mb-4">Have a website you want to actually ship?</h2>
                    <p class="text-muted-foreground text-base md:text-lg leading-relaxed">Tell me what needs to improve, who it’s for, and when you’d like to launch. We’ll work out the right scope together.</p>
                </div>

                <!-- Action Buttons (Right side) -->
                <div class="flex flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto flex-shrink-0">
                    <a href="mailto:{{CONTACT_EMAIL}}" class="inline-flex items-center justify-center gap-1.5 px-8 py-3.5 bg-accent text-accent-foreground rounded-full hover:-translate-y-0.5 active:translate-y-0 transition-transform font-medium text-base shadow-lg shadow-accent/15">
                        Start a project <i data-lucide="arrow-up-right" class="w-[18px] h-[18px]" aria-hidden="true"></i>
                    </a>
                    <a href="{{BOOKING_URL}}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-background text-foreground border border-border rounded-full hover:border-foreground hover:bg-muted/30 transition-all font-medium text-base">
                        <i data-lucide="calendar" class="w-[18px] h-[18px]" aria-hidden="true"></i> Book a {{CALL_MINUTES}}-min call
                    </a>
                    <span class="text-xs text-muted-foreground text-center lg:text-right mt-1 block">{{REPLY_NOTE}}</span>
                </div>

            </div>
        </div>
    `;

    // Keep Reading
    const relatedPosts = posts.filter(p => p.slug !== post.slug).slice(0, 2);
    let keepReadingHtml = '';
    if (relatedPosts.length > 0) {
        keepReadingHtml = `
            <div class="max-w-[1200px] mx-auto px-6 pt-16 pb-24 md:pb-40">
                <div class="flex items-center justify-between border-b border-foreground/10 pb-4 mb-10">
                    <span class="text-accent font-medium">Keep reading</span>
                    <a href="${basePath}blog.html" class="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">All posts <i data-lucide="arrow-right" class="w-4 h-4" aria-hidden="true"></i></a>
                </div>
                <div class="grid md:grid-cols-2 gap-6">
                    ${relatedPosts.map(rp => `
                        <a href="${basePath}${rp.slug}.html" class="group block p-8 rounded-2xl border border-border bg-card transition-all hover:border-accent hover:bg-card/80 hover:-translate-y-0.5 active:translate-y-0">
                            <span class="inline-block border border-accent/30 bg-accent/10 text-accent rounded-full px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide mb-6">${escHtml(rp.category)}</span>
                            <h3 class="font-serif text-2xl md:text-3xl font-medium text-foreground leading-tight mb-4 group-hover:text-accent transition-colors">${escHtml(rp.title)}</h3>
                            <p class="text-muted-foreground line-clamp-2 leading-relaxed mb-8">${escHtml(rp.dek)}</p>
                            <span class="inline-flex items-center gap-1.5 text-accent font-medium text-sm">Read <i data-lucide="arrow-up-right" class="w-4 h-4" aria-hidden="true"></i></span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    return '<article data-reading-content>' + headerHtml + coverHtml + bodyHtml + '</article>' + endRuleHtml + authorCardHtml + contactCtaHtml + keepReadingHtml;
}

// ──────────────────────────────────────────
// Core: assemble a page from template + metadata + content
// ──────────────────────────────────────────
function buildPage(outputFile, pageConfig, bodyContent) {
    const basePath = getBasePath(outputFile);
    bodyContent = withDrawings(bodyContent);

    let html = baseTemplate;

    // Replace base path in template
    html = html.replace(/\{\{BASE_PATH\}\}/g, basePath);

    // Replace header/footer (also replace BASE_PATH in them)
    html = html.replace('{{NAV_CONTENT}}', headerHtml.replace(/\{\{BASE_PATH\}\}/g, basePath));
    let renderedFooter = footerHtml.replace(/\{\{BASE_PATH\}\}/g, basePath);
    renderedFooter = renderedFooter.replace('{{FOOTER_RECENT_POSTS}}', buildFooterRecentPosts(basePath));
    renderedFooter = renderedFooter.replace('{{FOOTER_FEATURED_PROJECTS}}', buildFooterFeaturedProjects(basePath));
    html = html.replace('{{FOOTER_CONTENT}}', renderedFooter);

    // Replace head metadata
    html = html.replace('{{PAGE_TITLE}}', escHtml(pageConfig.title));
    html = html.replace('{{PAGE_DESCRIPTION}}', escHtml(pageConfig.description));
    html = html.replace('{{PAGE_CANONICAL}}', pageConfig.canonical || '');
    html = html.replace('{{OG_META}}', buildOgMeta(pageConfig));
    html = html.replace('{{TWITTER_META}}', buildTwitterMeta(pageConfig));
    html = html.replace('{{ARTICLE_META}}', buildArticleMeta(pageConfig));
    html = html.replace('{{KEYWORDS_META}}', buildKeywordsMeta(pageConfig));
    html = html.replace('{{STRUCTURED_DATA}}', buildStructuredData(pageConfig));

    // Replace body content
    html = html.replace('{{BODY_CONTENT}}', () => /<main[\s>]/i.test(bodyContent) ? bodyContent : `<main>${bodyContent}</main>`);

    // Page-specific scripts (extracted from content if present)
    const pageScripts = pageConfig.type === 'project' ? socialSharingScript : '';
    html = html.replace('{{PAGE_SCRIPTS}}', pageScripts);

    const values = {
        BASE_PATH: basePath,
        FONT_STYLESHEET: require("../design/system.json").details.fontStylesheet,
        CONTACT_EMAIL: site.email,
        BOOKING_URL: site.bookingUrl,
        CALL_MINUTES: String(site.callMinutes),
        AVAILABILITY: site.availability,
        REPLY_NOTE: site.replyNote,
        PROJECT_COUNT: String(projects.length),
    };
    html = html.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) => values[key] === undefined ? token : escHtml(values[key]));
    const $ = cheerio.load(html);
    $('h1,h2,h3,h4,h5,h6').addClass('site-heading');
    $('h1').not('.type-hero,[data-work-heading]').addClass('type-title');
    $('main').attr('id', 'main-content').attr('tabindex', '-1');
    if (['404.html', '503.html'].includes(outputFile)) {
        $('meta[name="robots"]').attr('content', 'noindex, follow');
        $('link[rel="canonical"]').remove();
    }
    $('img').each((_, img) => {
        const src = $(img).attr('src');
        if (!src || /^(https?:|data:)/.test(src)) return;
        const asset = path.posix.normalize(path.posix.join(path.posix.dirname(outputFile), src));
        const dimensions = imageManifest[asset];
        if (dimensions) $(img).attr('width', dimensions.width).attr('height', dimensions.height);
        $(img).attr('decoding', 'async');
    });
    html = $.html();
    if (/\{\{[A-Z_]+\}\}/.test(html.replace(/<!--[\s\S]*?-->/g, ''))) throw new Error(`Unresolved placeholder in ${outputFile}`);

    // Ensure projects/ directory exists
    const outPath = path.join(root, outputFile);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`  ✓ ${outputFile}`);
}

// ──────────────────────────────────────────
// Build all pages
// ──────────────────────────────────────────
console.log('Building pages...\n');

Object.entries(pagesJson).forEach(([outputFile, config]) => {
    if (config.type === 'project') {
        // Build individual project page from projects.json
        const project = projects.find(p => p.slug === config.projectSlug);
        if (!project) {
            throw new Error(`Missing project for ${outputFile}: ${config.projectSlug}`);
        }
        const basePath = getBasePath(outputFile);
        
        // Inject Breadcrumb JSON-LD
        let currentSd = config.structuredData;
        let breadcrumbSd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://layshahdev.com/" },
                { "@type": "ListItem", "position": 2, "name": "Work", "item": "https://layshahdev.com/projects.html" },
                { "@type": "ListItem", "position": 3, "name": project.title, "item": `https://layshahdev.com/projects/${project.slug}.html` }
            ]
        };
        
        if (currentSd) {
            if (Array.isArray(currentSd)) {
                config.structuredData = [...currentSd, breadcrumbSd];
            } else {
                config.structuredData = [currentSd, breadcrumbSd];
            }
        } else {
            config.structuredData = breadcrumbSd;
        }
        
        const body = renderCaseStudy(project, basePath);
        buildPage(outputFile, config, body);
    } else if (config.type === 'post') {
        const post = posts.find(p => p.slug === config.postSlug);
        if (!post) {
            throw new Error(`Missing post for ${outputFile}: ${config.postSlug}`);
        }
        const basePath = getBasePath(outputFile);
        
        // Inject Breadcrumb JSON-LD
        let currentSd = config.structuredData;
        let breadcrumbSd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://layshahdev.com/" },
                { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://layshahdev.com/blog.html" },
                { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://layshahdev.com/${post.slug}.html` }
            ]
        };
        
        if (currentSd) {
            if (Array.isArray(currentSd)) {
                config.structuredData = [...currentSd, breadcrumbSd];
            } else {
                config.structuredData = [currentSd, breadcrumbSd];
            }
        } else {
            config.structuredData = breadcrumbSd;
        }
        
        const body = renderBlogPost(post, basePath);
        buildPage(outputFile, config, body);
    } else if (outputFile === 'projects.html') {
        // Build projects listing page
        const contentPath = path.join(root, config.content);
        let content = fs.readFileSync(contentPath, 'utf-8');
        const { workStackHtml } = renderProjectsListing();
        content = content.replace('{{WORK_REEL}}', '');
        content = content.replace('{{WORK_STACK}}', workStackHtml);
        buildPage(outputFile, config, content);
    } else {
        // Build standard page from content fragment
        const contentPath = path.join(root, config.content);
        if (!fs.existsSync(contentPath)) {
            throw new Error(`Missing content for ${outputFile}: ${config.content}`);
        }
        let content = fs.readFileSync(contentPath, 'utf-8');
        if (outputFile === 'blog.html') content = renderBlogIndex(content);
        if (outputFile === 'index.html') {
            content = content.replace('{{HOMEPAGE_PROJECTS}}', renderHomepageProjects());
            content = content.replace('{{HOMEPAGE_BLOG_POSTS}}', renderHomepagePosts());
        }
        buildPage(outputFile, config, content);
    }
});

console.log(`\n✓ Build complete! ${Object.keys(pagesJson).length} pages generated.`);
