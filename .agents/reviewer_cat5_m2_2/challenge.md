## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Medium] Challenge 1: Cumulative Layout Shift (CLS) from Dynamic Component Injection

- **Assumption challenged**: Fetching components dynamically is safe and has no impact on layout stability.
- **Attack scenario**: On slower mobile connections, the fetch for `components/header.html` and `components/footer.html` takes several seconds. During this time, the user sees a page with no header/footer. When they load, the page content suddenly shifts down, causing a poor user experience and a poor Cumulative Layout Shift (CLS) score for SEO.
- **Blast radius**: Medium. Affects visual stability and page rendering experience on slow networks.
- **Mitigation**: Pre-populate fallback headers/footers with skeleton shells or utilize static page generation/SSG to inject header/footer during build time rather than runtime.

### [Low] Challenge 2: Nested Subpage Asset Resolution

- **Assumption challenged**: All pages are located in the root directory, allowing simple relative paths like `./components/header.html` and `./script.js` to work.
- **Attack scenario**: If a new subpage is added in a nested folder (e.g., `blog/2026/my-post.html`), relative paths will resolve to `blog/2026/components/header.html` and fail with 404 errors.
- **Blast radius**: High if new nested folders are introduced in the future.
- **Mitigation**: Currently, all `blog-*.html` pages are placed at the root level, which prevents this failure. For future scalability, absolute paths (e.g. `/components/header.html` with appropriate base URLs) should be considered.

## Stress Test Results

- **Duplicate navigation init call** → The module checks for existing `throttledScrollHandler` and removes the old listener before attaching the new one → Handled gracefully, no duplicated scroll triggers → **PASS**
- **CORS block on local filesystem execution (`file://`)** → The fetch utility detects the `file:` protocol and falls back gracefully to hardcoded header/footer content → Handled gracefully with console warnings → **PASS**

## Unchallenged Areas

- **Backend Netlify form validation / spambot detection** — reason not challenged: requires deploy-stage Netlify server integration to verify live honeypot filtering behavior.
