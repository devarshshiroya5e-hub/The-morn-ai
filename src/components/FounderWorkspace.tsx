import React, { useState } from 'react';
import { Startup, User, TaskItem, StartupHistoryLog, RolePost, Appointment, PredictiveInsights, PartnershipMode } from '../types';
import { 
  BrainCircuit, 
  Sparkles, 
  PlusCircle, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Send, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Video,
  Lightbulb,
  FileText,
  Globe2,
  ImagePlus,
  UploadCloud,
  Monitor,
  Smartphone,
  X
} from 'lucide-react';

interface FounderWorkspaceProps {
  startup: Startup;
  currentUser: User;
  allTalents: User[];
  appointments: Appointment[];
  onUpdateStartup: (updated: Startup) => void;
  onUpdateAppointmentStatus: (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') => void;
  onOpenAiDrawer: () => void;
}

export const FounderWorkspace: React.FC<FounderWorkspaceProps> = ({
  startup,
  currentUser,
  allTalents,
  appointments,
  onUpdateStartup,
  onUpdateAppointmentStatus,
  onOpenAiDrawer,
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'memory' | 'delegation' | 'roles' | 'appointments' | 'predictive'>('strategy');
  
  // State for AI generation loaders
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isGeneratingRole, setIsGeneratingRole] = useState(false);
  const [isDelegatingTasks, setIsDelegatingTasks] = useState(false);
  const [isGeneratingPredictive, setIsGeneratingPredictive] = useState(false);
  const [predictiveData, setPredictiveData] = useState<PredictiveInsights | null>(null);

  // Design-only website studio
  const [showWebsiteStudio, setShowWebsiteStudio] = useState(false);
  const [websitePrompt, setWebsitePrompt] = useState('');
  const [websiteImagePreview, setWebsiteImagePreview] = useState('');
  const [websitePreviewMode, setWebsitePreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // AI input design
  const [roadmapGoalInput, setRoadmapGoalInput] = useState('');
  const [delegationBrief, setDelegationBrief] = useState('');

  // New Memory Log Form state
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogType, setNewLogType] = useState<StartupHistoryLog['type']>('milestone');
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newLogImpact, setNewLogImpact] = useState('');
  const [showAddLogModal, setShowAddLogModal] = useState(false);

  // AI Role Maker state
  const [targetRoleInput, setTargetRoleInput] = useState('');
  const [generatedRoleDraft, setGeneratedRoleDraft] = useState<RolePost | null>(null);
  const partnershipOptions: Array<{ value: PartnershipMode; label: string }> = [
    { value: 'equity', label: 'Equity' },
    { value: 'pay_on_delivery', label: 'Pay on delivery / milestone' },
    { value: 'pay_per_hour', label: 'Based on hour' },
    { value: 'pay_per_task', label: 'Per task' },
    { value: 'fixed_project', label: 'Per project' },
    { value: 'monthly_salary', label: 'Monthly salary / stipend' },
    { value: 'revenue_share', label: 'Company revenue share' },
    { value: 'profit_share', label: 'Company profit share' },
    { value: 'commission', label: 'Sales commission' },
    { value: 'work_exchange', label: 'Work exchange' },
    { value: 'equity_plus_cash', label: 'Equity + cash' },
    { value: 'helper', label: 'Volunteer / helper' },
    { value: 'custom', label: 'Custom arrangement' },
  ];

  // Task delegation state
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(startup.members[1]?.userId || '');

  // Filter appointments for this startup
  const startupAppointments = appointments.filter(a => a.startupId === startup.id);

