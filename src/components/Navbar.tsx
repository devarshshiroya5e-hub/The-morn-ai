import React from 'react';
import { User } from '../types';
import {
  Sparkles,
  Calendar,
  MessageCircle,
  Compass,
  Briefcase,
  BrainCircuit,
  ArrowRightLeft,
  Crown,
  PlusCircle,
  UserCircle,
  ChevronDown,
  LogOut,
  Gauge,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  activeTab: 'discover' | 'workspace' | 'appointments' | 'messages' | 'talents' | 'profile';
  setActiveTab: (tab: 'discover' | 'workspace' | 'appointments' | 'messages' | 'talents' | 'profile') => void;
  onOpenAiDrawer: () => void;
  onOpenAuthModal: () => void;
  onOpenRegisterStartup: () => void;
  onOpenPricing: () => void;
  appointmentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAiDrawer,
  onOpenAuthModal,
  onOpenRegisterStartup,
  onOpenPricing,
  appointmentCount,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const navItems: Array<{
    id: 'discover' | 'workspace' | 'messages';
    label: string;
    icon: typeof Compass;
    badge?: number;
  }> = [
    { id: 'discover' as const, label: 'Discover', icon: Compass },
    {
      id: 'workspace' as const,
      label: currentUser.role === 'founder' ? 'Workspace' : 'Dashboard',
      icon: Briefcase,
    },
    {
      id: 'messages' as const,
      label: 'Messages',
      icon: MessageCircle,
    },
  ];

  return (
    <header className="mornai-app-nav-wrap sticky top-0 z-40 px-3 pt-3 sm:px-5 lg:px-6">
      <div className="mornai-app-nav mx-auto flex max-w-7xl items-center gap-2 rounded-[22px] px-2.5 py-2 sm:gap-3 sm:px-3">
        <button
          id="brand-logo-btn"
          onClick={() => setActiveTab('discover')}
          className="group flex min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-[0_10px_26px_rgba(15,23,42,.18)]">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="flex items-center gap-1.5">
              <b className="truncate text-[15px] tracking-tight text-slate-950">MORN<span className="text-indigo-600">AI</span></b>
              <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[.14em] text-indigo-600">OS</span>
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">Startup operating system</span>
          </span>
        </button>

        <nav className="hidden flex-1 justify-center md:flex">
          <div className="mornai-app-nav-pills flex items-center gap-1 rounded-2xl p-1">
            {navItems.map(({ id, label, icon: Icon, badge }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  id={`nav-${id}-btn`}
                  onClick={() => setActiveTab(id)}
                  className={`mornai-app-nav-item relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${active
                    ? 'mornai-app-nav-item-active'
                    : 'text-slate-500 hover:bg-white/55 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {badge ? (
                    <span className="min-w-5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {currentUser.role === 'founder' && (
            <button
              id="header-register-startup-btn"
              onClick={onOpenRegisterStartup}
              className="mornai-app-ghost-btn hidden items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold lg:inline-flex"
            >
              <PlusCircle className="h-4 w-4 text-indigo-600" />
              New startup
            </button>
          )}

          <button
            id="open-ai-strategist-btn"
            onClick={onOpenAiDrawer}
            className="mornai-ai-btn inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-white/12">
              <BrainCircuit className="h-3.5 w-3.5" />
            </span>
            <span className="hidden sm:inline">AI Co-Founder</span>
            <span className="sm:hidden">AI</span>
          </button>

          <button
            id="header-pricing-btn"
            onClick={onOpenPricing}
            className="hidden items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/85 px-3 py-2.5 text-xs font-bold text-amber-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100 sm:inline-flex"
          >
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            Pro
          </button>

          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setShowUserMenu((open) => !open)}
              className="mornai-user-trigger flex items-center gap-2 rounded-2xl p-1.5 pr-2 transition-all duration-200 hover:-translate-y-0.5"
              aria-expanded={showUserMenu}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-8 w-8 rounded-xl object-cover ring-2 ring-white/90"
              />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[120px] truncate text-[11px] font-extrabold text-slate-900">{currentUser.name}</span>
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${currentUser.role === 'founder' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  {currentUser.role === 'founder' ? 'Founder' : 'Contributor'}
                </span>
              </span>
              <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-200 sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div id="user-dropdown-menu" className="mornai-user-menu absolute right-0 mt-2 w-72 overflow-hidden rounded-[22px] p-2">
                <div className="rounded-2xl bg-white/50 px-3.5 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-10 w-10 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">{currentUser.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700">
                    <Gauge className="h-3 w-3" />
                    {currentUser.role === 'founder' ? 'Founder operating mode' : 'Contributor operating mode'}
                  </div>
                </div>

                <div className="mt-1 grid gap-1">
                  <button
                    id="menu-open-profile-btn"
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('profile');
                    }}
                    className="mornai-menu-item"
                  >
                    <UserCircle className="h-4 w-4 text-indigo-500" />
                    My profile
                  </button>
                  <button
                    id="menu-open-auth-btn"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuthModal();
                    }}
                    className="mornai-menu-item"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                    Open auth screen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mornai-mobile-nav mt-2 flex items-center justify-around rounded-2xl px-2 py-1.5 md:hidden">
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-bold transition-all duration-200 ${activeTab === id ? 'mornai-mobile-nav-active' : 'text-slate-500'}`}
          >
            <span className="relative">
              <Icon className="h-4 w-4" />
              {badge ? <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-indigo-600 px-1 text-[8px] font-extrabold text-white">{badge}</span> : null}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
