const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\SHREE\\Desktop\\portfolio';

// Base colors matching style.css
const PALETTE = {
    white: '#ffffff',
    black: '#080808',
    cream: '#F5F0EA',
    creamCard: '#EDE8E1',
    creamBorder: '#D8D2CA',
    accent: '#FF6B35',
    darkCard: '#111111',
    darkMuted: '#1a1a1a',
    darkBorder: '#242424',
    grayMuted: '#666666',
    grayDarkMuted: '#999999',
    grayLightBg: '#f2f2f2'
};

const THEME_COLORS = {
    light: {
        background: PALETTE.cream,
        foreground: PALETTE.black,
        card: PALETTE.creamCard,
        'card-foreground': PALETTE.black,
        primary: PALETTE.black,
        'primary-foreground': PALETTE.cream,
        secondary: PALETTE.creamCard,
        'secondary-foreground': PALETTE.black,
        muted: PALETTE.creamCard,
        'muted-foreground': PALETTE.grayMuted,
        accent: PALETTE.accent,
        'accent-foreground': PALETTE.white,
        border: PALETTE.creamBorder,
        white: '#ffffff',
        black: '#080808',
        transparent: 'transparent'
    },
    dark: {
        background: PALETTE.black,
        foreground: PALETTE.grayLightBg,
        card: PALETTE.darkCard,
        'card-foreground': PALETTE.grayLightBg,
        primary: PALETTE.white,
        'primary-foreground': PALETTE.black,
        secondary: PALETTE.darkMuted,
        'secondary-foreground': PALETTE.white,
        muted: PALETTE.darkMuted,
        'muted-foreground': PALETTE.grayDarkMuted,
        accent: PALETTE.accent,
        'accent-foreground': PALETTE.white,
        border: PALETTE.darkBorder,
        white: '#ffffff',
        black: '#080808',
        transparent: 'transparent'
    }
};

const CUSTOM_COLORS = {
    text: {
        'text-blue-700': { light: '#1D4ED8', dark: '#1D4ED8' },
        'text-blue-800': { light: '#1E40AF', dark: '#1E40AF' },
        'text-emerald-400': { light: '#34D399', dark: '#34D399' },
        'text-orange-700': { light: '#C2410C', dark: '#C2410C' },
        'text-orange-800': { light: '#9A3412', dark: '#9A3412' },
        'text-red-400': { light: '#F87171', dark: '#F87171' },
        'text-red-700': { light: '#B91C1C', dark: '#B91C1C' },
        'text-red-800': { light: '#991B1B', dark: '#991B1B' },
        'text-white': { light: '#ffffff', dark: '#ffffff' },
        'text-black': { light: '#080808', dark: '#080808' },
        'text-gray-500': { light: '#6b7280', dark: '#6b7280' },
        'text-gray-400': { light: '#9ca3af', dark: '#9ca3af' },
        'text-gray-300': { light: '#d1d5db', dark: '#d1d5db' },
        'text-yellow-400': { light: '#facc15', dark: '#facc15' },
    },
    bg: {
        'bg-blue-50': { light: '#EFF6FF', dark: '#EFF6FF' },
        'bg-orange-50': { light: '#FFF7ED', dark: '#FFF7ED' },
        'bg-red-50': { light: '#FEF2F2', dark: '#FEF2F2' },
        'bg-white': { light: '#ffffff', dark: '#ffffff' },
        'bg-black': { light: '#080808', dark: '#080808' },
        // Alpha backgrounds computed as overlay on top of base
        'bg-accent/10': { light: { overlay: PALETTE.accent, alpha: 0.1 }, dark: { overlay: PALETTE.accent, alpha: 0.1 } },
        'bg-accent/5': { light: { overlay: PALETTE.accent, alpha: 0.05 }, dark: { overlay: PALETTE.accent, alpha: 0.05 } },
        'bg-secondary/10': { light: { overlay: PALETTE.creamCard, alpha: 0.1 }, dark: { overlay: PALETTE.darkMuted, alpha: 0.1 } },
        'bg-secondary/20': { light: { overlay: PALETTE.creamCard, alpha: 0.2 }, dark: { overlay: PALETTE.darkMuted, alpha: 0.2 } },
        'bg-emerald-950/30': { light: { overlay: '#022c22', alpha: 0.3 }, dark: { overlay: '#022c22', alpha: 0.3 } },
        'bg-red-950/30': { light: { overlay: '#450a0a', alpha: 0.3 }, dark: { overlay: '#450a0a', alpha: 0.3 } },
        // Add new scanned bg classes
        'bg-primary/5': { light: { overlay: '#080808', alpha: 0.05 }, dark: { overlay: '#ffffff', alpha: 0.05 } },
        'dark:bg-accent/10': { light: null, dark: { overlay: PALETTE.accent, alpha: 0.1 } },
    }
};

