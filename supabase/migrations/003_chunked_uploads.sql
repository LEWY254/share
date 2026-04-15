-- Table to track chunked upload sessions
CREATE TABLE IF NOT EXISTS betadrop_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  chunk_size INT NOT NULL DEFAULT (5 * 1024 * 1024), -- 5MB chunks
  total_chunks INT NOT NULL,
  uploaded_chunks INT NOT NULL DEFAULT 0,
  bucket_id TEXT NOT NULL,
  final_path TEXT,
  status TEXT NOT NULL DEFAULT 'uploading', -- uploading, assembling, completed, failed
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_upload_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_betadrop_upload_sessions_timestamp
  BEFORE UPDATE ON betadrop_upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_upload_session_timestamp();

-- RLS policies
ALTER TABLE betadrop_upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload sessions" ON betadrop_upload_sessions
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create upload sessions" ON betadrop_upload_sessions
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own upload sessions" ON betadrop_upload_sessions
  FOR UPDATE USING (owner_id = auth.uid());
