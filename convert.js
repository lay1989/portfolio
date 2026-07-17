const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'public', 'images');
const images = [
  'ASH clipping - hero.png',
  'ASH clipping 2.png',
  'ASH clipping 3.png',
  'ASH clipping 4.png',
  'ASH clipping 5.png',
  'ASH clipping 6.png'
];

async function convertImages() {
  for (const file of images) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(inputDir, file.replace('.png', '.webp'));
    
    if (fs.existsSync(inputPath)) {
      try {
        await sharp(inputPath)
          .webp({ quality: 80 })
          .toFile(outputPath);
        console.log(`Converted ${file} to WebP`);
      } catch (err) {
        console.error(`Error converting ${file}:`, err);
      }
    } else {
      console.log(`File not found: ${inputPath}`);
    }
  }
}

convertImages();
