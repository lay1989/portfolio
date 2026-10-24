# Dynamic portfolio: implementation plan v2

Status: revised planning draft. This document supersedes `dynamic-website-plan.md`. It defines the proposed implementation; it does not provision infrastructure or switch the live website.
Updated: 2026-10-24.

The first development milestone is a shared design system, followed by the Flask foundation and a complete project-editing flow. Each milestone has a working demonstration and completion gate. The existing site remains available during the migration.

## Decisions already made

- Preserve the existing visual identity, Tailwind styling, and vanilla browser JavaScript.
- Confirmed creative direction: **editorial portfolio with one signature interaction**. Keep the surrounding layout quiet and readable; prototype one purposeful interactive explanation before integrating it.
- Centralize all reusable visual values in **one author-edited file, `design/system.json`**. Shared components, page templates, editor previews, and motion consume that source. This is a proposed file, not an implemented feature yet.
- Confirmed by the owner: design settings are edited through the shared file only initially, using the normal asset build and code release process. Dashboard theme editing is outside the initial scope.
- Use a Python backend; Flask is the recommended framework, subject to final architecture review.
- Use **SQLite on the portfolio VM**, confirmed by the owner on 2026-10-24, with SQLAlchemy models and Alembic migrations.
- Move from Netlify to a **separate Oracle Cloud Always Free VM**. The existing VM for the other project is outside this migration's scope.
- Provide one private owner account, with no public registration.
- Provide a visual editor with structured content sections.
- Add a section whose public navigation label is exactly **Tools**. It is a managed catalog linking to tools hosted elsewhere; executing those tools within the portfolio is outside the initial scope.
- Projects, blog posts, and Tools must all support adding, editing, publishing, and persistent manual ordering.
- Publishing content should update the live site without changing source files, committing to Git, or rebuilding the application.
- Preserve the current public page addresses, including existing `.html` routes, during the initial migration.
- Include the current GitHub automated-checks workflow. The owner completed GitHub authorization with workflow access on 2026-10-24. The workflow itself has read-only repository permissions.

## Recommended architecture

Use Flask with server-rendered Jinja templates, SQLAlchemy for data access, and Alembic for database migrations. The public website receives complete HTML, including its content and metadata. JavaScript enhances editing, sorting, filtering, and motion.

Run the app behind Gunicorn and Nginx on a supported Linux image. Nginx serves public assets and uploaded image variants; the application handles pages, authentication, and content management. Use a dedicated service account and systemd services. Production must not use Flask's development server.

The owner selected **SQLite on a persistent local filesystem** for the single-owner portfolio. Keep transactions short, enable appropriate locking/timeout settings, and use consistent database backups. SQLAlchemy and migrations preserve a path to PostgreSQL, but any future database move will require an explicit migration and verification. PostgreSQL is not part of the initial deployment.

Keep uploaded images outside release directories and outside Git. Begin with persistent VM storage and encrypted backups copied off the VM. Use Oracle Object Storage for backups within verified tenancy allowances. A storage adapter should permit moving public media to object storage later without changing content records.

Build CSS and browser JavaScript when application code changes. Generate image variants at upload time. Neither task should run on an ordinary public page request.

## Shared design system: one source for every page

### What changing one file means

`design/system.json` is the only source for authored design values. A small validated build step produces CSS custom properties, Tailwind theme mappings, and a browser motion configuration from it. Generated outputs are marked as generated and are never edited by hand. They are built once per code release, with no additional public request processing.

For example, change `color.heading.accent` from the green palette reference to a red palette reference in this file. Every accent heading on the homepage, project pages, blog pages, Tools, and public-template previews follows that role after the asset build and release. Change `type.sectionHeading` to update the size, weight, line height, and letter spacing of section headings across those same pages.

Use semantic roles so the scope is predictable. `color.text.body`, `color.heading.default`, `color.heading.accent`, and `color.action.primary` have separate jobs. A shared `color.brand` alias can deliberately connect roles when a brand-wide color change is wanted. One change propagates everywhere that uses the chosen role; it does not flatten the hierarchy by making every kind of text identical. Theme-specific values and interactive states live in the same file.

