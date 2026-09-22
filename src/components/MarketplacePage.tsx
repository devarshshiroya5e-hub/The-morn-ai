import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Clock3,
  ExternalLink,
  Filter,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { ConnectionRequest, RolePost, Startup, User } from '../types';
import { useLocalizedCurrency } from '../lib/currency';
import { scoreStartupForTalent, scoreTalentForStartup } from './mornaiSignals';

type MarketplaceTab = 'people' | 'startups' | 'opportunities' | 'connections' | 'saved';

interface MarketplacePageProps {
  currentUser: User;
  startups: Startup[];
  allTalents: User[];
  savedTalentIds: string[];
  savedStartupIds: string[];
  followedStartupIds: string[];
  connections: ConnectionRequest[];
  onToggleSavedTalent: (id: string) => void;
  onToggleSavedStartup: (id: string) => void;
  onToggleFollowStartup: (id: string) => void;
  onSendConnection: (user: User) => void;
  onUpdateConnectionStatus: (connectionId: string, status: ConnectionRequest['status']) => void;
  onSelectStartup: (startup: Startup) => void;
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
  initialTab?: MarketplaceTab;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  currentUser,
  startups,
  allTalents,
  savedTalentIds,
  savedStartupIds,
  followedStartupIds,
  connections,
  onToggleSavedTalent,
  onToggleSavedStartup,
  onToggleFollowStartup,
  onSendConnection,
  onUpdateConnectionStatus,
  onSelectStartup,
  onBookAppointment,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<MarketplaceTab>(initialTab || (currentUser.role === 'founder' ? 'people' : 'opportunities'));
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [industry, setIndustry] = useState('All');
  const [selectedTalent, setSelectedTalent] = useState<User | null>(null);
  const [onlyStrongMatches, setOnlyStrongMatches] = useState(false);
  const { format: formatMoney } = useLocalizedCurrency(currentUser);

  const networkStartups = useMemo(() => startups, [startups]);
  const savedPeople = useMemo(() => allTalents.filter((person) => savedTalentIds.includes(person.id)), [allTalents, savedTalentIds]);
  const savedStartups = useMemo(() => networkStartups.filter((startup) => savedStartupIds.includes(startup.id)), [networkStartups, savedStartupIds]);
  const industries = useMemo(() => ['All', ...Array.from(new Set(networkStartups.map((startup) => startup.industry))).slice(0, 8)], [networkStartups]);

  const openRoles = useMemo(
    () => networkStartups.flatMap((startup) =>
      startup.openRoles
        .filter((role) => role.status === 'open')
        .map((role) => ({ startup, role })),
    ),
    [networkStartups],
  );

  const rankedTalents = useMemo(() => {
    return allTalents
      .map((talent) => ({ talent, score: scoreTalentForStartup(talent, currentUser.role === 'founder' ? networkStartups.find((startup) => startup.founderId === currentUser.id) : undefined) }))
      .filter(({ talent }) => talent.id !== currentUser.id)
      .filter(({ talent }) => !query || [talent.name, talent.title, talent.bio, ...talent.skills].join(' ').toLowerCase().includes(query.toLowerCase()))
      .filter(({ score }) => !onlyStrongMatches || score >= 84)
      .sort((a, b) => b.score - a.score);
  }, [allTalents, currentUser.id, currentUser.role, networkStartups, onlyStrongMatches, query]);

  const rankedStartups = useMemo(() => {
    return networkStartups
      .map((startup) => ({ startup, score: currentUser.role === 'employee' ? scoreStartupForTalent(startup, currentUser) : (startup.verified ? 86 : 72) }))
      .filter(({ startup }) => !query || [startup.name, startup.tagline, startup.pitch, startup.industry, ...startup.techStack].join(' ').toLowerCase().includes(query.toLowerCase()))
      .filter(({ startup }) => industry === 'All' || startup.industry === industry)
      .filter(({ score }) => !onlyStrongMatches || score >= 84)
      .sort((a, b) => b.score - a.score);
  }, [currentUser, industry, networkStartups, onlyStrongMatches, query]);

