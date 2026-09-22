import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, limit, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Navbar } from './components/Navbar';
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
import { HomeDashboard } from './components/HomeDashboard';
import { MarketplacePage } from './components/MarketplacePage';
import { NotificationCenter } from './components/NotificationCenter';
import { PricingModal } from './components/PricingModal';
import { PullToRefresh } from './components/PullToRefresh';
import { buildMornaiNotifications, MornaiPreferences, nextDailyState, normalizePreferences } from './components/mornaiSignals';

import { 
  initialStartups, 
  mockTalentUsers, 
  mockFounderUser
} from './data/mockData';
import { ConnectionRequest, Startup, User, RolePost, Appointment, TaskItem } from './types';

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

const buildStartupListing = (startup: Startup) => ({
  id: startup.id,
  name: startup.name,
  tagline: startup.tagline,
  logo: startup.logo,
  coverImage: startup.coverImage || null,
  industry: startup.industry,
  stage: startup.stage,
  pitch: startup.pitch,
  techStack: startup.techStack,
  website: startup.website,
  foundedYear: startup.foundedYear,
  founderId: startup.founderId,
  founderName: startup.founderName,
  founderAvatar: startup.founderAvatar,
  fundingRaised: startup.fundingRaised,
  location: startup.location,
  investorReadinessScore: startup.investorReadinessScore,
  growthVelocityScore: startup.growthVelocityScore,
  verified: startup.verified,
  openRoles: startup.openRoles.map((role) => ({
    ...role,
    responsibilities: role.responsibilities?.slice(0, 5) || [],
    skills: role.skills?.slice(0, 12) || [],
  })),
  updatedAt: serverTimestamp(),
});

const stripUndefinedPreferenceFields = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;