The owner confirmed file-based design editing through the normal code release process. Content, ordering, SEO, and image placements are edited through the dashboard and take effect when explicitly saved or published, without rebuilding the application. Dashboard editing of design values is outside the initial scope. Any later addition must preserve one authoritative design source, with validation, preview, publishing, and rollback. Do not introduce competing database and file overrides.

### Values that belong in the central file

| Group | Required values and behavior |
| --- | --- |
| Palette and semantic color | Brand and neutral palette; background/surface/text/heading/link/border/focus/status roles; light and dark variants; hover, active, disabled, selected, and error states; readable foreground/background pairings |
| Typography | Body, display, serif, and mono families with fallbacks; loaded font files and supported weights/styles; heading/body/caption/code roles; responsive minimum/maximum sizes; line height, letter spacing, paragraph gap, and reading width |
| Font width | Supported font stretch or variable-font width axis where the actual font provides it; otherwise a suitable family. Text container width and letter spacing remain separate controls. Do not stretch letter shapes with transforms |
| Spacing and layout | Spacing scale, section rhythm, container maximum widths, page gutters, grid gaps, reading measures, responsive breakpoints, header height, and anchor offset |
| Surfaces and details | Border widths/styles, radii, shadows, overlays, layer order, icon sizes/strokes, media aspect presets, and control target sizes |
| Component variants | Approved button, input, heading, card, badge, prose, gallery, and section variants; their token references, sizes, and states |
| Motion | Global enabled switch; duration, delay, easing, stagger, travel distance, repeat, and trigger presets; responsive variants; reduced-motion policy; bounded looping effects |

Organize these as primitive values, semantic aliases, and a small set of component-specific references. Do not create a new token for every incidental element. Store colors once and derive the RGB channels needed by Tailwind opacity utilities; do not maintain a hex value and matching channel values by hand. Store motion durations in one documented unit and convert for CSS/GSAP adapters.

Typography should use scalable units and fluid sizing where appropriate. Existing fonts and visual identity are the starting point. Load only the font files/axes actually used, verify their licensing, and measure font loading and layout shift. A font-family change can require supplying its font asset once; changing a name cannot create a missing font file.

### Reusable components and formats

Build Jinja macros and shared includes for the site shell, navigation, footer, section heading, buttons/links, form fields, alerts, project/post/Tool cards, pagination, breadcrumbs, responsive images, gallery, and metadata. Components accept named options such as size, variant, content, and media placement. Their repeated markup and style combinations live once.

Reuse a small set of page layouts: collection listing, project case study, article, Tool detail, standard content, and error page. Structured content blocks use shared renderers for headings, prose, lists, quotations, code, images, and galleries. Reuse editorial formats without forcing every collection into an identical appearance.

Keep component styling in shared recipes, using Tailwind utilities and its component layer where suitable. Update the repository's style conventions when this milestone lands: token-backed reusable component recipes replace copied class strings and page-specific visual constants. Normal layout composition can still use Tailwind. Arbitrary per-page colors, font sizes, radii, shadows, or animation durations require a documented exception or a new shared role.

The visual editor offers approved layouts, widths, and variants rather than arbitrary CSS. An authenticated preview renders the exact public templates and public CSS. The editor's block canvas reuses public block styles; dashboard controls use their own semantic roles where needed for legibility. Content data must not contain Tailwind class strings or executable animation code.

### Separate animation implementation

Keep motion behavior under `src/motion/`, with one initializer and named reusable effects such as reveal, stagger, menu, and gallery transition. CSS handles simple interactive transitions; GSAP/ScrollTrigger handles coordinated or scroll-linked motion only when useful. Both read the central motion values. Shared timing/easing curves use an explicit adapter; avoid subtly different CSS and JavaScript copies.

Templates opt into named effects through approved component options or `data-motion` attributes. No copied timelines or anonymous scroll loops in page templates. Responsive triggers use central breakpoint values. Clean up animation instances and listeners when an editor preview replaces content, and refresh layout-sensitive effects after fonts/media settle.

