import React, { useEffect, useMemo, useState } from 'react';
import { Startup, User, RolePost, Appointment, MatchingAnalysis } from '../types';
import { formatAnyCurrency, useLocalizedCurrency } from '../lib/currency';
import {
  ArrowLeft, ArrowRight, Calendar, CheckCircle2, Clock3, BrainCircuit,
  ShieldCheck, Send, Sparkles, Video, MapPin, BriefcaseBusiness, Users,
  Check, ChevronRight
} from 'lucide-react';

interface AppointmentBookingPageProps {
  startup: Startup | null;
  selectedRole?: RolePost;
  requestKind?: 'sync' | 'interest';
  currentUser: User;
  onConfirmAppointment: (appointment: Appointment) => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}

const getToday = () => new Date().toISOString().split('T')[0];

const getBookingPartnershipAmount = (partnership: RolePost['partnership'], formatMoney: (usd: number) => string) => {
  if (!partnership) return '';
  if (typeof partnership.amount === 'number' && partnership.currencyCode) return formatAnyCurrency(partnership.amount, partnership.currencyCode);
  if (typeof partnership.amountUsd === 'number') return formatMoney(partnership.amountUsd);
  return '';
};

const getBookingPartnershipSummary = (role: RolePost, formatMoney: (usd: number) => string) => {
  const p = role.partnership;
  if (!p) return role.type || 'Founder-defined partnership';
  switch (p.mode) {
    case 'equity': return p.equityPercent ? p.equityPercent + '% equity' : 'Equity';
    case 'helper': return 'Volunteer / helper';
    case 'pay_on_delivery': return getBookingPartnershipAmount(p, formatMoney) ? getBookingPartnershipAmount(p, formatMoney) + ' on delivery' : 'Pay on delivery';
    case 'pay_per_hour': return getBookingPartnershipAmount(p, formatMoney) ? getBookingPartnershipAmount(p, formatMoney) + ' / hour' : 'Based on hour';
    case 'pay_per_task': return getBookingPartnershipAmount(p, formatMoney) ? getBookingPartnershipAmount(p, formatMoney) + ' / task' : 'Per task';
    case 'fixed_project': return getBookingPartnershipAmount(p, formatMoney) ? getBookingPartnershipAmount(p, formatMoney) + ' / project' : 'Per project';
    case 'monthly_salary': return getBookingPartnershipAmount(p, formatMoney) ? getBookingPartnershipAmount(p, formatMoney) + ' / month' : 'Monthly salary / stipend';
    case 'revenue_share': return p.equityPercent ? p.equityPercent + '% revenue share' : 'Revenue share';
    case 'profit_share': return p.equityPercent ? p.equityPercent + '% profit share' : 'Profit share';
    case 'commission': return p.equityPercent ? p.equityPercent + '% commission' : 'Sales commission';
    case 'work_exchange': return p.details || 'Work exchange';
    case 'custom': return p.details || 'Custom arrangement';
    case 'equity_plus_cash': return p.equityPercent && getBookingPartnershipAmount(p, formatMoney) ? p.equityPercent + '% equity + ' + getBookingPartnershipAmount(p, formatMoney) : 'Equity + cash';
    default: return p.label || role.type || 'Founder-defined partnership';
  }
};

const getBookingPartnershipDetail = (role: RolePost) => {
  const p = role.partnership;
  if (!p) return role.commitment || 'Founder-defined terms';
  return [p.milestone, p.details, p.expectation].filter(Boolean).join(' • ') || role.commitment || 'Founder-defined terms';
};

