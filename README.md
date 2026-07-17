# Lay Shah - Freelance Web Developer Portfolio

A high-performance, statically generated portfolio website for a freelance full-stack web developer and designer. The site is optimized for speed, SEO, and user experience, featuring case studies, a blog, and dynamic project rendering.

## Architecture & Tech Stack
- **HTML/CSS/JS**: Pure Vanilla frontend for maximum performance and minimum overhead.
- **Tailwind CSS**: Used for all styling, rapid UI development, and responsive design.
- **Custom Static Site Generator (SSG)**: A custom Node.js script (`scripts/build-html.js`) that compiles templates, components, JSON data, and content fragments into static HTML files.
- **Lucide Icons**: Clean, consistent iconography used throughout the site.
- **GSAP & Lenis**: Smooth scrolling and reveal animations for a premium feel.
- **Theme System**: Full Light/Dark mode support toggled via CSS variables.

## Project Structure
- `content/`: Source HTML fragments for core pages (e.g., Home, Blog, 404).
- `templates/`: Base layouts (e.g., `base.html`, `project-case-study.html`).
- `data/`: JSON databases (e.g., `projects.json`, `posts.json`) storing content metadata.
- `components/`: Reusable HTML blocks (Header, Footer).
- `scripts/`: Build scripts (SSG, sitemap generator, etc.).
- `style.css` & `tailwind.config.js`: Tailwind and custom CSS configurations.

## Development

### Prerequisites
- Node.js (v18+)
- npm

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Build Commands
Compile CSS, bundle JavaScript, generate HTML pages, and generate sitemap:
```bash
npm run build
```

The compiled static files are output directly to the root directory, ready to be deployed to GitHub Pages, Vercel, Netlify, or any static hosting provider.

## License
All rights reserved. (c) 2026 Lay Shah
