'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Search,
  Calendar,
  Activity,
  ShieldCheck,
  Map,
  Image,
  BarChart2,
  Bot,
  User,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market & Research', href: '/pipelines/research', icon: Search },
  { name: 'Content Strategy', href: '/pipelines/strategy', icon: Map },
  { name: 'Content Calendar', href: '/pipelines/calendar', icon: Calendar },
  { name: 'Engagement Plans', href: '/pipelines/engagement', icon: Activity },
  { name: 'Visuals & Graphics', href: '/pipelines/visuals', icon: Image },
  { name: 'Profile Audit', href: '/pipelines/audit', icon: ShieldCheck },
  { name: 'Performance Analysis', href: '/pipelines/performance', icon: BarChart2 },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'About Me', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-slate-950 border-r border-slate-800 h-screen sticky top-0 overflow-y-auto hidden md:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Content OS
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all relative ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-slate-800 rounded-lg"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`flex-shrink-0 w-5 h-5 mr-3 z-10 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'
                }`}
                aria-hidden="true"
              />
              <span className="z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
            AM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin User</span>
            <span className="text-xs text-slate-400">Pro Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
