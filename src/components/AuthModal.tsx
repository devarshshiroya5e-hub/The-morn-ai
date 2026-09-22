import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Mail, Rocket, Search, Sparkles,
  UserRound, UsersRound, X, BrainCircuit, Target, BriefcaseBusiness, Zap, ShieldCheck,
  Award, Compass, Clock3, Lightbulb, Building2, UserCircle2
} from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  onOpenLegal: () => void;
  initialMode?: 'login' | 'signup';
}

const skillsList = [
  // Software, engineering & data
  'Coder','Programmer','Software Engineering','Frontend Development','Backend Development','Full-stack Development',
  'Web Development','Mobile Development','Android Development','iOS Development','React','React Native','Next.js',
  'Vue.js','Angular','Node.js','TypeScript','JavaScript','Python','Java','C++','C#','Go','Rust','PHP','Ruby',
  'Swift','Kotlin','Dart','Flutter','SQL','NoSQL','MongoDB','PostgreSQL','MySQL','Firebase','Supabase','AWS',
  'Microsoft Azure','Google Cloud','Cloud Architecture','DevOps','DevSecOps','Site Reliability Engineering',
  'Cybersecurity','Ethical Hacking','Network Engineering','Systems Administration','QA Testing','Manual Testing',
  'Test Automation','Selenium','Playwright','API Development','API Integration','Microservices','Blockchain Development',
  'Smart Contracts','Embedded Systems','IoT','Robotics','Game Development','Unity','Unreal Engine','AR/VR Development',

  // AI & automation
  'AI & Machine Learning','Artificial Intelligence','Machine Learning','Deep Learning','Generative AI',
  'AI Manager','AI Product Manager','AI Engineer','AI Developer','AI Research','AI Strategy','AI Operations',
  'AI Automation','AI Agent Development','AI Workflow Automation','Prompt Engineer','Prompting','Prompt Design',
  'Prompt Optimization','LLM Application Development','LLM Evaluation','RAG','Vector Databases','Computer Vision',
  'Natural Language Processing','Speech AI','Multimodal AI','AI Safety','AI Governance','MLOps','Model Evaluation',
  'Data Labeling','Knowledge Management','Chatbot Development','Voice AI','No-code AI','Automation Builder',
  'OpenAI API','Gemini API','Claude API','OpenRouter','N8N','Zapier','Make Automation','Airtable Automation',

  // Product, startup & strategy
  'Entrepreneurship','Startup Building','Co-founder','Startup Operations','Business Strategy','Business Planning',
  'Product Strategy','Product Management','Product Operations','Product Marketing','Product Research','Product Analytics',
  'Project Management','Program Management','Program Operations','Operations','Business Operations','Chief of Staff',
  'Strategy Consulting','Management Consulting','Market Research','Competitive Research','Business Analysis',
  'Process Improvement','Workflow Design','Systems Thinking','Decision Making','Problem Solving','Innovation',
  'Venture Building','Fundraising','Investor Relations','Pitch Deck Design','Startup Finance','Financial Modeling',
  'Unit Economics','Business Model Design','Go-to-Market Strategy','Growth Strategy','Revenue Operations',

  // Marketing, growth & communications
  'Marketing','Digital Marketing','Growth Marketing','Performance Marketing','Content Marketing','Product Marketing',
  'Brand Strategy','Brand Management','Brand Design','Brand Identity','Copywriting','Content Writing','Technical Writing',
  'Creative Writing','Storytelling','Script Writing','SEO','Technical SEO','Local SEO','ASO','SEM','Paid Advertising',
  'Google Ads','Meta Ads','LinkedIn Ads','Email Marketing','Lifecycle Marketing','CRM Marketing','Marketing Automation',
  'Social Media','Social Media Management','Social Media Marketing','Community Building','Community Management',
  'Influencer Marketing','Creator Partnerships','Affiliate Marketing','Public Relations','Media Relations','Communications',
  'Corporate Communications','Event Marketing','Experiential Marketing','Lead Generation','Demand Generation',
  'Conversion Rate Optimization','CRO','Sales Enablement','Marketing Analytics','Web Analytics','Google Analytics',

  // Sales & customer
  'Sales','B2B Sales','B2C Sales','Enterprise Sales','Inside Sales','Outside Sales','Consultative Sales','Account Executive',
  'Account Management','Key Account Management','Business Development','Partnerships','Channel Partnerships','Recruitment Sales',
  'Sales Development','Lead Qualification','Prospecting','Cold Calling','Cold Email','Negotiation','Closing','Sales Operations',
  'Revenue Operations','Customer Success','Customer Support','Technical Support','Customer Experience','User Onboarding',
  'Retention Strategy','Customer Research','User Research','User Interviews','Community Support',

  // Design & creative
  'Graphic Design','UI/UX Design','UX Design','UI Design','Product Design','Interaction Design','Visual Design',
  'Web Design','Mobile Design','Design Systems','UX Research','Service Design','Information Architecture','Wireframing',
  'Prototyping','Figma','Adobe Photoshop','Adobe Illustrator','Adobe XD','Canva','Framer','Webflow','Motion Design',
  'Motion Graphics','3D Design','3D Modeling','3D Rendering','Animation','VFX','Video Editing','Short-form Video Editing',
  'Long-form Video Editing','Video Production','Filmmaking','Color Grading','Sound Design','Audio Editing','Voice Over',
  'Photography','Product Photography','UI Animation','Presentation Design','Thumbnail Design','Logo Design','Illustration',
  'Art Direction','Creative Direction','Fashion Design','Interior Design',

  // HR, people & talent
  'HR & Recruiting','Human Resources','Talent Acquisition','Technical Recruiting','Executive Recruiting','Recruitment',
  'Sourcing','Interviewing','People Operations','People Management','Performance Management','Learning & Development',
  'Employee Engagement','Employer Branding','Compensation & Benefits','HR Analytics','Career Coaching','Leadership Coaching',
  'Team Building','Team Leadership','Mentoring','Training','Facilitation','Conflict Resolution','Organizational Development',

  // Finance, accounting & legal
  'Finance','Financial Analysis','Financial Planning','FP&A','Accounting','Bookkeeping','Auditing','Taxation','Tax Planning',
  'GST','Corporate Finance','Investment Analysis','Portfolio Management','Risk Management','Treasury','Credit Analysis',
  'Financial Reporting','Budgeting','Cost Accounting','Forensic Accounting','Payroll','Legal','Corporate Law','Contract Law',
  'Commercial Law','Intellectual Property','Patent Research','Trademark Management','Compliance','Privacy Compliance',
  'Data Protection','Regulatory Affairs','Legal Research','Contract Drafting','Contract Management','Policy Writing',

  // Operations, supply chain & research
  'Operations Management','Operations Research','Procurement','Purchasing','Supply Chain Management','Logistics',
  'Inventory Management','Vendor Management','Quality Management','Quality Assurance','Business Process Management',
  'Process Mapping','Six Sigma','Lean Management','Project Coordination','Virtual Assistance','Executive Assistance',
  'Data Entry','Documentation','Knowledge Base Management','Research','Academic Research','Market Research','Desk Research',
  'Survey Design','Data Collection','Data Analysis','Data Visualization','Statistics','Excel','Power BI','Tableau','Looker Studio',

  // Healthcare, science & education
  'Healthcare Management','Healthcare Administration','Medical Research','Clinical Research','Public Health','Health Education',
  'Nutrition','Fitness Coaching','Mental Health Support','Pharmaceutical Research','Biotechnology','Life Sciences',
  'Laboratory Skills','Scientific Writing','STEM Education','Teaching','Tutoring','Course Creation','Instructional Design',
  'E-learning','Curriculum Design','Educational Technology','Language Teaching','Translation','Localization','Proofreading',
  'Editing','Technical Documentation',

  // Professional, communication & general skills
  'Leadership','People Leadership','Public Speaking','Presentation Skills','Communication','Written Communication',
  'Verbal Communication','Critical Thinking','Analytical Thinking','Creative Thinking','Strategic Thinking','Time Management',
  'Project Coordination','Organization','Attention to Detail','Decision Making','Research Skills','Documentation',
  'Remote Collaboration','Team Collaboration','Cross-functional Collaboration','Client Management','Relationship Building',
  'Networking','Mentoring','Coaching','Training','Customer Relations','Professional Writing','Resume Writing',
  'Interview Coaching','Language Skills','English','Hindi','Gujarati','Spanish','French','German','Japanese','Mandarin Chinese',
  'Arabic','Russian',

  // Trades, practical & creator skills
  'Electrical Work','Mechanical Engineering','Civil Engineering','Architecture','Construction Management','CAD',
  'AutoCAD','3D Printing','Machine Operation','Automotive Repair','Drone Operations','Video Streaming','Podcasting',
  'Content Creation','YouTube Management','Instagram Management','TikTok Management','Newsletter Writing','Blogging',
  'Personal Branding','Creator Strategy','Digital Products','Online Course Creation','Community Moderation','Gaming',
  'Esports','Music Production','Music Composition','DJing','Acting','Voice Acting','Event Management','Hospitality Management',
  'Travel Planning','Real Estate','Property Management','Interior Styling','Customer Service','Retail Management'
];

