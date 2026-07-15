const fs = require('fs');
const path = require('path');

const pagesPath = path.join(__dirname, '..', 'pages.json');
const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));

const posts = [];

Object.entries(pages).forEach(([filename, config]) => {
    if (filename.startsWith('blog-') && filename !== 'blog.html') {
        const slug = filename.replace('.html', '');
        
        // Extract metadata
        const title = config.title.split('|')[0].trim();
        const dek = config.description;
        const date = config.structuredData?.datePublished || '2025-01-01';
        
        // Try to get category from html header if possible, else default
        let category = 'Engineering';
        
        const contentPath = path.join(__dirname, '..', config.content);
        if (fs.existsSync(contentPath)) {
            const html = fs.readFileSync(contentPath, 'utf8');
            
            // Try to extract category from the header badge
            const catMatch = html.match(/<span[^>]*bg-accent\/10[^>]*>([^<]+)<\/span>/);
            if (catMatch) category = catMatch[1].trim();
            
            // Extract the prose content
            // Assuming it's inside <div class="prose ..."> ... </div>
            const proseStart = html.indexOf('<div class="prose');
            if (proseStart !== -1) {
                // Find the first > after proseStart
                const contentStart = html.indexOf('>', proseStart) + 1;
                
                // We need to find the matching closing div for the prose div.
                // Simple approach: find the last </div> before </article> or </main>
                // A better approach since these files are simple: just grab everything until </article> and remove the last </div>
                const articleEnd = html.indexOf('</article>');
                let content = html.substring(contentStart, articleEnd).trim();
                if (content.endsWith('</div>')) {
                    content = content.substring(0, content.length - 6).trim();
                }
                
                // Strip all class and style attributes to make it pure semantic HTML
                // (except we might want to keep the lucide icons? The design says pure semantic HTML, so we might just remove icons or leave them. Let's strip classes from typical text elements)
                content = content.replace(/<(p|h2|h3|h4|ul|ol|li|blockquote|pre|code|a|div|span)([^>]*)class="[^"]*"([^>]*)>/gi, '<$1$2$3>');
                content = content.replace(/<(p|h2|h3|h4|ul|ol|li|blockquote|pre|code|a|div|span)([^>]*)class='[^']*'([^>]*)>/gi, '<$1$2$3>');
                
                // Clean up empty tags or lucide icons if they look broken without classes
                content = content.replace(/<i[^>]*data-lucide[^>]*><\/i>/gi, '');
                
                // First <p> needs drop-cap class according to spec: "| First <p> | `.drop-cap` utility"
                content = content.replace(/<p>/, '<p class="drop-cap">');

                posts.push({
                    slug,
                    title,
                    dek,
                    date,
                    category,
                    readMinutes: 5, // Estimate
                    cover: null, // The design says (optional)
                    body: content
                });
            }
        }
    }
});

const outputPath = path.join(__dirname, '..', 'data', 'posts.json');
fs.writeFileSync(outputPath, JSON.stringify({ posts }, null, 2));
console.log(`Extracted ${posts.length} posts to data/posts.json`);
