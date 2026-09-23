import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Code2,
  DollarSign,
  Globe2,
  MapPin,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { RolePost, Startup, StartupMember, User } from '../types';
import { formatUsdMoney, useLocalizedCurrency } from '../lib/currency';

interface StartupDetailModalProps {
  startup: Startup | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onBookAppointment: (startup: Startup, role?: RolePost) => void;
  onConsultAi: (startup: Startup) => void;
}

type ExplorerTab = 'overview' | 'roles' | 'team' | 'roadmap' | 'memory';

const getPartnershipText = (role: RolePost, formatMoney: (usd: number) => string) => {
  const p = role.partnership;
  if (!p) return role.type || 'Founder-defined partnership';

  switch (p.mode) {
    case 'equity':
      return p.equityPercent ? p.equityPercent + '% equity' : 'Equity';
    case 'helper':
      return 'Helper / volunteer';
    case 'pay_on_delivery':
      return p.amountUsd ? formatMoney(p.amountUsd) + ' on delivery' : 'Pay on delivery';
    case 'pay_per_hour':
      return p.amountUsd ? formatMoney(p.amountUsd) + ' / hour' : 'Pay per hour';
    case 'pay_per_task':
      return p.amountUsd ? formatMoney(p.amountUsd) + ' / task' : 'Pay per task';
    case 'fixed_project':
      return p.amountUsd ? formatMoney(p.amountUsd) + ' fixed project' : 'Fixed project fee';
    case 'revenue_share':
      return p.equityPercent ? p.equityPercent + '% revenue share' : 'Revenue share';
    case 'work_exchange':
      return p.amountUsd && p.details
        ? formatMoney(p.amountUsd) + ' cash or work exchange'
        : p.details || 'Pay or work';
    case 'equity_plus_cash':
      return p.equityPercent && p.amountUsd
        ? p.equityPercent + '% equity + ' + formatMoney(p.amountUsd)
        : 'Equity + cash';
    default:
      return p.label || role.type || 'Founder-defined partnership';
  }
};

