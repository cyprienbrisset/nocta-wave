'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Key,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Exécutions', href: '/executions', icon: Activity },
  { name: 'Identifiants', href: '/credentials', icon: Key },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, fetchUser, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Restore sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 bg-[#1a1a2e] border-r border-gray-800 transition-all duration-300',
            sidebarCollapsed ? 'w-[72px]' : 'w-64'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-gray-800 px-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="rounded-xl bg-primary p-2 shrink-0">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent whitespace-nowrap">
                    WS-Flows
                  </span>
                )}
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                const linkContent = (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                      sidebarCollapsed && 'justify-center px-0'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-[#1a1a2e] border-gray-700 text-white">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>

            {/* Collapse toggle */}
            <div className="px-3 pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  'w-full text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl',
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-start'
                )}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    <span className="text-xs">Réduire</span>
                  </>
                )}
              </Button>
            </div>

            {/* User */}
            <div className="border-t border-gray-800 p-3">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="w-full h-12 rounded-xl bg-gray-800/50 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
                        {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1a1a2e] border-gray-700 text-white">
                    <p className="font-medium">{user?.name || 'Utilisateur'}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <p className="text-xs text-red-400 mt-1">Cliquer pour se déconnecter</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-gray-800/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold shrink-0">
                    {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {user?.name || 'Utilisateur'}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 shrink-0"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            sidebarCollapsed ? 'pl-[72px]' : 'pl-64'
          )}
        >
          <div className={cn(
            "h-full",
            // No padding for workflow editor (full-screen canvas)
            pathname.startsWith('/workflows/') && pathname !== '/workflows' ? '' : 'p-8'
          )}>
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
