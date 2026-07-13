const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/SHREE/Desktop/portfolio';
const files = [
  'blog-custom-websites.html',
  'blog-freelance-developer.html',
  'blog-javascript-frameworks.html',
  'blog-performance-optimization.html',
  'blog-responsive-design.html',
  'blog-seo-developers.html'
];

for (const file of files) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace transitions
    content = content.replace(
      /class="text-accent hover:text-primary transition-colors"/g,
      'class="text-accent hover:text-primary transition-all duration-300 ease-out-expo"'
    );
    
    content = content.replace(
      /class="text-accent hover:text-primary transition-colors font-medium"/g,
      'class="text-accent hover:text-primary transition-all duration-300 ease-out-expo font-medium"'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated transitions in ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