const getPartnershipDetail = (role: RolePost, formatMoney: (usd: number) => string) => {
  const p = role.partnership;
  if (!p) return role.commitment || 'Founder-defined terms';

  return [
    getPartnershipText(role, formatMoney),
    p.milestone || '',
    p.details || '',
    p.expectation || '',
  ].filter(Boolean).join(' • ');
};

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
  const { currency, rates, format: formatMoney } = useLocalizedCurrency(currentUser);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
      setSelectedTeamMember(null);
    }
  }, [isOpen]);

  const openRoles = useMemo(
    () => startup ? startup.openRoles.filter((role) => role.status === 'open') : [],
    [startup],
  );

  if (!isOpen || !startup) return null;

  const valuation = startup.valuationUsd ? formatUsdMoney(startup.valuationUsd, currency, rates) : 'Not disclosed';

  const tabs: Array<{ id: ExplorerTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'roles', label: 'Available roles', count: openRoles.length },
    { id: 'team', label: 'Team', count: startup.members.length },
    { id: 'roadmap', label: 'Roadmap', count: startup.roadmap.length },
    { id: 'memory', label: 'Memory', count: startup.historyLogs.length },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close startup explorer"
        className="fixed right-3 top-3 z-[120] grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-slate-950/75 text-white shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-105 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <section className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/80 bg-slate-50 shadow-[0_40px_120px_rgba(15,23,42,.32)] sm:h-[calc(100dvh-2rem)]">
        <header className="shrink-0">
          <div className="relative h-48 overflow-hidden sm:h-60">
            {startup.coverImage ? (
              <img src={startup.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-5 left-4 right-16 flex items-end gap-4 sm:bottom-6 sm:left-6 sm:right-20">
              <img
                src={startup.logo}
                alt={startup.name}
                className="h-20 w-20 shrink-0 rounded-[22px] border-4 border-white bg-white object-cover shadow-2xl sm:h-24 sm:w-24"
              />
              <div className="min-w-0 pb-1 text-white">
                <div className="flex flex-wrap gap-2">
                  <Badge>{startup.stage}</Badge>
                  <Badge>{startup.industry}</Badge>
                  {startup.verified && (
                    <Badge className="bg-emerald-400/20 text-emerald-100">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <h1 className="mt-2 truncate text-2xl font-black tracking-tight sm:text-3xl">{startup.name}</h1>
                <p className="mt-1 line-clamp-2 max-w-4xl text-xs leading-5 text-white/80 sm:text-sm">{startup.tagline}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Valuation" value={valuation} />
              <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Funding" value={startup.fundingRaised || 'Bootstrapped'} />
              <Metric icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={startup.location || 'Remote'} />
              <Metric icon={<Users className="h-3.5 w-3.5" />} label="Team" value={String(startup.members.length)} />
              <Metric icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Open roles" value={String(openRoles.length)} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-600">Investor readiness: <b className="text-slate-900">{startup.investorReadinessScore}/100</b></span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-600">Growth velocity: <b className="text-slate-900">{startup.growthVelocityScore}/100</b></span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-600">Founded: <b className="text-slate-900">{startup.foundedYear || '—'}</b></span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onConsultAi(startup)} className="mornai-market-secondary justify-center">
                  <BrainCircuit className="h-4 w-4" /> AI Strategist
                </button>
                {openRoles.length > 0 && (
                  <button type="button" onClick={() => onBookAppointment(startup, openRoles[0])} className="mornai-market-primary justify-center">
                    <Calendar className="h-4 w-4" /> Start with a role
                  </button>
                )}
              </div>
            </div>

            <nav className="mt-4 overflow-x-auto border-t border-slate-100 pt-2">
              <div className="flex min-w-max gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={'rounded-xl px-3 py-2.5 text-[10px] font-black transition-all duration-200 ' + (activeTab === tab.id ? 'bg-violet-100 text-violet-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}
                  >
                    {tab.label}
                    {typeof tab.count === 'number' && <span className="ml-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px]">{tab.count}</span>}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
                <div className="space-y-5">
                  <Panel eyebrow="What this startup does" title={startup.tagline}>
                    <p className="text-sm leading-7 text-slate-600">{startup.pitch || 'This startup has not added a full description yet.'}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[startup.industry, startup.stage, startup.location].filter(Boolean).map((item) => (
                        <span key={item} className="rounded-full bg-violet-50 px-3 py-1.5 text-[9px] font-black text-violet-700">{item}</span>
                      ))}
                    </div>
                  </Panel>

                  <section className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_14px_45px_rgba(124,58,237,.05)] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[.16em] text-violet-600">Available roles</p>
                        <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">Choose the work, then choose the conversation.</h2>
                        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Partnership terms are visible before anyone opens the role.</p>
                      </div>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1.5 text-[9px] font-black text-violet-700">{openRoles.length} open</span>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {openRoles.map((role) => (
                        <RoleCompact key={role.id} role={role} onClick={() => onBookAppointment(startup, role)} formatMoney={formatMoney} />
                      ))}
                      {!openRoles.length && <EmptyState title="No open roles" body="This startup is not publishing a public opportunity right now." />}
                    </div>
                  </section>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoCard icon={<Code2 className="h-4 w-4" />} title="Technology">
                      <div className="flex flex-wrap gap-2">
                        {(startup.techStack || []).map((tech) => (
                          <span key={tech} className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700">{tech}</span>
                        ))}
                      </div>
                    </InfoCard>

                    <InfoCard icon={<Rocket className="h-4 w-4" />} title="Company snapshot">
                      <div className="space-y-1">
                        <Row label="Website" value={startup.website || 'Not listed'} icon={<Globe2 className="h-3 w-3" />} />
                        <Row label="Founded" value={startup.foundedYear || '—'} />
                        <Row label="Valuation" value={valuation} />
                        <Row label="Team size" value={String(startup.members.length)} />
                      </div>
                    </InfoCard>
                  </div>
                </div>

                <aside className="space-y-5">
                  <Panel eyebrow="Founder" title={startup.founderName}>
                    <div className="flex items-center gap-3">
                      <img src={startup.founderAvatar} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-md" />
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">Startup owner</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">The founder controls role terms, team decisions and startup direction.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRoles[0] && onBookAppointment(startup, openRoles[0])}
                      disabled={!openRoles.length}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Calendar className="h-3.5 w-3.5" /> Talk about an open role
                    </button>
                  </Panel>

                  <Panel eyebrow="Startup signals" title="What stands out">
                    <div className="space-y-2">
                      <Signal label="Stage" value={startup.stage} />
                      <Signal label="Industry" value={startup.industry} />
                      <Signal label="Location" value={startup.location} />
                      <Signal label="Open roles" value={String(openRoles.length)} />
                    </div>
                  </Panel>
                </aside>
              </section>

              <Panel eyebrow="People building it" title="Current team">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(startup.members || []).slice(0, 6).map((member) => (
                    <TeamCard key={member.userId} member={member} onClick={() => setSelectedTeamMember(member)} />
                  ))}
                  {startup.members.length === 0 && <EmptyState title="Team not listed yet" body="This startup has not published a public team roster." />}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'roles' && (
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Available roles"
                title="Everything visible before you apply."
                body="Role, skills, work model, compensation and partnership details are shown together."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {openRoles.map((role) => (
                  <RoleCard key={role.id} startup={startup} role={role} onBookAppointment={onBookAppointment} formatMoney={formatMoney} />
                ))}
              </div>
              {!openRoles.length && <EmptyState title="No open roles" body="This startup is not publishing a public opportunity right now." />}
            </section>
          )}

          {activeTab === 'team' && (
            <section className="space-y-4">
              <SectionHeading eyebrow="Team" title="People currently building the startup." body="Open a person to review the contributor details they chose to share." />
              <div className="grid gap-3 md:grid-cols-2">
                {startup.members.map((member) => (
                  <TeamCard key={member.userId} member={member} onClick={() => setSelectedTeamMember(member)} />
                ))}
              </div>
              {!startup.members.length && <EmptyState title="No public team members" body="The founder has not published a roster yet." />}
            </section>
          )}

          {activeTab === 'roadmap' && (
            <section className="space-y-4">
              <SectionHeading eyebrow="Roadmap" title="The next milestones." body="A clean view of priorities, timing, risks and the skills this startup expects to need." />
              {(startup.roadmap || []).map((milestone, index) => (
                <article key={milestone.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-[10px] font-black text-violet-700">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[.14em] text-violet-600">{milestone.phase}</p>
                        <h3 className="mt-1 text-sm font-black text-slate-950">{milestone.title}</h3>
                      </div>
                    </div>
                    <StatusBadge status={milestone.status} />
                  </div>
                  <p className="mt-4 text-[11px] leading-6 text-slate-600">{milestone.description}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <MiniFact label="Duration" value={milestone.duration} />
                    <MiniFact label="KPI target" value={milestone.kpiTarget} />
                    <MiniFact label="Talent needed" value={(milestone.talentNeeded || []).join(', ') || '—'} />
                  </div>
                  {milestone.riskFactors && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">Risk: {milestone.riskFactors}</div>}
                </article>
              ))}
              {!startup.roadmap.length && <EmptyState title="No roadmap published" body="The founder has not published a public roadmap yet." />}
            </section>
          )}

          {activeTab === 'memory' && (
            <section className="space-y-4">
              <SectionHeading eyebrow="AI memory" title="History and key decisions." body="Public discovery only exposes what the startup has chosen to share." />
              {(startup.historyLogs || []).map((log, index) => (
                <article key={log.id} className="relative rounded-[22px] border border-slate-200 bg-white p-4 pl-12 shadow-sm">
                  <span className="absolute left-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-violet-50 text-[9px] font-black text-violet-700">{index + 1}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-slate-600">{log.type}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{log.date}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-black text-slate-950">{log.title}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-slate-600">{log.description}</p>
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-600">Impact: {log.impact}</p>
                </article>
              ))}
              {!startup.historyLogs.length && <EmptyState title="No public memory yet" body="The founder has not published strategic history to the public listing." />}
            </section>
          )}
        </main>

        {selectedTeamMember && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,.3)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={selectedTeamMember.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-md" />
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-950">{selectedTeamMember.name}</h3>
                    <p className="mt-1 truncate text-[10px] font-semibold text-violet-700">{selectedTeamMember.role}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedTeamMember(null)} className="mornai-close-btn"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailBox label="Skills" value={(selectedTeamMember.skills || []).join(' • ') || 'Not listed'} />
                <DetailBox label="Partnership" value={selectedTeamMember.equityOrStipend || 'Not listed'} />
                <DetailBox label="Contribution" value={selectedTeamMember.profileDetails?.contribution || 'Not provided'} />
                <DetailBox label="Experience" value={selectedTeamMember.profileDetails?.experienceLevel || 'Not provided'} />
                <DetailBox label="Availability" value={selectedTeamMember.profileDetails?.availability || 'Not provided'} />
                <DetailBox label="Work style" value={selectedTeamMember.profileDetails?.workStyle || 'Not provided'} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={'inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white backdrop-blur-md ' + className}>
    {children}
  </span>
);

const Metric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.1em] text-slate-400">{icon}{label}</div>
    <p className="mt-1 truncate text-xs font-black text-slate-900">{value}</p>
  </div>
);

