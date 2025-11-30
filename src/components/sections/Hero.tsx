import { motion } from "framer-motion";
import texture from "@assets/generated_images/dark_abstract_noise_texture_for_website_background.png";
import { ArrowDownRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Texture */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url(${texture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="container mx-auto px-6 z-10 relative">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Available for New Projects
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] tracking-tighter mb-8"
          >
            Design. Code. <br />
            <span className="text-muted-foreground">Impact.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
          >
            I'm Lay Shah, a Full Stack Developer crafting sophisticated digital experiences. 
            I turn complex problems into simple, beautiful, and performant web solutions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <a
              href="#work"
              className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-accent hover:text-white transition-all duration-300"
            >
              View Projects
              <ArrowDownRight className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
            </a>
            <a
              href="#contact"
              className="px-8 py-4 border border-white/20 rounded-full font-medium hover:bg-white/5 transition-all"
            >
              Contact Me
            </a>
          </motion.div>
        </div>
      </div>

      {/* Decorative Gradient Blob */}
      <div className="absolute right-0 top-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
}
