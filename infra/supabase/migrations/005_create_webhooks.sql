-- Webhooks table for storing user webhook configurations
-- Each user can configure webhooks per session to receive events

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Webhook configuration
    url TEXT NOT NULL,
    secret TEXT NOT NULL,  -- For HMAC-SHA256 signing
    
    -- Event filtering (which events to send)
    events TEXT[] DEFAULT ARRAY[
        'message.received',
        'message.sent', 
        'message.delivered',
        'message.read',
        'session.connected',
        'session.disconnected'
    ],
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    
    -- Tracking
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_session_id ON webhooks(session_id);
CREATE INDEX idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own webhooks
CREATE POLICY "Users can view own webhooks"
    ON webhooks FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own webhooks
CREATE POLICY "Users can create own webhooks"
    ON webhooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own webhooks
CREATE POLICY "Users can update own webhooks"
    ON webhooks FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own webhooks
CREATE POLICY "Users can delete own webhooks"
    ON webhooks FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
