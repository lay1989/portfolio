# Scope: Web Design Guidelines (Category 5)

## Architecture
- **CSS Typography and Scale**: Adjust `h1`, `h2`, `h3` dynamic scaling in `style.css` base layer or `tailwind.config.js` to ensure responsiveness across mobile and desktop.
- **Transitions and Micro-animations**: Premium ease curves and timings in Tailwind config and custom styles. Smooth hover effects (e.g. card lifts, accent scales).
- **Contact Form (HTML5 Validation & Accessibility)**: Form element in `index.html` updated with accessible labels (`<label for="...">`), `aria-` descriptors, field validations, and proper name mappings for submission.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Analysis & Strategy | Research existing typography, transitions, animations, and the contact form across the workspace | None | DONE |
| 2 | Typography & Micro-animations | Refactor headings sizing and update transitions/easing curves for standard premium UI feel | M1 | DONE |
| 3 | Form Validation & Accessibility | Add standard accessibility elements and proper HTML5 native validations to the contact form | M2 | DONE |
| 4 | Integration & Audit Verification | Run CLI builds, start local server, manually verify and pass Forensic Auditor check | M3 | DONE |

## Interface Contracts
### HTML Forms ↔ script.js/components.js
- Form ID: `contact-form`
- Form fields require: unique `id` values, matching `name` attributes, and `aria-describedby` or similar screen-reader helper attributes.
- Native validation should block form submission event before JS AJAX fetches.
