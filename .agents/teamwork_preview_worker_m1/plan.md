# Implementation Plan - Category 7 UI/UX Designer Milestone 1

This plan covers the implementation of the UI/UX changes requested for Milestone 1.

## Proposed Steps

1. **Step 1: Update index.html (Services Section)**
   - Target lines 163-300.
   - Replace the `<i>` element class list of all 9 service cards to add `transition-transform duration-300 ease-out-expo group-hover:scale-110 group-hover:rotate-6`.
   - Verification: Verify each service card has the correct icon class in the source code.

2. **Step 2: Update components/header.html (Theme Toggle Buttons)**
   - Target lines 15 and 33.
   - Add `hover:scale-110 active:scale-95` to the classes of the theme toggle buttons.
   - Verification: Check `components/header.html` file contents for these classes.

3. **Step 3: Update style.css (Tactile Feedback Styles)**
   - Append keyframe-based ripple animation and styles to `style.css`.
   - Verification: Read `style.css` to confirm presence of the new styles.

4. **Step 4: Update index.html (Contact Form Inputs)**
   - Target lines 882-905.
   - Replace input classes for name, email, and project inputs with correct borders, focus rings, and placeholder opacity.
   - Verification: Read `index.html` contact form section.

5. **Step 5: Verify & Build**
   - Run compilation command: `npm run build:css`.
   - Run verification script: `node verify-changes.js`.
   - Verification: Check command exit codes and output logs.

6. **Step 6: Generate Handoff Report**
   - Write comprehensive report to `.agents/teamwork_preview_worker_m1/handoff.md`.
