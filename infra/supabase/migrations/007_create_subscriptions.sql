-- Migration: Create subscriptions table for billing
-- Epic 4: Billing, Safety & Monetization

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Plan details
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    
    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Billing period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Usage limits based on plan
    message_limit INTEGER NOT NULL DEFAULT 100, -- monthly message limit
    messages_used INTEGER NOT NULL DEFAULT 0,  -- current month usage
    
    -- Quota alerts
    quota_alert_sent_80 BOOLEAN DEFAULT FALSE,
    quota_alert_sent_100 BOOLEAN DEFAULT FALSE,
    
    -- Rate limits (messages per minute)
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One subscription per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, plan, status, message_limit, rate_limit_per_minute)
    VALUES (NEW.id, 'free', 'active', 100, 10)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription when profile is created
CREATE TRIGGER create_subscription_on_profile_insert
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- Function to reset monthly usage (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET messages_used = 0,
        quota_alert_sent_80 = FALSE,
        quota_alert_sent_100 = FALSE,
        updated_at = NOW()
    WHERE current_period_end < NOW()
       OR current_period_end IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin and banned flags to profiles
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Comment on plan limits
COMMENT ON TABLE subscriptions IS 'User subscription plans and usage tracking. Plans: free (100 msgs, 10/min), starter (1000 msgs, 30/min), pro (10000 msgs, 60/min)';
