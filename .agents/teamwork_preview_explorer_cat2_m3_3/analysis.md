# Implementation Strategy Report: Responsive Images & CDN Fallbacks

## 1. Executive Summary
This report presents the technical analysis and design strategy for **Milestone 3: Responsive Images & CDN Fallbacks** (Category 2, R2) for the static portfolio website. 

The strategy ensures:
1. **Optimized, Responsive Images**: Automated generation of scaled (600px width and original high-res) image variations in both next-generation WebP and legacy fallback formats. HTML layouts (static and dynamic) will use `<picture>` tags and `srcset` attributes to serve the most performant asset based on the user's viewport.
2. **CDN Resiliency & Safety**: A multi-tiered fallback architecture (unpkg -> jsdelivr -> local) for the Lucide icons library to prevent layout breakage, combined with safety guards to prevent JavaScript runtime execution crashes if external CDNs fail.
3. **Bug Resolution**: Elimination of path inconsistencies for Project 7 (TaskFlow Pro) and securing unguarded DOM rendering functions.

---

## 2. Codebase Audit & Critical Findings

### 2.1 Image Asset Inventory & Usage Mapping
An audit of `public/images/` and the HTML files shows 17 image assets with mixed usage:

| Image File | Size | Format | Usage / Role | Location in Code |
|---|---|---|---|---|
| `Ghermar & Sons.webp` | 106 KB | WebP | Hero Image (Project 1) | `index.html` line 421, `project-details.html` line 110 |
| `Ghermar & Sons 2.png` | 709 KB | PNG | Content/Gallery (Project 1) | `project-details.html` lines 163, 175 |
| `SwiftBuild.webp` | 116 KB | WebP | Hero Image (Project 2) | `index.html` line 440, `project-details.html` line 183 |
| `SwiftBuild 2.JPG` | 191 KB | JPG | Content/Gallery (Project 2) | `project-details.html` lines 238, 250 |
| `saas_dashboard_minimal_interface.png` | 876 KB | PNG | Hero & Content (Project 3) | `index.html` line 459, `project-details.html` lines 258, 313, 320 |
| `KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.png` | 850 KB | PNG | Hero Image (Project 4) | `index.html` line 478, `project-details.html` line 328 |
| `KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler Dashboard.png` | 66 KB | PNG | Content/Gallery (Project 4) | `project-details.html` lines 386, 398 |
| `Aroma Cafe.webp` | 217 KB | WebP | Hero Image (Project 5) | `index.html` line 497, `project-details.html` line 406 |
| `Aroma Cafe 2.png` | 1.36 MB | PNG | Content/Gallery (Project 5) | `project-details.html` lines 461, 473 |
| `Stark EV.webp` | 70 KB | WebP | Hero Image (Project 6) | `index.html` line 516, `project-details.html` line 481 |
| `Stark EV 2.png` | 679 KB | PNG | Content/Gallery (Project 6) | `project-details.html` lines 538, 545 |
| `modern_e-commerce_interface_mockup.png` | 666 KB | PNG | Hero Image (Project 7 - Commented out) | `index.html` line 535, `project-details.html` lines 553, 610 |
| `minimalist_dark_mode_website_mockup.png` | 768 KB | PNG | Content/Gallery (Project 7) | `project-details.html` lines 611, 623 |
| `dark_abstract_noise_texture_for_website_background.png` | 1.42 MB | PNG | Unused background texture | Unused in HTML (referenced in CSS) |
| `CAPITAL TYRES.png` | 4.83 MB | PNG | Unused original screenshot | Unused |
| `CAPITAL TYRES 2.png` | 884 KB | PNG | Unused original screenshot | Unused |
| `PS DEFENSE - Advanced Cybersecurity Solutions.webp` | 32 KB | WebP | Unused cybersecurity layout | Unused |

### 2.2 Key Findings & Vulnerabilities

1. **Format Asymmetry & Performance Waste**:
   - Four projects (*Ghermar & Sons*, *SwiftBuild*, *Aroma Cafe*, *Stark EV*) use optimized `.webp` hero images, but lack any legacy PNG/JPG fallback. Visitors using legacy browsers (e.g. older versions of Safari or IE) will experience broken layouts.
   - Conversely, projects like *Crypto Trading Analytics* and *Kamaldeep Enterprise* use heavy PNG files (800KB+) as hero images without modern WebP counterparts, creating high data load and layout shift on mobile connections.
   
