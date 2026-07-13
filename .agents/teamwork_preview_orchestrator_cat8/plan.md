# Plan: Category 8 ("SEO Fundamentals") Execution

We will execute Category 8 requirements using three sequential milestones:

## Milestone 1: Meta Tags & Structured Data (R1)
- Verify/Update titles and descriptions for all 6 blog pages:
  - `blog-custom-websites.html`
  - `blog-freelance-developer.html`
  - `blog-javascript-frameworks.html`
  - `blog-performance-optimization.html`
  - `blog-responsive-design.html`
  - `blog-seo-developers.html`
- Inject `BlogPosting` JSON-LD schema into each of the 6 blog pages. The schema should include:
  - headline
  - description
  - author (Person: Lay Shah)
  - publisher (Organization: Lay Shah Web Development)
  - datePublished (extracted or estimated)
  - dateModified (extracted or estimated)
  - mainEntityOfPage (canonical URL)
- Verify and standardize canonical URLs on all 6 blog pages, `blog.html`, `index.html`, and `project-details.html`, making sure they point to the production domain (`https://layshahdev.com`) without trailing slash discrepancies.

## Milestone 2: Semantics & Accessibility (R2)
- Optimize the primary `<h1>` tag in the hero section of `index.html` to include strong target keywords: "Freelance Web Developer & Web Designer" or similar.
- Audit all image (`<img>`) tags across all HTML pages (`index.html`, `blog.html`, `project-details.html`, and `blog-*.html` pages). Ensure each has a descriptive `alt` attribute. If an `alt` attribute is missing or empty (and not purely decorative), inject descriptive text.

## Milestone 3: Verification & Compliance
- Build and verify Tailwind CSS compilation to confirm no syntax or build issues were introduced.
- Run the Forensic Auditor (`teamwork_preview_auditor`) to verify integrity of code changes and ensure no cheating/hardcoding of test results.
- Perform semantic HTML checks (using appropriate validators or subagent reviews).

## Process and Subagent Strategy
We will execute the Explorer -> Worker -> Reviewer -> Challenger loop for each milestone.
- **Explorer**: Analyzes requirements and details, reads code files, drafts changes.
- **Worker**: Applies changes, runs tests, documents edits.
- **Reviewer**: Performs correctness and code quality reviews.
- **Challenger**: Runs verification scripts, performs sanity checks.
- **Forensic Auditor**: Performs final integrity checks.