// Helper to blend color on top of background
function blend(baseHex, overlayHex, alpha) {
    if (!baseHex || !overlayHex) return baseHex || overlayHex;
    const parse = hex => {
        const c = hex.replace('#', '');
        return [
            parseInt(c.substring(0, 2), 16),
            parseInt(c.substring(2, 4), 16),
            parseInt(c.substring(4, 6), 16)
        ];
    };
    
    const [r1, g1, b1] = parse(baseHex);
    const [r2, g2, b2] = parse(overlayHex);
    
    const r = Math.round((1 - alpha) * r1 + alpha * r2);
    const g = Math.round((1 - alpha) * g1 + alpha * g2);
    const b = Math.round((1 - alpha) * b1 + alpha * b2);
    
    const format = val => {
        const str = val.toString(16);
        return str.length === 1 ? '0' + str : str;
    };
    
    return `#${format(r)}${format(g)}${format(b)}`.toUpperCase();
}

function getLuminance(hex) {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    
    const a = [r, g, b].map(v => {
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

// Find files to check
const filesToCheck = [];
fs.readdirSync(rootDir).forEach(file => {
    if (file === 'projects.html' || file === 'blog.html' || (file.startsWith('blog-') && file.endsWith('.html'))) {
        filesToCheck.push(path.join(rootDir, file));
    }
});
const projectsDir = path.join(rootDir, 'projects');
if (fs.existsSync(projectsDir)) {
    fs.readdirSync(projectsDir).forEach(file => {
        if (file.endsWith('.html')) {
            filesToCheck.push(path.join(projectsDir, file));
        }
    });
}

console.log(`Checking ${filesToCheck.length} files...`);

let violations = [];
let allIconsInfo = [];

filesToCheck.forEach(filePath => {
    const relativePath = path.relative(rootDir, filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/<i([^>]*)\/>/g, '<i$1></i>');
    const $ = cheerio.load(content);
    
    const icons = $('i[data-lucide], [data-lucide]');
    
    icons.each((idx, elem) => {
        const iconName = $(elem).attr('data-lucide');
        const elementClass = $(elem).attr('class') || '';
        
        // Find text color in Light and Dark Mode
        let lightTextHex = null;
        let darkTextHex = null;
        
        let lightTextClass = null;
        let darkTextClass = null;
        
        // Trace up to find colors
        let current = $(elem);
        while (current && current.length > 0) {
            const clsAttr = current.attr('class') || '';
            const classes = clsAttr.split(/\s+/).filter(Boolean);
            
            // Check for dark text colors
            const darkCls = classes.find(c => c.startsWith('dark:text-'));
            if (darkCls && !darkTextHex) {
                const colorPart = darkCls.replace('dark:', '');
                if (THEME_COLORS.dark[colorPart.replace('text-', '')]) {
                    darkTextHex = THEME_COLORS.dark[colorPart.replace('text-', '')];
                    darkTextClass = darkCls;
                } else if (CUSTOM_COLORS.text[colorPart]) {
                    darkTextHex = CUSTOM_COLORS.text[colorPart].dark;
                    darkTextClass = darkCls;
                } else if (colorPart.startsWith('text-blue-') || colorPart.startsWith('text-orange-') || colorPart.startsWith('text-red-') || colorPart.startsWith('text-emerald-')) {
                    // Look up custom mapped
                    if (CUSTOM_COLORS.text[colorPart]) {
                        darkTextHex = CUSTOM_COLORS.text[colorPart].dark;
                        darkTextClass = darkCls;
                    }
                }
            }
            
            // Check for normal text colors (which apply to light, and potentially dark if no dark override)
            const normalCls = classes.find(c => {
                if (c.includes(':')) return false;
                if (!c.startsWith('text-')) return false;
                const baseClass = c.split('-').pop();
                // Ignore layout/sizing
                return !/^(xs|sm|base|lg|[2-9]xl|balance|center|left|right|justify|wrap|nowrap|ellipsis)$/.test(baseClass);
            });
            
            if (normalCls && !lightTextHex) {
                const colorPart = normalCls.replace('text-', '');
                if (THEME_COLORS.light[colorPart]) {
                    lightTextHex = THEME_COLORS.light[colorPart];
                    lightTextClass = normalCls;
                } else if (CUSTOM_COLORS.text[normalCls]) {
                    lightTextHex = CUSTOM_COLORS.text[normalCls].light;
                    lightTextClass = normalCls;
                }
            }
            
            current = current.parent();
        }
        
        // If not found, default light to body text color
        if (!lightTextHex) {
            lightTextHex = THEME_COLORS.light.foreground;
            lightTextClass = 'default-body-text';
        }
        // If darkTextHex not found, it inherits the dark value of the light text color class
        if (!darkTextHex) {
            if (lightTextClass !== 'default-body-text') {
                const colorPart = lightTextClass.replace('text-', '');
                if (THEME_COLORS.dark[colorPart]) {
                    darkTextHex = THEME_COLORS.dark[colorPart];
                    darkTextClass = `inherited-dark-value-of-${lightTextClass}`;
                } else if (CUSTOM_COLORS.text[lightTextClass]) {
                    darkTextHex = CUSTOM_COLORS.text[lightTextClass].dark;
                    darkTextClass = `inherited-dark-value-of-${lightTextClass}`;
                } else {
                    darkTextHex = THEME_COLORS.dark.foreground;
                    darkTextClass = 'default-dark-body-text';
                }
            } else {
                darkTextHex = THEME_COLORS.dark.foreground;
                darkTextClass = 'default-dark-body-text';
            }
        }
        
        // Find background color in Light and Dark Mode
        let lightBgHex = null;
        let darkBgHex = null;
        let lightBgClass = null;
        let darkBgClass = null;
        
        current = $(elem);
        while (current && current.length > 0) {
            const clsAttr = current.attr('class') || '';
            const classes = clsAttr.split(/\s+/).filter(Boolean);
            
            // Check dark background
            const darkBgCls = classes.find(c => c.startsWith('dark:bg-'));
            if (darkBgCls && !darkBgHex) {
                const bgPart = darkBgCls.replace('dark:', '');
                const colorPart = bgPart.replace('bg-', '');
                if (THEME_COLORS.dark[colorPart] && THEME_COLORS.dark[colorPart] !== 'transparent') {
                    darkBgHex = THEME_COLORS.dark[colorPart];
                    darkBgClass = darkBgCls;
                } else if (CUSTOM_COLORS.bg[bgPart]) {
                    const customVal = CUSTOM_COLORS.bg[bgPart].dark;
                    if (customVal && typeof customVal === 'object') {
                        darkBgHex = customVal; // will blend later
                        darkBgClass = darkBgCls;
                    } else if (customVal && customVal !== 'transparent') {
                        darkBgHex = customVal;
                        darkBgClass = darkBgCls;
                    }
                }
            }
            
            // Check normal background
            const normalBgCls = classes.find(c => {
                if (c.includes(':')) return false;
                return c.startsWith('bg-');
            });
            if (normalBgCls && !lightBgHex) {
                const colorPart = normalBgCls.replace('bg-', '');
                if (THEME_COLORS.light[colorPart] && THEME_COLORS.light[colorPart] !== 'transparent') {
                    lightBgHex = THEME_COLORS.light[colorPart];
                    lightBgClass = normalBgCls;
                } else if (CUSTOM_COLORS.bg[normalBgCls]) {
                    const customVal = CUSTOM_COLORS.bg[normalBgCls].light;
                    if (customVal && typeof customVal === 'object') {
                        lightBgHex = customVal; // will blend later
                        lightBgClass = normalBgCls;
                    } else if (customVal && customVal !== 'transparent') {
                        lightBgHex = customVal;
                        lightBgClass = normalBgCls;
                    }
                }
            }
            current = current.parent();
        }
        
        // Resolve Light Bg
        if (!lightBgHex) {
            lightBgHex = THEME_COLORS.light.background;
            lightBgClass = 'default-page-bg';
        } else if (typeof lightBgHex === 'object') {
            // Find base bg by looking further up from lightBgClass element
            let baseHex = THEME_COLORS.light.background;
            let currentParent = $(elem);
            while (currentParent && currentParent.length > 0) {
                const clsAttr = currentParent.attr('class') || '';
                const classes = clsAttr.split(/\s+/).filter(Boolean);
                const otherBgCls = classes.find(c => {
                    if (c.includes(':')) return false;
                    return c.startsWith('bg-') && c !== lightBgClass;
                });
                if (otherBgCls) {
                    const colorPart = otherBgCls.replace('bg-', '');
                    if (THEME_COLORS.light[colorPart] && THEME_COLORS.light[colorPart] !== 'transparent') {
                        baseHex = THEME_COLORS.light[colorPart];
                        break;
                    } else if (CUSTOM_COLORS.bg[otherBgCls] && typeof CUSTOM_COLORS.bg[otherBgCls].light !== 'object') {
                        baseHex = CUSTOM_COLORS.bg[otherBgCls].light;
                        break;
                    }
                }
                currentParent = currentParent.parent();
            }
            lightBgHex = blend(baseHex, lightBgHex.overlay, lightBgHex.alpha);
        }
        
        // Resolve Dark Bg
        if (!darkBgHex) {
            if (lightBgClass && lightBgClass !== 'default-page-bg') {
                if (CUSTOM_COLORS.bg[lightBgClass] && typeof CUSTOM_COLORS.bg[lightBgClass] === 'object') {
                    const customVal = CUSTOM_COLORS.bg[lightBgClass].dark;
                    if (customVal && typeof customVal === 'object') {
                        // Find dark base background under it
                        let baseHex = THEME_COLORS.dark.background;
                        let currentParent = $(elem);
                        while (currentParent && currentParent.length > 0) {
                            const clsAttr = currentParent.attr('class') || '';
                            const classes = clsAttr.split(/\s+/).filter(Boolean);
                            const otherBgCls = classes.find(c => {
                                if (c.startsWith('dark:bg-')) return true;
                                if (c.startsWith('bg-') && c !== lightBgClass && !c.includes(':')) return true;
                                return false;
                            });
                            if (otherBgCls) {
                                if (otherBgCls.startsWith('dark:bg-')) {
                                    const colorPart = otherBgCls.replace('dark:bg-', '');
                                    if (THEME_COLORS.dark[colorPart]) {
                                        baseHex = THEME_COLORS.dark[colorPart];
                                        break;
                                    }
                                } else {
                                    const colorPart = otherBgCls.replace('bg-', '');
                                    if (THEME_COLORS.dark[colorPart]) {
                                        baseHex = THEME_COLORS.dark[colorPart];
                                        break;
                                    }
                                }
                            }
                            currentParent = currentParent.parent();
                        }
                        darkBgHex = blend(baseHex, customVal.overlay, customVal.alpha);
                        darkBgClass = `inherited-blend-of-${lightBgClass}`;
                    } else if (customVal) {
                        darkBgHex = customVal;
                        darkBgClass = `inherited-dark-value-of-${lightBgClass}`;
                    } else {
                        darkBgHex = THEME_COLORS.dark.background;
                        darkBgClass = 'default-dark-page-bg';
                    }
                } else {
                    const colorPart = lightBgClass.replace('bg-', '');
                    if (THEME_COLORS.dark[colorPart]) {
                        darkBgHex = THEME_COLORS.dark[colorPart];
                        darkBgClass = `inherited-dark-value-of-${lightBgClass}`;
                    } else {
                        darkBgHex = THEME_COLORS.dark.background;
                        darkBgClass = 'default-dark-page-bg';
                    }
                }
            } else {
                darkBgHex = THEME_COLORS.dark.background;
                darkBgClass = 'default-dark-page-bg';
            }
        } else if (typeof darkBgHex === 'object') {
            let baseHex = THEME_COLORS.dark.background;
            let currentParent = $(elem);
            while (currentParent && currentParent.length > 0) {
                const clsAttr = currentParent.attr('class') || '';
                const classes = clsAttr.split(/\s+/).filter(Boolean);
                const otherBgCls = classes.find(c => {
                    if (c.startsWith('dark:bg-') && c !== darkBgClass) return true;
                    if (c.startsWith('bg-') && !c.includes(':')) return true;
                    return false;
                });
                if (otherBgCls) {
                    if (otherBgCls.startsWith('dark:bg-')) {
                        const colorPart = otherBgCls.replace('dark:bg-', '');
                        if (THEME_COLORS.dark[colorPart] && THEME_COLORS.dark[colorPart] !== 'transparent') {
                            baseHex = THEME_COLORS.dark[colorPart];
                            break;
                        }
                    } else {
                        const colorPart = otherBgCls.replace('bg-', '');
                        if (THEME_COLORS.dark[colorPart] && THEME_COLORS.dark[colorPart] !== 'transparent') {
                            baseHex = THEME_COLORS.dark[colorPart];
                            break;
                        }
                    }
                }
                currentParent = currentParent.parent();
            }
            darkBgHex = blend(baseHex, darkBgHex.overlay, darkBgHex.alpha);
        }
        
        // Clean hexes
        lightTextHex = lightTextHex.toUpperCase();
        darkTextHex = darkTextHex.toUpperCase();
        lightBgHex = lightBgHex.toUpperCase();
        darkBgHex = darkBgHex.toUpperCase();
        
        // Calculate contrast ratios
        const lightContrast = parseFloat(getContrastRatio(lightTextHex, lightBgHex));
        const darkContrast = parseFloat(getContrastRatio(darkTextHex, darkBgHex));
        
        const htmlSnippet = $.html(elem);
        
        const iconInfo = {
            file: relativePath,
            icon: iconName,
            elementClass,
            snippet: htmlSnippet,
            light: {
                textClass: lightTextClass,
                bgClass: lightBgClass,
                textColor: lightTextHex,
                bgColor: lightBgHex,
                contrast: lightContrast
            },
            dark: {
                textClass: darkTextClass,
                bgClass: darkBgClass,
                textColor: darkTextHex,
                bgColor: darkBgHex,
                contrast: darkContrast
            }
        };
        
        allIconsInfo.push(iconInfo);
        
        // Check for specific violations
        // Violation 1: Plain text-accent (#FF6B35) on cream backgrounds (#F5F0EA or #EDE8E1) in light mode
        // unless overridden by a class. Wait, what does the prompt say?
        // "Specifically verify that no `.lucide` icons use classes that render as '#FF6B35' (accent color) on '#F5F0EA' or '#EDE8E1' (cream backgrounds) in light mode, unless there is a high-contrast override class."
        const isAccent = lightTextHex === '#FF6B35';
        const isCreamBg = lightBgHex === '#F5F0EA' || lightBgHex === '#EDE8E1';
        
        if (isAccent && isCreamBg) {
            // Check if there's a high contrast class. Wait! If the computed color is #FF6B35, it means the accent color IS being rendered (not overridden, because if it was overridden, lightTextHex wouldn't be #FF6B35!).
            // So if lightTextHex is #FF6B35, there is NO active high-contrast override in light mode!
            violations.push({
                type: 'ORANGE_ON_CREAM_VIOLATION',
                icon: iconInfo,
                message: `Icon renders as ${lightTextHex} on background ${lightBgHex} (${lightBgClass}) in light mode.`
            });
        }
        
        // Violation 2: Light mode contrast ratio < 4.5:1
        if (lightContrast < 4.5) {
            violations.push({
                type: 'LIGHT_MODE_CONTRAST_VIOLATION',
                icon: iconInfo,
                message: `Light mode contrast ratio is ${lightContrast}:1 (< 4.5:1) with text ${lightTextHex} (${lightTextClass}) on bg ${lightBgHex} (${lightBgClass})`
            });
        }
        
        // Violation 3: Dark mode contrast ratio < 4.5:1
        if (darkContrast < 4.5) {
            violations.push({
                type: 'DARK_MODE_CONTRAST_VIOLATION',
                icon: iconInfo,
                message: `Dark mode contrast ratio is ${darkContrast}:1 (< 4.5:1) with text ${darkTextHex} (${darkTextClass}) on bg ${darkBgHex} (${darkBgClass})`
            });
        }
    });
});

console.log(`\n--- Verification Summary ---`);
console.log(`Total Icons Analyzed: ${allIconsInfo.length}`);
console.log(`Total Violations Found: ${violations.length}`);

if (violations.length > 0) {
    console.log(`\nViolations:`);
    violations.forEach((v, i) => {
        console.log(`[${i+1}] ${v.type} in ${v.icon.file}:`);
        console.log(`    Icon: ${v.icon.icon}`);
        console.log(`    Snippet: ${v.icon.snippet}`);
        console.log(`    Light Text: ${v.icon.light.textColor} (${v.icon.light.textClass}) on Bg: ${v.icon.light.bgColor} (${v.icon.light.bgClass}) - Contrast: ${v.icon.light.contrast}:1`);
        console.log(`    Dark Text: ${v.icon.dark.textColor} (${v.icon.dark.textClass}) on Bg: ${v.icon.dark.bgColor} (${v.icon.dark.bgClass}) - Contrast: ${v.icon.dark.contrast}:1`);
        console.log(`    Error Message: ${v.message}`);
    });
}

// Write details to JSON file for further inspection
fs.writeFileSync('all_icons_data.json', JSON.stringify({ summary: { total: allIconsInfo.length, violations: violations.length }, icons: allIconsInfo, violations }, null, 2));
console.log(`\nDetailed report written to all_icons_data.json`);