The global motion switch and the visitor's reduced-motion preference apply to both CSS and JavaScript. Navigation, focus, form status, and content remain usable without animation or JavaScript. Essential text and CTAs are visible by default, with failure-safe cleanup if an animation cannot start. Include pause controls or stop behavior for persistent nonessential movement. Prefer opacity and transforms; measure effects that could introduce layout shift or mobile jank.

### Proposed source structure

```text
design/
  system.json                 # only author-edited visual values
  system.schema.json          # allowed shape, units, references, and limits
scripts/
  build-design.mjs            # validate, resolve aliases, generate adapters
app/
  __init__.py                 # Flask application factory
  public/                     # public routes
  admin/                      # owner routes and forms
  services/                   # publishing, media, inquiries, caching
  models/                     # content, revisions, placements, owner
  templates/
    base.html
    components/               # shared Jinja macros and includes
    blocks/                   # public structured-content renderers
    layouts/
    admin/
  static/generated/           # design.css and motion configuration
styles/
  base.css                    # defaults and token-backed type roles
  components.css              # shared recipes and states
src/
  motion/                     # shared animation behavior
  admin/                      # editor, ordering, media controls
  public/                     # navigation, forms, filtering
migrations/
tests/
```

The structure is a target, not a requirement to move everything at once. Adapt the current Tailwind/esbuild pipeline first, then move reusable HTML into Jinja when Flask is introduced. One token source supplies both the transitional static site and the dynamic app. Schema definitions contain constraints, not a second set of default visual values. Persistent databases and uploaded media live outside these code/release folders.

### Proof that the design system works

Build a component reference page showing both themes, small and large screen layouts, typography roles, all component states, image placements, and motion examples. Keep it out of the production search index; it can be development-only or owner-only.

The milestone is complete when:

1. A single heading-color change reaches every existing page type and public preview; theme-specific roles remain readable.
2. One type-role edit changes size, weight, line height, and spacing everywhere that role is used, without editing templates.
3. Changing the motion duration or enabled switch affects all participating CSS and JavaScript effects; reduced motion works too.
4. No repeated design constants remain in the migrated scope. A narrow automated check catches forbidden raw visual values and unknown tokens, with explicit exceptions for geometry, intrinsic media dimensions, and content-specific focal points.
5. Schema validation catches wrong units, missing references, alias cycles, invalid variant choices, and unsupported font weights. Contrast checks cover named foreground/background pairs; browser checks cover real components.
6. Representative pages work in both themes, at narrow/middle/wide widths, at text zoom, with a keyboard, with reduced motion, and with scripts disabled. Longer headings and missing optional fields do not break layouts.

This directly implements the requested one-place editing while keeping component markup, styling recipes, animation behavior, and content separate and reusable.

## Art direction, content craft, and the signature interaction

The design system keeps implementation consistent; a creative brief determines why the portfolio looks and reads the way it does. Preserve the current editorial identity and document its audience, visual references, composition principles, tone, and one memorable interaction. The brief references `design/system.json` for actual values rather than duplicating a second palette, typography scale, or timing configuration.

Use frontend-design for art direction, design-system-patterns for reusable structure, and emil-design-eng for interaction judgment. These complement each other. Do not let multiple opinionated design skills independently restyle the same page. Taste Skill and Impeccable were researched as alternatives; their fit and integration tradeoffs are documented in [the creative-skills research](creative-skills-research.md).

Anatomy is already installed and can produce the signature component as framework-free SVG/JavaScript. The recommended concept to prototype is a small **publishing workbench** demonstrating draft → preview → publish. It is a proposal, not an approved final object: compare its usefulness with a project-inspection desk before choosing the shipped treatment. Use illustrative demo data, never public access to real owner actions. Ordinary HTML explains the idea and presents the inquiry CTA even without the effect.

Keep the initial prototype SVG-first, keyboard/touch usable, compatible with both themes and reduced motion, and idle when offscreen. Its tokens and motion settings come from the shared file. Prototype in isolation during Step 1, then integrate after the CMS/content architecture is stable. Add no dependency until the prototype proves it needs one; Anime.js was researched as an alternative, while CSS/GSAP remains the current implementation. No custom scroll hijacking or mandatory animated navigation is needed to demonstrate the concept.

