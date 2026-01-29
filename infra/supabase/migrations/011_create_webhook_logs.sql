-- Webhook Logs Table
-- Stores every webhook call attempt with full request/response details

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Event details
    event_id TEXT,
    event_type TEXT NOT NULL,
    
    -- Request details
    request_url TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    
    -- Response details
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Retry information
    attempt_number INTEGER NOT NULL DEFAULT 1,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see logs for their own webhooks
CREATE POLICY "Users can view own webhook logs"
    ON webhook_logs FOR SELECT
    USING (
        webhook_id IN (
            SELECT id FROM webhooks WHERE user_id = auth.uid()
        )
    );

-- System can insert logs (webhook dispatcher runs with service role)
CREATE POLICY "Service role can insert logs"
    ON webhook_logs FOR INSERT
    WITH CHECK (true);

-- Add trigger for cleanup (optional: keep only last 30 days)
-- CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
-- RETURNS trigger AS $$
-- BEGIN
--     DELETE FROM webhook_logs
--     WHERE created_at < NOW() - INTERVAL '30 days';
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trigger_cleanup_webhook_logs
--     AFTER INSERT ON webhook_logs
--     EXECUTE FUNCTION cleanup_old_webhook_logs();
