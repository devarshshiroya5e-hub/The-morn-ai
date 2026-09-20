import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Navbar } from './components/Navbar';
import { DiscoverStartups } from './components/DiscoverStartups';
import { StartupDetailModal } from './components/StartupDetailModal';
import { FounderWorkspace } from './components/FounderWorkspace';
import { TalentWorkspace } from './components/TalentWorkspace';
import { AppointmentBookingPage } from './components/AppointmentBookingPage';
import { AiCoFounderDrawer } from './components/AiCoFounderDrawer';
import { AuthModal } from './components/AuthModal';
import { LegalModal } from './components/LegalModal';
import { StartupRegistrationModal } from './components/StartupRegistrationModal';
import { ProfilePage } from './components/ProfilePage';
import { ChatPage } from './components/ChatPage';
import { LandingPage } from './components/LandingPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';

import { 
  initialStartups, 
  mockTalentUsers, 
  mockFounderUser, 
  mockAppointments 
} from './data/mockData';
import { Startup, User, RolePost, Appointment, TaskItem } from './types';

const normalizeStartup = (raw: Partial<Startup>): Startup => {
  const safeName = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Untitled startup';
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=111827&color=fff`;

  const stage = raw.stage === 'Idea' || raw.stage === 'Pre-Seed' || raw.stage === 'Seed' || raw.stage === 'Series A'
    ? raw.stage
    : 'Idea';

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `startup-${Date.now()}`,
    name: safeName,
    tagline: typeof raw.tagline === 'string' ? raw.tagline : '',
    logo: typeof raw.logo === 'string' && raw.logo ? raw.logo : fallbackAvatar,
    coverImage: typeof raw.coverImage === 'string' ? raw.coverImage : undefined,
    industry: typeof raw.industry === 'string' ? raw.industry : 'General',
    stage,
    pitch: typeof raw.pitch === 'string' ? raw.pitch : '',
    techStack: Array.isArray(raw.techStack) ? raw.techStack.filter((value): value is string => typeof value === 'string') : [],
    website: typeof raw.website === 'string' ? raw.website : '',
    foundedYear: typeof raw.foundedYear === 'string' ? raw.foundedYear : new Date().getFullYear().toString(),
    founderId: typeof raw.founderId === 'string' ? raw.founderId : '',
    founderName: typeof raw.founderName === 'string' ? raw.founderName : 'Founder',
    founderAvatar: typeof raw.founderAvatar === 'string' && raw.founderAvatar ? raw.founderAvatar : fallbackAvatar,
    historyLogs: Array.isArray(raw.historyLogs) ? raw.historyLogs : [],
    members: Array.isArray(raw.members) ? raw.members : [],
    roadmap: Array.isArray(raw.roadmap) ? raw.roadmap : [],
    openRoles: Array.isArray(raw.openRoles) ? raw.openRoles : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    fundingRaised: typeof raw.fundingRaised === 'string' ? raw.fundingRaised : 'Bootstrapped',
    location: typeof raw.location === 'string' ? raw.location : 'Remote',
    investorReadinessScore: typeof raw.investorReadinessScore === 'number' ? raw.investorReadinessScore : 0,
    growthVelocityScore: typeof raw.growthVelocityScore === 'number' ? raw.growthVelocityScore : 0,
    verified: raw.verified === true,
  };
};

const normalizeUser = (raw: User): User => ({
  id: typeof raw.id === 'string' ? raw.id : '',
  name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Member',
  email: typeof raw.email === 'string' ? raw.email : '',
  role: raw.role === 'founder' || raw.role === 'employee' ? raw.role : 'employee',
  avatar: typeof raw.avatar === 'string' && raw.avatar
    ? raw.avatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(typeof raw.name === 'string' && raw.name ? raw.name : 'Member')}&background=5B5CF0&color=fff`,
  title: typeof raw.title === 'string' ? raw.title : 'Startup builder',
  bio: typeof raw.bio === 'string' ? raw.bio : '',
  skills: Array.isArray(raw.skills) ? raw.skills.filter((value): value is string => typeof value === 'string') : [],
  startupId: typeof raw.startupId === 'string' ? raw.startupId : undefined,
  hourlyRate: typeof raw.hourlyRate === 'string' ? raw.hourlyRate : undefined,
  equityPreference: typeof raw.equityPreference === 'string' ? raw.equityPreference : undefined,
  reputationScore: typeof raw.reputationScore === 'number' ? raw.reputationScore : undefined,
  completedMilestones: typeof raw.completedMilestones === 'number' ? raw.completedMilestones : undefined,
  onboarding: raw.onboarding && typeof raw.onboarding === 'object' ? raw.onboarding : undefined,
});

