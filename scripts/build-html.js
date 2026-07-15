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
const baseTemplate = fs.readFileSync(path.join(root, 'templates', 'base.html'), 'utf-8');
const caseStudyTemplate = fs.readFileSync(path.join(root, 'templates', 'project-case-study.html'), 'utf-8');
const headerHtml = fs.readFileSync(path.join(root, 'components', 'header.html'), 'utf-8');
const footerHtml = fs.readFileSync(path.join(root, 'components', 'footer.html'), 'utf-8');
const pagesJson = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf-8'));
const projectsData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'projects.json'), 'utf-8'));
const postsData = fs.existsSync(path.join(root, 'data', 'posts.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'data', 'posts.json'), 'utf-8')) : { posts: [] };

const projects = projectsData.projects;
const posts = postsData.posts;

// ──────────────────────────────────────────
// Helper: resolve base path for assets
// ──────────────────────────────────────────
function getBasePath(outputFile) {
    // If the output file is in a subdirectory (e.g., projects/slug.html), use ../
    if (outputFile.includes('/') || outputFile.includes('\\')) {
        return '../';
    }
    return './';
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
    lines.push(`<meta property="og:image" content="${page.ogImage || 'https://layshahdev.com/og-image.jpg'}">`);
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

    const basePath = resolvedPath.replace(/\.(webp|png|jpg|jpeg)$/i, '');
    const ext = resolvedPath.match(/\.(webp|png|jpg|jpeg)$/i)?.[1] || 'png';

    // Determine webp source
    const webpSmall = `${basePath}-small.webp`;
    const webpFull = basePath + '.webp';
    const fallbackSmall = `${basePath}-small.${ext}`;
    const fallbackFull = resolvedPath;

    const loadAttr = eager ? '' : ' loading="lazy"';
    const sizesAttr = sizes || '(max-width: 768px) 90vw, 896px';

    let pictureClass = 'block';
    if (className.includes('h-full')) pictureClass += ' h-full';
    if (className.includes('w-full')) pictureClass += ' w-full';
    if (className.includes('h-auto')) pictureClass += ' h-auto';

    return `<picture class="${pictureClass}">
                <source type="image/webp" srcset="${webpSmall} 600w, ${webpFull} 1200w" sizes="${sizesAttr}">
                <source type="image/${ext === 'jpg' ? 'jpeg' : ext}" srcset="${fallbackSmall} 600w, ${fallbackFull} 1200w" sizes="${sizesAttr}">
                <img src="${fallbackFull}" alt="${escHtml(alt)}" class="${className || 'w-full h-auto object-cover'}"${loadAttr}>
            </picture>`;
}

// ──────────────────────────────────────────
// Helper: render project case study body
// ──────────────────────────────────────────
function renderCaseStudy(project, basePath) {
    let html = caseStudyTemplate;

    // Simple replacements
    html = html.replace(/\{\{BASE_PATH\}\}/g, basePath);
    html = html.replace(/\{\{PROJECT_TITLE\}\}/g, escHtml(project.title));
    html = html.replace(/\{\{PROJECT_CATEGORY\}\}/g, escHtml(project.category));
    html = html.replace(/\{\{PROJECT_YEAR\}\}/g, escHtml(project.year));
    html = html.replace(/\{\{PROJECT_OVERVIEW\}\}/g, escHtml(project.overview || project.shortDesc));
    html = html.replace(/\{\{PROJECT_ROLE\}\}/g, escHtml(project.role));
    html = html.replace(/\{\{PROJECT_TIMELINE\}\}/g, escHtml(project.timeline));
    html = html.replace(/\{\{PROJECT_TOOLS\}\}/g, escHtml(project.tools));
    html = html.replace(/\{\{PROJECT_CHALLENGE\}\}/g, escHtml(project.challenge));
    html = html.replace(/\{\{PROJECT_SOLUTION\}\}/g, escHtml(project.solution));
    html = html.replace(/\{\{PROJECT_RESULTS\}\}/g, escHtml(project.results));

    // Hero image
    const heroImg = project.heroImg ? renderResponsivePicture(
        project.heroImg,
        `${project.title} - Project Case Study Hero Showcase`,
        'w-full h-auto object-cover',
        '(max-width: 768px) 90vw, 896px',
        true,
        basePath
    ) : '';
    html = html.replace('{{PROJECT_HERO_IMAGE}}', heroImg);

    // Content image in solution section
    const contentImg = project.contentImg ? `
                    <div class="rounded-xl overflow-hidden border border-border shadow-lg">
                        ${renderResponsivePicture(project.contentImg, `${project.title} - Custom Solution Interface Showcase`, 'w-full h-auto object-cover', '(max-width: 768px) 90vw, 896px', false, basePath)}
                    </div>` : '';
    html = html.replace('{{PROJECT_CONTENT_IMAGE}}', contentImg);

    // Process section
    if (project.process && project.process.length) {
        const processHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="workflow" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Development Process
                </h2>
                <div class="grid md:grid-cols-2 gap-6">
                    ${project.process.map((step, i) => `
                    <div class="bg-card border border-border rounded-2xl p-6">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                                <span class="text-accent font-bold text-sm">${i + 1}</span>
                            </div>
                            <p class="text-muted-foreground leading-relaxed">${escHtml(step)}</p>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        html = html.replace('{{PROJECT_PROCESS_SECTION}}', processHtml);
    } else {
        html = html.replace('{{PROJECT_PROCESS_SECTION}}', '');
    }

    // Technologies section
    if (project.technologies) {
        const techHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="code" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Technologies Used
                </h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${Object.entries(project.technologies).map(([category, techs]) => `
                    <div class="bg-card border border-border rounded-2xl p-6">
                        <h3 class="text-lg md:text-xl font-bold mb-4 capitalize text-accent">${category.replace(/([A-Z])/g, ' $1').trim()}</h3>
                        <div class="flex flex-wrap gap-2">
                            ${techs.map(t => `<span class="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">${escHtml(t)}</span>`).join('')}
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        html = html.replace('{{PROJECT_TECHNOLOGIES_SECTION}}', techHtml);
    } else {
        html = html.replace('{{PROJECT_TECHNOLOGIES_SECTION}}', '');
    }

    // Key features section
    if (project.keyFeatures && project.keyFeatures.length) {
        const featHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="star" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Key Features
                </h2>
                <div class="grid md:grid-cols-2 gap-6">
                    ${project.keyFeatures.map(f => `
                    <div class="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
                        <i data-lucide="check-circle" class="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden="true"></i>
                        <p class="text-muted-foreground leading-relaxed">${escHtml(f)}</p>
                    </div>`).join('')}
                </div>
            </div>`;
        html = html.replace('{{PROJECT_FEATURES_SECTION}}', featHtml);
    } else {
        html = html.replace('{{PROJECT_FEATURES_SECTION}}', '');
    }

    // Metrics
    if (project.metrics) {
        const metricsHtml = `
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${Object.entries(project.metrics).map(([key, value]) => `
                        <div class="text-center">
                            <div class="text-3xl font-bold text-accent mb-2">${escHtml(String(value))}</div>
                            <div class="text-sm text-muted-foreground capitalize">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        </div>`).join('')}
                    </div>`;
        html = html.replace('{{PROJECT_METRICS}}', metricsHtml);
    } else {
        html = html.replace('{{PROJECT_METRICS}}', '');
    }

    // Testimonial section
    if (project.testimonial) {
        const t = project.testimonial;
        const avatarHtml = t.avatar
            ? `<img src="${t.avatar}" alt="${escHtml(t.author)}" class="w-12 h-12 rounded-full">`
            : '<div class="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center"><i data-lucide="user" class="w-6 h-6 text-accent" aria-hidden="true"></i></div>';
        const testHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="quote" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Client Feedback
                </h2>
                <div class="bg-card border border-border rounded-2xl p-8 md:p-12">
                    <blockquote class="text-lg text-muted-foreground leading-relaxed mb-6 italic">
                        &ldquo;${escHtml(t.quote)}&rdquo;
                    </blockquote>
                    <div class="flex items-center gap-4">
                        ${avatarHtml}
                        <div>
                            <div class="font-bold">${escHtml(t.author)}</div>
                            <div class="text-sm text-muted-foreground">${escHtml(t.position)}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        html = html.replace('{{PROJECT_TESTIMONIAL_SECTION}}', testHtml);
    } else {
        html = html.replace('{{PROJECT_TESTIMONIAL_SECTION}}', '');
    }

    // Lessons learned section
    if (project.lessonsLearned) {
        const lessonsHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="book-open" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Lessons Learned
                </h2>
                <div class="bg-card border border-border rounded-2xl p-8 md:p-12">
                    <p class="text-lg text-muted-foreground leading-relaxed">
                        ${escHtml(project.lessonsLearned)}
                    </p>
                </div>
            </div>`;
        html = html.replace('{{PROJECT_LESSONS_SECTION}}', lessonsHtml);
    } else {
        html = html.replace('{{PROJECT_LESSONS_SECTION}}', '');
    }

    // Screenshots gallery
    if (project.screenshots && project.screenshots.length > 1) {
        const galleryHtml = `
            <div>
                <h2 class="text-4xl md:text-5xl font-display font-bold mb-8 flex items-center gap-4">
                    <i data-lucide="image" class="w-8 h-8 text-accent" aria-hidden="true"></i>
                    Project Gallery
                </h2>
                <div class="grid md:grid-cols-2 gap-8">
                    ${project.screenshots.slice(1).map((img, idx) => `
                    <div class="rounded-xl overflow-hidden border border-border shadow-lg">
                        ${renderResponsivePicture(img, `${project.title} Screenshot ${idx + 1} - Interface Detail`, 'w-full h-auto object-cover hover:scale-105 transition-transform duration-300 ease-out-expo', '(max-width: 768px) 90vw, 45vw', false, basePath)}
                    </div>`).join('')}
                </div>
            </div>`;
        html = html.replace('{{PROJECT_GALLERY_SECTION}}', galleryHtml);
    } else {
        html = html.replace('{{PROJECT_GALLERY_SECTION}}', '');
    }

    // Live URL text and buttons
    const hasLive = project.liveUrl && project.liveUrl !== '#';
    html = html.replace('{{PROJECT_LIVE_TEXT}}', hasLive ? 'Check out the live website or demo.' : 'Live preview coming soon.');

    let actionBtns = '';
    if (hasLive) {
        actionBtns += `<a href="${project.liveUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-accent hover:text-white transition-all duration-300 ease-out-expo">
                    <i data-lucide="external-link" class="w-4 h-4" aria-hidden="true"></i> View Live
                </a>`;
    } else {
        actionBtns += `<button disabled class="inline-flex items-center gap-2 px-8 py-4 bg-muted text-muted-foreground rounded-full font-medium cursor-not-allowed opacity-50">
                    <i data-lucide="clock" class="w-4 h-4" aria-hidden="true"></i> Coming Soon
                </button>`;
    }
    if (project.githubUrl) {
        actionBtns += `\n                <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-8 py-4 border border-border rounded-full font-medium hover:bg-accent hover:text-white transition-all duration-300 ease-out-expo">
                    <i data-lucide="github" class="w-4 h-4" aria-hidden="true"></i> View Code
                </a>`;
    }
    html = html.replace('{{PROJECT_ACTION_BUTTONS}}', actionBtns);

    // Next project link
    const currentIdx = projects.findIndex(p => p.id === project.id);
    const nextProject = projects[currentIdx + 1];
    if (nextProject) {
        html = html.replace('{{PROJECT_NEXT_LINK}}', `
        <div class="mt-12 text-center">
            <p class="text-muted-foreground mb-2">Up Next</p>
            <a href="${basePath}projects/${nextProject.slug}.html" class="text-2xl md:text-4xl font-display font-bold hover:text-accent transition-colors duration-300">
                ${escHtml(nextProject.title)} &rarr;
            </a>
        </div>`);
    } else {
        html = html.replace('{{PROJECT_NEXT_LINK}}', `
        <div class="mt-12 text-center">
            <p class="text-muted-foreground mb-2">Back to Portfolio</p>
            <a href="${basePath}projects.html" class="text-2xl md:text-4xl font-display font-bold hover:text-accent transition-colors duration-300">
                View All Projects &rarr;
            </a>
        </div>`);
    }

    return html;
}

// ──────────────────────────────────────────
// Helper: render projects listing page content
// ──────────────────────────────────────────
function renderProjectsListing() {
    // Use the exact order provided by projects.json
    const sorted = [...projects];

    // Helper: render stats grid (3 columns)
    // Helper: render stats grid (3 columns)
    function buildStatsGrid(metrics) {
        if (!metrics) return '';
        const entries = Object.entries(metrics).slice(0, 3);
        return entries.map(([key, val]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
            const sentenceCaseKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
            return `
        <div>
            <dt class="font-serif text-2xl font-medium tracking-tight lg:text-3xl text-foreground">${escHtml(String(val))}</dt>
            <dd class="mt-1 text-xs text-muted-foreground">${escHtml(sentenceCaseKey)}</dd>
        </div>
    `;
        }).join('');
    }

    // Helper: render stack tags
    function buildStackChips(technologies) {
        if (!technologies) return '';
        const allTechs = Object.values(technologies).flat().slice(0, 4);
        return allTechs.map(t => `
        <span class="rounded-full border border-foreground/15 px-3.5 py-1.5 text-xs text-muted-foreground">${escHtml(t)}</span>
    `).join('');
    }

    const basePath = './';

    // 1. Build Work Reel (Desktop)
    let reelSlides = sorted.map((p, index) => `
        <article class="flex h-full w-[88vw] shrink-0 items-center px-10 work-slide" data-index="${index}" data-title="${escHtml(p.title)}">
            <div class="grid h-full max-h-[78vh] w-full grid-cols-12 gap-8 lg:gap-12">
                
                <!-- Left Column: Image -->
                <a aria-label="Open case study: ${escHtml(p.title)}" href="${basePath}projects/${p.slug}.html" class="group relative col-span-7 h-full min-h-0 overflow-hidden rounded-2xl bg-card">
                    ${renderResponsivePicture(p.heroImg, p.title, 'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]', '(max-width: 768px) 90vw, 45vw', index === 0, basePath)}
                    
                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
                    
                    <span class="absolute left-4 top-4 rounded-full border border-background/40 bg-foreground/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-background backdrop-blur">${String(index + 1).padStart(2, '0')} / ${String(sorted.length).padStart(2, '0')}</span>
                    
                    <span class="absolute bottom-4 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-background text-foreground transition-all duration-300 group-hover:bg-accent group-hover:text-background shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                    </span>
                </a>
                
                <!-- Right Column: Meta -->
                <div class="col-span-5 flex h-full flex-col justify-between py-4 lg:py-6 min-h-0">
                    <div>
                        <div class="flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
                            <span class="font-mono project-year">${p.year}</span>
                            <span class="h-px w-12 bg-muted-foreground/30"></span>
                            <span class="font-mono truncate">${escHtml(p.role)}</span>
                        </div>
                        <h2 class="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-tight lg:text-[3.25rem] text-foreground">${escHtml(p.title)}</h2>
                        <p class="mt-3 max-w-md text-base text-muted-foreground">${escHtml(p.shortDesc)}</p>
                    </div>
                    
                    <div class="mt-4 flex flex-col gap-6">
                        <dl class="grid grid-cols-3 gap-4 border-t border-foreground/10 pt-6">
                            ${buildStatsGrid(p.metrics)}
                        </dl>
                        
                        <div class="flex flex-wrap items-center gap-2.5">
                            ${buildStackChips(p.technologies)}
                        </div>
                        
                        <a href="${basePath}projects/${p.slug}.html" class="group inline-flex items-center gap-2 text-sm font-medium text-foreground w-max pt-1">
                            <span class="border-b border-accent pb-0.5 transition-colors group-hover:text-accent">Read the case study</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                        </a>
                    </div>
                </div>
                
            </div>
        </article>
    `).join('\n');

    const workReelHtml = `
    <div class="hidden md:block work-reel-container" aria-label="Work reel">
        <div class="h-screen overflow-hidden relative" id="work-reel-pin">
            <!-- Track -->
            <div class="flex h-full items-center work-reel-track w-max pt-16 pb-12">
                <!-- Intro Spacer -->
                <div class="flex h-full w-[40vw] shrink-0 items-end px-10 pb-4">
                    <div>
                        <div class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Begin the reel</div>
                        <div class="mt-2 font-serif text-3xl italic text-muted-foreground">Scroll &rarr;</div>
                    </div>
                </div>
                ${reelSlides}
                <!-- End Spacer -->
                <div class="w-[10vw] flex-shrink-0 h-full"></div>
            </div>
            
            <!-- Bottom Overlay Bar -->
            <div class="absolute inset-x-0 bottom-0 z-20 border-t border-foreground/10 flex items-center justify-between px-6 md:px-10 py-2.5 h-12">
                <div class="font-mono text-muted-foreground text-sm tracking-widest reel-counter w-24">01 / ${String(sorted.length).padStart(2, '0')}</div>
                <div class="flex-1 mx-8 relative h-full flex items-center">
                    <div class="absolute left-0 w-full h-px bg-foreground/10"></div>
                    <div class="absolute left-0 h-[2px] bg-foreground reel-progress transition-all duration-100" style="width: 0%"></div>
                </div>
                <div class="font-serif text-foreground text-lg reel-active-title w-64 text-right truncate">
                    ${escHtml(sorted[0].title)} <span class="font-mono text-sm text-muted-foreground ml-3 tracking-widest">&mdash; ${sorted[0].year}</span>
                </div>
            </div>
        </div>
    </div>
    `;

    // 2. Build Work Stack (Mobile)
    let stackItems = sorted.map((p, i) => `
        <li>
            <a href="${basePath}projects/${p.slug}.html" class="block group" aria-label="Open case study: ${escHtml(p.title)}">
                <div class="relative aspect-square rounded-[2rem] overflow-hidden bg-card mb-6">
                    <div class="absolute top-4 left-4 z-10 font-mono text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium tracking-widest">${String(i + 1).padStart(2, '0')} / ${String(sorted.length).padStart(2, '0')}</div>
                    ${renderResponsivePicture(p.heroImg, p.title, 'w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out', '(max-width: 768px) 100vw, 100vw', i < 2, basePath)}
                    <div class="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                    </div>
                </div>
                
                <div class="flex items-center gap-3 mb-3">
                    <span class="font-mono text-xs text-muted-foreground tracking-widest">${p.year}</span>
                    <span class="w-1 h-1 rounded-full bg-border"></span>
                    <span class="font-mono text-xs text-muted-foreground tracking-widest uppercase">${escHtml(p.role)}</span>
                </div>
                
                <h2 class="font-serif font-medium text-4xl tracking-tight text-foreground mb-4">${escHtml(p.title)}</h2>
                
                <p class="font-sans text-muted-foreground leading-relaxed mb-6 line-clamp-2">${escHtml(p.shortDesc)}</p>
                
                <div class="flex flex-wrap gap-2">
                    ${Object.values(p.technologies || {}).flat().slice(0, 3).map(t => `<span class="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">${escHtml(t)}</span>`).join('')}
                </div>
            </a>
        </li>
    `).join('');

    const workStackHtml = `
    <div class="md:hidden mt-20 max-w-[1400px] px-6 mx-auto">
        <ul class="space-y-20">
            ${stackItems}
        </ul>
    </div>
    `;

    return { workReelHtml, workStackHtml };
}

// ──────────────────────────────────────────
// Helper: render projects on the homepage
// ──────────────────────────────────────────
function renderHomepageProjects() {
    // Use the exact order provided by projects.json
    const sorted = [...projects];

    return sorted.map((p, index) => {
        const isEven = index % 2 === 0;
        const imgOrder = isEven ? 'order-2 @2xl:order-1' : 'order-2 @2xl:order-2';
        const textOrder = isEven ? 'order-1 @2xl:order-2' : 'order-1 @2xl:order-1';
        
        // Hide projects after the first 3
        const hiddenClass = index >= 3 ? ' hidden' : '';

        const picture = renderResponsivePicture(
            p.heroImg,
            `${p.title} - ${p.category}`,
            'w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out',
            '(max-width: 768px) 90vw, 45vw',
            index < 3, // eager load first 3
            './'
        );

        return `
                    <!-- Project ${index + 1} -->
                    <div class="project-item group block @container${hiddenClass}" data-project="${p.id}">
                        <div class="grid @2xl:grid-cols-2 gap-8 @2xl:gap-16 items-center">
                            <div class="${imgOrder}">
                                <div class="overflow-hidden rounded-lg border border-border shadow-lg hover-lift">
                                    ${picture}
                                </div>
                            </div>
                            <div class="${textOrder}">
                                <span class="text-accent text-sm font-medium mb-4 block">${escHtml(p.category)} - ${escHtml(p.year)}</span>
                                <h3 class="text-3xl @2xl:text-4xl font-display font-bold mb-6 group-hover:text-foreground/80 transition-colors text-balance">${escHtml(p.title)}</h3>
                                <p class="text-muted-foreground text-lg mb-8 leading-relaxed">${escHtml(p.shortDesc)}</p>
                                <a href="projects/${p.slug}.html" class="flex items-center gap-2 text-foreground font-medium border-b border-border pb-1 group-hover:border-accent group-hover:text-accent transition-all inline-block">
                                    View Case Study <i data-lucide="arrow-up-right" class="w-4 h-4" aria-hidden="true"></i>
                                </a>
                            </div>
                        </div>
                    </div>`;
    }).join('\n');
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
        <div class="max-w-[680px] mx-auto text-center pt-40 md:pt-56 pb-14 px-6">
            <a href="${basePath}blog.html" class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
                <i data-lucide="arrow-left" class="w-4 h-4" aria-hidden="true"></i> All posts
            </a>
            
            <div class="mt-10 flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-muted-foreground tracking-wide uppercase">
                <span class="border border-accent/30 bg-accent/10 text-accent rounded-full px-2.5 py-0.5">${escHtml(post.category)}</span>
                <span class="text-foreground/30">&middot;</span>
                <span>${formattedDate}</span>
                <span class="text-foreground/30">&middot;</span>
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
                    <img src="${basePath}${post.cover}" alt="Cover image for ${escHtml(post.title)}" loading="eager" class="w-full h-auto object-cover aspect-video md:aspect-[21/9]">
                </div>
            </div>
        `;
    }

    // Body
    const bodyHtml = `
        <div class="max-w-[680px] mx-auto px-6 prose-reveal">
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
                    <a href="mailto:hello@layshahdev.com" class="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors font-medium text-sm gap-1.5 bg-background">Work with me <i data-lucide="arrow-up-right" class="w-4 h-4"></i></a>
                </div>
            </div>
        </div>
    `;

    // Contact CTA
    const contactCtaHtml = `
        <div class="max-w-[1100px] mx-auto mt-24 mb-16 px-6">
            <div class="p-8 md:p-12 rounded-3xl border border-border bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-900/50 dark:to-slate-950/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative overflow-hidden transition-all hover:border-accent/20">
                
                <!-- Content (Left side) -->
                <div class="flex-grow max-w-2xl">
                    <div class="flex items-center gap-2 mb-6">
                        <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        <span class="text-accent text-xs font-mono uppercase tracking-widest">Enjoyed this? · Booking Q3 2026</span>
                    </div>
                    <h2 class="text-3xl md:text-5xl font-serif font-medium leading-tight text-foreground mb-4">Have a website you want to actually ship?</h2>
                    <p class="text-muted-foreground text-base md:text-lg leading-relaxed">I take on one project at a time. Tell me what you're working on — I reply within a day.</p>
                </div>

                <!-- Action Buttons (Right side) -->
                <div class="flex flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto flex-shrink-0">
                    <a href="mailto:hello@layshahdev.com" class="inline-flex items-center justify-center gap-1.5 px-8 py-3.5 bg-accent text-accent-foreground rounded-full hover:scale-[1.02] transition-all font-medium text-base shadow-lg shadow-accent/15">
                        Start a project <i data-lucide="arrow-up-right" class="w-4.5 h-4.5"></i>
                    </a>
                    <a href="https://cal.com/layshah" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-background text-foreground border border-border rounded-full hover:border-foreground hover:bg-muted/30 transition-all font-medium text-base">
                        <i data-lucide="calendar" class="w-4.5 h-4.5"></i> Book a 20-min call
                    </a>
                    <span class="text-xs text-muted-foreground text-center lg:text-right mt-1 block">Usually reply within a day.</span>
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
                    <a href="${basePath}blog.html" class="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">All posts <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
                </div>
                <div class="grid md:grid-cols-2 gap-6">
                    ${relatedPosts.map(rp => `
                        <a href="${basePath}${rp.slug}.html" class="group block p-8 rounded-2xl border border-border bg-card transition-all hover:border-accent hover:bg-card/80 hover:-translate-y-1">
                            <span class="inline-block border border-accent/30 bg-accent/10 text-accent rounded-full px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide mb-6">${escHtml(rp.category)}</span>
                            <h3 class="font-serif text-2xl md:text-3xl font-medium text-foreground leading-tight mb-4 group-hover:text-accent transition-colors">${escHtml(rp.title)}</h3>
                            <p class="text-muted-foreground line-clamp-2 leading-relaxed mb-8">${escHtml(rp.dek)}</p>
                            <span class="inline-flex items-center gap-1.5 text-accent font-medium text-sm">Read <i data-lucide="arrow-up-right" class="w-4 h-4"></i></span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Reading Progress & Scripts
    const pageScripts = `
        <div id="reading-progress" class="fixed top-0 left-0 h-[3px] bg-accent z-[60]" style="width: 0%;"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
        <script>
            // Reading Progress
            window.addEventListener('scroll', () => {
                const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
                const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = (winScroll / height) * 100;
                document.getElementById('reading-progress').style.width = scrolled + '%';
            });
            
            // ProseReveal GSAP
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof gsap !== 'undefined') {
                    gsap.registerPlugin(ScrollTrigger);
                    
                    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    
                    if (!prefersReducedMotion) {
                        const proseChildren = document.querySelectorAll('.prose-reveal > *');
                        proseChildren.forEach((el) => {
                            gsap.fromTo(el, 
                                { y: 16, opacity: 0 },
                                { 
                                    y: 0, 
                                    opacity: 1, 
                                    duration: 0.6, 
                                    ease: "power2.out",
                                    scrollTrigger: {
                                        trigger: el,
                                        start: "top 85%",
                                    }
                                }
                            );
                        });
                    }
                }
            });
        </script>
    `;

    return pageScripts + headerHtml + coverHtml + bodyHtml + endRuleHtml + authorCardHtml + contactCtaHtml + keepReadingHtml;
}

// ──────────────────────────────────────────
// Core: assemble a page from template + metadata + content
// ──────────────────────────────────────────
function buildPage(outputFile, pageConfig, bodyContent) {
    const basePath = getBasePath(outputFile);

    let html = baseTemplate;

    // Replace base path in template
    html = html.replace(/\{\{BASE_PATH\}\}/g, basePath);

    // Replace header/footer (also replace BASE_PATH in them)
    html = html.replace('{{NAV_CONTENT}}', headerHtml.replace(/\{\{BASE_PATH\}\}/g, basePath));
    html = html.replace('{{FOOTER_CONTENT}}', footerHtml.replace(/\{\{BASE_PATH\}\}/g, basePath));

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
    html = html.replace('{{BODY_CONTENT}}', bodyContent);

    // Page-specific scripts (extracted from content if present)
    const pageScripts = pageConfig.type === 'project' ? socialSharingScript : '';
    html = html.replace('{{PAGE_SCRIPTS}}', pageScripts);

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
            console.warn(`  SKIP ${outputFile} (project slug "${config.projectSlug}" not found)`);
            return;
        }
        const basePath = getBasePath(outputFile);
        const body = renderCaseStudy(project, basePath);
        buildPage(outputFile, config, body);
    } else if (config.type === 'post') {
        const post = posts.find(p => p.slug === config.postSlug);
        if (!post) {
            console.warn(`  SKIP ${outputFile} (post slug "${config.postSlug}" not found)`);
            return;
        }
        const basePath = getBasePath(outputFile);
        const body = renderBlogPost(post, basePath);
        buildPage(outputFile, config, body);
    } else if (outputFile === 'projects.html') {
        // Build projects listing page
        const contentPath = path.join(root, config.content);
        let content = fs.readFileSync(contentPath, 'utf-8');
        const { workReelHtml, workStackHtml } = renderProjectsListing();
        content = content.replace('{{WORK_REEL}}', workReelHtml);
        content = content.replace('{{WORK_STACK}}', workStackHtml);
        buildPage(outputFile, config, content);
    } else {
        // Build standard page from content fragment
        const contentPath = path.join(root, config.content);
        if (!fs.existsSync(contentPath)) {
            console.warn(`  SKIP ${outputFile} (content file not found: ${config.content})`);
            return;
        }
        let content = fs.readFileSync(contentPath, 'utf-8');
        if (outputFile === 'index.html') {
            content = content.replace('{{HOMEPAGE_PROJECTS}}', renderHomepageProjects());
        }
        buildPage(outputFile, config, content);
    }
});

console.log(`\n✓ Build complete! ${Object.keys(pagesJson).length} pages generated.`);
