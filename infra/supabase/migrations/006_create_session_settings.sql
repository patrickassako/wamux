-- Session settings table for advanced behavior configuration
-- Stores automation rules per session

CREATE TABLE IF NOT EXISTS session_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Behavior settings
    always_online BOOLEAN DEFAULT false,           -- Emit presence.update('available')
    auto_read_messages BOOLEAN DEFAULT false,      -- Mark incoming messages as read
    reject_calls BOOLEAN DEFAULT false,            -- Reject incoming calls
    
    -- Future settings placeholders
    typing_indicator BOOLEAN DEFAULT true,         -- Show typing indicator when sending
    link_preview BOOLEAN DEFAULT true,             -- Generate link previews
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One settings row per session
    UNIQUE(session_id)
);

-- Indexes
CREATE INDEX idx_session_settings_session_id ON session_settings(session_id);

-- RLS Policies
ALTER TABLE session_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their session settings via session ownership
CREATE POLICY "Users can view own session settings"
    ON session_settings FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own session settings"
    ON session_settings FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own session settings"
    ON session_settings FOR UPDATE
    USING (
        session_id IN (
            SELECT id FROM sessions WHERE user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_session_settings_updated_at
    BEFORE UPDATE ON session_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
