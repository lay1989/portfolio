# Lay Shah Portfolio

A static portfolio for an independent web developer: business websites, web applications, and internal tools. Includes ten project case studies and six articles, generated into 21 pages.

## Develop

Use Node.js 22 or newer (`.nvmrc` selects 22).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The development server builds the site, watches authoring files, and rebuilds when they change. Refresh the browser to see updates. It serves only the deployment output; local preview does not accept contact form submissions.

## Edit the source

- `content/`: homepage, blog index, work index, and error-page bodies.
- `templates/`: shared document shell and project case-study layout.
- `components/header.html`: shared navigation.
- `data/projects.json`: project descriptions, scope, screenshots, and case studies.
- `data/posts.json`: article content and metadata used by both listings and articles. The older `content/blog-*.html` fragments are retained historical sources; active article pages use the JSON records.
- `data/site.json`: the canonical email address, booking URL, call duration, and contact copy.
- `pages.json`: routes, search metadata, and structured data.
- `src/` and `script.js`: browser behavior, bundled with esbuild.
- `style.css` and `tailwind.config.js`: styles and theme tokens. Each semantic color has RGB channels so opacity utilities work in both themes.

Root HTML files, `projects/*.html`, `bundle.js`, and `tailwind.css` are generated. Edit their sources and rebuild.

## Verify and build

```sh
npm test
npm run build
```

The build prepares image metadata and the social preview card, generates HTML and the sitemap, compiles styles and scripts, validates the generated pages, and copies an explicit set of public files into `dist/`. Dependencies, source data, reports, and Git metadata are excluded from that output. `npm run check` reruns output validation.

GitHub Actions runs the contact-flow tests and the complete build on pushes and pull requests. Dependencies stay out of version control; `package-lock.json` pins the installation.

## Deploy and verify contact delivery

Publish **`dist/`**, using `npm run build` as the build command. Existing root-level generated files remain available for compatibility, but the explicit deployment folder is preferred.

The contact form uses Netlify Forms (`data-netlify="true"`, `form-name=contact`, and a honeypot). On Netlify, enable form detection, deploy the generated HTML, configure submission notifications, and verify that a real test submission appears in the dashboard and reaches the intended mailbox. Other hosts need a form-processing endpoint before this form can deliver inquiries; update `src/api.js` for that integration.

Successful HTTP responses trigger the success message and the `generate_lead` analytics event. Failure or timeout retains the visitor's details and offers the visible email fallback. Booking and email clicks are tracked separately; form contents are never included in those events. Configure those events as conversions in the existing analytics account if desired.

The local checks verify request behavior and error recovery, not delivery by an external provider. Nothing is deployed by the build scripts.

## Architecture

Plain HTML, Tailwind CSS v3, and modular vanilla JavaScript, with Node.js for static generation. Pages remain readable without animation scripts; reduced-motion preferences disable scripted motion and CSS animation. Lucide is served from the pinned local dependency, and shared GSAP dependencies load once per page.

The planned Flask migration is documented in [dynamic website plan v2](docs/dynamic-website-plan-v2.md), including one shared design source, reusable components, the owner dashboard, media editing, SEO, and staged migration. [Development skills](docs/development-skills.md) records the researched guidance installed for that work. These are planning documents; the current application remains static.

## License

All rights reserved. © 2026 Lay Shah.

## Dependency maintenance

Compatible audit fixes and the patched image processor are included. Four moderate development-only advisories remain in the Tailwind v3 selector-parser dependency tree. Review a supported dependency update separately; the build does not use a forced Tailwind major-version migration.