2. **⚠️ Path Inconsistency Bug for Project 7 (TaskFlow Pro)**:
   - In `index.html` and `project-details.html`, the images for Project 7 are referenced as absolute-root paths:
     - `index.html` line 535: `<img src="/images/modern_e-commerce_interface_mockup.png" ...>`
     - `project-details.html` line 553: `heroImg: "/images/modern_e-commerce_interface_mockup.png"`
     - `project-details.html` lines 610, 611, 623 use `/images/...`
   - If the site is deployed inside a subdirectory (e.g. `https://domain.com/portfolio/`) or run via a local server in standard folder mode, these paths resolve incorrectly to the system root, causing broken image icons. They must be normalized to relative paths starting with `./public/images/`.

3. **⚠️ Script Crash Hazard in `project-details.html`**:
   - While `script.js` (lines 143-145) guards the Lucide icons load safely:
     ```javascript
     if (window.lucide && typeof window.lucide.createIcons === 'function') {
         window.lucide.createIcons();
     }
     ```
   - In `project-details.html` at line 908, the dynamic router calls it completely unguarded:
     ```javascript
     // Re-initialize lucide icons after content is inserted
     lucide.createIcons();
     ```
   - If the Lucide CDN fails to load, `window.lucide` remains `undefined`. When this line is hit, it will throw `Uncaught ReferenceError: lucide is not defined`, crashing execution and preventing subsequent scripts (like reveal animations re-binding) from running.

---

## 3. Recommended Implementation Strategy

### Part 1: Automated Image Optimization Pipeline
We recommend implementing a Node-based image processing build step using `sharp` to scale and encode all original assets.

1. **Add devDependency to `package.json`**:
   ```json
   "devDependencies": {
     "sharp": "^0.33.4"
   }
   ```
2. **Add Script to `package.json`**:
   ```json
   "scripts": {
     "build:images": "node scripts/generate-responsive-images.js"
   }
   ```
3. **Create `scripts/generate-responsive-images.js`**:
   This script processes only the 17 original assets, ensuring it is idempotent and safe from self-processing.
   ```javascript
   const sharp = require('sharp');
   const fs = require('fs');
   const path = require('path');

   const IMAGES_DIR = path.join(__dirname, '../public/images');

   const ORIGINAL_IMAGES = [
       'Aroma Cafe.webp',
       'Aroma Cafe 2.png',
       'CAPITAL TYRES.png',
       'CAPITAL TYRES 2.png',
       'Ghermar & Sons.webp',
       'Ghermar & Sons 2.png',
       'KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.png',
       'KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler Dashboard.png',
       'PS DEFENSE - Advanced Cybersecurity Solutions.webp',
       'Stark EV.webp',
       'Stark EV 2.png',
       'SwiftBuild.webp',
       'SwiftBuild 2.JPG',
       'dark_abstract_noise_texture_for_website_background.png',
       'minimalist_dark_mode_website_mockup.png',
       'modern_e-commerce_interface_mockup.png',
       'saas_dashboard_minimal_interface.png'
   ];

   async function processImages() {
       if (!fs.existsSync(IMAGES_DIR)) {
           console.error('Images directory not found:', IMAGES_DIR);
           process.exit(1);
       }

       console.log('Starting image optimization pipeline...');
       
       for (const file of ORIGINAL_IMAGES) {
           const filePath = path.join(IMAGES_DIR, file);
           if (!fs.existsSync(filePath)) {
               console.warn(`Skipping missing original image: ${file}`);
               continue;
           }

           const ext = path.extname(file).toLowerCase();
           const baseName = path.basename(file, path.extname(file));

           console.log(`Processing asset: ${file}...`);
           try {
               const image = sharp(filePath);
               const metadata = await image.metadata();
               const originalWidth = metadata.width;

               // Fallback formats: WebP files get PNG fallback; PNG/JPG keep their original format.
               const fallbackExt = ext === '.webp' ? '.png' : ext;
               const fallbackFormat = fallbackExt === '.png' ? 'png' : 'jpeg';

               // 1. Generate full-resolution counterparts
               if (ext !== '.webp') {
                   // Generate WebP counterpart for PNG/JPG
                   await image.clone().toFormat('webp').toFile(path.join(IMAGES_DIR, `${baseName}.webp`));
                   console.log(`  -> Generated WebP counterpart: ${baseName}.webp`);
               } else {
                   // Generate PNG counterpart for WebP
                   await image.clone().toFormat('png').toFile(path.join(IMAGES_DIR, `${baseName}.png`));
                   console.log(`  -> Generated PNG fallback: ${baseName}.png`);
               }

               // 2. Generate small (600px width) versions for mobile
               const smallWidth = Math.min(600, originalWidth);
               
               // Small WebP
               await sharp(filePath)
                   .resize(smallWidth)
                   .toFormat('webp')
                   .toFile(path.join(IMAGES_DIR, `${baseName}-small.webp`));
               console.log(`  -> Generated: ${baseName}-small.webp`);

               // Small Legacy format
               await sharp(filePath)
                   .resize(smallWidth)
                   .toFormat(fallbackFormat)
                   .toFile(path.join(IMAGES_DIR, `${baseName}-small${fallbackExt}`));
               console.log(`  -> Generated: ${baseName}-small${fallbackExt}`);

           } catch (err) {
               console.error(`Error processing ${file}:`, err.message);
           }
       }
       console.log('Image optimization pipeline complete!');
   }

   processImages().catch(err => {
       console.error('Fatal error in image optimization:', err);
       process.exit(1);
   });
   ```

