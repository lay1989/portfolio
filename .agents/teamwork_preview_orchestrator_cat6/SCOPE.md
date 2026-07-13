# Scope: Web Design Guidelines (Category 6) Implementation

## Architecture
- **Layout & CSS**: Applying `overflow-x-hidden` on `<body>` in all HTML files. Ensuring border-radius properties (`rounded-lg`, `rounded-full`, `rounded-2xl`, etc.) are mathematically consistent.
- **Navbar Glassmorphism**: Replacing `data-[scrolled=true]:backdrop-blur-md` with `data-[scrolled=true]:backdrop-blur-sm` (or equivalent class) to apply a subtle backdrop blur on scroll across all HTML files.
- **Service Cards Contrast**: Improving icon contrast in the "What I Can Do For You" section.
- **Typography & Readability**: Increasing the line-height of long-form articles (`leading-relaxed` or `leading-loose`) on blog post pages.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | R1: Layout & Styling Consistency | Enforce `overflow-x-hidden` on body, standardize border-radius, add `backdrop-blur-sm` on scrolled navbar. | None | PLANNED |
| 2 | R2: Typography & Visual Hierarchy | Improve contrast for service icons, increase line-height (`leading-relaxed`) in blog articles. | M1 | PLANNED |
| 3 | Verification & Auditing | Run Tailwind compiler, check visual rendering, pass Forensic Audit. | M2 | PLANNED |

## Interface Contracts
### Navbar Scroll Styling
- Elements: `<nav id="navbar">`
- Class changes:
  - Target: `data-[scrolled=true]:backdrop-blur-sm` instead of `data-[scrolled=true]:backdrop-blur-md` (subtle glassmorphism)
