-- Migration: Add Tenant KYC Documents Table
CREATE TABLE IF NOT EXISTS public.tenant_kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- e.g., 'GOVT_ID', 'UTILITY_BILL', 'CAC_CERT'
    document_url VARCHAR NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'PENDING';
