-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,  -- First 12 chars for display + reference (e.g., "sk_live_abcd")
  name TEXT NOT NULL,
  description TEXT,
  request_count BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_name_length CHECK (char_length(name) <= 100),
  CONSTRAINT valid_description_length CHECK (char_length(description) <= 500)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_expires_at ON public.api_keys(expires_at) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER on_api_key_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check key limit (10 active keys per user)
CREATE OR REPLACE FUNCTION public.check_api_key_limit()
RETURNS TRIGGER AS $$
DECLARE
  key_count INT;
BEGIN
  -- Count active keys for this user
  SELECT COUNT(*) INTO key_count
  FROM public.api_keys
  WHERE user_id = NEW.user_id AND revoked_at IS NULL;
  
  -- If creating a new active key and limit reached
  IF key_count >= 10 THEN
    RAISE EXCEPTION 'Maximum API key limit (10) reached for user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.check_api_key_limit();
