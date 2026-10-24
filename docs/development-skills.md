# Development skills for the dynamic portfolio

Updated: 2026-10-24. All fifteen skills below were installed locally and verified against the pinned upstream `SKILL.md` files. The original ten are available now; the five creative/content additions become available next turn. Anatomy was already installed separately. This inventory accompanies [implementation plan v2](dynamic-website-plan-v2.md) and the [creative-skills research](creative-skills-research.md).

## Installed guidance

| Skill | Covers | Source |
| --- | --- | --- |
| `flask` | **Backend architecture.** App factory, Blueprints, configuration, extension initialization, Flask-client tests. | [microsoft/debugpy](https://github.com/microsoft/debugpy/blob/671f6c7d1b228b8001f659bf61e39b7668587302/.claude/skills/flask/SKILL.md) |
| `jinja2` | **Reusable templates.** Layout inheritance, macros/filters, safe escaping, presentation boundaries. | [microsoft/debugpy](https://github.com/microsoft/debugpy/blob/671f6c7d1b228b8001f659bf61e39b7668587302/.claude/skills/jinja2/SKILL.md) |
| `pytest` | **Python verification.** Isolated fixtures, parameterized tests, behavior and failure-path checks. | [microsoft/debugpy](https://github.com/microsoft/debugpy/blob/671f6c7d1b228b8001f659bf61e39b7668587302/.claude/skills/pytest/SKILL.md) |
| `seo` | **Search visibility.** Metadata, sitemap/canonical/redirect audits, structured data, crawlable HTML. | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/blob/afa8da942115f2961fdbfa80807ea0b232ff6c00/skills/seo/SKILL.md) |
| `accessibility` | **Usable public site and dashboard.** Keyboard/focus/forms, drag alternatives, semantic controls, reduced motion. | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/blob/afa8da942115f2961fdbfa80807ea0b232ff6c00/skills/accessibility/SKILL.md) |
| `performance` | **Measured optimization.** Images/fonts, resource budgets, traces, caching, field versus lab evidence. | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/blob/afa8da942115f2961fdbfa80807ea0b232ff6c00/skills/performance/SKILL.md) |
| `gsap-core` | **Shared animation behavior.** Tween defaults, easing, responsive setup, reduced motion, lifecycle cleanup. | [greensock/gsap-skills](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md) |
| `gsap-scrolltrigger` | **Scroll effects.** Trigger setup, layout refresh, batching, cleanup, controlled scroll behavior. | [greensock/gsap-skills](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md) |
| `design-system-patterns` | **One-source visual system.** Token hierarchy, themes, reusable variants/components, design documentation. | [wshobson/agents](https://github.com/wshobson/agents/blob/0874a27b17a22e2b7c2e2bcd725768e0803cad06/plugins/ui-design/skills/design-system-patterns/SKILL.md) |
| `security-best-practices` | **Secure owner CMS.** Flask and browser guidance for auth, CSRF, safe rendering, uploads, headers, and secrets. | [openai/skills](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices/SKILL.md) |
| `frontend-design` | **Art direction.** Subject-specific composition, typography, visual identity, restraint, and critique. | [anthropics/skills](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/SKILL.md) |
| `emil-design-eng` | **Design engineering.** Interaction feedback, motion purpose/timing, interruption, and component details. | [emilkowalski/skills](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/emil-design-eng/SKILL.md) |
| `copywriting` | **New copy.** Clear service/project/Tool descriptions, supported claims, and useful next steps. | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/blob/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/copywriting/SKILL.md) |
| `copy-editing` | **Existing copy.** Clarity, voice, evidence, specificity, and editing within the requested scope. | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/blob/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/copy-editing/SKILL.md) |
| `content-strategy` | **Editorial planning.** Audience questions, search intent, original material, and useful topic connections. | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/blob/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/content-strategy/SKILL.md) |

GSAP skills come from the library maintainer. Flask/Jinja/pytest guidance is hosted in Microsoft’s debugpy repository; it is not published by the Flask or pytest maintainers. The SEO/accessibility/performance collection is an independent project by Addy Osmani, not an official Google skills package. The design-system collection is community-maintained; security guidance comes from OpenAI’s curated skills repository.

The new art-direction skill is published by Anthropic; design-engineering guidance comes from Emil Kowalski; writing/strategy guidance comes from Corey Haines's collection. The latter two are author-led projects with public history. See the research for contribution evidence and project-specific tradeoffs. Their repository popularity does not establish industry-wide production use.

## Why this selection

The research included web searches for Flask, design-token/component systems, SEO, accessibility, animation, and testing skills; the OpenAI curated catalog; and direct inspection of the selected GitHub sources. We inspected the skill entry points and selected-directory file inventories before installation. The selected skills contain guidance, references, and in one case agent metadata; they do not bundle executable helper scripts. Installation used the built-in skill installer and pinned commit hashes, not a remote shell installer.

