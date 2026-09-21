import React, { useEffect, useState } from 'react';
import { Startup, User, RolePost, StartupMember } from '../types';
import { 
  X, 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Briefcase, 
  BrainCircuit, 
  Users, 
  Layers, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface StartupDetailModalProps {
  startup: Startup | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
  onConsultAi: (startup: Startup) => void;
}

export const StartupDetailModal: React.FC<StartupDetailModalProps> = ({
  startup,
  isOpen,
  onClose,
  currentUser,
  onBookAppointment,
  onConsultAi,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'roadmap' | 'roles' | 'team'>('overview');
  const [selectedTeamMember, setSelectedTeamMember] = useState<StartupMember | null>(null);

  useEffect(() => {
    if (!selectedTeamMember) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('team-profile-details')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedTeamMember]);

  if (!isOpen || !startup) return null;

  const selectedProfileDetails =
    selectedTeamMember?.profileDetails ||
    (selectedTeamMember?.userId === currentUser.id ? currentUser.onboarding : undefined);

  const onboardingAnswers = selectedProfileDetails
    ? [
        ['Profile story', selectedProfileDetails.story],
        ['90-day goal', selectedProfileDetails.goal],
        ['Startup / project name', selectedProfileDetails.startupName],
        ['Startup stage', selectedProfileDetails.startupStage],
        ['Industry', selectedProfileDetails.industry],
        ['Availability', selectedProfileDetails.availability],
        ['Preferred work style', selectedProfileDetails.workStyle],
        ['Experience level', selectedProfileDetails.experienceLevel],
        ['Professional / founder title', selectedProfileDetails.profileTitle],
        ['What they can contribute', selectedProfileDetails.contribution],
        ['Why startups?', selectedProfileDetails.motivation],
        ['Problem being solved', selectedProfileDetails.problem],
        ['Target customer', selectedProfileDetails.targetCustomer],
        ['Traction', selectedProfileDetails.traction],
        ['Previous wins / relevant experience', selectedProfileDetails.previousWins],
        ['Desired startup role', selectedProfileDetails.desiredRole],
        ['Problems they want to work on', selectedProfileDetails.focusAreas],
        ['Achievements / proof of work', selectedProfileDetails.achievements],
        ['Ideal startup / environment', selectedProfileDetails.idealStartup],
      ].filter(([, value]) => typeof value === 'string' && value.trim())
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm p-3 sm:p-6">
      <div className="relative mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[calc(100dvh-3rem)]">
        
        <div className="shrink-0">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full backdrop-blur transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Cover Banner */}
        <div className="h-36 sm:h-44 bg-slate-800 relative overflow-hidden flex-shrink-0">
          {startup.coverImage ? (
            <img
              src={startup.coverImage}
              alt={startup.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Quick Header Tags */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 text-xs font-bold bg-white text-slate-900 rounded-md shadow-sm">
              {startup.stage} Stage
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold bg-black/40 backdrop-blur text-white rounded-md border border-white/20">
              {startup.industry}
            </span>
          </div>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-6 pb-4 pt-5 border-b border-slate-200 bg-white relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mt-0 mb-4">
            
            <div className="flex items-center gap-3.5">
              <img
                src={startup.logo}
                alt={startup.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-200 shadow-md bg-white flex-shrink-0"
              />
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit']">
                    {startup.name}
                  </h2>
                  {startup.verified && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">{startup.tagline}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                id="modal-consult-ai-btn"
                onClick={() => onConsultAi(startup)}
                className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                AI Strategist
              </button>

              <button
                id="modal-book-sync-btn"
                onClick={() => onBookAppointment(startup, startup.openRoles[0])}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                Book Founder Appointment
              </button>
            </div>

          </div>

          {/* Key Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-400">Funding:</span>
              <span className="font-semibold text-slate-900">{startup.fundingRaised}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{startup.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-400">Investor Readiness:</span>
              <span className="font-bold text-slate-900">{startup.investorReadinessScore}/100</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-400">Growth Velocity:</span>
              <span className="font-bold text-slate-900">{startup.growthVelocityScore}/100</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'overview'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview & Pitch
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'memory'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              Memory & History ({startup.historyLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'roadmap'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Strategic Roadmap ({startup.roadmap.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'roles'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Open Roles ({startup.openRoles.length})
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'team'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Team ({startup.members.length})
            </button>
          </div>
        </div>

        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Pitch Statement */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Executive Pitch & Problem Solution
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {startup.pitch}
                </p>
              </div>

              {/* Tech Stack */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Core Technologies & Architecture
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(startup.techStack || []).map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Founder Information */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={startup.founderAvatar}
                    alt={startup.founderName}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{startup.founderName}</h4>
                    <p className="text-xs text-slate-500">Founder & Registered Startup Owner</p>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">Founded {startup.foundedYear} • {startup.location}</p>
                  </div>
                </div>

                <button
                  id="overview-contact-founder-btn"
                  onClick={() => onBookAppointment(startup, startup.openRoles[0])}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule Sync
                </button>
              </div>

              {/* People currently working on this startup */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">People working on this project</h3>
                    <p className="mt-1 text-xs text-slate-500">See the active contributors and open a compact profile for each person.</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700">{startup.members?.length || 0} people</span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(startup.members || []).slice(0, 4).map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-slate-900">{member.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{member.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamMember(member)}
                        className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>

                {startup.members?.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('team')}
                    className="mt-3 text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900"
                  >
                    View all {startup.members.length} team members
                  </button>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: AI MEMORY & HISTORY VAULT */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <BrainCircuit className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-indigo-900 block mb-1">
                    Continuous AI Strategic Memory
                  </span>
                  <p className="text-indigo-800/90 leading-relaxed">
                    Our AI Co-Founder continuously remembers each pivotal moment, previous experiment, tech decision, and current bottleneck recorded below. When new employees join, the AI delegates tasks informed by this exact memory.
                  </p>
                </div>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-6 my-4">
                {(startup.historyLogs || []).map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-sm" />

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                            log.type === 'pivot' ? 'bg-amber-100 text-amber-800' :
                            log.type === 'bottleneck' ? 'bg-rose-100 text-rose-800' :
                            log.type === 'traction' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {log.type}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{log.title}</h4>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{log.date}</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {log.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs flex items-center gap-1 text-slate-700">
                        <span className="font-semibold text-slate-900">Strategic Impact:</span>
                        <span>{log.impact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STRATEGIC ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  AI-Synthesized Startup Milestones
                </span>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Current: Phase 1 Active
                </span>
              </div>

              <div className="space-y-4">
                {(startup.roadmap || []).map((milestone, idx) => (
                  <div
                    key={milestone.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{milestone.phase}</h4>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {milestone.duration}
                      </span>
                    </div>

                    <h5 className="text-xs font-semibold text-indigo-900 mb-1">{milestone.title}</h5>
                    <p className="text-xs text-slate-600 mb-3">{milestone.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Target KPI:</span>
                        <span className="font-semibold text-slate-800">{milestone.kpiTarget}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Roles Critical to this Phase:</span>
                        <span className="font-semibold text-indigo-700">{milestone.talentNeeded.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OPEN ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Opportunities to Join & Earn
                </span>
                <span className="text-xs text-slate-500">
                  {startup.openRoles?.length || 0} Active Positions
                </span>
              </div>

              {startup.openRoles?.map((role) => (
                <div
                  key={role.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{role.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                          {role.type}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Equity: {role.equityRange} • Stipend: {role.stipendRange}
                        </span>
                      </div>
                    </div>

                    <button
                      id={`apply-role-btn-${role.id}`}
                      onClick={() => onBookAppointment(startup, role)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Book Appointment for Role
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{role.description}</p>

                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Required Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.skills?.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Active Contributors & Founders
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {startup.members?.map((member) => (
                  <div
                    key={member.userId}
                    className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3"
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{member.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{member.role}</p>
                      <p className="text-[11px] text-indigo-600 font-medium mt-0.5 truncate">{member.equityOrStipend}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamMember(member)}
                      className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {selectedTeamMember && (
          <div
            id="team-profile-details"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 p-4 sm:p-8 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_30px_100px_rgba(15,23,42,.3)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTeamMember.avatar}
                    alt={selectedTeamMember.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950">{selectedTeamMember.name}</h3>
                    <p className="text-xs font-semibold text-indigo-600">{selectedTeamMember.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeamMember(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                  aria-label="Close profile"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Profile ID</p>
                  <p className="mt-1 break-all text-sm font-extrabold text-slate-900">{selectedTeamMember.userId}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Joined</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTeamMember.joinedDate}</p>
                </div>
                {selectedTeamMember.skills?.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Skills</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedTeamMember.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">{skill}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-indigo-500">Contribution</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-900">{selectedTeamMember.equityOrStipend}</p>
                </div>

                {onboardingAnswers.length > 0 && (
                  <div className="pt-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-indigo-500">Onboarding context</p>
                        <p className="mt-1 text-xs text-slate-500">Every answer this person provided during MornAI signup.</p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700">
                        {onboardingAnswers.length} answers
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {onboardingAnswers.map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">{label}</p>
                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-6 font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Registered on MornAI Ecosystem</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