const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Member')}&background=5B5CF0&color=fff&bold=true`;

const AUTH_RATE_LIMIT_KEY = 'mornai-auth-attempts-v1';
const AUTH_RATE_WINDOW_MS = 10 * 60 * 1000;
const AUTH_RATE_MAX = 6;

const consumeAuthAttempt = () => {
  if (typeof window === 'undefined') return { allowed: true, retryAfterSeconds: 0 };

  try {
    const now = Date.now();
    const stored = JSON.parse(window.localStorage.getItem(AUTH_RATE_LIMIT_KEY) || '[]');
    const attempts = Array.isArray(stored)
      ? stored.filter((timestamp) => typeof timestamp === 'number' && now - timestamp < AUTH_RATE_WINDOW_MS)
      : [];

    if (attempts.length >= AUTH_RATE_MAX) {
      const retryAfterSeconds = Math.max(1, Math.ceil((AUTH_RATE_WINDOW_MS - (now - attempts[0])) / 1000));
      window.localStorage.setItem(AUTH_RATE_LIMIT_KEY, JSON.stringify(attempts));
      return { allowed: false, retryAfterSeconds };
    }

    attempts.push(now);
    window.localStorage.setItem(AUTH_RATE_LIMIT_KEY, JSON.stringify(attempts));
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
};

const AiExpandButton = ({ label = 'AI expand' }: { label?: string }) => (
  <button
    type="button"
    disabled
    title="AI writing assistance will be connected in the final AI rollout."
    aria-label={label}
    className="absolute bottom-2 left-2 inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-white/85 px-2 text-[9px] font-black text-violet-600 shadow-sm opacity-90 disabled:cursor-not-allowed"
  >
    <Sparkles className="h-3 w-3" />
    AI
  </button>
);

const glass =
  'mornai-glass-button border-slate-200/70';

const productPoints = [
  { icon: BrainCircuit, title: 'AI Co-Founder', text: 'Uses your profile, decisions and startup context to make the next move more useful.' },
  { icon: Target, title: 'Living Roadmap', text: 'Turns goals into milestones, tasks and priorities that can evolve with the company.' },
  { icon: UsersRound, title: 'Talent Discovery', text: 'Makes your skills and goals searchable so the right startup or contributor can find you.' },
  { icon: BriefcaseBusiness, title: 'Execution Layer', text: 'Connects people, work, appointments and progress instead of leaving them in separate tools.' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen, onClose, onSuccess, onOpenLegal, initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('founder');
  const [skills, setSkills] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [startup, setStartup] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('Idea');
  const [problem, setProblem] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [traction, setTraction] = useState('');
  const [goal, setGoal] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [contribution, setContribution] = useState('');
  const [previousWins, setPreviousWins] = useState('');
  const [desiredRole, setDesiredRole] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [achievements, setAchievements] = useState('');
  const [idealStartup, setIdealStartup] = useState('');
  const [availability, setAvailability] = useState('');
  const [workStyle, setWorkStyle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [story, setStory] = useState('');
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep(1);
      setError('');
    }
  }, [isOpen, initialMode]);

  const progressSteps = 5;

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, mode, step]);
  const matches = useMemo(
    () => skillsList
      .filter((x) => x.toLowerCase().includes(query.toLowerCase()) && !skills.includes(x))
      .slice(0, 12),
    [query, skills],
  );

  const resetOnboarding = () => {
    setStep(1);
    setSkills([]);
    setQuery('');
    setStartup('');
    setIndustry('');
    setStage('Idea');
    setProblem('');
    setTargetCustomer('');
    setTraction('');
    setGoal('');
    setProfileTitle('');
    setExperienceLevel('');
    setContribution('');
    setPreviousWins('');
    setDesiredRole('');
    setFocusAreas('');
    setAchievements('');
    setIdealStartup('');
    setAvailability('');
    setWorkStyle('');
    setMotivation('');
    setStory('');
    setError('');
  };

  const change = (next: 'login' | 'signup') => {
    setMode(next);
    setGoogleUser(null);
    setError('');
    resetOnboarding();
  };

  const addSkill = (x: string) => {
    const clean = x.trim();
    if (clean && !skills.includes(clean)) setSkills([...skills, clean]);
    setQuery('');
  };

  const min = (value: string, length: number, label: string) => {
    const clean = value.trim();
    if (!clean) return `${label} is required.`;
    if (clean.length < length) return `${label} must be at least ${length} characters.`;
    return '';
  };

  const validateStep = () => {
    if (step === 1) {
      if (name.trim().length < 2) return 'Full name must be at least 2 characters.';
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
      if (!googleUser && password.length < 8) return 'Password must be at least 8 characters.';
      return '';
    }
    if (step === 2) return '';
    if (step === 3) {
      if (skills.length < 3) return 'Select at least 3 skills so your profile can be matched properly.';
      const titleError = min(profileTitle, 3, role === 'founder' ? 'Your founder focus' : 'Professional title');
      if (titleError) return titleError;
      if (!experienceLevel) return 'Choose your experience level.';
      return min(contribution, 40, 'Your contribution');
    }
    if (step === 4) {
      if (role === 'founder') {
        return (
          min(startup, 2, 'Startup name') ||
          min(industry, 2, 'Industry') ||
          (!stage ? 'Choose a startup stage.' : '') ||
          min(problem, 40, 'Problem') ||
          min(targetCustomer, 25, 'Target customer') ||
          (!traction ? 'Choose your traction stage.' : '') ||
          min(previousWins, 40, 'Relevant experience or previous wins')
        );
      }
      return (
        min(desiredRole, 3, 'Desired role') ||
        min(focusAreas, 25, 'Problem areas you want to work on') ||
        min(achievements, 40, 'Achievements or proof of work') ||
        min(idealStartup, 25, 'Ideal startup')
      );
    }
    if (step === 5) {
      if (!availability) return 'Choose your availability.';
      if (!workStyle) return 'Choose your preferred work style.';
      return (
        min(goal, 30, 'Your 90-day goal') ||
        min(motivation, 30, 'Your motivation') ||
        min(story, 60, 'Your profile story')
      );
    }
    return '';
  };

  const saveProfile = async (fu: FirebaseUser) => {
    const displayName = name.trim() || fu.displayName || 'New member';
    if (name.trim() && fu.displayName !== displayName) {
      await updateProfile(fu, { displayName });
    }

    const onboarding = {
      story: story.trim(),
      goal: goal.trim(),
      availability,
      workStyle,
      experienceLevel,
      profileTitle: profileTitle.trim(),
      contribution: contribution.trim(),
      motivation: motivation.trim(),
      ...(role === 'founder'
        ? {
            startupName: startup.trim(),
            startupStage: stage,
            industry: industry.trim(),
            problem: problem.trim(),
            targetCustomer: targetCustomer.trim(),
            traction,
            previousWins: previousWins.trim(),
          }
        : {
            desiredRole: desiredRole.trim(),
            focusAreas: focusAreas.trim(),
            achievements: achievements.trim(),
            idealStartup: idealStartup.trim(),
          }),
    };

    const profile: User = {
      id: fu.uid,
      name: displayName,
      email: fu.email || email,
      role,
      avatar: fu.photoURL || avatar(displayName),
      title: role === 'founder' ? profileTitle.trim() : desiredRole.trim(),
      bio: story.trim(),
      skills,
      onboarding,
    };

    await setDoc(
      doc(db, 'users', fu.uid),
      {
        ...profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    onSuccess(profile);
    onClose();
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = consumeAuthAttempt();
    if (!rate.allowed) {
      setError(`Too many authentication attempts. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', user.uid));
      onSuccess(
        snap.exists()
          ? (snap.data() as User)
          : {
              id: user.uid,
              name: user.displayName || 'Member',
              email: user.email || email,
              role: 'employee',
              avatar: user.photoURL || avatar(user.displayName || 'Member'),
              title: 'Startup builder',
              bio: '',
              skills: [],
            },
      );
      onClose();
    } catch (e: any) {
      setError((e.message || 'Unable to log in.').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const rate = consumeAuthAttempt();
    if (!rate.allowed) {
      setError(`Too many authentication attempts. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        onSuccess(snap.data() as User);
        onClose();
      } else {
        setGoogleUser(user);
        setName(user.displayName || '');
        setEmail(user.email || '');
        setMode('signup');
        setStep(2);
      }
    } catch (e: any) {
      setError((e.message || 'Unable to continue with Google.').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const first = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateStep();
    if (validation) return setError(validation);
    if (googleUser) return setStep(2);

    const rate = consumeAuthAttempt();
    if (!rate.allowed) {
      setError(`Too many account-creation attempts. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name.trim() });
      setGoogleUser(user);
      setStep(2);
    } catch (e: any) {
      setError((e.message || 'Unable to create the account.').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setStep((s) => Math.min(progressSteps, s + 1));
  };

  const done = async () => {
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    if (!googleUser) {
      setError('Complete account creation before finishing your profile.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveProfile(googleUser);
    } catch (e: any) {
      setError((e.message || 'Unable to save your profile.').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          ref={scrollRef}
          className="mornai-auth-scroll fixed inset-0 z-50 h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-y-contain bg-white/[0.74] backdrop-blur-2xl"
        >
          <div className="mornai-ambient mornai-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="mornai-orb mornai-orb-one" />
            <span className="mornai-orb mornai-orb-two" />
            <span className="mornai-orb mornai-orb-three" />
          </div>

          <div className="relative min-h-[calc(100dvh-1.5rem)] px-3 py-3 sm:min-h-[calc(100dvh-2.5rem)] sm:px-5 sm:py-5">
            <motion.div
              initial={{ opacity: 0, y: 28, scale: .965 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: .985 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="mornai-auth-surface relative mx-auto w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/85 bg-white/[0.62] shadow-[0_35px_120px_rgba(15,23,42,.14)] backdrop-blur-3xl"
            >
              <div className="mornai-auth-nav">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <b className="text-sm tracking-tight text-slate-950">MORN<span className="text-indigo-600">AI</span></b>
                    <p className="hidden text-[9px] font-bold uppercase tracking-[.16em] text-slate-400 sm:block">Founder + Talent OS</p>
                  </div>
                </div>
                <div className="hidden items-center gap-1 sm:flex">
                  <a href="#features" onClick={onClose} className="mornai-glass-nav-link">Platform</a>
                  <a href="#how-it-works" onClick={onClose} className="mornai-glass-nav-link">How it works</a>
                  <a href="#faq" onClick={onClose} className="mornai-glass-nav-link">FAQs</a>
                </div>
                <button onClick={onClose} className="mornai-nav-close" aria-label="Close authentication">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.08fr]">
                <aside className="mornai-auth-glass-side relative hidden min-h-[760px] overflow-hidden border-r border-white/70 p-10 lg:flex lg:flex-col lg:justify-between">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-200/45 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-blue-200/45 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <b className="text-xl tracking-tight text-slate-950">MORN<span className="text-indigo-600">AI</span></b>
                        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Startup operating platform</p>
                      </div>
                    </div>
                    <p className="mt-16 text-xs font-bold uppercase tracking-[.22em] text-indigo-600">
                      Your context becomes your advantage
                    </p>
                    <h1 className="mt-4 text-4xl font-extrabold leading-[1.06] tracking-tight text-slate-950">
                      Build a profile your future team can actually use.
                    </h1>
                    <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                      Your answers become searchable profile context for AI strategy, startup matching, team discovery and better conversations. Humans finally gave the profile form a job.
                    </p>

                    <div className="mt-8 grid gap-3">
                      {productPoints.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="mornai-auth-card group flex items-start gap-3 rounded-2xl p-3.5"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div>
                              <b className="text-sm text-slate-900">{item.title}</b>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mornai-auth-card rounded-2xl p-4 pb-[18px]">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Zap className="h-4 w-4 text-indigo-600" />
                      Better answers create better matching.
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Every useful answer becomes structured context that can improve your profile, recommendations and AI workspace.
                    </p>
                  </div>
                </aside>

                <section className="mornai-auth-content relative min-h-[760px] bg-white/[0.48] p-6 sm:p-10">
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/65 to-transparent pointer-events-none" />
                  {mode === 'signup' && (
                    <div className="relative z-10 mb-8">
                      <div className="mb-2 flex justify-between text-xs font-semibold text-slate-400">
                        <span>Build your profile</span>
                        <span>{step}/{progressSteps}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100/90">
                        <motion.div
                          animate={{ width: `${(step / progressSteps) * 100}%` }}
                          transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400"
                        />
                      </div>
                    </div>
                  )}

                  <AnimatePresence mode="popLayout" initial={false}>
                    {mode === 'login' ? (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, x: 14, y: 4 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: -10, y: -2 }}
                        transition={{ duration: .36, ease: [0.16, 1, 0.3, 1] }}
                        className="mx-auto max-w-md pt-10 pb-10"
                      >
                        <Pill icon={<Sparkles className="h-3.5 w-3.5" />}>Welcome back</Pill>
                        <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950">Continue building.</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-500">
                          Your AI Co-Founder, roadmap, startup memory and talent workspace are waiting exactly where you left them.
                        </p>

                        <div className="mt-7 grid grid-cols-3 gap-2">
                          {[
                            ['AI strategy', BrainCircuit],
                            ['Roadmap', Target],
                            ['Talent', UsersRound],
                          ].map(([label, Icon], i) => (
                            <motion.div
                              key={label as string}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: .05 + i * .07 }}
                              className="mornai-auth-feature mornai-glass-card rounded-2xl p-3 text-center"
                            >
                              <Icon className="mx-auto h-4 w-4 text-indigo-600" />
                              <span className="mt-1 block text-[10px] font-bold text-slate-500">{label as string}</span>
                            </motion.div>
                          ))}
                        </div>

                        <form onSubmit={login} className="mt-7 space-y-4">
                          <Field icon={<Mail />} type="email" placeholder="Email address" value={email} set={setEmail} minLength={5} />
                          <Field icon={<Lock />} type="password" placeholder="Password" value={password} set={setPassword} minLength={8} />
                          <Error text={error} />
                          <Primary loading={loading}>Log in <ArrowRight className="h-4 w-4" /></Primary>
                        </form>

                        <Divider />
                        <Google onClick={google} loading={loading} />

                        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Firebase handles your authentication securely.
                        </div>
                        <p className="mt-6 text-center text-sm text-slate-500">
                          New to MornAI? <button type="button" onClick={() => change('signup')} className="font-bold text-indigo-600 transition-colors hover:text-indigo-800">Create your account</button>
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`signup-${step}`}
                        initial={{ opacity: 0, x: 14, y: 5 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: -10, y: -2 }}
                        transition={{ duration: .36, ease: [0.16, 1, 0.3, 1] }}
                        className="mx-auto max-w-xl pb-10"
                      >
                        {step === 1 && (
                          <>
                            <Head n="01" title="Start your identity" text="Create the account MornAI will use to build a strong, useful professional profile." />
                            <form onSubmit={first} className="mt-7 space-y-4">
                              <Field icon={<UserRound />} type="text" placeholder="Full name (2+ characters)" value={name} set={setName} minLength={2} />
                              <Field icon={<Mail />} type="email" placeholder="Email address" value={email} set={setEmail} disabled={!!googleUser} />
                              {!googleUser && <Field icon={<Lock />} type="password" placeholder="Create a password (8+ characters)" value={password} set={setPassword} minLength={8} />}
                              <Error text={error} />
                              <Primary loading={loading}>Continue <ArrowRight className="h-4 w-4" /></Primary>
                            </form>
                            {!googleUser && <><Divider /><Google onClick={google} loading={loading} /></>}
                            <p className="mt-6 text-center text-sm text-slate-500">Already a member? <button type="button" onClick={() => change('login')} className="font-bold text-indigo-600">Log in</button></p>
                          </>
                        )}

                        {step === 2 && (
                          <>
                            <Head n="02" title="What is your role?" text="This determines which questions we ask next and what MornAI emphasizes in your profile." />
                            <div className="mt-7 grid gap-4 sm:grid-cols-2">
                              <Role selected={role === 'founder'} click={() => setRole('founder')} icon={<Rocket />} title="Founder / Co-founder" text="I'm building a startup and want strategy, execution and the right people." />
                              <Role selected={role === 'employee'} click={() => setRole('employee')} icon={<UsersRound />} title="Startup worker / contributor" text="I want to contribute skills, join strong startups and find meaningful work." />
                            </div>
                            <Next back={() => setStep(1)} next={next} />
                          </>
                        )}

                        {step === 3 && (
                          <>
                            <Head n="03" title="Make your skills searchable" text="Choose at least 3 skills and describe what you actually bring to a team. Better context creates better matching." />
                            <div className="relative mt-6">
                              <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                              <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(query); } }}
                                placeholder="Search skills — product design, Python, sales..."
                                className={`mornai-signup-field w-full rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 outline-none backdrop-blur-2xl transition-all placeholder:text-slate-400 focus:bg-white/80 ${query ? 'is-typing' : ''}`}
                              />
                              {query && (
                                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-2xl backdrop-blur-2xl">
                                  {matches.map((x) => (
                                    <button key={x} type="button" onClick={() => addSkill(x)} className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50">{x}</button>
                                  ))}
                                  {!matches.length && <button type="button" onClick={() => addSkill(query)} className="w-full px-4 py-3 text-left text-sm text-indigo-600">Add “{query}”</button>}
                                </div>
                              )}
                            </div>
                            <div className="mt-5 flex min-h-16 flex-wrap gap-2">
                              {skills.map((x) => (
                                <motion.button key={x} initial={{ opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} type="button" onClick={() => setSkills(skills.filter((s) => s !== x))} className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-transform hover:scale-105">{x} ×</motion.button>
                              ))}
                            </div>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                              <Text p={role === 'founder' ? 'Founder focus (e.g. product + growth)' : 'Professional title (e.g. Frontend Developer)'} v={profileTitle} s={setProfileTitle} min={3} />
                              <Select p="Experience level" value={experienceLevel} set={setExperienceLevel} options={['Student / Early career','1–2 years','3–5 years','6–10 years','10+ years']} />
                            </div>
                            <TextArea label={role === 'founder' ? 'What can you personally contribute to the startup? (minimum 40 characters)' : 'What can a startup count on you to deliver? (minimum 40 characters)'} value={contribution} set={setContribution} min={40} rows={5} />
                            <Error text={error} />
                            <Next back={() => setStep(2)} next={next} />
                          </>
                        )}

                        {step === 4 && role === 'founder' && (
                          <>
                            <Head n="04" title="Tell MornAI about the company" text="These answers become structured startup context that can improve your roadmap, AI advice and matching." />
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                              <Text p="Startup / project name" v={startup} s={setStartup} min={2} />
                              <Text p="Industry" v={industry} s={setIndustry} min={2} />
                              <Select p="Current stage" value={stage} set={setStage} options={['Idea','MVP','Early traction','Growing team']} />
                              <Select p="Current traction" value={traction} set={setTraction} options={['Pre-launch','MVP users','Early revenue','Growing revenue','Established customer base']} />
                            </div>
                            <TextArea label="What painful problem are you solving? (minimum 40 characters)" value={problem} set={setProblem} min={40} rows={4} />
                            <TextArea label="Who is the target customer and why do they care? (minimum 25 characters)" value={targetCustomer} set={setTargetCustomer} min={25} rows={3} />
                            <TextArea label="What relevant experience or previous wins should people know? (minimum 40 characters)" value={previousWins} set={setPreviousWins} min={40} rows={4} />
                            <Error text={error} />
                            <Next back={() => setStep(3)} next={next} />
                          </>
                        )}

                        {step === 4 && role === 'employee' && (
                          <>
                            <Head n="04" title="Show what kind of builder you are" text="This information makes your profile much more useful to founders looking for the right contributor." />
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                              <Text p="Desired startup role" v={desiredRole} s={setDesiredRole} min={3} />
                              <Text p="Ideal startup / environment" v={idealStartup} s={setIdealStartup} min={25} />
                            </div>
                            <TextArea label="What startup problems do you want to work on? (minimum 25 characters)" value={focusAreas} set={setFocusAreas} min={25} rows={3} />
                            <TextArea label="What achievement, project or proof of work best represents you? (minimum 40 characters)" value={achievements} set={setAchievements} min={40} rows={4} />
                            <Error text={error} />
                            <Next back={() => setStep(3)} next={next} />
                          </>
                        )}

                        {step === 5 && (
                          <>
                            <Head n="05" title="Give your profile a point of view" text="These answers make your profile human, useful and specific instead of another empty résumé." />
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                              <Select p="Availability" value={availability} set={setAvailability} options={['5–10 hours / week','10–20 hours / week','20+ hours / week','Full-time']} />
                              <Select p="Preferred work style" value={workStyle} set={setWorkStyle} options={['Remote','Hybrid','In-person','Flexible']} />
                            </div>
                            <TextArea label="What do you want to accomplish in the next 90 days? (minimum 30 characters)" value={goal} set={setGoal} min={30} rows={3} />
                            <TextArea label="Why do you want to build or work with startups? (minimum 30 characters)" value={motivation} set={setMotivation} min={30} rows={3} />
                            <TextArea label="Write a strong profile story: experience, strengths, interests and what kind of impact you want to create. (minimum 60 characters)" value={story} set={setStory} min={60} rows={6} />
                            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/85 p-4 text-sm text-emerald-800">
                              <CheckCircle2 className="mr-2 inline h-4 w-4" />
                              Every answer is saved to your profile and can be edited later.
                            </div>
                            <Error text={error} />
                            <Next back={() => setStep(4)} next={done} label="Create my profile" loading={loading} />
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>
            </motion.div>

            <button onClick={onOpenLegal} className="mx-auto block py-3 text-xs text-slate-500 transition-colors hover:text-slate-900">
              Terms & Privacy
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Head = ({ n, title, text }: any) => (
  <>
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold tracking-[.2em] text-indigo-600">{n} / 05</motion.span>
    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h2>
    <p className="mt-2 text-sm leading-7 text-slate-500">{text}</p>
  </>
);

const Pill = ({ children, icon }: any) => (
  <span className="mornai-glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-indigo-700">
    {icon}{children}
  </span>
);

const Field = ({ icon, type, placeholder, value, set, disabled, minLength }: any) => (
  <motion.div whileFocus={{ scale: 1.006 }} className="relative">
    <span className="absolute left-4 top-3.5 z-10 text-slate-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
    <input
      required
      minLength={minLength}
      disabled={disabled}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => set(e.target.value)}
      className={`mornai-auth-field w-full rounded-2xl border border-white/80 bg-white/[0.52] py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none backdrop-blur-2xl transition-all placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-300 focus:bg-white/80 focus:ring-4 focus:ring-indigo-50 disabled:opacity-60 ${type !== 'password' && type !== 'email' ? 'pb-9' : ''}`}
    />
    {type !== 'password' && type !== 'email' && <AiExpandButton />}
  </motion.div>
);

const Text = ({ p, v, s, min = 0 }: any) => (
  <div className="relative">
    <input
      required
      minLength={min}
      value={v}
      onChange={(e) => s(e.target.value)}
      placeholder={p}
      className="mornai-signup-field w-full rounded-2xl px-4 pb-10 pt-3.5 text-sm text-slate-900 outline-none backdrop-blur-2xl transition-all placeholder:text-slate-400 focus:bg-white/80"
    />
    <AiExpandButton />
  </div>
);

const TextArea = ({ label, value, set, min, rows }: any) => (
  <label className="mt-4 block">
    <span className="mb-2 block text-xs font-bold text-slate-500">{label}</span>
    <div className="relative">
      <textarea
        required
        minLength={min}
        value={value}
        onChange={(e) => set(e.target.value)}
        rows={rows}
        className="mornai-signup-field w-full rounded-2xl px-4 pb-10 pt-3.5 text-sm leading-6 text-slate-900 outline-none backdrop-blur-2xl transition-all placeholder:text-slate-400 focus:bg-white/80"
      />
      <AiExpandButton />
    </div>
  </label>
);

const Select = ({ p, value, set, options }: any) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold text-slate-500">{p}</span>
    <select
      required
      value={value}
      onChange={(e) => set(e.target.value)}
      className="mornai-signup-field w-full rounded-2xl px-4 py-3.5 text-sm text-slate-700 outline-none backdrop-blur-2xl transition-all focus:bg-white/80"
    >
      <option value="">Select...</option>
      {options.map((option: string) => <option key={option}>{option}</option>)}
    </select>
  </label>
);

const Error = ({ text }: any) => (
  text ? (
    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/90 px-3 py-2.5 text-xs font-semibold text-rose-600">
      {text}
    </motion.p>
  ) : null
);

const Primary = ({ children, loading }: any) => (
  <motion.button
    whileHover={{ scale: 1.012, y: -1 }}
    whileTap={{ scale: .985 }}
    disabled={loading}
    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-300/30 transition-all hover:bg-indigo-700 disabled:opacity-60"
  >
    {loading ? 'Working…' : children}
  </motion.button>
);

const Divider = () => (
  <div className="my-6 flex items-center gap-3">
    <i className="h-px flex-1 bg-slate-200" />
    <span className="text-[10px] font-bold text-slate-400">OR</span>
    <i className="h-px flex-1 bg-slate-200" />
  </div>
);

const Google = ({ onClick, loading }: any) => (
  <motion.button
    type="button"
    whileHover={{ y: -2 }}
    whileTap={{ scale: .985 }}
    onClick={onClick}
    disabled={loading}
    className={`mornai-glass-button flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-slate-700 ${glass}`}
  >
    <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-blue-600 shadow-sm">G</span>
    Continue with Google
  </motion.button>
);

const Role = ({ selected, click, icon, title, text }: any) => (
  <motion.button
    type="button"
    whileHover={{ y: -2 }}
    whileTap={{ scale: .985 }}
    animate={{ y: selected ? -2 : 0, scale: selected ? 1.01 : 1 }}
    transition={{ duration: .18, ease: [0.22, 1, 0.36, 1] }}
    onClick={click}
    className={`mornai-auth-role-card relative w-full rounded-3xl border p-5 text-left transition-colors ${
      selected
        ? 'border-indigo-300 bg-indigo-50/80 shadow-[0_12px_36px_rgba(79,70,229,.16)]'
        : 'mornai-glass-button border-slate-200/70'
    }`}
  >
    {selected && (
      <motion.span
        initial={{ opacity: 0, scale: .7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: .16 }}
        className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-200"
      >
        <Check className="h-3.5 w-3.5" />
      </motion.span>
    )}
    <motion.span
      animate={{ scale: selected ? 1.05 : 1 }}
      transition={{ duration: .16 }}
      className={`mb-7 grid h-11 w-11 place-items-center rounded-2xl ${selected ? 'bg-indigo-600 text-white' : 'bg-white/70 text-slate-600'}`}
    >
      {icon}
    </motion.span>
    <b className="block text-slate-900">{title}</b>
    <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    {selected && (
      <motion.span initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .16 }} className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
        <Check className="h-3.5 w-3.5" /> Selected
      </motion.span>
    )}
  </motion.button>
);

const Next = ({ back, next, disabled, label = 'Continue', loading }: any) => (
  <div className="mt-9 flex items-center justify-between">
    <motion.button type="button" whileHover={{ x: -2 }} onClick={back} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900">
      <ArrowLeft className="h-4 w-4" /> Back
    </motion.button>
    <motion.button type="button" whileHover={{ x: 2, y: -1 }} whileTap={{ scale: .985 }} disabled={disabled || loading} onClick={next} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-300/25 disabled:opacity-40">
      {loading ? 'Saving profile…' : label} <ArrowRight className="h-4 w-4" />
    </motion.button>
  </div>
);
