const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '../data/projects.json');
const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

const updates = {
  1: {
    shortDesc: "High-converting B2B landing page for an international import-export company. Optimized for speed, trust signals, and lead generation in the global supply chain.",
    overview: "Ghermar & Sons needed a digital presence that matched their global scale. This high-performance landing page bridges the gap between modern design aesthetics and B2B conversion optimization. By radically reducing friction and highlighting core trust signals, the site transforms casual visitors into qualified international inquiries.",
    challenge: "Legacy B2B websites often drown in bloat. The challenge was to architect a single-page experience that conveyed decades of global trade authority instantly, without sacrificing load speed or distracting the user from the primary conversion goal.",
    process: [
      "Market Intelligence: Audited top-tier global supply chain competitors to identify trust gaps and UX opportunities.",
      "Information Architecture: Designed a frictionless, single-page flow engineered specifically for high-intent B2B buyers.",
      "UI/UX Engineering: Developed a timeless visual identity using brand colors to guide eye movement toward primary conversion points.",
      "Performance Optimization: Implemented pure vanilla JavaScript animations and CSS transitions to guarantee sub-2-second load times.",
      "Conversion Tracking: Deployed custom event tracking to measure engagement and iterate on lead quality post-launch."
    ]
  },
  2: {
    shortDesc: "Premium construction portfolio website engineered with GSAP animations and advanced SEO. Built to dominate international search rankings for infrastructure.",
    overview: "To compete for international infrastructure bids, SwiftBuild Infratech required a digital platform that matched their engineering prowess. This custom portfolio integrates immersive GSAP animations with a rigorous technical SEO foundation, proving that enterprise construction websites can be both visually stunning and search-engine dominant.",
    challenge: "Outdated digital infrastructure was costing the client lucrative international bids. They needed an authoritative portfolio that could instantly validate their expertise while successfully indexing across highly competitive, multi-national search territories.",
    process: [
      "Semantic SEO Strategy: Mapped international search intent and engineered a targeted keyword architecture.",
      "Premium Design System: Created a scalable, high-end visual language that communicates engineering precision and enterprise scale.",
      "Immersive Development: Engineered buttery-smooth GSAP scroll animations to turn static case studies into interactive project tours.",
      "Technical SEO Implementation: Deployed Schema.org structured data, optimized Core Web Vitals, and established a flawless crawl architecture.",
      "Performance Validation: Conducted rigorous mobile-first testing to ensure 98+ Lighthouse scores globally."
    ]
  },
  3: {
    shortDesc: "Algorithmic cryptocurrency trading bot and data visualization dashboard. Automates complex trading strategies while providing real-time market insights.",
    overview: "Navigating volatile cryptocurrency markets requires systematic precision. This proprietary trading ecosystem combines a Python-powered algorithmic backend with an interactive D3.js analytics dashboard. It eliminates emotional trading by executing data-driven strategies in real-time, providing total transparency into portfolio performance.",
    challenge: "Manual cryptocurrency trading is hindered by emotion, latency, and information overload. The goal was to engineer an automated, emotionless system capable of parsing real-time WebSocket data, managing risk dynamically, and executing split-second trades 24/7.",
    process: [
      "Quantitative Research: Backtested historical cryptocurrency datasets to identify high-probability algorithmic trading patterns.",
      "High-Performance Backend: Architected a robust Python/Flask infrastructure leveraging Celery and Redis for zero-latency data ingestion.",
      "Algorithmic Execution: Programmed custom risk-management protocols, dynamic position sizing, and automated stop-loss mechanisms.",
      "Data Visualization: Engineered an interactive D3.js dashboard to translate complex, real-time market data into actionable visual insights.",
      "Security & Integration: Implemented strict API security protocols and JWT authentication for secure multi-exchange connectivity."
    ]
  },
  4: {
    shortDesc: "Custom Python/Flask CMS built for a premium fabric wholesaler. Digitizes complex catalog workflows, reduces update times by 80%, and drives B2B sales.",
    overview: "Kamaldeep Enterprise relied on archaic, manual processes to manage thousands of fabric SKUs. This bespoke Content Management System completely digitized their wholesale operations. By automating PDF catalog generation, image processing, and inventory management, the platform transformed a logistical nightmare into a streamlined revenue engine.",
    challenge: "Managing a massive, constantly evolving fabric catalog manually was bottlenecking B2B sales. The client urgently needed a robust, non-technical system capable of bulk-processing media and instantly synchronizing inventory updates across their entire client network.",
    process: [
      "Workflow Optimization: Audited existing manual catalog processes to design a frictionless digital alternative for non-technical staff.",
      "Database Architecture: Engineered a highly relational PostgreSQL schema capable of handling complex SKU hierarchies and metadata.",
      "Automated Processing: Built custom Python pipelines using Pillow and PyPDF2 for instant bulk image optimization and catalog generation.",
      "API Engineering: Developed a secure REST/GraphQL API layer to ensure real-time inventory synchronization.",
      "UX Implementation: Deployed a responsive, intuitive Alpine.js/Tailwind dashboard focused entirely on speed and ease of use."
    ]
  },
  5: {
    shortDesc: "Conversion-focused cafe website featuring live API-driven reservations, interactive menus, and location services to drive local foot traffic and bookings.",
    overview: "Aroma Cafe's physical ambiance wasn't reflecting their digital presence. This modern web application captures their rustic charm while ruthlessly optimizing for online reservations. By integrating live booking APIs and an interactive menu system, the site serves as a 24/7 digital concierge that actively drives revenue and local foot traffic.",
    challenge: "Converting online visitors into seated guests requires more than just aesthetics. The challenge was seamlessly merging a premium, atmospheric design with robust API integrations (reservations, mapping, weather) without causing friction in the user journey.",
    process: [
      "Conversion Strategy: Analyzed local search behavior to architect a booking flow with minimal cognitive load.",
      "Atmospheric UI Design: Translated the physical cafe's rustic aesthetic into a warm, inviting digital design token system.",
      "API Orchestration: Integrated OpenTable and Google Maps APIs to provide real-time booking availability and seamless navigation.",
      "Interactive Engineering: Built a dynamic, filterable menu system that showcases seasonal offerings with fluid CSS animations.",
      "Local SEO Optimization: Structured on-page elements and metadata to capture high-intent 'coffee near me' search traffic."
    ]
  },
  6: {
    shortDesc: "Futuristic EV showcase featuring complex micro-interactions, 3D elements, and hyper-optimized React architecture. Pushing the boundaries of modern UI/UX.",
    overview: "Stark EV is a conceptual deep-dive into the future of automotive digital interfaces. This experimental project pushes the absolute limits of modern frontend engineering, combining React, Framer Motion, and WebGL to create a hyper-immersive electric vehicle showcase. It demonstrates how complex, cinematic web experiences can still remain performant.",
    challenge: "Modern digital showrooms often sacrifice performance for visual flair. The objective was to engineer a highly complex, animation-heavy interface that feels cinematic and interactive, while rigidly maintaining 60fps performance and strict accessibility standards.",
    process: [
      "Avant-Garde Prototyping: Explored futuristic automotive UI trends to design a cinematic, dark-mode-first aesthetic in Figma.",
      "Component Engineering: Architected a modular, highly scalable React/TypeScript component library optimized for reusability.",
      "Choreographed Animation: Implemented complex, scroll-triggered GSAP and Framer Motion sequences to drive narrative storytelling.",
      "Performance Tuning: Relentlessly optimized render cycles, asset loading, and bundle sizes to guarantee silky-smooth 60fps interactions.",
      "Accessibility Integration: Ensured the highly visual experience remained fully navigable and compliant with modern accessibility standards."
    ]
  },
  7: {
    shortDesc: "Enterprise-grade SaaS project management platform. Features an advanced Vue.js automation engine and scalable Kubernetes infrastructure to boost team ROI.",
    overview: "TaskFlow Pro addresses the friction of modern enterprise collaboration. This comprehensive SaaS platform combines an intuitive Vue.js frontend with a powerful Python automation engine. Designed for scale, it eliminates manual workflow bottlenecks, enabling large organizations to reclaim thousands of hours and dramatically increase their operational ROI.",
    challenge: "Enterprise teams were losing countless hours to manual task management and fragmented toolchains. The mission was to architect a centralized, highly scalable platform that could automate complex workflows without overwhelming the end-user with a steep learning curve.",
    process: [
      "Enterprise Needs Analysis: Mapped complex organizational workflows to design an intuitive, scalable product architecture.",
      "Microservices Engineering: Architected a robust Python/FastAPI backend deployed on Kubernetes to guarantee enterprise-level scalability.",
      "Automation Development: Engineered a custom rules-engine capable of executing thousands of workflow automations simultaneously.",
      "Interface Optimization: Built a responsive, drag-and-drop Vue.js dashboard focused entirely on reducing time-to-action.",
      "Ecosystem Integration: Integrated crucial third-party APIs (Slack, GitHub, Jira) to create a seamless, unified command center."
    ]
  }
};

data.projects = data.projects.map(project => {
  if (updates[project.id]) {
    return { ...project, ...updates[project.id] };
  }
  return project;
});

fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2));
console.log('Successfully updated projects.json');
