-- backend/database/create_lesson_cache_table.sql

-- 1. Create the Lessons Note Cache table
CREATE TABLE IF NOT EXISTS public.lesson_notes_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT NOT NULL,
    school_id TEXT NOT NULL,
    teacher_id TEXT,
    note_content JSONB NOT NULL,
    is_global BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure we don't have duplicate entries for the same content hash per school
    UNIQUE(content_hash, school_id)
);

-- 2. Create optimized indexes for high-speed cache lookup
CREATE INDEX IF NOT EXISTS idx_lesson_cache_hash ON public.lesson_notes_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_lesson_cache_school ON public.lesson_notes_cache(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_cache_global ON public.lesson_notes_cache(is_global);

-- 3. Usage Logging Table for Monetization/Tracking
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    feature TEXT NOT NULL, -- e.g., 'lesson_note'
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_school ON public.ai_generation_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON public.ai_generation_logs(timestamp);

-- Enable RLS (Row Level Security) - Basic Setup
ALTER TABLE public.lesson_notes_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role (backend) full access
CREATE POLICY "Service Role Access" ON public.lesson_notes_cache 
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service Role Access Logs" ON public.ai_generation_logs 
    FOR ALL USING (auth.role() = 'service_role');
