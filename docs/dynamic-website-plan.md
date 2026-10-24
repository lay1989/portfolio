# Dynamic portfolio: implementation plan

Status: planning draft, not an implementation instruction or a deployment approval.
Updated: 2026-10-24.

## Decisions already made

- Preserve the existing visual identity, Tailwind styling, and vanilla browser JavaScript.
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
| 0. Confirm the baseline and choices | Push the verified current site; agree content model, URLs, editor scope, and Oracle resource budget | GitHub commit verified remotely; outstanding choices recorded |
| 1. Flask foundation | App structure, Jinja shell, settings, database/migrations, owner login, asset pipeline, and repeatable local setup | App starts from a clean checkout; protected routes and migrations tested; existing public appearance retained |
| 2. Import and public rendering | Import all 10 projects, 6 posts, media, metadata, and global content into the new data model | Route/content/metadata parity checked; importer is repeatable without duplicates; no edits to published data through fixtures |
| 3. Media and first complete editing flow | Media library, positioning controls, visual blocks, project drafts/previews/publishing/order, and revisions | Owner can add and publish a complete project with uploaded images; data survives restart; invalid uploads and failed saves recover cleanly |
| 4. Complete the CMS | Blog management, Tools catalog, homepage/global editors, independent featuring, and inquiry handling | Owner completes normal tasks without code; draft changes stay private; all collection orders persist |
| 5. SEO, performance, and recovery | Metadata defaults/overrides, structured data, redirects, sitemap, caching, scheduled publishing, backups, and restore rehearsal | Automated functional/SEO checks pass; no private content leaks; cached pages refresh on edits; restore is demonstrated |
| 6. Oracle staging and migration | Separate eligible VM, production services, TLS, deployment procedure, email delivery, and final import | Verify unused free quota first; staging works without indexing; real inquiry delivery and data persistence tested; owner reviews the full site |
| 7. Cutover and verification | Final content freeze/import, domain switch, route checks, analytics checks, monitoring, and rollback window | Verify live pages, forms, media, redirects, and admin access; retain the known-good Netlify release until the migration is confirmed |

Each milestone should be a reviewable change. Plan and build locally before changing DNS or provisioning production resources. The existing other-project VM must not be resized, restarted, or repurposed for this portfolio.

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
2. Choose draft-preview-publish behavior for global settings, and decide whether scheduled publishing belongs in the first usable release or the following milestone.
3. Choose the owner login/recovery and second-factor setup, notification email provider, and backup destination after confirming the available accounts.
4. Confirm any editorial blocks beyond the proposed set, including tables, downloadable files, video, and embeds. Those need explicit validation and rendering behavior rather than arbitrary pasted code.

## Primary references

- [Flask production deployment](https://flask.palletsprojects.com/en/stable/deploying/): use a production server rather than the development server.
- [Flask security considerations](https://flask.palletsprojects.com/en/stable/web-security/): upload/resource limits, safe rendering, and application security responsibilities.
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/en/stable/) and [Alembic](https://alembic.sqlalchemy.org/en/latest/): data access and explicit schema migrations.
- [Appropriate uses for SQLite](https://www.sqlite.org/whentouse.html): small websites, concurrency limits, and when a client/server database is preferable.
- [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm): shared resource allowances, capacity, storage, and idle-instance policy. Check the actual tenancy before allocating resources.
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [image SEO](https://developers.google.com/search/docs/appearance/google-images), and [URL migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes): rendering, image discoverability, and redirect planning.