For content, use content-strategy to choose topics grounded in actual projects and client questions, copywriting for new drafts, and copy-editing for existing text. Pair technical SEO with useful original explanations, accurate authorship, internal links, and evidence. No invented clients, results, credentials, or guarantees. General examples, simulated review scores, and conversion statistics in skills are not evidence about this business. A content review should check the argument, factual support, voice, next step, and metadata before publication.

### Architecture alternatives

| Decision | Recommended for this project | Alternative and when to choose it |
| --- | --- | --- |
| Framework | Flask with tailored owner dashboard | Django if the speed of obtaining a built-in administration system outweighs a smaller custom application |
| Rendering | Server-rendered HTML with progressive enhancement | A separate browser application and API only if a later interaction genuinely needs that separation |
| Database | Confirmed: SQLite on the portfolio VM | Reassess PostgreSQL only if future concurrency or operational needs change |
| Media | Persistent local media with off-VM backups | Object storage for public media when independent storage/CDN delivery becomes useful |
| Editor | Structured visual blocks with approved layouts | Markdown with preview if the owner later prefers writing source text |
| Public URLs | Confirmed: preserve existing URLs during the first migration | Any later URL redesign requires its own permanent redirect map and migration review |

## What the owner dashboard will manage

### Core records and boundaries

| Record | Responsibility |
| --- | --- |
| Owner | One private account, password/session/recovery state; no public registration |
| Project / Post / Tool | Stable identity and collection-specific fields; separate published and working revision pointers |
| Content revision | Versioned structured blocks, metadata, validation state, author, and timestamps; preview renders a selected revision |
| Collection placement | Manual position in a collection or featured slot; unique membership, deterministic ordering, transactional moves |
| Media asset / variant | Original file, processing state, storage key, dimensions, format, and generated variants |
| Media placement | Per-use crop, focal point, fit, alt text, caption, and responsive overrides linked to a revision |
| Global content revision | Homepage sections, navigation/contact details, defaults, and featured selections published together |
| Redirect | Previous published path to a valid local destination, with conflict and loop validation |
| Inquiry / delivery attempt | Accepted contact message, notification state, retry information, and retention status |

Schema migrations are explicit and versioned. Use foreign keys and appropriate uniqueness/check constraints. Validate on the server even when the editor already validates. Publishing switches a validated revision atomically, then invalidates affected caches. A public request never reads an incomplete working draft. Reordering and concurrent-tab saves need conflict detection; show the owner how to refresh rather than silently overwriting newer data.

### Shared content behavior

Every project, post, and Tool needs a title, unique slug within its collection, summary, status, revision history, timestamps, manual position, and optional featured placement. The editor should expose **Content**, **Images**, **SEO**, and **Publishing** panels.

- Drafts, preview, publication, unpublication, archive, and restore from trash.
- Working drafts kept separately from the currently published revision. Editing a published entry must not leak unfinished changes to the public page.
- Autosave or an explicit unsaved-change indicator, plus stale-tab protection to avoid overwriting newer edits.
- Preview using the real public template, with desktop/mobile widths and unpublished media available only to the authenticated owner.
- Manual ordering by drag handle and accessible move controls. Save ordering atomically and deterministically; reloads and restarts must preserve it.
- Separate collection order and homepage featured order. Reordering a blog does not falsify its publication date.
- Duplicate entries into drafts, hide/show entries, and confirm destructive operations.
- Validation before publishing: required fields, valid slug, valid external links, available images, and appropriate alternative text.
- Slug changes preserve the previous published path through a redirect record. Prevent loops, conflicts, and redirects to arbitrary external destinations.

### Projects

Include client/concept classification, client name/type, category, year, role, duration, technology tags, live URL, repository URL, cover image, listing thumbnail, gallery, and long-form case-study blocks. Support overview, challenge, approach, solution, results, lessons, and optional attributed testimonial sections.

Outcome figures should have a label/value and optional supporting context or source. The system should let the owner add substantiation; it must not invent results or reviews. Optional sections should disappear cleanly when empty.

### Blog

Include author, category, tags, excerpt, content blocks, cover, listing thumbnail, publication date, modification date, estimated reading time, and optional featured selection. Support draft previews, revisions, and a deliberate publish action. Plan scheduled publication as a later milestone using one supervised scheduler, not a scheduler accidentally started by every web process.

