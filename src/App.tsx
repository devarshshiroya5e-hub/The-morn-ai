import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
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
  mockFounderUser
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
    memberIds: Array.isArray(raw.memberIds)
      ? raw.memberIds.filter((value): value is string => typeof value === 'string')
      : undefined,
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
  const [autoRestoredSession, setAutoRestoredSession] = useState(false);
  const [sessionRestoreComplete, setSessionRestoreComplete] = useState(false);

  // State: all startups in the platform
  const [startups, setStartups] = useState<Startup[]>(initialStartups);

  // State: all appointments (syncs between founders and talent)
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          if (!cancelled) {
            setIsLoggedIn(false);
            setAutoRestoredSession(false);
            setSessionRestoreComplete(true);
          }
          return;
        }

        try {
          const savedProfile = await getDoc(doc(db, 'users', user.uid));

          if (cancelled) return;

          if (savedProfile.exists()) {
            setCurrentUser(normalizeUser(savedProfile.data() as User));
            setIsLoggedIn(true);
            setAutoRestoredSession(true);
            setSessionRestoreComplete(false);

            // Keep the public landing page visible for 1 second so a
            // returning user sees the platform before entering automatically.
            window.setTimeout(() => {
              if (!cancelled) {
                setIsAuthModalOpen(false);
                setSessionRestoreComplete(true);
              }
            }, 1000);
          } else {
            // A Firebase credential is not a completed MornAI account until
            // onboarding has created its profile document.
            setCurrentUser(buildFallbackUser(user));
            setIsLoggedIn(false);
            setAutoRestoredSession(false);
            setSessionRestoreComplete(true);
          }
        } catch (error) {
          if (cancelled) return;

          // Firebase can briefly restore auth before Firestore responds.
          // Keep the authenticated shell available, but still use the same
          // returning-user landing delay.
          console.error('Failed to restore MornAI profile:', error);
          setCurrentUser(buildFallbackUser(user));
          setIsLoggedIn(true);
          setAutoRestoredSession(true);
          setSessionRestoreComplete(false);

          window.setTimeout(() => {
            if (!cancelled) {
              setIsAuthModalOpen(false);
              setSessionRestoreComplete(true);
            }
          }, 1000);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
  // Authentication is always the first visible page. Existing Firebase sessions
  // are restored in the background and the auth page closes after a short delay.
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
            startup.persisted = true;
            const activeMemberIds = Array.from(new Set([
              startup.founderId,
              ...(startup.members || [])
                .filter((member) => member.status === 'active')
                .map((member) => member.userId),
            ].filter(Boolean)));

            // Backfill a compact membership index so chat authorization does not
            // depend on a nested member document existing on an older startup.
            if (
              startup.founderId === currentUser.id &&
              JSON.stringify(startup.memberIds || []) !== JSON.stringify(activeMemberIds)
            ) {
              void setDoc(
                doc(db, 'startups', startup.id),
                { memberIds: activeMemberIds },
                { merge: true },
              ).catch((error) => {
                console.error('Failed to sync startup membership index:', error);
              });
            }

            if (startup.founderId !== currentUser.id || !currentUser.onboarding) return {
              ...startup,
              memberIds: activeMemberIds,
            };

            return {
              ...startup,
              memberIds: activeMemberIds,
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

  // Appointments are persisted centrally and scoped by participant ID.
  // This keeps founder and talent dashboards in sync across refreshes/devices.
  useEffect(() => {
    if (!isLoggedIn) {
      setAppointments([]);
      return;
    }

    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('participants', 'array-contains', currentUser.id),
    );

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const remoteAppointments = snapshot.docs
          .map((appointmentDoc) => ({
            ...(appointmentDoc.data() as Appointment),
            id: appointmentDoc.id,
          }))
          .sort((a, b) => {
            const first = a.date + ' ' + a.time;
            const second = b.date + ' ' + b.time;
            return second.localeCompare(first);
          });

        setAppointments(remoteAppointments);
      },
      (error) => {
        console.error('Failed to load appointments from Firestore:', error);
        setAppointments([]);
      },
    );

    return () => unsubscribe();
  }, [isLoggedIn, currentUser.id]);
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

  // Confirm appointment and persist the full request in Firestore.
  const handleConfirmAppointment = async (newAppointment: Appointment) => {
    const participants = Array.from(new Set([newAppointment.founderId, newAppointment.talentId]));

    await setDoc(doc(db, 'appointments', newAppointment.id), {
      ...newAppointment,
      participants,
      createdBy: currentUser.id,
      createdAt: serverTimestamp(),
    });

    showToast(`Appointment request sent to ${newAppointment.founderName} for ${newAppointment.roleTitle}!`);
  };

  // Appointment status changes are persisted and then reflected by the real-time listener.
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    await updateDoc(doc(db, 'appointments', appointmentId), { status });
    showToast(`Appointment marked as ${status}.`);
  };

  // Update a startup (roadmap, tasks, memory logs, roles) in local state and Firestore.
  const handleUpdateStartup = async (updatedStartup: Startup) => {
    const memberIds = Array.from(new Set([
      updatedStartup.founderId,
      ...(updatedStartup.members || [])
        .filter((member) => member.status === 'active')
        .map((member) => member.userId),
    ].filter(Boolean)));

    await setDoc(doc(db, 'startups', updatedStartup.id), {
      ...updatedStartup,
      memberIds,
    });

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
    const memberIds = Array.from(new Set([
      newStartup.founderId,
      ...(newStartup.members || [])
        .filter((member) => member.status === 'active')
        .map((member) => member.userId),
    ].filter(Boolean)));

    await setDoc(doc(db, 'startups', newStartup.id), {
      ...newStartup,
      memberIds,
    });

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
          setAutoRestoredSession(false);
          setSessionRestoreComplete(true);
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

  // Firebase restores an existing session in the background.
  // New visitors see the public platform page. Existing authenticated sessions
  // automatically enter the app after a short session-restore delay.
  const showPublicLanding =
    !isLoggedIn || (autoRestoredSession && !sessionRestoreComplete);

  if (!authReady || showPublicLanding) {
    return (
      <motion.div
        key="mornai-public-entry"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setIsAuthModalOpen(true);
          }}
          onOpenPrivacy={() => setActiveView('privacy')}
        />
        {authModals}
      </motion.div>
    );
  }

  if (activeView === 'privacy') {
    return (
      <PrivacyPolicyPage
        onBack={() => setActiveView(isLoggedIn ? 'discover' : 'discover')}
      />
    );
  }

  return (
    <motion.div
      key="mornai-authenticated-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="min-h-screen"
    >
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10, scale: 0.998 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.998 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full"
          >

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
              setAutoRestoredSession(false);
              setSessionRestoreComplete(true);
              setIsAuthModalOpen(false);
              setAuthMode('login');
                  setActiveView('discover');
            }}
          />
        )}

          </motion.div>
        </AnimatePresence>
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
    </motion.div>
  );
}
