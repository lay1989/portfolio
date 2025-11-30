import { Section } from "../ui/Section";
import project1 from "@assets/generated_images/minimalist_dark_mode_website_mockup.png";
import project2 from "@assets/generated_images/modern_e-commerce_interface_mockup.png";
import project3 from "@assets/generated_images/saas_dashboard_minimal_interface.png";
import { ArrowUpRight } from "lucide-react";

const projects = [
  {
    title: "Minimal Portfolio",
    category: "Web Design & Development",
    image: project1,
    year: "2024",
    description: "A sophisticated dark-mode portfolio for a creative agency."
  },
  {
    title: "Luxe Commerce",
    category: "E-Commerce Platform",
    image: project2,
    year: "2024",
    description: "High-end fashion e-commerce experience with seamless checkout."
  },
  {
    title: "Analytics Dashboard",
    category: "SaaS Application",
    image: project3,
    year: "2023",
    description: "Data visualization platform for enterprise metrics tracking."
  }
];

export function Projects() {
  return (
    <Section id="work">
      <div className="mb-16 md:mb-24">
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Selected Work</h2>
        <p className="text-muted-foreground text-lg">A collection of recent projects and case studies.</p>
      </div>

      <div className="space-y-20 md:space-y-32">
        {projects.map((project, index) => (
          <div key={index} className="group block">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div className={`order-2 ${index % 2 === 1 ? 'md:order-1' : 'md:order-2'}`}>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full aspect-video object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>
              
              <div className={`order-1 ${index % 2 === 1 ? 'md:order-2' : 'md:order-1'}`}>
                <span className="text-accent text-sm font-medium mb-4 block">{project.category} — {project.year}</span>
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-6 group-hover:text-white/80 transition-colors">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  {project.description}
                </p>
                <button className="flex items-center gap-2 text-white font-medium border-b border-white/30 pb-1 group-hover:border-accent group-hover:text-accent transition-all">
                  View Case Study <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
