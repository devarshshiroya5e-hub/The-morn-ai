import React, { useState, useMemo } from 'react';
import { Startup, User, RolePost } from '../types';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Filter, 
  Briefcase,
  TrendingUp,
  BrainCircuit,
  Users,
  Activity,
  Layers3,
  Zap
} from 'lucide-react';

interface DiscoverStartupsProps {
  startups: Startup[];
  currentUser: User;
  onSelectStartup: (startup: Startup) => void;
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
  onOpenAiDrawer: () => void;
}

export const DiscoverStartups: React.FC<DiscoverStartupsProps> = ({
  startups,
  currentUser,
  onSelectStartup,
  onBookAppointment,
  onOpenAiDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');

  const industries = ['All', 'Artificial Intelligence', 'ClimateTech', 'Developer Tools', 'Biotech'];
  const stages = ['All', 'Pre-Seed', 'Seed', 'Series A'];

  // Filter startups
  const filteredStartups = useMemo(() => {
    return (startups || []).filter((startup) => {
      const matchesSearch = 
        startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        startup.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        startup.techStack.some((tech) => tech.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesIndustry = selectedIndustry === 'All' || startup.industry.toLowerCase().includes(selectedIndustry.toLowerCase());
      const matchesStage = selectedStage === 'All' || startup.stage === selectedStage;

      return matchesSearch && matchesIndustry && matchesStage;
    });
  }, [startups, searchQuery, selectedIndustry, selectedStage]);

  // Compute skill match for current talent
  const computeSkillFit = (startup: Startup) => {
    if (currentUser.role === 'founder') return null;
    const userSkills = currentUser.skills || [];
    const startupTech = startup.techStack || [];
    const common = (userSkills || []).filter(s => startupTech.some(t => t.toLowerCase() === s.toLowerCase()));

    const base = Math.min(98, Math.max(70, Math.round((common.length / Math.max(1, userSkills.length)) * 35 + 63)));
    return {
      score: base,
      matchingSkills: common,
    };
  };

  const discoveryStats = useMemo(() => {
    const liveRoles = (startups || []).reduce(
      (sum, startup) => sum + (startup.openRoles || []).filter(role => role.status === 'open').length,
      0,
    );
    const memoryLogs = (startups || []).reduce(
      (sum, startup) => sum + (startup.historyLogs || []).length,
      0,
    );
    const verified = (startups || []).filter((startup) => startup.verified).length;
    return {
      total: (startups || []).length,
      liveRoles,
      memoryLogs,
      verified,
    };
  }, [startups]);

  return (
    <div className="mornai-discover-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-7">
      <div className="mornai-page-intro flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mornai-section-kicker">Startup discovery</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Find the next company to build with.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Explore live startups, inspect their context, and connect your skills to the work that needs doing.</p>
        </div>
        <div className="mornai-inline-stat">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{filteredStartups.length} startups visible</span>
        </div>
      </div>
      
      <div className="mornai-discover-hero relative overflow-hidden rounded-[28px] border border-white/10 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,.18)] sm:p-10">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(129,140,248,.15),transparent_24%),radial-gradient(circle_at_20%_90%,rgba(56,189,248,.10),transparent_22%)] pointer-events-none" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              MornAI live startup network
            </div>
            <h2 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-tight font-['Outfit'] sm:text-5xl">
              Find a startup where your skills actually matter.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Explore active companies, inspect their roadmap context, see where your skills fit, and move from browsing to a founder conversation without leaving the workspace.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                id="hero-ai-consult-btn"
                onClick={onOpenAiDrawer}
                className="mornai-discovery-hero-button inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 active:scale-[.985] sm:text-sm"
              >
                <BrainCircuit className="h-4 w-4 text-indigo-600" />
                Ask AI Co-Founder
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                {discoveryStats.liveRoles} open roles across the network
              </div>
            </div>
          </div>

          <div className="mornai-discovery-signal rounded-[24px] border border-white/10 bg-white/[.07] p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-indigo-200">Live signal</p>
                <p className="mt-1 text-sm font-bold text-white">The network is moving.</p>
              </div>
              <Activity className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { value: discoveryStats.total, label: 'Startups', icon: Layers3 },
                { value: discoveryStats.liveRoles, label: 'Open roles', icon: Briefcase },
                { value: discoveryStats.verified, label: 'Verified', icon: CheckCircle2 },
                { value: discoveryStats.memoryLogs, label: 'Memory logs', icon: BrainCircuit },
              ].map((item) => {
                const MetricIcon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
                    <MetricIcon className="h-3.5 w-3.5 text-indigo-200" />
                    <b className="mt-2 block text-lg text-white">{item.value}</b>
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/15 px-3 py-2.5 text-[11px] text-slate-300">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              Every startup card keeps its roadmap context attached.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: discoveryStats.total, label: 'Live startups', icon: Layers3, tone: 'mornai-discovery-stat-indigo' },
          { value: discoveryStats.liveRoles, label: 'Open positions', icon: Briefcase, tone: 'mornai-discovery-stat-violet' },
          { value: discoveryStats.verified, label: 'Verified teams', icon: CheckCircle2, tone: 'mornai-discovery-stat-emerald' },
          { value: discoveryStats.memoryLogs, label: 'AI memory events', icon: BrainCircuit, tone: 'mornai-discovery-stat-sky' },
        ].map((item) => {
          const MetricIcon = item.icon;
          return (
            <div key={item.label} className={`mornai-discovery-stat ${item.tone}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 shadow-sm">
                <MetricIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="block text-lg font-extrabold text-slate-950">{item.value}</b>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mornai-filter-bar bg-white/70 p-4 rounded-[22px] border border-white/90 shadow-sm space-y-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Search className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Find your fit</p>
              <p className="text-[11px] text-slate-400">{filteredStartups.length} matches your current filters</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:ml-6 lg:flex-row lg:items-center lg:justify-end">
          
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="startup-search-input"
              placeholder="Search startup name, tech stack, or mission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mornai-discovery-search w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
            />
          </div>

          {/* Industry Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Sector:
            </span>
            {industries.map((ind) => (
              <button
                key={ind}
                id={`filter-industry-${ind}`}
                onClick={() => setSelectedIndustry(ind)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedIndustry === ind
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          {/* Stage Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Stage:
            </span>
            <select
              id="filter-stage-select"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {stages.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All Stages' : st}
                </option>
              ))}
            </select>
          </div>

          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-slate-400">Explore</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Startups worth a closer look.</h2>
        </div>
        <div className="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          Context-first discovery
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredStartups.map((startup) => {
          const fit = computeSkillFit(startup);
          const totalOpenRoles = (startup.openRoles || []).filter(r => r.status === 'open').length;

          return (
            <div
              key={startup.id}
              id={`startup-card-${startup.id}`}
              className="mornai-startup-card bg-white rounded-[22px] border border-slate-200/80 hover:border-indigo-300 hover:shadow-[0_24px_60px_rgba(79,70,229,.12)] transition-all duration-200 flex flex-col overflow-hidden group"
            >
              {/* Cover Image or Header Bar */}
              <div className="h-28 bg-slate-100 relative overflow-hidden">
                {startup.coverImage ? (
                  <img
                    src={startup.coverImage}
                    alt={startup.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                )}
                
                {/* Stage Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 text-xs font-bold bg-white/90 backdrop-blur text-slate-800 rounded-md shadow-sm">
                    {startup.stage}
                  </span>
                </div>

                {/* AI Match Fit Badge for Talent */}
                {fit && (
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm backdrop-blur flex items-center gap-1 ${
                      fit.score >= 85 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      <Sparkles className="w-3 h-3 text-amber-200" />
                      {fit.score}% Skill Match
                    </span>
                  </div>
                )}
              </div>

              {/* Startup Profile Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3">
                    <img
                      src={startup.logo}
                      alt={startup.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm -mt-8 relative z-10 bg-white"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {startup.name}
                        </h3>
                        {startup.verified && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{startup.industry}</p>
                    </div>
                  </div>

                  {/* Tagline */}
                  <p className="mt-3 text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                    {startup.tagline}
                  </p>

                  {/* Pitch snippet */}
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {startup.pitch}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">
                      <TrendingUp className="h-3 w-3" />
                      {startup.stage} momentum
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {startup.location}
                    </div>
                  </div>

                  {/* Funding & Founder snippet */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 py-2 border-y border-slate-100">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{startup.fundingRaised}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <img src={startup.founderAvatar} alt={startup.founderName} className="w-4 h-4 rounded-full object-cover" />
                      <span className="text-[11px] text-slate-600 font-medium">{startup.founderName}</span>
                    </div>
                  </div>

                  {/* Tech Stack Chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(startup.techStack || []).slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                    {startup.techStack.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-medium">
                        +{startup.techStack.length - 4}
                      </span>
                    )}
                  </div>

                  {/* AI Memory History Pill */}
                  <div className="mt-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                      <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI Memory Active</span>
                      <span className="ml-auto text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                        {startup.historyLogs.length} logs
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-indigo-700/90 line-clamp-1">
                      Latest: {startup.historyLogs[startup.historyLogs.length - 1]?.title || 'Sprint setup'}
                    </p>
                  </div>

                                    <div className="mornai-job-list mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-violet-500">Available jobs</p>
                      <span className="text-[9px] font-extrabold text-violet-700">{totalOpenRoles} open</span>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {(startup.openRoles || []).filter((role) => role.status === 'open').slice(0, 3).map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => onBookAppointment(startup, role)}
                          className="mornai-job-card group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white/75 px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                        >
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-violet-200 bg-violet-50 text-violet-600">
                            <span className="text-base font-medium leading-none">+</span>
                          </span>
                          <span className="min-w-0 truncate text-[11px] font-extrabold text-violet-700 group-hover:text-violet-800">
                            {role.title}
                          </span>
                        </button>
                      ))}

                      {totalOpenRoles > 3 && (
                        <button
                          type="button"
                          onClick={() => onSelectStartup(startup)}
                          className="px-1 text-[9px] font-extrabold text-violet-600 transition hover:text-violet-800"
                        >
                          + {totalOpenRoles - 3} more
                        </button>
                      )}
                    </div>
                  </div>
<div className="mt-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/60 p-3">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">
                      <span>Team signal</span>
                      <span className="text-indigo-500">{totalOpenRoles} open</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                          style={{ width: `${Math.min(100, 32 + totalOpenRoles * 18)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-600">{startup.members.length} members</span>
                    </div>
                  </div>
                </div>

                {/* Actions & Role Count */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-violet-500" />
                      {totalOpenRoles} Open {totalOpenRoles === 1 ? 'Role' : 'Roles'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {startup.location}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id={`view-startup-btn-${startup.id}`}
                      onClick={() => onSelectStartup(startup)}
                      className="mornai-secondary-action w-full py-2.5 px-3 text-xs font-semibold rounded-xl transition-all text-center"
                    >
                      View Details
                    </button>
                    <button
                      id={`book-appointment-btn-${startup.id}`}
                      onClick={() => onBookAppointment(startup, startup.openRoles[0])}
                      className="mornai-primary-action w-full py-2.5 px-3 text-xs font-semibold text-white rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Book Sync
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStartups.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base">No startups match your search</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the filters or searching for different keywords.</p>
        </div>
      )}

    </div>
  );
};
