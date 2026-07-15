const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, '..', 'data', 'posts.json');
const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

postsData.posts.forEach(post => {
    // Remove the previously incorrectly added drop-cap if it exists
    post.body = post.body.replace(/<p class="drop-cap">/g, '<p>');
    // Add drop cap to the very first <p> or <p >
    post.body = post.body.replace(/<p(\s*[^>]*)>/, '<p class="drop-cap"$1>');
});

fs.writeFileSync(postsPath, JSON.stringify(postsData, null, 2));
console.log('Fixed drop-caps in posts.json');
