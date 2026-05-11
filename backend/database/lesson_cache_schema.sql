-- Create Lesson Notes Cache Table
CREATE TABLE IF NOT EXISTS public.lesson_notes_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text UNIQUE,
  school_id uuid REFERENCES public.tenants(id),
  teacher_id text,
  note_content jsonb,
  is_global boolean DEFAULT true,
  generated_at timestamptz DEFAULT now()
);

-- Create Usage Logs Table for Tracking
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.tenants(id),
  teacher_id text,
  feature text,
  timestamp timestamptz DEFAULT now()
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_notes_hash ON public.lesson_notes_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_notes_school ON public.lesson_notes_cache(school_id);
