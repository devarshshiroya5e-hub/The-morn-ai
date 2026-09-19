import React, { useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Mail, Rocket, Search, Sparkles, UserRound, UsersRound, X, BrainCircuit, Target, BriefcaseBusiness, Zap, ShieldCheck } from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { User, UserRole } from '../types';

interface AuthModalProps { isOpen: boolean; onClose: () => void; onSuccess: (user: User) => void; onOpenLegal: () => void; initialMode?: 'login' | 'signup'; }

const skillsList = ['AI & Machine Learning','Android Development','Analytics','Brand Strategy','Business Development','Community Building','Content Writing','Copywriting','Customer Success','Data Science','DevOps','Email Marketing','Finance','Frontend Development','Full-stack Development','Graphic Design','Growth Marketing','HR & Recruiting','Influencer Marketing','iOS Development','Legal','Motion Design','No-code','Operations','Product Design','Product Management','Public Relations','Python','React','Sales','SEO','Social Media','UI/UX Design','User Research','Video Editing','Web Development'];
const avatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Member')}&background=5B5CF0&color=fff&bold=true`;

const productPoints = [
  { icon: BrainCircuit, title: 'AI Co-Founder', text: 'Turn startup context into practical strategy, priorities and decisions.' },
  { icon: Target, title: 'Living Roadmap', text: 'Keep goals, milestones, tasks and startup memory connected as you grow.' },
  { icon: UsersRound, title: 'Find Talent', text: 'Discover people with the skills your startup actually needs.' },
  { icon: BriefcaseBusiness, title: 'Real Execution', text: 'Move from an idea to coordinated work, roles and outcomes.' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onOpenLegal, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login'|'signup'>(initialMode), [step, setStep] = useState(1), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('founder'), [skills, setSkills] = useState<string[]>([]), [query, setQuery] = useState(''), [story, setStory] = useState(''), [goal, setGoal] = useState(''), [startup, setStartup] = useState(''), [industry, setIndustry] = useState(''), [stage, setStage] = useState('Idea'), [availability, setAvailability] = useState('10–20 hours / week');
  const [googleUser, setGoogleUser] = useState<FirebaseUser|null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);

  useEffect(() => { if (isOpen) { setMode(initialMode); setStep(1); setError(''); } }, [isOpen, initialMode]);
  const matches = useMemo(() => skillsList.filter(x => x.toLowerCase().includes(query.toLowerCase()) && !skills.includes(x)).slice(0, 6), [query, skills]);
  const change = (next: 'login'|'signup') => { setMode(next); setStep(1); setError(''); setGoogleUser(null); };
  const addSkill = (x: string) => { if (x.trim() && !skills.includes(x.trim())) setSkills([...skills, x.trim()]); setQuery(''); };

  const saveProfile = async (fu: FirebaseUser) => {
    const displayName = name.trim() || fu.displayName || 'New member';
    if (name.trim() && fu.displayName !== displayName) await updateProfile(fu, { displayName });
    const onboarding = role === 'founder' ? { story, goal, startupName: startup, startupStage: stage, industry } : { story, goal, availability };
    const profile: User = { id: fu.uid, name: displayName, email: fu.email || email, role, avatar: fu.photoURL || avatar(displayName), title: role === 'founder' ? 'Startup founder' : 'Startup builder', bio: story, skills, onboarding };
    await setDoc(doc(db, 'users', fu.uid), { ...profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    onSuccess(profile); onClose();
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', user.uid));
      onSuccess(snap.exists() ? snap.data() as User : { id: user.uid, name: user.displayName || 'Member', email: user.email || email, role: 'employee', avatar: user.photoURL || avatar(user.displayName || 'Member'), title: 'Startup builder', bio: '', skills: [] });
      onClose();
    } catch (e:any) { setError(e.message.replace('Firebase: ', '')); } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true); setError('');
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) { onSuccess(snap.data() as User); onClose(); }
      else { setGoogleUser(user); setName(user.displayName || ''); setEmail(user.email || ''); setMode('signup'); setStep(2); }
    } catch (e:any) { setError(e.message.replace('Firebase: ', '')); } finally { setLoading(false); }
  };

  const first = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please tell us what to call you.');
    if (googleUser) return setStep(2);
    setLoading(true); setError('');
    try { const { user } = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(user, { displayName: name.trim() }); setGoogleUser(user); setStep(2); }
    catch (e:any) { setError(e.message.replace('Firebase: ', '')); } finally { setLoading(false); }
  };

  const done = async () => {
    if (!googleUser) return; setLoading(true);
    try { await saveProfile(googleUser); } catch (e:any) { setError(e.message.replace('Firebase: ', '')); } finally { setLoading(false); }
  };

  const featureMotion = { hidden: { opacity: 0, y: 18 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' } }) };

  return <AnimatePresence>
    {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-50 overflow-y-auto bg-white/72 p-4 backdrop-blur-3xl">
      <div className="mornai-ambient pointer-events-none fixed inset-0" aria-hidden="true"><span className="mornai-orb mornai-orb-one" /><span className="mornai-orb mornai-orb-two" /><span className="mornai-orb mornai-orb-three" /></div>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2 }} className="mt-20 text-xs font-bold uppercase tracking-[.22em] text-indigo-600">Your startup, with an AI operating layer</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28 }} className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-950">Build the company.<br/><span className="text-indigo-600">Keep the context.</span></motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .36 }} className="mt-5 max-w-md text-sm leading-7 text-slate-500">MornAI brings your startup's goals, decisions, roadmap, AI leadership and human talent into one continuously evolving workspace.</motion.p>
            <motion.div initial="hidden" animate="show" className="mt-8 grid gap-3">
              {productPoints.map((item, i) => { const Icon = item.icon; return <motion.div key={item.title} variants={featureMotion} custom={i} className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover:scale-110"><Icon className="h-4.5 w-4.5"/></span>
                <div><b className="text-sm text-slate-900">{item.title}</b><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div>
              </motion.div>; })}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .75 }} className="relative rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Zap className="h-4 w-4 text-indigo-600"/> One place for strategy, execution and people</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Your AI team can use the startup's accumulated context instead of starting from zero every conversation.</p>
          </motion.div>
        </aside>

        <section className="relative min-h-[700px] bg-white p-6 sm:p-10">
          <button onClick={onClose} className="absolute right-5 top-5 z-10 rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 hover:rotate-90"><X/></button>
          {mode === 'signup' && <div className="mb-8 mr-10"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-400"><span>Set up your workspace</span><span>{step}/5</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div animate={{ width: `${(step-1)*25}%` }} transition={{ duration: .35 }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" /></div></div>}

          <AnimatePresence mode="wait">
          {mode === 'login' ? <motion.div key="login" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-md pt-12">
            <Pill>Welcome back</Pill>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">Continue building.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to return to your startup workspace, AI Co-Founder and evolving roadmap.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {['AI strategy','Roadmap','Talent'].map((x, i) => <motion.div key={x} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 + i*.08 }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center text-[10px] font-bold text-slate-500">{x}</motion.div>)}
            </div>
            <form onSubmit={login} className="mt-7 space-y-4"><Field icon={<Mail/>} type="email" placeholder="Email address" value={email} set={setEmail}/><Field icon={<Lock/>} type="password" placeholder="Password" value={password} set={setPassword}/><Error text={error}/><Primary loading={loading}>Log in <ArrowRight className="h-4 w-4"/></Primary></form>
            <Divider/><Google onClick={google} loading={loading}/>
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500"/> Your authentication is handled securely by Firebase.</div>
            <p className="mt-6 text-center text-sm text-slate-500">New to MornAI? <button onClick={()=>change('signup')} className="font-bold text-indigo-600 transition-colors hover:text-indigo-800">Create your account</button></p>
          </motion.div> : <motion.div key={`signup-${step}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .3 }} className="mx-auto max-w-xl pt-3">
            {step===1 && <><Head n="01" title="Start your workspace" text="Create your account, then MornAI will build a startup context around your goals, skills and working style."/><form onSubmit={first} className="mt-7 space-y-4"><Field icon={<UserRound/>} type="text" placeholder="Your full name" value={name} set={setName}/><Field icon={<Mail/>} type="email" placeholder="Email address" value={email} set={setEmail} disabled={!!googleUser}/>{!googleUser&&<Field icon={<Lock/>} type="password" placeholder="Create a password (6+ characters)" value={password} set={setPassword}/>}<Error text={error}/><Primary loading={loading}>Continue <ArrowRight className="h-4 w-4"/></Primary></form>{!googleUser&&<><Divider/><Google onClick={google} loading={loading}/></>}<p className="mt-6 text-center text-sm text-slate-500">Already a member? <button onClick={()=>change('login')} className="font-bold text-indigo-600">Log in</button></p></>}
            {step===2 && <><Head n="02" title="What brings you here?" text="MornAI adapts the workspace depending on whether you're building a company or contributing your skills."/><div className="mt-7 grid gap-4 sm:grid-cols-2"><Role selected={role==='founder'} click={()=>setRole('founder')} icon={<Rocket/>} title="I'm building a startup" text="Strategy, roadmap, AI leadership and the right people."/><Role selected={role==='employee'} click={()=>setRole('employee')} icon={<UsersRound/>} title="I want to join one" text="Find meaningful startup work matched to your skills."/></div><Next back={()=>setStep(1)} next={()=>setStep(3)}/></>}
            {step===3 && <><Head n="03" title="Your unfair advantages" text="Tell us what you can do. These skills power talent discovery and better team context."/><div className="relative mt-6"><Search className="absolute left-4 top-4 h-5 w-5 text-slate-400"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSkill(query)}}} placeholder="Search skills — product design, Python, sales..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"/>{query&&<div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{matches.map(x=><button key={x} onClick={()=>addSkill(x)} className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-indigo-50">{x}</button>)}{!matches.length&&<button onClick={()=>addSkill(query)} className="w-full px-4 py-3 text-left text-sm text-indigo-600">Add “{query}”</button>}</div>}</div><div className="mt-5 flex min-h-16 flex-wrap gap-2">{skills.map(x=><motion.button initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} key={x} onClick={()=>setSkills(skills.filter(s=>s!==x))} className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-transform hover:scale-105">{x} ×</motion.button>)}{!skills.length&&<p className="pt-2 text-sm text-slate-400">Choose a few. You can update these later.</p>}</div><Next back={()=>setStep(2)} next={()=>setStep(4)} disabled={!skills.length}/></>}
            {step===4 && <><Head n="04" title={role==='founder'?'Tell us about the mission':'Tell us what drives you'} text={role==='founder'?'We’ll turn this into the first context for your AI leadership team.':'We’ll surface opportunities where your skills can create real value.'}/>{role==='founder'?<div className="mt-6 grid gap-4 sm:grid-cols-2"><Text p="Startup or project name" v={startup} s={setStartup}/><Text p="Industry — e.g. health, fintech" v={industry} s={setIndustry}/><select value={stage} onChange={e=>setStage(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"><option>Idea</option><option>MVP</option><option>Early traction</option><option>Growing team</option></select><Text p="Your biggest goal for the next 90 days" v={goal} s={setGoal}/></div>:<div className="mt-6 space-y-4"><select value={availability} onChange={e=>setAvailability(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><option>5–10 hours / week</option><option>10–20 hours / week</option><option>20+ hours / week</option><option>Full-time</option></select><Text p="What kind of startup problem do you want to solve?" v={goal} s={setGoal}/></div>}<Next back={()=>setStep(3)} next={()=>setStep(5)}/></>}
            {step===5 && <><Head n="05" title="The human context" text="Give your AI team useful context about your experience, motivation, constraints and how you like to work."/><textarea value={story} onChange={e=>setStory(e.target.value)} placeholder="What should your AI team understand about you and your startup?" rows={6} className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"/><div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4"/>You’re creating an evolving startup context, not just a static profile.</div><Error text={error}/><Next back={()=>setStep(4)} next={done} label="Create my workspace" loading={loading}/></>}
          </motion.div>}
          </AnimatePresence>
        </section>
      </motion.div>
      <button onClick={onOpenLegal} className="relative mx-auto block py-2 text-xs text-slate-500 transition-colors hover:text-slate-900">Terms & Privacy</button>
    </motion.div>}
  </AnimatePresence>;
};

const Head=({n,title,text}:any)=><><motion.span initial={{opacity:0}} animate={{opacity:1}} className="text-xs font-bold tracking-[.2em] text-indigo-600">{n} / 05</motion.span><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></>;
const Pill=({children}:any)=><span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"><Sparkles className="h-3.5 w-3.5"/>{children}</span>;
const Field=({icon,type,placeholder,value,set,disabled}:any)=><motion.div whileFocus={{scale:1.01}} className="relative"><span className="absolute left-4 top-3.5 text-slate-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><input required disabled={disabled} type={type} placeholder={placeholder} value={value} onChange={e=>set(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"/></motion.div>;
const Text=({p,v,s}:any)=><input value={v} onChange={e=>s(e.target.value)} placeholder={p} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"/>;
const Error=({text}:any)=>text?<motion.p initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">{text}</motion.p>:null;
const Primary=({children,loading}:any)=><motion.button whileHover={{scale:1.015,boxShadow:'0 12px 30px rgba(79,70,229,.20)'}} whileTap={{scale:.98}} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">{loading?'Working…':children}</motion.button>;
const Divider=()=> <div className="my-6 flex items-center gap-3"><i className="h-px flex-1 bg-slate-200"/><span className="text-[10px] font-bold text-slate-400">OR</span><i className="h-px flex-1 bg-slate-200"/></div>;
const Google=({onClick,loading}:any)=><motion.button whileHover={{y:-1,boxShadow:'0 8px 20px rgba(15,23,42,.08)'}} whileTap={{scale:.98}} onClick={onClick} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl mornai-glass-button py-3 text-sm font-bold text-slate-700 transition-colors hover:text-slate-900"><span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-blue-600 shadow-sm">G</span>Continue with Google</motion.button>;
const Role=({selected,click,icon,title,text}:any)=><motion.button whileHover={{y:-3}} whileTap={{scale:.99}} onClick={click} className={`w-full rounded-2xl border p-5 text-left transition-all ${selected?'border-indigo-400 bg-indigo-50 shadow-md shadow-indigo-100':'mornai-glass-button hover:border-indigo-200 hover:shadow-sm'}`}><span className={`mb-7 grid h-10 w-10 place-items-center rounded-xl ${selected?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600'}`}>{icon}</span><b className="block text-slate-900">{title}</b><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>{selected&&<motion.span initial={{opacity:0,x:-5}} animate={{opacity:1,x:0}} className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Check className="h-3.5 w-3.5"/>Selected</motion.span>}</motion.button>;
const Next=({back,next,disabled,label='Continue',loading}:any)=><div className="mt-9 flex justify-between"><motion.button whileHover={{x:-2}} onClick={back} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4"/>Back</motion.button><motion.button whileHover={{x:2}} whileTap={{scale:.98}} disabled={disabled||loading} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{loading?'Creating…':label}<ArrowRight className="h-4 w-4"/></motion.button></div>;
