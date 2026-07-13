# Project Identity
This repository is the personal portfolio and professional website of **Lay Shah**, a freelance Full Stack Web Developer and Web Designer. The site acts as a client acquisition funnel, showcasing high-performing custom websites, CMS platforms, and web engineering principles through detailed case studies and technical blog posts.

# Current Stack
- **Languages**: HTML5, Vanilla JavaScript (ES6+), CSS3.
- **Styling**: Tailwind CSS v3 (compiled via Tailwind CLI).
- **Build Utilities**: Node.js, `cheerio` (for HTML parsing and template rendering), `esbuild` (for JS bundling).
- **Icons**: Lucide Icons (loaded via CDN with unpkg, jsdelivr, and local fallback).
- **Analytics & Form Handling**: Static HTML structure configured with Netlify-compatible form hooks (`data-netlify="true"`).

# Active Context
Homepage redesign is complete. The design system has been shifted to a warm cream background (#F5F0EA), DM Serif Display font has been added, Lenis smooth scroll is loaded, and GSAP split-word reveal animations are configured. All changes were compiled and 16 pages generated successfully. Awaiting further client feedback.

# Completed Milestones
- **Template-Based Componentization**: Unified all 16 pages under a single master template shell (`templates/base.html`) and separate navigation/footer components.
- **Case Study De-monolithing**: Extracted the monolithic client-side `project-details.html` into 7 individual static HTML case study pages inside the `projects/` subfolder.
- **Data-Driven Architecture**: Extracted case study data into `data/projects.json` and page configuration metadata (titles, canonicals, OG, structured data) into `pages.json`.
- **Standalone Projects Listing**: Created `projects.html` featuring client-side filtering buttons and dynamic cards.
- **High-Converting Copywriting**: Refactored homepage copy (Hero, About, Service Cards, CTAs) to focus on client outcomes and conversion urgency.
- **AI-De-biasing (Authenticity Redesign)**: Replaced generic FAQ/Process sections with editorial showcases ("Engineering Philosophy") and asymmetrical client reviews.
- **Build Pipeline Integration**: Configured `package.json` scripts (`build`, `build:css`, `build:js`, `build:html`) to run Tailwind compilation, esbuild bundling, page assembly, and sitemap synchronization in one workflow.
- **Dead Code Cleanup**: Deleted 62 unused React/TypeScript files and legacy scripts.
- **Strict UI/UX & Copywriting Standards Integration**: Updated `.agentrules` to enforce anti-slop copy guidelines (active verbs, Stripe/Apple-like punchy messaging, zero generic AI phrases/robotic transitions/punctuation) and high-end design requirements (micro-interactions, states, transitions, while aggressively banning generic AI slop patterns like Hero Pills, 3-card grids, zig-zags, purple-to-blue gradients, and generic SVGs).
- **About Section Copywriting & Layout Update**: Redesigned the homepage About section to match the large 2-column layout and copywriting Option 1 text ("Five years, one developer, a lot of shipped projects"). Integrated precise spacing alignments to align paragraphs with heading levels.
- **Services Section Layout & GSAP Animation**: Transformed the Services section grid cards into a clean 6-row list layout ("Six things I do well") with index numbers, typography-driven headings, description text, and border separators. Loaded GSAP & ScrollTrigger inside the master template, and implemented stagger entry reveals and smooth interactive row highlight animations (title translation, number translation, background color transitions) on hover.
- **Process Section Layout & GSAP Animation**: Replaced the Engineering Philosophy section with the new "How I Work" section ("No surprises. No scope creep.") as a unified border container card grid split into 4 process steps (Talk, Direction, Build properly, Stay after launch). Dividers adapt responsively (vertical borders on desktop, horizontal on mobile). Integrated GSAP scroll triggers for staggering column entry reveals, and interactive hover highlights that slide open the bottom indicator lines and light up column backgrounds and titles.
- **Homepage Editorial Redesign (Awwwards-Level)**: Full homepage redesign executed. Key changes: (1) Design system shifted from pure white to warm cream `#F5F0EA` — cascades to all 16 compiled pages. (2) Added DM Serif Display as `font-serif` token for italic editorial headings. (3) Hero section overhauled — viewport-filling headline with `clamp()` fluid sizing, stats row (7 projects / 5 clients / 100% on-time), hero label + CTA buttons with GSAP animation targets. (4) New marquee ticker strip between Hero and About — CSS infinite-loop animation, 8 service types. (5) All section headers redesigned with editorial pattern: `(LABEL)` monospace + `data-split-reveal` H2 + DM Serif italic accent phrase. (6) Reviews section: removed generic quote icon, new editorial headline "They'll tell you better than I can". (7) Contact section: New headline "Ready when you are." + "No discovery calls." copy + stat counters with `data-count` for GSAP count-up. (8) New `src/gsap-animations.js` module with Lenis, splitWords, ScrollTrigger reveals, hero sequence, marquee, counters, and project parallax. (9) `script.js` cleaned up and updated to import + call all new animation functions. (10) `templates/base.html` updated with DM Serif Display Google Font and Lenis CDN script.

# Known Quirks & Issues
- **Output Overwrite Risk**: Editing HTML files in the root folder or `projects/` subfolder directly is temporary. They are overwritten on the next build execution. All core content modifications must be done inside `content/`, `data/`, `components/`, or `templates/`.
- **Relative Path Prefixes (`{{BASE_PATH}}`)**: Pages inside subfolders (like `projects/*.html`) must resolve resources relative to their folder level. The template base shell uses `{{BASE_PATH}}` which compiles to `../` for subdirectories and `./` for root pages. Ensure new links and assets inside templates include this token.
- **Trailing Slashes**: SEO canonical links in `pages.json` are standardized to lack trailing slashes on `.html` files (e.g. `https://layshahdev.com/blog.html`) to prevent redirect loops.