const Panel = ({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,.04)] sm:p-6">
    <p className="text-[9px] font-black uppercase tracking-[.16em] text-violet-600">{eyebrow}</p>
    <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const InfoCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-black text-slate-950">{icon}{title}</div>
    <div className="mt-4">{children}</div>
  </section>
);

const Row = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
    <span className="flex items-center gap-1.5 text-[10px] text-slate-500">{icon}{label}</span>
    <span className="max-w-[65%] text-right text-[10px] font-bold text-slate-800">{value || '—'}</span>
  </div>
);

const RoleCompact: React.FC<{ role: RolePost; onClick: () => void; formatMoney: (usd: number) => string }> = ({ role, onClick, formatMoney }) => (
  <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-200 bg-white text-violet-600">
      <span className="text-lg font-black">+</span>
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-black text-violet-800">{role.title}</span>
      <span className="mt-1 block truncate text-[9px] font-semibold text-slate-500">{getPartnershipText(role, formatMoney)}</span>
    </span>
    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300 transition group-hover:text-violet-600" />
  </button>
);

const RoleCard: React.FC<{ startup: Startup; role: RolePost; onBookAppointment: (startup: Startup, role?: RolePost) => void; formatMoney: (usd: number) => string }> = ({ startup, role, onBookAppointment, formatMoney }) => (
  <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,.05)]">
    <div className="flex items-start gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
        <BriefcaseBusiness className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <h3 className="text-sm font-black text-slate-950">{role.title}</h3>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">Open</span>
        </div>
        <p className="mt-1 text-[10px] font-black text-violet-700">{getPartnershipText(role, formatMoney)}</p>
      </div>
    </div>

    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Partnership terms</p>
      <p className="mt-1.5 text-[10px] leading-5 text-slate-600">{getPartnershipDetail(role, formatMoney)}</p>
    </div>

    <p className="mt-4 text-[11px] leading-5 text-slate-600">{role.description}</p>

    <div className="mt-4 flex flex-wrap gap-1.5">
      {role.skills.map((skill) => <span key={skill} className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-bold text-violet-700">{skill}</span>)}
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <MiniFact label="What you will do" value={role.responsibilities?.[0] || 'Own role deliverables'} />
      <MiniFact label="Ideal candidate" value={role.idealCandidate || 'Motivated contributor'} />
    </div>

    <button type="button" onClick={() => onBookAppointment(startup, role)} className="mornai-market-primary mt-4 w-full justify-center">
      Discuss this role <ArrowRight className="h-3.5 w-3.5" />
    </button>
  </article>
);

const TeamCard: React.FC<{ member: StartupMember; onClick: () => void }> = ({ member, onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white">
    <img src={member.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover" />
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-xs font-black text-slate-950">{member.name}</strong>
      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{member.role}</span>
      <span className="mt-1 block truncate text-[9px] font-semibold text-violet-700">{(member.skills || []).slice(0, 3).join(' • ')}</span>
    </span>
    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
  </button>
);

const StatusBadge = ({ status }: { status: 'completed' | 'in_progress' | 'upcoming' }) => (
  <span className={'rounded-full px-2.5 py-1 text-[9px] font-black uppercase ' + (status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
    {status.replace('_', ' ')}
  </span>
);

const MiniFact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
    <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    <p className="mt-1.5 text-[10px] font-bold leading-5 text-slate-700">{value || '—'}</p>
  </div>
);

const DetailBox = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    <p className="mt-1.5 whitespace-pre-line text-[10px] leading-5 text-slate-700">{value || '—'}</p>
  </div>
);

const Signal = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
    <span className="text-[10px] text-slate-500">{label}</span>
    <span className="text-right text-[10px] font-black text-slate-800">{value}</span>
  </div>
);

const SectionHeading = ({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-[.16em] text-violet-600">{eyebrow}</p>
    <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{title}</h2>
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