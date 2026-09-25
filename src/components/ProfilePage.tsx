import React, { useEffect, useMemo, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  Save, LogOut, Sparkles, Target, BriefcaseBusiness, UsersRound, Clock3,
  Award, Lightbulb, Building2, UserCircle2, CheckCircle2
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { postMornAI } from '../lib/mornaiAi';

interface ProfilePageProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

const skillsList = [
  'AI & Machine Learning','Android Development','Analytics','Brand Strategy','Business Development',
  'Community Building','Content Writing','Copywriting','Customer Success','Data Science','DevOps',
  'Email Marketing','Finance','Frontend Development','Full-stack Development','Graphic Design',
  'Growth Marketing','HR & Recruiting','Influencer Marketing','iOS Development','Legal',
  'Motion Design','No-code','Operations','Product Design','Product Management','Public Relations',
  'Python','React','Sales','SEO','Social Media','UI/UX Design','User Research','Video Editing','Web Development',
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onUpdateUser, onLogout }) => {
  const onboarding = currentUser.onboarding || {};
  const [name, setName] = useState(currentUser.name || '');
  const [title, setTitle] = useState(currentUser.title || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [skills, setSkills] = useState<string[]>(currentUser.skills || []);
  const [query, setQuery] = useState('');
  const [onboardingState, setOnboardingState] = useState({ ...onboarding });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isOptimizingWithAi, setIsOptimizingWithAi] = useState(false);
  const [aiProfileStrengths, setAiProfileStrengths] = useState<string[]>([]);

  const optimizeWithAi = async () => {
    setIsOptimizingWithAi(true);
    setError('');
    try {
      const data = await postMornAI<{ suggestedTitle: string; suggestedBio: string; suggestedSkills: string[]; profileStrengths: string[] }>('profile-assist', {
        profile: { ...currentUser, name, title, bio, skills, onboarding: onboardingState },
      });
      if (data.suggestedTitle) setTitle(data.suggestedTitle);
      if (data.suggestedBio) setBio(data.suggestedBio);
      if (Array.isArray(data.suggestedSkills) && data.suggestedSkills.length) setSkills(Array.from(new Set(data.suggestedSkills)).slice(0, 12));
      setAiProfileStrengths(Array.isArray(data.profileStrengths) ? data.profileStrengths : []);
      setSaved(false);
    } catch (e: any) {
      setError((e.message || 'AI profile optimization failed.').replace('Firebase: ', ''));
    } finally {
      setIsOptimizingWithAi(false);
    }
  };

  useEffect(() => {
    setName(currentUser.name || '');
    setTitle(currentUser.title || '');
    setBio(currentUser.bio || '');
    setSkills(currentUser.skills || []);
    setOnboardingState({ ...(currentUser.onboarding || {}) });
  }, [currentUser]);

  const matches = useMemo(
    () => skillsList.filter((x) => x.toLowerCase().includes(query.toLowerCase()) && !skills.includes(x)).slice(0, 6),
    [query, skills],
  );

  const setField = (key: string, value: string) => {
    setOnboardingState((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (bio.trim().length < 60) return setError('Profile story must be at least 60 characters.');
    if (skills.length < 3) return setError('Keep at least 3 skills on your profile.');
    if (!onboardingState.experienceLevel) return setError('Experience level is required.');
    if (!onboardingState.availability) return setError('Availability is required.');
    if (!onboardingState.workStyle) return setError('Work style is required.');
    if ((onboardingState.goal || '').trim().length < 30) return setError('Your 90-day goal must be at least 30 characters.');
    if ((onboardingState.motivation || '').trim().length < 30) return setError('Your motivation must be at least 30 characters.');
    if ((onboardingState.contribution || '').trim().length < 40) return setError('Your contribution must be at least 40 characters.');
    if (currentUser.role === 'founder') {
      if ((onboardingState.startupName || '').trim().length < 2) return setError('Startup name is required.');
      if ((onboardingState.industry || '').trim().length < 2) return setError('Industry is required.');
      if ((onboardingState.problem || '').trim().length < 40) return setError('Problem must be at least 40 characters.');
      if ((onboardingState.targetCustomer || '').trim().length < 25) return setError('Target customer must be at least 25 characters.');
      if ((onboardingState.previousWins || '').trim().length < 40) return setError('Previous wins must be at least 40 characters.');
      if (!onboardingState.traction) return setError('Traction is required.');
    } else {
      if ((onboardingState.desiredRole || '').trim().length < 3) return setError('Desired role is required.');
      if ((onboardingState.focusAreas || '').trim().length < 25) return setError('Focus areas must be at least 25 characters.');
      if ((onboardingState.achievements || '').trim().length < 40) return setError('Achievements must be at least 40 characters.');
      if ((onboardingState.idealStartup || '').trim().length < 25) return setError('Ideal startup must be at least 25 characters.');
    }
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      if (auth.currentUser && auth.currentUser.displayName !== name.trim()) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      }

      const updated: User = {
        ...currentUser,
        name: name.trim(),
        title: title.trim() || currentUser.title,
        bio: bio.trim(),
        skills,
        onboarding: onboardingState,
      };

      await setDoc(
        doc(db, 'users', currentUser.id),
        { ...updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );

      onUpdateUser(updated);
      setSaved(true);
    } catch (e: any) {
      setError((e.message || 'Could not save profile.').replace('Firebase: ', ''));
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setQuery('');
      setSaved(false);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((x) => x !== skill));
    setSaved(false);
  };

  const founder = currentUser.role === 'founder';

  return (
    <div className="relative mx-auto max-w-6xl p-5 sm:p-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(124,58,237,.08),transparent_30%),radial-gradient(circle_at_90%_30%,rgba(37,99,235,.07),transparent_30%),#fff]" />

      <div className="mb-7">
        <span className="mornai-glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" /> Profile intelligence
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">Your professional context.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          Everything you entered during onboarding lives here. Edit it anytime, keep the useful parts specific, and let MornAI use the profile as structured context for matching and workspace decisions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
        <div className="space-y-5">
          <section className="mornai-glass-card rounded-[28px] p-6">
            <div className="flex items-center gap-4">
              <img src={currentUser.avatar} alt={currentUser.name} className="h-20 w-20 rounded-2xl object-cover shadow-md" />
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">{name || 'Your profile'}</h2>
                <p className="mt-1 text-sm capitalize text-slate-500">{founder ? 'Founder / Co-founder' : 'Startup worker / contributor'}</p>
                <p className="mt-2 text-xs font-semibold text-indigo-600">{skills.length} skills • {onboardingState.experienceLevel || 'Experience level not set'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <MiniStat icon={<Target />} label="90-day goal" value={onboardingState.goal || 'Add a concrete goal'} />
              <MiniStat icon={<Clock3 />} label="Availability" value={onboardingState.availability || 'Add availability'} />
              <MiniStat icon={<UsersRound />} label="Work style" value={onboardingState.workStyle || 'Add work style'} />
            </div>
          </section>

          <section id="profile-ai-optimizer" className="mornai-glass-card rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-950">Why your profile is stronger</h3>
              </div>
              <button type="button" onClick={() => void optimizeWithAi()} disabled={isOptimizingWithAi} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black text-white hover:bg-violet-700 disabled:opacity-50">
                <Sparkles className="h-3 w-3" /> {isOptimizingWithAi ? 'Optimizing…' : 'Optimize with AI'}
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Specific skills, clear outcomes, a concrete goal and a real story give founders and the AI more useful signals than a generic title ever could.
            </p>
            {aiProfileStrengths.length > 0 && (
              <div className="mt-4 rounded-2xl bg-violet-50/80 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-600">AI profile read</p>
                <div className="mt-2 space-y-1">{aiProfileStrengths.slice(0, 3).map((item) => <p key={item} className="text-xs font-semibold text-violet-800">• {item}</p>)}</div>
              </div>
            )}
            <div className="mt-5 grid gap-2 text-xs font-semibold text-slate-600">
              {['Skills are searchable', 'Role-specific context is stored', 'Your goals stay attached to your profile', 'Everything here is editable'].map((x) => (
                <div key={x} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {x}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-red-100 bg-red-50/80 p-6">
            <h3 className="font-extrabold text-red-700">Account</h3>
            <p className="mt-2 text-sm text-red-600/80">Sign out of the current MornAI account.</p>
            <button onClick={onLogout} className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </section>
        </div>

        <section className="mornai-glass-card rounded-[28px] p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditorField label="Name" value={name} onChange={setName} min={2} />
            <EditorField label="Professional / founder title" value={title} onChange={setTitle} min={3} />
          </div>

          <EditorArea label="Profile story" value={bio} onChange={setBio} min={60} rows={7} />

          <div className="mt-6">
            <label className="mb-2 block text-xs font-bold text-slate-500">Skills (minimum 3)</label>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Add another skill..."
                className="w-full rounded-2xl border border-indigo-200/80 bg-white/[.62] px-4 py-3.5 pr-16 text-sm text-slate-900 outline-none backdrop-blur-xl shadow-[0_0_0_1px_rgba(99,102,241,.16),0_0_20px_rgba(99,102,241,.10)] transition-shadow focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_1px_rgba(99,102,241,.32),0_0_26px_rgba(99,102,241,.18)]"
              />
              <AiAssistButton value={query} onComplete={setQuery} field="Skills search" label="AI assist for skills" />
              {query && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-2xl">
                  {matches.map((skill) => <button key={skill} type="button" onClick={() => addSkill(skill)} className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-indigo-50">{skill}</button>)}
                  {!matches.length && <button type="button" onClick={() => addSkill(query)} className="w-full px-4 py-3 text-left text-sm text-indigo-600">Add “{query}”</button>}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button key={skill} type="button" onClick={() => removeSkill(skill)} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                  {skill} ×
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200/80 pt-7">
            <div className="flex items-center gap-2">
              {founder ? <Building2 className="h-5 w-5 text-indigo-600" /> : <UserCircle2 className="h-5 w-5 text-indigo-600" />}
              <h3 className="text-lg font-extrabold text-slate-950">{founder ? 'Founder context' : 'Contributor context'}</h3>
            </div>

            {founder ? (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <EditorField label="Startup / project name" value={onboardingState.startupName || ''} onChange={(v) => setField('startupName', v)} min={2} />
                  <EditorField label="Industry" value={onboardingState.industry || ''} onChange={(v) => setField('industry', v)} min={2} />
                  <EditorSelect label="Stage" value={onboardingState.startupStage || ''} onChange={(v) => setField('startupStage', v)} options={['Idea','MVP','Early traction','Growing team']} />
                  <EditorSelect label="Traction" value={onboardingState.traction || ''} onChange={(v) => setField('traction', v)} options={['Pre-launch','MVP users','Early revenue','Growing revenue','Established customer base']} />
                </div>
                <EditorArea label="Problem" value={onboardingState.problem || ''} onChange={(v) => setField('problem', v)} min={40} rows={4} />
                <EditorArea label="Target customer" value={onboardingState.targetCustomer || ''} onChange={(v) => setField('targetCustomer', v)} min={25} rows={3} />
                <EditorArea label="Relevant experience / previous wins" value={onboardingState.previousWins || ''} onChange={(v) => setField('previousWins', v)} min={40} rows={4} />
              </>
            ) : (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <EditorField label="Desired startup role" value={onboardingState.desiredRole || ''} onChange={(v) => setField('desiredRole', v)} min={3} />
                  <EditorField label="Ideal startup / environment" value={onboardingState.idealStartup || ''} onChange={(v) => setField('idealStartup', v)} min={25} />
                </div>
                <EditorArea label="Problems you want to work on" value={onboardingState.focusAreas || ''} onChange={(v) => setField('focusAreas', v)} min={25} rows={3} />
                <EditorArea label="Achievements / proof of work" value={onboardingState.achievements || ''} onChange={(v) => setField('achievements', v)} min={40} rows={4} />
              </>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <EditorSelect label="Experience level" value={onboardingState.experienceLevel || ''} onChange={(v) => setField('experienceLevel', v)} options={['Student / Early career','1–2 years','3–5 years','6–10 years','10+ years']} />
              <EditorSelect label="Availability" value={onboardingState.availability || ''} onChange={(v) => setField('availability', v)} options={['Part-time (5–20 hours / week)','Full-time (20+ hours / week)','Flexible / project-based']} />
              <EditorSelect label="Work style" value={onboardingState.workStyle || ''} onChange={(v) => setField('workStyle', v)} options={['Remote','Hybrid','In-person','Flexible']} />
            </div>

            <EditorArea label="What you can contribute" value={onboardingState.contribution || ''} onChange={(v) => setField('contribution', v)} min={40} rows={4} />
            <EditorArea label="90-day goal" value={onboardingState.goal || ''} onChange={(v) => setField('goal', v)} min={30} rows={3} />
            <EditorArea label="Why startups?" value={onboardingState.motivation || ''} onChange={(v) => setField('motivation', v)} min={30} rows={3} />
          </div>

          {error && <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">{saved ? 'Profile saved successfully.' : 'Your changes are saved to your Firebase profile.'}</div>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-300/25 transition hover:bg-indigo-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const MiniStat = ({ icon, label, value }: any) => (
  <div className="mornai-glass-card flex items-center gap-3 rounded-2xl p-3">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-700">{value}</p>
    </div>
  </div>
);

const AiAssistButton = ({
  label = 'AI assist',
  value = '',
  onComplete,
  field = label,
}: {
  label?: string;
  value?: string;
  onComplete?: (next: string) => void;
  field?: string;
}) => {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const source = String(value || '').trim();
    if (!source || !onComplete || busy) return;
    setBusy(true);
    try {
      const data = await postMornAI<{ text?: string }>('writing-assist', {
        text: source,
        field,
        context: 'MornAI professional profile. Improve the user\'s own facts without inventing credentials.',
      });
      const next = String(data?.text || '').trim();
      if (next) onComplete(next);
    } catch (error) {
      console.error('Profile AI writing assist failed:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={!String(value || '').trim() || busy}
      title={busy ? 'MornAI is rewriting this field…' : label}
      aria-label={label}
      className="absolute bottom-2 right-2 inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-white/90 px-2 text-[9px] font-black text-violet-600 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Sparkles className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'AI…' : 'AI'}
    </button>
  );
};

const EditorField = ({ label, value, onChange, min = 0 }: any) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold text-slate-500">{label}</span>
    <div className="relative">
      <input minLength={min} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-indigo-200/80 bg-white/[.62] px-4 py-3.5 pr-16 text-sm text-slate-900 outline-none backdrop-blur-xl shadow-[0_0_0_1px_rgba(99,102,241,.16),0_0_20px_rgba(99,102,241,.10)] transition-shadow focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_1px_rgba(99,102,241,.32),0_0_26px_rgba(99,102,241,.18)]" />
      <AiAssistButton value={value} onComplete={onChange} field={label} label={`AI assist: ${label}`} />
    </div>
  </label>
);

const EditorArea = ({ label, value, onChange, min = 0, rows = 4 }: any) => (
  <label className="mt-4 block">
    <span className="mb-2 block text-xs font-bold text-slate-500">{label}{min ? ' • minimum ' + min + ' characters' : ''}</span>
    <div className="relative">
      <textarea minLength={min} required value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-2xl border border-indigo-200/80 bg-white/[.62] px-4 py-3.5 pb-10 pr-16 text-sm leading-6 text-slate-900 outline-none backdrop-blur-xl shadow-[0_0_0_1px_rgba(99,102,241,.16),0_0_20px_rgba(99,102,241,.10)] transition-shadow focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_1px_rgba(99,102,241,.32),0_0_26px_rgba(99,102,241,.18)]" />
      <AiAssistButton value={value} onComplete={onChange} field={label} label={`AI assist: ${label}`} />
    </div>
  </label>
);

const EditorSelect = ({ label, value, onChange, options }: any) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold text-slate-500">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-indigo-200/80 bg-white/[.62] px-4 py-3.5 text-sm text-slate-700 outline-none backdrop-blur-xl shadow-[0_0_0_1px_rgba(99,102,241,.16),0_0_20px_rgba(99,102,241,.10)] transition-shadow focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_1px_rgba(99,102,241,.32),0_0_26px_rgba(99,102,241,.18)]">
      <option value="">Select...</option>
      {options.map((x: string) => <option key={x}>{x}</option>)}
    </select>
  </label>
);
