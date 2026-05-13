# Lay Shah — Freelance Web Developer Portfolio

> Live site: **[layshahdev.com](https://layshahdev.com)**  
> Contact: [layshah1989@gmail.com](mailto:layshah1989@gmail.com) · [GitHub](https://github.com/lay1989)

A high-performance, fully responsive personal portfolio and blog site for **Lay Shah** — a full-stack developer and freelance web designer. Built as a pure-static multi-page site (no build step, no bundler, no Node.js runtime), it ships with dark-mode support, scroll-reveal animations, a case-study system for client projects, and a technical blog.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Local Development](#local-development)
- [Deployment (Netlify)](#deployment-netlify)
- [SEO & Metadata](#seo--metadata)
- [Design System](#design-system)
- [Known Issues & Observations](#known-issues--observations)
- [License](#license)

---

## Overview

The portfolio is a **static HTML/CSS/JS** website — there is no build pipeline or server-side rendering required. All pages share the same `style.css` and `script.js`. Tailwind CSS is loaded directly from the CDN and configured inline with custom CSS variables that bridge the Tailwind utility classes to the design system's theme tokens.

The `src/` directory contains a **parallel React/TypeScript scaffold** (Vite + Wouter + TanStack Query + shadcn/ui) that was scaffolded but is not wired up to any deployment. It is effectively unused at the moment.

---

## Project Structure

```
portfolio/
├── index.html                        # Main single-page portfolio (landing page)
├── project-details.html              # Dynamic case-study page (driven by JS data object)
├── blog.html                         # Blog listing page
├── blog-responsive-design.html       # Blog post
├── blog-custom-websites.html         # Blog post
├── blog-freelance-developer.html     # Blog post
├── blog-seo-developers.html          # Blog post
├── blog-javascript-frameworks.html   # Blog post
├── blog-performance-optimization.html# Blog post
├── style.css                         # Shared custom CSS + design tokens
├── script.js                         # Shared JavaScript (theme, nav, scroll, forms)
├── tailwind.css                      # Pre-built Tailwind CSS bundle (unused in prod*)
├── robots.txt                        # SEO crawler directives
├── sitemap.xml                       # XML sitemap for search engines
│
├── public/
│   └── images/                       # Project screenshots and assets
│       ├── Aroma Cafe.webp / 2.png
│       ├── Ghermar & Sons.webp / 2.png
│       ├── SwiftBuild.webp / 2.JPG
│       ├── Stark EV.webp / 2.png
│       ├── KAMALDEEP ENTERPRISE *.png
│       ├── saas_dashboard_minimal_interface.png
│       ├── minimalist_dark_mode_website_mockup.png
│       ├── modern_e-commerce_interface_mockup.png
│       └── dark_abstract_noise_texture_for_website_background.png
│
└── src/                              # Unused React/TS scaffold (Vite + shadcn/ui)
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── pages/
    │   ├── Home.tsx
    │   └── not-found.tsx
    ├── components/
    │   ├── layout/Navbar.tsx
    │   ├── sections/
    │   │   ├── Hero.tsx
    │   │   ├── About.tsx
    │   │   ├── Services.tsx
    │   │   ├── Projects.tsx
    │   │   └── Contact.tsx
    │   └── ui/                       # 55+ shadcn/ui components
    ├── hooks/
    │   ├── use-mobile.tsx
    │   └── use-toast.ts
    └── lib/
        ├── queryClient.ts
        └── utils.ts
```

> \* `tailwind.css` is a pre-downloaded Tailwind bundle. It is **not** linked in any HTML page — all pages use the Tailwind CDN script instead.

---

## Pages

| File | URL | Description |
|---|---|---|
| `index.html` | `/` | Full portfolio: Hero, About, Services (9), Process, Projects (6+1 hidden), Reviews (4), FAQ (7), Contact |
| `project-details.html` | `/project-details.html?id=<1-6>` | Dynamic case-study page; project data is embedded as a JS object with 6 active + 1 inactive entry |
| `blog.html` | `/blog.html` | Blog listing — 6 article cards |
| `blog-responsive-design.html` | `/blog-responsive-design.html` | Article: Responsive Web Design |
| `blog-custom-websites.html` | `/blog-custom-websites.html` | Article: Building Custom Websites |
| `blog-freelance-developer.html` | `/blog-freelance-developer.html` | Article: Why Choose a Freelance Developer |
| `blog-seo-developers.html` | `/blog-seo-developers.html` | Article: SEO for Developers |
| `blog-javascript-frameworks.html` | `/blog-javascript-frameworks.html` | Article: Modern JS Frameworks |
| `blog-performance-optimization.html`| `/blog-performance-optimization.html` | Article: Web Performance Optimization |

---

## Tech Stack

### Static Site (active)

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic) |
| Styling | Vanilla CSS (design tokens) + Tailwind CSS v3 (CDN) |
| Scripting | Vanilla JavaScript (ES6+) |
| Icons | [Lucide](https://lucide.dev/) (unpkg CDN) |
| Fonts | Inter + Space Grotesk (Google Fonts) |
| Form handling | Netlify Forms (native `data-netlify` attributes) |
| Deployment | Netlify |

### React Scaffold (unused / in-progress)

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Routing | Wouter |
| Data fetching | TanStack Query (React Query) |
| UI components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS |
| Utilities | clsx, class-variance-authority |

---

## Features

- **Dark / Light Mode** — persisted in `localStorage`; respects system preference on first visit. Toggle is present in both desktop navbar and mobile nav.
- **Responsive Navigation** — sticky navbar with backdrop blur on scroll, hamburger menu for mobile with animated open/close.
- **Scroll-Reveal Animations** — `IntersectionObserver`-based `.reveal` class fades sections up on enter.
- **Hero Fade-Up** — CSS `@keyframes fadeUp` with cubic-bezier easing on page load.
- **Hover Effects** — `.hover-lift` utility applies translateY + box-shadow on cards.
- **Load More Projects** — first 3 projects visible; "Load More" button reveals up to 6 (project 7 is commented out).
- **Dynamic Case Studies** — `project-details.html` reads `?id=` query param and renders full project detail (overview, challenge, solution, process timeline, tech stack, key features, metrics, testimonial, lessons learned) from an embedded JS data object.
- **Contact Form** — Netlify Forms integration with honeypot spam protection. Currently calls `fetch('/')` on submit and shows a basic `alert()` — replace with a proper success UI.
- **Blog** — 6 standalone HTML articles with consistent nav/footer.
- **SEO** — `<meta>` tags, Open Graph, Twitter Cards, `robots.txt`, `sitemap.xml`, Schema.org JSON-LD (`ProfessionalService` on homepage, `Article` on project details).
- **Custom Scrollbar** — styled with `--muted-foreground` / `--accent` colors.

---

## Local Development

No build step required for the static site. Simply serve the files with any static server.

### Option 1 — VS Code Live Server

Install the **Live Server** extension and click **"Go Live"** from the status bar.

### Option 2 — Python

```bash
cd portfolio
python -m http.server 8080
# → http://localhost:8080
```

### Option 3 — Node.js (npx)

```bash
cd portfolio
npx serve .
# → http://localhost:3000
```

> **Important:** The site uses root-relative paths (`/index.html`, `/blog.html`) in some pages and relative paths (`./index.html`) in others. Serve from the project root to avoid broken links.

---

## Deployment (Netlify)

The site is configured for **Netlify** deployment:

1. Connect the GitHub repository to Netlify.
2. Set **Publish directory** to `.` (repository root) — no build command needed.
3. Netlify Forms will automatically detect the `data-netlify="true"` attribute on the contact form.

The contact form `fetch('/')` in `script.js` is the standard Netlify Forms AJAX pattern — it works correctly when deployed on Netlify, but does nothing on localhost.

---

## SEO & Metadata

| Asset | Location | Notes |
|---|---|---|
| `robots.txt` | `/robots.txt` | Allows all crawlers; references sitemap |
| `sitemap.xml` | `/sitemap.xml` | 6 URLs listed; lastmod is `2025-02-07` — **update when content changes** |
| JSON-LD | `index.html` `<head>` | `ProfessionalService` schema |
| JSON-LD | `project-details.html` `<head>` | `Article` schema |
| OG image | All pages | References `https://layshahdev.com/og-image.jpg` — **this file is not in the repo, must be added** |
| Favicon | All pages | References `/favicon.ico`, `/apple-touch-icon.png`, etc. — **these files are not in the repo, must be added** |

---

## Design System

All color values are defined as CSS custom properties in `style.css` and mapped into Tailwind via the inline `tailwind.config` block present in every HTML file's `<head>`.

### Color Tokens

| Token | Light Mode | Dark Mode |
|---|---|---|
| `--background` | `#ffffff` | `#080808` |
| `--foreground` | `#080808` | `#f2f2f2` |
| `--card` | `#f5f5f5` | `#121212` |
| `--primary` | `#080808` | `#ffffff` |
| `--secondary` | `#f0f0f0` | `#1f1f1f` |
| `--muted-foreground` | `#666666` | `#999999` |
| `--accent` | `#FF6B35` | `#FF6B35` |
| `--border` | `#e5e5e5` | `#262626` |

### Typography

| Role | Family | Weights |
|---|---|---|
| Body | Inter | 300, 400, 500, 600 |
| Display / Headings | Space Grotesk | 300, 400, 500, 600, 700 |

### Animation Utilities (in `style.css`)

| Class | Effect |
|---|---|
| `.animate-fade-up` | One-shot fade + translateY on load |
| `.reveal` | Scroll-triggered fade + translateY (via JS IntersectionObserver) |
| `.hover-lift` | translateY(-5px) + box-shadow on hover |
| `.service-card` | Border accent + translateY on hover |
| `.delay-100/200/300` | Staggered transition delays |

---

## Known Issues & Observations

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | **High** | OG image (`/og-image.jpg`) and favicon files are referenced but not present in the repository. | All pages `<head>` |
| 2 | **High** | Contact form success handling uses `alert("Success!")` — poor UX; should be replaced with an inline success message. | `script.js` L104 |
| 3 | **Medium** | `tailwind.config` is duplicated verbatim in the `<head>` of every HTML file (7 copies). Extract to a shared JS file to simplify maintenance. | `index.html`, `blog.html`, `project-details.html`, all blog posts |
| 4 | **Medium** | Navbar HTML is also duplicated across all pages. Consider a Web Component or server-side include strategy if pages grow. | All pages |
| 5 | **Medium** | Project 7 ("TaskFlow Pro") has full data in `project-details.html` but is commented out in `index.html` — either remove the data or display the project. | `index.html` L612–628, `project-details.html` L645 |
| 6 | **Medium** | `sitemap.xml` `<lastmod>` dates are all `2025-02-07` and are stale — update on each content change. | `sitemap.xml` |
| 7 | **Low** | The `src/` React scaffold has no `package.json` in the repository root, no `vite.config`, and no deployment configuration. It is incomplete and cannot be built or run. | `src/` |
| 8 | **Low** | `tailwind.css` (407 KB pre-built bundle) is in the repo but not linked anywhere — safe to delete or gitignore. | `tailwind.css` |
| 9 | **Low** | Navbar scroll logic in `script.js` sets background color via inline `style`, which overrides Tailwind and can conflict with theme toggling. Consider a CSS-class-only approach. | `script.js` L56–70 |
| 10 | **Low** | The mobile theme toggle in `blog.html` is missing the dual sun/moon icon wrapper used in other pages — only the moon icon shows. | `blog.html` L108–112 |
| 11 | **Info** | The `delay-400` class is used in `index.html` but not defined in `style.css` (only `delay-100/200/300` exist). | `index.html` L721, `style.css` |

---

## Portfolio Projects

| # | Project | Category | Year | Live URL |
|---|---|---|---|---|
| 1 | Ghermar & Sons | Web Design & Development | 2025 | [ghermar.com](https://www.ghermar.com/) |
| 2 | SwiftBuild Infratech | Web Design, Development & SEO | 2025 | [swiftbuild-infratech.netlify.app](https://swiftbuild-infratech.netlify.app/) |
| 3 | Crypto Trading Analytics | Personal Project (Python/Flask/D3.js) | 2024 | Private |
| 4 | Kamaldeep Enterprise CMS | Content Management System | 2025 | [kamaldeep-enterprise.onrender.com](https://kamaldeep-enterprise.onrender.com/) |
| 5 | Aroma Cafe | Web Design & API Integration | 2024 | [aroma-cafe-coffee.netlify.app](https://aroma-cafe-coffee.netlify.app/) |
| 6 | Stark EV | UI/UX & Frontend (Personal) | 2025 | [lay1989.github.io/StarkEV](https://lay1989.github.io/StarkEV/) |

---

## License

© 2025 Lay Shah. All rights reserved. This codebase is the personal portfolio of Lay Shah and is not licensed for redistribution.
