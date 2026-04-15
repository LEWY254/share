import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import {
  Package,
  MessageSquare,
  Download,
  Clock,
  Trash2,
  ExternalLink,
  QrCode,
  Shield,
  Plus,
} from 'lucide-react';
import type { App, Profile } from '../../types';
import { formatRelativeTime } from '../../lib/utils';

interface OutletContext {
  profile: Profile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
}

export function DashboardPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApps: 0,
    totalInstalls: 0,
    pendingFeedback: 0,
    totalTesters: 0,
  });
  const { profile, isAdmin, isDeveloper } = useOutletContext<OutletContext>();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let appsQuery = supabase
        .from('betadrop_apps')
        .select(`*, owner:betadrop_profiles(*), screenshots(*), videos(*)`)
        .order('created_at', { ascending: false });

      if (isDeveloper) {
        appsQuery = appsQuery.eq('owner_id', session.user.id);
      }

      const { data: appsData } = await appsQuery;
      setApps(appsData || []);

      const appIds = (appsData || []).map((a) => a.id);

      const { count: installCount } = await supabase
        .from('betadrop_installs')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds.length > 0 ? appIds : ['none']);

      const { count: feedbackCount } = await supabase
        .from('betadrop_feedback')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds.length > 0 ? appIds : ['none'])
        .eq('status', 'open');

      setStats({
        totalApps: appsData?.length || 0,
        totalInstalls: installCount || 0,
        pendingFeedback: feedbackCount || 0,
        totalTesters: 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [isDeveloper]);

  const handleDeleteApp = async (appId: string) => {
    if (!confirm('Delete this app?')) return;
    await supabase.from('betadrop_apps').delete().eq('id', appId);
    setApps((prev) => prev.filter((a) => a.id !== appId));
  };

  const handleCopyLink = (appId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${appId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#fafafa]">Dashboard</h1>
            {isAdmin && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[#d4d4d8]/20 text-[#d4d4d8] rounded">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
          <p className="text-[#71717a]">
            {isDeveloper ? 'Manage your beta apps' : 'Browse available apps'}
          </p>
        </div>
        {isDeveloper && (
          <Link to="/create">
            <Button><Plus className="w-4 h-4" />Create App</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Apps', value: stats.totalApps, icon: Package },
          { label: 'Installs', value: stats.totalInstalls, icon: Download },
          { label: 'Feedback', value: stats.pendingFeedback, icon: MessageSquare },
          { label: 'Testers', value: stats.totalTesters, icon: Clock },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-[#71717a]" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{stat.value}</p>
                <p className="text-sm text-[#71717a]">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#fafafa] mb-4">
          {isDeveloper ? 'Your Apps' : 'Available Apps'}
        </h2>
        {apps.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title={isDeveloper ? 'No apps yet' : 'No apps available'}
              description={isDeveloper ? 'Create your first app to get started.' : 'Check back later.'}
              action={isDeveloper ? { label: 'Create App', onClick: () => (window.location.href = '/create') } : undefined}
            />
          </Card>
        ) : (
          <div className="grid gap-4">
            {apps.map((app) => (
              <Card key={app.id} hover>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#27272a] flex items-center justify-center">
                    {app.icon_url ? (
                      <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Package className="w-6 h-6 text-[#71717a]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#fafafa] truncate">{app.name}</h3>
                      <Badge variant={app.tester_mode === 'public' ? 'success' : 'info'}>{app.tester_mode}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[#71717a]">
                      <span className="font-mono">v{app.version || '1.0.0'}</span>
                      <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{app._count?.installs || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{app._count?.feedback || 0}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatRelativeTime(app.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link to={`/app/${app.id}`}>
                      <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(app.id)}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                    {isDeveloper && app.owner_id === profile?.id && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteApp(app.id)} className="text-[#ef4444]">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
