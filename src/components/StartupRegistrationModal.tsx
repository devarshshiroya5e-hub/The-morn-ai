import React, { useState } from 'react';
import { Startup, User } from '../types';
import { X, Sparkles, BrainCircuit, Rocket, PlusCircle } from 'lucide-react';

interface StartupRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRegisterStartup: (newStartup: Startup) => void;
}

export const StartupRegistrationModal: React.FC<StartupRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRegisterStartup,
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('Artificial Intelligence');
  const [stage, setStage] = useState<'Pre-Seed' | 'Seed' | 'Series A'>('Pre-Seed');
  const [pitch, setPitch] = useState('');
  const [techStackInput, setTechStackInput] = useState('React, TypeScript, Python, Gemini API');
  const [fundingRaised, setFundingRaised] = useState('$150,000');
  const [location, setLocation] = useState('San Francisco, CA (Remote)');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim()) return;

    setIsSynthesizing(true);

    const techStack = techStackInput.split(',').map(s => s.trim()).filter(Boolean);

    // Build base object
    const newStartup: Startup = {
      id: `startup-${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim(),
      industry,
      stage,
      website: `https://${name.trim().toLowerCase().replace(/\s+/g, '')}.io`,
      foundedYear: String(new Date().getFullYear()),
      location,
      founderId: currentUser.id,
      founderName: currentUser.name,
      founderAvatar: currentUser.avatar,
      fundingRaised,
      investorReadinessScore: 84,
      growthVelocityScore: 88,
      verified: true,
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      pitch: pitch.trim() || tagline.trim(),
      techStack,
      historyLogs: [
        {
          id: `hist-reg-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'milestone',
          title: 'Registered on SolveEarn Ecosystem',
          description: `${name} registered on SolveEarn by ${currentUser.name} to onboard skilled talent via AI sprint delegation.`,
          impact: 'Initialized automated AI Co-Founder memory index.',
        },
      ],
      roadmap: [
        {
          id: `rm-${Date.now()}-1`,
          phase: 'Phase 1 MVP Sprint',
          title: 'Core Architecture & Contributor Onboarding',
          description: 'Ship initial product iteration and integrate newly joined skill contributors.',
          duration: 'Weeks 1-4',
          kpiTarget: 'Launch private beta to 100 pilot users',
          status: 'in_progress',
          talentNeeded: ['Full Stack Engineer', 'Product Designer'],
          riskFactors: 'Sprint execution pace',
        },
        {
          id: `rm-${Date.now()}-2`,
          phase: 'Phase 2 Traction',
          title: 'Telemetry Analytics & Syndicate Pitching',
          description: 'Validate customer retention cohorts and syndicate with angel investors.',
          duration: 'Weeks 5-8',
          kpiTarget: '$15k MRR or 5,000 active sessions',
          status: 'upcoming',
          talentNeeded: ['Growth Marketer'],
          riskFactors: 'Customer acquisition cost',
        },
      ],
      openRoles: [
        {
          id: `role-${Date.now()}-1`,
          startupId: `startup-${Date.now()}`,
          startupName: name.trim(),
          startupLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
          title: 'Founding Engineer / Contributor',
          type: 'Equity + Stipend',
          equityRange: '1.5% - 3.5%',
          stipendRange: '$2,500 / sprint',
          commitment: '15-20 hrs/week',
          skills: techStack.slice(0, 4),
          description: `Work alongside ${currentUser.name} on the core architecture and features for ${name}.`,
          responsibilities: ['Implement core features', 'Work directly with AI sprint delegation'],
          idealCandidate: 'Passionate developer looking for high equity upside',
          postedDate: new Date().toISOString().split('T')[0],
          applicantCount: 0,
          status: 'open',
        },
      ],
      members: [
        {
          userId: currentUser.id,
          name: currentUser.name,
          role: 'Founder & CEO',
          avatar: currentUser.avatar,
          joinedDate: new Date().toISOString().split('T')[0],
          equityOrStipend: 'Founder Equity',
          status: 'active',
          skills: currentUser.skills,
        },
      ],
      tasks: [
        {
          id: `task-init-${Date.now()}`,
          startupId: `startup-${Date.now()}`,
          assigneeId: currentUser.id,
          assigneeName: currentUser.name,
          assigneeAvatar: currentUser.avatar,
          title: 'Set up Sprint Backlog & Onboard First Contributor',
          priority: 'High',
          status: 'todo',
          estimatedHours: 6,
          deadline: '3 days',
          description: 'Review incoming talent appointments and allocate first Phase 1 sprint package.',
          actionItems: ['Review SolveEarn applications', 'Confirm video sync slots'],
          aiMentoringTip: 'Keep initial onboarding tasks modular (< 10 hours) for high contributor momentum.',
          createdAt: new Date().toISOString().split('T')[0],
        },
      ],
    };

    // Attempt AI roadmap enhancement
    try {
      const res = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup: newStartup }),
      });
      const data = await res.json();
      if (data.roadmap && Array.isArray(data.roadmap) && data.roadmap.length > 0) {
        newStartup.roadmap = data.roadmap.map((rm: any, idx: number) => ({
          id: `rm-gen-${Date.now()}-${idx}`,
          phase: rm.phase || `Phase ${idx + 1}`,
          title: rm.objective || rm.title || 'Milestone',
          description: (rm.milestones || []).join('. ') || rm.description || '',
          duration: rm.duration || 'Weeks 1-4',
          kpiTarget: rm.kpiTarget || 'Validate metrics',
          status: idx === 0 ? ('in_progress' as const) : ('upcoming' as const),
          talentNeeded: rm.talentNeeded || ['Engineer'],
          riskFactors: rm.riskFactors || 'Market velocity',
        }));
      }
    } catch (err) {
      console.warn('AI roadmap generation fallback to default', err);
    }

    onRegisterStartup(newStartup);
    setIsSynthesizing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Rocket className="w-4 h-4" />
            Founder Onboarding
          </div>
          <h3 className="text-xl font-extrabold font-['Outfit']">
            Register Your Ongoing Startup
          </h3>
          <p className="text-xs text-indigo-200 mt-1">
            Publish your startup to the SolveEarn community, enable skilled talent appointments, and activate your automated AI Co-Founder.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Startup Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SynapseAI, EcoMetric"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Industry Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="ClimateTech">ClimateTech</option>
                <option value="Developer Tools">Developer Tools</option>
                <option value="Biotech">Biotech</option>
                <option value="Fintech">Fintech</option>
                <option value="HealthTech">HealthTech</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              One-Line Mission / Tagline
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Autonomous voice agents for clinic triage"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="Pre-Seed">Pre-Seed</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Funding Raised
              </label>
              <input
                type="text"
                placeholder="e.g. $150,000"
                value={fundingRaised}
                onChange={(e) => setFundingRaised(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco (Remote)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tech Stack (comma separated)
            </label>
            <input
              type="text"
              placeholder="React, TypeScript, Python, PyTorch, Gemini API"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Problem & Solution Pitch
            </label>
            <textarea
              rows={3}
              placeholder="Describe the market opportunity, customer pain points, and current traction..."
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <BrainCircuit className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Upon registering, our Gemini AI Co-Founder will automatically generate your initial 3-phase strategic roadmap, seed an open role, and initialize your continuous startup memory vault.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSynthesizing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
              {isSynthesizing ? 'Synthesizing with AI...' : 'Register Startup & Initialize AI'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
