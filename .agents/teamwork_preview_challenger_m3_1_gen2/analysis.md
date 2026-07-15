# Adversarial Emoji Verification Analysis

This report documents the empirical and adversarial testing of the `verify_emojis.js` verification script.

## Challenge Summary

**Overall risk assessment**: MEDIUM

While the emoji verifier is highly effective for the current codebase structure, its robustness has a few architectural assumptions that could lead to false negatives if the project structure evolves.

---

## Challenges

### [Medium] Challenge 1: Hardcoded Subdirectories (Lack of Recursion)

- **Assumption challenged**: The script assumes all HTML files reside either in the root directory or in the `projects/` subdirectory.
- **Attack scenario**: If a new module or section is added in a separate subdirectory (e.g. `blog/` or `services/`), any raw unicode emojis placed inside these files will bypass verification completely.
- **Blast radius**: Undetected raw emojis in future-built pages, violating the milestone constraints.
- **Mitigation**: Update `verify_emojis.js` to perform a recursive directory search for all `.html` files in the workspace (excluding `node_modules` or `.git`), rather than hardcoding directory paths.

### [Low] Challenge 2: Single-Format Verification (HTML Only)

- **Assumption challenged**: Emojis will only enter the final client experience via generated HTML files.
- **Attack scenario**: Raw emojis could be placed inside client-side JS (`script.js`) or CSS styles (e.g., custom cursor emojis in CSS, or UI strings loaded dynamically in JavaScript), which are not checked.
- **Blast radius**: Raw emojis loaded via javascript or styling resources on client devices.
- **Mitigation**: Extend verification to scan all assets being served to the client, specifically files matching `*.js` and `*.css` in the build targets.

---

## Stress Test Results

| Scenario | Input Location | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Clean Baseline** | No injected emojis | Exit code 0, "0 raw unicode emojis found" | Verification PASSED (Exit code 0) | **PASS** |
| **Negative Test (HTML Source)** | `content/index.html` (injected `🚀`) | Exit code 1, reports `🚀` in `index.html` | Verification FAILED (Exit code 1, reported `🚀` in `index.html`) | **PASS** |
| **Negative Test (JSON Data)** | `data/projects.json` (injected `👍`) | Exit code 1, reports `👍` in `index.html` and `projects.html` | Verification FAILED (Exit code 1, reported `👍` in `index.html` and `projects.html`) | **PASS** |
| **Reversion Verification** | Reverted all injections | Exit code 0, "0 raw unicode emojis found" | Verification PASSED (Exit code 0) | **PASS** |

### Explanatory Note on JSON Data Injection
When the emoji `👍` was injected into the `shortDesc` field of `data/projects.json`, the build engine (`scripts/build-html.js`) populated this value into:
1. `index.html` (under homepage project showcase cards)
2. `projects.html` (under search/listing cards)

Since the Ghermar & Sons project case study template uses `project.overview` rather than `project.shortDesc`, the emoji did not appear in `projects/ghermar-sons.html`. The verifier successfully detected the emoji on the two pages where the text was rendered, showing that the build pipeline integration works seamlessly and that the verifier correctly scans files outputted by the static site generator.

---

## Unchallenged Areas

- **HTML entity representation**: The regex specifically checks for raw unicode emojis `[\p{Emoji_Presentation}\p{Extended_Pictographic}]`. Escape sequences like `&#128640;` or `&rocket;` were not tested as they are valid escaped formats, which are allowed by design under the project's layout rules.
