-- BetaDrop Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  package_name TEXT,
  icon_url TEXT,
  apk_url TEXT,
  apk_size BIGINT,
  version TEXT DEFAULT '1.0.0',
  category TEXT,
  tester_mode TEXT CHECK (tester_mode IN ('public', 'approval', 'invite')) DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Versions table
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changelog TEXT,
  apk_url TEXT,
  apk_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('bug', 'feature', 'general')) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  description TEXT,
  screenshot_url TEXT,
  device_info JSONB,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback Replies table
CREATE TABLE IF NOT EXISTS feedback_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Testers table
CREATE TABLE IF NOT EXISTS app_testers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT UNIQUE NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stars (favorites) table
CREATE TABLE IF NOT EXISTS stars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- Installs (analytics) table
CREATE TABLE IF NOT EXISTS installs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  device_info JSONB,
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_owner_id ON apps(owner_id);
CREATE INDEX IF NOT EXISTS idx_feedback_app_id ON feedback(app_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_app_testers_token ON app_testers(token);
CREATE INDEX IF NOT EXISTS idx_installs_app_id ON installs(app_id);

-- Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE installs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Apps: Owner can do everything, public apps viewable by all
CREATE POLICY "Public apps are viewable by everyone" ON apps FOR SELECT USING (tester_mode = 'public' OR owner_id = auth.uid());
CREATE POLICY "Users can create apps" ON apps FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own apps" ON apps FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own apps" ON apps FOR DELETE USING (auth.uid() = owner_id);

-- App versions: Same as apps
CREATE POLICY "App versions viewable by app viewers" ON app_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND (apps.tester_mode = 'public' OR apps.owner_id = auth.uid()))
);
CREATE POLICY "App owners can create versions" ON app_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND apps.owner_id = auth.uid())
);
CREATE POLICY "App owners can update versions" ON app_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND apps.owner_id = auth.uid())
);
CREATE POLICY "App owners can delete versions" ON app_versions FOR DELETE USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND apps.owner_id = auth.uid())
);

-- Screenshots: Same as apps
CREATE POLICY "Screenshots viewable by app viewers" ON screenshots FOR SELECT USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = screenshots.app_id AND (apps.tester_mode = 'public' OR apps.owner_id = auth.uid()))
);
CREATE POLICY "App owners can manage screenshots" ON screenshots FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = screenshots.app_id AND apps.owner_id = auth.uid())
);

-- Videos: Same as apps
CREATE POLICY "Videos viewable by app viewers" ON videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = videos.app_id AND (apps.tester_mode = 'public' OR apps.owner_id = auth.uid()))
);
CREATE POLICY "App owners can manage videos" ON videos FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = videos.app_id AND apps.owner_id = auth.uid())
);

-- Feedback: App owners can view all, authenticated users can submit
CREATE POLICY "App owners can view feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = feedback.app_id AND apps.owner_id = auth.uid())
);
CREATE POLICY "Authenticated users can submit feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "App owners can update feedback" ON feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = feedback.app_id AND apps.owner_id = auth.uid())
);
CREATE POLICY "Users can delete their own feedback" ON feedback FOR DELETE USING (auth.uid() = user_id);

-- Feedback Replies: App owners and feedback creators can view
CREATE POLICY "Users can view feedback replies" ON feedback_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON feedback_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own replies" ON feedback_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON feedback_replies FOR DELETE USING (auth.uid() = user_id);

-- App Testers: Token holders can view their invites
CREATE POLICY "Token holders can view their invites" ON app_testers FOR SELECT USING (true);
CREATE POLICY "App owners can manage testers" ON app_testers FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_testers.app_id AND apps.owner_id = auth.uid())
);

-- Stars: Users can manage their own stars
CREATE POLICY "Stars are viewable by everyone" ON stars FOR SELECT USING (true);
CREATE POLICY "Users can create stars" ON stars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stars" ON stars FOR DELETE USING (auth.uid() = user_id);

-- Installs: App owners can view, anyone can create
CREATE POLICY "App owners can view installs" ON installs FOR SELECT USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = installs.app_id AND apps.owner_id = auth.uid())
);
CREATE POLICY "Anyone can create installs" ON installs FOR INSERT WITH CHECK (true);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets (run these separately in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('app-icons', 'app-icons', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('apks', 'apks', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);

-- Storage policies
-- CREATE POLICY "App icons are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'app-icons');
-- CREATE POLICY "App icons are uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-icons' AND auth.role() = 'authenticated');
-- CREATE POLICY "APKs are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'apks');
-- CREATE POLICY "APKs are uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apks' AND auth.role() = 'authenticated');
-- CREATE POLICY "Screenshots are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');
-- CREATE POLICY "Screenshots are uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');
-- CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
-- CREATE POLICY "Videos are uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
