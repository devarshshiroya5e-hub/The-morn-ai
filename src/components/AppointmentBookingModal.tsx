import React, { useState, useEffect } from 'react';
import { postMornAI } from '../lib/mornaiAi';
import { Startup, User, RolePost, Appointment, MatchingAnalysis } from '../types';
import { 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  BrainCircuit, 
  Send, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Video
} from 'lucide-react';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  startup: Startup | null;
  selectedRole?: RolePost;
  currentUser: User;
  onConfirmAppointment: (appointment: Appointment) => Promise<void>;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  startup,
  selectedRole,
  currentUser,
  onConfirmAppointment,
}) => {
  const [roleTitle, setRoleTitle] = useState(selectedRole?.title || 'Core Skill Contributor');
  const [date, setDate] = useState('2026-03-18');
  const [time, setTime] = useState('14:00 PST (30 min)');
  const [pitchMessage, setPitchMessage] = useState('');
  const [matchAnalysis, setMatchAnalysis] = useState<MatchingAnalysis | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRole) {
      setRoleTitle(selectedRole.title);
    } else if (startup?.openRoles?.[0]) {
      setRoleTitle(startup.openRoles[0].title);
    }
  }, [selectedRole, startup]);

  // Load AI Matching Analysis when modal opens
  useEffect(() => {
    if (!isOpen || !startup) return;

    const analyzeMatch = async () => {
      setIsLoadingMatch(true);
      try {
        const data = await postMornAI<any>('match-analysis', {
            startup,
            candidate: currentUser,
          });
        setMatchAnalysis(data);
      } catch (err) {
        console.error('Match error:', err);
      } finally {
        setIsLoadingMatch(false);
      }
    };

    analyzeMatch();
  }, [isOpen, startup, currentUser]);

  if (!isOpen || !startup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      startupId: startup.id,
      startupName: startup.name,
      founderId: startup.founderId,
      founderName: startup.founderName,
      talentId: currentUser.id,
      talentName: currentUser.name,
      talentAvatar: currentUser.avatar,
      talentSkills: currentUser.skills,
      roleTitle,
      date,
      time,
      status: 'pending',
      meetingLink: `https://meet.mornai.ai/room/${startup.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      pitchMessage: pitchMessage.trim() || `Excited to join ${startup.name} and contribute to your current sprint roadmap!`,
      aiMatchScore: matchAnalysis?.matchScore || 92,
      aiPreparationBrief: matchAnalysis?.synergyAnalysis || 'High technical synergy in core engineering stack.',
      createdDate: new Date().toISOString().split('T')[0],
    };

    try {
      await onConfirmAppointment(newAppointment);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Appointment save error:', error);
      setSubmitError(error?.message || 'Unable to save the appointment request. Please try again.');
    }
  };

  const timeSlots = [
    '10:00 PST (30 min)',
    '11:30 PST (30 min)',
    '14:00 PST (30 min)',
    '16:30 PST (30 min)',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 backdrop-blur-sm p-3 sm:p-6">
      <div className="relative mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[calc(100dvh-3rem)]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 relative">
          <div className="flex items-center gap-3">
            <img
              src={startup.logo}
              alt={startup.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-white/20 shadow-sm"
            />
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">
                1-on-1 Founder Appointment
              </span>
              <h3 className="text-xl font-bold font-['Outfit']">
                Book Sync to Join {startup.name}
              </h3>
              <p className="text-xs text-indigo-200">
                Meeting with Founder {startup.founderName} ({startup.stage} Stage)
              </p>
            </div>
          </div>
        </div>

        {/* AI Match Overview Box */}
        <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-950 block">
                  AI Automated Fit & Compatibility Analysis
                </span>
                <p className="text-xs text-indigo-800/90 mt-0.5 leading-relaxed">
                  {isLoadingMatch
                    ? 'Gemini AI is analyzing your verified skills against the startup roadmap...'
                    : matchAnalysis?.synergyAnalysis || `Your background directly aligns with ${startup.name}'s active sprint goals.`}
                </p>
              </div>
            </div>

            {matchAnalysis && (
              <div className="text-right flex-shrink-0 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fit Score</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {matchAnalysis.matchScore}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Appointment Scheduled!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Founder {startup.founderName} has received your pitch and AI compatibility brief. You can join the video room at the scheduled time from your dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {submitError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-700">{submitError}</div>}
            
            {/* Target Role Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Role / Contribution
              </label>
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                {startup.openRoles?.map((role) => (
                  <option key={role.id} value={role.title}>
                    {role.title} ({role.type})
                  </option>
                ))}
                <option value="General Technical Co-Founder / Contributor">
                  General Technical Contributor / Fellow
                </option>
              </select>
            </div>

            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Time Slot (PST)
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate Pitch / Introduction */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Your Pitch to the Founder
              </label>
              <textarea
                rows={3}
                required
                placeholder={`Hi ${startup.founderName}, I saw your ${roleTitle} role. I have experience with ${currentUser.skills.slice(0, 3).join(', ')} and can start delivering in your upcoming sprint...`}
                value={pitchMessage}
                onChange={(e) => setPitchMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                The AI will summarize your pitch into the founder's interview brief.
              </span>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Video className="w-3.5 h-3.5 text-indigo-600" />
                <span>Integrated Video Sync Link provided automatically</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-appointment-btn"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm & Send Request
                </button>
              </div>
            </div>

          </form>
        )}

        </div>
      </div>
    </div>
  );
};
