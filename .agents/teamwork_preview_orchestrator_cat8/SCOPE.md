# Scope: Category 8 ("SEO Fundamentals")

## Architecture
- **HTML Pages**: Standard HTML files (`index.html`, `blog.html`, `project-details.html`, and `blog-*.html` pages).
- **Structured Data**: JSON-LD scripts of type `ProfessionalService` on `index.html`, `Article` on `project-details.html`, and we need to add `BlogPosting` on each individual blog page.
- **Canonical URLs**: `<link rel="canonical" href="https://layshahdev.com/[page]">` (or similar) ensuring consistency.
- **Semantics**: `<h1>` headings should contain target keywords, and `<img>` tags should have descriptive alt text.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Meta Tags & Structured Data | Add BlogPosting schema, ensure unique titles/descriptions, verify canonical URLs | None | DONE |
| 2 | Semantics & Accessibility | Optimize index.html h1 header, audit and add alt text to images | M1 | DONE |
| 3 | Verification & Compliance | Run build scripts and execute Forensic Auditor integrity verification | M2 | IN_PROGRESS |

## Interface Contracts
- Production domain: `https://layshahdev.com`
- JSON-LD `@type`: `BlogPosting` for blog pages
- Target keyword in index.html h1: "Freelance Web Developer"
