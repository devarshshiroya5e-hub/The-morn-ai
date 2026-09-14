import React, { useState } from 'react';
import { User, Startup, Appointment, TaskItem } from '../types';
import { 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  BrainCircuit, 
  Clock, 
  Briefcase, 
  ArrowRight, 
  Video, 
  Lightbulb, 
  ShieldCheck,
  Send,
  ExternalLink
} from 'lucide-react';

interface TalentWorkspaceProps {
  currentUser: User;
  startups: Startup[];
  appointments: Appointment[];
  onBookAppointment: (startup: Startup) => void;
  onUpdateTaskStatus: (startupId: string, taskId: string, status: TaskItem['status']) => void;
  onOpenAiDrawer: () => void;
}

export const TalentWorkspace: React.FC<TalentWorkspaceProps> = ({
  currentUser,
  startups,
  appointments,
  onBookAppointment,
  onUpdateTaskStatus,
  onOpenAiDrawer,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'appointments' | 'matches'>('tasks');
  const [mentoringModalTask, setMentoringModalTask] = useState<TaskItem | null>(null);
  const [liveMentorTip, setLiveMentorTip] = useState<{ tip: string; takeaway: string } | null>(null);
  const [isRequestingMentor, setIsRequestingMentor] = useState(false);

  // Filter tasks assigned to current user across all startups
  const userTasks: { task: TaskItem; startup: Startup }[] = [];
  startups.forEach((startup) => {
    startup.tasks.forEach((task) => {
      if (task.assigneeId === currentUser.id) {
        userTasks.push({ task, startup });
      }
    });
  });

  // Filter appointments for current talent
  const myAppointments = (appointments || []).filter(a => a.talentId === currentUser.id);

  // Filter joined startups
  const joinedStartups = (startups || []).filter(s => s.members.some(m => m.userId === currentUser.id));

  // Compute AI matching startups for talent
  const recommendedStartups = startups.map((s) => {
    const userSkills = currentUser.skills || [];
    const tech = s.techStack || [];
    const matches = (userSkills || []).filter(sk => tech.some(t => t.toLowerCase() === sk.toLowerCase()));
    const score = Math.min(98, Math.max(74, Math.round((matches.length / Math.max(1, userSkills.length)) * 36 + 62)));
    return {
      startup: s,
      score,
      matches,
    };
  }).sort((a, b) => b.score - a.score);

  // Request real-time AI mentoring tip
  const handleRequestLiveMentoring = async (task: TaskItem) => {
    setMentoringModalTask(task);
    setIsRequestingMentor(true);
    try {
      const res = await fetch('/api/ai/mentor-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: currentUser.title,
          context: `Task: ${task.title}. ${task.description}`,
          topic: 'Architecture, velocity and milestone completion',
        }),
      });
      const data = await res.json();
      setLiveMentorTip({
        tip: data.suggestion || 'Break task into smaller verification stages.',
        takeaway: data.keyTakeaway || 'Focus on rapid testability.',
      });
    } catch (err) {
      console.error('Mentor error:', err);
    } finally {
      setIsRequestingMentor(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Talent Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-50 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                  Active Skill Contributor
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">{currentUser.hourlyRate || 'Open to Equity + Stipend'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1">
                {currentUser.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium">{currentUser.title}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Reputation</span>
              <span className="text-base font-bold text-slate-900 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {currentUser.reputationScore || 96}/100
              </span>
            </div>

            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Tasks</span>
              <span className="text-base font-bold text-slate-900">{userTasks.length}</span>
            </div>

            <button
              onClick={onOpenAiDrawer}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
            >
              <BrainCircuit className="w-4 h-4 text-violet-200" />
              <span>AI Strategist Sync</span>
            </button>
          </div>
        </div>

        {/* Skills Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Verified Skills:
          </span>
          {currentUser.skills.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Talent Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            AI-Delegated Tasks ({userTasks.length})
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'appointments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Founder Syncs ({myAppointments.length})
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'matches'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI Startup Recommendations
          </button>
        </div>
      </div>

      {/* TAB 1: AI-DELEGATED TASKS & MENTORING */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sprint Work Packages</h3>
              <p className="text-xs text-slate-500">
                Tasks generated automatically by the AI Co-Founder to match your skillset with startup roadmap goals.
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {(userTasks || []).filter(t => t.task.status === 'in_progress').length} In Progress
            </span>
          </div>

          <div className="space-y-4">
            {userTasks.map(({ task, startup }) => (
              <div
                key={task.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img src={startup.logo} alt={startup.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">{startup.name}</span>
                      <h4 className="font-bold text-slate-900 text-base">{task.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      task.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Deadline: {task.deadline}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>

                {/* Sub-action items checklist */}
                {task.actionItems && task.actionItems.length > 0 && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Deliverable Action Checklist:
                    </span>
                    {task.actionItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real-time AI Mentoring Tip */}
                {task.aiMentoringTip && (
                  <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block mb-0.5">AI Sprint Mentor Insight:</span>
                      <p className="leading-relaxed text-indigo-800">{task.aiMentoringTip}</p>
                    </div>
                  </div>
                )}

                {/* Task Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => handleRequestLiveMentoring(task)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    Ask AI Mentor for Code / Architecture Advice
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Update status:</span>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTaskStatus(startup.id, task.id, e.target.value as any)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none"
                    >
                      <option value="todo">Backlog (Todo)</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Submit for Review</option>
                      <option value="done">Completed & Claim Reward</option>
                    </select>
                  </div>
                </div>

              </div>
            ))}

            {userTasks.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">No Active Sprint Tasks Yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Book an appointment with an ongoing startup to join their team. Once joined, the AI Co-Founder will automatically assign tailored sprint tasks!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY BOOKED APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Booked Founder Syncs</h3>
              <p className="text-xs text-slate-500">
                1-on-1 discovery appointments with startup founders to join ongoing projects.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {myAppointments.length} Booked
            </span>
          </div>

          <div className="space-y-4">
            {myAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                      {apt.startupName}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">{apt.roleTitle} Sync</h4>
                    <p className="text-xs text-slate-500">Meeting with Founder {apt.founderName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {apt.status === 'confirmed' ? 'Confirmed Appointment' : 'Pending Founder Confirmation'}
                    </span>
                  </div>
                </div>

                {/* AI Brief for Talent */}
                <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                  <BrainCircuit className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">AI Sync Preparation Note:</span>
                    <p className="leading-relaxed">
                      Founder is focused on current Phase 1 milestones. Emphasize your experience in {currentUser.skills.slice(0, 3).join(', ')} to show immediate sprint velocity!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{apt.date} at {apt.time}</span>
                  </div>

                  <a
                    href={apt.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Enter Video Room
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI STARTUP RECOMMENDATIONS */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">AI-Matched Ongoing Startups</h3>
            <p className="text-xs text-slate-500">
              Ranked by semantic stack overlap with your verified profile skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedStartups.map(({ startup, score, matches }) => (
              <div
                key={startup.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <img src={startup.logo} alt={startup.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{startup.name}</h4>
                        <p className="text-[11px] text-slate-500">{startup.industry}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-extrabold bg-emerald-100 text-emerald-800 rounded-lg">
                      {score}% Match
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{startup.pitch}</p>

                  <div className="text-xs space-y-1">
                    <span className="text-slate-400 font-medium block">Overlapping Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {matches.map(m => (
                        <span key={m} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-semibold">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {startup.openRoles.length} Open Roles
                  </span>
                  <button
                    onClick={() => onBookAppointment(startup)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Book Sync
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MENTORING MODAL */}
      {mentoringModalTask && liveMentorTip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600">
              <BrainCircuit className="w-5 h-5" />
              <h4 className="font-bold text-slate-900 text-base">Real-Time AI Sprint Mentoring</h4>
            </div>

            <p className="text-xs text-slate-600">
              Mentoring for task: <span className="font-bold text-slate-900">{mentoringModalTask.title}</span>
            </p>

            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-2">
              <p className="leading-relaxed">{liveMentorTip.tip}</p>
              <div className="pt-2 border-t border-indigo-200/50 font-bold text-indigo-800">
                Key Takeaway: {liveMentorTip.takeaway}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setMentoringModalTask(null);
                  setLiveMentorTip(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
              >
                Understood, Resume Sprint
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