Existing browser interaction tools cover rendered-page QA. Official project documentation covers SQLAlchemy, Alembic, SQLite, Pillow, and Oracle; a separate skill for each package is unnecessary. No React/Vue/Next.js skills were installed because this site retains vanilla JavaScript and server-rendered templates. Overlapping all-in-one SEO/audit packages and extra CI-debugging skills were left out. Add more guidance only when a milestone exposes a specific gap.

## How to use them without importing conflicting assumptions

- The owner’s decisions and project scope take priority. Use Flask/Jinja/vanilla patterns even when a general design or performance skill shows a React example. Do not install every extension/plugin mentioned in an example.
- Apply only the skills relevant to the current milestone; do not load all fifteen for every small change.
- Verify claims against maintained primary documentation. Skill examples are suggestions, not specifications. For example, distinct pagination pages need appropriate canonical URLs; do not copy a blanket page-one canonical example. WCAG large-text thresholds are defined in points (or their CSS-pixel equivalents), so do not copy an incorrect px threshold from a cheat sheet.
- Preserve project-specific measurements and budgets. A Lighthouse score does not establish real-user performance, WCAG conformance, indexing, or search rankings.
- Use available browser tooling and targeted CLI measurements when suggested integrations are absent. A skill naming a DevTools tool does not make that tool available.
- Use the Flask and general JavaScript security references for this project. Security headers, caching, uploads, and recovery need application-specific decisions rather than copying sample settings wholesale.
- Preserve the confirmed editorial style with one signature interaction. New design guidance does not reopen the chosen brand or create another source for visual values. Anatomy remains available for that interaction; Anime.js was researched but no new animation engine was installed.
- Treat generic conversion statistics, sample claims, motion thresholds, and acceleration statements as material to verify. Use supplied evidence for published claims and actual browser measurements for performance. Content strategy does not authorize changing the agreed URLs or replacing Flask with a hosted CMS.

## Coverage beyond the skills

| Need | Where it is handled |
| --- | --- |
| Single-file colors, fonts, spacing, layout, and motion | Design-system skill plus the project-specific token schema/compiler and reference-page gates in plan v2 |
| SQLite models, revisions, ordering, and migrations | Flask/Jinja/pytest guidance plus SQLAlchemy/Alembic/SQLite official documentation and project tests |
| Image upload, crop/focal placement, variants, and deletion | Media milestone; image library documentation, security guidance, format/RAM/crop/recovery tests |
| Structured visual editor | Vanilla-compatible editor prototype, official editor documentation, block schema, server sanitization, accessibility/browser checks |
| Metadata, structured data, sitemap, URL preservation | SEO guidance checked against Google Search Central and rendered response tests |
| Animations and responsive behavior | GSAP core/ScrollTrigger, CSS, shared tokens, reduced-motion and component lifecycle checks |
| Owner access and contact inquiries | Flask security guidance, session/CSRF/rate-limit tests, durable inquiry and notification-retry flow |
| Oracle hosting, TLS, backup, restore, and deployment | Official Oracle/Flask/Gunicorn/Nginx/SQLite documentation, live quota checks, staging, and restore rehearsal |

## Reproducibility

Installed location: `/Users/layshah/.codex/skills/<skill-name>/`. These are local development instructions, not production dependencies; they are not copied onto the Oracle VM. The installed skill folders are outside this repository. Upstream license notices are retained beside the instructions.

[development-skills.lock.json](development-skills.lock.json) records repository, exact commit, skill directory, installation path, and SHA-256 checksums of installed files. It contains no credentials. The absolute installation path is a record of this machine, not a requirement for another developer.

To recreate a missing skill on another machine with the built-in installer, use its recorded repository, revision, and path:

```sh
python3 "$CODEX_HOME/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo microsoft/debugpy \
  --ref 671f6c7d1b228b8001f659bf61e39b7668587302 \
  --path .claude/skills/flask .claude/skills/jinja2 .claude/skills/pytest
```

If `CODEX_HOME` is unset, substitute the local Codex directory (normally `~/.codex`). Do not overwrite an existing skill silently. The installer copies the selected folders; retain the repository license notice too when the selected folder does not contain one. Updating a skill is a reviewed change to the recorded revision and checksums, not an automatic pull from a moving branch.

## Primary references used to check the recommendations

- [Official GSAP skills repository](https://github.com/greensock/gsap-skills) and [responsive/reduced-motion API](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [Core Web Vitals](https://web.dev/articles/vitals).
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties), [Tailwind v3 theme configuration](https://v3.tailwindcss.com/docs/theme), and [Design Tokens Format Module](https://www.designtokens.org/tr/2025.10/format/).
- [Flask deployment](https://flask.palletsprojects.com/en/stable/deploying/) and [web security](https://flask.palletsprojects.com/en/stable/web-security/).
- [Editor.js](https://editorjs.io/), a structured JSON-output candidate to prototype; no editor package was installed as part of planning.
