export type UserRole = 'admin' | 'developer' | 'tester';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface App {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  package_name: string | null;
  icon_url: string | null;
  apk_url: string | null;
  apk_size: number | null;
  version: string | null;
  category: string | null;
  tester_mode: 'public' | 'approval' | 'invite';
  created_at: string;
  updated_at: string;
  owner?: Profile;
  screenshots?: Screenshot[];
  videos?: Video[];
  versions?: AppVersion[];
  _count?: {
    feedback: number;
    installs: number;
  };
}

export interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  changelog: string | null;
  apk_url: string | null;
  apk_size: number | null;
  created_at: string;
}

export interface Screenshot {
  id: string;
  app_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Video {
  id: string;
  app_id: string;
  url: string;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  app_id: string;
  user_id: string | null;
  type: 'bug' | 'feature' | 'general';
  rating: number;
  description: string | null;
  screenshot_url: string | null;
  device_info: DeviceInfo | null;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  user?: Profile;
  app?: App;
  replies?: FeedbackReply[];
}

export interface DeviceInfo {
  os_version?: string;
  device_model?: string;
  app_version?: string;
  install_source?: string;
}

export interface FeedbackReply {
  id: string;
  feedback_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface AppTester {
  id: string;
  app_id: string;
  email: string | null;
  token: string;
  approved: boolean;
  created_at: string;
}

export interface Star {
  id: string;
  app_id: string;
  user_id: string;
  created_at: string;
}

export interface Install {
  id: string;
  app_id: string;
  device_info: DeviceInfo | null;
  installed_at: string;
}

export type TesterMode = 'public' | 'approval' | 'invite';
export type FeedbackType = 'bug' | 'feature' | 'general';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved';
