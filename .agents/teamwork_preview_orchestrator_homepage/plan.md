# Homepage Refactoring Plan

This plan details the steps to refactor `content/index.html` to eliminate AI slop patterns and improve CRO based on the strict `.agentrules`.

## Requirements to Execute
1. **R1. Services Bento Box**: Replace the 9-card "What I Can Do For You" section in `content/index.html` with a 3-cell Bento Box layout (E-Commerce, Web Apps, SEO). Use CSS grid geometry or typography instead of generic Lucide icons.
2. **R2. Hero Section Refactor**: Remove the glowing Hero Pill ("Accepting Projects") and the blurred background blob. Rewrite the Hook copy to emphasize high-performance web applications using active verbs and punchy, human language.
3. **R3. Engineering Philosophy Sticky-Scroll**: Refactor the "Engineering Philosophy" section from a 3-card grid into a sticky-scroll layout: section title remains sticky on the left column while the three principles scroll on the right.
4. **R4. Copywriting Slop Removal**: Rewrite all robotic copy and remove banned words ("seamless", "empower", "streamline"). Ensure no overused em-dashes or robotic transitions exist.

## Steps

### Step 1: Exploration
- **Spawn Explorers (3 agents)** to analyze `content/index.html` and propose design layouts and copy.
- Specifically ask them to propose:
  - Responsive Bento Box grid structure using Tailwind CSS.
  - Good typography/geometry-focused design to replace Lucide icons in the Bento cells.
  - Easing curves/durations for micro-animations (or clean static layout transitions).
  - Copywriting options for the Hero and Bento items that strictly follow the anti-slop rules.
  - Sticky-scroll layout details for the Engineering Philosophy section using `sticky` and `top-*` utility classes.
- Verify explorer reports and choose the best strategy.

### Step 2: Implementation
- **Spawn a Worker (1 agent)** with the chosen strategy and full requirements.
- Worker must:
  - Modify `content/index.html` as requested.
  - Make sure all changes follow `.agentrules` constraints.
  - Run the build using `npm run build` and ensure there are no build errors.
  - Verify that the layout compiles correctly.
- Check Worker handoff.

### Step 3: Review & Challenge
- **Spawn Reviewers (2 agents)** and **Challengers (2 agents)**.
- Reviewers will check correctness, completeness, layout responsiveness, and `.agentrules` compliance.
- Challengers will verify that:
  - `npm run build` compiles without errors.
  - The website has no console errors when loaded.
  - Banned words ("seamless", "empower", "streamline") do not exist in `content/index.html`.
  - Exactly 3 service items are in the Bento Box.
  - Left-hand title column in "Engineering Philosophy" uses `sticky` and `top-*`.

### Step 4: Forensic Audit
- **Spawn a Forensic Auditor (1 agent)** to check for integrity violations (no dummy code, no hardcoded checks, authentic implementation).

### Step 5: Synthesis & Handoff
- Analyze results from Reviewers, Challengers, and Auditor.
- Ensure the gate passes.
- Write `handoff.md` and report success to the user/parent.
