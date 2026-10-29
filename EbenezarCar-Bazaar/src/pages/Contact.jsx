import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle } from "lucide-react";
import { submitContactMessage } from "../services/publicApi";

const Contact = () => {
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [submitStatus, setSubmitStatus] = useState({ state: "idle", message: "" });

  return (
    <div className="bg-brand-surface min-h-screen font-body relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-accent/5 rounded-[100%] blur-[120px] -z-10 pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative bg-white border-b border-brand-muted/30 pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-2 text-brand-accent font-bold tracking-[0.2em] uppercase text-xs mb-4">
            <MessageSquare size={14} /> Here to Help
          </span>
          <h1 className="font-heading text-5xl font-bold tracking-tight text-brand-primary md:text-6xl">
            Get in Touch
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 font-medium leading-relaxed">
            Looking to buy, hire, or trade in a vehicle? Our dedicated team at Ebenezar Car Bazaar is ready to assist you every step of the way.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid gap-12 lg:grid-cols-5 items-start">

          {/* Left: Contact Info (Takes up 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-heading font-bold text-brand-primary mb-8 hidden lg:block">Reach Out to Us Directly</h2>

            <div className="group rounded-[2rem] border border-brand-muted/60 bg-white p-8 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors duration-300 shadow-sm">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-brand-primary text-lg mb-1">Email Us</p>
                  <p className="text-slate-500 font-medium mb-3">Send us an email anytime. We will get back to you as soon as possible.</p>
                  <a href="mailto:info@ebenezarenterprises.com" className="text-brand-accent font-bold hover:underline">info@ebenezarenterprises.com</a>
                </div>
              </div>
            </div>

            <div className="group rounded-[2rem] border border-brand-muted/60 bg-white p-8 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-accent group-hover:bg-[#25D366] group-hover:text-white transition-colors duration-300 shadow-sm">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-brand-primary text-lg mb-1">Call or WhatsApp</p>
                  <p className="text-slate-500 font-medium mb-3">Available during regular business hours for quick response.</p>
                  <a href="tel:+254722263192" className="text-brand-accent font-bold hover:underline">+254 722 263 192<br />+254 704 287 382</a>
                </div>
              </div>
            </div>

            <div className="group rounded-[2rem] border border-brand-muted/60 bg-white p-8 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-accent group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-brand-primary text-lg mb-1">Dealership Location</p>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Come see our vehicles in person.<br />
                    <a href="https://maps.app.goo.gl/uwXf7mUBFUQb6JaF9" target="_blank" rel="noopener noreferrer" className="text-brand-primary font-bold hover:underline">Kisumu, Kenya</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Modern Form (Takes up 3 columns) */}
          <div className="lg:col-span-3 rounded-[2.5rem] border border-white/40 bg-white/70 backdrop-blur-2xl p-8 sm:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] ring-1 ring-brand-muted/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-bl-[100px] pointer-events-none"></div>

            <h2 className="text-3xl font-heading font-bold text-brand-primary mb-2">
              Send a Message
            </h2>
            <p className="text-slate-500 font-medium mb-10">
              Fill out the form below and we will get back to you as soon as possible.
            </p>

            <form
              className="space-y-6"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  setSubmitStatus({ state: "loading", message: "" });
                  await submitContactMessage({
                    name: formState.name,
                    email: formState.email,
                    message: formState.message
                  });
                  setSubmitStatus({ state: "success", message: "Message sent entirely successfully. We will reply shortly." });
                  setFormState({ name: "", email: "", message: "" });
                } catch (error) {
                  setSubmitStatus({ state: "error", message: error.message || "Unable to send message. Please try again or call us directly." });
                }
              }}
            >
              <div className="space-y-6">
                <div>
                  <label htmlFor="contactName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Full Name & Phone Number</label>
                  <input
                    id="contactName"
                    name="name"
                    type="text"
                    placeholder="Enter your full name & Phone Number"
                    className="w-full rounded-2xl border border-brand-muted/60 bg-white px-6 py-4 text-sm font-medium focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 outline-none transition-all shadow-sm"
                    value={formState.name}
                    onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="contactEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Email Address</label>
                  <input
                    id="contactEmail"
                    name="email"
                    type="email"
                    placeholder="yourname@gmail.com"
                    className="w-full rounded-2xl border border-brand-muted/60 bg-white px-6 py-4 text-sm font-medium focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 outline-none transition-all shadow-sm"
                    value={formState.email}
                    onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="contactMessage" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Your Message</label>
                  <textarea
                    id="contactMessage"
                    name="message"
                    placeholder="I am interested in..."
                    rows="5"
                    className="w-full rounded-3xl border border-brand-muted/60 bg-white px-6 py-5 text-sm font-medium focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 outline-none transition-all shadow-sm resize-none"
                    value={formState.message}
                    onChange={(event) => setFormState({ ...formState, message: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full h-16 rounded-full bg-brand-primary px-8 text-sm font-bold tracking-wide text-white transition-all hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_10px_20px_-10px_rgba(15,23,42,0.4)] hover:shadow-[0_15px_30px_-10px_rgba(15,23,42,0.6)] hover:-translate-y-1 active:translate-y-0"
                  disabled={submitStatus.state === "loading"}
                >
                  {submitStatus.state === "loading" ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      Sending...
                    </div>
                  ) : (
                    <>
                      <Send size={18} /> Send Message
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages w/ Premium Styling */}
              {submitStatus.state === "success" && (
                <div className="mt-6 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 p-5 flex items-start gap-4 text-[#1e9949] shadow-sm animate-in fade-in duration-300">
                  <CheckCircle className="shrink-0 mt-0.5 h-6 w-6" />
                  <p className="text-sm font-semibold leading-relaxed">
                    Message sent successfully! Your inquiry has been received and we will get back to you shortly.
                  </p>
                </div>
              )}
              {submitStatus.state === "error" && (
                <div className="mt-6 rounded-2xl bg-red-50 border border-red-100 p-5 text-sm font-semibold text-red-600 shadow-sm animate-in fade-in duration-300">
                  ⚠️ {submitStatus.message}
                </div>
              )}
            </form>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Contact;
