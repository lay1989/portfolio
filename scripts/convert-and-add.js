const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertAndAdd() {
  const imagesToConvert = [
    {
      src: path.join(__dirname, '../public/images/Ghermar & Sons - services.png'),
      dest: path.join(__dirname, '../public/images/Ghermar & Sons - services.webp'),
      projectId: 1,
      relPath: './public/images/Ghermar & Sons - services.webp'
    },
    {
      src: path.join(__dirname, '../public/images/SwiftBuild 3.png'),
      dest: path.join(__dirname, '../public/images/SwiftBuild 3.webp'),
      projectId: 2,
      relPath: './public/images/SwiftBuild 3.webp'
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

  // Update projects.json
  const projectsPath = path.join(__dirname, '../data/projects.json');
  if (fs.existsSync(projectsPath)) {
    const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    data.projects = data.projects.map(project => {
      const match = imagesToConvert.find(img => img.projectId === project.id);
      if (match) {
        if (!project.screenshots) {
          project.screenshots = [];
        }
        if (!project.screenshots.includes(match.relPath)) {
          project.screenshots.push(match.relPath);
          console.log(`Added ${match.relPath} to project ${project.title}`);
        }
      }
      return project;
    });
    fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2));
    console.log('Updated projects.json');
  } else {
    console.error('projects.json not found');
  }
}

convertAndAdd().catch(err => {
  console.error('Error:', err);
});
