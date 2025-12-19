'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  BookOpen,
  BarChart3,
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  LayoutTemplate,
  Variable,
  MonitorCheck,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Vue d\'ensemble' },
  { name: 'Workflows', href: '/workflows', icon: Workflow, description: 'Gérer vos automatisations' },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate, description: 'Galerie de templates' },
  { name: 'Exécutions', href: '/executions', icon: Activity, description: 'Historique et logs' },
  { name: 'Monitoring', href: '/monitoring', icon: MonitorCheck, description: 'Métriques et alertes' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Statistiques détaillées' },
  { name: 'Credentials', href: '/credentials', icon: Key, description: 'Clés et tokens' },
  { name: 'Environnements', href: '/environments', icon: Variable, description: 'Variables et secrets' },
];

const secondaryNav = [
  { name: 'Documentation', href: '/docs', icon: BookOpen },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

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
    // Always use dark mode
    document.documentElement.classList.add('dark');
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Image
              src="/logo-nocta-wave.png"
              alt="Nocta-Wave"
              width={64}
              height={64}
              className="rounded-2xl animate-pulse"
            />
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-medium text-foreground">Nocta-Wave</p>
            <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Check if we're in full-screen mode (editor, docs)
  const isFullScreen = (pathname.startsWith('/workflows/') && pathname !== '/workflows') || pathname === '/docs';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-card transition-all duration-300 ease-smooth',
            sidebarCollapsed ? 'w-20' : 'w-72',
            // Mobile: hidden by default, shown when menu open
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Logo */}
          <div className={cn(
            'flex h-16 items-center border-b border-border/50',
            sidebarCollapsed ? 'justify-center px-4' : 'px-6'
          )}>
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/logo-nocta-wave.png"
                  alt="Nocta-Wave"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary to-purple-600 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-30" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold gradient-text">Nocta-Wave</span>
                  <span className="text-2xs text-muted-foreground">Workflow Automation</span>
                </div>
              )}
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className={cn(
              'mb-4',
              sidebarCollapsed ? 'text-center' : ''
            )}>
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Menu principal
                </span>
              )}
            </div>

            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-3'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-100" />
                  )}
                  <item.icon className={cn(
                    'relative h-5 w-5 shrink-0 transition-transform duration-200',
                    !isActive && 'group-hover:scale-110'
                  )} />
                  {!sidebarCollapsed && (
                    <div className="relative flex flex-col">
                      <span>{item.name}</span>
                      {!isActive && (
                        <span className="text-2xs text-muted-foreground/70 group-hover:text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                  {isActive && !sidebarCollapsed && (
                    <Sparkles className="relative ml-auto h-4 w-4 text-white/70" />
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.name}>{linkContent}</div>;
            })}

            {/* Divider */}
            <div className={cn(
              'py-4',
              sidebarCollapsed ? 'px-2' : 'px-0'
            )}>
              <div className="h-px bg-border/50" />
            </div>

            {/* Secondary Navigation */}
            {!sidebarCollapsed && (
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Autres
              </span>
            )}

            {secondaryNav.map((item) => {
              const isActive = pathname === item.href;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-3'
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
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.name}>{linkContent}</div>;
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-border/50 p-4 space-y-3">
            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                'w-full rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200',
                sidebarCollapsed ? 'justify-center px-0' : 'justify-start'
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs">Réduire le menu</span>
                </>
              )}
            </Button>

            {/* User section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-200',
                    'bg-muted/50 hover:bg-muted border border-transparent hover:border-border/50',
                    sidebarCollapsed && 'justify-center p-2'
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white font-semibold shadow-lg shadow-primary/20">
                      {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user?.name || 'Utilisateur'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={sidebarCollapsed ? 'center' : 'end'}
                side="top"
                className="w-56"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || 'Utilisateur'}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main content area */}
        <div
          className={cn(
            'flex-1 flex flex-col transition-all duration-300 ease-smooth',
            sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
          )}
        >
          {/* Top bar - only show if not in full screen mode */}
          {!isFullScreen && (
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher des workflows, exécutions..."
                    className="w-full rounded-xl border border-border/50 bg-muted/30 pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-2xs text-muted-foreground">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleDarkMode}
                      className="rounded-xl"
                    >
                      {darkMode ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {darkMode ? 'Mode clair' : 'Mode sombre'}
                  </TooltipContent>
                </Tooltip>

                {/* Notifications */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl relative"
                    >
                      <Bell className="h-5 w-5" />
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                {/* Quick create */}
                <Button className="btn-primary hidden sm:flex">
                  <Zap className="h-4 w-4" />
                  <span>Nouveau workflow</span>
                </Button>
              </div>
            </header>
          )}

          {/* Page content */}
          <main className={cn(
            'flex-1',
            isFullScreen ? '' : 'p-6 lg:p-8'
          )}>
            <div className={cn(
              isFullScreen ? 'h-full' : 'animate-fade-in-up'
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
