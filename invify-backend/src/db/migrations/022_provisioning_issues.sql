-- src/db/migrations/022_provisioning_issues.sql
CREATE TABLE IF NOT EXISTS public.provisioning_issues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    error_message TEXT NOT NULL,
    raw_payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS policies
ALTER TABLE public.provisioning_issues ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public onboarding flow before user exists)
CREATE POLICY "Allow public insert to provisioning_issues" 
ON public.provisioning_issues FOR INSERT 
WITH CHECK (true);

-- Allow super admins to read all issues
CREATE POLICY "Allow super admin to select provisioning_issues"
ON public.provisioning_issues FOR SELECT
USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN' OR auth.jwt() ->> 'role' = 'STAFF');

-- Allow super admins to update issues
CREATE POLICY "Allow super admin to update provisioning_issues"
ON public.provisioning_issues FOR UPDATE
USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN' OR auth.jwt() ->> 'role' = 'STAFF');
