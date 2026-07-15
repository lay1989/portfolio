function renderProjectsListing() {
    // Sort projects: newest first
    const sorted = [...projects].sort((a, b) => {
        const yearDiff = parseInt(b.year) - parseInt(a.year);
        if (yearDiff !== 0) return yearDiff;
        return b.id - a.id;
    });

    // Helper: render stats grid (3 columns)
    function buildStatsGrid(metrics) {
        if (!metrics) return '';
        const entries = Object.entries(metrics).slice(0, 3);
        return entries.map(([key, val]) => `
        <div>
            <div class="font-serif font-medium text-4xl lg:text-5xl text-foreground mb-1">${escHtml(String(val))}</div>
            <div class="text-sm text-muted-foreground capitalize">${escHtml(key.replace(/([A-Z])/g, ' $1').trim())}</div>
        </div>
    `).join('');
    }

    // Helper: render stack tags
    function buildStackChips(technologies) {
        if (!technologies) return '';
        const allTechs = Object.values(technologies).flat().slice(0, 4);
        return allTechs.map(t => `
        <span class="text-xs text-muted-foreground border border-border rounded-full px-4 py-1.5">${escHtml(t)}</span>
    `).join('');
    }

    const basePath = './';

    // 1. Build Work Reel (Desktop)
    let reelSlides = sorted.map((p, index) => `
        <article class="w-[88vw] max-w-[1200px] px-4 lg:px-8 h-full flex flex-col justify-center relative work-slide flex-shrink-0" data-index="${index}" data-title="${escHtml(p.title)}">
            <div class="grid grid-cols-12 gap-8 lg:gap-16 items-center">
                
                <!-- Left Column: Image -->
                <a href="${basePath}projects/${p.slug}.html" aria-label="Open case study: ${escHtml(p.title)}" class="col-span-12 md:col-span-6 relative group block rounded-[2rem] overflow-hidden bg-card aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/3] transform transition-transform duration-700 hover:scale-[1.02]">
                    <!-- Pill Badge -->
                    <div class="absolute top-6 left-6 z-10 font-mono text-white bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium tracking-widest">
                        ${String(index + 1).padStart(2, '0')} / ${String(sorted.length).padStart(2, '0')}
                    </div>
                    
                    ${renderResponsivePicture(p.heroImg, p.title, 'w-full h-full object-cover', '(max-width: 768px) 90vw, 45vw', index === 0, basePath)}
                    
                    <!-- decorative arrow disc -->
                    <div class="absolute bottom-6 right-6 z-10 w-14 h-14 rounded-full bg-white flex items-center justify-center text-black group-hover:scale-110 transition-transform duration-300 shadow-xl">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                    </div>
                    
                    <!-- gradient veil -->
                    <div class="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700"></div>
                </a>
                
                <!-- Right Column: Meta -->
                <div class="col-span-12 md:col-span-6 flex flex-col justify-center pt-8 md:pt-0">
                    <!-- Eyebrow -->
                    <div class="flex items-center gap-4 mb-6">
                        <span class="font-mono text-muted-foreground text-sm tracking-widest">${p.year}</span>
                        <div class="h-px w-8 bg-border"></div>
                        <span class="font-mono text-muted-foreground text-sm tracking-widest uppercase">${escHtml(p.role)}</span>
                    </div>
                    
                    <h2 class="font-serif font-medium text-5xl lg:text-7xl leading-[1.05] tracking-tight mb-6 text-foreground">${escHtml(p.title)}</h2>
                    <p class="font-sans text-lg lg:text-xl text-muted-foreground leading-relaxed mb-8">${escHtml(p.shortDesc)}</p>
                    
                    <hr class="border-border my-8 w-full">
                    
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-3 gap-x-4 gap-y-8 mb-10">
                        ${buildStatsGrid(p.metrics)}
                    </div>
                    
                    <!-- Stack Chips -->
                
            </div>
        </article>
    `;
    }).join('\n');

    const workReelHtml = `
    <div class="hidden md:block work-reel-container" aria-label="Work reel">
        <div class="h-screen overflow-hidden relative" id="work-reel-pin">
            <!-- Track -->
            <div class="flex h-full items-center work-reel-track w-max pl-[20vw] lg:pl-[40vw]">
                <!-- Intro Spacer -->
                <div class="w-[30vw] flex-shrink-0 h-full flex flex-col justify-end pb-[20vh] pr-12">
                    <p class="font-mono text-muted-foreground text-sm uppercase tracking-widest mb-4">BEGIN THE REEL</p>
                    <p class="font-serif italic text-4xl lg:text-5xl text-foreground">Scroll &rarr;</p>
                </div>
                ${reelSlides}
                <!-- End Spacer -->
                <div class="w-[10vw] flex-shrink-0 h-full"></div>
            </div>
            
            <!-- Bottom Overlay Bar -->
            <div class="absolute inset-x-0 bottom-0 z-20 bg-background/90 backdrop-blur-md border-t border-border flex items-center justify-between px-6 md:px-10 py-5 h-20">
                <div class="font-mono text-muted-foreground text-sm tracking-widest reel-counter w-24">01 / ${String(sorted.length).padStart(2, '0')}</div>
                <div class="flex-1 mx-8 relative h-full flex items-center">
                    <div class="absolute left-0 w-full h-px bg-border/50"></div>
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