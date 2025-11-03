'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import ThemeToggle from './ThemeToggle';
import { useDownloadStore } from '@/store/downloadStore';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { href: '/', label: 'Dashboard', icon: ChartBarIcon, gradient: 'from-purple-500 to-indigo-600', showBadge: false },
  { href: '/downloads', label: 'Downloads', icon: ArrowDownTrayIcon, gradient: 'from-blue-500 to-cyan-600', showBadge: true },
  { href: '/history', label: 'History', icon: ClockIcon, gradient: 'from-amber-500 to-orange-600', showBadge: false },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon, gradient: 'from-gray-500 to-slate-600', showBadge: false },
] as const;

function Navigation() {
  const pathname = usePathname();
  const { getActiveDownloads } = useDownloadStore();
  const activeDownloadsCount = getActiveDownloads().length;

  return (
    <nav className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col shadow-2xl">
      {/* Header with gradient background */}
      <div className="p-6 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-indigo-600/10 animate-gradient"></div>
        
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Logo with gradient and glow */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50 animate-glow">
                <span className="text-2xl animate-float">⚡</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                  NovaGet
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 ml-13">Download Manager</p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="block group relative"
            >
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b ${item.gradient} rounded-r-full shadow-lg`}></div>
              )}
              
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-white/10 to-white/5 shadow-lg shadow-black/20'
                    : 'hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                {/* Shimmer effect on hover */}
                {!isActive && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 animate-shimmer"></div>
                  </div>
                )}

                {/* Icon with gradient background */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 relative z-10 ${
                    isActive
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                      : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-110'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-gray-200 group-hover:scale-110'
                    }`}
                  />
                </div>
                
                {/* Label */}
                <span
                  className={`font-medium transition-all duration-300 relative z-10 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                >
                  {item.label}
                </span>

                {/* Badge for active downloads */}
                {item.showBadge && activeDownloadsCount > 0 && (
                  <div className="ml-auto relative z-10">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                    }`}>
                      {activeDownloadsCount}
                    </div>
                  </div>
                )}

                {/* Hover effect indicator with pulse */}
                {!isActive && !item.showBadge && (
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 group-hover:animate-pulse"></div>
                  </div>
                )}

                {/* Active item glow effect */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 blur-xl`}></div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer with version and user info */}
      <div className="p-4 border-t border-white/5 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent"></div>
        
        <div className="flex items-center justify-between px-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30 ring-2 ring-white/10">
              N
            </div>
            <div className="text-xs">
              <div className="text-gray-300 font-semibold">NovaGet</div>
              <div className="text-gray-500 flex items-center gap-1">
                <span>v1.0.0</span>
                <span className="text-gray-600">•</span>
                <span className="text-green-400">Pro</span>
              </div>
            </div>
          </div>
          
          {/* Status indicator with better styling */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            </div>
            <span className="text-xs text-green-400 font-medium">Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default memo(Navigation);
