import { Section } from "../ui/Section";
import { Code2, Palette, LayoutTemplate, ArrowRight } from "lucide-react";

const services = [
  {
    icon: <Palette className="w-8 h-8 mb-4 text-accent" />,
    title: "Web Design",
    description: "Crafting visually stunning, user-centric designs that tell your brand's story and engage your audience effectively."
  },
  {
    icon: <Code2 className="w-8 h-8 mb-4 text-accent" />,
    title: "Development",
    description: "Building robust, scalable, and high-performance web applications using modern technologies like React and Node.js."
  },
  {
    icon: <LayoutTemplate className="w-8 h-8 mb-4 text-accent" />,
    title: "E-Commerce",
    description: "Creating seamless shopping experiences that convert visitors into loyal customers with secure and intuitive platforms."
  }
];

export function Services() {
  return (
    <Section id="services" className="bg-secondary/20">
      <div className="mb-16 md:mb-24 border-b border-white/10 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">What I Do</h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            Comprehensive digital solutions tailored to your business needs.
          </p>
        </div>
        <a href="#contact" className="text-accent flex items-center gap-2 hover:gap-4 transition-all">
          Start a project <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {services.map((service, index) => (
          <div 
            key={index}
            className="p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors rounded-lg group"
          >
            <div className="transform group-hover:scale-110 transition-transform duration-300 origin-left">
              {service.icon}
            </div>
            <h3 className="text-2xl font-display font-bold mb-4">{service.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
