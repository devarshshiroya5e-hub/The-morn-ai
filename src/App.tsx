import React, { useState, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, QuerySnapshot, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
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

const stripUndefinedPreferenceFields = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;

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

  // Every internal view is a new page surface. Always enter it from the top,
  // regardless of how far the user had scrolled on the previous surface.
  useLayoutEffect(() => {
    if (!isLoggedIn || !sessionRestoreComplete) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeView, isLoggedIn, sessionRestoreComplete]);

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
    if (!activeStartupContext && isAiDrawerOpen) {
      setIsAiDrawerOpen(false);
    }
  }, [activeStartupContext, isAiDrawerOpen]);

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
      collection(db, 'publicProfiles'),
      (snapshot) => {
        const remote = snapshot.docs
          .map((profileDoc) => normalizeUser({ ...(profileDoc.data() as User), id: profileDoc.id }))
          .filter((profile) => profile.id !== currentUser.id)
          .filter((profile) => currentUser.role === 'founder' ? profile.role === 'employee' : profile.role === 'founder');

        setTalentUsers(remote);
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
  ]);

  // Network connection requests are centralized so both sides can see the relationship in real time.
  useEffect(() => {
    if (!isLoggedIn) {
      setConnections([]);
      return;
    }

    const connectionsById = new Map<string, ConnectionRequest>();
    let sentReady = false;
    let receivedReady = false;

    const publishConnections = () => {
      setConnections(
        Array.from(connectionsById.values()).sort((a, b) => b.createdAtClient - a.createdAtClient),
      );
    };

    const handleConnectionSnapshot = (snapshot: QuerySnapshot, side: 'sent' | 'received') => {
      snapshot.docs.forEach((connectionDoc) => {
        connectionsById.set(connectionDoc.id, {
          ...(connectionDoc.data() as ConnectionRequest),
          id: connectionDoc.id,
        });
      });
      if (side === 'sent') sentReady = true;
      if (side === 'received') receivedReady = true;
      if (sentReady || receivedReady) publishConnections();
    };

    const sentQuery = query(
      collection(db, 'connections'),
      where('fromUserId', '==', currentUser.id),
    );
    const receivedQuery = query(
      collection(db, 'connections'),
      where('toUserId', '==', currentUser.id),
    );

    const unsubscribeSent = onSnapshot(
      sentQuery,
      (snapshot) => handleConnectionSnapshot(snapshot, 'sent'),
      (error) => console.error('Failed to load sent network connections:', error),
    );
    const unsubscribeReceived = onSnapshot(
      receivedQuery,
      (snapshot) => handleConnectionSnapshot(snapshot, 'received'),
      (error) => console.error('Failed to load received network connections:', error),
    );

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [isLoggedIn, currentUser.id]);

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

    const appointmentsById = new Map<string, Appointment>();
    let founderReady = false;
    let talentReady = false;

    const publishAppointments = () => {
      setAppointments(
        Array.from(appointmentsById.values()).sort((a, b) => {
          const first = a.date + ' ' + a.time;
          const second = b.date + ' ' + b.time;
          return second.localeCompare(first);
        }),
      );
    };

    const handleAppointmentSnapshot = (snapshot: QuerySnapshot, side: 'founder' | 'talent') => {
      snapshot.docs.forEach((appointmentDoc) => {
        appointmentsById.set(appointmentDoc.id, {
          ...(appointmentDoc.data() as Appointment),
          id: appointmentDoc.id,
        });
      });
      if (side === 'founder') founderReady = true;
      if (side === 'talent') talentReady = true;
      if (founderReady || talentReady) publishAppointments();
    };

    const founderQuery = query(
      collection(db, 'appointments'),
      where('founderId', '==', currentUser.id),
    );
    const talentQuery = query(
      collection(db, 'appointments'),
      where('talentId', '==', currentUser.id),
    );

    const unsubscribeFounder = onSnapshot(
      founderQuery,
      (snapshot) => handleAppointmentSnapshot(snapshot, 'founder'),
      (error) => console.error('Failed to load founder appointments from Firestore:', error),
    );
    const unsubscribeTalent = onSnapshot(
      talentQuery,
      (snapshot) => handleAppointmentSnapshot(snapshot, 'talent'),
      (error) => console.error('Failed to load talent appointments from Firestore:', error),
    );

    return () => {
      unsubscribeFounder();
      unsubscribeTalent();
    };
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
      startup.founderId === userId
      || startup.memberIds?.includes(userId)
      || startup.members?.some((member) => member.userId === userId);

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
      startups.find((startup) => startup.memberIds?.includes(userId)) ||
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

  // AI Co-Founder always needs a real startup context. Never open a hidden/empty
  // drawer when that context is still loading or unavailable.
  const handleOpenAiDrawer = () => {
    if (!activeStartupContext) {
      showToast(
        currentUser.role === 'founder'
          ? 'Create or select a startup before opening AI Co-Founder.'
          : 'Join a startup before opening AI Co-Founder.',
      );
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
      await updateDoc(doc(db, 'connections', connectionId), { status });
      showToast(status === 'accepted' ? 'Connection accepted.' : 'Connection request updated.');
    } catch (error) {
      console.error('Failed to update connection request:', error);
      showToast('Could not update the connection.');
    }
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12, scale: 0.997 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.998 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-full"
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
