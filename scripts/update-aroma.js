const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '../data/projects.json');
const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

const aromaUpdate = {
  shortDesc: "A fully functional, API-driven cafe concept website built to showcase advanced UI/UX architecture and seamless third-party service integration.",
  overview: "Aroma Cafe is a conceptual web application engineered to demonstrate high-level technical proficiency in the hospitality sector. By integrating mock reservation APIs and dynamic location services, this showcase proves how a meticulously designed frontend can seamlessly harmonize with complex backend services to create a premium, frictionless user experience.",
  challenge: "Restaurant websites frequently struggle to balance aesthetic branding with practical functionality. The objective of this showcase was to architect an interactive, API-driven booking flow that maintains a warm, artisanal visual identity without causing cognitive friction during the reservation process.",
  solution: "Engineered a conversion-focused frontend architecture utilizing custom design tokens for a consistent thematic experience. Integrated location mapping and developed a fluid, interactive menu filtering system. The resulting concept serves as a technical blueprint for high-performing hospitality web platforms.",
  process: [
    "UX Research & Strategy: Analyzed leading hospitality platforms to reverse-engineer optimal booking flows and menu navigation.",
    "Design System Architecture: Developed a comprehensive library of responsive UI components reflecting a warm, artisanal coffee shop aesthetic.",
    "API Integration Showcase: Implemented dynamic mockups for mapping and table reservations to demonstrate complex data handling capabilities.",
    "Interactive Frontend Engineering: Built a highly performant, filterable menu system utilizing fluid CSS transitions for instantaneous user feedback.",
    "Technical SEO Foundation: Structured semantic HTML and meta tags to simulate best practices for local search visibility."
  ],
  budget: "Personal Showcase",
  clientType: "Personal Portfolio Concept",
  metrics: {
    "Lighthouse Score": "98/100",
    "Core Web Vitals": "Passed",
    "API Integrations": "3"
  },
  results: "Successfully developed a high-fidelity conceptual application that rigorously demonstrates advanced API integration, responsive component architecture, and conversion-optimized UX design.",
  testimonial: null
};

data.projects = data.projects.map(project => {
  if (project.id === 5) {
    return { ...project, ...aromaUpdate };
  }
  return project;
});

fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2));
console.log('Successfully updated Aroma Cafe in projects.json');
