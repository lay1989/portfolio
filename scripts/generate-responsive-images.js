const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');

if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images directory not found:', IMAGES_DIR);
    process.exit(1);
}

const files = fs.readdirSync(IMAGES_DIR);

files.forEach(async (file) => {
    // Skip already generated responsive files, directories, and hidden files
    if (file.includes('-small') || file.startsWith('.')) {
        return;
    }

    const filePath = path.join(IMAGES_DIR, file);
    if (!fs.statSync(filePath).isFile()) {
        return;
    }

    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, path.extname(file));

    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        return;
    }

    console.log(`Processing: ${file}...`);

    try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const originalWidth = metadata.width;

        // Standardize fallback format: WebP gets PNG fallback, others keep their original format or JPG
        const fallbackExt = ext === '.webp' ? '.png' : ext;

        // 1. Generate full-size alternative format
        if (ext !== '.webp') {
            await image.toFormat('webp').toFile(path.join(IMAGES_DIR, `${baseName}.webp`));
            console.log(`  -> Generated WebP: ${baseName}.webp`);
        } else {
            await image.toFormat('png').toFile(path.join(IMAGES_DIR, `${baseName}.png`));
            console.log(`  -> Generated PNG Fallback: ${baseName}.png`);
        }

        // 2. Generate small (600px width) versions for mobile devices
        const smallWidth = Math.min(600, originalWidth);
        
        // Small WebP
        await sharp(filePath)
            .resize(smallWidth)
            .toFormat('webp')
            .toFile(path.join(IMAGES_DIR, `${baseName}-small.webp`));
        console.log(`  -> Generated: ${baseName}-small.webp`);

        // Small Legacy Format (PNG/JPG)
        const format = (fallbackExt === '.png') ? 'png' : 'jpeg';
        await sharp(filePath)
            .resize(smallWidth)
            .toFormat(format)
            .toFile(path.join(IMAGES_DIR, `${baseName}-small${fallbackExt}`));
        console.log(`  -> Generated: ${baseName}-small${fallbackExt}`);

    } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
    }
});
