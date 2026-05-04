-- 1. Student Registry
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    admission_number TEXT UNIQUE,
    current_class TEXT NOT NULL, -- e.g. 'JSS 1', 'SSS 3'
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration support: Ensure tenant_id exists if table was created in an older version or by school schema
ALTER TABLE students ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Attendance Header (The Session)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_level TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    lesson_note_id UUID REFERENCES lesson_notes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration support: Ensure tenant_id exists
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Ensure constraint exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_tenant_class_date') THEN
        ALTER TABLE attendance_records ADD CONSTRAINT unique_tenant_class_date UNIQUE(tenant_id, class_level, date);
    END IF;
END $$;

-- 3. Attendance Line Items (Student Status)
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(record_id, student_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_student_status ON student_attendance(status);
