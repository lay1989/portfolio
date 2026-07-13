const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/lucide/dist/umd/lucide.min.js');
const destDir = path.join(__dirname, '../public/js');
const dest = path.join(destDir, 'lucide.min.js');

try {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('Successfully copied Lucide minified file to public/js/lucide.min.js');
    } else {
        console.warn('Warning: Source file not found. Make sure lucide npm package is installed: ', src);
    }
} catch (err) {
    console.error('Failed to copy Lucide to public/js:', err.message);
}