Use manual order for the main curated listing if selected; a separately named “recent” view must remain chronological. Provide pagination, crawlable category/tag pages where useful, and related posts based on explicit choices or shared taxonomy.

### Tools

Use the label **Tools** in navigation and create a crawlable catalog and optional individual description page for each entry. Fields: name, slug, summary, category/tags, status, preview image/gallery, description blocks, external launch URL, optional repository/documentation URLs, and optional accurate access information such as free/paid or account-required.

Support draft/published state, manual order, and homepage featuring. External links remain normal links; arbitrary uploaded scripts or server-side tool execution are not part of the catalog.

### Homepage and global settings

Provide structured editing for hero copy and CTAs, about text, services, process steps, testimonials, featured projects, featured posts, featured Tools, and contact details. Manage social links, booking URL/duration, logo/favicon, default share image, and site-level metadata centrally.

Keep the layout system in code with a defined set of reusable sections. A fully editable site does not require an unrestricted page builder or arbitrary HTML/script fields. Publish global settings and homepage content with the same preview and revision safeguards as other entries.

### Inquiries

Replace Netlify-specific form handling when the app moves to Oracle. Store accepted inquiries before reporting success, and send notifications through a configured email service with retryable delivery state. An email failure must not silently lose the inquiry. Include spam controls, request limits, a honeypot, an owner inbox, and a documented retention/deletion policy. Keep form contents out of analytics and general application logs.

## Visual editor and media requirements

The first editor should support paragraphs, H2/H3 headings, lists, links, quotes, code blocks, images, galleries, and approved text/media layouts. Include captions and controlled width/alignment choices. Render blocks through tested server templates; sanitize rich text server-side and validate the block schema. Choose the editor package after checking maintenance, licensing, accessibility, and vanilla-JavaScript integration.

### Upload and media library

- Upload by file picker and drag/drop, with clear progress, limits, errors, and retry.
- Validate decoded file format, file size, pixel dimensions, and decompression limits. Start with supported raster image formats; handle SVG only through an explicit safe policy.
- Generate safe versioned asset names, auto-orient photographs, and remove unnecessary metadata.
- Retain an original plus appropriately sized modern variants and a fallback where needed. Record actual width, height, format, and size for each variant.
- Reuse images through a searchable library. Record where each image is used; prevent permanent deletion of media still required by published content or retained revisions.
- Store dimensions and file references in the database, not image binary blobs.
- An upload should enter a recoverable pending state until files and database references are consistent; failed processing must not publish broken images.

### Positioning and crops

Each image **placement** should support its own fit mode, focal point, crop/aspect choice, alt text override, and caption. A cover crop and a gallery image may use the same source differently.

- Separate placements for hero, listing card, inline body, gallery, and social preview.
- Desktop and mobile focal-point/crop previews.
- Choose “contain” for screenshots that must show the complete interface, or “cover” for a deliberate crop.
- Inline alignment choices and approved normal/wide/full-width blocks; mobile layouts stack predictably.
- Gallery ordering with keyboard alternatives to dragging.
- A decorative-image choice that intentionally emits empty alt text; informative images require useful descriptions.
- Responsive markup with correct `srcset`, `sizes`, intrinsic dimensions, and loading priority. Above-the-fold hero images should not be lazy loaded.
- Stable media URLs and controlled replacement; changing a crop or version must not serve stale cached assets.

## SEO and performance requirements

Every public content type needs sensible automatic defaults and editable overrides for title, description, canonical URL, social title/description/image, and indexability. The owner should see a search/share preview; length suggestions are advisory rather than ranking promises.