  const rankedRoles = useMemo(() => {
    return openRoles
      .map(({ startup, role }) => {
        const skills = role.skills || [];
        const matched = skills.filter((skill) => currentUser.skills.some((item) => item.toLowerCase() === skill.toLowerCase()));
        const score = currentUser.role === 'employee' ? Math.min(98, 68 + matched.length * 7 + (startup.verified ? 5 : 0)) : 84;
        return { startup, role, score, matched };
      })
      .filter(({ startup, role }) => !query || [startup.name, startup.industry, role.title, role.description, ...role.skills].join(' ').toLowerCase().includes(query.toLowerCase()))
      .filter(({ startup }) => industry === 'All' || startup.industry === industry)
      .filter(({ score }) => !onlyStrongMatches || score >= 84)
      .sort((a, b) => b.score - a.score);
  }, [currentUser, industry, openRoles, onlyStrongMatches, query]);

  const incomingConnections = connections.filter((connection) => connection.toUserId === currentUser.id && connection.status === 'pending');
  const outgoingConnections = connections.filter((connection) => connection.fromUserId === currentUser.id && connection.status === 'pending');
  const acceptedConnections = connections.filter((connection) => connection.status === 'accepted');
  const getConnectionFor = (userId: string) =>
    connections.find((connection) =>
      (connection.fromUserId === currentUser.id && connection.toUserId === userId) ||
      (connection.toUserId === currentUser.id && connection.fromUserId === userId)
    );

  const tabMeta = [
    { id: 'people' as const, label: 'People', icon: Users, count: rankedTalents.length },
    { id: 'startups' as const, label: 'Startups', icon: Sparkles, count: rankedStartups.length },
    { id: 'opportunities' as const, label: 'Opportunities', icon: BriefcaseBusiness, count: rankedRoles.length },
    { id: 'connections' as const, label: 'Connections', icon: MessageCircle, count: incomingConnections.length },
    { id: 'saved' as const, label: 'Saved', icon: Bookmark, count: savedPeople.length + savedStartups.length },
  ];

