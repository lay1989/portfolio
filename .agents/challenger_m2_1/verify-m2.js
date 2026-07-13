const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let allPassed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    allPassed = false;
  }
}

// 1. Verify index.html contains the screen-reader-only <span> with target keywords inside the <h1> tag
function verifyIndexH1Keywords() {
  console.log('\n--- 1. VERIFYING index.html H1 SCREEN-READER KEYWORDS ---');
  const indexHtmlPath = path.join(__dirname, '..', '..', 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.log(`❌ index.html not found at ${indexHtmlPath}`);
    allPassed = false;
    return;
  }

  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Find <h1> tags
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1Match = h1Regex.exec(html);

  if (!h1Match) {
    assert(false, 'No <h1> tag found in index.html');
    return;
  }

  const h1Content = h1Match[1];
  const targetSpan = '<span class="sr-only">Freelance Web Developer & Web Designer - </span>';
  
  // Normalize whitespaces for checking
  const normalizedH1 = h1Content.replace(/\s+/g, ' ');
  const normalizedTarget = targetSpan.replace(/\s+/g, ' ');

  assert(normalizedH1.includes(normalizedTarget), `H1 contains target screen-reader span: "${targetSpan}"`);
}

// 2. Verify all 7 project images in index.html have unique, descriptive alt texts
function verifyIndexProjectImages() {
  console.log('\n--- 2. VERIFYING index.html 7 PROJECT IMAGES ALT TEXTS ---');
  const indexHtmlPath = path.join(__dirname, '..', '..', 'index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Extract all <img tags
  const imgRegex = /<img\s+[^>]*>/gi;
  let match;
  const images = [];

  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    // Extract src
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    // Extract alt
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);

    images.push({
      tag: imgTag,
      src: srcMatch ? srcMatch[1] : null,
      alt: altMatch ? altMatch[1] : null
    });
  }

  // Filter for project images (starts with ./public/images/)
  const projectImages = images.filter(img => img.src && img.src.includes('/images/'));

  assert(projectImages.length === 7, `Found exactly 7 project images (got: ${projectImages.length})`);

  const seenAlts = new Set();
  
  projectImages.forEach((img, idx) => {
    console.log(`\nProject Image ${idx + 1}: src="${img.src}"`);
    assert(img.alt !== null, `Alt attribute is present`);
    if (img.alt) {
      assert(img.alt.trim().length > 15, `Alt text is descriptive (length: ${img.alt.length}, text: "${img.alt}")`);
      assert(!seenAlts.has(img.alt), `Alt text is unique: "${img.alt}"`);
      seenAlts.add(img.alt);
    }
  });
}

// 3. Verify that the dynamic renderResponsivePicture calls in project-details.html
// (Hero, Solution, and Gallery screenshots map) produce descriptive alt texts dynamically referencing ${project.title}
function verifyProjectDetailsDynamicAlts() {
  console.log('\n--- 3. VERIFYING project-details.html DYNAMIC ALT TEXTS ---');
  const projectDetailsPath = path.join(__dirname, '..', '..', 'project-details.html');
  if (!fs.existsSync(projectDetailsPath)) {
    console.log(`❌ project-details.html not found at ${projectDetailsPath}`);
    allPassed = false;
    return;
  }

  const html = fs.readFileSync(projectDetailsPath, 'utf8');

  // Find all renderResponsivePicture calls
  // We want to verify there are at least three places where it is called and they use project.title in the second argument.
  
  // Let's search for renderResponsivePicture calls using a regex
  const renderRegex = /renderResponsivePicture\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,/gi;
  let match;
  const calls = [];
  while ((match = renderRegex.exec(html)) !== null) {
    const imgExpr = match[1].trim();
    const altExpr = match[2].trim();
    
    // Ignore the function signature definition
    if (imgExpr === 'imagePath' && altExpr === 'alt') {
      continue;
    }
    
    calls.push({
      imgExpr,
      altExpr
    });
  }

  assert(calls.length >= 3, `Found at least 3 renderResponsivePicture calls (got: ${calls.length})`);

  calls.forEach((call, index) => {
    console.log(`Call ${index + 1}: renderResponsivePicture(${call.imgExpr}, ${call.altExpr}, ...)`);
    assert(call.altExpr.includes('project.title'), `Alt expression dynamically references project.title (got: "${call.altExpr}")`);
  });
}

// 4. Verify Milestone 1 regression checks pass successfully
function verifyMilestone1Regressions() {
  console.log('\n--- 4. RUNNING verify-m1.js REGRESSION CHECKS ---');
  const verifyM1Path = path.join(__dirname, '..', '..', 'verify-m1.js');
  if (!fs.existsSync(verifyM1Path)) {
    console.log(`❌ verify-m1.js not found at ${verifyM1Path}`);
    allPassed = false;
    return;
  }

  try {
    const stdout = execSync('node verify-m1.js', { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
    console.log(stdout);
    assert(true, 'verify-m1.js completed and all checks passed successfully.');
  } catch (err) {
    console.error(err.stdout || err.message);
    assert(false, 'verify-m1.js failed execution.');
  }
}

// Main execution
console.log('=== RUNNING MILESTONE 2 VERIFICATION ===');
verifyIndexH1Keywords();
verifyIndexProjectImages();
verifyProjectDetailsDynamicAlts();
verifyMilestone1Regressions();

console.log('\n======================================');
if (allPassed) {
  console.log('✅ ALL MILESTONE 2 VERIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.log('❌ SOME MILESTONE 2 VERIFICATION TESTS FAILED!');
  process.exit(1);
}
