import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Code2,
  DollarSign,
  MapPin,
  Rocket,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { RolePost, Startup, StartupMember, User } from '../types';

interface StartupDetailModalProps {
  startup: Startup | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
  onConsultAi: (startup: Startup) => void;
}

type ExplorerTab = 'overview' | 'roles' | 'team' | 'memory' | 'roadmap';

export const StartupDetailModal: React.FC<StartupDetailModalProps> = ({
  startup,
  isOpen,
  onClose,
  currentUser,
  onBookAppointment,
  onConsultAi,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('overview');
  const [selectedTeamMember, setSelectedTeamMember] = useState<StartupMember | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
      setSelectedTeamMember(null);
    }
  }, [isOpen]);

  if (!isOpen || !startup) return null;

  const openRoles = startup.openRoles.filter((role) => role.status === 'open');

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

  const tabs: Array<{ id: ExplorerTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'roles', label: 'Open roles', count: openRoles.length },
    { id: 'team', label: 'Team', count: startup.members.length },
    { id: 'memory', label: 'Memory', count: startup.historyLogs.length },
    { id: 'roadmap', label: 'Roadmap', count: startup.roadmap.length },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-sm p-2 sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 z-[100] grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-slate-950/60 text-white shadow-2xl backdrop-blur-md transition hover:bg-slate-950/80 sm:right-6 sm:top-6"
        aria-label="Close startup explorer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-6xl items-start justify-center">
        <div className="mornai-startup-explorer my-1 flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-y-auto overscroll-contain rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,.28)] sm:my-2 sm:max-h-[calc(100dvh-1rem)]">
          <div className="relative h-48 shrink-0 overflow-hidden sm:h-60">
            {startup.coverImage ? (
              <img src={startup.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-4 sm:bottom-6 sm:left-6 sm:right-6">
              <div className="flex items-end gap-3">
                <img
                  src={startup.logo}
                  alt={startup.name}
                  className="h-20 w-20 rounded-[22px] border-4 border-white object-cover bg-white shadow-2xl sm:h-24 sm:w-24"
                />
                <div className="pb-1 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] backdrop-blur-md">{startup.stage}</span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] backdrop-blur-md">{startup.industry}</span>
                    {startup.verified && (
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[9px] font-black text-emerald-100 backdrop-blur-md">
                        <CheckCircle2 className="mr-1 inline h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{startup.name}</h1>
                  <p className="mt-1 max-w-3xl text-xs font-medium text-white/80 sm:text-sm">{startup.tagline}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Funding" value={startup.fundingRaised || 'Bootstrapped'} icon={<DollarSign className="h-3.5 w-3.5" />} />
                <Metric label="Location" value={startup.location || 'Remote'} icon={<MapPin className="h-3.5 w-3.5" />} />
                <Metric label="Investor readiness" value={`${startup.investorReadinessScore}/100`} icon={<Sparkles className="h-3.5 w-3.5" />} />
                <Metric label="Growth velocity" value={`${startup.growthVelocityScore}/100`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onConsultAi(startup)}
                  className="mornai-market-secondary justify-center px-4"
                >
                  <BrainCircuit className="h-4 w-4" /> AI Strategist
                </button>
                {openRoles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onBookAppointment(startup, openRoles[0])}
                    className="mornai-market-primary justify-center px-4"
                  >
                    <Calendar className="h-4 w-4" /> Start with a role
                  </button>
                )}
              </div>
            </div>

            <div className="sticky top-0 z-20 mt-4 -mx-4 overflow-x-auto border-t border-slate-100 bg-white/95 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
              <div className="flex min-w-max gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${activeTab === tab.id ? 'bg-violet-50 text-violet-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    {tab.label}
                    {typeof tab.count === 'number' && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{tab.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-[1.45fr_.75fr]">
                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50/95 via-white to-sky-50/90 p-5">
                      <span className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">What this startup does</span>
                      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{startup.tagline}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{startup.pitch || 'This startup has not added a full description yet.'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[startup.industry, startup.stage, startup.location].filter(Boolean).map((item) => (
                          <span key={item} className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-slate-600 shadow-sm">{item}</span>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2">
                      <InfoCard title="Technology" icon={<Code2 className="h-4 w-4" />}>
                        <div className="flex flex-wrap gap-2">
                          {(startup.techStack || []).map((tech) => (
                            <span key={tech} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700">{tech}</span>
                          ))}
                        </div>
                      </InfoCard>
                      <InfoCard title="Company snapshot" icon={<Rocket className="h-4 w-4" />}>
                        <div className="space-y-2 text-[11px] text-slate-600">
                          <Row label="Founded" value={startup.foundedYear} />
                          <Row label="Website" value={startup.website || 'Not listed'} />
                          <Row label="Open roles" value={String(openRoles.length)} />
                          <Row label="Team size" value={String(startup.members.length)} />
                        </div>
                      </InfoCard>
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2">
                        <img src={startup.founderAvatar} alt="" className="h-11 w-11 rounded-2xl object-cover" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Founder</p>
                          <h3 className="truncate text-sm font-black text-slate-950">{startup.founderName}</h3>
                          <p className="text-[10px] text-slate-500">Registered startup owner</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBookAppointment(startup, openRoles[0])}
                        disabled={openRoles.length === 0}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Calendar className="h-3.5 w-3.5" /> Schedule founder conversation
                      </button>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 text-violet-600" />
                        <h3 className="text-sm font-black text-slate-950">Roles at a glance</h3>
                      </div>
                      <div className="mt-3 space-y-2">
                        {openRoles.slice(0, 4).map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => onBookAppointment(startup, role)}
                            className="group flex w-full items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/45 p-2.5 text-left transition hover:border-violet-300"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-violet-200 bg-white text-violet-600"><span className="text-base font-black">+</span></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10px] font-black text-violet-800">{role.title}</span>
                              <span className="mt-0.5 block text-[9px] text-slate-500">{role.commitment}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300 group-hover:text-violet-600" />
                          </button>
                        ))}
                        {openRoles.length === 0 && <p className="text-[10px] text-slate-500">No open roles right now.</p>}
                      </div>
                    </section>
                  </aside>
                </div>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">People building it</span>
                      <h3 className="mt-1 text-base font-black text-slate-950">Current team</h3>
                    </div>
                    <button type="button" onClick={() => setActiveTab('team')} className="text-[10px] font-black text-violet-700">View team <ArrowRight className="ml-1 inline h-3 w-3" /></button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(startup.members || []).slice(0, 6).map((member) => (
                      <TeamCard key={member.userId} member={member} onClick={() => setSelectedTeamMember(member)} />
                    ))}
                    {startup.members.length === 0 && <EmptyState title="Team not listed yet" body="This startup has not added public team members." />}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'roles' && (
              <RolesPanel startup={startup} openRoles={openRoles} onBookAppointment={onBookAppointment} />
            )}

            {activeTab === 'team' && (
              <section className="space-y-4">
                <SectionHeading eyebrow="Team" title="People currently building this startup." body="Open a profile to review the contributor details they shared during onboarding." />
                <div className="grid gap-3 md:grid-cols-2">
                  {startup.members.map((member) => (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => setSelectedTeamMember(member)}
                      className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_14px_34px_rgba(124,58,237,.08)]"
                    >
                      <img src={member.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-black text-slate-950">{member.name}</strong>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{member.role}</span>
                        <span className="mt-1 block text-[9px] font-semibold text-violet-700">{(member.skills || []).slice(0, 3).join(' • ')}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                  {startup.members.length === 0 && <EmptyState title="No public team members" body="The founder has not added a team roster yet." />}
                </div>
              </section>
            )}

            {activeTab === 'memory' && (
              <section className="space-y-4">
                <SectionHeading eyebrow="AI memory" title="Startup history, decisions and turning points." body="This is the context the AI layer can use to understand how the company got here." />
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-4 text-xs leading-6 text-violet-900">
                  <BrainCircuit className="mr-2 inline h-4 w-4" />
                  Continuous context helps the founder and future contributors work from the same history instead of rebuilding it from zero.
                </div>
                <div className="space-y-3">
                  {(startup.historyLogs || []).map((log, index) => (
                    <div key={log.id} className="relative rounded-[22px] border border-slate-200 bg-white p-4 pl-12">
                      <span className="absolute left-4 top-5 grid h-6 w-6 place-items-center rounded-full bg-violet-50 text-[9px] font-black text-violet-700">{index + 1}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-slate-600">{log.type}</span>
                        <span className="text-[10px] font-bold text-slate-400">{log.date}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-slate-950">{log.title}</h3>
                      <p className="mt-2 text-[11px] leading-5 text-slate-600">{log.description}</p>
                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-600">Impact: {log.impact}</p>
                    </div>
                  ))}
                  {startup.historyLogs.length === 0 && <EmptyState title="No memory logs yet" body="The startup has not added strategic history." />}
                </div>
              </section>
            )}

            {activeTab === 'roadmap' && (
              <section className="space-y-4">
                <SectionHeading eyebrow="Roadmap" title="Where the startup is headed next." body="Review milestones, timing, KPI targets and the skills the team expects to need." />
                <div className="space-y-3">
                  {(startup.roadmap || []).map((milestone, index) => (
                    <div key={milestone.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-[10px] font-black text-violet-700">{String(index + 1).padStart(2, '0')}</span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[.14em] text-violet-600">{milestone.phase}</p>
                            <h3 className="mt-1 text-sm font-black text-slate-950">{milestone.title}</h3>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${milestone.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : milestone.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-4 text-[11px] leading-6 text-slate-600">{milestone.description}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MiniFact label="Duration" value={milestone.duration} />
                        <MiniFact label="KPI target" value={milestone.kpiTarget} />
                        <MiniFact label="Talent needed" value={(milestone.talentNeeded || []).join(', ') || '—'} />
                      </div>
                      {milestone.riskFactors && (
                        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">Risk: {milestone.riskFactors}</div>
                      )}
                    </div>
                  ))}
                  {startup.roadmap.length === 0 && <EmptyState title="No roadmap published" body="The founder has not published a roadmap yet." />}
                </div>
              </section>
            )}
          </div>

          {selectedTeamMember && (
            <div className="border-t border-slate-200 bg-white px-4 py-5 sm:px-6">
              <div id="team-profile-details" className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-sky-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <img src={selectedTeamMember.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-950">{selectedTeamMember.name}</h3>
                      <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-violet-700">{selectedTeamMember.role}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{(selectedTeamMember.skills || []).join(' • ')}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedTeamMember(null)} className="mornai-market-secondary shrink-0">Close profile</button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Contribution</p>
                    <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{selectedTeamMember.profileDetails?.contribution || 'Not provided in this startup roster.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Equity / stipend</p>
                    <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{selectedTeamMember.equityOrStipend || 'Not listed'}</p>
                  </div>
                </div>

                {onboardingAnswers.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {onboardingAnswers.map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
                        <p className="mt-1.5 whitespace-pre-line text-[11px] leading-5 text-slate-600">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RolesPanel = ({
  startup,
  openRoles,
  onBookAppointment,
}: {
  startup: Startup;
  openRoles: RolePost[];
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
}) => (
  <section className="space-y-4">
    <SectionHeading eyebrow="Open roles" title="Choose the work you want to discuss." body="Every role shows the commitment, compensation and skills before you start a conversation." />
    <div className="grid gap-3 lg:grid-cols-2">
      {openRoles.map((role) => (
        <article key={role.id} className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_14px_38px_rgba(124,58,237,.06)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <h3 className="text-sm font-black text-slate-950">{role.title}</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">Open</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{role.commitment} • {role.type}</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-600">{role.description}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {role.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-700">{skill}</span>)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniFact label="Equity" value={role.equityRange} />
            <MiniFact label="Stipend" value={role.stipendRange} />
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Ideal candidate</p>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-600">{role.idealCandidate}</p>
          </div>

          <button type="button" onClick={() => onBookAppointment(startup, role)} className="mornai-market-primary mt-4 w-full justify-center">
            Discuss this role <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>
      ))}
      {openRoles.length === 0 && <EmptyState title="No open roles" body="This startup is not hiring for a public role right now." />}
    </div>
  </section>
);

const Metric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.1em] text-slate-400">{icon}{label}</div>
    <p className="mt-1 truncate text-[10px] font-black text-slate-900">{value}</p>
  </div>
);

const InfoCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-5">
    <div className="flex items-center gap-2 text-sm font-black text-slate-950">{icon}<span>{title}</span></div>
    <div className="mt-4">{children}</div>
  </section>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
    <span>{label}</span>
    <span className="max-w-[65%] text-right font-bold text-slate-800">{value || '—'}</span>
  </div>
);

const MiniFact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3">
    <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    <p className="mt-1.5 text-[10px] font-bold leading-5 text-slate-700">{value || '—'}</p>
  </div>
);

const TeamCard = ({ member, onClick }: { member: StartupMember; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white"
  >
    <img src={member.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover" />
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-xs font-black text-slate-950">{member.name}</strong>
      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{member.role}</span>
    </span>
    <ArrowRight className="h-4 w-4 text-slate-300" />
  </button>
);

const SectionHeading = ({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">{eyebrow}</p>
    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
    <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">{body}</p>
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 p-8 text-center">
    <Sparkles className="mx-auto h-6 w-6 text-slate-300" />
    <p className="mt-3 text-xs font-black text-slate-900">{title}</p>
    <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">{body}</p>
  </div>
);