- Complete content and head metadata in the initial HTML response.
- One meaningful H1, semantic sections, crawlable links, breadcrumbs, and appropriate image alternative text.
- Structured data that matches visible content: site/person, breadcrumbs, articles, and relevant project/Tool information. Do not invent ratings, reviews, or rich-result eligibility.
- A sitemap containing only published, indexable canonical URLs, with truthful modification dates.
- Authenticated previews, owner pages, and drafts excluded from indexing and shared caches.
- Correct HTTP status codes, explicit canonical host/HTTPS behavior, preserved old paths or tested permanent redirects, and a custom 404.
- Crawlable rendering assets, usable pagination, and a policy preventing duplicate search/filter combinations from becoming an indexable URL explosion.
- Small JavaScript/CSS payloads, compressed responses, versioned asset caching, and responsive images.
- Indexed queries for published/status/order/slug lookups; avoid repeated relationship queries on listing pages.
- Cache public pages only with reliable invalidation on publish, reorder, archive, slug change, and scheduled release. Never cache private editor or preview responses publicly.
- Measure representative public pages against the current site before switching traffic. Record actual performance evidence; do not promise rankings or a fixed Lighthouse score in advance.

## Owner access, durability, and operations

Use one owner account created through a controlled setup procedure. No public sign-up. Include secure password storage, session protection, CSRF protection, login rate limiting, HTTPS-only production cookies, and a documented recovery procedure. Discuss a second factor before launch. Restrict uploaded content and editor HTML so content editing cannot become arbitrary code execution.

Back up the database consistently and back up original media. Encrypt backups, rotate them within the storage allowance, and copy them off the VM. Test restoration onto a clean environment. Preserve shared data across releases; a Git pull or code rollback must never overwrite the live database or uploads.

Provide health checks, process restart behavior, bounded logs, migration failures that stop deployment, and deployment rollback compatible with the database schema. Keep secrets outside Git, separate development and production settings, and avoid logging credentials, preview tokens, or inquiry content.

## Build sequence and completion gates

| Step | Deliverable | Gate before proceeding |
| --- | --- | --- |
| 0. Baseline and revised plan | Existing improvements are already pushed; record the design contract, skill inventory, confirmed choices, and open decisions | Current GitHub baseline verified; v2 becomes the active plan |
| 1. Design foundation | Central token file/schema/compiler; existing colors/type/spacing/motion migrated; shared component recipes; reference page; design checks; creative brief and isolated signature prototype | Demonstrate one-file color/type/motion changes across static pages; validate both themes/responsive states; preserve editorial identity; review the prototype separately from the backend |
| 2. Flask foundation | Factory/Blueprint structure, Jinja shell/macros, settings, SQLite/migrations, owner login, and existing design/asset pipeline | Clean-checkout setup works; authentication/CSRF and migrations tested; public and preview rendering consume the same design source |
| 3. Import and public rendering | Import all 10 projects, 6 posts, media, metadata, and global content into the new data model | All 21 existing routes retain content and metadata; importer is repeatable without duplicates; later deployment cannot overwrite live edits |
| 4. Media and first complete editing flow | Media library, per-placement crops, visual blocks, project drafts/previews/publishing/order, and revisions | Owner creates a project with uploads, adjusts mobile/desktop crops, previews, publishes, edits a private draft, reorders, and restores a revision; data survives restart |
| 5. Complete the CMS | Blog, Tools, homepage/global editors, independent featuring, inquiry handling, and integration of the selected signature component | Owner completes normal tasks without code; orders persist; only published revisions are public; inquiry survives notification failure; signature preserves access and mobile performance |
| 6. SEO, performance, and recovery | Complete metadata/structured data/redirects/sitemap checks, cache invalidation, backups, restore rehearsal; scheduled publishing if selected | Functional/security/SEO checks pass; realistic browser measurements recorded; no private content leaks; restore demonstrated |
| 7. Oracle staging and migration | Separate eligible VM, production services, TLS, deployment procedure, email delivery, and final import | Verify unused free quota first; protected staging works without indexing; real inquiry delivery/data persistence tested; owner reviews the full site |
| 8. Cutover and verification | Final content freeze/import, domain switch, route checks, analytics checks, monitoring, and rollback window | Verify live pages/forms/media/redirects/admin; retain the known-good Netlify release until migration is confirmed |

Each milestone should be a reviewable change. Plan and build locally before changing DNS or provisioning production resources. The existing other-project VM must not be resized, restarted, or repurposed for this portfolio.

Design consistency, security, accessibility, and SEO are requirements of every milestone. Step 6 finishes cross-site verification; it is not the first time those concerns are implemented.

