# Plan — Milestone 1 Verification

This plan outlines the verification strategy to ensure Milestone 1 changes are correct.

## Steps

1. **Verify index.html Canonical and OG:URL Meta Tags**
   - Read `index.html`.
   - Parse or scan for `<link rel="canonical" href="https://layshahdev.com">` and `<meta property="og:url" content="https://layshahdev.com" />`.
   - Assert they are exactly `https://layshahdev.com` without trailing slashes.

2. **Verify Blog Pages JSON-LD Schemas**
   - For each of the 6 blog files (`blog-custom-websites.html`, `blog-freelance-developer.html`, `blog-javascript-frameworks.html`, `blog-performance-optimization.html`, `blog-responsive-design.html`, `blog-seo-developers.html`):
     - Read the file content.
     - Extract the JSON-LD `<script type="application/ld+json">...</script>` block.
     - Parse it as a JSON object.
     - Assert it has the correct properties:
       - `@type` = "BlogPosting"
       - `author` = can be object or string, check name/value is "Lay Shah"
       - `publisher` = object with name "Lay Shah Web Development" and a valid logo object
       - `headline` = non-empty string
       - `description` = non-empty string
       - `datePublished` = non-empty string (valid date format)
       - `dateModified` = non-empty string (valid date format)
       - `mainEntityOfPage` = non-empty object (e.g., `@type` WebPage and `@id` pointing to the page URL)

3. **Verify sitemap.xml**
   - Read `sitemap.xml`.
   - Validate XML structure (properly balanced tags).
   - Extract all URL `<loc>` values.
   - Assert there are exactly 9 canonical pages and they do not have trailing slashes.

4. **Run Verification Script**
   - Write script `scripts/verify-m1.js`.
   - Run the script and capture the output.
   - If any checks fail, report the failures. Do NOT modify the source files (per review-only constraint).

5. **Document Handoff**
   - Create `handoff.md` with:
     - Observations
     - Logic Chain
     - Caveats
     - Conclusion (PASS/FAIL)
     - Verification Method
