import React from 'react';
import { User, UserRole } from '../types';
import { 
  Sparkles, 
  Calendar, 
  Compass, 
  Briefcase, 
  BrainCircuit, 
  UserCheck, 
  LogOut, 
  ArrowRightLeft,
  Crown,
  PlusCircle,
  UserCircle
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  allUsers: User[];
  activeTab: 'discover' | 'workspace' | 'appointments' | 'talents' | 'profile';
  setActiveTab: (tab: 'discover' | 'workspace' | 'appointments' | 'talents' | 'profile') => void;
  onOpenAiDrawer: () => void;
  onOpenAuthModal: () => void;
  onOpenRegisterStartup: () => void;
  onOpenPricing: () => void;
  appointmentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  allUsers,
  activeTab,
  setActiveTab,
  onOpenAiDrawer,
  onOpenAuthModal,
  onOpenRegisterStartup,
  onOpenPricing,
  appointmentCount,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button 
              id="brand-logo-btn"
              onClick={() => setActiveTab('discover')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-900 font-['Outfit']">SolveEarn</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md uppercase tracking-wider">AI</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Co-Founder & Talent Platform</p>
              </div>
            </button>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                id="nav-discover-btn"
                onClick={() => setActiveTab('discover')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'discover'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-4 h-4" />
                Discover Startups
              </button>

              <button
                id="nav-workspace-btn"
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'workspace'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                {currentUser.role === 'founder' ? 'Founder Workspace' : 'Talent Dashboard'}
              </button>

              <button
                id="nav-appointments-btn"
                onClick={() => setActiveTab('appointments')}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Appointments & Syncs
                {appointmentCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                    {appointmentCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            
            {/* AI Co-Founder Action Button */}
            <button
              id="open-ai-strategist-btn"
              onClick={onOpenAiDrawer}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-100 transition-all active:scale-95"
            >
              <BrainCircuit className="w-4 h-4 text-violet-200 animate-pulse" />
              <span className="hidden sm:inline">AI Co-Founder</span>
              <span className="sm:hidden">AI</span>
            </button>

            {/* Founder Quick Action: Register Startup */}
            {currentUser.role === 'founder' && (
              <button
                id="header-register-startup-btn"
                onClick={onOpenRegisterStartup}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                New Startup
              </button>
            )}

            {/* SolveEarn Pro Pricing Button */}
            <button
              id="header-pricing-btn"
              onClick={onOpenPricing}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              SolveEarn Pro
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 transition-colors focus:outline-none"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-white"
                />
                <div className="hidden sm:block text-left pr-1">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${currentUser.role === 'founder' ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
                    {currentUser.role === 'founder' ? 'Founder' : 'Skill Talent'}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div 
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="font-semibold text-sm text-slate-900">{currentUser.name}</div>
                    <div className="text-xs text-slate-500">{currentUser.email}</div>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700">
                      {currentUser.role === 'founder' ? '🚀 Startup Founder' : '⚡ Skilled Talent / Contributor'}
                    </div>
                  </div>

                  {/* Switch Demo Personas */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Switch Role Profile
                    </div>
                    <div className="space-y-1">
                      {allUsers.map((u) => (
                        <button
                          key={u.id}
                          id={`switch-to-${u.id}-btn`}
                          onClick={() => {
                            onSwitchUser(u.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            u.id === currentUser.id
                              ? 'bg-indigo-50 text-indigo-900 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-md object-cover" />
                            <div>
                              <div className="font-medium leading-none">{u.name}</div>
                              <div className="text-[10px] text-slate-500 capitalize">{u.role}</div>
                            </div>
                          </div>
                          {u.id === currentUser.id && (
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      id="menu-open-profile-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab('profile');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      id="menu-open-auth-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      Sign Up / Login Screen
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-t border-slate-200 bg-white px-2 py-1 justify-around text-xs">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center py-1 px-2 ${activeTab === 'discover' ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          Discover
        </button>
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex flex-col items-center py-1 px-2 ${activeTab === 'workspace' ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}
        >
          <Briefcase className="w-4 h-4 mb-0.5" />
          Workspace
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex flex-col items-center py-1 px-2 ${activeTab === 'appointments' ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          Appointments ({appointmentCount})
        </button>
      </div>
    </header>
  );
};
