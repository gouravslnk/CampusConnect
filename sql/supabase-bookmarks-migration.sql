-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, event_id)
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookmarks
CREATE POLICY "Users can view their own bookmarks" 
  ON public.bookmarks 
  FOR SELECT 
  USING (auth.uid() = profile_id);

-- Policy: Users can create their own bookmarks
CREATE POLICY "Users can create their own bookmarks" 
  ON public.bookmarks 
  FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks" 
  ON public.bookmarks 
  FOR DELETE 
  USING (auth.uid() = profile_id);

-- Create index for faster queries
CREATE INDEX idx_bookmarks_profile_id ON public.bookmarks(profile_id);
CREATE INDEX idx_bookmarks_event_id ON public.bookmarks(event_id);
