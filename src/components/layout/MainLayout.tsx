import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button, Avatar } from '../ui';
import {
  LayoutDashboard,
  Plus,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Shield,
  Box,
} from 'lucide-react';
import type { Profile } from '../../types';

export function MainLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';
  const isDeveloper = profile?.role === 'admin' || profile?.role === 'developer';

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('betadrop_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
        <div className="text-center max-w-md">
          <Box className="w-16 h-16 mx-auto mb-6 text-[#71717a]" />
          <h1 className="text-xl font-bold text-[#fafafa] mb-2">Supabase Not Configured</h1>
          <p className="text-[#71717a] mb-6">
            Please add your Supabase credentials to the .env file to connect to your backend.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <nav className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-[#27272a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <Box className="w-8 h-8 text-[#fafafa]" />
                <span className="text-lg font-bold text-[#fafafa]">BetaDrop</span>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {isDeveloper && (
                  <Link
                    to="/create"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create App
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDeveloper && (
                <Link to="/create">
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    New App
                  </Button>
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#27272a] transition-colors"
                >
                  <Avatar src={profile?.avatar_url} name={profile?.username || user.email || undefined} size="sm" />
                  <ChevronDown className="w-4 h-4 text-[#71717a]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[#18181b] border border-[#27272a] rounded-xl shadow-xl py-2 animate-fade-in">
                      <div className="px-4 py-2 border-b border-[#27272a]">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#fafafa] truncate">
                            {profile?.username || 'User'}
                          </p>
                          {isAdmin && <Shield className="w-4 h-4 text-[#d4d4d8]" />}
                        </div>
                        <p className="text-xs text-[#71717a] mt-1">{profile?.role || 'tester'}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#ef4444] hover:bg-[#27272a] transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-[#a1a1aa] hover:text-[#fafafa]"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#27272a] px-4 py-4 space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            {isDeveloper && (
              <Link
                to="/create"
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="w-4 h-4" />
                Create App
              </Link>
            )}
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet context={{ profile, isAdmin, isDeveloper }} />
      </main>
    </div>
  );
}
