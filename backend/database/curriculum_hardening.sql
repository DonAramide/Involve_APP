-- 1. Hardening Curriculum Integrity
-- This ensures that we have a clean 1-to-1 mapping for Week/Topic which is critical for AI Lesson Note accuracy.
ALTER TABLE curriculum_topics 
ADD CONSTRAINT unique_curriculum_key 
UNIQUE(subject, class_level, term, week);

-- 2. Add Index for high-performance filtering in the UI
CREATE INDEX IF NOT EXISTS idx_curriculum_lookup 
ON curriculum_topics(subject, class_level, term);
