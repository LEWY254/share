-- Storage buckets with file size limits (500MB for APKs, 50MB for others)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('betadrop_apks', 'betadrop_apks', true, 524288000, NULL),
  ('betadrop_app_icons', 'betadrop_app_icons', true, 10485760, NULL),
  ('betadrop_screenshots', 'betadrop_screenshots', true, 52428800, NULL),
  ('betadrop_videos', 'betadrop_videos', true, 104857600, NULL),
  ('betadrop_feedback_screenshots', 'betadrop_feedback_screenshots', true, 10485760, NULL);

-- Storage policies for betadrop_apks
CREATE POLICY "betadrop_apks_select" ON storage.objects FOR SELECT USING (bucket_id = 'betadrop_apks');
CREATE POLICY "betadrop_apks_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'betadrop_apks' AND auth.role() = 'authenticated');
CREATE POLICY "betadrop_apks_delete" ON storage.objects FOR DELETE USING (bucket_id = 'betadrop_apks' AND auth.role() = 'authenticated');

-- Storage policies for betadrop_app_icons
CREATE POLICY "betadrop_app_icons_select" ON storage.objects FOR SELECT USING (bucket_id = 'betadrop_app_icons');
CREATE POLICY "betadrop_app_icons_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'betadrop_app_icons' AND auth.role() = 'authenticated');

-- Storage policies for betadrop_screenshots
CREATE POLICY "betadrop_screenshots_select" ON storage.objects FOR SELECT USING (bucket_id = 'betadrop_screenshots');
CREATE POLICY "betadrop_screenshots_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'betadrop_screenshots' AND auth.role() = 'authenticated');

-- Storage policies for betadrop_videos
CREATE POLICY "betadrop_videos_select" ON storage.objects FOR SELECT USING (bucket_id = 'betadrop_videos');
CREATE POLICY "betadrop_videos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'betadrop_videos' AND auth.role() = 'authenticated');

-- Storage policies for betadrop_feedback_screenshots
CREATE POLICY "betadrop_feedback_screenshots_select" ON storage.objects FOR SELECT USING (bucket_id = 'betadrop_feedback_screenshots');
CREATE POLICY "betadrop_feedback_screenshots_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'betadrop_feedback_screenshots' AND auth.role() = 'authenticated');
