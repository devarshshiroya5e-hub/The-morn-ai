import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Navbar } from './components/Navbar';
import { DiscoverStartups } from './components/DiscoverStartups';
import { StartupDetailModal } from './components/StartupDetailModal';
import { FounderWorkspace } from './components/FounderWorkspace';
import { TalentWorkspace } from './components/TalentWorkspace';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { AiCoFounderDrawer } from './components/AiCoFounderDrawer';
import { AuthModal } from './components/AuthModal';
import { LegalModal } from './components/LegalModal';
import { StartupRegistrationModal } from './components/StartupRegistrationModal';
import { ProfilePage } from './components/ProfilePage';
import { LandingPage } from './components/LandingPage';

import { 
  initialStartups, 
  mockTalentUsers, 
  mockFounderUser, 
  mockAppointments 
} from './data/mockData';
import { Startup, User, RolePost, Appointment, TaskItem } from './types';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // State: current logged-in user (Founder vs Talent/Employee)
  const [currentUser, setCurrentUser] = useState<User>(mockFounderUser);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // State: all startups in the platform
  const [startups, setStartups] = useState<Startup[]>(initialStartups);

  // State: all appointments (syncs between founders and talent)
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Navigation: 'discover' (browse startups) | 'workspace' (founder/talent dashboard) | 'appointments' (direct sync list) | 'profile' (profile page)
  const [activeView, setActiveView] = useState<'discover' | 'workspace' | 'appointments' | 'profile'>('discover');

  // Modals & Drawers
  const [selectedStartupForDetail, setSelectedStartupForDetail] = useState<Startup | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [bookingModalStartup, setBookingModalStartup] = useState<Startup | null>(null);
  const [bookingModalRole, setBookingModalRole] = useState<RolePost | undefined>(undefined);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Active startup for the Founder Workspace and AI Co-Founder Chat
  const founderStartup = startups.find(s => s.founderId === currentUser.id) || startups[0];
  const [activeStartupContext, setActiveStartupContext] = useState<Startup>(founderStartup);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Role switch handler
  const handleSwitchRole = (newRole: 'founder' | 'talent') => {
    if (newRole === 'founder') {
      setCurrentUser(mockFounderUser);
      setActiveStartupContext(startups.find(s => s.founderId === mockFounderUser.id) || startups[0]);
    } else {
      setCurrentUser(mockTalentUsers[0]);
    }
  };

  // Open detailed startup profile
  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartupForDetail(startup);
    setIsDetailModalOpen(true);
  };

  // Open booking modal
  const handleOpenBookingModal = (startup: Startup, role?: RolePost) => {
    setBookingModalStartup(startup);
    setBookingModalRole(role);
    setIsBookingModalOpen(true);
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

  // Update a startup (roadmap, tasks, memory logs, roles)
  const handleUpdateStartup = (updatedStartup: Startup) => {
    setStartups(prev => prev.map(s => s.id === updatedStartup.id ? updatedStartup : s));
    if (activeStartupContext.id === updatedStartup.id) {
      setActiveStartupContext(updatedStartup);
    }
    showToast(`Startup "${updatedStartup.name}" updated with AI Co-Founder memory.`);
  };

  // Register a new ongoing startup
  const handleRegisterStartup = (newStartup: Startup) => {
    setStartups(prev => [newStartup, ...prev]);
    setActiveStartupContext(newStartup);
    setActiveView('workspace');
    showToast(`"${newStartup.name}" registered! AI Co-Founder memory vault and roadmap activated.`);
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
        onSuccess={() => {
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

  if (!isLoggedIn) {
    return (
      <>
        <LandingPage onOpenAuth={(mode) => setIsAuthModalOpen(true)} />
        {authModals}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans']">
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
        activeTab={activeView === 'profile' ? 'profile' : activeView === 'appointments' ? 'appointments' : activeView === 'workspace' ? 'workspace' : 'discover'}
        setActiveTab={(tab) => setActiveView(tab === 'profile' ? 'profile' : tab === 'appointments' ? 'appointments' : tab === 'workspace' ? 'workspace' : 'discover')}
        allUsers={[mockFounderUser, ...mockTalentUsers]}
        onSwitchUser={(userId) => {
          const user = [mockFounderUser, ...mockTalentUsers].find(u => u.id === userId);
          if (user) setCurrentUser(user);
        }}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        onRegisterStartup={() => setIsRegisterModalOpen(true)}
        onOpenPricing={() => {}}
        appointmentCount={appointments.length}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 pb-16">
        
        {/* VIEW 1: DISCOVER ONGOING STARTUPS */}
        {activeView === 'discover' && (
          <DiscoverStartups
            startups={startups}
            currentUser={currentUser}
            onSelectStartup={handleSelectStartup}
            onBookAppointment={handleOpenBookingModal}
            onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
          />
        )}

        {/* VIEW 2: WORKSPACE (Founder vs Talent) */}
        {activeView === 'workspace' && (
          currentUser.role === 'founder' ? (
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

        {/* VIEW 3: DIRECT APPOINTMENTS VIEW */}
        {activeView === 'appointments' && (
          currentUser.role === 'founder' ? (
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

        {/* VIEW 4: PROFILE PAGE */}
        {activeView === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onUpdateUser={setCurrentUser}
            onLogout={() => {
              setIsAuthModalOpen(true);
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
          setIsDetailModalOpen(false);
          setIsAiDrawerOpen(true);
        }}
      />

      {/* Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        startup={bookingModalStartup}
        selectedRole={bookingModalRole}
        currentUser={currentUser}
        onConfirmAppointment={handleConfirmAppointment}
      />

      {/* AI Co-Founder & Strategist Slide-out Drawer */}
      <AiCoFounderDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        activeStartup={activeStartupContext}
        currentUser={currentUser}
        allStartups={startups}
        onSelectStartup={(s) => setActiveStartupContext(s)}
      />

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
            <span className="font-bold text-slate-800 font-['Outfit']">SolveEarn AI</span>
            <span>• The Automated AI Co-Founder & Strategic Talent Platform</span>
          </div>
          <div className="text-slate-400">
            Inspired by Solvearn • Continuous AI Strategic Memory Engine
          </div>
          <button 
            onClick={() => setIsLegalModalOpen(true)}
            className="text-slate-500 hover:text-indigo-400 text-xs underline"
          >
            Legal Information
          </button>
        </div>
      </footer>

    </div>
  );
}
