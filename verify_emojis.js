const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const projectsDir = path.join(rootDir, 'projects');

// Get all generated html files
const htmlFiles = [];

// Read root HTML files
fs.readdirSync(rootDir).forEach(file => {
    if (file.endsWith('.html')) {
        htmlFiles.push(path.join(rootDir, file));
    }
});

// Read projects/ subdirectory HTML files
if (fs.existsSync(projectsDir)) {
    fs.readdirSync(projectsDir).forEach(file => {
        if (file.endsWith('.html')) {
            htmlFiles.push(path.join(projectsDir, file));
        }
    });
}

// Regex to detect emojis
const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
let totalEmojisFound = 0;

htmlFiles.forEach(filePath => {
    const relativePath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(emojiRegex);
    if (matches) {
        console.error(`Error: Found raw emojis in ${relativePath}: ${matches.join(', ')}`);
        totalEmojisFound += matches.length;
    }
});

if (totalEmojisFound > 0) {
    console.error(`Verification FAILED: Found ${totalEmojisFound} raw unicode emoji(s) in generated files.`);
    process.exit(1);
} else {
    console.log("Verification PASSED: 0 raw unicode emojis found in generated HTML files.");
    process.exit(0);
}
