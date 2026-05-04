-- Add connection requests table (run this in your Supabase SQL editor)
-- ==========================================
-- CONNECTION REQUESTS MANAGEMENT
-- ==========================================

CREATE TABLE public.connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, recipient_id) -- Prevent duplicate requests
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_connection_requests_recipient ON public.connection_requests(recipient_id);
CREATE INDEX idx_connection_requests_requester ON public.connection_requests(requester_id);
CREATE INDEX idx_connection_requests_status ON public.connection_requests(status);