## Development guidance and dependencies

Fifteen development skills were researched and installed across these planning sessions, with Anatomy already available separately. See [the skill inventory](development-skills.md) for sources, pinned revisions, installation records, and coverage. They cover art direction, writing/content strategy, design engineering, design systems, Flask, Jinja, testing, SEO, accessibility, performance, GSAP, and secure implementation. They guide development; they do not run inside the website or add production server load. The five new creative/content skills become available next turn. [Creative-skills research](creative-skills-research.md) records the popular alternatives and the reasoning behind the selection.

Use official documentation for SQLAlchemy/Alembic/SQLite, image processing, and Oracle operations rather than adding a loosely maintained skill for every dependency. Existing browser tools handle interactive QA. A dedicated extra skill is justified when it adds a useful workflow, not simply because a topic has a name.

| Development layer | Recommended approach | Selection gate |
| --- | --- | --- |
| Backend/templates | Flask + Jinja, SQLAlchemy + Alembic; server-rendered public pages | Pin maintained compatible releases when implementation begins; clean setup and migration tests |
| Owner forms/session | Flask-compatible login, CSRF/forms, secure password hashing, and login rate limits | Verify maintenance and security defaults; minimal extensions; no unnecessary cross-origin API |
| Visual editor | Compare a vanilla-compatible structured block editor such as Editor.js with a small tailored block interface | Prototype headings, links, image/gallery blocks, keyboard editing, paste sanitization, schema versioning, public-template preview, and license/maintenance before choosing |
| Media | Pillow-based decoding/validation and bounded variant generation, with format support verified on the target VM | Large/invalid/rotated uploads, decompression limits, crop accuracy, recovery, and peak RAM/CPU measured |
| Public presentation | Existing Tailwind/esbuild and vanilla JS; CSS transitions plus selective GSAP | Shared tokens and macros; no new frontend application framework; minimize public payload |
| Verification | pytest/Flask client for backend flows; existing Node checks; browser interactions and targeted accessibility/performance tools | Test observable behavior and failure recovery; no meaningless coverage target or snapshot-only confidence |
| Production | Gunicorn + Nginx + systemd, TLS, consistent SQLite backups, off-VM media backups | Staging acceptance, verified free allocation, measured memory usage, and clean restore |

Python packages, editor packages, and QA tools are selected and pinned during the relevant implementation milestone. This planning change installs development guidance only. The initial editor recommendation is structured blocks with constrained layouts, not a full custom word processor; make the final package choice after the prototype.

## Verification and owner demonstrations

- **Design:** token schema/alias checks, repeated-value checks, component state review, and cross-page one-file change demonstrations.
- **Data/publishing:** add/edit/duplicate/archive/restore; isolated draft versus published revisions; stale-tab conflicts; order/featured independence; repeatable import; restart persistence.
- **Media/editor:** invalid and oversized files, safe markup/links, placement-specific crops, keyboard ordering, failed processing/saving, long content, and media deletion protections.
- **Public HTML/SEO:** every preserved route, response status, canonical and head metadata, structured data, sitemap, pagination, redirects, and exclusion of private content. Pagination pages with distinct content receive appropriate individual canonical URLs rather than all pointing to page one.
- **Privacy/security:** unauthenticated access denied to owner functions and draft media; CSRF/session/rate-limit behavior; preview responses private/no-store; secrets and inquiry text absent from public output/logs.
- **Performance/accessibility:** compare representative home/listing/project/article/Tool pages under consistent mobile test conditions; record response time, bytes, layout shift, and interaction behavior. Field Core Web Vitals remain separate from lab scores. Exercise keyboard/focus/zoom/reduced-motion/no-script fallbacks.
- **Operations:** failed notification retains inquiry; failed migration stops release; database/media survive redeployment; restore backups onto a clean environment before cutover.

Suggested initial public-page targets are LCP at or below 2.5 seconds, INP at or below 200 ms, and CLS at or below 0.1 at the 75th percentile where field data exists. Calibrate practical asset and response-time budgets from the current site and target Oracle VM. Do not claim a field pass without sufficient measurements or promise search rankings.