---

### Part 2: HTML Integration - Static Layouts (`index.html`)
Replace all image elements in the project showcase grid of `index.html` with semantic `<picture>` tags.

#### 1. Ghermar & Sons (Project 1)
- **Before** (Line 421):
  ```html
  <img src="./public/images/Ghermar & Sons.webp" alt="Portfolio Website" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/Ghermar & Sons-small.webp 600w, ./public/images/Ghermar & Sons.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/Ghermar & Sons-small.png 600w, ./public/images/Ghermar & Sons.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/Ghermar & Sons.png" 
           alt="Ghermar & Sons Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 2. SwiftBuild Infratech (Project 2)
- **Before** (Line 440):
  ```html
  <img src="./public/images/SwiftBuild.webp" alt="swiftbuild-infratech" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/SwiftBuild-small.webp 600w, ./public/images/SwiftBuild.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/SwiftBuild-small.png 600w, ./public/images/SwiftBuild.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/SwiftBuild.png" 
           alt="SwiftBuild Infratech Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 3. Analytics Dashboard (Project 3)
- **Before** (Line 459):
  ```html
  <img src="./public/images/saas_dashboard_minimal_interface.png" alt="Crypto Dashboard" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/saas_dashboard_minimal_interface-small.webp 600w, ./public/images/saas_dashboard_minimal_interface.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/saas_dashboard_minimal_interface-small.png 600w, ./public/images/saas_dashboard_minimal_interface.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/saas_dashboard_minimal_interface.png" 
           alt="Analytics Dashboard Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 4. Kamaldeep Enterprise (Project 4)
- **Before** (Line 478):
  ```html
  <img src="./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.png" alt="Kamaldeep Enterprise - Content Management System" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler-small.webp 600w, ./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler-small.png 600w, ./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/KAMALDEEP ENTERPRISE - Premium Fabric Wholesaler.png" 
           alt="Kamaldeep Enterprise CMS Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 5. Aroma Cafe (Project 5)
- **Before** (Line 497):
  ```html
  <img src="./public/images/Aroma Cafe.webp" alt="Aesthetic Cafe Website" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/Aroma Cafe-small.webp 600w, ./public/images/Aroma Cafe.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/Aroma Cafe-small.png 600w, ./public/images/Aroma Cafe.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/Aroma Cafe.png" 
           alt="Aroma Cafe Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 6. Stark EV (Project 6)
- **Before** (Line 516):
  ```html
  <img src="./public/images/Stark EV.webp" alt="Stark EV" class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
  ```
- **After**:
  ```html
  <picture>
      <source type="image/webp" 
              srcset="./public/images/Stark EV-small.webp 600w, ./public/images/Stark EV.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/Stark EV-small.png 600w, ./public/images/Stark EV.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/Stark EV.png" 
           alt="Stark EV Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  ```

#### 7. TaskFlow Pro (Project 7 - Commented Showcase & Path Inconsistency Fix)
- **Before** (Line 535):
  ```html
  <!-- <img src="/images/modern_e-commerce_interface_mockup.png" ... -->
  ```
- **After**:
  ```html
  <!-- 
  <picture>
      <source type="image/webp" 
              srcset="./public/images/modern_e-commerce_interface_mockup-small.webp 600w, ./public/images/modern_e-commerce_interface_mockup.webp 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <source type="image/png" 
              srcset="./public/images/modern_e-commerce_interface_mockup-small.png 600w, ./public/images/modern_e-commerce_interface_mockup.png 1200w" 
              sizes="(max-width: 768px) 90vw, 45vw">
      <img src="./public/images/modern_e-commerce_interface_mockup.png" 
           alt="TaskFlow Pro Website" 
           class="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
           loading="lazy">
  </picture>
  -->
  ```

