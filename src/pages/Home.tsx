import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Projects } from "@/components/sections/Projects";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Projects />
        <Contact />
      </main>
      
      <footer className="bg-white text-black py-8 px-6 border-t border-black/10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-60">
          <p>© 2025 Lay Shah. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-accent">Twitter</a>
            <a href="#" className="hover:text-accent">LinkedIn</a>
            <a href="#" className="hover:text-accent">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
