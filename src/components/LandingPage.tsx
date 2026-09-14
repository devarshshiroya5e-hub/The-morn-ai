import React, { useState } from 'react';
import { Sparkles, BrainCircuit, Rocket, Code2, ArrowRight, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white/5 border border-indigo-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] transition-shadow duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-bold text-lg text-white"
      >
        {question}
        {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-indigo-400" />}
      </button>
      {isOpen && <p className="mt-4 text-slate-200 leading-relaxed">{answer}</p>}
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans']">
      
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-20"
      >
        <source src="https://player.vimeo.com/external/467819973.sd.mp4?s=18c505f039d5e317cc773e34b82d334057868846&profile_id=165&oauth2_token_id=57447761" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950 z-0" />

      {/* Floating Navbar */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4">
        <nav className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span className="text-xl font-bold tracking-tight">SOLVEARN</span>
          </div>
          <button 
            onClick={() => onOpenAuth('login')}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-sm font-semibold transition-all duration-300"
          >
            Log In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center [perspective:1000px]">
        <div className="max-w-3xl space-y-6 [transform-style:preserve-3d]">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight translate-z-20">
            Find your <span className="text-indigo-400">Team Members</span> and Grow your <span className="text-indigo-400">Startup Idea</span>
          </h1>
          <button 
            onClick={() => onOpenAuth('signup')}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-lg font-bold rounded-full shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-105 translate-z-20"
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-6 [perspective:1000px]">
        {[
          { icon: BrainCircuit, title: 'Work on cool projects', desc: 'We will match you to cool projects where you can make a real impact.' },
          { icon: Rocket, title: 'Find your dream team', desc: 'Unique AI Matching system to find the perfect talent.' },
          { icon: Code2, title: 'Bring your ideas to life', desc: 'We will find the right person for your project job.' },
        ].map((feat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4 [transform-style:preserve-3d] translate-z-10 hover:translate-z-20 transition-transform duration-300">
            <feat.icon className="w-10 h-10 text-indigo-400" />
            <h3 className="text-xl font-bold">{feat.title}</h3>
            <p className="text-slate-400">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-3xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
        <FAQItem question="How fast can I find a team?" answer="Typically within a few days using our AI matching system." />
        <FAQItem question="How does the matching work?" answer="We analyze your project needs and match you with talent based on skills, experience, and working style." />
      </section>
      
      {/* Footer / Join */}
      <section className="py-20 text-center space-y-6">
        <h2 className="text-4xl font-bold">Ready to join us?</h2>
        <button 
          onClick={() => onOpenAuth('signup')}
          className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-full shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105"
        >
          Sign Up
        </button>
      </section>
    </div>
  );
};
