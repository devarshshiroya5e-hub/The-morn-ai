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
  Users
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
    
    // Heuristic base score
    const base = Math.min(98, Math.max(70, Math.round((common.length / Math.max(1, userSkills.length)) * 35 + 63)));
    return {
      score: base,
      matchingSkills: common,
    };
  };

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
      
      {/* Solvearn-Inspired Banner */}
      <div className="mornai-discover-hero relative overflow-hidden rounded-[28px] border border-white/10 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,.18)] sm:p-10">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200 mb-4 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Vetted Startups with Real-Time AI Co-Founders
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-['Outfit']">
            Join High-Growth Startups & Earn Equity with AI Strategy
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Discover ongoing startups registered by ambitious founders. Connect your skills, book appointments to join, and let our embedded AI Co-Founder delegate sprint tasks with continuous roadmap memory.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              id="hero-ai-consult-btn"
              onClick={onOpenAiDrawer}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-900/30 transition-all flex items-center gap-2 active:scale-95"
            >
              <BrainCircuit className="w-4 h-4" />
              Ask AI Co-Founder & Strategist
            </button>
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>4 Startups actively hiring via MornAI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mornai-filter-bar bg-white/70 p-4 rounded-[22px] border border-white/90 shadow-sm space-y-4 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="startup-search-input"
              placeholder="Search startup name, tech stack, or mission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
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

      {/* Startups List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                </div>

                {/* Actions & Role Count */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
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
