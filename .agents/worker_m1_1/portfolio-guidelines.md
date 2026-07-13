# Portfolio Project Guidelines

This project is a static portfolio website built with Vanilla HTML, CSS, and JavaScript.

## Tech Stack
- **HTML5**: Standard semantic HTML. Multi-page architecture (`index.html`, `blog.html`, etc.).
- **Tailwind CSS**: Loaded via CDN (`<script src="https://cdn.tailwindcss.com"></script>`). The configuration is embedded directly within `<script>` tags in each HTML file.
- **Vanilla CSS**: Global styles, animations, and theme CSS variables are in `style.css`.
- **Vanilla JavaScript**: All interactivity is in `script.js`.
- **Icons**: Lucide icons are used. Initialize new icons by ensuring `lucide.createIcons()` runs, or rely on the existing initialization in `script.js`.

## Theming and Colors
- The project supports light and dark modes via a `.dark` class on the `<html>` element.
- Theme colors are managed using CSS variables defined in `style.css` (e.g., `--background`, `--foreground`, `--primary`, `--accent`).
- The Tailwind configuration in the HTML files maps these variables to Tailwind's color palette.
- **When adding new colors**: Define them as CSS variables in both `:root` and `.dark` scopes in `style.css`, and then add them to the Tailwind configuration in the HTML files.

## Guidelines
1. **No Frameworks**: Do not introduce React, Vue, Svelte, or Next.js. Stick to vanilla web technologies.
2. **Consistent Styling**: Use Tailwind utility classes for layout and styling where possible. Use `style.css` for complex animations or custom scrollbars.
3. **Responsive Design**: Ensure mobile responsiveness using Tailwind's `md:` and `lg:` prefixes.
4. **Icons**: Use Lucide icons (`<i data-lucide="icon-name"></i>`).
5. **DOM Manipulation**: Use standard `document.querySelector` and add event listeners in `script.js`.
