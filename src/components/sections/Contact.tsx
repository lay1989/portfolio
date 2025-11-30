import { Section } from "../ui/Section";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export function Contact() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
    toast({
      title: "Message Sent",
      description: "Thank you for reaching out. I'll get back to you shortly.",
    });
    form.reset();
  };

  return (
    <Section id="contact" className="bg-white text-black rounded-t-[3rem] mt-20 pb-20">
      <div className="pt-20">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          <div>
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 text-black">
              Let's work <br />
              <span className="text-black/50">together.</span>
            </h2>
            <p className="text-lg text-black/70 mb-12 leading-relaxed">
              I'm always interested in hearing about new projects and opportunities. 
              Whether you have a question or just want to say hi, feel free to drop me a message.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-black/80">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <a href="mailto:hello@layshah.com" className="hover:text-accent transition-colors">
                  hello@layshah.com
                </a>
              </div>
              <div className="flex items-center gap-4 text-black/80">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <a href="tel:+1234567890" className="hover:text-accent transition-colors">
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex items-center gap-4 text-black/80">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-8">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium uppercase tracking-wide text-black/50">What's your name?</label>
              <input
                {...form.register("name")}
                className="w-full bg-transparent border-b border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-colors placeholder:text-black/20"
                placeholder="John Doe"
              />
              {form.formState.errors.name && (
                <span className="text-red-500 text-sm">{form.formState.errors.name.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium uppercase tracking-wide text-black/50">What's your email?</label>
              <input
                {...form.register("email")}
                className="w-full bg-transparent border-b border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-colors placeholder:text-black/20"
                placeholder="john@example.com"
              />
              {form.formState.errors.email && (
                <span className="text-red-500 text-sm">{form.formState.errors.email.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium uppercase tracking-wide text-black/50">Tell me about your project</label>
              <textarea
                {...form.register("message")}
                rows={4}
                className="w-full bg-transparent border-b border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-colors placeholder:text-black/20 resize-none"
                placeholder="I need a website for..."
              />
              {form.formState.errors.message && (
                <span className="text-red-500 text-sm">{form.formState.errors.message.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full py-5 bg-black text-white text-lg font-medium rounded-full hover:bg-accent transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </button>
          </form>
        </div>
      </div>
    </Section>
  );
}
