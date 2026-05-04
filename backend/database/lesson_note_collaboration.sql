-- 1. Adding Collaboration & Ownership fields to Lesson Notes
ALTER TABLE lesson_notes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'edited', 'shared'));

-- 2. Add Index for hybrid dashboard performance
CREATE INDEX IF NOT EXISTS idx_notes_hybrid_lookup 
ON lesson_notes(tenant_id, created_by, is_global);
