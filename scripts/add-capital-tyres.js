const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '../data/projects.json');
const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

// Determine the max ID to assign a new unique ID
const maxId = Math.max(...data.projects.map(p => p.id));

const capitalTyres = {
  id: maxId + 1,
  slug: "capital-tyres",
  title: "Capital Tyres",
  category: "Local Business Web Design",
  year: "2026",
  shortDesc: "High-converting local business website for a Pune tyre retreading company. Designed to build trust with fleet owners and dominate local search rankings.",
  heroImg: "./public/images/Capital Tyres - hero.webp",
  role: "Lead Designer & Developer",
  timeline: "10 Days",
  tools: "HTML5, CSS3, JavaScript, Tailwind CSS",
  budget: "Undisclosed",
  clientType: "Tyre Retreading (B2B & B2C)",
  liveUrl: "#",
  githubUrl: null,
  overview: "Since 1994, Capital Tyres has been a trusted name in tyre retreading across Pune and Raigad. However, their digital presence didn't match their decades of authority. We built a fast, trustworthy, and locally SEO-optimized website engineered specifically to attract fleet owners and heavy-machinery contractors.",
  challenge: "Local B2B contractors make split-second decisions based on trust and clarity. The challenge was digitizing a 30-year legacy into a clean, mobile-first experience that clearly differentiates hot vs. cold retreading while prominently featuring real client testimonials.",
  solution: "Delivered a lightning-fast, 5-page static website heavily focused on social proof and educational value. By integrating a dedicated 'Tyre Tips' section and structuring the site for local SEO, we created a digital asset that actively generates local B2B leads.",
  process: [
    "Local SEO Strategy: Mapped search intent for Pune and Raigad regions to capture high-value fleet contractors.",
    "Trust Architecture: Strategically placed real client testimonials and 30-year legacy signals above the fold to maximize conversion rates.",
    "Educational Content Design: Developed a highly scannable 'Tyre Tips' section to establish industry authority and provide immediate customer value.",
    "Performance Engineering: Built a pristine, bloat-free architecture using HTML5 and Tailwind CSS, achieving a 95+ Lighthouse mobile score.",
    "Rapid Deployment: Designed, developed, and deployed the entire ecosystem within a strict 10-day sprint, ready for custom domain integration."
  ],
  technologies: {
    frontend: [
      "HTML5",
      "CSS3",
      "JavaScript",
      "Tailwind CSS"
    ],
    seo: [
      "Local SEO Optimization",
      "Semantic HTML",
      "Fast Loading Architecture"
    ]
  },
  keyFeatures: [
    "Mobile-first responsive architecture",
    "Prominent real client testimonials",
    "Clear hot vs. cold retreading breakdowns",
    "Educational 'Tyre Tips' value section",
    "Local SEO optimization for Pune & Raigad",
    "Sub-second page load speeds"
  ],
  results: "The client immediately approved the design with minimal revisions. The site successfully establishes trust, educates visitors on retreading processes, and was fully designed, built, and ready for deployment within a highly accelerated 10-day timeline.",
  metrics: {
    "Lighthouse (Mobile)": "95",
    "Delivery Time": "10 Days",
    "Target Region": "Pune & Raigad"
  },
  screenshots: [
    "./public/images/Capital Tyres - hero.webp",
    "./public/images/Capital Tyres 3.webp",
    "./public/images/Capital Tyres 2.webp",
    "./public/images/Capital Tyres 4.webp"
  ],
  testimonial: null,
  lessonsLearned: "Local businesses with long-standing reputations benefit massively from digital platforms that simply get out of the way and let their authority speak. Speed, clarity, and social proof are the ultimate conversion drivers in local B2B markets.",
  contentImg: "./public/images/Capital Tyres 3.webp",
  websiteUrl: "#"
};

// Add to the front of the array
data.projects.unshift(capitalTyres);

fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2));
console.log('Successfully added Capital Tyres to projects.json');
