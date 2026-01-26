-- Migration: Fix subscriptions table schema
-- 1. Add missing sessions_limit column
-- 2. Update plan check constraint to match Python Enum

-- Add sessions_limit column
ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS sessions_limit INTEGER NOT NULL DEFAULT 1;

-- Drop old check constraint
ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Add new check constraint with correct values
ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_plan_check 
    CHECK (plan IN ('free', 'basic', 'pro', 'plus', 'business'));

-- Allow null usage values just in case (optional, but good for safety)
ALTER TABLE subscriptions
    ALTER COLUMN message_limit SET DEFAULT 100,
    ALTER COLUMN messages_used SET DEFAULT 0;