export const AppointmentBookingPage: React.FC<AppointmentBookingPageProps> = ({
  startup,
  selectedRole,
  requestKind = 'sync',
  currentUser,
  onConfirmAppointment,
  onCancel,
  onDone,
}) => {
  const [roleTitle, setRoleTitle] = useState(selectedRole?.title || 'Core Skill Contributor');
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState('14:00');
  const [pitchMessage, setPitchMessage] = useState('');
  const [matchAnalysis, setMatchAnalysis] = useState<MatchingAnalysis | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { format: formatMoney } = useLocalizedCurrency(currentUser);
  const isInterestRequest = requestKind === 'interest';

  useEffect(() => {
    if (!startup) return;
    const firstOpenRole = startup.openRoles?.find((role) => role.status === 'open');
    setRoleTitle(selectedRole?.title || firstOpenRole?.title || 'Core Skill Contributor');
    if (firstOpenRole) {
      setPitchMessage((current) => current || `Hi ${startup.founderName}, I’m interested in the ${firstOpenRole.title} opportunity. I can contribute ${currentUser.skills.slice(0, 3).join(', ')} and help move the current sprint forward.`);
    }
  }, [startup, selectedRole, currentUser.skills]);

  useEffect(() => {
    if (!startup || isInterestRequest) return;
    const analyzeMatch = async () => {
      setIsLoadingMatch(true);
      try {
        const res = await fetch('/api/ai/match-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startup, candidate: currentUser }),
        });
        const data = await res.json();
        setMatchAnalysis(data);
      } catch (err) {
        console.error('Match analysis error:', err);
      } finally {
        setIsLoadingMatch(false);
      }
    };
    analyzeMatch();
  }, [startup, currentUser, isInterestRequest]);

  const openRoles = useMemo(
    () => (startup?.openRoles || []).filter((role) => role.status === 'open'),
    [startup],
  );
  const activeRole = openRoles.find((role) => role.title === roleTitle) || selectedRole;

  if (!startup) {
    return (
      <div className="mornai-book-sync-page min-h-0 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-2xl pt-10 text-center">
          <div className="mornai-page-panel mx-auto max-w-xl rounded-[28px] p-10">
            <Calendar className="mx-auto h-10 w-10 text-violet-500" />
            <h1 className="mt-4 text-2xl font-extrabold text-slate-950">No startup selected</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose a startup before opening a founder sync.</p>
            <button onClick={onCancel} className="mornai-primary-action mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white">
              <ArrowLeft className="h-4 w-4" /> Back to discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInterestRequest) {
    return (
      <div className="mornai-book-sync-page min-h-0 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex min-h-[240px] max-w-2xl items-center justify-center py-16">
          <section className="mornai-page-panel w-full overflow-hidden rounded-[30px]">
            <div className="mornai-booking-hero p-7 text-white sm:p-10">
              <div className="flex items-start gap-4">
                <img src={startup.logo} alt={startup.name} className="h-16 w-16 shrink-0 rounded-2xl border border-white/20 bg-white/10 object-cover shadow-xl" />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-200">Preview startup</p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">This startup is only a preview.</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Sync requests are available after the startup is published.</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                <div>
                  <p className="text-sm font-extrabold text-slate-950">{startup.name} is currently a preview listing.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">You can explore the startup and its available work, but a founder sync can only be requested once the startup is published.</p>
                </div>
              </div>
              <button onClick={onCancel} className="mornai-primary-action mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white">
                <ArrowLeft className="h-4 w-4" /> Back to startup discovery
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (currentUser.id === startup.founderId) {
      setSubmitError('You are the founder of this startup. Switch to a contributor account to request a founder conversation.');
      return;
    }

    if (!roleTitle.trim()) {
      setSubmitError('Select an available role before booking the conversation.');
      return;
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      participants: [startup.founderId, currentUser.id],
      startupId: startup.id,
      startupName: startup.name,
      founderId: startup.founderId,
      founderName: startup.founderName,
      talentId: currentUser.id,
      talentName: currentUser.name,
      talentAvatar: currentUser.avatar,
      talentSkills: currentUser.skills,
      roleTitle,
      date,
      time,
      status: 'pending',
      meetingLink: `https://meet.mornai.ai/room/${startup.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      pitchMessage: pitchMessage.trim() || `Excited to join ${startup.name} and contribute to the current sprint roadmap.`,
      aiMatchScore: matchAnalysis?.matchScore || 92,
      aiPreparationBrief: matchAnalysis?.synergyAnalysis || 'Your profile shows relevant alignment with the startup roadmap.',
      createdDate: getToday(),
    };
    try {
      await onConfirmAppointment(newAppointment);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Appointment save error:', error);
      setSubmitError(error?.message || 'Unable to save the appointment request. Please try again.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="mornai-book-sync-page min-h-0 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mornai-book-sync-topbar">
            <button onClick={onCancel} className="mornai-back-action inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold">
              <ArrowLeft className="h-4 w-4" /> Back to discovery
            </button>
            <div className="mornai-book-sync-brand">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Calendar className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600">MornAI Syncs</p><p className="text-sm font-extrabold text-slate-950">Book Sync</p></div>
            </div>
          </div>
          <div className="mornai-page-panel overflow-hidden rounded-[30px]">
            <div className="mornai-booking-hero p-7 text-white sm:p-10">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-200">Request sent</p>
                  <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Your founder sync is on its way.</h1>
                </div>
              </div>
            </div>
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_.72fr]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-400">Appointment</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-950">{startup.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{roleTitle} • {date} • {time}</p>
                <div className="mornai-booking-summary mt-5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-700"><Sparkles className="h-4 w-4" /> AI fit brief</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{matchAnalysis?.synergyAnalysis || 'Your profile context will be attached to the founder request.'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/75 p-5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800"><Check className="h-4 w-4 text-emerald-600" /> Sync details ready</div>
                <p className="mt-2 text-xs leading-6 text-emerald-700">The appointment is now visible in your Syncs workspace with the selected role, pitch and AI preparation brief.</p>
                <button onClick={onDone} className="mornai-primary-action mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white">Open Syncs <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mornai-book-sync-page min-h-0 px-5 py-7 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-6xl">
        <div className="mornai-book-sync-topbar mb-5">
          <button onClick={onCancel} className="mornai-back-action inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Back to discovery</button>
          <div className="mornai-book-sync-brand">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Calendar className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600">MornAI Syncs</p><p className="text-sm font-extrabold text-slate-950">Book Sync</p></div>
          </div>
        </div>

        <div className="mornai-book-sync-intro mb-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600">Founder conversation</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Book a founder sync</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Choose the contribution, pick a time, and send the founder a clear introduction. Everything stays attached to this startup.</p>
          </div>
          <div className="mornai-book-sync-steps"><span className="is-active"><b>1</b> Details</span><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span><b>2</b> Schedule</span><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span><b>3</b> Send</span></div>
        </div>

        <div className="mornai-page-panel overflow-hidden rounded-[30px]">
          <div className="mornai-booking-hero relative overflow-hidden p-6 text-white sm:p-9">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div className="flex items-start gap-4">
                <img src={startup.logo} alt={startup.name} className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-xl" />
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.15em] text-violet-200">Founder sync</span><span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300"><MapPin className="h-3 w-3" /> {startup.location}</span></div>
                  <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Book a conversation with {startup.founderName}.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{startup.name} • {startup.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-200"><Users className="h-3.5 w-3.5" /> Founder: {startup.founderName}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-200"><MapPin className="h-3.5 w-3.5" /> {startup.location}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-extrabold text-violet-200"><BrainCircuit className="h-4 w-4" /> AI compatibility</div>
                <p className="mt-2 text-xs leading-6 text-slate-300">{isLoadingMatch ? 'Analyzing your profile against the startup context…' : matchAnalysis?.synergyAnalysis || 'Your profile context is ready for founder review.'}</p>
                {matchAnalysis && <div className="mt-4 flex items-end justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Fit score</span><span className="text-2xl font-extrabold text-emerald-300">{matchAnalysis.matchScore}%</span></div>}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_.72fr]">
            <form onSubmit={submit} className="space-y-5">
              {submitError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-5 text-rose-700">{submitError}</div>}
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-400">Schedule</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Choose how you want to start the conversation.</h2></div><ShieldCheck className="h-5 w-5 text-violet-500" /></div>
              <div className="mornai-book-sync-section-label"><span>01</span><div><p>Contribution</p><h2>Select the opportunity you want to discuss.</h2></div></div>
              <div><label className="mb-2 block text-xs font-extrabold text-slate-600">Role / contribution</label><select value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="mornai-booking-field w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none">{openRoles.map((role) => <option key={role.id} value={role.title}>{role.title} • {role.type}</option>)}<option value="General Technical Co-Founder / Contributor">General Contributor / Fellow</option></select></div>
              {activeRole && <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-600">Founder-selected partnership</p><p className="mt-1 text-sm font-black text-slate-950">{getBookingPartnershipSummary(activeRole, formatMoney)}</p><p className="mt-2 text-[10px] leading-5 text-slate-600">{getBookingPartnershipDetail(activeRole)}</p></div>}
              <div className="mornai-book-sync-section-label mt-2"><span>02</span><div><p>Schedule</p><h2>Pick a time that works for you.</h2></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-2 block text-xs font-extrabold text-slate-600">Preferred date</label><div className="relative"><Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" /><input type="date" required min={getToday()} value={date} onChange={(e) => setDate(e.target.value)} className="mornai-booking-field w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none" /></div></div>
                <div><label className="mb-2 block text-xs font-extrabold text-slate-600">Time slot</label><div className="relative"><Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" /><select value={time} onChange={(e) => setTime(e.target.value)} className="mornai-booking-field w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none">{['10:00','11:30','14:00','16:30'].map((slot) => <option key={slot}>{slot}</option>)}</select></div></div>
              </div>
              <div className="mornai-book-sync-section-label mt-2"><span>03</span><div><p>Introduction</p><h2>Give the founder useful context.</h2></div></div>
              <div><label className="mb-2 block text-xs font-extrabold text-slate-600">Your founder pitch</label><textarea rows={6} required value={pitchMessage} onChange={(e) => setPitchMessage(e.target.value)} placeholder="Explain what you can contribute and what you want to help build." className="mornai-booking-field w-full rounded-2xl px-4 py-3.5 text-sm leading-6 text-slate-800 outline-none" /><p className="mt-2 text-[11px] text-slate-400">MornAI attaches this to the founder's preparation brief.</p></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Video className="h-4 w-4 text-violet-500" /> Integrated sync details are created with the request.</div><button type="submit" className="mornai-primary-action inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white"><Send className="h-4 w-4" /> Send sync request</button></div>
            </form>

            <aside className="space-y-4">
              <section className="mornai-booking-side rounded-[24px] p-5"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-extrabold text-slate-950">Open opportunities</h3></div><div className="mt-4 space-y-3">{openRoles.slice(0, 4).map((role) => <button key={role.id} type="button" onClick={() => setRoleTitle(role.title)} className={`w-full rounded-2xl border p-4 text-left transition-all ${roleTitle === role.title ? 'border-violet-300 bg-violet-50/80 shadow-[0_14px_34px_rgba(124,58,237,.10)]' : 'border-slate-200 bg-white/75 hover:border-violet-200 hover:bg-white'}`}><div className="flex items-start justify-between gap-3"><b className="text-sm text-slate-900">{role.title}</b><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-violet-700">{role.type}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500 line-clamp-3">{role.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{(role.skills || []).slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{skill}</span>)}</div></button>)}</div></section>
              <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/75 p-5"><div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Founder context included</div><p className="mt-2 text-xs leading-6 text-emerald-700">Your profile, selected role and pitch travel together so the founder gets context instead of another mystery calendar invite.</p></section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
