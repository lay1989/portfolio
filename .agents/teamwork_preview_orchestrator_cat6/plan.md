# Category 6 Implementation Plan

## Overview
Based on the reports from the Explorer subagents, we will execute the following concrete changes:
1. **Overflow-x Prevention**: Append `overflow-x-hidden` to the `<body>` tag of all 9 HTML files.
2. **Border-Radius Standardization**:
   - Upgrade project thumbnail wrappers in `index.html` from `rounded-lg` to `rounded-xl`.
   - Upgrade sidebar cards in `project-details.html` from `rounded-xl` to `rounded-2xl`.
   - Keep buttons as `rounded-full` (for brand consistency) and circular tags/icons as `rounded-full`, ensuring all cards are `rounded-2xl` and images are `rounded-xl`.
3. **Navbar Scroll Blur**: Change `data-[scrolled=true]:backdrop-blur-md` to `data-[scrolled=true]:backdrop-blur-sm` in all 9 HTML files.
4. **Service Card Icon Contrast**: Wrap the 9 service card icons in `index.html` with a structured accent badge container (`w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6 text-accent group-hover:bg-accent group-hover:text-primary-foreground group-hover:border-accent transition-all duration-300 ease-out-expo`) and shrink icons to `w-6 h-6`.
5. **Readability & Line-Heights**:
   - Add global Tailwind Typography line-height overrides in `style.css` for `.prose p, .prose li, .prose blockquote` to set `line-height: 1.75` or `line-height: 1.8` to improve readability.
   - Update `blog.html` cards and text elements to use `leading-relaxed`.

## Detailed File Changes
### 1. overflow-x-hidden on body
Modify all 9 HTML files to add `overflow-x-hidden` to the `<body>` tag:
- `index.html` (line 89)
- `blog.html` (line 68)
- `project-details.html` (line 90)
- `blog-*.html` (6 files: line 68 or 72)

### 2. Standardize Border Radius
- `index.html` (lines 432, 462, 492, 522, 552, 582, 612): Change `rounded-lg` to `rounded-xl`.
- `project-details.html` (lines 768, 790, 810): Change `rounded-xl` to `rounded-2xl`.

### 3. Navbar Glassmorphism
Change `data-[scrolled=true]:backdrop-blur-md` to `data-[scrolled=true]:backdrop-blur-sm` in all 9 HTML files.

### 4. Service Icons Contrast
In `index.html`, replace the 9 icon wrappers (lines 166-168, 182-184, 198-200, 214-216, 230-232, 246-248, 262-264, 278-280, 294-296):
From:
```html
<div class="mb-6 text-accent">
    <i data-lucide="[icon-name]" class="w-8 h-8"></i>
</div>
```
To:
```html
<div class="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6 text-accent group-hover:bg-accent group-hover:text-primary-foreground group-hover:border-accent transition-all duration-300 ease-out-expo">
    <i data-lucide="[icon-name]" class="w-6 h-6"></i>
</div>
```

### 5. Line Height Readability
- In `style.css`, append:
```css
@layer base {
    .prose p, .prose li, .prose blockquote {
        line-height: 1.75;
    }
}
```
- In `blog.html`:
  - Intro paragraph (line 77): Add `leading-relaxed`
  - Blog post excerpts (lines 92, 111, 130, 149, 168, 187): Add `leading-relaxed`
  - Newsletter desc (line 199): Add `leading-relaxed`
