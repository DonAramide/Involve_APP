-- backend/database/student_virtual_accounts.sql

CREATE TABLE IF NOT EXISTS student_virtual_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    quasar_account_id TEXT UNIQUE NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

CREATE INDEX idx_student_va_student_id ON student_virtual_accounts(student_id);
CREATE INDEX idx_student_va_school_id ON student_virtual_accounts(school_id);
