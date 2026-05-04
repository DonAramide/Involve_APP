-- Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- The recipient
    type TEXT NOT NULL, -- e.g. 'payment.received', 'student.owes', 'payout.success'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Enable Realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;
-- Note: Add to supabase realtime publication via dashboard or SQL
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