const normalizeUser = (raw: User, fallbackId = ''): User => ({
  id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
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
  const [talentUsers, setTalentUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [preferences, setPreferences] = useState<MornaiPreferences>({});
  const [previousVisitAt, setPreviousVisitAt] = useState<number | undefined>(undefined);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

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
            setCurrentUser(normalizeUser(savedProfile.data() as User, user.uid));
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

  // Navigation: 'home' | 'network' | 'workspace' | 'appointments' | 'booking' | 'messages' | 'profile' | 'privacy'
  const [activeView, setActiveView] = useState<'home' | 'network' | 'workspace' | 'appointments' | 'booking' | 'messages' | 'profile' | 'privacy'>('home');

  // Keep browser scroll restoration from reusing the previous document position.
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // New visitors and the one-second returning-user landing screen always start at the top.
  useLayoutEffect(() => {
    if (isLoggedIn) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [isLoggedIn]);

  // When the one-second landing screen gives way to the authenticated app,
  // reset before the new page paints so a scroll performed during the delay
  // cannot leak into the main website.
  useLayoutEffect(() => {
    if (isLoggedIn && sessionRestoreComplete) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [isLoggedIn, sessionRestoreComplete]);

  // Internal navigation preserves the user's current document position.
  // Navigation: 'discover' (browse startups) | 'workspace' (founder/talent dashboard) | 'appointments' (direct sync list) | 'profile' (profile page)


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

  // Never leave an invisible AI drawer state behind while the startup context is unavailable.
  useEffect(() => {
    if (currentUser.role === 'founder' && !activeStartupContext && isAiDrawerOpen) {
      setIsAiDrawerOpen(false);
    }
  }, [activeStartupContext, currentUser.role, isAiDrawerOpen]);

  // Personal retention preferences live in the existing user preference path.
  // This keeps saved people/startups, notification state, and the last visit consistent across devices.
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id) {
      setPreferences({});
      return;
    }

    let cancelled = false;
    const loadPreferences = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'users', currentUser.id, 'preferences', 'mornai'));
        if (cancelled) return;
        const normalized = snapshot.exists() ? normalizePreferences(snapshot.data()) : {};
        setPreferences(normalized);
        setPreviousVisitAt(normalized.lastVisitedAt);
      } catch (error) {
        console.error('Failed to load MornAI preferences:', error);
        if (!cancelled) setPreferences({});
      }
    };

    void loadPreferences();
    return () => { cancelled = true; };
  }, [isLoggedIn, currentUser.id]);

  const persistPreferences = (patch: Partial<MornaiPreferences>) => {
    if (!isLoggedIn || !currentUser.id) {
      return;
    }

    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      const persisted = stripUndefinedPreferenceFields(next);
      void setDoc(doc(db, 'users', currentUser.id, 'preferences', 'mornai'), persisted, { merge: true }).catch((error) => {
        console.error('Failed to persist MornAI preference:', error);
      });
      return next;
    });
  };

  // Record a completed app visit after the current session has had a moment to render.
  // The previous timestamp remains available during the first render so Home can explain what changed.
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id) return;
    const timer = window.setTimeout(() => {
      setPreferences((previous) => {
        const next = { ...nextDailyState(previous), lastVisitedAt: Date.now() };
        const persisted = stripUndefinedPreferenceFields(next);
        void setDoc(
          doc(db, 'users', currentUser.id, 'preferences', 'mornai'),
          persisted,
          { merge: true },
        ).catch((error) => console.error('Failed to persist daily activity:', error));
        return next;
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, currentUser.id]);

  const completeDailyAction = () => {
    if (!isLoggedIn || !currentUser.id) {
      return;
    }

    setPreferences((previous) => {
      const next = { ...previous, dailyActionsCompleted: Math.min(3, (previous.dailyActionsCompleted || 0) + 1) };
      const persisted = stripUndefinedPreferenceFields(next);
      void setDoc(doc(db, 'users', currentUser.id, 'preferences', 'mornai'), persisted, { merge: true }).catch((error) => console.error('Failed to persist daily action:', error));
      return next;
    });
  };

  const togglePreferenceId = (field: 'savedTalentIds' | 'savedStartupIds' | 'followedStartupIds', id: string) => {
    const current = preferences[field] || [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    persistPreferences({ [field]: next });
  };

  const toggleSavedTalent = (id: string) => togglePreferenceId('savedTalentIds', id);
  const toggleSavedStartup = (id: string) => togglePreferenceId('savedStartupIds', id);
  const toggleFollowedStartup = (id: string) => togglePreferenceId('followedStartupIds', id);

  const notificationItems = buildMornaiNotifications(currentUser, startups, appointments, connections, preferences.followedStartupIds || []);
  const unreadNotificationCount = notificationItems.filter((item) => !(preferences.readNotificationIds || []).includes(item.id)).length;

  const markNotificationRead = (id: string) => {
    const current = preferences.readNotificationIds || [];
    if (current.includes(id)) return;
    persistPreferences({ readNotificationIds: [...current, id] });
  };

  const markAllNotificationsRead = () => {
    persistPreferences({ readNotificationIds: notificationItems.map((item) => item.id) });
  };

  // Mirror only safe public-profile fields so the network can discover real contributors.
  // Sensitive account data remains private in /users/{uid}.
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id) {
      setTalentUsers(mockTalentUsers);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'publicProfiles'), limit(100)),
      (snapshot) => {
        const remote = snapshot.docs
          .map((profileDoc) => normalizeUser({ ...(profileDoc.data() as User), id: profileDoc.id }))
          .filter((profile) => profile.id !== currentUser.id)
          .filter((profile) => currentUser.role === 'founder' ? profile.role === 'employee' : profile.role === 'founder');

        const demoProfiles = mockTalentUsers
          .filter((profile) => profile.id !== currentUser.id)
          .filter((profile) => currentUser.role === 'founder' ? profile.role === 'employee' : profile.role === 'founder');

        const profilesById = new Map<string, User>();
        [...demoProfiles, ...remote].forEach((profile) => profilesById.set(profile.id, profile));
        setTalentUsers(Array.from(profilesById.values()));
      },
      (error) => {
        console.error('Failed to load public network profiles:', error);
        setTalentUsers([]);
      },
    );

    return () => unsubscribe();
  }, [isLoggedIn, currentUser.id]);

  // Keep the signed-in member discoverable without exposing their private profile document.
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id) return;
    const publicProfile = {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      title: currentUser.title,
      bio: currentUser.bio,
      skills: currentUser.skills,
      hourlyRate: currentUser.hourlyRate || null,
      equityPreference: currentUser.equityPreference || null,
      reputationScore: currentUser.reputationScore || null,
      completedMilestones: currentUser.completedMilestones || 0,
      onboarding: currentUser.onboarding || null,
      updatedAt: serverTimestamp(),
    };

    void setDoc(doc(db, 'publicProfiles', currentUser.id), publicProfile, { merge: true }).catch((error) => {
      console.error('Failed to sync public network profile:', error);
    });
  }, [
    isLoggedIn,
    currentUser.id,
    currentUser.name,
    currentUser.role,
    currentUser.avatar,
    currentUser.title,
    currentUser.bio,
    currentUser.skills,
    currentUser.hourlyRate,
    currentUser.equityPreference,
    currentUser.reputationScore,
    currentUser.completedMilestones,
    currentUser.onboarding,
  ]);

  // Network connection requests are centralized so both sides can see the relationship in real time.
  useEffect(() => {
    if (!isLoggedIn) {
      setConnections([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'connections'),
        where('participants', 'array-contains', currentUser.id),
      ),
      (snapshot) => {
        const nextConnections = snapshot.docs
          .map((connectionDoc) => ({
            ...(connectionDoc.data() as ConnectionRequest),
            id: connectionDoc.id,
          }))
          .sort((a, b) => b.createdAtClient - a.createdAtClient);

        setConnections(nextConnections);
      },
      (error) => console.error('Failed to load network connections:', error),
    );

    return () => unsubscribe();
  }, [isLoggedIn, currentUser.id]);

  // Public discovery reads only startup listing documents. Private startup records stay
  // behind founder/member rules and are loaded only for the active workspace context.
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'startupListings'), limit(100)),
      (snapshot) => {
        const remoteStartups = snapshot.docs
          .map((startupDoc) => ({
            ...normalizeStartup({ ...(startupDoc.data() as Partial<Startup>), id: startupDoc.id }),
            persisted: true,
          }));
        const remoteIds = new Set(remoteStartups.map((startup) => startup.id));
        const demoStartups = initialStartups.filter((startup) => !remoteIds.has(startup.id));
        setStartups([...remoteStartups, ...demoStartups]);
      },
      (error) => {
        console.error('Failed to load startup listings from Firestore:', error);
      },
    );

    return () => unsubscribe();
  }, [isLoggedIn]);

  // Appointments are persisted centrally and scoped by the participants list.
  // Using the participants index keeps this listener compatible with existing deployed
  // Firebase rules while the repository rules also support explicit founder/talent IDs.
  useEffect(() => {
    if (!isLoggedIn) {
      setAppointments([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'appointments'),
        where('participants', 'array-contains', currentUser.id),
      ),
      (snapshot) => {
        const nextAppointments = snapshot.docs
          .map((appointmentDoc) => ({
            ...(appointmentDoc.data() as Appointment),
            id: appointmentDoc.id,
          }))
          .sort((a, b) => {
            const first = a.date + ' ' + a.time;
            const second = b.date + ' ' + b.time;
            return second.localeCompare(first);
          });

        setAppointments(nextAppointments);
      },
      (error) => console.error('Failed to load appointments from Firestore:', error),
    );

    return () => unsubscribe();
  }, [isLoggedIn, currentUser.id]);

  // Load one private startup record only when the current user is entitled to it.
  // Discovery never hydrates private tasks, history, or member records.
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id) {
      setActiveStartupContext(null);
      return;
    }

    let cancelled = false;

    const loadActiveStartup = async () => {
      try {
        const savedId = typeof window !== 'undefined'
          ? window.localStorage.getItem(`mornai-active-startup:${currentUser.id}`)
          : null;

        let preferredId = savedId || '';

        if (!preferredId && currentUser.role === 'founder') {
          preferredId = startups.find((startup) => startup.founderId === currentUser.id)?.id || '';
        }

        if (!preferredId) {
          const contextSnapshot = await getDocs(collection(db, 'users', currentUser.id, 'startupContexts'));
          const validContexts = contextSnapshot.docs
            .map((contextDoc) => ({ ...(contextDoc.data() as { startupId?: string; role?: string }) }))
            .filter((context) => context.role === currentUser.role && typeof context.startupId === 'string');
          preferredId = validContexts[0]?.startupId || '';
        }

        if (!preferredId) {
          if (!cancelled) setActiveStartupContext(null);
          return;
        }

        const privateStartup = await getDoc(doc(db, 'startups', preferredId));
        if (!privateStartup.exists()) {
          if (!cancelled) setActiveStartupContext(null);
          return;
        }

        const startup = {
          ...normalizeStartup({ ...(privateStartup.data() as Partial<Startup>), id: privateStartup.id }),
          persisted: true,
        };

        if (!cancelled) {
          setActiveStartupContext(startup);
          window.localStorage.setItem(`mornai-active-startup:${currentUser.id}`, startup.id);

          if (currentUser.role === 'founder') {
            void setDoc(
              doc(db, 'startupListings', startup.id),
              buildStartupListing(startup),
              { merge: true },
            ).catch((error) => console.error('Failed to sync startup listing:', error));
          }
        }
      } catch (error) {
        console.error('Failed to load private startup context:', error);
        if (!cancelled) setActiveStartupContext(null);
      }
    };

    void loadActiveStartup();
    return () => { cancelled = true; };
  }, [isLoggedIn, currentUser.id, currentUser.role, startups.length]);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // AI Co-Founder always needs a real startup context. Never open a hidden/empty
  // drawer when that context is still loading or unavailable.
  const handleOpenAiDrawer = () => {
    if (currentUser.role === 'employee') {
      setIsAiDrawerOpen(true);
      return;
    }

    if (!activeStartupContext) {
      showToast('Create or select a startup before opening AI Co-Founder.');
      setIsAiDrawerOpen(false);
      return;
    }

    setIsAiDrawerOpen(true);
  };

  // Open detailed startup profile
  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartupForDetail(startup);
    setIsDetailModalOpen(true);
  };

  // Open dedicated booking page
  const handleOpenBookingModal = (startup: Startup, role?: RolePost) => {
    if (!startup.persisted) {
      showToast('This startup is only a preview. Sync requests are available after the startup is published.');
      return;
    }

    setBookingModalStartup(startup);
    setBookingModalRole(role);
    setIsDetailModalOpen(false);
    setSelectedStartupForDetail(null);
    setActiveView('booking');
  };

  // Create a two-sided network connection request.
  const handleSendConnection = async (targetUser: User) => {
    if (!targetUser.id || targetUser.id === currentUser.id) return;

    const existing = connections.find((connection) =>
      (connection.fromUserId === currentUser.id && connection.toUserId === targetUser.id) ||
      (connection.toUserId === currentUser.id && connection.fromUserId === targetUser.id)
    );

    if (existing && ['pending', 'accepted'].includes(existing.status)) {
      showToast(existing.status === 'accepted'
        ? `You're already connected with ${targetUser.name}.`
        : `Connection request already sent to ${targetUser.name}.`);
      return;
    }

    const startup = currentUser.role === 'founder'
      ? startups.find((candidate) => candidate.founderId === currentUser.id)
      : undefined;
    const id = `connection-${crypto.randomUUID()}`;

    try {
      await setDoc(doc(db, 'connections', id), {
        id,
        fromUserId: currentUser.id,
        fromName: currentUser.name,
        fromAvatar: currentUser.avatar,
        toUserId: targetUser.id,
        toName: targetUser.name,
        toAvatar: targetUser.avatar,
        participants: [currentUser.id, targetUser.id],
        startupId: startup?.id || null,
        startupName: startup?.name || null,
        status: 'pending',
        createdAtClient: Date.now(),
        createdAt: serverTimestamp(),
      });

      showToast(`Connection request sent to ${targetUser.name}.`);
    } catch (error) {
      console.error('Failed to send connection request:', error);
      showToast('Connection request could not be sent.');
    }
  };

  const handleUpdateConnectionStatus = async (connectionId: string, status: ConnectionRequest['status']) => {
    try {
      await updateDoc(doc(db, 'connections', connectionId), { status, updatedAtClient: Date.now(), updatedAt: serverTimestamp() });
      showToast(status === 'accepted' ? 'Connection accepted.' : 'Connection request updated.');
    } catch (error) {
      console.error('Failed to update connection request:', error);
      showToast('Could not update the connection.');
    }
  };

  // Confirm appointment and persist the full request in Firestore.
  const handleConfirmAppointment = async (newAppointment: Appointment) => {
    if (!currentUser.id || !newAppointment.founderId || !newAppointment.talentId) {
      throw new Error('Your account session is still loading. Please try the request again.');
    }

    if (currentUser.id === newAppointment.founderId) {
      throw new Error('A founder cannot book a conversation with their own startup from the contributor flow.');
    }

    if (newAppointment.talentId !== currentUser.id) {
      throw new Error('The appointment must belong to the signed-in contributor.');
    }

    const participants = Array.from(new Set([newAppointment.founderId, newAppointment.talentId]));
    if (participants.length !== 2) {
      throw new Error('The founder and contributor must be two different accounts.');
    }

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
    await setDoc(
      doc(db, 'startupListings', updatedStartup.id),
      buildStartupListing({ ...updatedStartup, memberIds }),
      { merge: true },
    );

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
    await setDoc(
      doc(db, 'startupListings', newStartup.id),
      buildStartupListing({ ...newStartup, memberIds }),
    );

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
        <PullToRefresh />
        {authModals}
      </motion.div>
    );
  }

  if (activeView === 'privacy') {
    return (
      <PrivacyPolicyPage
        onBack={() => setActiveView(isLoggedIn ? 'home' : 'home')}
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
      <PullToRefresh />
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
        activeTab={
          activeView === 'profile' ? 'profile' :
          activeView === 'messages' ? 'messages' :
          activeView === 'appointments' ? 'appointments' :
          activeView === 'workspace' ? 'workspace' :
          activeView === 'network' ? 'network' :
          'home'
        }
        setActiveTab={(tab) => {
          if (tab === 'profile') setActiveView('profile');
          else if (tab === 'messages') setActiveView('messages');
          else if (tab === 'appointments') setActiveView('appointments');
          else if (tab === 'workspace') setActiveView('workspace');
          else if (tab === 'network') setActiveView('network');
          else setActiveView('home');
        }}
        onOpenAiDrawer={handleOpenAiDrawer}
        onOpenRegisterStartup={() => setIsRegisterModalOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        notificationCount={unreadNotificationCount}
        appointmentCount={appointments.length}
        onOpenAuthModal={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
      />

      {/* Main Content View */}
      <main className="mornai-main flex-1 pb-16">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 8, scale: 0.997, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mornai-page-transition min-h-full"
        >

        {/* VIEW 1: DAILY HOME / RETENTION HUB */}
        {activeView === 'home' && (
          <HomeDashboard
            currentUser={currentUser}
            startups={startups}
            appointments={appointments}
            allTalents={talentUsers}
            previousVisitAt={previousVisitAt}
            unreadNotificationCount={unreadNotificationCount}
            connections={connections}
            followedStartupIds={preferences.followedStartupIds || []}
            dailyStreak={preferences.dailyStreak || 0}
            dailyActionsCompleted={preferences.dailyActionsCompleted || 0}
            onOpenNetwork={(tab) => {
              completeDailyAction();
              setActiveView('network');
              if (tab) window.sessionStorage.setItem('mornai-network-tab', tab);
            }}
            onOpenWorkspace={() => { completeDailyAction(); setActiveView('workspace'); }}
            onOpenMessages={() => { completeDailyAction(); setActiveView('messages'); }}
            onOpenNotifications={() => setIsNotificationCenterOpen(true)}
            onOpenAiDrawer={() => { completeDailyAction(); handleOpenAiDrawer(); }}
            onOpenPricing={() => setIsPricingOpen(true)}
            onSelectStartup={handleSelectStartup}
            onBookAppointment={handleOpenBookingModal}
          />
        )}

        {/* VIEW 2: TWO-SIDED STARTUP NETWORK */}
        {activeView === 'network' && (
          <MarketplacePage
            currentUser={currentUser}
            startups={startups}
            allTalents={talentUsers}
            savedTalentIds={preferences.savedTalentIds || []}
            savedStartupIds={preferences.savedStartupIds || []}
            followedStartupIds={preferences.followedStartupIds || []}
            onToggleSavedTalent={toggleSavedTalent}
            onToggleSavedStartup={toggleSavedStartup}
            onToggleFollowStartup={toggleFollowedStartup}
            connections={connections}
            onSendConnection={handleSendConnection}
            onUpdateConnectionStatus={handleUpdateConnectionStatus}
            onSelectStartup={handleSelectStartup}
            onBookAppointment={handleOpenBookingModal}
            initialTab={
              (window.sessionStorage.getItem('mornai-network-tab') as 'people' | 'startups' | 'opportunities' | 'connections' | null) ||
              undefined
            }
          />
        )}

        {/* VIEW 2: DEDICATED BOOKING PAGE */}
        {activeView === 'booking' && (
          <AppointmentBookingPage
            startup={bookingModalStartup}
            selectedRole={bookingModalRole}
            currentUser={currentUser}
            onConfirmAppointment={handleConfirmAppointment}
            onCancel={() => setActiveView('network')}
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
                allTalents={talentUsers}
                appointments={appointments}
                onUpdateStartup={handleUpdateStartup}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onOpenAiDrawer={handleOpenAiDrawer}
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
              onOpenAiDrawer={handleOpenAiDrawer}
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
                onOpenAiDrawer={handleOpenAiDrawer}
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
              onOpenAiDrawer={handleOpenAiDrawer}
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
                  setActiveView('home');
            }}
          />
        )}

        </motion.div>
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
      {isAiDrawerOpen && (
        <AiCoFounderDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          activeStartup={activeStartupContext || startups[0]}
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

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        currentUser={currentUser}
        startups={startups}
        appointments={appointments}
        connections={connections}
        followedStartupIds={preferences.followedStartupIds || []}
        readNotificationIds={preferences.readNotificationIds || []}
        onClose={() => setIsNotificationCenterOpen(false)}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onOpenNetwork={(tab) => {
          setIsNotificationCenterOpen(false);
          setActiveView('network');
          if (tab) window.sessionStorage.setItem('mornai-network-tab', tab);
        }}
        onOpenWorkspace={() => {
          setIsNotificationCenterOpen(false);
          setActiveView('workspace');
        }}
      />

      <PricingModal
        isOpen={isPricingOpen}
        currentUser={currentUser}
        onClose={() => setIsPricingOpen(false)}
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
