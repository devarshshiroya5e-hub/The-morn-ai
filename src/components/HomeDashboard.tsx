import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  MessageCircle,
  Network,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { Appointment, ConnectionRequest, Startup, User } from '../types';
import { buildMornaiNotifications, formatRelativeDate, scoreStartupForTalent, scoreTalentForStartup } from './mornaiSignals';

interface HomeDashboardProps {
  currentUser: User;
  startups: Startup[];
  appointments: Appointment[];
  allTalents: User[];
  previousVisitAt?: number;
  unreadNotificationCount: number;
  connections: ConnectionRequest[];
  followedStartupIds: string[];
  dailyStreak: number;
  dailyActionsCompleted: number;
  onOpenNetwork: (tab?: 'people' | 'startups' | 'opportunities') => void;
  onOpenWorkspace: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenAiDrawer: () => void;
  onOpenPricing: () => void;
  onSelectStartup: (startup: Startup) => void;
  onBookAppointment: (startup: Startup, role?: Startup['openRoles'][number]) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  currentUser,
  startups,
  appointments,
  allTalents,
  previousVisitAt,
  unreadNotificationCount,
  connections,
  followedStartupIds,
  dailyStreak,
  dailyActionsCompleted,
  onOpenNetwork,
  onOpenWorkspace,
  onOpenMessages,
  onOpenNotifications,
  onOpenAiDrawer,
  onOpenPricing,
  onSelectStartup,
  onBookAppointment,
}) => {
  const isFounder = currentUser.role === 'founder';
  const liveStartups = useMemo(() => startups.filter((startup) => startup.persisted), [startups]);
  const relatedStartup = useMemo(
    () => startups.find((startup) => startup.founderId === currentUser.id)
      || startups.find((startup) => startup.memberIds?.includes(currentUser.id))
      || startups.find((startup) => startup.members.some((member) => member.userId === currentUser.id)),
    [currentUser.id, startups],
  );

  const notifications = useMemo(
    () => buildMornaiNotifications(currentUser, liveStartups, appointments, connections, followedStartupIds),
    [appointments, connections, currentUser, followedStartupIds, liveStartups],
  );

  const matchCards = useMemo(() => {
    if (isFounder) {
      return allTalents
        .map((talent) => ({ talent, score: scoreTalentForStartup(talent, relatedStartup) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    }
    return startups
      .filter((startup) => startup.openRoles.some((role) => role.status === 'open'))
      .map((startup) => ({ startup, score: scoreStartupForTalent(startup, currentUser) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [allTalents, currentUser, isFounder, liveStartups, relatedStartup, startups]);

  const unfinishedTasks = relatedStartup?.tasks.filter((task) => task.status !== 'done').length || 0;
  const openRoles = relatedStartup?.openRoles.filter((role) => role.status === 'open').length || 0;
  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === 'pending' && (appointment.founderId === currentUser.id || appointment.talentId === currentUser.id),
  ).length;

  const daysAway = previousVisitAt
    ? Math.max(0, Math.floor((Date.now() - previousVisitAt) / 86400000))
    : 0;

  const sinceText = previousVisitAt
    ? daysAway >= 1
      ? `since ${daysAway === 1 ? 'yesterday' : `${daysAway} days ago`}`
      : `since ${formatRelativeDate(previousVisitAt)}`
    : 'since you joined';

  const dailyQuotes = [
    'Build slowly enough to think clearly, but fast enough to learn.',
    'A strong startup is built by the right people working on the right bottleneck.',
    'Clarity compounds: clear roles, clear problems, clear next actions.',
    'Good execution is mostly choosing what not to do next.',
    'The fastest path forward is usually the next test, not the next idea.',
    'Context is an advantage when your team can actually use it.',
  ];

  const [dailyQuote] = React.useState(() => {
    const storageKey = `mornai-home-quote-index:${currentUser.id}`;
    const previousIndex = Number(window.localStorage.getItem(storageKey));
    let nextIndex = Math.floor(Math.random() * dailyQuotes.length);

    if (Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < dailyQuotes.length) {
      while (dailyQuotes.length > 1 && nextIndex === previousIndex) {
        nextIndex = (nextIndex + 1) % dailyQuotes.length;
      }
    }

    window.localStorage.setItem(storageKey, String(nextIndex));
    return dailyQuotes[nextIndex];
  });

  const topInsight = isFounder
    ? relatedStartup && openRoles
      ? `Your next bottleneck is likely hiring. You have ${openRoles} active role${openRoles === 1 ? '' : 's'} and ${allTalents.length} visible contributors in your current network.`
      : 'Create one clear opportunity and let MornAI find people who fit it.'
    : `Your strongest matches currently cluster around ${currentUser.skills.slice(0, 2).join(' and ') || 'your listed skills'}.`;

  const statCards = isFounder
    ? [
        { label: 'Open opportunities', value: openRoles, icon: BriefcaseBusiness, tone: 'mornai-home-stat-violet' },
        { label: 'Pending syncs', value: pendingAppointments, icon: Clock3, tone: 'mornai-home-stat-amber' },
        { label: 'Work items', value: unfinishedTasks, icon: CheckCircle2, tone: 'mornai-home-stat-emerald' },
        { label: 'Network', value: allTalents.length, icon: Network, tone: 'mornai-home-stat-sky' },
      ]
    : [
        { label: 'Strong matches', value: matchCards.length, icon: Sparkles, tone: 'mornai-home-stat-violet' },
        { label: 'Open opportunities', value: startups.reduce((sum, startup) => sum + startup.openRoles.filter((role) => role.status === 'open').length, 0), icon: BriefcaseBusiness, tone: 'mornai-home-stat-amber' },
        { label: 'Pending syncs', value: pendingAppointments, icon: Clock3, tone: 'mornai-home-stat-emerald' },
        { label: 'Reputation', value: Math.round(currentUser.reputationScore || 82), icon: Star, tone: 'mornai-home-stat-sky', suffix: '/100' },
      ];

  return (
    <div className="mornai-home-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mornai-section-kicker"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Today</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {currentUser.name.split(' ')[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Here's what changed {sinceText}, plus the people and opportunities most worth your attention.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="mornai-home-icon-btn relative shrink-0"
          aria-label="Notifications"
        >
          <BellRing className="h-4 w-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1 text-[9px] font-black text-white shadow-lg">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>
      </div>

      <div className="mornai-home-hero relative overflow-hidden rounded-[30px] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="absolute bottom-5 left-5 right-5 z-10 sm:left-8 sm:right-8">
          <div className="inline-flex max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-[10px] font-semibold text-violet-100/85 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span>{dailyQuote}</span>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.35fr_.65fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-violet-100">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> MornAI Match Radar
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">
              {isFounder ? 'The right people can move your startup forward.' : 'The right startup can turn your skills into real work.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100/80">
              {isFounder
                ? 'MornAI continuously surfaces contributors who fit your skills, stage, availability, and active needs.'
                : 'MornAI finds startups whose open work lines up with what you can actually build, not just what a keyword search says.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onOpenNetwork(isFounder ? 'people' : 'opportunities')}
                className="mornai-home-primary"
              >
                {isFounder ? 'Find people' : 'Explore opportunities'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onOpenAiDrawer} className="mornai-home-secondary">
                <Sparkles className="h-3.5 w-3.5" /> Ask MornAI
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[.08] p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">While you were away</p>
                <p className="mt-1 text-sm font-black text-white">
                  {unreadNotificationCount ? `${unreadNotificationCount} things need a look` : (isFounder ? 'Your workspace is clear' : 'No new network activity yet')}
                </p>
              </div>
              <Flame className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-4 space-y-2">
              {notifications.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/10">
                      {item.type === 'match' ? <Sparkles className="h-3.5 w-3.5 text-violet-200" /> :
                        item.type === 'appointment' ? <Clock3 className="h-3.5 w-3.5 text-amber-200" /> :
                          <Rocket className="h-3.5 w-3.5 text-emerald-200" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-5 text-violet-100/70">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.04] p-4 text-xs text-violet-100/80">
                  <p className="font-bold text-white">
                    {isFounder ? 'Your next useful move' : 'Keep the network moving'}
                  </p>
                  <p className="mt-1 leading-5">
                    {isFounder
                      ? 'Review an open role, invite a contributor, or refresh your startup context so the right people can find you.'
                      : 'Review startup matches, refresh your profile, or open a private conversation with someone you are connected to.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mornai-daily-loop">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm"><Flame className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.15em] text-amber-600">Daily operating loop</p>
            <p className="mt-1 text-sm font-black text-slate-950">{dailyStreak > 0 ? dailyStreak + ' day active streak' : 'Start your first active day'}</p>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-500">Do 3 useful things and tomorrow's MornAI home becomes more relevant.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5" aria-label="Daily progress">
            {[0, 1, 2].map((step) => <span key={step} className={"h-2 w-8 rounded-full " + (step < dailyActionsCompleted ? "bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,.18)]" : "bg-slate-200")} />)}
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1.5 text-[9px] font-black text-violet-700">{Math.min(3, dailyActionsCompleted)}/3</span>
        </div>
      </div>

      {isFounder && relatedStartup && relatedStartup.tasks.length > 0 && (
        <section className="mornai-home-panel rounded-[28px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="mornai-section-kicker">Current sprint</span>
              <h2 className="mt-3 text-xl font-black text-slate-950">The three tasks currently visible to your startup team</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">These are the active work items attached to {relatedStartup.name}.</p>
            </div>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">{Math.min(3, relatedStartup.tasks.length)} tasks</span>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {relatedStartup.tasks.slice(0, 3).map((task, index) => (
              <div key={task.id} className="rounded-[20px] border border-slate-200 bg-white/75 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-600 text-[10px] font-black">{index + 1}</span>
                  <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] ${
                    task.priority === 'High' ? 'bg-rose-50 text-rose-600' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>{task.priority}</span>
                </div>
                <h3 className="mt-3 text-xs font-black leading-5 text-slate-950">{task.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-[10px] leading-5 text-slate-500">{task.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-bold text-slate-400">
                  <span>{task.deadline}</span>
                  <span className="capitalize">{task.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`mornai-home-stat ${item.tone}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/85 shadow-sm"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{item.value}{'suffix' in item ? item.suffix : ''}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="mornai-home-panel rounded-[28px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="mornai-section-kicker">Recommended now</span>
              <h2 className="mt-3 text-xl font-black text-slate-950">
                {isFounder ? 'People MornAI found for your startup' : 'Opportunities worth your time'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isFounder ? 'Ranked using your active startup context and visible contributor evidence.' : 'Ranked by your skills, opportunity requirements, and startup context.'}
              </p>
            </div>
            <button type="button" onClick={() => onOpenNetwork(isFounder ? 'people' : 'opportunities')} className="mornai-home-text-link">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <AnimatePresence initial={false}>
              {matchCards.map((item, index) => {
                if (isFounder) {
                  const talent = item.talent;
                  return (
                    <motion.button
                      key={talent.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * .04 }}
                      onClick={() => onOpenNetwork('people')}
                      className="mornai-home-match-card text-left"
                    >
                      <img src={talent.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-slate-950">{talent.name}</h3>
                          <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">{item.score}% fit</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{talent.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {talent.skills.slice(0, 3).map((skill) => <span key={skill} className="mornai-home-chip">{skill}</span>)}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </motion.button>
                  );
                }

                const startup = item.startup;
                const firstRole = startup.openRoles.find((role) => role.status === 'open');
                return (
                  <motion.button
                    key={startup.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * .04 }}
                    onClick={() => firstRole ? onBookAppointment(startup, firstRole) : onSelectStartup(startup)}
                    className="mornai-home-match-card text-left"
                  >
                    <img src={startup.logo} alt="" className="h-11 w-11 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-950">{startup.name}</h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">{item.score}% fit</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{startup.tagline}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {startup.openRoles.filter((role) => role.status === 'open').slice(0, 2).map((role) => (
                          <span key={role.id} className="mornai-home-chip">{role.title}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {matchCards.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                <Search className="mx-auto h-5 w-5 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-700">Your network needs more signal.</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Complete your profile or create a startup opportunity to improve matching.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mornai-home-panel rounded-[28px] p-5 sm:p-6">
          <div>
            <span className="mornai-section-kicker">MornAI insight</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">One useful thing to do today</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{topInsight}</p>
          </div>

          <div className="mt-5 rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-sky-50/80 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">Today's focus</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {isFounder
                    ? pendingAppointments ? 'Respond to your pending founder sync.' : openRoles ? 'Review and improve your strongest open opportunity.' : 'Create your first clear opportunity.'
                    : pendingAppointments ? 'Confirm your next founder conversation.' : 'Open one strong-matching opportunity and start the conversation.'}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Small, concrete actions create the activity that makes tomorrow's recommendations better.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button type="button" onClick={onOpenWorkspace} className="mornai-home-action"><Rocket className="h-4 w-4 text-violet-600" /> Open workspace <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>
            <button type="button" onClick={onOpenMessages} className="mornai-home-action"><MessageCircle className="h-4 w-4 text-sky-600" /> Continue conversations <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>
            <button type="button" onClick={onOpenAiDrawer} className="mornai-home-action"><Sparkles className="h-4 w-4 text-amber-500" /> Ask MornAI what to do next <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>
          </div>
        </section>
      </div>

      <section className="mornai-home-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mornai-section-kicker">Build momentum</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">{isFounder ? 'Your startup is a system, not a collection of tabs.' : 'Your reputation compounds with every real contribution.'}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">MornAI turns real activity into better recommendations, clearer context, and a stronger professional record.</p>
          </div>
          <button type="button" onClick={onOpenPricing} className="mornai-home-pro-cta"><Star className="h-3.5 w-3.5" /> Unlock Pro workflow</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(isFounder ? [
            { title: 'Find people faster', body: 'Use deeper matching, saved searches, and role intelligence.', icon: Users, color: 'violet' },
            { title: 'Operate in one place', body: 'Keep team context, milestones, memory, and conversations connected.', icon: Rocket, color: 'sky' },
            { title: 'Look credible', body: 'Turn your startup context into a polished public company presence.', icon: Sparkles, color: 'amber' },
          ] : [
            { title: 'Get discovered', body: 'Keep your profile and proof-of-work strong so founders can find you.', icon: Search, color: 'violet' },
            { title: 'Find better teams', body: 'See why an opportunity matches you before you invest your time.', icon: Network, color: 'sky' },
            { title: 'Build your record', body: 'Successful startup work becomes durable contribution history.', icon: Star, color: 'amber' },
          ]).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="mornai-home-value-card">
                <span className={`mornai-home-value-icon mornai-tone-${item.color}`}><Icon className="h-4 w-4" /></span>
                <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/90 bg-white/66 px-4 py-3 shadow-[0_18px_42px_rgba(15,23,42,.05)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-slate-950">MornAI keeps the important things together.</p>
            <p className="truncate text-[10px] text-slate-400">People, opportunities, progress, and company context.</p>
          </div>
        </div>
        <button type="button" onClick={() => onOpenNetwork()} className="mornai-home-text-link shrink-0">Open network <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};
