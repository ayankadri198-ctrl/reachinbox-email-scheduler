import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarPlus,
  Clock,
  Send,
  AlertOctagon,
  LogOut,
  Zap,
  Menu,
  X,
  Server,
  Layers,
  ExternalLink,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Schedule Email', to: '/schedule', icon: CalendarPlus },
    { name: 'Scheduled Emails', to: '/scheduled', icon: Clock },
    { name: 'Sent Emails', to: '/sent', icon: Send },
    { name: 'Failed Deliveries', to: '/failed', icon: AlertOctagon },
  ];

  return (
    <div className="flex min-h-screen bg-[#07090e] text-slate-100">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-[#0b0e17]/95 border-r border-white/[0.07] backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-blue shadow-glow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="block text-[11px] font-mono tracking-wider uppercase text-purple-400 font-semibold">
                Smart Scheduler
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary CTA */}
        <div className="px-5 pt-6 pb-2">
          <button
            onClick={() => {
              navigate('/schedule');
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-glow active:scale-[0.98]"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Schedule New Email</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Architecture Engine
          </div>

          {/* Engine status indicator */}
          <div className="p-3 mx-1 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                BullMQ Queue
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Redis AOF Store
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Persistent</span>
            </div>
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/[0.07] bg-[#090b12]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex items-center justify-center w-9 h-9 font-semibold text-white rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate text-slate-200">
                  {user?.name || 'User'}
                </div>
                <div className="text-xs truncate text-slate-500">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 transition-colors rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 lg:pl-72 min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 sm:px-8 border-b border-white/[0.07] bg-[#07090e]/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>ReachInbox Scheduler</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Distributed BullMQ delayed jobs with Ethereal SMTP delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Time Display */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{currentTime.toLocaleTimeString()}</span>
              <span className="text-slate-500">({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
            </div>

            <button
              onClick={() => navigate('/schedule')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-purple-200 transition-colors rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              New Schedule
            </button>
          </div>
        </header>

        {/* Dynamic Route Pages */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

