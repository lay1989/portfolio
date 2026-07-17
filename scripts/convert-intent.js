const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertImages() {
  const images = [
    'Intent-studio - hero.png',
    'Intent-studio 1.png',
    'Intent-studio 2.png',
    'Intent-studio 3.png'
  ];
  
  for (const file of images) {
    const srcPath = path.join(__dirname, '../public/images', file);
    const destPath = path.join(__dirname, '../public/images', file.replace('.png', '.webp'));
    
    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .webp({ quality: 85 })
        .toFile(destPath);
      console.log(`Converted ${file} to WebP.`);
    } else {
      console.log(`File not found: ${srcPath}`);
    }
  }
}

convertImages().catch(console.error);
