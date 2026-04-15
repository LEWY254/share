import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button, Card, Modal, StarRating, Textarea, EmptyState, useToast } from '../../components/ui';
import {
  Download,
  MessageSquare,
  Bug,
  Lightbulb,
  Send,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
} from 'lucide-react';
import type { App } from '../../types';
import { formatFileSize } from '../../lib/utils';

export function TesterPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { addToast } = useToast();

  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [feedback, setFeedback] = useState({
    type: 'general' as 'bug' | 'feature' | 'general',
    rating: 0,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      if (!id) return;

      const { data: appData } = await supabase
        .from('apps')
        .select(
          `
          *,
          screenshots(*),
          videos(*)
        `
        )
        .eq('id', id)
        .single();

      if (!appData) {
        setLoading(false);
        setCheckingToken(false);
        return;
      }

      setApp(appData);

      if (appData.tester_mode === 'invite' && token) {
        const { data: testerData } = await supabase
          .from('app_testers')
          .select('approved')
          .eq('app_id', id)
          .eq('token', token)
          .single();

        if (testerData?.approved) {
          setApproved(true);
        }
      } else if (appData.tester_mode !== 'invite') {
        setApproved(true);
      }

      setCheckingToken(false);
      setLoading(false);
    };

    fetchApp();
  }, [id, token]);

  const handleDownload = async () => {
    if (!app?.apk_url) return;

    const deviceInfo = {
      app_version: app.version,
      timestamp: new Date().toISOString(),
    };

    await supabase.from('installs').insert({
      app_id: app.id,
      device_info: deviceInfo,
    });

    window.open(app.apk_url, '_blank');
  };

  const handleSubmitFeedback = async () => {
    if (!app?.id || !feedback.rating || !feedback.description) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    const deviceInfo = {
      app_version: app.version,
      timestamp: new Date().toISOString(),
    };

    await supabase.from('feedback').insert({
      app_id: app.id,
      type: feedback.type,
      rating: feedback.rating,
      description: feedback.description,
      device_info: deviceInfo,
    });

    setShowFeedbackModal(false);
    setFeedback({ type: 'general', rating: 0, description: '' });
    addToast('success', 'Thank you for your feedback!');
    setSubmitting(false);
  };

  if (checkingToken || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
        <Card className="p-8 text-center max-w-md">
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="App not found"
            description="This app may have been removed or the link is invalid."
          />
        </Card>
      </div>
    );
  }

  if (app.tester_mode === 'invite' && !approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#27272a] flex items-center justify-center">
            <Zap className="w-8 h-8 text-[#fafafa]" />
          </div>
          <h1 className="text-xl font-bold text-[#fafafa] mb-2">Access Restricted</h1>
          <p className="text-[#a1a1aa]">
            This app is only available to invited testers. Please contact the developer for an invitation.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#27272a] flex items-center justify-center">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Package className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#fafafa]">{app.name}</h1>
            <p className="text-sm text-[#71717a]">v{app.version || '1.0.0'}</p>
          </div>
        </div>

        <Card className="p-6 mb-6">
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="aspect-video rounded-xl bg-[#27272a] overflow-hidden mb-4 cursor-pointer" onClick={() => setShowLightbox(true)}>
              <img
                src={app.screenshots[0].url}
                alt="Screenshot"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {app.description && (
            <p className="text-[#a1a1aa] mb-4">{app.description}</p>
          )}

          <div className="flex items-center gap-3">
            <Button className="flex-1" onClick={handleDownload} disabled={!app.apk_url}>
              <Download className="w-4 h-4" />
              Download APK
              {app.apk_size && <span className="ml-2 text-xs opacity-70">({formatFileSize(app.apk_size)})</span>}
            </Button>
            <Button variant="secondary" onClick={() => setShowFeedbackModal(true)}>
              <MessageSquare className="w-4 h-4" />
              Feedback
            </Button>
          </div>
        </Card>

        {app.screenshots && app.screenshots.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {app.screenshots.map((shot, index) => (
              <button
                key={shot.id}
                onClick={() => { setSelectedScreenshot(index); setShowLightbox(true); }}
                className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#d4d4d8] transition-colors"
              >
                <img src={shot.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {app.videos && app.videos.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#fafafa] mb-4">Videos</h3>
            <div className="space-y-4">
              {app.videos.map((video) => (
                <video
                  key={video.id}
                  src={video.url}
                  controls
                  className="w-full rounded-lg"
                  poster={video.thumbnail_url || undefined}
                />
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#fafafa] mb-4">About this App</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#71717a]">Version</span>
              <span className="text-[#fafafa] font-mono">{app.version || '1.0.0'}</span>
            </div>
            {app.category && (
              <div className="flex justify-between text-sm">
                <span className="text-[#71717a]">Category</span>
                <span className="text-[#fafafa] capitalize">{app.category}</span>
              </div>
            )}
            {app.package_name && (
              <div className="flex justify-between text-sm">
                <span className="text-[#71717a]">Package</span>
                <span className="text-[#fafafa] font-mono text-xs">{app.package_name}</span>
              </div>
            )}
          </div>
        </Card>
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
            onClick={(e) => { e.stopPropagation(); setSelectedScreenshot((selectedScreenshot - 1 + app.screenshots!.length) % app.screenshots!.length); }}
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
            onClick={(e) => { e.stopPropagation(); setSelectedScreenshot((selectedScreenshot + 1) % app.screenshots!.length); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {selectedScreenshot + 1} / {app.screenshots.length}
          </div>
        </div>
      )}

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
                  onClick={() => setFeedback((f) => ({ ...f, type: type.value as any }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    feedback.type === type.value
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
            <StarRating value={feedback.rating} onChange={(rating) => setFeedback((f) => ({ ...f, rating }))} size="lg" />
          </div>

          <Textarea
            label="Description"
            placeholder="Share your thoughts, report a bug, or suggest a feature..."
            value={feedback.description}
            onChange={(e) => setFeedback((f) => ({ ...f, description: e.target.value }))}
          />

          <Button className="w-full" onClick={handleSubmitFeedback} loading={submitting}>
            <Send className="w-4 h-4" />
            Submit Feedback
          </Button>
        </div>
      </Modal>
    </div>
  );
}
