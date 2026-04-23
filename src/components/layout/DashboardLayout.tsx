import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Target, 
  Map, 
  Briefcase, 
  BarChart3, 
  User, 
  LogOut,
  GraduationCap,
  Bot,
  Users,
  PlayCircle,
  ClipboardList,
  Trophy
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/recommendations', label: 'Career Match', icon: Target },
  { path: '/roadmap', label: 'My Roadmap', icon: Map },
  { path: '/jobs', label: 'Job Board', icon: Briefcase },
  { path: '/coach', label: 'AI Coach', icon: Bot },
  { path: '/mock-interview', label: 'Mock Interview', icon: PlayCircle },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/checkins', label: 'Weekly Check-In', icon: ClipboardList },
  { path: '/outcomes', label: 'Outcomes', icon: Trophy },
  { path: '/profile', label: 'Profile', icon: User },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile, logout, setCurrentStep } = useAppStore();

  const handleLogout = () => {
    logout();
    setCurrentStep('landing');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden h-screen w-full border-b border-border bg-card md:fixed md:block md:w-64 md:border-r md:border-b-0 md:py-6">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">CareerPath</h1>
              <p className="text-xs text-muted-foreground">AI Recommendations</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute right-2 h-2 w-2 rounded-full bg-primary-foreground"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-secondary text-primary-foreground font-semibold">
                {profile?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-foreground truncate">{profile?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.course || 'No course'}</p>
              </div>
            </div>
            <Link
              to="/"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen md:ml-64">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
