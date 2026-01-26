-- sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL UNIQUE, -- User-friendly key (e.g., "user123_session1")
  status TEXT NOT NULL CHECK (status IN ('initializing', 'qr_ready', 'connecting', 'connected', 'disconnected', 'failed')),
  qr_code TEXT, -- Base64 QR code image (temporary, cleared after connection)
  qr_generation_count INT DEFAULT 0,
  phone_number TEXT, -- WhatsApp phone number (after connection)
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_session_key CHECK (char_length(session_key) <= 100)
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_session_key ON public.sessions(session_key);

-- RLS Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_session_updated
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check session limit
CREATE OR REPLACE FUNCTION public.check_session_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.sessions
  WHERE user_id = NEW.user_id 
    AND status IN ('initializing', 'qr_ready', 'connecting', 'connected');
  
  IF active_count >= 5 THEN
    RAISE EXCEPTION 'Maximum active session limit (5) reached for user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_session_limit
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_limit();
