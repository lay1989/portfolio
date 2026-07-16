const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertImages() {
  const imagesToConvert = [
    {
      src: path.join(__dirname, '../public/images/Capital Tyres - hero.png'),
      dest: path.join(__dirname, '../public/images/Capital Tyres - hero.webp')
    },
    {
      src: path.join(__dirname, '../public/images/Capital Tyres 2.png'),
      dest: path.join(__dirname, '../public/images/Capital Tyres 2.webp')
    },
    {
      src: path.join(__dirname, '../public/images/Capital Tyres 3.png'),
      dest: path.join(__dirname, '../public/images/Capital Tyres 3.webp')
    },
    {
      src: path.join(__dirname, '../public/images/Capital Tyres 4.png'),
      dest: path.join(__dirname, '../public/images/Capital Tyres 4.webp')
    }
  ];

  for (const img of imagesToConvert) {
    if (fs.existsSync(img.src)) {
      console.log(`Converting ${img.src} to webp...`);
      await sharp(img.src)
        .webp({ quality: 85 })
        .toFile(img.dest);
      console.log(`Saved to ${img.dest}`);
    } else {
      console.error(`Source file not found: ${img.src}`);
    }
  }
}

convertImages().catch(err => {
  console.error('Error:', err);
});
