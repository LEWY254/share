import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button, Input, Textarea, Select, Card, UploadZone, MultiUploadZone, useToast } from '../../components/ui';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Image,
  Settings,
  Check,
  Package,
  ShieldOff,
  AlertCircle,
} from 'lucide-react';
import { formatFileSize } from '../../lib/utils';
import type { Profile } from '../../types';

const STEPS = [
  { id: 'upload', label: 'Upload APK', icon: Upload },
  { id: 'details', label: 'Details', icon: Package },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface OutletContext {
  profile: Profile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
}

export function CreateAppPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDeveloper } = useOutletContext<OutletContext>();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [apkFile, setApkFile] = useState<{ name: string; size: number } | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('utility');
  const [testerMode, setTesterMode] = useState<'public' | 'approval' | 'invite'>('public');
  const [screenshots, setScreenshots] = useState<{ name: string; url: string }[]>([]);
  const [videos, setVideos] = useState<{ name: string; url: string }[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  if (!isDeveloper) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8 text-center">
          <ShieldOff className="w-12 h-12 mx-auto mb-4 text-[#71717a]" />
          <h1 className="text-xl font-bold text-[#fafafa] mb-2">Access Restricted</h1>
          <p className="text-[#71717a] mb-6">Only developers can create apps.</p>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const uploadFile = async (file: File, bucket: string): Promise<{ url: string | null; error: string | null }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  };

  const handleApkUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setUploadError(null);

    const result = await uploadFile(file, 'betadrop_apks');

    if (result.error) {
      setUploadError(result.error);
      addToast('error', `Upload failed: ${result.error}`);
    } else if (result.url) {
      setApkUrl(result.url);
      setApkFile({ name: file.name, size: file.size });
      addToast('success', 'APK uploaded successfully');
    }

    setLoading(false);
  };

  const handleIconUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    const result = await uploadFile(file, 'betadrop_app_icons');

    if (result.url) {
      setIconUrl(result.url);
      setIconFile(file);
      addToast('success', 'Icon uploaded');
    } else if (result.error) {
      addToast('error', `Icon upload failed: ${result.error}`);
    }

    setLoading(false);
  };

  const handleScreenshotsUpload = async (files: File[]) => {
    setLoading(true);
    for (const file of files) {
      const result = await uploadFile(file, 'betadrop_screenshots');
      if (result.url) {
        setScreenshots((prev) => [...prev, { name: file.name, url: result.url! }]);
      }
    }
    setLoading(false);
    addToast('success', 'Screenshots uploaded');
  };

  const handleVideosUpload = async (files: File[]) => {
    setLoading(true);
    for (const file of files) {
      const result = await uploadFile(file, 'betadrop_videos');
      if (result.url) {
        setVideos((prev) => [...prev, { name: file.name, url: result.url! }]);
      }
    }
    setLoading(false);
    addToast('success', 'Videos uploaded');
  };

  const handleSubmit = async () => {
    if (!name || !apkUrl) { addToast('error', 'Fill required fields'); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { navigate('/'); return; }

    const { data: app, error: appError } = await supabase
      .from('betadrop_apps')
      .insert({
        owner_id: session.user.id, name, description, version, category,
        tester_mode: testerMode, apk_url: apkUrl, apk_size: apkFile?.size, icon_url: iconUrl,
      })
      .select()
      .single();

    if (appError) { addToast('error', `Failed to create app: ${appError.message}`); setLoading(false); return; }

    if (screenshots.length > 0) {
      await supabase.from('betadrop_screenshots').insert(
        screenshots.map((s, i) => ({ app_id: app.id, url: s.url, position: i }))
      );
    }
    if (videos.length > 0) {
      await supabase.from('betadrop_videos').insert(
        videos.map((v, i) => ({ app_id: app.id, url: v.url, position: i }))
      );
    }

    addToast('success', 'App created!');
    navigate(`/app/${app.id}`);
  };

  const canProceed = () => {
    if (currentStep === 0) return apkFile !== null;
    if (currentStep === 1) return name.trim() !== '';
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#71717a] hover:text-[#fafafa] mb-4">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-[#fafafa]">Create New App</h1>
        <p className="text-[#71717a]">Fill in the details to create your beta app listing</p>
      </div>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap ${
              index === currentStep ? 'bg-[#d4d4d8] text-[#09090b]' :
              index < currentStep ? 'bg-[#22c55e]/20 text-[#22c55e]' :
              'bg-[#27272a] text-[#71717a]'
            }`}>
              {index < currentStep ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${index < currentStep ? 'bg-[#22c55e]' : 'bg-[#27272a]'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#fafafa]">Upload APK</h2>
            <UploadZone
              accept={{ 'application/vnd.android.package-archive': ['.apk'] }}
              maxSize={500 * 1024 * 1024}
              onUpload={handleApkUpload}
              uploading={loading}
              uploadedFile={apkFile}
              label="Drop APK here"
              hint="or click to select file"
            />
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444]">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{uploadError}</span>
              </div>
            )}
            {apkFile && (
              <div className="p-4 bg-[#27272a] rounded-xl flex items-center gap-3">
                <Package className="w-5 h-5 text-[#71717a]" />
                <div>
                  <p className="text-sm text-[#fafafa]">{apkFile.name}</p>
                  <p className="text-xs text-[#71717a]">{formatFileSize(apkFile.size)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#fafafa]">App Details</h2>
            <Input label="App Name" placeholder="My Awesome App" value={name} onChange={(e) => setName(e.target.value)} required />
            <Textarea label="Description" placeholder="Describe your app..." value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Version" placeholder="1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} />
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'utility', label: 'Utility' },
                  { value: 'productivity', label: 'Productivity' },
                  { value: 'social', label: 'Social' },
                  { value: 'entertainment', label: 'Entertainment' },
                  { value: 'games', label: 'Games' },
                  { value: 'health', label: 'Health & Fitness' },
                  { value: 'education', label: 'Education' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">App Icon (optional)</label>
              <UploadZone
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                maxSize={5 * 1024 * 1024}
                onUpload={handleIconUpload}
                uploading={loading}
                uploadedFile={iconFile ? { name: iconFile.name, size: iconFile.size } : null}
                label="Upload icon"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#fafafa]">Media</h2>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Screenshots (max 10)</label>
              <MultiUploadZone
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                maxSize={10 * 1024 * 1024}
                maxFiles={10}
                files={screenshots}
                onUpload={handleScreenshotsUpload}
                onRemove={(index) => setScreenshots((prev) => prev.filter((_, i) => i !== index))}
                label="Upload screenshots"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Videos (max 3)</label>
              <MultiUploadZone
                accept={{ 'video/*': ['.mp4', '.mov', '.webm'] }}
                maxSize={100 * 1024 * 1024}
                maxFiles={3}
                files={videos}
                onUpload={handleVideosUpload}
                onRemove={(index) => setVideos((prev) => prev.filter((_, i) => i !== index))}
                label="Upload videos"
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#fafafa]">Settings</h2>
            <Select label="Tester Mode" value={testerMode} onChange={(e) => setTesterMode(e.target.value as any)}
              options={[
                { value: 'public', label: 'Public - Anyone with link can download' },
                { value: 'approval', label: 'Approval Required' },
                { value: 'invite', label: 'Invite Only' },
              ]}
            />
            <div className="p-4 bg-[#27272a] rounded-xl">
              <h3 className="text-sm font-medium text-[#fafafa] mb-2">Summary</h3>
              <div className="space-y-1 text-sm text-[#71717a]">
                <div className="flex justify-between"><span>Name</span><span className="text-[#fafafa]">{name || '-'}</span></div>
                <div className="flex justify-between"><span>Version</span><span className="text-[#fafafa] font-mono">{version}</span></div>
                <div className="flex justify-between"><span>Category</span><span className="text-[#fafafa] capitalize">{category}</span></div>
                <div className="flex justify-between"><span>Mode</span><span className="text-[#fafafa] capitalize">{testerMode}</span></div>
                <div className="flex justify-between"><span>Screenshots</span><span className="text-[#fafafa]">{screenshots.length}</span></div>
                <div className="flex justify-between"><span>Videos</span><span className="text-[#fafafa]">{videos.length}</span></div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>
          <ArrowLeft className="w-4 h-4" />Previous
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}>
            Next<ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading} disabled={!canProceed()}>
            <Check className="w-4 h-4" />Create App
          </Button>
        )}
      </div>
    </div>
  );
}
