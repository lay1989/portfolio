const fs = require('fs');
const path = require('path');

const dirs = [
    'c:\\Users\\SHREE\\Desktop\\portfolio\\content',
    'c:\\Users\\SHREE\\Desktop\\portfolio\\templates'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Directory does not exist: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (!file.endsWith('.html')) return;
        const filePath = path.join(dir, file);
        const originalContent = fs.readFileSync(filePath, 'utf8');
        
        // Match <i ... /> or <i .../>
        const regex = /<i([^>]*?)\s*\/>/g;
        let matchCount = 0;
        
        const newContent = originalContent.replace(regex, (match, g1) => {
            matchCount++;
            return `<i${g1}></i>`;
        });
        
        if (matchCount > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${filePath}: fixed ${matchCount} tags.`);
        } else {
            console.log(`No self-closing tags found in ${filePath}.`);
        }
    });
});