  return (
    <div className="mornai-marketplace-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="mornai-section-kicker"><NetworkDot /> Network</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Find the people and work that move startups forward.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">MornAI ranks the network around your context, not just a keyword. See why something matches before you spend time on it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mornai-market-stat"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {startups.length} startups</span>
          <span className="mornai-market-stat"><Users className="h-3.5 w-3.5 text-violet-500" /> {allTalents.length} contributors</span>
          <span className="mornai-market-stat"><BriefcaseBusiness className="h-3.5 w-3.5 text-amber-500" /> {openRoles.length} open opportunities</span>
        </div>
      </div>

      <div className="mornai-market-hero rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">MornAI Match Engine</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {currentUser.role === 'founder' ? 'Stop searching. Start with the people most likely to fit.' : 'Stop scrolling. Start with startups that actually fit you.'}
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-violet-100/75">Recommendations are explained with skills, startup stage, activity, and available work so you can make a faster decision.</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[.07] px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-violet-200"><Zap className="h-3.5 w-3.5 text-amber-300" /> Live matching</div>
            <p className="mt-1 text-sm font-black text-white">{openRoles.length + allTalents.length} live signals</p>
            <p className="mt-0.5 text-[10px] text-violet-100/60">Updated from the current network</p>
          </div>
        </div>
      </div>

      <div className="mornai-market-toolbar rounded-[24px] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="mornai-market-search flex-1">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === 'people' ? 'Search people, skills, or experience…' : activeTab === 'opportunities' ? 'Search roles, startups, or skills…' : 'Search startups, industries, or tech…'} />
          </div>
          <button type="button" onClick={() => setShowFilters((value) => !value)} className={`mornai-market-filter-btn ${showFilters ? 'is-active' : ''}`}><Filter className="h-4 w-4" /> Filters <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} /></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tabMeta.map(({ id, label, icon: Icon, count }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`mornai-market-tab ${activeTab === id ? 'is-active' : ''}`}><Icon className="h-3.5 w-3.5" /> {label} <span>{count}</span></button>
          ))}
          <button type="button" onClick={() => setOnlyStrongMatches((value) => !value)} className={`ml-auto mornai-market-chip ${onlyStrongMatches ? 'is-active' : ''}`}><CircleCheck className="h-3.5 w-3.5" /> Strong matches only</button>
        </div>
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-3">
                <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
                  Industry
                  <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="mornai-market-select mt-1.5">
                    {industries.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Recommendation logic</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Skills + startup context + activity + availability signals.</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Your saved network</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{savedTalentIds.length + savedStartupIds.length} saved</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeTab === 'people' && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rankedTalents.map(({ talent, score }) => (
            <article key={talent.id} className="mornai-person-card">
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setSelectedTalent(talent)}><img src={talent.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-lg" /></button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedTalent(talent)} className="truncate text-left text-sm font-black text-slate-950 hover:text-violet-700">{talent.name}</button>
                    {talent.reputationScore && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700"><Star className="mr-0.5 inline h-2.5 w-2.5" />{talent.reputationScore}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{talent.title}</p>
                </div>
                <button type="button" onClick={() => onToggleSavedTalent(talent.id)} className={`mornai-save-btn ${savedTalentIds.includes(talent.id) ? 'is-saved' : ''}`} aria-label="Save person"><Bookmark className="h-3.5 w-3.5" /></button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-violet-50/80 px-3 py-2.5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.13em] text-violet-500">Fit</p>
                  <p className="mt-0.5 text-lg font-black text-violet-800">{score}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Availability</p>
                  <p className="mt-0.5 text-[11px] font-extrabold text-slate-700">{talent.equityPreference || 'Flexible'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {talent.skills.slice(0, 5).map((skill) => <span key={skill} className="mornai-market-skill">{skill}</span>)}
              </div>

              <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-slate-500">{talent.bio}</p>

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setSelectedTalent(talent)} className="mornai-market-secondary flex-1">View profile</button>
                {(() => {
                  const connection = getConnectionFor(talent.id);
                  const incoming = connection?.toUserId === currentUser.id && connection.status === 'pending';
                  const outgoing = connection?.fromUserId === currentUser.id && connection.status === 'pending';
                  const connected = connection?.status === 'accepted';
                  return (
                    <button
                      type="button"
                      disabled={outgoing || connected}
                      onClick={() => incoming ? setActiveTab('connections') : onSendConnection(talent)}
                      className={`mornai-market-primary flex-1 justify-center ${outgoing || connected ? 'cursor-default opacity-70' : ''}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {connected ? 'Connected' : outgoing ? 'Requested' : incoming ? 'Respond' : 'Connect'}
                    </button>
                  );
                })()}
              </div>
            </article>
          ))}
          {rankedTalents.length === 0 && <EmptyState title="No people found" body="Try a broader skill or remove the strong-match filter." />}
        </section>
      )}

      {activeTab === 'startups' && (
        <>
          <section className="mornai-market-panel rounded-[24px] border border-violet-100 bg-white/70 p-4 shadow-[0_18px_48px_rgba(124,58,237,.07)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">Open roles</p>
                <h2 className="mt-1 text-base font-black text-slate-950">Work available across the network</h2>
                <p className="mt-1 text-[11px] text-slate-500">Choose a role directly to open its conversation form.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">{openRoles.length} open</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {openRoles.map(({ startup, role }) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => startup.persisted ? onBookAppointment(startup, role) : onSelectStartup(startup)}
                  className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_14px_32px_rgba(124,58,237,.10)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600 shadow-sm">
                    <span className="text-lg font-black leading-none">+</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-violet-800 group-hover:text-violet-700">{role.title}</span>
                    <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">{startup.name}</span>
                    <span className="mt-1 block truncate text-[9px] text-slate-400">{role.commitment} • {role.equityRange}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300 group-hover:text-violet-600" />
                </button>
              ))}
              {openRoles.length === 0 && <EmptyState title="No open roles yet" body="Startups will appear here as they publish new opportunities." />}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rankedStartups.map(({ startup, score }) => (
            <article key={startup.id} className="mornai-startup-network-card">
              <div className="relative h-28 overflow-hidden rounded-[20px] bg-gradient-to-br from-violet-100 via-white to-sky-100">
                {startup.coverImage && <img src={startup.coverImage} alt="" className="h-full w-full object-cover opacity-70" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
                <img src={startup.logo} alt="" className="absolute bottom-3 left-4 h-12 w-12 rounded-2xl border-2 border-white object-cover shadow-xl" />
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {startup.verified && <span className="rounded-full border border-white/70 bg-white/85 px-2 py-1 text-[9px] font-black text-emerald-700"><ShieldCheck className="mr-0.5 inline h-3 w-3" /> Verified</span>}
                </div>
              </div>
              <div className="p-4 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-950">{startup.name}</h3>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{startup.industry} • {startup.stage}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => onToggleSavedStartup(startup.id)} className={`mornai-save-btn ${savedStartupIds.includes(startup.id) ? 'is-saved' : ''}`} aria-label="Save startup"><Bookmark className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => onToggleFollowStartup(startup.id)} className={`mornai-save-btn ${followedStartupIds.includes(startup.id) ? 'is-saved' : ''}`} aria-label="Follow startup"><Heart className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50/80 px-3 py-2.5">
                  <div><p className="text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Match</p><p className="mt-0.5 text-lg font-black text-slate-950">{score}%</p></div>
                  <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Open work</p><p className="mt-0.5 text-[11px] font-extrabold text-slate-700">{startup.openRoles.filter((role) => role.status === 'open').length} roles</p></div>
                </div>

                <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-slate-500">{startup.tagline}</p>

                <div className="mt-3 space-y-1.5">
                  {startup.openRoles.filter((role) => role.status === 'open').slice(0, 3).map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => onBookAppointment(startup, role)}
                      className="group flex w-full items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-violet-200 bg-white text-violet-600">
                        <span className="text-base font-black leading-none">+</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-black text-violet-800">{role.title}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">{getPartnershipText(role, formatMoney)}</span>
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-violet-300 transition group-hover:text-violet-600" />
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => onSelectStartup(startup)} className="mornai-market-secondary flex-1">Explore</button>
                  <button type="button" onClick={() => startup.openRoles[0] ? onBookAppointment(startup, startup.openRoles[0]) : onSelectStartup(startup)} className="mornai-market-primary">{currentUser.role === 'employee' ? 'Connect' : 'Open'}</button>
                </div>
              </div>
            </article>
          ))}
          {rankedStartups.length === 0 && <EmptyState title="No startups found" body="Try a broader search or reset the industry filter." />}
          </section>
        </>
      )}

      {activeTab === 'opportunities' && (
        <section className="space-y-3">
          {rankedRoles.map(({ startup, role, score, matched }) => (
            <article key={role.id} className="mornai-role-card">
              <img src={startup.logo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-950">{role.title}</h3>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">{score}% match</span>
                  {startup.verified && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700"><ShieldCheck className="mr-0.5 inline h-3 w-3" /> verified</span>}
                </div>
                <p className="mt-0.5 text-[10px] font-extrabold text-slate-500">{startup.name} • {startup.stage} • {role.commitment}</p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{role.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {role.skills.slice(0, 5).map((skill) => <span key={skill} className={`mornai-market-skill ${matched.includes(skill) ? 'is-match' : ''}`}>{skill}{matched.includes(skill) ? ' ✓' : ''}</span>)}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[132px]">
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Compensation</p><p className="mt-1 text-[10px] font-black text-slate-700">{role.equityRange}</p></div>
                <button type="button" onClick={() => onBookAppointment(startup, role)} className="mornai-market-primary justify-center">Connect <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            </article>
          ))}
          {rankedRoles.length === 0 && <EmptyState title="No opportunities found" body="Try removing filters. New roles will appear here as the network changes." />}
        </section>
      )}

      {activeTab === 'saved' && (
        <section className="space-y-5">
          <div className="mornai-market-panel rounded-[28px] p-5 sm:p-6">
            <span className="mornai-section-kicker"><Bookmark className="h-3.5 w-3.5" /> Saved</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Things you don't want to lose.</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Keep promising people and real startup opportunities one click away.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="mornai-person-card">
              <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-950">Saved people</h3><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">{savedPeople.length}</span></div>
              <div className="mt-4 space-y-2">
                {savedPeople.map((person) => <button key={person.id} type="button" onClick={() => setSelectedTalent(person)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3 text-left hover:border-violet-200"><img src={person.avatar} alt="" className="h-10 w-10 rounded-xl object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-black text-slate-950">{person.name}</strong><span className="block truncate text-[10px] text-slate-500">{person.title}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></button>)}
                {savedPeople.length === 0 && <EmptyState title="No saved people yet" body="Bookmark a strong contributor from the People view." />}
              </div>
            </div>
            <div className="mornai-person-card">
              <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-950">Saved startups</h3><span className="rounded-full bg-sky-50 px-2 py-1 text-[9px] font-black text-sky-700">{savedStartups.length}</span></div>
              <div className="mt-4 space-y-2">
                {savedStartups.map((startup) => <button key={startup.id} type="button" onClick={() => onSelectStartup(startup)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3 text-left hover:border-violet-200"><img src={startup.logo} alt="" className="h-10 w-10 rounded-xl object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-black text-slate-950">{startup.name}</strong><span className="block truncate text-[10px] text-slate-500">{startup.industry} • {startup.openRoles.filter((role) => role.status === 'open').length} open roles</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></button>)}
                {savedStartups.length === 0 && <EmptyState title="No saved startups yet" body="Bookmark a real persisted startup from the Startups view." />}
              </div>
            </div>
          </div>
        </section>
      )}
      {activeTab === 'connections' && (
        <section className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="mornai-person-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="mornai-section-kicker">Needs your reply</span>
                  <h2 className="mt-3 text-lg font-black text-slate-950">Incoming connections</h2>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">People who want to build a relationship around your startup or network.</p>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">{incomingConnections.length}</span>
              </div>
              <div className="mt-4 space-y-2">
                {incomingConnections.map((connection) => (
                  <div key={connection.id} className="rounded-2xl border border-slate-200 bg-white/75 p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-50 text-violet-600">
                        {connection.fromAvatar ? <img src={connection.fromAvatar} alt="" className="h-full w-full object-cover" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-950">{connection.fromName}</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{connection.roleTitle || connection.startupName || 'MornAI network connection'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => onUpdateConnectionStatus(connection.id, 'declined')} className="mornai-market-secondary flex-1">Decline</button>
                      <button type="button" onClick={() => onUpdateConnectionStatus(connection.id, 'accepted')} className="mornai-market-primary flex-1">Accept <CheckCircle2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {incomingConnections.length === 0 && <EmptyState title="No connection requests" body="When someone wants to connect with you, it will appear here." />}
              </div>
            </div>

            <div className="mornai-person-card">
              <div>
                <span className="mornai-section-kicker">Your network</span>
                <h2 className="mt-3 text-lg font-black text-slate-950">Connection history</h2>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Keep the relationships that matter visible instead of losing them in a feed.</p>
              </div>
              <div className="mt-4 space-y-2">
                {acceptedConnections.slice(0, 8).map((connection) => {
                  const otherId = connection.fromUserId === currentUser.id ? connection.toUserId : connection.fromUserId;
                  const otherName = connection.fromUserId === currentUser.id ? connection.toName : connection.fromName;
                  const otherAvatar = connection.fromUserId === currentUser.id ? connection.toAvatar : connection.fromAvatar;
                  return (
                    <div key={connection.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-600">
                        {otherAvatar ? <img src={otherAvatar} alt="" className="h-full w-full object-cover" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-950">{otherName}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{connection.startupName || 'Connected on MornAI'}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">Connected</span>
                    </div>
                  );
                })}
                {outgoingConnections.slice(0, 5).map((connection) => (
                  <div key={connection.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-50 text-violet-600">
                      {connection.toAvatar ? <img src={connection.toAvatar} alt="" className="h-full w-full object-cover" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-950">{connection.toName}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">Waiting for response</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">Pending</span>
                  </div>
                ))}
                {acceptedConnections.length === 0 && outgoingConnections.length === 0 && (
                  <EmptyState title="Your network is just getting started" body="Connect with a person whose skills or startup interests line up with yours." />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="rounded-[24px] border border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-sky-50/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><ShieldCheck className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-950">Good marketplaces reduce uncertainty.</p>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-500">MornAI shows match evidence, startup verification, compensation context, and contribution signals before you commit time.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[9px] font-black text-violet-700">Trust layer active</span>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedTalent && (
            <motion.div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-slate-950/35 p-3 sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex min-h-full items-center justify-center">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: .16, ease: 'easeOut' }} className="pointer-events-auto mornai-talent-modal my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] sm:max-h-[calc(100dvh-3rem)]">
                  <div className="shrink-0 p-5 pb-0 sm:p-6 sm:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <img src={selectedTalent.avatar} alt="" className="h-16 w-16 rounded-[22px] object-cover shadow-xl" />
                        <div>
                          <div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-950">{selectedTalent.name}</h2><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                          <p className="mt-1 text-xs font-bold text-violet-600">{selectedTalent.title}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{selectedTalent.hourlyRate || selectedTalent.equityPreference || 'Open to startup opportunities'}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedTalent(null)} className="mornai-close-btn"><X className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <MiniSignal label="Reputation" value={`${selectedTalent.reputationScore || 82}/100`} icon={<Star className="h-3.5 w-3.5" />} />
                      <MiniSignal label="Milestones" value={String(selectedTalent.completedMilestones || 0)} icon={<Zap className="h-3.5 w-3.5" />} />
                      <MiniSignal label="Skills" value={String(selectedTalent.skills.length)} icon={<Sparkles className="h-3.5 w-3.5" />} />
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mornai-modal-label">About</p>
                        <p className="mt-2 text-xs leading-6 text-slate-600">{selectedTalent.bio}</p>
                      </div>
                      <div>
                        <p className="mornai-modal-label">Skills</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{selectedTalent.skills.map((skill) => <span key={skill} className="mornai-market-skill">{skill}</span>)}</div>
                      </div>
                    </div>

                    {getProfileDetails(selectedTalent).length > 0 && (
                      <section className="mt-6">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="mornai-modal-label">Profile details</p>
                            <p className="mt-1 text-[10px] text-slate-400">Answers shared during signup</p>
                          </div>
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">{getProfileDetails(selectedTalent).length} details</span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {getProfileDetails(selectedTalent).map(({ label, value }) => (
                            <div key={label} className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                              <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
                              <p className="mt-1.5 whitespace-pre-line text-[11px] leading-5 text-slate-600">{value}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <div className="mt-6 rounded-[22px] border border-violet-100 bg-violet-50/70 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-600">Why this profile matters</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">MornAI uses skills, contribution history, reputation, and stated preferences to make human matches easier to evaluate.</p>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button type="button" onClick={() => onToggleSavedTalent(selectedTalent.id)} className="mornai-market-secondary flex-1"><Bookmark className="h-3.5 w-3.5" /> {savedTalentIds.includes(selectedTalent.id) ? 'Saved' : 'Save person'}</button>
                      <button type="button" onClick={() => { onSendConnection(selectedTalent); setSelectedTalent(null); }} className="mornai-market-primary flex-1"><MessageCircle className="h-3.5 w-3.5" /> Connect</button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};


const getProfileDetails = (user: User): Array<{ label: string; value: string }> => {
  const onboarding = user.onboarding;
  if (!onboarding) return [];

  const shared = [
    ['Profile title', onboarding.profileTitle],
    ['Experience level', onboarding.experienceLevel],
    ['What they contribute', onboarding.contribution],
    ['Availability', onboarding.availability],
    ['Work style', onboarding.workStyle],
    ['90-day goal', onboarding.goal],
    ['Motivation', onboarding.motivation],
    ['Profile story', onboarding.story],
  ] as Array<[string, string | undefined]>;

  const roleSpecific = user.role === 'founder'
    ? [
        ['Startup / project', onboarding.startupName],
        ['Startup stage', onboarding.startupStage],
        ['Industry', onboarding.industry],
        ['Problem being solved', onboarding.problem],
        ['Target customer', onboarding.targetCustomer],
        ['Traction', onboarding.traction],
        ['Previous wins', onboarding.previousWins],
      ]
    : [
        ['Desired role', onboarding.desiredRole],
        ['Focus areas', onboarding.focusAreas],
        ['Achievements / proof of work', onboarding.achievements],
        ['Ideal startup', onboarding.idealStartup],
      ];

  return [...shared, ...roleSpecific]
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([label, value]) => ({ label, value: value.trim() }));
};

const getPartnershipText = (role: RolePost, formatMoney: (usd: number) => string) => {
  const p = role.partnership;
  if (!p) return role.type || 'Founder-defined partnership';
  switch (p.mode) {
    case 'equity': return p.equityPercent ? p.equityPercent + '% equity' : 'Equity';
    case 'helper': return 'Helper / volunteer';
    case 'pay_on_delivery': return p.amountUsd ? formatMoney(p.amountUsd) + ' on delivery' : 'Pay on delivery';
    case 'pay_per_hour': return p.amountUsd ? formatMoney(p.amountUsd) + ' / hour' : 'Pay per hour';
    case 'pay_per_task': return p.amountUsd ? formatMoney(p.amountUsd) + ' / task' : 'Pay per task';
    case 'fixed_project': return p.amountUsd ? formatMoney(p.amountUsd) + ' fixed' : 'Fixed project fee';
    case 'revenue_share': return p.equityPercent ? p.equityPercent + '% revenue share' : 'Revenue share';
    case 'equity_plus_cash': return p.equityPercent && p.amountUsd ? p.equityPercent + '% equity + ' + formatMoney(p.amountUsd) : 'Equity + cash';
    default: return p.label || role.type || 'Founder-defined partnership';
  }
};

const getRolePartnershipSummary = (role: RolePost, formatMoney: (usd: number) => string) => {
  const partnership = role.partnership;
  if (!partnership) return role.type || 'Founder-defined partnership';
  switch (partnership.mode) {
    case 'equity': return partnership.equityPercent ? partnership.equityPercent + '% equity' : 'Equity';
    case 'helper': return 'Helper / volunteer';
    case 'pay_on_delivery': return partnership.amountUsd ? formatMoney(partnership.amountUsd) + ' on delivery' : 'Pay on delivery';
    case 'pay_per_hour': return partnership.amountUsd ? formatMoney(partnership.amountUsd) + ' / hour' : 'Pay per hour';
    case 'pay_per_task': return partnership.amountUsd ? formatMoney(partnership.amountUsd) + ' / task' : 'Pay per task';
    case 'fixed_project': return partnership.amountUsd ? formatMoney(partnership.amountUsd) + ' fixed project' : 'Fixed project fee';
    case 'revenue_share': return partnership.equityPercent ? partnership.equityPercent + '% revenue share' : 'Revenue share';
    case 'work_exchange': return partnership.amountUsd && partnership.details ? formatMoney(partnership.amountUsd) + ' cash or work exchange' : partnership.details || 'Pay or work';
    case 'equity_plus_cash': return partnership.equityPercent && partnership.amountUsd ? partnership.equityPercent + '% equity + ' + formatMoney(partnership.amountUsd) : 'Equity + cash';
    default: return partnership.label || role.type || 'Founder-defined partnership';
  }
};

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="col-span-full rounded-[26px] border border-dashed border-slate-200 bg-white/70 p-10 text-center">
    <Search className="mx-auto h-6 w-6 text-slate-300" />
    <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-slate-500">{body}</p>
  </div>
);

const MiniSignal = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{icon}{label}</div>
    <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
  </div>
);

const NetworkDot = () => <span className="grid h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(124,58,237,.10)]" />;

