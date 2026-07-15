const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const rootDir = 'c:\\Users\\SHREE\\Desktop\\portfolio';

const data = JSON.parse(fs.readFileSync('all_icons_data.json', 'utf-8'));
const icons = data.icons;

const files = ['projects.html', 'blog.html', 'blog-custom-websites.html'];

files.forEach(targetFile => {
    console.log(`\n=================== FILE: ${targetFile} ===================`);
    const filePath = path.join(rootDir, targetFile);
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/<i([^>]*)\/>/g, '<i$1></i>');
    const $ = cheerio.load(content);
    const fileIcons = $('i[data-lucide], [data-lucide]');
    console.log(`Total icons: ${fileIcons.length}`);
    
    fileIcons.each((idx, elem) => {
        const iconName = $(elem).attr('data-lucide');
        const elementClass = $(elem).attr('class') || '';
        // Find icon info in allIconsInfo from the runner
        const iconInfo = data.icons.find(item => item.file === targetFile && item.icon === iconName && item.elementClass === elementClass);
        if (!iconInfo) {
            console.log(`[${idx+1}] Icon "${iconName}" (${elementClass}) - NOT FOUND IN DATA`);
            return;
        }
        console.log(`[${idx+1}] Icon "${iconName}" (${elementClass})`);
        console.log(`    Snippet: ${iconInfo.snippet}`);
        console.log(`    Light Mode: Text ${iconInfo.light.textColor} (${iconInfo.light.textClass}) on Bg ${iconInfo.light.bgColor} (${iconInfo.light.bgClass}) - Contrast ${iconInfo.light.contrast}:1`);
        console.log(`    Dark Mode: Text ${iconInfo.dark.textColor} (${iconInfo.dark.textClass}) on Bg ${iconInfo.dark.bgColor} (${iconInfo.dark.bgClass}) - Contrast ${iconInfo.dark.contrast}:1`);
    });
});
