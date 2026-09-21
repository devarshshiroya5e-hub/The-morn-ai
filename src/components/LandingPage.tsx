import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Rocket, UsersRound, Target, BriefcaseBusiness, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, Zap, Bot, BarChart3 } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPrivacy: () => void;
}

const features = [
  { icon: UsersRound, title: 'Find Real People', desc: 'Discover contributors, founders and startup builders by skills, goals, experience and the work they actually want to do.' },
  { icon: Target, title: 'Match the Need', desc: 'Turn an open startup problem into a clear opportunity so the right people can understand the work before they connect.' },
  { icon: BrainCircuit, title: 'Use AI as Leverage', desc: 'Let MornAI keep company context, prepare conversations, organize decisions and help you move faster after the human connection.' },
  { icon: BriefcaseBusiness, title: 'Keep the Company Together', desc: 'Store startup memory, roadmaps, appointments, people and execution in one operating layer instead of another pile of tabs.' },
];

const steps = [
  ['01', 'Describe the problem', 'Tell MornAI what your startup needs, the role you need and what success looks like.'],
  ['02', 'Meet the right people', 'Browse real contributor profiles and opportunities, compare fit, save promising people and connect.'],
  ['03', 'Let AI handle the context', 'Keep the relationship, roadmap and company memory connected after the conversation starts.'],
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

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onOpenPrivacy }) => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fafc] font-['Plus_Jakarta_Sans'] text-slate-900">
      <div className="mornai-ambient pointer-events-none fixed inset-0 -z-0" aria-hidden="true"><span className="mornai-orb mornai-orb-one" /><span className="mornai-orb mornai-orb-two" /><span className="mornai-orb mornai-orb-three" /></div>

      <header className="fixed left-0 right-0 top-4 z-50 px-4">
        <motion.nav initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto flex max-w-6xl items-center justify-between mornai-glass-nav rounded-full px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <motion.span animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity }} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </motion.span>
            <div>
              <b className="text-lg tracking-tight text-slate-950">MORN<span className="text-indigo-600">AI</span></b>
              <p className="hidden text-[9px] font-bold uppercase tracking-[.18em] text-slate-400 sm:block">Human startup network + AI operating layer</p>
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
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24 }} className="mx-auto max-w-5xl">
            <span className="mornai-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-indigo-700"><UsersRound className="h-4 w-4" /> Meet the people your startup actually needs</span>
            <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .04, duration: .28 }} className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-[-.04em] text-slate-950 sm:text-6xl md:text-7xl">
              Find the people.<br /><span className="text-indigo-600">Build the company.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .07 }} className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-500 sm:text-lg">
              MornAI connects startup owners with real people who have the skills they need, then adds an AI operating layer that keeps the context, work and relationships moving.
            </motion.p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: .98 }} onClick={() => onOpenAuth('signup')} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-slate-300/50 transition-colors hover:bg-indigo-700">
                Find your network <ArrowRight className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ y: -2 }} onClick={() => onOpenAuth('login')} className="mornai-glass-button rounded-full px-7 py-4 text-sm font-bold text-slate-700 hover:text-indigo-700">
                I already have an account
              </motion.button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 35, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .10, duration: .28 }} className="mx-auto mt-16 max-w-5xl mornai-glass-panel rounded-[30px] p-3">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/></div>
                <span className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Live startup network</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: BrainCircuit, label: 'AI Co-Founder', value: '12 active decisions' },
                  { icon: Target, label: 'Roadmap', value: '8 milestones in motion' },
                  { icon: UsersRound, label: 'Talent', value: '24 relevant people' },
                ].map((item, i) => { const Icon = item.icon; return <motion.div key={item.label} animate={{ y: [0, i % 2 ? -4 : 4, 0] }} transition={{ duration: 2.4 + i * .25, repeat: Infinity, ease: 'easeInOut' }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5"/></span><p className="mt-5 text-xs font-semibold text-slate-400">{item.label}</p><b className="mt-1 block text-base text-slate-900">{item.value}</b></motion.div>; })}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">The MornAI loop</span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">People first. Context second. AI everywhere it helps.</h2>
              <p className="mt-4 leading-7 text-slate-500">Instead of treating networking as a directory and AI as a chatbot, MornAI connects the human relationship to the actual startup problem, then keeps the context useful after the introduction.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {features.map((feature, i) => { const Icon = feature.icon; return <motion.div key={feature.title} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: i * .06 }} whileHover={{ y: -5 }} className="mornai-glass-card rounded-[26px] p-7 shadow-sm transition-shadow hover:shadow-xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="h-6 w-6"/></span><h3 className="mt-6 text-xl font-extrabold text-slate-950">{feature.title}</h3><p className="mt-3 leading-7 text-slate-500">{feature.desc}</p></motion.div>; })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">How it works</span><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">From startup need to real contribution.</h2></div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500"/> Human relationships, connected to company context</div>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map(([num, title, text], i) => <motion.div key={num} whileHover={{ y: -5 }} className="mornai-glass-card relative rounded-[26px] p-7"><span className="text-xs font-black tracking-[.2em] text-indigo-600">{num}</span><h3 className="mt-5 text-xl font-extrabold text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-500">{text}</p>{i < steps.length - 1 && <span className="absolute right-[-18px] top-1/2 hidden h-px w-9 bg-slate-200 md:block"/>}</motion.div>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {[
              [UsersRound, 'Human-first', 'MornAI exists to help real startup owners and real contributors find each other.'],
              [Zap, 'AI-assisted', 'AI handles context, preparation and coordination so human work starts with less friction.'],
              [BarChart3, 'Compounding context', 'Every useful conversation, role and contribution can make the next recommendation more relevant.'],
            ].map(([Icon, title, text]) => <motion.div key={title as string} whileInView={{ opacity: [0, 1], y: [18, 0] }} viewport={{ once: true }} transition={{ duration: .24 }} className="mornai-glass-card rounded-2xl p-6 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Icon className="h-5 w-5"/></span><b className="mt-5 block text-lg text-slate-950">{title as string}</b><p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p></motion.div>)}
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center"><span className="text-xs font-bold uppercase tracking-[.22em] text-indigo-600">FAQ</span><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">Questions founders usually ask.</h2></div>
            <div className="mt-10 space-y-3">
              <FAQItem question="What is MornAI?" answer="MornAI is a startup network and operating platform. Founders can find people for real startup work, while the AI layer keeps company context, planning and execution connected." />
              <FAQItem question="Is MornAI mainly for AI teams?" answer="No. The core value is the human network. AI is the leverage layer that helps founders prepare, organize and continue the work after people connect." />
              <FAQItem question="Who is it for?" answer="Founders who need skilled people, and contributors who want meaningful startup work with enough context to know what they are joining." />
              <FAQItem question="Can human team members join?" answer="Yes. Talent can create a profile, add skills and discover startups or opportunities that match the kind of work they want to do." />
            </div>
          </div>
        </section>

        <section className="px-5 py-24 text-center sm:px-8">
          <motion.div initial={{ opacity: 0, scale: .97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="mornai-glass-panel mx-auto max-w-4xl rounded-[34px] bg-white/[0.55] p-10 shadow-xl shadow-indigo-100/50 backdrop-blur-xl sm:p-14">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Your startup needs the right people, not another lonely dashboard.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-500">Use MornAI to discover the right people, organize the work and keep the context that usually disappears between the first message and the next milestone.</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .98 }} onClick={() => onOpenAuth('signup')} className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white hover:bg-indigo-700">Create your MornAI workspace <ArrowRight className="h-4 w-4"/></motion.button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/55 px-5 py-8 text-xs text-slate-500 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div><b className="text-slate-800">MORN<span className="text-indigo-600">AI</span></b><span className="ml-2">Human startup network + AI operating layer</span></div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenPrivacy} className="font-semibold text-slate-500 hover:text-indigo-600">Privacy Policy</button>
            <button onClick={() => onOpenAuth('login')} className="font-semibold text-slate-500 hover:text-indigo-600">Log in</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
