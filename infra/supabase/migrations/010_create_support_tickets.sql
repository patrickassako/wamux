-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('general', 'technical', 'billing', 'api', 'feature')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create their own tickets
CREATE POLICY "Users can create tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do anything (for admin access)
CREATE POLICY "Service role has full access"
    ON support_tickets
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- Add comment
COMMENT ON TABLE support_tickets IS 'Support tickets submitted by users for help and assistance';
