const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const rootDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content, { decodeEntities: false });

    // 27. Canonical Standardization
    const canonical = $('link[rel="canonical"]');
    if (canonical.length) {
        let href = canonical.attr('href');
        if (href && !href.endsWith('/')) {
            canonical.attr('href', href + '/'); // standardise with trailing slash
        }
    } else {
        $('head').append(`\n    <link rel="canonical" href="https://layshahdev.com/${file}/">\n`);
    }

    // 30. Alt Attributes
    $('img').each((i, el) => {
        if (!$(el).attr('alt') || $(el).attr('alt').trim() === '') {
            $(el).attr('alt', 'Lay Shah Portfolio Image');
        }
    });

    $('i[data-lucide]').each((i, el) => {
        $(el).attr('aria-hidden', 'true');
    });

    // If it's a blog post
    if (file.startsWith('blog-') && file !== 'blog-custom-websites.html') {
        // 26. Unique Metadata
        const titleText = $('h1').text().trim() || 'Blog Post';
        $('title').text(`${titleText} | Lay Shah`);
        $('meta[name="description"]').attr('content', `Read about ${titleText.toLowerCase()} by Lay Shah.`);
        
        // 28. OpenGraph Articles
        if ($('meta[property="og:type"]').length === 0) {
            $('head').append(`
    <!-- Social / OpenGraph -->
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${titleText} | Lay Shah" />
    <meta property="og:description" content="Read about ${titleText.toLowerCase()} by Lay Shah." />
    <meta property="og:url" content="https://layshahdev.com/${file}/" />
    <meta property="article:published_time" content="2026-06-21T00:00:00Z" />
`);
        }
    }

    // 24. Readability Constraints
    if (file.startsWith('blog-')) {
        $('.prose p, main p').addClass('max-w-prose text-balance');
    }

    fs.writeFileSync(filePath, $.html(), 'utf-8');
    console.log(`Processed SEO for ${file}`);
});
