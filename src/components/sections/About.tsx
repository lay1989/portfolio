import { Section } from "../ui/Section";

export function About() {
  return (
    <Section id="about">
      <div className="grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <h2 className="text-xl font-medium text-muted-foreground sticky top-24">About Me</h2>
        </div>
        <div className="md:col-span-8 space-y-8">
          <h3 className="text-3xl md:text-5xl font-display leading-tight">
            I help brands and businesses stand out in the digital era. Together we will set the new status quo.
          </h3>
          
          <div className="prose prose-invert prose-lg text-muted-foreground">
            <p>
              I'm a passionate freelance web developer with over 5 years of experience creating custom digital solutions for small businesses and entrepreneurs. My mission is to help businesses establish a strong online presence that drives growth and success.
            </p>
            <p>
              I combine technical expertise with design sensibilities to create unique products. I focus on performance, accessibility, and user experience to ensure that your audience has the best possible interaction with your brand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
            <div>
              <h4 className="text-white font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Web Development</li>
                <li>UI/UX Design</li>
                <li>E-Commerce</li>
                <li>Technical Strategy</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Tech Stack</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>React & Next.js</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Node.js</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
