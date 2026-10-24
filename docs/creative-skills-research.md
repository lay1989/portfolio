# Design, content, and distinctive interaction skills

Researched: 2026-10-24. Direction confirmed by the owner: **keep the editorial portfolio and add one signature interaction**. This supplements [implementation plan v2](dynamic-website-plan-v2.md); no public interface or animation library was changed during this research.

## Recommendation

The first skill selection covered implementation and technical quality more thoroughly than art direction and writing. Add a small creative layer: one art-direction skill, one design-engineering skill, and three complementary writing/planning skills. Keep Anatomy for the signature piece, and retain CSS/GSAP as the current motion implementation.

Community-maintained skills are useful when their actual instructions, examples, maintenance, and contribution history fit the task. Stars and installs show interest; they do not establish industry-wide production use, correctness, or better conversion rates. The research found strong public interest and concrete merged contributions, but no reliable measurement establishing industry-wide adoption of these skills.

## What was checked

Searched the web, then inspected original repositories through GitHub: current revision, latest commit, license, skill entry points, supporting-file inventory, and selected merged pull requests. Used official Anime.js documentation to distinguish library capabilities from third-party skill claims. [The evidence record](creative-skill-research-evidence.json) preserves point-in-time observations and source revisions.

Examples of accepted contributions from accounts other than the repository owner include [Taste Skill #158](https://github.com/Leonxlnx/taste-skill/pull/158), [Impeccable #1135](https://github.com/pbakaus/impeccable/pull/1135), and [Marketing Skills #853](https://github.com/coreyhaines31/marketingskills/pull/853). These show actual code changes being accepted, not just a directory listing. The sample is not a census of contributors or proof of their identities.

## Skills added

| Skill and original source | Job in this portfolio | Why it complements the existing set |
| --- | --- | --- |
| [frontend-design, Anthropic](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) | Art direction, typography, composition, and critique | Adds judgment about the overall page; the existing design-system skill primarily organizes reusable values and components |
| [emil-design-eng, Emil Kowalski](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202/skills/emil-design-eng) | Interaction feel, timing, interruption, and control states | Complements GSAP API guidance with decisions about whether and how an interaction should move |
| [copywriting, Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/copywriting) | New service, project, and Tool descriptions | Helps turn supplied facts into a clear argument and next step |
| [copy-editing, Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/copy-editing) | Improve existing copy while retaining the owner's voice | Separates editing an existing argument from drafting a new one |
| [content-strategy, Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/content-strategy) | Blog topics, audience questions, original examples, and connections to case studies/Tools | Adds editorial planning alongside the existing technical SEO guidance |

All five are installed under the local Codex skills folder, at pinned revisions. Entry points were checked against the reviewed versions and license notices retained. They become available next turn. The [inventory](development-skills.md) and [lock record](development-skills.lock.json) now cover fifteen additions from these planning sessions. Anatomy was already installed and remains available separately.

Use the owner's brief as the governing design direction. Frontend-design explicitly allows an established brief to take precedence over its warnings about common aesthetics. Apply the useful motion principles from Emil's guidance to CSS/GSAP/vanilla code; React examples do not justify introducing React. Treat its absolute timing and acceleration statements as heuristics to verify in the actual browser. The central design file still owns visual and motion values.

Writing examples and generic conversion statistics are not evidence about Lay's business. Do not import sample customer figures, guarantees, growth claims, ranking promises, or synthetic reviewer scores into published content. Content-strategy's headless-CMS reference does not replace the confirmed Flask/SQLite architecture. No outreach, publishing, analytics account connections, or paid services are authorized by installing a writing skill.

## Popular alternatives and why they were not added by default

| Candidate | Findings | Decision |
| --- | --- | --- |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Active original repository with roughly 102,000 stars at inspection and accepted outside contributions. Current guidance includes art-direction selection and browser critique. Its house style bans monospace labels, thin rules, numbered markers, and accent words in headings | Strong alternative for a fresh direction. Those bans conflict with several existing editorial choices; do not let it silently redesign the portfolio. Not installed alongside another primary art director |
| [Impeccable](https://github.com/pbakaus/impeccable) | Roughly 86,000 stars; active code, critique/polish/design-system workflows, and merged outside fixes. Current integration includes a context launcher that uses a bundled or downloaded executable; full installation can also add edit hooks | Worth considering as a dedicated design-review toolkit. The selected art-direction skill plus existing QA is a smaller initial integration; no launcher or hooks installed |
| [Marketing Skills seo-audit](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/seo-audit) | Original collection has roughly 56,000 stars and accepted outside fixes. Broader audit workflow overlaps the installed SEO guidance | Keep existing technical SEO as the main checklist and add editorial strategy now. Revisit this skill if a later audit needs its distinct workflow |
| [iart web animation](https://github.com/iart-ai/web-animation-skills) | Smaller specialist collection with SVG, ASCII, Lottie, accessibility, and other motion guidance | Potential source for an effect-specific need; not evidence of broad industry adoption. No concrete gap yet beyond Anatomy/GSAP/design engineering |
| [Anthropic algorithmic-art](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/algorithmic-art) | Generative-art workflow that could support a standalone creative experiment | An optional future lab project. The confirmed first signature should demonstrate useful engineering work |

Repository-level popularity applies to whole collections, not necessarily an individual skill. Emil's repository had roughly 49,000 stars, but the public page currently restricts new pull requests to collaborators; it is principally author-led rather than an unrestricted community contribution model. Anatomy had roughly 20,000 stars and a short public history. Neither fact establishes maturity or production success by itself.

## Anatomy and Anime.js have different jobs

[Anatomy](https://github.com/wheresryan22/anatomy) is already installed. It provides a drawing kit, examples, and a workflow for interactive isometric explanations. It can produce framework-free SVG/JavaScript, with optional WebGL. It is the strongest candidate here for a recognizable signature object. Start with a single SVG figure; optional 3D and shader work must earn their rendering cost.

[Anime.js](https://animejs.com/documentation/) is a runtime animation library. Its current [SVG utilities](https://animejs.com/documentation/svg/) support morphing, drawing, and motion paths; [scopes](https://animejs.com/documentation/scope/) support media-query-dependent setup and grouped cleanup. Those capabilities can be useful without making the choice of library the creative idea.

No `SKILL.md` was found in the inspected official `juliangarnier/anime` source tree. A [third-party Anime.js skill](https://github.com/BowTiedSwan/animejs-skills) exists, but the inspected repository had 55 stars and its latest commit was January 2026. Its README says MIT while GitHub did not recognize a repository license. That is weaker evidence than the official library documentation, and it should not be described as an official or widely adopted skill.

Recommendation: retain GSAP/CSS, prototype the selected effect, and compare Anime.js only if it solves a specific shortcoming. Do not load both engines by default. Installing a skill is separate from adding any library to the website.

## Signature concept to prototype

**Recommended proposal: a publishing workbench.** A small, finely drawn publishing machine makes a concrete promise visible: a client edits content, previews the change, and publishes it while the public page stays controlled. The owner has approved one signature interaction; this particular concept remains a proposal.

- The mechanism has an editable draft, a preview window, and a publish control. The public miniature changes only when the visitor chooses Publish. A reset returns the demonstration to its initial state.
- Use one coherent physical object, purposeful controls, and real UI examples instead of decorative particles. Anatomy supplies the craft workflow; the portfolio's shared design tokens supply color, type, and motion.
- Demonstration data is explicitly illustrative. The component never edits the real portfolio database or exposes owner routes. Readouts represent its actual demonstration state; no invented client outcomes or performance gains.
- Keep the nearby client message and primary inquiry link ordinary HTML. The component enhances the story without becoming the only way to understand it.
- Support pointer, touch, and keyboard; provide an equivalent still/text explanation for reduced motion or absent scripts; stop ongoing work offscreen. Match both themes and narrow screens.
- Prototype in isolation during the design milestone. Integrate after the content/editor architecture is stable. Compare mobile loading, layout shift, and interaction cost with the baseline before keeping it on the homepage.

Alternatives are a project-inspection desk showing real case-study screens, or a performance bench explaining measured image optimization. Choose one after reviewing the prototype, rather than filling the homepage with several unrelated visual tricks.

## How the skills cooperate

1. **Direction:** the owner brief and frontend-design establish the editorial world and the one signature moment.
2. **System:** design-system-patterns turns that direction into the shared file and reusable components.
3. **Argument:** content-strategy identifies useful topics; copywriting drafts; copy-editing reviews. Verify each factual claim against supplied evidence.
4. **Interaction:** Anatomy constructs the explanatory object; emil-design-eng reviews behavior; GSAP skills support implementation where required.
5. **Verification:** existing accessibility, performance, SEO, pytest, Flask, Jinja, and security guidance checks the working result.

Load the relevant skills for each task. Do not ask several aesthetic systems to independently redesign the same surface. Use [Google's helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) as the primary SEO editorial reference: original examples and useful explanations matter more than merely publishing more posts.
