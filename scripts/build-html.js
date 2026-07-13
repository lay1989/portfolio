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

const projects = projectsData.projects;

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

    return `<picture>
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
    // Collect unique categories for filter buttons
    const categories = [...new Set(projects.map(p => p.category))];
    const filterBtns = categories.map(cat => {
        const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        return `<button class="filter-btn px-5 py-2 rounded-full text-sm font-medium border border-border bg-transparent text-muted-foreground hover:bg-secondary transition-all duration-300" data-filter="${slug}">${escHtml(cat)}</button>`;
    }).join('\n            ');

    // Sort projects: newest first (by year desc, then by id desc)
    const sorted = [...projects].sort((a, b) => {
        const yearDiff = parseInt(b.year) - parseInt(a.year);
        if (yearDiff !== 0) return yearDiff;
        return b.id - a.id;
    });

    const cards = sorted.map(p => {
        const catSlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        return `
            <div class="project-card group reveal" data-category="${catSlug}">
                <a href="./projects/${p.slug}.html" class="block">
                    <div class="overflow-hidden rounded-xl border border-border shadow-lg mb-6 hover-lift">
                        ${renderResponsivePicture(p.heroImg, `${p.title} - ${p.category}`, 'w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out', '(max-width: 768px) 90vw, 45vw')}
                    </div>
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <span class="text-accent text-sm font-medium">${escHtml(p.category)}</span>
                            <span class="text-muted-foreground text-sm">${escHtml(p.year)}</span>
                        </div>
                        <h2 class="text-2xl font-display font-bold mb-3 group-hover:text-accent transition-colors text-balance">${escHtml(p.title)}</h2>
                        <p class="text-muted-foreground leading-relaxed line-clamp-2">${escHtml(p.shortDesc)}</p>
                    </div>
                </a>
            </div>`;
    }).join('\n');

    return { filterBtns, cards };
}

// ──────────────────────────────────────────
// Helper: render projects on the homepage
// ──────────────────────────────────────────
function renderHomepageProjects() {
    // Sort projects: newest first (by year desc, then by id desc)
    const sorted = [...projects].sort((a, b) => {
        const yearDiff = parseInt(b.year) - parseInt(a.year);
        if (yearDiff !== 0) return yearDiff;
        return b.id - a.id;
    });

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
    } else if (outputFile === 'projects.html') {
        // Build projects listing page
        const contentPath = path.join(root, config.content);
        let content = fs.readFileSync(contentPath, 'utf-8');
        const { filterBtns, cards } = renderProjectsListing();
        content = content.replace('{{PROJECT_FILTER_BUTTONS}}', filterBtns);
        content = content.replace('{{PROJECT_CARDS}}', cards);
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