  // 1. Trigger AI Roadmap Generation
  const handleWebsiteImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setWebsiteImagePreview(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const res = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup,
          goal: roadmapGoalInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.roadmap && Array.isArray(data.roadmap)) {
        const formattedRoadmap = (data.roadmap || []).map((rm: any, idx: number) => ({
          id: `rm-${Date.now()}-${idx}`,
          phase: rm.phase || `Phase ${idx + 1}`,
          title: rm.objective || rm.title || 'Strategic Milestone',
          description: (rm.milestones || []).join('. ') || rm.description || '',
          duration: rm.duration || 'Weeks 1-4',
          kpiTarget: rm.kpiTarget || 'Validate core assumptions',
          status: idx === 0 ? ('in_progress' as const) : ('upcoming' as const),
          talentNeeded: rm.talentNeeded || ['Full Stack Engineer'],
          riskFactors: rm.riskFactors || 'Market timing',
        }));

        const updatedStartup = {
          ...startup,
          roadmap: formattedRoadmap,
        };
        onUpdateStartup(updatedStartup);
      }
    } catch (err) {
      console.error('Failed to generate roadmap:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // 2. Add New Memory Log to Startup History
  const handleAddMemoryLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim() || !newLogDesc.trim()) return;

    const newLog: StartupHistoryLog = {
      id: `hist-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: newLogType,
      title: newLogTitle.trim(),
      description: newLogDesc.trim(),
      impact: newLogImpact.trim() || 'Informed ongoing roadmap execution',
    };

    const updatedStartup = {
      ...startup,
      historyLogs: [newLog, ...startup.historyLogs],
    };
    onUpdateStartup(updatedStartup);

    setNewLogTitle('');
    setNewLogDesc('');
    setNewLogImpact('');
    setShowAddLogModal(false);
  };

  // 3. Trigger AI Role Post Generator
  const handleGenerateRolePost = async () => {
    setIsGeneratingRole(true);
    try {
      const res = await fetch('/api/ai/generate-role-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup,
          targetRoleTitle: targetRoleInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.rolePost) {
        const draft: RolePost = {
          id: `role-${Date.now()}`,
          startupId: startup.id,
          startupName: startup.name,
          startupLogo: startup.logo,
          title: data.rolePost.title,
          type: data.rolePost.type || 'Equity + Stipend',
          equityRange: data.rolePost.equityRange || '1.5% - 3.0%',
          stipendRange: data.rolePost.stipendRange || '$2,000 / milestone',
          commitment: data.rolePost.commitment || '15-20 hrs/week',
          skills: data.rolePost.skills || ['React', 'TypeScript'],
          description: data.rolePost.description || 'Core contributor position',
          responsibilities: data.rolePost.responsibilities || ['Own phase deliverables'],
          idealCandidate: data.rolePost.idealCandidate || 'Energetic startup builder',
          postedDate: new Date().toISOString().split('T')[0],
          applicantCount: 0,
          status: 'open',
          partnership: { mode: 'pay_per_task', label: 'Pay per work / task', amountUsd: 150, unit: 'task', details: '', expectation: '' },
        };
        setGeneratedRoleDraft(draft);
      }
    } catch (err) {
      console.error('Failed to generate role:', err);
    } finally {
      setIsGeneratingRole(false);
    }
  };

  // Publish Draft Role to Startup Feed
  const handlePublishRoleDraft = () => {
    if (!generatedRoleDraft) return;
    const updated = {
      ...startup,
      openRoles: [generatedRoleDraft, ...startup.openRoles],
    };
    onUpdateStartup(updated);
    setGeneratedRoleDraft(null);
    setTargetRoleInput('');
  };

  // 4. Automatically Delegate Tasks with AI
  const handleAutoDelegateWork = async () => {
    const assignee = startup.members.find(m => m.userId === selectedAssigneeId) || startup.members[0];
    if (!assignee) return;

    setIsDelegatingTasks(true);
    try {
      const res = await fetch('/api/ai/delegate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup,
          employee: assignee,
          roadmapPhase: startup.roadmap[0]?.phase || 'Phase 1 MVP',
          founderInstruction: delegationBrief.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        const newTasks: TaskItem[] = (data.tasks || []).map((t: any, i: number) => ({
          id: `task-${Date.now()}-${i}`,
          startupId: startup.id,
          assigneeId: assignee.userId,
          assigneeName: assignee.name,
          assigneeAvatar: assignee.avatar,
          title: t.title || 'Sprint Deliverable',
          priority: t.priority || 'High',
          status: 'todo' as const,
          estimatedHours: t.estimatedHours || 10,
          deadline: t.deadline || '4 days',
          description: t.description || 'Execute milestone specification',
          actionItems: t.actionItems || ['Review requirements', 'Submit pull request'],
          aiMentoringTip: t.aiMentoringTip || 'Maintain modular design patterns',
          createdAt: new Date().toISOString().split('T')[0],
        }));

        const updated = {
          ...startup,
          tasks: [...newTasks, ...startup.tasks],
        };
        onUpdateStartup(updated);
      }
    } catch (err) {
      console.error('Task delegation error:', err);
    } finally {
      setIsDelegatingTasks(false);
    }
  };

  // 5. Load Predictive Insights
  const handleLoadPredictive = async () => {
    setIsGeneratingPredictive(true);
    try {
      const res = await fetch('/api/ai/predictive-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup }),
      });
      const data = await res.json();
      setPredictiveData(data);
    } catch (err) {
      console.error('Predictive error:', err);
    } finally {
      setIsGeneratingPredictive(false);
    }
  };

  // Change Task Status
  const handleTaskStatusChange = (taskId: string, newStatus: TaskItem['status']) => {
    const updatedTasks = (startup.tasks || []).map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    onUpdateStartup({ ...startup, tasks: updatedTasks });
  };

  // Accept Talent into Startup from Appointment
  const handleAcceptTalentFromAppointment = (apt: Appointment) => {
    const alreadyMember = startup.members.some(m => m.userId === apt.talentId);
    if (alreadyMember) return;

    const newMember = {
      userId: apt.talentId,
      name: apt.talentName,
      role: apt.roleTitle,
      avatar: apt.talentAvatar,
      joinedDate: new Date().toISOString().split('T')[0],
      equityOrStipend: '2.0% Equity + $2,000/sprint',
      status: 'active' as const,
      skills: apt.talentSkills,
    };

    onUpdateStartup({
      ...startup,
      members: [...startup.members, newMember],
    });
    onUpdateAppointmentStatus(apt.id, 'completed');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Founder Workspace Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <img
              src={startup.logo}
              alt={startup.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                  Founder Command Center
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">{startup.stage} Stage</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] mt-1">
                {startup.name}
              </h1>
              <p className="text-xs text-slate-500 line-clamp-1">{startup.tagline}</p>
            </div>
          </div>

          {/* Key Metrics Quick Cards */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            
            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Readiness
              </span>
              <div className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {startup.investorReadinessScore}/100
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Contributors
              </span>
              <div className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-indigo-600" />
                {startup.members.length}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Memory Logs
              </span>
              <div className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
                <BrainCircuit className="w-4 h-4 text-violet-600" />
                {startup.historyLogs.length}
              </div>
            </div>

            <button
              id="founder-consult-ai-btn"
              onClick={onOpenAiDrawer}
              className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all"
            >
              <BrainCircuit className="w-4 h-4 text-violet-200 animate-pulse" />
              <span>AI Co-Founder Advisory</span>
            </button>

            <button
              id="founder-website-btn"
              type="button"
              onClick={() => setShowWebsiteStudio(true)}
              className="mornai-workspace-glass-action"
            >
              <Globe2 className="w-4 h-4 text-violet-600" />
              <span>Website</span>
            </button>

          </div>

        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            id="tab-strategy-btn"
            onClick={() => setActiveTab('strategy')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'strategy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            AI Roadmap & Strategy
          </button>

          <button
            id="tab-memory-btn"
            onClick={() => setActiveTab('memory')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'memory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            Startup Memory Vault ({startup.historyLogs.length})
          </button>

          <button
            id="tab-delegation-btn"
            onClick={() => setActiveTab('delegation')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'delegation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Auto-Delegate Work ({startup.tasks.length})
          </button>

          <button
            id="tab-roles-btn"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            AI Role Maker ({startup.openRoles.length})
          </button>

          <button
            id="tab-appointments-btn"
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'appointments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Talent Syncs ({startupAppointments.length})
          </button>

          <button
            id="tab-predictive-btn"
            onClick={() => {
              setActiveTab('predictive');
              if (!predictiveData) handleLoadPredictive();
            }}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'predictive'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Predictive Insights
          </button>
        </div>
      </div>

      {/* TAB 1: AI ROADMAP & STRATEGY */}
      {activeTab === 'strategy' && (
        <div className="space-y-6">
          
           {/* AI Goal Input */}
           <div className="mornai-workspace-ai-panel">
             <div className="min-w-0 flex-1">
               <span className="mornai-workspace-ai-kicker">AI Roadmap Goal</span>
               <h3 className="mt-1 text-sm font-bold text-slate-900">Tell MornAI what goal you want to reach.</h3>
               <p className="mt-1 text-xs leading-5 text-slate-500">
                 Describe the outcome you want, such as launching the MVP, reaching a customer target, or preparing for funding.
               </p>
               <textarea
                 id="roadmap-goal-input"
                 value={roadmapGoalInput}
                 onChange={(e) => setRoadmapGoalInput(e.target.value)}
                 rows={3}
                 placeholder="e.g. Launch our MVP in 45 days and reach the first 500 paying users..."
                 className="mornai-workspace-ai-field mt-3"
               />
             </div>
           </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                Continuous Executive Roadmap Synthesis
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5">
                The AI Co-Founder recalculates phases, timelines, and required talent based on historical achievements and current bottlenecks.
              </p>
            </div>

            <button
              id="regenerate-roadmap-btn"
              onClick={handleGenerateRoadmap}
              disabled={isGeneratingRoadmap}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingRoadmap ? 'animate-spin' : ''}`} />
              {isGeneratingRoadmap ? 'Synthesizing with Gemini...' : 'Regenerate Roadmap with AI'}
            </button>
          </div>

          {/* Roadmap Phase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(startup.roadmap || []).map((milestone, idx) => (
              <div
                key={milestone.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md">
                      {milestone.phase}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{milestone.duration}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-2">{milestone.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{milestone.description}</p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Key Performance Target:</span>
                      <span className="font-semibold text-slate-800">{milestone.kpiTarget}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Critical Roles Needed:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(milestone.talentNeeded || []).map(role => (
                          <span key={role} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    milestone.status === 'in_progress' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    ● {milestone.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => {
                      setTargetRoleInput(milestone.talentNeeded[0] || '');
                      setActiveTab('roles');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Hire For Phase</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 2: STARTUP MEMORY VAULT */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                Startup Memory Vault
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Every pivot, tech decision, bottleneck, and traction milestone recorded here is permanently retained by the AI Co-Founder. Whenever tasks are delegated or strategy is planned, this entire history is referenced.
              </p>
            </div>

            <button
              id="open-add-memory-btn"
              onClick={() => setShowAddLogModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Add Memory Log / Pivot
            </button>
          </div>

          {/* Timeline of Memory Logs */}
          <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
            {(startup.historyLogs || []).map((log) => (
              <div key={log.id} className="relative group">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-sm" />

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
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

                  <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs flex items-center gap-2 text-slate-700">
                    <span className="font-bold text-slate-900">Strategic Impact on AI:</span>
                    <span>{log.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 3: AUTO-DELEGATE WORK TO JOINED EMPLOYEES */}
      {activeTab === 'delegation' && (
        <div className="space-y-6">
          
          {/* AI Task Delegation Input */}
          <div className="mornai-workspace-ai-panel">
            <div className="min-w-0 flex-1">
              <span className="mornai-workspace-ai-kicker">AI Auto-Delegate Brief</span>
              <h3 className="mt-1 text-sm font-bold text-slate-900">Tell the AI what work you want assigned to your team.</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Describe the outcome, constraints, priority, or workstream. The future AI will turn this into team tasks.
              </p>
              <textarea
                id="auto-delegate-brief-input"
                value={delegationBrief}
                onChange={(e) => setDelegationBrief(e.target.value)}
                rows={3}
                placeholder="e.g. Break the onboarding launch into tasks for design and engineering, with the highest priority on activation..."
                className="mornai-workspace-ai-field mt-3"
              />
            </div>
          </div>

          {/* AI Task Delegation Trigger Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Automated Work Delegation
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Assign Sprints to Joined Contributors with AI
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Select a team member who joined the startup. The AI Co-Founder analyzes their specific skills against your current roadmap phase to generate structured, actionable sprint tasks with step-by-step mentoring tips!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  id="select-delegation-assignee"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(startup.members || []).map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>

                <button
                  id="trigger-auto-delegate-btn"
                  onClick={handleAutoDelegateWork}
                  disabled={isDelegatingTasks || startup.members.length === 0}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <BrainCircuit className={`w-4 h-4 ${isDelegatingTasks ? 'animate-spin' : ''}`} />
                  {isDelegatingTasks ? 'AI Delegating Tasks...' : 'Auto-Delegate Work with AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Kanban / Sprint Tasks Board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['todo', 'in_progress', 'review', 'done'] as const).map((colStatus) => {
              const colTasks = (startup.tasks || []).filter(t => t.status === colStatus);
              const colTitles = {
                todo: 'Sprint Backlog (Todo)',
                in_progress: 'In Progress',
                review: 'Peer / Founder Review',
                done: 'Completed Milestones'
              };

              return (
                <div key={colStatus} className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">
                      {colTitles[colStatus]}
                    </span>
                    <span className="text-xs font-semibold bg-white text-slate-600 px-2 py-0.5 rounded-full shadow-xs">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {(colTasks || []).map((task) => (
                      <div
                        key={task.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                            task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {task.priority} Priority
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">{task.deadline}</span>
                        </div>

                        <h5 className="font-bold text-slate-900 text-xs leading-snug">{task.title}</h5>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{task.description}</p>

                        {/* Assignee pill */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <img src={task.assigneeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} alt={task.assigneeName} className="w-5 h-5 rounded-full object-cover" />
                          <span className="text-[11px] font-medium text-slate-700">{task.assigneeName}</span>
                        </div>

                        {/* AI Mentoring Tip */}
                        {task.aiMentoringTip && (
                          <div className="p-2 bg-indigo-50 rounded-lg text-[10px] text-indigo-800 border border-indigo-100">
                            <span className="font-bold block mb-0.5 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3 text-amber-500" />
                              AI Co-Founder Guidance:
                            </span>
                            {task.aiMentoringTip}
                          </div>
                        )}

                        {/* Status Change Selector */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Move state:</span>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700 focus:outline-none"
                          >
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 4: AI ROLE POST MAKER */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Role Post Maker
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Tell the AI what capability your startup needs or let it analyze your roadmap gaps to generate an optimized, high-converting role posting with equity and milestone stipend terms.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Lead Full-Stack AI Engineer, Growth Marketer, Smart Contract Specialist..."
                value={targetRoleInput}
                onChange={(e) => setTargetRoleInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                id="generate-role-draft-btn"
                onClick={handleGenerateRolePost}
                disabled={isGeneratingRole}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <BrainCircuit className={`w-4 h-4 ${isGeneratingRole ? 'animate-spin' : ''}`} />
                {isGeneratingRole ? 'Drafting Role...' : 'Generate Role with AI'}
              </button>
            </div>
          </div>

          {/* Role Draft Preview if available */}
          {generatedRoleDraft && (
            <div className="bg-indigo-50/70 border-2 border-indigo-400 p-6 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-600 text-white rounded">
                  AI Draft Ready for Review
                </span>
                <span className="text-xs font-semibold text-indigo-800">
                  {generatedRoleDraft.type}
                </span>
              </div>

              <h4 className="text-lg font-bold text-slate-900">{generatedRoleDraft.title}</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{generatedRoleDraft.description}</p>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Key Deliverables:</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {(generatedRoleDraft.responsibilities || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4">
                  <span className="font-bold text-slate-900 block mb-2">Founder-selected partnership</span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={generatedRoleDraft.partnership?.mode || 'pay_per_task'}
                      onChange={(e) => {
                        const mode = e.target.value as PartnershipMode;
                        const label = partnershipOptions.find((item) => item.value === mode)?.label || mode;
                        setGeneratedRoleDraft((current) => current ? ({
                          ...current,
                          type: label,
                          partnership: { ...(current.partnership || { mode: 'pay_per_task', label: 'Pay per work / task' }), mode, label },
                        }) : current);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                      {partnershipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={generatedRoleDraft.partnership?.amountUsd ?? ''}
                      onChange={(e) => setGeneratedRoleDraft((current) => current ? ({
                        ...current,
                        partnership: { ...(current.partnership || { mode: 'pay_per_task', label: 'Pay per work / task' }), amountUsd: Number(e.target.value) }
                      }) : current)}
                      placeholder="Cash amount (USD base)"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
                    />
                    <input
                      value={generatedRoleDraft.partnership?.details || ''}
                      onChange={(e) => setGeneratedRoleDraft((current) => current ? ({
                        ...current,
                        partnership: { ...(current.partnership || { mode: 'pay_per_task', label: 'Pay per work / task' }), details: e.target.value }
                      }) : current)}
                      placeholder="Terms / work exchange / success condition"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">This exact partnership is published with the role and shown before a contributor applies.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-1">AI draft compensation:</span>
                  <p className="text-slate-600">Equity: {generatedRoleDraft.equityRange} • Stipend: {generatedRoleDraft.stipendRange} • Commitment: {generatedRoleDraft.commitment}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setGeneratedRoleDraft(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  id="publish-role-btn"
                  onClick={handlePublishRoleDraft}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish to THE MORN AI Feed
                </button>
              </div>
            </div>
          )}

          {/* Currently Published Roles */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Active Published Roles ({startup.openRoles?.length || 0})
            </span>

            {startup.openRoles?.map((role) => (
              <div
                key={role.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{role.title}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                      {role.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Equity: {role.equityRange} • Stipend: {role.stipendRange} • {role.commitment}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.skills?.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right flex flex-col sm:items-end justify-between">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {role.applicantCount} Talent Inquiries
                  </span>
                  <span className="text-[11px] text-slate-400 mt-2">Posted {role.postedDate}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 5: APPOINTMENTS & TALENT SYNCS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Talent Join Appointments & Sync Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review skilled contributors requesting 1-on-1 founder appointments to join your ongoing startup.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
              {startupAppointments.length} Appointments
            </span>
          </div>

          <div className="space-y-4">
            {(startupAppointments || []).map((apt) => (
              <div
                key={apt.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={apt.talentAvatar}
                      alt={apt.talentName}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{apt.talentName}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          apt.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Applied for: <span className="font-bold text-indigo-600">{apt.roleTitle}</span></p>
                    </div>
                  </div>

                  {/* AI Match Score Pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">AI Fit Score</span>
                      <span className="text-xs font-extrabold text-indigo-900">{apt.aiMatchScore}% Match</span>
                    </div>
                  </div>
                </div>

                {/* Candidate Pitch */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Candidate Pitch:</span>
                  <p className="italic">"{apt.pitchMessage}"</p>
                </div>

                {/* AI Preparation Brief */}
                {apt.aiPreparationBrief && (
                  <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">AI Interview Briefing for Founder:</span>
                      <p className="leading-relaxed">{apt.aiPreparationBrief}</p>
                    </div>
                  </div>
                )}

                {/* Date, Time & Meeting Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Scheduled for: {apt.date} at {apt.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={apt.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5 text-indigo-600" />
                      Join Video Sync
                    </a>

                    {apt.status === 'pending' && (
                      <button
                        onClick={() => onUpdateAppointmentStatus(apt.id, 'confirmed')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Confirm Slot
                      </button>
                    )}

                    <button
                      id={`accept-talent-${apt.id}`}
                      onClick={() => handleAcceptTalentFromAppointment(apt)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Onboard to Startup
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {startupAppointments.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">No Appointments Yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Once talent views your ongoing startup roles and books an appointment, sync requests will appear here.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 6: PREDICTIVE GROWTH & NETWORKING INSIGHTS */}
      {activeTab === 'predictive' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  THE MORN AI Predictive Analytics
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Predictive Growth & Investor Networking Engine
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Calculates time-to-MVP acceleration, runway impact through skill-equity pooling, and syndicate investor matching.
                </p>
              </div>

              <button
                onClick={handleLoadPredictive}
                disabled={isGeneratingPredictive}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPredictive ? 'animate-spin' : ''}`} />
                {isGeneratingPredictive ? 'Analyzing...' : 'Refresh Predictive Model'}
              </button>
            </div>

            {predictiveData && (
              <div className="mt-6 space-y-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-900 block">Growth Velocity Score</span>
                    <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                      {predictiveData.growthVelocityScore}/100
                    </div>
                    <p className="text-[11px] text-indigo-700 mt-1">Top 15% velocity across Pre-Seed AI cohort</p>
                  </div>

                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-900 block">Time to MVP Saved</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                      {predictiveData.timeToMvpAcceleration}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">Direct result of modular AI task delegation</p>
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                    <span className="text-xs font-bold text-amber-900 block">Runway Extension</span>
                    <div className="text-2xl font-extrabold text-amber-600 mt-1">
                      {predictiveData.runwayImpactMonths}
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1">Capital saved via skill-equity contributor grants</p>
                  </div>
                </div>

                {/* Strategic Observations */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Predictive Strategic Trajectory
                  </h4>
                  <div className="space-y-2 text-xs text-slate-700">
                    {(predictiveData?.predictiveObservations || []).map((obs, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{obs}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Syndicate & Partners */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Predictive Investor & Ecosystem Synergy Matching
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(predictiveData?.networkSynergies || []).map((net, i) => (
                      <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{net.name}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">{net.reason}</p>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg whitespace-nowrap">
                          {net.fit} Synergy
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* DESIGN MODAL: AI WEBSITE STUDIO */}
      {showWebsiteStudio && (
        <div className="mornai-website-overlay fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="mornai-website-studio relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px]">
            <div className="flex items-center justify-between gap-4 border-b border-white/80 bg-white/75 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="mornai-workspace-ai-kicker">AI Website Studio</span>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">Design mode</span>
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-950">Build the website for {startup.name}</h2>
                <p className="mt-1 text-[11px] text-slate-500">Describe the startup or upload a product image. AI generation will connect later.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWebsiteStudio(false)}
                className="mornai-close-btn"
                aria-label="Close website studio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[360px_1fr]">
              <aside className="border-b border-slate-200/70 bg-white/65 p-5 backdrop-blur-xl lg:border-b-0 lg:border-r">
                <div className="rounded-[24px] border border-white/90 bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,.06)] backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <BrainCircuit className="h-4 w-4 text-violet-600" />
                    Full AI Website Chat
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">This is the future chat surface. For now it is a visual prototype.</p>

                  <div className="mt-4 space-y-3">
                    <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-600">
                      Tell me what your startup does, what the website should achieve, and the style you want.
                    </div>
                    {websitePrompt && (
                      <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-violet-600 px-3.5 py-3 text-[11px] leading-5 text-white shadow-[0_10px_24px_rgba(124,58,237,.18)]">
                        {websitePrompt}
                      </div>
                    )}
                  </div>

                  <textarea
                    value={websitePrompt}
                    onChange={(e) => setWebsitePrompt(e.target.value)}
                    rows={5}
                    placeholder="Describe your startup, audience, pages, products, style, CTA..."
                    className="mornai-workspace-ai-field mt-4"
                  />

                  <label className="mornai-website-upload mt-3">
                    <input type="file" accept="image/*" onChange={handleWebsiteImageSelect} className="sr-only" />
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900">Upload a product photo</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Use a product image as visual context for the future AI builder.</p>
                    </div>
                    <UploadCloud className="h-4 w-4 text-slate-400" />
                  </label>

                  {websiteImagePreview && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-white">
                      <img src={websiteImagePreview} alt="Uploaded product preview" className="h-28 w-full object-cover" />
                    </div>
                  )}

                  <button
                    type="button"
                    className="mornai-workspace-ai-primary mt-4 w-full justify-center"
                  >
                    <BrainCircuit className="h-4 w-4" />
                    Generate Website Concept
                  </button>
                </div>
              </aside>

              <section className="min-h-[540px] bg-slate-100/70 p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="mornai-workspace-ai-kicker">Live Preview</span>
                    <p className="mt-1 text-xs font-bold text-slate-700">AI-generated website preview surface</p>
                  </div>
                  <div className="mornai-preview-switch">
                    <button type="button" onClick={() => setWebsitePreviewMode('desktop')} className={websitePreviewMode === 'desktop' ? 'is-active' : ''}><Monitor className="h-3.5 w-3.5" /> Desktop</button>
                    <button type="button" onClick={() => setWebsitePreviewMode('mobile')} className={websitePreviewMode === 'mobile' ? 'is-active' : ''}><Smartphone className="h-3.5 w-3.5" /> Mobile</button>
                  </div>
                </div>

                <div className="flex min-h-[480px] items-center justify-center overflow-auto rounded-[28px] border border-white/80 bg-white/55 p-4 shadow-inner backdrop-blur-xl">
                  <div className={websitePreviewMode === 'mobile' ? 'mornai-website-preview is-mobile' : 'mornai-website-preview'}>
                    <div className="mornai-website-preview-topbar">
                      <span>{startup.name}</span>
                      <div className="flex items-center gap-2">
                        <span>About</span><span>Solutions</span><span>Contact</span>
                      </div>
                    </div>
                    <div className="mornai-website-preview-hero">
                      <div className="min-w-0">
                        <span className="mornai-website-preview-badge">Built with MornAI</span>
                        <h3>{startup.name}</h3>
                        <p>{websitePrompt || startup.tagline || 'A clear, modern digital home for your startup.'}</p>
                        <button type="button">Get Started</button>
                      </div>
                      <div className="mornai-website-preview-media">
                        {websiteImagePreview ? (
                          <img src={websiteImagePreview} alt="" />
                        ) : (
                          <div className="mornai-website-placeholder">
                            <Globe2 className="h-8 w-8" />
                            <span>Your product visual</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mornai-website-preview-cards">
                      <div><span>01</span><strong>What you solve</strong><p>Problem-focused startup positioning.</p></div>
                      <div><span>02</span><strong>How it works</strong><p>Simple product story and value flow.</p></div>
                      <div><span>03</span><strong>Why trust you</strong><p>Proof, traction, team and credibility.</p></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STARTUP MEMORY LOG */}
      {showAddLogModal && (
        <div className="mornai-memory-log-overlay fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4">
          <div className="mornai-memory-log-modal mx-auto my-1 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] sm:my-0 sm:max-h-[calc(100dvh-2rem)]">
            <div className="shrink-0 px-6 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Outfit']">
              Add New Memory Log into Startup Vault
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="mornai-close-btn shrink-0"
                  aria-label="Close memory log"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mornai-modal-scroll px-6 pb-6 sm:px-7 sm:pb-7">
              <p className="text-xs text-slate-500">
              This log is permanently remembered by the AI Co-Founder to guide future roadmaps and task delegation.
            </p>

            <form onSubmit={handleAddMemoryLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event / Pivot Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pivoted pricing from per-seat to usage-based telemetry"
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  className="mornai-memory-log-field px-3.5 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Log Type</label>
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as any)}
                  className="mornai-memory-log-field px-3.5 py-3 text-sm"
                >
                  <option value="milestone">Milestone Achieved</option>
                  <option value="pivot">Strategic Pivot</option>
                  <option value="bottleneck">Current Bottleneck / Challenge</option>
                  <option value="traction">Customer Traction / Pilot</option>
                  <option value="tech_choice">Architecture / Tech Choice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Context & Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain what happened, key metrics, and why this decision was made..."
                  value={newLogDesc}
                  onChange={(e) => setNewLogDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Strategic Impact on Startup</label>
                <input
                  type="text"
                  placeholder="e.g. Shortened sales cycle by 40%, unblocked Phase 2 roadmap"
                  value={newLogImpact}
                  onChange={(e) => setNewLogImpact(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(99,102,241,.24)] transition hover:shadow-[0_14px_30px_rgba(99,102,241,.32)]"
                >
                  Save into Memory
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
