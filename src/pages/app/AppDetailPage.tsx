import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button, Card, Badge, Avatar, Tabs, EmptyState, Modal, StarRating, Textarea, Input, useToast } from '../../components/ui';
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  Bug,
  Lightbulb,
  Send,
} from 'lucide-react';
import type { App, Feedback, AppVersion } from '../../types';
import { formatDate, formatFileSize, formatRelativeTime } from '../../lib/utils';

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [app, setApp] = useState<App | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const [newFeedback, setNewFeedback] = useState({
    type: 'general' as 'bug' | 'feature' | 'general',
    rating: 0,
    description: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !id) return;

      setUserId(session.user.id);

      const { data: appData } = await supabase
        .from('apps')
        .select(
          `
          *,
          owner:profiles(*),
          screenshots(*),
          videos(*)
        `
        )
        .eq('id', id)
        .single();

      if (!appData) {
        setLoading(false);
        return;
      }

      setApp(appData);
      setIsOwner(appData.owner_id === session.user.id);

      const { data: feedbackData } = await supabase
        .from('feedback')
        .select(
          `
          *,
          user:profiles(*)
        `
        )
        .eq('app_id', id)
        .order('created_at', { ascending: false });
      setFeedback(feedbackData || []);

      const { data: versionsData } = await supabase
        .from('app_versions')
        .select('*')
        .eq('app_id', id)
        .order('created_at', { ascending: false });
      setVersions(versionsData || []);

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleDownload = async () => {
    if (!app?.apk_url) return;

    await supabase.from('installs').insert({
      app_id: app.id,
      device_info: {
        app_version: app.version,
      },
    });

    window.open(app.apk_url, '_blank');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/test/${app?.id}`;
    navigator.clipboard.writeText(link);
    addToast('success', 'Link copied to clipboard');
  };

  const handleCopyTesterLink = (token: string) => {
    const link = `${window.location.origin}/test/${app?.id}?token=${token}`;
    navigator.clipboard.writeText(link);
    addToast('success', 'Tester link copied');
  };

  const handleGenerateInvite = async () => {
    if (!app?.id || !inviteEmail) return;

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    await supabase.from('app_testers').insert({
      app_id: app.id,
      email: inviteEmail,
      token,
      approved: true,
    });

    setInviteLink(`${window.location.origin}/test/${app.id}?token=${token}`);
    setInviteEmail('');
    addToast('success', 'Invite created');
  };

  const handleSubmitFeedback = async () => {
    if (!app?.id || !newFeedback.rating || !newFeedback.description) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    setSubmittingFeedback(true);

    await supabase.from('feedback').insert({
      app_id: app.id,
      user_id: userId,
      type: newFeedback.type,
      rating: newFeedback.rating,
      description: newFeedback.description,
      device_info: {
        app_version: app.version,
      },
    });

    setShowFeedbackModal(false);
    setNewFeedback({ type: 'general', rating: 0, description: '' });
    addToast('success', 'Feedback submitted!');
    setSubmittingFeedback(false);

    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('*, user:profiles(*)')
      .eq('app_id', app.id)
      .order('created_at', { ascending: false });
    setFeedback(feedbackData || []);
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: 'open' | 'in_progress' | 'resolved') => {
    await supabase.from('feedback').update({ status }).eq('id', feedbackId);
    setFeedback((prev) =>
      prev.map((f) => (f.id === feedbackId ? { ...f, status } : f))
    );
    addToast('success', 'Status updated');
  };

  const handleNextScreenshot = () => {
    if (app?.screenshots && selectedScreenshot !== null) {
      setSelectedScreenshot((selectedScreenshot + 1) % app.screenshots.length);
    }
  };

  const handlePrevScreenshot = () => {
    if (app?.screenshots && selectedScreenshot !== null) {
      setSelectedScreenshot(
        (selectedScreenshot - 1 + app.screenshots.length) % app.screenshots.length
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="App not found"
          description="This app may have been deleted or you don't have permission to view it."
          action={{ label: 'Go to Dashboard', onClick: () => (window.location.href = '/dashboard') }}
        />
      </div>
    );
  }

  const feedbackStats = {
    average:
      feedback.length > 0
        ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)
        : '0.0',
    bug: feedback.filter((f) => f.type === 'bug').length,
    feature: feedback.filter((f) => f.type === 'feature').length,
    general: feedback.filter((f) => f.type === 'general').length,
    open: feedback.filter((f) => f.status === 'open').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-[#71717a] hover:text-[#fafafa] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#27272a] flex items-center justify-center overflow-hidden">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#fafafa]">{app.name}</h1>
                <Badge variant={app.tester_mode === 'public' ? 'success' : 'info'}>
                  {app.tester_mode}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-[#71717a]">
                <span className="font-mono">v{app.version || '1.0.0'}</span>
                {app.category && <span className="capitalize">{app.category}</span>}
                {app.package_name && <span className="font-mono text-xs">{app.package_name}</span>}
              </div>
              {app.description && (
                <p className="mt-2 text-[#a1a1aa]">{app.description}</p>
              )}
            </div>
          </div>

          <Card>
            <div className="aspect-video rounded-xl bg-[#27272a] overflow-hidden relative">
              {app.screenshots && app.screenshots.length > 0 ? (
                <img
                  src={app.screenshots[0].url}
                  alt="Screenshot"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => {
                    setSelectedScreenshot(0);
                    setShowLightbox(true);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[#71717a]">
                  <div className="text-center">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No screenshots yet</p>
                  </div>
                </div>
              )}
              {app.screenshots && app.screenshots.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
                  1 / {app.screenshots.length}
                </div>
              )}
            </div>

            {app.screenshots && app.screenshots.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {app.screenshots.map((shot, index) => (
                  <button
                    key={shot.id}
                    onClick={() => {
                      setSelectedScreenshot(index);
                      setShowLightbox(true);
                    }}
                    className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#d4d4d8] transition-colors"
                  >
                    <img src={shot.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {app.videos && app.videos.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-[#fafafa] mb-4">Videos</h3>
              <div className="grid gap-4">
                {app.videos.map((video) => (
                  <div key={video.id} className="relative rounded-xl overflow-hidden bg-[#27272a]">
                    <video
                      src={video.url}
                      controls
                      className="w-full aspect-video"
                      poster={video.thumbnail_url || undefined}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Tabs
            tabs={[
              {
                id: 'feedback',
                label: `Feedback (${feedback.length})`,
                content: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#fafafa]">{feedbackStats.average}</p>
                        <p className="text-xs text-[#71717a]">Avg Rating</p>
                        <div className="mt-1 flex justify-center">
                          <StarRating value={Math.round(parseFloat(feedbackStats.average))} readonly size="sm" />
                        </div>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#fafafa]">{feedbackStats.bug}</p>
                        <p className="text-xs text-[#71717a]">Bugs</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#fafafa]">{feedbackStats.feature}</p>
                        <p className="text-xs text-[#71717a]">Features</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#fafafa]">{feedbackStats.open}</p>
                        <p className="text-xs text-[#71717a]">Open</p>
                      </Card>
                    </div>

                    {feedback.length === 0 ? (
                      <EmptyState
                        icon={<MessageSquare className="w-8 h-8" />}
                        title="No feedback yet"
                        description="Be the first to share your thoughts about this app."
                      />
                    ) : (
                      <div className="space-y-3">
                        {feedback.map((item) => (
                          <Card key={item.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar src={item.user?.avatar_url} name={item.user?.username || 'User'} size="sm" />
                                <div>
                                  <p className="text-sm font-medium text-[#fafafa]">
                                    {item.user?.username || 'Anonymous'}
                                  </p>
                                  <p className="text-xs text-[#71717a]">{formatRelativeTime(item.created_at)}</p>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  item.type === 'bug' ? 'error' : item.type === 'feature' ? 'info' : 'default'
                                }
                              >
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <StarRating value={item.rating} readonly size="sm" />
                              <Badge
                                variant={
                                  item.status === 'open' ? 'warning' : item.status === 'resolved' ? 'success' : 'info'
                                }
                              >
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-[#a1a1aa]">{item.description}</p>
                            {isOwner && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#3f3f46]">
                                <select
                                  value={item.status}
                                  onChange={(e) =>
                                    handleUpdateFeedbackStatus(
                                      item.id,
                                      e.target.value as 'open' | 'in_progress' | 'resolved'
                                    )
                                  }
                                  className="text-xs bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-[#a1a1aa]"
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'versions',
                label: `Versions (${versions.length || 1})`,
                content: (
                  <div className="space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#27272a] flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#71717a]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#fafafa]">v{app.version || '1.0.0'}</p>
                          <p className="text-xs text-[#71717a]">{formatDate(app.created_at)}</p>
                        </div>
                        <Badge variant="success">Latest</Badge>
                      </div>
                    </Card>
                    {versions.slice(1).map((version) => (
                      <Card key={version.id} className="p-4 opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#27272a] flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#71717a]" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-[#fafafa]">v{version.version}</p>
                            <p className="text-xs text-[#71717a]">{formatDate(version.created_at)}</p>
                          </div>
                        </div>
                        {version.changelog && (
                          <p className="mt-2 text-sm text-[#a1a1aa]">{version.changelog}</p>
                        )}
                      </Card>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <Button className="w-full" onClick={handleDownload} disabled={!app.apk_url}>
                <Download className="w-4 h-4" />
                Download APK
                {app.apk_size && <span className="ml-2 text-xs opacity-70">({formatFileSize(app.apk_size)})</span>}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4" />
                Share App
              </Button>
              {!isOwner && (
                <Button variant="ghost" className="w-full" onClick={() => setShowFeedbackModal(true)}>
                  <MessageSquare className="w-4 h-4" />
                  Submit Feedback
                </Button>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-[#3f3f46] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#71717a]">Created</span>
                <span className="text-[#fafafa]">{formatDate(app.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#71717a]">Category</span>
                <span className="text-[#fafafa] capitalize">{app.category || 'Uncategorized'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#71717a]">Tester Mode</span>
                <Badge variant={app.tester_mode === 'public' ? 'success' : 'info'}>
                  {app.tester_mode}
                </Badge>
              </div>
            </div>

            {isOwner && app.owner && (
              <div className="mt-6 pt-6 border-t border-[#3f3f46]">
                <p className="text-sm text-[#71717a] mb-2">Owner</p>
                <div className="flex items-center gap-2">
                  <Avatar src={app.owner.avatar_url} name={app.owner.username || undefined} size="sm" />
                  <span className="text-sm text-[#fafafa]">{app.owner.username || 'Unknown'}</span>
                </div>
              </div>
            )}
          </Card>

          {isOwner && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-[#fafafa] mb-4">Invite Testers</h3>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="tester@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button variant="secondary" className="w-full" onClick={handleGenerateInvite}>
                  Generate Invite Link
                </Button>
                {inviteLink && (
                  <div className="p-3 bg-[#27272a] rounded-lg">
                    <p className="text-xs text-[#71717a] mb-1">Share this link:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-[#a1a1aa] truncate">{inviteLink}</code>
                      <button onClick={() => handleCopyTesterLink(inviteLink.split('token=')[1] || '')}>
                        <Copy className="w-4 h-4 text-[#71717a] hover:text-[#fafafa]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {showLightbox && app.screenshots && selectedScreenshot !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowLightbox(false)}>
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg"
            onClick={() => setShowLightbox(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-lg"
            onClick={(e) => { e.stopPropagation(); handlePrevScreenshot(); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img
            src={app.screenshots[selectedScreenshot].url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-lg"
            onClick={(e) => { e.stopPropagation(); handleNextScreenshot(); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {selectedScreenshot + 1} / {app.screenshots.length}
          </div>
        </div>
      )}

      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share App">
        <div className="space-y-4">
          <p className="text-sm text-[#a1a1aa]">Copy the link below to share this app with testers:</p>
          <div className="flex items-center gap-2 p-3 bg-[#27272a] rounded-lg">
            <code className="flex-1 text-xs text-[#a1a1aa] truncate">
              {window.location.origin}/test/{app.id}
            </code>
            <button onClick={handleCopyLink}>
              <Copy className="w-4 h-4 text-[#71717a] hover:text-[#fafafa]" />
            </button>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => { handleCopyLink(); setShowShareModal(false); }}>
            <Copy className="w-4 h-4" />
            Copy Link
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title="Submit Feedback">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Feedback Type</label>
            <div className="flex gap-2">
              {[
                { value: 'bug', label: 'Bug', icon: Bug },
                { value: 'feature', label: 'Feature', icon: Lightbulb },
                { value: 'general', label: 'General', icon: MessageSquare },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNewFeedback((f) => ({ ...f, type: type.value as any }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    newFeedback.type === type.value
                      ? 'border-[#d4d4d8] bg-[#d4d4d8]/10 text-[#d4d4d8]'
                      : 'border-[#3f3f46] text-[#71717a] hover:border-[#d4d4d8]/50'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Rating</label>
            <StarRating value={newFeedback.rating} onChange={(rating) => setNewFeedback((f) => ({ ...f, rating }))} size="lg" />
          </div>

          <Textarea
            label="Description"
            placeholder="Describe your feedback in detail..."
            value={newFeedback.description}
            onChange={(e) => setNewFeedback((f) => ({ ...f, description: e.target.value }))}
          />

          <Button className="w-full" onClick={handleSubmitFeedback} loading={submittingFeedback}>
            <Send className="w-4 h-4" />
            Submit Feedback
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Image({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