const buildFallbackUser = (firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): User => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || 'Member',
  email: firebaseUser.email || '',
  role: 'employee',
  avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'Member')}&background=5B5CF0&color=fff`,
  title: 'Startup builder',
  bio: '',
  skills: [],
});
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // State: current logged-in user (Founder vs Talent/Employee)
  const [currentUser, setCurrentUser] = useState<User>(mockFounderUser);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // State: all startups in the platform
  const [startups, setStartups] = useState<Startup[]>(initialStartups);

  // State: all appointments (syncs between founders and talent)
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setIsLoggedIn(false);
          return;
        }

        try {
          const savedProfile = await getDoc(doc(db, 'users', user.uid));
          if (savedProfile.exists()) {
            setCurrentUser(normalizeUser(savedProfile.data() as User));
            setIsLoggedIn(true);
          } else {
            // A Firebase credential is not a completed MornAI account until
            // onboarding has created its profile document.
            setCurrentUser(buildFallbackUser(user));
            setIsLoggedIn(false);
          }
        } catch (error) {
          // Firestore can briefly fail during auth restoration. Keep the
          // authenticated shell alive instead of turning the whole page white.
          console.error('Failed to restore MornAI profile:', error);
          setCurrentUser(buildFallbackUser(user));
          setIsLoggedIn(true);
        }
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoggedIn]);

  // Navigation: 'discover' (browse startups) | 'workspace' (founder/talent dashboard) | 'appointments' (direct sync list) | 'profile' (profile page)
  const [activeView, setActiveView] = useState<'discover' | 'workspace' | 'appointments' | 'booking' | 'messages' | 'profile' | 'privacy'>('discover');

  // Modals & Drawers
  const [selectedStartupForDetail, setSelectedStartupForDetail] = useState<Startup | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [bookingModalStartup, setBookingModalStartup] = useState<Startup | null>(null);
  const [bookingModalRole, setBookingModalRole] = useState<RolePost | undefined>(undefined);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Active startup for the Founder Workspace and AI Co-Founder Chat.
  // It is persisted per user so refreshes cannot silently switch a founder to a demo startup.
  const [activeStartupContext, setActiveStartupContext] = useState<Startup | null>(null);

  // Persisted startups are the source of truth for anything created inside the product.
  // Mock startups remain available for the demo network, while Firestore startups survive refreshes.
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsubscribe = onSnapshot(
      collection(db, 'startups'),
      (snapshot) => {
        const remoteStartups = snapshot.docs
          .map((startupDoc) => normalizeStartup({ ...(startupDoc.data() as Partial<Startup>), id: startupDoc.id }))
          .map((startup) => {
            if (startup.founderId !== currentUser.id || !currentUser.onboarding) return startup;

            return {
              ...startup,
              members: (startup.members || []).map((member) =>
                member.userId === currentUser.id
                  ? { ...member, profileDetails: currentUser.onboarding }
                  : member
              ),
            };
          });
        const remoteIds = new Set(remoteStartups.map((startup) => startup.id));
        const demoStartups = initialStartups.filter((startup) => !remoteIds.has(startup.id));
        setStartups([...remoteStartups, ...demoStartups]);
      },
      (error) => {
        console.error('Failed to load startups from Firestore:', error);
      },
    );

    return () => unsubscribe();
  }, [isLoggedIn]);

  // Keep the active workspace attached to the startup owned/joined by this user.
  // Prefer the user's last selected startup, then their founder startup, then a joined startup.
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveStartupContext(null);
      return;
    }

    if (!startups.length) {
      setActiveStartupContext(null);
      return;
    }

    const userId = currentUser.id;
    const isRelatedToUser = (startup: Startup) =>
      startup.founderId === userId || startup.members?.some((member) => member.userId === userId);

    const latestActive = activeStartupContext
      ? startups.find((startup) => startup.id === activeStartupContext.id)
      : null;

    if (latestActive && isRelatedToUser(latestActive)) {
      if (latestActive !== activeStartupContext) {
        setActiveStartupContext(latestActive);
      }
      return;
    }

    const savedId = typeof window !== 'undefined'
      ? window.localStorage.getItem(`mornai-active-startup:${userId}`)
      : null;

    const savedStartup = savedId
      ? startups.find((startup) => startup.id === savedId && isRelatedToUser(startup))
      : undefined;

    const preferred =
      savedStartup ||
      startups.find((startup) => startup.founderId === userId) ||
      startups.find((startup) => startup.members?.some((member) => member.userId === userId)) ||
      null;

    setActiveStartupContext(preferred);

    if (typeof window !== 'undefined') {
      if (preferred) {
        window.localStorage.setItem(`mornai-active-startup:${userId}`, preferred.id);
      } else {
        window.localStorage.removeItem(`mornai-active-startup:${userId}`);
      }
    }
  }, [isLoggedIn, startups, currentUser.id, activeStartupContext]);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open detailed startup profile
  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartupForDetail(startup);
    setIsDetailModalOpen(true);
  };

  // Open dedicated booking page
  const handleOpenBookingModal = (startup: Startup, role?: RolePost) => {
    setBookingModalStartup(startup);
    setBookingModalRole(role);
    setIsDetailModalOpen(false);
    setSelectedStartupForDetail(null);
    setActiveView('booking');
  };

  // Confirm appointment
  const handleConfirmAppointment = (newAppointment: Appointment) => {
    setAppointments(prev => [newAppointment, ...prev]);
    showToast(`Appointment request sent to ${newAppointment.founderName} for ${newAppointment.roleTitle}!`);
  };

  // Update appointment status
  const handleUpdateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status } : a));
    showToast(`Appointment marked as ${status}.`);
  };

  // Update a startup (roadmap, tasks, memory logs, roles) in local state and Firestore.
  const handleUpdateStartup = async (updatedStartup: Startup) => {
    await setDoc(doc(db, 'startups', updatedStartup.id), updatedStartup);

    // Mirror selected team members into protected member documents.
    // A founder selecting/onboarding someone therefore unlocks their private startup chat.
    await Promise.all(
      (updatedStartup.members || []).map((member) =>
        setDoc(
          doc(db, 'startups', updatedStartup.id, 'members', member.userId),
          {
            ...member,
            userId: member.userId,
            startupId: updatedStartup.id,
          },
          { merge: true },
        ),
      ),
    );

    setStartups(prev => prev.map(s => s.id === updatedStartup.id ? updatedStartup : s));
    if (activeStartupContext?.id === updatedStartup.id) {
      setActiveStartupContext(updatedStartup);
    }
    showToast(`Startup "${updatedStartup.name}" saved with AI Co-Founder memory.`);
  };

  // Register a new ongoing startup and persist it for this founder.
  const handleRegisterStartup = async (newStartup: Startup) => {
    // Save the startup first so relationship documents can safely reference it.
    await setDoc(doc(db, 'startups', newStartup.id), newStartup);

    const founderMember = newStartup.members.find((member) => member.userId === currentUser.id);
    if (founderMember) {
      await setDoc(
        doc(db, 'startups', newStartup.id, 'members', currentUser.id),
        {
          ...founderMember,
          userId: currentUser.id,
          startupId: newStartup.id,
        },
      );
    }

    // Do not overwrite the user's global role or startupId. Each startup gets its own context.
    await setDoc(
      doc(db, 'users', currentUser.id, 'startupContexts', newStartup.id),
      {
        userId: currentUser.id,
        startupId: newStartup.id,
        role: 'founder',
        joinedDate: new Date().toISOString().split('T')[0],
        startupName: newStartup.name,
      },
      { merge: true },
    );

    setStartups((prev) => [newStartup, ...prev.filter((startup) => startup.id !== newStartup.id)]);
    setActiveStartupContext(newStartup);
    window.localStorage.setItem(`mornai-active-startup:${currentUser.id}`, newStartup.id);
    setActiveView('workspace');
    showToast(`"${newStartup.name}" registered and saved to your MornAI account.`);
  };

  // Update task status from Talent workspace
  const handleUpdateTaskStatus = (startupId: string, taskId: string, status: TaskItem['status']) => {
    setStartups(prev => prev.map(s => {
      if (s.id === startupId) {
        const updatedTasks = s.tasks.map(t => t.id === taskId ? { ...t, status } : t);
        return { ...s, tasks: updatedTasks };
      }
      return s;
    }));
    showToast(`Task status updated to "${status}".`);
  };

  const authModals = (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenLegal={() => setIsLegalModalOpen(true)}
        initialMode={authMode}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          setIsAuthModalOpen(false);
          showToast('Successfully authenticated!');
        }}
      />
      
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </>
  );

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,.10)] backdrop-blur-xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white text-sm font-extrabold">M</div>
          <h1 className="mt-4 text-lg font-extrabold text-slate-950">Restoring your MornAI session</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Checking authentication and workspace context. The app will continue automatically.</p>
        </div>
      </div>
    );
  }

  if (activeView === 'privacy') {
    return (
      <PrivacyPolicyPage
        onBack={() => setActiveView(isLoggedIn ? 'discover' : 'discover')}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => { setAuthMode(mode); setIsAuthModalOpen(true); }}
          onOpenPrivacy={() => setActiveView('privacy')}
        />
        {authModals}
      </>
    );
  }

  return (
    <div className="mornai-app-shell min-h-screen text-slate-900 flex flex-col font-['Plus_Jakarta_Sans']">
      {authModals}
      
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeView === 'profile' ? 'profile' : activeView === 'messages' ? 'messages' : activeView === 'appointments' ? 'appointments' : activeView === 'workspace' ? 'workspace' : 'discover'}
        setActiveTab={(tab) => setActiveView(tab === 'profile' ? 'profile' : tab === 'messages' ? 'messages' : tab === 'appointments' ? 'appointments' : tab === 'workspace' ? 'workspace' : 'discover')}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        onOpenRegisterStartup={() => setIsRegisterModalOpen(true)}
        onOpenPricing={() => {}}
        appointmentCount={appointments.length}
        onOpenAuthModal={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
      />

      {/* Main Content View */}
      <main className="mornai-main flex-1 pb-16">
        
        {/* VIEW 1: DISCOVER ONGOING STARTUPS */}
        {activeView === 'discover' && (
          <DiscoverStartups
            startups={startups}
            currentUser={currentUser}
            onSelectStartup={handleSelectStartup}
            onBookAppointment={handleOpenBookingModal}
            onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
            onOpenWorldChat={() => setActiveView('messages')}
          />
        )}

        {/* VIEW 2: DEDICATED BOOKING PAGE */}
        {activeView === 'booking' && (
          <AppointmentBookingPage
            startup={bookingModalStartup}
            selectedRole={bookingModalRole}
            currentUser={currentUser}
            onConfirmAppointment={handleConfirmAppointment}
            onCancel={() => setActiveView('discover')}
            onDone={() => setActiveView('appointments')}
          />
        )}

        {/* VIEW 3: WORKSPACE (Founder vs Talent) */}
        {activeView === 'workspace' && (
          currentUser.role === 'founder' ? (
            activeStartupContext ? (
              <FounderWorkspace
                startup={activeStartupContext}
                currentUser={currentUser}
                allTalents={mockTalentUsers}
                appointments={appointments}
                onUpdateStartup={handleUpdateStartup}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
              />
            ) : (
              <div className="mx-auto max-w-3xl p-10 text-center text-sm text-slate-500">Loading your startup workspace…</div>
            )
          ) : (
            <TalentWorkspace
              currentUser={currentUser}
              startups={startups}
              appointments={appointments}
              onBookAppointment={handleOpenBookingModal}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
            />
          )
        )}

        {/* VIEW 4: DIRECT APPOINTMENTS VIEW */}
        {activeView === 'appointments' && (
          currentUser.role === 'founder' ? (
            activeStartupContext ? (
              <FounderWorkspace
                startup={activeStartupContext}
                currentUser={currentUser}
                allTalents={mockTalentUsers}
                appointments={appointments}
                onUpdateStartup={handleUpdateStartup}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
              />
            ) : (
              <div className="mx-auto max-w-3xl p-10 text-center text-sm text-slate-500">Loading your startup workspace…</div>
            )
          ) : (
            <TalentWorkspace
              currentUser={currentUser}
              startups={startups}
              appointments={appointments}
              onBookAppointment={handleOpenBookingModal}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
            />
          )
        )}

        {/* VIEW 5: MESSAGES / WORLD CHAT */}
        {activeView === 'messages' && (
          <ChatPage
            currentUser={currentUser}
            startups={startups}
          />
        )}

        {/* VIEW 6: PROFILE PAGE */}
        {activeView === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onUpdateUser={setCurrentUser}
            onLogout={async () => {
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
              setSelectedStartupForDetail(null);
              setIsDetailModalOpen(false);
              setIsAiDrawerOpen(false);
              setIsRegisterModalOpen(false);
              setActiveStartupContext(null);
              await signOut(auth);
              setActiveView('discover');
            }}
          />
        )}

      </main>

      {/* MODALS */}

      {/* Startup Details Modal */}
      <StartupDetailModal
        startup={selectedStartupForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        currentUser={currentUser}
        onBookAppointment={handleOpenBookingModal}
        onConsultAi={(startup) => {
          setActiveStartupContext(startup);
          window.localStorage.setItem(`mornai-active-startup:${currentUser.id}`, startup.id);
          setIsDetailModalOpen(false);
          setIsAiDrawerOpen(true);
        }}
      />

      {/* AI Co-Founder & Strategist Slide-out Drawer */}
      {activeStartupContext && (
        <AiCoFounderDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          activeStartup={activeStartupContext}
          currentUser={currentUser}
          allStartups={startups}
          onSelectStartup={(s) => {
            setActiveStartupContext(s);
            window.localStorage.setItem(`mornai-active-startup:${currentUser.id}`, s.id);
          }}
        />
      )}

      {/* Register Ongoing Startup Modal */}
      <StartupRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        currentUser={currentUser}
        onRegisterStartup={handleRegisterStartup}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 font-['Outfit']">MornAI</span>
            <span>• AI Startup Operating Platform</span>
          </div>
          <div className="text-slate-400">
            AI Co-Founder • Startup Memory • Roadmaps • Talent • Execution
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('privacy')}
              className="text-slate-500 hover:text-indigo-400 text-xs underline"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => setIsLegalModalOpen(true)}
              className="text-slate-500 hover:text-indigo-400 text-xs underline"
            >
              Legal Information
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