---

### Part 3: HTML Integration - Dynamic Layouts (`project-details.html`)
To handle dynamic projects, we introduce a helper javascript function and rewrite the template string generators.

1. **Normalize Project Data Paths**:
   Inside the `projects` object (lines 548-626):
   - Line 553: Change `heroImg: "/images/modern_e-commerce_interface_mockup.png"` to `heroImg: "./public/images/modern_e-commerce_interface_mockup.png"`
   - Line 610: Change `"/images/modern_e-commerce_interface_mockup.png"` to `"./public/images/modern_e-commerce_interface_mockup.png"`
   - Line 611: Change `"/images/minimalist_dark_mode_website_mockup.png"` to `"./public/images/minimalist_dark_mode_website_mockup.png"`
   - Line 623: Change `contentImg: "/images/minimalist_dark_mode_website_mockup.png"` to `contentImg: "./public/images/minimalist_dark_mode_website_mockup.png"`

2. **Add Responsive Helper Function**:
   Insert this helper method within the main script tag of `project-details.html`, directly preceding the `loadProject` declaration:
   ```javascript
   function getResponsiveImageMarkup(src, alt, className = "", sizes = "(max-width: 768px) 90vw, 896px", isPriority = false) {
       if (!src) return "";
       
       // Defensive normalization
       let path = src;
       if (src.startsWith('/images/')) {
           path = `./public/images/${src.substring(8)}`;
       }
       
       const isWebP = path.endsWith('.webp');
       const isPNG = path.endsWith('.png');
       const isJPG = path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.JPG') || path.endsWith('.JPEG');

       let base = "";
       let ext = "";
       let mimeType = "";

       if (isWebP) {
           base = path.substring(0, path.lastIndexOf('.webp'));
           ext = '.png';
           mimeType = 'image/png';
       } else if (isPNG) {
           base = path.substring(0, path.lastIndexOf('.png'));
           ext = '.png';
           mimeType = 'image/png';
       } else if (isJPG) {
           const lastDot = path.lastIndexOf('.');
           base = path.substring(0, lastDot);
           ext = path.substring(lastDot);
           mimeType = 'image/jpeg';
       } else {
           // Standard fallback for icons/unsupported types
           return `<img src="${path}" alt="${alt}" class="${className}" ${isPriority ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
       }

       const lazyAttr = isPriority ? 'fetchpriority="high"' : 'loading="lazy"';

       return `
           <picture>
               <source type="image/webp" 
                       srcset="${base}-small.webp 600w, ${base}.webp 1200w" 
                       sizes="${sizes}">
               <source type="${mimeType}" 
                       srcset="${base}-small${ext} 600w, ${base}${ext} 1200w" 
                       sizes="${sizes}">
               <img src="${base}${ext}" alt="${alt}" class="${className}" ${lazyAttr}>
           </picture>
       `;
   }
   ```

3. **Modify Template Strings**:
   - **Hero Image** (Line 667) - *Priority Load* (no lazy-loading for above-the-fold elements):
     ```javascript
     <!-- Project Hero Image -->
     <div class="rounded-xl overflow-hidden border border-border shadow-2xl mb-16 reveal">
         ${getResponsiveImageMarkup(project.heroImg, project.title, "w-full h-auto object-cover", "(max-width: 768px) 90vw, 896px", true)}
     </div>
     ```
   - **Solution Section Image** (Line 713) - *Lazy Loaded*:
     ```javascript
     ${project.contentImg ? `
         <div class="rounded-xl overflow-hidden border border-border shadow-lg">
             ${getResponsiveImageMarkup(project.contentImg, "Project Solution", "w-full h-auto object-cover", "(max-width: 768px) 90vw, 896px")}
         </div>
     ` : ''}
     ```
   - **Screenshot Gallery Grid** (Line 849) - *Lazy Loaded*:
     ```javascript
     ${project.screenshots && project.screenshots.length > 1 ? `
     <div>
         <h2 class="text-3xl md:text-4xl font-display font-bold mb-8 flex items-center gap-4">
             <i data-lucide="image" class="w-8 h-8 text-accent"></i>
             Project Gallery
         </h2>
         <div class="grid md:grid-cols-2 gap-8">
             ${project.screenshots.slice(1).map(img => `
                 <div class="rounded-xl overflow-hidden border border-border shadow-lg">
                     ${getResponsiveImageMarkup(img, "Project Screenshot", "w-full h-auto object-cover hover:scale-105 transition-transform duration-300", "(max-width: 768px) 90vw, 440px")}
                 </div>
             `).join('')}
         </div>
     </div>
     ` : ''}
     ```

---

### Part 4: Lucide Script Fallback Architecture
To make the site resilient to CDN outages, we recommend a secondary CDN fallback chain, a local copy fallback, and safety guards.

1. **Local Assets Setup**:
   Add `lucide` to `dependencies` in `package.json` to allow fetching of source bundles.
   Create `scripts/copy-lucide.js` to automatically extract the compiled minified UMD file into the public assets folder:
   ```javascript
   const fs = require('fs');
   const path = require('path');

   const src = path.join(__dirname, '../node_modules/lucide/dist/umd/lucide.min.js');
   const destDir = path.join(__dirname, '../public/js');
   const dest = path.join(destDir, 'lucide.min.js');

   try {
       if (!fs.existsSync(destDir)) {
           fs.mkdirSync(destDir, { recursive: true });
       }
       if (fs.existsSync(src)) {
           fs.copyFileSync(src, dest);
           console.log('Successfully copied Lucide vendor script to public/js/lucide.min.js');
       } else {
           console.error('Error: Lucide source script not found. Run "npm install" first.');
       }
   } catch (err) {
       console.error('Failed to copy Lucide script:', err.message);
   }
   ```
   Add a postinstall trigger in `package.json`:
   ```json
   "scripts": {
     "postinstall": "node scripts/copy-lucide.js"
   }
   ```

2. **Sync CDN & Fallback Scripts in Header**:
   Replace the single script inclusion tag `<script src="https://unpkg.com/lucide@latest"></script>` in **all 9 HTML pages** with the following synchronous fallback stack:
   ```html
   <!-- Primary Icons CDN: unpkg -->
   <script src="https://unpkg.com/lucide@latest"></script>
   
   <!-- Fallback Icons CDN: jsdelivr (if unpkg is offline) -->
   <script>
       if (!window.lucide) {
           console.warn('Primary CDN (unpkg) failed to load Lucide. Loading from secondary CDN (jsdelivr)...');
           document.write('<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"><\/script>');
       }
   </script>
   
   <!-- Local Fallback: public/js (if both CDNs are offline) -->
   <script>
       if (!window.lucide) {
           console.warn('Secondary CDN (jsdelivr) failed to load Lucide. Loading local script...');
           document.write('<script src="./public/js/lucide.min.js"><\/script>');
       }
   </script>
   ```

3. **Secure the Dynamically Initialized Icons in `project-details.html`**:
   Refactor line 908 in `project-details.html` to add a safety check, preventing script crash when icons fail to load:
   ```javascript
   // Re-initialize lucide icons safely after content is inserted
   if (window.lucide && typeof window.lucide.createIcons === 'function') {
       window.lucide.createIcons();
   }
   ```

---

## 4. Verification Method

### 4.1 Automated Image Generation Validation
1. Run `npm install` to install dependencies and execute the UMD copying process.
2. Run `npm run build:images`.
3. Check `public/images/` and verify that for every original asset, there is a `-small.webp` and `-small.[png|jpg]` file, as well as an alternate resolution format.

### 4.2 Local Server & Visual Verification
1. Start the local server:
   ```bash
   python -m http.server 8000
   ```
2. Navigate to `http://localhost:8000` and visually inspect the home page. Shrink and stretch the browser to confirm that the project showcase images resize smoothly without breaking layouts.
3. Open `project-details.html?id=1` (and other IDs) to verify that hero images, solution images, and screenshots load correctly.

### 4.3 CDN Outage Simulation
1. Open the website in Google Chrome.
2. Open DevTools (F12) -> Click the three dots -> **More tools** -> **Network Request Blocking**.
3. Enable request blocking and add the following patterns:
   - `*unpkg.com*`
   - `*jsdelivr.net*`
4. Reload the page.
5. **Verify**:
   - Check the console logs: there should be warning logs indicating unpkg and jsdelivr failed to load, and that the local script was loaded.
   - Check the network tab: `lucide.min.js` should show a successful status load from `http://localhost:8000/public/js/lucide.min.js`.
   - Inspect the website: all Lucide icons (nav menu, services, footer, social links) must render and display perfectly.
