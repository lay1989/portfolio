const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Files to check: projects.html, blog.html, and blog-*.html in rootDir
const filesToCheck = [];
fs.readdirSync(rootDir).forEach(file => {
    if (file === 'projects.html' || file === 'blog.html' || (file.startsWith('blog-') && file.endsWith('.html'))) {
        filesToCheck.push(path.join(rootDir, file));
    }
});

let failed = false;

// Contrast failure check function
function inspectFile(filePath) {
    const relativePath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content);
    
    // Find all tags with data-lucide attribute
    const icons = $('i[data-lucide], [data-lucide]');
    
    icons.each((idx, elem) => {
        const iconName = $(elem).attr('data-lucide');
        
        // Find closest ancestor (including self) that specifies a text color class.
        // Look up to 4 levels up.
        let current = $(elem);
        let colorClasses = [];
        let elementWithColor = null;
        
        for (let i = 0; i < 4; i++) {
            if (!current || current.length === 0) break;
            const classAttr = current.attr('class') || '';
            const classes = classAttr.split(/\s+/).filter(Boolean);
            
            // Find text color classes (excluding text-sm, text-lg, etc.)
            const textColors = classes.filter(cls => {
                if (!cls.startsWith('text-') && !cls.includes(':text-')) return false;
                const baseClass = cls.split(':').pop(); // handle prefixes like dark:
                // Exclude font sizing and layout classes
                return !/^(text-(xs|sm|base|lg|[2-9]xl|balance|center|left|right|justify|wrap|nowrap|ellipsis))$/.test(baseClass);
            });
            
            if (textColors.length > 0) {
                colorClasses = textColors;
                elementWithColor = current;
                break;
            }
            current = current.parent();
        }
        
        // If we found color classes, verify they don't fail contrast in light mode.
        if (colorClasses.length > 0) {
            const hasLightAccent = colorClasses.some(cls => cls === 'text-accent');
            const hasHighContrastLight = colorClasses.some(cls => {
                if (cls.includes(':')) return false; // ignore dark: or hover: prefixed classes
                return ['text-primary', 'text-foreground', 'text-muted-foreground', 'text-white', 'text-black', 'text-secondary-foreground', 'text-accent-foreground'].includes(cls);
            });
            
            if (hasLightAccent && !hasHighContrastLight) {
                console.error(`Contrast violation in ${relativePath}:`);
                console.error(`  Icon: data-lucide="${iconName}"`);
                console.error(`  Element: <${elementWithColor.prop('tagName').toLowerCase()} class="${elementWithColor.attr('class')}">`);
                console.error(`  Reason: Uses plain text-accent on a light background without a high-contrast light mode override class.`);
                failed = true;
            }
        }
    });
}

console.log(`Verifying WCAG contrast for icons in ${filesToCheck.length} HTML files...`);
filesToCheck.forEach(inspectFile);

if (failed) {
    console.error("\nVerification FAILED: Found icons with poor contrast in light mode.");
    process.exit(1);
} else {
    console.log("\nVerification PASSED: All checked icons have high contrast colors in light mode.");
    process.exit(0);
}