## Oracle constraints to verify before provisioning

### Existing deployment evidence

At the owner's request, the local Kamaldeep Enterprise deployment guide was inspected read-only. Its recorded setup is dated 24 October 2026 and identifies:

| Item | Recorded existing VM configuration |
| --- | --- |
| Region | India West (Mumbai), `ap-mumbai-1` |
| Shape | `VM.Standard.E2.1.Micro`, AMD/x86 |
| Memory | 1 GB |
| Operating system | Canonical Ubuntu 24.04 |
| Boot volume | Default shown as approximately 46.6 GB |
| Additional attached block volumes | None recorded |

These are documentation findings, not a live account inventory. No SSH session was opened and no files or resources in the other project were changed. The guide does not establish the tenancy's remaining free allowance or whether other instances/unattached volumes exist.

### Portfolio VM candidates

Prefer a separate Always Free-eligible A1 instance with **1 OCPU and 2 GB RAM**, if the account has allowance and regional capacity. This gives more headroom for bounded image processing than a micro instance. A separate `VM.Standard.E2.1.Micro` with 1 GB RAM is a fallback consistent with the other project's setup; image dimensions, upload sizes, processing concurrency, and worker count must then be conservatively limited. Use the default approximately 50 GB boot volume if it fits the verified free storage allowance. These are proposed configurations, not provisioned or guaranteed-free resources.

The owner's Oracle account already hosts another project. Check **remaining tenancy-wide** Always Free CPU, RAM, boot/block storage, backup, and object-storage allowances before choosing a separate VM. A new project does not create a new free allowance. Confirm home-region eligibility and shape availability in the actual account. If the remaining allowance cannot support a separate VM, return to the owner with alternatives rather than creating a billable resource or changing the other project's allocation.

Oracle documents possible capacity shortages and reclamation of idle Always Free instances. Plan reliable backups and recovery; do not simulate activity to evade resource policies. “Always Free” is a resource offer with conditions, not a guarantee of uninterrupted hosting.

## Open decisions for the next discussion

1. Confirm remaining Oracle VM quota and regional capacity; SQLite is decided, but the separate portfolio VM shape still needs account-level verification.
2. Use draft-preview-publish for global content as recommended. Decide whether scheduled publishing belongs in the first usable release or a later milestone; immediate manual publication is the initial recommendation.
3. Choose the owner login/recovery and second-factor setup, notification email provider, and backup destination after confirming the available accounts. Recommended baseline: strong password, authenticator second factor, and offline recovery codes.
4. Confirm any editorial blocks beyond the proposed set, including tables, downloadable files, video, and embeds. Those need explicit validation and rendering behavior rather than arbitrary pasted code. Start with the listed text/image/gallery/code blocks and add richer media deliberately.

## Primary references

- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) and [Tailwind v3 theme configuration](https://v3.tailwindcss.com/docs/theme): shared browser values and the existing styling adapter.
- [Design Tokens Format Module](https://www.designtokens.org/tr/2025.10/format/): typed tokens and aliases. Use its principles; do not claim full format conformance without validating it.
- [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): responsive setup, reduced motion, and cleanup.
- [Editor.js](https://editorjs.io/): structured JSON-output editor candidate; evaluate the prototype before adopting it.
- [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [Core Web Vitals](https://web.dev/articles/vitals): crawl/index consistency and performance measurement.
- [Flask production deployment](https://flask.palletsprojects.com/en/stable/deploying/): use a production server rather than the development server.
- [Flask security considerations](https://flask.palletsprojects.com/en/stable/web-security/): upload/resource limits, safe rendering, and application security responsibilities.
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/en/stable/) and [Alembic](https://alembic.sqlalchemy.org/en/latest/): data access and explicit schema migrations.
- [Appropriate uses for SQLite](https://www.sqlite.org/whentouse.html): small websites, concurrency limits, and when a client/server database is preferable.
- [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm): shared resource allowances, capacity, storage, and idle-instance policy. Check the actual tenancy before allocating resources.
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [image SEO](https://developers.google.com/search/docs/appearance/google-images), and [URL migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes): rendering, image discoverability, and redirect planning.
