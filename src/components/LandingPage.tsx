import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Rocket, UsersRound, Target, BriefcaseBusiness, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, Zap, Bot, BarChart3 } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

const features = [
  { icon: BrainCircuit, title: 'AI Co-Founder', desc: 'Use your startup context to get strategy, priorities, decisions and next actions without starting every conversation from zero.' },
  { icon: Target, title: 'Living Roadmap', desc: 'Turn goals into milestones, tasks and priorities that evolve with your startup instead of sitting in a forgotten document.' },
  { icon: UsersRound, title: 'Build the Right Team', desc: 'Find people by skills, goals and startup needs, then connect work to the roles your company actually requires.' },
  { icon: BriefcaseBusiness, title: 'Execution Workspace', desc: 'Keep startup memory, work, appointments, people and progress in one operating layer built around the company.' },
];

const steps = [
  ['01', 'Create your startup context', 'Tell MornAI what you are building, where you are today and what matters next.'],
  ['02', 'Let the AI organize the work', 'Your context becomes a living strategy, roadmap and set of actionable priorities.'],
  ['03', 'Bring in the right humans', 'Discover talent and connect skills to the problems your startup needs solved.'],
];

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div layout className="mornai-glass-card overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-5 text-left">
        <span className="font-bold text-slate-900">{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-indigo-600" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-5 pb-5 text-sm leading-6 text-slate-500">{answer}</motion.p>}
      </AnimatePresence>
    </motion.div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fafc] font-['Plus_Jakarta_Sans'] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,.10),transparent_28%),radial-gradient(circle_at_90%_25%,rgba(14,165,233,.08),transparent_30%),linear-gradient(to_bottom,#f8fafc,#ffffff_45%,#f8fafc)]" />

      <header className="fixed left-0 right-0 top-4 z-50 px-4">
        <motion.nav initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto flex max-w-6xl items-center justify-between mornai-glass-nav rounded-full px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <motion.span animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 5, repeat: Infinity }} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </motion.span>
            <div>
              <b className="text-lg tracking-tight text-slate-950">MORN<span className="text-indigo-600">AI</span></b>
              <p className="hidden text-[9px] font-bold uppercase tracking-[.18em] text-slate-400 sm:block">Startup operating platform</p>
            </div>
          </div>
          <div className="hidden items-center gap-7 text-xs font-semibold text-slate-500 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Platform</a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">How it works</a>
            <a href="#faq" className="transition-colors hover:text-slate-900">FAQ</a>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .98 }} onClick={() => onOpenAuth('login')} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">Log in</motion.button>
        </motion.nav>
      </header>

      <main className="relative z-10">
        <section className="px-5 pb-20 pt-36 text-center sm:px-8 sm:pt-44">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className="mx-auto max-w-5xl">
            <span className="mornai-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-indigo-700"><Bot className="h-4 w-4" /> Your startup gets an AI operating layer</span>
            <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .65 }} className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-[-.04em] text-slate-950 sm:text-6xl md:text-7xl">
              Build the company.<br /><span className="text-indigo-600">Keep the context.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22 }} className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-500 sm:text-lg">
              MornAI combines an AI Co-Founder, startup memory, living roadmaps, execution tools and human talent discovery in one workspace designed around your company.
            </motion.p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: .98 }} onClick={() => onOpenAuth('signup')} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-slate-300/50 transition-colors hover:bg-indigo-700">
                Start building <ArrowRight className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ y: -2 }} onClick={() => onOpenAuth('login')} className="mornai-glass-button rounded-full px-7 py-4 text-sm font-bold text-slate-700 hover:text-indigo-700">
                I already have an account
              </motion.button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 35, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .35, duration: .7 }} className="mx-auto mt-16 max-w-5xl mornai-glass-panel rounded-[30px] p-3">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/></div>
                <span className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Startup command center</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: BrainCircuit, label: 'AI Co-Founder', value: '12 active decisions' },
                  { icon: Target, label: 'Roadmap', value: '8 milestones in motion' },
                  { icon: UsersRound, label: 'Talent', value: '24 relevant people' },
                ].map((item, i) => { const Icon = item.icon; return <motion.div key={item.label} animate={{ y: [0, i % 2 ? -4 : 4, 0] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5"/></span><p className="mt-5 text-xs font-semibold text-slate-400">{item.label}</p><b className="mt-1 block text-base text-slate-900">{item.value}</b></motion.div>; })}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">What MornAI does</span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">One system for the messy middle between idea and company.</h2>
              <p className="mt-4 leading-7 text-slate-500">Instead of scattering strategy across chats, task managers and spreadsheets, MornAI keeps the company context connected to decisions, people and execution.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {features.map((feature, i) => { const Icon = feature.icon; return <motion.div key={feature.title} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: i * .06 }} whileHover={{ y: -5 }} className="mornai-glass-card rounded-[26px] p-7 shadow-sm transition-shadow hover:shadow-xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="h-6 w-6"/></span><h3 className="mt-6 text-xl font-extrabold text-slate-950">{feature.title}</h3><p className="mt-3 leading-7 text-slate-500">{feature.desc}</p></motion.div>; })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">How it works</span><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">From context to coordinated action.</h2></div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500"/> Built around your startup context</div>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map(([num, title, text], i) => <motion.div key={num} whileHover={{ y: -5 }} className="mornai-glass-card relative rounded-[26px] p-7"><span className="text-xs font-black tracking-[.2em] text-indigo-600">{num}</span><h3 className="mt-5 text-xl font-extrabold text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-500">{text}</p>{i < steps.length - 1 && <span className="absolute right-[-18px] top-1/2 hidden h-px w-9 bg-slate-200 md:block"/>}</motion.div>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {[
              [Zap, 'AI-first', 'Your startup context becomes useful input for planning, decisions and execution.'],
              [BarChart3, 'Progress-aware', 'Roadmaps and work can evolve as your startup changes instead of staying static.'],
              [UsersRound, 'Human + AI', 'AI handles context and coordination while real people contribute real skills.'],
            ].map(([Icon, title, text]) => <motion.div key={title as string} whileInView={{ opacity: [0, 1], y: [18, 0] }} viewport={{ once: true }} transition={{ duration: .5 }} className="mornai-glass-card rounded-2xl p-6 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Icon className="h-5 w-5"/></span><b className="mt-5 block text-lg text-slate-950">{title as string}</b><p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p></motion.div>)}
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center"><span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">FAQ</span><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">Questions founders usually ask.</h2></div>
            <div className="mt-10 space-y-3">
              <FAQItem question="What is MornAI?" answer="MornAI is a startup operating platform that combines persistent startup context, AI strategy, roadmaps, work coordination and talent discovery." />
              <FAQItem question="Is it only an AI chatbot?" answer="No. The goal is to connect the AI with startup memory, decisions, roadmap items, people and execution rather than keeping everything inside a chat window." />
              <FAQItem question="Who is it for?" answer="It is designed for founders and startup builders who need help turning an idea or growing company into coordinated work with the right people." />
              <FAQItem question="Can human team members join?" answer="Yes. Talent can create a profile, add skills and discover startups or opportunities that match the kind of work they want to do." />
            </div>
          </div>
        </section>

        <section className="px-5 py-24 text-center sm:px-8">
          <motion.div initial={{ opacity: 0, scale: .97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="mornai-glow-card mx-auto max-w-4xl rounded-[34px] bg-white/55 p-10 shadow-xl shadow-indigo-100/50 backdrop-blur-xl sm:p-14">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Your startup has enough tabs open.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-500">Give the work one operating layer that remembers the company, organizes the next move and helps you find the people to execute it.</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .98 }} onClick={() => onOpenAuth('signup')} className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white hover:bg-indigo-700">Create your MornAI workspace <ArrowRight className="h-4 w-4"/></motion.button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/55 px-5 py-8 text-xs text-slate-500 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div><b className="text-slate-800">MORN<span className="text-indigo-600">AI</span></b><span className="ml-2">AI startup operating platform</span></div>
          <button onClick={() => onOpenAuth('login')} className="font-semibold text-slate-500 hover:text-indigo-600">Log in</button>
        </div>
      </footer>
    </div>
  );
};
