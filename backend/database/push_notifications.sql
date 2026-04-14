-- backend/database/push_notifications.sql

-- 1. Table to store FCM device tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Reference to auth.users.id
    token TEXT NOT NULL UNIQUE,
    platform TEXT, -- e.g. 'android', 'ios'
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table to associate Users with Schools (Admins/Principals)
-- This allows us to find who to notify for a specific school.
CREATE TABLE IF NOT EXISTS school_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users.id
    role TEXT NOT NULL DEFAULT 'admin', -- 'principal', 'admin', 'bursar'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, user_id)
);

-- Enable RLS (Assuming system defaults)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_school ON school_admins(school_id);
